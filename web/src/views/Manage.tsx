/**
 * 영양제 관리 — RN pages/manage.tsx. 한 장 스크롤: 머리 '영양제 관리' → 줄배너 → 타일(누르면 수정, 길게 누르면 삭제) → 이미지 광고.
 */
import { useState } from 'react';
import { ImageAd, TopBanner } from '../AdSlot';
import { useAsk } from '../dialog';
import { AD_IDS } from '../domain/config';
import type { Pill } from '../domain/types';
import { PillForm, Sheet, type PillInput } from '../PillForm';
import { AddTile, PillTile } from '../PillTile';
import { SlotFullModal } from '../SlotModal';
import { usePills } from '../stores/PillContext';
import { useRewardAd } from '../useRewardAd';

export function Manage() {
  const ask = useAsk();
  const { pills, maxSlots, decreaseSlot, addPill, deletePill, updatePill } = usePills();

  // 리워드 광고 — 자리 추가 창을 연 동안에만 불러온다
  const [showSlotModal, setShowSlotModal] = useState(false);
  const ad = useRewardAd(showSlotModal);

  const usedSlots = pills.reduce((acc, p) => acc + p.times.length, 0);
  const availableSlots = maxSlots - usedSlots;

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [formKey, setFormKey] = useState(0);

  /** 저장 실패 — 시트는 그대로 두고 알린다(교차 검증 m1) */
  const saveFailed = () => void ask('저장하지 못했어요', '잠시 후 다시 시도해 주세요.');

  const handleAddSave = async (v: PillInput) => {
    if (!(await addPill(v))) return saveFailed();
    setShowQuickAdd(false);
  };

  const handleAddPress = () => {
    if (usedSlots >= maxSlots) {
      setShowSlotModal(true);
    } else {
      setFormKey((k) => k + 1);
      setShowQuickAdd(true);
    }
  };

  const handleDelete = async (pill: Pill, time: string) => {
    const isLastSlot = pill.times.length === 1;
    const ok = await ask(
      isLastSlot ? `"${pill.name}" 삭제` : `"${pill.name}" (${time}) 삭제`,
      isLastSlot ? '삭제하면 복약 기록에서도 제외돼요. 정말 삭제할까요?' : '이 시간대만 삭제돼요. 나머지 시간대는 유지돼요.',
      '삭제',
      '취소',
      true,
    );
    if (!ok) return;
    let saved: boolean;
    if (isLastSlot) {
      saved = await deletePill(pill.id);
    } else {
      const r = await Promise.all([updatePill({ ...pill, times: pill.times.filter((t) => t !== time) }), decreaseSlot()]);
      saved = r.every(Boolean);
    }
    if (!saved) saveFailed();
  };

  // --- 수정 시트 ---
  const [editing, setEditing] = useState<{ pill: Pill; time: string } | null>(null);
  // 수정할 때 남은 슬롯: 고치는 한 칸은 비운 것으로 본다
  const editAvailableSlots = maxSlots - (usedSlots - 1);

  const handleEditSave = async (v: PillInput) => {
    if (!editing) return;
    if (v.times.length > editAvailableSlots) {
      void ask('슬롯이 부족해요', `선택한 시간대 ${v.times.length}개 중 ${editAvailableSlots}개 슬롯만 남아있어요.`);
      return;
    }
    const newTimes = [...editing.pill.times.filter((t) => t !== editing.time), ...v.times].sort();
    if (!(await updatePill({ ...editing.pill, ...v, times: newTimes }))) return saveFailed();
    setEditing(null);
  };

  const timeSlotItems = pills.flatMap((pill) => pill.times.map((time) => ({ pill, time })));

  return (
    <div className="page manage">
      <header className="simple-header">
        <h1>영양제 관리</h1>
      </header>

      <TopBanner position="manage_top" />
      {/* 홈과 같은 타일: 누르면 수정(삭제는 수정 창 안), 마지막 칸 '+ 추가' */}
      <div className="tile-wrap">
        {pills.length === 0 && <p className="empty-line">📋 복용 중인 영양제를 추가해보세요</p>}
        <div className="tile-grid">
          {timeSlotItems.map(({ pill, time }) => (
            <PillTile
              key={`${pill.id}-${time}`}
              pill={pill}
              time={time}
              onPress={() => setEditing({ pill, time })}
              onLongPress={() => void handleDelete(pill, time)}
            />
          ))}
          <AddTile used={usedSlots} max={maxSlots} onPress={handleAddPress} />
        </div>
      </div>
      {/* 이미지 광고 — 타일 바로 아래(첫 화면 안), 영양제 1개 이상일 때만 */}
      {pills.length > 0 && <ImageAd adGroupId={AD_IDS.manageImage} position="manage_after_list" />}
      <div style={{ height: 24 }} />

      <SlotFullModal open={showSlotModal} onClose={() => setShowSlotModal(false)} ad={ad} />

      <Sheet open={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="영양제 추가">
        <PillForm key={formKey} available={availableSlots} submitLabel="저장" onSubmit={handleAddSave} />
      </Sheet>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="영양제 수정">
        {editing && (
          <PillForm
            key={`${editing.pill.id}-${editing.time}`}
            initial={editing.pill}
            initialTimes={[editing.time]}
            available={editAvailableSlots}
            submitLabel="저장"
            onSubmit={handleEditSave}
            footer={
              <button
                className="sheet-delete"
                onClick={() => {
                  const e = editing;
                  setEditing(null);
                  void handleDelete(e.pill, e.time);
                }}
              >
                이 시간 삭제하기
              </button>
            }
          />
        )}
      </Sheet>
    </div>
  );
}
