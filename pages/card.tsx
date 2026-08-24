import { createRoute } from '@granite-js/react-native';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { findIngredient } from '../data/ingredients';
import { SLOTS, slotOf } from '../data/types';
import { analyze } from '../src/analyze';
import { Empty } from '../src/ui';
import {
  BG, LINE, PAD, PRIMARY_DARK, T_BODY, T_SMALL, T_SUB, T_TITLE, TEXT, TEXT_MUTED, TEXT_SUB, WARN,
} from '../src/theme';

export const Route = createRoute('/card', { component: CardPage });

/**
 * 병원·약국에서 보여주는 화면.
 *
 * "뭐 드세요?" 라는 질문에 대답하려고 만든 화면이라, 화면을 그대로 보여주거나
 * 캡처해서 건네는 것이 목적이다. 그래서 여기에는 광고도, 누를 것도 두지 않는다.
 */
function CardPage() {
  const navigation = Route.useNavigation();
  const { pills, loading } = usePills();

  /** 상한을 넘긴 성분은 의료진이 가장 먼저 알아야 할 정보다 */
  const over = useMemo(
    () => analyze(pills).totals.filter((t) => t.percent !== null && t.percent > 100),
    [pills],
  );

  if (loading) return <SafeAreaView style={s.container} />;

  if (pills.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <Empty
          emoji="📋"
          title="보여드릴 목록이 없어요"
          desc="영양제를 넣으면 병원·약국에서 보여줄 수 있게 한 장으로 정리해드려요"
          action={{ label: '영양제 넣기', onPress: () => navigation.navigate('/add') }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>지금 드시는 영양제</Text>
        <Text style={s.sub}>모두 {pills.length}가지 · 화면을 그대로 보여주시면 돼요</Text>

        {/* 시간대별로 묶어서 — 의료진이 보는 순서와 같다 */}
        {SLOTS.map((slot) => {
          const inSlot = pills.filter((p) => p.slots.includes(slot.key));
          if (inSlot.length === 0) return null;
          return (
            <View key={slot.key} style={s.slot}>
              <Text style={s.slotName}>{slot.emoji} {slot.label}</Text>
              {inSlot.map((p) => (
                <View key={p.id} style={s.pill}>
                  <Text style={s.pillName}>{p.name}</Text>
                  {p.ingredients.length > 0 && (
                    <Text style={s.pillIng}>
                      {p.ingredients
                        .map((ing) => {
                          const m = findIngredient(ing.key);
                          return m ? `${m.name} ${ing.amount}${m.unit}` : null;
                        })
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        {over.length > 0 && (
          <View style={s.warn}>
            <Text style={s.warnTitle}>상한섭취량을 넘는 성분</Text>
            {over.map((t) => (
              <Text key={t.key} style={s.warnLine}>
                {t.name} 하루 {t.total}{t.unit} (상한 {t.upperLimit}{t.unit})
              </Text>
            ))}
          </View>
        )}

        <Text style={s.note}>
          영양제만 적혀 있어요. 드시는 약은 따로 말씀해 주세요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, // 보여주는 화면이라 흰 바탕이 읽기 좋다
  scroll: { paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 40 },

  title: { fontSize: T_TITLE, fontWeight: '800', color: TEXT },
  sub: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 6, marginBottom: 26 },

  slot: { marginBottom: 22 },
  slotName: {
    fontSize: T_SUB, fontWeight: '800', color: PRIMARY_DARK,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: LINE, marginBottom: 10,
  },
  pill: { marginBottom: 12 },
  pillName: { fontSize: T_BODY, fontWeight: '700', color: TEXT },
  pillIng: { fontSize: T_SMALL, color: TEXT_SUB, lineHeight: 20, marginTop: 3 },

  warn: { marginTop: 6, paddingTop: 16, borderTopWidth: 1, borderTopColor: LINE },
  warnTitle: { fontSize: T_SUB, fontWeight: '800', color: WARN, marginBottom: 8 },
  warnLine: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 24 },

  note: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 26, lineHeight: 20 },
});
