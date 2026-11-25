/**
 * 영양제 슬롯이 꽉 찼을 때 — RN 홈·관리 화면의 '슬롯 부족 모달'.
 * 광고를 끝까지 보면 슬롯 +1(토스포인트 지급 없음). 광고 안내 창을 한 번 거친 뒤 광고.
 */
import { useAsk } from './dialog';
import { CenterModal } from './PillForm';
import { usePills } from './stores/PillContext';
import type { useRewardAd } from './useRewardAd';

export function SlotFullModal({
  open,
  onClose,
  ad,
}: {
  open: boolean;
  onClose: () => void;
  ad: ReturnType<typeof useRewardAd>;
}) {
  const ask = useAsk();
  const { maxSlots, increaseSlot } = usePills();
  const handleWatchAd = () => {
    onClose();
    void ad.confirmAndPlay(
      { title: '영양제 슬롯 추가', message: '짧은 광고를 보고 슬롯을 1개 더 추가할 수 있어요.', confirm: '광고 보고 슬롯 추가하기' },
      async () => {
        if (await increaseSlot()) void ask('슬롯 추가 완료!', '영양제를 1개 더 등록할 수 있어요.');
      },
    );
  };
  return (
    <CenterModal open={open} onClose={onClose}>
      <div className="slot-emoji">🎁</div>
      <h3 className="slot-title">영양제 슬롯이 꽉 찼어요</h3>
      <p className="slot-desc">
        현재 최대 {maxSlots}개까지 등록할 수 있어요.
        <br />
        짧은 광고를 시청하면 슬롯을 1개 더 추가할 수 있어요.
      </p>
      <button className={`watch-btn ${!ad.loaded ? 'off' : ''}`} onClick={handleWatchAd} disabled={!ad.loaded}>
        {ad.loaded ? '광고 보고 슬롯 추가하기' : '광고 준비 중...'}
      </button>
      <button className="modal-cancel" onClick={onClose}>
        취소
      </button>
    </CenterModal>
  );
}
