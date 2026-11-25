/**
 * 내 플랜 — RN stores/PresetContext.tsx 와 같은 키·형식.
 *   @pillcheck/presets      : Preset[] JSON
 *   @pillcheck/maxPresets   : number JSON (기본 1)
 *
 * 요일 배정(@pillcheck/daySchedule)은 웹뷰판에서 뺐다(형님 11/25) — RN 에서 배정해도 읽어 쓰는 곳이 없던 기능.
 * 그 키는 읽지도 쓰지도 않고 지우지도 않는다(RN 호환). 플랜을 지울 때 RN 은 그 플랜의 요일 배정도 지웠지만
 * 웹은 키를 건드리지 않으므로 지운 플랜의 배정이 키에 남는다(웹에서는 쓰지 않아 영향 없음).
 * @pillcheck/lastAutoLoad 는 RN 에서도 읽기만 하고 쓰는 곳이 없어 옮기지 않았다.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Pill } from '../domain/types';
import { generateId, todayStr } from '../domain/utils';
import { TIMEOUT, readKey, writeKey } from '../lib/platform';
import type { LoadStatus } from './PillContext';

export const PRESETS_KEY = '@pillcheck/presets';
export const MAX_PRESETS_KEY = '@pillcheck/maxPresets';
const DEFAULT_MAX_PRESETS = 1;

export interface Preset {
  id: string;
  name: string;
  pills: Omit<Pill, 'id'>[];
  savedAt: string;
}

interface PresetContextType {
  status: LoadStatus;
  reload: () => void;
  presets: Preset[];
  maxPresets: number;
  savePreset: (name: string, pills: Omit<Pill, 'id'>[]) => Promise<boolean>;
  updatePreset: (id: string, pills: Omit<Pill, 'id'>[]) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
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
  const ref = useRef({ presets: [] as Preset[], max: DEFAULT_MAX_PRESETS });

  const setPresets = (v: Preset[]) => {
    ref.current.presets = v;
    setPresetsS(v);
  };
  const setMax = (v: number) => {
    ref.current.max = v;
    setMaxS(v);
  };

  const load = useCallback(async () => {
    setStatus('loading');
    const [presetsRaw, maxRaw] = await Promise.all([readKey(PRESETS_KEY), readKey(MAX_PRESETS_KEY)]);
    if (presetsRaw === TIMEOUT || maxRaw === TIMEOUT) {
      setStatus('error');
      return;
    }
    const ps = parseJSON<Preset[]>(presetsRaw, []);
    setPresets(Array.isArray(ps) ? ps.filter((p) => p && Array.isArray(p.pills)) : []);
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

  /** 플랜 목록 저장이 성패를 가른다. 슬롯 수 줄이기는 따라 쓰는 값(못 줄면 유저에게 한 칸 남을 뿐) */
  const deletePreset = async (id: string) => {
    const next = ref.current.presets.filter((p) => p.id !== id);
    const nextMax = Math.max(DEFAULT_MAX_PRESETS, ref.current.max - 1);
    if (!(await writeKey(PRESETS_KEY, JSON.stringify(next)))) return false;
    setPresets(next);
    if (await writeKey(MAX_PRESETS_KEY, JSON.stringify(nextMax))) setMax(nextMax);
    return true;
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
        savePreset,
        updatePreset,
        deletePreset,
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
