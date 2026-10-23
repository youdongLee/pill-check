import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
import { Pill } from '../data/types';
import { PRESET_TIMES } from '../data/constants';
import { AD_IDS, DAILY_AMOUNT, STREAK_AMOUNT } from '../src/ads';
import { useRewardAd } from '../src/useRewardAd';
import { ImageAd, TopBanner } from '../src/AdSlot';
import { HotdealCard } from '../src/HotdealCard';
import { loadNotifyState, notifySupported, requestDailyNotify, type NotifyState } from '../src/notify';
import { AddTile, KEY_MAX, PillTile, SUB_MAX } from '../src/PillTile';
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

  // 매일 오전 9시 알림 — 동의하거나 거절하면 줄을 다시 안 보인다
  const [notify, setNotify] = useState<NotifyState>('agreed');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const canNotify = useMemo(() => notifySupported(), []);
  useEffect(() => {
    void loadNotifyState().then(setNotify);
  }, []);
  const askNotify = async () => {
    setNotifyBusy(true);
    const r = await requestDailyNotify();
    setNotifyBusy(false);
    if (r === 'error') return;
    setNotify(r);
    if (r === 'agreed') Alert.alert('알림을 켰어요', '매일 오전 9시에 영양제 드실 시간을 알려드릴게요.');
  };

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
  // Hermes 는 'YYYY/MM/DD' 문자열을 못 읽는다(Invalid Date → undefined). 숫자로 나눠 만든다.
  const [ty, tm, td] = today.split('-').map(Number);
  const dayName = DAY_NAMES[new Date(ty, tm - 1, td).getDay()] ?? '오늘';

  // 도장 버튼 줄 — 지금 할 수 있는 것 하나만. 다 받았으면 줄 자체가 없다.
  const stampAction: { label: string; onPress: () => void; disabled: boolean; gold: boolean } | null =
    showDailyAdBtn
      ? {
          label: ad.loaded ? `🎯 광고 보고 오늘 도장 받기 · ${DAILY_AMOUNT}원` : '광고 준비 중...',
          disabled: !ad.loaded || ad.playing,
          gold: false,
          onPress: () =>
            ad.confirmAndPlay(
              {
                title: '오늘의 도장 받기',
                message: `짧은 광고를 보고 오늘의 복약 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${DAILY_AMOUNT}원을 받아요.`,
                confirm: '광고 보고 도장 받기',
              },
              onEarnedDaily,
            ),
        }
      : dailyPending
        ? { label: `🏅 도장 눌러서 ${DAILY_AMOUNT}원 받기`, disabled: paying, gold: false, onPress: onClaimDaily }
        : showStreakAdBtn
          ? {
              label: ad.loaded ? `🏆 7일 연속! 광고 보고 도장 받기 · ${STREAK_AMOUNT}원` : '광고 준비 중...',
              disabled: !ad.loaded || ad.playing,
              gold: true,
              onPress: () =>
                ad.confirmAndPlay(
                  {
                    title: '7일 연속 달성!',
                    message: `짧은 광고를 보고 7일 연속 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${STREAK_AMOUNT}원을 받아요.`,
                    confirm: '광고 보고 도장 받기',
                  },
                  onEarnedStreak,
                ),
            }
          : streakPending
            ? { label: `🏆 7일 도장 눌러서 ${STREAK_AMOUNT}원 받기`, disabled: paying, gold: true, onPress: onClaimStreak }
            : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      {/* 맨 위 줄배너 — 고정이 아니라 스크롤 첫 줄 */}
      <TopBanner position="home_top" />

      {/* 한 줄 머리: 왼쪽 '토 · 3/3 복용 ✓', 오른쪽 '🔥5일 · 내 플랜 · 관리' + 얇은 진행 막대 */}
      <View style={styles.topCard}>
        <View style={styles.headRow}>
          <Text style={styles.headLeft} maxFontSizeMultiplier={KEY_MAX}>
            {`${dayName} · ${takenCount}/${totalCount} 복용${allDone ? ' ✓' : ''}`}
          </Text>
          <View style={styles.headRight}>
            {stamps.length > 0 && (
              <Text style={styles.headStreak} maxFontSizeMultiplier={SUB_MAX}>{`🔥${streakCount}일`}</Text>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('/preset')} activeOpacity={0.7} style={styles.headChip} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={styles.headChipText} maxFontSizeMultiplier={SUB_MAX}>내 플랜</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('/manage')} activeOpacity={0.7} style={styles.headChip} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Text style={styles.headChipText} maxFontSizeMultiplier={SUB_MAX}>관리</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.thinTrack}>
          <View style={[styles.thinFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* 도장 7칸 — 금액 줄·'오늘 도장 완료' 줄 없음. 라벨은 '오늘' 칸에만 */}
        {(pills.length > 0 || stamps.length > 0) && (
          <View style={styles.stripRow}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = stamps[i];
              const stamped = i < stamps.length;
              const isTodaySlot = !todayStamped && i === stamps.length;
              const isToday = isTodaySlot || date === today;
              return (
                <View key={i} style={styles.stripCol}>
                  <View style={[styles.stripCircle, stamped && styles.stampCircleDone, isTodaySlot && styles.stampCircleToday]}>
                    <Text style={styles.stripCircleText} maxFontSizeMultiplier={1.2}>{stamped ? '🏅' : ''}</Text>
                  </View>
                  <Text style={[styles.stripLabel, isToday && styles.stripLabelToday]} maxFontSizeMultiplier={SUB_MAX}>
                    {isToday ? '오늘' : ' '}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 버튼 줄은 할 일이 있을 때만 */}
        {stampAction && (
          <TouchableOpacity
            style={[stampAction.gold ? styles.streakActionBtn : styles.stampActionBtn, styles.actionBtnTight, stampAction.disabled && styles.stampActionBtnDisabled]}
            onPress={stampAction.onPress}
            disabled={stampAction.disabled}
            activeOpacity={0.85}
          >
            <Text style={stampAction.gold ? styles.streakActionBtnText : styles.stampActionBtnText} maxFontSizeMultiplier={SUB_MAX}>
              {stampAction.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* 할 일 버튼이 없을 때만 그 자리에 알림 줄 — 첫 화면 이미지 광고 위치가 더 내려가지 않게 */}
        {!stampAction && canNotify && notify === 'unknown' && (
          <View style={styles.notifyRow}>
            <Text style={styles.notifyText} maxFontSizeMultiplier={SUB_MAX}>⏰ 매일 오전 9시 영양제 알림</Text>
            <TouchableOpacity style={[styles.notifyBtn, notifyBusy && styles.stampActionBtnDisabled]} onPress={askNotify} disabled={notifyBusy} activeOpacity={0.85}>
              <Text style={styles.notifyBtnText} maxFontSizeMultiplier={SUB_MAX}>{notifyBusy ? '잠시만요…' : '알림 받기'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 체크 안내 — 오늘 아무것도 체크 안 했을 때만 */}
      {totalCount > 0 && takenCount === 0 && (
        <Text style={styles.hint} maxFontSizeMultiplier={SUB_MAX}>드신 영양제를 누르면 체크돼요</Text>
      )}

      {/* 복용 목록 + 마지막 칸 '+ 추가' */}
      <View style={styles.listWrap}>
        {sortedIntakes.length === 0 && (
          <Text style={styles.emptyLine} maxFontSizeMultiplier={KEY_MAX}>💊 드시는 영양제를 추가해보세요</Text>
        )}
        <View style={styles.pillGrid}>
          {sortedIntakes.map((intake) => {
            const pill = activePillMap.get(intake.pillId);
            if (!pill) return null;
            return (
              <PillTile
                key={`${intake.pillId}-${intake.time}`}
                pill={pill}
                time={intake.time}
                taken={intake.taken}
                onPress={() => toggleIntake(intake.pillId, intake.time)}
              />
            );
          })}
          <AddTile used={usedSlots} max={maxSlots} onPress={() => (atSlotLimit ? setShowSlotModal(true) : openQuickAdd())} />
        </View>
      </View>

      {/* 핫딜 특가 오늘의 특가 1개(건강 우선) — 이미지 광고 바로 위(10/19 형님) */}
      <HotdealCard />

      {/* 이미지 광고 — 목록 바로 아래(첫 화면 안). 목록 1개 이상일 때만. 타일과 20px 띄움 */}
      {sortedIntakes.length > 0 && <ImageAd adGroupId={AD_IDS.homeMid} position="home_mid" />}

      {SHOW_DEV_PANEL && <View style={styles.listWrap}><DevPanel /></View>}
      <View style={{ height: 24 }} />
      </ScrollView>

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
  // 한 장 스크롤 레이아웃 (2026-10-10)
  // 3차(10/10): 머리 한 줄 + 도장 띠 + 할 일 있을 때만 버튼 → 첫 화면에 이미지 광고까지
  topCard: {marginHorizontal: 16, marginTop: 10, borderWidth: 1.5, borderColor: '#22C55E', borderStyle: 'dashed', borderRadius: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10},
  headRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6},
  headLeft: {fontSize: 17, fontWeight: '800', color: '#16A34A', flexShrink: 1},
  headRight: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  headStreak: {fontSize: 13, fontWeight: '700', color: '#F59E0B'},
  headChip: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: '#22C55E', backgroundColor: '#DCFCE7'},
  headChipText: {fontSize: 12, fontWeight: '700', color: '#16A34A'},
  thinTrack: {height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginTop: 8},
  thinFill: {height: 4, backgroundColor: '#22C55E', borderRadius: 2},
  stripRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 10},
  stripCol: {alignItems: 'center', flex: 1},
  stripCircle: {width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'},
  stripCircleText: {fontSize: 15},
  stripLabel: {fontSize: 10, color: '#9CA3AF', marginTop: 2},
  stripLabelToday: {color: '#16A34A', fontWeight: '700'},
  actionBtnTight: {marginTop: 10, paddingVertical: 11},
  notifyRow: {flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10},
  notifyText: {flex: 1, fontSize: 14, fontWeight: '700', color: '#111827'},
  notifyBtn: {backgroundColor: '#22C55E', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14},
  notifyBtnText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  hint: {fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8},
  emptyLine: {fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8},
  pageContent: {paddingBottom: 8},
  listWrap: {paddingHorizontal: 12, paddingTop: 10},
  sectionTitle: {fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 20, marginTop: 14, marginBottom: 8},
  listCaption: {fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 2, marginHorizontal: 20},
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
