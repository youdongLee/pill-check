import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { todayStr } from '../data/utils';
import { STREAK_DAYS } from '../src/theme';

// 구버전과 동일한 키를 그대로 재사용한다(마이그레이션 불필요).
// stamps = "그날 등록분을 전부 복용한 날짜" 목록. 구버전의 '도장 받은 날'과 의미가 이어진다.
const STAMPS_KEY = '@pillcheck/stamps';
const STREAK_MILESTONE_KEY = '@pillcheck/streakMilestone';
// 일일 보너스를 지급받은 날짜 — 현행 배포본이 쓰던 키를 그대로 재사용한다(하루 1회 제한).
const CLAIMED_DATE_KEY = '@pillcheck/claimedDate';
// 광고를 봐서 도장이 발급된 날짜. 지급(위 키)과 분리해 기록한다.
const DAILY_STAMP_KEY = '@pillcheck/dailyStamp';
const STREAK_STAMP_KEY = '@pillcheck/streakStamp';

interface StampContextType {
  stamps: string[];
  todayCompleted: boolean;
  currentStreak: number;
  /** 오늘 일일 보너스를 아직 안 받은 상태 (완주 여부는 호출측에서 함께 판단) */
  dailyBonusUnclaimed: boolean;
  /** 광고를 봐서 오늘 도장이 발급된 상태 (탭하면 지급) */
  dailyStampReady: boolean;
  /** 7일 배수를 새로 달성해 보너스를 받을 수 있는 상태 */
  streakBonusAvailable: boolean;
  /** 광고를 봐서 주간 보너스 도장이 발급된 상태 (탭하면 지급) */
  streakStampReady: boolean;
  /** 오늘 완주를 기록 (광고 없음) */
  markTodayComplete: () => Promise<void>;
  /** 광고 시청 후 일일 도장 발급 (지급 아님) */
  issueDailyStamp: () => Promise<void>;
  /** 발급된 일일 도장을 수령 처리. 처음 수령이면 true */
  claimDailyBonus: () => Promise<boolean>;
  /** 광고 시청 후 주간 보너스 도장 발급 (지급 아님) */
  issueStreakStamp: () => Promise<void>;
  /** 발급된 주간 보너스 도장을 수령 처리. 처음 수령이면 true */
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
  const [claimedDate, setClaimedDate] = useState<string | null>(null);
  const [dailyStampDate, setDailyStampDate] = useState<string | null>(null);
  const [streakStampDate, setStreakStampDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [stampsRaw, milestoneRaw, claimedRaw, dailyRaw, streakRaw] = await Promise.all([
        Storage.getItem(STAMPS_KEY),
        Storage.getItem(STREAK_MILESTONE_KEY),
        Storage.getItem(CLAIMED_DATE_KEY),
        Storage.getItem(DAILY_STAMP_KEY),
        Storage.getItem(STREAK_STAMP_KEY),
      ]);
      if (stampsRaw) setStamps(JSON.parse(stampsRaw));
      if (milestoneRaw) setStreakMilestone(JSON.parse(milestoneRaw));
      // claimedDate는 구버전이 따옴표 없이 저장했다 — 양쪽 형식을 모두 받아준다
      if (claimedRaw) setClaimedDate(claimedRaw.replace(/^"|"$/g, ''));
      if (dailyRaw) setDailyStampDate(dailyRaw);
      if (streakRaw) setStreakStampDate(streakRaw);
    })();
  }, []);

  const today = todayStr();
  const todayCompleted = stamps.includes(today);
  const currentStreak = calcStreak(stamps);

  const dailyBonusUnclaimed = claimedDate !== today;
  const dailyStampReady = dailyBonusUnclaimed && dailyStampDate === today;

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

  const issueDailyStamp = async () => {
    if (!dailyBonusUnclaimed || dailyStampDate === today) return;
    await Storage.setItem(DAILY_STAMP_KEY, today);
    setDailyStampDate(today);
  };

  const claimDailyBonus = async (): Promise<boolean> => {
    if (!dailyStampReady) return false;
    await Storage.setItem(CLAIMED_DATE_KEY, today);
    setClaimedDate(today);
    return true;
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
        stamps, todayCompleted, currentStreak,
        dailyBonusUnclaimed, dailyStampReady, streakBonusAvailable, streakStampReady,
        markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
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
