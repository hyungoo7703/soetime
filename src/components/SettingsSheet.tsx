import React, { useState } from 'react';
import { X, Plus, Trash2, Volume2, VolumeX, Vibrate, Sun, AlertTriangle } from 'lucide-react';
import { Settings, DEFAULT_PRESETS_SEC } from '../utils/storage';
import { WakeLockState } from '../hooks/useWakeLock';

interface SettingsSheetProps {
  settings: Settings;
  wakeLockState: WakeLockState;
  onChange: (next: Settings) => void;
  onClose: () => void;
}

function label(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}분`;
}

const vibrateSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  wakeLockState,
  onChange,
  onClose
}) => {
  const [newPreset, setNewPreset] = useState('');

  const addPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const sec = Math.round(Number(newPreset));
    if (!Number.isFinite(sec) || sec <= 0 || sec > 3600) return;
    if (settings.presetsSec.includes(sec)) {
      setNewPreset('');
      return;
    }
    onChange({ ...settings, presetsSec: [...settings.presetsSec, sec].sort((a, b) => a - b) });
    setNewPreset('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pb-safe">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">설정</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 pt-4">
          {/* 프리셋 */}
          <section>
            <h3 className="text-xs font-bold text-slate-300 mb-2">휴식 시간 프리셋</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {settings.presetsSec.map((sec) => (
                <span
                  key={sec}
                  className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg pl-2.5 pr-1 py-1 text-xs text-slate-200"
                >
                  {label(sec)}
                  <button
                    onClick={() =>
                      onChange({
                        ...settings,
                        presetsSec: settings.presetsSec.filter((s) => s !== sec)
                      })
                    }
                    className="p-0.5 text-slate-500 hover:text-rose-400 transition"
                    aria-label={`${label(sec)} 삭제`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {settings.presetsSec.length === 0 && (
                <button
                  onClick={() => onChange({ ...settings, presetsSec: [...DEFAULT_PRESETS_SEC] })}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
                >
                  기본값으로 되돌리기
                </button>
              )}
            </div>
            <form onSubmit={addPreset} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={newPreset}
                onChange={(e) => setNewPreset(e.target.value.replace(/\D/g, ''))}
                placeholder="초 단위로 추가 (예: 150)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newPreset}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </form>
          </section>

          {/* 알림 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">완료 알림</h3>

            <Toggle
              icon={settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              title="소리"
              desc="완료 시 삑 소리 세 번"
              on={settings.soundEnabled}
              onToggle={() => onChange({ ...settings, soundEnabled: !settings.soundEnabled })}
            />

            <Toggle
              icon={<Vibrate className="w-4 h-4" />}
              title="진동"
              desc={vibrateSupported ? '완료 시 진동' : '이 기기는 진동을 지원하지 않습니다 (iOS)'}
              on={settings.vibrateEnabled}
              disabled={!vibrateSupported}
              onToggle={() => onChange({ ...settings, vibrateEnabled: !settings.vibrateEnabled })}
            />

            <Toggle
              icon={<Sun className="w-4 h-4" />}
              title="화면 켜둠"
              desc={
                wakeLockState === 'unsupported'
                  ? '이 브라우저는 지원하지 않습니다'
                  : wakeLockState === 'failed'
                  ? '요청이 거부됐습니다 (iOS는 18.4 이상 필요)'
                  : '타이머가 도는 동안 화면이 꺼지지 않습니다'
              }
              on={settings.keepScreenOn}
              disabled={wakeLockState === 'unsupported'}
              onToggle={() => onChange({ ...settings, keepScreenOn: !settings.keepScreenOn })}
            />
          </section>

          {/* 한계 안내 */}
          <section className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold">알아두면 좋은 것</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc leading-relaxed">
              <li>
                남은 시간은 <strong className="text-slate-300">끝나는 시각</strong>으로 계산합니다.
                다른 앱을 쓰다 돌아와도 시간이 어긋나지 않습니다
              </li>
              <li>
                <strong className="text-slate-300">화면을 켜둔 채 보고 있을 때만</strong> 완료 알림이 울립니다.
                자리를 비운 사이 이미 끝났다면 소리 없이 완료 상태와 지난 시간만 보여줍니다
              </li>
              <li>모든 기록은 이 기기에만 저장되며 외부로 나가지 않습니다</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

interface ToggleProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ icon, title, desc, on, disabled, onToggle }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition text-left ${
      disabled
        ? 'bg-slate-900/60 border-slate-800 opacity-60'
        : on
        ? 'bg-indigo-950/40 border-indigo-500/40'
        : 'bg-slate-800/60 border-slate-700/60'
    }`}
  >
    <span className={on && !disabled ? 'text-indigo-400' : 'text-slate-500'}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-semibold text-white">{title}</span>
      <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
    </span>
    <span
      className={`w-9 h-5 rounded-full shrink-0 relative transition ${
        on && !disabled ? 'bg-indigo-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
          on && !disabled ? 'left-4.5' : 'left-0.5'
        }`}
        style={{ left: on && !disabled ? '1.125rem' : '0.125rem' }}
      />
    </span>
  </button>
);
