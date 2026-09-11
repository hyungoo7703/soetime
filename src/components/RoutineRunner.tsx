import React from 'react';
import { Check, X, SkipForward, Flag } from 'lucide-react';
import { Routine, RoutineProgress, doneSets, totalSets, formatRest } from '../utils/routines';
import { RestTimer } from '../hooks/useRestTimer';
import { TimerDial } from './TimerDial';

interface RoutineRunnerProps {
  routine: Routine;
  progress: RoutineProgress;
  timer: RestTimer;
  isDone: boolean;
  onCompleteSet: () => void;
  onSkipRest: () => void;
  onSkipExercise: () => void;
  onQuit: () => void;
}

export const RoutineRunner: React.FC<RoutineRunnerProps> = ({
  routine,
  progress,
  timer,
  isDone,
  onCompleteSet,
  onSkipRest,
  onSkipExercise,
  onQuit
}) => {
  if (isDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-20 h-20 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center">
          <Flag className="w-9 h-9 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-emerald-400">{routine.name} 완료</p>
          <p className="text-xs text-slate-400 mt-1">{totalSets(routine)}세트 전부 끝냈습니다</p>
        </div>
        <button
          onClick={onQuit}
          className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 active:scale-95 transition"
        >
          닫기
        </button>
      </div>
    );
  }

  const exercise = routine.exercises[progress.exerciseIndex];
  const isResting = timer.isRunning || timer.isFinished;
  const done = doneSets(routine, progress);
  const total = totalSets(routine);

  return (
    <div className="flex-1 flex flex-col">
      {/* 루틴 진행 상황 */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-black text-white shrink-0">{routine.name}</span>
          <span className="text-[11px] text-slate-400 truncate">
            운동 {progress.exerciseIndex + 1}/{routine.exercises.length}
          </span>
        </div>
        <button
          onClick={onQuit}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 transition"
        >
          <X className="w-3 h-3" />
          중단
        </button>
      </div>

      {/* 전체 진행 바 */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-4">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      {isResting ? (
        <>
          <TimerDial
            remainingMs={timer.remainingMs}
            totalMs={timer.totalMs}
            isFinished={timer.isFinished}
          />
          <div className="text-center mt-2">
            <p className="text-xs text-slate-400">다음</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {exercise.name}{' '}
              <span className="text-indigo-400">{progress.completedSets + 1}세트</span>
            </p>
          </div>
          <button
            onClick={onSkipRest}
            className="mt-4 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-base font-black active:scale-[0.99] transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <SkipForward className="w-5 h-5" />
            {timer.isFinished ? '다음 세트 시작' : '휴식 건너뛰고 시작'}
          </button>
        </>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
            <p className="text-2xl font-black text-white tracking-tight">{exercise.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              휴식 {formatRest(exercise.restSec)}
            </p>

            {/* 세트 점 */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {Array.from({ length: exercise.sets }, (_, i) => (
                <span
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition ${
                    i < progress.completedSets
                      ? 'bg-indigo-500 border-indigo-500'
                      : i === progress.completedSets
                      ? 'border-indigo-400 bg-transparent'
                      : 'border-slate-700 bg-transparent'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-indigo-300 mt-2.5 tabular-nums">
              {progress.completedSets + 1} / {exercise.sets} 세트
            </p>
          </div>

          <button
            onClick={onCompleteSet}
            className="mt-4 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-lg font-black active:scale-[0.99] transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            세트 완료
          </button>

          <button
            onClick={onSkipExercise}
            className="mt-2 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-semibold text-slate-400 hover:text-slate-200 active:scale-95 transition"
          >
            이 운동 건너뛰기
          </button>
        </>
      )}

      {/* 남은 운동 목록 */}
      <div className="mt-6">
        <h3 className="text-[11px] font-bold text-slate-500 mb-1.5 px-1">전체 운동</h3>
        <div className="space-y-1">
          {routine.exercises.map((ex, i) => (
            <div
              key={ex.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                i < progress.exerciseIndex
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600'
                  : i === progress.exerciseIndex
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              {i < progress.exerciseIndex ? (
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 text-center text-[10px] shrink-0">{i + 1}</span>
              )}
              <span className={`flex-1 truncate ${i < progress.exerciseIndex ? 'line-through' : ''}`}>
                {ex.name}
              </span>
              <span className="text-[10px] tabular-nums shrink-0">
                {i === progress.exerciseIndex ? `${progress.completedSets}/${ex.sets}` : `${ex.sets}세트`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
