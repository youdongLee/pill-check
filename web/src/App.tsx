/**
 * 영양제 챙겨먹기 — RN 화면 셋(홈 '/'·관리 '/manage'·내 플랜 '/preset') 그대로. 화면을 더 나누지 않는다.
 * RN 의 '/add'·'/edit'·'/history' 는 어디서도 이동하지 않는 죽은 화면이라 옮기지 않았다(홈·관리의 시트가 같은 일을 한다).
 *
 * 홈은 RN 스택처럼 다른 화면이 위에 있어도 살아 있다(스크롤 위치·이미지 광고 유지).
 */
import { useEffect, useRef, useState } from 'react';
import { DialogProvider } from './dialog';
import { NOTIFY_STATE_KEY } from './domain/config';
import { onBack, readKey, TIMEOUT } from './lib/platform';
import { useLayer, useLayerCount } from './lib/nav';
import { PillProvider, usePills } from './stores/PillContext';
import { PresetProvider, usePresets } from './stores/PresetContext';
import { StampProvider, useStamps } from './stores/StampContext';
import { Home, type NotifyState } from './views/Home';
import { Manage } from './views/Manage';
import { PresetView } from './views/Preset';

type Screen = 'home' | 'manage' | 'preset';

function Shell() {
  const pills = usePills();
  const stamps = useStamps();
  const presets = usePresets();
  const [screen, setScreen] = useState<Screen>('home');
  const homeScroll = useRef(0);

  // 매일 오전 9시 알림 동의 상태 — 읽기 전에는 줄을 숨긴다(RN 과 같이 'agreed' 로 시작)
  const [notify, setNotify] = useState<NotifyState>('agreed');
  useEffect(() => {
    void readKey(NOTIFY_STATE_KEY).then((v) => {
      if (v === TIMEOUT) setNotify('unknown');
      else setNotify(v === 'agreed' || v === 'rejected' ? v : 'unknown');
    });
  }, []);

  // 관리·내 플랜은 기록 한 칸 — 스와이프·안드로이드·내비바 뒤로가기면 홈으로
  useLayer(screen !== 'home', () => setScreen('home'));

  const go = (s: 'manage' | 'preset') => {
    homeScroll.current = window.scrollY;
    setScreen(s);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    if (screen === 'home') window.scrollTo(0, homeScroll.current);
  }, [screen]);

  // 토스 내비바 뒤로가기 신호 — 앱 안 화면·창이 열려 있을 때만 가로채 기록을 한 칸 되돌린다(홈에서는 원래대로 앱 종료)
  const layers = useLayerCount();
  useEffect(() => {
    if (layers === 0) return;
    return onBack(() => history.back());
  }, [layers > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const statuses = [pills.status, stamps.status, presets.status];
  if (statuses.includes('error')) {
    return (
      <div className="boot">
        <p className="boot-title">기록을 불러오지 못했어요</p>
        <p className="boot-desc">잠시 후 다시 시도해주세요.</p>
        <button
          className="boot-btn"
          onClick={() => {
            if (pills.status === 'error') pills.reload();
            if (stamps.status === 'error') stamps.reload();
            if (presets.status === 'error') presets.reload();
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }
  if (statuses.includes('loading')) {
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: screen === 'home' ? undefined : 'none' }}>
        <Home active={screen === 'home'} go={go} notify={notify} setNotify={setNotify} />
      </div>
      {screen === 'manage' && <Manage />}
      {screen === 'preset' && <PresetView />}
    </>
  );
}

export default function App() {
  return (
    <DialogProvider>
      <PillProvider>
        <StampProvider>
          <PresetProvider>
            <Shell />
          </PresetProvider>
        </StampProvider>
      </PillProvider>
    </DialogProvider>
  );
}
