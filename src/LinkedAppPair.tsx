import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LINE, PAD, T_SMALL, T_SUB, TEXT, TEXT_MUTED } from './theme';
import type { LinkedApp } from './linkedApps';

/** 크로스 프로모션 — 보상 없는 단순 안내. 조용하게 둔다 */
export function LinkedAppPair({ title, apps }: { title: string; apps: readonly [LinkedApp, LinkedApp] }) {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      <View style={s.row}>
        {apps.map((app) => (
          <TouchableOpacity
            key={app.deepLink}
            style={s.item}
            activeOpacity={0.8}
            onPress={() => Linking.openURL(app.deepLink).catch(() => {})}
          >
            <Image source={{ uri: app.icon }} style={s.icon} />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{app.name}</Text>
              <Text style={s.desc} numberOfLines={2}>{app.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: PAD, paddingTop: 8 },
  title: { fontSize: T_SMALL, fontWeight: '700', color: TEXT_MUTED, marginBottom: 12 },
  row: { gap: 10 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: LINE,
  },
  icon: { width: 40, height: 40, borderRadius: 10 },
  name: { fontSize: T_SUB, fontWeight: '700', color: TEXT },
  desc: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 2, lineHeight: 18 },
});
