import { createRoute } from '@granite-js/react-native';
import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { formatKoreanDate, todayStr, getDatesBack } from '../data/utils';

export const Route = createRoute('/', { component: HomePage });

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 32) / 3); // 32 = paddingHorizontal 16*2

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';
const PRIMARY_LIGHT = '#DCFCE7';

const REWARD_AD_ID = 'ait.v2.live.7848babf27974479';
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
  const { stamps, todayStamped, currentStreak, canClaimStreakReward, earnTodayStamp, claimStreakReward } = useStamps();

  const adSupported = loadFullScreenAd.isSupported();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [adLoaded, setAdLoaded] = useState(!adSupported); // dev: treat as loaded
  const pendingReward = useRef<'slot' | 'stamp' | 'streak' | null>(null);

  useEffect(() => {
    if (!loadFullScreenAd.isSupported()) return;
    const unregister = loadFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: (event) => { if (event.type === 'loaded') setAdLoaded(true); },
      onError: () => setAdLoaded(false),
    });
    return () => unregister();
  }, []);

  const loadNextAd = () => {
    if (!loadFullScreenAd.isSupported()) return;
    setAdLoaded(false);
    loadFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: (event) => { if (event.type === 'loaded') setAdLoaded(true); },
      onError: () => setAdLoaded(false),
    });
  };

  const showRewardAd = async (action: 'slot' | 'stamp' | 'streak') => {
    if (!adSupported) {
      // 개발 환경: 광고 없이 바로 실행
      if (action === 'slot') { await increaseSlot(); Alert.alert('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.'); }
      else if (action === 'stamp') { await earnTodayStamp(); Alert.alert('🏅 도장 획득!', '오늘의 복약 미션을 완료했어요!'); }
      else if (action === 'streak') {
        await claimStreakReward();
        try { await grantPromotionReward({ params: { promotionCode: 'PILLCHECK_STREAK_7', amount: 5 } }); Alert.alert('🏆 토스포인트 5p 지급!', '7일 연속 복약 미션을 완료했어요!'); }
        catch { Alert.alert('🏆 7일 연속 달성!', '포인트 지급은 잠시 후 자동으로 처리돼요.'); }
      }
      return;
    }
    pendingReward.current = action;
    showFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: async (event) => {
        if (event.type === 'userEarnedReward') {
          const action = pendingReward.current;
          if (action === 'slot') {
            await increaseSlot();
            Alert.alert('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.');
          } else if (action === 'stamp') {
            await earnTodayStamp();
            Alert.alert('🏅 도장 획득!', '오늘의 복약 미션을 완료했어요!');
          } else if (action === 'streak') {
            await claimStreakReward();
            try {
              await grantPromotionReward({ params: { promotionCode: 'PILLCHECK_STREAK_7', amount: 5 } });
              Alert.alert('🏆 토스포인트 5p 지급!', '7일 연속 복약 미션을 완료했어요!');
            } catch {
              Alert.alert('🏆 7일 연속 달성!', '포인트 지급은 잠시 후 자동으로 처리돼요.');
            }
          }
        }
        if (event.type === 'dismissed') {
          pendingReward.current = null;
          loadNextAd();
        }
      },
      onError: () => Alert.alert('광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요.'),
    });
  };

  const handleWatchAd = () => {
    setShowSlotModal(false);
    showRewardAd('slot');
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
  const last7Days = getDatesBack(7).reverse(); // 오래된 날 → 오늘 순
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

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

        {/* 미션 도장 (카드 내부) */}
        {(pills.length > 0 || stamps.length > 0) && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.stampInCard}>
              <View style={styles.stampHeader}>
                <Text style={styles.stampTitle}>미션 도장</Text>
                {currentStreak > 0 && (
                  <Text style={styles.streakBadge}>🔥 {currentStreak}일 연속</Text>
                )}
              </View>
              <View style={styles.stampGrid}>
                {last7Days.map((date) => {
                  const stamped = stamps.includes(date);
                  const isToday = date === todayStr();
                  const d = new Date(date.replace(/-/g, '/'));
                  return (
                    <View key={date} style={styles.stampDayCol}>
                      <View style={[styles.stampCircle, stamped && styles.stampCircleDone, isToday && !stamped && styles.stampCircleToday]}>
                        <Text style={styles.stampCircleText}>{stamped ? '🏅' : ''}</Text>
                      </View>
                      <Text style={[styles.stampDayLabel, isToday && { color: PRIMARY_DARK, fontWeight: '700' }]}>
                        {isToday ? '오늘' : DAY_NAMES[d.getDay()]}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {allDone && !todayStamped && (
                <TouchableOpacity
                  style={[styles.stampActionBtn, !adLoaded && styles.stampActionBtnDisabled]}
                  onPress={() => showRewardAd('stamp')}
                  disabled={!adLoaded}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stampActionBtnText}>
                    {adLoaded ? '🎯 오늘 복약 완료! 도장 받기' : '광고 준비 중...'}
                  </Text>
                </TouchableOpacity>
              )}
              {todayStamped && !canClaimStreakReward && (
                <View style={styles.stampDoneRow}>
                  <Text style={styles.stampDoneText}>🏅 오늘 도장 완료!</Text>
                </View>
              )}
              {canClaimStreakReward && (
                <TouchableOpacity
                  style={[styles.streakActionBtn, !adLoaded && styles.stampActionBtnDisabled]}
                  onPress={() => showRewardAd('streak')}
                  disabled={!adLoaded}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streakActionBtnText}>
                    {adLoaded ? '🏆 7일 연속 달성! 토스포인트 받기' : '광고 준비 중...'}
                  </Text>
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
          adGroupId="ait.v2.live.a0ee7a06ab474249"
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

  // 미션 도장 섹션 (카드 내부)
  stampInCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stampHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stampTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  streakBadge: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  stampGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stampDayCol: { alignItems: 'center', flex: 1 },
  stampCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stampCircleDone: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  stampCircleToday: { borderColor: PRIMARY, borderWidth: 2 },
  stampCircleText: { fontSize: 18 },
  stampDayLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  stampActionBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  stampActionBtnDisabled: { backgroundColor: '#D1D5DB' },
  stampActionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  stampDoneRow: { alignItems: 'center', paddingVertical: 6 },
  stampDoneText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  streakActionBtn: { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  streakActionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

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
