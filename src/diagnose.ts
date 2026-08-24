/**
 * 내 영양제 진단.
 *
 * 지금까지 이 앱(과 비슷한 앱들)은 "유저가 먹는 것"만 보고 중복·과다를 따졌다.
 * 여기서는 **내 나이·성별 기준치**를 놓고 지금 영양제가 어디쯤 있는지를 본다.
 *
 * ⚠️ 표현의 선 — 이 엔진은 "더 드세요"라고 말하지 않는다.
 *    권장섭취량은 음식을 포함한 하루 전체 기준이라, 영양제로 100%를 채우는 게 목표가 아니다.
 *    그래서 부족을 '결핍'이 아니라 "영양제로는 거의 안 들어와요"로만 알린다.
 *    넘치는 것(상한 초과)만 분명히 경고한다 — 그건 실제로 해로울 수 있는 방향이다.
 */
import { findIngredient } from '../data/ingredients';
import { FOOD_FIRST, referenceFor, type Sex } from '../data/rda';
import { totalsFor, type IngredientTotal } from './analyze';
import type { Pill } from '../data/types';

export type Level = 'over' | 'plenty' | 'covered' | 'little' | 'none';

export interface DiagnosedItem {
  key: string;
  name: string;
  unit: string;
  /** 영양제로 들어오는 하루 양 */
  intake: number;
  /** 나이·성별 기준 하루 섭취량 (음식 포함) */
  reference: number | null;
  /** 기준 대비 % (기준이 없으면 null) */
  percent: number | null;
  /** 상한 대비 % (상한이 없으면 null) */
  upperPercent: number | null;
  level: Level;
  sources: string[];
}

export interface Diagnosis {
  items: DiagnosedItem[];
  /** 상한을 넘긴 것 — 유일하게 "위험" 쪽으로 말할 수 있는 항목 */
  over: DiagnosedItem[];
  /** 기준의 절반도 안 들어오는 것 */
  little: DiagnosedItem[];
  /** 기준 근처로 들어오는 것 */
  covered: DiagnosedItem[];
  /** 한 줄 요약 */
  headline: string;
}

function levelOf(t: IngredientTotal, reference: number | null): Level {
  if (t.percent !== null && t.percent > 100) return 'over'; // 상한 초과
  if (reference === null) return 'none'; // 비교 기준이 없는 성분(기능성 원료 등)
  const pct = (t.total / reference) * 100;
  if (pct >= 150) return 'plenty';
  if (pct >= 50) return 'covered';
  return 'little';
}

export function diagnose(pills: Pill[], sex: Sex, age: number): Diagnosis {
  const reference = referenceFor(sex, age);
  const totals = totalsFor(pills);

  const items: DiagnosedItem[] = totals.map((t) => {
    const ref = reference[t.key] ?? null;
    return {
      key: t.key,
      name: t.name,
      unit: t.unit,
      intake: t.total,
      reference: ref,
      percent: ref ? Math.round((t.total / ref) * 100) : null,
      upperPercent: t.percent,
      level: levelOf(t, ref),
      sources: t.sources,
    };
  });

  const over = items.filter((i) => i.level === 'over');
  // 음식으로 챙기는 게 맞는 영양소는 부족으로 세지 않는다
  const little = items.filter((i) => i.level === 'little' && !FOOD_FIRST.has(i.key));
  const covered = items.filter((i) => i.level === 'covered' || i.level === 'plenty');

  const headline =
    over.length > 0
      ? `${over[0].name}이(가) 상한을 넘었어요`
      : covered.length === 0
        ? '아직 진단할 성분이 없어요'
        : `${covered.length}가지가 기준만큼 들어오고 있어요`;

  return { items, over, little, covered, headline };
}

/**
 * 기준 대비 아직 영양제로 들어오지 않는 성분 중, 이 사람 연령대에서 자주 챙기는 것.
 * "권하는" 것이 아니라 "지금 안 들어오는 것"을 보여주는 목적이다.
 */
export function notCovered(pills: Pill[], sex: Sex, age: number): { key: string; name: string; unit: string; reference: number }[] {
  const reference = referenceFor(sex, age);
  const have = new Set<string>();
  pills.forEach((p) => p.ingredients.forEach((i) => have.add(i.key)));
  return Object.entries(reference)
    .filter(([key]) => !have.has(key) && !FOOD_FIRST.has(key))
    .map(([key, value]) => {
      const meta = findIngredient(key);
      return meta ? { key, name: meta.name, unit: meta.unit, reference: value } : null;
    })
    .filter(Boolean) as { key: string; name: string; unit: string; reference: number }[];
}

export const DIAGNOSE_NOTE =
  '기준 섭취량은 음식까지 포함한 하루 전체 기준이에요. 영양제로 100%를 채우는 게 목표가 아니고, 대부분은 식사로 들어와요. 그래서 모자라 보여도 문제가 아닐 수 있어요.';
