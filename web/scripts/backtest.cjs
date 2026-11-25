/**
 * 뒤로가기 점검: 화면·시트·안내 창에서 history.back(스와이프·안드로이드 뒤로가기와 같은 동작)이 한 단계씩 닫히는지,
 * 홈에서만 기록이 바닥(앱 종료)인지 확인한다.
 * 사용: npx vite --mode mock --port 5334 → node scripts/backtest.cjs [출력 폴더] [포트]
 */
const puppeteer = require('C:/Users/james/Desktop/workspace/chokchok/node_modules/puppeteer-core');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2] || path.join(__dirname, '..', 'shots');
const PORT = process.argv[3] || '5334';
fs.mkdirSync(OUT, { recursive: true });
const URL = `http://localhost:${PORT}/`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PILLS = [
  { id: 'a', name: '종합 비타민', times: ['08:00'], emoji: '💊', color: '#22C55E' },
  { id: 'b', name: '오메가3', times: ['12:00'], emoji: '💉', color: '#3B82F6' },
];

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.evaluate((pills) => {
    localStorage.clear();
    localStorage.setItem('@pillcheck/pills', JSON.stringify(pills));
    localStorage.setItem('@pillcheck/notify_daily_v1', 'agreed');
    localStorage.setItem(
      '@pillcheck/presets',
      JSON.stringify([{ id: 'p1', name: '아침 루틴', pills: pills.map(({ id, ...r }) => r), savedAt: '2026-11-20' }]),
    );
  }, PILLS);
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await wait(600);
  const base = await p.evaluate(() => history.length);

  const click = async (t, sel = 'button') => {
    const ok = await p.evaluate(
      (t, sel) => {
        const el = [...document.querySelectorAll(sel)].reverse().find((e) => e.textContent.includes(t) && e.offsetParent !== null);
        if (el) el.click();
        return !!el;
      },
      t,
      sel,
    );
    if (!ok) console.log('  (no button)', t);
    await wait(400);
  };
  const where = async () =>
    p.evaluate(() => {
      const scr = document.querySelector('.page.manage') ? '관리' : document.querySelector('.page.preset') ? '내 플랜' : '홈';
      const layers = [];
      if (document.querySelector('.builder')) layers.push('빌더' + (document.querySelector('.builder .form') ? '>추가' : ''));
      document.querySelectorAll('.sheet-title').forEach((e) => layers.push('시트:' + e.textContent));
      if (document.querySelector('.slot-title')) layers.push('슬롯창');
      if (document.querySelector('.help')) layers.push('도움말');
      document.querySelectorAll('.dialog h3').forEach((e) => layers.push('창:' + e.textContent));
      return `${scr}${layers.length ? ' + ' + layers.join(' + ') : ''} | 기록 ${history.state?.pillcheck ?? 0}`;
    });
  const back = async () => {
    await p.evaluate(() => history.back());
    await wait(450);
  };
  const steps = [];
  const log = async (label) => steps.push(`${label.padEnd(26)} → ${await where()}`);

  await log('홈');
  await click('추가', '.tile-cell');
  await log('빠른 추가 시트');
  await back();
  await log('뒤로 (홈이어야)');
  await click('관리');
  await log('관리');
  await click('오메가3', '.tile-cell');
  await log('관리 + 수정 시트');
  await click('이 시간 삭제하기');
  await log('삭제 확인 창');
  await back();
  await log('뒤로 (관리여야)');
  await back();
  await log('뒤로 (홈이어야)');
  await click('내 플랜');
  await log('내 플랜');
  await click('플랜 보기');
  await log('빌더');
  await click('+ 영양제 추가');
  await log('빌더 > 영양제 추가');
  await back();
  await log('뒤로 (빌더여야)');
  await click('닫기', '.builder-close');
  await log('닫기 버튼 (내 플랜이어야)');
  await click('?');
  await log('도움말');
  await back();
  await log('뒤로 (내 플랜이어야)');
  await back();
  await log('뒤로 (홈이어야)');
  // 버튼으로 닫은 뒤 바로 다른 창 — 칸 수가 어긋나지 않는지
  await click('추가', '.tile-cell');
  await click('비타민 C');
  await click('아침 식사', '.time-chip');
  await click('저장', '.save-btn');
  await log('저장 후 (홈이어야)');
  await click('관리');
  await back();
  await log('관리 → 뒤로 (홈이어야)');
  const end = await p.evaluate(() => history.state?.pillcheck ?? 0);
  steps.push(`홈 기록 칸 = ${end} (0 이면 홈에서 뒤로가기 = 앱 종료)`);
  await p.screenshot({ path: path.join(OUT, 'back-final.png') });
  console.log(steps.join('\n'));
  console.log('history.length base', base);
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  fs.writeFileSync(path.join(OUT, 'backtest.txt'), steps.join('\n') + '\n');
  await b.close();
})();
