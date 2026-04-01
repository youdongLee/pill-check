import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, TextField } from '@toss/tds-react-native';
import { usePills } from '../stores/PillContext';
import { PILL_COLORS, PILL_EMOJIS, PRESET_TIMES } from '../data/constants';

export const Route = createRoute('/edit', { component: EditPage });

const PRIMARY = '#22C55E';
const PRIMARY_DARK = '#16A34A';

function EditPage() {
  const navigation = Route.useNavigation();
  const params = Route.useParams<{ id: string }>();
  const { pills, updatePill, deletePill } = usePills();

  const pill = pills.find((p) => p.id === params.id);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💊');
  const [color, setColor] = useState(PRIMARY);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pill) {
      setName(pill.name);
      setEmoji(pill.emoji);
      setColor(pill.color);
      setSelectedTimes([...pill.times]);
      setNote(pill.note ?? '');
    }
  }, [pill?.id]);

  if (!pill) {
    return (
      <SafeAreaView style={styles.container}>
        <SimpleHeader title="영양제 수정" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>영양제를 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isValid = name.trim().length > 0 && selectedTimes.length > 0;

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    await updatePill({
      ...pill,
      name: name.trim(),
      emoji,
      color,
      times: [...selectedTimes].sort(),
      note: note.trim() || undefined,
    });
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(`"${pill.name}" 삭제`, '삭제하면 오늘 복약 체크리스트에서도 제거돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deletePill(pill.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <SimpleHeader
        title="영양제 수정"
        rightLabel="삭제"
        onRight={handleDelete}
      />

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
          <TextField
            variant="box"
            placeholder="예) 비타민 C, 오메가3"
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

        {/* Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>복용 시간 * (중복 선택 가능)</Text>
          <View style={styles.timeGrid}>
            {PRESET_TIMES.map(({ label, time }) => {
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
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메모 (선택)</Text>
          <TextField
            variant="box"
            placeholder="예) 식후 30분, 물과 함께"
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
      <View style={headerStyles.side} />
      <Text style={headerStyles.title}>{title}</Text>
      <TouchableOpacity onPress={onRight} style={headerStyles.side} activeOpacity={0.7}>
        <Text style={[headerStyles.right, rightLabel === '삭제' && { color: '#EF4444' }]}>{rightLabel ?? ''}</Text>
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
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
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
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
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
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    minWidth: 90,
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
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: '#F9FAFB',
  },
});
