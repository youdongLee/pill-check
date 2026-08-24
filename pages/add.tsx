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
import { recommendTiming } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import { IngredientPicker } from '../src/IngredientPicker';
import {
  BG, BORDER, CARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/add', { component: AddPage });

/** 처음에 보여줄 제품 수 — 38개를 한꺼번에 펼치면 오히려 고르기 어렵다 */
const PREVIEW_COUNT = 12;

function AddPage() {
  const navigation = Route.useNavigation();
  const { pills, maxPills, addPill } = usePills();

  const [product, setProduct] = useState<Product | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIngredients, setCustomIngredients] = useState<{ key: string; amount: number }[]>([]);
  const [slots, setSlots] = useState<SlotKey[]>(['morning']);
  const [count, setCount] = useState('');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const advice = useMemo(
    () => (product ? recommendTiming(product.ingredients.map((i) => i.key)) : null),
    [product],
  );

  const visibleProducts = showAllProducts ? PRODUCTS : PRODUCTS.slice(0, PREVIEW_COUNT);

  const pick = (p: Product) => {
    Keyboard.dismiss();
    setProduct(p);
    setIsCustom(false);
    setCustomName('');
    setCustomIngredients([]);
    setCount(String(p.defaultCount));
    const { timing } = recommendTiming(p.ingredients.map((i) => i.key));
    setSlots(timing === 'bedtime' ? ['bedtime'] : ['morning']);
  };

  const pickCustom = () => {
    setProduct(null);
    setIsCustom(true);
    setSlots(['morning']);
    setCount('');
  };

  const name = isCustom ? customName.trim() : product?.name ?? '';
  const chosen = Boolean(product) || isCustom;
  const valid = name.length > 0 && slots.length > 0;

  const save = async () => {
    if (!valid || saving) return;
    if (pills.length >= maxPills) {
      Alert.alert('자리가 꽉 찼어요', `지금은 ${maxPills}개까지 넣을 수 있어요.`, [
        { text: '알겠어요', style: 'cancel' },
        { text: '자리 늘리기', onPress: () => navigation.navigate('/manage') },
      ]);
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    const n = Number(count.replace(/[^0-9]/g, ''));
    await addPill({
      name,
      emoji: product?.emoji ?? '💊',
      color: product?.color ?? PRIMARY,
      productId: product?.id,
      ingredients: product?.ingredients ?? customIngredients.filter((i) => i.amount > 0),
      slots,
      remaining: Number.isFinite(n) && n > 0 ? n : undefined,
    });
    setSaving(false);
    navigation.navigate('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>어떤 영양제를 드세요?</Text>
        <Text style={styles.lead}>고르면 성분이 자동으로 들어와요</Text>

        <View style={styles.chipWrap}>
          {visibleProducts.map((p) => {
            const on = product?.id === p.id;
            return (
              <TouchableOpacity key={p.id} style={[styles.chip, on && styles.chipOn]} onPress={() => pick(p)} activeOpacity={0.8}>
                <Text style={styles.chipEmoji}>{p.emoji}</Text>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
          {!showAllProducts && (
            <TouchableOpacity style={styles.chip} onPress={() => setShowAllProducts(true)} activeOpacity={0.8}>
              <Text style={styles.chipText}>더 보기 ▾</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.chip, isCustom && styles.chipOn]} onPress={pickCustom} activeOpacity={0.8}>
            <Text style={styles.chipEmoji}>✏️</Text>
            <Text style={[styles.chipText, isCustom && styles.chipTextOn]}>목록에 없어요</Text>
          </TouchableOpacity>
        </View>

        {/* 고르기 전엔 아래를 띄우지 않는다 — 한 번에 하나씩 */}
        {chosen && (
          <>
            {isCustom ? (
              <View style={styles.block}>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예) 아스타잔틴"
                  placeholderTextColor={TEXT_MUTED}
                  value={customName}
                  onChangeText={setCustomName}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  autoFocus
                />
                <View style={{ height: 20 }} />
                <Text style={styles.label}>들어있는 성분 <Text style={styles.optional}>(몰라도 괜찮아요)</Text></Text>
                <IngredientPicker value={customIngredients} onChange={setCustomIngredients} />
              </View>
            ) : (
              product && (
                <View style={styles.block}>
                  <Text style={styles.label}>들어있는 성분</Text>
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
              )
            )}

            <View style={styles.block}>
              <Text style={styles.label}>언제 드세요?</Text>
              {advice?.reason && <Text style={styles.advice}>💡 {advice.reason}</Text>}
              <View style={styles.slotRow}>
                {SLOTS.map((s) => {
                  const on = slots.includes(s.key);
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.slot, on && styles.slotOn]}
                      onPress={() =>
                        setSlots((prev) => (prev.includes(s.key) ? prev.filter((x) => x !== s.key) : [...prev, s.key]))
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.slotEmoji}>{s.emoji}</Text>
                      <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>몇 알 들어있나요? <Text style={styles.optional}>(선택)</Text></Text>
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
                <Text style={styles.countHint}>다 떨어지기 전에 알려드려요</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, !valid && styles.saveOff]} onPress={save} disabled={!valid || saving} activeOpacity={0.85}>
              <Text style={styles.saveText}>{saving ? '넣는 중...' : '넣기'}</Text>
            </TouchableOpacity>
          </>
        )}

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

  title: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 5 },
  lead: { fontSize: 15, color: TEXT_SUB, marginBottom: 18 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 24,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
  },
  chipOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 15, fontWeight: '700', color: TEXT_SUB },
  chipTextOn: { color: PRIMARY_DARK, fontWeight: '800' },

  block: { marginTop: 22 },
  label: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 12 },
  optional: { fontSize: 14, fontWeight: '500', color: TEXT_MUTED },

  input: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, color: TEXT,
  },

  ingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  ingChip: {
    backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: BORDER,
  },
  ingText: { fontSize: 14, color: TEXT_SUB, fontWeight: '600' },

  advice: { fontSize: 15, color: PRIMARY_DARK, lineHeight: 22, marginBottom: 12, fontWeight: '600' },
  slotRow: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
  },
  slotOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  slotEmoji: { fontSize: 20, marginBottom: 4 },
  slotLabel: { fontSize: 14, fontWeight: '700', color: TEXT_SUB },
  slotLabelOn: { color: PRIMARY_DARK, fontWeight: '800' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countInput: {
    width: 92, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 15, fontSize: 19, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: 17, color: TEXT_SUB, fontWeight: '700' },
  countHint: { flex: 1, fontSize: 13, color: TEXT_MUTED },

  saveBtn: { marginTop: 26, backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 19, alignItems: 'center' },
  saveOff: { backgroundColor: '#C6CFC9' },
  saveText: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 28 },
});
