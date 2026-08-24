import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { analyze, DISCLAIMER, type Finding } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import {
  BG, BORDER, CARD, GOLD_DARK, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/check', { component: CheckPage });

const LEVEL = {
  over: { bg: '#FDEEEB', border: '#E3A99E', title: '#9A3B2C' },
  duplicate: { bg: '#FFF8E8', border: '#EBD9AE', title: GOLD_DARK },
  conflict: { bg: '#FFF8E8', border: '#EBD9AE', title: GOLD_DARK },
  synergy: { bg: PRIMARY_LIGHT, border: '#BFE3CC', title: '#14603A' },
} as const;

/** 성분별 섭취량을 처음에 몇 개까지 보여줄지 — 45종을 다 펼치면 읽히지 않는다 */
const TOTALS_PREVIEW = 5;

function CheckPage() {
  const navigation = Route.useNavigation();
  const { pills, loading } = usePills();
  const [showAll, setShowAll] = useState(false);

  const { findings, totals } = useMemo(() => analyze(pills), [pills]);
  const withIng = pills.filter((p) => p.ingredients.length > 0);
  const needsFix = pills.filter((p) => p.needsReview || p.ingredients.length === 0);

  const actionable = findings.filter((f) => f.level !== 'synergy');
  const good = findings.filter((f) => f.level === 'synergy');
  const shownTotals = showAll ? totals : totals.slice(0, TOTALS_PREVIEW);

  if (loading) return <SafeAreaView style={styles.container} />;

  if (withIng.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔬</Text>
          <Text style={styles.emptyTitle}>점검할 영양제가 없어요</Text>
          <Text style={styles.emptyDesc}>제품을 골라 넣으면{'\n'}겹치는 성분을 찾아드려요</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>영양제 넣기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 결론 한 줄 */}
        <Text style={styles.verdict}>
          {actionable.length === 0 ? '👍 겹치거나 넘치는 게 없어요' : `점검할 게 ${actionable.length}가지 있어요`}
        </Text>
        <Text style={styles.verdictSub}>영양제 {withIng.length}개를 성분으로 합쳐서 봤어요</Text>

        {actionable.map((f, i) => <Card key={`a${i}`} finding={f} />)}

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.checkFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {good.map((f, i) => <Card key={`g${i}`} finding={f} />)}

        {/* 성분별 섭취량 */}
        <Text style={styles.sectionTitle}>성분별 하루 섭취량</Text>
        {shownTotals.map((t) => {
          const over = t.percent !== null && t.percent > 100;
          return (
            <View key={t.key} style={styles.totalRow}>
              <View style={styles.totalHead}>
                <Text style={styles.totalName}>{t.name}</Text>
                <Text style={[styles.totalAmount, over && styles.totalOver]}>
                  {t.total}{t.unit}{t.percent !== null ? ` · ${t.percent}%` : ''}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(100, t.percent ?? 0)}%` },
                    over && styles.barOver,
                    t.percent === null && styles.barNone,
                  ]}
                />
              </View>
            </View>
          );
        })}
        {totals.length > TOTALS_PREVIEW && (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowAll(!showAll)} activeOpacity={0.7}>
            <Text style={styles.moreText}>
              {showAll ? '접기 ▲' : `나머지 ${totals.length - TOTALS_PREVIEW}가지 보기 ▼`}
            </Text>
          </TouchableOpacity>
        )}

        {/* 성분을 확인해야 하는 것 — 한 줄로 합친다 */}
        {needsFix.length > 0 && (
          <TouchableOpacity style={styles.fixRow} onPress={() => navigation.navigate('/manage')} activeOpacity={0.85}>
            <Text style={styles.fixText}>
              {needsFix.map((p) => p.name).join(' · ')}은(는) 성분을 확인해 주세요
            </Text>
            <Text style={styles.fixMore}>고치기 ›</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ finding }: { finding: Finding }) {
  const s = LEVEL[finding.level];
  return (
    <View style={[styles.card, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.cardTitle, { color: s.title }]}>{finding.title}</Text>
      <Text style={styles.cardMsg}>{finding.message}</Text>
      <Text style={styles.cardWho}>{finding.products.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },

  verdict: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 5 },
  verdictSub: { fontSize: 15, color: TEXT_SUB, marginBottom: 18 },

  card: { borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 7 },
  cardMsg: { fontSize: 16, color: '#3C4B41', lineHeight: 24 },
  cardWho: { fontSize: 14, color: TEXT_MUTED, marginTop: 9, fontWeight: '600' },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginVertical: 6 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginTop: 20, marginBottom: 14 },
  totalRow: { marginBottom: 14 },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  totalName: { fontSize: 16, fontWeight: '700', color: TEXT },
  totalAmount: { fontSize: 15, color: TEXT_SUB, fontWeight: '700' },
  totalOver: { color: '#9A3B2C', fontWeight: '800' },
  barTrack: { height: 9, backgroundColor: '#E7ECE8', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 9, backgroundColor: PRIMARY, borderRadius: 5 },
  barOver: { backgroundColor: '#D97757' },
  barNone: { backgroundColor: '#CFD8D2', width: 7 },

  moreBtn: { paddingVertical: 14, alignItems: 'center' },
  moreText: { fontSize: 16, fontWeight: '700', color: PRIMARY_DARK },

  fixRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginTop: 10,
  },
  fixText: { flex: 1, fontSize: 15, color: TEXT_SUB, lineHeight: 22, fontWeight: '600' },
  fixMore: { fontSize: 15, fontWeight: '700', color: PRIMARY_DARK },

  disclaimer: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20, marginTop: 20, paddingHorizontal: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 54, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 10 },
  emptyDesc: { fontSize: 16, color: TEXT_MUTED, textAlign: 'center', lineHeight: 25, marginBottom: 26 },
  emptyBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 40 },
  emptyBtnText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
});
