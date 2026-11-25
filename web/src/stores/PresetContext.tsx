/**
 * 내 플랜 — RN stores/PresetContext.tsx 와 같은 키·형식.
 *   @pillcheck/presets      : Preset[] JSON
 *   @pillcheck/daySchedule  : { [요일 0~6]: presetId } JSON
 *   @pillcheck/lastAutoLoad : "YYYY-MM-DD" JSON 문자열 (RN 에서 읽기만 하고 쓰는 곳이 없다 — 그대로 둔다)
 *   @pillcheck/maxPresets   : number JSON (기본 1)
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Pill } from '../domain/types';
import { generateId, todayStr } from '../domain/utils';
import { TIMEOUT, readKey, writeKey } from '../lib/platform';
import type { LoadStatus } from './PillContext';

export const PRESETS_KEY = '@pillcheck/presets';
export const DAY_SCHEDULE_KEY = '@pillcheck/daySchedule';
export const LAST_AUTO_LOAD_KEY = '@pillcheck/lastAutoLoad';
export const MAX_PRESETS_KEY = '@pillcheck/maxPresets';
const DEFAULT_MAX_PRESETS = 1;

export interface Preset {
  id: string;
  name: string;
  pills: Omit<Pill, 'id'>[];
  savedAt: string;
}

// JS 요일: 0=일 … 6=토
export type DaySchedule = Partial<Record<number, string>>;

interface PresetContextType {
  status: LoadStatus;
  reload: () => void;
  presets: Preset[];
  maxPresets: number;
  daySchedule: DaySchedule;
  savePreset: (name: string, pills: Omit<Pill, 'id'>[]) => Promise<boolean>;
  updatePreset: (id: string, pills: Omit<Pill, 'id'>[]) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  assignDay: (day: number, presetId: string) => Promise<boolean>;
  unassignDay: (day: number) => Promise<boolean>;
  increasePresetSlot: () => Promise<boolean>;
}

const PresetContext = createContext<PresetContextType | undefined>(undefined);

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function PresetProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [presets, setPresetsS] = useState<Preset[]>([]);
  const [maxPresets, setMaxS] = useState(DEFAULT_MAX_PRESETS);
  const [daySchedule, setScheduleS] = useState<DaySchedule>({});
  const ref = useRef({ presets: [] as Preset[], max: DEFAULT_MAX_PRESETS, schedule: {} as DaySchedule });

  const setPresets = (v: Preset[]) => {
    ref.current.presets = v;
    setPresetsS(v);
  };
  const setMax = (v: number) => {
    ref.current.max = v;
    setMaxS(v);
  };
  const setSchedule = (v: DaySchedule) => {
    ref.current.schedule = v;
    setScheduleS(v);
  };

  const load = useCallback(async () => {
    setStatus('loading');
    const [presetsRaw, scheduleRaw, maxRaw] = await Promise.all([
      readKey(PRESETS_KEY),
      readKey(DAY_SCHEDULE_KEY),
      readKey(MAX_PRESETS_KEY),
    ]);
    if (presetsRaw === TIMEOUT || scheduleRaw === TIMEOUT || maxRaw === TIMEOUT) {
      setStatus('error');
      return;
    }
    const ps = parseJSON<Preset[]>(presetsRaw, []);
    setPresets(Array.isArray(ps) ? ps.filter((p) => p && Array.isArray(p.pills)) : []);
    const sc = parseJSON<DaySchedule>(scheduleRaw, {});
    setSchedule(sc && typeof sc === 'object' ? sc : {});
    const mx = parseJSON<number>(maxRaw, DEFAULT_MAX_PRESETS);
    setMax(typeof mx === 'number' && mx > 0 ? mx : DEFAULT_MAX_PRESETS);
    setStatus('ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePreset = async (name: string, pills: Omit<Pill, 'id'>[]) => {
    const preset: Preset = { id: generateId(), name, pills, savedAt: todayStr() };
    const next = [...ref.current.presets, preset];
    const ok = await writeKey(PRESETS_KEY, JSON.stringify(next));
    if (ok) setPresets(next);
    return ok;
  };

  const updatePreset = async (id: string, pills: Omit<Pill, 'id'>[]) => {
    const next = ref.current.presets.map((p) => (p.id === id ? { ...p, pills } : p));
    const ok = await writeKey(PRESETS_KEY, JSON.stringify(next));
    if (ok) setPresets(next);
    return ok;
  };

  const deletePreset = async (id: string) => {
    const next = ref.current.presets.filter((p) => p.id !== id);
    const nextMax = Math.max(DEFAULT_MAX_PRESETS, ref.current.max - 1);
    // 요일에 배정돼 있으면 함께 뺀다
    const nextSchedule = { ...ref.current.schedule };
    for (const k of Object.keys(nextSchedule)) {
      const d = Number(k);
      if (nextSchedule[d] === id) delete nextSchedule[d];
    }
    const r = await Promise.all([
      writeKey(PRESETS_KEY, JSON.stringify(next)),
      writeKey(MAX_PRESETS_KEY, JSON.stringify(nextMax)),
      writeKey(DAY_SCHEDULE_KEY, JSON.stringify(nextSchedule)),
    ]);
    if (r[0]) setPresets(next);
    if (r[1]) setMax(nextMax);
    if (r[2]) setSchedule(nextSchedule);
    return r.every(Boolean);
  };

  const assignDay = async (day: number, presetId: string) => {
    const next = { ...ref.current.schedule, [day]: presetId };
    const ok = await writeKey(DAY_SCHEDULE_KEY, JSON.stringify(next));
    if (ok) setSchedule(next);
    return ok;
  };

  const unassignDay = async (day: number) => {
    const next = { ...ref.current.schedule };
    delete next[day];
    const ok = await writeKey(DAY_SCHEDULE_KEY, JSON.stringify(next));
    if (ok) setSchedule(next);
    return ok;
  };

  const increasePresetSlot = async () => {
    const next = ref.current.max + 1;
    const ok = await writeKey(MAX_PRESETS_KEY, JSON.stringify(next));
    if (ok) setMax(next);
    return ok;
  };

  return (
    <PresetContext.Provider
      value={{
        status,
        reload: () => void load(),
        presets,
        maxPresets,
        daySchedule,
        savePreset,
        updatePreset,
        deletePreset,
        assignDay,
        unassignDay,
        increasePresetSlot,
      }}
    >
      {children}
    </PresetContext.Provider>
  );
}

export function usePresets() {
  const ctx = useContext(PresetContext);
  if (!ctx) throw new Error('PresetProvider not found');
  return ctx;
}
