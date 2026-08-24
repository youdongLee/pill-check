import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import {
  Alert, Keyboard, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { PRODUCTS, type Product } from '../data/products';
import { findIngredient } from '../data/ingredients';
import { SLOTS, type SlotKey } from '../data/types';
import { recommendTiming } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import { IngredientPicker } from '../src/IngredientPicker';
import { Action, Pill, Section, Title } from '../src/ui';
import {
  BG, LINE, PAD, PRIMARY, PRIMARY_DARK, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/add', { component: AddPage });

/** 처음에 보여줄 제품 수 — 38개를 한꺼번에 펼치면 오히려 고르기 어렵다 */
const PREVIEW = 12;

function AddPage() {
  const navigation = Route.useNavigation();
  const { pills, maxPills, addPill } = usePills();

  const [product, setProduct] = useState<Product | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIngredients, setCustomIngredients] = useState<{ key: string; amount: number }[]>([]);
  const [slots, setSlots] = useState<SlotKey[]>(['morning']);
  const [count, setCount] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const advice = useMemo(
    () => (product ? recommendTiming(product.ingredients.map((i) => i.key)) : null),
    [product],
  );

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
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Title sub="고르면 성분이 자동으로 들어와요">어떤 영양제를 드세요?</Title>

        <View style={s.pills}>
          {(showAll ? PRODUCTS : PRODUCTS.slice(0, PREVIEW)).map((p) => (
            <Pill key={p.id} label={`${p.emoji} ${p.name}`} on={product?.id === p.id} onPress={() => pick(p)} />
          ))}
          {!showAll && <Pill label="더 보기 ▾" onPress={() => setShowAll(true)} />}
          <Pill
            label="✏️ 목록에 없어요"
            on={isCustom}
            onPress={() => {
              setProduct(null);
              setIsCustom(true);
              setSlots(['morning']);
              setCount('');
            }}
          />
        </View>

        {/* 고르기 전에는 아래를 띄우지 않는다 — 한 번에 하나씩 */}
        {chosen && (
          <>
            {isCustom ? (
              <>
                <Section>이름</Section>
                <View style={s.field}>
                  <TextInput
                    style={s.input}
                    placeholder="예) 아스타잔틴"
                    placeholderTextColor={TEXT_MUTED}
                    value={customName}
                    onChangeText={setCustomName}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    autoFocus
                  />
                </View>
                <Section>들어있는 성분</Section>
                <Text style={s.hint}>제품 뒷면을 보고 골라주세요. 몰라도 넣을 수 있어요.</Text>
                <IngredientPicker value={customIngredients} onChange={setCustomIngredients} />
              </>
            ) : (
              product && (
                <>
                  <Section>들어있는 성분</Section>
                  <Text style={s.ing}>
                    {product.ingredients
                      .map((ing) => {
                        const m = findIngredient(ing.key);
                        return m ? `${m.name} ${ing.amount}${m.unit}` : null;
                      })
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                </>
              )
            )}

            <Section>언제 드세요?</Section>
            {advice?.reason && <Text style={s.advice}>💡 {advice.reason}</Text>}
            <View style={s.slotRow}>
              {SLOTS.map((sl) => (
                <Pill
                  key={sl.key}
                  wide
                  label={`${sl.emoji} ${sl.label}`}
                  on={slots.includes(sl.key)}
                  onPress={() =>
                    setSlots((prev) => (prev.includes(sl.key) ? prev.filter((x) => x !== sl.key) : [...prev, sl.key]))
                  }
                />
              ))}
            </View>

            <Section>몇 알 들어있나요?</Section>
            <View style={s.countRow}>
              <TextInput
                style={s.countInput}
                placeholder="60"
                placeholderTextColor={TEXT_MUTED}
                value={count}
                onChangeText={setCount}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                maxLength={4}
              />
              <Text style={s.countUnit}>알</Text>
              <Text style={s.countHint}>안 넣어도 돼요. 넣으면 떨어지기 전에 알려드려요</Text>
            </View>

            <View style={s.save}>
              <Action label={saving ? '넣는 중...' : '넣기'} onPress={save} disabled={!valid || saving} />
            </View>
          </>
        )}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.addFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 36 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: PAD },

  field: { paddingHorizontal: PAD },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: LINE,
    paddingHorizontal: 16, paddingVertical: 15, fontSize: 17, color: TEXT,
  },
  hint: { fontSize: T_SMALL, color: TEXT_MUTED, paddingHorizontal: PAD, marginTop: -4, marginBottom: 12, lineHeight: 19 },

  ing: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 26, paddingHorizontal: PAD },
  advice: { fontSize: T_SUB, color: PRIMARY_DARK, lineHeight: 22, paddingHorizontal: PAD, marginTop: -4, marginBottom: 12, fontWeight: '600' },

  slotRow: { flexDirection: 'row', gap: 8, paddingHorizontal: PAD },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: PAD },
  countInput: {
    width: 88, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: LINE,
    paddingVertical: 14, fontSize: 18, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  countUnit: { fontSize: T_SUB, color: TEXT_SUB, fontWeight: '700' },
  countHint: { flex: 1, fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 18 },

  save: { marginTop: 34 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 30 },
});
