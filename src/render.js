// Tout le dessin sur le canvas. Formes dessinées par le code en attendant les sprites.
import { TIERS, bagMax, tierOf } from './data.js';
import { bagPos, canDrop, gloveRadius, attractionActive } from './game.js';

let bg = null, bgKey = '';

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildBackground(w, h, dpr, zone) {
  const c = document.createElement('canvas');
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = g.createRadialGradient(w / 2, h * 0.55, 40, w / 2, h / 2, Math.max(w, h) * 0.8);
  grad.addColorStop(0, zone.ground[0]); grad.addColorStop(1, zone.ground[1]);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  const r = seeded(42);
  // taches d'herbe claire
  g.fillStyle = zone.patch; g.globalAlpha = 0.35;
  for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 60 + r() * 120, 30 + r() * 50, r() * 3, 0, 7); g.fill(); }
  // brins
  g.globalAlpha = 0.35; g.strokeStyle = '#3d7337'; g.lineWidth = 1.5;
  for (let i = 0; i < (w * h) / 1800; i++) {
    const x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2 + r() * 4, y - 5 - r() * 4); g.stroke();
  }
  // fleurs
  g.globalAlpha = 0.9;
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h;
    g.fillStyle = zone.flower[Math.floor(r() * zone.flower.length)];
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.57) * 2.2, y + Math.sin(k * 1.57) * 2.2, 1.8, 0, 7); g.fill(); }
    g.fillStyle = '#f2b33d'; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill();
  }
  // rochers
  for (let i = 0; i < 9; i++) {
    const x = r() * w, y = r() * h, s = 7 + r() * 12;
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 2, y + s * 0.6, s * 1.2, s * 0.45, 0, 0, 7); g.fill();
    g.fillStyle = zone.rock; g.beginPath(); g.ellipse(x, y, s * 1.2, s * 0.85, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x - s * 0.35, y - s * 0.3, s * 0.5, s * 0.25, 0, 0, 7); g.fill();
  }
  // lisière d'arbres sur les bords
  for (let i = 0; i < 40; i++) {
    const edge = Math.floor(r() * 4);
    const x = edge === 0 ? r() * w : edge === 1 ? w - r() * 30 : edge === 2 ? r() * w : r() * 30;
    const y = edge === 0 ? r() * 30 : edge === 1 ? r() * h : edge === 2 ? h - r() * 30 : r() * h;
    const s = 18 + r() * 18;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + 4, y + 6, s, 0, 7); g.fill();
    g.fillStyle = zone.tree; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.3, s * 0.55, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,12,4,.45)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  return c;
}

const coinSprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const halo = g.createRadialGradient(16, 16, 3, 16, 16, 16);
  halo.addColorStop(0, 'rgba(255,220,110,.5)'); halo.addColorStop(1, 'rgba(255,220,110,0)');
  g.fillStyle = halo; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#b07a10'; g.beginPath(); g.ellipse(16, 17, 7, 6.5, 0, 0, 7); g.fill();
  g.fillStyle = '#ffd34d'; g.beginPath(); g.ellipse(16, 16, 7, 6.5, 0, 0, 7); g.fill();
  g.strokeStyle = '#d99a17'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(16, 16, 4.6, 4.2, 0, 0, 7); g.stroke();
  g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(13.5, 13.5, 2, 1.3, -0.6, 0, 7); g.fill();
  return c;
})();

export function drawEnemy(g, e, t) {
  const flash = e.hit > 0;
  const { def } = e;
  g.save(); g.translate(e.x, e.y);
  if (e.type === 'wisp') {
    const fl = Math.sin(e.ph * 2) * 2;
    const halo = g.createRadialGradient(0, 0, 2, 0, 0, e.r * 2.2);
    halo.addColorStop(0, 'rgba(255,190,90,.55)'); halo.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, e.r * 2.2, 0, 7); g.fill();
    g.fillStyle = flash ? '#fff' : def.color;
    g.beginPath(); g.moveTo(0, -e.r * 1.6 - fl);
    g.quadraticCurveTo(e.r, -e.r * 0.2, e.r * 0.8, e.r * 0.5);
    g.quadraticCurveTo(0, e.r * 1.2, -e.r * 0.8, e.r * 0.5);
    g.quadraticCurveTo(-e.r, -e.r * 0.2, 0, -e.r * 1.6 - fl); g.fill();
    g.fillStyle = def.core; g.beginPath(); g.ellipse(0, e.r * 0.2, e.r * 0.45, e.r * 0.55, 0, 0, 7); g.fill();
    eyes(g, e.r * 0.25, e.r * 0.1, 1.6);
  } else if (e.type === 'golem') {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, e.r * 0.85, e.r, e.r * 0.3, 0, 0, 7); g.fill();
    const wob = Math.sin(e.ph) * 1.5;
    g.fillStyle = flash ? '#fff' : def.core;
    g.beginPath(); g.ellipse(-e.r * 0.85, e.r * 0.1 + wob, e.r * 0.35, e.r * 0.45, 0.3, 0, 7); g.ellipse(e.r * 0.85, e.r * 0.1 - wob, e.r * 0.35, e.r * 0.45, -0.3, 0, 7); g.fill();
    g.fillStyle = flash ? '#fff' : def.color;
    g.beginPath(); g.moveTo(-e.r * 0.7, e.r * 0.7); g.lineTo(-e.r * 0.8, -e.r * 0.4); g.lineTo(-e.r * 0.3, -e.r * 0.9); g.lineTo(e.r * 0.4, -e.r * 0.85); g.lineTo(e.r * 0.8, -e.r * 0.3); g.lineTo(e.r * 0.7, e.r * 0.7); g.closePath(); g.fill();
    g.strokeStyle = def.core; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-e.r * 0.2, -e.r * 0.6); g.lineTo(0, -e.r * 0.1); g.lineTo(-e.r * 0.15, e.r * 0.3); g.stroke();
    g.fillStyle = '#ffdf7a'; g.beginPath(); g.arc(-e.r * 0.3, -e.r * 0.35, 2.2, 0, 7); g.arc(e.r * 0.3, -e.r * 0.35, 2.2, 0, 7); g.fill();
  } else {
    g.globalAlpha = 0.9;
    g.strokeStyle = flash ? '#fff' : def.color; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.lineWidth = 3 - k * 0.7;
      g.beginPath();
      g.arc(0, 0, e.r * (0.5 + k * 0.28), e.ph + k * 2, e.ph + k * 2 + 4.2);
      g.stroke();
    }
    g.fillStyle = def.core; g.beginPath(); g.arc(0, 0, e.r * 0.45, 0, 7); g.fill();
    g.globalAlpha = 1;
    eyes(g, e.r * 0.18, -1, 1.4);
  }
  g.restore();
  if (e.hp < e.max) {
    const w = e.r * 2;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w, 4);
    g.fillStyle = '#9be36b'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w * Math.max(0, e.hp / e.max), 4);
  }
}

function eyes(g, dx, y, r) {
  g.fillStyle = '#2a1a10';
  g.beginPath(); g.arc(-dx, y, r, 0, 7); g.arc(dx, y, r, 0, 7); g.fill();
}

export function drawArcher(g, x, y, face, bob, alpha = 1) {
  g.save(); g.translate(x, y); g.globalAlpha = alpha; g.scale(face, 1);
  const by = Math.sin(bob) * 1.2;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 13, 9, 3.5, 0, 0, 7); g.fill();
  // cape
  g.fillStyle = '#3f7a4a'; g.beginPath(); g.moveTo(-8, -2 + by); g.lineTo(8, -2 + by); g.lineTo(10, 12); g.lineTo(-10, 12); g.closePath(); g.fill();
  // tête et capuche
  g.fillStyle = '#f1c9a0'; g.beginPath(); g.arc(0, -7 + by, 5.5, 0, 7); g.fill();
  g.fillStyle = '#2f5e39'; g.beginPath(); g.arc(0, -8 + by, 7, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(5, -4 + by); g.lineTo(-5, -4 + by); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-6, -10 + by); g.lineTo(-11, -4 + by); g.lineTo(-5, -6 + by); g.fill();
  g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(2.5, -7 + by, 1, 0, 7); g.fill();
  // arc
  g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.beginPath(); g.arc(9, 2 + by, 9, -1.2, 1.2); g.stroke();
  g.strokeStyle = '#f3ead2'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(9 + Math.cos(-1.2) * 9, 2 + by + Math.sin(-1.2) * 9); g.lineTo(9 + Math.cos(1.2) * 9, 2 + by + Math.sin(1.2) * 9); g.stroke();
  g.restore();
}

// Le sac : grossit avec le remplissage, change de matière selon le palier, craque près du maximum.
export function drawBag(g, x, y, tierIdx, fill, t, shake = 0) {
  const tier = TIERS[tierIdx];
  const jitter = shake > 0 ? (Math.random() - 0.5) * 6 * Math.min(1, shake * 2 + 0.3) : (fill > 0.9 ? (Math.random() - 0.5) * 1.5 : 0);
  const R = 34 + 18 * fill;
  const breathe = Math.sin(t * 2.4) * 1.2 * (0.4 + fill);
  g.save(); g.translate(x + jitter, y);
  // halo
  const halo = g.createRadialGradient(0, -R * 0.3, 10, 0, -R * 0.3, R * 2.4);
  halo.addColorStop(0, hexA(tier.glow, 0.35 + fill * 0.25)); halo.addColorStop(1, hexA(tier.glow, 0));
  g.fillStyle = halo; g.beginPath(); g.arc(0, -R * 0.3, R * 2.4, 0, 7); g.fill();
  // ombre
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 4, R * 1.05, R * 0.28, 0, 0, 7); g.fill();
  // corps
  const bw = R + breathe, bh = R * 0.95 + breathe;
  const body = g.createRadialGradient(-bw * 0.35, -bh * 0.9, 4, 0, -bh * 0.6, bw * 1.4);
  body.addColorStop(0, shade(tier.color, 0.35)); body.addColorStop(0.6, tier.color); body.addColorStop(1, shade(tier.color, -0.35));
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(-bw * 0.32, -bh * 1.55);
  g.bezierCurveTo(-bw * 1.25, -bh * 1.3, -bw * 1.2, 0, 0, 0);
  g.bezierCurveTo(bw * 1.2, 0, bw * 1.25, -bh * 1.3, bw * 0.32, -bh * 1.55);
  g.closePath(); g.fill();
  // coutures
  g.strokeStyle = tier.seam; g.lineWidth = 1.5; g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(-bw * 0.25, -bh * 1.45); g.bezierCurveTo(-bw * 0.9, -bh * 1.1, -bw * 0.8, -bh * 0.15, 0, -bh * 0.06); g.stroke();
  g.setLineDash([]);
  // runes (soie et céleste)
  if (tierIdx >= 2) {
    g.fillStyle = hexA(tier.glow, 0.6 + 0.3 * Math.sin(t * 3));
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((i - 1) * bw * 0.4, -bh * 0.7, 2.5, 0, 7); g.fill(); }
  }
  // fissures quand le sac est presque plein ou qu'il craque
  if (fill > 0.85 || shake > 0) {
    g.strokeStyle = hexA(tier.glow, 0.9); g.lineWidth = 2;
    g.beginPath(); g.moveTo(bw * 0.5, -bh * 0.5); g.lineTo(bw * 0.62, -bh * 0.66); g.lineTo(bw * 0.55, -bh * 0.8); g.lineTo(bw * 0.7, -bh * 0.95); g.stroke();
    if (shake > 0) { g.beginPath(); g.moveTo(-bw * 0.6, -bh * 0.3); g.lineTo(-bw * 0.45, -bh * 0.5); g.lineTo(-bw * 0.62, -bh * 0.7); g.stroke(); }
  }
  // col, ficelle, ouverture
  g.fillStyle = shade(tier.color, -0.15);
  g.beginPath(); g.moveTo(-bw * 0.3, -bh * 1.5); g.lineTo(bw * 0.3, -bh * 1.5); g.lineTo(bw * 0.5, -bh * 1.85); g.lineTo(-bw * 0.5, -bh * 1.85); g.closePath(); g.fill();
  g.fillStyle = '#2a160a'; g.beginPath(); g.ellipse(0, -bh * 1.85, bw * 0.5, 5 + fill * 3, 0, 0, 7); g.fill();
  if (fill > 0.05) {
    g.globalAlpha = Math.min(1, fill * 2);
    for (let i = 0; i < 4; i++) g.drawImage(coinSprite, -bw * 0.4 + i * bw * 0.22, -bh * 1.85 - 9, 16, 16);
    g.globalAlpha = 1;
  }
  g.strokeStyle = '#c9a45a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-bw * 0.32, -bh * 1.52); g.lineTo(bw * 0.32, -bh * 1.52); g.stroke();
  g.beginPath(); g.moveTo(bw * 0.2, -bh * 1.52); g.quadraticCurveTo(bw * 0.5, -bh * 1.3, bw * 0.35, -bh * 1.15); g.stroke();
  g.restore();
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
  const key = `${w}x${h}@${dpr}:${zone.id}`;
  if (key !== bgKey) { bg = buildBackground(w, h, dpr, zone); bgKey = key; }
  g.drawImage(bg, 0, 0, w, h);
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

  const r = world.run;
  if (r && (world.phase === 'expedition' || world.phase === 'tear')) {
    const b = bagPos(world);
    const max = bagMax(world.stats);
    if (world.phase === 'expedition') {
      const tier = tierOf(r.bag, world.stats);
      drawBag(g, b.x, b.y + 30, tier, Math.min(1, r.bag / max), t);
      // gueule du sac
      g.strokeStyle = 'rgba(255,240,200,.18)'; g.setLineDash([3, 6]);
      g.beginPath(); g.arc(b.x, b.y, world.stats.bagMouth, 0, 7); g.stroke(); g.setLineDash([]);
    } else if (r.shake > 0) {
      drawBag(g, b.x, b.y + 30, r.tier, Math.min(1, r.bag / max) + 0.1, t, r.shake);
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
    g.beginPath(); g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, 0, 7); g.stroke();
  }
  g.globalAlpha = 1;

  for (const c of world.coins) {
    const a = c.fly ? 1 : Math.min(1, c.life / 1.5);
    const blink = !c.fly && c.life < 1.5 ? (Math.sin(t * 20) > 0 ? 1 : 0.4) : 1;
    g.globalAlpha = a * blink;
    const s = c.big ? 26 : 22;
    g.drawImage(coinSprite, c.x - s / 2, c.y - s / 2, s, s);
  }
  g.globalAlpha = 1;

  for (const e of world.enemies) drawEnemy(g, e, t);

  for (const u of world.heroes) drawArcher(g, u.x, u.y - u.drop * h * 0.5, u.face, u.bob);

  g.strokeStyle = '#5a3a1a'; g.lineWidth = 2;
  for (const a of world.arrows) {
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.dx * 12, a.y - a.dy * 12); g.stroke();
    g.fillStyle = '#d8d8d8'; g.beginPath(); g.arc(a.x, a.y, 1.6, 0, 7); g.fill();
  }

  for (const tx of world.texts) {
    g.globalAlpha = Math.min(1, tx.life * 2); g.fillStyle = tx.color;
    g.font = `700 ${tx.size}px 'Alegreya Sans', system-ui, sans-serif`; g.textAlign = 'center';
    g.fillText(tx.text, tx.x, tx.y);
  }
  g.globalAlpha = 1;

  // curseur : gant d'attraction
  const p = world.pointer;
  if (p.inside && (world.phase === 'expedition' || world.phase === 'tear')) {
    if (canDrop(world)) drawArcher(g, p.x, p.y, 1, 0, 0.5);
    const rad = gloveRadius(world);
    const on = attractionActive(world);
    g.strokeStyle = on ? 'rgba(255,214,102,.95)' : 'rgba(255,248,225,.65)';
    g.lineWidth = on ? 3 : 1.5; g.setLineDash([6, 6]); g.lineDashOffset = -t * 20;
    g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.stroke(); g.setLineDash([]);
    if (on) { g.fillStyle = 'rgba(255,214,102,.08)'; g.beginPath(); g.arc(p.x, p.y, rad, 0, 7); g.fill(); }
    g.fillStyle = '#fff8e1'; g.beginPath(); g.arc(p.x, p.y, 3, 0, 7); g.fill();
  }
}
