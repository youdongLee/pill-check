/**
 * 영양제 조합 점검 엔진.
 *
 * ⚠️ 정보 범위를 지킬 것 — 이 앱은 **질병·의약품 상호작용을 다루지 않는다.**
 *    치료·예방·효능을 말하지 않고, 다루는 것은 딱 세 가지다:
 *      ① 같은 성분이 여러 제품에 겹치는지 (중복)
 *      ② 하루 총량이 공인된 상한섭취량을 넘는지 (과다)
 *      ③ 영양소끼리 흡수를 방해하거나 돕는지 (궁합)
 *    모든 화면에 "의료 자문이 아니며 복용 상담은 약사·의사에게" 고지를 함께 띄운다.
 */
import { findIngredient, findInteraction, type TimingHint } from '../data/ingredients';
import type { Pill } from '../data/types';

export interface IngredientTotal {
  key: string;
  name: string;
  unit: string;
  /** 하루 총 섭취량 (제품별 1회량 × 하루 복용 횟수의 합) */
  total: number;
  upperLimit: number | null;
  /** 상한 대비 비율(%). 상한이 없으면 null */
  percent: number | null;
  /** 이 성분이 들어 있는 제품 이름들 */
  sources: string[];
}

export type FindingLevel = 'over' | 'duplicate' | 'conflict' | 'synergy';

export interface Finding {
  level: FindingLevel;
  title: string;
  message: string;
  /** 관련된 제품 이름 */
  products: string[];
}

/** 하루 복용 횟수 = 배정된 시간대 수 */
function dosesPerDay(pill: Pill): number {
  return Math.max(1, pill.slots.length);
}

/**
 * 받침 유무에 따라 조사를 붙인다.
 * "비타민 C"처럼 한글이 아닌 글자로 끝나면 읽는 법이 제각각이라(씨·디·케이…)
 * 조사를 아예 생략한다 — "비타민 C 겹쳐요"가 "비타민 C이 겹쳐요"보다 자연스럽다.
 */
function withJosa(word: string, withBatchim: string, without: string): string {
  const code = word.trim().slice(-1).charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return word;
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : without}`;
}

/** 등록된 영양제 전체를 성분 단위로 합산한다 */
export function totalsFor(pills: Pill[]): IngredientTotal[] {
  const acc = new Map<string, { total: number; sources: Set<string> }>();

  for (const pill of pills) {
    const doses = dosesPerDay(pill);
    for (const ing of pill.ingredients) {
      const cur = acc.get(ing.key) ?? { total: 0, sources: new Set<string>() };
      cur.total += ing.amount * doses;
      cur.sources.add(pill.name);
      acc.set(ing.key, cur);
    }
  }

  const out: IngredientTotal[] = [];
  for (const [key, { total, sources }] of acc) {
    const meta = findIngredient(key);
    if (!meta) continue;
    // 소수 둘째 자리에서 반올림 — 0.1mg 단위 성분이 있어 정수 반올림은 정보를 잃는다
    const rounded = Math.round(total * 100) / 100;
    out.push({
      key,
      name: meta.name,
      unit: meta.unit,
      total: rounded,
      upperLimit: meta.upperLimit,
      percent: meta.upperLimit ? Math.round((rounded / meta.upperLimit) * 100) : null,
      sources: [...sources],
    });
  }
  // 상한 대비 비율이 높은 것부터 — 유저가 봐야 할 순서
  return out.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
}

/** 점검 결과. 심각한 것부터 정렬해서 돌려준다 */
export function analyze(pills: Pill[]): { findings: Finding[]; totals: IngredientTotal[] } {
  const totals = totalsFor(pills);
  const findings: Finding[] = [];

  // ① 상한 초과
  for (const t of totals) {
    if (t.percent !== null && t.percent > 100) {
      findings.push({
        level: 'over',
        title: `${withJosa(t.name, '이', '가')} 상한을 넘었어요`,
        message: `하루 ${t.total}${t.unit}을 드시게 돼요. 권장 상한은 ${t.upperLimit}${t.unit}이에요.`,
        products: t.sources,
      });
    }
  }

  // ② 중복 — 성분마다 따로 알리면 "B1 겹쳐요 / B2 겹쳐요 / B6 겹쳐요…"로 도배된다.
  //    같은 제품 조합에서 나온 중복은 하나로 묶어서 알린다.
  const dupGroups = new Map<string, { products: string[]; names: string[] }>();
  for (const t of totals) {
    if (t.sources.length < 2) continue;
    // 이미 상한 초과로 잡힌 성분은 중복으로 또 알리지 않는다
    if (t.percent !== null && t.percent > 100) continue;
    const key = [...t.sources].sort().join('|');
    const g = dupGroups.get(key) ?? { products: [...t.sources].sort(), names: [] };
    g.names.push(t.name);
    dupGroups.set(key, g);
  }
  for (const g of dupGroups.values()) {
    const shown = g.names.slice(0, 3).join(' · ');
    const more = g.names.length > 3 ? ` 외 ${g.names.length - 3}가지` : '';
    findings.push({
      level: 'duplicate',
      title:
        g.names.length === 1
          ? `${withJosa(g.names[0], '이', '가')} 겹쳐요`
          : `${g.names.length}가지 성분이 겹쳐요`,
      message:
        g.names.length === 1
          ? `아래 두 제품에 함께 들어 있어요. 하나로 줄여도 되는지 살펴보세요.`
          : `${shown}${more}이(가) 아래 제품들에 함께 들어 있어요. 하나로 줄여도 되는지 살펴보세요.`,
      products: g.products,
    });
  }

  // ③ 궁합 — 같은 시간대에 배정된 성분끼리만 따진다
  const seen = new Set<string>();
  for (const a of pills) {
    for (const b of pills) {
      if (a.id === b.id) continue;
      const shared = a.slots.filter((s) => b.slots.includes(s));
      if (shared.length === 0) continue;
      for (const ia of a.ingredients) {
        for (const ib of b.ingredients) {
          const it = findInteraction(ia.key, ib.key);
          if (!it) continue;
          const pairKey = [ia.key, ib.key].sort().join('|');
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
          const na = findIngredient(ia.key)?.name ?? ia.key;
          const nb = findIngredient(ib.key)?.name ?? ib.key;
          findings.push({
            level: it.type,
            title: it.type === 'conflict' ? `${na} · ${nb} 시간을 나눠보세요` : `${na} · ${nb} 잘 맞아요`,
            message: it.message,
            products: [a.name, b.name],
          });
        }
      }
    }
  }

  const order: Record<FindingLevel, number> = { over: 0, duplicate: 1, conflict: 2, synergy: 3 };
  findings.sort((x, y) => order[x.level] - order[y.level]);
  return { findings, totals };
}

/** 홈 배너에 띄울 요약 — 손볼 게 있는지만 알려준다 */
export function summarize(findings: Finding[]): { count: number; headline: string } | null {
  const actionable = findings.filter((f) => f.level !== 'synergy');
  if (actionable.length === 0) return null;
  return { count: actionable.length, headline: actionable[0].title };
}

/**
 * 성분을 보고 복용 시점을 정한다.
 * 제약이 강한 것(공복·취침 전)이 하나라도 있으면 그쪽을 따른다.
 */
export function recommendTiming(ingredientKeys: string[]): { timing: TimingHint; reason?: string } {
  const metas = ingredientKeys.map(findIngredient).filter(Boolean) as NonNullable<ReturnType<typeof findIngredient>>[];
  const priority: TimingHint[] = ['empty', 'bedtime', 'withMeal', 'any'];
  for (const t of priority) {
    const hit = metas.find((m) => m.timing === t);
    if (hit) return { timing: hit.timing, reason: hit.timingReason };
  }
  return { timing: 'any' };
}

export const TIMING_LABEL: Record<TimingHint, string> = {
  withMeal: '식후',
  empty: '공복',
  bedtime: '자기 전',
  any: '아무 때나',
};

/** 모든 점검 화면에 함께 띄우는 고지 */
export const DISCLAIMER =
  '이 정보는 식약처가 정한 영양소 상한섭취량과 일반적인 흡수 관계를 알려드리는 것이며, 의료 자문이 아니에요. 드시는 약이 있거나 몸에 이상이 있으면 약사·의사와 상담해 주세요.';
