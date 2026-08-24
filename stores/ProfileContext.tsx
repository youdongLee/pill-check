import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AGE_BANDS, bandOf, type Sex } from '../data/rda';

// 신규 키. 기존 @pillcheck/* 기록 키는 그대로 두므로 복용 기록·연속일수는 이어진다.
const PROFILE_KEY = '@pillcheck/profile_v1';

export interface Profile {
  sex: Sex;
  /** 나이 구간 key (AGE_BANDS) — 정확한 나이를 묻지 않는다 */
  band: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  /** 대표 나이 — 구간의 시작 나이를 쓴다 */
  age: number;
  save: (p: Profile) => Promise<void>;
  clear: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await Storage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (p: Profile) => {
    await Storage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
  };

  const clear = async () => {
    await Storage.removeItem?.(PROFILE_KEY);
    setProfile(null);
  };

  const age = profile ? (AGE_BANDS.find((b) => b.key === profile.band)?.from ?? 50) : 50;

  return (
    <ProfileContext.Provider value={{ profile, loading, age, save, clear }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('ProfileProvider not found');
  return ctx;
}

export { bandOf };
