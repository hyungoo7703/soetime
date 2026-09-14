import { Settings, loadSettings, saveSettings, sanitizeSettings } from './storage';
import { Routine, loadRoutines, saveRoutines, sanitizeRoutines, totalSets } from './routines';

const BACKUP_APP_ID = 'soetime';
const BACKUP_SCHEMA_VERSION = 1;
const PREIMPORT_KEY = 'SOETIME_PREIMPORT_V1';

export interface BackupData {
  settings: Settings;
  routines: Routine[];
}

export interface BackupSummary {
  routineCount: number;
  exerciseCount: number;
  setCount: number;
  presetCount: number;
  exportedAt?: string;
}

export function summarize(data: BackupData, exportedAt?: string): BackupSummary {
  return {
    routineCount: data.routines.length,
    exerciseCount: data.routines.reduce((sum, r) => sum + r.exercises.length, 0),
    setCount: data.routines.reduce((sum, r) => sum + totalSets(r), 0),
    presetCount: data.settings.presetsSec.length,
    exportedAt
  };
}

export function readCurrent(): BackupData {
  return { settings: loadSettings(), routines: loadRoutines() };
}

export function exportBackupJson(data: BackupData): string {
  // 진행 중인 타이머와 루틴 진행 상황은 담지 않는다. 나중에 되살릴 의미가 없는 값이다.
  const backup = {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    routines: data.routines
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackupJson(jsonStr: string): { data: BackupData; summary: BackupSummary } {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('올바른 JSON 형식이 아닙니다. 백업 파일이 맞는지 확인해 주세요.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('쇠타임 백업 데이터가 아닙니다.');
  }
  if (parsed.app && parsed.app !== BACKUP_APP_ID) {
    throw new Error(`다른 앱의 백업 파일입니다: "${String(parsed.app).slice(0, 30)}"`);
  }

  // 쇠타임 백업이라면 반드시 갖는 형태. 엉뚱한 JSON을 통과시켜 루틴을
  // 빈 상태로 덮어쓰는 사고를 막는다.
  if (!Array.isArray(parsed.routines)) {
    throw new Error('쇠타임 백업 형식이 아닙니다. 루틴 목록(routines)을 찾을 수 없습니다.');
  }

  const routines = sanitizeRoutines(parsed.routines);
  if (routines.length === 0) {
    throw new Error('복원할 루틴이 하나도 없습니다. 빈 내용으로 덮어쓰지 않았습니다.');
  }

  const data: BackupData = { settings: sanitizeSettings(parsed.settings), routines };
  const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined;
  return { data, summary: summarize(data, exportedAt) };
}

export interface PreimportSnapshot {
  savedAt: number;
  data: BackupData;
}

export function readPreimportSnapshot(): PreimportSnapshot | null {
  try {
    const raw = localStorage.getItem(PREIMPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt);
    if (!Number.isFinite(savedAt) || !Array.isArray(parsed?.routines)) return null;
    return {
      savedAt,
      data: {
        settings: sanitizeSettings(parsed.settings),
        routines: sanitizeRoutines(parsed.routines)
      }
    };
  } catch {
    return null;
  }
}

export function clearPreimportSnapshot(): void {
  try {
    localStorage.removeItem(PREIMPORT_KEY);
  } catch {
    // 무시
  }
}

/**
 * 덮어쓰기 직전 상태를 한 벌 남기고 적용한다.
 * 잘못 가져왔을 때 되돌릴 유일한 수단이므로 저장 실패를 삼키지 않는다.
 */
export function applyImported(data: BackupData): void {
  const current = readCurrent();
  try {
    localStorage.setItem(
      PREIMPORT_KEY,
      JSON.stringify({ savedAt: Date.now(), settings: current.settings, routines: current.routines })
    );
  } catch (err) {
    console.error('Failed to snapshot before import', err);
  }

  const routinesSaved = saveRoutines(data.routines);
  const settingsSaved = saveSettings(data.settings);
  if (!routinesSaved || !settingsSaved) {
    throw new Error('저장 공간이 부족해 복원을 마치지 못했습니다. 브라우저 저장 공간을 비우고 다시 시도해 주세요.');
  }
}
