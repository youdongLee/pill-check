import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@toss/tds-react-native';
import { usePills } from '../stores/PillContext';
import { PILL_COLORS, PILL_EMOJIS, PRESET_TIMES } from '../data/constants';

export const Route = createRoute('/add', { component: AddPage });

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';

function AddPage() {
  const navigation = Route.useNavigation();
  const { addPill } = usePills();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [color, setColor] = useState(PRIMARY);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [dosageAmount, setDosageAmount] = useState('');
  const [dosageUnit, setDosageUnit] = useState('');

  const [customTimes, setCustomTimes] = useState<{ label: string; time: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customTime, setCustomTime] = useState('');

  const isValid = name.trim().length > 0 && selectedTimes.length > 0;

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleAddCustomTime = () => {
    const label = customLabel.trim();
    const time = customTime.trim();
    if (!label || !time) return;
    const entry = { label, time };
    setCustomTimes((prev) => [...prev, entry]);
    setSelectedTimes((prev) => [...prev, time]);
    setCustomLabel('');
    setCustomTime('');
    setShowModal(false);
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    await addPill({
      name: name.trim(),
      emoji,
      color,
      dosageAmount: dosageAmount.trim() || undefined,
      dosageUnit: dosageUnit || undefined,
      times: [...selectedTimes].sort(),
      note: note.trim() || undefined,
    });
    navigation.goBack();
  };

  const allTimes = [...PRESET_TIMES, ...customTimes];

  return (
    <SafeAreaView style={styles.container}>
      <SimpleHeader title="영양제 추가" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preview */}
        <View style={styles.previewCard}>
          <View style={[styles.previewIcon, { backgroundColor: color + '22' }]}>
            <Text style={styles.previewEmoji}>{emoji}</Text>
          </View>
          <View>
            <Text style={styles.previewName}>{name || '영양제 이름'}</Text>
            <Text style={styles.previewTimes}>
              {selectedTimes.length > 0 ? selectedTimes.sort().join(', ') : '복용 시간 선택'}
            </Text>
          </View>
          <View style={[styles.previewDot, { backgroundColor: color }]} />
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이름 *</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 비타민 C, 오메가3, 마그네슘"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Emoji */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>아이콘</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.emojiRow}>
              {PILL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiChip, emoji === e && styles.emojiChipSelected]}
                  onPress={() => setEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>색상</Text>
          <View style={styles.colorRow}>
            {PILL_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorChip, { backgroundColor: c }, color === c && styles.colorChipSelected]}
                onPress={() => setColor(c)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>

        {/* Dosage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>용량 / 개수 (선택)</Text>
          <View style={styles.dosageRow}>
            <TextInput
              style={styles.dosageInput}
              placeholder="예) 1, 500"
              placeholderTextColor="#9CA3AF"
              value={dosageAmount}
              onChangeText={setDosageAmount}
              keyboardType="numeric"
            />
            <View style={styles.dosageUnits}>
              {['알', '개', 'mg', 'ml'].map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitChip, dosageUnit === unit && styles.unitChipSelected]}
                  onPress={() => setDosageUnit(dosageUnit === unit ? '' : unit)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unitChipText, dosageUnit === unit && styles.unitChipTextSelected]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>복용 시간 * (중복 선택 가능)</Text>
          <View style={styles.timeGrid}>
            {allTimes.map(({ label, time }) => {
              const selected = selectedTimes.includes(time);
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, selected && styles.timeChipSelected]}
                  onPress={() => toggleTime(time)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeChipLabel, selected && styles.timeChipLabelSelected]}>
                    {label}
                  </Text>
                  <Text style={[styles.timeChipTime, selected && styles.timeChipTimeSelected]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.timeChipAdd}
              onPress={() => setShowModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.timeChipAddText}>+</Text>
              <Text style={styles.timeChipAddLabel}>직접 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 식후 30분, 물과 함께"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          type="primary"
          size="big"
          display="full"
          onPress={handleSave}
          disabled={!isValid}
          loading={saving}
        >
          저장
        </Button>
      </View>

      {/* Custom time modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>복용 시간 추가</Text>
            <Text style={styles.modalLabel}>명칭</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예) 운동 후, 간식 후"
              placeholderTextColor="#9CA3AF"
              value={customLabel}
              onChangeText={setCustomLabel}
            />
            <Text style={styles.modalLabel}>시간</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="예) 15:00"
              placeholderTextColor="#9CA3AF"
              value={customTime}
              onChangeText={setCustomTime}
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!customLabel.trim() || !customTime.trim()) && styles.modalConfirmDisabled]}
                onPress={handleAddCustomTime}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>추가</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
  side: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    fontSize: 32,
    color: '#111827',
    lineHeight: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  right: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  previewEmoji: {
    fontSize: 24,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  previewTimes: {
    fontSize: 13,
    color: '#6B7280',
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 'auto',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  emojiChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiChipSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#DCFCE7',
  },
  emojiText: {
    fontSize: 22,
  },
  input: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorChipSelected: {
    borderColor: '#111827',
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dosageInput: {
    width: 90,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  dosageUnits: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  unitChipSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: PRIMARY,
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  unitChipTextSelected: {
    color: PRIMARY_DARK,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    width: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  timeChipSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: PRIMARY,
  },
  timeChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 2,
  },
  timeChipLabelSelected: {
    color: PRIMARY_DARK,
  },
  timeChipTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timeChipTimeSelected: {
    color: PRIMARY,
    fontWeight: '600',
  },
  timeChipAdd: {
    width: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  timeChipAddText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    lineHeight: 22,
  },
  timeChipAddLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: '#F9FAFB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
