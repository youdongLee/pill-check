import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { analyze, DISCLAIMER, type Finding } from '../src/analyze';
import { AD_IDS } from '../src/ads';
import {
  BG, BORDER, CARD, GOLD_DARK, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/check', { component: CheckPage });

const LEVEL_STYLE = {
  over: { bg: '#FDEEEB', border: '#E3A99E', title: '#9A3B2C', tag: '넘었어요' },
  duplicate: { bg: '#FFF8E8', border: '#E8C275', title: GOLD_DARK, tag: '겹쳐요' },
  conflict: { bg: '#FFF8E8', border: '#E8C275', title: GOLD_DARK, tag: '나눠 드세요' },
  synergy: { bg: PRIMARY_LIGHT, border: PRIMARY, title: '#14603A', tag: '잘 맞아요' },
} as const;

function CheckPage() {
  const navigation = Route.useNavigation();
  const { pills, loading } = usePills();

  const { findings, totals } = useMemo(() => analyze(pills), [pills]);
  const withIngredients = pills.filter((p) => p.ingredients.length > 0);
  const needsReview = pills.filter((p) => p.needsReview);
  const noData = pills.filter((p) => p.ingredients.length === 0);

  const actionable = findings.filter((f) => f.level !== 'synergy');
  const good = findings.filter((f) => f.level === 'synergy');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 영양제 점검</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? null : withIngredients.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔬</Text>
            <Text style={styles.emptyTitle}>점검할 영양제가 없어요</Text>
            <Text style={styles.emptyDesc}>
              제품을 골라서 등록하면{'\n'}겹치는 성분과 궁합을 봐드려요
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>영양제 추가하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {actionable.length === 0 ? '👍 손볼 게 없어요' : `점검할 게 ${actionable.length}가지 있어요`}
              </Text>
              <Text style={styles.summarySub}>
                등록하신 {withIngredients.length}개를 성분으로 합쳐서 봤어요
              </Text>
            </View>

            {/* 확인 필요 — 이름만 보고 추정한 항목 */}
            {needsReview.length > 0 && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>확인해 주세요</Text>
                <Text style={styles.reviewText}>
                  {needsReview.map((p) => p.name).join(' · ')}은(는) 이름만 보고 성분을 짐작했어요.
                  제품 뒷면과 다르면 고쳐주세요.
                </Text>
                <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.navigate('/manage')} activeOpacity={0.85}>
                  <Text style={styles.reviewBtnText}>확인하러 가기</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 점검 결과 */}
            {actionable.map((f, i) => <FindingCard key={`a${i}`} finding={f} />)}

            <View style={styles.ad}>
              <InlineAd adGroupId={AD_IDS.checkFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
            </View>

            {good.map((f, i) => <FindingCard key={`g${i}`} finding={f} />)}

            {/* 성분별 하루 섭취량 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>성분별 하루 섭취량</Text>
              <Text style={styles.cardSub}>드시는 시간대 수만큼 곱해서 계산했어요</Text>
              <View style={{ height: 6 }} />
              {totals.map((t) => {
                const pct = t.percent;
                const over = pct !== null && pct > 100;
                return (
                  <View key={t.key} style={styles.totalRow}>
                    <View style={styles.totalHead}>
                      <Text style={styles.totalName}>{t.name}</Text>
                      <Text style={[styles.totalAmount, over && styles.totalAmountOver]}>
                        {t.total}{t.unit}
                        {pct !== null ? ` · 상한의 ${pct}%` : ''}
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min(100, pct ?? 0)}%` },
                          over && styles.barFillOver,
                          pct === null && styles.barFillNone,
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* 성분 정보가 없는 항목 */}
            {noData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>성분을 모르는 영양제</Text>
                <Text style={styles.cardSub}>
                  {noData.map((p) => p.name).join(' · ')}은(는) 성분 정보가 없어 점검에서 빠졌어요.
                </Text>
              </View>
            )}

            <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const s = LEVEL_STYLE[finding.level];
  return (
    <View style={[styles.finding, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={styles.findingHead}>
        <Text style={[styles.findingTitle, { color: s.title }]}>{finding.title}</Text>
        <Text style={[styles.findingTag, { color: s.title }]}>{s.tag}</Text>
      </View>
      <Text style={styles.findingMsg}>{finding.message}</Text>
      <View style={styles.findingChips}>
        {finding.products.map((p) => (
          <View key={p} style={styles.findingChip}>
            <Text style={styles.findingChipText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  back: { fontSize: 16, color: PRIMARY_DARK, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  scroll: { padding: 16, paddingBottom: 40 },

  summary: { marginBottom: 16 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 4 },
  summarySub: { fontSize: 14, color: TEXT_SUB },

  reviewCard: {
    backgroundColor: '#EFF6FF', borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE',
    padding: 16, marginBottom: 12,
  },
  reviewTitle: { fontSize: 15, fontWeight: '800', color: '#1D4ED8', marginBottom: 6 },
  reviewText: { fontSize: 14, color: '#1E3A8A', lineHeight: 21 },
  reviewBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },

  finding: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  findingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  findingTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  findingTag: { fontSize: 12, fontWeight: '700', opacity: 0.8 },
  findingMsg: { fontSize: 14, color: '#3C4B41', lineHeight: 21 },
  findingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  findingChip: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  findingChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },

  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 4 },
  cardSub: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19 },

  totalRow: { marginTop: 12 },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  totalName: { fontSize: 14, fontWeight: '600', color: TEXT },
  totalAmount: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  totalAmountOver: { color: '#9A3B2C', fontWeight: '800' },
  barTrack: { height: 8, backgroundColor: '#EEF2EF', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  barFillOver: { backgroundColor: '#D97757' },
  barFillNone: { backgroundColor: '#D1D5DB', width: 6 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: TEXT_MUTED, textAlign: 'center', lineHeight: 23, marginBottom: 24 },
  emptyBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32 },
  emptyBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  disclaimer: {
    fontSize: 12, color: TEXT_MUTED, lineHeight: 19, marginTop: 8, paddingHorizontal: 4,
  },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginBottom: 12 },
});
