import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { DAILY_AMOUNT, PROMO, STREAK_AMOUNT } from '../src/ads';
import { grantReward } from '../src/reward';
import {
  Change,
  EMPTY_PAYOUT,
  StampState,
  StampView,
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
import { currentDay, useDayKey } from '../src/useDayKey';

// 라이브(20260423-23)와 같은 키 — 기존 유저의 도장·연속이 그대로 이어진다
const STAMPS_KEY = '@pillcheck/stamps';
const CLAIMED_DATE_KEY = '@pillcheck/claimedDate';
// 이번 번들 신규 키 (도장 발급일·지급일)
const PAYOUT_KEY = '@pillcheck/payout_v1';

type StampContextType = StampView & {
  ready: boolean;
  today: string;
  paying: boolean;
  /** 광고 끝까지 본 뒤 호출 → 오늘 도장 발급 */
  earnDailyStamp: () => Promise<boolean>;
  /** 광고 끝까지 본 뒤 호출 → 7일 연속 도장 발급 */
  earnStreakStamp: () => Promise<boolean>;
  /** 도장 누름 → 1원 지급 (기록 먼저, 실패해도 조용히) */
  claimDaily: () => Promise<boolean>;
  /** 도장 누름 → 10원 지급 */
  claimStreak: () => Promise<boolean>;
  // 테스트 패널 전용
  devSeedPast: (days: number) => Promise<void>;
  devReset: () => Promise<void>;
  devState: () => StampState;
};

const StampContext = createContext<StampContextType | undefined>(undefined);

async function persist(prev: StampState, next: StampState) {
  const jobs: Promise<unknown>[] = [];
  if (prev.stamps !== next.stamps) jobs.push(Storage.setItem(STAMPS_KEY, JSON.stringify(next.stamps)));
  if (prev.claimedDate !== next.claimedDate && next.claimedDate) {
    // 라이브와 같이 따옴표 없는 원문으로 저장
    jobs.push(Storage.setItem(CLAIMED_DATE_KEY, next.claimedDate));
  }
  if (prev.payout !== next.payout) jobs.push(Storage.setItem(PAYOUT_KEY, JSON.stringify(next.payout)));
  await Promise.all(jobs);
}

export function StampProvider({ children }: { children: ReactNode }) {
  const today = useDayKey();
  const [state, setState] = useState<StampState>({ stamps: [], claimedDate: null, payout: { ...EMPTY_PAYOUT } });
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const stateRef = useRef(state);
  const payingRef = useRef({ busy: false });

  useEffect(() => {
    (async () => {
      const [stampsRaw, claimedRaw, payoutRaw] = await Promise.all([
        Storage.getItem(STAMPS_KEY),
        Storage.getItem(CLAIMED_DATE_KEY),
        Storage.getItem(PAYOUT_KEY),
      ]);
      const loaded: StampState = {
        stamps: parseStamps(stampsRaw),
        claimedDate: parseClaimedDate(claimedRaw),
        payout: parsePayout(payoutRaw),
      };
      const norm = normalize(loaded, currentDay());
      stateRef.current = norm;
      setState(norm);
      setReady(true);
      if (norm !== loaded) await persist(loaded, norm);
    })();
  }, []);

  // 날짜가 바뀌면(자정·복귀) 정리 규칙을 다시 적용해 저장
  useEffect(() => {
    if (!ready) return;
    const cur = stateRef.current;
    const norm = normalize(cur, today);
    if (norm !== cur) {
      stateRef.current = norm;
      setState(norm);
      void persist(cur, norm);
    }
  }, [today, ready]);

  /** 모든 변경은 여기로: 최신 상태(ref) → 롤오버 포함 순수 함수 → 저장 */
  const apply = async (fn: (s: StampState, day: string) => Change): Promise<boolean> => {
    const prev = stateRef.current;
    const { state: next, ok } = fn(prev, currentDay());
    if (next !== prev) {
      stateRef.current = next;
      setState(next);
      await persist(prev, next);
    }
    return ok;
  };

  const claim = async (mark: typeof markDailyPaid, code: string, amount: number) => {
    if (payingRef.current.busy) return false;
    setPaying(true);
    try {
      // 잠금 → 지급 기록 먼저 → 지급 호출 (실패해도 화면 안내 없음, 재시도 없음)
      return await runClaim(payingRef.current, () => apply(mark), async () => (await grantReward(code, amount)).ok);
    } finally {
      setPaying(false);
    }
  };

  const v = view(state, today);

  const value: StampContextType = {
    ...v,
    ready,
    today,
    paying,
    earnDailyStamp: () => apply(earnDaily),
    earnStreakStamp: () => apply(earnStreak),
    claimDaily: () => claim(markDailyPaid, PROMO.daily, DAILY_AMOUNT),
    claimStreak: () => claim(markStreakPaid, PROMO.streak, STREAK_AMOUNT),
    devSeedPast: async (days: number) => {
      const day = currentDay();
      const past: string[] = [];
      for (let i = days; i >= 1; i--) past.push(addDays(day, -i));
      await apply((s) => ({ ok: true, state: { ...s, stamps: [...new Set([...past, ...s.stamps])].sort() } }));
    },
    devReset: async () => {
      await Promise.all([
        Storage.setItem(STAMPS_KEY, '[]'),
        Storage.setItem(CLAIMED_DATE_KEY, ''),
        Storage.setItem(PAYOUT_KEY, JSON.stringify(EMPTY_PAYOUT)),
      ]);
      const next = { stamps: [], claimedDate: null, payout: { ...EMPTY_PAYOUT } };
      stateRef.current = next;
      setState(next);
    },
    devState: () => stateRef.current,
  };

  return <StampContext.Provider value={value}>{children}</StampContext.Provider>;
}

export function useStamps() {
  const ctx = useContext(StampContext);
  if (!ctx) throw new Error('StampProvider not found');
  return ctx;
}
