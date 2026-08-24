import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { CONCERNS, CONCERN_DISCLAIMER, FUNCTION_CLAIMS, type Concern } from '../data/concerns';
import { findIngredient } from '../data/ingredients';
import { PRODUCTS } from '../data/products';
import { AD_IDS } from '../src/ads';
import { Pill, Title } from '../src/ui';
import {
  BG, LINE, PAD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, T_BODY, T_SMALL, T_SUB,
  TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/find', { component: FindPage });

function FindPage() {
  const navigation = Route.useNavigation();
  const { pills } = usePills();
  const [picked, setPicked] = useState<Concern | null>(null);

  /** 이미 먹고 있는 성분인지 — "이미 드시고 계세요"를 알려주는 게 추천보다 중요할 때가 많다 */
  const owned = useMemo(() => {
    const keys = new Set<string>();
    pills.forEach((p) => p.ingredients.forEach((i) => keys.add(i.key)));
    return keys;
  }, [pills]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Title sub="고민을 고르면 어떤 성분이 도움이 되는지 알려드려요">어떤 게 고민이세요?</Title>

        <View style={s.pills}>
          {CONCERNS.map((c) => (
            <Pill
              key={c.key}
              label={`${c.emoji} ${c.label}`}
              on={picked?.key === c.key}
              onPress={() => setPicked(picked?.key === c.key ? null : c)}
            />
          ))}
        </View>

        {picked && (
          <>
            <Text style={s.resultHead}>{picked.emoji} {picked.label}</Text>

            {picked.ingredients.map((key) => {
              const meta = findIngredient(key);
              if (!meta) return null;
              const claim = FUNCTION_CLAIMS[key];
              const have = owned.has(key);
              // 이 성분이 든 제품 프리셋 — 바로 넣을 수 있게 이어준다
              const product = PRODUCTS.find((p) => p.ingredients.some((i) => i.key === key));
              return (
                <View key={key} style={s.item}>
                  <View style={s.itemHead}>
                    <Text style={s.itemName}>{meta.name}</Text>
                    {have && <Text style={s.owned}>이미 드시는 중</Text>}
                  </View>
                  {claim && <Text style={s.claim}>{claim}</Text>}
                  {!have && product && (
                    <TouchableOpacity onPress={() => navigation.navigate('/add')} activeOpacity={0.7}>
                      <Text style={s.addLink}>{product.emoji} {product.name} 넣기 ›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <Text style={s.disclaimer}>{CONCERN_DISCLAIMER}</Text>
          </>
        )}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.findFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 40 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: PAD },

  resultHead: {
    fontSize: T_BODY, fontWeight: '800', color: PRIMARY_DARK,
    paddingHorizontal: PAD, marginTop: 30, marginBottom: 6,
  },
  item: { paddingHorizontal: PAD, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemName: { fontSize: T_BODY, fontWeight: '800', color: TEXT },
  owned: {
    fontSize: T_SMALL, fontWeight: '700', color: PRIMARY_DARK,
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
  },
  claim: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 24 },
  addLink: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY_DARK, marginTop: 10 },

  disclaimer: { fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 20, paddingHorizontal: PAD, marginTop: 20 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginTop: 26 },
});
