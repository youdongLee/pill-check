/**
 * 홈·관리 공용 타일 — RN src/PillTile.tsx.
 * 4열: 영양제 3개 + '추가' 칸이 한 줄에 들어간다(감싸는 줄 좌우 여백 12).
 * 큰글씨: 보조 글자는 1.3배까지(--s), 이름·핵심 숫자는 1.5배까지(--k) — RN maxFontSizeMultiplier 와 같다.
 */
import { useRef, type CSSProperties, type MouseEvent as RME, type PointerEvent as RPE } from 'react';
import type { Pill } from './domain/types';

/** 길게 누르기(RN onLongPress, 0.5초). 길게 눌렀으면 이어지는 click 은 버린다 */
function useLongPress(onLongPress?: () => void) {
  const timer = useRef(0);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  if (!onLongPress) return { fired, handlers: {} };
  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  return {
    fired,
    handlers: {
      onPointerDown: (e: RPE) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, 500);
      },
      onPointerMove: (e: RPE) => {
        const s = start.current;
        if (s && Math.abs(e.clientX - s.x) + Math.abs(e.clientY - s.y) > 10) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: RME) => e.preventDefault(),
    },
  };
}

export function PillTile({
  pill,
  time,
  taken,
  onPress,
  onLongPress,
}: {
  pill: Pill;
  time: string;
  taken?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const dose = pill.dosageAmount && pill.dosageUnit ? `${pill.dosageAmount}${pill.dosageUnit}` : '';
  const lp = useLongPress(onLongPress);
  return (
    <button
      className="tile-cell"
      onClick={() => {
        if (lp.fired.current) {
          lp.fired.current = false;
          return;
        }
        onPress();
      }}
      {...lp.handlers}
    >
      <div className={`tile-card ${taken ? 'taken' : ''}`} style={{ borderColor: pill.color + '50' } as CSSProperties}>
        <span className={`tile-time ${taken ? 'taken' : ''}`}>{time}</span>
        <span className="tile-emoji-wrap" style={{ backgroundColor: pill.color + '22' }}>
          <span className="tile-emoji">{pill.emoji}</span>
          {taken && (
            <span className="tile-check">
              <span>✓</span>
            </span>
          )}
        </span>
        <span className={`tile-name ${taken ? 'taken' : ''}`}>{pill.name}</span>
        {!!dose && <span className="tile-dose">{dose}</span>}
      </div>
    </button>
  );
}

/** 목록 마지막 '+ 추가' 타일. 자리가 꽉 찼으면 자물쇠 + 자리 추가 흐름 */
export function AddTile({ used, max, onPress }: { used: number; max: number; onPress: () => void }) {
  const full = used >= max;
  return (
    <button className="tile-cell" onClick={onPress}>
      <div className={`tile-card add ${full ? 'full' : ''}`}>
        <span className="add-plus">{full ? '🔒' : '+'}</span>
        <span className="add-text">추가</span>
        <span className="tile-dose">{`${used}/${max}`}</span>
      </div>
    </button>
  );
}
