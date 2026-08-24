// 색상 팔레트 — 기존 앱 아이덴티티(초록) 유지
export const PRIMARY = '#22C55E';
export const PRIMARY_DARK = '#16A34A';
export const PRIMARY_LIGHT = '#DCFCE7';
export const BG = '#F0FDF4';
export const CARD = '#FFFFFF';
export const BORDER = '#E5E7EB';
export const GOLD = '#F59E0B';
export const GOLD_LIGHT = '#FEF3C7';
export const GOLD_DARK = '#B45309';
export const TEXT = '#111827';
export const TEXT_SUB = '#6B7280';
export const TEXT_MUTED = '#9CA3AF';

/**
 * 보상 설계 — 현행 배포본(20260423)과 동일한 지급 구조를 유지한다.
 *
 * 둘 다 "하루 1회 / 주 1회"로 빈도가 고정돼 있어 유저가 늘릴 수 없다.
 * 복용 건수당 지급(등록 개수에 비례)은 두지 않는다 — 노출을 늘리려다 마진을 깎아먹는다.
 * 금액은 콘솔 프로모션의 최대 지급액과 일치해야 한다.
 */
export const DAILY_BONUS = 3; // 그날 전량 복용 완주 = 3원 (하루 1회)
export const STREAK_BONUS = 10; // 7일 연속 완주 = 10원 (주 1회)
export const STREAK_DAYS = 7;
