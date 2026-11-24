import { Routine, DEFAULT_ROTATION_ORDER } from './routines';

const ROTATION_KEY = 'SOETIME_ROTATION_V1';
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_ORDER_LENGTH = 14;

/**
 * 주간 도장과 추천 순서.
 * 다음 차례는 따로 저장하지 않고 도장을 날짜순으로 따라가며 계산한다.
 * 그래야 도장을 뒤늦게 찍거나 지워도 추천이 어긋나지 않는다.
 */
export interface Rotation {
  /** 루틴 id를 도는 차례대로 적는다. 같은 루틴이 여러 번 나와도 된다 */
  order: string[];
  /** 보관 기간이 지나 버린 도장까지 따라간 순서 위치 */
  baseIndex: number;
  /** 운동한 날의 도장. 'YYYY-MM-DD' -> 루틴 id. 하루에 하나 */
  stamps: Record<string, string>;
}

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 일요일부터 토요일까지 7일. weekOffset이 -1이면 지난주 */
export function weekDates(now: Date, weekOffset = 0): Date[] {
  const sunday = now.getDate() - now.getDay() + weekOffset * 7;
  return Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), sunday + i));
}

/** 기본 루틴 그대로면 전신 - 빈약 - 전신 - 타깃, 아니면 루틴 목록 순서대로 한 번씩 */
export function defaultOrder(routines: Routine[]): string[] {
  const ids = new Set(routines.map((r) => r.id));
  return DEFAULT_ROTATION_ORDER.every((id) => ids.has(id))
    ? [...DEFAULT_ROTATION_ORDER]
    : routines.map((r) => r.id);
}

/**
 * 한 루틴을 끝냈을 때 다음 차례의 위치.
 * 지금 위치부터 앞으로 찾아 그 루틴이 처음 나오는 자리의 다음으로 간다.
 * 추천과 다른 루틴을 했다면 그 사이 차례는 건너뛴 것으로 본다.
 */
function advance(order: string[], index: number, routineId: string): number {
  for (let step = 0; step < order.length; step++) {
    const i = (index + step) % order.length;
    if (order[i] === routineId) return (i + 1) % order.length;
  }
  return index; // 순서에 없는 루틴은 차례를 바꾸지 않는다
}

function walk(rotation: Rotation, dates: string[]): number {
  const { order, stamps } = rotation;
  if (order.length === 0) return 0;
  return [...dates].sort().reduce((i, date) => advance(order, i, stamps[date]), rotation.baseIndex % order.length);
}

/** 다음에 할 차례의 루틴 id. 순서가 비어 있으면 추천하지 않는다 */
export function nextRoutineId(rotation: Rotation): string | null {
  if (rotation.order.length === 0) return null;
  return rotation.order[walk(rotation, Object.keys(rotation.stamps))];
}

/** routineId가 null이면 그날 도장을 지운다 */
export function setStamp(rotation: Rotation, date: string, routineId: string | null): Rotation {
  const { [date]: _removed, ...rest } = rotation.stamps;
  return { ...rotation, stamps: routineId ? { ...rest, [date]: routineId } : rest };
}

/**
 * 도장은 지난주와 이번 주 것만 남긴다 (운동 일지가 되지 않게).
 * 버리는 도장은 baseIndex에 먼저 반영해, 버린 뒤에도 다음 차례가 그대로 이어지게 한다.
 */
export function pruneStamps(rotation: Rotation, now = new Date()): Rotation {
  const cutoff = toDateKey(weekDates(now, -1)[0]);
  const expired = Object.keys(rotation.stamps).filter((date) => date < cutoff);
  if (expired.length === 0) return rotation;
  return {
    ...rotation,
    baseIndex: walk(rotation, expired),
    stamps: Object.fromEntries(Object.entries(rotation.stamps).filter(([date]) => date >= cutoff))
  };
}

/** 저장소와 백업 파일이 같은 검증을 지나가도록 한 곳에 모은다. */
export function sanitizeRotation(raw: unknown, routines: Routine[], now = new Date()): Rotation {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const ids = new Set(routines.map((r) => r.id));
  const baseIndex = Math.round(Number(source.baseIndex));
  const stamps = source.stamps && typeof source.stamps === 'object' ? source.stamps : {};

  return pruneStamps(
    {
      // 순서를 한 번도 정한 적이 없을 때만 기본 순서를 준다. 일부러 비운 순서는 빈 채로 둔다
      order: Array.isArray(source.order)
        ? source.order.filter((id): id is string => typeof id === 'string' && ids.has(id)).slice(0, MAX_ORDER_LENGTH)
        : defaultOrder(routines),
      baseIndex: Number.isFinite(baseIndex) && baseIndex > 0 ? baseIndex : 0,
      stamps: Object.fromEntries(
        Object.entries(stamps).filter(
          (entry): entry is [string, string] =>
            DATE_KEY.test(entry[0]) && typeof entry[1] === 'string' && entry[1] !== ''
        )
      )
    },
    now
  );
}

export function loadRotation(routines: Routine[]): Rotation {
  try {
    const raw = localStorage.getItem(ROTATION_KEY);
    return sanitizeRotation(raw ? JSON.parse(raw) : null, routines);
  } catch (err) {
    console.error('Failed to load rotation', err);
    return sanitizeRotation(null, routines);
  }
}

export function saveRotation(rotation: Rotation): boolean {
  try {
    localStorage.setItem(ROTATION_KEY, JSON.stringify(rotation));
    return true;
  } catch (err) {
    console.error('Failed to save rotation', err);
    return false;
  }
}
