/**
 * 점검 엔진 검증 하니스.
 * 실행: npx esbuild scripts/verify-analyze.ts --bundle --platform=node --outfile=.verify.js && node .verify.js
 */
import { analyze, recommendTiming, TIMING_LABEL } from '../src/analyze';
import { PRODUCTS, findProduct, guessProductByName } from '../data/products';
import { INGREDIENTS, findIngredient } from '../data/ingredients';
import type { Pill, SlotKey } from '../data/types';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

function makePill(productId: string, slots: SlotKey[]): Pill {
  const p = findProduct(productId)!;
  return {
    id: productId,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    productId: p.id,
    ingredients: p.ingredients,
    slots,
  };
}

console.log('\n[1] 데이터 무결성');
{
  const keys = new Set(INGREDIENTS.map((i) => i.key));
  check('성분 key 중복 없음', keys.size === INGREDIENTS.length);
  let orphan: string[] = [];
  for (const p of PRODUCTS) {
    for (const ing of p.ingredients) {
      if (!keys.has(ing.key)) orphan.push(`${p.id}:${ing.key}`);
    }
  }
  check('제품 성분이 모두 사전에 존재', orphan.length === 0, orphan.join(', '));
  check('제품 id 중복 없음', new Set(PRODUCTS.map((p) => p.id)).size === PRODUCTS.length);
  const badAmount = PRODUCTS.flatMap((p) => p.ingredients.filter((i) => !(i.amount > 0)).map((i) => `${p.id}:${i.key}`));
  check('성분 함량이 모두 양수', badAmount.length === 0, badAmount.join(', '));
}

console.log('\n[2] 형님 실사용 조합 (종합비타민×3회 + 비타민B + 비타민C + 칼슘)');
{
  const pills: Pill[] = [
    makePill('multi', ['morning', 'lunch', 'evening']),
    makePill('vitaminB', ['lunch']),
    makePill('vitaminC', ['lunch']),
    makePill('calcium', ['lunch']),
  ];
  const { findings, totals } = analyze(pills);
  const titles = findings.map((f) => f.title);
  console.log('   → ' + titles.join('\n   → '));

  const text = (f: { title: string; message: string }) => `${f.title} ${f.message}`;
  check('B군 중복을 잡아낸다', findings.some((f) => f.level === 'duplicate' && text(f).includes('비타민 B')));
  check('비타민 C 중복/과다를 잡아낸다', findings.some((f) => text(f).includes('비타민 C')));
  check('중복 경고가 성분마다 쪼개지지 않는다 (제품 쌍으로 묶임)',
    findings.filter((f) => f.level === 'duplicate').length <= 3,
    `중복 경고 ${findings.filter((f) => f.level === 'duplicate').length}건`);
  check('경고 총량이 읽을 만한 수준 (8건 이하)', findings.length <= 8, `${findings.length}건`);
  check('조사 오류가 없다 (X이(가) 같은 표기)', !findings.some((f) => f.title.includes('이(가)')));
  check('나이아신 상한 초과를 잡아낸다',
    findings.some((f) => f.level === 'over' && f.title.includes('나이아신')),
    `나이아신 총량=${totals.find((t) => t.key === 'niacin')?.total}`);
  check('칼슘·아연 궁합 경고가 있다', findings.some((f) => f.level === 'conflict'));
  const vitC = totals.find((t) => t.key === 'vitC');
  check('비타민C 합산이 맞다 (100×3 + 1000 = 1300)', vitC?.total === 1300, `실제=${vitC?.total}`);
}

console.log('\n[3] 상한 계산');
{
  // 마그네슘 315mg × 2회 = 630mg, 상한 350mg
  const pills = [makePill('magnesium', ['morning', 'bedtime'])];
  const { findings, totals } = analyze(pills);
  const mg = totals.find((t) => t.key === 'magnesium');
  check('시간대 수만큼 곱해서 합산한다', mg?.total === 630, `실제=${mg?.total}`);
  check('상한 초과를 경고한다', findings.some((f) => f.level === 'over' && f.title.includes('마그네슘')));
  check('상한 대비 비율을 계산한다', mg?.percent === 180, `실제=${mg?.percent}%`);
}

console.log('\n[4] 상한이 없는 성분은 과다 경고를 하지 않는다');
{
  const pills = [makePill('omega3', ['morning', 'lunch', 'evening'])];
  const { findings, totals } = analyze(pills);
  const o = totals.find((t) => t.key === 'omega3');
  check('상한 없는 성분은 percent가 null', o?.percent === null);
  check('과다 경고가 없다', !findings.some((f) => f.level === 'over'));
}

console.log('\n[5] 궁합 — 같은 시간대일 때만 경고');
{
  const same = [makePill('calcium', ['morning']), makePill('iron', ['morning'])];
  const apart = [makePill('calcium', ['morning']), makePill('iron', ['evening'])];
  check('같은 시간대면 칼슘·철 충돌 경고', analyze(same).findings.some((f) => f.level === 'conflict'));
  check('시간대가 다르면 충돌 경고 없음', !analyze(apart).findings.some((f) => f.level === 'conflict'));
}

console.log('\n[6] 상승 조합(synergy)');
{
  // 철분 제품에는 비타민C가 함께 들어있다
  const pills = [makePill('iron', ['morning']), makePill('vitaminC', ['morning'])];
  const { findings } = analyze(pills);
  check('철분·비타민C 상승 조합을 알려준다', findings.some((f) => f.level === 'synergy'));
  const order = findings.map((f) => f.level);
  const lastSynergy = order.lastIndexOf('synergy');
  const firstNonSynergy = order.findIndex((l) => l !== 'synergy');
  check('synergy는 항상 뒤로 정렬된다', firstNonSynergy === -1 || lastSynergy === -1 || lastSynergy > firstNonSynergy);
}

console.log('\n[7] 복용 시점 추천');
{
  check('철분은 공복', recommendTiming(['iron']).timing === 'empty');
  check('마그네슘은 자기 전', recommendTiming(['magnesium']).timing === 'bedtime');
  check('비타민D는 식후', recommendTiming(['vitD']).timing === 'withMeal');
  check('공복 성분이 섞이면 공복이 우선', recommendTiming(['vitD', 'iron']).timing === 'empty');
  check('추천에 이유가 붙는다', Boolean(recommendTiming(['iron']).reason));
  check('라벨이 모두 정의됨', Object.keys(TIMING_LABEL).length === 4);
}

console.log('\n[8] 구버전 이름 → 제품 추정');
{
  const cases: [string, string | undefined][] = [
    ['종합 비타민', 'multi'],
    ['비타민 B', 'vitaminB'],
    ['비타민 C', 'vitaminC'],
    ['칼슘', 'calcium'],
    ['오메가3', 'omega3'],
    ['프로폴리스', undefined],
  ];
  for (const [name, expected] of cases) {
    const got = guessProductByName(name)?.id;
    check(`"${name}" → ${expected ?? '(추정 못함)'}`, got === expected, `실제=${got}`);
  }
}

console.log('\n[9] 빈 입력 방어');
{
  const { findings, totals } = analyze([]);
  check('영양제가 없으면 결과가 비어 있다', findings.length === 0 && totals.length === 0);
  const noIng: Pill = { id: 'x', name: '직접입력', emoji: '💊', color: '#000', ingredients: [], slots: ['morning'] };
  const r = analyze([noIng]);
  check('성분 없는 항목은 무시된다', r.findings.length === 0 && r.totals.length === 0);
}

console.log(`\n${fail === 0 ? '전부 통과' : '실패 있음'} — pass ${pass} / fail ${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
