/**
 * 연령·성별 기준 섭취량 — 「2020 한국인 영양소 섭취기준」(보건복지부·한국영양학회).
 *
 * ⚠️ 이 숫자를 "영양제로 채워야 할 목표"로 제시하면 안 된다.
 *    권장섭취량은 **음식을 포함한 하루 전체** 기준이고, 대부분은 식사로 들어온다.
 *    그래서 화면에서는 "영양제로 이만큼 들어오고 있다"를 보여줄 뿐,
 *    모자란 만큼 더 먹으라고 말하지 않는다. (data/diagnose.ts 주석 참고)
 *
 * 값이 없는 성분(기능성 원료 등)은 기준 자체가 없으므로 비교하지 않는다.
 */

export type Sex = 'male' | 'female';

export interface AgeBand {
  key: string;
  label: string;
  /** 이 구간에 속하는 최소 나이 */
  from: number;
}

export const AGE_BANDS: readonly AgeBand[] = [
  { key: '19', label: '19~29세', from: 19 },
  { key: '30', label: '30~49세', from: 30 },
  { key: '50', label: '50~64세', from: 50 },
  { key: '65', label: '65~74세', from: 65 },
  { key: '75', label: '75세 이상', from: 75 },
];

/** 성분 key → 권장섭취량(RDA) 또는 충분섭취량(AI). 단위는 data/ingredients.ts 와 같다 */
type Table = Record<string, number>;

const FEMALE: Record<string, Table> = {
  '19': { vitA: 650, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.2, niacin: 14, vitB6: 1.4, folate: 400, vitB12: 2.4, calcium: 700, iron: 14, magnesium: 280, zinc: 8, selenium: 60, iodine: 150 },
  '30': { vitA: 650, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.2, niacin: 14, vitB6: 1.4, folate: 400, vitB12: 2.4, calcium: 700, iron: 14, magnesium: 280, zinc: 8, selenium: 60, iodine: 150 },
  '50': { vitA: 600, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.2, niacin: 14, vitB6: 1.4, folate: 400, vitB12: 2.4, calcium: 800, iron: 8, magnesium: 280, zinc: 8, selenium: 60, iodine: 150 },
  '65': { vitA: 600, vitD: 15, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.2, niacin: 13, vitB6: 1.4, folate: 400, vitB12: 2.4, calcium: 800, iron: 8, magnesium: 280, zinc: 7, selenium: 60, iodine: 150 },
  '75': { vitA: 600, vitD: 15, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.2, niacin: 13, vitB6: 1.4, folate: 400, vitB12: 2.4, calcium: 800, iron: 7, magnesium: 280, zinc: 7, selenium: 60, iodine: 150 },
};

const MALE: Record<string, Table> = {
  '19': { vitA: 800, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.2, vitB2: 1.5, niacin: 16, vitB6: 1.5, folate: 400, vitB12: 2.4, calcium: 800, iron: 10, magnesium: 350, zinc: 10, selenium: 60, iodine: 150 },
  '30': { vitA: 800, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.2, vitB2: 1.5, niacin: 16, vitB6: 1.5, folate: 400, vitB12: 2.4, calcium: 800, iron: 10, magnesium: 370, zinc: 10, selenium: 60, iodine: 150 },
  '50': { vitA: 750, vitD: 10, vitE: 12, vitC: 100, vitB1: 1.2, vitB2: 1.5, niacin: 16, vitB6: 1.5, folate: 400, vitB12: 2.4, calcium: 750, iron: 8, magnesium: 370, zinc: 9, selenium: 60, iodine: 150 },
  '65': { vitA: 700, vitD: 15, vitE: 12, vitC: 100, vitB1: 1.2, vitB2: 1.4, niacin: 14, vitB6: 1.5, folate: 400, vitB12: 2.4, calcium: 700, iron: 8, magnesium: 370, zinc: 9, selenium: 60, iodine: 150 },
  '75': { vitA: 700, vitD: 15, vitE: 12, vitC: 100, vitB1: 1.1, vitB2: 1.3, niacin: 13, vitB6: 1.5, folate: 400, vitB12: 2.4, calcium: 700, iron: 7, magnesium: 370, zinc: 9, selenium: 60, iodine: 150 },
};

/** 나이를 구간으로 접는다 */
export function bandOf(age: number): AgeBand {
  const found = [...AGE_BANDS].reverse().find((b) => age >= b.from);
  return found ?? AGE_BANDS[0];
}

/** 이 사람의 하루 기준 섭취량 (음식 포함 전체 기준) */
export function referenceFor(sex: Sex, age: number): Table {
  const band = bandOf(age).key;
  return (sex === 'male' ? MALE : FEMALE)[band] ?? {};
}

/**
 * 영양제로 채우기 어려운 성분 — 화면에서 "부족" 취급하지 않는다.
 * 이 영양소들은 식사에서 대부분 들어오고, 영양제로 억지로 채울 대상이 아니다.
 */
export const FOOD_FIRST = new Set(['iodine', 'magnesium', 'iron']);
