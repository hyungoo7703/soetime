import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRunning, saveRunning, clearRunning } from '../utils/storage';

/**
 * 완료를 이 시간 안에 감지했을 때만 알림을 울린다.
 * 이보다 늦게 감지했다면 화면이 꺼져 있었다는 뜻이라 알림 없이 상태만 보여준다.
 */
const ALERT_GRACE_MS = 2000;

export interface RestTimer {
  /** 남은 시간(ms). 0 이하면 완료 */
  remainingMs: number;
  totalMs: number;
  isRunning: boolean;
  isFinished: boolean;
  start: (durationMs: number) => void;
  stop: () => void;
  addMs: (deltaMs: number) => void;
}

/**
 * 남은 시간을 세지 않고 '끝나는 시각'을 기억한다.
 *
 * setInterval은 탭이 백그라운드로 가면 조절되거나 멈추고, PWA는 통째로 정지될 수 있다.
 * 헬스장에서 쉬는 동안 사용자는 반드시 화면을 잠그거나 다른 앱을 쓰므로,
 * 흘러간 시간을 누적하는 방식은 반드시 틀어진다.
 * endsAt(에폭 ms)만 저장해두고 매 렌더에서 Date.now()와 비교해 계산하면
 * 몇 분간 얼어 있었어도 돌아오는 즉시 정확한 값이 나온다.
 *
 * endsAt은 localStorage에도 저장해 앱이 종료됐다 다시 열려도 타이머가 이어진다.
 */
export function useRestTimer(onFinish: () => void): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [totalMs, setTotalMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // 앱이 종료됐다 다시 열린 경우 진행 중이던 타이머를 복구한다
  useEffect(() => {
    const saved = loadRunning();
    if (saved && saved.endsAt > Date.now()) {
      setEndsAt(saved.endsAt);
      setTotalMs(saved.totalMs);
      finishedRef.current = false;
    } else if (saved) {
      clearRunning();
    }
  }, []);

  // 화면 갱신용 틱. 시간의 근거가 아니라 다시 그리기 위한 신호일 뿐이다.
  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [endsAt]);

  // 백그라운드에서 돌아오면 즉시 최신 시각으로 다시 계산한다
  useEffect(() => {
    const sync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const remainingMs = endsAt === null ? 0 : endsAt - now;
  const isFinished = endsAt !== null && remainingMs <= 0;

  // 완료 알림은 '보고 있는 동안 끝났을 때'만 울린다.
  // 자리를 비운 사이 이미 끝났다면 몇 분 늦은 알림은 소음일 뿐이라 조용히 넘어간다.
  useEffect(() => {
    if (!isFinished || finishedRef.current || endsAt === null) return;
    finishedRef.current = true;
    clearRunning();

    const lateBy = Date.now() - endsAt;
    if (lateBy <= ALERT_GRACE_MS && document.visibilityState === 'visible') {
      onFinishRef.current();
    }
  }, [isFinished, endsAt]);

  const start = useCallback((durationMs: number) => {
    const target = Date.now() + durationMs;
    finishedRef.current = false;
    setTotalMs(durationMs);
    setEndsAt(target);
    setNow(Date.now());
    saveRunning({ endsAt: target, totalMs: durationMs });
  }, []);

  const stop = useCallback(() => {
    finishedRef.current = false;
    setEndsAt(null);
    setTotalMs(0);
    clearRunning();
  }, []);

  const addMs = useCallback(
    (deltaMs: number) => {
      setEndsAt((prev) => {
        if (prev === null) return prev;
        const next = Math.max(Date.now(), prev + deltaMs);
        finishedRef.current = false;
        saveRunning({ endsAt: next, totalMs: totalMs + Math.max(0, deltaMs) });
        return next;
      });
      setTotalMs((prev) => Math.max(0, prev + deltaMs));
      setNow(Date.now());
    },
    [totalMs]
  );

  return {
    remainingMs: Math.max(0, remainingMs),
    totalMs,
    isRunning: endsAt !== null && !isFinished,
    isFinished,
    start,
    stop,
    addMs
  };
}
