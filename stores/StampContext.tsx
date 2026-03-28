import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { todayStr } from '../data/utils';

const STAMPS_KEY = '@pillcheck/stamps';
const STREAK_MILESTONE_KEY = '@pillcheck/streakMilestone';

interface StampContextType {
  stamps: string[];
  todayStamped: boolean;
  currentStreak: number;
  canClaimStreakReward: boolean;
  earnTodayStamp: () => Promise<void>;
  claimStreakReward: () => Promise<void>;
  seedPastStamps: (days: number) => Promise<void>; // dev only
}

const StampContext = createContext<StampContextType | undefined>(undefined);

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calcStreak(stamps: string[]): number {
  const stampSet = new Set(stamps);
  let streak = 0;
  const date = new Date();
  // 오늘 미도장이면 어제부터 카운트 (연속 진행 중인 경우 표시)
  if (!stampSet.has(dateStr(date))) {
    date.setDate(date.getDate() - 1);
  }
  while (true) {
    if (stampSet.has(dateStr(date))) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function StampProvider({ children }: { children: ReactNode }) {
  const [stamps, setStamps] = useState<string[]>([]);
  const [streakMilestone, setStreakMilestone] = useState(0);

  useEffect(() => {
    (async () => {
      const [stampsRaw, milestoneRaw] = await Promise.all([
        Storage.getItem(STAMPS_KEY),
        Storage.getItem(STREAK_MILESTONE_KEY),
      ]);
      if (stampsRaw) setStamps(JSON.parse(stampsRaw));
      if (milestoneRaw) setStreakMilestone(JSON.parse(milestoneRaw));
    })();
  }, []);

  const today = todayStr();
  const todayStamped = stamps.includes(today);
  const currentStreak = calcStreak(stamps);
  // 새로운 7일 배수에 도달했고 오늘 도장을 받은 경우 리워드 클레임 가능
  const canClaimStreakReward =
    todayStamped && currentStreak >= 7 && Math.floor(currentStreak / 7) > streakMilestone;

  const earnTodayStamp = async () => {
    if (todayStamped) return;
    const next = [...stamps, today];
    await Storage.setItem(STAMPS_KEY, JSON.stringify(next));
    setStamps(next);
  };

  const claimStreakReward = async () => {
    const next = Math.floor(currentStreak / 7);
    await Storage.setItem(STREAK_MILESTONE_KEY, JSON.stringify(next));
    setStreakMilestone(next);
  };

  // dev only: 오늘 제외한 과거 N일치 도장을 심어줌
  const seedPastStamps = async (days: number) => {
    const result: string[] = [];
    for (let i = days; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const next = [...new Set([...stamps, ...result])];
    await Storage.setItem(STAMPS_KEY, JSON.stringify(next));
    setStamps(next);
  };

  return (
    <StampContext.Provider
      value={{ stamps, todayStamped, currentStreak, canClaimStreakReward, earnTodayStamp, claimStreakReward, seedPastStamps }}
    >
      {children}
    </StampContext.Provider>
  );
}

export function useStamps() {
  const ctx = useContext(StampContext);
  if (!ctx) throw new Error('StampProvider not found');
  return ctx;
}
