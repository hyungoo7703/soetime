import React, { useRef, useState } from 'react';
import { Download, Upload, Copy, Check, Undo2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Settings } from '../utils/storage';
import { Routine } from '../utils/routines';
import { PersistState } from '../utils/persistence';
import {
  BackupData,
  applyImported,
  clearPreimportSnapshot,
  exportBackupJson,
  parseBackupJson,
  readPreimportSnapshot,
  summarize
} from '../utils/backup';

interface BackupSectionProps {
  settings: Settings;
  routines: Routine[];
  persistState: PersistState;
  onRestore: (data: BackupData) => void;
}

export const BackupSection: React.FC<BackupSectionProps> = ({
  settings,
  routines,
  persistState,
  onRestore
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);
  const [snapshot, setSnapshot] = useState(() => readPreimportSnapshot());

  const current: BackupData = { settings, routines };

  const handleDownload = () => {
    const blob = new Blob([exportBackupJson(current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soetime-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportBackupJson(current));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('클립보드 복사에 실패했습니다. 파일로 내보내기를 써 주세요.');
    }
  };

  // 검증 → 내용 확인 → 적용. 확인 전에는 기존 루틴을 건드리지 않는다.
  const runImport = (jsonStr: string, onDone?: () => void) => {
    let parsed: ReturnType<typeof parseBackupJson>;
    try {
      parsed = parseBackupJson(jsonStr);
    } catch (err: any) {
      setError(err.message || '유효하지 않은 백업 데이터입니다.');
      return;
    }

    const now = summarize(current);
    const { summary } = parsed;
    const exportedLabel = summary.exportedAt
      ? `\n백업 시점: ${new Date(summary.exportedAt).toLocaleString('ko-KR')}`
      : '';

    const proceed = window.confirm(
      `[가져올 데이터]${exportedLabel}\n` +
        `· 루틴 ${summary.routineCount}개 · 운동 ${summary.exerciseCount}개 · 총 ${summary.setCount}세트\n` +
        `· 휴식 프리셋 ${summary.presetCount}개\n\n` +
        `[현재 데이터]\n` +
        `· 루틴 ${now.routineCount}개 · 운동 ${now.exerciseCount}개 · 총 ${now.setCount}세트\n\n` +
        `현재 루틴과 설정은 위 내용으로 모두 교체됩니다.\n` +
        `교체 직전 상태는 자동으로 저장되어 '되돌리기'로 복구할 수 있습니다.\n\n` +
        `계속할까요?`
    );
    if (!proceed) return;

    try {
      applyImported(parsed.data);
    } catch (err: any) {
      setError(err.message || '복원에 실패했습니다.');
      return;
    }

    onRestore(parsed.data);
    setSnapshot(readPreimportSnapshot());
    setError('');
    setRestored(true);
    onDone?.();
    setTimeout(() => setRestored(false), 3000);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (event) => {
      runImport(String(event.target?.result ?? ''));
      input.value = ''; // 같은 파일을 다시 고를 수 있도록 초기화
    };
    reader.onerror = () => {
      setError('파일을 읽지 못했습니다.');
      input.value = '';
    };
    reader.readAsText(file);
  };

  const handleUndo = () => {
    if (!snapshot) return;
    const at = new Date(snapshot.savedAt).toLocaleString('ko-KR');
    if (!window.confirm(`${at} 상태로 되돌립니다.\n지금 루틴과 설정은 사라집니다. 계속할까요?`)) return;
    try {
      applyImported(snapshot.data);
    } catch (err: any) {
      setError(err.message || '되돌리기에 실패했습니다.');
      return;
    }
    onRestore(snapshot.data);
    setSnapshot(readPreimportSnapshot());
    setError('');
    setRestored(true);
    setTimeout(() => setRestored(false), 3000);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold text-slate-300">백업</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        루틴과 설정은 이 기기에만 있습니다. 앱을 지우거나 브라우저 사이트 데이터를 비우면
        복구할 방법이 없으니, 루틴을 손본 뒤에는 파일로 한 번 내보내 두세요.
      </p>

      {/* 자동 삭제 방지 상태. 사용자가 직접 지우는 것은 어차피 막지 못하므로 과장하지 않는다 */}
      {persistState !== 'checking' && (
        <div
          className={`flex items-start gap-2 text-[11px] leading-relaxed rounded-xl p-2.5 border ${
            persistState === 'persisted'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
          }`}
        >
          {persistState === 'persisted' ? (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          )}
          <span>
            {persistState === 'persisted' ? (
              <>
                <strong className="text-emerald-300">자동 삭제 방지 켜짐.</strong> 기기 용량이 부족해도
                브라우저가 이 앱의 루틴을 먼저 비우지 않습니다. 단 직접 사이트 데이터를 지우거나 앱을
                삭제하면 그대로 사라집니다.
              </>
            ) : persistState === 'unsupported' ? (
              <>
                이 브라우저는 <strong className="text-slate-200">자동 삭제 방지</strong>를 지원하지 않습니다.
                백업 파일이 유일한 복구 수단입니다.
              </>
            ) : (
              <>
                <strong className="text-amber-300">자동 삭제 방지가 거절됐습니다.</strong> 기기 용량이
                부족해지면 브라우저가 예고 없이 루틴을 비울 수 있습니다. 홈 화면에 앱으로 설치하면
                보통 허가됩니다.
              </>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition"
        >
          <Download className="w-4 h-4" />
          파일로 내보내기
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? '복사됨' : '클립보드 복사'}
        </button>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition"
      >
        <Upload className="w-4 h-4" />
        백업 파일에서 복원
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        className="hidden"
      />

      <details>
        <summary className="text-[11px] text-slate-500 cursor-pointer py-1 list-none">
          붙여넣기로 복원 ▾
        </summary>
        <div className="space-y-2 pt-1">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="백업 JSON을 붙여넣으세요"
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            onClick={() => runImport(pasted, () => setPasted(''))}
            disabled={!pasted.trim()}
            className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold active:scale-95 transition"
          >
            붙여넣은 내용으로 복원
          </button>
        </div>
      </details>

      {snapshot && (
        <>
          <button
            onClick={handleUndo}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs font-bold active:scale-95 transition"
          >
            <Undo2 className="w-4 h-4" />
            되돌리기 ({new Date(snapshot.savedAt).toLocaleString('ko-KR')} 상태)
          </button>
          <button
            onClick={() => {
              clearPreimportSnapshot();
              setSnapshot(null);
            }}
            className="w-full text-[10px] text-slate-600 hover:text-slate-400 py-0.5 transition"
          >
            되돌리기 기록 지우기
          </button>
        </>
      )}

      {restored && (
        <p className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
          <Check className="w-3.5 h-3.5" />
          복원했습니다
        </p>
      )}
      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-rose-400 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </section>
  );
};
