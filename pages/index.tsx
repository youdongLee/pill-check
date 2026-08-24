import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { SLOTS, type SlotKey } from '../data/types';
import { todayStr } from '../data/utils';
import { analyze, summarize } from '../src/analyze';
import { AD_IDS, PROMO } from '../src/ads';
import { grantReward } from '../src/reward';
import { useRewardAd } from '../src/useRewardAd';
import { LinkedAppPair } from '../src/LinkedAppPair';
import { COMPLETE_PAIR, pairForDate } from '../src/linkedApps';
import {
  BG, DAILY_BONUS, GOLD_BG, GOLD_DARK, LINE, PAD, PRIMARY, PRIMARY_DARK, STREAK_BONUS,
  STREAK_DAYS, T_HERO, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB,
} from '../src/theme';

export const Route = createRoute('/', { component: HomePage });

/** 이 알수 이하로 남으면 알려준다 */
const LOW_STOCK = 10;
/** 한 줄에 이름을 몇 개까지 늘어놓을지 */
const NAME_LIMIT = 3;

function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, toggleIntake, completeSlot } = usePills();
  const {
    todayCompleted, currentStreak,
    dailyBonusUnclaimed, dailyStampReady, streakBonusAvailable, streakStampReady,
    markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
  } = useStamps();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);

  const [showAll, setShowAll] = useState(false);

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

  const reward =
    dailyStampReady ? { onPress: onClaimDaily, label: `👆 눌러서 ${DAILY_BONUS}원 받기` }
    : streakStampReady ? { onPress: onClaimStreak, label: `👆 눌러서 ${STREAK_BONUS}원 받기` }
    : null;
  const adReady = adLoaded && !playing;
  const bonus =
    streakBonusAvailable ? { onPress: onIssueStreak, label: `🏆 ${STREAK_DAYS}일 연속! 광고 보고 ${STREAK_BONUS}원` }
    : allDone && dailyBonusUnclaimed ? { onPress: onIssueDaily, label: `광고 보고 ${DAILY_BONUS}원 받기` }
    : null;

  const pending = current ? current.intakes.filter((i) => !i.taken) : [];
  const names = pending.slice(0, NAME_LIMIT).map((i) => i.pillName).join(' · ');
  const moreCount = pending.length - NAME_LIMIT;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* ── 화면 = 지금 할 일 하나. 카드에 담지 않는다 ── */}
        {pills.length === 0 ? (
          <View style={styles.stage}>
            <Text style={styles.bigEmoji}>💊</Text>
            <Text style={styles.stageTitle}>영양제를 넣어주세요</Text>
            <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
              <Text style={styles.actionText}>영양제 넣기</Text>
            </TouchableOpacity>
          </View>
        ) : current ? (
          <View style={styles.stage}>
            <Text style={styles.bigEmoji}>{current.emoji}</Text>
            <Text style={styles.when}>{current.label}</Text>
            <Text style={styles.names}>
              {names}{moreCount > 0 ? ` 외 ${moreCount}개` : ''}
            </Text>
            <TouchableOpacity style={styles.action} onPress={() => completeSlot(current.key)} activeOpacity={0.85}>
              <Text style={styles.actionText}>먹었어요</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* 완료: 할 일이 없으니 한 줄이면 된다 */
          <Text style={styles.doneLine}>
            ✓ 오늘 다 드셨어요{currentStreak > 0 ? ` · ${currentStreak}일 연속` : ''}
          </Text>
        )}

        {/* 진행 — 점만 */}
        {totalCount > 0 && (
          <View style={styles.dots}>
            {groups.map((g) => (
              <View key={g.key} style={[styles.dot, g.done === g.total && styles.dotDone]} />
            ))}
            <Text style={styles.dotText}>{takenCount}/{totalCount}</Text>
          </View>
        )}

        {/* 받을 돈 — 있으면 여기 하나만 */}
        {reward ? (
          <TouchableOpacity style={styles.money} onPress={reward.onPress} activeOpacity={0.85}>
            <Animated.Text style={[styles.moneyText, { transform: [{ translateY: finger }] }]}>
              {reward.label}
            </Animated.Text>
          </TouchableOpacity>
        ) : bonus ? (
          <TouchableOpacity
            style={[styles.money, !adReady && styles.moneyOff]}
            onPress={bonus.onPress}
            disabled={!adReady}
            activeOpacity={0.85}
          >
            <Text style={styles.moneyText}>{playing ? '광고 재생 중...' : adLoaded ? bonus.label : '광고 준비 중...'}</Text>
          </TouchableOpacity>
        ) : null}

        {/* 알림 — 텍스트 한 줄 */}
        {check && (
          <TouchableOpacity onPress={() => navigation.navigate('/check')} activeOpacity={0.7}>
            <Text style={styles.alert}>⚠️ {check.headline} ›</Text>
          </TouchableOpacity>
        )}
        {lowStock.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('/manage')} activeOpacity={0.7}>
            <Text style={styles.alert}>
              {lowStock.length === 1
                ? `${lowStock[0].name} ${lowStock[0].remaining}알 남음 ›`
                : `${lowStock[0].name} 외 ${lowStock.length - 1}개 얼마 안 남음 ›`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.ad}>
          <InlineAd adGroupId={AD_IDS.homeFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* 전체 목록 — 필요할 때만 편다 */}
        {groups.length > 0 && (
          <>
            <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7}>
              <Text style={styles.fold}>오늘 전체 {showAll ? '접기 ▲' : '보기 ▼'}</Text>
            </TouchableOpacity>
            {showAll &&
              groups.map((g) => (
                <View key={g.key} style={styles.block}>
                  <Text style={styles.blockTitle}>{g.emoji} {g.label}</Text>
                  {g.intakes.map((i) => (
                    <TouchableOpacity
                      key={`${i.pillId}-${i.slot}`}
                      style={styles.line}
                      onPress={() => toggleIntake(i.pillId, i.slot)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.lineMark}>{i.taken ? '✅' : '⬜️'}</Text>
                      <Text style={[styles.lineName, i.taken && styles.lineDone]}>{i.pillName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
          </>
        )}

        {/* 이 앱이 해주는 일 — 체크 말고 나머지 */}
        <View style={styles.doors}>
          <TouchableOpacity style={styles.door} onPress={() => navigation.navigate('/find')} activeOpacity={0.7}>
            <Text style={styles.doorEmoji}>🔎</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.doorTitle}>고민별로 찾아보기</Text>
              <Text style={styles.doorSub}>무릎·눈·피로… 어떤 성분이 도움되는지</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.door} onPress={() => navigation.navigate('/card')} activeOpacity={0.7}>
            <Text style={styles.doorEmoji}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.doorTitle}>병원에서 보여주기</Text>
              <Text style={styles.doorSub}>지금 드시는 것 한 장으로</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 메뉴 — 글자 링크로 */}
        <View style={styles.menu}>
          <TouchableOpacity onPress={() => navigation.navigate('/add')} activeOpacity={0.7}>
            <Text style={styles.menuMain}>+ 영양제 넣기</Text>
          </TouchableOpacity>
          <View style={styles.menuRow}>
            <TouchableOpacity onPress={() => navigation.navigate('/manage')} activeOpacity={0.7}>
              <Text style={styles.menuLink}>내 영양제</Text>
            </TouchableOpacity>
            <Text style={styles.menuDiv}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('/check')} activeOpacity={0.7}>
              <Text style={styles.menuLink}>성분 점검</Text>
            </TouchableOpacity>
            <Text style={styles.menuDiv}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('/history')} activeOpacity={0.7}>
              <Text style={styles.menuLink}>복용 기록</Text>
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
  scroll: { paddingBottom: 30 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden' },

  // 카드가 아니라 화면 그 자체. 테두리도 배경도 없다.
  stage: { alignItems: 'center', paddingHorizontal: PAD + 4, paddingTop: 34, paddingBottom: 26 },
  bigEmoji: { fontSize: 56, marginBottom: 10 },
  when: { fontSize: 17, fontWeight: '700', color: PRIMARY_DARK, marginBottom: 12 },
  names: { fontSize: T_HERO, fontWeight: '800', color: TEXT, textAlign: 'center', lineHeight: 38, marginBottom: 30 },
  stageTitle: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 26, textAlign: 'center' },

  action: {
    alignSelf: 'stretch', backgroundColor: PRIMARY_DARK, borderRadius: 999,
    paddingVertical: 22, alignItems: 'center',
  },
  actionText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },

  doneLine: {
    fontSize: 18, fontWeight: '700', color: PRIMARY_DARK,
    textAlign: 'center', paddingVertical: 26,
  },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingBottom: 24 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#D6DED9' },
  dotDone: { backgroundColor: PRIMARY },
  dotText: { fontSize: 14, color: TEXT_MUTED, fontWeight: '700', marginLeft: 6 },

  money: {
    marginHorizontal: PAD, marginBottom: 22, backgroundColor: GOLD_BG,
    borderRadius: 999, paddingVertical: 17, alignItems: 'center',
  },
  moneyOff: { backgroundColor: '#E4E8E5' },
  moneyText: { fontSize: 17, fontWeight: '800', color: GOLD_DARK },

  alert: {
    fontSize: 16, fontWeight: '700', color: GOLD_DARK,
    textAlign: 'center', paddingVertical: 9, paddingHorizontal: PAD,
  },

  fold: { fontSize: 16, fontWeight: '700', color: TEXT_SUB, textAlign: 'center', paddingVertical: 20 },
  block: { paddingHorizontal: PAD, marginBottom: 14 },
  blockTitle: { fontSize: 16, fontWeight: '800', color: TEXT_SUB, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  lineMark: { fontSize: 22 },
  lineName: { fontSize: 19, fontWeight: '700', color: TEXT },
  lineDone: { color: TEXT_MUTED, fontWeight: '500', textDecorationLine: 'line-through' },

  doors: { paddingTop: 6 },
  door: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: PAD, paddingVertical: 17,
    borderTopWidth: 1, borderTopColor: LINE,
  },
  doorEmoji: { fontSize: 26 },
  doorTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  doorSub: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 3 },

  menu: { alignItems: 'center', paddingTop: 14, paddingBottom: 26, gap: 16 },
  menuMain: { fontSize: 19, fontWeight: '800', color: PRIMARY_DARK },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLink: { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },
  menuDiv: { fontSize: 15, color: '#C9D2CC' },

  promo: { marginTop: 4 },
});
