import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { analyze, DISCLAIMER, type Finding } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import { Empty, Section, Title } from '../src/ui';
import {
  BG, GOLD_DARK, LINE, PAD, PRIMARY, PRIMARY_DARK, T_BODY, T_SMALL, T_SUB,
  TEXT, TEXT_MUTED, TEXT_SUB, WARN,
} from '../src/theme';

export const Route = createRoute('/check', { component: CheckPage });

/** 발견 항목의 색 — 박스 대신 왼쪽 선 하나로 구분한다 */
const TONE = {
  over: WARN,
  duplicate: GOLD_DARK,
  conflict: GOLD_DARK,
  synergy: PRIMARY_DARK,
} as const;

/** 성분별 섭취량을 처음에 몇 개까지 — 45종을 다 펼치면 읽히지 않는다 */
const PREVIEW = 5;

function CheckPage() {
  const navigation = Route.useNavigation();
  const { pills, loading } = usePills();
  const [showAll, setShowAll] = useState(false);

  const { findings, totals } = useMemo(() => analyze(pills), [pills]);
  const withIng = pills.filter((p) => p.ingredients.length > 0);
  const needsFix = pills.filter((p) => p.needsReview || p.ingredients.length === 0);
  const actionable = findings.filter((f) => f.level !== 'synergy');
  const good = findings.filter((f) => f.level === 'synergy');

  if (loading) return <SafeAreaView style={s.container} />;

  if (withIng.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <Empty
          emoji="🔬"
          title="점검할 영양제가 없어요"
          desc="제품을 골라 넣으면 겹치는 성분을 찾아드려요"
          action={{ label: '영양제 넣기', onPress: () => navigation.navigate('/add') }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Title sub={`영양제 ${withIng.length}개를 성분으로 합쳐서 봤어요`}>
          {actionable.length === 0 ? '겹치는 게 없어요' : `점검할 게 ${actionable.length}가지`}
        </Title>

        {actionable.map((f, i) => <Item key={`a${i}`} finding={f} />)}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.checkFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {good.map((f, i) => <Item key={`g${i}`} finding={f} />)}

        <Section>성분별 하루 섭취량</Section>
        <View style={s.totals}>
          {(showAll ? totals : totals.slice(0, PREVIEW)).map((t) => {
            const over = t.percent !== null && t.percent > 100;
            return (
              <View key={t.key} style={s.total}>
                <View style={s.totalHead}>
                  <Text style={s.totalName}>{t.name}</Text>
                  <Text style={[s.totalAmt, over && s.totalOver]}>
                    {t.total}{t.unit}{t.percent !== null ? ` · ${t.percent}%` : ''}
                  </Text>
                </View>
                <View style={s.bar}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${Math.min(100, t.percent ?? 0)}%` },
                      over && s.barOver,
                      t.percent === null && s.barNone,
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
        {totals.length > PREVIEW && (
          <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7}>
            <Text style={s.more}>{showAll ? '접기 ▲' : `나머지 ${totals.length - PREVIEW}가지 ▼`}</Text>
          </TouchableOpacity>
        )}

        {needsFix.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('/manage')} activeOpacity={0.7}>
            <Text style={s.fix}>
              {needsFix.map((p) => p.name).join(' · ')}은(는) 성분을 확인해 주세요 ›
            </Text>
          </TouchableOpacity>
        )}

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 박스로 감싸지 않고 왼쪽 선 + 글자로만 구분한다 */
function Item({ finding }: { finding: Finding }) {
  const color = TONE[finding.level];
  return (
    <View style={[s.item, { borderLeftColor: color }]}>
      <Text style={[s.itemTitle, { color }]}>{finding.title}</Text>
      <Text style={s.itemMsg}>{finding.message}</Text>
      <Text style={s.itemWho}>{finding.products.join(' · ')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 40 },

  item: { borderLeftWidth: 3, paddingLeft: PAD - 3, paddingRight: PAD, paddingVertical: 16 },
  itemTitle: { fontSize: T_BODY, fontWeight: '800', marginBottom: 6 },
  itemMsg: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 24 },
  itemWho: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 8, fontWeight: '600' },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginVertical: 14 },

  totals: { paddingHorizontal: PAD },
  total: { marginBottom: 15 },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  totalName: { fontSize: T_SUB, fontWeight: '700', color: TEXT },
  totalAmt: { fontSize: T_SMALL, color: TEXT_SUB, fontWeight: '700' },
  totalOver: { color: WARN, fontWeight: '800' },
  bar: { height: 8, backgroundColor: '#E5EBE7', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  barOver: { backgroundColor: WARN },
  barNone: { backgroundColor: '#CBD5CE', width: 6 },

  more: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY_DARK, textAlign: 'center', paddingVertical: 16 },
  fix: {
    fontSize: T_SUB, color: TEXT_SUB, fontWeight: '600', lineHeight: 23,
    paddingHorizontal: PAD, paddingVertical: 16, borderTopWidth: 1, borderTopColor: LINE, marginTop: 10,
  },
  disclaimer: { fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 20, paddingHorizontal: PAD, marginTop: 22 },
});
