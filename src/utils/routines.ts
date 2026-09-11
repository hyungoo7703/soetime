const ROUTINES_KEY = 'SOETIME_ROUTINES_V1';
const PROGRESS_KEY = 'SOETIME_PROGRESS_V1';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  restSec: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
}

/** 진행 중인 루틴. 헬스장에서 앱이 죽어도 이어서 하도록 저장한다. */
export interface RoutineProgress {
  routineId: string;
  /** 현재 운동 index */
  exerciseIndex: number;
  /** 현재 운동에서 끝낸 세트 수 */
  completedSets: number;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const seed = (name: string, sets: number, restSec: number): Exercise => ({
  id: generateId(),
  name,
  sets,
  restSec
});

/** 첫 실행에 빈 화면을 주지 않도록 기본 루틴을 채워둔다. 전부 편집 가능하다. */
export function createDefaultRoutines(): Routine[] {
  return [
    {
      id: generateId(),
      name: '등',
      exercises: [
        seed('랫 풀다운', 4, 90),
        seed('시티드 로우', 4, 90),
        seed('바벨 로우', 4, 120),
        seed('풀업', 3, 120)
      ]
    },
    {
      id: generateId(),
      name: '어깨',
      exercises: [
        seed('숄더 프레스', 4, 90),
        seed('사이드 레터럴 레이즈', 4, 60),
        seed('리어 델트 플라이', 3, 60),
        seed('업라이트 로우', 3, 60)
      ]
    },
    {
      id: generateId(),
      name: '가슴',
      exercises: [
        seed('벤치 프레스', 4, 120),
        seed('인클라인 덤벨 프레스', 4, 90),
        seed('체스트 플라이', 3, 60),
        seed('딥스', 3, 90)
      ]
    },
    {
      id: generateId(),
      name: '하체',
      exercises: [
        seed('스쿼트', 5, 180),
        seed('레그 프레스', 4, 120),
        seed('레그 익스텐션', 3, 60),
        seed('레그 컬', 3, 60),
        seed('런지', 3, 90)
      ]
    }
  ];
}

function toExercise(raw: any): Exercise | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const sets = Math.round(Number(raw?.sets));
  const restSec = Math.round(Number(raw?.restSec));
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : generateId(),
    name,
    sets: Number.isFinite(sets) && sets > 0 ? Math.min(20, sets) : 3,
    restSec: Number.isFinite(restSec) && restSec > 0 ? Math.min(3600, restSec) : 90
  };
}

export function loadRoutines(): Routine[] {
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (!raw) return createDefaultRoutines();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDefaultRoutines();

    const routines = parsed
      .map((r: any): Routine | null => {
        const name = typeof r?.name === 'string' ? r.name.trim() : '';
        if (!name) return null;
        return {
          id: typeof r?.id === 'string' && r.id ? r.id : generateId(),
          name,
          exercises: Array.isArray(r?.exercises)
            ? r.exercises.map(toExercise).filter((e: Exercise | null): e is Exercise => e !== null)
            : []
        };
      })
      .filter((r: Routine | null): r is Routine => r !== null);

    return routines.length > 0 ? routines : createDefaultRoutines();
  } catch (err) {
    console.error('Failed to load routines', err);
    return createDefaultRoutines();
  }
}

export function saveRoutines(routines: Routine[]): void {
  try {
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  } catch (err) {
    console.error('Failed to save routines', err);
  }
}

export function loadProgress(): RoutineProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.routineId !== 'string') return null;
    return {
      routineId: parsed.routineId,
      exerciseIndex: Math.max(0, Math.round(Number(parsed.exerciseIndex)) || 0),
      completedSets: Math.max(0, Math.round(Number(parsed.completedSets)) || 0)
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: RoutineProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress', err);
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // 무시
  }
}

export function totalSets(routine: Routine): number {
  return routine.exercises.reduce((sum, e) => sum + e.sets, 0);
}

export function doneSets(routine: Routine, progress: RoutineProgress): number {
  const before = routine.exercises
    .slice(0, progress.exerciseIndex)
    .reduce((sum, e) => sum + e.sets, 0);
  return before + progress.completedSets;
}

export function formatRest(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}
