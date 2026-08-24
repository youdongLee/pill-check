import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import {
  Alert, Keyboard, SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { PRODUCTS, type Product } from '../data/products';
import { findIngredient } from '../data/ingredients';
import { SLOTS, type SlotKey } from '../data/types';
import { recommendTiming, TIMING_LABEL } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import {
  BG, BORDER, CARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/add', { component: AddPage });

/** 성분 조합에 맞는 기본 시간대를 고른다 */
function defaultSlotsFor(product: Product): SlotKey[] {
  const { timing } = recommendTiming(product.ingredients.map((i) => i.key));
  if (timing === 'bedtime') return ['bedtime'];
  if (timing === 'empty') return ['morning'];
  return ['morning'];
}

function AddPage() {
  const navigation = Route.useNavigation();
  const { pills, maxPills, addPill } = usePills();

  const [product, setProduct] = useState<Product | null>(null);
  const [customName, setCustomName] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [slots, setSlots] = useState<SlotKey[]>(['morning']);
  const [count, setCount] = useState('');
  const [saving, setSaving] = useState(false);

  const atLimit = pills.length >= maxPills;

  const advice = useMemo(() => {
    if (!product) return null;
    return recommendTiming(product.ingredients.map((i) => i.key));
  }, [product]);

  const pickProduct = (p: Product) => {
    setProduct(p);
    setIsCustom(false);
    setCustomName('');
    setSlots(defaultSlotsFor(p));
    setCount(String(p.defaultCount));
    Keyboard.dismiss();
  };

  const pickCustom = () => {
    setProduct(null);
    setIsCustom(true);
    setSlots(['morning']);
    setCount('');
  };

  const toggleSlot = (key: SlotKey) => {
    setSlots((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const finalName = isCustom ? customName.trim() : product?.name ?? '';
  const isValid = finalName.length > 0 && slots.length > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    if (atLimit) {
      Alert.alert('자리가 꽉 찼어요', `지금은 ${maxPills}개까지 넣을 수 있어요.\n내 영양제 화면에서 광고를 보면 한 자리 늘릴 수 있어요.`, [
        { text: '알겠어요', style: 'cancel' },
        { text: '자리 늘리러 가기', onPress: () => navigation.navigate('/manage') },
      ]);
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    const parsedCount = Number(count.replace(/[^0-9]/g, ''));
    await addPill({
      name: finalName,
      emoji: product?.emoji ?? '💊',
      color: product?.color ?? PRIMARY,
      productId: product?.id,
      ingredients: product?.ingredients ?? [],
      slots,
      remaining: Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : undefined,
    });
    setSaving(false);
    navigation.navigate('/');
  };

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>제품을 고르면 성분이 자동으로 들어와요</Text>

        {/* 제품 고르기 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>많이 찾는 제품</Text>
          <View style={styles.chipWrap}>
            {PRODUCTS.map((p) => {
              const on = product?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => pickProduct(p)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipEmoji}>{p.emoji}</Text>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.chip, isCustom && styles.chipOn]} onPress={pickCustom} activeOpacity={0.8}>
              <Text style={styles.chipEmoji}>✏️</Text>
              <Text style={[styles.chipText, isCustom && styles.chipTextOn]}>목록에 없어요</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 직접 입력 */}
        {isCustom && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>영양제 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 프로폴리스"
              placeholderTextColor={TEXT_MUTED}
              value={customName}
              onChangeText={setCustomName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoFocus
            />
            <Text style={styles.hint}>
              성분을 모르면 비워두셔도 돼요. 대신 겹치는 성분 점검은 못 해드려요.
            </Text>
          </View>
        )}

        {/* 성분 미리보기 */}
        {product && (
          <View style={[styles.card, styles.cardHero]}>
            <View style={styles.rowBetween}>
              <Text style={styles.productName}>{product.emoji} {product.name}</Text>
            </View>
            <Text style={styles.cardLabel}>한 번에 드시는 양에 들어있는 성분</Text>
            <View style={styles.ingWrap}>
              {product.ingredients.map((ing) => {
                const meta = findIngredient(ing.key);
                if (!meta) return null;
                return (
                  <View key={ing.key} style={styles.ingChip}>
                    <Text style={styles.ingText}>{meta.name} {ing.amount}{meta.unit}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 남은 개수 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>몇 알 들어있나요? <Text style={styles.optional}>(선택)</Text></Text>
          <View style={styles.countRow}>
            <TextInput
              style={styles.countInput}
              placeholder="60"
              placeholderTextColor={TEXT_MUTED}
              value={count}
              onChangeText={setCount}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              maxLength={4}
            />
            <Text style={styles.countUnit}>알</Text>
          </View>
          <Text style={styles.hint}>넣어두시면 다 떨어지기 전에 알려드려요</Text>
        </View>

        {/* 시간대 */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>언제 드실래요?</Text>
          {advice?.reason && (
            <View style={styles.adviceBox}>
              <Text style={styles.adviceText}>
                💡 {advice.reason}
              </Text>
              <Text style={styles.adviceSub}>추천: {TIMING_LABEL[advice.timing]}</Text>
            </View>
          )}
          <View style={styles.slotRow}>
            {SLOTS.map((s) => {
              const on = slots.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.slotChip, on && styles.slotChipOn]}
                  onPress={() => toggleSlot(s.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.slotEmoji}>{s.emoji}</Text>
                  <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !isValid && styles.saveBtnOff]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? '넣는 중...' : '추가하기'}</Text>
        </TouchableOpacity>

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.addFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 15, color: TEXT_SUB, marginBottom: 14 },

  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12,
  },
  cardHero: { borderColor: PRIMARY, borderWidth: 1.5 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 10 },
  optional: { fontWeight: '400', color: TEXT_MUTED, fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 18, fontWeight: '800', color: TEXT },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipEmoji: { fontSize: 15 },
  chipText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  chipTextOn: { color: PRIMARY_DARK },

  input: {
    backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: TEXT,
  },
  hint: { fontSize: 13, color: TEXT_MUTED, marginTop: 8, lineHeight: 19 },

  ingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingChip: { backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  ingText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countInput: {
    width: 100, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 18, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: 16, color: TEXT_SUB, fontWeight: '600' },

  adviceBox: { backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 12, marginBottom: 12 },
  adviceText: { fontSize: 14, color: '#14603A', fontWeight: '600', lineHeight: 20 },
  adviceSub: { fontSize: 13, color: PRIMARY_DARK, marginTop: 4, fontWeight: '700' },

  slotRow: { flexDirection: 'row', gap: 8 },
  slotChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  slotChipOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  slotEmoji: { fontSize: 18, marginBottom: 3 },
  slotLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  slotLabelOn: { color: PRIMARY_DARK, fontWeight: '800' },

  saveBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  saveBtnOff: { backgroundColor: '#D1D5DB' },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 20 },
});
