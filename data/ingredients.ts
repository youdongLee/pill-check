/**
 * 성분 사전.
 *
 * 상한섭취량(UL)은 「2020 한국인 영양소 섭취기준」(보건복지부·한국영양학회)의
 * 성인 기준값이다. UL이 설정되지 않은 성분은 null로 두고 과다 경고를 하지 않는다.
 *
 * ⚠️ 여기 담는 정보의 범위를 넘지 말 것 — 질병·의약품 상호작용은 다루지 않는다.
 *    공인된 영양소 상한과 흡수 간섭까지만이다. (자세한 이유는 src/analyze.ts 주석)
 */

/** 복용 시점 특성 */
export type TimingHint =
  | 'withMeal' // 식후(지방과 함께 흡수)
  | 'empty' // 공복
  | 'bedtime' // 취침 전
  | 'any';

export interface Ingredient {
  key: string;
  name: string;
  unit: string;
  /** 상한섭취량. null이면 상한이 설정되지 않은 성분 */
  upperLimit: number | null;
  timing: TimingHint;
  /** 이 성분을 왜 그 시간에 먹는지 — 유저에게 그대로 보여준다 */
  timingReason?: string;
}

export const INGREDIENTS: readonly Ingredient[] = [
  // ── 지용성 비타민: 식후 지방과 함께 흡수된다 ──
  { key: 'vitA', name: '비타민 A', unit: '㎍', upperLimit: 3000, timing: 'withMeal', timingReason: '기름에 녹는 영양소라 식후에 흡수가 잘 돼요' },
  { key: 'vitD', name: '비타민 D', unit: '㎍', upperLimit: 100, timing: 'withMeal', timingReason: '기름에 녹는 영양소라 식후에 흡수가 잘 돼요' },
  { key: 'vitE', name: '비타민 E', unit: 'mg', upperLimit: 540, timing: 'withMeal', timingReason: '기름에 녹는 영양소라 식후에 흡수가 잘 돼요' },
  { key: 'vitK', name: '비타민 K', unit: '㎍', upperLimit: null, timing: 'withMeal', timingReason: '기름에 녹는 영양소라 식후에 흡수가 잘 돼요' },

  // ── 수용성 비타민 ──
  { key: 'vitC', name: '비타민 C', unit: 'mg', upperLimit: 2000, timing: 'any' },
  { key: 'vitB1', name: '비타민 B1', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'vitB2', name: '비타민 B2', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'niacin', name: '나이아신', unit: 'mg', upperLimit: 35, timing: 'withMeal', timingReason: '공복에 먹으면 얼굴이 화끈거릴 수 있어요' },
  { key: 'vitB6', name: '비타민 B6', unit: 'mg', upperLimit: 100, timing: 'any' },
  { key: 'folate', name: '엽산', unit: '㎍', upperLimit: 1000, timing: 'any' },
  { key: 'vitB12', name: '비타민 B12', unit: '㎍', upperLimit: null, timing: 'any' },
  { key: 'biotin', name: '비오틴', unit: '㎍', upperLimit: null, timing: 'any' },
  { key: 'pantothenic', name: '판토텐산', unit: 'mg', upperLimit: null, timing: 'any' },

  // ── 미네랄 ──
  { key: 'calcium', name: '칼슘', unit: 'mg', upperLimit: 2500, timing: 'any' },
  { key: 'iron', name: '철', unit: 'mg', upperLimit: 45, timing: 'empty', timingReason: '공복에 먹으면 흡수가 잘 돼요 (속이 불편하면 식후로)' },
  { key: 'magnesium', name: '마그네슘', unit: 'mg', upperLimit: 350, timing: 'bedtime', timingReason: '근육 이완을 도와 자기 전에 많이 드세요' },
  { key: 'zinc', name: '아연', unit: 'mg', upperLimit: 35, timing: 'withMeal', timingReason: '공복에 먹으면 속이 메스꺼울 수 있어요' },
  { key: 'selenium', name: '셀레늄', unit: '㎍', upperLimit: 400, timing: 'any' },
  { key: 'iodine', name: '요오드', unit: '㎍', upperLimit: 2400, timing: 'any' },
  { key: 'copper', name: '구리', unit: '㎍', upperLimit: 10000, timing: 'any' },
  { key: 'manganese', name: '망간', unit: 'mg', upperLimit: 11, timing: 'any' },
  { key: 'chromium', name: '크롬', unit: '㎍', upperLimit: null, timing: 'any' },

  // ── 기능성 원료 ──
  { key: 'omega3', name: '오메가3 (EPA+DHA)', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름 성분이라 식후에 흡수가 잘 되고 속도 편해요' },
  { key: 'probiotics', name: '유산균', unit: '억 CFU', upperLimit: null, timing: 'empty', timingReason: '위산이 적은 공복에 먹어야 장까지 살아서 가요' },
  { key: 'lutein', name: '루테인', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름에 녹는 성분이라 식후가 좋아요' },
  { key: 'milkThistle', name: '밀크씨슬', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'coq10', name: '코엔자임Q10', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름에 녹는 성분이라 식후가 좋아요' },
  { key: 'redGinseng', name: '홍삼', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'msm', name: 'MSM', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'chondroitin', name: '콘드로이틴', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'collagen', name: '콜라겐', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'psyllium', name: '차전자피 식이섬유', unit: 'g', upperLimit: null, timing: 'any' },
  { key: 'propolis', name: '프로폴리스', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'sawPalmetto', name: '쏘팔메토', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름에 녹는 성분이라 식후가 좋아요' },
  { key: 'glucosamine', name: '글루코사민', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'gla', name: '감마리놀렌산', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름 성분이라 식후에 흡수가 잘 돼요' },
  { key: 'krillOil', name: '크릴오일', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름 성분이라 식후에 흡수가 잘 돼요' },
  { key: 'arginine', name: '아르기닌', unit: 'mg', upperLimit: null, timing: 'empty', timingReason: '공복에 먹어야 흡수가 잘 돼요' },
  { key: 'spirulina', name: '스피루리나', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'bilberry', name: '빌베리 추출물', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '눈 영양 성분은 식후 흡수가 좋아요' },
  { key: 'boswellia', name: '보스웰리아', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'hyaluronic', name: '히알루론산', unit: 'mg', upperLimit: null, timing: 'any' },
  { key: 'greenMussel', name: '초록입홍합', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '기름 성분이라 식후가 좋아요' },
  { key: 'garlic', name: '마늘 추출물', unit: 'mg', upperLimit: null, timing: 'withMeal', timingReason: '공복에 먹으면 속이 쓰릴 수 있어요' },
  { key: 'noni', name: '노니', unit: 'mg', upperLimit: null, timing: 'any' },
];

const BY_KEY = new Map(INGREDIENTS.map((i) => [i.key, i]));

export function findIngredient(key: string): Ingredient | undefined {
  return BY_KEY.get(key);
}

/**
 * 흡수 간섭·상승 관계.
 * 영양소끼리의 공인된 상호작용만 담는다. 의약품은 다루지 않는다.
 */
export interface Interaction {
  a: string;
  b: string;
  /** conflict = 같이 먹으면 손해, synergy = 같이 먹으면 이득 */
  type: 'conflict' | 'synergy';
  message: string;
}

export const INTERACTIONS: readonly Interaction[] = [
  { a: 'calcium', b: 'iron', type: 'conflict', message: '칼슘이 철분 흡수를 방해해요. 2시간 이상 띄워서 드세요' },
  { a: 'calcium', b: 'zinc', type: 'conflict', message: '칼슘과 아연은 서로 흡수를 방해해요. 시간을 나눠 드세요' },
  { a: 'iron', b: 'zinc', type: 'conflict', message: '철분과 아연은 같은 통로로 흡수돼 서로 경쟁해요. 시간을 나눠 드세요' },
  { a: 'zinc', b: 'copper', type: 'conflict', message: '아연을 많이 먹으면 구리가 부족해질 수 있어요' },
  { a: 'calcium', b: 'magnesium', type: 'conflict', message: '한꺼번에 많이 먹으면 서로 흡수를 방해해요. 나눠 드시는 게 좋아요' },
  { a: 'iron', b: 'vitC', type: 'synergy', message: '비타민 C가 철분 흡수를 도와줘요. 같이 드시면 좋아요' },
  { a: 'calcium', b: 'vitD', type: 'synergy', message: '비타민 D가 칼슘 흡수를 도와줘요. 같이 드시면 좋아요' },
];

/** 두 성분 사이의 관계를 찾는다 (a·b 순서와 무관) */
export function findInteraction(x: string, y: string): Interaction | undefined {
  return INTERACTIONS.find(
    (it) => (it.a === x && it.b === y) || (it.a === y && it.b === x),
  );
}
