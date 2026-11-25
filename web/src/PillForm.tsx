/**
 * 영양제 추가·수정 입력 — RN 의 홈 빠른 추가·관리 추가/수정·플랜 빌더 영양제 추가 시트가 같은 구성(이름·아이콘·단위·복용 시간)이라
 * 한 부품으로 묶었다. 문구·칩·잔여 슬롯 계산은 RN 그대로.
 */
import { useState, type ReactNode } from 'react';
import { PRESET_TIMES } from './domain/constants';
import type { Pill } from './domain/types';
import { useLayer } from './lib/nav';

export const NAME_PRESETS = ['종합 비타민', '비타민 B', '비타민 C', '비타민 D', '오메가3', '마그네슘', '칼슘'];
export const ICONS = [
  { emoji: '💊', color: '#22C55E' },
  { emoji: '💉', color: '#3B82F6' },
  { emoji: '🏥', color: '#14B8A6' },
];
const UNITS = ['알', 'mg', 'ml'];

export type PillInput = Omit<Pill, 'id'>;

/**
 * 직접 입력 시간 — 숫자 키패드에는 ':' 가 없어(웹 inputMode=numeric) 숫자 4자리를 받으면 두 자리 뒤에 ':' 를 넣는다(0830 → 08:30).
 * ':' 를 직접 치거나 붙여넣은 값(8:30·08:30)도 받는다.
 */
export function formatTimeInput(raw: string): string {
  const s = raw.replace(/[^\d:]/g, '');
  if (s.includes(':')) return s.slice(0, 5);
  const d = s.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** 'H:MM'·'HH:MM'·'HHMM' → 'HH:MM'(00:00~23:59). 아니면 null */
export function normalizeTime(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d{1,2}):?(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function PillForm({
  initial,
  initialTimes,
  available,
  submitLabel,
  onSubmit,
  footer,
}: {
  /** 수정일 때 원래 값 */
  initial?: PillInput;
  initialTimes?: string[];
  /** 고르기 전 남은 슬롯 수 */
  available: number;
  submitLabel: string;
  onSubmit: (v: PillInput) => Promise<void> | void;
  footer?: ReactNode;
}) {
  const matched = initial ? NAME_PRESETS.includes(initial.name) : false;
  const [selectedName, setSelectedName] = useState(initial && matched ? initial.name : '');
  const [isCustomName, setIsCustomName] = useState(!!initial && !matched);
  const [customName, setCustomName] = useState(initial && !matched ? initial.name : '');
  const [icon, setIcon] = useState(ICONS.find((i) => i.emoji === initial?.emoji) ?? ICONS[0]);
  const [unit, setUnit] = useState(initial?.dosageUnit ?? '');
  const [amount, setAmount] = useState(initial?.dosageAmount ?? '');
  const [times, setTimes] = useState<string[]>(initialTimes ?? []);
  const [customTime, setCustomTime] = useState('');
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [saving, setSaving] = useState(false);

  const finalName = isCustomName ? customName : selectedName;
  const isValid = finalName.trim().length > 0 && times.length > 0;
  const left = available - times.length;

  const toggleTime = (t: string) => setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const addCustomTime = () => {
    const t = normalizeTime(customTime);
    if (!t) return;
    if (times.includes(t)) {
      setCustomTime('');
      setShowCustomTime(false);
      return;
    }
    if (left <= 0) return;
    setTimes((prev) => [...prev, t]);
    setCustomTime('');
    setShowCustomTime(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const submit = async () => {
    if (!isValid || saving) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    setSaving(true);
    try {
      await onSubmit({
        name: finalName.trim(),
        emoji: icon.emoji,
        color: icon.color,
        dosageAmount: amount.trim() || undefined,
        dosageUnit: unit || undefined,
        times: [...times].sort(),
      });
    } finally {
      setSaving(false);
    }
  };

  const customOnly = times.filter((t) => !PRESET_TIMES.some((p) => p.time === t));
  const noSlotForNew = left <= 0;

  return (
    <div className="form">
      <p className="f-label">이름</p>
      <div className="chip-wrap">
        {NAME_PRESETS.map((n) => (
          <button
            key={n}
            className={`chip ${!isCustomName && selectedName === n ? 'sel' : ''}`}
            onClick={() => {
              setSelectedName(n);
              setIsCustomName(false);
            }}
          >
            {n}
          </button>
        ))}
        <button
          className={`chip ${isCustomName ? 'sel' : ''}`}
          onClick={() => {
            setIsCustomName(true);
            setSelectedName('');
          }}
        >
          직접입력
        </button>
      </div>
      {isCustomName && (
        <input
          className="f-input"
          placeholder="영양제 이름 입력"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          autoFocus
        />
      )}

      <p className="f-label">아이콘</p>
      <div className="icon-row">
        {ICONS.map((ic) => (
          <button
            key={ic.emoji}
            className="icon-chip"
            style={icon.emoji === ic.emoji ? { borderColor: ic.color, backgroundColor: ic.color + '18' } : undefined}
            onClick={() => setIcon(ic)}
          >
            {ic.emoji}
          </button>
        ))}
      </div>

      <p className="f-label">
        단위 <span className="f-optional">(선택)</span>
      </p>
      <div className="dosage-row">
        <input
          className="dosage-input"
          placeholder="수량"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {UNITS.map((u) => (
          <button key={u} className={`unit-chip ${unit === u ? 'sel' : ''}`} onClick={() => setUnit(unit === u ? '' : u)}>
            {u}
          </button>
        ))}
      </div>

      <p className="f-label">
        복용 시간{'  '}
        <span className={`f-optional ${left < 0 ? 'over' : ''}`}>(잔여 슬롯 {Math.max(0, left)}개)</span>
      </p>
      <div className="time-chip-wrap">
        {PRESET_TIMES.map(({ label, time }) => {
          const sel = times.includes(time);
          const noSlot = !sel && noSlotForNew;
          return (
            <button
              key={time}
              className={`time-chip ${sel ? 'sel' : ''} ${noSlot ? 'dis' : ''}`}
              onClick={() => {
                if (!noSlot) toggleTime(time);
              }}
            >
              <span className="tc-label">{label}</span>
              <span className="tc-time">{time}</span>
            </button>
          );
        })}
        {customOnly.map((t) => (
          <button key={t} className="time-chip sel" onClick={() => toggleTime(t)}>
            <span className="tc-label">직접 입력</span>
            <span className="tc-time">{t}</span>
          </button>
        ))}
        <button
          className={`time-chip ${showCustomTime ? 'sel' : ''} ${noSlotForNew ? 'dis' : ''}`}
          onClick={() => {
            if (!noSlotForNew) setShowCustomTime(true);
          }}
        >
          <span className="tc-label">직접 입력</span>
          <span className="tc-time">+ 추가</span>
        </button>
      </div>
      {showCustomTime && (
        <div className="custom-time-row">
          <input
            className="f-input grow"
            placeholder="HH:MM"
            value={customTime}
            onChange={(e) => setCustomTime(formatTimeInput(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              setCustomTime(formatTimeInput(e.clipboardData.getData('text')));
            }}
            maxLength={5}
            inputMode="numeric"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && addCustomTime()}
            autoFocus
          />
          <button className="custom-time-add" onClick={addCustomTime}>
            추가
          </button>
        </div>
      )}

      <button className={`save-btn ${!isValid ? 'off' : ''}`} onClick={() => void submit()} disabled={!isValid || saving}>
        {saving ? '저장 중...' : submitLabel}
      </button>
      {footer}
      <div style={{ height: 8 }} />
    </div>
  );
}

/** 아래에서 올라오는 시트 — RN Modal animationType="slide". 바깥 누름·뒤로가기 = 닫기 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useLayer(open, onClose);
  if (!open) return null;
  return (
    <div className="dim bottom" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && <h3 className="sheet-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/** 가운데 창 — RN Modal animationType="fade" */
export function CenterModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useLayer(open, onClose);
  if (!open) return null;
  return (
    <div className="dim center" onClick={onClose}>
      <div className="center-card" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
