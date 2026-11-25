const ROUTINES_KEY = 'SOETIME_ROUTINES_V1';
const PROGRESS_KEY = 'SOETIME_PROGRESS_V1';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  restSec: number;
  /** 목표 반복 횟수 안내 문구 ("6~10회"). 실제로 한 횟수를 적는 칸이 아니다 */
  reps: string;
  /** 자세·강도 포인트 한 줄 */
  note: string;
}

export interface Routine {
  id: string;
  name: string;
  /** 루틴 전체에 대한 메모 ("매 세트 1~2개 남기고 끊기") */
  note: string;
  /** 루틴을 끝낸 뒤 완료 화면에서 안내할 마무리 운동 ("인터벌") */
  cooldown: string;
  exercises: Exercise[];
}

/** 진행 중인 루틴. 헬스장에서 앱이 죽어도 이어서 하도록 저장한다. */
export interface RoutineProgress {
  routineId: string;
  /** 현재 운동 index */
  exerciseIndex: number;
  /** 현재 운동에서 끝낸 세트 수 */
  completedSets: number;
  /** 이번 진행에서 실제로 끝낸 세트 수. 건너뛴 운동의 세트는 세지 않는다 */
  setsDone: number;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const seed = (name: string, sets: number, restSec: number, reps: string, note: string): Exercise => ({
  id: generateId(),
  name,
  sets,
  restSec,
  reps,
  note
});

// 기본 루틴의 id는 고정한다. 추천 순서(DEFAULT_ROTATION_ORDER)가 이 id를 가리킨다.
const FULL_BODY_ID = 'default-full';
const WEAK_POINT_ID = 'default-weak';
const TARGET_ID = 'default-target';

const DEFAULT_COOLDOWNS: Record<string, string> = {
  [FULL_BODY_ID]: '마이마운틴',
  [WEAK_POINT_ID]: '인터벌',
  [TARGET_ID]: '인터벌'
};

/** 기본 루틴을 도는 차례: 전신 - 빈약 - 전신 - 타깃 */
export const DEFAULT_ROTATION_ORDER = [FULL_BODY_ID, WEAK_POINT_ID, FULL_BODY_ID, TARGET_ID];

/**
 * 첫 실행에 빈 화면을 주지 않도록 기본 루틴을 채워둔다. 전부 편집 가능하다.
 * 세트는 권장 범위의 큰 쪽(컨디션이 나쁘면 '이 운동 건너뛰기'), 휴식은 범위의 가운데 값이다.
 */
export function createDefaultRoutines(): Routine[] {
  return [
    {
      id: FULL_BODY_ID,
      name: '전신데이',
      cooldown: DEFAULT_COOLDOWNS[FULL_BODY_ID],
      note: '매 세트 실패 지점까지 가지 않고 1~2개 남기고 끊습니다. 그래야 마지막 데드리프트까지 집중력이 남습니다.',
      exercises: [
        seed('풀업', 4, 135, '6~10회', '웜업 겸 상체 당기기. 중량을 달 수 있으면 6~8회'),
        seed('프론트 스쿼트', 4, 165, '6~8회', '코어와 상체 각도가 무너지기 직전까지. 마지막 1~2개는 남기기'),
        seed('오버헤드 프레스', 3, 135, '6~10회', '반동 없이 엄격한 자세로'),
        seed('벤치 프레스', 3, 135, '6~10회', '오버헤드 프레스 직후라 어깨 피로를 감안해 안정적인 궤적으로'),
        seed('데드리프트', 3, 180, '5~6회', '마지막 종목. 3세트를 넘기지 않고, 자세가 깨지면 바로 끝내기')
      ]
    },
    {
      id: WEAK_POINT_ID,
      name: '빈약채우기데이',
      cooldown: DEFAULT_COOLDOWNS[WEAK_POINT_ID],
      note: '관절 부담은 줄이고 자극과 펌핑 위주로 빠르게 진행합니다.',
      exercises: [
        seed('후면어깨 플라이', 4, 60, '15~20회', '승모근 개입을 줄이고 후면 삼각근을 먼저 깨우기'),
        seed('클로즈그립 랫풀다운', 4, 90, '10~12회', '길게 이완한 뒤 명치 쪽으로 당기기'),
        seed('등하부 머신', 3, 90, '12~15회', '기립근·둔근 수축감 위주. 데드리프트 회복을 방해하지 않게 조절'),
        seed('딥스', 3, 105, '8~12회', '어깨 앞쪽이 불편하지 않은 깊이까지만'),
        seed('케이블 삼두', 3, 60, '12~15회', '팔꿈치를 고정하고 끝까지 펴서 수축'),
        seed('복근 운동', 4, 50, '15~20회', '행잉 레그레이즈나 케이블 크런치. 숨을 뱉으며 수축'),
        seed('사이드 레터럴 레이즈', 4, 50, '15~20회', '고반복으로 측면 삼각근 마무리')
      ]
    },
    {
      id: TARGET_ID,
      name: '타깃채우기데이',
      cooldown: DEFAULT_COOLDOWNS[TARGET_ID],
      note: '전신데이에서 덜 다룬 햄스트링·대퇴사두, 중부 등, 윗가슴, 이두를 채웁니다.',
      exercises: [
        seed('레그 컬', 4, 75, '12~15회', '데드리프트 피로가 남았으면 중량을 낮추고 천천히 내리기'),
        seed('레그 익스텐션', 4, 75, '12~15회', '맨 위에서 1초 멈춰 대퇴사두 수축'),
        seed('시티드 로우', 4, 90, '10~12회', '견갑골을 모았다 펴며 중부 등 두께 자극'),
        seed('인클라인 덤벨 프레스', 4, 105, '10~12회', '벤치 각도 30도 안팎으로 윗가슴'),
        seed('사이드 레터럴 레이즈', 4, 50, '15~20회', '빈약채우기데이와 다른 도구(케이블·덤벨)로'),
        seed('덤벨 컬', 4, 60, '10~12회', '반동을 최소화해 이두 고립')
      ]
    }
  ];
}

function toText(raw: unknown, maxLength: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, maxLength) : '';
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
    restSec: Number.isFinite(restSec) && restSec > 0 ? Math.min(3600, restSec) : 90,
    reps: toText(raw?.reps, 20),
    note: toText(raw?.note, 120)
  };
}

/** 저장소와 백업 파일이 같은 검증을 지나가도록 한 곳에 모은다. */
export function sanitizeRoutines(raw: unknown): Routine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any): Routine | null => {
      const name = typeof r?.name === 'string' ? r.name.trim() : '';
      if (!name) return null;
      const id = typeof r?.id === 'string' && r.id ? r.id : generateId();
      return {
        id,
        name,
        note: toText(r?.note, 200),
        // 마무리 안내가 생기기 전에 저장된 기본 루틴은 칸 자체가 없다. 그때만 기본값을 채우고,
        // 일부러 비운 값('')은 그대로 둔다
        cooldown: typeof r?.cooldown === 'string' ? toText(r.cooldown, 40) : DEFAULT_COOLDOWNS[id] ?? '',
        exercises: Array.isArray(r?.exercises)
          ? r.exercises.map(toExercise).filter((e: Exercise | null): e is Exercise => e !== null)
          : []
      };
    })
    .filter((r: Routine | null): r is Routine => r !== null);
}

export function loadRoutines(): Routine[] {
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (!raw) return createDefaultRoutines();
    const routines = sanitizeRoutines(JSON.parse(raw));
    return routines.length > 0 ? routines : createDefaultRoutines();
  } catch (err) {
    console.error('Failed to load routines', err);
    return createDefaultRoutines();
  }
}

export function saveRoutines(routines: Routine[]): boolean {
  try {
    localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
    return true;
  } catch (err) {
    console.error('Failed to save routines', err);
    return false;
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
      completedSets: Math.max(0, Math.round(Number(parsed.completedSets)) || 0),
      setsDone: Math.max(0, Math.round(Number(parsed.setsDone)) || 0)
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
