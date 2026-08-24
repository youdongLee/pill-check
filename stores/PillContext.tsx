import { Storage } from '@apps-in-toss/framework';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DailyRecord, Intake, Pill, SlotKey } from '../data/types';
import { guessProductByName } from '../data/products';
import { generateId, todayStr } from '../data/utils';

const PILLS_KEY = '@pillcheck/pills';
const RECORD_KEY = (date: string) => `@pillcheck/record_${date}`;
const MAX_SLOTS_KEY = '@pillcheck/maxSlots';
const MIGRATED_KEY = '@pillcheck/migratedV2';
const DEFAULT_MAX_PILLS = 3;

interface PillContextType {
  pills: Pill[];
  maxPills: number;
  increaseSlot: () => Promise<void>;
  todayRecord: DailyRecord;
  loading: boolean;
  addPill: (pill: Omit<Pill, 'id'>) => Promise<void>;
  updatePill: (pill: Pill) => Promise<void>;
  deletePill: (id: string) => Promise<void>;
  /** 한 건 체크 토글 */
  toggleIntake: (pillId: string, slot: SlotKey) => Promise<void>;
  /** 시간대 하나를 통째로 완료 처리 (5060 타깃 — 탭 수를 줄인다) */
  completeSlot: (slot: SlotKey) => Promise<void>;
  getHistoryRecord: (date: string) => Promise<DailyRecord | null>;
}

const PillContext = createContext<PillContextType | undefined>(undefined);

/**
 * 구버전 → 신버전 마이그레이션.
 * 구버전 Pill은 `times: ["08:00"]`처럼 시각 문자열을 갖고 성분이 없다.
 * 시각을 시간대로 접고, 이름으로 제품을 추정해 성분을 채운다.
 * 추정한 항목은 needsReview로 표시해 유저가 확인하게 한다.
 */
function migratePill(raw: any): Pill {
  if (Array.isArray(raw.slots)) return raw as Pill; // 이미 신버전

  const times: string[] = Array.isArray(raw.times) ? raw.times : [];
  const slots = new Set<SlotKey>();
  for (const t of times) {
    const h = Number(String(t).slice(0, 2));
    if (h >= 4 && h < 11) slots.add('morning');
    else if (h >= 11 && h < 17) slots.add('lunch');
    else if (h >= 17 && h < 21) slots.add('evening');
    else slots.add('bedtime');
  }
  if (slots.size === 0) slots.add('morning');

  const guess = guessProductByName(String(raw.name ?? ''));
  return {
    id: String(raw.id ?? generateId()),
    name: String(raw.name ?? '영양제'),
    emoji: guess?.emoji ?? String(raw.emoji ?? '💊'),
    color: guess?.color ?? String(raw.color ?? '#22C55E'),
    productId: guess?.id,
    ingredients: guess ? guess.ingredients : [],
    slots: [...slots],
    // 이름으로 찍은 성분이라 유저 확인이 필요하다
    needsReview: true,
  };
}

function migrateRecord(raw: any, date: string): DailyRecord {
  const intakes: Intake[] = [];
  for (const i of raw?.intakes ?? []) {
    if (i.slot) {
      intakes.push(i as Intake);
      continue;
    }
    const h = Number(String(i.time ?? '08:00').slice(0, 2));
    const slot: SlotKey =
      h >= 4 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'lunch' : h >= 17 && h < 21 ? 'evening' : 'bedtime';
    // 같은 약이 한 시간대에 여러 번 잡혀 있었으면 하나로 접는다
    const dup = intakes.find((x) => x.pillId === i.pillId && x.slot === slot);
    if (dup) {
      dup.taken = dup.taken || Boolean(i.taken);
      continue;
    }
    intakes.push({ pillId: String(i.pillId), pillName: String(i.pillName ?? ''), slot, taken: Boolean(i.taken) });
  }
  return { date, intakes };
}

export function PillProvider({ children }: { children: ReactNode }) {
  const [pills, setPills] = useState<Pill[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecord>({ date: todayStr(), intakes: [] });
  const [loading, setLoading] = useState(true);
  const [maxPills, setMaxPills] = useState(DEFAULT_MAX_PILLS);

  const pillsRef = useRef<Pill[]>([]);
  const todayRecordRef = useRef<DailyRecord>({ date: todayStr(), intakes: [] });
  useEffect(() => { pillsRef.current = pills; }, [pills]);
  useEffect(() => { todayRecordRef.current = todayRecord; }, [todayRecord]);

  /** 등록된 영양제에 맞춰 오늘 기록의 빈칸을 채우고, 지워진 약의 기록은 뺀다 */
  const buildRecord = (date: string, existing: Intake[], currentPills: Pill[]): DailyRecord => {
    const intakes = [...existing];
    for (const pill of currentPills) {
      for (const slot of pill.slots) {
        if (!intakes.find((i) => i.pillId === pill.id && i.slot === slot)) {
          intakes.push({ pillId: pill.id, pillName: pill.name, slot, taken: false });
        }
      }
    }
    const active = new Set(currentPills.map((p) => p.id));
    return {
      date,
      intakes: intakes.filter((i) => {
        const pill = currentPills.find((p) => p.id === i.pillId);
        return active.has(i.pillId) && pill!.slots.includes(i.slot);
      }),
    };
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      const [pillsRaw, recordRaw, maxRaw, migrated] = await Promise.all([
        Storage.getItem(PILLS_KEY),
        Storage.getItem(RECORD_KEY(today)),
        Storage.getItem(MAX_SLOTS_KEY),
        Storage.getItem(MIGRATED_KEY),
      ]);

      const parsedPills: any[] = pillsRaw ? JSON.parse(pillsRaw) : [];
      const loadedPills = parsedPills.map(migratePill);
      const storedRecord = recordRaw ? migrateRecord(JSON.parse(recordRaw), today) : { date: today, intakes: [] };
      const record = buildRecord(today, storedRecord.intakes, loadedPills);

      setPills(loadedPills);
      setTodayRecord(record);
      if (maxRaw) setMaxPills(Math.max(DEFAULT_MAX_PILLS, JSON.parse(maxRaw)));

      // 마이그레이션 결과를 한 번 저장해 다음 실행부터는 변환 없이 읽는다
      if (!migrated && parsedPills.length > 0) {
        await Promise.all([
          Storage.setItem(PILLS_KEY, JSON.stringify(loadedPills)),
          Storage.setItem(RECORD_KEY(today), JSON.stringify(record)),
          Storage.setItem(MIGRATED_KEY, 'true'),
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const persistPills = async (next: Pill[]) => {
    await Storage.setItem(PILLS_KEY, JSON.stringify(next));
    setPills(next);
  };

  const persistRecord = async (record: DailyRecord) => {
    await Storage.setItem(RECORD_KEY(record.date), JSON.stringify(record));
    if (record.date === todayStr()) setTodayRecord(record);
  };

  const addPill = async (pill: Omit<Pill, 'id'>) => {
    if (pillsRef.current.length >= maxPills) return;
    const newPill: Pill = { ...pill, id: generateId() };
    const nextPills = [...pillsRef.current, newPill];
    await persistPills(nextPills);
    await persistRecord(buildRecord(todayStr(), todayRecordRef.current.intakes, nextPills));
  };

  const updatePill = async (pill: Pill) => {
    const nextPills = pillsRef.current.map((p) => (p.id === pill.id ? pill : p));
    await persistPills(nextPills);
    await persistRecord(buildRecord(todayStr(), todayRecordRef.current.intakes, nextPills));
  };

  const deletePill = async (id: string) => {
    const nextPills = pillsRef.current.filter((p) => p.id !== id);
    await persistPills(nextPills);
    await persistRecord(buildRecord(todayStr(), todayRecordRef.current.intakes, nextPills));
  };

  /** 체크할 때 남은 개수를 함께 차감한다 (해제하면 되돌린다) */
  const applyRemaining = async (pillId: string, delta: number) => {
    const pill = pillsRef.current.find((p) => p.id === pillId);
    if (!pill || pill.remaining === undefined) return;
    const next = pillsRef.current.map((p) =>
      p.id === pillId ? { ...p, remaining: Math.max(0, (p.remaining ?? 0) + delta) } : p,
    );
    await persistPills(next);
  };

  const toggleIntake = async (pillId: string, slot: SlotKey) => {
    const target = todayRecordRef.current.intakes.find((i) => i.pillId === pillId && i.slot === slot);
    if (!target) return;
    const nextTaken = !target.taken;
    const intakes = todayRecordRef.current.intakes.map((i) =>
      i.pillId === pillId && i.slot === slot ? { ...i, taken: nextTaken } : i,
    );
    await persistRecord({ ...todayRecordRef.current, intakes });
    await applyRemaining(pillId, nextTaken ? -1 : 1);
  };

  const completeSlot = async (slot: SlotKey) => {
    const pending = todayRecordRef.current.intakes.filter((i) => i.slot === slot && !i.taken);
    if (pending.length === 0) return;
    const intakes = todayRecordRef.current.intakes.map((i) =>
      i.slot === slot ? { ...i, taken: true } : i,
    );
    await persistRecord({ ...todayRecordRef.current, intakes });
    for (const i of pending) await applyRemaining(i.pillId, -1);
  };

  const increaseSlot = async () => {
    const next = maxPills + 1;
    await Storage.setItem(MAX_SLOTS_KEY, JSON.stringify(next));
    setMaxPills(next);
  };

  const getHistoryRecord = async (date: string): Promise<DailyRecord | null> => {
    const raw = await Storage.getItem(RECORD_KEY(date));
    return raw ? migrateRecord(JSON.parse(raw), date) : null;
  };

  return (
    <PillContext.Provider
      value={{
        pills, todayRecord, loading, maxPills, increaseSlot,
        addPill, updatePill, deletePill, toggleIntake, completeSlot, getHistoryRecord,
      }}
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
