import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../stores/ProfileContext';
import { AGE_BANDS, type Sex } from '../data/rda';
import { BG, LINE, PAD, PRIMARY, PRIMARY_DARK, T_SMALL, T_SUB, TEXT, TEXT_MUTED } from '../src/theme';

export const Route = createRoute('/setup', { component: SetupPage });

/**
 * 첫 진입 — 한 화면에 질문 하나.
 * 진단에 필요한 최소한만 묻는다(성별·나이대). 이름도, 키·몸무게도 묻지 않는다.
 */
function SetupPage() {
  const navigation = Route.useNavigation();
  const { save } = useProfile();
  const [step, setStep] = useState<0 | 1>(0);
  const [sex, setSex] = useState<Sex | null>(null);

  const pickSex = (v: Sex) => {
    setSex(v);
    setStep(1);
  };

  const pickBand = async (band: string) => {
    if (!sex) return;
    await save({ sex, band });
    navigation.navigate('/');
  };

  return (
    <SafeAreaView style={s.container}>
      {/* 진행 표시 — 두 걸음뿐이라 점 두 개면 충분하다 */}
      <View style={s.steps}>
        <View style={[s.step, s.stepOn]} />
        <View style={[s.step, step === 1 && s.stepOn]} />
      </View>

      {step === 0 ? (
        <View style={s.stage}>
          <Text style={s.q}>어떻게 되세요?</Text>
          <Text style={s.why}>나이·성별에 따라 필요한 영양소가 달라요</Text>
          <View style={s.choices}>
            <Choice label="여성" onPress={() => pickSex('female')} />
            <Choice label="남성" onPress={() => pickSex('male')} />
          </View>
        </View>
      ) : (
        <View style={s.stage}>
          <Text style={s.q}>연세가 어떻게 되세요?</Text>
          <Text style={s.why}>정확한 나이는 묻지 않아요</Text>
          <View style={s.choices}>
            {AGE_BANDS.map((b) => (
              <Choice key={b.key} label={b.label} onPress={() => pickBand(b.key)} />
            ))}
          </View>
          <TouchableOpacity onPress={() => setStep(0)} activeOpacity={0.7}>
            <Text style={s.back}>앞으로</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.choice} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.choiceText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  steps: { flexDirection: 'row', gap: 7, paddingHorizontal: PAD, paddingTop: 20 },
  step: { flex: 1, height: 4, borderRadius: 2, backgroundColor: LINE },
  stepOn: { backgroundColor: PRIMARY },

  stage: { flex: 1, paddingHorizontal: PAD, paddingTop: 56 },
  q: { fontSize: 30, fontWeight: '800', color: TEXT, lineHeight: 42 },
  why: { fontSize: T_SUB, color: TEXT_MUTED, marginTop: 12, marginBottom: 40 },

  choices: { gap: 12 },
  choice: {
    borderWidth: 1.5, borderColor: LINE, borderRadius: 999,
    paddingVertical: 22, alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  choiceText: { fontSize: 20, fontWeight: '700', color: TEXT },

  back: { fontSize: T_SMALL, color: TEXT_MUTED, textAlign: 'center', paddingTop: 26, fontWeight: '600' },
});
