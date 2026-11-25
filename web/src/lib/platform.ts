import {
  Analytics,
  Notification,
  Promotion,
  Storage,
  TossAds,
  graniteEvent,
  isMinVersionSupported,
  loadFullScreenAd,
  showFullScreenAd,
} from '@apps-in-toss/web-framework';

/**
 * 토스 기능 연결(웹뷰, SDK 3.x). RN 라이브(20261019-43) + 알림 동의(ff4eae0)가 부르던 것을 같은 값·같은 키로 옮겼다.
 * 참고 구현: workspace/mokdon/web/src/lib/platform.ts (심사 통과).
 *
 * 브릿지 호출 원칙(뇌 휴식 '앱브릿지 호출 과다' 노출 중단 교훈):
 *  - 저장은 상태가 바뀔 때만. 타이머·화면 갱신에서는 브릿지를 부르지 않는다.
 *  - 리워드 광고는 앱 전체에서 한 번에 하나만 불러 둔다(이 앱은 RN 과 같이 리워드 그룹 하나만 쓴다).
 */

/** 화면 확인용(vite --mode mock, 또는 dev 서버에서 ?mock) — 토스 밖이라 localStorage·가짜 광고 */
function mockParam(): boolean {
  try {
    return new URLSearchParams(location.search).has('mock');
  } catch {
    return false;
  }
}
/** 출시·🧪 번들에서는 상수 false 라 가짜 광고·localStorage 길이 번들에서 빠진다 */
export const MOCK: boolean = import.meta.env.DEV && (import.meta.env.VITE_MOCK === '1' || mockParam());

/** 🧪 테스트 번들(build:test)·개발 서버 — 테스트 패널·TEST_ 프로모션 코드·광고 스킵 */
export const TEST_MODE: boolean = import.meta.env.MODE === 'test' || import.meta.env.DEV;

/* ---------- 저장소 ---------- */

const store = MOCK
  ? {
      getItem: async (k: string) => localStorage.getItem(k),
      setItem: async (k: string, v: string) => localStorage.setItem(k, v),
      removeItem: async (k: string) => localStorage.removeItem(k),
    }
  : Storage;

const TIMEOUT = Symbol('timeout');
export { TIMEOUT };
export type ReadResult = string | null | typeof TIMEOUT;

/** 읽기 — 무응답이면 2초에서 끊고 한 번 더. 그래도 안 되면 TIMEOUT(빈 기록으로 덮지 않게 화면은 '다시 시도') */
export async function readKey(key: string): Promise<ReadResult> {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await Promise.race([
        store.getItem(key),
        new Promise<typeof TIMEOUT>((res) => window.setTimeout(() => res(TIMEOUT), 2000)),
      ]);
      if (r !== TIMEOUT) return r ?? null;
    } catch {
      /* 한 번 더 */
    }
    await new Promise((res) => window.setTimeout(res, 300));
  }
  return TIMEOUT;
}

/**
 * 쓰기 — 성공했을 때만 true. 무응답 4초면 false(지급 기록은 false 면 지급하지 않는다).
 * 늦게라도 써지면 "받은 것으로 기록됐는데 미지급"까지만 생기고 중복 지급은 없다.
 */
export function writeKey(key: string, value: string): Promise<boolean> {
  return Promise.race([
    Promise.resolve()
      .then(() => store.setItem(key, value))
      .then(() => true)
      .catch(() => false),
    new Promise<boolean>((res) => window.setTimeout(() => res(false), 4000)),
  ]);
}

/* ---------- 이벤트 로그(RN src/AdSlot.tsx 의 logAd 와 같은 이름·파라미터) ---------- */

export function logEvent(name: string, logType: 'event' | 'impression' | 'click', params: Record<string, string>): void {
  if (MOCK) return;
  try {
    void Analytics.log({ log_name: name, log_type: logType, params })?.catch?.(() => {});
  } catch {
    /* 로그 실패는 화면에 영향 없음 */
  }
}

/* ---------- 배너·이미지 광고 ---------- */

let initStarted = false;
let initDone = false;
let initTries = 0;
const waiters: (() => void)[] = [];

/** 초기화가 끝나면 onReady. 실패하면 3초·6초·12초 뒤 다시 시도(최대 4번) */
export function initBanner(onReady: () => void): void {
  if (initDone) {
    onReady();
    return;
  }
  waiters.push(onReady);
  if (initStarted) return;
  startInit();
}

function startInit(): void {
  initStarted = true;
  initTries += 1;
  const retry = () => {
    if (initDone || initTries >= 4) return;
    initStarted = false;
    window.setTimeout(() => {
      if (!initDone && !initStarted && waiters.length) startInit();
    }, 3000 * 2 ** (initTries - 1));
  };
  try {
    if (!TossAds.initialize.isSupported()) return;
    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          initDone = true;
          waiters.splice(0).forEach((f) => f());
        },
        onInitializationFailed: retry,
      },
    });
  } catch {
    retry();
  }
}

/** RN <InlineAd theme="light" tone="grey" variant=… /> 자리. position 은 RN 과 같은 지면 이름(로그용) */
export function attachBanner(
  adId: string,
  el: HTMLElement,
  variant: 'card' | 'expanded',
  position: string,
): (() => void) | null {
  try {
    if (!TossAds.attachBanner.isSupported()) return null;
    const p = { position, adGroupId: adId };
    const r = TossAds.attachBanner(adId, el, {
      theme: 'light',
      tone: 'grey',
      variant,
      callbacks: {
        onAdImpression: () => logEvent('ad_impression', 'impression', p),
        onAdViewable: () => logEvent('ad_viewable', 'impression', p),
        onAdClicked: () => logEvent('ad_click', 'click', p),
        onNoFill: () => logEvent('ad_nofill', 'event', p),
      },
    });
    return () => r.destroy();
  } catch {
    return null;
  }
}

/* ---------- 리워드 광고(한 번에 하나) ---------- */

export type AdStatus = 'idle' | 'loading' | 'ready' | 'failed';
export type ShowResult = 'earned' | 'closed' | 'unavailable' | 'noshow';

/** 이만큼 답이 없으면 실패로 둔다 */
const NO_RESPONSE_MS = 20_000;

let adStatus: AdStatus = 'idle';
let adGroup = '';
let showing = false;
let loadSeq = 0;
let unload: (() => void) | null = null;
let loadTimer: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

/** 광고 흐름 잠금 — "광고 보기"를 누른 뒤 재생이 끝날 때까지 앱 전체에서 하나만 */
let flowLocked = false;
export const adFlowLocked = () => flowLocked;
export function tryLockAdFlow(): boolean {
  if (flowLocked) return false;
  flowLocked = true;
  return true;
}
export function unlockAdFlow(): void {
  flowLocked = false;
}

export function onAdChange(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

export const adState = (): AdStatus => adStatus;
export const isShowing = () => showing;
/** 🧪 패널 표시용 */
export const adDebug = () => `${adStatus}${adGroup && adStatus === 'ready' ? ` · ${adGroup.slice(-6)}` : ''}`;

export function rewardSupported(): boolean {
  if (MOCK) return true;
  try {
    return loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

function clearLoad(): void {
  if (loadTimer) window.clearTimeout(loadTimer);
  loadTimer = null;
  try {
    unload?.();
  } catch {
    /* 무시 */
  }
  unload = null;
}

/** 불러 둔다. 이미 준비됐거나 불러오는 중이면 그대로 */
export function preloadReward(groupId: string): void {
  if (showing || !rewardSupported()) return;
  if (adStatus === 'ready' || adStatus === 'loading') return;
  adGroup = '';
  adStatus = 'loading';
  const seq = ++loadSeq;
  emit();
  clearLoad();
  if (MOCK) {
    window.setTimeout(() => {
      if (seq !== loadSeq) return;
      adGroup = groupId;
      adStatus = 'ready';
      emit();
    }, 300);
    return;
  }
  const fail = () => {
    if (seq !== loadSeq) return;
    clearLoad();
    adStatus = 'failed';
    emit();
  };
  loadTimer = window.setTimeout(() => {
    if (seq !== loadSeq || adStatus !== 'loading') return;
    loadSeq += 1; // 늦게 온 loaded 는 버린다
    clearLoad();
    adStatus = 'failed';
    emit();
  }, NO_RESPONSE_MS);
  try {
    const u = loadFullScreenAd({
      options: { adGroupId: groupId },
      onEvent: (e) => {
        if (e.type !== 'loaded' || seq !== loadSeq) return;
        if (loadTimer) window.clearTimeout(loadTimer);
        loadTimer = null;
        adGroup = groupId;
        adStatus = 'ready';
        emit();
      },
      onError: fail,
    });
    unload = typeof u === 'function' ? u : null;
  } catch {
    fail();
  }
}

/**
 * 준비된 광고를 띄운다. 끝까지 봤으면 'earned' — 도장·자리 추가는 이 값일 때만 준다.
 * 'closed' 중간에 닫음 · 'noshow' 재생 실패 · 'unavailable' 준비 안 됨/오류.
 */
export function showReward(): Promise<ShowResult> {
  return new Promise((resolve) => {
    if (showing || adStatus !== 'ready') {
      resolve('unavailable');
      return;
    }
    const groupId = adGroup;
    let earned = false;
    let settled = false;
    showing = true;
    const done = (v: ShowResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safety);
      showing = false;
      adStatus = 'idle';
      adGroup = '';
      emit();
      resolve(v);
    };
    // 네이티브가 닫힘을 끝내 알려 주지 않을 때 버튼이 영영 잠기지 않게 하는 안전장치 —
    // 광고 속 링크로 나갔다 오는 사람이 있어 마지막 광고 이벤트 뒤 10분.
    let safety = 0;
    const armSafety = () => {
      window.clearTimeout(safety);
      safety = window.setTimeout(() => done(earned ? 'earned' : 'unavailable'), 600_000);
    };
    armSafety();
    if (MOCK) {
      window.setTimeout(() => done(window.confirm('[가짜 광고] 끝까지 봤나요?') ? 'earned' : 'closed'), 200);
      return;
    }
    try {
      showFullScreenAd({
        options: { adGroupId: groupId },
        onEvent: (e) => {
          if (!settled) armSafety();
          // 보상은 반드시 userEarnedReward 에서만 (dismissed 만으로는 금지 — 정책)
          if (e.type === 'userEarnedReward') earned = true;
          if (e.type === 'dismissed') done(earned ? 'earned' : 'closed');
          if (e.type === 'failedToShow') done('noshow');
        },
        // 끝까지 본 뒤 오류가 와도 보상은 준다(userEarnedReward 를 이미 받았으면)
        onError: () => done(earned ? 'earned' : 'unavailable'),
      });
    } catch {
      done(earned ? 'earned' : 'unavailable');
    }
  });
}

/* ---------- 토스포인트 지급 ---------- */

export type GrantResult = { ok: boolean; detail: string };

/** 최근 지급 결과 (테스트 패널 표시용, 화면에 실패 문구는 띄우지 않는다) — RN src/reward.ts */
export const grantLog: string[] = [];

function glog(line: string) {
  grantLog.unshift(`${new Date().toTimeString().slice(0, 8)} ${line}`);
  if (grantLog.length > 10) grantLog.length = 10;
}

/** 이 토스 앱이 프로모션 지급을 지원하는가 — 아니면 도장·지급 버튼을 숨긴다(RN 의 광고 미지원 때와 같이) */
export function grantSupported(): boolean {
  if (MOCK) return true;
  try {
    return Promotion.grantReward.isSupported();
  } catch {
    return false;
  }
}

/**
 * 토스포인트 지급. 실패해도 유저에게 알리지 않고 재시도하지 않는다(로그만). 응답에 key 가 없으면 실패.
 */
export async function grantReward(promotionCode: string, amount: number): Promise<GrantResult> {
  if (MOCK) {
    glog(`${promotionCode.slice(0, 12)} ${amount} OK mock`);
    return { ok: true, detail: 'mock' };
  }
  try {
    if (!Promotion.grantReward.isSupported()) {
      glog(`${promotionCode.slice(0, 12)} ${amount} UNSUPPORTED`);
      return { ok: false, detail: 'unsupported' };
    }
    const res: unknown = await Promotion.grantReward({ promotionCode, amount });
    const ok = !!res && typeof res === 'object' && 'key' in (res as object);
    let detail = '';
    try {
      detail = JSON.stringify(res ?? null).slice(0, 160);
    } catch {
      detail = 'unserializable';
    }
    glog(`${promotionCode.slice(0, 12)} ${amount} ${ok ? 'OK' : 'FAIL'} ${detail}`);
    return { ok, detail };
  } catch (e) {
    const detail = String((e as Error)?.message ?? e).slice(0, 160);
    glog(`${promotionCode.slice(0, 12)} ${amount} THROW ${detail}`);
    return { ok: false, detail };
  }
}

/* ---------- 알림 동의·뒤로가기 ---------- */

export type AgreementResult = 'agreed' | 'rejected' | 'error';

/** RN src/notify.ts 와 같은 최소 버전(5.255.0) + 웹 SDK 함수 지원 여부 */
export function notifySupported(): boolean {
  if (MOCK) return true;
  try {
    return (
      isMinVersionSupported({ android: '5.255.0', ios: '5.255.0' }) && Notification.requestAgreement.isSupported()
    );
  } catch {
    return false;
  }
}

/** 토스 알림 동의 화면 — 유저가 버튼을 눌렀을 때만. 이미 동의했으면 화면 없이 바로 agreed */
export function requestAgreement(templateCode: string): Promise<AgreementResult> {
  return new Promise((resolve) => {
    if (MOCK) {
      window.setTimeout(() => resolve('agreed'), 300);
      return;
    }
    let done = false;
    let cleanup: (() => void) | undefined;
    // 동의 창이 끝내 답하지 않으면 60초 뒤 오류로 끝낸다(버튼이 '잠시만요…'에 묶이지 않게)
    const safety = window.setTimeout(() => finish('error'), 60_000);
    const finish = (r: AgreementResult) => {
      if (done) return;
      done = true;
      window.clearTimeout(safety);
      try {
        cleanup?.();
      } catch {
        /* 무시 */
      }
      resolve(r);
    };
    try {
      cleanup = Notification.requestAgreement({
        options: { templateCode },
        onEvent: ({ type }) => finish(type === 'agreementRejected' ? 'rejected' : 'agreed'),
        onError: () => finish('error'),
      });
    } catch {
      finish('error');
    }
  });
}

/** 토스 상단 뒤로가기를 가로챈다(안쪽 화면·창이 떠 있을 때만 등록). 해제 함수 반환 */
export function onBack(handler: () => void): () => void {
  if (MOCK) {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && handler();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }
  try {
    const off = graniteEvent.addEventListener('backEvent', { onEvent: handler, onError: () => {} });
    return typeof off === 'function' ? off : () => {};
  } catch {
    return () => {};
  }
}
