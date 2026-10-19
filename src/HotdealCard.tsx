/**
 * 핫딜 특가 '오늘의 특가' 카드 (10/19 형님) — 홈 이미지 광고 바로 위(이 앱엔 다른 앱 안내가 없다).
 * 상품은 핫딜 특가 서버가 고른다(GET /promo?app=pillcheck: 건강 → 없으면 선착순 추천 1위). 규칙을 바꿔도 이 앱은 재심사 없음.
 * 누르면 핫딜 특가 미니앱의 그 상품 화면으로(토스쇼핑 직행 금지). 화면은 먼저 뜨고 카드는 나중에 채운다 — 못 받으면 숨김.
 * 같은 파일이 수금(watercoin)·기억력(mindnote)에도 있다(APP·색만 다름).
 */
import { eventLog } from '@apps-in-toss/framework';
import React, { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 이 앱엔 theme 파일이 없어 홈과 같은 값을 둔다
const CARD = '#FFFFFF';
const BORDER = '#DCFCE7';
const TEXT = '#191F28';
const TEXT_MUTED = '#8B95A1';

const APP = 'pillcheck';
const API = 'https://hotdeal-api.jameslee0206.workers.dev/promo';
const TIMEOUT_MS = 4000;
const RED = '#F04452';

interface Card {
  id: string;
  name: string;
  thumb: string | null;
  price: number;
  orig: number | null;
  rate: number | null;
}

function log(name: 'hotdeal_card_view' | 'hotdeal_card_tap', id: string) {
  try {
    void eventLog({ log_name: name, log_type: 'event', params: { id } }).catch(() => {});
  } catch {
    /* 무시 */
  }
}

const won = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;
/** "이름, 옵션, 1개" → 앞 두 토막만 */
const short = (n: string) => n.split(',').slice(0, 2).join(',').trim();

export function HotdealCard() {
  const [card, setCard] = useState<Card | null>(null);
  useEffect(() => {
    // 4초 안에 못 받으면 이번엔 카드 없이 간다(늦게 온 응답도 버림)
    let alive = true;
    const t = setTimeout(() => (alive = false), TIMEOUT_MS);
    fetch(`${API}?app=${APP}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ card?: Card | null }>) : null))
      .then((d) => {
        if (alive && d?.card?.id && d.card.thumb) {
          setCard(d.card);
          log('hotdeal_card_view', d.card.id);
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(t));
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  if (!card) return null;
  const onPress = () => {
    log('hotdeal_card_tap', card.id);
    Linking.openURL(`intoss://foundphone/item?id=${encodeURIComponent(card.id)}&from=${APP}`).catch(() => {});
  };
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <Image source={{ uri: card.thumb! }} style={s.thumb} />
      <View style={s.body}>
        <Text style={s.label} maxFontSizeMultiplier={1.3}>오늘의 특가 · 핫딜 특가</Text>
        <Text style={s.name} numberOfLines={2} maxFontSizeMultiplier={1.3}>{short(card.name)}</Text>
        <Text style={s.priceRow} maxFontSizeMultiplier={1.3}>
          {card.rate ? <Text style={s.rate}>{`${card.rate}% `}</Text> : null}
          <Text style={s.price}>{won(card.price)}</Text>
        </Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderWidth: 1, borderColor: BORDER },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F2F4F6' },
  body: { flex: 1, gap: 3 },
  label: { fontSize: 11.5, color: TEXT_MUTED, fontWeight: '600' },
  name: { fontSize: 14, fontWeight: '700', color: TEXT, lineHeight: 19 },
  priceRow: { fontSize: 15 },
  rate: { color: RED, fontWeight: '800' },
  price: { color: TEXT, fontWeight: '800' },
  chevron: { fontSize: 19, color: TEXT_MUTED, fontWeight: '600' },
});
