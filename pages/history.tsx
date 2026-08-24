import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePills } from '../stores/PillContext';
import { DailyRecord, slotOf } from '../data/types';
import { formatKoreanDate, getDatesBack, todayStr } from '../data/utils';
import { AD_IDS } from '../src/ads';
import { Row, Section, Title } from '../src/ui';
import {
  BG, GOLD_DARK, LINE, PAD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, T_BODY, T_SMALL, T_SUB,
  TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/history', { component: HistoryPage });

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const RANGE = 30;

type Entry = { date: string; record: DailyRecord | null };

function HistoryPage() {
  const { getHistoryRecord } = usePills();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      getDatesBack(RANGE).map(async (date) => ({ date, record: await getHistoryRecord(date) })),
    );
    setEntries(results);
    setLoading(false);
  }, [getHistoryRecord]);

  useEffect(() => { load(); }, [load]);

  /** 최근 7일에 빠뜨린 것 — 복용률 숫자보다 "뭘 놓쳤는지"가 행동을 바꾼다 */
  const missed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries.slice(0, 7)) {
      for (const i of e.record?.intakes ?? []) {
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
      <SafeAreaView style={s.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Title sub={`지난 ${RANGE}일 중 ${perfect}일 다 드셨어요`}>복용 기록</Title>

        <View style={s.week}>
          {week.map((e) => {
            const intakes = e.record?.intakes ?? [];
            const done = intakes.length > 0 && intakes.every((i) => i.taken);
            const isToday = e.date === todayStr();
            const d = new Date(e.date.replace(/-/g, '/'));
            return (
              <View key={e.date} style={s.day}>
                <View style={[s.dot, done && s.dotDone, isToday && !done && s.dotToday]}>
                  <Text style={s.dotMark}>{done ? '💊' : ''}</Text>
                </View>
                <Text style={[s.dayLabel, isToday && s.dayToday]}>
                  {isToday ? '오늘' : DAY_NAMES[d.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        {missed.length > 0 ? (
          <View style={s.missed}>
            <Text style={s.missedTitle}>이번 주에 놓친 것</Text>
            {missed.map(([label, n]) => (
              <Text key={label} style={s.missedLine}>
                {label} <Text style={s.missedCount}>{n}번</Text>
              </Text>
            ))}
          </View>
        ) : withRecord.length > 0 ? (
          <Text style={s.good}>👍 이번 주는 하나도 안 빠뜨리셨어요</Text>
        ) : null}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.recordBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {withRecord.length > 0 && (
          <>
            <Section top={10}>지난 기록</Section>
            {withRecord.map((e, idx) => {
              const intakes = e.record!.intakes;
              const taken = intakes.filter((i) => i.taken).length;
              const all = taken === intakes.length;
              return (
                <Row key={e.date} last={idx === withRecord.length - 1}>
                  <Text style={s.rowDate}>{formatKoreanDate(e.date)}</Text>
                  <Text style={[s.rowStat, all && s.rowDone]}>
                    {all ? '다 드셨어요' : `${taken} / ${intakes.length}`}
                  </Text>
                </Row>
              );
            })}
          </>
        )}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.recordFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 40 },

  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD, marginBottom: 26 },
  day: { alignItems: 'center', flex: 1 },
  dot: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  dotDone: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  dotToday: { borderColor: PRIMARY, borderWidth: 2 },
  dotMark: { fontSize: 17 },
  dayLabel: { fontSize: T_SMALL, color: TEXT_MUTED, fontWeight: '600' },
  dayToday: { color: PRIMARY_DARK, fontWeight: '800' },

  missed: { paddingHorizontal: PAD },
  missedTitle: { fontSize: T_BODY, fontWeight: '800', color: GOLD_DARK, marginBottom: 10 },
  missedLine: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 28 },
  missedCount: { fontWeight: '800', color: GOLD_DARK },
  good: { fontSize: T_BODY, fontWeight: '700', color: PRIMARY_DARK, paddingHorizontal: PAD },

  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginVertical: 20 },

  rowDate: { flex: 1, fontSize: T_SUB, color: TEXT, fontWeight: '600' },
  rowStat: { fontSize: T_SUB, color: TEXT_MUTED, fontWeight: '700' },
  rowDone: { color: PRIMARY_DARK },
});
