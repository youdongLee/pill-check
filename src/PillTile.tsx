import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pill } from '../data/types';

/**
 * 홈·관리 공용 타일 (한 장 화면에서 이미지 광고가 첫 화면에 다 보이도록 줄인 크기).
 * 4열: 영양제 3개 + '추가' 칸이 한 줄에 들어가 '추가' 칸만 홀로 남는 줄(≈100px)이 생기지 않는다.
 * 감싸는 View 좌우 여백 12 기준.
 */
const SCREEN_WIDTH = Dimensions.get('window').width;
export const TILE_COLUMNS = 4;
export const TILE_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 24) / TILE_COLUMNS);

/** 큰글씨: 보조 글자는 1.3배까지, 이름·핵심 숫자는 1.5배까지 */
export const SUB_MAX = 1.3;
export const KEY_MAX = 1.5;

export function PillTile({ pill, time, taken, onPress, onLongPress }: {
  pill: Pill;
  time: string;
  taken?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const dose = pill.dosageAmount && pill.dosageUnit ? `${pill.dosageAmount}${pill.dosageUnit}` : '';
  return (
    <TouchableOpacity style={s.cell} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={[s.card, taken && s.cardTaken, { borderColor: pill.color + '50' }]}>
        <Text style={[s.time, taken && s.timeTaken]} maxFontSizeMultiplier={SUB_MAX}>{time}</Text>
        <View style={[s.emojiWrap, { backgroundColor: pill.color + '22' }]}>
          <Text style={s.emoji} maxFontSizeMultiplier={SUB_MAX}>{pill.emoji}</Text>
          {taken && (
            <View style={s.check}>
              <Text style={s.checkText} maxFontSizeMultiplier={1}>✓</Text>
            </View>
          )}
        </View>
        <Text style={[s.name, taken && s.nameTaken]} numberOfLines={1} maxFontSizeMultiplier={KEY_MAX}>{pill.name}</Text>
        {!!dose && <Text style={s.dose} numberOfLines={1} maxFontSizeMultiplier={SUB_MAX}>{dose}</Text>}
      </View>
    </TouchableOpacity>
  );
}

/** 목록 마지막 '+ 추가' 타일. 자리가 꽉 찼으면 자물쇠 + 자리 추가 흐름 */
export function AddTile({ used, max, onPress }: { used: number; max: number; onPress: () => void }) {
  const full = used >= max;
  return (
    <TouchableOpacity style={s.cell} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.card, s.addCard, full && s.addCardFull]}>
        <Text style={[s.addPlus, full && s.addPlusFull]} maxFontSizeMultiplier={SUB_MAX}>{full ? '🔒' : '+'}</Text>
        <Text style={[s.addText, full && s.addTextFull]} maxFontSizeMultiplier={KEY_MAX}>추가</Text>
        <Text style={s.dose} maxFontSizeMultiplier={SUB_MAX}>{`${used}/${max}`}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  cell: { width: TILE_CELL_WIDTH, paddingHorizontal: 3, paddingBottom: 6 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  cardTaken: { backgroundColor: '#DCFCE7' },
  time: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 },
  timeTaken: { color: '#16A34A' },
  emojiWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emoji: { fontSize: 18 },
  check: {
    position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  checkText: { fontSize: 7, color: '#FFFFFF', fontWeight: '800' },
  name: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center' },
  nameTaken: { color: '#6B7280', textDecorationLine: 'line-through' },
  dose: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 1 },
  addCard: { borderStyle: 'dashed', borderColor: '#22C55E', backgroundColor: '#F7FEF9', justifyContent: 'center' },
  addCardFull: { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  addPlus: { fontSize: 20, fontWeight: '800', color: '#16A34A', lineHeight: 24 },
  addPlusFull: { fontSize: 16, color: '#9CA3AF' },
  addText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  addTextFull: { color: '#9CA3AF' },
});
