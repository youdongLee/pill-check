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
 * 보상 설계 — 지급은 주 1회, 금액 고정.
 *
 * 복용 건수당 지급은 두지 않는다. 유저가 영양제를 많이 등록할수록 지급이 늘어나는 구조라
 * 노출을 늘리려다 마진을 깎아먹는다. 일일 완주는 현금 대신 도장·연속일수로 보상하고,
 * 현금은 7일을 채운 유저에게만 고정액으로 나간다.
 */
export const STREAK_BONUS = 10; // 7일 연속 완주 = 10원 (유일한 지급)
export const STREAK_DAYS = 7;
