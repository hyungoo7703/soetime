import React, { useState } from 'react';
import { Eraser } from 'lucide-react';
import { Routine } from '../utils/routines';
import { Rotation, nextRoutineId, toDateKey, weekDates } from '../utils/rotation';

interface WeekStampsProps {
  rotation: Rotation;
  routines: Routine[];
  /** routineId가 null이면 그날 도장을 지운다 */
  onStamp: (date: string, routineId: string | null) => void;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 지난주와 이번 주의 운동 도장, 그리고 다음 차례.
 * 도장은 루틴을 끝내면 자동으로 찍히고, 날짜 칸을 눌러 직접 찍거나 지울 수도 있다.
 */
export const WeekStamps: React.FC<WeekStampsProps> = ({ rotation, routines, onStamp }) => {
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  const now = new Date();
  const todayKey = toDateKey(now);
  const nameOf = (routineId: string) => routines.find((r) => r.id === routineId)?.name;
  const nextId = nextRoutineId(rotation);
  const nextName = nextId ? nameOf(nextId) : undefined;
  const pickedKey = pickedDate ? toDateKey(pickedDate) : null;

  const stampAndClose = (routineId: string | null) => {
    if (pickedKey) onStamp(pickedKey, routineId);
    setPickedDate(null);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <span key={label} className="text-center text-[10px] font-semibold text-slate-500">
            {label}
          </span>
        ))}
      </div>

      {[-1, 0].map((weekOffset) => (
        <div
          key={weekOffset}
          className={`grid grid-cols-7 gap-1 ${weekOffset === -1 ? 'mb-1 opacity-60' : ''}`}
        >
          {weekDates(now, weekOffset).map((date) => {
            const key = toDateKey(date);
            const stampedId = rotation.stamps[key];
            return (
              <button
                key={key}
                onClick={() => setPickedDate(pickedKey === key ? null : date)}
                disabled={key > todayKey}
                className={`flex flex-col items-center rounded-lg border py-1 transition active:scale-95 disabled:opacity-30 ${
                  stampedId
                    ? 'bg-emerald-950/50 border-emerald-500/40'
                    : 'bg-slate-800/40 border-slate-800'
                } ${key === todayKey ? 'ring-1 ring-indigo-400' : ''} ${
                  pickedKey === key ? 'border-indigo-400' : ''
                }`}
                aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 도장`}
              >
                <span className="text-[10px] text-slate-500 tabular-nums">{date.getDate()}</span>
                <span className="h-4 text-[11px] font-black text-emerald-300 leading-4">
                  {/* 지워진 루틴의 도장은 이름을 알 수 없어 표시만 남긴다 */}
                  {stampedId ? nameOf(stampedId)?.slice(0, 2) ?? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {pickedDate && pickedKey && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 mb-1.5">
            {pickedDate.getMonth() + 1}월 {pickedDate.getDate()}일({DAY_LABELS[pickedDate.getDay()]})에 한 루틴
          </p>
          <div className="flex flex-wrap gap-1.5">
            {routines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => stampAndClose(routine.id)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 ${
                  rotation.stamps[pickedKey] === routine.id
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {routine.name}
              </button>
            ))}
            {rotation.stamps[pickedKey] && (
              <button
                onClick={() => stampAndClose(null)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-rose-300 transition active:scale-95"
              >
                <Eraser className="w-3.5 h-3.5" />
                도장 지우기
              </button>
            )}
          </div>
        </div>
      )}

      <p className="mt-2 px-1 text-xs text-slate-400">
        {nextName ? (
          <>
            다음 차례는 <strong className="text-indigo-300">{nextName}</strong>
          </>
        ) : (
          '설정에서 추천 순서를 정하면 다음 차례를 알려줍니다.'
        )}
      </p>
    </section>
  );
};
