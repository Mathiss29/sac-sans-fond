// Tout le dessin sur le canvas, en pixel art (sprites dans sprites.js).
import { TIERS, bagMax, tierOf } from './data.js';
import { bagPos, canDrop, gloveRadius, attractionActive, focusActive, FOCUS_R, portalPos } from './game.js';

import { buildSprites, bagSprite, buildMap, buildArena, portalSprite } from './sprites.js';

const SPR = buildSprites();

// Taille d'un pixel d'art à l'écran : 2 en général (vue large), 3 sur très grand écran.
export function pixelSize(w, h) { return Math.max(2, Math.min(4, Math.floor(Math.min(w, h) / 420))); }

// La région est dessinée une fois en basse résolution, puis on n'en affiche que la partie visible.
let mapInfo = null, mapKey = '', vig = null, vigKey = '';
export function getMap(world) {
  const px = pixelSize(world.w, world.h);
  const arena = world.mode === 'arena';
  const key = `${arena ? 'antre' : world.zone.id}@${px}:${world.mapW}x${world.mapH}`;
  if (key !== mapKey) {
    mapInfo = arena ? buildArena(Math.ceil(world.mapW / px), Math.ceil(world.mapH / px))
      : buildMap(Math.ceil(world.mapW / px), Math.ceil(world.mapH / px), world.zone);
    mapInfo.px = px; mapKey = key;
  }
  return mapInfo;
}
function vignette(w, h, dpr) {
  const key = `${w}x${h}@${dpr}`;
  if (key === vigKey) return vig;
  const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,12,4,.35)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  vig = c; vigKey = key; return c;
}

function shadow(g, x, y, rx, ry) {
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
}

// Petite icône d'ennemi pour l'interface (compteur « À l'écran »).
const iconCache = {};
export function enemyIcon(type) {
  if (iconCache[type]) return iconCache[type];
  const f = (SPR.enemies[type] || SPR.enemies.wisp)[0].c;
  const c = document.createElement('canvas'); c.width = 22; c.height = 22;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const k = Math.max(1, Math.floor(22 / Math.max(f.width, f.height)));
  g.drawImage(f, Math.round((22 - f.width * k) / 2), Math.round((22 - f.height * k) / 2), f.width * k, f.height * k);
  return (iconCache[type] = c);
}

export function drawEnemy(g, e, t, px = 3) {
  const frames = SPR.enemies[e.gold ? 'gold' : e.type] || SPR.enemies.wisp;
  const f = frames[Math.floor(e.ph * 0.9) % frames.length];
  // le boss est frappé sans arrêt : un bref éclair seulement, sinon il resterait blanc
  const flash = e.boss ? e.hit > 0.09 && Math.floor(t * 20) % 3 === 0 : e.hit > 0.06 || (e.hit > 0 && Math.floor(t * 30) % 2);
  const img = flash ? f.white : f.c;
  const k = e.boss ? px * 2 : px;
  const w = img.width * k, h = img.height * k;
  const fly = e.type !== 'golem';
  const hover = fly ? Math.round(Math.sin(e.ph * 1.3) * 1.5) * px : 0;
  shadow(g, e.x, e.y + h * 0.45, w * 0.32, px * 1.6);
  if (e.type === 'wisp' || e.gold || e.boss) {
    const halo = g.createRadialGradient(e.x, e.y + hover, 2, e.x, e.y + hover, w * 0.9);
    halo.addColorStop(0, e.gold ? 'rgba(255,230,120,.45)' : 'rgba(255,170,80,.35)'); halo.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(e.x, e.y + hover, w * 0.9, 0, 7); g.fill();
  }
  g.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y - h / 2 + hover), w, h);
  if (e.slow > 0) {
    // ralenti : petits éclats de givre qui tournent autour
    for (let i = 0; i < 4; i++) {
      const an = t * 3 + i * Math.PI / 2, rx = w * 0.55, ry = h * 0.35;
      const ix = Math.round(e.x + Math.cos(an) * rx), iy = Math.round(e.y + hover + Math.sin(an) * ry);
      g.fillStyle = '#24161e'; g.fillRect(ix - px, iy - px, px * 3, px * 3);
      g.fillStyle = i % 2 ? '#aee6ff' : '#f0fbff'; g.fillRect(ix - px + 1, iy - px + 1, px * 3 - 2, px * 3 - 2);
    }
  }
  if (e.hp < e.max && !e.boss) {
    const bw = Math.max(18, w * 0.7), y = Math.round(e.y - h / 2 + hover - 7);
    g.fillStyle = '#24161e'; g.fillRect(Math.round(e.x - bw / 2) - 1, y - 1, bw + 2, 5);
    g.fillStyle = '#9be36b'; g.fillRect(Math.round(e.x - bw / 2), y, bw * Math.max(0, e.hp / e.max), 3);
  }
}

// Héros : pieds posés en (x, y), regard vers la droite si face = 1.
export function drawHero(g, type, x, y, face, bob, alpha = 1, px = 3) {
  const frames = SPR.heroes[type] || SPR.heroes.archer;
  const img = frames[Math.floor(bob / Math.PI) % 2];
  const w = img.width * px, h = img.height * px;
  g.save(); g.globalAlpha = alpha;
  shadow(g, x, y - px, 6 * px, 1.8 * px);
  g.translate(Math.round(x), Math.round(y)); g.scale(face, 1);
  g.drawImage(img, -8 * px, -h, w, h); // la colonne 8 est le milieu du corps
  g.restore();
}
export function drawArcher(g, x, y, face, bob, alpha = 1, px = 3) { drawHero(g, 'archer', x, y + 12, face, bob, alpha, px); }

// Le sac : grossit avec le remplissage, change de matière selon le palier, craque près du maximum.
export function drawBag(g, x, y, tierIdx, fill, t, shake = 0, px = 3) {
  const tier = TIERS[tierIdx];
  const jitter = shake > 0 ? Math.round((Math.random() - 0.5) * 3 * Math.min(1, shake * 2 + 0.3)) * px : (fill > 0.9 ? Math.round(Math.random() - 0.5) * px : 0);
  const size = Math.round(9 + 7 * Math.min(1, fill));
  const cracks = shake > 0 ? 2 : fill > 0.85 ? 1 : 0;
  const b = bagSprite(tier, size, cracks, tierIdx >= 2);
  const w = b.w * px, h = b.h * px;
  const breathe = Math.round(Math.sin(t * 2.4) * (0.5 + fill)) * px;
  // halo
  const R = w * 0.5;
  const halo = g.createRadialGradient(x, y - h * 0.4, 10, x, y - h * 0.4, R * 2.2);
  halo.addColorStop(0, hexA(tier.glow, 0.3 + fill * 0.25)); halo.addColorStop(1, hexA(tier.glow, 0));
  g.fillStyle = halo; g.beginPath(); g.arc(x, y - h * 0.4, R * 2.2, 0, 7); g.fill();
  shadow(g, x, y - px, w * 0.48, px * 3);
  g.drawImage(b.c, Math.round(x - w / 2 + jitter), Math.round(y - h + breathe * 0), w, h + 0);
  // pièces qui dépassent de l'ouverture
  if (fill > 0.05) {
    g.globalAlpha = Math.min(1, fill * 2);
    const cw = SPR.coin.width * px;
    for (let i = 0; i < 3; i++) g.drawImage(SPR.coin, Math.round(x + jitter + (i - 1) * cw * 0.7 - cw / 2), Math.round(y - h - cw * 0.35 + (i === 1 ? -px * 2 : 0)), cw, cw);
    g.globalAlpha = 1;
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = v => Math.max(0, Math.min(255, Math.round(v + (f > 0 ? (255 - v) * f : v * f))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

export function render(g, world, dpr) {
  const { w, h } = world;
  const zone = world.zone;
  const map = getMap(world), px = map.px;
  // caméra calée sur la grille des pixels d'art pour éviter le scintillement
  const sh = world.shake > 0.3 ? world.shake : 0;
  const shx = sh ? (Math.random() - 0.5) * sh * 2 : 0, shy = sh ? (Math.random() - 0.5) * sh * 2 : 0;
  const sx = Math.round((world.cam.x + shx) / px), sy = Math.round((world.cam.y + shy) / px);
  const camX = sx * px, camY = sy * px;
  g.imageSmoothingEnabled = false;
  const arena = world.mode === 'arena';
  g.fillStyle = arena ? '#1a0f12' : '#1c2a1c'; g.fillRect(0, 0, w, h);
  g.drawImage(map.c, sx, sy, Math.ceil(w / px), Math.ceil(h / px), 0, 0, Math.ceil(w / px) * px, Math.ceil(h / px) * px);
  const t = world.t;

  // lucioles d'ambiance (braises dans l'antre)
  g.fillStyle = arena ? 'rgba(255,150,70,.7)' : 'rgba(255,245,190,.5)';
  for (let i = 0; i < 18; i++) {
    const x = (i * 97.3 + Math.sin(t * 0.3 + i) * 40) % w;
    const y = (i * 53.7 + Math.cos(t * 0.25 + i * 1.3) * 30 + h) % h;
    g.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + i);
    g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  g.save(); g.translate(-camX, -camY);
  if (!arena) drawClouds(g, world, t, camX, camY);
  const r = world.run;
  if (arena) drawBraziers(g, map, t, px);
  else if (r && (world.phase === 'expedition' || world.phase === 'tear')) drawPortal(g, world, t, px);
  if (r && !arena && (world.phase === 'expedition' || world.phase === 'tear')) {
    const b = bagPos(world);
    const max = bagMax(world.stats);
    if (world.phase === 'expedition') {
      const tier = tierOf(r.bag, world.stats);
      drawBag(g, b.x, b.y + 30, tier, Math.min(1, r.bag / max), t, 0, px);
      // gueule du sac
      g.strokeStyle = 'rgba(255,240,200,.18)'; g.setLineDash([3, 6]);
      g.beginPath(); g.arc(b.x, b.y, world.stats.bagMouth, 0, 7); g.stroke(); g.setLineDash([]);
    } else if (r.shake > 0) {
      drawBag(g, b.x, b.y + 30, r.tier, Math.min(1, r.bag / max) + 0.1, t, r.shake, px);
    } else {
      // lambeaux du sac déchiré
      g.fillStyle = TIERS[r.tier].color; g.globalAlpha = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + 0.3;
        g.beginPath(); g.moveTo(b.x + Math.cos(a) * 18, b.y + 20 + Math.sin(a) * 8);
        g.lineTo(b.x + Math.cos(a + 0.3) * 40, b.y + 24 + Math.sin(a + 0.3) * 14);
        g.lineTo(b.x + Math.cos(a - 0.2) * 34, b.y + 26 + Math.sin(a - 0.2) * 12); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  for (const f of world.fx) {
    const k = 1 - f.t / f.life;
    g.strokeStyle = f.color; g.globalAlpha = 1 - k; g.lineWidth = 3;
    g.beginPath();
    if (f.kind === 'slash') { const a0 = f.face > 0 ? -1.2 : Math.PI - 1.2; g.lineWidth = 4; g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, a0 + k * 1.5, a0 + 1 + k * 1.5); }
    else g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, 0, 7);
    g.stroke();
  }
  g.globalAlpha = 1;

  for (const c of world.coins) {
    const a = c.fly ? 1 : Math.min(1, c.life / 1.5);
    const blink = !c.fly && c.life < 1.5 ? (Math.sin(t * 20) > 0 ? 1 : 0.4) : 1;
    g.globalAlpha = a * blink;
    const im = SPR.loot[c.kind || 'coin'] || SPR.coin;
    const k = c.kind && c.kind !== 'coin' ? px : (c.big ? px + 1 : px);
    const s = im.width * k, sh2 = im.height * k;
    const z = c.z || 0;
    if (z > 1) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(Math.round(c.x - s * 0.3), Math.round(c.y + sh2 * 0.35), Math.round(s * 0.6), px); }
    if (!c.kind || c.kind === 'coin') {
      const sw = Math.max(px, Math.round(s * Math.abs(Math.cos(t * 6 + (c.spin || 0))) / px) * px);
      g.drawImage(im, Math.round(c.x - sw / 2), Math.round(c.y - sh2 / 2 - z), sw, sh2);
    } else {
      if (c.kind !== 'bar') { // halo des gemmes et couronnes
        g.fillStyle = c.kind === 'gem' ? 'rgba(120,230,255,.25)' : 'rgba(255,220,100,.25)';
        g.beginPath(); g.arc(c.x, c.y - z, s * 0.9, 0, 7); g.fill();
      }
      g.drawImage(im, Math.round(c.x - s / 2), Math.round(c.y - sh2 / 2 - z), s, sh2);
    }
    if (!c.fly && Math.sin(t * 3 + (c.spin || 0) * 5) > 0.97) { g.fillStyle = '#fff'; g.fillRect(Math.round(c.x + s * 0.2), Math.round(c.y - s * 0.4 - z), px, px); }
  }
  g.globalAlpha = 1;

  for (const z of world.hazards) drawHazard(g, z, t, px);
  for (const e of world.enemies) drawEnemy(g, e, t, px);
  for (const q of world.particles) {
    g.globalAlpha = Math.min(1, q.life / q.max * 1.6); g.fillStyle = q.color;
    const sz = q.size * px * 0.75;
    g.fillRect(Math.round(q.x - sz / 2), Math.round(q.y - sz / 2), Math.round(sz), Math.round(sz));
  }
  g.globalAlpha = 1;

  // aura des bardes
  for (const u of world.heroes) {
    if (u.type !== 'bard' || u.drop > 0) continue;
    g.strokeStyle = 'rgba(255,230,140,.25)'; g.setLineDash([2, 8]); g.lineWidth = 2; g.lineDashOffset = -t * 10;
    g.beginPath(); g.arc(u.x, u.y + 8, world.stats.bardAura, 0, 7); g.stroke(); g.setLineDash([]);
  }
  const heroes = [...world.heroes].sort((a, b) => a.y - b.y);
  for (const u of heroes) {
    const rc = (u.recoil || 0) * px * 1.5;
    if (u.drop > 0) { g.fillStyle = `rgba(0,0,0,${0.25 * (1 - u.drop)})`; g.beginPath(); g.ellipse(u.x, u.y + 10, 18 * (1 - u.drop * 0.6), 6 * (1 - u.drop * 0.6), 0, 0, 7); g.fill(); }
    drawHero(g, u.type, u.x - u.face * rc, u.y + 12 - u.drop * h * 0.5, u.face, u.moving ? u.bob * 2 : u.bob * 0.5, 1, px);
    if (u.stun > 0) {
      // étourdi : petites étoiles qui tournent au-dessus de la tête
      for (let i = 0; i < 3; i++) {
        const an = t * 5 + i * 2.1, sx2 = Math.round(u.x + Math.cos(an) * px * 5), sy2 = Math.round(u.y - px * 17 + Math.sin(an) * px * 1.5);
        g.fillStyle = '#24161e'; g.fillRect(sx2 - px * 1.5, sy2 - px * 0.5, px * 3, px); g.fillRect(sx2 - px * 0.5, sy2 - px * 1.5, px, px * 3);
        g.fillStyle = '#ffe14a'; g.fillRect(sx2 - px, sy2 - px * 0.5 + 1, px * 2, px - 2); g.fillRect(sx2 - px * 0.5 + 1, sy2 - px, px - 2, px * 2);
      }
    }
  }

  for (const a of world.arrows) {
    if (a.kind === 'frost') {
      g.fillStyle = '#24161e'; g.fillRect(Math.round(a.x) - px * 2, Math.round(a.y) - px * 2, px * 4, px * 4);
      g.fillStyle = '#aee6ff'; g.fillRect(Math.round(a.x) - px * 1.5, Math.round(a.y) - px * 1.5, px * 3, px * 3);
      g.fillStyle = '#f0fbff'; g.fillRect(Math.round(a.x) - px, Math.round(a.y) - px, px, px);
    } else if (a.kind === 'note') {
      g.fillStyle = '#ffe68a'; g.font = `700 ${px * 6}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('♪', a.x, a.y + px * 2);
    } else {
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.dx * 12, a.y - a.dy * 12); g.stroke();
      g.fillStyle = '#d8d8d8'; g.beginPath(); g.arc(a.x, a.y, 1.6, 0, 7); g.fill();
    }
  }

  g.textAlign = 'center'; g.lineJoin = 'round';
  for (const tx of world.texts) {
    g.globalAlpha = Math.min(1, tx.life * 3);
    const sc = tx.dmg ? 1 + Math.max(0, 0.6 - tx.pop * 6) : 1;
    g.font = `800 ${Math.round(tx.size * sc)}px 'Alegreya Sans', system-ui, sans-serif`;
    g.strokeStyle = '#24161e'; g.lineWidth = 3.5; g.strokeText(tx.text, tx.x, tx.y);
    g.fillStyle = tx.color; g.fillText(tx.text, tx.x, tx.y);
  }
  g.globalAlpha = 1;
  if (!arena) drawButterflies(g, world, t, px);
  g.restore();
  if (arena) drawEmbers(g, world, t, px); else drawLeaves(g, world, t, px);
  g.drawImage(vignette(w, h, dpr), 0, 0, w, h);
  const cb = world.combo;
  if (cb.t > 0 && cb.n >= 3 && world.pointer.inside) {
    const sc = 1 + Math.max(0, cb.t - 0.9) * 2;
    g.globalAlpha = Math.min(1, cb.t * 2);
    g.font = `800 ${Math.round(18 * sc)}px 'Alegreya SC', Georgia, serif`; g.textAlign = 'left';
    g.strokeStyle = '#24161e'; g.lineWidth = 4;
    const txt = `×${cb.n}`;
    g.strokeText(txt, world.pointer.x + 22, world.pointer.y - 18); g.fillStyle = cb.n >= 20 ? '#ff9a3c' : '#ffd246'; g.fillText(txt, world.pointer.x + 22, world.pointer.y - 18);
    g.globalAlpha = 1;
  }

  // curseur : gant d'attraction
  const p = world.pointer;
  if (p.inside && (world.phase === 'expedition' || world.phase === 'tear')) {
    if (canDrop(world)) drawHero(g, world.run.sel, p.x, p.y + 12, 1, 0, 0.5, px);
    if (focusActive(world)) {
      // Focus : zone bleue sous le gant, les héros n'attaquent que là
      g.fillStyle = 'rgba(110,220,255,.10)'; g.beginPath(); g.arc(p.x, p.y, FOCUS_R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(140,230,255,.9)'; g.lineWidth = 2.5; g.setLineDash([10, 6]); g.lineDashOffset = t * 30;
      g.beginPath(); g.arc(p.x, p.y, FOCUS_R, 0, 7); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t; g.fillStyle = '#bff2ff'; g.fillRect(Math.round(p.x + Math.cos(a) * FOCUS_R) - 3, Math.round(p.y + Math.sin(a) * FOCUS_R) - 3, 6, 6); }
    }
    const rad = gloveRadius(world);
    const on = attractionActive(world);
    g.strokeStyle = on ? 'rgba(255,214,102,.95)' : 'rgba(255,248,225,.65)';
    g.lineWidth = on ? 3 : 1.5; g.setLineDash([6, 6]); g.lineDashOffset = -t * 20;
    g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.stroke(); g.setLineDash([]);
    if (on) { g.fillStyle = 'rgba(255,214,102,.08)'; g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.fill(); }
    g.fillStyle = '#fff8e1'; g.beginPath(); g.arc(p.x, p.y, 3, 0, 7); g.fill();
  }
}

// ---------- Antre du boss ----------
// Portail de la clairière : tourbillon de feu quand il est ouvert, scellé sinon.
function drawPortal(g, world, t, px) {
  const p = portalPos(world), spr = portalSprite(), r = world.run;
  const open = r && r.lair.open && !r.lair.done;
  const k = px * 2, W = spr.w * k, H = spr.h * k;
  const x0 = Math.round(p.x - W / 2), y0 = Math.round(p.y + 30 - H);
  const ix = x0 + spr.inner.x * k, iy = y0 + spr.inner.y * k, rx = spr.inner.rx * k, ry = spr.inner.ry * k;
  if (open) {
    const halo = g.createRadialGradient(ix, iy, 4, ix, iy, rx * 4);
    halo.addColorStop(0, 'rgba(255,150,60,.45)'); halo.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(ix, iy, rx * 4, 0, 7); g.fill();
  }
  g.save(); g.beginPath(); g.ellipse(ix, iy, rx, ry, 0, 0, 7); g.clip();
  g.fillStyle = open ? '#e0461e' : '#2a1a2e'; g.fillRect(ix - rx, iy - ry, rx * 2, ry * 2);
  const cols = open ? ['#ff7a2c', '#ffb040', '#ffd25a', '#fff0b0'] : ['#3a2a40', '#4a3858'];
  for (let i = 0; i < cols.length; i++) {
    const f = 1 - i / cols.length;
    g.fillStyle = cols[i];
    for (let a = 0; a < 6; a++) {
      const an = (open ? t * (1.5 + i * 0.6) : t * 0.2) + a * Math.PI / 3 + i;
      g.fillRect(Math.round((ix + Math.cos(an) * rx * f * 0.8) / px) * px - px, Math.round((iy + Math.sin(an) * ry * f * 0.8) / px) * px - px, px * 2, px * 2);
    }
  }
  if (!open) { // chaînes en croix
    g.fillStyle = '#8a7a72';
    for (let i = -6; i <= 6; i++) { g.fillRect(Math.round(ix + i * px * 1.3) - px, Math.round(iy + i * px * 2) - px, px * 2, px * 2); g.fillRect(Math.round(ix - i * px * 1.3) - px, Math.round(iy + i * px * 2) - px, px * 2, px * 2); }
  }
  g.restore();
  g.drawImage(spr.c, x0, y0, W, H);
  g.font = `800 15px 'Alegreya SC', Georgia, serif`; g.textAlign = 'center'; g.lineJoin = 'round';
  const label = r && r.lair.done ? 'Portail refermé' : open ? world.zone.boss.lair : 'Portail scellé';
  g.strokeStyle = '#24161e'; g.lineWidth = 4; g.strokeText(label, p.x, y0 - 8);
  g.fillStyle = open ? '#ffb347' : '#c8b8b0'; g.fillText(label, p.x, y0 - 8);
  if (open) { const sub = 'clique pour entrer'; g.font = `700 12px 'Alegreya Sans', system-ui, sans-serif`; g.strokeText(sub, p.x, y0 + H + 16); g.fillStyle = '#fff2c8'; g.fillText(sub, p.x, y0 + H + 16); }
}

function drawBraziers(g, map, t, px) {
  for (let i = 0; i < map.braziers.length; i++) {
    const b = map.braziers[i], x = b.x * px, y = b.y * px;
    const halo = g.createRadialGradient(x, y, 2, x, y, px * 26);
    halo.addColorStop(0, `rgba(255,150,60,${0.28 + 0.08 * Math.sin(t * 7 + i)})`); halo.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, px * 26, 0, 7); g.fill();
    for (let k = 0; k < 5; k++) {
      const ph = (t * 2.2 + k * 0.37 + i * 0.13) % 1, fx = x + Math.round(Math.sin(t * 9 + k * 2 + i) * 2) * px - px;
      const fy = y - Math.round(ph * 7) * px - px * 2;
      g.fillStyle = ph < 0.3 ? '#fff0b0' : ph < 0.6 ? '#ffb040' : '#e0461e';
      g.fillRect(fx, fy, px * (ph < 0.5 ? 2 : 1), px * 2);
    }
  }
}

// Zone de feu annoncée : cercle rouge qui se remplit avant d'exploser.
function drawHazard(g, z, t, px) {
  const k = 1 - z.t / z.warn;
  g.fillStyle = `rgba(255,70,30,${0.12 + k * 0.25})`;
  g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, 7); g.fill();
  g.fillStyle = `rgba(255,170,60,${0.25 + 0.2 * Math.sin(t * 30)})`;
  g.beginPath(); g.ellipse(z.x, z.y, z.r * k, z.r * 0.6 * k, 0, 0, 7); g.fill();
  g.strokeStyle = '#ff5a2a'; g.lineWidth = px; g.setLineDash([px * 2, px * 2]); g.lineDashOffset = -t * 30;
  g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, 7); g.stroke(); g.setLineDash([]);
}

// Braises qui montent (coordonnées de l'écran).
function drawEmbers(g, world, t, px) {
  for (let i = 0; i < 22; i++) {
    const sp = 24 + (i % 5) * 8;
    const y = world.h + 20 - ((i * 97 + t * sp) % (world.h + 40));
    const x = ((i * 233 + Math.sin(t * 1.1 + i) * 24) % (world.w + 20)) - 10;
    g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5 + i);
    g.fillStyle = i % 3 ? '#ff9a3c' : '#ffd25a';
    g.fillRect(Math.round(x), Math.round(y), px, px);
  }
  g.globalAlpha = 1;
}

// ---------- Ambiance ----------
// Ombres de nuages qui glissent sur la région.
function drawClouds(g, world, t, camX, camY) {
  g.fillStyle = 'rgba(10,30,20,.10)';
  for (let i = 0; i < 7; i++) {
    const span = world.mapW + 800;
    const x = ((i * 977 + t * (14 + i * 3)) % span) - 400;
    const y = (i * 613) % world.mapH;
    if (x + 300 < camX || x - 300 > camX + world.w || y + 200 < camY || y - 200 > camY + world.h) continue;
    g.beginPath();
    g.ellipse(x, y, 220 + (i % 3) * 60, 90 + (i % 2) * 30, 0, 0, 7);
    g.ellipse(x + 140, y + 30, 150, 70, 0, 0, 7);
    g.ellipse(x - 120, y + 20, 130, 60, 0, 0, 7);
    g.fill();
  }
}
// Papillons qui volettent près des fleurs (coordonnées de la région).
function drawButterflies(g, world, t, px) {
  const cols = ['#ffffff', '#f6e27a', '#f29bb8', '#aee6ff'];
  for (let i = 0; i < 26; i++) {
    const bx = (i * 811) % world.mapW, by = (i * 457 + 200) % world.mapH;
    const x = bx + Math.sin(t * 0.7 + i) * 60 + Math.sin(t * 2.3 + i * 2) * 12;
    const y = by + Math.cos(t * 0.5 + i * 1.7) * 40 + Math.sin(t * 3 + i) * 6;
    if (x < world.cam.x - 20 || x > world.cam.x + world.w + 20 || y < world.cam.y - 20 || y > world.cam.y + world.h + 20) continue;
    const flap = Math.sin(t * 18 + i) > 0;
    g.fillStyle = cols[i % cols.length];
    g.fillRect(Math.round(x - px * (flap ? 2 : 1)), Math.round(y), px * (flap ? 2 : 1), px * 2);
    g.fillRect(Math.round(x + px), Math.round(y), px * (flap ? 2 : 1), px * 2);
    g.fillStyle = '#24161e'; g.fillRect(Math.round(x), Math.round(y), px, px * 2);
  }
}
// Feuilles qui tombent et dérivent (coordonnées de l'écran).
function drawLeaves(g, world, t, px) {
  const cols = ['#5a9a48', '#86bb68', '#c9a24a'];
  for (let i = 0; i < 14; i++) {
    const sp = 30 + (i % 4) * 9;
    const y = ((i * 131 + t * sp) % (world.h + 40)) - 20;
    const x = ((i * 293 + t * 18 + Math.sin(t * 1.3 + i) * 30) % (world.w + 40)) - 20;
    g.fillStyle = cols[i % 3];
    const tw = Math.sin(t * 4 + i) > 0;
    g.fillRect(Math.round(x), Math.round(y), px * (tw ? 2 : 1), px);
  }
}
