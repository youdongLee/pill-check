import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { DailyRecord, slotOf } from '../data/types';
import { formatKoreanDate, getDatesBack, todayStr } from '../data/utils';
import { AD_IDS } from '../src/ads';
import {
  BG, BORDER, CARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/history', { component: HistoryPage });

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
/** 기록을 훑는 기간 */
const RANGE = 30;

type Entry = { date: string; record: DailyRecord | null };

function HistoryPage() {
  const { getHistoryRecord } = usePills();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const dates = getDatesBack(RANGE);
    const results = await Promise.all(
      dates.map(async (date) => ({ date, record: await getHistoryRecord(date) })),
    );
    setEntries(results);
    setLoading(false);
  }, [getHistoryRecord]);

  useEffect(() => { load(); }, [load]);

  /** 최근 7일에서 빠뜨린 것 — 숫자보다 "뭘 놓쳤는지"가 행동을 바꾼다 */
  const missed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries.slice(0, 7)) {
      if (!e.record) continue;
      for (const i of e.record.intakes) {
        if (i.taken) continue;
        const key = `${slotOf(i.slot).label} ${i.pillName}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [entries]);

  const week = useMemo(() => entries.slice(0, 7).reverse(), [entries]);
  const withRecord = entries.filter((e) => e.record && e.record.intakes.length > 0);
  const perfect = withRecord.filter((e) => e.record!.intakes.every((i) => i.taken)).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>복용 기록</Text>

        {/* 최근 7일 */}
        <View style={styles.weekRow}>
          {week.map((e) => {
            const intakes = e.record?.intakes ?? [];
            const done = intakes.length > 0 && intakes.every((i) => i.taken);
            const isToday = e.date === todayStr();
            const d = new Date(e.date.replace(/-/g, '/'));
            return (
              <View key={e.date} style={styles.dayCol}>
                <View style={[styles.dayDot, done && styles.dayDotDone, isToday && !done && styles.dayDotToday]}>
                  <Text style={styles.dayMark}>{done ? '💊' : ''}</Text>
                </View>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {isToday ? '오늘' : DAY_NAMES[d.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 빠뜨린 것 */}
        {missed.length > 0 ? (
          <View style={styles.missBox}>
            <Text style={styles.missTitle}>이번 주에 놓친 것</Text>
            {missed.map(([label, n]) => (
              <Text key={label} style={styles.missLine}>· {label} <Text style={styles.missCount}>{n}번</Text></Text>
            ))}
          </View>
        ) : withRecord.length > 0 ? (
          <View style={styles.goodBox}>
            <Text style={styles.goodText}>👍 이번 주는 하나도 안 빠뜨리셨어요</Text>
          </View>
        ) : null}

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.recordBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* 지난 30일 */}
        <Text style={styles.sectionTitle}>지난 {RANGE}일 · 다 드신 날 {perfect}일</Text>
        {withRecord.length === 0 ? (
          <Text style={styles.emptyText}>아직 기록이 없어요</Text>
        ) : (
          withRecord.map((e) => {
            const intakes = e.record!.intakes;
            const taken = intakes.filter((i) => i.taken).length;
            const all = taken === intakes.length;
            return (
              <View key={e.date} style={styles.row}>
                <Text style={styles.rowDate}>{formatKoreanDate(e.date)}</Text>
                <Text style={[styles.rowStat, all && styles.rowStatDone]}>
                  {all ? '✅ 다 드셨어요' : `${taken} / ${intakes.length}`}
                </Text>
              </View>
            );
          })
        )}

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.recordFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 18 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayCol: { alignItems: 'center', flex: 1 },
  dayDot: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: CARD,
    borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  dayDotDone: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  dayDotToday: { borderColor: PRIMARY, borderWidth: 2 },
  dayMark: { fontSize: 18 },
  dayLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  dayLabelToday: { color: PRIMARY_DARK, fontWeight: '800' },

  missBox: {
    backgroundColor: '#FFF8E8', borderRadius: 16, borderWidth: 1, borderColor: '#EBD9AE',
    padding: 18, marginBottom: 8,
  },
  missTitle: { fontSize: 17, fontWeight: '800', color: '#8A5D0F', marginBottom: 10 },
  missLine: { fontSize: 16, color: '#6B4A0C', lineHeight: 27 },
  missCount: { fontWeight: '800' },

  goodBox: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: 16, borderWidth: 1, borderColor: '#BFE3CC',
    padding: 18, marginBottom: 8,
  },
  goodText: { fontSize: 17, fontWeight: '700', color: '#14603A' },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginVertical: 14 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 7,
  },
  rowDate: { fontSize: 16, color: TEXT, fontWeight: '600' },
  rowStat: { fontSize: 15, color: TEXT_SUB, fontWeight: '700' },
  rowStatDone: { color: PRIMARY_DARK },

  emptyText: { fontSize: 16, color: TEXT_MUTED, textAlign: 'center', paddingVertical: 30 },
});
