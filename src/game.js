// Logique d'une expédition : entités, combat, récolte, sac et Déchirure.
import { ENEMIES, HEROES, HERO_ORDER, ALL_HEROES, GOLD_WISP, TIERS, FULL_BONUS, OVERFLOW_RATE, BASE, MAP, ARENA, EVENTS, EVENT_WINDOWS, STAGES, ULTS, bagMax, tierOf } from './data.js';
import { rollItem, RARITIES as GEAR_RARITIES, DROP } from './gear.js';
import { CARD_DROP } from './curio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
// types de paysage d'une carte (voir buildMap)
export const LAYOUTS = ['bosquets', 'foret', 'plaine', 'lacs', 'ruines'];
const LAYOUT_NAMES = { bosquets: 'Carte : bosquets', foret: 'Carte : forêt dense', plaine: 'Carte : grande plaine', lacs: 'Carte : pays des lacs', ruines: 'Carte : vieilles ruines' };
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
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [], hazards: [], strikes: [], zones: [],
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
  zone = { ...zone, stage: stage.name, hpMult: zone.hpMult * (m.hp || 1), valueMult: zone.valueMult * (m.value || 1) * (stats.valueMult || 1) * (zone.demon ? stats.embers || 1 : 1) };
  // zones nommées de la carte : plus d'ennemis costauds, plus d'or
  // carte tirée au sort à chaque expédition : graine, miroir et type de paysage
  const lay = zone.layout || { seed: 1 + Math.floor(Math.random() * 2e9), fx: Math.random() < 0.5, fy: Math.random() < 0.5, kind: LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)] };
  const mx = f => (lay.fx ? 1 - f : f), my = f => (lay.fy ? 1 - f : f);
  zone.layout = lay;
  if (zone.boss && zone.boss.at) { const at = zone.boss.at0 || zone.boss.at; zone.boss = { ...zone.boss, at0: at, at: [mx(at[0]), my(at[1])] }; }
  zone.areaList = (zone.areas || []).map(([name, fx, fy, hp, gold]) => ({ name, x: mx(fx) * MAP.w, y: my(fy) * MAP.h, r: 300, hp, gold }));
  stats = { ...stats, goldChance: stats.goldChance * (m.gold || 1) };
  world.stage = stage;
  Object.assign(world, {
    phase: 'expedition', mode: 'map', mapW: MAP.w, mapH: MAP.h,
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [], hazards: [], strikes: [], zones: [], deaths: [], shake: 0,
    stats, zone,
    run: {
      t: 0, duration: stats.duration, spawnT: 0, bag: 0, full: false, overflow: 0,
      kills: 0, toDrop: { ...stats.heroes }, sel: 'archer', attraction: stats.attraction, boss: null, bossKilled: false, golds: 0,
      tearT: 0, tearTotal: 0, tearGot: 0, shake: 0, mult: 1, tier: 0,
      lair: { open: !!lair.open, first: !!lair.first, done: false, got: 0, only: false, dungeon: !!lair.dungeon }, arena: null,
      happenings: planEvents(stats), eventsGot: 0,
      cnt: { kills: 0, slowed: 0, knocked: 0, auraT: 0 }, areasSeen: {}, mvpAt: zone.families && zone.families.mvp && Math.random() < 0.35 ? stats.duration * rnd(0.2, 0.8) : -1, ult: { archer: 0.5, mage: 0.5, knight: 0.5, bard: 0.5 }, hymnT: 0, reinforced: false,
    },
  });
  const b = bagPos(world);
  centerCam(world, b.x, b.y + 40);
  for (let i = 0; i < BASE.startPacks; i++) spawnPack(world, true);
  world.events.push({ kind: 'banner', title: stage.name, sub: (stage.blurb ? stage.blurb + ' · ' : '') + LAYOUT_NAMES[lay.kind] });
}

export function areaAt(world, x, y) {
  for (const a of (world.zone && world.zone.areaList) || []) if ((x - a.x) ** 2 + ((y - a.y) * 1.4) ** 2 < a.r * a.r) return a;
  return null;
}
// Élite (nœud « Élites ») et zones nommées : appliqués à chaque nouvel élémentaire.
function decorate(world, e) {
  if (world.mode !== 'map' || e.event || e.boss) return e;
  const a = areaAt(world, e.x, e.y);
  if (a) { e.hp *= a.hp; e.max = e.hp; e.value *= a.gold; e.area = a; }
  if (world.stats && world.stats.elite && !e.gold && !e.def.mvp && Math.random() < 0.03) { e.elite = true; e.hp *= 6; e.max = e.hp; e.value *= 5; e.r *= 1.3; }
  return e;
}

// ---------- Événements d'expédition ----------
// Les types possibles se débloquent dans l'arbre (la pluie de pièces est là dès le début).
function planEvents(stats) {
  const pool = (stats.events || Object.keys(EVENTS)).slice().sort(() => Math.random() - 0.5);
  const n = Math.min(stats.eventCount || 1, EVENT_WINDOWS.length);
  const windows = n === 1 ? [[0.3, 0.65]] : n === 2 ? [[0.18, 0.42], [0.55, 0.78]] : EVENT_WINDOWS;
  const out = windows.map(([a, b], i) => ({ kind: pool[i % pool.length], at: stats.duration * rnd(a, b), done: false }));
  // Averse : des pluies de pièces en plus
  for (let i = 0; i < (stats.downpour || 0); i++) out.push({ kind: 'rain', at: stats.duration * rnd(0.1, 0.9), done: false, extra: true });
  return out;
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
function foeHp(world, type) { return ENEMIES[type].hp * Math.max(1, (world.stats.archerBase || world.stats.damage.archer) / HEROES.archer.damage) * world.zone.hpMult; }
function startEvent(world, ev) {
  const def = EVENTS[ev.kind], p = eventSpot(world), r = world.run;
  ev.done = true;
  world.events.push({ kind: 'banner', title: def.title, sub: def.sub });
  world.events.push({ kind: 'eventIntro', ev: ev.kind });
  sfx(world, 'portal');
  const value = eventValue(world, ev.kind);
  if (ev.kind === 'rain') {
    const life = def.life * (world.stats.rainLife || 1);
    r.rain = { t: life, left: (r.rain ? r.rain.left : 0) + value, rate: value / life };
    return;
  }
  if (ev.kind === 'buried') { r.mounds = r.mounds || []; r.mounds.push({ x: p.x, y: p.y, dig: 0, life: def.life, value }); return; }
  if (ev.kind === 'lucky') { r.lucky = def.life; r.luckyValue = value / 120; return; }
  if (ev.kind === 'mirage') { r.mirage = def.life; return; }
  if (ev.kind === 'skyfall') {
    // une horde tombe du ciel près d'un héros (ou au centre de l'écran)
    const u = world.heroes.length ? world.heroes[Math.floor(Math.random() * world.heroes.length)] : { x: p.x, y: p.y };
    const type = pickEnemyType(world.zone);
    for (let i = 0; i < 22; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(60, 190);
      const e = spawnEnemy(world, false, type, u.x + Math.cos(a) * d, u.y + Math.sin(a) * d);
      e.value *= 2.5; e.fall = rnd(0.4, 1.2);
    }
    shake(world, 8);
    return;
  }
  if (ev.kind === 'rush') {
    // une file de feux follets dorés traverse l'écran
    const y0 = world.cam.y + world.h * rnd(0.3, 0.7), left = Math.random() < 0.5, n = 18;
    for (let i = 0; i < n; i++) {
      const e = spawnEnemy(world, false, 'wisp', left ? world.cam.x - 40 - i * 46 : world.cam.x + world.w + 40 + i * 46, y0 + Math.sin(i * 0.8) * 50);
      e.gold = true; e.value = value / n; e.rush = { vx: left ? 230 : -230 }; e.hp = e.max = foeHp(world, 'wisp');
    }
    return;
  }
  if (ev.kind === 'wanted') {
    const e = spawnAt(world, 'golem', p.x, p.y);
    e.hp = e.max = foeHp(world, 'golem') * 6; e.wanted = true; e.prize = value; e.value = value; e.life = def.life; e.lifeMax = def.life; e.event = true; e.r *= 1.3;
    world.fx.push({ kind: 'ring', x: p.x, y: p.y, r0: 10, r1: 90, t: 0.7, life: 0.7, color: '#ff5a5a' });
    return;
  }
  const e = spawnAt(world, ev.kind, p.x, p.y);
  e.hp = e.max = foeHp(world, ev.kind);
  e.value = value; e.total = value; e.life = def.life; e.event = true;
  if (ev.kind === 'goblin' || ev.kind === 'treasure') { e.a = rnd(0, Math.PI * 2); }
  if (ev.kind === 'mimic' && world.stats.mimicTame) { e.value *= 1.5; e.total = e.value; }
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
  if (r.mvpAt >= 0 && r.t >= r.mvpAt) {
    r.mvpAt = -1;
    const p = eventSpot(world), e = spawnEnemy(world, false, 'mvp', p.x, p.y);
    e.hp = e.max = foeHp(world, 'golem') * 4; e.life = 20; e.a = rnd(0, 6);
    world.events.push({ kind: 'banner', title: 'Un lapin d\'or !', sub: 'Rare et très riche : coince-le avant qu\'il ne s\'enfuie' });
    sfx(world, 'gold');
  }
  // zones nommées : un bandeau la première fois que la vue y entre
  const cx = world.cam.x + world.w / 2, cy = world.cam.y + world.h / 2, ar = areaAt(world, cx, cy);
  if (ar && !r.areasSeen[ar.name]) { r.areasSeen[ar.name] = true; world.events.push({ kind: 'banner', title: ar.name, sub: `Ennemis ×${String(ar.hp).replace('.', ',')} plus costauds · or ×${String(ar.gold).replace('.', ',')}` }); }
  if (r.lucky > 0) r.lucky -= dt;
  if (r.mirage > 0) r.mirage -= dt;
  if (r.mounds) {
    const p = pointerWorld(world);
    for (const m of r.mounds) {
      m.life -= dt;
      const on = world.pointer.inside && (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < 44 * 44;
      m.dig = on ? m.dig + dt : Math.max(0, m.dig - dt * 0.5);
      if (on && Math.random() < dt * 12) burst(world, m.x, m.y, 2, ['#8a6a3a', '#c9a06a'], 80, 2, 0, 0.4);
      if (m.dig >= 1) {
        m.done = true; r.eventsGot++;
        for (const pc of splitLoot(m.value, 16, 2, 16)) { const a = rnd(0, Math.PI * 2), sp = rnd(40, 140); world.coins.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: pc.kind, value: pc.value, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: rnd(220, 360), spin: rnd(0, 6) }); }
        world.texts.push({ x: m.x, y: m.y - 30, text: 'Trésor !', color: '#ffd246', size: 20, life: 1.4 }); shake(world, 6); sfx(world, 'gold');
        burst(world, m.x, m.y, 30, ['#ffd246', '#8a6a3a', '#fff3a8'], 200, 2, 0, 0.7);
      } else if (m.life <= 0) { m.done = true; world.texts.push({ x: m.x, y: m.y - 24, text: 'Le trésor s\'est enfoncé…', color: '#e8e0d0', size: 14, life: 1.4 }); }
    }
    r.mounds = r.mounds.filter(m => !m.done);
  }
  for (const e of world.enemies) {
    if (e.rush && !e.dead) { if ((e.rush.vx > 0 && e.x > world.mapW - 50) || (e.rush.vx < 0 && e.x < 50)) e.dead = true; }
    if (!e.event || e.dead) continue;
    e.life -= dt;
    if (e.wanted) e.value = e.prize * Math.max(0.15, e.life / e.lifeMax);
    if (e.life <= 0) {
      e.dead = true;
      burst(world, e.x, e.y, 18, ['#e8e0d0', '#b8b0a0', '#ffffff'], 140, 2, 0, 0.6);
      const msg = e.type === 'goblin' || e.type === 'treasure' ? 'Le gobelin s\'est enfui…' : e.type === 'vein' ? 'Le filon s\'est tari' : e.wanted ? 'La cible s\'est échappée…' : 'La mimique s\'est enfuie…';
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
  Object.assign(world, { mode: 'arena', mapW: aw, mapH: ah, enemies: [], deaths: [], coins: [], arrows: [], hazards: [], strikes: [], zones: [] });
  // les héros déjà largués entrent par le bas de la salle
  heroes.forEach((u, i) => {
    const a = Math.PI * (0.15 + 0.7 * (i + 0.5) / heroes.length);
    u.x = aw / 2 + Math.cos(a) * aw * 0.22 * (i % 2 ? 1 : 0.8); u.y = ah * 0.5 + Math.sin(a) * ah * 0.32;
    u.drop = 0.6 + (i % 4) * 0.1; u.stun = 0; u.cd = rnd(0.2, 0.8);
  });
  const b = world.zone.boss;
  r.arena = { t: 0, duration: world.zone.boss.duration || ARENA.duration, fireT: 2.2, summoned: 0, loot: 0, won: false, leaving: 0, mechT: 4, phase: 0 };
  const home = { x: aw / 2, y: ah * 0.4, r: Math.min(aw, ah) * 0.26 };
  const e = {
    type: 'boss', boss: true, def: { ...b, color: b.color || '#ff7a3c', core: '#fff1c2' }, x: home.x, y: home.y, r: b.radius,
    hp: b.hp * world.zone.hpMult, max: b.hp * world.zone.hpMult, value: b.value * world.zone.valueMult * (r.lair.first ? ARENA.firstBonus : 1),
    a: rnd(0, 6), ph: rnd(0, 6), age: 0, hit: 0, dead: false, slow: 0, home,
  };
  if (b.mech === 'armor') e.armor = e.armorMax = e.max * 0.3;
  world.enemies.push(e);
  r.boss = e;
  if (b.mech === 'guards' || b.mech === 'final') spawnGuards(world, e);
  centerCam(world, aw / 2, ah / 2);
  world.fx.push({ kind: 'ring', x: home.x, y: home.y, r0: 10, r1: 300, t: 0.7, life: 0.7, color: '#ff9a3c' });
  shake(world, 8); sfx(world, 'portal');
  world.events.push({ kind: 'arena', on: true });
  world.events.push({ kind: 'banner', title: b.lair, sub: r.lair.first ? `${b.name} : butin ×${ARENA.firstBonus} la première fois !` : `${b.name} t'attend` });
}

function exitArena(world) {
  const r = world.run, a = r.arena;
  // pièces restées au sol : perdues. Pièces en vol : comptées. Besaces : gardées.
  keepPouches(world);
  for (const c of world.coins) if (c.fly && !c.dead) credit(world, c.value);
  r.lair.done = true;
  if (r.lair.only) { world.coins = []; world.phase = 'done'; world.events.push({ kind: 'done' }); return; }
  const st = r.stash, p = portalPos(world);
  Object.assign(world, { mode: 'map', mapW: MAP.w, mapH: MAP.h, enemies: st.enemies, coins: st.coins, arrows: [], hazards: [], strikes: [], zones: [] });
  r.stash = null;
  world.heroes.forEach((u, i) => {
    const an = i / Math.max(1, world.heroes.length) * Math.PI * 2;
    u.x = p.x + Math.cos(an) * 90; u.y = p.y + 40 + Math.sin(an) * 60; u.drop = 0.5; u.stun = 0;
  });
  centerCam(world, p.x, p.y + 60);
  sfx(world, 'portal');
  world.events.push({ kind: 'arena', on: false });
  world.events.push({ kind: 'banner', title: 'Retour sur la carte', sub: a.won ? 'Le portail se referme derrière toi' : world.zone.boss.name + ' t\'a repoussé…' });
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
  bossMechanics(world, dt);
}

// Type d'élémentaire qu'un boss appelle à l'aide.
function summonType(world) {
  const m = world.zone.boss.mech;
  if (m === 'imps') return 'imp';
  if (m === 'spores') return 'puffer';
  return Object.keys(world.zone.spawn).find(k => ENEMIES[k].role === 'weak') || 'wisp';
}
// Gardes : tant qu'ils vivent, une bulle protège le boss.
function spawnGuards(world, bo) {
  const tough = Object.keys(world.zone.spawn).find(k => ENEMIES[k].role === 'tough') || 'golem';
  for (let i = 0; i < 4; i++) {
    const an = i / 4 * Math.PI * 2 + 0.4, g = spawnAt(world, tough, bo.x + Math.cos(an) * 150, bo.y + Math.sin(an) * 100);
    g.hp = g.max = bo.max * 0.035; g.guard = true; g.value = 0; g.home = { x: g.x, y: g.y, r: 40 };
  }
  bo.shield = true;
  world.events.push({ kind: 'banner', title: 'Gardes royaux !', sub: 'Abats les 4 gardes pour briser la bulle' });
  sfx(world, 'warn');
}
// « Lequel ? » : le boss se cache parmi des copies ; toucher une copie la fait disparaître.
function spawnCopies(world, bo) {
  const slots = [], n = 5;
  for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2; slots.push({ x: bo.home.x + Math.cos(an) * 170, y: bo.home.y + Math.sin(an) * 110 }); }
  const real = Math.floor(Math.random() * n);
  slots.forEach((p, i) => {
    if (i === real) { bo.x = p.x; bo.y = p.y; return; }
    world.enemies.push({ type: 'boss', boss: true, fake: true, def: bo.def, x: p.x, y: p.y, r: bo.r, hp: 1, max: 1, value: 0, a: 0, ph: rnd(0, 6), age: 0, hit: 0, dead: false, slow: 0, home: { x: p.x, y: p.y, r: 30 } });
  });
  world.run.arena.copiesT = 8;
  burst(world, bo.home.x, bo.home.y, 40, ['#e8e0d0', '#ffffff'], 300, 2, 0, 0.7);
  world.events.push({ kind: 'banner', title: 'Lequel ?', sub: 'Trouve le vrai parmi les copies' });
  sfx(world, 'warn');
}

function bossMechanics(world, dt) {
  const r = world.run, a = r.arena, bo = r.boss, b = world.zone.boss, mech = b.mech || 'fire', fast = b.faster || 1;
  if (!bo || bo.dead) return;
  // le boss dort à notre arrivée : il se réveille en grondant, puis le combat commence
  if (!bo.woke) {
    if ((bo.age || 0) < 1.1) return;
    bo.woke = true; shake(world, 12); sfx(world, 'rumble');
    burst(world, bo.x, bo.y + 24, 34, ['#8a7a6a', '#c8b8a0', '#ffffff'], 220, 2, 0, 0.8);
    world.texts.push({ x: bo.x, y: bo.y - 80, text: '!', color: '#ff5e4d', size: 30, life: 1.1 });
  }
  if (bo.stunned > 0) { bo.stunned -= dt; bo.slow = 0.2; }
  // bulle : tombe quand les gardes sont morts
  if (bo.shield && !world.enemies.some(e => e.guard && !e.dead)) { bo.shield = false; world.events.push({ kind: 'banner', title: 'La bulle éclate !', sub: '' }); shake(world, 8); sfx(world, 'burst'); }
  // copies : disparaissent au bout de quelques secondes
  if (a.copiesT > 0) { a.copiesT -= dt; if (a.copiesT <= 0) for (const e of world.enemies) if (e.fake) e.dead = true; }
  // armure qui repousse
  if (mech === 'armor' && bo.armor <= 0 && bo.armorT > 0) { bo.armorT -= dt; if (bo.armorT <= 0) { bo.armor = bo.armorMax; world.events.push({ kind: 'banner', title: 'L\'armure se reforme', sub: '' }); } }
  const ratio = bo.hp / bo.max;
  // paliers de vie : 66 % et 33 %
  if (a.summoned < b.summonAt.length && ratio <= b.summonAt[a.summoned]) {
    a.summoned++;
    if (mech === 'copies' || (mech === 'final' && a.summoned === 1)) spawnCopies(world, bo);
    else if ((mech === 'guards' || mech === 'final') && !bo.shield) spawnGuards(world, bo);
    else {
      const t = summonType(world);
      for (let i = 0; i < b.summonN; i++) { const an = i / b.summonN * Math.PI * 2; const m = spawnAt(world, t, bo.x + Math.cos(an) * 110, bo.y + Math.sin(an) * 80); if (ENEMIES[t].puffer) m.base = m.value; }
      shake(world, 6); sfx(world, 'warn');
      world.events.push({ kind: 'banner', title: b.name + ' s\'embrase !', sub: 'Il appelle ses sbires' });
    }
  }
  if (bo.stunned > 0) return;
  // ruée du griffon : ligne d'alerte, puis il fonce à travers la salle
  if (mech === 'dash' || mech === 'final') {
    if (bo.dash) {
      const d = bo.dash;
      if (d.warn > 0) { d.warn -= dt; }
      else {
        const dx = d.tx - bo.x, dy = d.ty - bo.y, dd = Math.hypot(dx, dy) || 1, sp = 700 * dt;
        bo.x += dx / dd * Math.min(dd, sp); bo.y += dy / dd * Math.min(dd, sp);
        for (const u of world.heroes) if (u.drop <= 0 && d2(u, bo) < (bo.r + 20) ** 2 && !d.hit.has(u)) { d.hit.add(u); stunHero(world, u, 1.5); u.x += dx / dd * 40; u.y += dy / dd * 40; }
        if (dd < 10) { bo.dash = null; shake(world, 8); bo.home = { x: bo.x, y: bo.y, r: bo.home.r }; }
      }
    } else if ((a.mechT -= dt * fast) <= 0) {
      a.mechT = 5;
      const u = world.heroes.filter(h => h.drop <= 0)[Math.floor(Math.random() * world.heroes.length)];
      if (u) { const ex = u.x + (u.x - bo.x) * 0.6, ey = u.y + (u.y - bo.y) * 0.6; bo.dash = { tx: Math.max(60, Math.min(world.mapW - 60, ex)), ty: Math.max(60, Math.min(world.mapH - 60, ey)), warn: 1, hit: new Set(), x0: bo.x, y0: bo.y }; sfx(world, 'warn'); }
    }
  }
  // attaques au sol (cercles de feu, de glace ou de spores) sur les héros
  a.fireT -= dt * (1 + a.summoned * 0.35) * fast;
  if (a.fireT <= 0) {
    a.fireT = b.fireEvery * (mech === 'quake' ? 0.8 : 1);
    bo.atk = 0.7;
    const kind = mech === 'quake' ? 'ice' : mech === 'spores' ? 'spore' : 'fire';
    const n = 1 + a.summoned + (mech === 'quake' ? 1 : 0);
    const targets = world.heroes.filter(u => u.drop <= 0).sort(() => Math.random() - 0.5).slice(0, n);
    if (!targets.length) targets.push({ x: rnd(150, world.mapW - 150), y: rnd(150, world.mapH - 120) });
    for (const u of targets) world.hazards.push({ x: u.x + rnd(-14, 14), y: u.y + 8 + rnd(-10, 10), r: b.fireRadius * (mech === 'quake' ? 1.5 : 1), t: b.fireWarn, warn: b.fireWarn, kind });
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
      stunHero(world, u, b.stun);
      const dx = u.x - z.x, dy = u.y - z.y, d = Math.hypot(dx, dy) || 1;
      u.x += dx / d * 26; u.y += dy / d * 18;
      world.texts.push({ x: u.x, y: u.y - 40, text: 'étourdi', color: '#ffb347', size: 13, life: 0.9 });
    }
    const pal = z.kind === 'ice' ? ['#aee6ff', '#ffffff', '#5a8cdc', '#24161e'] : z.kind === 'spore' ? ['#7fffd0', '#40c0a0', '#e0ffe0', '#24161e'] : ['#ff5a2a', '#ffb040', '#fff0b0', '#24161e'];
    burst(world, z.x, z.y, 26, pal, 200, 2, 0, 0.6);
    world.fx.push({ kind: 'ring', x: z.x, y: z.y, r0: z.r * 0.3, r1: z.r * 1.3, t: 0.35, life: 0.35, color: pal[0] });
    shake(world, 5); sfx(world, 'fire');
  }
  world.hazards = world.hazards.filter(z => !z.done);
}

// Étourdissement d'un héros (le Paladin protège ceux qui l'entourent).
function stunHero(world, u, dur) {
  if (world.stats.has && world.stats.has.knA && world.heroes.some(k => k.type === 'knight' && k.drop <= 0 && d2(k, u) < 130 * 130)) {
    world.texts.push({ x: u.x, y: u.y - 40, text: 'protégé', color: '#fff3a8', size: 13, life: 0.8 });
    return;
  }
  u.stun = Math.max(u.stun || 0, dur * (world.stats.stunMult || 1));
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
  let type = pickEnemyType(world.zone);
  // familles spéciales selon l'avancée : roi, boursouflé, soigneur, bandit
  const fam = world.zone.families || {}, rf = Math.random();
  let special = null;
  if (fam.king && rf < 0.06) special = 'king'; else if (fam.puffer && rf < 0.13) special = 'puffer'; else if (fam.healer && rf < 0.19) special = 'healer'; else if (fam.bandit && rf < 0.24) special = 'bandit';
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
  const [lo, hi] = PACK_SIZE[type] || PACK_SIZE[ENEMIES[type].look] || [6, 10];
  const n = Math.round(rnd(lo, hi) * (world.stats?.packMult || 1));
  const pack = { x, y, a: rnd(0, Math.PI * 2), n: 0 };
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * (24 + n * 3.5);
    const e = spawnEnemy(world, false, type, x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d);
    e.pack = pack;
  }
  if (special) {
    const k = special === 'king' ? 1 : special === 'healer' ? 2 : special === 'bandit' ? 2 : 3;
    for (let i = 0; i < k; i++) { const e = spawnEnemy(world, false, special, x + rnd(-30, 30), y + rnd(-30, 30)); e.pack = pack; e.base = e.value; }
  }
  // Horde dorée : des feux follets dorés se glissent dans chaque paquet
  for (let i = 0; i < ((world.stats && world.stats.goldHorde) || 0) && world.phase === 'expedition'; i++) {
    const e = spawnEnemy(world, false, 'wisp', x + rnd(-30, 30), y + rnd(-30, 30));
    if (!e.gold) { e.gold = true; e.value *= GOLD_WISP.value; e.hp *= GOLD_WISP.hp; e.max = e.hp; }
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
  const gold = (def.role === 'weak') && !def.king && Math.random() < (world.stats?.goldChance || 0);
  const e = {
    type, def, x, y, r: def.radius, gold, slow: 0,
    hp: def.hp * world.zone.hpMult, max: def.hp * world.zone.hpMult,
    value: def.value * world.zone.valueMult * (gold ? GOLD_WISP.value : 1),
    a: rnd(0, Math.PI * 2),
    ph: rnd(0, 6), age: 0, hit: 0, dead: false,
  };
  if (gold) { e.hp *= GOLD_WISP.hp; e.max = e.hp; if (world.run) world.run.golds++; }
  decorate(world, e);
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
  world.heroes.push({ type, x, y, cd: rnd(0, 0.3), drop: 1, face: 1, bob: rnd(0, 6), boost: 0, rank: (world.stats.rank && world.stats.rank[type]) || 1, rage: 0, timer: rnd(0, 1) });
  r.toDrop[type]--;
  if (r.toDrop[type] <= 0) { const next = ALL_HEROES.find(k => r.toDrop[k] > 0); if (next) r.sel = next; }
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

function damage(world, e, amount, slow, from, type) {
  if (e.dead) return;
  const st = world.stats;
  if (e.boss || e.elite) amount *= st.bossMult * ((st.bossBy && st.bossBy[type]) || 1);
  if (e.def.demon) amount *= st.demonMult || 1;
  if (e.fake) { e.dead = true; burst(world, e.x, e.y, 20, ['#e8e0d0', '#ffffff', '#8c8f86'], 160, 2, 0, 0.5); world.texts.push({ x: e.x, y: e.y - 30, text: 'Faux !', color: '#e8e0d0', size: 16, life: 0.8 }); return; }
  if (e.boss) {
    if (e.shield) { if (Math.random() < 0.08) world.texts.push({ x: e.x, y: e.y - e.r - 6, text: 'bulle', color: '#aee6ff', size: 12, life: 0.5 }); return; }
    if (e.armor > 0) { e.armor -= amount; amount *= 0.15; if (e.armor <= 0) { e.armor = 0; e.armorT = 12; e.stunned = 3; world.events.push({ kind: 'banner', title: 'Armure brisée !', sub: 'Il est sonné : frappe fort' }); shake(world, 10); } }
    if (e.stunned > 0) amount *= 2;
    else { e.stunBar = (e.stunBar || 0) + 1; if (e.stunBar >= 120) { e.stunBar = 0; e.stunned = 4; world.events.push({ kind: 'banner', title: 'Sonné !', sub: 'Dégâts ×2 pendant 4 s' }); shake(world, 8); } }
  }
  const r0 = world.run;
  if (slow) { if (type === 'mage' && e.slow <= 0 && r0 && r0.cnt) r0.cnt.slowed++; e.slow = Math.max(e.slow, slow); }
  if (type === 'mage' && st.has && st.has.maA2 && (e.type === 'golem' || e.elite) && !e.boss) e.frozen = Math.max(e.frozen || 0, 2);
  if (type === 'archer' && st.has && st.has.arB2) e.bounty = true;
  const crit = Math.random() < (st.critChance || 0.12) + ((st.critBy && st.critBy[type]) || 0);
  if (crit) amount *= (st.critMult || 2) * ((st.critMultBy && st.critMultBy[type]) || 1);
  // Œil-de-faucon : critiques énormes de loin
  if (crit && type === 'archer' && st.has && st.has.arA1 && from && d2(from, e) > 140 * 140) amount *= 2;
  if (e.def.dodge && Math.random() < e.def.dodge) {
    world.texts.push({ x: e.x, y: e.y - e.r - 6, text: 'esquive', color: '#d6f2ff', size: 12, life: 0.7 });
    return;
  }
  const r = world.run;
  if (type && r) { r.dmg = r.dmg || {}; r.dmg[type] = (r.dmg[type] || 0) + Math.max(0, Math.min(amount, e.hp)); }
  e.hp -= amount; e.hit = 0.12;
  if (r && r.lucky > 0 && !e.event && Math.random() < 0.7) dropCoin(world, e.x, e.y, 'coin', Math.max(0.5, r.luckyValue || 1), 30);
  if (e.type === 'vein' || e.type === 'treasure') {
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
    color: crit ? '#fff4d0' : '#ffffff', size: crit ? 24 : e.boss ? 18 : 15, life: crit ? 1 : 0.65, dmg: true, vy: crit ? -90 : -70, pop: 0, box: crit ? '#c8402a' : null });
  if (from && !e.boss && !e.def.still) {
    const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1, k = (e.type === 'golem' ? 60 : 140) * (crit ? 1.6 : 1) * (type === 'knight' ? st.knock || 1 : 1);
    if (type === 'knight' && r && r.cnt) r.cnt.knocked++;
    e.kx = (e.kx || 0) + dx / d * k; e.ky = (e.ky || 0) + dy / d * k;
  }
  if (onScreen(world, e.x, e.y)) { sfx(world, 'hit', { crit }); if (crit || e.boss) shake(world, e.boss ? 3 : 2); }
  if (e.hp <= 0) {
    killEnemy(world, e);
    // mythique Éclatement : l'ennemi tué par le givre explose et blesse ses voisins
    if (type === 'mage' && st.myths && st.myths.shatter) {
      for (const o of world.enemies) if (!o.dead && o !== e && d2(o, e) < 60 * 60) damage(world, o, amount * 0.5, 0, e, 'shard');
      burst(world, e.x, e.y, 10, ['#aee6ff', '#ffffff', '#5a8cdc'], 160, 2, 0, 0.4);
      world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: 6, r1: 60, t: 0.3, life: 0.3, color: '#aee6ff' });
    }
  }
}

// ---------- Besaces d'équipement ----------
// Une fois l'Armurerie achetée, certains ennemis lâchent une besace : elle file seule vers le sac.
function maybePouch(world, e) {
  const s = world.stats, r = world.run, gc = world.gearCtx;
  if (!s.gearOn || !gc || !r) return;
  r.pouches = r.pouches || 0;
  // besace en or : un feu follet doré sur quatre, une fois par expédition, épique ou mieux
  if (e.gold && !r.goldPouch && Math.random() < 0.25) { r.goldPouch = true; dropPouch(world, e, rollItem(gc, 0, Math.random, 2), true); return; }
  let ch = (e.boss ? 1 : e.event ? DROP.event : e.gold ? DROP.gold : DROP.chance) * (s.dropMult || 1);
  if (gc.first && !r.pouches && r.kills >= 20) ch = 1;   // première expédition armée : une besace garantie
  if (!e.boss && r.pouches >= DROP.perRun) return;
  if (Math.random() >= ch) return;
  r.pouches++;
  dropPouch(world, e, rollItem(gc, 0), false);
}
function dropPouch(world, e, item, golden) {
  const rar = item.rarity, big = rar >= 2;
  world.coins.push({ x: e.x, y: e.y, vx: rnd(-40, 40), vy: rnd(-40, 40), kind: golden ? 'pouchGold' : 'pouch', item, golden, value: 0, life: 99, max: 99,
    fly: false, sp: 0, z: 0, vz: 340, spin: 0, auto: big ? 2.2 : 1.3, beam: big ? 1.8 : 0 });
  const name = GEAR_RARITIES[rar].name;
  world.texts.push({ x: e.x, y: e.y - 34, text: golden ? 'Besace en or !' : big ? `Besace ${name.toLowerCase()} !` : 'Besace !',
    color: golden ? '#ffd246' : GEAR_RARITIES[rar].color, size: big ? 22 : 18, life: big ? 2 : 1.4 });
  // chute épique : l'écran tremble, un rayon tombe du ciel, un bandeau pour les légendaires et mythiques
  if (big) {
    shake(world, 4 + rar * 2); sfx(world, 'tier');
    world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: 10, r1: 90 + rar * 20, t: 0.6, life: 0.6, color: GEAR_RARITIES[rar].color });
    burst(world, e.x, e.y, 16 + rar * 8, [GEAR_RARITIES[rar].color, '#ffffff', '#fff3a8'], 260, 2, 0, 0.8);
    if (rar >= 3) world.events.push({ kind: 'banner', title: `${name} !`, sub: 'Une besace rare vient de tomber' });
  } else sfx(world, 'gold');
}
function gotItem(world, item) {
  const r = world.run; r.items = r.items || [];
  r.items.push(item);
  // mythique Temps volé : chaque besace ramassée rallonge l'expédition
  if (world.stats.myths && world.stats.myths.hourglass && world.phase === 'expedition' && world.mode === 'map') {
    r.duration += 2;
    const b = bagPos(world); world.texts.push({ x: b.x, y: b.y - 60, text: '+2 s', color: '#ff4a5a', size: 22, life: 1.2 });
  }
}
// avant de vider le sol : les besaces ne se perdent jamais
function keepPouches(world) {
  for (const c of world.coins) if (c.item && !c.dead) { c.dead = true; gotItem(world, c.item); }
}

function killEnemy(world, e) {
  e.dead = true;
  world.run.kills++;
  if (!e.boss && !e.fake && world.mode === 'map' && onScreen(world, e.x, e.y)) {
    const dl = world.deaths || (world.deaths = []);
    if (dl.length < 40) dl.push({ x: e.x, y: e.y, type: e.type, def: e.def, elite: e.elite, gold: e.gold, event: e.event, ph: e.ph, face: Math.cos(e.a) > 0.2 ? 1 : -1, t: 0.45, life: 0.45 });
  }
  if (!e.fake && !e.guard) { const kb = world.run.killsBy || (world.run.killsBy = {}); kb[e.boss ? 'boss:' + world.zone.id : e.type] = (kb[e.boss ? 'boss:' + world.zone.id : e.type] || 0) + 1; }
  if (world.run.cnt) world.run.cnt.kills++;
  if (e.bounty && !e.boss && !e.event) e.value *= 1.5;
  // un roi se divise en petits élémentaires
  if (e.def.king) {
    const weak = Object.keys(world.zone.spawn).find(k => ENEMIES[k].role === 'weak') || 'wisp';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = spawnEnemy(world, false, weak, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); c.value *= 3; c.kx = Math.cos(a) * 160; c.ky = Math.sin(a) * 160; }
    world.texts.push({ x: e.x, y: e.y - 30, text: 'Le roi se divise !', color: '#ffd246', size: 16, life: 1.2 });
  }
  if (e.def.mvp) { world.texts.push({ x: e.x, y: e.y - 34, text: 'Lapin d\'or !', color: '#ffe14a', size: 22, life: 1.6 }); shake(world, 8); }
  // Cœur de braise : un ennemi brûlé explose
  if (e.burn > 0 && world.stats.has && world.stats.has.maB1) {
    world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: 6, r1: 70, t: 0.3, life: 0.3, color: '#ff7a3c' });
    burst(world, e.x, e.y, 12, ['#ff5a2a', '#ffb040', '#fff0b0'], 180, 2, 0, 0.4);
    const dmg = (world.stats.damage.mage || 2) * 0.8;
    for (const o of world.enemies) if (!o.dead && o !== e && d2(o, e) < 70 * 70) { o.burn = Math.max(o.burn || 0, 1.5); o.burnDps = dmg; damage(world, o, dmg, 0, e, 'mage'); }
  }
  if (e.event) world.run.eventsGot++;
  // cartes de créature (Cabinet de curiosités)
  const rc = world.run;
  if (world.stats.cards && rc && !e.fake && !e.guard && (rc.cards = rc.cards || []).length < 3 && Math.random() < (e.boss ? 0.5 : CARD_DROP * (e.elite ? 5 : 1))) {
    const cid = e.boss ? null : e.type;
    if (cid) { rc.cards.push(cid); world.texts.push({ x: e.x, y: e.y - 34, text: 'Carte !', color: '#e7d3a1', size: 16, life: 1.2 }); sfx(world, 'gold'); }
  }
  const pal = { vein: ['#ffd246', '#8c8f86', '#fff3a8'], goblin: ['#6fae4c', '#ffd246', '#4a7d34'], mimic: ['#9a6238', '#ffd246', '#8a1e2a'], wisp: ['#ff9a3c', '#ffe682', '#e65032'], golem: ['#be7850', '#8c5238', '#6a3a24'], wind: ['#e6f7fb', '#8ed2e6', '#ffffff'] }[e.type] || ['#ff5a2a', '#ffb040', '#fff0b0'];
  burst(world, e.x, e.y, e.boss ? 70 : e.gold ? 30 : 14, e.gold ? ['#ffd246', '#fff096', '#ffffff'] : pal, e.boss ? 320 : 150, 2, 0, e.boss ? 1.1 : 0.55);
  if (onScreen(world, e.x, e.y)) { sfx(world, e.boss ? 'boss' : e.gold ? 'gold' : 'pop'); shake(world, e.boss ? 14 : e.type === 'golem' ? 3 : 1.5); }
  const n = e.boss ? 60 : Math.min(e.gold ? 12 : 6, 1 + Math.ceil(Math.log2(1 + e.value / 3)));
  if (e.boss) {
    const r = world.run;
    r.bossKilled = true;
    if (r.arena) { r.arena.won = true; r.arena.loot = ARENA.lootTime; r.attraction = world.stats.attraction; world.hazards = []; for (const m of world.enemies) if (!m.boss && !m.dead) { m.dead = true; burst(world, m.x, m.y, 8, pal, 120, 2, 0, 0.4); } }
    world.events.push({ kind: 'boss', name: e.def.name });
    world.slowT = 1.1; // ralenti au coup de grâce
    world.events.push({ kind: 'flash' });
    world.events.push({ kind: 'banner', big: true, title: e.def.name + ' vaincu !', sub: 'Rafle le butin avant que le portail ne se referme' });
    world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 5, t: 0.8, life: 0.8, color: '#ffd246' });
  }
  if (e.event && e.value > 0) {
    world.texts.push({ x: e.x, y: e.y - 34, text: e.wanted ? 'Prime : +' + Math.round(e.value) : { vein: 'Filon épuisé !', goblin: 'Gobelin attrapé !', mimic: 'Trésor !', treasure: 'Gobelin vidé !' }[e.type] || 'Trésor !', color: '#ffd246', size: 18, life: 1.4 }); 
    shake(world, 5);
  }
  const rr = world.run;
  if (rr && rr.mirage > 0 && !e.event && world.pointer.inside) { const pw = pointerWorld(world); if (d2(pw, e) < 150 * 150) { e.value *= 3; world.texts.push({ x: e.x, y: e.y - 26, text: '×3', color: '#ffe14a', size: 16, life: 0.8 }); } }
  if (world.stats.crownChance && !e.event && !e.boss && Math.random() < world.stats.crownChance) {
    const v = Math.max(100, e.value * 25); world.coins.push({ x: e.x, y: e.y, vx: rnd(-30, 30), vy: rnd(-30, 30), kind: 'crown', value: v, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: 300, spin: 0 });
    world.texts.push({ x: e.x, y: e.y - 30, text: 'Couronne !', color: '#ffd246', size: 17, life: 1.2 });
  }
  const my = world.stats.myths || {};
  if (my.midas && !e.boss && !e.event && Math.random() < 0.05) {
    e.value *= 5; world.texts.push({ x: e.x, y: e.y - 30, text: 'Midas !', color: '#ffd246', size: 18, life: 1 });
  }
  const pieces = e.boss ? splitLoot(e.value, n, 3, 30) : e.event ? (e.value > 0.5 ? splitLoot(e.value, 14, 2, 14) : []) : e.gold ? splitLoot(e.value, n, 1, 8) : splitLoot(e.value, n, 3, 12);
  for (const pc of pieces) {
    const a = rnd(0, Math.PI * 2), s = e.boss ? rnd(50, 190) : rnd(30, 110);
    world.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: pc.kind,
      value: pc.value, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: rnd(160, 300), spin: rnd(0, 6) });
  }
  world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 2.2, t: 0.35, life: 0.35, color: e.def.color });
  maybePouch(world, e);
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
  if (value - into > 0) { const rate = s.overflowRate || OVERFLOW_RATE, v = (value - into) * rate; r.overflow += v; r.lost = (r.lost || 0) + (value - into) * (1 - rate); world.events.push({ kind: 'coins', value: v }); }
  const after = tierOf(r.bag, s);
  if (after > before) { shake(world, 6); sfx(world, 'tier'); burst(world, world.mapW / 2, world.mapH / 2 - 30, 40, [TIERS[after].glow, TIERS[after].color, '#ffffff'], 220, 2, 0, 0.9); }
  if (after > before) world.events.push({ kind: 'banner', title: TIERS[after].name + ' !', sub: `Déchirure ×${String(TIERS[after].mult).replace('.', ',')}` });
  // Vague aspirante : à chaque palier, tout le butin à l'écran file vers le sac
  if (after > before && s.suction) for (const c of world.coins) if (!c.fly && !c.item && onScreen(world, c.x, c.y, 0)) { c.fly = true; c.sp = 200; }
  if (r.bag >= max && !r.full) {
    r.full = true;
    world.events.push({ kind: 'banner', title: 'Sac plein !', sub: 'Bonus +25 % à la Déchirure. Le surplus déborde : seule 1 pièce sur 10 est sauvée.' });
  }
}

export function update(world, dt) {
  if (world.slowT > 0) { world.slowT -= dt; dt *= world.slowT > 0.3 ? 0.25 : 0.6; }
  world.t += dt;
  for (const f of world.fx) f.t -= dt;
  if (world.deaths) { for (const d of world.deaths) d.t -= dt; world.deaths = world.deaths.filter(d => d.t > 0); }
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
  if (world.phase === 'done') {
    const r = world.run;
    if (r && world.mode !== 'arena') {
      r.doneT = (r.doneT || 0) + dt;
      const b = bagPos(world), k = Math.min(1, dt * 3);
      world.cam.x += (b.x - world.w * 0.3 - world.cam.x) * k; world.cam.y += (b.y - world.h * 0.5 - world.cam.y) * k; clampCam(world);
    }
    return;
  }
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
    updateHelpers(world, dt);
    updateHeroes(world, dt);
    updateArrows(world, dt);
    if (r.t >= r.duration) { r.t = r.duration; startTear(world); }
  } else if (world.phase === 'tear') {
    const b = bagPos(world), k = Math.min(1, dt * 4);
    world.cam.x += (b.x - world.w / 2 - world.cam.x) * k; world.cam.y += (b.y - world.h / 2 - world.cam.y) * k; clampCam(world);
    if (r.shake > 0) {
      r.shake -= dt; r.climbAge += dt;
      climbTier(world, dt);
      if (r.shake <= 0) burstBag(world);
    } else {
      r.tearT -= dt;
      if (r.waves && r.waves.length) { r.waveT += dt; tearWave(world); }
      updateRelics(world, dt);
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
  const st = world.stats || {};
  const taunts = st.taunt ? world.heroes.filter(u => u.type === 'knight' && u.drop <= 0) : [];
  const lament = st.lament || 0, auraBards = lament ? world.heroes.filter(u => u.type === 'bard' && u.drop <= 0) : [], aura2 = (st.bardAura || 0) ** 2;
  for (const e of world.enemies) {
    e.ph += dt * 3; e.age += dt; e.hit -= dt; e.slow = Math.max(0, e.slow - dt);
    if (e.atk > 0) e.atk -= dt;
    if (e.pack && e.pack.n > 1) {
      // cohésion vers le centre + cap commun
      const p = e.pack, dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, pull = Math.max(0, Math.min(1, (d - 20 - p.n * 3) / (40 + p.n * 4)));
      const tx = Math.cos(p.a) + dx / d * pull * 1.5, ty = Math.sin(p.a) + dy / d * pull * 1.5;
      e.a = Math.atan2(ty, tx) + rnd(-0.4, 0.4);
    } else e.a += rnd(-1, 1) * dt * 1.2;
    if (e.burn > 0) {
      e.burn -= dt; e.burnT = (e.burnT || 0) - dt;
      if (e.burnT <= 0) { e.burnT = 0.5; damage(world, e, (e.burnDps || 1) * 0.5, 0, null, 'mage'); if (Math.random() < 0.5) burst(world, e.x, e.y - 6, 2, ['#ff7a3c', '#ffd246'], 40, 1, 0, 0.3); }
      if (e.dead) continue;
    }
    if (e.fall > 0) { e.fall -= dt; if (e.fall <= 0) { burst(world, e.x, e.y, 8, ['#e8d8b0', '#ffffff'], 100, 2, 0, 0.4); world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: 4, r1: 30, t: 0.3, life: 0.3, color: '#fff6dc' }); } continue; }
    if (e.rush) { e.x += e.rush.vx * dt * (e.slow > 0 ? 0.5 : 1); e.y += Math.sin(e.age * 4) * 20 * dt; continue; }
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.def.puffer && e.base) { const g = 1 + Math.min(3, e.age / 8); e.value = e.base * g; e.r = e.def.radius * (1 + (g - 1) * 0.35); }
    if (e.def.healer) {
      e.healT = (e.healT || 0) - dt;
      if (e.healT <= 0) { e.healT = 1; for (const o of world.enemies) if (!o.dead && o !== e && !o.boss && o.hp < o.max && d2(o, e) < 90 * 90) { o.hp = Math.min(o.max, o.hp + o.max * 0.08); world.fx.push({ kind: 'ring', x: o.x, y: o.y, r0: 4, r1: 18, t: 0.3, life: 0.3, color: '#80ff90' }); } }
    }
    if (e.def.bandit) for (const c of world.coins) if (!c.fly && !c.item && !c.dead && !c.air && d2(c, e) < 28 * 28) { c.dead = true; e.value += c.value; e.stole = true; }
    if (e.def.mvp) {
      e.life = (e.life || 20) - dt;
      if (e.life <= 0) { e.dead = true; world.texts.push({ x: e.x, y: e.y - 24, text: 'Le lapin s\'est enfui…', color: '#e8e0d0', size: 14, life: 1.4 }); continue; }
      let near = null, nd = 260 * 260; for (const u of world.heroes) { if (u.drop > 0) continue; const d = d2(u, e); if (d < nd) { nd = d; near = u; } }
      if (near) e.a = Math.atan2(e.y - near.y, e.x - near.x) + Math.sin(e.age * 3) * 0.5;
    }
    if (e.event && moveEventFoe(world, e, dt)) continue;
    if (taunts.length && !e.boss) { for (const k of taunts) if (d2(k, e) < 170 * 170) { e.a = Math.atan2(k.y - e.y, k.x - e.x) + rnd(-0.3, 0.3); break; } }
    let sp = e.def.speed * (0.55 + 0.45 * Math.max(0, Math.sin(e.ph))) * ((world.stage && world.stage.mods.speed) || 1);
    if (e.gold) sp *= GOLD_WISP.speed;
    if (e.slow > 0) sp *= 1 - HEROES.mage.slow;
    if (lament && auraBards.some(b => d2(b, e) < aura2)) sp *= 1 - lament;
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
  if (e.wanted) return false;
  if (e.type === 'vein' || (e.type === 'mimic' && !e.awake)) { e.kx = e.ky = 0; return true; }
  let near = null, nd = Infinity;
  for (const u of world.heroes) { if (u.drop > 0) continue; const d = d2(u, e); if (d < nd) { nd = d; near = u; } }
  const slow = e.slow > 0 ? 1 - HEROES.mage.slow : 1;
  if (e.type === 'goblin' || e.type === 'treasure') {
    if (near && nd < 260 * 260) e.a = Math.atan2(e.y - near.y, e.x - near.x) + Math.sin(e.age * 3) * 0.6;
    else e.a += rnd(-1, 1) * dt * 2;
    const sp = e.def.speed * slow * (world.stats.goblinSpeed || 1);
    e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt;
  } else if (e.type === 'mimic' && near) {
    const d = Math.sqrt(nd) || 1, sp = 95 * slow;
    if (d > 22) { e.x += (near.x - e.x) / d * sp * dt; e.y += (near.y - e.y) / d * sp * dt; }
    e.bite = (e.bite || 0) - dt;
    if (d < 30 && e.bite <= 0) {
      e.bite = world.stats.mimicTame ? 2.8 : 1.4; stunHero(world, near, 1.1);
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
  const s = world.stats, r = world.run, has = s.has || {};
  const bards = world.heroes.filter(u => u.type === 'bard' && u.drop <= 0);
  const focus = focusActive(world), fp = focus ? pointerWorld(world) : null;
  // ultimes : la jauge se remplit pendant l'expédition
  if (r && r.ult && world.phase === 'expedition') for (const k of HERO_ORDER) if (s.ults && s.ults[k]) r.ult[k] = Math.min(1, r.ult[k] + dt / (s.ultCd || 30));
  if (r && r.hymnT > 0) r.hymnT -= dt;
  // renforts à mi-expédition
  if (r && s.reinforce && !r.reinforced && world.mode === 'map' && r.t >= r.duration / 2) {
    r.reinforced = true;
    const k = HERO_ORDER.find(t => s.heroes[t] > 0) || 'archer';
    r.toDrop[r.sel && s.heroes[r.sel] > 0 ? r.sel : k] += s.reinforce;
    world.events.push({ kind: 'banner', title: 'Renforts !', sub: `+${s.reinforce} héros à larguer` });
    world.events.push({ kind: 'reinforce' });
  }
  let boosted = 0;
  for (const u of world.heroes) {
    if (u.drop > 0) {
      u.drop -= dt * 3;
      if (u.drop <= 0) {
        u.drop = 0; world.fx.push({ kind: 'ring', x: u.x, y: u.y + 10, r0: 6, r1: 34, t: 0.4, life: 0.4, color: '#fff6dc' });
        burst(world, u.x, u.y + 10, 12, ['#e8d8b0', '#c9b48e', '#ffffff'], 110, 2, 0, 0.45);
        shake(world, 3); sfx(world, 'land');
        landing(world, u);
      }
      continue;
    }
    if (u.dash) { dashStep(world, u, dt); continue; }
    if (u.stun > 0) { u.stun -= dt; u.moving = false; u.recoil = 0; continue; }
    const def = HEROES[u.type];
    if (u.fury > 0) u.fury -= dt;
    // chanson du barde : les autres héros à portée agissent plus vite
    u.boost = bards.some(b => b !== u && d2(b, u) < s.bardAura * s.bardAura) ? s.bardBoost : 0;
    if (u.boost > 0) boosted++;
    let speed = 1 + u.boost;
    if (s.opening && r && r.t < 3) speed *= 2;
    if (r && r.hymnT > 0) speed *= 2;
    if (u.type === 'knight' && has.knB) { u.rage = Math.max(0, (u.rage || 0) - dt * 0.15); speed *= 1 + u.rage; }
    u.bob += dt * 3; u.cd -= dt * speed;
    u.recoil = Math.max(0, (u.recoil || 0) - dt * 6);
    if (u.boost > 0 && Math.random() < dt * 0.8) world.texts.push({ x: u.x + rnd(-8, 8), y: u.y - 34, text: '♪', color: '#ffe68a', size: 14, life: 0.7 });
    classTick(world, u, dt);
    // ingénieur : pose une tourelle de temps en temps
    if (u.type === 'engineer' && world.phase === 'expedition') {
      u.turretT = (u.turretT === undefined ? 2 : u.turretT) - dt;
      if (u.turretT <= 0) {
        u.turretT = def.turretEvery;
        if (world.zones.filter(z => z.turret).length < (s.turrets || 2)) {
          world.zones.push({ turret: true, x: u.x + u.face * 26, y: u.y + 4, r: 0, t: 25, cd: 0.5, dmg: s.damage.engineer * 0.6, type: 'engineer', face: u.face });
          burst(world, u.x + u.face * 26, u.y + 8, 10, ['#e0a040', '#b8c0c8', '#ffffff'], 90, 2, 0, 0.4);
        }
      }
    }
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
    const reach = def.range * ((s.range && s.range[u.type]) || 1) + (def.shot === 'melee' ? t.r : 0);
    const walk = def.walkSpeed * (world.stage && world.stage.id === 'neige' && !s.furBoots ? 0.8 : 1);
    // Maître archer / Chasseur de primes : vise l'ennemi le plus riche à portée
    if (u.type === 'archer' && s.master && !focus) { const rich = richestInRange(world, u, reach); if (rich) t = rich; }
    const dist = Math.sqrt(d2(u, t));
    u.face = t.x >= u.x ? 1 : -1;
    if (dist > reach) {
      u.x += (t.x - u.x) / dist * walk * dt;
      u.y += (t.y - u.y) / dist * walk * dt;
      u.moving = true; u.aiming = false;
    } else {
      u.moving = false; u.aiming = true;
      if (u.cd > 0) continue;
      u.cd = s.cooldown[u.type];
      u.recoil = 1;
      const dmg = s.damage[u.type] * (u.fury > 0 ? 2 : 1);
      if (onScreen(world, u.x, u.y)) sfx(world, def.shot === 'melee' ? 'slash' : { vines: 'frost', bolt: 'arrow', flask: 'frost', spirit: 'note' }[def.shot] || def.shot);
      if (def.shot === 'vines') {   // druide : ronces qui immobilisent et blessent
        world.zones.push({ x: t.x, y: t.y, r: 46, t: 2.5, root: true, dps: dmg, type: u.type, look: 'vines' });
        world.fx.push({ kind: 'ring', x: t.x, y: t.y, r0: 6, r1: 46, t: 0.3, life: 0.3, color: '#6fd08a' });
        continue;
      }
      if (def.shot === 'flask') {   // alchimiste : fiole en cloche, explosion et flaque acide
        world.strikes.push({ kind: 'flask', x: t.x, y: t.y, x0: u.x + u.face * 10, y0: u.y - 16, r: def.aoe, t: 0.45, t0: 0.45, dmg, type: u.type });
        continue;
      }
      if (def.shot === 'spirit') {   // invocateur : un esprit qui fonce et explose
        world.strikes.push({ kind: 'spirit', x: u.x, y: u.y - 24, vx: u.face * 40, vy: -80, t: 4, dmg, type: u.type, r: 46, target: t });
        continue;
      }
      if (def.shot === 'melee') {
        // coup circulaire : touche la cible et tout ce qui est autour
        for (const e of world.enemies) if (!e.dead && d2(e, t) < (def.cleave * (s.cleave || 1) + e.r) ** 2) damage(world, e, dmg, 0, u, u.type);
        if (def.steal && Math.random() < def.steal && !t.event) { dropCoin(world, t.x, t.y, 'coin', Math.max(0.5, t.value * 0.15)); world.texts.push({ x: t.x, y: t.y - 20, text: 'chipé !', color: '#c8d0dc', size: 11, life: 0.5 }); }
        if (has.knB) u.rage = Math.min(1, (u.rage || 0) + 0.06);
        if (s.myths && s.myths.quake && Math.random() < 0.25) {   // mythique Séisme
          for (const e of world.enemies) if (!e.dead && d2(e, u) < 100 * 100) damage(world, e, dmg * 1.5, 0, u, u.type);
          world.fx.push({ kind: 'ring', x: u.x, y: u.y + 8, r0: 10, r1: 100, t: 0.4, life: 0.4, color: '#ffcf4a' }); shake(world, 3);
        }
        world.fx.push({ kind: 'slash', x: t.x, y: t.y, r0: 8, r1: def.cleave * (s.cleave || 1) + 10, t: 0.22, life: 0.22, color: s.looks && s.looks[u.type] ? `rgb(${s.looks[u.type].col})` : has.knB1 ? '#ffcf4a' : '#f0f4fa', face: u.face });
        if (has.knB1) world.fx.push({ kind: 'ring', x: t.x, y: t.y, r0: 8, r1: def.cleave * (s.cleave || 1) + 16, t: 0.3, life: 0.3, color: '#ffcf4a' });
      } else {
        const fire = u.type === 'mage' && has.maB;
        const shot = (target, k = 1) => world.arrows.push({ kind: fire ? 'fire' : def.shot === 'bolt' ? 'arrow' : def.shot, x: u.x + u.face * (SHOT_FROM[u.type] || [0])[0], y: u.y - (SHOT_FROM[u.type] || [0, 10])[1], target, damage: dmg * k, type: u.type, dx: 0, dy: 0, speed: def.speed,
          aoe: def.shot === 'frost' ? s.mageAoe : 0, slow: def.shot === 'frost' && !fire ? s.slowTime || HEROES.mage.slowTime : 0,
          pierce: u.type === 'archer' ? s.pierce || 0 : u.type === 'engineer' ? 1 : 0, bounces: u.type === 'archer' ? s.bounce || 0 : 0, hit: null });
        shot(t);
        const others = n => { const l = []; for (const e of world.enemies) if (!e.dead && e !== t && d2(e, u) < reach * reach) l.push(e); return l.sort((a, b) => d2(a, t) - d2(b, t)).slice(0, n); };
        if (u.type === 'archer' && has.arA) for (const o of others(2)) shot(o);          // Tireur d'élite : éventail
        if (u.type === 'archer' && s.doubleShot && Math.random() < s.doubleShot) { const o = others(1)[0]; shot(o || t); }
        if (u.type === 'mage' && s.archmage && Math.random() < 1 / 3) { const o = others(1)[0]; shot(o || t); }
        // mythique Écho : une note sur trois est rejouée vers une autre cible
        if (u.type === 'bard' && s.myths && s.myths.echo && Math.random() < 1 / 3) {
          let o = null, bd = reach * reach;
          for (const e of world.enemies) { if (e.dead || e === t) continue; const dd = d2(e, u); if (dd < bd) { bd = dd; o = e; } }
          if (o) world.arrows.push({ kind: 'note', x: u.x, y: u.y - 12, target: o, damage: dmg, type: u.type, dx: 0, dy: 0, speed: def.speed, aoe: 0, slow: 0 });
        }
      }
    }
  }
  if (r && r.cnt && boosted >= 3) r.cnt.auraT += dt;
  updateStrikes(world, dt);
}

// ---------- Assistants ----------
// Lutin : file vers la pièce au sol la plus proche (même hors de l'écran) et l'envoie au sac.
// Pie : survole les hordes et chipe des pièces aux élémentaires.
function updateHelpers(world, dt) {
  const s = world.stats, r = world.run;
  if (world.mode !== 'map') return;
  r.helpers = r.helpers || [];
  const b = bagPos(world);
  if (s.sprite && !r.helpers.some(h => h.kind === 'sprite')) r.helpers.push({ kind: 'sprite', x: b.x, y: b.y - 30, t: 0 });
  if (s.magpie && !r.helpers.some(h => h.kind === 'magpie')) r.helpers.push({ kind: 'magpie', x: b.x + 40, y: b.y - 60, t: 0, a: 0, steal: 0 });
  if (s.pact && !r.helpers.some(h => h.kind === 'hound')) r.helpers.push({ kind: 'hound', x: b.x - 40, y: b.y + 20, t: 0, bite: 0 });
  for (const h of r.helpers) {
    h.t += dt;
    if (h.kind === 'hound') {
      // le chien du pacte court sur l'ennemi le plus proche et le mord
      if (!h.target || h.target.dead) h.target = nearestEnemy(world, h);
      const tg = h.target || { x: b.x - 40, y: b.y + 20 }, dx = tg.x - h.x, dy = tg.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d > 14) { h.x += dx / d * Math.min(d, 170 * dt); h.y += dy / d * Math.min(d, 170 * dt); h.face = dx >= 0 ? 1 : -1; }
      h.bite -= dt;
      if (h.target && d < 24 && h.bite <= 0) { h.bite = 0.6; damage(world, h.target, (s.archerBase || s.damage.archer) * 2.5, 0, h, 'archer'); }
      continue;
    }
    if (h.kind === 'sprite') {
      if (!h.target || h.target.dead || h.target.fly) {
        let best = null, bd = Infinity;
        for (const c of world.coins) { if (c.fly || c.air || c.item) continue; const d = d2(c, h); if (d < bd) { bd = d; best = c; } }
        h.target = best;
      }
      const tg = h.target || { x: b.x, y: b.y - 40 }, dx = tg.x - h.x, dy = tg.y - h.y, d = Math.hypot(dx, dy) || 1, sp = 240 * (s.spriteSpeed || 1);
      if (d > 4) { h.x += dx / d * Math.min(d, sp * dt); h.y += dy / d * Math.min(d, sp * dt); h.face = dx >= 0 ? 1 : -1; }
      if (h.target && d < 16) { h.target.fly = true; h.target.sp = 160; h.target = null; }
    } else if (h.kind === 'magpie') {
      // vole d'une horde à l'autre
      if (!h.goal || h.t > 4 || d2(h, h.goal) < 30 * 30) {
        h.t = 0;
        const l = world.enemies.filter(e => !e.dead && !e.event && !e.boss);
        const e = l[Math.floor(Math.random() * l.length)];
        h.goal = e ? { x: e.x, y: e.y } : { x: b.x + rnd(-300, 300), y: b.y + rnd(-200, 200) };
      }
      const dx = h.goal.x - h.x, dy = h.goal.y - h.y, d = Math.hypot(dx, dy) || 1;
      h.x += dx / d * 200 * dt; h.y += dy / d * 200 * dt; h.face = dx >= 0 ? 1 : -1;
      h.steal -= dt;
      if (h.steal <= 0) {
        const e = world.enemies.find(o => !o.dead && !o.event && !o.boss && d2(o, h) < 40 * 40);
        if (e) {
          h.steal = 0.7;
          const n = 1 + (s.magpieBold || 0), v = Math.max(0.5, e.value * 0.25);
          for (let i = 0; i < n; i++) world.coins.push({ x: h.x, y: h.y, vx: 0, vy: 0, kind: 'coin', value: v, life: 3, max: 3, fly: true, sp: 120, z: 0, spin: 0 });
          world.texts.push({ x: h.x, y: h.y - 16, text: 'chip !', color: '#e8eef8', size: 12, life: 0.6 });
        }
      }
    }
  }
}

function richestInRange(world, u, reach) {
  let best = null, bv = -1;
  for (const e of world.enemies) { if (e.dead || d2(e, u) > reach * reach) continue; const v = e.value / Math.max(1, e.hp); if (v > bv) { bv = v; best = e; } }
  return best;
}

// Atterrissage : onde de choc, sol gelé, fureur.
function landing(world, u) {
  const s = world.stats, dmg = s.damage[u.type] || 1;
  if (s.dropFury) u.fury = 3;
  if (s.shockwave) {
    for (const e of world.enemies) if (!e.dead && d2(e, u) < 100 * 100) damage(world, e, dmg * 2, 0, u, u.type);
    world.fx.push({ kind: 'ring', x: u.x, y: u.y + 10, r0: 10, r1: 100, t: 0.4, life: 0.4, color: '#5fd6c0' }); shake(world, 4);
  }
  if (u.type === 'mage' && s.frostLand) world.zones.push({ x: u.x, y: u.y + 10, r: 90, t: 3, max: 3, dps: 0, slow: 2, type: 'mage', color: '#aee6ff' });
}

// Effets propres aux classes, à chaque instant.
function classTick(world, u, dt) {
  const s = world.stats, has = s.has || {}, dmg = s.damage[u.type] || 1;
  u.timer = (u.timer || 0) + dt;
  if (u.type === 'archer' && has.arB && u.timer >= 4) {        // Rôdeur : piège qui immobilise
    const t = nearestEnemy(world, u);
    if (t && d2(t, u) < 260 * 260) { u.timer = 0; world.zones.push({ x: t.x, y: t.y, r: 55, t: 2.5, max: 2.5, dps: dmg * 0.3, root: true, type: 'archer', color: '#86d873' }); }
  }
  if (u.type === 'mage') {
    if (s.frostNova && (u.nova = (u.nova || 0) - dt) <= 0 && world.enemies.some(e => !e.dead && d2(e, u) < 40 * 40)) {
      u.nova = 4;
      for (const e of world.enemies) if (!e.dead && d2(e, u) < 95 * 95) { e.frozen = Math.max(e.frozen || 0, 1.2); damage(world, e, dmg, 2, u, 'mage'); }
      world.fx.push({ kind: 'ring', x: u.x, y: u.y, r0: 10, r1: 95, t: 0.4, life: 0.4, color: '#aee6ff' });
    }
    if (has.maB2 && u.timer >= 6) {                               // Phénix : traverse l'écran
      const t = nearestEnemy(world, u);
      if (t) { u.timer = 0; const a = Math.atan2(t.y - u.y, t.x - u.x); world.strikes.push({ kind: 'phoenix', x: u.x, y: u.y - 10, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, t: 1.6, dmg: dmg * 4, hit: new Set(), type: 'mage' }); sfx(world, 'fire'); }
    }
  }
  if (u.type === 'knight') {
    if (has.knA1 && u.timer >= 3) {                              // Champion du sac
      u.timer = 0;
      for (const e of world.enemies) if (!e.dead && d2(e, u) < 115 * 115) damage(world, e, dmg * 2, 0, u, 'knight');
      world.fx.push({ kind: 'ring', x: u.x, y: u.y + 6, r0: 10, r1: 115, t: 0.35, life: 0.35, color: '#fff3a8' });
    }
    if (has.knA2 && u.timer >= 0.5) {                            // Templier : aura de lumière
      u.timer = 0;
      for (const e of world.enemies) if (!e.dead && d2(e, u) < 90 * 90) damage(world, e, dmg * 0.3, 0, null, 'knight');
    }
  }
  if (u.type === 'bard' && has.baB1 && u.timer >= 1.5) {           // Héraut des tempêtes : éclairs
    u.timer = 0;
    const l = world.enemies.filter(e => !e.dead && d2(e, u) < (s.bardAura || 150) ** 2 && onScreen(world, e.x, e.y));
    const e = l[Math.floor(Math.random() * l.length)];
    if (e) { world.fx.push({ kind: 'bolt', x: e.x, y: e.y, t: 0.25, life: 0.25, color: '#fff3a8' }); damage(world, e, dmg * 15, 0, null, 'bard'); sfx(world, 'hit', { crit: true }); }
  }
}

// ---------- Ultimes ----------
export function ultReady(world, k) { const r = world.run; return !!(r && r.ult && world.stats.ults && world.stats.ults[k] && r.ult[k] >= 1 && world.phase === 'expedition' && world.heroes.some(u => u.type === k && u.drop <= 0)); }
function ultTarget(world) {
  if (world.pointer.inside) return pointerWorld(world);
  // groupe le plus dense à l'écran
  let best = null, bn = -1;
  const vis = world.enemies.filter(e => !e.dead && onScreen(world, e.x, e.y, 0));
  for (let i = 0; i < Math.min(30, vis.length); i++) {
    const e = vis[Math.floor(Math.random() * vis.length)];
    let n = 0; for (const o of vis) if (d2(o, e) < 110 * 110) n++;
    if (n > bn) { bn = n; best = e; }
  }
  return best ? { x: best.x, y: best.y } : { x: world.cam.x + world.w / 2, y: world.cam.y + world.h / 2 };
}
export function useUlt(world, k) {
  if (!ultReady(world, k)) return false;
  const r = world.run, s = world.stats, tg = ultTarget(world), dmg = s.damage[k] || 1;
  r.ult[k] = 0;
  const name = ULTS[k].name;
  world.events.push({ kind: 'banner', title: name + ' !', sub: '' });
  sfx(world, 'tier'); shake(world, 6);
  if (k === 'archer') {
    for (let i = 0; i < (s.rainN || 16); i++) {
      const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * 120;
      world.strikes.push({ kind: 'arrowRain', x: tg.x + Math.cos(a) * d, y: tg.y + Math.sin(a) * d * 0.8, t: 0.35 + i * 0.05, max: 0.35 + i * 0.05, r: 34, dmg: dmg * 2.5, type: 'archer' });
    }
  } else if (k === 'mage') {
    const m = world.heroes.find(u => u.type === 'mage' && u.drop <= 0);
    const a = Math.atan2(tg.y - m.y, tg.x - m.x), L = 950, ex = m.x + Math.cos(a) * L, ey = m.y + Math.sin(a) * L;
    world.fx.push({ kind: 'ray', x: m.x, y: m.y - 12, x2: ex, y2: ey, t: 0.6, life: 0.6, color: '#aee6ff' });
    for (const e of world.enemies) {
      if (e.dead) continue;
      const px = e.x - m.x, py = e.y - m.y, along = px * Math.cos(a) + py * Math.sin(a), off = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
      if (along < 0 || along > L || off > 36 + e.r) continue;
      if (!e.boss) e.frozen = Math.max(e.frozen || 0, 2.5);
      damage(world, e, dmg * 10 + (s.winter && !e.boss ? e.hp * s.winter : 0), 3, m, 'mage');
    }
  } else if (k === 'knight') {
    for (const u of world.heroes) {
      if (u.type !== 'knight' || u.drop > 0) continue;
      const a = Math.atan2(tg.y - u.y, tg.x - u.x), T = 0.45;
      u.dash = { vx: Math.cos(a) * (s.chargeLen || 260) / T, vy: Math.sin(a) * (s.chargeLen || 260) / T, t: T, hit: new Set() };
      u.face = Math.cos(a) >= 0 ? 1 : -1; u.stun = 0;
    }
  } else if (k === 'bard') {
    r.hymnT = s.hymnTime || 3;
    for (const u of world.heroes) if (u.drop <= 0) world.fx.push({ kind: 'ring', x: u.x, y: u.y, r0: 6, r1: 50, t: 0.5, life: 0.5, color: '#ffe68a' });
    if (s.has && s.has.baA1) { const v = Math.max(20, bagMax(s) * 0.06 * world.zone.valueMult); r.rain = { t: r.hymnT, left: v, rate: v / r.hymnT }; }
  }
  return true;
}
function dashStep(world, u, dt) {
  const d = u.dash, s = world.stats, dmg = (s.damage.knight || 6) * 6;
  u.x += d.vx * dt; u.y += d.vy * dt; d.t -= dt; u.moving = true; u.recoil = 0;
  u.x = Math.max(20, Math.min(world.mapW - 20, u.x)); u.y = Math.max(20, Math.min(world.mapH - 20, u.y));
  if (Math.random() < 0.6) burst(world, u.x, u.y + 8, 2, ['#e8d8b0', '#ffffff'], 60, 2, 0, 0.3);
  for (const e of world.enemies) {
    if (e.dead || d.hit.has(e) || d2(e, u) > (44 + e.r) ** 2) continue;
    d.hit.add(e);
    damage(world, e, dmg, 0, u, 'knight');
    if (!e.boss && !e.def.still) { e.kx = (e.kx || 0) + d.vx * 0.6; e.ky = (e.ky || 0) + d.vy * 0.6; }
  }
  if (d.t <= 0) { u.dash = null; shake(world, 4); world.fx.push({ kind: 'ring', x: u.x, y: u.y + 8, r0: 8, r1: 70, t: 0.35, life: 0.35, color: '#c3cede' }); }
}

// Frappes différées (pluie de flèches, phénix) et zones alliées (pièges, givre, flammes).
function updateStrikes(world, dt) {
  for (const k of world.strikes) {
    if (k.kind === 'spirit') {
      k.t -= dt;
      if (!k.target || k.target.dead) k.target = nearestEnemy(world, k);
      if (k.target) {
        const dx = k.target.x - k.x, dy = k.target.y - k.y, d = Math.hypot(dx, dy) || 1;
        k.vx += dx / d * 900 * dt; k.vy += dy / d * 900 * dt;
        const sp = Math.hypot(k.vx, k.vy); if (sp > 320) { k.vx *= 320 / sp; k.vy *= 320 / sp; }
        if (d < k.target.r + 10) k.t = 0;
      }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (Math.random() < 0.5) burst(world, k.x, k.y, 1, ['#d080ff', '#f0d0ff'], 30, 2, 0, 0.4);
      if (k.t <= 0) {
        k.done = true;
        for (const e of world.enemies) if (!e.dead && d2(e, k) < (k.r + e.r) ** 2) damage(world, e, k.dmg, 0, k, k.type);
        burst(world, k.x, k.y, 18, ['#d080ff', '#f0d0ff', '#ffffff'], 160, 2, 0, 0.5);
        world.fx.push({ kind: 'ring', x: k.x, y: k.y, r0: 6, r1: k.r, t: 0.3, life: 0.3, color: '#d080ff' });
      }
      continue;
    }
    if (k.kind === 'flask') {
      k.t -= dt;
      if (k.t > 0) continue;
      k.done = true;
      for (const e of world.enemies) if (!e.dead && d2(e, k) < (k.r + e.r) ** 2) damage(world, e, k.dmg, 0, k, k.type);
      world.zones.push({ x: k.x, y: k.y, r: k.r * 0.8, t: 2.5, burn: true, dps: k.dmg * 0.3, type: k.type, look: 'acid' });
      burst(world, k.x, k.y, 16, ['#d0f060', '#8ac030', '#ffffff'], 140, 2, 0, 0.45);
      if (Math.random() < 0.4) sfx(world, 'hit');
      continue;
    }
    if (k.kind === 'phoenix') {
      k.x += k.vx * dt; k.y += k.vy * dt; k.t -= dt;
      burst(world, k.x, k.y, 2, ['#ff7a3c', '#ffd246', '#ff5a2a'], 60, 2, 0, 0.4);
      for (const e of world.enemies) if (!e.dead && !k.hit.has(e) && d2(e, k) < (30 + e.r) ** 2) { k.hit.add(e); e.burn = 2; e.burnDps = k.dmg * 0.25; damage(world, e, k.dmg, 0, k, 'mage'); }
      if (k.t <= 0) k.done = true;
      continue;
    }
    k.t -= dt;
    if (k.t > 0) continue;
    k.done = true;
    for (const e of world.enemies) if (!e.dead && d2(e, k) < (k.r + e.r) ** 2) damage(world, e, k.dmg, 0, k, k.type);
    burst(world, k.x, k.y, 6, ['#e8d8b0', '#ffffff', '#ef6f52'], 90, 2, 0, 0.35);
    if (Math.random() < 0.3) sfx(world, 'hit');
  }
  world.strikes = world.strikes.filter(k => !k.done);
  for (const z of world.zones) {
    if (z.turret) {   // tourelle de l'ingénieur
      z.t -= dt; z.cd -= dt;
      if (z.cd <= 0) {
        const e = nearestEnemy(world, z);
        if (e && d2(e, z) < 240 * 240) {
          z.cd = 0.7; z.face = e.x >= z.x ? 1 : -1;
          world.arrows.push({ kind: 'arrow', x: z.x + z.face * 8, y: z.y - 16, target: e, damage: z.dmg, type: 'engineer', dx: 0, dy: 0, speed: 700, aoe: 0, slow: 0, pierce: 0, bounces: 0, hit: null });
        } else z.cd = 0.3;
      }
      continue;
    }
    z.t -= dt; z.tick = (z.tick || 0) - dt;
    const tick = z.tick <= 0; if (tick) z.tick = 0.5;
    for (const e of world.enemies) {
      if (e.dead || d2(e, z) > (z.r + e.r) ** 2) continue;
      if (z.slow) e.slow = Math.max(e.slow, 0.3);
      if (z.root && !e.boss) e.frozen = Math.max(e.frozen || 0, 0.3);
      if (z.burn) { e.burn = Math.max(e.burn || 0, 1.5); e.burnDps = z.dps; }
      else if (tick && z.dps) damage(world, e, z.dps * 0.5, 0, null, z.type);
    }
  }
  world.zones = world.zones.filter(z => z.t > 0);
}

// D'où part le tir sur le dessin (décalage vers l'avant, hauteur) : arc, pointe du bâton, luth.
const SHOT_FROM = { archer: [14, 6], mage: [22, 8], bard: [10, 4] };

function updateArrows(world, dt) {
  const s = world.stats, has = s.has || {};
  const extra = [];
  for (const a of world.arrows) {
    const t = a.target;
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
    a.dx = dx / d; a.dy = dy / d;
    a.x += a.dx * a.speed * dt; a.y += a.dy * a.speed * dt;
    if (t.dead) a.done = true;
    else if (d < t.r) {
      a.done = true;
      if (a.aoe) {
        const fire = a.kind === 'fire';
        for (const e of world.enemies) if (!e.dead && d2(e, t) < (a.aoe + e.r) ** 2) {
          if (fire) { e.burn = Math.max(e.burn || 0, 2); e.burnDps = a.damage * 0.5; }
          damage(world, e, a.damage, a.slow, t, a.type);
        }
        const col = fire ? ['#ff7a3c', '#ffd246', '#ff5a2a'] : ['#aee6ff', '#f0fbff', '#5a8cdc'];
        burst(world, t.x, t.y, 10, col, 120, 2, 0, 0.4);
        world.fx.push({ kind: 'ring', x: t.x, y: t.y, r0: 6, r1: a.aoe, t: 0.35, life: 0.35, color: col[0] });
        if (a.small) continue;
        if (fire) world.zones.push({ x: t.x, y: t.y, r: a.aoe * 0.9, t: 2, max: 2, dps: a.damage * 0.5, burn: true, type: 'mage', color: '#ff7a3c' });
        if (has.maA) world.zones.push({ x: t.x, y: t.y, r: a.aoe * 1.1, t: 2, max: 2, dps: a.damage * 0.4, slow: 1, type: 'mage', color: '#d8f4ff' });
        if (has.maA1) world.zones.push({ x: t.x, y: t.y, r: a.aoe * 1.6, t: 3, max: 3, dps: 0, slow: 2, type: 'mage', color: '#aee6ff' });
        // Éclats multiples : de petits éclats repartent vers les voisins
        if (s.shards) {
          const near = world.enemies.filter(e => !e.dead && e !== t && d2(e, t) < 160 * 160).sort(() => Math.random() - 0.5).slice(0, s.shards);
          for (const e of near) extra.push({ kind: a.kind, small: true, x: t.x, y: t.y, target: e, damage: a.damage * 0.4, type: a.type, dx: 0, dy: 0, speed: 380, aoe: a.aoe * 0.45, slow: a.slow });
        }
      } else {
        damage(world, t, a.damage, 0, { x: t.x - a.dx, y: t.y - a.dy }, a.type);
        if (a.kind !== 'arrow') continue;
        // perçante : la flèche continue droit devant ; rebondissante (ou mythique Ricochet) : elle repart vers un voisin
        const hit = a.hit || new Set(); hit.add(t);
        let next = null;
        if (a.pierce > 0) {
          let bd = 240 * 240;
          for (const e of world.enemies) { if (e.dead || hit.has(e)) continue; const ex = e.x - t.x, ey = e.y - t.y, dd = ex * ex + ey * ey; if (dd < bd && (ex * a.dx + ey * a.dy) / (Math.sqrt(dd) || 1) > 0.6) { bd = dd; next = e; } }
          if (next) extra.push({ ...a, x: t.x, y: t.y, target: next, pierce: a.pierce - 1, hit, done: false });
        }
        const myth = !a.bounced && s.myths && s.myths.bounce;
        if (!next && (a.bounces > 0 || myth)) {
          let bd = 200 * 200;
          for (const e of world.enemies) { if (e.dead || hit.has(e)) continue; const dd = d2(e, t); if (dd < bd) { bd = dd; next = e; } }
          if (next) extra.push({ ...a, x: t.x, y: t.y, target: next, bounces: a.bounces > 0 ? a.bounces - 1 : 0, bounced: true, hit, done: false });
        }
      }
    }
  }
  world.arrows = world.arrows.filter(a => !a.done).concat(extra);
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
      if (d < 14) { c.dead = true; if (c.item) gotItem(world, c.item); else credit(world, c.value * (c.kind === 'gem' ? world.stats.gemMult || 1 : 1)); }
      continue;
    }
    if (c.beam > 0) c.beam = Math.max(0, c.beam - dt);
    if (c.item) { c.auto -= dt; if (c.auto <= 0 && c.z <= 0) { c.fly = true; c.sp = 80; } }
    c.x += c.vx * dt; c.y += c.vy * dt;
    const fr = Math.pow(0.04, dt); c.vx *= fr; c.vy *= fr;
    if (c.vz !== undefined) { c.vz -= 900 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.vz = Math.abs(c.vz) > 60 ? -c.vz * 0.45 : 0; } }
    if (c.air && c.z <= 0 && c.vz === 0) { c.air = false; if (c.value >= 5) burst(world, c.x, c.y, 3, ['#fff5b4', '#ffffff'], 50, 1, 0, 0.3); }
    if (world.phase === 'tear') c.vy += 16 * dt;
    c.life -= dt;
    if (c.life <= 0) { c.dead = true; continue; }
    const fresh = c.life < c.max - 0.15 && !c.air;
    c.near = false;
    if (fresh && inside) {
      const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2, nr = gr * 1.7, pull = world.stats.pull || 70;
      if (dd < nr * nr) { c.near = true; const d = Math.sqrt(dd) || 1; c.x += (p.x - c.x) / d * pull * dt; c.y += (p.y - c.y) / d * pull * dt; }
      else if (world.stats.magnet && dd < (gr * 4) ** 2) { const d = Math.sqrt(dd) || 1; c.x += (p.x - c.x) / d * world.stats.magnet * dt; c.y += (p.y - c.y) / d * world.stats.magnet * dt; }
    }
    if (fresh && inside && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < gr * gr) {
      c.fly = true; c.sp = 120;
      if (c.value >= 4.5) world.texts.push({ x: c.x, y: c.y - 14, text: '+' + Math.round(c.value * (world.phase === 'tear' ? 1 : 1)), color: c.kind === 'gem' ? '#8ff0ff' : '#ffd246',
        size: c.value >= 90 ? 22 : c.value >= 20 ? 18 : 15, life: 0.9, dmg: true, vy: -60, pop: 0 });
      const cb = world.combo; cb.n = cb.t > 0 ? cb.n + 1 : 1; cb.t = 1.1;
      sfx(world, 'coin', { n: cb.n });
      burst(world, c.x, c.y, 3, ['#fff5b4', '#ffcd3c'], 60, 1, 0, 0.3);
    }
    else if (fresh && mouth && d2(c, bag) < mouth * mouth && (world.stats.deepMouth || (c.kind !== 'gem' && c.kind !== 'crown'))) { c.fly = true; c.sp = 60; }
  }
  world.coins = world.coins.filter(c => !c.dead);
}

function credit(world, value) {
  if (world.mode === 'arena') { world.run.lair.got += value; world.events.push({ kind: 'coins', value }); }
  else if (world.phase === 'tear') { if (world.stats.fairy) value *= 2; world.run.tearGot += value; world.events.push({ kind: 'coins', value }); }
  else addToBag(world, value);
}

function startTear(world) {
  const r = world.run;
  world.phase = 'tear';
  for (const e of world.enemies) world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 1.6, t: 0.4, life: 0.4, color: e.def.color });
  world.enemies = []; world.arrows = [];
  keepPouches(world);
  for (const c of world.coins) if (c.fly && !c.dead) addToBag(world, c.value);
  world.coins = [];
  r.tier = tierOf(r.bag, world.stats);
  r.mult = TIERS[r.tier].mult * (r.full ? FULL_BONUS : 1);
  r.tearTotal = r.bag * r.mult * (world.stats.tearMult || 1) + (world.stats.tripleBottom ? (r.lost || 0) * 0.5 : 0);
  // Le sac « monte » de palier en palier sous les yeux du joueur avant de céder.
  r.climb = 0; r.climbT = 0.75; r.climbAge = 0;
  r.shake = 1.1 + 0.6 * r.tier;
  world.events.push({ kind: 'tear', dur: r.shake });
  sfx(world, 'rumble');
}

function climbTier(world, dt) {
  const r = world.run;
  r.climbT -= dt;
  if (r.climbT > 0 || r.climb >= r.tier) return;
  r.climb++; r.climbT = 0.6; r.climbAge = 0;
  const b = bagPos(world), tier = TIERS[r.climb];
  world.fx.push({ kind: 'ring', x: b.x, y: b.y - 10, r0: 20, r1: 110, t: 0.45, life: 0.45, color: tier.glow });
  burst(world, b.x, b.y - 10, 30, [tier.color, tier.glow, '#ffffff'], 260, 3, 0, 0.6);
  shake(world, 6); sfx(world, 'climb', { n: r.climb });
  world.events.push({ kind: 'tierUp', tier: r.climb });
}

function burstBag(world) {
  const r = world.run, s = world.stats;
  // secret « Doigts de fée » : le gant posé sur le sac à l'instant où il se déchire
  if (!s.fairy && world.pointer.inside) { const p = pointerWorld(world), b0 = bagPos(world); if ((p.x - b0.x) ** 2 + (p.y - b0.y) ** 2 < 50 * 50) world.events.push({ kind: 'secret', id: 'fairyFingers' }); }
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
  if (total > 0) spawnRelics(world, total);
  world.fx.push({ kind: 'ring', x: b.x, y: b.y - 20, r0: 10, r1: Math.max(world.w, world.h) * 0.6, t: 0.7, life: 0.7, color: TIERS[r.tier].glow });
  burst(world, b.x, b.y - 20, 60, [TIERS[r.tier].color, TIERS[r.tier].seam, TIERS[r.tier].glow], 420, 3, 0, 1);
  shake(world, 14); sfx(world, 'burst');
  world.events.push({ kind: 'burst', title: total > 0 ? 'Rafle tout !' : 'Le sac était vide…', sub: total > 0 ? 'Passe le gant sur les pièces pour les attraper' : '' });
}

// Trésors : quelques objets rares jaillissent du sac et flottent au-dessus, à attraper au survol.
export const RARITIES = [
  { id: 'rare', name: 'Rare', color: '#6fb7ff', share: 0.04 },
  { id: 'epique', name: 'Épique', color: '#c08bff', share: 0.07 },
  { id: 'legend', name: 'Légendaire', color: '#ffb43c', share: 0.12 },
];
const RELIC_NAMES = { bar: ['Lingot du mage', 'Barre d\'orichalque', 'Lingot runique'], gem: ['Larme d\'étoile', 'Œil de givre', 'Cœur d\'ambre'], crown: ['Couronne oubliée', 'Diadème des fées', 'Tiare du roi-crapaud'] };
function spawnRelics(world, total) {
  const r = world.run, b = bagPos(world);
  const n = Math.min(5, 1 + r.tier + (r.full ? 1 : 0));
  r.relics = [];
  for (let i = 0; i < n; i++) {
    const roll = Math.random(), leg = 0.08 + 0.08 * r.tier, epi = leg + 0.25;
    const rar = roll < leg ? 2 : roll < epi ? 1 : 0;
    const kind = ['bar', 'gem', 'crown'][Math.floor(Math.random() * 3)];
    const names = RELIC_NAMES[kind];
    r.relics.push({ kind, rar, name: names[Math.floor(Math.random() * names.length)], value: Math.max(1, Math.round(total * RARITIES[rar].share)),
      x0: b.x, y0: b.y - 10, tx: b.x + (i - (n - 1) / 2) * 78, ty: b.y - 110 - (i % 2) * 16, t: -0.25 - i * 0.12, got: false });
  }
}
function updateRelics(world, dt) {
  const r = world.run;
  if (!r.relics) return;
  const p = pointerWorld(world), gr = gloveRadius(world) + 18;
  for (const o of r.relics) {
    if (o.got) continue;
    o.t += dt;
    const k = Math.max(0, Math.min(1, o.t / 0.6)), e = 1 - Math.pow(1 - k, 3);
    o.x = o.x0 + (o.tx - o.x0) * e; o.y = o.y0 + (o.ty - o.y0) * e - Math.sin(k * Math.PI) * 60;
    if (k >= 1 && world.pointer.inside && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < gr * gr) {
      o.got = true; r.tearGot += o.value; world.events.push({ kind: 'coins', value: o.value });
      (r.relicsGot = r.relicsGot || []).push(o);
      const col = RARITIES[o.rar].color;
      world.texts.push({ x: o.x, y: o.y - 30, text: '+' + Math.round(o.value), color: col, size: 24, life: 1.2, dmg: true, vy: -80, pop: 0 });
      world.fx.push({ kind: 'ring', x: o.x, y: o.y, r0: 10, r1: 70, t: 0.4, life: 0.4, color: col });
      burst(world, o.x, o.y, 26, [col, '#ffffff', '#ffe68a'], 220, 3, 0, 0.6);
      sfx(world, 'gold'); shake(world, 4);
    }
  }
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
  keepPouches(world);
  for (const c of world.coins) {
    if (c.dead) continue;
    if (c.fly) { r.tearGot += c.value; world.events.push({ kind: 'coins', value: c.value }); } else left += c.value;
  }
  world.coins = [];
  r.left = left;
  world.phase = 'done';
  world.events.push({ kind: 'done' });
}
