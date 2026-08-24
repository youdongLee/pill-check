import React, { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { INGREDIENTS, findIngredient } from '../data/ingredients';
import type { ProductIngredient } from '../data/products';
import { BORDER, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, TEXT_MUTED, TEXT_SUB } from './theme';

/**
 * 성분 직접 입력.
 *
 * 프리셋에 없는 제품을 위한 화면이라, 제품 뒷면을 보고 그대로 옮겨 적는 것이 목표다.
 * 5060 타깃이라 단계를 둘로만 나눈다: ①성분을 고른다 ②숫자를 넣는다.
 */
export function IngredientPicker({
  value,
  onChange,
}: {
  value: ProductIngredient[];
  onChange: (next: ProductIngredient[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const selectedKeys = useMemo(() => new Set(value.map((v) => v.key)), [value]);

  // 고른 것을 위로 올려 보여준다 — 목록이 길어 아래로 사라지면 찾기 어렵다
  const list = useMemo(() => {
    const chosen = INGREDIENTS.filter((i) => selectedKeys.has(i.key));
    const rest = INGREDIENTS.filter((i) => !selectedKeys.has(i.key));
    return expanded ? [...chosen, ...rest] : [...chosen, ...rest.slice(0, 12)];
  }, [selectedKeys, expanded]);

  const toggle = (key: string) => {
    Keyboard.dismiss();
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => v.key !== key));
    } else {
      onChange([...value, { key, amount: 0 }]);
    }
  };

  const setAmount = (key: string, text: string) => {
    const n = Number(text.replace(/[^0-9.]/g, ''));
    onChange(value.map((v) => (v.key === key ? { ...v, amount: Number.isFinite(n) ? n : 0 } : v)));
  };

  return (
    <View>
      <Text style={styles.help}>
        제품 뒷면 영양성분표를 보고 골라주세요. 모르면 건너뛰셔도 되지만, 넣어두시면 겹치는 성분을 찾아드려요.
      </Text>

      <View style={styles.chipWrap}>
        {list.map((ing) => {
          const on = selectedKeys.has(ing.key);
          return (
            <TouchableOpacity
              key={ing.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => toggle(ing.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{ing.name}</Text>
            </TouchableOpacity>
          );
        })}
        {!expanded && (
          <TouchableOpacity style={styles.chip} onPress={() => setExpanded(true)} activeOpacity={0.8}>
            <Text style={styles.chipText}>더 보기 ▾</Text>
          </TouchableOpacity>
        )}
      </View>

      {value.length > 0 && (
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>한 번에 드시는 양</Text>
          {value.map((v) => {
            const meta = findIngredient(v.key);
            if (!meta) return null;
            return (
              <View key={v.key} style={styles.amountRow}>
                <Text style={styles.amountName}>{meta.name}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={TEXT_MUTED}
                  defaultValue={v.amount > 0 ? String(v.amount) : ''}
                  onEndEditing={(e) => setAmount(v.key, e.nativeEvent.text)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  maxLength={7}
                />
                <Text style={styles.amountUnit}>{meta.unit}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  chipOn: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#4B5563' },
  chipTextOn: { color: PRIMARY_DARK, fontWeight: '800' },

  amountBox: { marginTop: 16, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14 },
  amountLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  amountName: { flex: 1, fontSize: 14, color: TEXT_SUB, fontWeight: '600' },
  amountInput: {
    width: 88, backgroundColor: '#F3F4F6', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'center',
  },
  amountUnit: { width: 34, fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
});
