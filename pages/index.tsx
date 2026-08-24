import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { SLOTS, type SlotKey } from '../data/types';
import { formatKoreanDate, todayStr } from '../data/utils';
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

/** 이 알수 이하로 남으면 알려준다 */
const LOW_STOCK = 10;

function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, toggleIntake, completeSlot } = usePills();
  const {
    todayCompleted, currentStreak,
    dailyBonusUnclaimed, dailyStampReady, streakBonusAvailable, streakStampReady,
    markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
  } = useStamps();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);

  const [showList, setShowList] = useState(false);

  // ── 지급: 완주 시 하루 1회 3원, 7일 연속 10원. 광고는 도장 발급까지, 지급은 탭할 때 ──
  const onIssueDaily = () => show(async () => { await issueDailyStamp(); });
  const onClaimDaily = async () => {
    const ok = await claimDailyBonus();
    if (ok) await grantReward(PROMO.daily, DAILY_BONUS);
  };
  const onIssueStreak = () => show(async () => { await issueStreakStamp(); });
  const onClaimStreak = async () => {
    const ok = await claimStreakBonus();
    if (ok) await grantReward(PROMO.streak, STREAK_BONUS);
  };

  /** 시간대별 묶음 — 등록된 것만 */
  const groups = useMemo(
    () =>
      SLOTS.map((slot) => {
        const intakes = todayRecord.intakes.filter((i) => i.slot === slot.key);
        return { ...slot, intakes, done: intakes.filter((i) => i.taken).length, total: intakes.length };
      }).filter((g) => g.total > 0),
    [todayRecord.intakes],
  );

  const takenCount = todayRecord.intakes.filter((i) => i.taken).length;
  const totalCount = todayRecord.intakes.length;
  const allDone = totalCount > 0 && takenCount === totalCount;

  /** 지금 챙길 시간대 하나 — 화면의 주인공 */
  const current = useMemo(() => {
    const h = new Date().getHours();
    const order: SlotKey[] =
      h < 11 ? ['morning', 'lunch', 'evening', 'bedtime']
      : h < 17 ? ['lunch', 'evening', 'bedtime', 'morning']
      : h < 21 ? ['evening', 'bedtime', 'lunch', 'morning']
      : ['bedtime', 'evening', 'lunch', 'morning'];
    for (const key of order) {
      const g = groups.find((x) => x.key === key && x.done < x.total);
      if (g) return g;
    }
    return null;
  }, [groups]);

  const { findings } = useMemo(() => analyze(pills), [pills]);
  const check = summarize(findings);

  const lowStock = useMemo(
    () => pills.filter((p) => p.remaining !== undefined && p.remaining <= LOW_STOCK * Math.max(1, p.slots.length)),
    [pills],
  );

  useEffect(() => {
    if (allDone) markTodayComplete();
    // markTodayComplete 는 매 렌더 새 참조라 deps 에서 제외한다(내부에서 중복 기록을 막는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const finger = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!dailyStampReady && !streakStampReady) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(finger, { toValue: -5, duration: 380, useNativeDriver: true }),
        Animated.timing(finger, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dailyStampReady, streakStampReady, finger]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  /** 받을 돈이 있으면 그것만 보여준다 — 다른 것과 나란히 두면 놓친다 */
  const reward =
    dailyStampReady ? { onPress: onClaimDaily, title: '오늘 도장을 눌러주세요', sub: `${DAILY_BONUS}원 받기` }
    : streakStampReady ? { onPress: onClaimStreak, title: '보너스 도장을 눌러주세요', sub: `${STREAK_BONUS}원 받기` }
    : null;

  const adReady = adLoaded && !playing;
  const bonus =
    streakBonusAvailable ? { onPress: onIssueStreak, title: `🏆 ${STREAK_DAYS}일 연속 달성!`, sub: `광고 보고 ${STREAK_BONUS}원 받기` }
    : allDone && dailyBonusUnclaimed ? { onPress: onIssueDaily, title: '🎉 오늘 다 드셨어요', sub: `광고 보고 ${DAILY_BONUS}원 받기` }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        <Text style={styles.date}>{formatKoreanDate(todayStr())}</Text>

        {/* ── 주인공: 지금 챙길 것 하나 ── */}
        {pills.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>영양제를 넣어주세요</Text>
            <Text style={styles.emptyDesc}>제품을 고르면 성분까지 자동으로 들어와요</Text>
          </View>
        ) : current ? (
          <View style={styles.hero}>
            <Text style={styles.heroWhen}>{current.emoji} {current.label}</Text>
            {current.intakes.map((i) => (
              <Text key={`${i.pillId}-${i.slot}`} style={[styles.heroPill, i.taken && styles.heroPillDone]}>
                {i.taken ? '✓ ' : '· '}{i.pillName}
              </Text>
            ))}
            <TouchableOpacity style={styles.heroBtn} onPress={() => completeSlot(current.key)} activeOpacity={0.85}>
              <Text style={styles.heroBtnText}>먹었어요</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>오늘 다 드셨어요</Text>
            {currentStreak > 0 && <Text style={styles.doneSub}>{currentStreak}일 연속이에요</Text>}
          </View>
        )}

        {/* 오늘 진행 — 점으로만 */}
        {totalCount > 0 && (
          <View style={styles.dotsRow}>
            {groups.map((g) => (
              <View key={g.key} style={styles.dotWrap}>
                <View style={[styles.dot, g.done === g.total && styles.dotDone]} />
                <Text style={styles.dotLabel}>{g.label}</Text>
              </View>
            ))}
            {currentStreak > 0 && <Text style={styles.streak}>🔥 {currentStreak}일</Text>}
          </View>
        )}

        {/* 받을 돈 — 있으면 이것만 크게 */}
        {reward && (
          <TouchableOpacity style={styles.claim} onPress={reward.onPress} activeOpacity={0.85}>
            <Animated.Text style={[styles.claimFinger, { transform: [{ translateY: finger }] }]}>👆</Animated.Text>
            <Text style={styles.claimTitle}>{reward.title}</Text>
            <Text style={styles.claimSub}>{reward.sub}</Text>
          </TouchableOpacity>
        )}
        {!reward && bonus && (
          <TouchableOpacity
            style={[styles.bonus, !adReady && styles.bonusOff]}
            onPress={bonus.onPress}
            disabled={!adReady}
            activeOpacity={0.85}
          >
            <Text style={styles.bonusTitle}>{bonus.title}</Text>
            <Text style={styles.bonusSub}>{playing ? '광고 재생 중...' : adLoaded ? bonus.sub : '광고 준비 중...'}</Text>
          </TouchableOpacity>
        )}

        {/* 점검할 게 있을 때만 */}
        {check && (
          <TouchableOpacity style={styles.notice} onPress={() => navigation.navigate('/check')} activeOpacity={0.85}>
            <Text style={styles.noticeText}>⚠️ {check.headline}</Text>
            <Text style={styles.noticeMore}>보기 ›</Text>
          </TouchableOpacity>
        )}

        {/* 다 떨어져 가는 것 — 한 줄로 합친다 */}
        {lowStock.length > 0 && (
          <TouchableOpacity style={styles.notice} onPress={() => navigation.navigate('/manage')} activeOpacity={0.85}>
            <Text style={styles.noticeText}>
              {lowStock.length === 1
                ? `${lowStock[0].name} ${lowStock[0].remaining}알 남았어요`
                : `${lowStock[0].name} 외 ${lowStock.length - 1}개가 얼마 안 남았어요`}
            </Text>
            <Text style={styles.noticeMore}>보기 ›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* 나머지 시간대 — 접어둔다 */}
        {groups.length > 1 && (
          <>
            <TouchableOpacity style={styles.foldBtn} onPress={() => setShowList(!showList)} activeOpacity={0.7}>
              <Text style={styles.foldText}>
                오늘 전체 보기 {takenCount}/{totalCount} {showList ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {showList &&
              groups.map((g) => (
                <View key={g.key} style={styles.slotBlock}>
                  <Text style={styles.slotTitle}>{g.emoji} {g.label}</Text>
                  {g.intakes.map((i) => (
                    <TouchableOpacity
                      key={`${i.pillId}-${i.slot}`}
                      style={styles.checkRow}
                      onPress={() => toggleIntake(i.pillId, i.slot)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.checkMark}>{i.taken ? '✅' : '⬜️'}</Text>
                      <Text style={[styles.checkName, i.taken && styles.checkNameDone]}>{i.pillName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
          </>
        )}

        {/* 아래로 갈수록 덜 쓰는 것 */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
            <Text style={styles.menuBtnMain}>+ 영양제 넣기</Text>
          </TouchableOpacity>
          <View style={styles.menuRow}>
            <TouchableOpacity style={styles.menuSub} onPress={() => navigation.navigate('/manage')} activeOpacity={0.7}>
              <Text style={styles.menuSubText}>내 영양제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuSub} onPress={() => navigation.navigate('/check')} activeOpacity={0.7}>
              <Text style={styles.menuSubText}>성분 점검</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuSub} onPress={() => navigation.navigate('/history')} activeOpacity={0.7}>
              <Text style={styles.menuSubText}>복용 기록</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.promo}>
          <LinkedAppPair
            title={todayCompleted ? '🎉 오늘 완주 기념' : '이런 앱도 있어요'}
            apps={todayCompleted ? COMPLETE_PAIR : pairForDate(todayStr())}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 32 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden', marginBottom: 16 },

  date: { fontSize: 15, color: TEXT_SUB, fontWeight: '600', paddingHorizontal: 20, marginBottom: 12 },

  // 주인공 카드 — 화면에서 가장 크고 유일하게 테두리를 가진다
  hero: {
    marginHorizontal: 16, marginBottom: 18, paddingVertical: 24, paddingHorizontal: 22,
    borderRadius: 20, backgroundColor: CARD, borderWidth: 2, borderColor: PRIMARY,
  },
  heroWhen: { fontSize: 17, fontWeight: '800', color: PRIMARY_DARK, marginBottom: 14 },
  heroPill: { fontSize: 21, fontWeight: '700', color: TEXT, lineHeight: 33 },
  heroPillDone: { color: TEXT_MUTED, fontWeight: '500' },
  heroBtn: {
    marginTop: 20, backgroundColor: PRIMARY_DARK, borderRadius: 16,
    paddingVertical: 20, alignItems: 'center',
  },
  heroBtnText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

  doneEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: TEXT, textAlign: 'center' },
  doneSub: { fontSize: 16, color: PRIMARY_DARK, textAlign: 'center', marginTop: 6, fontWeight: '700' },

  // 진행 — 점 몇 개면 충분하다
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    paddingHorizontal: 24, marginBottom: 18,
  },
  dotWrap: { alignItems: 'center', gap: 5 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#DDE4DF' },
  dotDone: { backgroundColor: PRIMARY },
  dotLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  streak: { marginLeft: 'auto', fontSize: 15, fontWeight: '800', color: GOLD },

  // 받을 돈
  claim: {
    marginHorizontal: 16, marginBottom: 18, paddingVertical: 18,
    borderRadius: 18, backgroundColor: GOLD_LIGHT, borderWidth: 2, borderColor: GOLD,
    alignItems: 'center',
  },
  claimFinger: { fontSize: 22, marginBottom: 2 },
  claimTitle: { fontSize: 18, fontWeight: '800', color: GOLD_DARK },
  claimSub: { fontSize: 16, fontWeight: '700', color: GOLD_DARK, marginTop: 3 },

  bonus: {
    marginHorizontal: 16, marginBottom: 18, paddingVertical: 17,
    borderRadius: 18, backgroundColor: PRIMARY_DARK, alignItems: 'center',
  },
  bonusOff: { backgroundColor: '#C6CFC9' },
  bonusTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  bonusSub: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', opacity: 0.92, marginTop: 3 },

  // 알림 한 줄 — 점검·재고 공용
  notice: {
    marginHorizontal: 16, marginBottom: 12, paddingVertical: 15, paddingHorizontal: 18,
    borderRadius: 14, backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#EBD9AE',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  noticeText: { flex: 1, fontSize: 16, fontWeight: '700', color: GOLD_DARK, lineHeight: 23 },
  noticeMore: { fontSize: 15, fontWeight: '700', color: GOLD_DARK },

  // 접어둔 전체 목록
  foldBtn: { paddingVertical: 14, alignItems: 'center' },
  foldText: { fontSize: 16, fontWeight: '700', color: TEXT_SUB },
  slotBlock: { marginHorizontal: 16, marginBottom: 10 },
  slotTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 6, paddingHorizontal: 4 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 15, paddingHorizontal: 16,
    backgroundColor: CARD, borderRadius: 14, marginBottom: 7,
  },
  checkMark: { fontSize: 21 },
  checkName: { fontSize: 18, fontWeight: '700', color: TEXT },
  checkNameDone: { color: TEXT_MUTED, fontWeight: '500', textDecorationLine: 'line-through' },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: TEXT_MUTED, textAlign: 'center', lineHeight: 24 },

  menu: { marginHorizontal: 16, marginTop: 6, marginBottom: 20 },
  menuBtn: { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  menuBtnMain: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  menuRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  menuSub: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
  },
  menuSubText: { fontSize: 15, fontWeight: '700', color: TEXT_SUB },

  promo: { marginHorizontal: 16 },
});
