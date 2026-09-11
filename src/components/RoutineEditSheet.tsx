import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Routine, Exercise, generateId, formatRest } from '../utils/routines';

interface RoutineEditSheetProps {
  routine: Routine;
  onChange: (next: Routine) => void;
  onClose: () => void;
}

export const RoutineEditSheet: React.FC<RoutineEditSheetProps> = ({
  routine,
  onChange,
  onClose
}) => {
  const [newName, setNewName] = useState('');

  const updateExercise = (id: string, patch: Partial<Exercise>) => {
    onChange({
      ...routine,
      exercises: routine.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e))
    });
  };

  const move = (index: number, delta: number) => {
    const next = [...routine.exercises];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...routine, exercises: next });
  };

  const addExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onChange({
      ...routine,
      exercises: [...routine.exercises, { id: generateId(), name, sets: 4, restSec: 90 }]
    });
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 max-h-[88vh] overflow-y-auto pb-safe">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <input
            type="text"
            value={routine.name}
            onChange={(e) => onChange({ ...routine, name: e.target.value })}
            className="text-base font-bold text-white bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none min-w-0 flex-1 mr-2"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 pt-4">
          {routine.exercises.map((ex, i) => (
            <div key={ex.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-30 text-[10px] leading-none py-0.5"
                    aria-label="위로"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === routine.exercises.length - 1}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-30 text-[10px] leading-none py-0.5"
                    aria-label="아래로"
                  >
                    ▼
                  </button>
                </div>

                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
                />

                <button
                  onClick={() =>
                    onChange({
                      ...routine,
                      exercises: routine.exercises.filter((e) => e.id !== ex.id)
                    })
                  }
                  className="p-1 text-slate-600 hover:text-rose-400 transition shrink-0"
                  aria-label={`${ex.name} 삭제`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 pl-6">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  세트
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.sets}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                      updateExercise(ex.id, { sets: Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 1 });
                    }}
                    className="w-10 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                  />
                </label>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  휴식
                  <input
                    type="text"
                    inputMode="numeric"
                    value={ex.restSec}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                      updateExercise(ex.id, {
                        restSec: Number.isFinite(n) ? Math.min(3600, Math.max(5, n)) : 5
                      });
                    }}
                    className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                  />
                  <span className="text-[10px] text-slate-500">초 = {formatRest(ex.restSec)}</span>
                </label>
              </div>
            </div>
          ))}

          {routine.exercises.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">
              운동을 추가해 주세요.
            </p>
          )}
        </div>

        <form onSubmit={addExercise} className="flex gap-2 pt-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="운동 이름 (예: 벤치 프레스)"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </form>
      </div>
    </div>
  );
};
