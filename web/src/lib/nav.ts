/**
 * 뒤로가기 = 브라우저 기록(history). RN 은 화면(관리·내 플랜)과 창(Modal)마다 안드로이드 뒤로가기가 한 단계씩 닫았다.
 * 웹에서는 화면·시트·안내 창이 열릴 때마다 기록을 한 칸 쌓고(pushState), 스와이프·안드로이드 키·내비바 뒤로가기는
 * popstate 로 받아 맨 위 하나만 닫는다. 홈(쌓인 것 없음)에서만 앱이 닫힌다.
 *
 * 버튼으로 닫을 때(저장·취소)는 쌓아 둔 한 칸을 history.back() 으로 되돌린다 — 그때 오는 popstate 는 건너뛴다.
 * ⚠️ history.back() 은 늦게 처리되는데 목적지 칸은 부른 순간 정해진다. 그 사이에 pushState 를 하면 한 칸이 어긋나
 *    (시트를 닫자마자 확인 창을 띄우는 경우) 나중에 홈에서 한 번 더 뒤로 가 앱 밖으로 나간다(backtest 로 확인).
 *    그래서 되돌리는 중에는 새 칸 쌓기를 미뤘다가 popstate 를 받은 뒤 쌓는다.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';

type Layer = { id: number; close: () => void; pushed: boolean };

const stack: Layer[] = [];
let seq = 0;
/** 버튼으로 닫으며 부른 history.back() 중 아직 popstate 가 오지 않은 수 */
let skip = 0;
let skipTimer = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function pushEntry(l: Layer) {
  l.pushed = true;
  history.pushState({ pillcheck: stack.indexOf(l) + 1 }, '');
}

/** 미뤄 둔 칸 쌓기 */
function flush() {
  for (const l of stack) if (!l.pushed) pushEntry(l);
}

function onPop() {
  if (skip > 0) {
    skip -= 1;
    if (skip === 0) {
      window.clearTimeout(skipTimer);
      flush();
    }
    return;
  }
  // 아직 기록에 안 올라간 층(미뤄 둔 것)은 이번 뒤로가기의 대상이 아니다
  let i = stack.length - 1;
  while (i >= 0 && !stack[i].pushed) i -= 1;
  if (i < 0) return;
  const [top] = stack.splice(i, 1);
  emit();
  top.close();
}
window.addEventListener('popstate', onPop);

export function pushLayer(close: () => void): number {
  const l: Layer = { id: ++seq, close, pushed: false };
  stack.push(l);
  if (skip === 0) pushEntry(l);
  emit();
  return l.id;
}

/** 버튼으로 닫힘 — 이미 뒤로가기로 빠진 층이면 아무것도 안 한다 */
export function dropLayer(id: number): void {
  const i = stack.findIndex((l) => l.id === id);
  if (i < 0) return;
  const [l] = stack.splice(i, 1);
  emit();
  if (!l.pushed) return; // 기록에 올라가기 전이면 되돌릴 칸도 없다
  skip += 1;
  history.back();
  // popstate 가 끝내 안 오면(드묾) 막힌 칸 쌓기를 풀어 준다
  window.clearTimeout(skipTimer);
  skipTimer = window.setTimeout(() => {
    if (skip > 0) {
      skip = 0;
      flush();
    }
  }, 1500);
}

export function useLayerCount(): number {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => stack.length,
  );
}

/**
 * open 인 동안 기록 한 칸을 차지한다. 뒤로가기면 close() 가 불린다.
 * 버튼으로 닫으면(open 이 false 가 되면) 그 한 칸을 되돌린다.
 */
export function useLayer(open: boolean, close: () => void): void {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!open) return;
    const id = pushLayer(() => ref.current());
    return () => dropLayer(id);
  }, [open]);
}
