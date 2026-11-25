import { useEffect, useRef } from 'react';

const STATE_KEY = 'soetimeDepth';

function depthOf(state: unknown): number {
  const depth = state && typeof state === 'object' ? Number((state as Record<string, unknown>)[STATE_KEY]) : 0;
  return Number.isFinite(depth) && depth > 0 ? depth : 0;
}

/**
 * 안드로이드 뒤로가기가 앱을 끄는 대신 맨 위 화면부터 닫게 한다.
 *
 * 설치한 PWA는 브라우저 기록이 한 칸뿐이라 뒤로가기를 누르면 바로 앱이 꺼진다.
 * 그래서 열려 있는 화면 수만큼 기록을 쌓아 두고, 뒤로가기로 기록이 줄면 그만큼 화면을 닫는다.
 *
 * closers는 지금 열려 있는 화면을 닫는 함수들이다. 아래에 깔린 것부터 위 순서로 준다.
 * 화면마다 따로 기록을 넣고 빼지 않고 "기록 깊이 = 열린 화면 수"만 맞춘다.
 * 그래야 버튼으로 닫았을 때와 뒤로가기로 닫았을 때가 서로 꼬이지 않는다.
 */
export function useBackButton(closers: (() => void)[]): void {
  const closersRef = useRef(closers);
  closersRef.current = closers;
  // 새로고침하면 화면은 처음으로 돌아가지만 기록에는 쌓아둔 칸이 남는다. 그 값에서 시작해야 아래에서 걷어낸다
  const historyDepth = useRef(depthOf(history.state));

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const target = depthOf(e.state);
      const open = closersRef.current;
      if (target > open.length) {
        // 브라우저의 앞으로 가기. 다시 열 화면이 없으므로 제자리로 돌린다
        history.go(open.length - target);
        return;
      }
      historyDepth.current = target;
      open.slice(target).reverse().forEach((close) => close());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const depth = closers.length;
  useEffect(() => {
    const diff = depth - historyDepth.current;
    if (diff > 0) {
      for (let d = historyDepth.current + 1; d <= depth; d++) {
        history.pushState({ [STATE_KEY]: d }, '');
      }
    } else if (diff < 0) {
      history.go(diff); // 버튼으로 닫았을 때. 쌓아둔 기록을 직접 걷어낸다
    }
    historyDepth.current = depth;
  }, [depth]);
}
