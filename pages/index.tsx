import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { useProfile } from '../stores/ProfileContext';
import { AGE_BANDS } from '../data/rda';
import { CONCERNS, CONCERN_DISCLAIMER, FUNCTION_CLAIMS, type Concern } from '../data/concerns';
import { findIngredient } from '../data/ingredients';
import { PRODUCTS } from '../data/products';
import { SLOTS, slotOf, type DailyRecord, type Pill as PillType, type SlotKey } from '../data/types';
import { getDatesBack, todayStr } from '../data/utils';
import { analyze } from '../src/analyze';
import { diagnose, DIAGNOSE_NOTE, notCovered } from '../src/diagnose';
import { AD_IDS, PROMO } from '../src/ads';
import { grantReward } from '../src/reward';
import { useRewardAd } from '../src/useRewardAd';
import { LinkedAppPair } from '../src/LinkedAppPair';
import { COMPLETE_PAIR, pairForDate } from '../src/linkedApps';
import { Scale } from '../src/Scale';
import { Block } from '../src/Section';
import { Pill } from '../src/ui';
import {
  BG, DAILY_BONUS, GOLD_BG, GOLD_DARK, LIFT, LINE, PAD, PRIMARY, PRIMARY_DARK, PRIMARY_SOFT,
  STREAK_BONUS, STREAK_DAYS, SUNK, SURFACE, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB, WARN,
} from '../src/theme';

export const Route = createRoute('/', { component: HomePage });

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const SCALE_PREVIEW = 5;

/**
 * 이 앱은 화면이 하나다.
 *
 * 5060 유저는 메뉴를 눌러 다른 화면으로 들어가지 않는다. 기능을 화면으로 나누면
 * 만들어놓고 아무도 못 찾는 꼴이 된다. 그래서 진단·고민찾기·복용체크·기록·병원용 목록을
 * 전부 한 장에 구역으로 쌓고, 위에서 아래로 훑으면 앱이 뭘 해주는지 다 보이게 한다.
 * (영양제를 넣는 입력만 별도 화면 — 폼이라 어쩔 수 없다)
 */
function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, completeSlot, toggleIntake, updatePill, deletePill, getHistoryRecord } = usePills();
  const { profile, loading: profileLoading, age } = useProfile();
  const {
    todayCompleted, currentStreak, dailyBonusUnclaimed, dailyStampReady,
    streakBonusAvailable, streakStampReady,
    markTodayComplete, issueDailyStamp, claimDailyBonus, issueStreakStamp, claimStreakBonus,
  } = useStamps();
  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);

  const [openPill, setOpenPill] = useState<string | null>(null);
  const [concern, setConcern] = useState<Concern | null>(null);
  const [showAllScales, setShowAllScales] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [week, setWeek] = useState<{ date: string; record: DailyRecord | null }[]>([]);

  // ── 오늘 ──
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

  // ── 진단 ──
  const sex = profile?.sex ?? 'female';
  const result = useMemo(() => diagnose(pills, sex, age), [pills, sex, age]);
  const missing = useMemo(() => notCovered(pills, sex, age), [pills, sex, age]);
  const conflicts = useMemo(
    () => analyze(pills).findings.filter((f) => f.level === 'conflict' || f.level === 'duplicate'),
    [pills],
  );

  // ── 기록 ──
  const loadWeek = useCallback(async () => {
    const days = getDatesBack(7);
    const rows = await Promise.all(days.map(async (d) => ({ date: d, record: await getHistoryRecord(d) })));
    setWeek(rows.reverse());
  }, [getHistoryRecord]);
  useEffect(() => { loadWeek(); }, [loadWeek, takenCount]);

  const missed = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of week) {
      for (const i of e.record?.intakes ?? []) {
        if (i.taken) continue;
        const k = `${slotOf(i.slot).label} ${i.pillName}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [week]);

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

  const onClaimDaily = async () => {
    const ok = await claimDailyBonus();
    if (ok) await grantReward(PROMO.daily, DAILY_BONUS);
  };
  const onClaimStreak = async () => {
    const ok = await claimStreakBonus();
    if (ok) await grantReward(PROMO.streak, STREAK_BONUS);
  };

  const removePill = (p: PillType) =>
    Alert.alert(`"${p.name}" 지울까요?`, '복용 기록에서도 빠져요.', [
      { text: '아니요', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deletePill(p.id) },
    ]);

  if (loading || profileLoading) {
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  // 나이·성별을 모르면 진단이 성립하지 않는다
  if (!profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.intro}>
          <Text style={s.introTitle}>드시는 영양제,{'\n'}괜찮은지 봐드려요</Text>
          <Text style={s.introDesc}>
            나이·성별 기준으로 지금 드시는 게{'\n'}모자란지 넘치는지 알려드려요
          </Text>
          <TouchableOpacity style={s.introBtn} onPress={() => navigation.navigate('/setup')} activeOpacity={0.85}>
            <Text style={s.introBtnText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const band = AGE_BANDS.find((b) => b.key === profile.band)?.label ?? '';
  const who = `${band} ${profile.sex === 'female' ? '여성' : '남성'}`;
  const shownScales = showAllScales ? result.items : result.items.slice(0, SCALE_PREVIEW);
  const adReady = adLoaded && !playing;
  const reward =
    dailyStampReady ? { onPress: onClaimDaily, label: `👆 눌러서 ${DAILY_BONUS}원 받기` }
    : streakStampReady ? { onPress: onClaimStreak, label: `👆 눌러서 ${STREAK_BONUS}원 받기` }
    : null;
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

        {/* ①  오늘 챙기기 */}
        <Block first no={1} title="오늘 챙겨 드세요" desc={totalCount > 0 ? `${takenCount} / ${totalCount} 드셨어요` : undefined}>
          {pills.length === 0 ? (
            <View style={s.pad}>
              <Text style={s.emptyText}>아직 넣으신 영양제가 없어요.{'\n'}아래 ②에서 넣어주세요.</Text>
            </View>
          ) : nextSlot ? (
            <View style={s.pad}>
              <Text style={s.nowWhen}>{nextSlot.emoji} {nextSlot.label}</Text>
              <Text style={s.nowNames}>
                {nextSlot.intakes.filter((i) => !i.taken).map((i) => i.pillName).join(' · ')}
              </Text>
              <TouchableOpacity style={s.bigBtn} onPress={() => completeSlot(nextSlot.key)} activeOpacity={0.85}>
                <Text style={s.bigBtnText}>먹었어요</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={s.doneText}>
              ✓ 오늘 다 드셨어요{currentStreak > 0 ? ` · ${currentStreak}일 연속` : ''}
            </Text>
          )}

          {/* 시간대 진행 */}
          {groups.length > 0 && (
            <View style={s.slots}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[s.slotChip, g.done === g.total && s.slotChipDone]}
                  onPress={() => completeSlot(g.key)}
                  disabled={g.done === g.total}
                  activeOpacity={0.8}
                >
                  <Text style={[s.slotText, g.done === g.total && s.slotTextDone]}>
                    {g.emoji} {g.label} {g.done}/{g.total}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
        </Block>

        {/* ②  내 영양제 */}
        <Block no={2} title="내 영양제" desc="눌러서 시간·개수를 고치거나 지울 수 있어요">
          {pills.map((p) => {
            const open = openPill === p.id;
            return (
              <View key={p.id}>
                <TouchableOpacity style={s.row} onPress={() => setOpenPill(open ? null : p.id)} activeOpacity={0.7}>
                  <Text style={s.rowEmoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName}>{p.name}</Text>
                    <Text style={s.rowSub}>
                      {p.slots.map((k) => slotOf(k).label).join(' · ')}
                      {p.remaining !== undefined ? ` · ${p.remaining}알 남음` : ''}
                    </Text>
                  </View>
                  <Text style={s.rowArrow}>{open ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {open && (
                  <View style={s.edit}>
                    <Text style={s.editLabel}>드시는 시간</Text>
                    <View style={s.editSlots}>
                      {SLOTS.map((sl) => (
                        <Pill
                          key={sl.key}
                          wide
                          label={`${sl.emoji} ${sl.label}`}
                          on={p.slots.includes(sl.key)}
                          onPress={() => {
                            const next = p.slots.includes(sl.key) ? p.slots.filter((x) => x !== sl.key) : [...p.slots, sl.key];
                            if (next.length === 0) { Alert.alert('시간대는 하나 이상 골라주세요'); return; }
                            updatePill({ ...p, slots: next });
                          }}
                        />
                      ))}
                    </View>
                    {p.ingredients.length > 0 && (
                      <Text style={s.editIng}>
                        {p.ingredients
                          .map((ing) => {
                            const m = findIngredient(ing.key);
                            return m ? `${m.name} ${ing.amount}${m.unit}` : null;
                          })
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                    <TouchableOpacity onPress={() => removePill(p)} activeOpacity={0.7}>
                      <Text style={s.del}>이 영양제 지우기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          <View style={s.pad}>
            <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('/add')} activeOpacity={0.85}>
              <Text style={s.addBtnText}>+ 영양제 넣기</Text>
            </TouchableOpacity>
          </View>
        </Block>

        <View style={s.ad}>
          <InlineAd adGroupId={AD_IDS.homeFeed} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
        </View>

        {/* ③  진단 */}
        <Block no={3} title="모자란지 넘치는지" desc={`${who} 기준으로 봤어요`}>
          {result.items.length === 0 ? (
            <Text style={s.emptyText}>영양제를 넣으면 여기에 결과가 나와요</Text>
          ) : (
            <View style={s.pad}>
              <View style={s.legend}>
                <Text style={s.legendText}>영양제로 들어오는 양</Text>
                <Text style={s.legendText}>│ 기준</Text>
              </View>
              {shownScales.map((item) => (
                <Scale
                  key={item.key}
                  name={item.name}
                  amount={item.intake}
                  unit={item.unit}
                  percent={item.percent}
                  tone={item.level}
                  caption={item.level === 'over' ? `상한의 ${item.upperPercent}% — 줄이시는 게 좋아요` : undefined}
                />
              ))}
              {result.items.length > SCALE_PREVIEW && (
                <TouchableOpacity onPress={() => setShowAllScales(!showAllScales)} activeOpacity={0.7}>
                  <Text style={s.more}>{showAllScales ? '접기 ▲' : `나머지 ${result.items.length - SCALE_PREVIEW}가지 ▼`}</Text>
                </TouchableOpacity>
              )}
              {conflicts.length > 0 && <Text style={s.conflict}>⚠️ {conflicts[0].title} — {conflicts[0].message}</Text>}
              {missing.length > 0 && (
                <Text style={s.missing}>
                  영양제로 안 들어오는 것: {missing.map((m) => m.name).join(' · ')}
                </Text>
              )}
              <Text style={s.note}>{DIAGNOSE_NOTE}</Text>
            </View>
          )}
        </Block>

        {/* ④  고민별 찾기 */}
        <Block no={4} title="이런 고민 있으세요?" desc="고르면 어떤 성분이 도움되는지 알려드려요">
          <View style={s.concerns}>
            {CONCERNS.map((c) => (
              <Pill
                key={c.key}
                label={`${c.emoji} ${c.label}`}
                on={concern?.key === c.key}
                onPress={() => setConcern(concern?.key === c.key ? null : c)}
              />
            ))}
          </View>
          {concern && (
            <View style={s.pad}>
              {concern.ingredients.map((key) => {
                const meta = findIngredient(key);
                if (!meta) return null;
                const have = pills.some((p) => p.ingredients.some((i) => i.key === key));
                const product = PRODUCTS.find((p) => p.ingredients.some((i) => i.key === key));
                return (
                  <View key={key} style={s.cItem}>
                    <View style={s.cHead}>
                      <Text style={s.cName}>{meta.name}</Text>
                      {have && <Text style={s.cOwned}>이미 드시는 중</Text>}
                    </View>
                    <Text style={s.cClaim}>{FUNCTION_CLAIMS[key]}</Text>
                    {!have && product && (
                      <TouchableOpacity onPress={() => navigation.navigate('/add')} activeOpacity={0.7}>
                        <Text style={s.cAdd}>{product.emoji} {product.name} 넣기 ›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <Text style={s.note}>{CONCERN_DISCLAIMER}</Text>
            </View>
          )}
        </Block>

        {/* ⑤  기록 */}
        <Block no={5} title="이번 주 기록" desc={missed.length > 0 ? '놓친 것을 알려드려요' : undefined}>
          <View style={s.week}>
            {week.map((e) => {
              const its = e.record?.intakes ?? [];
              const done = its.length > 0 && its.every((i) => i.taken);
              const isToday = e.date === todayStr();
              const d = new Date(e.date.replace(/-/g, '/'));
              return (
                <View key={e.date} style={s.day}>
                  <View style={[s.dayDot, done && s.dayDotDone, isToday && !done && s.dayDotToday]}>
                    <Text style={s.dayMark}>{done ? '💊' : ''}</Text>
                  </View>
                  <Text style={[s.dayLabel, isToday && s.dayLabelToday]}>
                    {isToday ? '오늘' : DAY_NAMES[d.getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={s.pad}>
            {missed.length > 0 ? (
              missed.map(([label, n]) => (
                <Text key={label} style={s.missLine}>{label} <Text style={s.missN}>{n}번 거르셨어요</Text></Text>
              ))
            ) : (
              <Text style={s.emptyText}>이번 주는 잘 챙기고 계세요</Text>
            )}
          </View>
        </Block>

        {/* ⑥  병원용 */}
        <Block no={6} title="병원에서 보여주세요" desc="“무슨 영양제 드세요?” 물으면 이 화면을">
          <TouchableOpacity style={s.pad} onPress={() => setShowCard(!showCard)} activeOpacity={0.7}>
            <Text style={s.cardToggle}>{showCard ? '접기 ▲' : '펼쳐서 보기 ▼'}</Text>
          </TouchableOpacity>
          {showCard && (
            <View style={s.card}>
              {SLOTS.map((slot) => {
                const inSlot = pills.filter((p) => p.slots.includes(slot.key));
                if (inSlot.length === 0) return null;
                return (
                  <View key={slot.key} style={s.cardSlot}>
                    <Text style={s.cardSlotName}>{slot.emoji} {slot.label}</Text>
                    {inSlot.map((p) => (
                      <View key={p.id} style={s.cardPill}>
                        <Text style={s.cardPillName}>{p.name}</Text>
                        {p.ingredients.length > 0 && (
                          <Text style={s.cardPillIng}>
                            {p.ingredients
                              .map((ing) => {
                                const m = findIngredient(ing.key);
                                return m ? `${m.name} ${ing.amount}${m.unit}` : null;
                              })
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
              {result.over.length > 0 && (
                <Text style={s.cardWarn}>
                  상한 초과: {result.over.map((o) => `${o.name} ${o.intake}${o.unit}`).join(' · ')}
                </Text>
              )}
              <Text style={s.cardNote}>영양제만 적혀 있어요. 드시는 약은 따로 말씀해 주세요.</Text>
            </View>
          )}
        </Block>

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

const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 40 },
  ad: { width: '100%', minHeight: 96, overflow: 'hidden' },
  pad: { paddingHorizontal: PAD },

  intro: { flex: 1, paddingHorizontal: PAD, paddingTop: 76 },
  introTitle: { fontSize: 32, fontWeight: '800', color: TEXT, lineHeight: 45, letterSpacing: -0.6 },
  introDesc: { fontSize: T_SUB, color: TEXT_MUTED, lineHeight: 26, marginTop: 18, marginBottom: 46 },
  introBtn: {
    backgroundColor: PRIMARY, borderRadius: 18, paddingVertical: 21, alignItems: 'center', ...LIFT,
  },
  introBtnText: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },

  // ① 오늘
  nowWhen: { fontSize: T_SMALL, fontWeight: '800', color: PRIMARY, letterSpacing: 0.3, marginBottom: 8 },
  nowNames: { fontSize: 25, fontWeight: '800', color: TEXT, lineHeight: 35, letterSpacing: -0.4, marginBottom: 20 },
  bigBtn: { backgroundColor: PRIMARY, borderRadius: 18, paddingVertical: 21, alignItems: 'center', ...LIFT },
  bigBtnText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  doneText: { fontSize: 16, fontWeight: '700', color: PRIMARY, textAlign: 'center', paddingVertical: 14 },

  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: PAD, marginTop: 18 },
  slotChip: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: LINE, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  slotChipDone: { backgroundColor: PRIMARY_SOFT, borderColor: PRIMARY_SOFT },
  slotText: { fontSize: T_SMALL, fontWeight: '700', color: TEXT_SUB },
  slotTextDone: { color: PRIMARY },

  money: {
    marginHorizontal: PAD, marginTop: 18, backgroundColor: GOLD_BG,
    borderRadius: 18, paddingVertical: 18, alignItems: 'center',
  },
  moneyOff: { backgroundColor: SUNK },
  moneyText: { fontSize: 17, fontWeight: '800', color: GOLD_DARK, letterSpacing: -0.2 },

  // ② 내 영양제
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: PAD, paddingVertical: 17,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  rowEmoji: { fontSize: 25 },
  rowName: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  rowSub: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 4 },
  rowArrow: { fontSize: 11, color: TEXT_MUTED },
  edit: { paddingHorizontal: PAD, paddingVertical: 20, backgroundColor: SUNK },
  editLabel: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 0.6, marginBottom: 11 },
  editSlots: { flexDirection: 'row', gap: 7 },
  editIng: { fontSize: T_SMALL, color: TEXT_SUB, lineHeight: 21, marginTop: 16 },
  del: { fontSize: T_SUB, color: WARN, fontWeight: '700', marginTop: 20 },
  addBtn: {
    backgroundColor: SURFACE, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', marginTop: 20,
  },
  addBtnText: { fontSize: 17, fontWeight: '800', color: PRIMARY },

  // ③ 진단
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  legendText: { fontSize: 11, color: TEXT_MUTED, fontWeight: '700', letterSpacing: 0.4 },
  more: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY, textAlign: 'center', paddingVertical: 14 },
  conflict: {
    fontSize: T_SUB, color: GOLD_DARK, fontWeight: '600', lineHeight: 23, marginTop: 14,
    backgroundColor: GOLD_BG, padding: 15, borderRadius: 14,
  },
  missing: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 23, marginTop: 14 },
  note: { fontSize: T_SMALL, color: TEXT_MUTED, lineHeight: 20, marginTop: 16 },

  // ④ 고민
  concerns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: PAD },
  cItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: LINE },
  cHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 },
  cName: { fontSize: T_SUB, fontWeight: '800', color: TEXT },
  cOwned: {
    fontSize: 11, fontWeight: '800', color: PRIMARY,
    backgroundColor: PRIMARY_SOFT, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
  },
  cClaim: { fontSize: T_SMALL, color: TEXT_SUB, lineHeight: 21 },
  cAdd: { fontSize: T_SMALL, fontWeight: '800', color: PRIMARY, marginTop: 9 },

  // ⑤ 기록
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD, marginBottom: 20 },
  day: { alignItems: 'center', flex: 1 },
  dayDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  dayDotDone: { backgroundColor: PRIMARY_SOFT, borderColor: PRIMARY_SOFT },
  dayDotToday: { borderColor: PRIMARY, borderWidth: 2 },
  dayMark: { fontSize: 15 },
  dayLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },
  dayLabelToday: { color: PRIMARY, fontWeight: '800' },
  missLine: { fontSize: T_SUB, color: TEXT_SUB, lineHeight: 28 },
  missN: { fontWeight: '800', color: GOLD_DARK },

  // ⑥ 병원용
  cardToggle: { fontSize: T_SUB, fontWeight: '700', color: PRIMARY },
  card: {
    backgroundColor: SURFACE, marginTop: 16, marginHorizontal: PAD,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22, ...LIFT,
  },
  cardSlot: { marginBottom: 20 },
  cardSlotName: {
    fontSize: T_SMALL, fontWeight: '800', color: PRIMARY, letterSpacing: 0.3,
    marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  cardPill: { marginBottom: 11 },
  cardPillName: { fontSize: T_SUB, fontWeight: '700', color: TEXT },
  cardPillIng: { fontSize: T_SMALL, color: TEXT_SUB, lineHeight: 19, marginTop: 3 },
  cardWarn: { fontSize: T_SMALL, color: WARN, fontWeight: '700', lineHeight: 20 },
  cardNote: { fontSize: T_SMALL, color: TEXT_MUTED, marginTop: 16 },

  emptyText: { fontSize: T_SUB, color: TEXT_MUTED, lineHeight: 24, paddingHorizontal: PAD },
  promo: { marginTop: 36 },
});
