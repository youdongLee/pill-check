import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useState } from 'react';
import {
  Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { findIngredient } from '../data/ingredients';
import { SLOTS, slotOf, type Pill as PillType, type SlotKey } from '../data/types';
import { AD_IDS } from '../src/ads';
import { useRewardAd } from '../src/useRewardAd';
import { IngredientPicker } from '../src/IngredientPicker';
import { Action, Empty, Pill, Row, Section, Title } from '../src/ui';
import { BG, LINE, PAD, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB } from '../src/theme';

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

  const remove = (pill: PillType) =>
    Alert.alert(`"${pill.name}" 지울까요?`, '복용 기록에서도 빠져요.', [
      { text: '아니요', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deletePill(pill.id) },
    ]);

  const toggleSlot = async (pill: PillType, key: SlotKey) => {
    const next = pill.slots.includes(key) ? pill.slots.filter((x) => x !== key) : [...pill.slots, key];
    if (next.length === 0) {
      Alert.alert('시간대는 하나 이상 골라주세요');
      return;
    }
    await updatePill({ ...pill, slots: next });
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Title sub={`${pills.length} / ${maxPills}개 넣으셨어요`}>내 영양제</Title>

        {pills.length === 0 ? (
          <Empty
            emoji="💊"
            title="아직 없어요"
            action={{ label: '영양제 넣기', onPress: () => navigation.navigate('/add') }}
          />
        ) : (
          pills.map((pill, idx) => {
            const isOpen = open === pill.id;
            const summary = pill.ingredients
              .map((ing) => findIngredient(ing.key)?.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(' · ');
            return (
              <View key={pill.id}>
                <Row onPress={() => setOpen(isOpen ? null : pill.id)} last={isOpen || idx === pills.length - 1}>
                  <Text style={s.emoji}>{pill.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{pill.name}</Text>
                    <Text style={s.sub}>
                      {pill.slots.map((k) => slotOf(k).label).join(' · ')}
                      {pill.remaining !== undefined ? ` · ${pill.remaining}알` : ''}
                      {pill.needsReview ? ' · 성분 확인 필요' : summary ? ` · ${summary}` : ''}
                    </Text>
                  </View>
                  <Text style={s.arrow}>{isOpen ? '▲' : '▼'}</Text>
                </Row>

                {isOpen && (
                  <View style={s.body}>
                    <Section top={4}>들어있는 성분</Section>
                    <IngredientPicker
                      value={pill.ingredients}
                      onChange={(next) => updatePill({ ...pill, ingredients: next, needsReview: false })}
                    />

                    <Section>드시는 시간</Section>
                    <View style={s.slotRow}>
                      {SLOTS.map((sl) => (
                        <Pill
                          key={sl.key}
                          wide
                          label={`${sl.emoji} ${sl.label}`}
                          on={pill.slots.includes(sl.key)}
                          onPress={() => toggleSlot(pill, sl.key)}
                        />
                      ))}
                    </View>

                    <Section>남은 개수</Section>
                    <View style={s.countRow}>
                      <TextInput
                        style={s.countInput}
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
                      <Text style={s.countUnit}>알</Text>
                    </View>

                    <TouchableOpacity onPress={() => remove(pill)} activeOpacity={0.7}>
                      <Text style={s.delete}>이 영양제 지우기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        {pills.length > 0 && (
          <View style={s.actions}>
            <Action label="+ 영양제 넣기" onPress={() => navigation.navigate('/add')} />
            <View style={{ height: 10 }} />
            {/* 리워드 = 기능 언락. 포인트 지급이 아니다 */}
            <Action
              tone="quiet"
              label={playing ? '광고 재생 중...' : adLoaded ? '📺 광고 보고 자리 한 칸 늘리기' : '광고 준비 중...'}
              onPress={addSlot}
              disabled={playing || !adLoaded}
            />
          </View>
        )}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.manageBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 40 },

  emoji: { fontSize: 26 },
  name: { fontSize: 17, fontWeight: '800', color: TEXT },
  sub: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 4, lineHeight: 18 },
  arrow: { fontSize: 12, color: TEXT_MUTED },

  body: { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: LINE },
  slotRow: { flexDirection: 'row', gap: 8, paddingHorizontal: PAD },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: PAD },
  countInput: {
    width: 88, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: LINE,
    paddingVertical: 12, fontSize: T_SUB, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: T_SUB, color: TEXT_SUB, fontWeight: '700' },
  delete: { fontSize: T_SUB, color: '#B3372A', fontWeight: '700', paddingHorizontal: PAD, paddingTop: 26 },

  actions: { marginTop: 28 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 26 },
});
