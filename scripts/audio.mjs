// Procedural, seeded score + sfx. Writes music.wav, sfx.wav and timing.json.
import fs from 'node:fs';
const SR = 48000, FPS = 60, BPM = 120, DUR = 15;
const N = SR * DUR, beatS = 60 / BPM;
let seed = 1234567; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const music = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
const add = (buf, i, v, pan = 0) => { if (i >= 0 && i < N) { buf[0][i] += v * (1 - pan) ; buf[1][i] += v * (1 + pan); } };
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const DROP = 8.0;

// kick
function kick(t0, amp) { const s = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < SR * 0.35; i++) { const t = i / SR, f = 45 + 110 * Math.exp(-t * 28); ph += 2 * Math.PI * f / SR;
    add(music, s + i, amp * Math.sin(ph) * Math.exp(-t * 7) * Math.min(1, i / 40)); } }
// hat (one-pole highpassed noise)
function hat(t0, amp, pan) { const s = Math.floor(t0 * SR); let lp = 0;
  for (let i = 0; i < SR * 0.06; i++) { const n = rnd() * 2 - 1; lp += 0.6 * (n - lp); add(music, s + i, amp * (n - lp) * Math.exp(-i / SR * 70), pan); } }
// pad: detuned saws through a moving one-pole lowpass
const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 67]]; // Am7 Fmaj7 C G
let lpL = 0, lpR = 0; const phs = new Float64Array(16);
for (let i = 0; i < N; i++) { const t = i / SR, bar = Math.floor(t / (beatS * 4)) % 4, ch = chords[bar];
  let l = 0, r = 0; ch.forEach((m, k) => { for (let d = 0; d < 2; d++) { const j = k * 2 + d, f = mtof(m) * (d ? 1.004 : 0.996);
    phs[j] = (phs[j] + f / SR) % 1; const v = 2 * phs[j] - 1; d ? (r += v) : (l += v); } });
  const open = t < DROP ? 0.02 + 0.05 * (t / DROP) ** 2 : 0.09 + 0.03 * Math.sin(t * 2);
  lpL += open * (l - lpL); lpR += open * (r - lpR);
  const env = Math.min(1, t / 0.4) * Math.min(1, (DUR - t) / 1.2);
  const duck = t >= DROP ? 0.55 + 0.45 * Math.min(1, ((t - DROP) % beatS) / 0.22) : 1; // sidechain after drop
  music[0][i] += 0.06 * lpL * env * duck; music[1][i] += 0.06 * lpR * env * duck; }
// bass after drop
{ let ph = 0; for (let i = Math.floor(DROP * SR); i < N; i++) { const t = i / SR, bar = Math.floor(t / (beatS * 4)) % 4;
  const f = mtof(chords[bar][0] - 24); ph += f / SR; const v = Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph);
  const g = 0.5 + 0.5 * Math.min(1, ((t - DROP) % beatS) / 0.2); add(music, i, 0.16 * v * g * Math.min(1, (DUR - t) / 1.2)); } }
// riser 7.0 → 8.0
{ let lp = 0; for (let i = 7 * SR; i < DROP * SR; i++) { const p = (i / SR - 7); const n = rnd() * 2 - 1; lp += (0.02 + 0.5 * p * p) * (n - lp);
  add(music, i, 0.12 * p * p * lp, Math.sin(p * 20) * 0.3); } }
const beats = []; for (let b = 0; b * beatS < DUR - 1e-9; b++) beats.push(+(b * beatS).toFixed(3));
beats.forEach((t, b) => { if (t < DROP) { if (b % 2 === 0 && t < 7) kick(t, 0.5); } else if (t < 14.5) kick(t, 0.85);
  if (b >= 4 && t < 14.5 && !(t > 7 && t < DROP)) hat(t + beatS / 2, t >= DROP ? 0.09 : 0.05, (b % 2 ? 0.3 : -0.3)); });
kick(13.5, 0.9);

// ---- sfx, each in its own band ----
function whoosh(t0, dur = 0.45, amp = 0.16) { const s = Math.floor((t0 - dur * 0.7) * SR); let a = 0, b = 0;
  for (let i = 0; i < dur * SR; i++) { const p = i / (dur * SR), n = rnd() * 2 - 1, fc = 0.05 + 0.25 * Math.sin(Math.PI * p);
    a += fc * (n - a); b += fc * (a - b); add(sfx, s + i, amp * (a - b) * Math.sin(Math.PI * p) ** 2, (p - 0.5) * 0.8); } }
function click(t0, amp = 0.22) { const s = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 0.025; i++) { const t = i / SR; add(sfx, s + i, amp * Math.sin(2 * Math.PI * 4200 * t) * Math.exp(-t * 300) + amp * 0.5 * (rnd() * 2 - 1) * Math.exp(-t * 900)); } }
function pop(t0, f0 = 900, amp = 0.25) { const s = Math.floor(t0 * SR); let ph = 0;
  for (let i = 0; i < SR * 0.09; i++) { const t = i / SR; ph += (f0 + 1600 * t * 10) / SR; add(sfx, s + i, amp * Math.sin(2 * Math.PI * ph) * Math.exp(-t * 45)); } }
function impact(t0) { const s = Math.floor(t0 * SR); let lp = 0;
  for (let i = 0; i < SR * 0.8; i++) { const t = i / SR, n = rnd() * 2 - 1; lp += 0.08 * (n - lp); add(sfx, s + i, 0.35 * lp * Math.exp(-t * 6)); } }

const f = s => Math.round(s * FPS);
const events = {
  dot_pop: 1.5, morphs: [2.5, 3.0, 3.5], ui_clicks: [4.5, 5.0, 5.5], knob_lift: 5.75, cube_squash: 7.75,
  drop: DROP, bounces: [8.5, 9.0, 9.5, 10.0, 10.5], pool: 11.0, ripple_collapse: 12.5, type_words: [13.0, 13.25, 13.5], end_hit: 13.5 };
const scenes = [0, 2, 4, 6, 8, 11, 13];
scenes.slice(1).forEach(t => t !== DROP && whoosh(t));
pop(events.dot_pop); events.morphs.forEach(t => pop(t, 1400, 0.12)); events.ui_clicks.forEach(t => click(t));
impact(DROP); events.bounces.forEach((t, i) => pop(t, 500 + i * 60, 0.10)); pop(events.end_hit, 700, 0.18);

function writeWav(path, ch) { const n = ch[0].length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(ch[c][i] * 32767))), 44 + i * 4 + c * 2);
  fs.writeFileSync(path, b); }
writeWav('out/music.raw.wav', music); writeWav('out/sfx.raw.wav', sfx);
const toF = v => Array.isArray(v) ? v.map(f) : f(v);
fs.writeFileSync('timing.json', JSON.stringify({ fps: FPS, bpm: BPM, durationFrames: DUR * FPS, beatFrames: beats.map(f), dropFrame: f(DROP),
  voice: null, sceneFrames: scenes.map(f), events: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, toF(v)])) }, null, 1));
console.log('audio ok');
