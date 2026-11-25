import React, { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon, Square, RotateCcw, Sun, Timer, ListChecks, Pencil, Play, AlertTriangle, Plus } from 'lucide-react';
import { TimerDial } from './components/TimerDial';
import { SettingsSheet } from './components/SettingsSheet';
import { RoutineRunner } from './components/RoutineRunner';
import { RoutineEditSheet } from './components/RoutineEditSheet';
import { WeekStamps } from './components/WeekStamps';
import { useRestTimer } from './hooks/useRestTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { useBackLayer } from './hooks/useBackLayer';
import { loadSettings, saveSettings, Settings } from './utils/storage';
import {
  Routine,
  RoutineProgress,
  loadRoutines,
  saveRoutines,
  loadProgress,
  saveProgress,
  clearProgress,
  totalSets,
  generateId
} from './utils/routines';
import { Rotation, loadRotation, saveRotation, setStamp, nextRoutineId, toDateKey } from './utils/rotation';
import { BackupData } from './utils/backup';
import { requestPersistentStorage, PersistState } from './utils/persistence';
import { playBeep, vibrate, unlockAudio } from './utils/alert';

// 루틴 중 마지막으로 손댄 뒤 화면을 켜 두는 시간. 한 세트가 이보다 길어지는 일은 거의 없다
const ROUTINE_AWAKE_MS = 10 * 60 * 1000;

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
  const [rotation, setRotation] = useState<Rotation>(() => loadRotation(routines));
  const [progress, setProgress] = useState<RoutineProgress | null>(() => loadProgress());
  const [editingId, setEditingId] = useState<string | null>(null);
  // 방금 끝낸 루틴. 완료 화면을 닫을 때까지 들고 있는다
  const [finished, setFinished] = useState<{ routineId: string; setsDone: number } | null>(null);
  // '세트 완료'나 '건너뛰기'를 누르기 직전 상태. 잘못 눌렀을 때 한 번 되돌린다.
  // 마지막 세트를 잘못 누르면 도장까지 찍히므로 도장도 같이 들고 있는다.
  const [undo, setUndo] = useState<{ progress: RoutineProgress; rotation: Rotation } | null>(null);

  // 저장 실패를 조용히 넘기면 앱은 정상처럼 보이면서 편집한 루틴이 사라진다.
  // 용량 초과나 시크릿 모드에서 실제로 일어나므로 화면에 알려야 한다.
  const [isSaveFailing, setIsSaveFailing] = useState(false);

  useEffect(() => {
    // 전부 호출한다. &&로 묶으면 앞이 실패했을 때 뒤가 아예 저장되지 않는다.
    const settingsSaved = saveSettings(settings);
    const routinesSaved = saveRoutines(routines);
    const rotationSaved = saveRotation(rotation);
    setIsSaveFailing(!settingsSaved || !routinesSaved || !rotationSaved);
  }, [settings, routines, rotation]);

  // 용량이 빠듯할 때 브라우저가 저장소를 통째로 비우는 것을 막아달라고 한 번 요청한다.
  // 거절당해도 지금과 같은 상태일 뿐이라 실패를 막지 않는다.
  const [persistState, setPersistState] = useState<PersistState>('checking');
  useEffect(() => {
    let alive = true;
    requestPersistentStorage().then((state) => {
      if (alive) setPersistState(state);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleFinish = useCallback(() => {
    if (settings.soundEnabled) playBeep();
    if (settings.vibrateEnabled) vibrate();
  }, [settings.soundEnabled, settings.vibrateEnabled]);

  const timer = useRestTimer(handleFinish);

  // 루틴 중에는 세트를 하는 동안에도 화면을 켜 둔다. 꺼지면 잠금을 풀어야 '세트 완료'를 누를 수 있다.
  // 다만 10분 넘게 손대지 않으면 놓아준다. 루틴을 켜 둔 채 자리를 떠도 화면이 밤새 켜져 있지 않게 한다.
  const [isRoutineAwake, setIsRoutineAwake] = useState(false);
  useEffect(() => {
    if (!progress) {
      setIsRoutineAwake(false);
      return;
    }
    setIsRoutineAwake(true);
    const id = window.setTimeout(() => setIsRoutineAwake(false), ROUTINE_AWAKE_MS);
    return () => window.clearTimeout(id);
  }, [progress, timer.isRunning]);

  const { state: wakeLockState } = useWakeLock(
    settings.keepScreenOn && (timer.isRunning || isRoutineAwake)
  );

  const startPreset = (sec: number) => {
    unlockAudio(); // 사용자 제스처 안에서 오디오를 깨워둬야 완료 시 소리가 난다
    setLastPresetSec(sec);
    timer.start(sec * 1000);
  };

  // ── 루틴 진행 ─────────────────────────────────────────────
  const activeRoutine = progress
    ? routines.find((r) => r.id === progress.routineId) ?? null
    : null;
  const finishedRoutine = finished
    ? routines.find((r) => r.id === finished.routineId) ?? null
    : null;

  const startRoutine = (routine: Routine) => {
    if (routine.exercises.length === 0) return;
    unlockAudio();
    const next = { routineId: routine.id, exerciseIndex: 0, completedSets: 0, setsDone: 0 };
    setFinished(null);
    setUndo(null);
    setProgress(next);
    saveProgress(next);
    timer.stop();
  };

  const quitRoutine = () => {
    setProgress(null);
    setFinished(null);
    setUndo(null);
    clearProgress();
    timer.stop();
  };

  /** 방금 누른 '세트 완료'나 '건너뛰기'를 되돌린다. 이미 지나간 휴식 시간은 되살리지 않는다. */
  const undoLast = () => {
    if (!undo) return;
    setProgress(undo.progress);
    saveProgress(undo.progress);
    setRotation(undo.rotation);
    setFinished(null);
    setUndo(null);
    timer.stop();
  };

  /**
   * 루틴을 끝까지 가면 오늘 날짜에 도장을 찍는다. 중단한 루틴은 찍지 않는다.
   * 전부 건너뛰기만 해서 끝낸 세트가 없을 때도 찍지 않는다.
   */
  const finishRoutine = (routineId: string, setsDone: number) => {
    setFinished({ routineId, setsDone });
    setProgress(null);
    clearProgress();
    timer.stop();
    if (setsDone > 0) {
      setRotation((prev) => setStamp(prev, toDateKey(new Date()), routineId));
    }
  };

  /** 세트를 끝내면 진행을 먼저 옮기고 휴식을 시작한다. 마지막 세트면 휴식 없이 끝난다. */
  const completeSet = () => {
    if (!progress || !activeRoutine) return;
    const exercise = activeRoutine.exercises[progress.exerciseIndex];
    if (!exercise) return;
    unlockAudio();
    setUndo({ progress, rotation });

    const completedSets = progress.completedSets + 1;
    const setsDone = progress.setsDone + 1;
    const isLastSet = completedSets >= exercise.sets;
    const isLastExercise = progress.exerciseIndex >= activeRoutine.exercises.length - 1;

    if (isLastSet && isLastExercise) {
      finishRoutine(activeRoutine.id, setsDone);
      return;
    }

    const next: RoutineProgress = isLastSet
      ? { ...progress, exerciseIndex: progress.exerciseIndex + 1, completedSets: 0, setsDone }
      : { ...progress, completedSets, setsDone };

    setProgress(next);
    saveProgress(next);

    // 다음에 할 운동의 휴식 시간을 쓴다 (운동이 바뀌면 새 운동 기준)
    const restSec = activeRoutine.exercises[next.exerciseIndex]?.restSec ?? exercise.restSec;
    timer.start(restSec * 1000);
  };

  const skipExercise = () => {
    if (!progress || !activeRoutine) return;
    setUndo({ progress, rotation });
    const isLastExercise = progress.exerciseIndex >= activeRoutine.exercises.length - 1;
    if (isLastExercise) {
      finishRoutine(activeRoutine.id, progress.setsDone);
      return;
    }
    const next = { ...progress, exerciseIndex: progress.exerciseIndex + 1, completedSets: 0 };
    setProgress(next);
    saveProgress(next);
    timer.stop();
  };

  const addRoutine = () => {
    const routine: Routine = { id: generateId(), name: '새 루틴', note: '', cooldown: '', exercises: [] };
    setRoutines((prev) => [...prev, routine]);
    setEditingId(routine.id);
  };

  /** 지운 루틴은 추천 순서에서도 뺀다. 이미 찍힌 도장은 그대로 둔다. */
  const deleteRoutine = (routineId: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    setRotation((prev) => ({ ...prev, order: prev.order.filter((id) => id !== routineId) }));
    setEditingId(null);
  };

  /** 복원하면 루틴 id가 통째로 바뀐다. 진행 중이던 세트는 가리킬 곳이 없으므로 접는다. */
  const restoreBackup = (data: BackupData) => {
    setSettings(data.settings);
    setRoutines(data.routines);
    setRotation(data.rotation);
    setProgress(null);
    setFinished(null);
    setUndo(null);
    clearProgress();
    timer.stop();
  };

  const isIdle = !timer.isRunning && !timer.isFinished;
  const editingRoutine = editingId ? routines.find((r) => r.id === editingId) ?? null : null;
  const recommendedId = nextRoutineId(rotation);

  // 안드로이드 뒤로가기로 닫을 화면들.
  // 진행 중인 루틴은 넣지 않는다. 뒤로가기 한 번에 운동이 중단되면 안 된다.
  useBackLayer(tab === 'routine', () => setTab('timer'));
  useBackLayer(editingRoutine !== null, () => setEditingId(null));
  useBackLayer(isSettingsOpen, () => setIsSettingsOpen(false));

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

        {/* 저장 실패 경고. 데이터를 잃을 수 있는 상황이라 닫을 수 없게 둔다. */}
        {isSaveFailing && (
          <div className="-mx-4 mt-1 bg-rose-950/95 border-y border-rose-700/60 px-4 py-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose-200">저장되지 않고 있습니다</p>
                <p className="text-[11px] text-rose-300/90 leading-relaxed mt-0.5">
                  저장 공간이 가득 찼거나 브라우저가 저장을 막고 있습니다. 지금 고친 루틴은
                  앱을 닫으면 사라집니다.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="mt-1.5 px-2.5 py-1 rounded-lg bg-rose-900/80 border border-rose-600/60 text-[11px] font-semibold text-rose-100 hover:bg-rose-900 transition active:scale-95"
                >
                  지금 백업 파일로 내보내기
                </button>
              </div>
            </div>
          </div>
        )}
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
            onUndo={undo ? undoLast : undefined}
            onCompleteSet={completeSet}
            onSkipRest={timer.stop}
            onSkipExercise={skipExercise}
            onQuit={quitRoutine}
          />
        ) : finishedRoutine && finished ? (
          <RoutineRunner
            routine={finishedRoutine}
            progress={{ routineId: finishedRoutine.id, exerciseIndex: 0, completedSets: 0, setsDone: finished.setsDone }}
            timer={timer}
            isDone
            onUndo={undo ? undoLast : undefined}
            nextRoutineName={routines.find((r) => r.id === recommendedId)?.name}
            onCompleteSet={() => {}}
            onSkipRest={() => {}}
            onSkipExercise={() => {}}
            onQuit={quitRoutine}
          />
        ) : (
          <section className="space-y-2">
            <WeekStamps
              rotation={rotation}
              routines={routines}
              onStamp={(date, routineId) => setRotation((prev) => setStamp(prev, date, routineId))}
            />
            <h2 className="text-xs font-bold text-slate-400 pt-2 px-1">오늘 할 루틴을 고르세요</h2>
            {routines.map((routine) => (
              <div
                key={routine.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex items-center gap-3 ${
                  routine.id === recommendedId ? 'border-indigo-500/60' : 'border-slate-800'
                }`}
              >
                <button
                  onClick={() => startRoutine(routine)}
                  disabled={routine.exercises.length === 0}
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition disabled:opacity-50"
                >
                  <p className="flex items-center gap-2 text-lg font-black text-white">
                    <span className="truncate">{routine.name}</span>
                    {routine.id === recommendedId && (
                      <span className="shrink-0 text-[10px] font-bold text-indigo-200 bg-indigo-600/40 border border-indigo-400/40 px-1.5 py-0.5 rounded">
                        다음 차례
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {routine.exercises.length === 0
                      ? '운동을 먼저 추가해 주세요'
                      : `운동 ${routine.exercises.length}개 · 총 ${totalSets(routine)}세트`}
                  </p>
                  {routine.note && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{routine.note}</p>
                  )}
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
            <button
              onClick={addRoutine}
              className="w-full py-3 rounded-2xl border border-dashed border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-500 flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
            >
              <Plus className="w-4 h-4" />
              루틴 추가
            </button>
          </section>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsSheet
          settings={settings}
          routines={routines}
          rotation={rotation}
          onChangeRotation={setRotation}
          wakeLockState={wakeLockState}
          persistState={persistState}
          onChange={setSettings}
          onRestore={restoreBackup}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {editingRoutine && (
        <RoutineEditSheet
          routine={editingRoutine}
          onChange={(next) =>
            setRoutines((prev) => prev.map((r) => (r.id === next.id ? next : r)))
          }
          // 마지막 하나는 지울 수 없다. 루틴이 하나도 없으면 다음에 열 때 기본 루틴이 다시 들어온다
          onDelete={routines.length > 1 ? () => deleteRoutine(editingRoutine.id) : undefined}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
};
