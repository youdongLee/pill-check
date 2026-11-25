/**
 * 도장·지급 — RN stores/StampContext.tsx 와 같은 키·형식(로직은 domain/stampCore.ts 를 그대로 복사).
 *   @pillcheck/stamps      : JSON 문자열 배열 ["YYYY-MM-DD", ...]
 *   @pillcheck/claimedDate : 7일 연속 보상을 받은 날 (따옴표 없는 원문 문자열)
 *   @pillcheck/payout_v1   : { dailyStampDate, dailyPaidDate, streakStampDate, streakPaidDate }
 *
 * 웹에서 바꾼 것(규칙): 저장이 실패하면 화면 상태를 되돌리고 false. 지급 기록(PaidDate) 저장이 실패하면 지급하지 않는다.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DAILY_AMOUNT, PROMO, STREAK_AMOUNT } from '../domain/config';
import {
  EMPTY_PAYOUT,
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
  type Change,
  type StampState,
  type StampView,
} from '../domain/stampCore';
import { currentDay, useDayKey } from '../domain/dayKey';
import { TIMEOUT, grantReward, readKey, writeKey } from '../lib/platform';
import type { LoadStatus } from './PillContext';

// 라이브와 같은 키 — 기존 유저의 도장·연속이 그대로 이어진다
export const STAMPS_KEY = '@pillcheck/stamps';
export const CLAIMED_DATE_KEY = '@pillcheck/claimedDate';
export const PAYOUT_KEY = '@pillcheck/payout_v1';

type StampContextType = StampView & {
  status: LoadStatus;
  reload: () => void;
  today: string;
  paying: boolean;
  /** 광고 끝까지 본 뒤 호출 → 오늘 도장 발급(저장까지 됐을 때만 true) */
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

/** 바뀐 키만 쓴다. 전부 써졌을 때만 true */
async function persist(prev: StampState, next: StampState): Promise<boolean> {
  const jobs: Promise<boolean>[] = [];
  if (prev.stamps !== next.stamps) jobs.push(writeKey(STAMPS_KEY, JSON.stringify(next.stamps)));
  if (prev.claimedDate !== next.claimedDate && next.claimedDate) {
    // 라이브와 같이 따옴표 없는 원문으로 저장
    jobs.push(writeKey(CLAIMED_DATE_KEY, next.claimedDate));
  }
  if (prev.payout !== next.payout) jobs.push(writeKey(PAYOUT_KEY, JSON.stringify(next.payout)));
  const r = await Promise.all(jobs);
  return r.every(Boolean);
}

const EMPTY: StampState = { stamps: [], claimedDate: null, payout: { ...EMPTY_PAYOUT } };

export function StampProvider({ children }: { children: ReactNode }) {
  const today = useDayKey();
  const [state, setState] = useState<StampState>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [paying, setPaying] = useState(false);
  const stateRef = useRef(state);
  const payingRef = useRef({ busy: false });

  const load = useCallback(async () => {
    setStatus('loading');
    const [stampsRaw, claimedRaw, payoutRaw] = await Promise.all([
      readKey(STAMPS_KEY),
      readKey(CLAIMED_DATE_KEY),
      readKey(PAYOUT_KEY),
    ]);
    if (stampsRaw === TIMEOUT || claimedRaw === TIMEOUT || payoutRaw === TIMEOUT) {
      setStatus('error');
      return;
    }
    const loaded: StampState = {
      stamps: parseStamps(stampsRaw),
      claimedDate: parseClaimedDate(claimedRaw),
      payout: parsePayout(payoutRaw),
    };
    const norm = normalize(loaded, currentDay());
    stateRef.current = norm;
    setState(norm);
    setStatus('ready');
    if (norm !== loaded) await persist(loaded, norm);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 날짜가 바뀌면(자정·복귀) 정리 규칙을 다시 적용해 저장
  useEffect(() => {
    if (status !== 'ready') return;
    const cur = stateRef.current;
    const norm = normalize(cur, today);
    if (norm !== cur) {
      stateRef.current = norm;
      setState(norm);
      void persist(cur, norm);
    }
  }, [today, status]);

  /** 모든 변경은 여기로: 최신 상태(ref) → 롤오버 포함 순수 함수 → 저장. 저장 실패면 되돌리고 false */
  const apply = async (fn: (s: StampState, day: string) => Change): Promise<boolean> => {
    const prev = stateRef.current;
    const { state: next, ok } = fn(prev, currentDay());
    if (next === prev) return ok;
    stateRef.current = next;
    setState(next);
    if (!(await persist(prev, next))) {
      if (stateRef.current === next) {
        stateRef.current = prev;
        setState(prev);
      }
      return false;
    }
    return ok;
  };

  const claim = async (mark: typeof markDailyPaid, code: string, amount: number) => {
    if (payingRef.current.busy) return false;
    setPaying(true);
    try {
      // 잠금 → 지급 기록 먼저(저장 확인) → 지급 호출 (실패해도 화면 안내 없음, 재시도 없음)
      return await runClaim(payingRef.current, () => apply(mark), async () => (await grantReward(code, amount)).ok);
    } finally {
      setPaying(false);
    }
  };

  const v = view(state, today);

  const value: StampContextType = {
    ...v,
    status,
    reload: () => void load(),
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
        writeKey(STAMPS_KEY, '[]'),
        writeKey(CLAIMED_DATE_KEY, ''),
        writeKey(PAYOUT_KEY, JSON.stringify(EMPTY_PAYOUT)),
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
