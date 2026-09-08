const SETTINGS_KEY = 'SOETIME_SETTINGS_V1';
const RUNNING_KEY = 'SOETIME_RUNNING_V1';

export const DEFAULT_PRESETS_SEC = [30, 60, 90, 120, 180, 300];

export interface Settings {
  /** 휴식 시간 프리셋 (초). 화면의 큰 버튼으로 노출된다 */
  presetsSec: number[];
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  keepScreenOn: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  presetsSec: [...DEFAULT_PRESETS_SEC],
  soundEnabled: true,
  vibrateEnabled: true,
  keepScreenOn: true
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const presets = Array.isArray(parsed?.presetsSec)
      ? parsed.presetsSec
          .map((n: unknown) => Math.round(Number(n)))
          .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 3600)
      : [];
    return {
      presetsSec: presets.length > 0 ? presets : [...DEFAULT_PRESETS_SEC],
      soundEnabled: parsed?.soundEnabled !== false,
      vibrateEnabled: parsed?.vibrateEnabled !== false,
      keepScreenOn: parsed?.keepScreenOn !== false
    };
  } catch (err) {
    console.error('Failed to load settings', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export interface RunningTimer {
  endsAt: number;
  totalMs: number;
}

/** 진행 중인 타이머를 저장해 앱이 죽었다 살아나도 이어지게 한다 */
export function loadRunning(): RunningTimer | null {
  try {
    const raw = localStorage.getItem(RUNNING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const endsAt = Number(parsed?.endsAt);
    const totalMs = Number(parsed?.totalMs);
    if (!Number.isFinite(endsAt) || !Number.isFinite(totalMs)) return null;
    return { endsAt, totalMs };
  } catch {
    return null;
  }
}

export function saveRunning(timer: RunningTimer): void {
  try {
    localStorage.setItem(RUNNING_KEY, JSON.stringify(timer));
  } catch (err) {
    console.error('Failed to save running timer', err);
  }
}

export function clearRunning(): void {
  try {
    localStorage.removeItem(RUNNING_KEY);
  } catch {
    // 무시
  }
}
