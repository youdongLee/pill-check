// 광고 / 프로모션 식별자 모음.
// 지면은 앱마다 별도 발급한다. 아직 발급 전인 지면은 기존 운영 배너 ID로 폴백해 두었으니,
// 콘솔에서 신규 지면을 발급하면 해당 항목만 교체하면 된다.
const LIVE_BANNER = 'ait.v2.live.a0ee7a06ab474249'; // 기존 운영 배너(이미 발급됨)
const LIVE_REWARD = 'ait.v2.live.7848babf27974479'; // 기존 운영 리워드(이미 발급됨)

export const AD_IDS = {
  /** 홈 상단 배너 */
  homeBanner: LIVE_BANNER,
  /** 홈 하단 피드(이미지형) — TODO: 신규 지면 발급 후 교체 */
  homeFeed: LIVE_BANNER,
  /** 기록 탭 피드 — TODO: 신규 지면 발급 후 교체 */
  recordFeed: LIVE_BANNER,
  /** 영양제 관리 탭 피드 */
  manageFeed: LIVE_BANNER,
  /** 내 플랜 탭 피드 */
  presetFeed: LIVE_BANNER,
  /** 스탬프 발급용 리워드 전면형 (지급 경로 아님 — 스탬프만 발급) */
  reward: LIVE_REWARD,
  /** 슬롯 추가용 리워드 전면형 — TODO: 신규 지면 발급 후 교체(현재는 reward와 공용) */
  rewardSlot: LIVE_REWARD,
};

// 프로모션 코드 — 콘솔에서 발급한 운영 코드로 교체할 것(TEST_ 접두사가 남으면 집행액이 0으로 잡힌다).
export const PROMO = {
  /** 복용 스탬프 1개 수령 */
  intake: 'PILLCHECK_INTAKE',
  /** 하루 전량 복용 완주 보너스 */
  bonus: 'PILLCHECK_BONUS',
  /** 7일 연속 완주 보너스 */
  streak: 'PILLCHECK_STREAK_7',
};
