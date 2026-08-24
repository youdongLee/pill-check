import type { ProductIngredient } from './products';

/** 복용 시간대 — 유저가 키보드로 시간을 찍지 않는다. 네 칸이면 충분하다. */
export type SlotKey = 'morning' | 'lunch' | 'evening' | 'bedtime';

export interface Slot {
  key: SlotKey;
  label: string;
  emoji: string;
  /** 기본 시각 (설정에서 한 번만 바꾼다) */
  defaultTime: string;
}

export const SLOTS: readonly Slot[] = [
  { key: 'morning', label: '아침', emoji: '🌅', defaultTime: '08:00' },
  { key: 'lunch', label: '점심', emoji: '☀️', defaultTime: '12:00' },
  { key: 'evening', label: '저녁', emoji: '🌙', defaultTime: '18:00' },
  { key: 'bedtime', label: '자기 전', emoji: '😴', defaultTime: '22:00' },
];

export function slotOf(key: SlotKey): Slot {
  return SLOTS.find((s) => s.key === key) ?? SLOTS[0];
}

export interface Pill {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** 프리셋에서 만든 경우 그 제품 id. 직접 입력이면 undefined */
  productId?: string;
  /** 1회 섭취량 기준 성분. 비어 있으면 "성분 확인 필요" 상태 */
  ingredients: ProductIngredient[];
  /** 복용 시간대 */
  slots: SlotKey[];
  /** 남은 개수. 세지 않으면 undefined */
  remaining?: number;
  /** 구버전 기록에서 이름만 보고 추정한 항목 — 유저 확인이 필요하다 */
  needsReview?: boolean;
}

export interface Intake {
  pillId: string;
  pillName: string; // 기록 보존용 (제품을 지워도 기록은 남는다)
  slot: SlotKey;
  taken: boolean;
}

export interface DailyRecord {
  date: string; // "YYYY-MM-DD"
  intakes: Intake[];
}
