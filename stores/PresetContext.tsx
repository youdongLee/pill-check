import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Pill } from '../data/types';
import { generateId, todayStr } from '../data/utils';

const PRESETS_KEY = '@pillcheck/presets';
const DAY_SCHEDULE_KEY = '@pillcheck/daySchedule';
const LAST_AUTO_LOAD_KEY = '@pillcheck/lastAutoLoad';
const MAX_PRESETS_KEY = '@pillcheck/maxPresets';
const DEFAULT_MAX_PRESETS = 1;

export interface Preset {
  id: string;
  name: string;
  pills: Omit<Pill, 'id'>[];
  savedAt: string;
}

// JS day index: 0=Sun, 1=Mon, ... 6=Sat
export type DaySchedule = Partial<Record<number, string>>; // dayIndex → presetId

interface PresetContextType {
  presets: Preset[];
  maxPresets: number;
  daySchedule: DaySchedule;
  lastAutoLoad: string | null;
  savePreset: (name: string, pills: Omit<Pill, 'id'>[]) => Promise<Preset>;
  updatePreset: (id: string, pills: Omit<Pill, 'id'>[]) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  assignDay: (day: number, presetId: string) => Promise<void>;
  unassignDay: (day: number) => Promise<void>;
  markAutoLoaded: () => Promise<void>;
  increasePresetSlot: () => Promise<void>;
}

const PresetContext = createContext<PresetContextType | undefined>(undefined);

export function PresetProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [maxPresets, setMaxPresets] = useState(DEFAULT_MAX_PRESETS);
  const [daySchedule, setDaySchedule] = useState<DaySchedule>({});
  const [lastAutoLoad, setLastAutoLoad] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [presetsRaw, scheduleRaw, lastRaw, maxRaw] = await Promise.all([
        Storage.getItem(PRESETS_KEY),
        Storage.getItem(DAY_SCHEDULE_KEY),
        Storage.getItem(LAST_AUTO_LOAD_KEY),
        Storage.getItem(MAX_PRESETS_KEY),
      ]);
      if (presetsRaw) setPresets(JSON.parse(presetsRaw));
      if (scheduleRaw) setDaySchedule(JSON.parse(scheduleRaw));
      if (lastRaw) setLastAutoLoad(JSON.parse(lastRaw));
      if (maxRaw) setMaxPresets(JSON.parse(maxRaw));
    })();
  }, []);

  const savePreset = async (name: string, pills: Omit<Pill, 'id'>[]): Promise<Preset> => {
    const preset: Preset = { id: generateId(), name, pills, savedAt: todayStr() };
    const next = [...presets, preset];
    await Storage.setItem(PRESETS_KEY, JSON.stringify(next));
    setPresets(next);
    return preset;
  };

  const updatePreset = async (id: string, pills: Omit<Pill, 'id'>[]) => {
    const next = presets.map((p) => p.id === id ? { ...p, pills } : p);
    await Storage.setItem(PRESETS_KEY, JSON.stringify(next));
    setPresets(next);
  };

  const deletePreset = async (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    const nextMax = Math.max(DEFAULT_MAX_PRESETS, maxPresets - 1);
    // Remove from day schedule if assigned
    const nextSchedule = { ...daySchedule };
    for (const day of Object.keys(nextSchedule) as unknown as number[]) {
      if (nextSchedule[day] === id) delete nextSchedule[day];
    }
    await Promise.all([
      Storage.setItem(PRESETS_KEY, JSON.stringify(next)),
      Storage.setItem(MAX_PRESETS_KEY, JSON.stringify(nextMax)),
      Storage.setItem(DAY_SCHEDULE_KEY, JSON.stringify(nextSchedule)),
    ]);
    setPresets(next);
    setMaxPresets(nextMax);
    setDaySchedule(nextSchedule);
  };

  const assignDay = async (day: number, presetId: string) => {
    const next = { ...daySchedule, [day]: presetId };
    await Storage.setItem(DAY_SCHEDULE_KEY, JSON.stringify(next));
    setDaySchedule(next);
  };

  const unassignDay = async (day: number) => {
    const next = { ...daySchedule };
    delete next[day];
    await Storage.setItem(DAY_SCHEDULE_KEY, JSON.stringify(next));
    setDaySchedule(next);
  };

  const markAutoLoaded = async () => {
    const today = todayStr();
    await Storage.setItem(LAST_AUTO_LOAD_KEY, JSON.stringify(today));
    setLastAutoLoad(today);
  };

  const increasePresetSlot = async () => {
    const next = maxPresets + 1;
    await Storage.setItem(MAX_PRESETS_KEY, JSON.stringify(next));
    setMaxPresets(next);
  };

  return (
    <PresetContext.Provider value={{ presets, maxPresets, daySchedule, lastAutoLoad, savePreset, updatePreset, deletePreset, assignDay, unassignDay, markAutoLoaded, increasePresetSlot }}>
      {children}
    </PresetContext.Provider>
  );
}

export function usePresets() {
  const ctx = useContext(PresetContext);
  if (!ctx) throw new Error('PresetProvider not found');
  return ctx;
}
