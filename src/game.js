// Logique d'une expédition : entités, combat, récolte, sac et Déchirure.
import { ENEMIES, HEROES, HERO_ORDER, GOLD_WISP, TIERS, FULL_BONUS, BASE, MAP, bagMax, tierOf } from './data.js';

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
    enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [],
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

export function startExpedition(world, stats, zone) {
  Object.assign(world, {
    phase: 'expedition', enemies: [], heroes: [], coins: [], arrows: [], fx: [], texts: [], particles: [], shake: 0,
    stats, zone,
    run: {
      t: 0, duration: stats.duration, spawnT: 0, bag: 0, full: false, overflow: 0,
      kills: 0, toDrop: { ...stats.heroes }, sel: 'archer', attraction: stats.attraction, boss: null, bossKilled: false, golds: 0,
      tearT: 0, tearTotal: 0, tearGot: 0, shake: 0, mult: 1, tier: 0,
    },
  });
  const b = bagPos(world);
  centerCam(world, b.x, b.y + 40);
  for (let i = 0; i < 22; i++) spawnEnemy(world, true);
  if (zone.boss) spawnBoss(world);
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
    if (!anywhere && world.heroes.length && Math.random() < 0.7) {
      const u = world.heroes[Math.floor(Math.random() * world.heroes.length)];
      const a = rnd(0, Math.PI * 2), d = rnd(170, 420);
      x = u.x + Math.cos(a) * d; y = u.y + Math.sin(a) * d;
    } else { x = rnd(60, mapW - 60); y = rnd(60, mapH - 60); }
    x = Math.max(40, Math.min(mapW - 40, x)); y = Math.max(40, Math.min(mapH - 40, y));
    if ((x - bag.x) ** 2 + (y - bag.y) ** 2 > 230 * 230) break;
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
  world.fx.push({ kind: 'ring', x, y, r0: 2, r1: def.radius * 1.8, t: 0.4, life: 0.4, color: gold ? GOLD_WISP.color : def.color });
  if (gold && world.phase === 'expedition') world.texts.push({ x, y: y - 26, text: 'Feu follet doré !', color: GOLD_WISP.color, size: 15, life: 1.6 });
  return e;
}

export function bossHome(world) {
  const b = world.zone.boss;
  return { x: b.at[0] * world.mapW, y: b.at[1] * world.mapH, r: b.area * Math.min(world.mapW, world.mapH) * 0.75 };
}

// L'élémentaire primordial reste dans sa clairière et rôde lentement.
function spawnBoss(world) {
  const b = world.zone.boss, home = bossHome(world);
  const e = {
    type: 'boss', boss: true, def: { ...b, color: '#ff7a3c', core: '#fff1c2' }, x: home.x, y: home.y, r: b.radius,
    hp: b.hp * world.zone.hpMult, max: b.hp * world.zone.hpMult, value: b.value * world.zone.valueMult,
    a: rnd(0, 6), ph: rnd(0, 6), age: 0, hit: 0, dead: false, slow: 0, home,
  };
  world.enemies.push(e);
  world.run.boss = e;
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

function nearestEnemy(world, p) {
  let best = null, bd = Infinity;
  for (const e of world.enemies) {
    if (e.dead) continue;
    const d = d2(p, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damage(world, e, amount, slow, from) {
  if (e.dead) return;
  if (e.boss) amount *= world.stats.bossMult;
  if (slow) e.slow = Math.max(e.slow, slow);
  const crit = Math.random() < 0.12;
  if (crit) amount *= 2;
  if (e.def.dodge && Math.random() < e.def.dodge) {
    world.texts.push({ x: e.x, y: e.y - e.r - 6, text: 'esquive', color: '#d6f2ff', size: 12, life: 0.7 });
    return;
  }
  e.hp -= amount; e.hit = 0.12;
  const shown = Math.round(amount * 10) / 10;
  world.texts.push({ x: e.x + rnd(-8, 8), y: e.y - e.r - 4, text: (shown >= 10 ? Math.round(shown) : String(shown).replace('.', ',')) + (crit ? ' !' : ''),
    color: crit ? '#ffd246' : '#ffffff', size: crit ? 20 : 14, life: crit ? 0.9 : 0.6, dmg: true, vy: -70, pop: 0 });
  if (from && !e.boss) {
    const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1, k = (e.type === 'golem' ? 60 : 140) * (crit ? 1.6 : 1);
    e.kx = (e.kx || 0) + dx / d * k; e.ky = (e.ky || 0) + dy / d * k;
  }
  if (onScreen(world, e.x, e.y)) { sfx(world, 'hit', { crit }); if (crit || e.boss) shake(world, e.boss ? 3 : 2); }
  if (e.hp <= 0) killEnemy(world, e);
}

function killEnemy(world, e) {
  e.dead = true;
  world.run.kills++;
  const pal = { wisp: ['#ff9a3c', '#ffe682', '#e65032'], golem: ['#be7850', '#8c5238', '#6a3a24'], wind: ['#e6f7fb', '#8ed2e6', '#ffffff'] }[e.type] || ['#ff5a2a', '#ffb040', '#fff0b0'];
  burst(world, e.x, e.y, e.boss ? 70 : e.gold ? 30 : 14, e.gold ? ['#ffd246', '#fff096', '#ffffff'] : pal, e.boss ? 320 : 150, 2, 0, e.boss ? 1.1 : 0.55);
  if (onScreen(world, e.x, e.y)) { sfx(world, e.boss ? 'boss' : e.gold ? 'gold' : 'pop'); shake(world, e.boss ? 14 : e.type === 'golem' ? 3 : 1.5); }
  const n = e.boss ? 40 : Math.min(e.gold ? 12 : 6, 1 + Math.ceil(Math.log2(1 + e.value / 3)));
  if (e.boss) {
    world.run.bossKilled = true;
    world.events.push({ kind: 'boss', name: e.def.name });
    world.events.push({ kind: 'banner', title: e.def.name + ' vaincu !', sub: 'Une pluie de pièces dans la clairière' });
    world.fx.push({ kind: 'ring', x: e.x, y: e.y, r0: e.r, r1: e.r * 5, t: 0.8, life: 0.8, color: '#ffd246' });
  }
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = e.boss ? rnd(60, 260) : rnd(30, 110);
    world.coins.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      value: e.value / n, life: world.stats.coinLife, max: world.stats.coinLife, fly: false, sp: 0, z: 0, vz: rnd(160, 300), spin: rnd(0, 6) });
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
  if (after > before) { shake(world, 6); sfx(world, 'tier'); burst(world, world.mapW / 2, world.mapH / 2 - 30, 40, [TIERS[after].glow, TIERS[after].color, '#ffffff'], 220, 2, 0, 0.9); }
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
  for (const t of world.texts) { t.life -= dt; if (t.dmg) { t.y += t.vy * dt; t.vy *= Math.pow(0.05, dt); t.pop += dt; } else t.y -= 28 * dt; }
  for (const q of world.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt; const f = Math.pow(0.08, dt); q.vx *= f; q.vy *= f; }
  world.particles = world.particles.filter(q => q.life > 0);
  if (world.particles.length > 600) world.particles.splice(0, world.particles.length - 600);
  world.shake = Math.max(0, world.shake - dt * 30);
  world.combo.t -= dt;
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
    e.ph += dt * 3; e.age += dt; e.hit -= dt; e.slow = Math.max(0, e.slow - dt);
    e.a += rnd(-1, 1) * dt * 1.2;
    let sp = e.def.speed * (0.55 + 0.45 * Math.max(0, Math.sin(e.ph)));
    if (e.gold) sp *= GOLD_WISP.speed;
    if (e.slow > 0) sp *= 1 - HEROES.mage.slow;
    if (e.home && (e.x - e.home.x) ** 2 + (e.y - e.home.y) ** 2 > e.home.r * e.home.r) e.a = Math.atan2(e.home.y - e.y, e.home.x - e.x) + rnd(-0.5, 0.5);
    e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt;
    if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(0.002, dt); e.kx *= f; e.ky *= f; }
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
  const bards = world.heroes.filter(u => u.type === 'bard' && u.drop <= 0);
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
    const def = HEROES[u.type];
    // chanson du barde : les autres héros à portée agissent plus vite
    u.boost = bards.some(b => b !== u && d2(b, u) < s.bardAura * s.bardAura) ? s.bardBoost : 0;
    u.bob += dt * 3; u.cd -= dt * (1 + u.boost);
    u.recoil = Math.max(0, (u.recoil || 0) - dt * 6);
    if (u.boost > 0 && Math.random() < dt * 0.8) world.texts.push({ x: u.x + rnd(-8, 8), y: u.y - 34, text: '♪', color: '#ffe68a', size: 14, life: 0.7 });
    const t = nearestEnemy(world, u);
    if (!t) continue;
    const dist = Math.sqrt(d2(u, t));
    u.face = t.x >= u.x ? 1 : -1;
    const reach = def.range + (def.shot === 'melee' ? t.r : 0);
    if (dist > reach) {
      u.x += (t.x - u.x) / dist * def.walkSpeed * dt;
      u.y += (t.y - u.y) / dist * def.walkSpeed * dt;
      u.moving = true;
    } else {
      u.moving = false;
      if (u.cd > 0) continue;
      u.cd = s.cooldown[u.type];
      u.recoil = 1;
      const dmg = s.damage[u.type];
      if (onScreen(world, u.x, u.y)) sfx(world, def.shot === 'melee' ? 'slash' : def.shot);
      if (def.shot === 'melee') {
        // coup circulaire : touche la cible et tout ce qui est autour
        for (const e of world.enemies) if (!e.dead && d2(e, t) < (def.cleave + e.r) ** 2) damage(world, e, dmg, 0, u);
        world.fx.push({ kind: 'slash', x: t.x, y: t.y, r0: 8, r1: def.cleave + 10, t: 0.22, life: 0.22, color: '#f0f4fa', face: u.face });
      } else {
        world.arrows.push({ kind: def.shot, x: u.x, y: u.y - 10, target: t, damage: dmg, dx: 0, dy: 0, speed: def.speed,
          aoe: def.shot === 'frost' ? s.mageAoe : 0, slow: def.shot === 'frost' ? HEROES.mage.slowTime : 0 });
      }
    }
  }
}

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
    if (c.vz !== undefined) { c.vz -= 900 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.vz = Math.abs(c.vz) > 60 ? -c.vz * 0.45 : 0; } }
    if (world.phase === 'tear') c.vy += 16 * dt;
    c.life -= dt;
    if (c.life <= 0) { c.dead = true; continue; }
    const fresh = c.life < c.max - 0.15;
    if (fresh && inside && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < gr * gr) {
      c.fly = true; c.sp = 120;
      const cb = world.combo; cb.n = cb.t > 0 ? cb.n + 1 : 1; cb.t = 1.1;
      sfx(world, 'coin', { n: cb.n });
      burst(world, c.x, c.y, 3, ['#fff5b4', '#ffcd3c'], 60, 1, 0, 0.3);
    }
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
  sfx(world, 'rumble');
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
      value: each, life: s.tearDuration + rnd(0, 0.5), max: s.tearDuration + 1, fly: false, sp: 0, big: r.tier >= 1, z: 0, vz: rnd(200, 520), spin: rnd(0, 6) });
  }
  world.fx.push({ kind: 'ring', x: b.x, y: b.y - 20, r0: 10, r1: Math.max(world.w, world.h) * 0.6, t: 0.7, life: 0.7, color: TIERS[r.tier].glow });
  burst(world, b.x, b.y - 20, 60, [TIERS[r.tier].color, TIERS[r.tier].seam, TIERS[r.tier].glow], 420, 3, 0, 1);
  shake(world, 14); sfx(world, 'burst');
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
