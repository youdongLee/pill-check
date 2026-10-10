/**
 * 미션 도장·지급 순수 로직 (화면·저장소와 분리 — scripts/verify-stamp.ts 로 검증).
 *
 * 저장 키는 라이브(20260423-23)와 그대로 맞춘다.
 *   @pillcheck/stamps      : JSON 문자열 배열 ["YYYY-MM-DD", ...]  (연속 7칸 도장)
 *   @pillcheck/claimedDate : 7일 연속 보상을 받은 날 (따옴표 없는 원문 문자열)
 * 새 키(이번 번들에서 추가):
 *   @pillcheck/payout_v1   : { dailyStampDate, dailyPaidDate, streakStampDate, streakPaidDate }
 *
 * 흐름: 복용 체크 완료 → 광고 안내 창 → 광고 끝까지 시청(userEarnedReward)
 *       → 도장 저장(StampDate) → 유저가 도장을 눌러야 → 지급 기록(PaidDate) 먼저 → 지급 호출.
 * 하루 경계는 기기 자정. 받지 않은 도장은 그날 자정에 사라진다.
 */

export type Payout = {
  dailyStampDate: string | null;
  dailyPaidDate: string | null;
  streakStampDate: string | null;
  streakPaidDate: string | null;
};

export type StampState = {
  stamps: string[];
  claimedDate: string | null;
  payout: Payout;
};

export const EMPTY_PAYOUT: Payout = {
  dailyStampDate: null,
  dailyPaidDate: null,
  streakStampDate: null,
  streakPaidDate: null,
};

export const STREAK_DAYS = 7;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}

/** 라이브와 같은 연속 계산: 오늘 도장이 없으면 어제부터 거꾸로 센다. */
export function calcStreak(stamps: string[], today: string): number {
  const set = new Set(stamps);
  let cur = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cur)) {
    n += 1;
    cur = addDays(cur, -1);
  }
  return n;
}

/** 저장분 파싱 — 손상된 값은 버리고 새로 시작한다. */
export function parseStamps(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && DATE_RE.test(x)) : [];
  } catch {
    return [];
  }
}

export function parseClaimedDate(raw: string | null): string | null {
  if (!raw) return null;
  // 라이브는 따옴표 없이 저장했다. 혹시 JSON 문자열로 저장된 값도 받아준다.
  const s = raw.trim().replace(/^"|"$/g, '');
  return DATE_RE.test(s) ? s : null;
}

export function parsePayout(raw: string | null): Payout {
  if (!raw) return { ...EMPTY_PAYOUT };
  try {
    const v = JSON.parse(raw);
    const pick = (k: keyof Payout) => (typeof v?.[k] === 'string' && DATE_RE.test(v[k]) ? (v[k] as string) : null);
    return {
      dailyStampDate: pick('dailyStampDate'),
      dailyPaidDate: pick('dailyPaidDate'),
      streakStampDate: pick('streakStampDate'),
      streakPaidDate: pick('streakPaidDate'),
    };
  } catch {
    return { ...EMPTY_PAYOUT };
  }
}

/**
 * 날짜가 바뀌었을 때의 정리(롤오버). 모든 변경 전에 반드시 거친다.
 * 라이브의 로드 시 정리 규칙을 따르되, 같은 날 다시 열었을 때 7번째 도장이
 * 지워지던 결함(7칸을 채운 그날 재진입 시 초기화)은 막는다.
 *  1) 7칸을 채운 회차가 '어제 이전'에 끝났으면 새 회차(빈 칸)로 시작
 *  2) 연속이 끊겼으면(어제·오늘 도장 없음) 빈 칸으로 시작
 */
export function normalize(s: StampState, today: string): StampState {
  let stamps = s.stamps.filter((d) => d <= today);
  const last = stamps.length ? stamps[stamps.length - 1] : null;
  if (stamps.length >= STREAK_DAYS && last !== today) stamps = [];
  if (stamps.length > 0 && calcStreak(stamps, today) === 0) stamps = [];
  if (stamps.length === s.stamps.length && stamps.every((d, i) => d === s.stamps[i])) return s;
  return { ...s, stamps };
}

export type StampView = {
  stamps: string[];
  todayStamped: boolean;
  /** 화면의 "🔥 N일 연속" (라이브와 같이 칸 수 기준, 최대 7) */
  streakCount: number;
  /** 7칸 채움 + 오늘 도장 + 오늘 아직 7일 도장 안 받음 → 광고 보고 7일 도장 받기 */
  canEarnStreak: boolean;
  /** 오늘 7일 연속 도장까지 받고 지급도 끝남 */
  streakDone: boolean;
  /** 오늘 도장(1원)을 받았고 아직 누르지 않음 */
  dailyPending: boolean;
  /** 7일 연속 도장(10원)을 받았고 아직 누르지 않음 */
  streakPending: boolean;
};

export function view(raw: StampState, today: string): StampView {
  const s = normalize(raw, today);
  const todayStamped = s.stamps.includes(today);
  const p = s.payout;
  const streakStamped = s.claimedDate === today;
  const streakPending = p.streakStampDate === today && p.streakPaidDate !== today;
  return {
    stamps: s.stamps,
    todayStamped,
    streakCount: Math.min(s.stamps.length, STREAK_DAYS),
    canEarnStreak: todayStamped && s.stamps.length >= STREAK_DAYS && !streakStamped,
    streakDone: streakStamped && !streakPending,
    dailyPending: p.dailyStampDate === today && p.dailyPaidDate !== today,
    streakPending,
  };
}

export type Change = { state: StampState; ok: boolean };

/** 광고 끝까지 시청 → 오늘 도장(1원짜리) 발급. 이미 오늘 도장이 있으면 아무것도 안 한다. */
export function earnDaily(raw: StampState, today: string): Change {
  const s = normalize(raw, today);
  if (s.stamps.includes(today)) return { state: s, ok: false };
  return {
    ok: true,
    state: { ...s, stamps: [...s.stamps, today], payout: { ...s.payout, dailyStampDate: today } },
  };
}

/** 광고 끝까지 시청 → 7일 연속 도장(10원짜리) 발급. claimedDate 도 라이브처럼 오늘로. */
export function earnStreak(raw: StampState, today: string): Change {
  const s = normalize(raw, today);
  if (!view(s, today).canEarnStreak) return { state: s, ok: false };
  return {
    ok: true,
    state: { ...s, claimedDate: today, payout: { ...s.payout, streakStampDate: today } },
  };
}

/** 도장 누름 → 지급 '기록'을 먼저 남긴다(ok=true 일 때만 지급 호출). 두 번째 호출은 ok=false. */
export function markDailyPaid(raw: StampState, today: string): Change {
  const s = normalize(raw, today);
  if (!view(s, today).dailyPending) return { state: s, ok: false };
  return { ok: true, state: { ...s, payout: { ...s.payout, dailyPaidDate: today } } };
}

export function markStreakPaid(raw: StampState, today: string): Change {
  const s = normalize(raw, today);
  if (!view(s, today).streakPending) return { state: s, ok: false };
  return { ok: true, state: { ...s, payout: { ...s.payout, streakPaidDate: today } } };
}

/**
 * 지급 실행 순서: 잠금 → 지급 기록(먼저) → 지급 호출 → 잠금 해제.
 * 같은 순간 두 번 눌러도(연타·재진입) 지급 호출은 한 번만 일어난다.
 */
export async function runClaim(
  lock: { busy: boolean },
  recordPaid: () => Promise<boolean>,
  grant: () => Promise<boolean>,
): Promise<boolean> {
  if (lock.busy) return false;
  lock.busy = true;
  try {
    const ok = await recordPaid();
    if (!ok) return false;
    return await grant();
  } finally {
    lock.busy = false;
  }
}
