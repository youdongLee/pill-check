import { InlineAd } from '@apps-in-toss/framework';
import { eventLog } from '@apps-in-toss/native-modules';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AD_IDS } from './ads';

/**
 * 지면별 노출·클릭 기록 (position 으로 나중에 지면별 eCPM 을 비교).
 * 지면마다 광고 그룹도 따로라 콘솔 리포트에서도 지면별로 갈린다.
 */
function logAd(kind: 'impression' | 'viewable' | 'click' | 'nofill', position: string, adGroupId: string) {
  try {
    void eventLog({
      log_name: `ad_${kind}`,
      log_type: kind === 'click' ? 'click' : kind === 'nofill' ? 'event' : 'impression',
      params: { position, adGroupId },
    }).catch(() => {});
  } catch {
    // 로깅 실패는 무시
  }
}

function callbacks(position: string, adGroupId: string) {
  return {
    onAdImpression: () => logAd('impression', position, adGroupId),
    onAdViewable: () => logAd('viewable', position, adGroupId),
    onAdClicked: () => logAd('click', position, adGroupId),
    onNoFill: () => logAd('nofill', position, adGroupId),
  };
}

/** 화면 맨 위 줄배너 — 스크롤 콘텐츠의 첫 줄(고정 아님) */
export function TopBanner({ position }: { position: string }) {
  return (
    <View style={styles.banner}>
      <InlineAd
        adGroupId={AD_IDS.banner}
        theme="light"
        tone="grey"
        variant="expanded"
        impressFallbackOnMount={true}
        {...callbacks(position, AD_IDS.banner)}
      />
    </View>
  );
}

/**
 * 이미지(피드형) 광고 — 콘텐츠 흐름 안의 꽉 찬 카드, 높이 고정 없음(잘리지 않게).
 * 위아래 여백을 넉넉히 둬 버튼 오탭을 막는다. 앞뒤에는 버튼이 아닌 글을 둔다.
 */
export function ImageAd({ adGroupId, position }: { adGroupId: string; position: string }) {
  return (
    <View style={styles.image}>
      <InlineAd
        adGroupId={adGroupId}
        theme="light"
        tone="grey"
        variant="card"
        impressFallbackOnMount={true}
        {...callbacks(position, adGroupId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', height: 96, overflow: 'hidden' },
  image: { width: '100%', paddingHorizontal: 16, marginTop: 20, marginBottom: 20 },
});
