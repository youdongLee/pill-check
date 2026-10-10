import { TEST_PROMO } from './devFlags';

/** 광고 그룹 (콘솔 28423/24456 발급). 리워드는 라이브와 같은 그룹 하나만 쓴다. */
export const AD_IDS = {
  reward: 'ait.v2.live.7848babf27974479',
  /** 라이브와 같은 줄배너 (홈 위·아래, 관리, 플랜) */
  banner: 'ait.v2.live.a0ee7a06ab474249',
  /** 홈 복용 목록 아래 이미지 광고 (영양제_이미지광고) */
  homeImage: 'ait.v2.live.cdd859d125c446bc',
  /** 홈 목록 위 이미지 광고 — 오늘 도장까지 다 받은 뒤에만 (기록탭 이미지) */
  homeDoneImage: 'ait.v2.live.e9cc2b606e7743f3',
} as const;

const LIVE_PROMO = {
  /** 62251 "매일 복약 완료하면 1원" */
  daily: '01M4J6FH5A5MRRAHFMEB6SE8FS',
  /** 8133 "7일 연속 복약 완료하면 10원" */
  streak: '01KNMBMT7JJR0HVRMS2Q44MW9V',
} as const;

export const PROMO = TEST_PROMO
  ? { daily: `TEST_${LIVE_PROMO.daily}`, streak: `TEST_${LIVE_PROMO.streak}` }
  : LIVE_PROMO;

export const DAILY_AMOUNT = 1;
export const STREAK_AMOUNT = 10;
