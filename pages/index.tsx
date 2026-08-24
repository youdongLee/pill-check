import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { SLOTS, type SlotKey } from '../data/types';
import { formatKoreanDate, todayStr, getDatesBack } from '../data/utils';
import { analyze, summarize } from '../src/analyze';
import { AD_IDS, PROMO } from '../src/ads';
import { grantReward } from '../src/reward';
import { useRewardAd } from '../src/useRewardAd';
import { LinkedAppPair } from '../src/LinkedAppPair';
import { COMPLETE_PAIR, pairForDate } from '../src/linkedApps';
import {
  BG, BORDER, CARD, DAILY_BONUS, GOLD, GOLD_DARK, GOLD_LIGHT, PRIMARY, PRIMARY_DARK,
  PRIMARY_LIGHT, STREAK_BONUS, STREAK_DAYS, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/', { component: HomePage });

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
/** 이 개수 이하로 남으면 재구매 안내를 띄운다 */
const LOW_STOCK_DAYS = 10;

function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, toggleIntake, completeSlot } = usePills();
  const {
    stamps, todayCompleted, currentStreak,
    dailyBonusUnclaimed, dailyStampReady, streakBonusAvailable, streakStampReady,
    markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
  } = useStamps();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);

  const [expanded, setExpanded] = useState<SlotKey | null>(null);

  // ── 지급: 완주 시 하루 1회 3원, 7일 연속 10원. 광고는 도장 발급까지, 지급은 탭할 때 ──
  const onIssueDailyStamp = () => show(async () => { await issueDailyStamp(); });
  const onClaimDaily = async () => {
    const ok = await claimDailyBonus();
    if (ok) await grantReward(PROMO.daily, DAILY_BONUS);
  };
  const onIssueStreakStamp = () => show(async () => { await issueStreakStamp(); });
  const onClaimStreak = async () => {
    const ok = await claimStreakBonus();
    if (ok) await grantReward(PROMO.streak, STREAK_BONUS);
  };

  const pillById = useMemo(() => new Map(pills.map((p) => [p.id, p])), [pills]);

  /** 시간대별로 묶은 오늘 할 일 */
  const groups = useMemo(() => {
    return SLOTS.map((slot) => {
      const intakes = todayRecord.intakes.filter((i) => i.slot === slot.key);
      return {
        ...slot,
        intakes,
        done: intakes.filter((i) => i.taken).length,
        total: intakes.length,
      };
    }).filter((g) => g.total > 0);
  }, [todayRecord.intakes]);

  const takenCount = todayRecord.intakes.filter((i) => i.taken).length;
  const totalCount = todayRecord.intakes.length;
  const allDone = totalCount > 0 && takenCount === totalCount;

  /** 지금 먹을 시간대 — 현재 시각에 해당하거나 지나간 것 중 아직 남은 것 */
  const currentSlot = useMemo(() => {
    const h = new Date().getHours();
    const order: SlotKey[] = h < 11 ? ['morning', 'lunch', 'evening', 'bedtime']
      : h < 17 ? ['lunch', 'morning', 'evening', 'bedtime']
      : h < 21 ? ['evening', 'lunch', 'morning', 'bedtime']
      : ['bedtime', 'evening', 'lunch', 'morning'];
    for (const key of order) {
      const g = groups.find((x) => x.key === key);
      if (g && g.done < g.total) return g;
    }
    return null;
  }, [groups]);

  const { findings } = useMemo(() => analyze(pills), [pills]);
  const checkSummary = summarize(findings);

  const lowStock = useMemo(
    () => pills.filter((p) => p.remaining !== undefined && p.remaining <= LOW_STOCK_DAYS * Math.max(1, p.slots.length)),
    [pills],
  );

  const last7Days = getDatesBack(7).reverse();
  const daysToBonus = Math.max(0, STREAK_DAYS - currentStreak - (todayCompleted ? 0 : 1));

  useEffect(() => {
    if (allDone) markTodayComplete();
    // markTodayComplete는 매 렌더 새 참조라 deps에서 제외한다(내부에서 중복 기록을 막는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const fingerBounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!dailyStampReady && !streakStampReady) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fingerBounce, { toValue: -4, duration: 380, useNativeDriver: true }),
        Animated.timing(fingerBounce, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dailyStampReady, streakStampReady, fingerBounce]);

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
        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        <View style={styles.header}>
          <Text style={styles.headerDate}>{formatKoreanDate(todayStr())}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('/history')} activeOpacity={0.7}>
            <Text style={styles.headerLink}>복용 기록</Text>
          </TouchableOpacity>
        </View>

        {/* 지금 먹을 약 — 시간대 하나를 한 번에 완료 */}
        {currentSlot && (
          <View style={styles.nowCard}>
            <View style={styles.nowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nowLabel}>지금, {currentSlot.label} 약</Text>
                <Text style={styles.nowNames} numberOfLines={2}>
                  {currentSlot.intakes.filter((i) => !i.taken).map((i) => i.pillName).join(' · ')}
                </Text>
              </View>
              <Text style={styles.nowCount}>{currentSlot.total - currentSlot.done}알</Text>
            </View>
            <TouchableOpacity style={styles.nowBtn} onPress={() => completeSlot(currentSlot.key)} activeOpacity={0.85}>
              <Text style={styles.nowBtnText}>한번에 먹었어요</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setExpanded(expanded === currentSlot.key ? null : currentSlot.key)} activeOpacity={0.7}>
              <Text style={styles.nowSub}>
                {expanded === currentSlot.key ? '접기' : '하나씩 체크하려면 눌러주세요'}
              </Text>
            </TouchableOpacity>
            {expanded === currentSlot.key && (
              <View style={styles.expandBox}>
                {currentSlot.intakes.map((i) => (
                  <TouchableOpacity
                    key={`${i.pillId}-${i.slot}`}
                    style={styles.expandRow}
                    onPress={() => toggleIntake(i.pillId, i.slot)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expandCheck}>{i.taken ? '✅' : '⬜️'}</Text>
                    <Text style={[styles.expandName, i.taken && styles.expandNameDone]}>{i.pillName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 오늘 진행 + 주간 도장 */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>오늘 진행</Text>
            <Text style={styles.progressCount}>{takenCount} / {totalCount}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${totalCount ? (takenCount / totalCount) * 100 : 0}%` }]} />
          </View>
          <View style={styles.slotChips}>
            {groups.map((g) => {
              const done = g.done === g.total;
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.slotChip, done && styles.slotChipDone]}
                  onPress={() => completeSlot(g.key)}
                  disabled={done}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotChipText, done && styles.slotChipTextDone]}>
                    {g.emoji} {g.label} {g.done}/{g.total}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>이번 주 복용 도장</Text>
            {currentStreak > 0 && <Text style={styles.streakBadge}>🔥 {currentStreak}일 연속</Text>}
          </View>
          <View style={styles.stampRow}>
            {last7Days.map((date) => {
              const done = stamps.includes(date);
              const isToday = date === todayStr();
              const d = new Date(date.replace(/-/g, '/'));
              return (
                <View key={date} style={styles.stampCol}>
                  <View style={[styles.stampCircle, done && styles.stampDone, isToday && !done && styles.stampToday]}>
                    <Text style={styles.stampMark}>{done ? '💊' : ''}</Text>
                  </View>
                  <Text style={[styles.stampLabel, isToday && styles.stampLabelToday]}>
                    {isToday ? '오늘' : DAY_NAMES[d.getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>

          {allDone && dailyBonusUnclaimed && !dailyStampReady && (
            <TouchableOpacity
              style={[styles.bonusBtn, (playing || !adLoaded) && styles.bonusBtnOff]}
              onPress={onIssueDailyStamp}
              disabled={playing || !adLoaded}
              activeOpacity={0.85}
            >
              <Text style={styles.bonusTitle}>🎉 오늘 다 드셨어요!</Text>
              <Text style={styles.bonusSub}>
                {playing ? '광고 재생 중...' : adLoaded ? '광고 보고 오늘의 도장 받기' : '광고 준비 중...'}
              </Text>
            </TouchableOpacity>
          )}
          {allDone && dailyStampReady && (
            <TouchableOpacity style={styles.claimBtn} onPress={onClaimDaily} activeOpacity={0.85}>
              <Animated.Text style={[styles.claimFinger, { transform: [{ translateY: fingerBounce }] }]}>👆</Animated.Text>
              <Text style={styles.claimTitle}>오늘의 도장을 눌러주세요</Text>
              <Text style={styles.claimSub}>{`탭해서 ${DAILY_BONUS}원 받기`}</Text>
            </TouchableOpacity>
          )}
          {streakBonusAvailable && !streakStampReady && (
            <TouchableOpacity
              style={[styles.bonusBtn, (playing || !adLoaded) && styles.bonusBtnOff]}
              onPress={onIssueStreakStamp}
              disabled={playing || !adLoaded}
              activeOpacity={0.85}
            >
              <Text style={styles.bonusTitle}>🏆 {STREAK_DAYS}일 연속 복용 달성!</Text>
              <Text style={styles.bonusSub}>
                {playing ? '광고 재생 중...' : adLoaded ? '광고 보고 보너스 도장 받기' : '광고 준비 중...'}
              </Text>
            </TouchableOpacity>
          )}
          {streakStampReady && (
            <TouchableOpacity style={styles.claimBtn} onPress={onClaimStreak} activeOpacity={0.85}>
              <Animated.Text style={[styles.claimFinger, { transform: [{ translateY: fingerBounce }] }]}>👆</Animated.Text>
              <Text style={styles.claimTitle}>보너스 도장을 눌러주세요</Text>
              <Text style={styles.claimSub}>{`탭해서 ${STREAK_BONUS}원 받기`}</Text>
            </TouchableOpacity>
          )}
          {!streakBonusAvailable && !dailyStampReady && currentStreak > 0 && (
            <Text style={styles.streakHint}>
              {daysToBonus === 0
                ? `오늘 다 드시면 ${STREAK_DAYS}일 연속 달성!`
                : `${daysToBonus}일 더 채우면 ${STREAK_BONUS}원 보너스`}
            </Text>
          )}
        </View>

        {/* 점검 요약 — 이 앱의 핵심으로 보내는 입구 */}
        {checkSummary ? (
          <TouchableOpacity style={styles.checkCard} onPress={() => navigation.navigate('/check')} activeOpacity={0.85}>
            <Text style={styles.checkTitle}>⚠️ 점검할 게 있어요</Text>
            <Text style={styles.checkHeadline}>{checkSummary.headline}</Text>
            <Text style={styles.checkMore}>
              {checkSummary.count > 1 ? `외 ${checkSummary.count - 1}가지 · ` : ''}자세히 보기 ›
            </Text>
          </TouchableOpacity>
        ) : pills.length > 0 ? (
          <TouchableOpacity style={styles.checkCardOk} onPress={() => navigation.navigate('/check')} activeOpacity={0.85}>
            <Text style={styles.checkOkTitle}>👍 겹치거나 넘치는 성분이 없어요</Text>
            <Text style={styles.checkMore}>성분별 섭취량 보기 ›</Text>
          </TouchableOpacity>
        ) : null}

        {/* 재구매 안내 — 푸시 없이 다시 들어올 이유 */}
        {lowStock.map((p) => (
          <View key={p.id} style={styles.stockCard}>
            <Text style={styles.stockName}>{p.emoji} {p.name}</Text>
            <Text style={styles.stockDays}>{p.remaining}알 남음</Text>
          </View>
        ))}

        {/* 비어 있을 때 */}
        {pills.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>영양제를 넣어주세요</Text>
            <Text style={styles.emptyDesc}>제품을 고르면 성분까지 자동으로{'\n'}들어오고, 겹치는 게 없는지 봐드려요</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ 영양제 추가하기</Text>
        </TouchableOpacity>

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        <View style={styles.crossPromo}>
          <LinkedAppPair
            title={allDone ? '🎉 오늘 완주 기념! 이런 앱도 있어요' : '이런 앱도 함께 써보세요'}
            apps={allDone ? COMPLETE_PAIR : pairForDate(todayStr())}
          />
        </View>

        <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('/manage')} activeOpacity={0.85}>
          <Text style={styles.manageBtnText}>내 영양제 관리</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 28 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginBottom: 12 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerDate: { fontSize: 15, color: TEXT_SUB, fontWeight: '600' },
  headerLink: { fontSize: 14, color: PRIMARY_DARK, fontWeight: '700' },

  // 지금 먹을 약
  nowCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 18, borderRadius: 18,
    backgroundColor: CARD, borderWidth: 2, borderColor: PRIMARY,
  },
  nowTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  nowLabel: { fontSize: 14, fontWeight: '700', color: PRIMARY_DARK, marginBottom: 4 },
  nowNames: { fontSize: 17, fontWeight: '800', color: TEXT, lineHeight: 24 },
  nowCount: { fontSize: 26, fontWeight: '800', color: PRIMARY_DARK },
  nowBtn: { backgroundColor: PRIMARY_DARK, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nowBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  nowSub: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginTop: 10 },
  expandBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  expandCheck: { fontSize: 18 },
  expandName: { fontSize: 16, color: TEXT, fontWeight: '600' },
  expandNameDone: { color: TEXT_MUTED, textDecorationLine: 'line-through' },

  card: {
    marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  progressCount: { fontSize: 16, fontWeight: '800', color: PRIMARY_DARK },
  barTrack: { height: 8, backgroundColor: '#EEF2EF', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },

  slotChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  slotChip: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  slotChipDone: { backgroundColor: PRIMARY_LIGHT },
  slotChipText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  slotChipTextDone: { color: PRIMARY_DARK },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  streakBadge: { fontSize: 13, fontWeight: '800', color: GOLD },
  stampRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  stampCol: { alignItems: 'center', flex: 1 },
  stampCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stampDone: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  stampToday: { borderColor: PRIMARY, borderWidth: 2 },
  stampMark: { fontSize: 17 },
  stampLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: '500' },
  stampLabelToday: { color: PRIMARY_DARK, fontWeight: '700' },
  streakHint: { fontSize: 13, color: TEXT_SUB, textAlign: 'center', paddingTop: 6 },

  bonusBtn: { backgroundColor: PRIMARY_DARK, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  bonusBtnOff: { backgroundColor: '#D1D5DB' },
  bonusTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  bonusSub: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', opacity: 0.9, marginTop: 2 },
  claimBtn: {
    backgroundColor: GOLD_LIGHT, borderWidth: 2, borderColor: GOLD,
    borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8,
  },
  claimFinger: { fontSize: 18, marginBottom: 2 },
  claimTitle: { fontSize: 15, fontWeight: '800', color: GOLD_DARK },
  claimSub: { fontSize: 14, fontWeight: '700', color: GOLD_DARK, marginTop: 2 },

  // 점검 카드
  checkCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18,
    backgroundColor: '#FFF8E8', borderWidth: 1.5, borderColor: '#E8C275',
  },
  checkTitle: { fontSize: 14, fontWeight: '800', color: GOLD_DARK, marginBottom: 6 },
  checkHeadline: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 8, lineHeight: 22 },
  checkMore: { fontSize: 13, fontWeight: '700', color: PRIMARY_DARK },
  checkCardOk: {
    marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  checkOkTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },

  // 재구매
  stockCard: {
    marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  stockName: { fontSize: 15, fontWeight: '600', color: TEXT },
  stockDays: { fontSize: 15, fontWeight: '800', color: GOLD_DARK },

  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: TEXT_MUTED, textAlign: 'center', lineHeight: 23 },

  addBtn: {
    marginHorizontal: 16, marginBottom: 16, paddingVertical: 16, borderRadius: 16,
    backgroundColor: PRIMARY, alignItems: 'center',
  },
  addBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  crossPromo: { marginHorizontal: 16, marginBottom: 18 },
  manageBtn: {
    marginHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center',
  },
  manageBtnText: { fontSize: 15, fontWeight: '700', color: TEXT_SUB },
});
