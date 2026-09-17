export type ActionAlertKind = "action" | "end-turn";

type Tone = Readonly<{
  delay: number;
  duration: number;
  frequency: number;
}>;

const tones: Readonly<Record<ActionAlertKind, readonly Tone[]>> = {
  action: [{ delay: 0, duration: 0.12, frequency: 660 }],
  "end-turn": [
    { delay: 0, duration: 0.12, frequency: 440 },
    { delay: 0.12, duration: 0.18, frequency: 330 },
  ],
};

let audioContext: AudioContext | undefined;

const playTones = (context: AudioContext, alertKind: ActionAlertKind): void => {
  const start = context.currentTime;

  for (const tone of tones[alertKind]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneStart = start + tone.delay;
    const toneEnd = toneStart + tone.duration;

    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(0.12, toneStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd);
  }
};

export const playActionAlert = (alertKind: ActionAlertKind): void => {
  try {
    const context = audioContext ?? new AudioContext();
    audioContext = context;
    if (context.state === "suspended") {
      void context.resume()
        .then(() => playTones(context, alertKind))
        .catch(() => undefined);
      return;
    }

    playTones(context, alertKind);
  } catch {
    // Audio is optional feedback and may be unavailable or blocked by the browser.
  }
};
