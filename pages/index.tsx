import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { useProfile } from '../stores/ProfileContext';
import { AGE_BANDS } from '../data/rda';
import { SLOTS, type SlotKey } from '../data/types';
import { todayStr } from '../data/utils';
import { analyze } from '../src/analyze';
import { diagnose, DIAGNOSE_NOTE, notCovered } from '../src/diagnose';
import { AD_IDS, PROMO } from '../src/ads';
import { grantReward } from '../src/reward';
import { useRewardAd } from '../src/useRewardAd';
import { LinkedAppPair } from '../src/LinkedAppPair';
import { COMPLETE_PAIR, pairForDate } from '../src/linkedApps';
import { Scale } from '../src/Scale';
import { Empty } from '../src/ui';
import {
  BG, DAILY_BONUS, GOLD_BG, GOLD_DARK, LINE, PAD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT,
  STREAK_BONUS, STREAK_DAYS, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB, WARN,
} from '../src/theme';

export const Route = createRoute('/', { component: HomePage });

/** 결과지에 처음 펼쳐 보여줄 항목 수 */
const PREVIEW = 6;

function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, completeSlot } = usePills();
  const { profile, loading: profileLoading, age } = useProfile();
  const {
    todayCompleted, currentStreak, dailyBonusUnclaimed, dailyStampReady,
    streakBonusAvailable, streakStampReady,
    markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
  } = useStamps();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);

  const [showAll, setShowAll] = useState(false);

  const onClaimDaily = async () => {
    const ok = await claimDailyBonus();
    if (ok) await grantReward(PROMO.daily, DAILY_BONUS);
  };
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

  const nextSlot = useMemo(() => {
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

  const sex = profile?.sex ?? 'female';
  const result = useMemo(() => diagnose(pills, sex, age), [pills, sex, age]);
  const missing = useMemo(() => notCovered(pills, sex, age), [pills, sex, age]);
  const conflicts = useMemo(
    () => analyze(pills).findings.filter((f) => f.level === 'conflict' || f.level === 'duplicate'),
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

  if (loading || profileLoading) {
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // 나이·성별을 모르면 진단이 성립하지 않는다 — 그것부터 묻는다
  if (!profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.intro}>
          <Text style={s.introTitle}>드시는 영양제,{'\n'}괜찮은지 봐드려요</Text>
          <Text style={s.introDesc}>
            나이·성별 기준으로 지금 드시는 영양제가{'\n'}어디쯤 있는지 알려드려요
          </Text>
          <TouchableOpacity style={s.introBtn} onPress={() => navigation.navigate('/setup')} activeOpacity={0.85}>
            <Text style={s.introBtnText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bandLabel = AGE_BANDS.find((b) => b.key === profile.band)?.label ?? '';
  const who = `${bandLabel} ${profile.sex === 'female' ? '여성' : '남성'}`;
  const shown = showAll ? result.items : result.items.slice(0, PREVIEW);
  const reward =
    dailyStampReady ? { onPress: onClaimDaily, label: `👆 눌러서 ${DAILY_BONUS}원 받기` }
    : streakStampReady ? { onPress: onClaimStreak, label: `👆 눌러서 ${STREAK_BONUS}원 받기` }
    : null;
  const adReady = adLoaded && !playing;
  const bonus =
    streakBonusAvailable ? { onPress: () => show(issueStreakStamp), label: `🏆 ${STREAK_DAYS}일 연속! 광고 보고 ${STREAK_BONUS}원` }
    : allDone && dailyBonusUnclaimed ? { onPress: () => show(issueDailyStamp), label: `광고 보고 ${DAILY_BONUS}원 받기` }
    : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.homeBanner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {pills.length === 0 ? (
          <Empty
            emoji="💊"
            title="영양제를 넣어주세요"
            desc={`${who} 기준으로\n지금 드시는 게 어디쯤인지 봐드려요`}
            action={{ label: '영양제 넣기', onPress: () => navigation.navigate('/add') }}
          />
        ) : (
          <>
            {/* ── 결과지 머리 ── */}
            <View style={s.head}>
              <TouchableOpacity onPress={() => navigation.navigate('/setup')} activeOpacity={0.7}>
                <Text style={s.who}>{who} 기준 ›</Text>
              </TouchableOpacity>
              <Text style={s.verdict}>{result.headline}</Text>
            </View>

            {/* ── 막대 스케일 = 이 화면의 주인공 ── */}
            <View style={s.scales}>
              <View style={s.legend}>
                <Text style={s.legendText}>영양제로 들어오는 양</Text>
                <Text style={s.legendMark}>│ 기준</Text>
              </View>
              {shown.map((item) => (
                <Scale
                  key={item.key}
                  name={item.name}
                  amount={item.intake}
                  unit={item.unit}
                  percent={item.percent}
                  tone={item.level}
                  caption={
                    item.level === 'over'
                      ? `상한 ${item.upperPercent}% — ${item.sources.join(' · ')}`
                      : item.percent === null
                        ? '기준치가 정해지지 않은 성분이에요'
                        : undefined
                  }
                />
              ))}
              {result.items.length > PREVIEW && (
                <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7}>
                  <Text style={s.more}>
                    {showAll ? '접기 ▲' : `나머지 ${result.items.length - PREVIEW}가지 ▼`}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={s.note}>{DIAGNOSE_NOTE}</Text>
            </View>

            {/* 넘친 것 — 유일하게 분명히 말할 수 있는 경고 */}
            {result.over.length > 0 && (
              <View style={s.warnBox}>
                <Text style={s.warnTitle}>상한을 넘긴 성분</Text>
                {result.over.map((o) => (
                  <Text key={o.key} style={s.warnLine}>
                    {o.name} 하루 {o.intake}{o.unit} · 상한의 {o.upperPercent}%
                  </Text>
                ))}
              </View>
            )}

            {/* 겹치는 것 */}
            {conflicts.length > 0 && (
              <TouchableOpacity style={s.line} onPress={() => navigation.navigate('/manage')} activeOpacity={0.7}>
                <Text style={s.lineText}>{conflicts[0].title}</Text>
                <Text style={s.lineMore}>›</Text>
              </TouchableOpacity>
            )}

            {/* 아직 안 들어오는 것 — 권하지 않고 사실만 */}
            {missing.length > 0 && (
              <View style={s.missing}>
                <Text style={s.missingTitle}>영양제로는 안 들어오는 것</Text>
                <Text style={s.missingList}>{missing.map((m) => m.name).join(' · ')}</Text>
                <Text style={s.missingNote}>식사로 챙기시면 돼요. 필요하면 아래에서 찾아보세요.</Text>
              </View>
            )}
          </>
        )}

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.homeFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* ── 오늘 챙기기 — 주인공에서 내렸다 ── */}
        {nextSlot && (
          <View style={s.today}>
            <Text style={s.todayLabel}>{nextSlot.emoji} {nextSlot.label}에 드실 것</Text>
            <Text style={s.todayNames}>
              {nextSlot.intakes.filter((i) => !i.taken).map((i) => i.pillName).join(' · ')}
            </Text>
            <TouchableOpacity style={s.todayBtn} onPress={() => completeSlot(nextSlot.key)} activeOpacity={0.85}>
              <Text style={s.todayBtnText}>먹었어요</Text>
            </TouchableOpacity>
          </View>
        )}
        {!nextSlot && totalCount > 0 && (
          <Text style={s.todayDone}>
            ✓ 오늘 다 드셨어요{currentStreak > 0 ? ` · ${currentStreak}일 연속` : ''}
          </Text>
        )}

        {reward ? (
          <TouchableOpacity style={s.money} onPress={reward.onPress} activeOpacity={0.85}>
            <Animated.Text style={[s.moneyText, { transform: [{ translateY: finger }] }]}>{reward.label}</Animated.Text>
          </TouchableOpacity>
        ) : bonus ? (
          <TouchableOpacity style={[s.money, !adReady && s.moneyOff]} onPress={bonus.onPress} disabled={!adReady} activeOpacity={0.85}>
            <Text style={s.moneyText}>{playing ? '광고 재생 중...' : adLoaded ? bonus.label : '광고 준비 중...'}</Text>
          </TouchableOpacity>
        ) : null}

        {/* 이 앱이 해주는 나머지 */}
        <View style={s.doors}>
          <Door emoji="🔎" title="고민별로 찾아보기" sub="무릎·눈·피로… 어떤 성분이 도움되는지" onPress={() => navigation.navigate('/find')} />
          <Door emoji="📋" title="병원에서 보여주기" sub="지금 드시는 것 한 장으로" onPress={() => navigation.navigate('/card')} />
          <Door emoji="💊" title="내 영양제" sub={`${pills.length}개 · 넣고 고치기`} onPress={() => navigation.navigate('/manage')} />
          <Door emoji="📅" title="복용 기록" sub="이번 주에 놓친 것" onPress={() => navigation.navigate('/history')} />
        </View>

        <View style={s.promo}>
          <LinkedAppPair
            title={todayCompleted ? '🎉 오늘 완주 기념' : '이런 앱도 있어요'}
            apps={todayCompleted ? COMPLETE_PAIR : pairForDate(todayStr())}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Door({ emoji, title, sub, onPress }: { emoji: string; title: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.door} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.doorEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.doorTitle}>{title}</Text>
        <Text style={s.doorSub}>{sub}</Text>
      </View>
      <Text style={s.doorArrow}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 30 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden' },

  intro: { flex: 1, paddingHorizontal: PAD, paddingTop: 80 },
  introTitle: { fontSize: 30, fontWeight: '800', color: TEXT, lineHeight: 43 },
  introDesc: { fontSize: T_SUB, color: TEXT_MUTED, lineHeight: 26, marginTop: 16, marginBottom: 44 },
  introBtn: { backgroundColor: PRIMARY_DARK, borderRadius: 999, paddingVertical: 21, alignItems: 'center' },
  introBtnText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

  head: { paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 22 },
  who: { fontSize: T_SMALL, fontWeight: '700', color: PRIMARY_DARK, marginBottom: 8 },
  verdict: { fontSize: 25, fontWeight: '800', color: TEXT, lineHeight: 35 },

  scales: { paddingHorizontal: PAD },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  legendText: { fontSize: T_SMALL, color: TEXT_MUTED, fontWeight: '600' },
  legendMark: { fontSize: T_SMALL, color: TEXT_MUTED, fontWeight: '600' },
  more: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY_DARK, textAlign: 'center', paddingVertical: 12 },
  note: { fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 19, marginTop: 10 },

  warnBox: { paddingHorizontal: PAD, paddingTop: 22 },
  warnTitle: { fontSize: T_SUB, fontWeight: '800', color: WARN, marginBottom: 8 },
  warnLine: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 25 },

  line: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: PAD, paddingVertical: 16, marginTop: 16,
    borderTopWidth: 1, borderTopColor: LINE,
  },
  lineText: { flex: 1, fontSize: T_SUB, fontWeight: '700', color: GOLD_DARK },
  lineMore: { fontSize: T_SUB, color: TEXT_MUTED },

  missing: { paddingHorizontal: PAD, paddingTop: 22 },
  missingTitle: { fontSize: T_SUB, fontWeight: '800', color: TEXT, marginBottom: 7 },
  missingList: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 25 },
  missingNote: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 7 },

  today: { paddingHorizontal: PAD, paddingTop: 24 },
  todayLabel: { fontSize: T_SMALL, fontWeight: '700', color: PRIMARY_DARK, marginBottom: 6 },
  todayNames: { fontSize: 19, fontWeight: '800', color: TEXT, lineHeight: 28, marginBottom: 16 },
  todayBtn: { backgroundColor: PRIMARY_DARK, borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  todayBtnText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  todayDone: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY_DARK, textAlign: 'center', paddingVertical: 24 },

  money: {
    marginHorizontal: PAD, marginTop: 16, backgroundColor: GOLD_BG,
    borderRadius: 999, paddingVertical: 17, alignItems: 'center',
  },
  moneyOff: { backgroundColor: '#E4E8E5' },
  moneyText: { fontSize: 17, fontWeight: '800', color: GOLD_DARK },

  doors: { marginTop: 30 },
  door: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: PAD, paddingVertical: 17,
    borderTopWidth: 1, borderTopColor: LINE,
  },
  doorEmoji: { fontSize: 24 },
  doorTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  doorSub: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 3 },
  doorArrow: { fontSize: 20, color: TEXT_MUTED },

  promo: { marginTop: 26 },
});
