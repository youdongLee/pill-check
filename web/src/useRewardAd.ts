import { useEffect, useRef, useState } from 'react';
import { useAsk } from './dialog';
import { AD_IDS } from './domain/config';
import { SHOW_DEV_PANEL, devFlags } from './domain/devFlags';
import {
  adFlowLocked,
  adState,
  isShowing,
  onAdChange,
  preloadReward,
  rewardSupported,
  showReward,
  tryLockAdFlow,
  unlockAdFlow,
} from './lib/platform';

export type AdGuide = { title: string; message: string; confirm: string };

/**
 * 리워드 광고 — RN src/useRewardAd.ts 자리(리워드 그룹 하나, 라이브와 같은 그룹).
 * - enabled 일 때만 미리 불러온다(쓸 일이 없으면 요청하지 않는다).
 * - 광고는 항상 안내 창을 거친 뒤에만 띄운다(confirmAndPlay). play 는 이미 '광고 보고 ○○' 버튼이 있는 창에서 누른 경우뿐.
 * - 보상은 끝까지 봤을 때('earned')만, 한 번만 실행한다.
 * - 광고를 지원하지 않는 환경에서는 supported=false — 화면은 광고 버튼을 숨기거나 막는다(광고 없이 보상 없음).
 * - 로드 실패 시 RN 과 같이 15초부터 두 배씩(최대 5분) 다시 불러 본다 — 쓸 자리가 화면에 있을 때만.
 */
export function useRewardAd(enabled: boolean) {
  const ask = useAsk();
  const supported = rewardSupported();
  const [, setTick] = useState(0);
  useEffect(() => onAdChange(() => setTick((t) => t + 1)), []);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const backoffRef = useRef(15000);
  const st = adState();

  useEffect(() => {
    if (!enabled || !supported) return;
    if (st === 'idle' && !isShowing()) preloadReward(AD_IDS.reward);
    if (st === 'ready') backoffRef.current = 15000;
    if (st !== 'failed') return;
    const wait = backoffRef.current;
    backoffRef.current = Math.min(wait * 2, 300000);
    const t = window.setTimeout(() => {
      if (adState() === 'failed') preloadReward(AD_IDS.reward);
    }, wait);
    return () => window.clearTimeout(t);
  }, [enabled, supported, st]);

  const play = async (onEarned: () => void | Promise<void>) => {
    if (SHOW_DEV_PANEL && devFlags.skipAds) {
      await onEarned();
      return;
    }
    if (!supported || playingRef.current) return;
    if (adState() !== 'ready') {
      void ask('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    if (!tryLockAdFlow()) return;
    playingRef.current = true;
    setPlaying(true);
    try {
      const r = await showReward();
      if (r === 'earned') await onEarned();
      else if (r === 'noshow') void ask('광고를 재생할 수 없어요', '잠시 후 다시 시도해주세요.');
      else if (r === 'unavailable') void ask('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
    } finally {
      unlockAdFlow();
      playingRef.current = false;
      setPlaying(false);
    }
  };

  /** 안내 창 → [확인 버튼] → 광고 → 끝까지 보면 onEarned */
  const confirmAndPlay = async (guide: AdGuide, onEarned: () => void | Promise<void>) => {
    if (playingRef.current || adFlowLocked()) return;
    const go = await ask(guide.title, guide.message, guide.confirm, '취소');
    if (go) await play(onEarned);
  };

  const skipOn = SHOW_DEV_PANEL && devFlags.skipAds;
  return {
    supported: supported || skipOn,
    loaded: skipOn || (supported && st === 'ready'),
    playing,
    confirmAndPlay,
    play,
  };
}
