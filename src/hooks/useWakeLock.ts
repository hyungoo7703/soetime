import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockState = 'unsupported' | 'idle' | 'active' | 'failed';

/**
 * 화면 꺼짐 방지.
 *
 * 브라우저는 문서가 가려지면(앱 전환, 화면 잠금) wake lock을 자동으로 해제한다.
 * 다시 돌아왔을 때 스스로 복구되지 않으므로 visibilitychange에서 재획득해야 한다.
 * 이걸 빠뜨리는 것이 wake lock 타이머의 대표적인 버그다.
 *
 * iOS 홈 화면 웹앱에서는 iOS 18.4부터 동작한다. 그 이전 버전에서는 요청이 실패하며,
 * 앱은 화면이 꺼질 수 있다는 안내만 하고 계속 동작해야 한다.
 */
export function useWakeLock(enabled: boolean) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [state, setState] = useState<WakeLockState>(supported ? 'idle' : 'unsupported');
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (!sentinel) return;
    try {
      await sentinel.release();
    } catch {
      // 이미 해제된 경우 - 무시
    }
    setState((prev) => (prev === 'active' ? 'idle' : prev));
  }, []);

  const acquire = useCallback(async () => {
    if (!supported || sentinelRef.current || document.visibilityState !== 'visible') return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setState('active');
      // 브라우저가 임의로 해제했을 때 상태를 맞춰둔다
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null;
        setState((prev) => (prev === 'active' ? 'idle' : prev));
      });
    } catch (err) {
      console.warn('Wake lock request failed', err);
      setState('failed');
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    if (enabled) {
      void acquire();
    } else {
      void release();
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, supported, acquire, release]);

  // 언마운트 시 정리
  useEffect(() => () => void release(), [release]);

  return { state, supported };
}
