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
import { isOcrSupported, scanIngredientLabel } from '../src/ocr';
import {
  BG, BORDER, CARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/manage', { component: ManagePage });

function ManagePage() {
  const navigation = Route.useNavigation();
  const { pills, maxPills, increaseSlot, updatePill, deletePill } = usePills();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);
  const [editing, setEditing] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const ocrSupported = isOcrSupported();

  const handleAddSlot = () => {
    show(async () => {
      await increaseSlot();
      Alert.alert('자리를 늘렸어요', '영양제를 하나 더 넣을 수 있어요.');
    });
  };

  const handleDelete = (pill: Pill) => {
    Alert.alert(`"${pill.name}" 지울까요?`, '복용 기록에서도 빠져요.', [
      { text: '아니요', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deletePill(pill.id) },
    ]);
  };

  const toggleSlot = async (pill: Pill, key: SlotKey) => {
    const next = pill.slots.includes(key) ? pill.slots.filter((s) => s !== key) : [...pill.slots, key];
    if (next.length === 0) {
      Alert.alert('시간대는 하나 이상 골라주세요');
      return;
    }
    await updatePill({ ...pill, slots: next });
  };

  const setRemaining = async (pill: Pill, text: string) => {
    const n = Number(text.replace(/[^0-9]/g, ''));
    await updatePill({ ...pill, remaining: Number.isFinite(n) && n > 0 ? n : undefined });
  };

  const confirmReview = async (pill: Pill) => {
    await updatePill({ ...pill, needsReview: false });
  };

  /**
   * 성분표를 찍어 성분을 채운다.
   * 읽은 결과를 곧바로 저장하지 않고 무엇이 들어갈지 보여준 뒤 유저가 결정하게 한다 —
   * 사진 인식은 틀릴 수 있고, 성분은 점검 결과를 좌우하는 값이라 확인 없이 덮으면 안 된다.
   */
  const handleScan = async (pill: Pill) => {
    setScanning(pill.id);
    const result = await scanIngredientLabel(pill.id);
    setScanning(null);

    if (!result.ok) {
      if (!result.canceled) Alert.alert('읽지 못했어요', result.message);
      return;
    }
    if (!result.readable || result.items.length === 0) {
      Alert.alert(
        '성분표를 찾지 못했어요',
        result.note || '성분표가 잘 보이게, 글자에 초점을 맞춰서 다시 찍어주세요.',
      );
      return;
    }

    const preview = result.items
      .map((it) => {
        const meta = findIngredient(it.key);
        return meta ? `${meta.name} ${it.amount}${meta.unit}` : null;
      })
      .filter(Boolean)
      .join('\n');

    Alert.alert(
      `${result.items.length}가지를 읽었어요`,
      `${preview}\n\n${result.note ? `\n${result.note}\n\n` : ''}이대로 넣을까요? 기존 성분은 교체돼요.`,
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '넣기',
          onPress: async () => {
            await updatePill({ ...pill, ingredients: result.items, needsReview: false });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.count}>{pills.length} / {maxPills}개 넣으셨어요</Text>

        {pills.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>아직 없어요</Text>
          </View>
        ) : (
          pills.map((pill) => {
            const open = editing === pill.id;
            return (
              <View key={pill.id} style={[styles.card, pill.needsReview && styles.cardReview]}>
                <TouchableOpacity
                  style={styles.cardHead}
                  onPress={() => setEditing(open ? null : pill.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pillEmoji}>{pill.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pillName}>{pill.name}</Text>
                    <Text style={styles.pillSub}>
                      {pill.slots.map((s) => slotOf(s).label).join(' · ')}
                      {pill.remaining !== undefined ? ` · ${pill.remaining}알 남음` : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {pill.needsReview && (
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewText}>
                      예전 기록이라 이름만 보고 성분을 짐작했어요. 제품 뒷면과 맞는지 확인해 주세요.
                    </Text>
                    {ocrSupported && (
                      <TouchableOpacity
                        style={[styles.scanBtn, scanning === pill.id && styles.scanBtnOff]}
                        onPress={() => handleScan(pill)}
                        disabled={scanning !== null}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.scanBtnText}>
                          {scanning === pill.id ? '읽는 중...' : '📷 성분표 찍어서 채우기'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => confirmReview(pill)} activeOpacity={0.85}>
                      <Text style={styles.reviewBtnText}>맞아요</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {open && (
                  <View style={styles.editBox}>
                    {pill.ingredients.length > 0 ? (
                      <>
                        <Text style={styles.editLabel}>들어있는 성분</Text>
                        <View style={styles.ingWrap}>
                          {pill.ingredients.map((ing) => {
                            const meta = findIngredient(ing.key);
                            if (!meta) return null;
                            return (
                              <View key={ing.key} style={styles.ingChip}>
                                <Text style={styles.ingText}>{meta.name} {ing.amount}{meta.unit}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noIng}>성분 정보가 없어 점검에서 빠져요</Text>
                    )}

                    <Text style={styles.editLabel}>드시는 시간</Text>
                    <View style={styles.slotRow}>
                      {SLOTS.map((s) => {
                        const on = pill.slots.includes(s.key);
                        return (
                          <TouchableOpacity
                            key={s.key}
                            style={[styles.slotChip, on && styles.slotChipOn]}
                            onPress={() => toggleSlot(pill, s.key)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.slotEmoji}>{s.emoji}</Text>
                            <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>{s.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.editLabel}>남은 개수</Text>
                    <View style={styles.countRow}>
                      <TextInput
                        style={styles.countInput}
                        placeholder="—"
                        placeholderTextColor={TEXT_MUTED}
                        defaultValue={pill.remaining !== undefined ? String(pill.remaining) : ''}
                        onEndEditing={(e) => setRemaining(pill, e.nativeEvent.text)}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={4}
                      />
                      <Text style={styles.countUnit}>알</Text>
                    </View>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(pill)} activeOpacity={0.8}>
                      <Text style={styles.deleteBtnText}>이 영양제 지우기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ 영양제 추가하기</Text>
        </TouchableOpacity>

        {/* 리워드 = 기능 언락. 포인트 지급 아님 */}
        <TouchableOpacity
          style={[styles.slotAddBtn, (playing || !adLoaded) && styles.slotAddBtnOff]}
          onPress={handleAddSlot}
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
  count: { fontSize: 14, color: TEXT_SUB, marginBottom: 12, fontWeight: '600' },

  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 10, overflow: 'hidden',
  },
  cardReview: { borderColor: '#BFDBFE', borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  pillEmoji: { fontSize: 26 },
  pillName: { fontSize: 16, fontWeight: '800', color: TEXT },
  pillSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 3 },
  chevron: { fontSize: 12, color: TEXT_MUTED },

  reviewBox: { backgroundColor: '#EFF6FF', padding: 14, gap: 10 },
  reviewText: { fontSize: 13, color: '#1E3A8A', lineHeight: 20 },
  scanBtn: { backgroundColor: '#1D4ED8', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  scanBtnOff: { opacity: 0.55 },
  scanBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  reviewBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },

  editBox: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14 },
  editLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8, marginTop: 12 },
  ingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingChip: { backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  ingText: { fontSize: 12.5, color: '#4B5563', fontWeight: '500' },
  noIng: { fontSize: 13, color: TEXT_MUTED },

  slotRow: { flexDirection: 'row', gap: 7 },
  slotChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  slotChipOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  slotEmoji: { fontSize: 16, marginBottom: 2 },
  slotLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  slotLabelOn: { color: PRIMARY_DARK, fontWeight: '800' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countInput: {
    width: 90, backgroundColor: '#F3F4F6', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: 15, color: TEXT_SUB, fontWeight: '600' },

  deleteBtn: { marginTop: 18, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, color: '#DC2626', fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_MUTED },

  addBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  addBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  slotAddBtn: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  slotAddBtnOff: { opacity: 0.5 },
  slotAddText: { fontSize: 14, fontWeight: '700', color: TEXT_SUB },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 20 },
});
