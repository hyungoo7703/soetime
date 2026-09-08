/**
 * 완료 알림음. 오디오 파일을 두지 않고 Web Audio로 즉석에서 만든다
 * (에셋 요청이 없으니 오프라인에서도 확실히 울린다).
 *
 * AudioContext는 사용자 조작 없이는 suspended 상태로 시작하므로,
 * 타이머를 시작하는 탭 이벤트에서 미리 unlock해 둬야 완료 시점에 소리가 난다.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** 사용자 제스처 안에서 호출해 오디오를 깨운다 */
export function unlockAudio(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
}

export function playBeep(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const start = audio.currentTime;
  // 짧은 삑 세 번. 헬스장 소음에서도 들리도록 조금 높은 음으로.
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const at = start + i * 0.22;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  }
}

/** iOS Safari는 Vibration API를 지원하지 않는다. 지원 기기에서만 동작한다. */
export function vibrate(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([200, 100, 200, 100, 300]);
  } catch {
    // 무시
  }
}
