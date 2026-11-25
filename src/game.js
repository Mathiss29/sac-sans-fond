// Logique d'une expédition : entités, combat, récolte, sac et Déchirure.
import { ENEMIES, HEROES, TIERS, FULL_BONUS, BASE, MAP, bagMax, tierOf } from './data.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// w, h : taille de l'écran. mapW, mapH : taille de la région. cam : coin haut-gauche de l'écran dans la région.
export function createWorld(w, h) {
  return {
    w, h, mapW: MAP.w, mapH: MAP.h, cam: { x: (MAP.w - w) / 2, y: (MAP.h - h) / 2 },
    phase: 'idle',      // idle | expedition | tear | done
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [],
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

export function startExpedition(world, stats, zone) {
  Object.assign(world, {
    phase: 'expedition', enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [],
    stats, zone,
    run: {
      t: 0, duration: stats.duration, spawnT: 0, bag: 0, full: false, overflow: 0,
      kills: 0, toDrop: { archer: stats.archers }, attraction: stats.attraction,
      tearT: 0, tearTotal: 0, tearGot: 0, shake: 0, mult: 1, tier: 0,
    },
  });
  const b = bagPos(world);
  centerCam(world, b.x, b.y + 40);
  for (let i = 0; i < 22; i++) spawnEnemy(world, true);
  world.events.push({ kind: 'banner', title: 'Expédition !', sub: zone.name });
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
function spawnEnemy(world, anywhere = false) {
  const type = pickEnemyType(world.zone);
  const def = ENEMIES[type];
  const { mapW, mapH } = world;
  const bag = bagPos(world);
  let x, y;
  for (let k = 0; k < 12; k++) {
    if (!anywhere && world.heroes.length && Math.random() < 0.55) {
      const u = world.heroes[Math.floor(Math.random() * world.heroes.length)];
      const a = rnd(0, Math.PI * 2), d = rnd(220, 520);
      x = u.x + Math.cos(a) * d; y = u.y + Math.sin(a) * d;
    } else { x = rnd(60, mapW - 60); y = rnd(60, mapH - 60); }
    x = Math.max(40, Math.min(mapW - 40, x)); y = Math.max(40, Math.min(mapH - 40, y));
    if ((x - bag.x) ** 2 + (y - bag.y) ** 2 > 230 * 230) break;
  }
  const e = {
    type, def, x, y, r: def.radius,
    hp: def.hp * world.zone.hpMult, max: def.hp * world.zone.hpMult,
    value: def.value * world.zone.valueMult,
    a: rnd(0, Math.PI * 2),
    ph: rnd(0, 6), age: 0, hit: 0, dead: false,
  };
  world.enemies.push(e);
  world.fx.push({ kind: 'ring', x, y, r0: 2, r1: def.radius * 1.8, t: 0.4, life: 0.4, color: def.color });
  return e;
}

export function canDrop(world) {
  return world.phase === 'expedition' && world.run.toDrop.archer > 0;
}

export function dropHero(world, x, y) {
  if (!canDrop(world)) return false;
  world.heroes.push({ type: 'archer', x, y, cd: rnd(0, 0.3), drop: 1, face: 1, bob: rnd(0, 6) });
  world.run.toDrop.archer--;
  return true;
}

function nearestEnemy(world, p) {
  let best = null, bd = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = d2(p, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damage(world, e, amount) {
  if (e.dead) return;
  if (e.def.dodge && Math.random() < e.def.dodge) {
    world.texts.push({ x: e.x, y: e.y - e.r - 6, text: 'esquive', color: '#d6f2ff', size: 12, life: 0.7 });
    return;
  }
  e.hp -= amount; e.hit = 0.12;
  if (e.hp <= 0) killEnemy(world, e);
}

function killEnemy(world, e) {
  e.dead = true;
  world.run.kills++;
  const n = Math.min(6, 1 + Math.ceil(Math.log2(1 + e.value / 3)));
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(30, 110);
    world.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      value: e.value / n, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0 });
  }
  world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 2.2, t: 0.35, life: 0.35, color: e.def.color });
}

export function attractionActive(world) {
  const r = world.run;
  if (!r || (world.phase !== 'expedition' && world.phase !== 'tear')) return false;
  const p = world.pointer;
  return r.attraction > 0 && ((p.down && !p.usedForDrop) || world.holdKey);
}

export function gloveRadius(world) {
  return world.stats.gloveRadius * (attractionActive(world) ? 2 : 1);
}

function addToBag(world, value) {
  const r = world.run, s = world.stats;
  const max = bagMax(s);
  const before = tierOf(r.bag, s);
  const into = Math.min(Math.max(0, max - r.bag), value);
  r.bag += into;
  if (value - into > 0) { r.overflow += value - into; world.events.push({ kind: 'coins', value: value - into }); }
  const after = tierOf(r.bag, s);
  if (after > before) world.events.push({ kind: 'banner', title: TIERS[after].name + ' !', sub: `Déchirure ×${String(TIERS[after].mult).replace('.', ',')}` });
  if (r.bag >= max && !r.full) {
    r.full = true;
    world.events.push({ kind: 'banner', title: 'Sac plein !', sub: 'Bonus +25 % à la Déchirure. Le surplus va directement dans ta bourse.' });
  }
}

export function update(world, dt) {
  world.t += dt;
  for (const f of world.fx) f.t -= dt;
  world.fx = world.fx.filter(f => f.t > 0);
  for (const t of world.texts) { t.life -= dt; t.y -= 28 * dt; }
  world.texts = world.texts.filter(t => t.life > 0);

  updateEnemies(world, dt);
  if (world.phase === 'idle') {
    while (world.enemies.length < 20) spawnEnemy(world, true);
    return;
  }
  if (world.phase === 'done') return;
  const r = world.run;

  if (world.phase === 'expedition') {
    r.t += dt;
    r.spawnT -= dt;
    if (r.spawnT <= 0 && world.enemies.length < world.stats.maxEnemies) {
      r.spawnT = world.stats.spawnEvery * rnd(0.6, 1.4);
      spawnEnemy(world);
    }
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
      const anyFlying = world.coins.some(c => c.fly);
      if ((r.tearT <= 0 && !anyFlying) || r.tearT < -1.5 || (world.coins.length === 0 && r.tearT < r.tearDur - 0.5)) endTear(world);
    }
  }
  if (attractionActive(world)) r.attraction = Math.max(0, r.attraction - dt);
  else r.attraction = Math.min(world.stats.attraction, r.attraction + dt * BASE.attractionRegen);
  updateCoins(world, dt);
}

function updateEnemies(world, dt) {
  const w = world.mapW, h = world.mapH;
  for (const e of world.enemies) {
    e.ph += dt * 3; e.age += dt; e.hit -= dt;
    e.a += rnd(-1, 1) * dt * 1.2;
    const sp = e.def.speed * (0.55 + 0.45 * Math.max(0, Math.sin(e.ph)));
    e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt;
    const m = e.r + 10;
    if (e.age > 2) {
      if (e.x < m) e.a = rnd(-0.8, 0.8); else if (e.x > w - m) e.a = Math.PI + rnd(-0.8, 0.8);
      if (e.y < m) e.a = Math.PI / 2 + rnd(-0.8, 0.8); else if (e.y > h - m) e.a = -Math.PI / 2 + rnd(-0.8, 0.8);
    }
  }
  world.enemies = world.enemies.filter(e => !e.dead);
}

function updateHeroes(world, dt) {
  const s = world.stats;
  for (const u of world.heroes) {
    if (u.drop > 0) {
      u.drop -= dt * 3;
      if (u.drop <= 0) { u.drop = 0; world.fx.push({ kind: 'ring', x: u.x, y: u.y + 10, r0: 6, r1: 34, t: 0.4, life: 0.4, color: '#fff6dc' }); }
      continue;
    }
    u.bob += dt * 3; u.cd -= dt;
    const t = nearestEnemy(world, u);
    if (!t) continue;
    const dist = Math.sqrt(d2(u, t));
    u.face = t.x >= u.x ? 1 : -1;
    if (dist > HEROES.archer.range) {
      u.x += (t.x - u.x) / dist * HEROES.archer.walkSpeed * dt;
      u.y += (t.y - u.y) / dist * HEROES.archer.walkSpeed * dt;
    } else if (u.cd <= 0) {
      world.arrows.push({ x: u.x, y: u.y - 8, target: t, damage: s.arrowDamage, dx: 0, dy: 0 });
      u.cd = s.arrowCooldown;
    }
  }
}

function updateArrows(world, dt) {
  for (const a of world.arrows) {
    const t = a.target;
    const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy) || 1;
    a.dx = dx / d; a.dy = dy / d;
    a.x += a.dx * HEROES.archer.arrowSpeed * dt; a.y += a.dy * HEROES.archer.arrowSpeed * dt;
    if (t.dead) a.done = true;
    else if (d < t.r) { a.done = true; damage(world, t, a.damage); }
  }
  world.arrows = world.arrows.filter(a => !a.done);
}

function updateCoins(world, dt) {
  const gr = gloveRadius(world);
  const bag = bagPos(world);
  const wp = world.walletPos || { x: 20, y: 20 };
  const target = world.phase === 'tear' ? { x: wp.x + world.cam.x, y: wp.y + world.cam.y } : bag;
  const p = pointerWorld(world), inside = world.pointer.inside;
  const mouth = world.phase === 'expedition' ? world.stats.bagMouth : 0;
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
    if (world.phase === 'tear') c.vy += 16 * dt;
    c.life -= dt;
    if (c.life <= 0) { c.dead = true; continue; }
    const fresh = c.life < c.max - 0.15;
    if (fresh && inside && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < gr * gr) { c.fly = true; c.sp = 120; }
    else if (fresh && mouth && d2(c, bag) < mouth * mouth) { c.fly = true; c.sp = 60; }
  }
  world.coins = world.coins.filter(c => !c.dead);
}

function credit(world, value) {
  if (world.phase === 'tear') { world.run.tearGot += value; world.events.push({ kind: 'coins', value }); }
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
  r.tearTotal = r.bag * r.mult;
  r.shake = 1.1;
  world.events.push({ kind: 'tear' });
  world.events.push({ kind: 'banner', title: 'Les coutures craquent…', sub: '' });
}

function burstBag(world) {
  const r = world.run, s = world.stats;
  r.tearDur = s.tearDuration;
  r.tearT = s.tearDuration;
  r.attraction = s.attraction;
  const total = r.tearTotal;
  const n = Math.max(15, Math.min(BASE.tearMaxCoins, Math.ceil(total)));
  const each = total / n;
  const b = bagPos(world);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), sp = rnd(120, Math.max(world.w, world.h) * 0.9);
    world.coins.push({ x: b.x, y: b.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      value: each, life: s.tearDuration + rnd(0, 0.5), max: s.tearDuration + 1, fly: false, sp: 0, big: r.tier >= 1 });
  }
  world.fx.push({ kind: 'ring', x: b.x, y: b.y - 20, r0: 10, r1: Math.max(world.w, world.h) * 0.6, t: 0.7, life: 0.7, color: TIERS[r.tier].glow });
  world.events.push({ kind: 'banner', title: 'Déchirure !', sub: total > 0 ? 'Rafle les pièces avant qu\'elles ne disparaissent' : 'Le sac était vide…' });
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
