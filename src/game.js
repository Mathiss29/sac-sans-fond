// Logique d'une expédition : entités, combat, récolte, sac et Déchirure.
import { ENEMIES, HEROES, HERO_ORDER, GOLD_WISP, TIERS, FULL_BONUS, OVERFLOW_RATE, BASE, MAP, ARENA, EVENTS, EVENT_WINDOWS, STAGES, bagMax, tierOf } from './data.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// ---------- Effets : particules, secousses, sons, chiffres ----------
function burst(world, x, y, n, colors, speed = 120, size = 2, grav = 0, life = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), sp = rnd(speed * 0.3, speed);
    world.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - grav * 0.3, grav, life: rnd(life * 0.5, life), max: life,
      color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() < 0.3 ? size + 1 : size });
  }
}
function shake(world, amount) { world.shake = Math.min(14, Math.max(world.shake, amount)); }
function sfx(world, name, opt) { world.sfx.push({ name, ...opt }); }
// Un son n'est utile que si l'action est à l'écran (ou presque).
function onScreen(world, x, y, m = 80) {
  return x > world.cam.x - m && x < world.cam.x + world.w + m && y > world.cam.y - m && y < world.cam.y + world.h + m;
}

// w, h : taille de l'écran. mapW, mapH : taille de la région. cam : coin haut-gauche de l'écran dans la région.
export function createWorld(w, h) {
  return {
    w, h, mapW: MAP.w, mapH: MAP.h, cam: { x: (MAP.w - w) / 2, y: (MAP.h - h) / 2 },
    phase: 'idle',      // idle | expedition | tear | done
    mode: 'map',        // map (la région) | arena (l'antre du boss)
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [], hazards: [],
    shake: 0, sfx: [], combo: { n: 0, t: 0 },
    pointer: { x: -999, y: -999, inside: false, down: false, usedForDrop: false },
    holdKey: false,
    t: 0,
    events: [],         // messages pour l'interface (bannières)
  };
}

export function bagPos(world) { return { x: world.mapW / 2, y: world.mapH / 2 }; }

// Position du gant dans la région.
export function pointerWorld(world) { const p = world.pointer; return { x: p.x + world.cam.x, y: p.y + world.cam.y }; }

export function clampCam(world) {
  const c = world.cam;
  c.x = Math.max(0, Math.min(world.mapW - world.w, c.x));
  c.y = Math.max(0, Math.min(world.mapH - world.h, c.y));
  if (world.mapW < world.w) c.x = (world.mapW - world.w) / 2;
  if (world.mapH < world.h) c.y = (world.mapH - world.h) / 2;
}
export function moveCam(world, dx, dy) { world.cam.x += dx; world.cam.y += dy; clampCam(world); }
export function centerCam(world, x, y) { world.cam.x = x - world.w / 2; world.cam.y = y - world.h / 2; clampCam(world); }

// lair : { open: portail ouvert ?, first: jamais vaincu ? }
export function startExpedition(world, stats, zone, lair = {}, stage = STAGES[0]) {
  // l'étape modifie la zone (PV, butin) et les stats (feux follets dorés) pour cette expédition
  const m = stage.mods || {};
  zone = { ...zone, stage: stage.name, hpMult: zone.hpMult * (m.hp || 1), valueMult: zone.valueMult * (m.value || 1) * (stats.valueMult || 1) };
  stats = { ...stats, goldChance: stats.goldChance * (m.gold || 1) };
  world.stage = stage;
  Object.assign(world, {
    phase: 'expedition', mode: 'map', mapW: MAP.w, mapH: MAP.h,
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [], hazards: [], shake: 0,
    stats, zone,
    run: {
      t: 0, duration: stats.duration, spawnT: 0, bag: 0, full: false, overflow: 0,
      kills: 0, toDrop: { ...stats.heroes }, sel: 'archer', attraction: stats.attraction, boss: null, bossKilled: false, golds: 0,
      tearT: 0, tearTotal: 0, tearGot: 0, shake: 0, mult: 1, tier: 0,
      lair: { open: !!lair.open, first: !!lair.first, done: false, got: 0, only: false }, arena: null,
      happenings: planEvents(stats), eventsGot: 0,
    },
  });
  const b = bagPos(world);
  centerCam(world, b.x, b.y + 40);
  for (let i = 0; i < BASE.startPacks; i++) spawnPack(world, true);
  world.events.push({ kind: 'banner', title: stage.name, sub: stage.blurb });
}

// ---------- Événements d'expédition ----------
// Les types possibles se débloquent dans l'arbre (la pluie de pièces est là dès le début).
function planEvents(stats) {
  const pool = (stats.events || Object.keys(EVENTS)).slice().sort(() => Math.random() - 0.5);
  const n = Math.min(stats.eventCount || EVENT_WINDOWS.length, EVENT_WINDOWS.length);
  const windows = n === 1 ? [[0.3, 0.65]] : EVENT_WINDOWS;
  return windows.map(([a, b], i) => ({ kind: pool[i % pool.length], at: stats.duration * rnd(a, b), done: false }));
}
// Valeur d'un événement : une part de la capacité du sac, pour rester intéressant à tout moment du jeu.
function eventValue(world, kind) {
  const s = world.stats;
  return Math.max(12, bagMax(s) * EVENTS[kind].share * world.zone.valueMult) * (s.eventMult || 1) * (kind === 'vein' ? s.veinMult || 1 : 1);
}
// Un endroit dégagé, visible, pas trop près du sac.
function eventSpot(world) {
  const b = bagPos(world);
  for (let k = 0; k < 20; k++) {
    const x = world.cam.x + rnd(0.2, 0.8) * world.w, y = world.cam.y + rnd(0.25, 0.75) * world.h;
    if ((x - b.x) ** 2 + (y - b.y) ** 2 > 200 * 200) return { x: Math.max(60, Math.min(world.mapW - 60, x)), y: Math.max(60, Math.min(world.mapH - 60, y)) };
  }
  return { x: b.x + 260, y: b.y };
}
function foeHp(world, type) { return ENEMIES[type].hp * Math.max(1, world.stats.damage.archer / HEROES.archer.damage) * world.zone.hpMult; }
function startEvent(world, ev) {
  const def = EVENTS[ev.kind], p = eventSpot(world), r = world.run;
  ev.done = true;
  world.events.push({ kind: 'banner', title: def.title, sub: def.sub });
  sfx(world, 'portal');
  const value = eventValue(world, ev.kind);
  if (ev.kind === 'rain') {
    const life = def.life * (world.stats.rainLife || 1);
    r.rain = { t: life, left: value, rate: value / life };
    return;
  }
  const e = spawnAt(world, ev.kind, p.x, p.y);
  e.hp = e.max = foeHp(world, ev.kind);
  e.value = value; e.total = value; e.life = def.life; e.event = true;
  if (ev.kind === 'goblin') { e.a = rnd(0, Math.PI * 2); e.value *= 1; }
  world.fx.push({ kind: 'ring', x: p.x, y: p.y, r0: 10, r1: 90, t: 0.7, life: 0.7, color: '#ffd246' });
}
// Pièces qui tombent du ciel autour de l'écran.
function dropCoin(world, x, y, kind, value, z = 0) {
  world.coins.push({ x, y, vx: rnd(-20, 20), vy: rnd(-20, 20), kind, value, life: world.stats.coinLife, max: world.stats.coinLife,
    fly: false, sp: 0, z, vz: z ? -rnd(100, 260) : rnd(160, 300), spin: rnd(0, 6), air: !!z });
}
function updateEvents(world, dt) {
  const r = world.run;
  for (const ev of r.happenings) if (!ev.done && r.t >= ev.at) startEvent(world, ev);
  if (r.rain) {
    const rain = r.rain;
    rain.t -= dt;
    let budget = rain.rate * dt;
    while (budget > 0 && rain.left > 0) {
      const big = rain.left > 30 && Math.random() < 0.08, v = Math.min(rain.left, big ? 25 : rain.rate / 12 + 1);
      dropCoin(world, world.cam.x + rnd(0.05, 0.95) * world.w, world.cam.y + rnd(0.1, 0.9) * world.h, v >= 25 ? 'gem' : v >= 5 ? 'bar' : 'coin', v, rnd(250, 420));
      rain.left -= v; budget -= v;
    }
    if (rain.t <= 0 || rain.left <= 0) r.rain = null;
  }
  for (const e of world.enemies) {
    if (!e.event || e.dead) continue;
    e.life -= dt;
    if (e.life <= 0) {
      e.dead = true;
      burst(world, e.x, e.y, 18, ['#e8e0d0', '#b8b0a0', '#ffffff'], 140, 2, 0, 0.6);
      const msg = e.type === 'goblin' ? 'Le gobelin s\'est enfui…' : e.type === 'vein' ? 'Le filon s\'est tari' : 'La mimique s\'est enfuie…';
      world.texts.push({ x: e.x, y: e.y - 30, text: msg, color: '#e8e0d0', size: 15, life: 1.6 });
    }
  }
}

// Combat direct depuis l'Atelier : on arrive dans l'antre avec tous ses héros à larguer.
export function startLair(world, stats, zone, lair = {}) {
  startExpedition(world, stats, zone, { ...lair, open: true });
  world.events.length = 0;
  world.run.lair.only = true;
  enterArena(world);
}

// ---------- Antre du boss ----------
export function portalPos(world) {
  const b = world.zone.boss;
  return { x: b.at[0] * MAP.w, y: b.at[1] * MAP.h, r: 56 };
}
export function canEnterPortal(world, x, y) {
  const r = world.run;
  if (world.phase !== 'expedition' || world.mode !== 'map' || !r || !r.lair.open || r.lair.done) return false;
  const p = portalPos(world);
  return (x - p.x) ** 2 + (y - p.y) ** 2 < p.r * p.r;
}

export function enterArena(world) {
  const r = world.run;
  if (!r.lair.only) {
    // la carte est mise de côté telle quelle : on la retrouve en sortant
    r.stash = { enemies: world.enemies, coins: world.coins, cam: { ...world.cam } };
  }
  const heroes = world.heroes;
  // la salle s'adapte à l'écran (sans dépasser la taille prévue) pour qu'on voie tout le combat
  const aw = Math.min(ARENA.w, Math.max(world.w, 640)), ah = Math.min(ARENA.h, Math.max(world.h, 560));
  Object.assign(world, { mode: 'arena', mapW: aw, mapH: ah, enemies: [], coins: [], arrows: [], hazards: [] });
  // les héros déjà largués entrent par le bas de la salle
  heroes.forEach((u, i) => {
    const a = Math.PI * (0.15 + 0.7 * (i + 0.5) / heroes.length);
    u.x = aw / 2 + Math.cos(a) * aw * 0.22 * (i % 2 ? 1 : 0.8); u.y = ah * 0.5 + Math.sin(a) * ah * 0.32;
    u.drop = 0.6 + (i % 4) * 0.1; u.stun = 0; u.cd = rnd(0.2, 0.8);
  });
  const b = world.zone.boss;
  r.arena = { t: 0, duration: ARENA.duration, fireT: 2.2, summoned: 0, loot: 0, won: false, leaving: 0 };
  const home = { x: aw / 2, y: ah * 0.4, r: Math.min(aw, ah) * 0.26 };
  const e = {
    type: 'boss', boss: true, def: { ...b, color: '#ff7a3c', core: '#fff1c2' }, x: home.x, y: home.y, r: b.radius,
    hp: b.hp * world.zone.hpMult, max: b.hp * world.zone.hpMult, value: b.value * world.zone.valueMult * (r.lair.first ? ARENA.firstBonus : 1),
    a: rnd(0, 6), ph: rnd(0, 6), age: 0, hit: 0, dead: false, slow: 0, home,
  };
  world.enemies.push(e);
  r.boss = e;
  centerCam(world, aw / 2, ah / 2);
  world.fx.push({ kind: 'ring', x: home.x, y: home.y, r0: 10, r1: 300, t: 0.7, life: 0.7, color: '#ff9a3c' });
  shake(world, 8); sfx(world, 'portal');
  world.events.push({ kind: 'arena', on: true });
  world.events.push({ kind: 'banner', title: b.lair, sub: r.lair.first ? `${b.name} : butin ×${ARENA.firstBonus} la première fois !` : `${b.name} t'attend` });
}

function exitArena(world) {
  const r = world.run, a = r.arena;
  // pièces restées au sol : perdues. Pièces en vol : comptées.
  for (const c of world.coins) if (c.fly) credit(world, c.value);
  r.lair.done = true;
  if (r.lair.only) { world.coins = []; world.phase = 'done'; world.events.push({ kind: 'done' }); return; }
  const st = r.stash, p = portalPos(world);
  Object.assign(world, { mode: 'map', mapW: MAP.w, mapH: MAP.h, enemies: st.enemies, coins: st.coins, arrows: [], hazards: [] });
  r.stash = null;
  world.heroes.forEach((u, i) => {
    const an = i / Math.max(1, world.heroes.length) * Math.PI * 2;
    u.x = p.x + Math.cos(an) * 90; u.y = p.y + 40 + Math.sin(an) * 60; u.drop = 0.5; u.stun = 0;
  });
  centerCam(world, p.x, p.y + 60);
  sfx(world, 'portal');
  world.events.push({ kind: 'arena', on: false });
  world.events.push({ kind: 'banner', title: 'Retour à la ' + world.zone.name.toLowerCase(), sub: a.won ? 'Le portail se referme derrière toi' : 'Le Brasier t\'a repoussé…' });
}

function updateArena(world, dt) {
  const r = world.run, a = r.arena, bo = r.boss, b = world.zone.boss;
  updateHeroes(world, dt);
  updateArrows(world, dt);
  updateHazards(world, dt);
  if (a.won) {
    a.loot -= dt;
    if (a.loot <= 0 || (world.coins.length === 0 && a.loot < ARENA.lootTime - 1.5)) exitArena(world);
    return;
  }
  a.t += dt;
  if (a.t >= a.duration) {
    world.events.push({ kind: 'banner', title: 'Temps écoulé', sub: `${b.name} se rallume…` });
    exitArena(world);
    return;
  }
  // invocations : à 66 % et 33 % de vie, une couronne de feux follets
  const ratio = bo.hp / bo.max;
  if (a.summoned < b.summonAt.length && ratio <= b.summonAt[a.summoned]) {
    a.summoned++;
    for (let i = 0; i < b.summonN; i++) {
      const an = i / b.summonN * Math.PI * 2;
      spawnAt(world, 'wisp', bo.x + Math.cos(an) * 110, bo.y + Math.sin(an) * 80);
    }
    shake(world, 6); sfx(world, 'warn');
    world.events.push({ kind: 'banner', title: 'Le Brasier s\'embrase !', sub: 'Il appelle ses feux follets' });
  }
  // cercles de feu sur les héros : ils sont étourdis s'ils restent dedans
  a.fireT -= dt * (1 + a.summoned * 0.35);
  if (a.fireT <= 0) {
    a.fireT = b.fireEvery;
    if (bo && !bo.dead) bo.atk = 0.7;
    const targets = world.heroes.filter(u => u.drop <= 0).sort(() => Math.random() - 0.5).slice(0, 1 + a.summoned);
    if (!targets.length) targets.push({ x: rnd(150, world.mapW - 150), y: rnd(150, world.mapH - 120) });
    for (const u of targets) world.hazards.push({ x: u.x + rnd(-14, 14), y: u.y + 8 + rnd(-10, 10), r: b.fireRadius, t: b.fireWarn, warn: b.fireWarn });
    sfx(world, 'warn');
  }
}

function updateHazards(world, dt) {
  const b = world.zone.boss;
  for (const z of world.hazards) {
    z.t -= dt;
    if (z.t > 0) continue;
    z.done = true;
    for (const u of world.heroes) {
      if (u.drop > 0 || (u.x - z.x) ** 2 + (u.y + 8 - z.y) ** 2 > z.r * z.r) continue;
      u.stun = b.stun;
      const dx = u.x - z.x, dy = u.y - z.y, d = Math.hypot(dx, dy) || 1;
      u.x += dx / d * 26; u.y += dy / d * 18;
      world.texts.push({ x: u.x, y: u.y - 40, text: 'étourdi', color: '#ffb347', size: 13, life: 0.9 });
    }
    burst(world, z.x, z.y, 26, ['#ff5a2a', '#ffb040', '#fff0b0', '#24161e'], 200, 2, 0, 0.6);
    world.fx.push({ kind: 'ring', x: z.x, y: z.y, r0: z.r * 0.3, r1: z.r * 1.3, t: 0.35, life: 0.35, color: '#ff9a3c' });
    shake(world, 5); sfx(world, 'fire');
  }
  world.hazards = world.hazards.filter(z => !z.done);
}

function spawnAt(world, type, x, y) {
  const def = ENEMIES[type];
  x = Math.max(40, Math.min(world.mapW - 40, x)); y = Math.max(40, Math.min(world.mapH - 40, y));
  const e = { type, def, x, y, r: def.radius, gold: false, slow: 0, hp: def.hp * world.zone.hpMult, max: def.hp * world.zone.hpMult,
    value: def.value * world.zone.valueMult, a: rnd(0, Math.PI * 2), ph: rnd(0, 6), age: 0, hit: 0, dead: false };
  world.enemies.push(e);
  world.fx.push({ kind: 'ring', x, y, r0: 2, r1: def.radius * 1.8, t: 0.4, life: 0.4, color: def.color });
  return e;
}

function pickEnemyType(zone) {
  const entries = Object.entries(zone.spawn);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[0][0];
}

// Les élémentaires apparaissent partout dans la région, jamais collés au sac,
// et plus souvent autour des héros pour qu'ils aient de quoi faire.
// Hordes : les élémentaires arrivent en paquets qui se déplacent ensemble.
const PACK_SIZE = { wisp: [10, 18], golem: [3, 6], wind: [6, 10] };
function spawnPack(world, anywhere = false) {
  const type = pickEnemyType(world.zone);
  const { mapW, mapH } = world, bag = bagPos(world);
  let x, y;
  for (let k = 0; k < 14; k++) {
    if (!anywhere && world.heroes.length && Math.random() < 0.8) {
      const u = world.heroes[Math.floor(Math.random() * world.heroes.length)];
      const a = rnd(0, Math.PI * 2), d = rnd(220, 420);
      x = u.x + Math.cos(a) * d; y = u.y + Math.sin(a) * d;
    } else { x = rnd(120, mapW - 120); y = rnd(120, mapH - 120); }
    x = Math.max(100, Math.min(mapW - 100, x)); y = Math.max(100, Math.min(mapH - 100, y));
    if ((x - bag.x) ** 2 + (y - bag.y) ** 2 > 260 * 260) break;
  }
  const [lo, hi] = PACK_SIZE[type] || [6, 10];
  const n = Math.round(rnd(lo, hi) * (world.stats?.packMult || 1));
  const pack = { x, y, a: rnd(0, Math.PI * 2), n: 0 };
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * (24 + n * 3.5);
    const e = spawnEnemy(world, false, type, x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d);
    e.pack = pack;
  }
  world.fx.push({ kind: 'ring', x, y, r0: 10, r1: 40 + n * 5, t: 0.5, life: 0.5, color: ENEMIES[type].color });
}

function spawnEnemy(world, anywhere = false, forceType = null, px = null, py = null) {
  const type = forceType || pickEnemyType(world.zone);
  const def = ENEMIES[type];
  const { mapW, mapH } = world;
  const bag = bagPos(world);
  let x = px, y = py;
  for (let k = 0; px === null && k < 12; k++) {
    if (!anywhere && world.heroes.length && Math.random() < 0.85) {
      const u = world.heroes[Math.floor(Math.random() * world.heroes.length)];
      const a = rnd(0, Math.PI * 2), d = rnd(140, 340);
      x = u.x + Math.cos(a) * d; y = u.y + Math.sin(a) * d;
    } else { x = rnd(60, mapW - 60); y = rnd(60, mapH - 60); }
    x = Math.max(40, Math.min(mapW - 40, x)); y = Math.max(40, Math.min(mapH - 40, y));
    if ((x - bag.x) ** 2 + (y - bag.y) ** 2 > 190 * 190) break;
  }
  const gold = type === 'wisp' && Math.random() < (world.stats?.goldChance || 0);
  const e = {
    type, def, x, y, r: def.radius, gold, slow: 0,
    hp: def.hp * world.zone.hpMult, max: def.hp * world.zone.hpMult,
    value: def.value * world.zone.valueMult * (gold ? GOLD_WISP.value : 1),
    a: rnd(0, Math.PI * 2),
    ph: rnd(0, 6), age: 0, hit: 0, dead: false,
  };
  if (gold) { e.hp *= GOLD_WISP.hp; e.max = e.hp; if (world.run) world.run.golds++; }
  world.enemies.push(e);
  if (px === null || gold) world.fx.push({ kind: 'ring', x, y, r0: 2, r1: def.radius * 1.8, t: 0.4, life: 0.4, color: gold ? GOLD_WISP.color : def.color });
  if (gold && world.phase === 'expedition') world.texts.push({ x, y: y - 26, text: 'Feu follet doré !', color: GOLD_WISP.color, size: 15, life: 1.6 });
  return e;
}

export function canDrop(world) {
  return world.phase === 'expedition' && world.run.toDrop[world.run.sel] > 0;
}
export function selectHero(world, type) {
  if (world.run && world.run.toDrop[type] > 0) world.run.sel = type;
}

export function dropHero(world, x, y) {
  if (!canDrop(world)) return false;
  const r = world.run, type = r.sel;
  world.heroes.push({ type, x, y, cd: rnd(0, 0.3), drop: 1, face: 1, bob: rnd(0, 6), boost: 0 });
  r.toDrop[type]--;
  if (r.toDrop[type] <= 0) { const next = HERO_ORDER.find(k => r.toDrop[k] > 0); if (next) r.sel = next; }
  return true;
}

function nearestEnemy(world, p, zone = null) {
  let best = null, bd = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (zone && (e.x - zone.x) ** 2 + (e.y - zone.y) ** 2 > FOCUS_R * FOCUS_R) continue;
    const d = d2(p, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damage(world, e, amount, slow, from) {
  if (e.dead) return;
  if (e.boss) amount *= world.stats.bossMult;
  if (slow) e.slow = Math.max(e.slow, slow);
  const crit = Math.random() < (world.stats.critChance || 0.12);
  if (crit) amount *= world.stats.critMult || 2;
  if (e.def.dodge && Math.random() < e.def.dodge) {
    world.texts.push({ x: e.x, y: e.y - e.r - 6, text: 'esquive', color: '#d6f2ff', size: 12, life: 0.7 });
    return;
  }
  e.hp -= amount; e.hit = 0.12;
  if (e.type === 'vein') {
    // chaque coup fait jaillir une part de l'or, proportionnelle aux dégâts
    const v = Math.min(e.value, e.total * Math.min(amount, e.hp + amount) / e.max);
    e.value -= v;
    for (const pc of splitLoot(v, Math.max(1, Math.ceil(v / 4)), 2, 4)) {
      const a = rnd(0, Math.PI * 2), sp = rnd(40, 110);
      world.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: pc.kind, value: pc.value,
        life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: rnd(200, 320), spin: rnd(0, 6) });
    }
    burst(world, e.x, e.y - 6, 4, ['#ffd246', '#fff3a8', '#8c8f86'], 90, 2, 0, 0.4);
  }
  if (e.type === 'mimic' && !e.awake) {
    e.awake = true; e.life += 6;
    world.events.push({ kind: 'banner', title: 'C\'est une mimique !', sub: 'Elle mord : abats-la pour son trésor' });
    shake(world, 6); sfx(world, 'warn');
  }
  const shown = Math.round(amount * 10) / 10;
  world.texts.push({ x: e.x + rnd(-8, 8), y: e.y - e.r - 4, text: (shown >= 10 ? Math.round(shown) : String(shown).replace('.', ',')) + (crit ? ' !' : ''),
    color: crit ? '#ffd246' : '#ffffff', size: crit ? 20 : 14, life: crit ? 0.9 : 0.6, dmg: true, vy: -70, pop: 0 });
  if (from && !e.boss && !e.def.still) {
    const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1, k = (e.type === 'golem' ? 60 : 140) * (crit ? 1.6 : 1);
    e.kx = (e.kx || 0) + dx / d * k; e.ky = (e.ky || 0) + dy / d * k;
  }
  if (onScreen(world, e.x, e.y)) { sfx(world, 'hit', { crit }); if (crit || e.boss) shake(world, e.boss ? 3 : 2); }
  if (e.hp <= 0) killEnemy(world, e);
}

function killEnemy(world, e) {
  e.dead = true;
  world.run.kills++;
  if (e.event) world.run.eventsGot++;
  const pal = { vein: ['#ffd246', '#8c8f86', '#fff3a8'], goblin: ['#6fae4c', '#ffd246', '#4a7d34'], mimic: ['#9a6238', '#ffd246', '#8a1e2a'], wisp: ['#ff9a3c', '#ffe682', '#e65032'], golem: ['#be7850', '#8c5238', '#6a3a24'], wind: ['#e6f7fb', '#8ed2e6', '#ffffff'] }[e.type] || ['#ff5a2a', '#ffb040', '#fff0b0'];
  burst(world, e.x, e.y, e.boss ? 70 : e.gold ? 30 : 14, e.gold ? ['#ffd246', '#fff096', '#ffffff'] : pal, e.boss ? 320 : 150, 2, 0, e.boss ? 1.1 : 0.55);
  if (onScreen(world, e.x, e.y)) { sfx(world, e.boss ? 'boss' : e.gold ? 'gold' : 'pop'); shake(world, e.boss ? 14 : e.type === 'golem' ? 3 : 1.5); }
  const n = e.boss ? 60 : Math.min(e.gold ? 12 : 6, 1 + Math.ceil(Math.log2(1 + e.value / 3)));
  if (e.boss) {
    const r = world.run;
    r.bossKilled = true;
    if (r.arena) { r.arena.won = true; r.arena.loot = ARENA.lootTime; r.attraction = world.stats.attraction; world.hazards = []; for (const m of world.enemies) if (!m.boss && !m.dead) { m.dead = true; burst(world, m.x, m.y, 8, pal, 120, 2, 0, 0.4); } }
    world.events.push({ kind: 'boss', name: e.def.name });
    world.events.push({ kind: 'banner', title: e.def.name + ' vaincu !', sub: 'Rafle le butin avant que le portail ne se referme' });
    world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 5, t: 0.8, life: 0.8, color: '#ffd246' });
  }
  if (e.event && e.value > 0) {
    world.texts.push({ x: e.x, y: e.y - 34, text: { vein: 'Filon épuisé !', goblin: 'Gobelin attrapé !', mimic: 'Trésor !' }[e.type], color: '#ffd246', size: 18, life: 1.4 });
    shake(world, 5);
  }
  const pieces = e.boss ? splitLoot(e.value, n, 3, 30) : e.event ? (e.value > 0.5 ? splitLoot(e.value, 14, 2, 14) : []) : e.gold ? splitLoot(e.value, n, 1, 8) : splitLoot(e.value, n, 3, 12);
  for (const pc of pieces) {
    const a = rnd(0, Math.PI * 2), s = e.boss ? rnd(50, 190) : rnd(30, 110);
    world.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: pc.kind,
      value: pc.value, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: rnd(160, 300), spin: rnd(0, 6) });
  }
  world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 2.2, t: 0.35, life: 0.35, color: e.def.color });
}

// Clic maintenu (ou Espace) : pendant l'expédition c'est le Focus (les héros ne visent que la zone
// sous le gant) ; pendant la Déchirure c'est l'Attraction (gant deux fois plus large).
// Les deux puisent dans la même jauge, qui se recharge en BASE.focusRecovery secondes.
function holding(world) {
  const r = world.run;
  if (!r || (world.phase !== 'expedition' && world.phase !== 'tear')) return false;
  const p = world.pointer;
  return r.attraction > 0 && !r.focusLock && ((p.down && !p.usedForDrop) || world.holdKey);
}
export function focusActive(world) { return world.phase === 'expedition' && holding(world); }
// Butin : on découpe une valeur en couronnes (100), gemmes (25), lingots (5) et pièces.
// k : on ne prend une grosse pièce que s'il reste au moins k fois sa valeur (k grand = plus de pièces).
export const LOOT_VALUE = { crown: 100, gem: 25, bar: 5, coin: 1 };
function splitLoot(value, n, k, maxCoins) {
  if (value / n < 4 && k > 1) return Array.from({ length: n }, () => ({ kind: 'coin', value: value / n }));
  const out = []; let rem = value;
  for (const kind of ['crown', 'gem', 'bar']) {
    const d = LOOT_VALUE[kind];
    while (rem >= d * k && out.length < 60) { out.push({ kind, value: d }); rem -= d; }
  }
  const c = Math.max(rem > 0.01 ? 1 : 0, Math.min(maxCoins, Math.ceil(rem)));
  for (let i = 0; i < c; i++) out.push({ kind: 'coin', value: rem / c });
  return out;
}

export function attractionActive(world) { return world.phase === 'tear' && holding(world); }
export const FOCUS_R = 150;

export function gloveRadius(world) {
  return world.stats.gloveRadius * (attractionActive(world) ? 2 : 1);
}

function addToBag(world, value) {
  const r = world.run, s = world.stats;
  const max = bagMax(s);
  const before = tierOf(r.bag, s);
  const into = Math.min(Math.max(0, max - r.bag), value);
  r.bag += into;
  if (value - into > 0) { const v = (value - into) * OVERFLOW_RATE; r.overflow += v; world.events.push({ kind: 'coins', value: v }); }
  const after = tierOf(r.bag, s);
  if (after > before) { shake(world, 6); sfx(world, 'tier'); burst(world, world.mapW / 2, world.mapH / 2 - 30, 40, [TIERS[after].glow, TIERS[after].color, '#ffffff'], 220, 2, 0, 0.9); }
  if (after > before) world.events.push({ kind: 'banner', title: TIERS[after].name + ' !', sub: `Déchirure ×${String(TIERS[after].mult).replace('.', ',')}` });
  if (r.bag >= max && !r.full) {
    r.full = true;
    world.events.push({ kind: 'banner', title: 'Sac plein !', sub: 'Bonus +25 % à la Déchirure. Le surplus déborde : seule 1 pièce sur 10 est sauvée.' });
  }
}

export function update(world, dt) {
  world.t += dt;
  for (const f of world.fx) f.t -= dt;
  world.fx = world.fx.filter(f => f.t > 0);
  for (const t of world.texts) { t.life -= dt; if (t.dmg) { t.y += t.vy * dt; t.vy *= Math.pow(0.05, dt); t.pop += dt; } else t.y -= 28 * dt; }
  for (const q of world.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; const f = Math.pow(0.08, dt); q.vx *= f; q.vy *= f; }
  world.particles = world.particles.filter(q => q.life > 0);
  if (world.particles.length > 600) world.particles.splice(0, world.particles.length - 600);
  world.shake = Math.max(0, world.shake - dt * 30);
  world.combo.t -= dt;
  world.texts = world.texts.filter(t => t.life > 0);

  updateEnemies(world, dt);
  if (world.phase === 'idle') {
    if (world.enemies.length < 40) spawnPack(world, true);
    return;
  }
  if (world.phase === 'done') return;
  const r = world.run;

  if (world.phase === 'expedition' && world.mode === 'arena') {
    updateArena(world, dt);
  } else if (world.phase === 'expedition') {
    r.t += dt;
    r.spawnT -= dt;
    if (r.spawnT <= 0 && world.enemies.length < world.stats.maxEnemies) {
      r.spawnT = world.stats.spawnEvery * rnd(0.6, 1.4);
      spawnPack(world);
    }
    updateEvents(world, dt);
    updateHeroes(world, dt);
    updateArrows(world, dt);
    if (r.t >= r.duration) { r.t = r.duration; startTear(world); }
  } else if (world.phase === 'tear') {
    const b = bagPos(world), k = Math.min(1, dt * 4);
    world.cam.x += (b.x - world.w / 2 - world.cam.x) * k; world.cam.y += (b.y - world.h / 2 - world.cam.y) * k; clampCam(world);
    if (r.shake > 0) {
      r.shake -= dt;
      if (r.shake <= 0) burstBag(world);
    } else {
      r.tearT -= dt;
      if (r.waves && r.waves.length) { r.waveT += dt; tearWave(world); }
      const anyFlying = world.coins.some(c => c.fly) || (r.waves && r.waves.length > 0);
      if ((r.tearT <= 0 && !anyFlying) || r.tearT < -1.5 || (world.coins.length === 0 && !anyFlying && r.tearT < r.tearDur - 0.5)) endTear(world);
    }
  }
  if (holding(world)) { r.attraction = Math.max(0, r.attraction - dt); if (r.attraction <= 0) r.focusLock = true; }
  else {
    r.attraction = Math.min(world.stats.attraction, r.attraction + dt * world.stats.attraction / BASE.focusRecovery);
    if (r.attraction >= world.stats.attraction) r.focusLock = false;
  }
  updateCoins(world, dt);
}

function updateEnemies(world, dt) {
  const w = world.mapW, h = world.mapH;
  // centre de chaque horde, et sa direction qui tourne doucement
  const packs = new Set();
  for (const e of world.enemies) if (e.pack) { const p = e.pack; if (!packs.has(p)) { packs.add(p); p.sx = 0; p.sy = 0; p.n = 0; } p.sx += e.x; p.sy += e.y; p.n++; }
  for (const p of packs) {
    p.x = p.sx / p.n; p.y = p.sy / p.n; p.a += rnd(-1, 1) * dt * 0.8;
    if (p.x < 160) p.a = rnd(-0.6, 0.6); else if (p.x > w - 160) p.a = Math.PI + rnd(-0.6, 0.6);
    if (p.y < 160) p.a = Math.PI / 2 + rnd(-0.6, 0.6); else if (p.y > h - 160) p.a = -Math.PI / 2 + rnd(-0.6, 0.6);
  }
  separate(world);
  for (const e of world.enemies) {
    e.ph += dt * 3; e.age += dt; e.hit -= dt; e.slow = Math.max(0, e.slow - dt);
    if (e.atk > 0) e.atk -= dt;
    if (e.pack && e.pack.n > 1) {
      // cohésion vers le centre + cap commun
      const p = e.pack, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, pull = Math.max(0, Math.min(1, (d - 20 - p.n * 3) / (40 + p.n * 4)));
      const tx = Math.cos(p.a) + dx / d * pull * 1.5, ty = Math.sin(p.a) + dy / d * pull * 1.5;
      e.a = Math.atan2(ty, tx) + rnd(-0.4, 0.4);
    } else e.a += rnd(-1, 1) * dt * 1.2;
    if (e.event && moveEventFoe(world, e, dt)) continue;
    let sp = e.def.speed * (0.55 + 0.45 * Math.max(0, Math.sin(e.ph))) * ((world.stage && world.stage.mods.speed) || 1);
    if (e.gold) sp *= GOLD_WISP.speed;
    if (e.slow > 0) sp *= 1 - HEROES.mage.slow;
    if (e.home && (e.x - e.home.x) ** 2 + (e.y - e.home.y) ** 2 > e.home.r * e.home.r) e.a = Math.atan2(e.home.y - e.y, e.home.x - e.x) + rnd(-0.5, 0.5);
    e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt;
    if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(0.002, dt); e.kx *= f; e.ky *= f; }
    const m = e.r + 10;
    if (e.age > 2 && !e.pack) {
      if (e.x < m) e.a = rnd(-0.8, 0.8); else if (e.x > w - m) e.a = Math.PI + rnd(-0.8, 0.8);
      if (e.y < m) e.a = Math.PI / 2 + rnd(-0.8, 0.8); else if (e.y > h - m) e.a = -Math.PI / 2 + rnd(-0.8, 0.8);
    }
  }
  world.enemies = world.enemies.filter(e => !e.dead);
}

// Créatures d'événement : le filon ne bouge pas, le gobelin fuit les héros, la mimique réveillée les poursuit et mord.
function moveEventFoe(world, e, dt) {
  if (e.type === 'vein' || (e.type === 'mimic' && !e.awake)) { e.kx = e.ky = 0; return true; }
  let near = null, nd = Infinity;
  for (const u of world.heroes) { if (u.drop > 0) continue; const d = d2(u, e); if (d < nd) { nd = d; near = u; } }
  const slow = e.slow > 0 ? 1 - HEROES.mage.slow : 1;
  if (e.type === 'goblin') {
    if (near && nd < 260 * 260) e.a = Math.atan2(e.y - near.y, e.x - near.x) + Math.sin(e.age * 3) * 0.6;
    else e.a += rnd(-1, 1) * dt * 2;
    const sp = e.def.speed * slow * (world.stats.goblinSpeed || 1);
    e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt;
  } else if (e.type === 'mimic' && near) {
    const d = Math.sqrt(nd) || 1, sp = 95 * slow;
    if (d > 22) { e.x += (near.x - e.x) / d * sp * dt; e.y += (near.y - e.y) / d * sp * dt; }
    e.bite = (e.bite || 0) - dt;
    if (d < 30 && e.bite <= 0) {
      e.bite = 1.4; near.stun = Math.max(near.stun || 0, 1.1);
      world.texts.push({ x: near.x, y: near.y - 34, text: 'Croc !', color: '#ff6a5a', size: 16, life: 0.8 });
      sfx(world, 'hit', { crit: true }); shake(world, 3);
    }
  }
  if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(0.002, dt); e.kx *= f; e.ky *= f; }
  e.x = Math.max(30, Math.min(world.mapW - 30, e.x)); e.y = Math.max(30, Math.min(world.mapH - 30, e.y));
  return true;
}

// Les membres d'une horde se poussent un peu pour ne pas se superposer (grille de cases).
function separate(world) {
  const C = 28, grid = new Map();
  for (const e of world.enemies) { if (e.boss) continue; const k = Math.floor(e.x / C) + ',' + Math.floor(e.y / C); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(e); }
  for (const e of world.enemies) {
    if (e.boss) continue;
    const cx = Math.floor(e.x / C), cy = Math.floor(e.y / C);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = grid.get((cx + i) + ',' + (cy + j)); if (!l) continue;
      for (const o of l) {
        if (o === e) continue;
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.95, d2v = dx * dx + dy * dy;
        if (d2v >= min * min || d2v === 0) continue;
        const d = Math.sqrt(d2v), push = (min - d) * 0.5;
        e.x += dx / d * push; e.y += dy / d * push;
      }
    }
  }
}

function updateHeroes(world, dt) {
  const s = world.stats;
  const bards = world.heroes.filter(u => u.type === 'bard' && u.drop <= 0);
  const focus = focusActive(world), fp = focus ? pointerWorld(world) : null;
  for (const u of world.heroes) {
    if (u.drop > 0) {
      u.drop -= dt * 3;
      if (u.drop <= 0) {
        u.drop = 0; world.fx.push({ kind: 'ring', x: u.x, y: u.y + 10, r0: 6, r1: 34, t: 0.4, life: 0.4, color: '#fff6dc' });
        burst(world, u.x, u.y + 10, 12, ['#e8d8b0', '#c9b48e', '#ffffff'], 110, 2, 0, 0.45);
        shake(world, 3); sfx(world, 'land');
      }
      continue;
    }
    if (u.stun > 0) { u.stun -= dt; u.moving = false; u.recoil = 0; continue; }
    const def = HEROES[u.type];
    // chanson du barde : les autres héros à portée agissent plus vite
    u.boost = bards.some(b => b !== u && d2(b, u) < s.bardAura * s.bardAura) ? s.bardBoost : 0;
    u.bob += dt * 3; u.cd -= dt * (1 + u.boost);
    u.recoil = Math.max(0, (u.recoil || 0) - dt * 6);
    if (u.boost > 0 && Math.random() < dt * 0.8) world.texts.push({ x: u.x + rnd(-8, 8), y: u.y - 34, text: '♪', color: '#ffe68a', size: 14, life: 0.7 });
    let t;
    if (focus) {
      t = nearestEnemy(world, u, fp);
      if (!t) {
        // rien dans la zone : on y court
        const dx = fp.x - u.x, dy = fp.y - u.y, dd = Math.hypot(dx, dy);
        if (dd > 40) { u.x += dx / dd * def.walkSpeed * 1.3 * dt; u.y += dy / dd * def.walkSpeed * 1.3 * dt; u.moving = true; u.face = dx >= 0 ? 1 : -1; }
        continue;
      }
    } else t = nearestEnemy(world, u);
    if (!t) { u.aiming = false; continue; }
    const dist = Math.sqrt(d2(u, t));
    u.face = t.x >= u.x ? 1 : -1;
    const reach = def.range * ((s.range && s.range[u.type]) || 1) + (def.shot === 'melee' ? t.r : 0);
    if (dist > reach) {
      u.x += (t.x - u.x) / dist * def.walkSpeed * dt;
      u.y += (t.y - u.y) / dist * def.walkSpeed * dt;
      u.moving = true; u.aiming = false;
    } else {
      u.moving = false; u.aiming = true;
      if (u.cd > 0) continue;
      u.cd = s.cooldown[u.type];
      u.recoil = 1;
      const dmg = s.damage[u.type];
      if (onScreen(world, u.x, u.y)) sfx(world, def.shot === 'melee' ? 'slash' : def.shot);
      if (def.shot === 'melee') {
        // coup circulaire : touche la cible et tout ce qui est autour
        for (const e of world.enemies) if (!e.dead && d2(e, t) < (def.cleave * (s.cleave || 1) + e.r) ** 2) damage(world, e, dmg, 0, u);
        world.fx.push({ kind: 'slash', x: t.x, y: t.y, r0: 8, r1: def.cleave * (s.cleave || 1) + 10, t: 0.22, life: 0.22, color: '#f0f4fa', face: u.face });
      } else {
        world.arrows.push({ kind: def.shot, x: u.x + u.face * (SHOT_FROM[u.type] || [0])[0], y: u.y - (SHOT_FROM[u.type] || [0, 10])[1], target: t, damage: dmg, dx: 0, dy: 0, speed: def.speed,
          aoe: def.shot === 'frost' ? s.mageAoe : 0, slow: def.shot === 'frost' ? s.slowTime || HEROES.mage.slowTime : 0 });
      }
    }
  }
}

// D'où part le tir sur le dessin (décalage vers l'avant, hauteur) : arc, pointe du bâton, luth.
const SHOT_FROM = { archer: [14, 6], mage: [22, 8], bard: [10, 4] };

function updateArrows(world, dt) {
  for (const a of world.arrows) {
    const t = a.target;
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
    a.dx = dx / d; a.dy = dy / d;
    a.x += a.dx * a.speed * dt; a.y += a.dy * a.speed * dt;
    if (t.dead) a.done = true;
    else if (d < t.r) {
      a.done = true;
      if (a.aoe) {
        for (const e of world.enemies) if (!e.dead && d2(e, t) < (a.aoe + e.r) ** 2) damage(world, e, a.damage, a.slow, t);
        burst(world, t.x, t.y, 10, ['#aee6ff', '#f0fbff', '#5a8cdc'], 120, 2, 0, 0.4);
        world.fx.push({ kind: 'ring', x: t.x, y: t.y, r0: 6, r1: a.aoe, t: 0.35, life: 0.35, color: '#aee6ff' });
      } else damage(world, t, a.damage, 0, { x: t.x - a.dx, y: t.y - a.dy });
    }
  }
  world.arrows = world.arrows.filter(a => !a.done);
}

function updateCoins(world, dt) {
  const gr = gloveRadius(world);
  const bag = bagPos(world);
  const wp = world.walletPos || { x: 20, y: 20 };
  const toWallet = world.phase === 'tear' || world.mode === 'arena';
  const target = toWallet ? { x: wp.x + world.cam.x, y: wp.y + world.cam.y } : bag;
  const p = pointerWorld(world), inside = world.pointer.inside;
  const mouth = world.phase === 'expedition' && world.mode === 'map' ? world.stats.bagMouth : 0;
  for (const c of world.coins) {
    if (c.fly) {
      const dx = target.x - c.x, dy = target.y - c.y, d = Math.hypot(dx, dy) || 1;
      c.sp += 1400 * dt;
      c.x += dx / d * c.sp * dt; c.y += dy / d * c.sp * dt;
      if (d < 14) { c.dead = true; credit(world, c.value); }
      continue;
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
    const fr = Math.pow(0.04, dt); c.vx *= fr; c.vy *= fr;
    if (c.vz !== undefined) { c.vz -= 900 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.vz = Math.abs(c.vz) > 60 ? -c.vz * 0.45 : 0; } }
    if (c.air && c.z <= 0 && c.vz === 0) { c.air = false; if (c.value >= 5) burst(world, c.x, c.y, 3, ['#fff5b4', '#ffffff'], 50, 1, 0, 0.3); }
    if (world.phase === 'tear') c.vy += 16 * dt;
    c.life -= dt;
    if (c.life <= 0) { c.dead = true; continue; }
    const fresh = c.life < c.max - 0.15 && !c.air;
    if (fresh && inside && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < gr * gr) {
      c.fly = true; c.sp = 120;
      if (c.value >= 4.5) world.texts.push({ x: c.x, y: c.y - 14, text: '+' + Math.round(c.value * (world.phase === 'tear' ? 1 : 1)), color: c.kind === 'gem' ? '#8ff0ff' : '#ffd246',
        size: c.value >= 90 ? 22 : c.value >= 20 ? 18 : 15, life: 0.9, dmg: true, vy: -60, pop: 0 });
      const cb = world.combo; cb.n = cb.t > 0 ? cb.n + 1 : 1; cb.t = 1.1;
      sfx(world, 'coin', { n: cb.n });
      burst(world, c.x, c.y, 3, ['#fff5b4', '#ffcd3c'], 60, 1, 0, 0.3);
    }
    else if (fresh && mouth && d2(c, bag) < mouth * mouth) { c.fly = true; c.sp = 60; }
  }
  world.coins = world.coins.filter(c => !c.dead);
}

function credit(world, value) {
  if (world.mode === 'arena') { world.run.lair.got += value; world.events.push({ kind: 'coins', value }); }
  else if (world.phase === 'tear') { world.run.tearGot += value; world.events.push({ kind: 'coins', value }); }
  else addToBag(world, value);
}

function startTear(world) {
  const r = world.run;
  world.phase = 'tear';
  for (const e of world.enemies) world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 1.6, t: 0.4, life: 0.4, color: e.def.color });
  world.enemies = []; world.arrows = [];
  for (const c of world.coins) if (c.fly) addToBag(world, c.value);
  world.coins = [];
  r.tier = tierOf(r.bag, world.stats);
  r.mult = TIERS[r.tier].mult * (r.full ? FULL_BONUS : 1);
  r.tearTotal = r.bag * r.mult * (world.stats.tearMult || 1);
  r.shake = 1.1;
  world.events.push({ kind: 'tear' });
  sfx(world, 'rumble');
  world.events.push({ kind: 'banner', title: 'Les coutures craquent…', sub: '' });
}

function burstBag(world) {
  const r = world.run, s = world.stats;
  r.tearDur = s.tearDuration;
  r.tearT = s.tearDuration;
  r.attraction = s.attraction;
  const total = r.tearTotal;
  const b = bagPos(world);
  const pieces = total < 15 ? splitLoot(total, 15, 3, 15) : splitLoot(total, 15, 6, BASE.tearMaxCoins - 60);
  // Le sac crache son or en plusieurs vagues : les pièces montent haut, retombent loin,
  // et ne se ramassent qu'une fois posées au sol. Impossible de tout rafler en restant sur le sac.
  pieces.sort(() => Math.random() - 0.5);
  const W = s.tearWaves || TEAR_WAVES;
  r.waves = Array.from({ length: W }, (_, i) => ({ at: i * TEAR_WAVE_GAP, pieces: pieces.filter((_, k) => k % W === i) }));
  r.tearT += (W - 1) * TEAR_WAVE_GAP;
  r.waveT = 0;
  tearWave(world);
  world.fx.push({ kind: 'ring', x: b.x, y: b.y - 20, r0: 10, r1: Math.max(world.w, world.h) * 0.6, t: 0.7, life: 0.7, color: TIERS[r.tier].glow });
  burst(world, b.x, b.y - 20, 60, [TIERS[r.tier].color, TIERS[r.tier].seam, TIERS[r.tier].glow], 420, 3, 0, 1);
  shake(world, 14); sfx(world, 'burst');
  world.events.push({ kind: 'banner', title: 'Déchirure !', sub: total > 0 ? 'Rafle les pièces avant qu\'elles ne disparaissent' : 'Le sac était vide…' });
}

const TEAR_WAVES = 4, TEAR_WAVE_GAP = 0.55;
function tearWave(world) {
  const r = world.run, s = world.stats, b = bagPos(world);
  while (r.waves.length && r.waves[0].at <= r.waveT) {
    const wave = r.waves.shift(), far = Math.max(world.w, world.h);
    for (const pc of wave.pieces) {
      const a = rnd(0, Math.PI * 2), sp = rnd(far * 0.25, far * 0.75);
      world.coins.push({ x: b.x, y: b.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, kind: pc.kind,
        value: pc.value, life: s.tearDuration + 1.2, max: s.tearDuration + 1.2, fly: false, sp: 0, big: r.tier >= 1,
        z: 0, vz: rnd(420, 720), spin: rnd(0, 6), air: true });
    }
    world.fx.push({ kind: 'ring', x: b.x, y: b.y - 20, r0: 10, r1: 120 + 60 * r.waves.length, t: 0.4, life: 0.4, color: TIERS[r.tier].glow });
    burst(world, b.x, b.y - 30, 24, [TIERS[r.tier].color, TIERS[r.tier].glow, '#ffffff'], 300, 3, 0, 0.7);
    shake(world, 9); sfx(world, 'burst');
  }
}

function endTear(world) {
  const r = world.run;
  let left = 0;
  for (const c of world.coins) {
    if (c.fly) { r.tearGot += c.value; world.events.push({ kind: 'coins', value: c.value }); } else left += c.value;
  }
  world.coins = [];
  r.left = left;
  world.phase = 'done';
  world.events.push({ kind: 'done' });
}
