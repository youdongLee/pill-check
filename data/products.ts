/**
 * 제품 프리셋.
 *
 * 상표 문제와 심사 리스크를 피하려고 **브랜드명을 쓰지 않는다**. 시중 제품의 일반적인
 * 1회 섭취량을 카테고리별 대표값으로 담았다("종합비타민(실버형)" 같은 식).
 * 정확한 함량은 유저가 제품 뒷면을 보고 고칠 수 있게 한다.
 */
import type { TimingHint } from './ingredients';

export interface ProductIngredient {
  key: string;
  amount: number;
}

export interface Product {
  id: string;
  name: string;
  emoji: string;
  /** 카테고리 색 — 유저가 고르지 않고 자동 배정된다 */
  color: string;
  /** 1회 섭취량 기준 성분 */
  ingredients: ProductIngredient[];
  /** 이 제품에 권장되는 복용 시점 (성분에서 계산되지만, 대표값을 미리 지정) */
  timing: TimingHint;
  /** 흔한 포장 단위 — 남은 개수 입력 기본값 */
  defaultCount: number;
}

const GREEN = '#22C55E';
const BLUE = '#3B82F6';
const ORANGE = '#F97316';
const PURPLE = '#8B5CF6';
const TEAL = '#14B8A6';
const PINK = '#EC4899';

export const PRODUCTS: readonly Product[] = [
  {
    id: 'multi',
    name: '종합비타민',
    emoji: '💊',
    color: GREEN,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [
      { key: 'vitA', amount: 700 },
      { key: 'vitD', amount: 10 },
      { key: 'vitE', amount: 11 },
      { key: 'vitC', amount: 100 },
      { key: 'vitB1', amount: 1.2 },
      { key: 'vitB2', amount: 1.4 },
      { key: 'niacin', amount: 15 },
      { key: 'vitB6', amount: 1.5 },
      { key: 'folate', amount: 400 },
      { key: 'vitB12', amount: 2.4 },
      { key: 'zinc', amount: 8.5 },
      { key: 'selenium', amount: 55 },
    ],
  },
  {
    id: 'multiSilver',
    name: '종합비타민 (실버형)',
    emoji: '💊',
    color: GREEN,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [
      { key: 'vitA', amount: 700 },
      { key: 'vitD', amount: 20 },
      { key: 'vitE', amount: 11 },
      { key: 'vitC', amount: 100 },
      { key: 'vitB1', amount: 1.2 },
      { key: 'vitB2', amount: 1.4 },
      { key: 'niacin', amount: 15 },
      { key: 'vitB6', amount: 1.5 },
      { key: 'folate', amount: 400 },
      { key: 'vitB12', amount: 25 },
      { key: 'calcium', amount: 200 },
      { key: 'magnesium', amount: 100 },
      { key: 'zinc', amount: 8.5 },
      { key: 'lutein', amount: 10 },
    ],
  },
  {
    id: 'vitaminB',
    name: '비타민 B 컴플렉스',
    emoji: '🅱️',
    color: ORANGE,
    timing: 'any',
    defaultCount: 60,
    ingredients: [
      { key: 'vitB1', amount: 50 },
      { key: 'vitB2', amount: 50 },
      { key: 'niacin', amount: 25 },
      { key: 'vitB6', amount: 50 },
      { key: 'folate', amount: 400 },
      { key: 'vitB12', amount: 500 },
      { key: 'biotin', amount: 150 },
      { key: 'pantothenic', amount: 50 },
    ],
  },
  {
    id: 'vitaminC',
    name: '비타민 C',
    emoji: '🍊',
    color: ORANGE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'vitC', amount: 1000 }],
  },
  {
    id: 'vitaminD',
    name: '비타민 D',
    emoji: '☀️',
    color: ORANGE,
    timing: 'withMeal',
    defaultCount: 90,
    ingredients: [{ key: 'vitD', amount: 25 }],
  },
  {
    id: 'calcium',
    name: '칼슘 · 마그네슘 · 비타민D',
    emoji: '🦴',
    color: BLUE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [
      { key: 'calcium', amount: 500 },
      { key: 'magnesium', amount: 250 },
      { key: 'vitD', amount: 10 },
      { key: 'zinc', amount: 8 },
    ],
  },
  {
    id: 'omega3',
    name: '오메가3',
    emoji: '🐟',
    color: BLUE,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'omega3', amount: 1000 }],
  },
  {
    id: 'probiotics',
    name: '유산균',
    emoji: '🦠',
    color: TEAL,
    timing: 'empty',
    defaultCount: 30,
    ingredients: [{ key: 'probiotics', amount: 100 }],
  },
  {
    id: 'lutein',
    name: '루테인',
    emoji: '👁️',
    color: PURPLE,
    timing: 'withMeal',
    defaultCount: 30,
    ingredients: [{ key: 'lutein', amount: 20 }],
  },
  {
    id: 'milkThistle',
    name: '밀크씨슬',
    emoji: '🌿',
    color: TEAL,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'milkThistle', amount: 350 }],
  },
  {
    id: 'iron',
    name: '철분',
    emoji: '🩸',
    color: PINK,
    timing: 'empty',
    defaultCount: 60,
    ingredients: [
      { key: 'iron', amount: 24 },
      { key: 'vitC', amount: 100 },
    ],
  },
  {
    id: 'magnesium',
    name: '마그네슘',
    emoji: '🌙',
    color: PURPLE,
    timing: 'bedtime',
    defaultCount: 90,
    ingredients: [{ key: 'magnesium', amount: 315 }],
  },
  {
    id: 'zinc',
    name: '아연',
    emoji: '⚡',
    color: ORANGE,
    timing: 'withMeal',
    defaultCount: 90,
    ingredients: [{ key: 'zinc', amount: 15 }],
  },
  {
    id: 'coq10',
    name: '코엔자임Q10',
    emoji: '❤️',
    color: PINK,
    timing: 'withMeal',
    defaultCount: 30,
    ingredients: [{ key: 'coq10', amount: 100 }],
  },
  {
    id: 'redGinseng',
    name: '홍삼',
    emoji: '🫚',
    color: PINK,
    timing: 'any',
    defaultCount: 30,
    ingredients: [{ key: 'redGinseng', amount: 3000 }],
  },
  {
    id: 'joint',
    name: 'MSM · 관절',
    emoji: '🦵',
    color: BLUE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [
      { key: 'msm', amount: 1500 },
      { key: 'chondroitin', amount: 600 },
    ],
  },
  {
    id: 'collagen',
    name: '콜라겐',
    emoji: '✨',
    color: PINK,
    timing: 'any',
    defaultCount: 30,
    ingredients: [
      { key: 'collagen', amount: 1500 },
      { key: 'vitC', amount: 100 },
    ],
  },
  {
    id: 'fiber',
    name: '식이섬유',
    emoji: '🌾',
    color: TEAL,
    timing: 'any',
    defaultCount: 30,
    ingredients: [{ key: 'psyllium', amount: 5 }],
  },
  {
    id: 'multiWoman',
    name: '종합비타민 (여성용)',
    emoji: '💊',
    color: PINK,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [
      { key: 'vitA', amount: 650 },
      { key: 'vitD', amount: 10 },
      { key: 'vitE', amount: 11 },
      { key: 'vitC', amount: 100 },
      { key: 'vitB6', amount: 1.4 },
      { key: 'folate', amount: 400 },
      { key: 'vitB12', amount: 2.4 },
      { key: 'iron', amount: 14 },
      { key: 'calcium', amount: 210 },
    ],
  },
  {
    id: 'vitaminE',
    name: '비타민 E',
    emoji: '🌰',
    color: ORANGE,
    timing: 'withMeal',
    defaultCount: 90,
    ingredients: [{ key: 'vitE', amount: 100 }],
  },
  {
    id: 'calciumOnly',
    name: '칼슘',
    emoji: '🦴',
    color: BLUE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'calcium', amount: 500 }],
  },
  {
    id: 'omega3Vitd',
    name: '오메가3 + 비타민D',
    emoji: '🐟',
    color: BLUE,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [
      { key: 'omega3', amount: 1000 },
      { key: 'vitD', amount: 25 },
    ],
  },
  {
    id: 'krillOil',
    name: '크릴오일',
    emoji: '🦐',
    color: PINK,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'krillOil', amount: 1000 }],
  },
  {
    id: 'propolis',
    name: '프로폴리스',
    emoji: '🐝',
    color: ORANGE,
    timing: 'any',
    defaultCount: 60,
    ingredients: [{ key: 'propolis', amount: 500 }],
  },
  {
    id: 'sawPalmetto',
    name: '쏘팔메토',
    emoji: '🌴',
    color: TEAL,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'sawPalmetto', amount: 320 }],
  },
  {
    id: 'glucosamine',
    name: '글루코사민',
    emoji: '🦵',
    color: BLUE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'glucosamine', amount: 1500 }],
  },
  {
    id: 'eveningPrimrose',
    name: '달맞이꽃 종자유',
    emoji: '🌼',
    color: PINK,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'gla', amount: 300 }],
  },
  {
    id: 'arginine',
    name: '아르기닌',
    emoji: '💪',
    color: PURPLE,
    timing: 'empty',
    defaultCount: 30,
    ingredients: [{ key: 'arginine', amount: 2000 }],
  },
  {
    id: 'spirulina',
    name: '스피루리나',
    emoji: '🌊',
    color: TEAL,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'spirulina', amount: 2000 }],
  },
  {
    id: 'bilberry',
    name: '빌베리 (눈 영양)',
    emoji: '🫐',
    color: PURPLE,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [
      { key: 'bilberry', amount: 170 },
      { key: 'lutein', amount: 10 },
    ],
  },
  {
    id: 'boswellia',
    name: '보스웰리아',
    emoji: '🌳',
    color: TEAL,
    timing: 'any',
    defaultCount: 60,
    ingredients: [{ key: 'boswellia', amount: 300 }],
  },
  {
    id: 'hyaluronic',
    name: '히알루론산',
    emoji: '💧',
    color: PINK,
    timing: 'any',
    defaultCount: 30,
    ingredients: [{ key: 'hyaluronic', amount: 120 }],
  },
  {
    id: 'greenMussel',
    name: '초록입홍합',
    emoji: '🦪',
    color: BLUE,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'greenMussel', amount: 1200 }],
  },
  {
    id: 'garlic',
    name: '흑마늘 · 마늘',
    emoji: '🧄',
    color: ORANGE,
    timing: 'withMeal',
    defaultCount: 60,
    ingredients: [{ key: 'garlic', amount: 1000 }],
  },
  {
    id: 'noni',
    name: '노니',
    emoji: '🥥',
    color: TEAL,
    timing: 'any',
    defaultCount: 30,
    ingredients: [{ key: 'noni', amount: 1000 }],
  },
  {
    id: 'folate',
    name: '엽산',
    emoji: '🍃',
    color: GREEN,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'folate', amount: 400 }],
  },
  {
    id: 'biotin',
    name: '비오틴',
    emoji: '💇',
    color: PURPLE,
    timing: 'any',
    defaultCount: 90,
    ingredients: [{ key: 'biotin', amount: 5000 }],
  },
  {
    id: 'zincSelenium',
    name: '아연 + 셀레늄',
    emoji: '⚡',
    color: ORANGE,
    timing: 'withMeal',
    defaultCount: 90,
    ingredients: [
      { key: 'zinc', amount: 15 },
      { key: 'selenium', amount: 55 },
    ],
  },
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function findProduct(id: string): Product | undefined {
  return BY_ID.get(id);
}

/**
 * 구버전에 이름만 저장돼 있던 영양제를 제품 프리셋에 맞춰본다.
 * 확실하지 않으면 undefined를 돌려주고, 앱은 "성분을 확인해 주세요" 배지를 띄운다.
 */
export function guessProductByName(name: string): Product | undefined {
  const n = name.replace(/\s/g, '');
  // 앞에 오는 규칙이 이긴다 — 좁은 표현을 먼저 두어야 "비타민D"가 "비타민"에 먹히지 않는다
  const rules: [RegExp, string][] = [
    [/종합|멀티|multi/i, 'multi'],
    [/비타민B|비타민비|B컴플|비콤/i, 'vitaminB'],
    [/비타민C|비타민씨/i, 'vitaminC'],
    [/비타민D|비타민디/i, 'vitaminD'],
    [/비타민E|비타민이|토코페롤/i, 'vitaminE'],
    [/칼슘/, 'calcium'],
    [/크릴/, 'krillOil'],
    [/오메가/, 'omega3'],
    [/유산균|프로바이오/i, 'probiotics'],
    [/빌베리|아이브라이트/i, 'bilberry'],
    [/루테인/, 'lutein'],
    [/밀크씨슬|실리마린/, 'milkThistle'],
    [/철분|철/, 'iron'],
    [/마그네슘|마그/, 'magnesium'],
    [/아연/, 'zinc'],
    [/코큐텐|코엔자임|Q10/i, 'coq10'],
    [/홍삼/, 'redGinseng'],
    [/글루코사민/, 'glucosamine'],
    [/보스웰리아/, 'boswellia'],
    [/초록입|홍합/, 'greenMussel'],
    [/관절|MSM|콘드로이틴/i, 'joint'],
    [/콜라겐/, 'collagen'],
    [/히알루론/, 'hyaluronic'],
    [/식이섬유|차전자/, 'fiber'],
    [/프로폴리스/, 'propolis'],
    [/쏘팔메토|쏘팔/, 'sawPalmetto'],
    [/달맞이|감마리놀렌/, 'eveningPrimrose'],
    [/아르기닌/, 'arginine'],
    [/스피루리나/, 'spirulina'],
    [/마늘/, 'garlic'],
    [/노니/, 'noni'],
    [/엽산/, 'folate'],
    [/비오틴/, 'biotin'],
  ];
  for (const [re, id] of rules) {
    if (re.test(n)) return BY_ID.get(id);
  }
  return undefined;
}
