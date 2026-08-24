import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LINE, PRIMARY, PRIMARY_SOFT, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB, WARN } from './theme';

/**
 * 기준선 대비 막대.
 *
 * 이 화면의 주인공. 100% 자리에 기준선을 긋고 막대가 그 선을 넘었는지 못 미쳤는지를
 * 한눈에 보게 한다(건강검진 결과지가 정상 범위를 표시하는 방식).
 * 눈금 전체는 150%라 초과가 선 밖으로 튀어나와 보인다.
 */
export function Scale({
  name,
  amount,
  unit,
  percent,
  tone,
  caption,
}: {
  name: string;
  amount: number;
  unit: string;
  percent: number | null;
  tone: 'over' | 'plenty' | 'covered' | 'little' | 'none';
  caption?: string;
}) {
  const ratio = percent === null ? 0 : Math.min(percent, 150) / 150;
  const color = tone === 'over' ? WARN : tone === 'little' ? '#BFC7BF' : PRIMARY;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.name}>{name}</Text>
        <View style={s.right}>
          <Text style={s.amount}>{amount}{unit}</Text>
          {percent !== null && (
            <Text style={[s.pct, tone === 'over' && s.pctOver]}>{percent}%</Text>
          )}
        </View>
      </View>

      <View style={s.track}>
        <View style={s.mark} />
        <View style={[s.fill, { width: `${Math.max(ratio, 0.02) * 100}%`, backgroundColor: color }]} />
      </View>

      {caption ? <Text style={[s.caption, tone === 'over' && s.captionOver]}>{caption}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 },
  name: { fontSize: T_SUB, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amount: { fontSize: T_SMALL, color: TEXT_MUTED, fontWeight: '600' },
  pct: { fontSize: T_SUB, fontWeight: '800', color: TEXT_SUB, minWidth: 44, textAlign: 'right' },
  pctOver: { color: WARN },

  track: {
    height: 10, backgroundColor: PRIMARY_SOFT, borderRadius: 5,
    overflow: 'hidden', justifyContent: 'center',
  },
  // 100% 지점 — 눈금이 150% 이므로 2/3 자리
  mark: { position: 'absolute', left: '66.6%', top: -2, bottom: -2, width: 2, backgroundColor: LINE, zIndex: 2 },
  fill: { height: 10, borderRadius: 5 },

  caption: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 8, lineHeight: 18 },
  captionOver: { color: WARN, fontWeight: '600' },
});
