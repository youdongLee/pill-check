import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LINE, PRIMARY, T_SMALL, T_SUB, TEXT, TEXT_MUTED, WARN } from './theme';

/**
 * 기준선 대비 막대.
 *
 * 이 앱의 진단 화면은 글 목록이 아니라 이 막대들이 주인공이다.
 * 100% 자리에 기준선을 긋고, 막대가 그 선을 넘었는지 못 미쳤는지를 한눈에 보게 한다.
 * (건강검진 결과지에서 정상 범위를 표시하는 방식과 같다)
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
  /** 기준 대비 % — null 이면 비교 기준이 없는 성분 */
  percent: number | null;
  tone: 'over' | 'plenty' | 'covered' | 'little' | 'none';
  caption?: string;
}) {
  // 150% 까지를 눈금 전체로 잡는다. 그래야 100% 선이 가운데쯤 오고 초과가 눈에 띈다
  const ratio = percent === null ? 0 : Math.min(percent, 150) / 150;
  const color = tone === 'over' ? WARN : tone === 'little' ? '#C8D2CB' : PRIMARY;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.name}>{name}</Text>
        <Text style={[s.value, tone === 'over' && s.over]}>
          {amount}{unit}
          {percent !== null ? `  ${percent}%` : ''}
        </Text>
      </View>

      <View style={s.track}>
        {/* 기준선 — 눈금의 2/3 지점이 100% */}
        <View style={s.mark} />
        <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>

      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  name: { fontSize: T_SUB, fontWeight: '700', color: TEXT },
  value: { fontSize: T_SMALL, fontWeight: '700', color: TEXT_MUTED },
  over: { color: WARN },

  track: { height: 12, backgroundColor: '#EAF0EC', borderRadius: 6, overflow: 'hidden', justifyContent: 'center' },
  mark: {
    position: 'absolute', left: '66.6%', top: 0, bottom: 0,
    width: 2, backgroundColor: LINE, zIndex: 2,
  },
  fill: { height: 12, borderRadius: 6 },

  caption: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 7, lineHeight: 18 },
});
