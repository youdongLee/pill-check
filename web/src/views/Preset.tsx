/**
 * 내 플랜 — RN pages/preset.tsx. 한 장 스크롤: 머리 '내 플랜' + 도움말 → 줄배너 → 현재 플랜 저장 → 저장된 플랜 → 이미지 광고.
 * 플랜 빌더는 전체 화면 창(RN Modal). 저장·새 플랜·슬롯 추가·홈에 적용은 전부 광고(지급 없음).
 *
 * 웹에서 바꾼 것:
 *  - 요일 배정(요일 칩·광고 게이트·도움말 문장)을 뺐다(형님 11/25). RN 에서도 배정만 되고 제안해 주는 곳이 없던 기능.
 *  - RN 빌더의 '‹'(영양제 추가 → 목록) 버튼은 뒤로가기 모양이라 반려 사유 — '닫기' 글자 버튼으로.
 *  - RN 은 광고가 준비되지 않았을 때 몇몇 버튼(새 플랜 추가·저장 시트)이 아무 반응 없이 끝났다 → '광고 준비 중이에요' 안내.
 */
import { useState } from 'react';
import { ImageAd, TopBanner } from '../AdSlot';
import { useAsk } from '../dialog';
import { AD_IDS } from '../domain/config';
import { useLayer } from '../lib/nav';
import { CenterModal, PillForm, Sheet, type PillInput } from '../PillForm';
import { usePills } from '../stores/PillContext';
import { usePresets, type Preset } from '../stores/PresetContext';
import { useRewardAd, type AdGuide } from '../useRewardAd';

const DEFAULT_PLAN_SLOTS = 3;

export function PresetView() {
  const ask = useAsk();
  const { pills, replacePills } = usePills();
  const { presets, maxPresets, savePreset, updatePreset, deletePreset, increasePresetSlot } = usePresets();

  // 플랜 화면은 저장·적용·자리 추가가 전부 광고라 들어오면 하나만 미리 불러둔다
  const ad = useRewardAd(true);
  const adLoaded = ad.loaded;

  // ── 이름 입력 시트 (현재 구성 저장용) ──
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  /** 광고는 봤는데 저장이 실패한 몫 — 이 화면에 있는 동안만(N4) */
  const [saveGranted, setSaveGranted] = useState(false);
  // ── 플랜 빌더 (신규/편집 공용) ──
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPills, setPlanPills] = useState<PillInput[]>([]);
  const [planMaxSlots, setPlanMaxSlots] = useState(DEFAULT_PLAN_SLOTS);
  const [planSaving, setPlanSaving] = useState(false);
  const [showPlanAdd, setShowPlanAdd] = useState(false);
  const [planAddKey, setPlanAddKey] = useState(0);

  const [showPlanNameModal, setShowPlanNameModal] = useState(false);
  const [pendingPlanName, setPendingPlanName] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useLayer(showPlanBuilder, () => setShowPlanBuilder(false));
  useLayer(showPlanBuilder && showPlanAdd, () => setShowPlanAdd(false));

  const atPresetLimit = presets.length >= maxPresets;
  const planUsedSlots = planPills.reduce((acc, p) => acc + p.times.length, 0);
  const planAvailableSlots = planMaxSlots - planUsedSlots;

  const notReady = () => void ask('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
  /** 저장 실패 — 창·빌더는 그대로 두고 알린다(교차 검증 m1) */
  const saveFailed = () => void ask('저장하지 못했어요', '잠시 후 다시 시도해 주세요.');

  /** 광고 끝까지 본 뒤 callback. 안내 창을 먼저 띄운다 */
  const playAdThen = (callback: () => void | Promise<void>, guide?: AdGuide) => {
    if (!adLoaded) {
      notReady();
      return;
    }
    void ad.confirmAndPlay(guide ?? { title: '광고 보기', message: '짧은 광고를 보고 계속할 수 있어요.', confirm: '광고 보기' }, callback);
  };

  /** 이미 '광고 보고 ○○' 버튼이 있는 창(시트·안내 창)에서 누른 경우 → 바로 광고 (RN 그대로) */
  const playDirect = (callback: () => void | Promise<void>) => {
    if (!adLoaded) {
      notReady();
      return;
    }
    void ad.play(callback);
  };

  // ── 현재 구성 저장 ──
  const handleOpenSaveModal = () => {
    if (pills.length === 0) {
      void ask('영양제가 없어요', '먼저 홈 화면에서 영양제를 추가해주세요.');
      return;
    }
    if (atPresetLimit) {
      void promptSlotAdd();
      return;
    }
    setSaveName('');
    setShowSaveModal(true);
  };

  /**
   * 광고 → 저장. 시트는 저장이 성공했을 때만 닫는다.
   * 광고는 봤는데 저장이 실패하면 이 화면에 있는 동안 '광고 본 몫'을 들고 있다가 다시 누르면 광고 없이 저장한다(재검증 N4).
   */
  const doSaveCurrent = async (name: string) => {
    setSaving(true);
    const ok = await savePreset(
      name,
      pills.map(({ id: _id, ...rest }) => rest),
    );
    setSaving(false);
    if (ok) {
      setSaveGranted(false);
      setShowSaveModal(false);
      void ask('저장 완료!', `"${name}" 플랜이 저장됐어요.`);
    } else {
      setSaveGranted(true);
      saveFailed();
    }
  };

  const handleConfirmSave = () => {
    const name = saveName.trim();
    if (!name || saving) return;
    if (saveGranted) {
      void doSaveCurrent(name);
      return;
    }
    if (!adLoaded) return; // 시트를 닫지 않는다(m7)
    playDirect(() => doSaveCurrent(name));
  };

  // ── 새 플랜 추가 ──
  const handleAddNewPlan = () => {
    if (atPresetLimit) {
      void promptSlotAdd();
      return;
    }
    playAdThen(() => openPlanNameInput(), { title: '새 플랜 추가', message: '짧은 광고를 보고 새 플랜을 만들 수 있어요.', confirm: '광고 보고 추가' });
  };

  const openPlanNameInput = () => {
    setPendingPlanName('');
    setShowPlanNameModal(true);
  };

  const handleConfirmPlanName = () => {
    const name = pendingPlanName.trim();
    if (!name) return;
    setShowPlanNameModal(false);
    openPlanBuilder(name);
  };

  const openPlanBuilder = (name: string, existingPresetId?: string, existingPills?: PillInput[]) => {
    setEditingPresetId(existingPresetId ?? null);
    setPlanName(name);
    setPlanPills(existingPills ?? []);
    const usedSlots = (existingPills ?? []).reduce((acc, p) => acc + p.times.length, 0);
    // 신규/편집 모두 최소 DEFAULT_PLAN_SLOTS 보장
    setPlanMaxSlots(Math.max(DEFAULT_PLAN_SLOTS, usedSlots));
    setShowPlanAdd(false);
    setShowPlanBuilder(true);
  };

  const handleSavePlan = async () => {
    if (planPills.length === 0) {
      void ask('영양제를 추가해주세요', '최소 1개의 영양제를 추가해야 플랜을 저장할 수 있어요.');
      return;
    }
    setPlanSaving(true);
    let ok: boolean;
    if (editingPresetId) {
      ok = await updatePreset(editingPresetId, planPills);
      if (ok) void ask('수정 완료!', `"${planName}" 플랜이 업데이트됐어요.`);
    } else {
      ok = await savePreset(planName, planPills);
      if (ok) void ask('저장 완료!', `"${planName}" 플랜이 저장됐어요.`);
    }
    setPlanSaving(false);
    if (ok) setShowPlanBuilder(false);
    else saveFailed();
  };

  const handleIncreasePlanSlot = () => {
    playAdThen(
      () => {
        setPlanMaxSlots((prev) => prev + 1);
        void ask('슬롯 추가!', '영양제를 1개 더 추가할 수 있어요.');
      },
      { title: '플랜 슬롯 추가', message: '짧은 광고를 보고 이 플랜에 영양제를 1개 더 넣을 수 있어요.', confirm: '광고 보고 추가' },
    );
  };

  const openPlanAdd = () => {
    setPlanAddKey((k) => k + 1);
    setShowPlanAdd(true);
  };

  const handleAddPillToPlan = (v: PillInput) => {
    if (v.times.length > planAvailableSlots) {
      void ask('슬롯 부족', `선택한 시간 ${v.times.length}개 중 ${planAvailableSlots}개 슬롯만 남아있어요.`);
      return;
    }
    setPlanPills((prev) => [...prev, v]);
    setShowPlanAdd(false);
  };

  const handleRemovePlanPill = (idx: number) => {
    const removedSlots = planPills[idx].times.length;
    setPlanPills((prev) => prev.filter((_, i) => i !== idx));
    if (editingPresetId) setPlanMaxSlots((prev) => Math.max(DEFAULT_PLAN_SLOTS, prev - removedSlots));
  };

  const removePlanTime = async (p: PillInput, pillIdx: number, time: string) => {
    const ok = await ask(`${p.name} (${time}) 삭제`, '이 시간대를 플랜에서 제거할까요?', '삭제', '취소', true);
    if (!ok) return;
    if (p.times.length === 1) {
      handleRemovePlanPill(pillIdx);
    } else {
      setPlanPills((prev) => prev.map((pill, i) => (i === pillIdx ? { ...pill, times: pill.times.filter((t) => t !== time) } : pill)));
      if (editingPresetId) setPlanMaxSlots((prev) => Math.max(DEFAULT_PLAN_SLOTS, prev - 1));
    }
  };

  // ── 플랜 슬롯 추가 ──
  const promptSlotAdd = async () => {
    const go = await ask(
      '플랜 슬롯이 꽉 찼어요',
      `현재 최대 ${maxPresets}개까지 저장할 수 있어요.\n광고를 보면 슬롯을 1개 더 추가할 수 있어요.`,
      adLoaded ? '광고 보고 추가' : '광고 준비 중...',
      '취소',
    );
    if (!go || !adLoaded) return;
    playDirect(async () => {
      if (await increasePresetSlot()) void ask('플랜 슬롯 추가!', '플랜을 1개 더 저장할 수 있어요.');
    });
  };

  // ── 삭제 ──
  const handleDeletePreset = async (preset: Preset) => {
    const nextMax = Math.max(1, maxPresets - 1);
    const slotMsg = maxPresets > 1 ? `\n\n⚠️ 플랜 슬롯도 ${maxPresets}개 → ${nextMax}개로 줄어들어요.` : '';
    const ok = await ask(`"${preset.name}" 삭제`, `이 플랜을 삭제할까요?${slotMsg}`, '삭제', '취소', true);
    if (ok && !(await deletePreset(preset.id))) saveFailed();
  };

  const applyToHome = () => {
    const preset = presets.find((p) => p.id === editingPresetId);
    if (!preset) return;
    playAdThen(
      async () => {
        if (await replacePills(preset.pills)) {
          setShowPlanBuilder(false);
          void ask('적용 완료', `"${preset.name}" 플랜을 홈에 적용했어요.`);
        }
      },
      { title: '홈에 적용하기', message: `짧은 광고를 보고 "${preset.name}" 플랜으로 홈을 바꿀 수 있어요.`, confirm: '광고 보고 적용' },
    );
  };

  const planCells = planPills
    .flatMap((p, pillIdx) => p.times.map((time) => ({ p, pillIdx, time })))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="page preset">
      <header className="preset-header">
        <span className="side" />
        <h1>내 플랜</h1>
        <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="도움말">
          ?
        </button>
      </header>

      <TopBanner position="preset_top" />
      <div className="preset-content">
        {/* 현재 플랜 저장 */}
        <div className="section save-row">
          <div className="grow">
            <p className="section-title">현재 플랜 저장</p>
            <p className="section-desc one">홈 구성 그대로 저장</p>
          </div>
          <button
            className={`save-compact ${pills.length === 0 || saving ? 'off' : ''}`}
            onClick={handleOpenSaveModal}
            disabled={saving}
          >
            {saving ? '저장 중...' : '📋 저장하기'}
          </button>
          {pills.length === 0 && <p className="save-hint">홈 화면에서 영양제를 먼저 추가해주세요</p>}
        </div>

        {/* 저장된 플랜 목록 */}
        <div className="section">
          <div className="section-header">
            <p className="section-title">
              저장된 플랜{' '}
              <span className="slot-info-text">
                {presets.length}/{maxPresets}
              </span>
            </p>
            <button className={`add-new-btn ${atPresetLimit ? 'off' : ''}`} onClick={handleAddNewPlan}>
              {atPresetLimit ? '🔒 슬롯 꽉참' : '+ 새 플랜 추가'}
            </button>
          </div>

          {atPresetLimit && (
            <div className="slot-info">
              <span className="slot-info-text">플랜 슬롯이 꽉 찼어요</span>
              <button
                className={`slot-add-btn ${!adLoaded ? 'off' : ''}`}
                disabled={!adLoaded}
                onClick={() =>
                  playAdThen(
                    async () => {
                      if (await increasePresetSlot()) void ask('슬롯 추가!', '플랜을 1개 더 저장할 수 있어요.');
                    },
                    {
                      title: '플랜 슬롯 추가',
                      message: `현재 최대 ${maxPresets}개까지 저장할 수 있어요.\n짧은 광고를 보면 플랜을 1개 더 저장할 수 있어요.`,
                      confirm: '광고 보고 추가',
                    },
                  )
                }
              >
                {adLoaded ? '광고 보고 슬롯 추가' : '광고 준비 중...'}
              </button>
            </div>
          )}

          {presets.length === 0 ? (
            <div className="empty-box">
              <p className="empty-text">저장된 플랜이 없어요</p>
              <p className="empty-sub">위 버튼으로 플랜을 추가해보세요</p>
            </div>
          ) : (
            presets.map((preset) => (
              <div key={preset.id} className="preset-card">
                <div className="preset-card-top">
                  <div className="grow">
                    <p className="preset-name">{preset.name}</p>
                    <p className="preset-meta">
                      영양제 {preset.pills.length}개 · {String(preset.savedAt ?? '').slice(5).replace('-', '/')}
                    </p>
                  </div>
                  <div className="preset-actions">
                    <button className="load-btn" onClick={() => openPlanBuilder(preset.name, preset.id, preset.pills)}>
                      플랜 보기
                    </button>
                    <button className="del-btn" onClick={() => void handleDeletePreset(preset)}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {presets.length > 0 && <p className="section-desc one center">{'플랜 보기 → 홈에 적용'}</p>}
      </div>
      {/* 이미지 광고 — 저장된 플랜이 있을 때만, 목록 뒤 안내 글 다음(버튼과 떨어진 자리) */}
      {presets.length > 0 && <ImageAd adGroupId={AD_IDS.presetImage} position="preset_after_list" />}
      <div style={{ height: 32 }} />

      {/* ── 도움말 ── */}
      <CenterModal open={showHelp} onClose={() => setShowHelp(false)}>
        <div className="help">
          <h3 className="help-title">💊 플랜 사용 방법</h3>
          <div className="help-section">
            <p className="help-sec-title">📋 플랜 만들기</p>
            <p className="help-item">• 현재 플랜 저장: 홈에 등록된 영양제 구성 전체를 하나의 플랜으로 저장</p>
            <p className="help-item">• 새 플랜 추가: 영양제를 직접 선택해 새 플랜 구성</p>
            <p className="help-item">• 저장 시 광고 시청 1회 필요</p>
          </div>
          <div className="help-section">
            <p className="help-sec-title">▶️ 플랜 적용하기</p>
            <p className="help-item">• 플랜 보기 → 홈에 적용하기: 해당 플랜으로 홈 교체 (광고 1회)</p>          </div>
          <div className="help-section">
            <p className="help-sec-title">🔒 슬롯</p>
            <p className="help-item">• 플랜 슬롯 기본 1개, 광고 시청 시 +1</p>
            <p className="help-item">• 플랜 삭제 시 슬롯도 -1</p>
          </div>
          <button className="help-close" onClick={() => setShowHelp(false)}>
            확인
          </button>
        </div>
      </CenterModal>

      {/* ── 현재 구성 저장 이름 입력 ── */}
      <Sheet open={showSaveModal} onClose={() => setShowSaveModal(false)} title="플랜 이름 입력">
        <p className="sheet-desc">현재 설정된 복약 플랜 전체가 이 이름으로 저장돼요</p>
        <input
          className="name-input"
          placeholder="예: 아침 루틴, 주말 플랜..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()}
          autoFocus
        />
        {/* 광고가 준비되기 전에는 누를 수 없다 — 눌러서 시트만 닫히고 아무 일도 없는 일을 막는다(교차 검증 m7) */}
        <button
          className={`confirm-btn ${!saveName.trim() || saving || (!adLoaded && !saveGranted) ? 'off' : ''}`}
          onClick={handleConfirmSave}
          disabled={!saveName.trim() || saving || (!adLoaded && !saveGranted)}
        >
          {saving ? '저장 중...' : saveGranted ? '다시 저장' : adLoaded ? '광고 보고 저장' : '광고 준비 중...'}
        </button>
      </Sheet>

      {/* ── 새 플랜 이름 입력 ── */}
      <Sheet open={showPlanNameModal} onClose={() => setShowPlanNameModal(false)} title="새 플랜 이름 입력">
        <p className="sheet-desc">빈 플랜으로 시작해요. 영양제를 직접 추가할 수 있어요.</p>
        <input
          className="name-input"
          placeholder="예: 아침 루틴, 주말 플랜..."
          value={pendingPlanName}
          onChange={(e) => setPendingPlanName(e.target.value)}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && handleConfirmPlanName()}
          autoFocus
        />
        <button
          className={`confirm-btn ${!pendingPlanName.trim() ? 'off' : ''}`}
          onClick={handleConfirmPlanName}
          disabled={!pendingPlanName.trim()}
        >
          다음
        </button>
      </Sheet>

      {/* ── 플랜 빌더 (전체 화면) ── */}
      {showPlanBuilder && (
        <div className="builder">
          <div className="builder-header">
            <button className="builder-close" onClick={() => (showPlanAdd ? setShowPlanAdd(false) : setShowPlanBuilder(false))}>
              닫기
            </button>
            <h2 className="builder-title">
              {showPlanAdd ? '영양제 추가' : editingPresetId ? `"${planName}" 편집` : `"${planName}" 구성`}
            </h2>
            {!showPlanAdd ? (
              <button
                className={`builder-save ${planPills.length === 0 ? 'off' : ''}`}
                onClick={() => void handleSavePlan()}
                disabled={planSaving || planPills.length === 0}
              >
                {planSaving ? '저장 중...' : editingPresetId ? '수정' : '저장'}
              </button>
            ) : (
              <span className="builder-side" />
            )}
          </div>

          {showPlanAdd ? (
            <div className="builder-content">
              <PillForm key={planAddKey} available={planAvailableSlots} submitLabel="추가" onSubmit={handleAddPillToPlan} />
            </div>
          ) : (
            <div>
              <TopBanner position="preset_builder_top" />
              <div className="builder-content">
                {/* 슬롯 현황 */}
                <div className="builder-slot-row">
                  <span className="builder-slot-text">
                    슬롯 {planUsedSlots}/{planMaxSlots} 사용 중
                  </span>
                  {planAvailableSlots <= 0 && (
                    <button className={`slot-add-btn ${!adLoaded ? 'off' : ''}`} onClick={handleIncreasePlanSlot} disabled={!adLoaded}>
                      {adLoaded ? '광고 보고 슬롯 추가' : '광고 준비 중...'}
                    </button>
                  )}
                </div>

                {/* 추가된 영양제 그리드 (시간대별) */}
                {planPills.length === 0 ? (
                  <div className="builder-empty">
                    <p className="empty-text">아직 추가된 영양제가 없어요</p>
                    <p className="empty-sub">아래 버튼으로 영양제를 추가해보세요</p>
                  </div>
                ) : (
                  <div className="plan-grid">
                    {planCells.map(({ p, pillIdx, time }) => (
                      <button key={`${pillIdx}-${time}`} className="plan-cell" onClick={() => void removePlanTime(p, pillIdx, time)}>
                        <div className="plan-card" style={{ borderColor: p.color + '50' }}>
                          <span className="plan-time">{time}</span>
                          <span className="plan-emoji-wrap" style={{ backgroundColor: p.color + '22' }}>
                            {p.emoji}
                          </span>
                          <span className="plan-name">{p.name}</span>
                          <span className="plan-dose">{p.dosageAmount ? `${p.dosageAmount}${p.dosageUnit ?? ''}` : ' '}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 영양제 추가 버튼 */}
                {planAvailableSlots > 0 ? (
                  <button className="plan-add-btn" onClick={openPlanAdd}>
                    + 영양제 추가
                  </button>
                ) : (
                  <div className="plan-add-locked">🔒 슬롯 꽉참 · 광고 보고 추가하기</div>
                )}

                {/* 편집 모드: 홈에 적용하기 */}
                {editingPresetId && (
                  <button className={`apply-btn ${!adLoaded ? 'off' : ''}`} onClick={applyToHome}>
                    {adLoaded ? '홈에 적용하기' : '광고 준비 중...'}
                  </button>
                )}
                <div style={{ height: 24 }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
