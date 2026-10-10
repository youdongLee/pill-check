/**
 * 개발·테스트용 스위치. 운영 번들은 반드시 둘 다 false.
 * - TEST_PROMO: 프로모션 코드를 TEST_ 코드로 바꾼다 (테스트 번들 전용, 실제 지급 없음)
 * - SHOW_DEV_PANEL: 홈 하단 🧪 테스트 패널 (실유저에게 나가면 초기화·광고 스킵을 누를 수 있다)
 */
export const TEST_PROMO = true;
export const SHOW_DEV_PANEL = true;

export const devFlags = {
  skipAds: false,
};
