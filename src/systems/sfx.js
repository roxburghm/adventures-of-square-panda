// ================================================================
//  SOUND EFFECTS
//  There are no sound files: every sound is made by the computer from
//  beeps (oscillators) and hiss (noise), like an old games console.
//  To change a sound, change its numbers below:
//    tone(wave, startPitch, endPitch, seconds, volume, delay)
//  Waves: 'sine' (soft), 'triangle' (flute-ish), 'square' (retro), 'sawtooth' (buzzy)
// ================================================================

import { load, save, KEYS } from './storage.js';

let ctx = null;
let master = null;
let muted = load(KEYS.muted, false);

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Phones (iPhones especially) keep a web page silent until you touch it,
// so switch the sound on during the very first tap or key press.
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(type, () => !muted && audio(), { once: true, passive: true });
  }
}

function tone(wave, from, to, seconds, volume = 0.2, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}

function noise(seconds, volume = 0.3, pitch = 800, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * seconds), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = pitch;
  const gain = a.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

const notes = (wave, list, gap, seconds, volume) =>
  list.forEach((f, i) => tone(wave, f, f, seconds, volume, i * gap));

const SOUNDS = {
  jump: () => tone('square', 280, 560, 0.13, 0.1),
  sandHop: () => noise(0.15, 0.15, 500),
  land: () => noise(0.06, 0.12, 300),
  bonk: () => tone('square', 180, 130, 0.08, 0.1),
  bamboo: () => notes('triangle', [988, 1319], 0.07, 0.1, 0.18),
  heart: () => notes('sine', [660, 880, 1100], 0.09, 0.16, 0.25),
  key: () => notes('triangle', [784, 988, 1175, 1568], 0.07, 0.12, 0.2),
  boots: () => notes('triangle', [523, 659, 784, 1047, 1319], 0.08, 0.14, 0.2),
  door: () => {
    noise(0.3, 0.25, 500);
    tone('square', 200, 420, 0.25, 0.08);
  },
  locked: () => tone('square', 160, 150, 0.15, 0.1),
  freeze: () => tone('sine', 1800, 2700, 0.09, 0.1),
  stomp: () => {
    tone('square', 420, 120, 0.14, 0.15);
    noise(0.08, 0.2, 1500);
  },
  hurt: () => tone('sawtooth', 320, 90, 0.3, 0.15),
  splash: () => noise(0.45, 0.35, 1000),
  die: () => notes('square', [523, 392, 330, 262], 0.15, 0.16, 0.12),
  clang: () => tone('square', 1500, 1450, 0.06, 0.06),
  anvil: () => {
    noise(0.35, 0.45, 300);
    tone('square', 110, 50, 0.3, 0.18);
  },
  throw: () => tone('triangle', 500, 900, 0.1, 0.12),
  chomp: () => noise(0.07, 0.2, 2200),
  checkpoint: () => notes('triangle', [659, 784, 1047], 0.09, 0.15, 0.2),
  win: () => notes('square', [523, 659, 784, 1047, 784, 1047, 1319], 0.11, 0.14, 0.11),
  gameOver: () => notes('triangle', [392, 370, 349, 330, 262], 0.22, 0.3, 0.2),
  move: () => tone('triangle', 520, 520, 0.04, 0.08),
  select: () => notes('triangle', [660, 990], 0.05, 0.08, 0.15),
  type: () => tone('square', 880, 880, 0.03, 0.05),
};

export const sfx = {
  play(name) {
    if (muted) return;
    try {
      SOUNDS[name]?.();
    } catch {
      // Sound is a nice extra; never let it crash the game.
    }
  },
  get muted() {
    return muted;
  },
  toggle() {
    muted = !muted;
    save(KEYS.muted, muted);
    if (!muted) this.play('select');
    return muted;
  },
};
