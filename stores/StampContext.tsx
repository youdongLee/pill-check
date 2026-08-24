import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { todayStr } from '../data/utils';
import { STREAK_DAYS } from '../src/theme';

// 구버전과 동일한 키를 그대로 재사용한다(마이그레이션 불필요).
// stamps = "그날 등록분을 전부 복용한 날짜" 목록. 구버전의 '도장 받은 날'과 의미가 이어진다.
const STAMPS_KEY = '@pillcheck/stamps';
const STREAK_MILESTONE_KEY = '@pillcheck/streakMilestone';
// 주간 보너스용 스탬프를 발급받은 날짜. 광고 시청 시점을 기록해 지급과 분리한다.
const STREAK_STAMP_KEY = '@pillcheck/streakStamp';

interface StampContextType {
  stamps: string[];
  todayCompleted: boolean;
  currentStreak: number;
  /** 7일 배수를 새로 달성해 보너스를 받을 수 있는 상태 */
  streakBonusAvailable: boolean;
  /** 광고를 봐서 보너스 스탬프가 발급된 상태 (탭하면 지급) */
  streakStampReady: boolean;
  /** 오늘 완주를 기록 (광고 없음) */
  markTodayComplete: () => Promise<void>;
  /** 광고 시청 후 보너스 스탬프 발급 (지급 아님) */
  issueStreakStamp: () => Promise<void>;
  /** 발급된 보너스 스탬프를 수령 처리. 처음 수령이면 true */
  claimStreakBonus: () => Promise<boolean>;
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
  const [streakStampDate, setStreakStampDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [stampsRaw, milestoneRaw, stampDateRaw] = await Promise.all([
        Storage.getItem(STAMPS_KEY),
        Storage.getItem(STREAK_MILESTONE_KEY),
        Storage.getItem(STREAK_STAMP_KEY),
      ]);
      if (stampsRaw) setStamps(JSON.parse(stampsRaw));
      if (milestoneRaw) setStreakMilestone(JSON.parse(milestoneRaw));
      if (stampDateRaw) setStreakStampDate(stampDateRaw);
    })();
  }, []);

  const today = todayStr();
  const todayCompleted = stamps.includes(today);
  const currentStreak = calcStreak(stamps);
  // 새로운 7일 배수에 도달했고 오늘 완주한 경우에만 보너스 대상
  const streakBonusAvailable =
    todayCompleted && currentStreak >= STREAK_DAYS &&
    Math.floor(currentStreak / STREAK_DAYS) > streakMilestone;
  const streakStampReady = streakBonusAvailable && streakStampDate === today;

  const markTodayComplete = async () => {
    if (todayCompleted) return;
    const next = [...stamps, today];
    await Storage.setItem(STAMPS_KEY, JSON.stringify(next));
    setStamps(next);
  };

  const issueStreakStamp = async () => {
    if (!streakBonusAvailable || streakStampDate === today) return;
    await Storage.setItem(STREAK_STAMP_KEY, today);
    setStreakStampDate(today);
  };

  const claimStreakBonus = async (): Promise<boolean> => {
    if (!streakStampReady) return false;
    const next = Math.floor(currentStreak / STREAK_DAYS);
    await Storage.setItem(STREAK_MILESTONE_KEY, JSON.stringify(next));
    setStreakMilestone(next);
    return true;
  };

  return (
    <StampContext.Provider
      value={{
        stamps, todayCompleted, currentStreak, streakBonusAvailable, streakStampReady,
        markTodayComplete, issueStreakStamp, claimStreakBonus,
      }}
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
