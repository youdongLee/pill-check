import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER, CARD, TEXT, TEXT_MUTED, TEXT_SUB } from './theme';
import type { LinkedApp } from './linkedApps';

/** 크로스 프로모션: 가로형 카드 2개 한 쌍. 탭하면 해당 미니앱으로 이동 (보상 없음) */
export function LinkedAppPair({ title, apps }: { title: string; apps: readonly [LinkedApp, LinkedApp] }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {apps.map((app) => (
          <TouchableOpacity
            key={app.deepLink}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(app.deepLink).catch(() => {})}
          >
            <Image source={{ uri: app.icon }} style={styles.icon} />
            <Text style={styles.name} numberOfLines={1}>{app.name}</Text>
            <Text style={styles.desc} numberOfLines={2}>{app.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 14, fontWeight: '700', color: TEXT_SUB },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  icon: { width: 44, height: 44, borderRadius: 11, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '800', color: TEXT },
  desc: { fontSize: 12, color: TEXT_MUTED, textAlign: 'center', lineHeight: 17 },
});
