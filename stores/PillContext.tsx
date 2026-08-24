import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DailyRecord, Intake, Pill } from '../data/types';
import { generateId, todayStr } from '../data/utils';

const PILLS_KEY = '@pillcheck/pills';
const RECORD_KEY = (date: string) => `@pillcheck/record_${date}`;
const MAX_SLOTS_KEY = '@pillcheck/maxSlots';
const DEFAULT_MAX_SLOTS = 3;

interface PillContextType {
  pills: Pill[];
  maxSlots: number;
  increaseSlot: () => Promise<void>;
  decreaseSlot: () => Promise<void>;
  replacePills: (newPillDefs: Omit<Pill, 'id'>[]) => Promise<void>;
  todayRecord: DailyRecord;
  loading: boolean;
  addPill: (pill: Omit<Pill, 'id'>) => Promise<void>;
  updatePill: (pill: Pill) => Promise<void>;
  deletePill: (id: string) => Promise<void>;
  toggleIntake: (pillId: string, time: string) => Promise<void>;
  getHistoryRecord: (date: string) => Promise<DailyRecord | null>;
}

const PillContext = createContext<PillContextType | undefined>(undefined);

export function PillProvider({ children }: { children: ReactNode }) {
  const [pills, setPills] = useState<Pill[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecord>({ date: todayStr(), intakes: [] });
  const [loading, setLoading] = useState(true);
  const [maxSlots, setMaxSlots] = useState(DEFAULT_MAX_SLOTS);

  const pillsRef = useRef<Pill[]>([]);
  const maxSlotsRef = useRef<number>(DEFAULT_MAX_SLOTS);
  const todayRecordRef = useRef<DailyRecord>({ date: todayStr(), intakes: [] });

  useEffect(() => { pillsRef.current = pills; }, [pills]);
  useEffect(() => { maxSlotsRef.current = maxSlots; }, [maxSlots]);
  useEffect(() => { todayRecordRef.current = todayRecord; }, [todayRecord]);

  const buildRecord = (date: string, existingIntakes: Intake[], currentPills: Pill[]): DailyRecord => {
    const intakes = [...existingIntakes];
    for (const pill of currentPills) {
      for (const time of pill.times) {
        if (!intakes.find((i) => i.pillId === pill.id && i.time === time)) {
          intakes.push({ pillId: pill.id, pillName: pill.name, time, taken: false });
        }
      }
    }
    // Remove intakes for deleted pills
    const activeIds = new Set(currentPills.map((p) => p.id));
    return { date, intakes: intakes.filter((i) => activeIds.has(i.pillId)) };
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      const [pillsRaw, recordRaw, maxSlotsRaw] = await Promise.all([
        Storage.getItem(PILLS_KEY),
        Storage.getItem(RECORD_KEY(today)),
        Storage.getItem(MAX_SLOTS_KEY),
      ]);
      const loadedPills: Pill[] = pillsRaw ? JSON.parse(pillsRaw) : [];
      const existingIntakes: Intake[] = recordRaw ? (JSON.parse(recordRaw) as DailyRecord).intakes : [];
      const record = buildRecord(today, existingIntakes, loadedPills);
      setPills(loadedPills);
      setTodayRecord(record);
      if (maxSlotsRaw) setMaxSlots(JSON.parse(maxSlotsRaw));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const persistPills = async (next: Pill[]) => {
    await Storage.setItem(PILLS_KEY, JSON.stringify(next));
    setPills(next);
  };

  const persistRecord = async (record: DailyRecord) => {
    await Storage.setItem(RECORD_KEY(record.date), JSON.stringify(record));
    if (record.date === todayStr()) setTodayRecord(record);
  };

  const addPill = async (pill: Omit<Pill, 'id'>) => {
    const usedSlots = pillsRef.current.reduce((acc, p) => acc + p.times.length, 0);
    if (usedSlots + pill.times.length > maxSlotsRef.current) return;
    const newPill: Pill = { ...pill, id: generateId() };
    const nextPills = [...pillsRef.current, newPill];
    await persistPills(nextPills);
    const newIntakes = newPill.times.map((t) => ({
      pillId: newPill.id,
      pillName: newPill.name,
      time: t,
      taken: false,
    }));
    await persistRecord({ ...todayRecordRef.current, intakes: [...todayRecordRef.current.intakes, ...newIntakes] });
  };

  const updatePill = async (pill: Pill) => {
    const nextPills = pills.map((p) => (p.id === pill.id ? pill : p));
    await persistPills(nextPills);
    // Rebuild intakes for this pill (preserve taken status for matching times)
    const otherIntakes = todayRecord.intakes.filter((i) => i.pillId !== pill.id);
    const pillIntakes = pill.times.map((t) => {
      const existing = todayRecord.intakes.find((i) => i.pillId === pill.id && i.time === t);
      return existing
        ? { ...existing, pillName: pill.name }
        : { pillId: pill.id, pillName: pill.name, time: t, taken: false };
    });
    await persistRecord({ ...todayRecord, intakes: [...otherIntakes, ...pillIntakes] });
  };

  const deletePill = async (id: string) => {
    const target = pills.find((p) => p.id === id);
    const removedSlots = target?.times.length ?? 1;
    const nextMax = Math.max(DEFAULT_MAX_SLOTS, maxSlots - removedSlots);
    const nextPills = pills.filter((p) => p.id !== id);
    await Promise.all([
      persistPills(nextPills),
      persistRecord({ ...todayRecord, intakes: todayRecord.intakes.filter((i) => i.pillId !== id) }),
      Storage.setItem(MAX_SLOTS_KEY, JSON.stringify(nextMax)),
    ]);
    setMaxSlots(nextMax);
  };

  const toggleIntake = async (pillId: string, time: string) => {
    const intakes = todayRecord.intakes.map((i) =>
      i.pillId === pillId && i.time === time ? { ...i, taken: !i.taken } : i
    );
    await persistRecord({ ...todayRecord, intakes });
  };

  const increaseSlot = async () => {
    const next = maxSlots + 1;
    await Storage.setItem(MAX_SLOTS_KEY, JSON.stringify(next));
    setMaxSlots(next);
  };

  const decreaseSlot = async () => {
    const next = Math.max(DEFAULT_MAX_SLOTS, maxSlots - 1);
    await Storage.setItem(MAX_SLOTS_KEY, JSON.stringify(next));
    setMaxSlots(next);
  };

  const replacePills = async (newPillDefs: Omit<Pill, 'id'>[]) => {
    const today = todayStr();
    const newPills: Pill[] = newPillDefs.map((p) => ({ ...p, id: generateId() }));
    const newIntakes = newPills.flatMap((pill) =>
      pill.times.map((time) => ({ pillId: pill.id, pillName: pill.name, time, taken: false }))
    );
    const newRecord: DailyRecord = { date: today, intakes: newIntakes };
    await Storage.setItem(PILLS_KEY, JSON.stringify(newPills));
    await Storage.setItem(RECORD_KEY(today), JSON.stringify(newRecord));
    setPills(newPills);
    setTodayRecord(newRecord);
  };

  const getHistoryRecord = async (date: string): Promise<DailyRecord | null> => {
    const raw = await Storage.getItem(RECORD_KEY(date));
    return raw ? JSON.parse(raw) : null;
  };

  return (
    <PillContext.Provider
      value={{ pills, todayRecord, loading, maxSlots, increaseSlot, decreaseSlot, replacePills, addPill, updatePill, deletePill, toggleIntake, getHistoryRecord }}
    >
      {children}
    </PillContext.Provider>
  );
}

export function usePills() {
  const ctx = useContext(PillContext);
  if (!ctx) throw new Error('PillProvider not found');
  return ctx;
}
