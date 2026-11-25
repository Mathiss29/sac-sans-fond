// Sons générés à la volée avec Web Audio : aucun fichier, aucune licence.
// Le contexte audio ne démarre qu'après une première action du joueur (règle des navigateurs).
let ctx = null, master = null, noiseBuf = null, muted = false;
const last = {};
const GAP = { hit: 0.035, arrow: 0.05, frost: 0.08, note: 0.1, slash: 0.06, pop: 0.03, coin: 0.025, land: 0.05 };

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.32; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.32; if (typeof refreshMusic === 'function') refreshMusic(); }
export function isMuted() { return muted; }

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.005, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, filter, f0, f1, delay = 0) {
  const t = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = filter; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.004, vol, dur); src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.02);
}

export function play(name, opt = {}) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (GAP[name] && now - (last[name] || 0) < GAP[name]) return;
  last[name] = now;
  const j = 1 + (Math.random() - 0.5) * 0.08; // petite variation pour éviter la répétition
  switch (name) {
    case 'coin': { const f = 990 * Math.pow(2, Math.min(opt.n || 1, 24) / 24); tone('square', f * j, null, 0.06, 0.07); tone('square', f * 1.5 * j, null, 0.07, 0.05, 0.035); break; }
    case 'arrow': noise(0.06, 0.08, 'bandpass', 2400 * j, 900); tone('triangle', 520 * j, 260, 0.06, 0.05); break;
    case 'frost': tone('sine', 1500 * j, 2400, 0.12, 0.06); noise(0.1, 0.04, 'highpass', 5000, 8000); break;
    case 'note': tone('triangle', 660 * j, null, 0.09, 0.06); tone('triangle', 880 * j, null, 0.1, 0.05, 0.08); break;
    case 'slash': noise(0.09, 0.12, 'bandpass', 900 * j, 3500); break;
    case 'hit': noise(0.05, opt.crit ? 0.16 : 0.08, 'lowpass', opt.crit ? 2500 : 1400, 300); if (opt.crit) tone('square', 300, 120, 0.08, 0.06); break;
    case 'pop': tone('sine', 380 * j, 900, 0.09, 0.12); noise(0.06, 0.05, 'highpass', 1500, null); break;
    case 'gold': [0, 0.06, 0.12, 0.18].forEach((d, i) => tone('square', 880 * Math.pow(1.26, i), null, 0.1, 0.07, d)); break;
    case 'land': tone('sine', 140, 55, 0.16, 0.25); noise(0.12, 0.08, 'lowpass', 600, 150); break;
    case 'tier': [0, 0.09, 0.18, 0.3].forEach((d, i) => tone('triangle', 523 * [1, 1.26, 1.5, 2][i], null, 0.22, 0.1, d)); break;
    case 'rumble': noise(1.1, 0.18, 'lowpass', 180, 90); tone('sawtooth', 55, 45, 1.1, 0.06); break;
    case 'burst': noise(0.7, 0.3, 'lowpass', 2500, 120); tone('sine', 110, 40, 0.6, 0.35); [0.05, 0.12, 0.2].forEach((d, i) => tone('square', 1320 * (1 + i * 0.25), null, 0.12, 0.05, d)); break;
    case 'boss': noise(0.9, 0.28, 'lowpass', 1800, 90); tone('sine', 90, 35, 0.9, 0.35); [0, 0.15, 0.3].forEach((d, i) => tone('triangle', 392 * [1, 1.26, 1.5][i], null, 0.5, 0.09, d + 0.2)); break;
    case 'click': tone('square', 700, 500, 0.04, 0.05); break;
    case 'buy': tone('square', 660, null, 0.06, 0.06); tone('square', 990, null, 0.09, 0.06, 0.06); break;
  }
}

// ---------- Musique (morceaux créés par Mathis avec Suno) ----------
// Un lecteur par morceau ; on passe de l'un à l'autre en fondu.
const TRACKS = {
  atelier: 'assets/music/atelier-prairie-pixel.mp3',
  expedition: 'assets/music/expedition-arpege-fantasy.mp3',
  boss: 'assets/music/boss-rage-des-demons.mp3',
};
const MUSIC_VOL = 0.42;
const players = {};
let current = null, unlocked = false, fadeTimer = null;

function player(name) {
  if (!players[name]) {
    const a = new Audio(TRACKS[name]);
    a.loop = true; a.preload = 'auto'; a.volume = 0;
    players[name] = a;
  }
  return players[name];
}

function fadeLoop() {
  let busy = false;
  for (const [name, a] of Object.entries(players)) {
    const target = name === current && !muted ? MUSIC_VOL : 0;
    const v = a.volume + Math.sign(target - a.volume) * 0.03;
    a.volume = Math.max(0, Math.min(1, Math.abs(target - a.volume) < 0.03 ? target : v));
    if (a.volume === 0 && name !== current && !a.paused) a.pause();
    if (a.volume !== target) busy = true;
  }
  fadeTimer = busy ? setTimeout(fadeLoop, 40) : null;
}

export function setTrack(name) {
  if (name === current) return;
  current = name;
  if (unlocked && name && !muted) { const a = player(name); if (name !== 'boss' || a.paused) a.play().catch(() => {}); }
  if (!fadeTimer) fadeLoop();
}

// Appelé au premier clic/touche : les navigateurs interdisent la musique avant.
export function unlockMusic() {
  if (unlocked) return;
  unlocked = true;
  if (current && !muted) player(current).play().catch(() => { unlocked = false; });
  if (!fadeTimer) fadeLoop();
}

export function refreshMusic() {
  if (current && unlocked && !muted) player(current).play().catch(() => {});
  if (!fadeTimer) fadeLoop();
}
