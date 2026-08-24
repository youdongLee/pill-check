import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { SHOW_DEV_PANEL, devFlags } from './devFlags';

/**
 * 리워드 전면 광고 공용 훅 — 순차(lazy) 폴백 지원.
 * - adGroupIds: 단일 ID 또는 우선순위 배열. 로드 상태인 광고는 **항상 1개만** 유지하고,
 *   로드 실패(onError)했을 때만 다음 그룹을 시도한다.
 *   (동시 프리로드 금지: 미노출 fill이 show rate를 깎아 장기 eCPM 하락 + AIT 전면형 동시 로드 이슈)
 * - 사용자가 보상 조건을 충족(userEarnedReward)하고 광고를 닫으면 onReward 실행.
 * - 재생 후에는 다시 1순위 그룹부터 로드한다.
 * - 광고 미지원(개발 환경)에서는 곧바로 onReward 실행.
 */
export function useRewardAd(adGroupIds: string | string[]) {
  const ids = Array.isArray(adGroupIds) ? adGroupIds : [adGroupIds];
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const [adLoaded, setAdLoaded] = useState(!adSupported);
  const [playing, setPlaying] = useState(false);
  const earnedRef = useRef(false);
  const loadedIdRef = useRef<string>(ids[0]); // 현재 로드된(마지막으로 loaded 이벤트를 받은) 그룹
  const unregisterRef = useRef<(() => void) | null>(null);

  const load = (idx: number = 0) => {
    const list = idsRef.current;
    if (!adSupported || idx >= list.length) return; // 체인 소진 시 adLoaded=false로 버튼 비활성 유지
    setAdLoaded(false);
    unregisterRef.current?.();
    unregisterRef.current = loadFullScreenAd({
      options: { adGroupId: list[idx] },
      onEvent: (e) => {
        if (e.type === 'loaded') {
          loadedIdRef.current = list[idx];
          setAdLoaded(true);
        }
      },
      // 순차 폴백: 실패했을 때만 다음 그룹 시도
      onError: () => load(idx + 1),
    });
  };

  useEffect(() => {
    if (!adSupported) return;
    load(0);
    return () => unregisterRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adSupported]);

  const show = (onReward: () => void | Promise<void>) => {
    // 테스트 패널의 "광고 스킵" 토글: 광고 없이 바로 보상 처리
    if (SHOW_DEV_PANEL && devFlags.skipAds) { onReward(); return; }
    if (!adSupported) { onReward(); return; }
    if (!adLoaded) {
      Alert.alert('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    setPlaying(true);
    earnedRef.current = false;
    showFullScreenAd({
      options: { adGroupId: loadedIdRef.current },
      onEvent: async (e) => {
        // 보상은 반드시 userEarnedReward에서만 지급 (dismissed만으로는 지급 금지 — 정책)
        if (e.type === 'userEarnedReward') earnedRef.current = true;
        if (e.type === 'failedToShow') {
          setPlaying(false);
          load(0);
          Alert.alert('광고를 재생할 수 없어요', '잠시 후 다시 시도해주세요.');
          return;
        }
        if (e.type === 'dismissed') {
          setPlaying(false);
          load(0); // 재생 후 1순위부터 재로드
          if (earnedRef.current) await onReward();
        }
      },
      onError: () => {
        setPlaying(false);
        Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
      },
    });
  };

  // 광고 스킵 중엔 버튼이 "광고 준비 중"으로 막히지 않도록 로드된 것으로 취급
  const skipOn = SHOW_DEV_PANEL && devFlags.skipAds;
  return { adSupported, adLoaded: skipOn || adLoaded, playing, show };
}
