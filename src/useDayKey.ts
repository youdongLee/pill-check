import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from '../data/utils';

/** 테스트 패널의 "하루 넘기기"용 오프셋(일). 운영에서는 항상 0. */
export const dayShift = { days: 0 };

export function currentDay(): string {
  if (!dayShift.days) return todayStr();
  const d = new Date();
  d.setDate(d.getDate() + dayShift.days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const listeners = new Set<() => void>();
/** 테스트 패널에서 날짜를 바꿨을 때 모든 화면에 알린다 */
export function notifyDayChanged() {
  listeners.forEach((fn) => fn());
}

/**
 * 오늘 날짜 키. 앱을 켜둔 채 자정을 넘기거나(타이머) 백그라운드에서 돌아오면(AppState) 갱신된다.
 * 하루 단위 상태는 이 값으로 다시 계산해야 어제 기록이 오늘로 넘어오지 않는다.
 */
export function useDayKey(): string {
  const [day, setDay] = useState(currentDay);

  useEffect(() => {
    const refresh = () => setDay(currentDay());
    listeners.add(refresh);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      timer = setTimeout(() => { refresh(); arm(); }, Math.min(next.getTime() - now.getTime(), 6 * 3600 * 1000));
    };
    arm();
    return () => { listeners.delete(refresh); sub.remove(); clearTimeout(timer); };
  }, []);

  return day;
}
