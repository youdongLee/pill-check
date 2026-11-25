/**
 * 광고 그룹·프로모션 — RN src/ads.ts 그대로(라이브 20261019-43).
 * ⚠️ 코드를 지어내지 말 것. 없는 코드는 조용히 지급 실패한다.
 */
import { TEST_MODE } from '../lib/platform';

/** 광고 그룹 (콘솔 28423/24456 발급). 리워드는 라이브와 같은 그룹 하나만 쓴다. */
export const AD_IDS = {
  reward: 'ait.v2.live.7848babf27974479',
  /** 라이브와 같은 줄배너 — 각 화면 스크롤 맨 위 한 곳만 */
  banner: 'ait.v2.live.a0ee7a06ab474249',
  /** 홈 ① (기록탭 이미지) — RN 라이브에서도 정의만 있고 화면에 붙어 있지 않다 */
  homeAfterStamp: 'ait.v2.live.e9cc2b606e7743f3',
  /** 홈 ② 복용 목록 바로 아래 (영양제_이미지광고) */
  homeMid: 'ait.v2.live.cdd859d125c446bc',
  /** 관리 화면 목록 뒤 (영양제 추가 화면 이미지) */
  manageImage: 'ait.v2.live.14c7a31d3b0b46c9',
  /** 플랜 화면 저장된 플랜 목록 뒤 (플랜탭 이미지) */
  presetImage: 'ait.v2.live.b6930667f8144517',
} as const;

const LIVE_PROMO = {
  /** 62251 "매일 복약 완료하면 1원" */
  daily: '01M4J6FH5A5MRRAHFMEB6SE8FS',
  /** 8133 "7일 연속 복약 완료하면 10원" */
  streak: '01KNMBMT7JJR0HVRMS2Q44MW9V',
} as const;

/**
 * 🧪 테스트 번들에서는 매일 1원만 TEST_ 코드로 부른다.
 * RN 5f0713d: "TEST_ 코드는 시작 전(SCHEDULED) 프로모션에만 통한다. 8133 은 이미 RUNNING 이라 그대로 둔다."
 * → 테스트 번들에서도 7일 10원은 운영 코드(실제 지급)다. RN 동작 그대로.
 * 출시 번들에서는 TEST_MODE 가 상수 false 라 TEST_ 글자가 번들에 남지 않는다.
 */
export const PROMO = TEST_MODE ? { daily: `TEST_${LIVE_PROMO.daily}`, streak: LIVE_PROMO.streak } : LIVE_PROMO;

export const DAILY_AMOUNT = 1;
export const STREAK_AMOUNT = 10;

/**
 * 매일 오전 9시 "아침 영양제" 알림 동의 — RN src/notify.ts(ff4eae0).
 * 콘솔: 알림동의문 132129 "매일 아침 영양제 복용 알림"(SCHEDULED 매일 09:00) + 정기 템플릿 202266(APPROVED).
 */
export const NOTIFY_TEMPLATE_CODE = 'pillcheck-pill_9am';
/** 'agreed' | 'rejected' — RN 과 같은 키·값 */
export const NOTIFY_STATE_KEY = '@pillcheck/notify_daily_v1';
