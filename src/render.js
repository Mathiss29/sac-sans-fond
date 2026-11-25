// Tout le dessin sur le canvas, en pixel art (sprites dans sprites.js).
import { TIERS, bagMax, tierOf } from './data.js';
import { bagPos, canDrop, gloveRadius, attractionActive } from './game.js';

import { buildSprites, bagSprite, buildMap } from './sprites.js';

const SPR = buildSprites();

// Taille d'un pixel d'art à l'écran : 3 sur ordinateur, 2 sur téléphone.
export function pixelSize(w, h) { return Math.max(2, Math.min(4, Math.round(Math.min(w, h) / 240))); }

// La région est dessinée une fois en basse résolution, puis on n'en affiche que la partie visible.
let mapInfo = null, mapKey = '', vig = null, vigKey = '';
export function getMap(world) {
  const px = pixelSize(world.w, world.h);
  const key = `${world.zone.id}@${px}:${world.mapW}x${world.mapH}`;
  if (key !== mapKey) {
    mapInfo = buildMap(Math.ceil(world.mapW / px), Math.ceil(world.mapH / px), world.zone);
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

export function drawEnemy(g, e, t, px = 3) {
  const frames = SPR.enemies[e.gold ? 'gold' : e.type] || SPR.enemies.wisp;
  const f = frames[Math.floor(e.ph * 0.9) % frames.length];
  const img = e.hit > 0 ? f.white : f.c;
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
  if (e.slow > 0) { g.fillStyle = 'rgba(174,230,255,.35)'; g.fillRect(Math.round(e.x - w / 2), Math.round(e.y - h / 2 + hover), w, h); }
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
  const sx = Math.round(world.cam.x / px), sy = Math.round(world.cam.y / px);
  const camX = sx * px, camY = sy * px;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#1c2a1c'; g.fillRect(0, 0, w, h);
  g.drawImage(map.c, sx, sy, Math.ceil(w / px), Math.ceil(h / px), 0, 0, Math.ceil(w / px) * px, Math.ceil(h / px) * px);
  const t = world.t;

  // lucioles d'ambiance
  g.fillStyle = 'rgba(255,245,190,.5)';
  for (let i = 0; i < 18; i++) {
    const x = (i * 97.3 + Math.sin(t * 0.3 + i) * 40) % w;
    const y = (i * 53.7 + Math.cos(t * 0.25 + i * 1.3) * 30 + h) % h;
    g.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + i);
    g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  g.save(); g.translate(-camX, -camY);
  const r = world.run;
  if (r && (world.phase === 'expedition' || world.phase === 'tear')) {
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
    const s = SPR.coin.width * (c.big ? px + 1 : px);
    g.drawImage(SPR.coin, Math.round(c.x - s / 2), Math.round(c.y - s / 2), s, s);
  }
  g.globalAlpha = 1;

  for (const e of world.enemies) drawEnemy(g, e, t, px);

  // aura des bardes
  for (const u of world.heroes) {
    if (u.type !== 'bard' || u.drop > 0) continue;
    g.strokeStyle = 'rgba(255,230,140,.25)'; g.setLineDash([2, 8]); g.lineWidth = 2; g.lineDashOffset = -t * 10;
    g.beginPath(); g.arc(u.x, u.y + 8, world.stats.bardAura, 0, 7); g.stroke(); g.setLineDash([]);
  }
  const heroes = [...world.heroes].sort((a, b) => a.y - b.y);
  for (const u of heroes) {
    drawHero(g, u.type, u.x, u.y + 12 - u.drop * h * 0.5, u.face, u.moving ? u.bob * 2 : u.bob * 0.5, 1, px);
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

  for (const tx of world.texts) {
    g.globalAlpha = Math.min(1, tx.life * 2); g.fillStyle = tx.color;
    g.font = `700 ${tx.size}px 'Alegreya Sans', system-ui, sans-serif`; g.textAlign = 'center';
    g.fillText(tx.text, tx.x, tx.y);
  }
  g.globalAlpha = 1;
  g.restore();
  g.drawImage(vignette(w, h, dpr), 0, 0, w, h);

  // curseur : gant d'attraction
  const p = world.pointer;
  if (p.inside && (world.phase === 'expedition' || world.phase === 'tear')) {
    if (canDrop(world)) drawHero(g, world.run.sel, p.x, p.y + 12, 1, 0, 0.5, px);
    const rad = gloveRadius(world);
    const on = attractionActive(world);
    g.strokeStyle = on ? 'rgba(255,214,102,.95)' : 'rgba(255,248,225,.65)';
    g.lineWidth = on ? 3 : 1.5; g.setLineDash([6, 6]); g.lineDashOffset = -t * 20;
    g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.stroke(); g.setLineDash([]);
    if (on) { g.fillStyle = 'rgba(255,214,102,.08)'; g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.fill(); }
    g.fillStyle = '#fff8e1'; g.beginPath(); g.arc(p.x, p.y, 3, 0, 7); g.fill();
  }
}
