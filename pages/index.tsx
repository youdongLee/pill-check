import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Pill, Intake, normalizeRecord } from '../data/types';
import { PRESET_TIMES } from '../data/constants';
import { formatKoreanDate, todayStr } from '../data/utils';
import { AD_IDS, PROMO } from '../src/ads';
import { grantReward } from '../src/reward';
import { useRewardAd } from '../src/useRewardAd';
import {
  COMPLETION_BONUS, INTAKE_REWARD, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, STREAK_BONUS, STREAK_DAYS,
} from '../src/theme';

export const Route = createRoute('/', { component: HomePage });

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 32) / 3); // 32 = paddingHorizontal 16*2

const NAME_PRESETS = ['종합 비타민', '비타민 B', '비타민 C', '비타민 D', '오메가3', '마그네슘', '칼슘'];
const ICONS = [
  { emoji: '💊', color: '#22C55E' },
  { emoji: '💉', color: '#3B82F6' },
  { emoji: '🏥', color: '#14B8A6' },
];
const UNITS = ['알', 'mg', 'ml'];

function HomePage() {
  const navigation = Route.useNavigation();
  const {
    pills, todayRecord, loading, toggleIntake, addPill, maxSlots, increaseSlot,
    issueStamp, claimStamp, claimCompletionBonus,
  } = usePills();
  const { currentStreak, canClaimStreakReward, markTodayComplete, claimStreakReward } = useStamps();

  const { adLoaded, playing, show } = useRewardAd(AD_IDS.reward);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);

  const record = normalizeRecord(todayRecord);

  /**
   * 목돈식 지급 분리:
   *  - 광고는 스탬프 "발급"까지만 (여기서는 포인트를 주지 않는다)
   *  - 포인트 "지급"은 유저가 스탬프를 직접 탭할 때
   *  - 보너스 2종은 광고 없이 탭 지급 (광고=지급 직결 구조를 끊는다)
   */
  const onIssueStamp = () => {
    show(async () => {
      await issueStamp();
    });
  };

  const onClaimStamp = async () => {
    const ok = await claimStamp();
    if (ok) await grantReward(PROMO.intake, INTAKE_REWARD);
  };

  const onClaimCompletion = async () => {
    const ok = await claimCompletionBonus();
    if (ok) await grantReward(PROMO.bonus, COMPLETION_BONUS);
  };

  const onClaimStreak = async () => {
    const ok = await claimStreakReward();
    if (ok) await grantReward(PROMO.streak, STREAK_BONUS);
  };

  const handleWatchAd = () => {
    setShowSlotModal(false);
    show(async () => {
      await increaseSlot();
      Alert.alert('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.');
    });
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

  // 스탬프 3상태: 수령완료(✓) / 미수령(₩, 탭하면 지급) / 미발급(광고를 봐야 발급)
  const stampSlots = Math.max(totalCount, record.stamped);
  const earnableStamps = Math.max(0, takenCount - record.stamped);
  const unclaimedStamps = Math.max(0, record.stamped - record.claimedStamps);

  // 전량 복용을 채우면 연속 기록용 완주일로 남긴다 (광고 없음)
  useEffect(() => {
    if (allDone) markTodayComplete();
    // markTodayComplete는 매 렌더 새 참조라 deps에서 제외한다(내부에서 중복 기록을 막는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  // 미수령 스탬프 아래 👆 손가락 — 5060 타깃, 탭 대상을 직관적으로
  const fingerBounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (unclaimedStamps === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fingerBounce, { toValue: -4, duration: 380, useNativeDriver: true }),
        Animated.timing(fingerBounce, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [unclaimedStamps, fingerBounce]);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{formatKoreanDate(todayStr())}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('/preset')} activeOpacity={0.7}>
          <Text style={styles.historyLink}>내 플랜</Text>
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

        {/* 복용 스탬프 (카드 내부) — 광고=발급, 탭=지급 */}
        {stampSlots > 0 && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.stampInCard}>
              <View style={styles.stampHeader}>
                <Text style={styles.stampTitle}>복용 스탬프</Text>
                {currentStreak > 0 && (
                  <Text style={styles.streakBadge}>🔥 {currentStreak}일 연속</Text>
                )}
              </View>

              {/* 스탬프 판: 수령완료(✓) / 미수령(₩, 탭 지급 — 아래 👆 표시) / 미발급(빈칸) */}
              <View style={styles.stampGrid}>
                {Array.from({ length: stampSlots }).map((_, i) => {
                  const isClaimed = i < record.claimedStamps;
                  const isReady = !isClaimed && i < record.stamped;
                  return (
                    <View key={i} style={styles.stampSlot}>
                      <TouchableOpacity
                        disabled={!isReady}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 20, left: 4, right: 4 }}
                        onPress={onClaimStamp}
                        style={[styles.stampCircle, isClaimed && styles.stampCircleDone, isReady && styles.stampCircleReady]}
                      >
                        <Text style={[styles.stampCircleText, isReady && styles.stampCircleTextReady]}>
                          {isClaimed ? '✓' : isReady ? '₩' : ''}
                        </Text>
                      </TouchableOpacity>
                      {/* 손가락 자리는 항상 확보(줄 높이 고정), 미수령일 때만 보임 */}
                      <Animated.Text
                        style={[
                          styles.stampFinger,
                          { opacity: isReady ? 1 : 0, transform: [{ translateY: fingerBounce }] },
                        ]}
                      >
                        👆
                      </Animated.Text>
                    </View>
                  );
                })}
              </View>

              {unclaimedStamps > 0 && (
                <Text style={styles.stampHint}>
                  👆 스탬프 {unclaimedStamps}개를 누르면 개당 {INTAKE_REWARD}원!
                </Text>
              )}

              {/* 광고 = 스탬프 발급 (지급 아님) */}
              {earnableStamps > 0 && (
                <TouchableOpacity
                  style={[styles.stampActionBtn, (playing || !adLoaded) && styles.stampActionBtnDisabled]}
                  onPress={onIssueStamp}
                  disabled={playing || !adLoaded}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stampActionBtnText}>
                    {playing ? '광고 재생 중...' : adLoaded ? `📺 광고 보고 스탬프 받기 (${earnableStamps}개 대기)` : '광고 준비 중...'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* 보너스 2종 = 광고 없이 탭 지급 */}
              {allDone && !record.bonusClaimed && (
                <TouchableOpacity style={styles.bonusBtn} onPress={onClaimCompletion} activeOpacity={0.85}>
                  <Text style={styles.bonusBtnTitle}>🎁 오늘 전부 복용 완료!</Text>
                  <Text style={styles.bonusBtnSub}>{`탭해서 ${COMPLETION_BONUS}원 받기`}</Text>
                </TouchableOpacity>
              )}
              {canClaimStreakReward && (
                <TouchableOpacity style={styles.streakActionBtn} onPress={onClaimStreak} activeOpacity={0.85}>
                  <Text style={styles.bonusBtnTitle}>🏆 {STREAK_DAYS}일 연속 복용 달성!</Text>
                  <Text style={styles.bonusBtnSub}>{`탭해서 ${STREAK_BONUS}원 받기`}</Text>
                </TouchableOpacity>
              )}
              {allDone && record.bonusClaimed && !canClaimStreakReward && earnableStamps === 0 && unclaimedStamps === 0 && (
                <View style={styles.stampDoneRow}>
                  <Text style={styles.stampDoneText}>🎉 오늘 몫은 모두 받았어요</Text>
                </View>
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
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* 배너 광고 */}
      <View style={styles.banner}>
        <InlineAd
          adGroupId={AD_IDS.homeBanner}
          theme="light"
          tone="grey"
          variant="expanded"
          impressFallbackOnMount={true}
        />
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
              style={[slotModalStyles.watchBtn, !adLoaded && slotModalStyles.watchBtnDisabled]}
              onPress={handleWatchAd}
              disabled={!adLoaded}
              activeOpacity={0.85}
            >
              <Text style={slotModalStyles.watchBtnText}>
                {adLoaded ? '광고 보고 슬롯 추가하기' : '광고 준비 중...'}
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
  loadingContainer: { flex: 1, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F0FDF4' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerDate: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  historyLink: { fontSize: 14, color: PRIMARY_DARK, fontWeight: '600' },

  // 메인 점선 카드 (가로 꽉 차게)
  mainCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  // 기본 슬롯: 진행 상황
  progressSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  progressLeft: { minWidth: 80 },
  progressCount: { fontSize: 20, fontWeight: '800', color: PRIMARY_DARK },
  progressLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 2 },
  progressBarWrap: { flex: 1 },
  progressTrack: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: PRIMARY, borderRadius: 3 },

  cardDivider: { height: 1, backgroundColor: '#F0FDF4', marginHorizontal: 12 },

  // 영양제 칩 행
  pillChipRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  pillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillChipEmoji: { fontSize: 16 },
  pillChipName: { fontSize: 13, fontWeight: '600', color: '#374151', maxWidth: 80 },
  pillChipDosage: { fontSize: 11, color: '#9CA3AF' },

  // 와이드 영양제 추가 버튼
  addPillBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPillBtnPlus: { fontSize: 20, color: '#FFFFFF', lineHeight: 24, fontWeight: '700' },
  addPillBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  addPillBtnLocked: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPillBtnLockedIcon: { fontSize: 16 },
  addPillBtnLockedText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  // 복약 그리드
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: {
    width: GRID_CELL_WIDTH,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  gridCardTaken: {
    backgroundColor: PRIMARY_LIGHT,
  },
  gridTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  gridTimeTextTaken: { color: PRIMARY_DARK },
  gridEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  gridEmoji: { fontSize: 26 },
  gridCheckBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gridCheckText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  gridName: { fontSize: 11, fontWeight: '600', color: '#111827', textAlign: 'center' },
  gridNameTaken: { color: '#6B7280', textDecorationLine: 'line-through' },
  gridDosage: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },

  // 복용 스탬프 섹션 (카드 내부)
  stampInCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stampHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stampTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  streakBadge: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4 },
  stampSlot: { alignItems: 'center', width: 46 },
  stampCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampCircleDone: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  // 미수령 = 눈에 띄게(금색), 탭 유도
  stampCircleReady: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 2 },
  stampCircleText: { fontSize: 16, fontWeight: '800', color: PRIMARY_DARK },
  stampCircleTextReady: { color: '#B45309' },
  stampFinger: { fontSize: 14, height: 20, lineHeight: 20 },
  stampHint: { fontSize: 13, fontWeight: '700', color: '#B45309', textAlign: 'center', marginBottom: 10 },
  stampActionBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  stampActionBtnDisabled: { backgroundColor: '#D1D5DB' },
  stampActionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  stampDoneRow: { alignItems: 'center', paddingVertical: 6 },
  stampDoneText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  bonusBtn: { backgroundColor: PRIMARY_DARK, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  bonusBtnTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  bonusBtnSub: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', opacity: 0.9, marginTop: 2 },
  streakActionBtn: { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8 },

  banner: { width: '100%', height: 96, overflow: 'hidden' },

  manageButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  manageButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  // 팝업
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  optional: { fontWeight: '400', color: '#9CA3AF' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextSelected: { color: PRIMARY_DARK },

  nameInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },

  iconRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  iconChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 24 },

  dosageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dosageAmountInput: {
    width: 72,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    textAlign: 'center',
  },
  unitChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  unitChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  unitChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  unitChipTextSelected: { color: PRIMARY_DARK },

  timeChipWrap: { flexDirection: 'row', gap: 8, paddingBottom: 20, paddingRight: 4 },
  timeChip: {
    width: 76,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  timeChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  timeChipLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  timeChipLabelSelected: { color: PRIMARY_DARK },
  timeChipTime: { fontSize: 11, color: '#9CA3AF' },
  timeChipTimeSelected: { color: PRIMARY },
  timeChipDisabled: { backgroundColor: '#F3F4F6', borderColor: 'transparent', opacity: 0.4 },
  timeChipLabelDisabled: { color: '#9CA3AF' },

  customTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  customTimeInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827' },
  customTimeAddBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  customTimeAddBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  saveButton: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#D1D5DB' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

const slotModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  desc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  watchBtn: { width: '100%', backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  watchBtnDisabled: { backgroundColor: '#D1D5DB' },
  watchBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
