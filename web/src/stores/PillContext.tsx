/**
 * 복용 목록·오늘 기록·자리 수 — RN stores/PillContext.tsx 와 같은 키·형식.
 *   @pillcheck/pills          : Pill[] JSON
 *   @pillcheck/record_YYYY-MM-DD : DailyRecord JSON
 *   @pillcheck/maxSlots       : number JSON (기본 3)
 *
 * 웹에서 바꾼 것(규칙): 읽기 무응답이면 빈 값으로 덮지 않고 '다시 시도', 쓰기는 성공했을 때만 화면에 반영.
 * RN 의 updatePill·deletePill 은 렌더 시점의 pills/todayRecord 를 붙잡아 써서(오래된 값) 연달아 바꾸면
 * 앞의 변경이 사라질 수 있었다 → 항상 최신 값(ref)에서 고친다.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DailyRecord, Intake, Pill } from '../domain/types';
import { generateId } from '../domain/utils';
import { currentDay, useDayKey } from '../domain/dayKey';
import { TIMEOUT, readKey, writeKey } from '../lib/platform';

export const PILLS_KEY = '@pillcheck/pills';
export const RECORD_KEY = (date: string) => `@pillcheck/record_${date}`;
export const MAX_SLOTS_KEY = '@pillcheck/maxSlots';
const DEFAULT_MAX_SLOTS = 3;

export type LoadStatus = 'loading' | 'ready' | 'error';

interface PillContextType {
  status: LoadStatus;
  reload: () => void;
  pills: Pill[];
  maxSlots: number;
  increaseSlot: () => Promise<boolean>;
  decreaseSlot: () => Promise<boolean>;
  replacePills: (newPillDefs: Omit<Pill, 'id'>[]) => Promise<boolean>;
  todayRecord: DailyRecord;
  addPill: (pill: Omit<Pill, 'id'>) => Promise<boolean>;
  updatePill: (pill: Pill) => Promise<boolean>;
  deletePill: (id: string) => Promise<boolean>;
  toggleIntake: (pillId: string, time: string) => Promise<boolean>;
}

const PillContext = createContext<PillContextType | undefined>(undefined);

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseIntakes(raw: string | null): Intake[] {
  const r = parseJSON<DailyRecord | null>(raw, null);
  return r && Array.isArray(r.intakes) ? r.intakes : [];
}

const buildRecord = (date: string, existingIntakes: Intake[], currentPills: Pill[]): DailyRecord => {
  const intakes = [...existingIntakes];
  for (const pill of currentPills) {
    for (const time of pill.times) {
      if (!intakes.find((i) => i.pillId === pill.id && i.time === time)) {
        intakes.push({ pillId: pill.id, pillName: pill.name, time, taken: false });
      }
    }
  }
  // 지운 영양제의 기록은 뺀다
  const activeIds = new Set(currentPills.map((p) => p.id));
  return { date, intakes: intakes.filter((i) => activeIds.has(i.pillId)) };
};

export function PillProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [pills, setPills] = useState<Pill[]>([]);
  const [todayRecord, setTodayRecord] = useState<DailyRecord>({ date: currentDay(), intakes: [] });
  const [maxSlots, setMaxSlots] = useState(DEFAULT_MAX_SLOTS);

  const pillsRef = useRef<Pill[]>([]);
  const maxSlotsRef = useRef<number>(DEFAULT_MAX_SLOTS);
  const todayRecordRef = useRef<DailyRecord>({ date: currentDay(), intakes: [] });

  const setPillsBoth = (v: Pill[]) => {
    pillsRef.current = v;
    setPills(v);
  };
  const setMaxBoth = (v: number) => {
    maxSlotsRef.current = v;
    setMaxSlots(v);
  };
  const setRecordBoth = (v: DailyRecord) => {
    todayRecordRef.current = v;
    setTodayRecord(v);
  };

  const loadAll = useCallback(async () => {
    setStatus('loading');
    const today = currentDay();
    const [pillsRaw, recordRaw, maxSlotsRaw] = await Promise.all([
      readKey(PILLS_KEY),
      readKey(RECORD_KEY(today)),
      readKey(MAX_SLOTS_KEY),
    ]);
    if (pillsRaw === TIMEOUT || recordRaw === TIMEOUT || maxSlotsRaw === TIMEOUT) {
      setStatus('error');
      return;
    }
    const loadedPills = parseJSON<Pill[]>(pillsRaw, []);
    const safePills = Array.isArray(loadedPills) ? loadedPills.filter((p) => p && Array.isArray(p.times)) : [];
    setPillsBoth(safePills);
    setRecordBoth(buildRecord(today, parseIntakes(recordRaw), safePills));
    const ms = parseJSON<number>(maxSlotsRaw, DEFAULT_MAX_SLOTS);
    setMaxBoth(typeof ms === 'number' && ms > 0 ? ms : DEFAULT_MAX_SLOTS);
    setStatus('ready');
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // 앱을 켜둔 채 자정을 넘기거나 다음 날 돌아오면 오늘 기록으로 바꿔 끼운다(어제 체크가 넘어오지 않게)
  const day = useDayKey();
  /** 오늘 기록 — 날짜가 바뀌었으면 저장소에서 읽어 바꿔 끼운다. 못 읽으면 null(빈 값으로 덮지 않는다) */
  const freshRecord = async (): Promise<DailyRecord | null> => {
    const cur = todayRecordRef.current;
    const today = currentDay();
    if (cur.date === today) return cur;
    const raw = await readKey(RECORD_KEY(today));
    if (raw === TIMEOUT) return null;
    const record = buildRecord(today, parseIntakes(raw), pillsRef.current);
    setRecordBoth(record);
    return record;
  };
  useEffect(() => {
    if (status === 'ready' && todayRecordRef.current.date !== day) void freshRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, status]);

  const persistPills = async (next: Pill[]): Promise<boolean> => {
    const ok = await writeKey(PILLS_KEY, JSON.stringify(next));
    if (ok) setPillsBoth(next);
    return ok;
  };

  const persistRecord = async (record: DailyRecord): Promise<boolean> => {
    const ok = await writeKey(RECORD_KEY(record.date), JSON.stringify(record));
    if (ok && record.date === currentDay()) setRecordBoth(record);
    return ok;
  };

  /**
   * 그날 기록 — 영양제 목록 저장이 끝난 뒤 따라 쓰는 기록. 실패해도 화면에는 반영하고 성공으로 본다:
   * 다음에 열 때 buildRecord 가 목록에서 빠진 칸을 다시 만들고 지운 영양제 칸을 걸러 낸다.
   * (목록은 저장됐는데 false 를 돌려주면 다시 눌러 같은 영양제가 두 번 들어가고 슬롯이 두 번 빠진다 — 재검증 N3)
   */
  const persistRecordLoose = async (record: DailyRecord): Promise<void> => {
    await writeKey(RECORD_KEY(record.date), JSON.stringify(record));
    if (record.date === currentDay()) setRecordBoth(record);
  };

  const persistMax = async (next: number): Promise<boolean> => {
    const ok = await writeKey(MAX_SLOTS_KEY, JSON.stringify(next));
    if (ok) setMaxBoth(next);
    return ok;
  };

  const addPill = async (pill: Omit<Pill, 'id'>) => {
    const usedSlots = pillsRef.current.reduce((acc, p) => acc + p.times.length, 0);
    if (usedSlots + pill.times.length > maxSlotsRef.current) return false;
    const base = await freshRecord();
    if (!base) return false;
    const newPill: Pill = { ...pill, id: generateId() };
    if (!(await persistPills([...pillsRef.current, newPill]))) return false;
    const newIntakes = newPill.times.map((t) => ({ pillId: newPill.id, pillName: newPill.name, time: t, taken: false }));
    await persistRecordLoose({ ...base, intakes: [...base.intakes, ...newIntakes] });
    return true;
  };

  const updatePill = async (pill: Pill) => {
    const base = await freshRecord();
    if (!base) return false;
    if (!(await persistPills(pillsRef.current.map((p) => (p.id === pill.id ? pill : p))))) return false;
    // 이 영양제의 기록을 다시 만든다(같은 시간의 체크는 유지)
    const otherIntakes = base.intakes.filter((i) => i.pillId !== pill.id);
    const pillIntakes = pill.times.map((t) => {
      const existing = base.intakes.find((i) => i.pillId === pill.id && i.time === t);
      return existing ? { ...existing, pillName: pill.name } : { pillId: pill.id, pillName: pill.name, time: t, taken: false };
    });
    await persistRecordLoose({ ...base, intakes: [...otherIntakes, ...pillIntakes] });
    return true;
  };

  const deletePill = async (id: string) => {
    const base = await freshRecord();
    if (!base) return false;
    const target = pillsRef.current.find((p) => p.id === id);
    const removedSlots = target?.times.length ?? 1;
    const nextMax = Math.max(DEFAULT_MAX_SLOTS, maxSlotsRef.current - removedSlots);
    // 목록 저장이 성패를 가른다. 그날 기록·슬롯 수는 따라 쓰는 값(슬롯 수가 못 줄면 유저에게 한 칸 남을 뿐)
    if (!(await persistPills(pillsRef.current.filter((p) => p.id !== id)))) return false;
    await Promise.all([persistRecordLoose({ ...base, intakes: base.intakes.filter((i) => i.pillId !== id) }), persistMax(nextMax)]);
    return true;
  };

  const toggleIntake = async (pillId: string, time: string) => {
    const base = await freshRecord();
    if (!base) return false;
    const intakes = base.intakes.map((i) => (i.pillId === pillId && i.time === time ? { ...i, taken: !i.taken } : i));
    return persistRecord({ ...base, intakes });
  };

  const increaseSlot = () => persistMax(maxSlotsRef.current + 1);
  const decreaseSlot = () => persistMax(Math.max(DEFAULT_MAX_SLOTS, maxSlotsRef.current - 1));

  const replacePills = async (newPillDefs: Omit<Pill, 'id'>[]) => {
    const today = currentDay();
    const newPills: Pill[] = newPillDefs.map((p) => ({ ...p, id: generateId() }));
    const newIntakes = newPills.flatMap((pill) =>
      pill.times.map((time) => ({ pillId: pill.id, pillName: pill.name, time, taken: false })),
    );
    if (!(await persistPills(newPills))) return false;
    await persistRecordLoose({ date: today, intakes: newIntakes });
    return true;
  };

  return (
    <PillContext.Provider
      value={{
        status,
        reload: () => void loadAll(),
        pills,
        todayRecord,
        maxSlots,
        increaseSlot,
        decreaseSlot,
        replacePills,
        addPill,
        updatePill,
        deletePill,
        toggleIntake,
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
