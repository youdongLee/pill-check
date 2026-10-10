import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { Pill, Intake } from '../data/types';
import { PRESET_TIMES } from '../data/constants';
import { formatKoreanDate } from '../data/utils';
import { AD_IDS, DAILY_AMOUNT, STREAK_AMOUNT } from '../src/ads';
import { useRewardAd } from '../src/useRewardAd';
import { DevPanel } from '../src/DevPanel';
import { SHOW_DEV_PANEL } from '../src/devFlags';

export const Route = createRoute('/', { component: HomePage });

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 32) / 3); // 32 = paddingHorizontal 16*2

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';
const PRIMARY_LIGHT = '#DCFCE7';

const NAME_PRESETS = ['종합 비타민', '비타민 B', '비타민 C', '비타민 D', '오메가3', '마그네슘', '칼슘'];
const ICONS = [
  { emoji: '💊', color: '#22C55E' },
  { emoji: '💉', color: '#3B82F6' },
  { emoji: '🏥', color: '#14B8A6' },
];
const UNITS = ['알', 'mg', 'ml'];

function HomePage() {
  const navigation = Route.useNavigation();
  const { pills, todayRecord, loading, toggleIntake, addPill, maxSlots, increaseSlot } = usePills();
  const stamp = useStamps();
  const { stamps, todayStamped, streakCount, canEarnStreak, streakDone, dailyPending, streakPending, paying } = stamp;

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);

  // 리워드 광고는 오늘 실제로 쓸 수 있을 때만 미리 불러온다:
  //  · 오늘 도장 전(영양제가 있을 때) · 7일 연속 도장 받을 차례 · 자리 추가 창을 연 동안
  const ad = useRewardAd(
    stamp.ready && ((pills.length > 0 && !todayStamped) || canEarnStreak || showSlotModal),
  );

  const onEarnedDaily = async () => {
    const ok = await stamp.earnDailyStamp();
    if (ok) Alert.alert('🏅 도장 획득!', `오늘의 복약 도장을 받았어요.
도장을 누르면 토스포인트 ${DAILY_AMOUNT}원을 받아요.`);
  };
  const onEarnedStreak = async () => {
    const ok = await stamp.earnStreakStamp();
    if (ok) Alert.alert('🏆 7일 연속 달성!', `7일 연속 도장을 받았어요.
도장을 누르면 토스포인트 ${STREAK_AMOUNT}원을 받아요.`);
  };
  const onClaimDaily = async () => {
    const ok = await stamp.claimDaily();
    if (ok) Alert.alert('🎉 적립 완료', `오늘의 복약 미션을 완료하고 토스포인트 ${DAILY_AMOUNT}원을 받았어요!`);
  };
  const onClaimStreak = async () => {
    const ok = await stamp.claimStreak();
    if (ok) Alert.alert('🏆 적립 완료', `7일 연속 복약 미션을 완료하고 토스포인트 ${STREAK_AMOUNT}원을 받았어요!`);
  };

  const handleWatchAd = () => {
    setShowSlotModal(false);
    ad.confirmAndPlay(
      { title: '영양제 슬롯 추가', message: '짧은 광고를 보고 슬롯을 1개 더 추가할 수 있어요.', confirm: '광고 보고 슬롯 추가하기' },
      async () => {
        await increaseSlot();
        Alert.alert('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.');
      },
    );
  };

  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [showCustomTimeField, setShowCustomTimeField] = useState(false);

  const finalName = isCustomName ? customName : selectedName;
  const usedSlots = pills.reduce((acc, p) => acc + p.times.length, 0);
  const availableSlots = maxSlots - usedSlots;
  const isValid = finalName.trim().length > 0 && selectedTimes.length > 0;

  const resetForm = () => {
    setSelectedName('');
    setCustomName('');
    setIsCustomName(false);
    setSelectedIcon(ICONS[0]);
    setSelectedUnit('');
    setDosageAmount('');
    setSelectedTimes([]);
    setCustomTimeInput('');
    setShowCustomTimeField(false);
  };

  const addCustomTime = () => {
    const t = customTimeInput.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return;
    if (selectedTimes.includes(t)) { setCustomTimeInput(''); setShowCustomTimeField(false); return; }
    if (availableSlots - selectedTimes.length <= 0) return;
    setSelectedTimes((prev) => [...prev, t]);
    setCustomTimeInput('');
    setShowCustomTimeField(false);
    Keyboard.dismiss();
  };

  const openQuickAdd = () => {
    resetForm();
    setShowQuickAdd(true);
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    if (selectedTimes.length > availableSlots) {
      Alert.alert(
        '슬롯이 부족해요',
        `선택한 시간대 ${selectedTimes.length}개 중 ${availableSlots}개 슬롯만 남아있어요.\n영양제 관리에서 광고를 보고 슬롯을 추가하세요.`,
        [
          { text: '취소', style: 'cancel' },
          { text: '슬롯 추가하러 가기', onPress: () => { setShowQuickAdd(false); navigation.navigate('/manage'); } },
        ]
      );
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    await addPill({
      name: finalName.trim(),
      emoji: selectedIcon.emoji,
      color: selectedIcon.color,
      dosageAmount: dosageAmount.trim() || undefined,
      dosageUnit: selectedUnit || undefined,
      times: [...selectedTimes].sort(),
    });
    setSaving(false);
    setShowQuickAdd(false);
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const activePillMap = useMemo(() => {
    const map = new Map<string, Pill>();
    pills.forEach((p) => map.set(p.id, p));
    return map;
  }, [pills]);

  const activeIntakes = useMemo(
    () => todayRecord.intakes.filter((i) => activePillMap.has(i.pillId)),
    [todayRecord.intakes, activePillMap]
  );

  const takenCount = activeIntakes.filter((i) => i.taken).length;
  const totalCount = activeIntakes.length;
  const progress = totalCount > 0 ? takenCount / totalCount : 0;
  const allDone = totalCount > 0 && takenCount === totalCount;
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  const today = stamp.today;

  const sortedIntakes = useMemo(
    () => [...activeIntakes].sort((a, b) => a.time.localeCompare(b.time)),
    [activeIntakes]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  const atSlotLimit = availableSlots <= 0;

  // 오늘 도장 버튼: 복용 체크를 다 했고 오늘 도장이 없을 때. 광고를 못 띄우는 환경이면 숨긴다(광고 없이 지급 없음).
  const showDailyAdBtn = allDone && !todayStamped && ad.supported;
  const showStreakAdBtn = canEarnStreak && !dailyPending && ad.supported;
  const allPaidToday = todayStamped && !dailyPending && !streakPending && !canEarnStreak;

  return (
    <SafeAreaView style={styles.container}>
      {/* 최상단 배너 (라이브와 동일) */}
      <View style={styles.banner}>
        <InlineAd adGroupId={AD_IDS.banner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{formatKoreanDate(today)}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('/preset')} activeOpacity={0.7} style={styles.planBadge}>
          <Text style={styles.planBadgeText}>내 플랜</Text>
        </TouchableOpacity>
      </View>

      {/* 메인 점선 카드 */}
      <View style={styles.mainCard}>
        {/* 진행 상황 */}
        <View style={styles.progressSlot}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressCount}>
              {takenCount} / {totalCount === 0 ? '0' : totalCount}
            </Text>
            <Text style={styles.progressLabel}>
              {allDone && totalCount > 0 ? '🎉 모두 복용 완료!' : '복약 완료'}
            </Text>
          </View>
          <View style={styles.progressBarWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>

        {/* 미션 도장 (카드 내부) */}
        {(pills.length > 0 || stamps.length > 0) && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.stampInCard}>
              <View style={styles.stampHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.stampTitle}>미션 도장</Text>
                  <Text style={styles.stampRewardHint}>{`복약완료+${DAILY_AMOUNT}원 · 7일연속+${STREAK_AMOUNT}원`}</Text>
                </View>
                {stamps.length > 0 && (
                  <Text style={styles.streakBadge}>🔥 {streakCount}일 연속</Text>
                )}
              </View>
              <View style={styles.stampGrid}>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = stamps[i];
                  const stamped = i < stamps.length;
                  const isTodaySlot = !todayStamped && i === stamps.length;
                  let label = '';
                  if (!date) label = isTodaySlot ? '오늘' : '';
                  else if (date === today) label = '오늘';
                  else label = DAY_NAMES[new Date(date.replace(/-/g, '/')).getDay()];
                  return (
                    <View key={i} style={styles.stampDayCol}>
                      <View style={[styles.stampCircle, stamped && styles.stampCircleDone, isTodaySlot && styles.stampCircleToday]}>
                        <Text style={styles.stampCircleText}>{stamped ? '🏅' : ''}</Text>
                      </View>
                      <Text style={[styles.stampDayLabel, isTodaySlot && { color: PRIMARY_DARK, fontWeight: '700' }]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {showDailyAdBtn && (
                <TouchableOpacity
                  style={[styles.stampActionBtn, !ad.loaded && styles.stampActionBtnDisabled]}
                  onPress={() =>
                    ad.confirmAndPlay(
                      {
                        title: '오늘의 도장 받기',
                        message: `짧은 광고를 보고 오늘의 복약 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${DAILY_AMOUNT}원을 받아요.`,
                        confirm: '광고 보고 도장 받기',
                      },
                      onEarnedDaily,
                    )
                  }
                  disabled={!ad.loaded || ad.playing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stampActionBtnText}>
                    {ad.loaded ? '🎯 광고 보고 오늘 도장 받기' : '광고 준비 중...'}
                  </Text>
                </TouchableOpacity>
              )}
              {dailyPending && (
                <TouchableOpacity
                  style={[styles.stampActionBtn, paying && styles.stampActionBtnDisabled]}
                  onPress={onClaimDaily}
                  disabled={paying}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stampActionBtnText}>{`🏅 도장 눌러서 ${DAILY_AMOUNT}원 받기`}</Text>
                </TouchableOpacity>
              )}
              {todayStamped && !dailyPending && !canEarnStreak && !streakPending && !streakDone && (
                <View style={styles.stampDoneRow}>
                  <Text style={styles.stampDoneText}>🏅 오늘 도장 완료!</Text>
                </View>
              )}
              {streakDone && (
                <View style={styles.stampDoneRow}>
                  <Text style={styles.stampDoneText}>🏆 7일 연속 보상 수령 완료!</Text>
                </View>
              )}
              {showStreakAdBtn && (
                <TouchableOpacity
                  style={[styles.streakActionBtn, !ad.loaded && styles.stampActionBtnDisabled]}
                  onPress={() =>
                    ad.confirmAndPlay(
                      {
                        title: '7일 연속 달성!',
                        message: `짧은 광고를 보고 7일 연속 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${STREAK_AMOUNT}원을 받아요.`,
                        confirm: '광고 보고 도장 받기',
                      },
                      onEarnedStreak,
                    )
                  }
                  disabled={!ad.loaded || ad.playing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streakActionBtnText}>
                    {ad.loaded ? '🏆 7일 연속! 광고 보고 도장 받기' : '광고 준비 중...'}
                  </Text>
                </TouchableOpacity>
              )}
              {streakPending && !dailyPending && (
                <TouchableOpacity
                  style={[styles.streakActionBtn, paying && styles.stampActionBtnDisabled]}
                  onPress={onClaimStreak}
                  disabled={paying}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streakActionBtnText}>{`🏆 7일 연속 도장 눌러서 ${STREAK_AMOUNT}원 받기`}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

      </View>

      {/* 영양제 추가 버튼 */}
      {!atSlotLimit ? (
        <TouchableOpacity style={styles.addPillBtn} onPress={openQuickAdd} activeOpacity={0.85}>
          <Text style={styles.addPillBtnPlus}>+</Text>
          <Text style={styles.addPillBtnText}>영양제 추가하기</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.addPillBtnLocked} onPress={() => setShowSlotModal(true)} activeOpacity={0.85}>
          <Text style={styles.addPillBtnLockedIcon}>🔒</Text>
          <Text style={styles.addPillBtnLockedText}>슬롯이 꽉 찼어요 · 광고 보고 추가하기</Text>
        </TouchableOpacity>
      )}

      {/* 복약 체크 리스트 */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 오늘 도장·지급까지 다 끝난 뒤에만 보이는 이미지 광고 (체크하는 동안은 목록을 밀어내지 않는다) */}
        {allPaidToday && sortedIntakes.length > 0 && (
          <View style={styles.imageAdWrap}>
            <InlineAd adGroupId={AD_IDS.homeDoneImage} theme="light" tone="grey" variant="card" impressFallbackOnMount={true} />
          </View>
        )}
        {sortedIntakes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyTitle}>등록된 영양제가 없어요</Text>
            <Text style={styles.emptyDesc}>아래 버튼으로{'\n'}영양제를 추가해보세요</Text>
          </View>
        ) : (
          <View style={styles.pillGrid}>
            {sortedIntakes.map((intake) => {
              const pill = activePillMap.get(intake.pillId);
              if (!pill) return null;
              return (
                <PillGridItem
                  key={`${intake.pillId}-${intake.time}`}
                  pill={pill}
                  intake={intake}
                  onToggle={toggleIntake}
                />
              );
            })}
          </View>
        )}
        {/* 복용 목록 아래 이미지 광고 */}
        <View style={styles.imageAdWrap}>
          <InlineAd adGroupId={AD_IDS.homeImage} theme="light" tone="grey" variant="card" impressFallbackOnMount={true} />
        </View>
        {SHOW_DEV_PANEL && <DevPanel />}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* 배너 광고 */}
      <View style={styles.banner}>
        <InlineAd adGroupId={AD_IDS.banner} theme="light" tone="grey" variant="expanded" impressFallbackOnMount={true} />
      </View>

      {/* 영양제 관리 */}
      <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate('/manage')} activeOpacity={0.85}>
        <Text style={styles.manageButtonText}>영양제 관리 (수정/삭제)</Text>
      </TouchableOpacity>

{/* 슬롯 부족 모달 */}
      <Modal visible={showSlotModal} transparent animationType="fade" onRequestClose={() => setShowSlotModal(false)}>
        <TouchableOpacity style={slotModalStyles.overlay} activeOpacity={1} onPress={() => setShowSlotModal(false)}>
          <TouchableOpacity style={slotModalStyles.card} activeOpacity={1}>
            <Text style={slotModalStyles.emoji}>🎁</Text>
            <Text style={slotModalStyles.title}>영양제 슬롯이 꽉 찼어요</Text>
            <Text style={slotModalStyles.desc}>
              현재 최대 {maxSlots}개까지 등록할 수 있어요.{'\n'}
              짧은 광고를 시청하면 슬롯을 1개 더 추가할 수 있어요.
            </Text>
            <TouchableOpacity
              style={[slotModalStyles.watchBtn, !ad.loaded && slotModalStyles.watchBtnDisabled]}
              onPress={handleWatchAd}
              disabled={!ad.loaded}
              activeOpacity={0.85}
            >
              <Text style={slotModalStyles.watchBtnText}>
                {ad.loaded ? '광고 보고 슬롯 추가하기' : '광고 준비 중...'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={slotModalStyles.cancelBtn} onPress={() => setShowSlotModal(false)} activeOpacity={0.7}>
              <Text style={slotModalStyles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 빠른 추가 팝업 */}
      <Modal visible={showQuickAdd} transparent animationType="slide" onRequestClose={() => setShowQuickAdd(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowQuickAdd(false); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHandle} />
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>영양제 추가</Text>

                    {/* 이름 */}
                    <Text style={styles.fieldLabel}>이름</Text>
                    <View style={styles.chipWrap}>
                      {NAME_PRESETS.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.chip, !isCustomName && selectedName === n && styles.chipSelected]}
                          onPress={() => { setSelectedName(n); setIsCustomName(false); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, !isCustomName && selectedName === n && styles.chipTextSelected]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[styles.chip, isCustomName && styles.chipSelected]}
                        onPress={() => { setIsCustomName(true); setSelectedName(''); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isCustomName && styles.chipTextSelected]}>직접입력</Text>
                      </TouchableOpacity>
                    </View>
                    {isCustomName && (
                      <TextInput
                        style={styles.nameInput}
                        placeholder="영양제 이름 입력"
                        placeholderTextColor="#9CA3AF"
                        value={customName}
                        onChangeText={setCustomName}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        autoFocus
                      />
                    )}

                    {/* 아이콘 */}
                    <Text style={styles.fieldLabel}>아이콘</Text>
                    <View style={styles.iconRow}>
                      {ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon.emoji}
                          style={[styles.iconChip, selectedIcon.emoji === icon.emoji && { borderColor: icon.color, backgroundColor: icon.color + '18' }]}
                          onPress={() => setSelectedIcon(icon)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 개수/단위 */}
                    <Text style={styles.fieldLabel}>단위 <Text style={styles.optional}>(선택)</Text></Text>
                    <View style={styles.dosageRow}>
                      <TextInput
                        style={styles.dosageAmountInput}
                        placeholder="수량"
                        placeholderTextColor="#9CA3AF"
                        value={dosageAmount}
                        onChangeText={setDosageAmount}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      {UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.unitChip, selectedUnit === unit && styles.unitChipSelected]}
                          onPress={() => { setSelectedUnit(selectedUnit === unit ? '' : unit); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.unitChipText, selectedUnit === unit && styles.unitChipTextSelected]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 시간 */}
                    <Text style={styles.fieldLabel}>
                      복용 시간{'  '}
                      <Text style={[styles.optional, availableSlots - selectedTimes.length < 0 && { color: '#EF4444' }]}>
                        (잔여 슬롯 {Math.max(0, availableSlots - selectedTimes.length)}개)
                      </Text>
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeChipWrap}>
                      {PRESET_TIMES.map(({ label, time }) => {
                        const sel = selectedTimes.includes(time);
                        const noSlotLeft = !sel && availableSlots - selectedTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[styles.timeChip, sel && styles.timeChipSelected, noSlotLeft && styles.timeChipDisabled]}
                            onPress={() => { if (!noSlotLeft) { toggleTime(time); Keyboard.dismiss(); } }}
                            activeOpacity={noSlotLeft ? 1 : 0.7}
                          >
                            <Text style={[styles.timeChipLabel, sel && styles.timeChipLabelSelected, noSlotLeft && styles.timeChipLabelDisabled]}>{label}</Text>
                            <Text style={[styles.timeChipTime, sel && styles.timeChipTimeSelected, noSlotLeft && styles.timeChipLabelDisabled]}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {selectedTimes.filter((t) => !PRESET_TIMES.some((p) => p.time === t)).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.timeChip, styles.timeChipSelected]}
                          onPress={() => toggleTime(t)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.timeChipLabel, styles.timeChipLabelSelected]}>직접 입력</Text>
                          <Text style={[styles.timeChipTime, styles.timeChipTimeSelected]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                      {(() => {
                        const noSlot = availableSlots - selectedTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            style={[styles.timeChip, showCustomTimeField && styles.timeChipSelected, noSlot && styles.timeChipDisabled]}
                            onPress={() => { if (!noSlot) setShowCustomTimeField(true); }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[styles.timeChipLabel, showCustomTimeField && styles.timeChipLabelSelected, noSlot && styles.timeChipLabelDisabled]}>직접 입력</Text>
                            <Text style={[styles.timeChipTime, showCustomTimeField && styles.timeChipTimeSelected, noSlot && styles.timeChipLabelDisabled]}>+ 추가</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </ScrollView>
                    {showCustomTimeField && (
                      <View style={styles.customTimeRow}>
                        <TextInput
                          style={styles.customTimeInput}
                          placeholder="HH:MM"
                          placeholderTextColor="#9CA3AF"
                          value={customTimeInput}
                          onChangeText={setCustomTimeInput}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          returnKeyType="done"
                          onSubmitEditing={addCustomTime}
                          autoFocus
                        />
                        <TouchableOpacity style={styles.customTimeAddBtn} onPress={addCustomTime} activeOpacity={0.8}>
                          <Text style={styles.customTimeAddBtnText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* 저장 */}
                    <TouchableOpacity
                      style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={!isValid || saving}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 8 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function PillGridItem({ pill, intake, onToggle }: {
  pill: Pill;
  intake: Intake;
  onToggle: (pillId: string, time: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.gridCell}
      onPress={() => onToggle(intake.pillId, intake.time)}
      activeOpacity={0.7}
    >
      <View style={[styles.gridCard, intake.taken && styles.gridCardTaken, { borderColor: pill.color + '50' }]}>
        {/* 아이콘 위: 시간 */}
        <Text style={[styles.gridTimeText, intake.taken && styles.gridTimeTextTaken]}>
          {intake.time}
        </Text>
        {/* 아이콘 */}
        <View style={[styles.gridEmojiWrap, { backgroundColor: pill.color + '22' }]}>
          <Text style={styles.gridEmoji}>{pill.emoji}</Text>
          {intake.taken && (
            <View style={styles.gridCheckBadge}>
              <Text style={styles.gridCheckText}>✓</Text>
            </View>
          )}
        </View>
        {/* 아이콘 아래: 이름 + 용량 */}
        <Text style={[styles.gridName, intake.taken && styles.gridNameTaken]} numberOfLines={2}>
          {pill.name}
        </Text>
        <Text style={styles.gridDosage}>{pill.dosageAmount && pill.dosageUnit ? `${pill.dosageAmount}${pill.dosageUnit}` : ' '}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {flex: 1, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center'},
  container: {flex: 1, backgroundColor: '#F0FDF4'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4},
  headerDate: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  planBadge: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#22C55E', backgroundColor: '#DCFCE7'},
  planBadgeText: {fontSize: 13, color: '#16A34A', fontWeight: '700'},
  mainCard: {marginHorizontal: 16, marginBottom: 6, borderWidth: 1.5, borderColor: '#22C55E', borderStyle: 'dashed', borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden'},
  progressSlot: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12},
  progressLeft: {minWidth: 80},
  progressCount: {fontSize: 20, fontWeight: '800', color: '#16A34A'},
  progressLabel: {fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 2},
  progressBarWrap: {flex: 1},
  progressTrack: {height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden'},
  progressFill: {height: 6, backgroundColor: '#22C55E', borderRadius: 3},
  cardDivider: {height: 1, backgroundColor: '#F0FDF4', marginHorizontal: 12},
  pillChipRow: {paddingHorizontal: 12, paddingVertical: 12, gap: 8, alignItems: 'center'},
  pillChip: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', flexDirection: 'row', gap: 6},
  pillChipEmoji: {fontSize: 16},
  pillChipName: {fontSize: 13, fontWeight: '600', color: '#374151', maxWidth: 80},
  pillChipDosage: {fontSize: 11, color: '#9CA3AF'},
  addPillBtn: {marginHorizontal: 16, marginBottom: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: '#22C55E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  addPillBtnPlus: {fontSize: 20, color: '#FFFFFF', lineHeight: 24, fontWeight: '700'},
  addPillBtnText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF'},
  addPillBtnLocked: {marginHorizontal: 16, marginBottom: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  addPillBtnLockedIcon: {fontSize: 16},
  addPillBtnLockedText: {fontSize: 14, fontWeight: '600', color: '#9CA3AF'},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 16, paddingTop: 6},
  pillGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  gridCell: {width: GRID_CELL_WIDTH, paddingHorizontal: 4, paddingBottom: 8},
  gridCard: {backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center'},
  gridCardTaken: {backgroundColor: '#DCFCE7'},
  gridTimeText: {fontSize: 10, fontWeight: '700', color: '#9CA3AF', marginBottom: 6},
  gridTimeTextTaken: {color: '#16A34A'},
  gridEmojiWrap: {width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative'},
  gridEmoji: {fontSize: 20},
  gridCheckBadge: {position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF'},
  gridCheckText: {fontSize: 7, color: '#FFFFFF', fontWeight: '800'},
  gridName: {fontSize: 10, fontWeight: '600', color: '#111827', textAlign: 'center'},
  gridNameTaken: {color: '#6B7280', textDecorationLine: 'line-through'},
  gridDosage: {fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2},
  emptyState: {alignItems: 'center', paddingTop: 40},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8},
  emptyDesc: {fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22},
  stampInCard: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8},
  stampHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  stampTitle: {fontSize: 15, fontWeight: '700', color: '#111827'},
  stampRewardHint: {fontSize: 10, color: '#9CA3AF'},
  streakBadge: {fontSize: 13, fontWeight: '700', color: '#F59E0B'},
  stampGrid: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12},
  stampDayCol: {alignItems: 'center', flex: 1},
  stampCircle: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  stampCircleDone: {backgroundColor: '#DCFCE7', borderColor: '#22C55E'},
  stampCircleToday: {borderColor: '#22C55E', borderWidth: 2},
  stampCircleText: {fontSize: 18},
  stampDayLabel: {fontSize: 11, color: '#9CA3AF', fontWeight: '500'},
  stampActionBtn: {backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 12, alignItems: 'center'},
  stampActionBtnDisabled: {backgroundColor: '#D1D5DB'},
  stampActionBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  stampDoneRow: {alignItems: 'center', paddingVertical: 6},
  stampDoneText: {fontSize: 14, color: '#6B7280', fontWeight: '500'},
  streakActionBtn: {backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8},
  streakActionBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  banner: {width: '100%', height: 96, overflow: 'hidden'},
  // 이미지(피드형) 광고는 세로가 길어 높이를 고정하지 않는다
  imageAdWrap: {width: '100%', marginTop: 4, marginBottom: 8},
  manageButton: {marginHorizontal: 20, marginBottom: 16, marginTop: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center'},
  manageButtonText: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalCard: {backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, maxHeight: '90%'},
  modalHandle: {width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16},
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20},
  fieldLabel: {fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4},
  optional: {fontWeight: '400', color: '#9CA3AF'},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8},
  chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent'},
  chipSelected: {backgroundColor: '#DCFCE7', borderColor: '#22C55E'},
  chipText: {fontSize: 13, fontWeight: '600', color: '#4B5563'},
  chipTextSelected: {color: '#16A34A'},
  nameInput: {backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 4},
  iconRow: {flexDirection: 'row', gap: 10, marginBottom: 4},
  iconChip: {flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
  iconEmoji: {fontSize: 24},
  dosageRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4},
  dosageAmountInput: {width: 72, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', textAlign: 'center'},
  unitChip: {flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center'},
  unitChipSelected: {backgroundColor: '#DCFCE7', borderColor: '#22C55E'},
  unitChipText: {fontSize: 13, fontWeight: '600', color: '#4B5563'},
  unitChipTextSelected: {color: '#16A34A'},
  timeChipWrap: {flexDirection: 'row', gap: 8, paddingBottom: 20, paddingRight: 4},
  timeChip: {width: 76, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center'},
  timeChipSelected: {backgroundColor: '#DCFCE7', borderColor: '#22C55E'},
  timeChipLabel: {fontSize: 12, fontWeight: '600', color: '#4B5563'},
  timeChipLabelSelected: {color: '#16A34A'},
  timeChipTime: {fontSize: 11, color: '#9CA3AF'},
  timeChipTimeSelected: {color: '#22C55E'},
  timeChipDisabled: {backgroundColor: '#F3F4F6', borderColor: 'transparent', opacity: 0.4},
  timeChipLabelDisabled: {color: '#9CA3AF'},
  customTimeRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  customTimeInput: {flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827'},
  customTimeAddBtn: {backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11},
  customTimeAddBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  saveButton: {backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15, alignItems: 'center'},
  saveButtonDisabled: {backgroundColor: '#D1D5DB'},
  saveButtonText: {fontSize: 16, fontWeight: '700', color: '#FFFFFF'},
});

const slotModalStyles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center'},
  card: {width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center'},
  emoji: {fontSize: 48, marginBottom: 12},
  title: {fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10},
  desc: {fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24},
  watchBtn: {width: '100%', backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10},
  watchBtnDisabled: {backgroundColor: '#D1D5DB'},
  watchBtnText: {fontSize: 15, fontWeight: '700', color: '#FFFFFF'},
  cancelBtn: {width: '100%', paddingVertical: 12, alignItems: 'center'},
  cancelBtnText: {fontSize: 14, color: '#9CA3AF', fontWeight: '500'},
});
