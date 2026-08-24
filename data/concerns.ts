/**
 * 고민별 영양제 찾기.
 *
 * 이 앱에서 유일하게 "무엇을 먹을지"를 다루는 데이터다. 그래서 표현에 선을 긋는다.
 *
 * ⚠️ 여기 적는 문구는 **식약처가 인정한 기능성 내용 표현 그대로**만 쓴다.
 *    "도움을 줄 수 있음 / 필요" 까지가 한계다. 치료·예방·완치는 절대 쓰지 않는다.
 *    ("무릎 통증이 낫는다" ✗ / "관절 및 연골 건강에 도움을 줄 수 있음" ○)
 *    증상을 진단하지 않고, 고민을 입구로 삼아 해당 기능성 원료를 소개하는 데까지만 한다.
 */

export interface Concern {
  key: string;
  /** 유저가 자기 말로 알아볼 수 있는 표현 */
  label: string;
  emoji: string;
  /** 이 고민으로 들어온 사람에게 보여줄 원료들 (data/ingredients.ts 의 key) */
  ingredients: string[];
}

/** 원료별 식약처 인정 기능성 문구 — 화면에 이 문장을 그대로 보여준다 */
export const FUNCTION_CLAIMS: Record<string, string> = {
  glucosamine: '관절 및 연골 건강에 도움을 줄 수 있음',
  msm: '관절 및 연골 건강에 도움을 줄 수 있음',
  chondroitin: '관절 및 연골 건강에 도움을 줄 수 있음',
  boswellia: '관절 건강에 도움을 줄 수 있음',
  greenMussel: '관절 건강에 도움을 줄 수 있음',
  lutein: '노화로 인해 감소될 수 있는 황반색소밀도를 유지시켜 눈 건강에 도움을 줄 수 있음',
  bilberry: '눈의 피로도 개선에 도움을 줄 수 있음',
  omega3: '혈중 중성지질 개선·혈행 개선에 도움을 줄 수 있음',
  krillOil: '혈중 중성지질 개선·혈행 개선에 도움을 줄 수 있음',
  milkThistle: '간 건강에 도움을 줄 수 있음',
  probiotics: '유산균 증식 및 유해균 억제·배변활동 원활에 도움을 줄 수 있음',
  psyllium: '배변활동 원활에 도움을 줄 수 있음',
  calcium: '뼈와 치아 형성에 필요·골다공증 발생 위험 감소에 도움을 줌',
  vitD: '칼슘과 인이 흡수되고 이용되는 데 필요·뼈의 형성과 유지에 필요',
  magnesium: '에너지 이용에 필요·신경과 근육 기능 유지에 필요',
  vitB1: '탄수화물과 에너지 대사에 필요',
  vitB2: '체내 에너지 생성에 필요',
  niacin: '체내 에너지 생성에 필요',
  vitB6: '단백질 및 아미노산 이용에 필요',
  vitB12: '정상적인 엽산 대사에 필요',
  biotin: '지방·탄수화물·단백질 대사와 에너지 생성에 필요',
  pantothenic: '지방·탄수화물·단백질 대사와 에너지 생성에 필요',
  redGinseng: '면역력 증진·피로 개선에 도움을 줄 수 있음',
  zinc: '정상적인 면역기능에 필요·정상적인 세포분열에 필요',
  vitC: '결합조직 형성과 기능 유지에 필요·유해산소로부터 세포를 보호하는 데 필요',
  vitE: '유해산소로부터 세포를 보호하는 데 필요',
  selenium: '유해산소로부터 세포를 보호하는 데 필요',
  coq10: '높은 혈압 감소에 도움을 줄 수 있음·항산화에 도움을 줄 수 있음',
  gla: '혈행 개선·월경 전 불편한 상태 개선에 도움을 줄 수 있음',
  sawPalmetto: '전립선 건강의 유지에 도움을 줄 수 있음',
  collagen: '피부 보습에 도움을 줄 수 있음',
  hyaluronic: '피부 보습에 도움을 줄 수 있음',
  garlic: '혈중 콜레스테롤 개선에 도움을 줄 수 있음',
  spirulina: '피부 건강·항산화에 도움을 줄 수 있음',
  propolis: '구강에서의 항균 작용에 도움을 줄 수 있음',
  vitA: '어두운 곳에서 시각 적응에 필요·피부와 점막을 형성하고 기능을 유지하는 데 필요',
  iron: '체내 산소 운반과 혈액 생성에 필요',
  folate: '세포와 혈액 생성에 필요',
  noni: '항산화에 도움을 줄 수 있음',
  arginine: '운동 수행 능력 향상에 도움을 줄 수 있음',
};

export const CONCERNS: readonly Concern[] = [
  { key: 'joint', label: '무릎·관절이 시큰해요', emoji: '🦵', ingredients: ['glucosamine', 'msm', 'chondroitin', 'boswellia', 'greenMussel'] },
  { key: 'eye', label: '눈이 침침하고 뻑뻑해요', emoji: '👁️', ingredients: ['lutein', 'bilberry', 'omega3', 'vitA'] },
  { key: 'tired', label: '기운이 없고 피곤해요', emoji: '😮‍💨', ingredients: ['vitB1', 'vitB2', 'niacin', 'vitB6', 'vitB12', 'redGinseng'] },
  { key: 'bone', label: '뼈가 약해질까 걱정돼요', emoji: '🦴', ingredients: ['calcium', 'vitD', 'magnesium'] },
  { key: 'gut', label: '변비가 있고 속이 불편해요', emoji: '🚽', ingredients: ['probiotics', 'psyllium'] },
  { key: 'blood', label: '혈행·콜레스테롤이 걱정돼요', emoji: '🩸', ingredients: ['omega3', 'krillOil', 'garlic', 'coq10'] },
  { key: 'immune', label: '자주 아프고 면역이 약해요', emoji: '🛡️', ingredients: ['zinc', 'vitC', 'redGinseng', 'spirulina'] },
  { key: 'liver', label: '간이 피로한 것 같아요', emoji: '🌿', ingredients: ['milkThistle'] },
  { key: 'sleep', label: '잠을 잘 못 자요', emoji: '🌙', ingredients: ['magnesium'] },
  { key: 'skin', label: '피부가 건조해요', emoji: '✨', ingredients: ['collagen', 'hyaluronic', 'vitC', 'spirulina'] },
  { key: 'menopause', label: '갱년기가 힘들어요', emoji: '🌸', ingredients: ['gla', 'redGinseng', 'calcium'] },
  { key: 'prostate', label: '전립선이 신경 쓰여요', emoji: '💧', ingredients: ['sawPalmetto'] },
  { key: 'antiox', label: '노화가 신경 쓰여요', emoji: '🍃', ingredients: ['vitC', 'vitE', 'selenium', 'coq10'] },
  { key: 'hair', label: '머리카락·손톱이 약해요', emoji: '💇', ingredients: ['biotin', 'zinc'] },
  { key: 'anemia', label: '어지럽고 기운이 빠져요', emoji: '🫀', ingredients: ['iron', 'vitC', 'folate', 'vitB12'] },
];

export function findConcern(key: string): Concern | undefined {
  return CONCERNS.find((c) => c.key === key);
}

/** 고민 화면과 결과 화면에 항상 함께 띄우는 고지 */
export const CONCERN_DISCLAIMER =
  '건강기능식품은 질병을 치료하거나 예방하는 약이 아니에요. 여기 적힌 문구는 식약처가 인정한 기능성 내용이며, 몸에 이상이 있으면 먼저 병원에 가보셔야 해요.';
