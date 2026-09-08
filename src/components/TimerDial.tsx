import React from 'react';

interface TimerDialProps {
  remainingMs: number;
  totalMs: number;
  isFinished: boolean;
  overdueMs: number;
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  if (total < 60) return `${total}초`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

const RADIUS = 132;
const CIRCUM = 2 * Math.PI * RADIUS;

export const TimerDial: React.FC<TimerDialProps> = ({
  remainingMs,
  totalMs,
  isFinished,
  overdueMs
}) => {
  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const isLast10 = !isFinished && remainingMs > 0 && remainingMs <= 10000;

  return (
    <div className="relative w-full flex items-center justify-center py-2">
      <svg viewBox="0 0 300 300" className="w-64 h-64 sm:w-72 sm:h-72 -rotate-90">
        <circle
          cx="150"
          cy="150"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-slate-800"
        />
        <circle
          cx="150"
          cy="150"
          r={RADIUS}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUM}
          strokeDashoffset={CIRCUM * (1 - ratio)}
          className={
            isFinished
              ? 'stroke-emerald-400'
              : isLast10
              ? 'stroke-amber-400'
              : 'stroke-indigo-500'
          }
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isFinished ? (
          <>
            <span className="text-4xl font-black text-emerald-400 tracking-tight">완료</span>
            <span className="text-xs text-slate-400 mt-1.5">
              {overdueMs > 1500 ? `${formatElapsed(overdueMs)} 전에 끝남` : '다음 세트 시작'}
            </span>
          </>
        ) : (
          <>
            <span
              className={`font-black tabular-nums tracking-tight ${
                isLast10 ? 'text-amber-300' : 'text-white'
              } text-6xl sm:text-7xl`}
            >
              {formatClock(remainingMs)}
            </span>
            {totalMs > 0 && (
              <span className="text-xs text-slate-500 mt-1.5">
                총 {formatElapsed(totalMs)}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
