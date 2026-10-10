/* 도장·지급 시나리오 검증: npx esbuild scripts/verify-stamp.ts --bundle --platform=node --outfile=.verify.js && node .verify.js */
import {
  EMPTY_PAYOUT,
  StampState,
  addDays,
  earnDaily,
  earnStreak,
  markDailyPaid,
  markStreakPaid,
  normalize,
  parseClaimedDate,
  parsePayout,
  parseStamps,
  runClaim,
  view,
} from '../src/stampCore';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) pass++;
  else { fail++; console.log('FAIL', name); }
}

const D = '2026-10-10';
const day = (n: number) => addDays(D, n);
const empty = (): StampState => ({ stamps: [], claimedDate: null, payout: { ...EMPTY_PAYOUT } });
const past = (n: number, upto = D) => Array.from({ length: n }, (_, i) => addDays(upto, -(n - i)));

// 1. 첫 도장 → 누르기 → 1원 한 번
{
  let s = empty();
  check('1a 도장 전 지급 불가', !markDailyPaid(s, D).ok);
  const e = earnDaily(s, D); s = e.state;
  check('1b 도장 발급', e.ok && s.stamps.join() === D && view(s, D).dailyPending);
  const p1 = markDailyPaid(s, D); s = p1.state;
  check('1c 첫 누름 지급', p1.ok && !view(s, D).dailyPending);
  check('1d 두 번째 누름 지급 안 됨', !markDailyPaid(s, D).ok);
  const e2 = earnDaily(s, D);
  check('1e 같은 날 도장 재발급 안 됨', !e2.ok && e2.state.stamps.length === 1);
}

// 2. 자정 넘김: 받은 도장 안 누르고 다음 날 → 소멸
{
  let s = earnDaily(empty(), D).state;
  check('2a 다음 날 미수령 도장 소멸', !view(s, day(1)).dailyPending);
  check('2b 다음 날 어제 도장으로 지급 불가', !markDailyPaid(s, day(1)).ok);
  const e = earnDaily(s, day(1)); s = e.state;
  check('2c 다음 날 새 도장', e.ok && s.stamps.length === 2 && view(s, day(1)).dailyPending);
}

// 3. 7일 연속: 6일 + 오늘 → 7일 도장 → 10원 한 번
{
  let s: StampState = { ...empty(), stamps: past(6) };
  check('3a 오늘 도장 전엔 7일 도장 불가', !view(s, D).canEarnStreak && !earnStreak(s, D).ok);
  s = earnDaily(s, D).state;
  check('3b 7칸 채우면 7일 도장 가능', view(s, D).canEarnStreak && view(s, D).streakCount === 7);
  const e = earnStreak(s, D); s = e.state;
  check('3c 7일 도장 발급', e.ok && s.claimedDate === D && view(s, D).streakPending && !view(s, D).canEarnStreak);
  check('3d 7일 도장 재발급 안 됨', !earnStreak(s, D).ok);
  const p = markStreakPaid(s, D); s = p.state;
  check('3e 7일 지급 한 번', p.ok && view(s, D).streakDone);
  check('3f 7일 두 번째 누름 지급 안 됨', !markStreakPaid(s, D).ok);
  check('3g 1원 도장도 따로 남아 있음', view(s, D).dailyPending && markDailyPaid(s, D).ok);
  // 다음 날: 새 회차
  const n = normalize(s, day(1));
  check('3h 다음 날 칸 비움(새 회차)', n.stamps.length === 0);
  const e2 = earnDaily(s, day(1));
  check('3i 다음 날 1칸부터', e2.ok && e2.state.stamps.join() === day(1));
}

// 4. 라이브 결함 방지: 7칸 채운 그날 다시 열어도 칸 유지
{
  const s: StampState = { ...empty(), stamps: [...past(6), D] };
  check('4a 같은 날 7칸 유지', normalize(s, D).stamps.length === 7 && view(s, D).canEarnStreak);
}

// 5. 7칸 채우고 7일 도장 안 받은 채 다음 날 → 새 회차(라이브와 같음)
{
  const s: StampState = { ...empty(), stamps: [...past(6), D] };
  check('5a 다음 날 초기화', normalize(s, day(1)).stamps.length === 0);
  check('5b 다음 날 7일 도장 불가', !earnStreak(s, day(1)).ok);
}

// 6. 연속 끊김
{
  const s: StampState = { ...empty(), stamps: [day(-3), day(-2)] };
  check('6a 이틀 비면 초기화', normalize(s, D).stamps.length === 0);
  const s2: StampState = { ...empty(), stamps: [day(-2), day(-1)] };
  check('6b 오늘 아직이면 어제까지 유지', normalize(s2, D).stamps.length === 2 && view(s2, D).streakCount === 2);
}

// 7. 두 번째 회차(14일째): 지급일 기준이라 다시 받을 수 있다
{
  let s: StampState = { ...empty(), stamps: [...past(6, day(-7)), day(-7)], claimedDate: day(-7),
    payout: { ...EMPTY_PAYOUT, streakStampDate: day(-7), streakPaidDate: day(-7) } };
  for (let i = -6; i <= 0; i++) s = earnDaily(s, day(i)).state;
  check('7a 두 번째 7칸', s.stamps.length === 7 && view(s, D).canEarnStreak);
  s = earnStreak(s, D).state;
  check('7b 두 번째 7일 지급', markStreakPaid(s, D).ok);
}

// 8. 7일 받고 끊긴 뒤 다시 7일
{
  let s: StampState = { ...empty(), stamps: [], claimedDate: day(-20),
    payout: { ...EMPTY_PAYOUT, streakStampDate: day(-20), streakPaidDate: day(-20) } };
  for (let i = -6; i <= 0; i++) s = earnDaily(s, day(i)).state;
  check('8a 끊긴 뒤 다시 7일 가능', view(s, D).canEarnStreak);
  s = earnStreak(s, D).state;
  check('8b 끊긴 뒤 7일 지급', markStreakPaid(s, D).ok);
}

// 9. 구버전에서 오늘 이미 도장(3원 받음) → 새 버전에서 또 받지 않음
{
  const s: StampState = { ...empty(), stamps: [day(-1), D] };
  check('9a 구버전 오늘 도장은 미수령 아님', !view(s, D).dailyPending && !markDailyPaid(s, D).ok);
  check('9b 구버전 오늘 도장 재발급 안 됨', !earnDaily(s, D).ok);
}

// 10. 구버전에서 오늘 7일 보상 받음 → 수령 완료로 표시, 다시 못 받음
{
  const s: StampState = { ...empty(), stamps: [...past(6), D], claimedDate: D };
  check('10a 구버전 7일 수령은 완료', view(s, D).streakDone && !view(s, D).canEarnStreak && !earnStreak(s, D).ok);
}

// 11. 저장분 파싱
{
  check('11a claimedDate 원문', parseClaimedDate('2026-04-23') === '2026-04-23');
  check('11b claimedDate 따옴표', parseClaimedDate('"2026-04-23"') === '2026-04-23');
  check('11c claimedDate 빈값', parseClaimedDate('') === null && parseClaimedDate(null) === null);
  check('11d stamps 손상', parseStamps('{bad') .length === 0 && parseStamps('[1,"x","2026-04-01"]').join() === '2026-04-01');
  check('11e payout 손상', parsePayout('nope').dailyPaidDate === null);
  check('11f payout 정상', parsePayout(JSON.stringify({ dailyStampDate: D, dailyPaidDate: D })).dailyPaidDate === D);
}

// 12. 시계를 되돌려 미래 도장이 생긴 경우 무시
{
  const s: StampState = { ...empty(), stamps: [D, day(1)] };
  check('12a 미래 도장 제거', normalize(s, D).stamps.join() === D);
}

// 13. 연타: 동시에 두 번 눌러도 지급 호출은 한 번 (잠금 + 기록 먼저)
(async () => {
  let s = earnDaily(empty(), D).state;
  const lock = { busy: false };
  let grants = 0;
  const record = async () => { const r = markDailyPaid(s, D); s = r.state; return r.ok; };
  const grant = async () => { grants++; await new Promise((r) => setTimeout(r, 20)); return true; };
  const [a, b] = await Promise.all([runClaim(lock, record, grant), runClaim(lock, record, grant)]);
  check('13a 연타 지급 1회', grants === 1 && a !== b);
  const c = await runClaim(lock, record, grant);
  check('13b 끝난 뒤 다시 눌러도 지급 없음', !c && grants === 1);
  // 지급 실패해도 기록은 남아 재지급 없음
  let s2 = earnDaily(empty(), D).state;
  let g2 = 0;
  const rec2 = async () => { const r = markDailyPaid(s2, D); s2 = r.state; return r.ok; };
  const r1 = await runClaim({ busy: false }, rec2, async () => { g2++; return false; });
  const r2 = await runClaim({ busy: false }, rec2, async () => { g2++; return true; });
  check('13c 실패 후 재시도 없음', !r1 && !r2 && g2 === 1);

  console.log(`${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
