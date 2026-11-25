import { Component, StrictMode, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import App from './App.tsx';
import { legacyInfo } from './lib/legacy';
import { MOCK, TIMEOUT, readKey } from './lib/platform';

/**
 * 큰글씨 — RN 은 글자마다 maxFontSizeMultiplier(보조 1.3 · 이름·핵심 1.5)로 기기 글자 크기 배율을 막았다.
 * 웹뷰는 기기 배율이 글자 전체에 그대로 곱해질 수 있어(안드로이드 textZoom) 실제 배율을 재서 CSS 변수로 되돌린다:
 *   --s = min(배율, 1.3) / 배율   (보조 글자)
 *   --k = min(배율, 1.5) / 배율   (이름·핵심 숫자)
 *   --f = 1                       (RN 에서 막지 않은 글자 — 기기 배율 그대로)
 * 배율은 100px 글자의 실제 높이로 잰다. 기기 배율이 웹뷰에 안 들어오는 환경(배율 1)에서는 전부 1 이다.
 * 목업 화면(?fs=1.3)은 기기 배율이 없으니 배율을 직접 곱해 큰글씨 모양을 흉내 낸다.
 */
function applyFontScale() {
  const root = document.documentElement;
  let mockFs = 0;
  if (MOCK) {
    const q = Number(new URLSearchParams(location.search).get('fs'));
    if (q > 0) mockFs = q;
  }
  let fs = 1;
  let os = 1;
  if (mockFs) {
    fs = mockFs;
    os = 1;
  } else {
    // 블록 상자(줄 높이 = 글자 크기 × 1)로 잰다 — 인라인 상자는 글꼴 여백 때문에 1.2배쯤 크게 나온다
    const probe = document.createElement('div');
    probe.textContent = '가';
    probe.style.cssText =
      'position:absolute;left:0;top:0;visibility:hidden;display:block;font-size:100px;line-height:1;padding:0;margin:0;border:0;white-space:nowrap;';
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    fs = h > 0 ? Math.max(1, Math.round((h / 100) * 100) / 100) : 1;
    if (fs < 1.05) fs = 1;
    os = fs;
  }
  const cap = (c: number) => String(Math.min(fs, c) / os);
  root.style.setProperty('--s', cap(1.3));
  root.style.setProperty('--k', cap(1.5));
  root.style.setProperty('--c12', cap(1.2));
  root.style.setProperty('--c1', cap(1));
  root.style.setProperty('--f', String(fs / os));
}
applyFontScale();

/** 🧪 옛 기록(RN) 표시 — 같은 저장소를 읽는지 기기에서 확인 */
if (import.meta.env.MODE === 'test' || import.meta.env.DEV) {
  void Promise.all([readKey('@pillcheck/pills'), readKey('@pillcheck/stamps'), readKey('@pillcheck/payout_v1')]).then(
    ([p, s, pay]) => {
      if (p === TIMEOUT || s === TIMEOUT || pay === TIMEOUT) {
        legacyInfo.text = '읽기 실패';
        return;
      }
      let n = 0;
      try {
        n = p ? (JSON.parse(p) as unknown[]).length : 0;
      } catch {
        /* 무시 */
      }
      legacyInfo.text = p || s || pay ? `있음 · 영양제 ${n}개 · 도장 ${s ?? '-'}` : '없음(새로 시작)';
    },
  );
}

/** RN src/_app.tsx 의 ErrorBoundary 자리 */
class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="boot">
          <p className="boot-title">일시적인 오류가 발생했어요</p>
          <p className="boot-desc">잠시 후 다시 시도해주세요.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
