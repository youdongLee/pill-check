import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { DailyRecord } from '../data/types';
import { formatKoreanDate, getDatesBack, todayStr } from '../data/utils';

export const Route = createRoute('/history', { component: HistoryPage });

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';
const PRIMARY_LIGHT = '#DCFCE7';

type HistoryEntry = {
  date: string;
  record: DailyRecord | null;
};

function HistoryPage() {
  const navigation = Route.useNavigation();
  const { getHistoryRecord } = usePills();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(todayStr());

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const dates = getDatesBack(30);
    const results = await Promise.all(
      dates.map(async (date) => {
        const record = await getHistoryRecord(date);
        return { date, record };
      })
    );
    // Only show dates with records (or today)
    setEntries(results.filter((e) => e.record !== null || e.date === todayStr()));
    setLoading(false);
  }, [getHistoryRecord]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleExpand = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  return (
    <SafeAreaView style={styles.container}>
      <SimpleHeader title="복약 기록" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>아직 복약 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>약을 등록하고 복용 체크를{'\n'}시작해보세요!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SummaryBar entries={entries} />
          {entries.map((entry) => (
            <DayCard
              key={entry.date}
              entry={entry}
              expanded={expandedDate === entry.date}
              onToggle={() => toggleExpand(entry.date)}
            />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryBar({ entries }: { entries: HistoryEntry[] }) {
  const withRecord = entries.filter((e) => e.record && e.record.intakes.length > 0);
  const perfectDays = withRecord.filter((e) => {
    const r = e.record!;
    return r.intakes.length > 0 && r.intakes.every((i) => i.taken);
  }).length;
  const totalDays = withRecord.length;

  // Streak: consecutive perfect days from today
  let streak = 0;
  for (const entry of withRecord) {
    const r = entry.record!;
    if (r.intakes.length === 0) break;
    if (r.intakes.every((i) => i.taken)) streak++;
    else break;
  }

  return (
    <View style={styles.summaryBar}>
      <SummaryItem label="기록 일수" value={`${totalDays}일`} />
      <View style={styles.summaryDivider} />
      <SummaryItem label="완벽한 날" value={`${perfectDays}일`} />
      <View style={styles.summaryDivider} />
      <SummaryItem label="연속 복약" value={`${streak}일`} accent={streak > 0} />
    </View>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, accent && styles.summaryValueAccent]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DayCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: HistoryEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { date, record } = entry;
  const isToday = date === todayStr();
  const intakes = record?.intakes ?? [];
  const taken = intakes.filter((i) => i.taken).length;
  const total = intakes.length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  const allDone = total > 0 && taken === total;

  return (
    <View style={[styles.dayCard, isToday && styles.dayCardToday]}>
      <TouchableOpacity
        style={styles.dayCardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.dayInfo}>
          <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
            {isToday ? '📅 ' : ''}{formatKoreanDate(date)}
          </Text>
          {total === 0 ? (
            <Text style={styles.dayNoRecord}>기록 없음</Text>
          ) : (
            <Text style={[styles.dayStats, allDone && styles.dayStatsDone]}>
              {allDone ? '✅ 완료' : `${taken} / ${total} 복용`}
            </Text>
          )}
        </View>
        {total > 0 && (
          <View style={styles.dayRight}>
            <Text style={[styles.dayPct, allDone && styles.dayPctDone]}>{pct}%</Text>
            <Text style={styles.dayChevron}>{expanded ? '▲' : '▼'}</Text>
          </View>
        )}
      </TouchableOpacity>

      {total > 0 && (
        <View style={styles.miniBar}>
          <View style={[styles.miniBarFill, { width: `${pct}%` }]} />
        </View>
      )}

      {expanded && total > 0 && (
        <View style={styles.dayDetail}>
          {intakes
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((intake, idx) => (
              <View key={idx} style={styles.intakeRow}>
                <Text style={[styles.intakeCheck, intake.taken && styles.intakeCheckDone]}>
                  {intake.taken ? '✅' : '⬜️'}
                </Text>
                <Text style={[styles.intakeName, !intake.taken && styles.intakeNameMissed]}>
                  {intake.pillName}
                </Text>
                <Text style={styles.intakeTime}>{intake.time}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

function SimpleHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={headerStyles.container}>
      <TouchableOpacity onPress={onBack} style={headerStyles.side} activeOpacity={0.7}>
        <Text style={headerStyles.back}>‹</Text>
      </TouchableOpacity>
      <Text style={headerStyles.title}>{title}</Text>
      <View style={headerStyles.side} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  side: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    fontSize: 32,
    color: '#111827',
    lineHeight: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  summaryValueAccent: {
    color: PRIMARY_DARK,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayCardToday: {
    borderColor: PRIMARY,
    borderWidth: 1.5,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  dayDateToday: {
    color: PRIMARY_DARK,
  },
  dayStats: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayStatsDone: {
    color: PRIMARY_DARK,
    fontWeight: '700',
  },
  dayNoRecord: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  dayRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dayPct: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  dayPctDone: {
    color: PRIMARY,
  },
  dayChevron: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  miniBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: 4,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },
  dayDetail: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  intakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intakeCheck: {
    fontSize: 16,
  },
  intakeCheckDone: {},
  intakeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  intakeNameMissed: {
    color: '#9CA3AF',
  },
  intakeTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
