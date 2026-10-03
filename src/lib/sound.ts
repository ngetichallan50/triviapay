/// Light feedback tones for a correct / wrong answer, synthesised with the
/// Web Audio API (no asset files needed). Mirrors the mobile app's
/// `assets/sounds/{correct,wrong}.wav`.

let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

type Note = { freq: number; dur: number };

/** Plays a short sequence of gently-enveloped sine notes. */
function playNotes(notes: Note[], volume: number) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  let start = ac.currentTime;
  for (const note of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;

    const attack = 0.008;
    const release = 0.06;
    const end = start + note.dur;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.setValueAtTime(volume, end - release);
    gain.gain.linearRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(end + 0.02);
    start = end;
  }
}

/** Light ascending chime (C5 -> E5). */
export function playCorrect() {
  playNotes(
    [
      { freq: 523.25, dur: 0.1 },
      { freq: 659.25, dur: 0.2 },
    ],
    0.16,
  );
}

/** Soft descending tone (G4 -> D4), never harsh. */
export function playWrong() {
  playNotes(
    [
      { freq: 392.0, dur: 0.1 },
      { freq: 293.66, dur: 0.22 },
    ],
    0.13,
  );
}
