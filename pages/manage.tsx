import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useState } from 'react';
import {
  Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { findIngredient } from '../data/ingredients';
import { SLOTS, slotOf, type Pill, type SlotKey } from '../data/types';
import { AD_IDS } from '../src/ads';
import { useRewardAd } from '../src/useRewardAd';
import { IngredientPicker } from '../src/IngredientPicker';
import {
  BG, BORDER, CARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/manage', { component: ManagePage });

function ManagePage() {
  const navigation = Route.useNavigation();
  const { pills, maxPills, increaseSlot, updatePill, deletePill } = usePills();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);
  const [open, setOpen] = useState<string | null>(null);

  const addSlot = () =>
    show(async () => {
      await increaseSlot();
      Alert.alert('자리를 늘렸어요', '영양제를 하나 더 넣을 수 있어요.');
    });

  const remove = (pill: Pill) =>
    Alert.alert(`"${pill.name}" 지울까요?`, '복용 기록에서도 빠져요.', [
      { text: '아니요', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deletePill(pill.id) },
    ]);

  const toggleSlot = async (pill: Pill, key: SlotKey) => {
    const next = pill.slots.includes(key) ? pill.slots.filter((s) => s !== key) : [...pill.slots, key];
    if (next.length === 0) {
      Alert.alert('시간대는 하나 이상 골라주세요');
      return;
    }
    await updatePill({ ...pill, slots: next });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>내 영양제</Text>
        <Text style={styles.lead}>{pills.length} / {maxPills}개 넣으셨어요</Text>

        {pills.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyText}>아직 없어요</Text>
          </View>
        ) : (
          pills.map((pill) => {
            const isOpen = open === pill.id;
            return (
              <View key={pill.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.head}
                  onPress={() => setOpen(isOpen ? null : pill.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{pill.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{pill.name}</Text>
                    <Text style={styles.sub}>
                      {pill.slots.map((s) => slotOf(s).label).join(' · ')}
                      {pill.remaining !== undefined ? ` · ${pill.remaining}알` : ''}
                      {pill.needsReview ? ' · 성분 확인 필요' : ''}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>{isOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.body}>
                    <Text style={styles.label}>들어있는 성분</Text>
                    <IngredientPicker
                      value={pill.ingredients}
                      onChange={(next) => updatePill({ ...pill, ingredients: next, needsReview: false })}
                    />

                    <Text style={[styles.label, { marginTop: 22 }]}>드시는 시간</Text>
                    <View style={styles.slotRow}>
                      {SLOTS.map((s) => {
                        const on = pill.slots.includes(s.key);
                        return (
                          <TouchableOpacity
                            key={s.key}
                            style={[styles.slot, on && styles.slotOn]}
                            onPress={() => toggleSlot(pill, s.key)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.slotEmoji}>{s.emoji}</Text>
                            <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>{s.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.label, { marginTop: 22 }]}>남은 개수</Text>
                    <View style={styles.countRow}>
                      <TextInput
                        style={styles.countInput}
                        placeholder="—"
                        placeholderTextColor={TEXT_MUTED}
                        defaultValue={pill.remaining !== undefined ? String(pill.remaining) : ''}
                        onEndEditing={(e) => {
                          const n = Number(e.nativeEvent.text.replace(/[^0-9]/g, ''));
                          updatePill({ ...pill, remaining: Number.isFinite(n) && n > 0 ? n : undefined });
                        }}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={4}
                      />
                      <Text style={styles.countUnit}>알</Text>
                    </View>

                    <TouchableOpacity style={styles.delete} onPress={() => remove(pill)} activeOpacity={0.8}>
                      <Text style={styles.deleteText}>이 영양제 지우기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
          <Text style={styles.addText}>+ 영양제 넣기</Text>
        </TouchableOpacity>

        {/* 리워드 = 기능 언락. 포인트 지급이 아니다 */}
        <TouchableOpacity
          style={[styles.slotAdd, (playing || !adLoaded) && styles.slotAddOff]}
          onPress={addSlot}
          disabled={playing || !adLoaded}
          activeOpacity={0.85}
        >
          <Text style={styles.slotAddText}>
            {playing ? '광고 재생 중...' : adLoaded ? '📺 광고 보고 자리 한 칸 늘리기' : '광고 준비 중...'}
          </Text>
        </TouchableOpacity>

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.manageBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 5 },
  lead: { fontSize: 15, color: TEXT_SUB, marginBottom: 18 },

  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 18 },
  emoji: { fontSize: 28 },
  name: { fontSize: 18, fontWeight: '800', color: TEXT },
  sub: { fontSize: 14, color: TEXT_MUTED, marginTop: 4 },
  arrow: { fontSize: 13, color: TEXT_MUTED },

  body: { paddingHorizontal: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 18 },
  label: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 12 },

  slotRow: { flexDirection: 'row', gap: 7 },
  slot: {
    flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
  },
  slotOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  slotEmoji: { fontSize: 17, marginBottom: 3 },
  slotLabel: { fontSize: 13, fontWeight: '700', color: TEXT_SUB },
  slotLabelOn: { color: PRIMARY_DARK, fontWeight: '800' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countInput: {
    width: 92, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 13, fontSize: 18, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: 16, color: TEXT_SUB, fontWeight: '700' },

  delete: { marginTop: 22, paddingVertical: 13, alignItems: 'center' },
  deleteText: { fontSize: 15, color: '#C0392B', fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 50, marginBottom: 14 },
  emptyText: { fontSize: 18, fontWeight: '700', color: TEXT_MUTED },

  addBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  addText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  slotAdd: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 10,
  },
  slotAddOff: { opacity: 0.5 },
  slotAddText: { fontSize: 15, fontWeight: '700', color: TEXT_SUB },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 24 },
});
