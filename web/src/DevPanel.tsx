/**
 * 🧪 테스트 패널 — RN src/DevPanel.tsx 자리. 🧪 번들(build:test)·개발 서버에서만 번들에 들어간다.
 * 웹에서 더한 것: '옛 기록(RN)' 한 줄 + 저장 원문 보기(같은 저장소를 읽는지 기기에서 확인하는 용도).
 */
import { useState } from 'react';
import { AD_IDS, NOTIFY_STATE_KEY, PROMO } from './domain/config';
import { dayShift, notifyDayChanged } from './domain/dayKey';
import { devFlags } from './domain/devFlags';
import { TIMEOUT, adDebug, grantLog, readKey, rewardSupported } from './lib/platform';
import { MAX_SLOTS_KEY, PILLS_KEY, RECORD_KEY } from './stores/PillContext';
import { MAX_PRESETS_KEY, PRESETS_KEY } from './stores/PresetContext';
import { CLAIMED_DATE_KEY, PAYOUT_KEY, STAMPS_KEY, useStamps } from './stores/StampContext';
import { legacyInfo } from './lib/legacy';

export function DevPanel() {
  const s = useStamps();
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [raw, setRaw] = useState<string | null>(null);
  const st = s.devState();

  const Btn = ({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) => (
    <button
      className="dev-btn"
      onClick={async () => {
        await onPress();
        rerender();
      }}
    >
      {label}
    </button>
  );

  const showRaw = async () => {
    const keys = [
      PILLS_KEY,
      RECORD_KEY(s.today),
      MAX_SLOTS_KEY,
      STAMPS_KEY,
      CLAIMED_DATE_KEY,
      PAYOUT_KEY,
      PRESETS_KEY,
      MAX_PRESETS_KEY,
      NOTIFY_STATE_KEY,
    ];
    const lines: string[] = [];
    for (const k of keys) {
      const v = await readKey(k);
      lines.push(`${k}\n${v === TIMEOUT ? '읽기 실패' : String(v).slice(0, 300)}`);
    }
    setRaw(lines.join('\n\n'));
  };

  return (
    <div className="dev-box">
      <p className="dev-title">🧪 테스트 패널 (운영 번들에는 없음)</p>
      <p className="dev-line">옛 기록(RN): {legacyInfo.text}</p>
      <p className="dev-line">
        오늘 {s.today} (이동 {dayShift.days}일) · 매일 {PROMO.daily.slice(0, 9)}… · 7일 {PROMO.streak.slice(0, 9)}…(운영 코드)
      </p>
      <p className="dev-line">도장 {JSON.stringify(st.stamps)}</p>
      <p className="dev-line">7일 받은 날 {st.claimedDate ?? '-'}</p>
      <p className="dev-line">지급 {JSON.stringify(st.payout)}</p>
      <p className="dev-line">
        광고 {rewardSupported() ? 'O' : 'X'} · {adDebug()} · {AD_IDS.reward.slice(-6)}
      </p>
      <div className="dev-row">
        <Btn label={`광고 스킵 ${devFlags.skipAds ? 'ON' : 'OFF'}`} onPress={() => void (devFlags.skipAds = !devFlags.skipAds)} />
        <Btn label="과거 6일 도장" onPress={() => s.devSeedPast(6)} />
        <Btn
          label="하루 넘기기"
          onPress={() => {
            dayShift.days += 1;
            notifyDayChanged();
          }}
        />
        <Btn
          label="오늘로"
          onPress={() => {
            dayShift.days = 0;
            notifyDayChanged();
          }}
        />
        <Btn label="도장 초기화" onPress={() => s.devReset()} />
        <Btn label="저장 원문 보기" onPress={showRaw} />
      </div>
      {grantLog.map((l, i) => (
        <p key={i} className="dev-log">
          {l}
        </p>
      ))}
      {raw ? <pre className="dev-raw">{raw}</pre> : null}
    </div>
  );
}
