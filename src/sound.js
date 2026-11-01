/* Synthesized sound effects + soft music (WebAudio, no audio files needed). */
let ctx = null, master = null, muted = false, musicTimer = null, drone = null, hold = null, musicPaused = false, vol = 1;
try { muted = localStorage.getItem('marianna_muted') === '1'; } catch (e) {}
try { const v = parseFloat(localStorage.getItem('marianna_vol')); if (!isNaN(v)) vol = Math.min(1, Math.max(0, v)); } catch (e) {}
const gainNow = () => (muted ? 0 : 0.8 * vol);

/* looped pencil-on-paper file: public/sounds/pencil.mp3 (falls back to synthesized scratches if missing) */
let pencilEl = null, pencilOn = false, pencilOk = true, pencilFade = null;
function pencilGet() {
  if (!pencilEl) {
    pencilEl = new Audio(import.meta.env.BASE_URL + 'sounds/pencil.mp3');
    pencilEl.loop = true;
    pencilEl.preload = 'auto';
    pencilEl.volume = 0.7;
    pencilEl.addEventListener('error', () => { pencilOk = false; });
  }
  return pencilEl;
}

const rnd = (a, b) => a + Math.random() * (b - a);

export function unlock() {
  musicPrime();
  ensureLoop();
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = gainNow();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(f, { d = 0.12, t = 'sine', v = 0.15, s = 0, at = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f, t0);
  if (s) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * s), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + d + 0.03);
}

function noise(d, v, f0, f1, at = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * d), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + d * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t0);
}

/* soft "voice": triangle/saw with glide, vibrato and a lowpass, used for Кротик */
function vox(f, { d = 0.2, v = 0.12, s = 1, vib = 0, vr = 6, t = 'triangle', lp = 3000, at = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
  o.type = t;
  o.frequency.setValueAtTime(f, t0);
  if (s !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * s), t0 + d);
  fl.type = 'lowpass'; fl.frequency.value = lp;
  if (vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = vr; lg.gain.value = f * vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + d + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(fl); fl.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + d + 0.05);
}

const seq = (notes, step, o) => notes.forEach((f, i) => tone(f, { ...o, at: i * step }));


/* ---- background music: rendered once into a seamless loop and played through an <audio> element,
   so it keeps playing when Safari goes to the background or the screen locks.
   (falls back to the old realtime synth if offline rendering is unavailable) ---- */
let musicEl = null, musicWant = false, musicPrimed = false, loopPromise = null, loopUrl = null, loopFailed = false;

function wavUrl(f32, sr) {
  const n = f32.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let k = 0; k < n; k++) { const s = Math.max(-1, Math.min(1, f32[k])); v.setInt16(44 + k * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

function renderLoop() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
  const SR = 22050, STEP = 0.56, BEATS = 160, TAIL = 2.6, D = BEATS * STEP;
  const oc = new OAC(1, Math.ceil(SR * (D + TAIL)), SR);
  const out = oc.createGain(); out.gain.value = 0.8; out.connect(oc.destination);
  const note = (f, at, d, v) => {
    const o = oc.createOscillator(), g = oc.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + d + 0.03);
  };
  const scale = [392, 440, 523, 587, 659, 784, 880], bass = [196, 220, 175, 262];
  let i = 3;
  for (let beat = 0; beat < BEATS; beat++) {
    const at = beat * STEP;
    i = Math.max(0, Math.min(scale.length - 1, i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    if (Math.random() > 0.2) { note(scale[i], at, 1.6, 0.04); note(scale[i] * 2, at, 0.9, 0.012); }
    if (beat % 4 === 0) note(bass[(beat / 4) % bass.length], at, 2.2, 0.05);
  }
  const p = oc.startRendering();
  return Promise.resolve(p).then((buf) => {
    const data = buf.getChannelData(0), loopN = Math.round(SR * D);
    for (let j = 0; j + loopN < data.length; j++) data[j] += data[loopN + j]; // fold the tail into the start: seamless loop
    return wavUrl(data.slice(0, loopN), SR);
  });
}

function ensureLoop() {
  if (!loopPromise) loopPromise = renderLoop().then((u) => { loopUrl = u; }).catch(() => { loopFailed = true; });
  return loopPromise;
}

function musicGet() {
  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.setAttribute('playsinline', '');
  }
  return musicEl;
}
function musicApply() { if (musicEl) { musicEl.muted = muted; try { musicEl.volume = vol; } catch (e) {} } }

/* first tap: let the <audio> element play once (silently) so later programmatic play() is allowed on iOS */
function musicPrime() {
  if (musicPrimed) return;
  musicPrimed = true;
  const a = musicGet();
  if (!a.src) a.src = wavUrl(new Float32Array(2205), 22050);
  a.muted = true;
  a.play().then(() => { if (!a.dataset.src) { a.pause(); a.currentTime = 0; } musicApply(); }).catch(() => {});
}

function attachLoop() {
  if (!musicWant || musicPaused || !loopUrl) return;
  const a = musicGet();
  if (a.dataset.src !== loopUrl) { a.src = loopUrl; a.dataset.src = loopUrl; }
  musicApply();
  a.play().catch(() => {}); // blocked (e.g. after a page reload): the next tap resumes it, see initSound
}

function realtimeMusic() {
  if (musicTimer) return;
  const scale = [392, 440, 523, 587, 659, 784, 880], bass = [196, 220, 175, 262];
  let i = 3, beat = 0;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running' || musicPaused) return;
    i = Math.max(0, Math.min(scale.length - 1, i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    if (Math.random() > 0.2) {
      tone(scale[i], { d: 1.6, v: 0.04 });
      tone(scale[i] * 2, { d: 0.9, v: 0.012 });
    }
    if (beat % 4 === 0) tone(bass[(beat / 4) % bass.length], { d: 2.2, v: 0.05 });
    beat++;
  }, 560);
}

function musicStart() {
  if (loopFailed) { realtimeMusic(); return; }
  if (loopUrl) { attachLoop(); return; }
  ensureLoop().then(() => { if (loopFailed) { if (musicWant && !musicPaused) realtimeMusic(); } else attachLoop(); });
}

export const sfx = {
  tap: () => tone(660, { d: 0.07, t: 'triangle', v: 0.12, s: 1.4 }),
  pop: () => tone(500, { d: 0.1, v: 0.15, s: 2 }),
  keyType: () => tone(rnd(1100, 1500), { d: 0.025, t: 'square', v: 0.035 }),
  enter: () => seq([520, 780], 0.06, { d: 0.08, t: 'square', v: 0.06 }),
  tick: () => tone(rnd(800, 1100), { d: 0.02, t: 'square', v: 0.03 }),
  click: () => tone(rnd(1700, 2100), { d: 0.018, t: 'square', v: 0.05 }), // click wheel
  beep: (big) => big ? seq([660, 880, 1320], 0.1, { d: 0.14, t: 'square', v: 0.07 }) : tone(880, { d: 0.1, t: 'square', v: 0.07 }),
  deny: () => { tone(180, { d: 0.3, t: 'sawtooth', v: 0.12, s: 0.6 }); tone(140, { d: 0.3, at: 0.1, t: 'sawtooth', v: 0.1, s: 0.6 }); },
  grant: () => seq([523, 659, 784], 0.09, { d: 0.2, t: 'triangle', v: 0.13 }),
  sparkle: () => seq([1047, 1319, 1568, 2093], 0.07, { d: 0.25, v: 0.08 }),
  scan: () => { tone(200, { d: 2.2, v: 0.07, s: 6 }); noise(2.2, 0.05, 400, 3000); },
  boot: () => { tone(110, { d: 0.7, t: 'sawtooth', v: 0.1, s: 3 }); seq([440, 660, 880], 0.12, { d: 0.12, t: 'square', v: 0.05, at: 0 }); },
  whoosh: () => { noise(1.5, 0.2, 300, 5000); tone(150, { d: 1.4, t: 'sine', v: 0.12, s: 6 }); },
  talk: () => tone(rnd(380, 620), { d: 0.05, t: 'triangle', v: 0.08 }),
  thump: () => { tone(120, { d: 0.14, v: 0.28, s: 0.5 }); noise(0.12, 0.12, 700, 300); },
  oops: () => seq([300, 230], 0.12, { d: 0.25, t: 'triangle', v: 0.12, s: 0.7 }),
  ok: () => seq([659, 784, 988], 0.08, { d: 0.18, t: 'triangle', v: 0.12 }),
  key: () => seq([784, 988, 1175, 1568], 0.08, { d: 0.35, v: 0.12 }),
  fanfare: () => { seq([523, 659, 784, 1047], 0.13, { d: 0.4, t: 'triangle', v: 0.13 }); [523, 659, 784].forEach((f) => tone(f, { d: 1.2, at: 0.6, v: 0.08 })); },
  letter: () => { seq([1047, 1319, 1568, 2093, 2637], 0.09, { d: 0.5, v: 0.08 }); [392, 494, 587].forEach((f) => tone(f, { d: 2, at: 0.3, v: 0.07 })); },

  /* pencil.mp3 loop while the letter is being written */
  pencilPrime() { // call inside a tap so iOS allows playback later
    const a = pencilGet();
    a.muted = true;
    a.play().then(() => { if (!pencilOn) { a.pause(); a.currentTime = 0; } }).catch(() => {});
  },
  pencilStart() {
    pencilOn = true;
    const a = pencilGet();
    if (pencilFade) { clearInterval(pencilFade); pencilFade = null; }
    a.volume = 0.7;
    a.currentTime = 0;
    a.muted = muted;
    a.play().catch(() => { pencilOk = false; });
  },
  pencilStop() {
    pencilOn = false;
    if (!pencilEl) return;
    const a = pencilEl;
    let v = a.volume;
    if (pencilFade) clearInterval(pencilFade);
    pencilFade = setInterval(() => {
      v -= 0.1;
      if (v <= 0) { clearInterval(pencilFade); pencilFade = null; a.pause(); a.currentTime = 0; a.volume = 0.7; }
      else a.volume = v;
    }, 40);
  },
  pencilActive: () => pencilOn && pencilOk,

  /* fallback: one short synthesized scratch per letter */
  pencil() {
    noise(rnd(0.04, 0.09), rnd(0.05, 0.09), rnd(3500, 6500), rnd(1800, 3000));
    noise(rnd(0.05, 0.1), 0.025, rnd(900, 1500), rnd(600, 900));
  },

  /* Кротик's voice and reactions */
  squeak: () => { const f = rnd(950, 1300); vox(f, { d: 0.13, v: 0.13, s: 1.5, vib: 0.02, vr: 30 }); vox(f * 1.2, { d: 0.12, v: 0.1, s: 0.8, at: 0.14, vib: 0.02, vr: 30 }); },
  chirp: () => vox(rnd(1300, 1700), { d: 0.07, v: 0.09, s: 1.3 }),
  hum: () => vox(rnd(170, 210), { d: 0.7, v: 0.1, s: 1.12, vib: 0.025, vr: 5, t: 'sawtooth', lp: 520 }),
  giggle: () => [1100, 1350, 1150, 1450].forEach((f, i) => vox(f, { d: 0.07, v: 0.09, s: 1.2, at: i * 0.09 })),
  whimper: () => { vox(750, { d: 0.45, v: 0.1, s: 0.55, vib: 0.05, vr: 9 }); vox(650, { d: 0.4, v: 0.07, s: 0.5, vib: 0.05, vr: 9, at: 0.5 }); },
  oh: () => { vox(520, { d: 0.16, v: 0.12, s: 1.8 }); vox(950, { d: 0.28, v: 0.1, s: 0.75, at: 0.16, vib: 0.03, vr: 7 }); },
  cheer: () => { [820, 1030, 1280, 1640].forEach((f, i) => vox(f, { d: 0.08, v: 0.1, s: 1.15, at: i * 0.07 })); vox(1500, { d: 0.25, v: 0.11, s: 1.35, at: 0.32, vib: 0.03, vr: 14 }); },
  sniffle: () => [0, 0.13, 0.26].forEach((a) => noise(0.08, 0.07, 3200, 1400, a)),
  sigh: () => { noise(0.9, 0.06, 1400, 500); vox(320, { d: 0.8, v: 0.06, s: 0.65, vib: 0.02, vr: 4, lp: 700 }); },
  poke() { const r = Math.random(); if (r < 0.4) sfx.squeak(); else if (r < 0.6) sfx.giggle(); else if (r < 0.8) sfx.oh(); else sfx.hum(); },
  idle() { const r = Math.random(); if (r < 0.4) sfx.hum(); else if (r < 0.7) sfx.squeak(); else if (r < 0.85) sfx.sniffle(); else sfx.sigh(); },
  react(x) { (Array.isArray(x) ? x : [x]).forEach((n, i) => setTimeout(() => sfx[n] && sfx[n](), 450 + i * 700)); },

  holdStart() {
    unlock();
    if (!ctx) return;
    if (!drone) {
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 1.5);
      const a = ctx.createOscillator(), b = ctx.createOscillator();
      a.frequency.value = 55; b.frequency.value = 82.5; b.type = 'triangle';
      a.connect(g); b.connect(g); g.connect(master); a.start(); b.start();
      drone = { a, b, g };
    }
    if (hold) return;
    const g = ctx.createGain(), o = ctx.createOscillator(), t0 = ctx.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 1.8);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.1, t0 + 1.7);
    o.connect(g); g.connect(master); o.start();
    hold = { o, g };
  },
  holdEnd() {
    if (!hold || !ctx) return;
    const { o, g } = hold; hold = null;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.stop(t + 0.2);
  },
  droneOff() {
    if (!drone || !ctx) return;
    const { a, b, g } = drone; drone = null;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    a.stop(t + 1.1); b.stop(t + 1.1);
  },

  /* soft music-box loop (an <audio> element, see above) */
  music(on) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    musicWant = on;
    if (!on) { if (musicEl) musicEl.pause(); return; }
    musicPaused = false;
    musicStart();
  },

  /* background music can be paused without touching the sound effects */
  musicPause(p) {
    if (!p && !musicWant) { sfx.music(true); return; }
    musicPaused = p;
    if (p) {
      if (musicEl) musicEl.pause();
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      return;
    }
    musicStart();
  },
  musicPlaying: () => musicWant && !musicPaused,
  musicActive: () => !!musicTimer || !!(musicEl && musicEl.dataset.src && !musicEl.paused),

  isMuted: () => muted,
  getVolume: () => vol,
  setVolume(v) { // 0..1; zero means muted
    vol = Math.min(1, Math.max(0, v));
    try { localStorage.setItem('marianna_vol', String(vol)); } catch (e) {}
    sfx.setMuted(vol === 0);
  },
  setMuted(m) {
    if (!m && vol === 0) vol = 0.5;
    muted = m;
    try { localStorage.setItem('marianna_muted', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = gainNow();
    if (pencilEl) pencilEl.muted = m;
    musicApply();
  },
};

/* Global hooks: unlock audio, button taps, keyboard clicks */
export function initSound() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  document.addEventListener('pointerdown', (e) => {
    unlock();
    if (musicWant && !musicPaused && musicEl && musicEl.dataset.src && musicEl.paused) musicEl.play().catch(() => {});
    const b = e.target.closest && e.target.closest('button');
    if (b && !b.hasAttribute('data-nosound')) sfx.tap();
  }, true);
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
    if (e.key === 'Enter') sfx.enter();
    else if (e.key.length === 1 || e.key === 'Backspace') sfx.keyType();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); if (pencilEl && pencilOn) pencilEl.pause(); }
    else { ctx.resume(); if (pencilEl && pencilOn) pencilEl.play().catch(() => {}); }
  });
}