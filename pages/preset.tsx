import { createRoute } from '@granite-js/react-native';
import { InlineAd } from '@apps-in-toss/framework';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { usePresets, Preset } from '../stores/PresetContext';
import { Pill } from '../data/types';
import { PRESET_TIMES } from '../data/constants';
import { AD_IDS } from '../src/ads';
import { useRewardAd } from '../src/useRewardAd';

export const Route = createRoute('/preset', { component: PresetPage });

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 32) / 3);

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';
const PRIMARY_LIGHT = '#DCFCE7';
const DEFAULT_PLAN_SLOTS = 3;

const DAYS = [
  { label: '월', day: 1 },
  { label: '화', day: 2 },
  { label: '수', day: 3 },
  { label: '목', day: 4 },
  { label: '금', day: 5 },
  { label: '토', day: 6 },
  { label: '일', day: 0 },
];

const NAME_PRESETS = ['종합 비타민', '비타민 B', '비타민 C', '비타민 D', '오메가3', '마그네슘', '칼슘'];
const ICONS = [
  { emoji: '💊', color: '#22C55E' },
  { emoji: '💉', color: '#3B82F6' },
  { emoji: '🏥', color: '#14B8A6' },
];
const UNITS = ['알', 'mg', 'ml'];

function PresetPage() {
  const navigation = Route.useNavigation();
  const { pills, replacePills } = usePills();
  const { presets, maxPresets, daySchedule, savePreset, updatePreset, deletePreset, assignDay, unassignDay, increasePresetSlot } = usePresets();

  const { adLoaded, show } = useRewardAd(AD_IDS.reward);
  const planNameInputRef = useRef<any>(null);

  // ── 이름 입력 모달 (현재 구성 저장용) ──
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  // ── 플랜 빌더 (신규/편집 공용) ──
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null); // null = 신규
  const [planName, setPlanName] = useState('');
  const [planPills, setPlanPills] = useState<Omit<Pill, 'id'>[]>([]);
  const [planMaxSlots, setPlanMaxSlots] = useState(DEFAULT_PLAN_SLOTS);
  const [planSaving, setPlanSaving] = useState(false);

  // ── 플랜 빌더 내 영양제 추가 모달 ──
  const [showPlanAdd, setShowPlanAdd] = useState(false);
  const [pName, setPName] = useState('');
  const [pCustomName, setPCustomName] = useState('');
  const [pIsCustom, setPIsCustom] = useState(false);
  const [pIcon, setPIcon] = useState(ICONS[0]);
  const [pUnit, setPUnit] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [pTimes, setPTimes] = useState<string[]>([]);
  const [pCustomTime, setPCustomTime] = useState('');
  const [pShowCustomTime, setPShowCustomTime] = useState(false);

  const atPresetLimit = presets.length >= maxPresets;
  const planUsedSlots = planPills.reduce((acc, p) => acc + p.times.length, 0);
  const planAvailableSlots = planMaxSlots - planUsedSlots;
  const pFinalName = pIsCustom ? pCustomName : pName;
  const pIsValid = pFinalName.trim().length > 0 && pTimes.length > 0;

  // 광고 보고 콜백 실행 (공용 훅: 로드 1개만 유지 + 순차 폴백, dev 환경은 즉시 실행)
  const playAdThen = (callback: () => void) => show(callback);

  // ── 현재 구성 저장 ──
  const handleOpenSaveModal = () => {
    if (pills.length === 0) { Alert.alert('영양제가 없어요', '먼저 홈 화면에서 영양제를 추가해주세요.'); return; }
    if (atPresetLimit) { promptSlotAdd(); return; }
    setSaveName('');
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    const name = saveName.trim();
    if (!name) return;
    setShowSaveModal(false);
    playAdThen(async () => {
      setSaving(true);
      await savePreset(name, pills.map(({ id: _id, ...rest }) => rest));
      setSaving(false);
      Alert.alert('저장 완료!', `"${name}" 플랜이 저장됐어요.`);
    });
  };

  // ── 새 플랜 추가 ──
  const handleAddNewPlan = () => {
    if (atPresetLimit) { promptSlotAdd(); return; }
    playAdThen(() => openPlanNameInput());
  };

  const [showPlanNameModal, setShowPlanNameModal] = useState(false);
  const [pendingPlanName, setPendingPlanName] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const openPlanNameInput = () => {
    setPendingPlanName('');
    setShowPlanNameModal(true);
  };

  const handleConfirmPlanName = () => {
    const name = pendingPlanName.trim();
    if (!name) return;
    setShowPlanNameModal(false);
    openPlanBuilder(name);
  };

  const openPlanBuilder = (name: string, existingPresetId?: string, existingPills?: Omit<Pill, 'id'>[]) => {
    setEditingPresetId(existingPresetId ?? null);
    setPlanName(name);
    setPlanPills(existingPills ?? []);
    const usedSlots = (existingPills ?? []).reduce((acc, p) => acc + p.times.length, 0);
    // 신규/편집 모두 최소 DEFAULT_PLAN_SLOTS 보장
    setPlanMaxSlots(Math.max(DEFAULT_PLAN_SLOTS, usedSlots));
    setShowPlanBuilder(true);
  };

  const handleSavePlan = async () => {
    if (planPills.length === 0) {
      Alert.alert('영양제를 추가해주세요', '최소 1개의 영양제를 추가해야 플랜을 저장할 수 있어요.');
      return;
    }
    setPlanSaving(true);
    if (editingPresetId) {
      await updatePreset(editingPresetId, planPills);
      Alert.alert('수정 완료!', `"${planName}" 플랜이 업데이트됐어요.`);
    } else {
      await savePreset(planName, planPills);
      Alert.alert('저장 완료!', `"${planName}" 플랜이 저장됐어요.`);
    }
    setPlanSaving(false);
    setShowPlanBuilder(false);
  };

  const handleIncreasePlanSlot = () => {
    playAdThen(() => {
      setPlanMaxSlots((prev) => prev + 1);
      Alert.alert('슬롯 추가!', '영양제를 1개 더 추가할 수 있어요.');
    });
  };

  // ── 플랜 빌더 내 영양제 추가 ──
  const resetPillForm = () => {
    setPName(''); setPCustomName(''); setPIsCustom(false);
    setPIcon(ICONS[0]); setPUnit(''); setPAmount('');
    setPTimes([]); setPCustomTime(''); setPShowCustomTime(false);
  };

  const openPlanAdd = () => { resetPillForm(); setShowPlanAdd(true); };

  const togglePTime = (time: string) => {
    setPTimes((prev) => prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]);
  };

  const addPCustomTime = () => {
    const t = pCustomTime.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return;
    if (!pTimes.includes(t)) setPTimes((prev) => [...prev, t]);
    setPCustomTime(''); setPShowCustomTime(false); Keyboard.dismiss();
  };

  const handleAddPillToPlan = () => {
    if (!pIsValid) return;
    if (pTimes.length > planAvailableSlots) {
      Alert.alert('슬롯 부족', `선택한 시간 ${pTimes.length}개 중 ${planAvailableSlots}개 슬롯만 남아있어요.`);
      return;
    }
    setPlanPills((prev) => [...prev, {
      name: pFinalName.trim(),
      emoji: pIcon.emoji,
      color: pIcon.color,
      dosageAmount: pAmount.trim() || undefined,
      dosageUnit: pUnit || undefined,
      times: [...pTimes].sort(),
    }]);
    setShowPlanAdd(false);
  };

  const handleRemovePlanPill = (idx: number) => {
    const removedSlots = planPills[idx].times.length;
    setPlanPills((prev) => prev.filter((_, i) => i !== idx));
    if (editingPresetId) setPlanMaxSlots((prev) => Math.max(DEFAULT_PLAN_SLOTS, prev - removedSlots));
  };

  // ── 요일 배정 (광고 필요) ──
  const handleToggleDay = (day: number, presetId: string) => {
    if (daySchedule[day] === presetId) {
      unassignDay(day);
      return;
    }
    playAdThen(async () => {
      await assignDay(day, presetId);
    });
  };

  // ── 플랜 슬롯 추가 ──
  const promptSlotAdd = () => {
    Alert.alert(
      '플랜 슬롯이 꽉 찼어요',
      `현재 최대 ${maxPresets}개까지 저장할 수 있어요.\n광고를 보면 슬롯을 1개 더 추가할 수 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: adLoaded ? '광고 보고 추가' : '광고 준비 중...', onPress: () => { if (adLoaded) playAdThen(async () => { await increasePresetSlot(); Alert.alert('플랜 슬롯 추가!', '플랜을 1개 더 저장할 수 있어요.'); }); } },
      ]
    );
  };

  // ── 삭제 ──
  const handleDeletePreset = (preset: Preset) => {
    const nextMax = Math.max(1, maxPresets - 1);
    const slotMsg = maxPresets > 1
      ? `\n\n⚠️ 플랜 슬롯도 ${maxPresets}개 → ${nextMax}개로 줄어들어요.`
      : '';
    Alert.alert(
      `"${preset.name}" 삭제`,
      `이 플랜을 삭제할까요?${slotMsg}`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deletePreset(preset.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.headerTitle}>내 플랜</Text>
        <TouchableOpacity onPress={() => setShowHelp(true)} activeOpacity={0.7} style={styles.helpBtn}>
          <Text style={styles.helpBtnText}>?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 현재 플랜 저장 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 플랜 저장</Text>
          <Text style={styles.sectionDesc}>
            지금 홈 화면에 설정된 복약 플랜 전체를 저장해요.{'\n'}저장된 플랜은 언제든 불러와서 적용할 수 있어요.
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, (pills.length === 0 || saving) && styles.saveBtnDisabled]}
            onPress={handleOpenSaveModal}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '📋 현재 플랜 저장하기'}</Text>
          </TouchableOpacity>
          {pills.length === 0 && (
            <Text style={styles.saveHint}>홈 화면에서 영양제를 먼저 추가해주세요</Text>
          )}
        </View>

        {/* 저장된 플랜 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>저장된 플랜</Text>
            <TouchableOpacity
              style={[styles.addNewBtn, atPresetLimit && styles.addNewBtnDisabled]}
              onPress={handleAddNewPlan}
              activeOpacity={0.8}
            >
              <Text style={[styles.addNewBtnText, atPresetLimit && styles.addNewBtnTextDisabled]}>
                {atPresetLimit ? '🔒 슬롯 꽉참' : '+ 새 플랜 추가'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slotInfo}>
            <Text style={styles.slotInfoText}>플랜 슬롯 {presets.length}/{maxPresets}</Text>
            {atPresetLimit && (
              <TouchableOpacity
                style={[styles.slotAddBtn, !adLoaded && styles.slotAddBtnDisabled]}
                onPress={() => { if (adLoaded) playAdThen(async () => { await increasePresetSlot(); Alert.alert('슬롯 추가!', '플랜을 1개 더 저장할 수 있어요.'); }); }}
                disabled={!adLoaded}
                activeOpacity={0.8}
              >
                <Text style={styles.slotAddBtnText}>{adLoaded ? '광고 보고 슬롯 추가' : '광고 준비 중...'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {presets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>저장된 플랜이 없어요</Text>
              <Text style={styles.emptySubText}>위 버튼으로 플랜을 추가해보세요</Text>
            </View>
          ) : (
            presets.map((preset) => (
              <View key={preset.id} style={styles.presetCard}>
                <View style={styles.presetCardTop}>
                  <View style={styles.presetCardLeft}>
                    <Text style={styles.presetName}>{preset.name}</Text>
                    <Text style={styles.presetMeta}>영양제 {preset.pills.length}개 · {preset.savedAt} 저장</Text>
                  </View>
                  <View style={styles.presetCardActions}>
                    <TouchableOpacity
                      style={styles.loadBtn}
                      onPress={() => openPlanBuilder(preset.name, preset.id, preset.pills)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.loadBtnText}>플랜 보기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePreset(preset)} activeOpacity={0.8}>
                      <Text style={styles.deleteBtnText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 요일 배정 */}
                <View style={styles.dayRow}>
                  <Text style={styles.dayRowLabel}>자동 적용 요일 (요일 선택 시 광고 시청 필요)</Text>
                  <View style={styles.dayChips}>
                    {DAYS.map(({ label, day }) => {
                      const assigned = daySchedule[day] === preset.id;
                      const assignedOther = daySchedule[day] !== undefined && daySchedule[day] !== preset.id;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, assigned && styles.dayChipActive, assignedOther && styles.dayChipOther]}
                          onPress={() => handleToggleDay(day, preset.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.dayChipText, assigned && styles.dayChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 배너 광고 */}
      <View style={styles.banner}>
        <InlineAd
          adGroupId={AD_IDS.presetFeed}
          theme="light"
          tone="grey"
          variant="expanded"
          impressFallbackOnMount={true}
        />
      </View>

      {/* ── 도움말 모달 ── */}
      <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <TouchableWithoutFeedback onPress={() => setShowHelp(false)}>
          <View style={styles.helpOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.helpCard}>
                <Text style={styles.helpTitle}>💊 플랜 사용 방법</Text>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>📋 플랜 만들기</Text>
                  <Text style={styles.helpItem}>• 현재 플랜 저장: 홈에 등록된 영양제 구성 전체를 하나의 플랜으로 저장</Text>
                  <Text style={styles.helpItem}>• 새 플랜 추가: 영양제를 직접 선택해 새 플랜 구성</Text>
                  <Text style={styles.helpItem}>• 저장 시 광고 시청 1회 필요</Text>
                </View>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>▶️ 플랜 적용하기</Text>
                  <Text style={styles.helpItem}>• 플랜 보기 → 홈에 적용하기: 해당 플랜으로 홈 교체 (광고 1회)</Text>
                  <Text style={styles.helpItem}>• 요일 배정: 요일 탭 선택 → 해당 요일에 자동 제안 (광고 1회)</Text>
                </View>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>🔒 슬롯</Text>
                  <Text style={styles.helpItem}>• 플랜 슬롯 기본 1개, 광고 시청 시 +1</Text>
                  <Text style={styles.helpItem}>• 플랜 삭제 시 슬롯도 -1</Text>
                </View>
                <TouchableOpacity style={styles.helpClose} onPress={() => setShowHelp(false)} activeOpacity={0.8}>
                  <Text style={styles.helpCloseText}>확인</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── 현재 구성 저장 이름 입력 모달 ── */}
      <Modal visible={showSaveModal} transparent animationType="slide" onRequestClose={() => setShowSaveModal(false)}>
        <KeyboardAvoidingView style={styles.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => setShowSaveModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>플랜 이름 입력</Text>
            <Text style={styles.sheetDesc}>현재 설정된 복약 플랜 전체가 이 이름으로 저장돼요</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="예: 아침 루틴, 주말 플랜..."
              value={saveName}
              onChangeText={setSaveName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirmSave}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, !saveName.trim() && styles.confirmBtnDisabled]}
              onPress={handleConfirmSave}
              disabled={!saveName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>{adLoaded ? '광고 보고 저장' : '저장하기'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 새 플랜 이름 입력 모달 ── */}
      <Modal
        visible={showPlanNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanNameModal(false)}
        onShow={() => setTimeout(() => planNameInputRef.current?.focus(), 50)}
      >
        <KeyboardAvoidingView style={styles.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => setShowPlanNameModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>새 플랜 이름 입력</Text>
            <Text style={styles.sheetDesc}>빈 플랜으로 시작해요. 영양제를 직접 추가할 수 있어요.</Text>
            <TextInput
              ref={planNameInputRef}
              style={styles.nameInput}
              placeholder="예: 아침 루틴, 주말 플랜..."
              value={pendingPlanName}
              onChangeText={setPendingPlanName}
              returnKeyType="done"
              onSubmitEditing={handleConfirmPlanName}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, !pendingPlanName.trim() && styles.confirmBtnDisabled]}
              onPress={handleConfirmPlanName}
              disabled={!pendingPlanName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>다음</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 플랜 빌더 모달 ── */}
      <Modal visible={showPlanBuilder} animationType="slide" onRequestClose={() => { if (showPlanAdd) { setShowPlanAdd(false); } else { setShowPlanBuilder(false); } }}>
        <SafeAreaView style={styles.builderContainer}>
          {/* 빌더 헤더 */}
          <View style={styles.builderHeader}>
            <TouchableOpacity
              onPress={() => { if (showPlanAdd) { setShowPlanAdd(false); Keyboard.dismiss(); } else { setShowPlanBuilder(false); } }}
              activeOpacity={0.7}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>{showPlanAdd ? '‹' : '✕'}</Text>
            </TouchableOpacity>
            <Text style={styles.builderTitle}>
              {showPlanAdd ? '영양제 추가' : editingPresetId ? `"${planName}" 편집` : `"${planName}" 구성`}
            </Text>
            {!showPlanAdd ? (
              <TouchableOpacity
                style={[styles.builderSaveBtn, planPills.length === 0 && styles.builderSaveBtnDisabled]}
                onPress={handleSavePlan}
                disabled={planSaving || planPills.length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.builderSaveBtnText}>{planSaving ? '저장 중...' : editingPresetId ? '수정' : '저장'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          {/* ── 영양제 추가 폼 (인라인) ── */}
          {showPlanAdd ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView
                contentContainerStyle={styles.builderContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* 이름 */}
                <Text style={styles.fieldLabel}>이름</Text>
                <View style={styles.chipWrap}>
                  {NAME_PRESETS.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.chip, !pIsCustom && pName === n && styles.chipSelected]}
                      onPress={() => { setPName(n); setPIsCustom(false); Keyboard.dismiss(); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, !pIsCustom && pName === n && styles.chipTextSelected]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.chip, pIsCustom && styles.chipSelected]}
                    onPress={() => { setPIsCustom(true); setPName(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, pIsCustom && styles.chipTextSelected]}>직접입력</Text>
                  </TouchableOpacity>
                </View>
                {pIsCustom && (
                  <TextInput
                    style={styles.nameInput}
                    placeholder="영양제 이름 입력"
                    placeholderTextColor="#9CA3AF"
                    value={pCustomName}
                    onChangeText={setPCustomName}
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
                      style={[styles.iconChip, pIcon.emoji === icon.emoji && { borderColor: icon.color, backgroundColor: icon.color + '18' }]}
                      onPress={() => setPIcon(icon)}
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
                    style={styles.dosageInput}
                    placeholder="수량"
                    placeholderTextColor="#9CA3AF"
                    value={pAmount}
                    onChangeText={setPAmount}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.unitChip, pUnit === unit && styles.unitChipSelected]}
                          onPress={() => { setPUnit(pUnit === unit ? '' : unit); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.unitChipText, pUnit === unit && styles.unitChipTextSelected]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 시간 */}
                    <Text style={styles.fieldLabel}>
                      복용 시간{'  '}
                      <Text style={[styles.optional, planAvailableSlots - pTimes.length < 0 && { color: '#EF4444' }]}>
                        (잔여 슬롯 {Math.max(0, planAvailableSlots - pTimes.length)}개)
                      </Text>
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeChipWrap}>
                      {PRESET_TIMES.map(({ label, time }) => {
                        const sel = pTimes.includes(time);
                        const noSlot = !sel && planAvailableSlots - pTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[styles.timeChip, sel && styles.timeChipSel, noSlot && styles.timeChipDis]}
                            onPress={() => { if (!noSlot) { togglePTime(time); Keyboard.dismiss(); } }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[styles.timeChipLabel, sel && styles.timeChipLabelSel, noSlot && styles.timeChipLabelDis]}>{label}</Text>
                            <Text style={[styles.timeChipTime, sel && styles.timeChipTimeSel, noSlot && styles.timeChipLabelDis]}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {pTimes.filter((t) => !PRESET_TIMES.some((p) => p.time === t)).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.timeChip, styles.timeChipSel]}
                          onPress={() => togglePTime(t)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.timeChipLabel, styles.timeChipLabelSel]}>직접 입력</Text>
                          <Text style={[styles.timeChipTime, styles.timeChipTimeSel]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                      {(() => {
                        const noSlot = planAvailableSlots - pTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            style={[styles.timeChip, pShowCustomTime && styles.timeChipSel, noSlot && styles.timeChipDis]}
                            onPress={() => { if (!noSlot) setPShowCustomTime(true); }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[styles.timeChipLabel, pShowCustomTime && styles.timeChipLabelSel, noSlot && styles.timeChipLabelDis]}>직접 입력</Text>
                            <Text style={[styles.timeChipTime, pShowCustomTime && styles.timeChipTimeSel, noSlot && styles.timeChipLabelDis]}>+ 추가</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </ScrollView>
                    {pShowCustomTime && (
                      <View style={styles.customTimeRow}>
                        <TextInput
                          style={styles.customTimeInput}
                          placeholder="HH:MM"
                          placeholderTextColor="#9CA3AF"
                          value={pCustomTime}
                          onChangeText={setPCustomTime}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          returnKeyType="done"
                          onSubmitEditing={addPCustomTime}
                          autoFocus
                        />
                        <TouchableOpacity style={styles.customTimeAddBtn} onPress={addPCustomTime} activeOpacity={0.8}>
                          <Text style={styles.customTimeAddBtnText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                <TouchableOpacity
                  style={[styles.confirmBtn, !pIsValid && styles.confirmBtnDisabled, { marginTop: 20 }]}
                  onPress={handleAddPillToPlan}
                  disabled={!pIsValid}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnText}>추가</Text>
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            /* ── 영양제 목록 뷰 ── */
            <ScrollView contentContainerStyle={styles.builderContent} showsVerticalScrollIndicator={false}>
              {/* 슬롯 현황 */}
              <View style={styles.builderSlotRow}>
                <Text style={styles.builderSlotText}>슬롯 {planUsedSlots}/{planMaxSlots} 사용 중</Text>
                {planAvailableSlots <= 0 && (
                  <TouchableOpacity
                    style={[styles.slotAddBtn, !adLoaded && styles.slotAddBtnDisabled]}
                    onPress={handleIncreasePlanSlot}
                    disabled={!adLoaded}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.slotAddBtnText}>{adLoaded ? '광고 보고 슬롯 추가' : '광고 준비 중...'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 추가된 영양제 그리드 (시간대별) */}
              {planPills.length === 0 ? (
                <View style={styles.builderEmpty}>
                  <Text style={styles.builderEmptyText}>아직 추가된 영양제가 없어요</Text>
                  <Text style={styles.builderEmptySubText}>아래 버튼으로 영양제를 추가해보세요</Text>
                </View>
              ) : (
                <View style={styles.planPillGrid}>
                  {planPills
                    .flatMap((p, pillIdx) => p.times.map((time) => ({ p, pillIdx, time })))
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(({ p, pillIdx, time }) => (
                      <TouchableOpacity
                        key={`${pillIdx}-${time}`}
                        style={styles.planGridCell}
                        onPress={() => Alert.alert(
                          `${p.name} (${time}) 삭제`,
                          '이 시간대를 플랜에서 제거할까요?',
                          [
                            { text: '취소', style: 'cancel' },
                            { text: '삭제', style: 'destructive', onPress: () => {
                              if (p.times.length === 1) {
                                handleRemovePlanPill(pillIdx);
                              } else {
                                setPlanPills((prev) => prev.map((pill, i) =>
                                  i === pillIdx ? { ...pill, times: pill.times.filter((t) => t !== time) } : pill
                                ));
                                if (editingPresetId) setPlanMaxSlots((prev) => Math.max(DEFAULT_PLAN_SLOTS, prev - 1));
                              }
                            }},
                          ]
                        )}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.planGridCard, { borderColor: p.color + '50' }]}>
                          <Text style={styles.planGridTime}>{time}</Text>
                          <View style={[styles.planGridEmojiWrap, { backgroundColor: p.color + '22' }]}>
                            <Text style={styles.planGridEmoji}>{p.emoji}</Text>
                          </View>
                          <Text style={styles.planGridName} numberOfLines={2}>{p.name}</Text>
                          <Text style={styles.planGridDosage}>{p.dosageAmount ? `${p.dosageAmount}${p.dosageUnit ?? ''}` : ' '}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  }
                </View>
              )}

              {/* 영양제 추가 버튼 */}
              {planAvailableSlots > 0 ? (
                <TouchableOpacity style={styles.planAddPillBtn} onPress={openPlanAdd} activeOpacity={0.85}>
                  <Text style={styles.planAddPillBtnText}>+ 영양제 추가</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.planAddPillBtnLocked}>
                  <Text style={styles.planAddPillBtnLockedText}>🔒 슬롯 꽉참 · 광고 보고 추가하기</Text>
                </View>
              )}

              {/* 편집 모드: 홈에 적용하기 */}
              {editingPresetId && (
                <TouchableOpacity
                  style={[styles.applyBtn, !adLoaded && styles.applyBtnDisabled]}
                  onPress={() => {
                    const preset = presets.find((p) => p.id === editingPresetId);
                    if (!preset) return;
                    playAdThen(async () => {
                      await replacePills(preset.pills);
                      setShowPlanBuilder(false);
                      Alert.alert('적용 완료', `"${preset.name}" 플랜을 홈에 적용했어요.`);
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>
                    {adLoaded ? '홈에 적용하기' : '광고 준비 중...'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* 배너 광고 */}
          <View style={styles.banner}>
            <InlineAd
              adGroupId={AD_IDS.presetFeed}
              theme="light"
              tone="grey"
              variant="expanded"
              impressFallbackOnMount={true}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  banner: { width: '100%', height: 96, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 28, color: '#333', lineHeight: 34 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  sectionDesc: { fontSize: 13, color: '#888', lineHeight: 19, marginBottom: 12 },

  saveBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveHint: { fontSize: 12, color: '#F59E0B', marginTop: 8, textAlign: 'center' },

  addNewBtn: { backgroundColor: PRIMARY_LIGHT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addNewBtnDisabled: { backgroundColor: '#F3F4F6' },
  addNewBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY_DARK },
  addNewBtnTextDisabled: { color: '#AAA' },

  slotInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  slotInfoText: { fontSize: 12, color: '#9CA3AF' },
  slotAddBtn: { backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  slotAddBtnDisabled: { backgroundColor: '#F3F4F6' },
  slotAddBtnText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },

  emptyBox: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 28, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  emptyText: { fontSize: 14, color: '#BBB', marginBottom: 4 },
  emptySubText: { fontSize: 12, color: '#CCC' },

  presetCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  presetCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  presetCardLeft: { flex: 1 },
  presetName: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 3 },
  presetMeta: { fontSize: 12, color: '#AAA' },
  presetCardActions: { flexDirection: 'row', gap: 8 },
  loadBtn: { backgroundColor: PRIMARY_LIGHT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  loadBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY_DARK },
  deleteBtn: { backgroundColor: '#FFF1F1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#E53E3E' },

  dayRow: { borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  dayRowLabel: { fontSize: 12, color: '#999', marginBottom: 8 },
  dayChips: { flexDirection: 'row', gap: 6 },
  dayChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  dayChipActive: { backgroundColor: PRIMARY },
  dayChipOther: { opacity: 0.35 },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayChipTextActive: { color: '#fff' },

  // 모달 공통
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetOuter: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  sheetDesc: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  nameInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', marginBottom: 16 },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // 플랜 빌더
  builderContainer: { flex: 1, backgroundColor: '#F7F8FA' },
  builderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  builderTitle: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, textAlign: 'center' },
  builderSaveBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  builderSaveBtnDisabled: { backgroundColor: '#ccc' },
  builderSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  builderContent: { paddingHorizontal: 16, paddingTop: 16 },
  builderSlotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  builderSlotText: { fontSize: 13, color: '#9CA3AF' },
  builderEmpty: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 32, alignItems: 'center', borderWidth: 1, borderColor: '#EEE', marginBottom: 12 },
  builderEmptyText: { fontSize: 14, color: '#BBB', marginBottom: 4 },
  builderEmptySubText: { fontSize: 12, color: '#CCC' },
  planPillGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  planGridCell: { width: GRID_CELL_WIDTH, paddingHorizontal: 4, paddingBottom: 8 },
  planGridCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E5E7EB', paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
  },
  planGridTime: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 8 },
  planGridEmojiWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  planGridEmoji: { fontSize: 26 },
  planGridName: { fontSize: 11, fontWeight: '600', color: '#111827', textAlign: 'center' },
  planGridDosage: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
  planAddPillBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  planAddPillBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  planAddPillBtnLocked: {
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4,
  },
  planAddPillBtnLockedText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  applyBtn: {
    backgroundColor: '#EFF6FF', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 10, borderWidth: 1.5, borderColor: '#3B82F6',
  },
  applyBtnDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  applyBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: '700' },

  // 영양제 추가 폼
  addPillSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12, maxHeight: '90%',
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  optional: { fontSize: 12, fontWeight: '400', color: '#9CA3AF' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextSelected: { color: PRIMARY_DARK, fontWeight: '700' },
  iconRow: { flexDirection: 'row', gap: 10 },
  iconChip: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 26 },
  dosageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dosageInput: { width: 72, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: '#111' },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  unitChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  unitChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  unitChipTextSelected: { color: PRIMARY_DARK, fontWeight: '700' },
  timeChipWrap: { paddingBottom: 4, gap: 8 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  timeChipSel: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  timeChipDis: { opacity: 0.4 },
  timeChipLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  timeChipLabelSel: { color: PRIMARY_DARK },
  timeChipLabelDis: { color: '#9CA3AF' },
  timeChipTime: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 },
  timeChipTimeSel: { color: PRIMARY_DARK },
  customTimeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  customTimeInput: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#111' },
  customTimeAddBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  customTimeAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // 도움말 버튼
  helpBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  helpBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },

  // 도움말 모달
  helpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  helpCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  helpTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 16, textAlign: 'center' },
  helpSection: { marginBottom: 14 },
  helpSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  helpItem: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 2 },
  helpClose: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  helpCloseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
