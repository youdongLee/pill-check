/**
 * 점검 엔진 검증 하니스.
 * 실행: npx esbuild scripts/verify-analyze.ts --bundle --platform=node --outfile=.verify.js && node .verify.js
 */
import { analyze, recommendTiming, TIMING_LABEL } from '../src/analyze';
import { PRODUCTS, findProduct, guessProductByName } from '../data/products';
import { INGREDIENTS, findIngredient } from '../data/ingredients';
import { CONCERNS, FUNCTION_CLAIMS } from '../data/concerns';
import { diagnose, notCovered } from '../src/diagnose';
import { AGE_BANDS, bandOf, referenceFor } from '../data/rda';
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
    ['프로폴리스', 'propolis'],
    ['쏘팔메토', 'sawPalmetto'],
    ['달맞이꽃 종자유', 'eveningPrimrose'],
    ['아스타잔틴', undefined],
  ];
  for (const [name, expected] of cases) {
    const got = guessProductByName(name)?.id;
    check(`"${name}" → ${expected ?? '(추정 못함)'}`, got === expected, `실제=${got}`);
  }
}

console.log('\n[9] 프리셋 커버리지 — OCR 없이 이 목록이 성분 입력을 대신한다');
{
  check('제품 프리셋이 30종 이상', PRODUCTS.length >= 30, `${PRODUCTS.length}종`);
  check('성분 사전이 40종 이상', INGREDIENTS.length >= 40, `${INGREDIENTS.length}종`);
  const noMatch = PRODUCTS.filter((p) => !guessProductByName(p.name));
  check('모든 프리셋 이름이 스스로 추정된다', noMatch.length === 0, noMatch.map((p) => p.name).join(', '));
  const noIng = PRODUCTS.filter((p) => p.ingredients.length === 0);
  check('성분이 빈 프리셋이 없다', noIng.length === 0, noIng.map((p) => p.id).join(', '));
}

console.log('\n[10] 고민별 찾기 — 심사에서 가장 위험한 데이터');
{
  const keys = new Set(INGREDIENTS.map((i) => i.key));
  const orphanConcern = CONCERNS.flatMap((c) => c.ingredients.filter((k) => !keys.has(k)).map((k) => `${c.key}:${k}`));
  check('고민이 가리키는 성분이 모두 사전에 있다', orphanConcern.length === 0, orphanConcern.join(', '));
  const orphanClaim = Object.keys(FUNCTION_CLAIMS).filter((k) => !keys.has(k));
  check('기능성 문구의 성분이 모두 사전에 있다', orphanClaim.length === 0, orphanClaim.join(', '));
  const noClaim = [...new Set(CONCERNS.flatMap((c) => c.ingredients.filter((k) => !FUNCTION_CLAIMS[k])))];
  check('추천 성분에 기능성 문구가 모두 있다', noClaim.length === 0, noClaim.join(', '));
  check('고민 key 중복 없음', new Set(CONCERNS.map((c) => c.key)).size === CONCERNS.length);
  // 치료·예방 표현이 섞이면 심사에서 바로 걸린다
  const banned = ['치료', '예방', '완치', '낫는', '효과가 있'];
  const bad = Object.entries(FUNCTION_CLAIMS).filter(([, v]) => banned.some((b) => v.includes(b)));
  check('기능성 문구에 치료·예방 표현이 없다', bad.length === 0, bad.map(([k]) => k).join(', '));
}

console.log('\n[11] 나이·성별 진단 — 이 앱의 새 핵심');
{
  check('나이 구간이 5개', AGE_BANDS.length === 5);
  check('55세 → 50~64세 구간', bandOf(55).key === '50');
  check('80세 → 75세 이상 구간', bandOf(80).key === '75');
  check('20세 → 19~29세 구간', bandOf(20).key === '19');
  // 폐경 이후 여성은 칼슘 기준이 올라간다
  check('50대 여성 칼슘 기준이 30대보다 높다',
    referenceFor('female', 55).calcium > referenceFor('female', 35).calcium,
    `${referenceFor('female', 35).calcium} → ${referenceFor('female', 55).calcium}`);
  check('65세 이상 비타민D 기준이 올라간다', referenceFor('female', 70).vitD === 15);

  // 종합비타민 하나만 먹는 55세 여성
  const one = [makePill('multi', ['morning'])];
  const d = diagnose(one, 'female', 55);
  check('진단 결과에 항목이 있다', d.items.length > 0);
  const vitC = d.items.find((i) => i.key === 'vitC');
  check('비타민C 기준 대비 100% (100mg / 100mg)', vitC?.percent === 100, `실제=${vitC?.percent}%`);
  const cal = d.items.find((i) => i.key === 'calcium');
  check('종합비타민만으로는 칼슘이 안 들어온다', cal === undefined);
  check('안 들어오는 성분 목록에 칼슘이 있다', notCovered(one, 'female', 55).some((m) => m.key === 'calcium'));

  // 마그네슘·철은 식사로 챙기는 쪽이라 "부족"으로 세지 않는다
  check('철분은 부족 목록에서 제외된다', !notCovered(one, 'female', 55).some((m) => m.key === 'iron'));
  check('요오드는 부족 목록에서 제외된다', !notCovered(one, 'female', 55).some((m) => m.key === 'iodine'));

  // 상한 초과는 진단에서도 분명히 잡아야 한다
  const over = diagnose([makePill('magnesium', ['morning', 'bedtime'])], 'female', 55);
  check('상한 초과가 over 로 분류된다', over.over.some((o) => o.key === 'magnesium'));
  check('요약 문장이 상한 초과를 먼저 말한다', over.headline.includes('마그네슘'));

  check('영양제가 없으면 진단도 비어 있다', diagnose([], 'female', 55).items.length === 0);
}

console.log('\n[12] 빈 입력 방어');
{
  const { findings, totals } = analyze([]);
  check('영양제가 없으면 결과가 비어 있다', findings.length === 0 && totals.length === 0);
  const noIng: Pill = { id: 'x', name: '직접입력', emoji: '💊', color: '#000', ingredients: [], slots: ['morning'] };
  const r = analyze([noIng]);
  check('성분 없는 항목은 무시된다', r.findings.length === 0 && r.totals.length === 0);
}

console.log(`\n${fail === 0 ? '전부 통과' : '실패 있음'} — pass ${pass} / fail ${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
