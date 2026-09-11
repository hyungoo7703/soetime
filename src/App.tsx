import React, { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon, Square, RotateCcw, Sun, Timer, ListChecks, Pencil, Play } from 'lucide-react';
import { TimerDial } from './components/TimerDial';
import { SettingsSheet } from './components/SettingsSheet';
import { RoutineRunner } from './components/RoutineRunner';
import { RoutineEditSheet } from './components/RoutineEditSheet';
import { useRestTimer } from './hooks/useRestTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { loadSettings, saveSettings, Settings } from './utils/storage';
import {
  Routine,
  RoutineProgress,
  loadRoutines,
  saveRoutines,
  loadProgress,
  saveProgress,
  clearProgress,
  totalSets
} from './utils/routines';
import { playBeep, vibrate, unlockAudio } from './utils/alert';

function presetLabel(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}분`;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastPresetSec, setLastPresetSec] = useState<number | null>(null);

  const [tab, setTab] = useState<'timer' | 'routine'>('timer');
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [progress, setProgress] = useState<RoutineProgress | null>(() => loadProgress());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [finishedRoutineId, setFinishedRoutineId] = useState<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveRoutines(routines);
  }, [routines]);

  const handleFinish = useCallback(() => {
    if (settings.soundEnabled) playBeep();
    if (settings.vibrateEnabled) vibrate();
  }, [settings.soundEnabled, settings.vibrateEnabled]);

  const timer = useRestTimer(handleFinish);
  const { state: wakeLockState } = useWakeLock(settings.keepScreenOn && timer.isRunning);

  const startPreset = (sec: number) => {
    unlockAudio(); // 사용자 제스처 안에서 오디오를 깨워둬야 완료 시 소리가 난다
    setLastPresetSec(sec);
    timer.start(sec * 1000);
  };

  // ── 루틴 진행 ─────────────────────────────────────────────
  const activeRoutine = progress
    ? routines.find((r) => r.id === progress.routineId) ?? null
    : null;
  const finishedRoutine = finishedRoutineId
    ? routines.find((r) => r.id === finishedRoutineId) ?? null
    : null;

  const startRoutine = (routine: Routine) => {
    if (routine.exercises.length === 0) return;
    unlockAudio();
    const next = { routineId: routine.id, exerciseIndex: 0, completedSets: 0 };
    setFinishedRoutineId(null);
    setProgress(next);
    saveProgress(next);
    timer.stop();
  };

  const quitRoutine = () => {
    setProgress(null);
    setFinishedRoutineId(null);
    clearProgress();
    timer.stop();
  };

  /** 세트를 끝내면 진행을 먼저 옮기고 휴식을 시작한다. 마지막 세트면 휴식 없이 끝난다. */
  const completeSet = () => {
    if (!progress || !activeRoutine) return;
    const exercise = activeRoutine.exercises[progress.exerciseIndex];
    if (!exercise) return;
    unlockAudio();

    const completedSets = progress.completedSets + 1;
    const isLastSet = completedSets >= exercise.sets;
    const isLastExercise = progress.exerciseIndex >= activeRoutine.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      setFinishedRoutineId(activeRoutine.id);
      setProgress(null);
      clearProgress();
      timer.stop();
      return;
    }

    const next: RoutineProgress = isLastSet
      ? { ...progress, exerciseIndex: progress.exerciseIndex + 1, completedSets: 0 }
      : { ...progress, completedSets };

    setProgress(next);
    saveProgress(next);

    // 다음에 할 운동의 휴식 시간을 쓴다 (운동이 바뀌면 새 운동 기준)
    const restSec = activeRoutine.exercises[next.exerciseIndex]?.restSec ?? exercise.restSec;
    timer.start(restSec * 1000);
  };

  const skipExercise = () => {
    if (!progress || !activeRoutine) return;
    const isLastExercise = progress.exerciseIndex >= activeRoutine.exercises.length - 1;
    if (isLastExercise) {
      setFinishedRoutineId(activeRoutine.id);
      setProgress(null);
      clearProgress();
      timer.stop();
      return;
    }
    const next = { ...progress, exerciseIndex: progress.exerciseIndex + 1, completedSets: 0 };
    setProgress(next);
    saveProgress(next);
    timer.stop();
  };

  const isIdle = !timer.isRunning && !timer.isFinished;
  const editingRoutine = editingId ? routines.find((r) => r.id === editingId) ?? null : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-lg mx-auto border-x border-slate-900 relative">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 pt-safe px-4 pb-2">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-tight text-white">쇠타임</h1>
            {wakeLockState === 'active' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded">
                <Sun className="w-3 h-3" />
                화면 켜둠
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/50 text-xs">
              <button
                onClick={() => setTab('timer')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
                  tab === 'timer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                타이머
              </button>
              <button
                onClick={() => setTab('routine')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
                  tab === 'routine' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                루틴
                {progress && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                )}
              </button>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="설정"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col">
        {tab === 'timer' ? (
          <>
            <TimerDial
              remainingMs={timer.remainingMs}
              totalMs={timer.totalMs}
              isFinished={timer.isFinished}
            />

            {!isIdle && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                  onClick={() => timer.addMs(-15000)}
                  disabled={timer.isFinished}
                  className="py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 disabled:opacity-40 active:scale-95 transition"
                >
                  −15초
                </button>
                <button
                  onClick={timer.stop}
                  className="py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  {timer.isFinished ? <RotateCcw className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {timer.isFinished ? '닫기' : '중지'}
                </button>
                <button
                  onClick={() => timer.addMs(15000)}
                  className="py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 active:scale-95 transition"
                >
                  +15초
                </button>
              </div>
            )}

            {timer.isFinished && lastPresetSec !== null && (
              <button
                onClick={() => startPreset(lastPresetSec)}
                className="mt-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-base font-black active:scale-[0.99] transition shadow-lg shadow-indigo-500/25"
              >
                {presetLabel(lastPresetSec)} 다시 시작
              </button>
            )}

            <section className="mt-6">
              <h2 className="text-xs font-bold text-slate-400 mb-2 px-1">
                {isIdle ? '휴식 시간을 고르세요' : '다른 시간으로 새로 시작'}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {settings.presetsSec.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => startPreset(sec)}
                    className={`py-6 rounded-2xl border text-xl font-black tabular-nums active:scale-95 transition ${
                      lastPresetSec === sec && !isIdle
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                        : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                    }`}
                  >
                    {presetLabel(sec)}
                  </button>
                ))}
              </div>
              {settings.presetsSec.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  설정에서 휴식 시간을 추가해 주세요.
                </p>
              )}
            </section>

            {wakeLockState === 'failed' && settings.keepScreenOn && timer.isRunning && (
              <p className="mt-4 text-[11px] text-amber-400/90 text-center leading-relaxed">
                화면 꺼짐 방지를 적용하지 못했습니다. 홈 화면 앱으로 쓰신다면 iOS 18.4 이상이 필요합니다.
              </p>
            )}
          </>
        ) : activeRoutine && progress ? (
          <RoutineRunner
            routine={activeRoutine}
            progress={progress}
            timer={timer}
            isDone={false}
            onCompleteSet={completeSet}
            onSkipRest={timer.stop}
            onSkipExercise={skipExercise}
            onQuit={quitRoutine}
          />
        ) : finishedRoutine ? (
          <RoutineRunner
            routine={finishedRoutine}
            progress={{ routineId: finishedRoutine.id, exerciseIndex: 0, completedSets: 0 }}
            timer={timer}
            isDone
            onCompleteSet={() => {}}
            onSkipRest={() => {}}
            onSkipExercise={() => {}}
            onQuit={quitRoutine}
          />
        ) : (
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 mb-2 px-1">오늘 할 루틴을 고르세요</h2>
            {routines.map((routine) => (
              <div
                key={routine.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3"
              >
                <button
                  onClick={() => startRoutine(routine)}
                  disabled={routine.exercises.length === 0}
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition disabled:opacity-50"
                >
                  <p className="text-lg font-black text-white">{routine.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {routine.exercises.length === 0
                      ? '운동을 먼저 추가해 주세요'
                      : `운동 ${routine.exercises.length}개 · 총 ${totalSets(routine)}세트`}
                  </p>
                </button>

                <button
                  onClick={() => setEditingId(routine.id)}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition active:scale-95 shrink-0"
                  aria-label={`${routine.name} 편집`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startRoutine(routine)}
                  disabled={routine.exercises.length === 0}
                  className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:bg-slate-800 disabled:text-slate-600 transition active:scale-95 shrink-0"
                  aria-label={`${routine.name} 시작`}
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            ))}
          </section>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsSheet
          settings={settings}
          wakeLockState={wakeLockState}
          onChange={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {editingRoutine && (
        <RoutineEditSheet
          routine={editingRoutine}
          onChange={(next) =>
            setRoutines((prev) => prev.map((r) => (r.id === next.id ? next : r)))
          }
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
};
