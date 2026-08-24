/**
 * 디자인 토큰.
 *
 * 색을 고른 기준 — 형광 초록(#22C55E)과 순회색 조합은 값싸 보인다.
 * 배경은 따뜻한 오프화이트로 눕히고, 포인트는 채도를 낮춘 깊은 초록으로 내렸다.
 * 회색도 초록 쪽으로 살짝 기울여서 화면 전체가 한 덩어리로 보이게 한다.
 *
 * 구조 원칙 — 한 페이지에 구역을 쌓는다(5060 유저는 문을 눌러 들어가지 않는다).
 * 구역은 박스가 아니라 큰 제목과 넉넉한 여백으로 나눈다.
 */

// ── 바탕 ──
export const BG = '#FAF9F5'; // 따뜻한 오프화이트 — 흰색보다 눈이 편하다
export const SURFACE = '#FFFFFF';
export const SUNK = '#F2F1EB'; // 구역 사이를 나누는 띠
export const LINE = '#E3E1D8';

// ── 포인트 ──
export const PRIMARY = '#12704A'; // 깊은 초록
export const PRIMARY_DARK = '#0C5537';
export const PRIMARY_SOFT = '#E7F0EA';

// ── 강조 ──
export const GOLD = '#9A7220';
export const GOLD_BG = '#F7EEDA';
export const GOLD_DARK = '#7A5A18';
export const WARN = '#A8432A';
export const WARN_BG = '#F8E7E1';

// ── 글자 ──
export const TEXT = '#1A1F1B';
export const TEXT_SUB = '#59635B';
export const TEXT_MUTED = '#8C948B';

// ── 글자 크기 ──
export const T_HERO = 27;
export const T_TITLE = 22;
export const T_BODY = 17;
export const T_SUB = 15;
export const T_SMALL = 13;

// ── 여백 ──
export const PAD = 22;

/** 눌리는 것에 얹는 아주 옅은 그림자 — 떠 보이되 튀지 않게 */
export const LIFT = {
  shadowColor: '#1A1F1B',
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

/**
 * 보상 — 현행 배포본과 동일하다. 둘 다 빈도가 고정돼 유저가 늘릴 수 없다.
 * 복용 건수당 지급은 두지 않는다(등록을 늘릴수록 지급이 커져 마진이 역주행한다).
 * 금액은 콘솔 프로모션의 최대 지급액과 일치해야 한다.
 */
export const DAILY_BONUS = 3;
export const STREAK_BONUS = 10;
export const STREAK_DAYS = 7;

// 이전 이름을 쓰던 화면들이 남아 있어 별칭을 둔다
export const PRIMARY_LIGHT = PRIMARY_SOFT;
export const CARD = SURFACE;
