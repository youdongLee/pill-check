import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import {
  BG, LINE, PAD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, T_BODY, T_SMALL, T_SUB, T_TITLE,
  TEXT, TEXT_MUTED, TEXT_SUB,
} from './theme';

/** 화면 제목 — 표준 내비바 아래에 오는 첫 줄 */
export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={s.titleWrap}>
      <Text style={s.title}>{children}</Text>
      {sub ? <Text style={s.titleSub}>{sub}</Text> : null}
    </View>
  );
}

/** 구역 제목 — 박스로 감싸지 않고 글자만으로 나눈다 */
export function Section({ children, top = 28 }: { children: React.ReactNode; top?: number }) {
  return <Text style={[s.section, { marginTop: top }]}>{children}</Text>;
}

/** 주요 동작 — 화면당 하나. 알약 모양으로 크게 */
export function Action({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'gold' | 'quiet';
}) {
  return (
    <TouchableOpacity
      style={[s.action, tone === 'gold' && s.actionGold, tone === 'quiet' && s.actionQuiet, disabled && s.actionOff]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[s.actionText, tone === 'gold' && s.actionTextGold, tone === 'quiet' && s.actionTextQuiet]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** 고르는 알약 — 제품·성분·시간대 모두 이 하나로 */
export function Pill({
  label,
  on,
  onPress,
  wide,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.pill, on && s.pillOn, wide && s.pillWide]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.pillText, on && s.pillTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** 줄 목록 — 카드가 아니라 얇은 선으로 나눈다 */
export function Row({
  children,
  onPress,
  last,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: ViewStyle;
}) {
  const body = <View style={[s.row, last && s.rowLast, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {body}
    </TouchableOpacity>
  );
}

/** 조용한 안내 한 줄 */
export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={s.note}>{children}</Text>;
}

/** 아무것도 없을 때 */
export function Empty({
  emoji,
  title,
  desc,
  action,
}: {
  emoji: string;
  title: string;
  desc?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyEmoji}>{emoji}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {desc ? <Text style={s.emptyDesc}>{desc}</Text> : null}
      {action ? (
        <View style={s.emptyAction}>
          <Action label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  titleWrap: { paddingHorizontal: PAD, paddingTop: 22, paddingBottom: 18 },
  title: { fontSize: T_TITLE, fontWeight: '800', color: TEXT },
  titleSub: { fontSize: T_SUB, color: TEXT_SUB, marginTop: 5 },

  section: { fontSize: T_BODY, fontWeight: '800', color: TEXT, paddingHorizontal: PAD, marginBottom: 12 },

  action: {
    marginHorizontal: PAD, backgroundColor: PRIMARY_DARK, borderRadius: 999,
    paddingVertical: 19, alignItems: 'center',
  },
  actionGold: { backgroundColor: '#FEF3C7' },
  actionQuiet: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: LINE, paddingVertical: 15 },
  actionOff: { backgroundColor: '#DCE3DE' },
  actionText: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  actionTextGold: { color: '#92610A' },
  actionTextQuiet: { color: TEXT_SUB, fontSize: T_SUB, fontWeight: '700' },

  pill: {
    paddingHorizontal: 15, paddingVertical: 11, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: LINE,
  },
  pillWide: { flex: 1, alignItems: 'center' },
  pillOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  pillText: { fontSize: T_SUB, fontWeight: '700', color: TEXT_SUB },
  pillTextOn: { color: PRIMARY_DARK, fontWeight: '800' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: PAD, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  rowLast: { borderBottomWidth: 0 },

  note: { fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 20, paddingHorizontal: PAD, marginTop: 10 },

  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: T_BODY, color: TEXT_MUTED, textAlign: 'center', lineHeight: 26 },
  emptyAction: { alignSelf: 'stretch', marginTop: 28 },
});

export const ui = s;
export { BG, PAD, LINE };
