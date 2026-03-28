import { createRoute } from '@granite-js/react-native';
import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { Pill } from '../data/types';
import { formatTime } from '../data/utils';
import { PRESET_TIMES } from '../data/constants';

export const Route = createRoute('/manage', { component: ManagePage });

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';
const PRIMARY_LIGHT = '#DCFCE7';
const REWARD_AD_ID = 'ait.v2.live.7848babf27974479';

const ICONS = [
  { emoji: '💊', color: '#22C55E' },
  { emoji: '💉', color: '#3B82F6' },
  { emoji: '🏥', color: '#14B8A6' },
];
const UNITS = ['알', 'mg', 'ml'];
const NAME_PRESETS = ['종합 비타민', '비타민 B', '비타민 C', '비타민 D', '오메가3', '마그네슘', '칼슘'];

function ManagePage() {
  const navigation = Route.useNavigation();
  const { pills, maxSlots, increaseSlot, decreaseSlot, addPill, deletePill, updatePill } = usePills();

  // --- Reward ad ---
  const [adLoaded, setAdLoaded] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);

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

  const handleWatchAd = () => {
    if (!showFullScreenAd.isSupported()) {
      Alert.alert('지원되지 않는 환경이에요.');
      return;
    }
    setShowSlotModal(false);
    showFullScreenAd({
      options: { adGroupId: REWARD_AD_ID },
      onEvent: async (event) => {
        if (event.type === 'userEarnedReward') {
          await increaseSlot();
          Alert.alert('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.');
        }
        if (event.type === 'dismissed') loadNextAd();
      },
      onError: () => Alert.alert('광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요.'),
    });
  };

  const usedSlots = pills.reduce((acc, p) => acc + p.times.length, 0);
  const availableSlots = maxSlots - usedSlots;

  // --- Quick add state ---
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addCustomTimeInput, setAddCustomTimeInput] = useState('');
  const [showAddCustomTimeField, setShowAddCustomTimeField] = useState(false);

  const finalName = isCustomName ? customName : selectedName;
  const isAddValid = finalName.trim().length > 0 && selectedTimes.length > 0;

  const resetAddForm = () => {
    setSelectedName('');
    setIsCustomName(false);
    setCustomName('');
    setSelectedIcon(ICONS[0]);
    setSelectedUnit('');
    setDosageAmount('');
    setSelectedTimes([]);
    setAddCustomTimeInput('');
    setShowAddCustomTimeField(false);
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const addCustomTimeForAdd = () => {
    const t = addCustomTimeInput.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return;
    if (selectedTimes.includes(t)) { setAddCustomTimeInput(''); setShowAddCustomTimeField(false); return; }
    if (availableSlots - selectedTimes.length <= 0) return;
    setSelectedTimes((prev) => [...prev, t]);
    setAddCustomTimeInput('');
    setShowAddCustomTimeField(false);
    Keyboard.dismiss();
  };

  const handleAddSave = async () => {
    if (!isAddValid || addSaving) return;
    Keyboard.dismiss();
    setAddSaving(true);
    await addPill({
      name: finalName.trim(),
      emoji: selectedIcon.emoji,
      color: selectedIcon.color,
      dosageAmount: dosageAmount.trim() || undefined,
      dosageUnit: selectedUnit || undefined,
      times: [...selectedTimes].sort(),
    });
    setAddSaving(false);
    setShowQuickAdd(false);
  };

  const handleAddPress = () => {
    if (usedSlots >= maxSlots) {
      setShowSlotModal(true);
    } else {
      resetAddForm();
      setShowQuickAdd(true);
    }
  };

  const handleDelete = (pill: Pill, time: string) => {
    const isLastSlot = pill.times.length === 1;
    Alert.alert(
      isLastSlot ? `"${pill.name}" 삭제` : `"${pill.name}" (${time}) 삭제`,
      isLastSlot
        ? '삭제하면 복약 기록에서도 제외돼요. 정말 삭제할까요?'
        : '이 시간대만 삭제돼요. 나머지 시간대는 유지돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            if (isLastSlot) {
              await deletePill(pill.id);
            } else {
              await Promise.all([
                updatePill({ ...pill, times: pill.times.filter((t) => t !== time) }),
                decreaseSlot(),
              ]);
            }
          },
        },
      ]
    );
  };

  // --- Edit bottom sheet ---
  const [editingPill, setEditingPill] = useState<Pill | null>(null);
  const [editingTime, setEditingTime] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editIsCustomName, setEditIsCustomName] = useState(false);
  const [editCustomName, setEditCustomName] = useState('');
  const [editIcon, setEditIcon] = useState(ICONS[0]);
  const [editDosageAmount, setEditDosageAmount] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editTimes, setEditTimes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [showCustomTimeField, setShowCustomTimeField] = useState(false);

  const addCustomTime = () => {
    const t = customTimeInput.trim();
    if (!/^\d{2}:\d{2}$/.test(t)) return;
    if (editTimes.includes(t)) { setCustomTimeInput(''); setShowCustomTimeField(false); return; }
    if (editAvailableSlots - editTimes.length <= 0) return;
    setEditTimes((prev) => [...prev, t]);
    setCustomTimeInput('');
    setShowCustomTimeField(false);
    Keyboard.dismiss();
  };

  const openEdit = (pill: Pill, time: string) => {
    const matchedPreset = NAME_PRESETS.includes(pill.name);
    setEditName(matchedPreset ? pill.name : '');
    setEditIsCustomName(!matchedPreset);
    setEditCustomName(matchedPreset ? '' : pill.name);
    const icon = ICONS.find((i) => i.emoji === pill.emoji) ?? ICONS[0];
    setEditIcon(icon);
    setEditDosageAmount(pill.dosageAmount ?? '');
    setEditUnit(pill.dosageUnit ?? '');
    setEditTimes([time]);
    setEditingTime(time);
    setEditingPill(pill);
    setCustomTimeInput('');
    setShowCustomTimeField(false);
  };

  const closeEdit = () => {
    Keyboard.dismiss();
    setEditingPill(null);
  };

  const finalEditName = editIsCustomName ? editCustomName : editName;
  const editIsValid = finalEditName.trim().length > 0 && editTimes.length > 0;

  // slots available when editing: free up the 1 slot being edited
  const editAvailableSlots = maxSlots - (usedSlots - 1);

  const toggleEditTime = (time: string) => {
    setEditTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleEditSave = async () => {
    if (!editingPill || !editIsValid || saving) return;
    if (editTimes.length > editAvailableSlots) {
      Alert.alert(
        '슬롯이 부족해요',
        `선택한 시간대 ${editTimes.length}개 중 ${editAvailableSlots}개 슬롯만 남아있어요.`,
        [{ text: '확인' }]
      );
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    const newTimes = [
      ...editingPill.times.filter((t) => t !== editingTime),
      ...editTimes,
    ].sort();
    await updatePill({
      ...editingPill,
      name: finalEditName.trim(),
      emoji: editIcon.emoji,
      color: editIcon.color,
      dosageAmount: editDosageAmount.trim() || undefined,
      dosageUnit: editUnit || undefined,
      times: newTimes,
    });
    setSaving(false);
    setEditingPill(null);
  };

  // Flatten to (pill, time) items
  const timeSlotItems = pills.flatMap((pill) =>
    pill.times.map((time) => ({ pill, time }))
  );

  return (
    <SafeAreaView style={styles.container}>
      <SimpleHeader
        title="영양제 관리"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {pills.length === 0 ? (
          <EmptyState onAdd={handleAddPress} />
        ) : (
          <>
            <Text style={styles.sectionHint}>
              {usedSlots} / {maxSlots} 슬롯 사용 중
            </Text>
            {timeSlotItems.map(({ pill, time }) => (
              <TimeSlotCard
                key={`${pill.id}-${time}`}
                pill={pill}
                time={time}
                onEdit={() => openEdit(pill, time)}
                onDelete={() => handleDelete(pill, time)}
              />
            ))}
          </>
        )}
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

      {pills.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPress} activeOpacity={0.85}>
            <Text style={styles.addButtonText}>+ 영양제 추가</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 슬롯 부족 모달 */}
      <Modal visible={showSlotModal} transparent animationType="fade" onRequestClose={() => setShowSlotModal(false)}>
        <TouchableOpacity style={slotStyles.overlay} activeOpacity={1} onPress={() => setShowSlotModal(false)}>
          <TouchableOpacity style={slotStyles.card} activeOpacity={1}>
            <Text style={slotStyles.emoji}>🎁</Text>
            <Text style={slotStyles.title}>영양제 슬롯이 꽉 찼어요</Text>
            <Text style={slotStyles.desc}>
              현재 최대 {maxSlots}개까지 등록할 수 있어요.{'\n'}
              짧은 광고를 시청하면 슬롯을 1개 더 추가할 수 있어요.
            </Text>
            <TouchableOpacity
              style={[slotStyles.watchBtn, !adLoaded && slotStyles.watchBtnDisabled]}
              onPress={handleWatchAd}
              disabled={!adLoaded}
              activeOpacity={0.85}
            >
              <Text style={slotStyles.watchBtnText}>
                {adLoaded ? '광고 보고 슬롯 추가하기' : '광고 준비 중...'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={slotStyles.cancelBtn} onPress={() => setShowSlotModal(false)} activeOpacity={0.7}>
              <Text style={slotStyles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 추가 바텀 시트 */}
      <Modal visible={showQuickAdd} transparent animationType="slide" onRequestClose={() => setShowQuickAdd(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowQuickAdd(false); }}>
            <View style={editStyles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={editStyles.card}>
                  <View style={editStyles.handle} />
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={editStyles.title}>영양제 추가</Text>

                    <Text style={editStyles.label}>이름</Text>
                    <View style={editStyles.chipWrap}>
                      {NAME_PRESETS.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[editStyles.chip, !isCustomName && selectedName === n && editStyles.chipSelected]}
                          onPress={() => { setSelectedName(n); setIsCustomName(false); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.chipText, !isCustomName && selectedName === n && editStyles.chipTextSelected]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[editStyles.chip, isCustomName && editStyles.chipSelected]}
                        onPress={() => { setIsCustomName(true); setSelectedName(''); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[editStyles.chipText, isCustomName && editStyles.chipTextSelected]}>직접입력</Text>
                      </TouchableOpacity>
                    </View>
                    {isCustomName && (
                      <TextInput
                        style={editStyles.nameInput}
                        placeholder="영양제 이름 입력"
                        placeholderTextColor="#9CA3AF"
                        value={customName}
                        onChangeText={setCustomName}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        autoFocus
                      />
                    )}

                    <Text style={editStyles.label}>아이콘</Text>
                    <View style={editStyles.iconRow}>
                      {ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon.emoji}
                          style={[editStyles.iconChip, selectedIcon.emoji === icon.emoji && { borderColor: icon.color, backgroundColor: icon.color + '18' }]}
                          onPress={() => setSelectedIcon(icon)}
                          activeOpacity={0.7}
                        >
                          <Text style={editStyles.iconEmoji}>{icon.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={editStyles.label}>단위<Text style={editStyles.optional}>(선택)</Text></Text>
                    <View style={editStyles.dosageRow}>
                      <TextInput
                        style={editStyles.dosageInput}
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
                          style={[editStyles.unitChip, selectedUnit === unit && editStyles.unitChipSelected]}
                          onPress={() => { setSelectedUnit(selectedUnit === unit ? '' : unit); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.unitChipText, selectedUnit === unit && editStyles.unitChipTextSelected]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={editStyles.label}>
                      복용 시간{'  '}
                      <Text style={[editStyles.optional, availableSlots - selectedTimes.length < 0 && { color: '#EF4444' }]}>
                        (잔여 슬롯 {Math.max(0, availableSlots - selectedTimes.length)}개)
                      </Text>
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={editStyles.timeChipWrap}>
                      {PRESET_TIMES.map(({ label, time }) => {
                        const sel = selectedTimes.includes(time);
                        const noSlot = !sel && availableSlots - selectedTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[editStyles.timeChip, sel && editStyles.timeChipSelected, noSlot && editStyles.timeChipDisabled]}
                            onPress={() => { if (!noSlot) { toggleTime(time); Keyboard.dismiss(); } }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[editStyles.timeChipLabel, sel && editStyles.timeChipLabelSelected, noSlot && editStyles.timeChipDisabledText]}>{label}</Text>
                            <Text style={[editStyles.timeChipTime, sel && editStyles.timeChipTimeSelected, noSlot && editStyles.timeChipDisabledText]}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {selectedTimes.filter((t) => !PRESET_TIMES.some((p) => p.time === t)).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[editStyles.timeChip, editStyles.timeChipSelected]}
                          onPress={() => toggleTime(t)}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.timeChipLabel, editStyles.timeChipLabelSelected]}>직접 입력</Text>
                          <Text style={[editStyles.timeChipTime, editStyles.timeChipTimeSelected]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                      {(() => {
                        const noSlot = availableSlots - selectedTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            style={[editStyles.timeChip, showAddCustomTimeField && editStyles.timeChipSelected, noSlot && editStyles.timeChipDisabled]}
                            onPress={() => { if (!noSlot) setShowAddCustomTimeField(true); }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[editStyles.timeChipLabel, showAddCustomTimeField && editStyles.timeChipLabelSelected, noSlot && editStyles.timeChipDisabledText]}>직접 입력</Text>
                            <Text style={[editStyles.timeChipTime, showAddCustomTimeField && editStyles.timeChipTimeSelected, noSlot && editStyles.timeChipDisabledText]}>+ 추가</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </ScrollView>
                    {showAddCustomTimeField && (
                      <View style={editStyles.customTimeRow}>
                        <TextInput
                          style={editStyles.customTimeInput}
                          placeholder="HH:MM"
                          placeholderTextColor="#9CA3AF"
                          value={addCustomTimeInput}
                          onChangeText={setAddCustomTimeInput}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                          returnKeyType="done"
                          onSubmitEditing={addCustomTimeForAdd}
                          autoFocus
                        />
                        <TouchableOpacity style={editStyles.customTimeAddBtn} onPress={addCustomTimeForAdd} activeOpacity={0.8}>
                          <Text style={editStyles.customTimeAddBtnText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[editStyles.saveBtn, !isAddValid && editStyles.saveBtnDisabled]}
                      onPress={handleAddSave}
                      disabled={!isAddValid || addSaving}
                      activeOpacity={0.85}
                    >
                      <Text style={editStyles.saveBtnText}>{addSaving ? '저장 중...' : '저장'}</Text>
                    </TouchableOpacity>
                    <View style={{ height: 8 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* 수정 바텀 시트 */}
      <Modal visible={!!editingPill} transparent animationType="slide" onRequestClose={closeEdit}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={closeEdit}>
            <View style={editStyles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={editStyles.card}>
                  <View style={editStyles.handle} />
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={editStyles.title}>영양제 수정</Text>

                    {/* 이름 */}
                    <Text style={editStyles.label}>이름</Text>
                    <View style={editStyles.chipWrap}>
                      {NAME_PRESETS.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[editStyles.chip, !editIsCustomName && editName === n && editStyles.chipSelected]}
                          onPress={() => { setEditName(n); setEditIsCustomName(false); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.chipText, !editIsCustomName && editName === n && editStyles.chipTextSelected]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[editStyles.chip, editIsCustomName && editStyles.chipSelected]}
                        onPress={() => { setEditIsCustomName(true); setEditName(''); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[editStyles.chipText, editIsCustomName && editStyles.chipTextSelected]}>직접입력</Text>
                      </TouchableOpacity>
                    </View>
                    {editIsCustomName && (
                      <TextInput
                        style={editStyles.nameInput}
                        placeholder="영양제 이름 입력"
                        placeholderTextColor="#9CA3AF"
                        value={editCustomName}
                        onChangeText={setEditCustomName}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        autoFocus
                      />
                    )}

                    {/* 아이콘 */}
                    <Text style={editStyles.label}>아이콘</Text>
                    <View style={editStyles.iconRow}>
                      {ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon.emoji}
                          style={[editStyles.iconChip, editIcon.emoji === icon.emoji && { borderColor: icon.color, backgroundColor: icon.color + '18' }]}
                          onPress={() => setEditIcon(icon)}
                          activeOpacity={0.7}
                        >
                          <Text style={editStyles.iconEmoji}>{icon.emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 개수/단위 */}
                    <Text style={editStyles.label}>단위<Text style={editStyles.optional}>(선택)</Text></Text>
                    <View style={editStyles.dosageRow}>
                      <TextInput
                        style={editStyles.dosageInput}
                        placeholder="수량"
                        placeholderTextColor="#9CA3AF"
                        value={editDosageAmount}
                        onChangeText={setEditDosageAmount}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                      {UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[editStyles.unitChip, editUnit === unit && editStyles.unitChipSelected]}
                          onPress={() => { setEditUnit(editUnit === unit ? '' : unit); Keyboard.dismiss(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.unitChipText, editUnit === unit && editStyles.unitChipTextSelected]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 복용 시간 */}
                    <Text style={editStyles.label}>
                      복용 시간{'  '}
                      <Text style={[editStyles.optional, editAvailableSlots - editTimes.length < 0 && { color: '#EF4444' }]}>
                        (잔여 슬롯 {Math.max(0, editAvailableSlots - editTimes.length)}개)
                      </Text>
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={editStyles.timeChipWrap}>
                      {PRESET_TIMES.map(({ label, time }) => {
                        const sel = editTimes.includes(time);
                        const noSlot = !sel && editAvailableSlots - editTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            key={time}
                            style={[editStyles.timeChip, sel && editStyles.timeChipSelected, noSlot && editStyles.timeChipDisabled]}
                            onPress={() => { if (!noSlot) { toggleEditTime(time); Keyboard.dismiss(); } }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[editStyles.timeChipLabel, sel && editStyles.timeChipLabelSelected, noSlot && editStyles.timeChipDisabledText]}>{label}</Text>
                            <Text style={[editStyles.timeChipTime, sel && editStyles.timeChipTimeSelected, noSlot && editStyles.timeChipDisabledText]}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {editTimes.filter((t) => !PRESET_TIMES.some((p) => p.time === t)).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[editStyles.timeChip, editStyles.timeChipSelected]}
                          onPress={() => toggleEditTime(t)}
                          activeOpacity={0.7}
                        >
                          <Text style={[editStyles.timeChipLabel, editStyles.timeChipLabelSelected]}>직접 입력</Text>
                          <Text style={[editStyles.timeChipTime, editStyles.timeChipTimeSelected]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                      {(() => {
                        const noSlot = editAvailableSlots - editTimes.length <= 0;
                        return (
                          <TouchableOpacity
                            style={[editStyles.timeChip, showCustomTimeField && editStyles.timeChipSelected, noSlot && editStyles.timeChipDisabled]}
                            onPress={() => { if (!noSlot) setShowCustomTimeField(true); }}
                            activeOpacity={noSlot ? 1 : 0.7}
                          >
                            <Text style={[editStyles.timeChipLabel, showCustomTimeField && editStyles.timeChipLabelSelected, noSlot && editStyles.timeChipDisabledText]}>직접 입력</Text>
                            <Text style={[editStyles.timeChipTime, showCustomTimeField && editStyles.timeChipTimeSelected, noSlot && editStyles.timeChipDisabledText]}>+ 추가</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </ScrollView>
                    {showCustomTimeField && (
                      <View style={editStyles.customTimeRow}>
                        <TextInput
                          style={editStyles.customTimeInput}
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
                        <TouchableOpacity style={editStyles.customTimeAddBtn} onPress={addCustomTime} activeOpacity={0.8}>
                          <Text style={editStyles.customTimeAddBtnText}>추가</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[editStyles.saveBtn, !editIsValid && editStyles.saveBtnDisabled]}
                      onPress={handleEditSave}
                      disabled={!editIsValid || saving}
                      activeOpacity={0.85}
                    >
                      <Text style={editStyles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
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

function TimeSlotCard({ pill, time, onEdit, onDelete }: {
  pill: Pill;
  time: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={onEdit} activeOpacity={0.7}>
        <View style={[styles.pillIcon, { backgroundColor: pill.color + '22' }]}>
          <Text style={styles.pillEmoji}>{pill.emoji}</Text>
        </View>
        <View style={styles.pillInfo}>
          <Text style={styles.pillName}>{pill.name}</Text>
          <Text style={styles.pillTime}>{formatTime(time)}</Text>
          {pill.dosageAmount && pill.dosageUnit
            ? <Text style={styles.pillNote}>{pill.dosageAmount}{pill.dosageUnit}</Text>
            : pill.note
              ? <Text style={styles.pillNote}>{pill.note}</Text>
              : null}
        </View>
        <View style={[styles.colorDot, { backgroundColor: pill.color }]} />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={styles.editBtnText}>수정</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SimpleHeader({ title, onBack, rightLabel, onRight }: {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRight?: () => void;
}) {
  return (
    <View style={headerStyles.container}>
      <TouchableOpacity onPress={onBack} style={headerStyles.side} activeOpacity={0.7}>
        <Text style={headerStyles.back}>‹</Text>
      </TouchableOpacity>
      <Text style={headerStyles.title}>{title}</Text>
      <TouchableOpacity onPress={onRight} style={headerStyles.side} activeOpacity={0.7}>
        <Text style={headerStyles.right}>{rightLabel ?? ''}</Text>
      </TouchableOpacity>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  side: { width: 64, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, color: '#111827', lineHeight: 40 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  right: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
});

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📋</Text>
      <Text style={styles.emptyTitle}>등록된 영양제가 없어요</Text>
      <Text style={styles.emptyDesc}>복용 중인 약이나 영양제를{'\n'}추가해보세요</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd} activeOpacity={0.85}>
        <Text style={styles.emptyButtonText}>+ 영양제 추가하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHint: { fontSize: 13, color: '#6B7280', marginBottom: 12, fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  pillIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  pillEmoji: { fontSize: 24 },
  pillInfo: { flex: 1 },
  pillName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  pillTime: { fontSize: 13, color: PRIMARY_DARK, fontWeight: '600' },
  pillNote: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  editBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  editBtnText: { fontSize: 14, fontWeight: '600', color: PRIMARY_DARK },
  divider: { width: 1, backgroundColor: '#F3F4F6' },
  deleteBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  banner: { width: '100%', height: 96, overflow: 'hidden' },
  footer: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 12 },
  addButton: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  addButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyButton: { backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  emptyButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const slotStyles = StyleSheet.create({
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

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  optional: { fontWeight: '400', color: '#9CA3AF' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  chipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextSelected: { color: PRIMARY_DARK },
  nameInput: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827', marginBottom: 4 },
  iconRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  iconChip: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 24 },
  dosageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dosageInput: { width: 72, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', textAlign: 'center' },
  unitChip: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  unitChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  unitChipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  unitChipTextSelected: { color: PRIMARY_DARK },
  timeChipWrap: { flexDirection: 'row', gap: 8, paddingBottom: 20, paddingRight: 4 },
  timeChip: { width: 76, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center' },
  timeChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  timeChipLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  timeChipLabelSelected: { color: PRIMARY_DARK },
  timeChipTime: { fontSize: 11, color: '#9CA3AF' },
  timeChipTimeSelected: { color: PRIMARY },
  timeChipDisabled: { opacity: 0.4 },
  timeChipDisabledText: { color: '#9CA3AF' },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  customTimeInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827' },
  customTimeAddBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  customTimeAddBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#D1D5DB' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
