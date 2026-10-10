import { TEST_PROMO } from './devFlags';

/** 광고 그룹 (콘솔 28423/24456 발급). 리워드는 라이브와 같은 그룹 하나만 쓴다. */
export const AD_IDS = {
  reward: 'ait.v2.live.7848babf27974479',
  /** 라이브와 같은 줄배너 — 이제 각 화면 스크롤 맨 위 한 곳만 */
  banner: 'ait.v2.live.a0ee7a06ab474249',
  /** 홈 ① 미션 도장 카드 바로 아래 — 오늘 도장·지급이 끝난 뒤에만 (기록탭 이미지) */
  homeAfterStamp: 'ait.v2.live.e9cc2b606e7743f3',
  /** 홈 ② 복용 목록과 '영양제 관리' 사이 (영양제_이미지광고) */
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

// TEST_ 코드는 시작 전(SCHEDULED) 프로모션에만 통한다. 8133 은 이미 RUNNING 이라 그대로 둔다.
export const PROMO = TEST_PROMO
  ? { daily: `TEST_${LIVE_PROMO.daily}`, streak: LIVE_PROMO.streak }
  : LIVE_PROMO;

export const DAILY_AMOUNT = 1;
export const STREAK_AMOUNT = 10;
