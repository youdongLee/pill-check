import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStamps } from '../stores/StampContext';
import { PROMO } from './ads';
import { devFlags } from './devFlags';
import { grantLog } from './reward';
import { dayShift, notifyDayChanged } from './useDayKey';

/** 🧪 테스트 번들 전용 패널 (SHOW_DEV_PANEL=true 일 때만 렌더) */
export function DevPanel() {
  const s = useStamps();
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const st = s.devState();

  const Btn = ({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) => (
    <TouchableOpacity style={styles.btn} onPress={async () => { await onPress(); rerender(); }} activeOpacity={0.7}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.box}>
      <Text style={styles.title}>🧪 테스트 패널 (운영 번들에는 없음)</Text>
      <Text style={styles.line}>오늘 {s.today} (이동 {dayShift.days}일) · 코드 {PROMO.daily.slice(0, 9)}…</Text>
      <Text style={styles.line}>도장 {JSON.stringify(st.stamps)}</Text>
      <Text style={styles.line}>7일 받은 날 {st.claimedDate ?? '-'}</Text>
      <Text style={styles.line}>지급 {JSON.stringify(st.payout)}</Text>
      <View style={styles.row}>
        <Btn label={`광고 스킵 ${devFlags.skipAds ? 'ON' : 'OFF'}`} onPress={() => { devFlags.skipAds = !devFlags.skipAds; }} />
        <Btn label="과거 6일 도장" onPress={() => s.devSeedPast(6)} />
        <Btn label="하루 넘기기" onPress={() => { dayShift.days += 1; notifyDayChanged(); }} />
        <Btn label="오늘로" onPress={() => { dayShift.days = 0; notifyDayChanged(); }} />
        <Btn label="도장 초기화" onPress={() => s.devReset()} />
      </View>
      {grantLog.map((l, i) => (
        <Text key={i} style={styles.log}>{l}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  title: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 6 },
  line: { fontSize: 11, color: '#78350F', marginBottom: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FDE68A' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#78350F' },
  log: { fontSize: 10, color: '#57534E' },
});
