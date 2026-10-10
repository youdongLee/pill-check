import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AD_IDS } from './ads';
import { SHOW_DEV_PANEL, devFlags } from './devFlags';

export type AdGuide = { title: string; message: string; confirm: string };

/**
 * 리워드 광고 — 화면당 인스턴스 하나.
 * - enabled 일 때만 미리 불러온다(오늘 쓸 일이 없으면 요청하지 않는다).
 * - 광고는 항상 안내 창(Alert)을 거친 뒤에만 띄운다. 한 번 누르자마자 광고가 뜨지 않는다.
 * - 보상은 userEarnedReward 에서만, 한 번만 실행한다.
 * - 광고를 지원하지 않는 환경에서는 supported=false — 화면은 광고 버튼을 숨긴다(광고 없이 보상 없음).
 */
export function useRewardAd(enabled: boolean) {
  const supported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);
  const unregisterRef = useRef<(() => void) | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(15000);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const mounted = useRef(true);

  const load = useCallback(() => {
    if (!supported || loadingRef.current || loadedRef.current || !enabledRef.current) return;
    loadingRef.current = true;
    unregisterRef.current?.();
    unregisterRef.current = loadFullScreenAd({
      options: { adGroupId: AD_IDS.reward },
      onEvent: (e) => {
        if (e.type === 'loaded') {
          loadingRef.current = false;
          loadedRef.current = true;
          backoffRef.current = 15000;
          if (mounted.current) setLoaded(true);
        }
      },
      onError: () => {
        loadingRef.current = false;
        if (!mounted.current) return;
        const wait = backoffRef.current;
        backoffRef.current = Math.min(wait * 2, 300000);
        retryRef.current = setTimeout(load, wait);
      },
    });
  }, [supported]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      unregisterRef.current?.();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const play = (onEarned: () => void | Promise<void>) => {
    if (SHOW_DEV_PANEL && devFlags.skipAds) { void onEarned(); return; }
    if (!supported || !loadedRef.current || playing) return;
    setPlaying(true);
    loadedRef.current = false;
    setLoaded(false);
    let earned = false;
    showFullScreenAd({
      options: { adGroupId: AD_IDS.reward },
      onEvent: (e) => {
        if (e.type === 'userEarnedReward' && !earned) {
          earned = true;
          void onEarned();
        }
        if (e.type === 'dismissed' || e.type === 'failedToShow') {
          if (mounted.current) setPlaying(false);
          load();
        }
      },
      onError: () => {
        if (mounted.current) setPlaying(false);
        load();
      },
    });
  };

  /** 안내 창 → [확인 버튼] → 광고 → 끝까지 보면 onEarned */
  const confirmAndPlay = (guide: AdGuide, onEarned: () => void | Promise<void>) => {
    Alert.alert(guide.title, guide.message, [
      { text: '취소', style: 'cancel' },
      { text: guide.confirm, onPress: () => play(onEarned) },
    ]);
  };

  const skipOn = SHOW_DEV_PANEL && devFlags.skipAds;
  return { supported: supported || skipOn, loaded: loaded || skipOn, playing, confirmAndPlay, play, load };
}
