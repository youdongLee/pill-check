/**
 * 화면 점검: 360×780 에서 상태별 캡처(+큰글씨 1.3·1.5). 이미지 광고(.ad-image) 위쪽 끝 y 를 함께 찍는다.
 * 사용: npx vite --mode mock --port 5334 → node scripts/shots.cjs <출력 폴더> [포트]
 * 목업이라 저장소는 localStorage, 광고는 confirm 창(자동 확인), 지급은 바로 성공.
 */
const puppeteer = require('C:/Users/james/Desktop/workspace/chokchok/node_modules/puppeteer-core');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'shots');
const PORT = process.argv[3] || '5334';
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://localhost:${PORT}/`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PILLS = [
  { id: 'a', name: '종합 비타민', times: ['08:00'], emoji: '💊', color: '#22C55E', dosageAmount: '1', dosageUnit: '알' },
  { id: 'b', name: '오메가3', times: ['12:00'], emoji: '💉', color: '#3B82F6' },
  { id: 'c', name: '비타민 D', times: ['18:00'], emoji: '🏥', color: '#14B8A6', dosageAmount: '1000', dosageUnit: 'mg' },
];

/** 페이지 안에서 저장소를 채운다 */
function seed(opts) {
  const d = new Date();
  const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const today = f(d);
  const back = (n) => f(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
  localStorage.clear();
  if (opts.pills) {
    localStorage.setItem('@pillcheck/pills', JSON.stringify(opts.pills));
    localStorage.setItem(
      '@pillcheck/record_' + today,
      JSON.stringify({
        date: today,
        intakes: opts.pills.flatMap((p) => p.times.map((t) => ({ pillId: p.id, pillName: p.name, time: t, taken: !!opts.taken }))),
      }),
    );
  }
  const stamps = [];
  for (let i = opts.past || 0; i >= 1; i--) stamps.push(back(i));
  if (opts.todayStamp) stamps.push(today);
  if (stamps.length) localStorage.setItem('@pillcheck/stamps', JSON.stringify(stamps));
  if (opts.payout) {
    const p = { dailyStampDate: null, dailyPaidDate: null, streakStampDate: null, streakPaidDate: null };
    if (opts.payout.includes('dStamp')) p.dailyStampDate = today;
    if (opts.payout.includes('dPaid')) p.dailyPaidDate = today;
    localStorage.setItem('@pillcheck/payout_v1', JSON.stringify(p));
  }
  if (opts.notify) localStorage.setItem('@pillcheck/notify_daily_v1', opts.notify);
  if (opts.presets) {
    localStorage.setItem(
      '@pillcheck/presets',
      JSON.stringify([{ id: 'p1', name: '아침 루틴', pills: opts.pills.slice(0, 2).map(({ id, ...r }) => r), savedAt: today }]),
    );
    localStorage.setItem('@pillcheck/daySchedule', JSON.stringify({ 1: 'p1', 3: 'p1' }));
  }
}

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('dialog', (d) => d.accept());
  await p.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const report = [];

  const load = async (opts, fsScale) => {
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p.evaluate(seed, opts);
    await p.goto(BASE + (fsScale ? `?fs=${fsScale}` : ''), { waitUntil: 'networkidle0' });
    await wait(700);
  };
  const adTop = () =>
    p.evaluate(() => {
      const el = [...document.querySelectorAll('.ad-image')].find((e) => e.offsetParent !== null);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), bottom: Math.round(r.bottom + window.scrollY) };
    });
  const snap = async (name, full = false) => {
    await wait(300);
    const a = await adTop();
    await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
    const line = `${name.padEnd(28)} 이미지광고 ${a ? `y=${a.top}~${a.bottom} (첫 화면 780 안: ${a.bottom <= 780 ? '전부' : a.top < 780 ? '일부' : '밖'})` : '없음'}`;
    report.push(line);
    console.log(line);
  };
  const clickText = async (t, sel = 'button') => {
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
    await wait(500);
  };

  // 1) 처음(빈 상태)
  await load({});
  await snap('01-home-empty');

  // 2) 영양제 3개, 아직 안 먹음 — 알림 줄 보임, 도장 버튼 없음
  for (const s of ['', '1.3', '1.5']) {
    await load({ pills: PILLS, past: 2 }, s);
    await snap(`02-home-untaken${s ? '-fs' + s : ''}`);
  }

  // 3) 다 먹음 — 도장 버튼 + 바로 아래 알림 줄
  for (const s of ['', '1.3', '1.5']) {
    await load({ pills: PILLS, taken: true, past: 2 }, s);
    await snap(`03-home-alldone${s ? '-fs' + s : ''}`);
  }

  // 3b) 다 먹음 + 알림 동의함 — 알림 줄 없음
  await load({ pills: PILLS, taken: true, past: 2, notify: 'agreed' });
  await snap('03b-home-alldone-agreed');

  // 3c) 거절 저장된 유저 — 다음 방문엔 다시 보인다
  await load({ pills: PILLS, taken: true, past: 2, notify: 'rejected' });
  await snap('03c-home-rejected-before');

  // 4) 광고 → 도장 → 누르면 지급(실제 흐름)
  await load({ pills: PILLS, taken: true, past: 2, notify: 'agreed' });
  await clickText('광고 보고 오늘 도장');
  await snap('04a-ad-guide');
  await clickText('광고 보고 도장 받기'); // 안내 창 → 가짜 광고(confirm 자동 확인)
  await wait(800);
  await snap('04b-stamp-earned-dialog');
  await clickText('확인');
  await snap('04c-stamp-pending');
  await clickText('도장 눌러서');
  await wait(500);
  await snap('04d-paid-dialog');
  await clickText('확인');
  await snap('04e-after-paid');
  const payout = await p.evaluate(() => localStorage.getItem('@pillcheck/payout_v1'));
  console.log('  payout_v1 =', payout);
  report.push('  payout_v1 after flow = ' + payout);

  // 5) 7일 연속 차례(6일 + 오늘 도장 받음·지급 끝)
  await load({ pills: PILLS, taken: true, past: 6, todayStamp: true, payout: ['dStamp', 'dPaid'] });
  await snap('05-home-streak-turn');

  // 6) 알림 받기 누름(목업 = 동의)
  await load({ pills: PILLS, past: 2 });
  await clickText('알림 받기');
  await wait(600);
  await snap('06-notify-agreed-dialog');

  // 7) 빠른 추가 시트
  await load({ pills: PILLS.slice(0, 2) });
  await clickText('추가', '.tile-cell');
  await snap('07-quick-add');
  // 7b) 직접 입력 시간: 숫자 4자리 → 08:30 자동, 붙여넣기 8:30 → 08:30 으로 추가
  await clickText('+ 추가', '.time-chip');
  await p.type('.custom-time-row input', '0830');
  const typed = await p.$eval('.custom-time-row input', (e) => e.value);
  await clickText('추가', '.custom-time-add');
  const chips = await p.$$eval('.time-chip.sel .tc-time', (es) => es.map((e) => e.textContent));
  const tline = `  직접 입력 0830 → 입력칸 "${typed}" → 추가된 칩 ${JSON.stringify(chips)}`;
  console.log(tline);
  report.push(tline);
  await snap('07b-quick-add-custom-time');

  // 8) 슬롯 꽉참
  await load({ pills: PILLS });
  await clickText('추가', '.tile-cell');
  await snap('08-slot-full');

  // 9) 관리
  await load({ pills: PILLS });
  await clickText('관리');
  await snap('09-manage');
  await clickText('오메가3', '.tile-cell');
  await snap('09b-manage-edit', false);

  // 10) 내 플랜
  await load({ pills: PILLS, presets: true });
  await clickText('내 플랜');
  await snap('10-preset');
  await clickText('?');
  await snap('10b-preset-help');
  await p.evaluate(() => history.back());
  await wait(400);
  await clickText('플랜 보기');
  await snap('10c-builder');
  await clickText('+ 영양제 추가');
  await snap('10d-builder-add');

  // 11) 내 플랜 빈 상태
  await load({ pills: PILLS });
  await clickText('내 플랜');
  await snap('11-preset-empty');

  fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  await b.close();
})();
