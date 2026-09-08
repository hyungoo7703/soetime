import React, { useCallback, useEffect, useState } from 'react';
import { Settings as SettingsIcon, Square, RotateCcw, Sun } from 'lucide-react';
import { TimerDial } from './components/TimerDial';
import { SettingsSheet } from './components/SettingsSheet';
import { useRestTimer } from './hooks/useRestTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { loadSettings, saveSettings, Settings } from './utils/storage';
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

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleFinish = useCallback(() => {
    if (settings.soundEnabled) playBeep();
    if (settings.vibrateEnabled) vibrate();
  }, [settings.soundEnabled, settings.vibrateEnabled]);

  const timer = useRestTimer(handleFinish);

  // 타이머가 도는 동안에만 화면을 붙잡는다
  const { state: wakeLockState } = useWakeLock(settings.keepScreenOn && timer.isRunning);

  const startPreset = (sec: number) => {
    unlockAudio(); // 사용자 제스처 안에서 오디오를 깨워둬야 완료 시 소리가 난다
    setLastPresetSec(sec);
    timer.start(sec * 1000);
  };

  const isIdle = !timer.isRunning && !timer.isFinished;

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
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="설정"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col">
        <TimerDial
          remainingMs={timer.remainingMs}
          totalMs={timer.totalMs}
          isFinished={timer.isFinished}
        />

        {/* 진행 중 조작 */}
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

        {/* 완료 후 같은 시간으로 바로 재시작 */}
        {timer.isFinished && lastPresetSec !== null && (
          <button
            onClick={() => startPreset(lastPresetSec)}
            className="mt-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-base font-black active:scale-[0.99] transition shadow-lg shadow-indigo-500/25"
          >
            {presetLabel(lastPresetSec)} 다시 시작
          </button>
        )}

        {/* 프리셋 */}
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
      </main>

      {isSettingsOpen && (
        <SettingsSheet
          settings={settings}
          wakeLockState={wakeLockState}
          onChange={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
