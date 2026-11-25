/**
 * 배너·이미지 광고 자리 — RN src/AdSlot.tsx 자리.
 *  - TopBanner: 화면 맨 위 줄배너(스크롤 첫 줄, 고정 아님) — RN variant="expanded", 높이 96
 *  - ImageAd: 콘텐츠 흐름 안의 이미지 카드 — RN variant="card", 좌우 16·위아래 20 여백(버튼 오탭 방지)
 * 붙이는 것은 마운트 때 한 번뿐이다(화면 갱신·스크롤에서 브릿지를 부르지 않는다).
 */
import { useEffect, useRef } from 'react';
import { AD_IDS } from './domain/config';
import { MOCK, attachBanner, initBanner } from './lib/platform';

function Slot({ id, variant, position, className }: { id: string; variant: 'card' | 'expanded'; position: string; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (MOCK) return;
    let off: (() => void) | null = null;
    let alive = true;
    initBanner(() => {
      if (alive && ref.current) off = attachBanner(id, ref.current, variant, position);
    });
    return () => {
      alive = false;
      off?.();
    };
  }, [id, variant, position]);
  if (MOCK) {
    return (
      <div className={className}>
        <div className={`ad-mock ${variant}`}>{variant === 'expanded' ? '줄배너 광고' : '이미지 광고'}</div>
      </div>
    );
  }
  return (
    <div className={className}>
      <div ref={ref} className="ad-fill" />
    </div>
  );
}

export function TopBanner({ position }: { position: string }) {
  return <Slot id={AD_IDS.banner} variant="expanded" position={position} className="ad-banner" />;
}

export function ImageAd({ adGroupId, position }: { adGroupId: string; position: string }) {
  return <Slot id={adGroupId} variant="card" position={position} className="ad-image" />;
}
