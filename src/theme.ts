/**
 * 디자인 토큰.
 *
 * 원칙 — 화면을 카드로 채우지 않는다.
 *  · 박스(흰 배경 + 테두리 + 그림자)로 구역을 나누지 않고, 여백과 글자 크기로 나눈다.
 *  · 한 화면에 주인공은 하나. 주인공만 크고, 나머지는 작고 조용하다.
 *  · 5060 타깃이라 본문은 16 아래로 내려가지 않고, 누르는 것은 확실히 크게 만든다.
 */

// ── 색 ──
export const PRIMARY = '#22C55E';
export const PRIMARY_DARK = '#15803D';
export const PRIMARY_LIGHT = '#DCFCE7';
export const BG = '#F4FBF6'; // 배경 자체가 화면이다. 이 위에 바로 글을 얹는다
export const LINE = '#DDE7E0'; // 구역을 나눌 때 쓰는 유일한 선
export const GOLD = '#F59E0B';
export const GOLD_BG = '#FEF3C7';
export const GOLD_DARK = '#92610A';
export const WARN = '#C2410C';
export const WARN_BG = '#FFEDD5';
export const TEXT = '#14231A';
export const TEXT_SUB = '#5A6B60';
export const TEXT_MUTED = '#8B9A91';

// ── 글자 크기 ──
export const T_HERO = 26; // 지금 할 일
export const T_TITLE = 22; // 화면 제목
export const T_BODY = 17; // 본문
export const T_SUB = 15; // 보조
export const T_SMALL = 13; // 각주

// ── 여백 ──
export const PAD = 24; // 화면 좌우 여백

/**
 * 보상 — 현행 배포본과 동일하다. 둘 다 빈도가 고정돼 유저가 늘릴 수 없다.
 * 복용 건수당 지급은 두지 않는다(등록을 늘릴수록 지급이 커져 마진이 역주행한다).
 * 금액은 콘솔 프로모션의 최대 지급액과 일치해야 한다.
 */
export const DAILY_BONUS = 3; // 그날 전량 복용 = 3원 (하루 1회)
export const STREAK_BONUS = 10; // 7일 연속 = 10원 (주 1회)
export const STREAK_DAYS = 7;
