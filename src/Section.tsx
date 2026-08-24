import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LINE, PAD, T_SMALL, TEXT, TEXT_MUTED } from './theme';

/**
 * 한 페이지 안의 구역.
 *
 * 이 앱은 화면을 나누지 않는다 — 5060 유저는 문을 눌러 들어가지 않는다.
 * 대신 한 장을 위에서 아래로 훑으며 전부 볼 수 있게, 구역마다 큰 제목을 단다.
 * 제목만 읽어도 "여기서 뭘 할 수 있는지" 알아야 한다.
 */
export function Block({
  no,
  title,
  desc,
  children,
  first,
}: {
  /** 구역 번호 — 순서가 있다는 걸 알려주면 훑기가 쉬워진다 */
  no: number;
  title: string;
  desc?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View style={[s.wrap, first && s.first]}>
      <View style={s.head}>
        <View style={s.no}>
          <Text style={s.noText}>{no}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{title}</Text>
          {desc ? <Text style={s.desc}>{desc}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 30, borderTopWidth: 8, borderTopColor: '#EBF2ED', marginTop: 26 },
  first: { borderTopWidth: 0, marginTop: 0, paddingTop: 20 },
  head: { flexDirection: 'row', gap: 12, paddingHorizontal: PAD, marginBottom: 18 },
  no: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1F7A46',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  noText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  title: { fontSize: 21, fontWeight: '800', color: TEXT, lineHeight: 29 },
  desc: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 4, lineHeight: 19 },
});

export { LINE, PAD };
