import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LINE, PAD, PRIMARY, SUNK, T_SMALL, TEXT, TEXT_MUTED } from './theme';

/**
 * 한 페이지 안의 구역.
 *
 * 5060 유저는 문을 눌러 다른 화면으로 들어가지 않는다. 그래서 이 앱은 화면을 나누지 않고
 * 한 장에 구역을 쌓는다. 다만 구역을 박스로 가두면 다시 조잡해지므로,
 * 얇은 라벨 + 큰 제목 + 넉넉한 여백으로만 나눈다.
 */
export function Block({
  no,
  title,
  desc,
  children,
  first,
}: {
  no: number;
  title: string;
  desc?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View style={[s.wrap, first && s.first]}>
      <View style={s.head}>
        <View style={s.label}>
          <Text style={s.no}>{String(no).padStart(2, '0')}</Text>
          <View style={s.rule} />
        </View>
        <Text style={s.title}>{title}</Text>
        {desc ? <Text style={s.desc}>{desc}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 34, marginTop: 34, borderTopWidth: 9, borderTopColor: SUNK },
  first: { borderTopWidth: 0, marginTop: 0, paddingTop: 24 },

  head: { paddingHorizontal: PAD, marginBottom: 20 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  no: { fontSize: 11, fontWeight: '800', color: PRIMARY, letterSpacing: 1.4 },
  rule: { flex: 1, height: 1, backgroundColor: LINE },

  title: { fontSize: 23, fontWeight: '800', color: TEXT, lineHeight: 31, letterSpacing: -0.3 },
  desc: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 6, lineHeight: 19 },
});
