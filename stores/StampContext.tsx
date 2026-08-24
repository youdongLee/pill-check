import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { todayStr } from '../data/utils';

// 구버전과 동일한 키를 그대로 재사용한다(마이그레이션 불필요).
// stamps = "그날 목표를 다 채운 날짜" 목록. 구버전의 '도장 받은 날'과 의미가 이어진다.
const STAMPS_KEY = '@pillcheck/stamps';
const STREAK_MILESTONE_KEY = '@pillcheck/streakMilestone';

interface StampContextType {
  stamps: string[];
  todayCompleted: boolean;
  currentStreak: number;
  canClaimStreakReward: boolean;
  /** 오늘을 완주일로 기록 (광고 없음 — 복용 체크만으로 기록된다) */
  markTodayComplete: () => Promise<void>;
  /** 7일 연속 보너스 수령 처리. 처음 수령이면 true */
  claimStreakReward: () => Promise<boolean>;
}

const StampContext = createContext<StampContextType | undefined>(undefined);

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calcStreak(stamps: string[]): number {
  const stampSet = new Set(stamps);
  let streak = 0;
  const date = new Date();
  // 오늘 미완주면 어제부터 카운트 (연속 진행 중인 경우 표시)
  if (!stampSet.has(dateStr(date))) {
    date.setDate(date.getDate() - 1);
  }
  while (stampSet.has(dateStr(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
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
  const todayCompleted = stamps.includes(today);
  const currentStreak = calcStreak(stamps);
  // 새로운 7일 배수에 도달했고 오늘 완주한 경우 보너스 수령 가능
  const canClaimStreakReward =
    todayCompleted && currentStreak >= 7 && Math.floor(currentStreak / 7) > streakMilestone;

  const markTodayComplete = async () => {
    if (todayCompleted) return;
    const next = [...stamps, today];
    await Storage.setItem(STAMPS_KEY, JSON.stringify(next));
    setStamps(next);
  };

  const claimStreakReward = async (): Promise<boolean> => {
    if (!canClaimStreakReward) return false;
    const next = Math.floor(currentStreak / 7);
    await Storage.setItem(STREAK_MILESTONE_KEY, JSON.stringify(next));
    setStreakMilestone(next);
    return true;
  };

  return (
    <StampContext.Provider
      value={{ stamps, todayCompleted, currentStreak, canClaimStreakReward, markTodayComplete, claimStreakReward }}
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
