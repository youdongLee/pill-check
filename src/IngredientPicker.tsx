import React, { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { INGREDIENTS, findIngredient } from '../data/ingredients';
import type { ProductIngredient } from '../data/products';
import { LINE, PAD, SURFACE, T_SMALL, T_SUB, TEXT, TEXT_MUTED, TEXT_SUB } from './theme';
import { Pill } from './ui';

/** 처음에 보여줄 성분 수 — 45종을 한꺼번에 펼치면 고르기 어렵다 */
const PREVIEW = 12;

/**
 * 성분 직접 입력. 제품 뒷면을 보고 옮겨 적는 화면이라 단계를 둘로만 나눈다:
 * ①성분을 고른다 ②숫자를 넣는다.
 */
export function IngredientPicker({
  value,
  onChange,
}: {
  value: ProductIngredient[];
  onChange: (next: ProductIngredient[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = useMemo(() => new Set(value.map((v) => v.key)), [value]);

  // 고른 것을 앞으로 — 목록이 길어 아래로 사라지면 다시 찾기 어렵다
  const list = useMemo(() => {
    const chosen = INGREDIENTS.filter((i) => selected.has(i.key));
    const rest = INGREDIENTS.filter((i) => !selected.has(i.key));
    return expanded ? [...chosen, ...rest] : [...chosen, ...rest.slice(0, PREVIEW)];
  }, [selected, expanded]);

  const toggle = (key: string) => {
    Keyboard.dismiss();
    onChange(selected.has(key) ? value.filter((v) => v.key !== key) : [...value, { key, amount: 0 }]);
  };

  const setAmount = (key: string, text: string) => {
    const n = Number(text.replace(/[^0-9.]/g, ''));
    onChange(value.map((v) => (v.key === key ? { ...v, amount: Number.isFinite(n) ? n : 0 } : v)));
  };

  return (
    <View>
      <View style={s.pills}>
        {list.map((ing) => (
          <Pill key={ing.key} label={ing.name} on={selected.has(ing.key)} onPress={() => toggle(ing.key)} />
        ))}
        {!expanded && <Pill label="더 보기 ▾" onPress={() => setExpanded(true)} />}
      </View>

      {value.length > 0 && (
        <View style={s.amounts}>
          <Text style={s.amountLabel}>한 번에 드시는 양</Text>
          {value.map((v) => {
            const meta = findIngredient(v.key);
            if (!meta) return null;
            return (
              <View key={v.key} style={s.amountRow}>
                <Text style={s.amountName}>{meta.name}</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={TEXT_MUTED}
                  defaultValue={v.amount > 0 ? String(v.amount) : ''}
                  onEndEditing={(e) => setAmount(v.key, e.nativeEvent.text)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={7}
                />
                <Text style={s.unit}>{meta.unit}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: PAD },
  amounts: { marginTop: 20, paddingHorizontal: PAD },
  amountLabel: { fontSize: T_SMALL, fontWeight: '700', color: TEXT_MUTED, marginBottom: 8 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  amountName: { flex: 1, fontSize: T_SUB, color: TEXT_SUB, fontWeight: '600' },
  input: {
    width: 86, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: LINE,
    paddingVertical: 11, fontSize: T_SUB, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  unit: { width: 32, fontSize: T_SMALL, color: TEXT_MUTED, fontWeight: '700' },
});
