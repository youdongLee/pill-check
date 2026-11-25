/**
 * 홈 — RN pages/index.tsx (라이브 20261019-43 + 알림 동의 줄 ff4eae0). 한 장 스크롤.
 * 줄배너 → 머리 카드(요일·복용 수·연속·내 플랜·관리 + 도장 7칸 + 할 일 버튼 + 알림 줄) → 안내 → 복용 타일 → 이미지 광고.
 *
 * 핫딜 특가 카드(src/HotdealCard.tsx)는 옮기지 않았다 — 서버(hotdeal-api)가 11/23 삭제됐다.
 *
 * 알림 줄(형님 11/25 지시): 아직 동의하지 않은 유저에게 **항상** 보인다(RN 8f96bbb 는 도장 버튼이 없을 때만).
 * 도장 버튼이 있으면 그 바로 아래 한 줄. 동의하면 숨김. 거절·오류면 이번 방문만 숨김(다음에 열면 다시 보인다).
 */
import { useEffect, useMemo, useState } from 'react';
import { ImageAd, TopBanner } from '../AdSlot';
import { DevPanel } from '../DevPanel';
import { useAsk } from '../dialog';
import { AD_IDS, DAILY_AMOUNT, NOTIFY_STATE_KEY, NOTIFY_TEMPLATE_CODE, STREAK_AMOUNT } from '../domain/config';
import type { Pill } from '../domain/types';
import { dayNameOf } from '../domain/utils';
import { grantSupported, notifySupported, requestAgreement, writeKey } from '../lib/platform';
import { PillForm, Sheet, type PillInput } from '../PillForm';
import { AddTile, PillTile } from '../PillTile';
import { SlotFullModal } from '../SlotModal';
import { usePills } from '../stores/PillContext';
import { useStamps } from '../stores/StampContext';
import { useRewardAd } from '../useRewardAd';

export type NotifyState = 'unknown' | 'agreed' | 'rejected';

export function Home({
  active,
  go,
  notify,
  setNotify,
}: {
  /** 지금 보이는 화면인가(다른 화면이 위에 있으면 false — RN 스택처럼 홈은 살아 있다) */
  active: boolean;
  go: (s: 'manage' | 'preset') => void;
  notify: NotifyState;
  setNotify: (s: NotifyState) => void;
}) {
  const ask = useAsk();
  const { pills, todayRecord, toggleIntake, addPill, maxSlots } = usePills();
  const stamp = useStamps();
  const { stamps, todayStamped, streakCount, canEarnStreak, dailyPending, streakPending, paying } = stamp;

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [showSlotModal, setShowSlotModal] = useState(false);

  // 매일 오전 9시 알림 — 동의하면 숨김, 거절·오류면 이번 방문만 숨김
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyHidden, setNotifyHidden] = useState(false);
  const canNotify = useMemo(() => notifySupported(), []);
  // 동의 창에서 답 없이 돌아오면(화면 복귀) '잠시만요…'를 풀어 준다(교차 검증 m6)
  useEffect(() => {
    if (!notifyBusy) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') window.setTimeout(() => setNotifyBusy(false), 1500);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [notifyBusy]);
  const askNotify = async () => {
    if (notifyBusy) return;
    setNotifyBusy(true);
    const r = await requestAgreement(NOTIFY_TEMPLATE_CODE);
    setNotifyBusy(false);
    if (r === 'error') {
      setNotifyHidden(true);
      return;
    }
    void writeKey(NOTIFY_STATE_KEY, r);
    setNotify(r);
    if (r === 'rejected') setNotifyHidden(true);
    if (r === 'agreed') void ask('알림을 켰어요', '매일 오전 9시에 영양제 드실 시간을 알려드릴게요.');
  };

  // 리워드 광고는 오늘 실제로 쓸 수 있을 때만 미리 불러온다:
  //  · 오늘 도장 전(영양제가 있을 때) · 7일 연속 도장 받을 차례 · 자리 추가 창을 연 동안
  const ad = useRewardAd(
    active && stamp.status === 'ready' && ((pills.length > 0 && !todayStamped) || canEarnStreak || showSlotModal),
  );

  const onEarnedDaily = async () => {
    const ok = await stamp.earnDailyStamp();
    if (ok) void ask('🏅 도장 획득!', `오늘의 복약 도장을 받았어요.\n도장을 누르면 토스포인트 ${DAILY_AMOUNT}원을 받아요.`);
  };
  const onEarnedStreak = async () => {
    const ok = await stamp.earnStreakStamp();
    if (ok) void ask('🏆 7일 연속 달성!', `7일 연속 도장을 받았어요.\n도장을 누르면 토스포인트 ${STREAK_AMOUNT}원을 받아요.`);
  };
  const onClaimDaily = async () => {
    const ok = await stamp.claimDaily();
    if (ok) void ask('🎉 적립 완료', `오늘의 복약 미션을 완료하고 토스포인트 ${DAILY_AMOUNT}원을 받았어요!`);
  };
  const onClaimStreak = async () => {
    const ok = await stamp.claimStreak();
    if (ok) void ask('🏆 적립 완료', `7일 연속 복약 미션을 완료하고 토스포인트 ${STREAK_AMOUNT}원을 받았어요!`);
  };

  const usedSlots = pills.reduce((acc, p) => acc + p.times.length, 0);
  const availableSlots = maxSlots - usedSlots;
  const atSlotLimit = availableSlots <= 0;

  const openQuickAdd = () => {
    setFormKey((k) => k + 1);
    setShowQuickAdd(true);
  };

  const handleSave = async (v: PillInput) => {
    if (v.times.length > availableSlots) {
      const go2 = await ask(
        '슬롯이 부족해요',
        `선택한 시간대 ${v.times.length}개 중 ${availableSlots}개 슬롯만 남아있어요.\n영양제 관리에서 광고를 보고 슬롯을 추가하세요.`,
        '슬롯 추가하러 가기',
        '취소',
      );
      if (go2) {
        setShowQuickAdd(false);
        go('manage');
      }
      return;
    }
    if (!(await addPill(v))) {
      void ask('저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setShowQuickAdd(false);
  };

  const activePillMap = useMemo(() => {
    const map = new Map<string, Pill>();
    pills.forEach((p) => map.set(p.id, p));
    return map;
  }, [pills]);

  const activeIntakes = useMemo(
    () => todayRecord.intakes.filter((i) => activePillMap.has(i.pillId)),
    [todayRecord.intakes, activePillMap],
  );

  const takenCount = activeIntakes.filter((i) => i.taken).length;
  const totalCount = activeIntakes.length;
  const progress = totalCount > 0 ? takenCount / totalCount : 0;
  const today = stamp.today;
  // 자정을 넘겨 기록을 바꿔 끼우기 전(어제 기록)이면 '다 먹음'으로 보지 않는다(교차 검증 m2)
  const allDone = totalCount > 0 && takenCount === totalCount && todayRecord.date === today;

  const sortedIntakes = useMemo(() => [...activeIntakes].sort((a, b) => a.time.localeCompare(b.time)), [activeIntakes]);

  // 오늘 도장 버튼: 복용 체크를 다 했고 오늘 도장이 없을 때. 광고를 못 띄우는 환경이면 숨긴다(광고 없이 지급 없음).
  // 프로모션 지급을 지원하지 않는 토스 앱이면 도장·지급 버튼을 모두 숨긴다(교차 검증 m5)
  const canPay = useMemo(() => grantSupported(), []);
  const showDailyAdBtn = canPay && allDone && !todayStamped && ad.supported;
  const showStreakAdBtn = canPay && canEarnStreak && !dailyPending && ad.supported;
  // 숫자로 나눠 만든다(Hermes 'YYYY/MM/DD' 파싱 결함 5f0713d 와 같은 방식)
  const dayName = dayNameOf(today);

  // 도장 버튼 줄 — 지금 할 수 있는 것 하나만. 다 받았으면 줄 자체가 없다.
  const stampAction: { label: string; onPress: () => void; disabled: boolean; gold: boolean } | null = showDailyAdBtn
    ? {
        label: ad.loaded ? `🎯 광고 보고 오늘 도장 받기 · ${DAILY_AMOUNT}원` : '광고 준비 중...',
        disabled: !ad.loaded || ad.playing,
        gold: false,
        onPress: () =>
          void ad.confirmAndPlay(
            {
              title: '오늘의 도장 받기',
              message: `짧은 광고를 보고 오늘의 복약 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${DAILY_AMOUNT}원을 받아요.`,
              confirm: '광고 보고 도장 받기',
            },
            onEarnedDaily,
          ),
      }
    : canPay && dailyPending
      ? { label: `🏅 도장 눌러서 ${DAILY_AMOUNT}원 받기`, disabled: paying, gold: false, onPress: () => void onClaimDaily() }
      : showStreakAdBtn
        ? {
            label: ad.loaded ? `🏆 7일 연속! 광고 보고 도장 받기 · ${STREAK_AMOUNT}원` : '광고 준비 중...',
            disabled: !ad.loaded || ad.playing,
            gold: true,
            onPress: () =>
              void ad.confirmAndPlay(
                {
                  title: '7일 연속 달성!',
                  message: `짧은 광고를 보고 7일 연속 도장을 받아보세요!\n받은 도장을 누르면 토스포인트 ${STREAK_AMOUNT}원을 받아요.`,
                  confirm: '광고 보고 도장 받기',
                },
                onEarnedStreak,
              ),
          }
        : canPay && streakPending
          ? { label: `🏆 7일 도장 눌러서 ${STREAK_AMOUNT}원 받기`, disabled: paying, gold: true, onPress: () => void onClaimStreak() }
          : null;

  const showNotify = canNotify && notify !== 'agreed' && !notifyHidden;

  return (
    <div className="page home">
      {/* 맨 위 줄배너 — 고정이 아니라 스크롤 첫 줄 */}
      <TopBanner position="home_top" />

      {/* 한 줄 머리: 왼쪽 '토 · 3/3 복용 ✓', 오른쪽 '🔥5일 · 내 플랜 · 관리' + 얇은 진행 막대 */}
      <div className="top-card">
        <div className="head-row">
          <span className="head-left">{`${dayName} · ${takenCount}/${totalCount} 복용${allDone ? ' ✓' : ''}`}</span>
          <div className="head-right">
            {stamps.length > 0 && <span className="head-streak">{`🔥${streakCount}일`}</span>}
            <button className="head-chip" onClick={() => go('preset')}>
              내 플랜
            </button>
            <button className="head-chip" onClick={() => go('manage')}>
              관리
            </button>
          </div>
        </div>
        <div className="thin-track">
          <div className="thin-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        {/* 도장 7칸 — 라벨은 '오늘' 칸에만 */}
        {(pills.length > 0 || stamps.length > 0) && (
          <div className="strip-row">
            {Array.from({ length: 7 }, (_, i) => {
              const date = stamps[i];
              const stamped = i < stamps.length;
              const isTodaySlot = !todayStamped && i === stamps.length;
              const isToday = isTodaySlot || date === today;
              return (
                <div key={i} className="strip-col">
                  <div className={`strip-circle ${stamped ? 'done' : ''} ${isTodaySlot ? 'today' : ''}`}>
                    <span className="strip-circle-text">{stamped ? '🏅' : ''}</span>
                  </div>
                  <span className={`strip-label ${isToday ? 'today' : ''}`}>{isToday ? '오늘' : ' '}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 버튼 줄은 할 일이 있을 때만 */}
        {stampAction && (
          <button
            className={`action-btn ${stampAction.gold ? 'gold' : ''} ${stampAction.disabled ? 'off' : ''}`}
            onClick={stampAction.onPress}
            disabled={stampAction.disabled}
          >
            {stampAction.label}
          </button>
        )}

        {/* 매일 오전 9시 알림 — 동의 전 유저에게 항상(도장 버튼이 있으면 그 바로 아래 한 줄) */}
        {showNotify && (
          <div className="notify-row">
            <span className="notify-text">⏰ 매일 오전 9시 알림</span>
            <button className={`notify-btn ${notifyBusy ? 'off' : ''}`} onClick={() => void askNotify()} disabled={notifyBusy}>
              {notifyBusy ? '잠시만요…' : '알림 받기'}
            </button>
          </div>
        )}
      </div>

      {/* 체크 안내 — 오늘 아무것도 체크 안 했을 때만 */}
      {totalCount > 0 && takenCount === 0 && <p className="hint">드신 영양제를 누르면 체크돼요</p>}

      {/* 복용 목록 + 마지막 칸 '+ 추가' */}
      <div className="list-wrap">
        {sortedIntakes.length === 0 && <p className="empty-line">💊 드시는 영양제를 추가해보세요</p>}
        <div className="tile-grid">
          {sortedIntakes.map((intake) => {
            const pill = activePillMap.get(intake.pillId);
            if (!pill) return null;
            return (
              <PillTile
                key={`${intake.pillId}-${intake.time}`}
                pill={pill}
                time={intake.time}
                taken={intake.taken}
                onPress={() => void toggleIntake(intake.pillId, intake.time)}
              />
            );
          })}
          <AddTile used={usedSlots} max={maxSlots} onPress={() => (atSlotLimit ? setShowSlotModal(true) : openQuickAdd())} />
        </div>
      </div>

      {/* 이미지 광고 — 목록 바로 아래(첫 화면 안). 목록 1개 이상일 때만 */}
      {sortedIntakes.length > 0 && <ImageAd adGroupId={AD_IDS.homeMid} position="home_mid" />}

      {(import.meta.env.MODE === 'test' || import.meta.env.DEV) && (
        <div className="list-wrap">
          <DevPanel />
        </div>
      )}
      <div style={{ height: 24 }} />

      <SlotFullModal open={showSlotModal} onClose={() => setShowSlotModal(false)} ad={ad} />

      <Sheet open={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="영양제 추가">
        <PillForm key={formKey} available={availableSlots} submitLabel="저장" onSubmit={handleSave} />
      </Sheet>
    </div>
  );
}
