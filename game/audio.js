// audio.js — every sound is synthesized with WebAudio: no audio files.
// One job: footsteps that tell you where a guard is, and the alert stings.

let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A short filtered noise tap. `pan` -1 (left) to 1 (right), `vol` by distance.
function tap(vol, pan, lowpass) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.07);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  src.connect(filter);
  filter.connect(gain);
  if (panner) {
    panner.pan.value = pan;
    gain.connect(panner);
    panner.connect(master);
  } else {
    gain.connect(master);
  }
  src.start(t0);
}

// The thief's own step: soft, low. Louder when walking, near-silent sneaking.
export function playPlayerStep(sneaking) {
  tap(sneaking ? 0.05 : 0.16, 0, sneaking ? 500 : 900);
}

// A guard's step: panned by where the guard is relative to the thief, and
// quieter the farther away — footsteps that tell you where a guard is.
export function playGuardStep(dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (dist > 420) return;
  const vol = 0.28 * (1 - dist / 420);
  const pan = Math.max(-1, Math.min(1, dx / 300));
  tap(vol, pan, 700);
}

export function playSuspicious() {
  tone(620, 0.16, 'square', 0.12);
  tone(830, 0.2, 'square', 0.12, 0.14);
}

export function playAlarm() {
  tone(440, 0.22, 'sawtooth', 0.16, 0, 880);
  tone(440, 0.22, 'sawtooth', 0.16, 0.2, 880);
}

export function playHackTick() {
  tone(1180, 0.06, 'sine', 0.1);
}

export function playHackDone() {
  tone(880, 0.12, 'sine', 0.14);
  tone(1320, 0.18, 'sine', 0.14, 0.1);
}

export function playDecoy() {
  tone(300, 0.1, 'triangle', 0.18, 0, 180);
  tone(980, 0.08, 'sine', 0.12, 0.25);
  tone(980, 0.08, 'sine', 0.12, 0.55);
}

export function playCaught() {
  tone(220, 0.5, 'sawtooth', 0.2, 0, 55);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => tone(n, 0.22, 'triangle', 0.16, i * 0.13));
}
