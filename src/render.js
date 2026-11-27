// Tout le dessin sur le canvas, en pixel art (sprites dans sprites.js).
import { RARITIES as GEAR_RARITIES } from './gear.js';
import { TIERS, ENEMIES, bagMax, tierOf } from './data.js';
const UI_FONT = "'Silkscreen', 'Pixelify Sans', monospace";
import { bagPos, canDrop, gloveRadius, attractionActive, focusActive, FOCUS_R, portalPos, RARITIES } from './game.js';

import { petSprite, treatSprite, PET_RARITIES, SPECIES } from './pets.js';
import { buildSprites, loadHeroSheets, loadMonsterSheets, bagSprite, buildMap, buildArena, portalSprite } from './sprites.js';

const SPR = buildSprites();
export const heroSheetsReady = Promise.all([loadHeroSheets(), loadMonsterSheets().then(() => { for (const k in iconCache) delete iconCache[k]; for (const k in tintCache) delete tintCache[k]; })]);

// Taille d'un pixel d'art à l'écran : 2 en général (vue large), 3 sur très grand écran.
export function pixelSize(w, h) { return Math.max(2, Math.min(4, Math.floor(Math.min(w, h) / 420))); }

// La région est dessinée une fois en basse résolution, puis on n'en affiche que la partie visible.
let mapInfo = null, mapKey = '', vig = null, vigKey = '';
export function getMap(world) {
  const px = pixelSize(world.w, world.h);
  const arena = world.mode === 'arena';
  const key = `${arena ? 'antre' : world.zone.id + '#' + (world.zone.layout ? world.zone.layout.seed + world.zone.layout.kind : 0)}@${px}:${world.mapW}x${world.mapH}`;
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
  const def = ENEMIES[type], own = !!SPR.enemies[type], look = own ? type : (def && def.look) || type;
  let fr = SPR.enemies[look] || SPR.enemies.wisp;
  if (def && def.tint && !own) fr = tinted(look, def.tint, fr);
  const f = fr[0].c;
  const c = document.createElement('canvas'); c.width = 22; c.height = 22;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const k = Math.max(1, Math.floor(22 / Math.max(f.width, f.height)));
  g.drawImage(f, Math.round((22 - f.width * k) / 2), Math.round((22 - f.height * k) / 2), f.width * k, f.height * k);
  return (iconCache[type] = c);
}

// Petite couronne d'élite posée au-dessus de la tête.
const CROWN = ['O.O.O.O', 'OyOyOyO', 'OyyryyO', 'OyyyyyO', 'OOOOOOO'];
function drawCrown(g, x, y, px) {
  const c = { O: '#24161e', y: '#ffd246', r: '#e0505a' }, s = Math.max(2, Math.round(px * 0.8));
  for (let j = 0; j < CROWN.length; j++) for (let i = 0; i < 7; i++) {
    const ch = CROWN[j][i]; if (ch === '.') continue;
    g.fillStyle = c[ch]; g.fillRect(x + (i - 3.5) * s, y + (j - 5) * s, s, s);
  }
}

// Images d'un ennemi : sa planche, ou le dessin d'origine teinté ; variante sombre aux yeux rouges en niveau II.
let hardZone = false;
function enemyFrames(e) {
  const own = !e.boss && !e.gold && SPR.enemies[e.type];
  const key = e.boss ? (e.def && e.def.look && SPR.enemies[e.def.look] ? e.def.look : 'boss') : e.gold ? 'gold' : own ? e.type : (e.def && e.def.look) || e.type;
  let frames = SPR.enemies[key] || SPR.enemies.wisp;
  if (e.def && e.def.tint && !own && !(e.boss && key !== 'boss')) frames = tinted(key, e.def.tint, frames);
  if (hardZone && !e.boss && !e.gold && !e.event) frames = hardened(key + (own ? '' : (e.def && e.def.tint) || ''), frames);
  if (e.elite) frames = tinted(key + 'elite' + (hardZone ? 'II' : ''), '#ffd246', frames);
  if (e.boss && e.rage) frames = tinted(key + 'rage', '#ff2a1a', frames);   // boss en colère : il rougit
  return { key, frames };
}
const hardCache = {};
function hardened(id, frames) {
  if (hardCache[id]) return hardCache[id];
  const conv = im => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i], gg = p[i + 1], b = p[i + 2];
      // yeux jaunes ou clairs → rouge vif ; le reste s'assombrit et tire vers le violet
      if (r > 170 && gg > 120 && b < 120 && r - b > 90) { p[i] = 255; p[i + 1] = 50; p[i + 2] = 40; continue; }
      p[i] = r * 0.62 + 18; p[i + 1] = gg * 0.55 + 6; p[i + 2] = b * 0.62 + 26;
    }
    x.putImageData(d, 0, 0);
    return c;
  };
  return (hardCache[id] = frames.map(f => ({ ...f, c: conv(f.c), white: f.white })));
}
// Mort d'un ennemi : il s'écrase et s'efface ; les volants tombent, les autres laissent une flaque.
function drawDeath(g, d, t, px) {
  const k = 1 - d.t / d.life, { key, frames } = enemyFrames(d), drawn = SPR.enemyScale && SPR.enemyScale[key];
  const img = frames[Math.floor(d.ph * 0.9) % frames.length].c, sc = px * (drawn || 1), w = img.width * sc, h = img.height * sc;
  const fly = d.def && (d.def.role === 'fast' || d.type === 'wisp');
  g.save();
  if (!fly) {   // flaque de la couleur de la créature
    g.globalAlpha = 0.45 * (1 - k * k); g.fillStyle = (d.def && d.def.color) || '#6a5a4a';
    g.beginPath(); g.ellipse(d.x, d.y + h * 0.42, w * 0.35 * (0.6 + k * 0.6), px * 2.2 * (0.6 + k * 0.6), 0, 0, 7); g.fill();
  }
  g.globalAlpha = 1 - k;
  const fall = fly ? k * k * 40 : 0, sq = fly ? 1 : 1 - k * 0.7;
  g.translate(Math.round(d.x), Math.round(d.y + h * 0.5 + fall));
  if (fly) g.rotate(d.face * k * 1.6);
  g.scale((drawn && d.face > 0 ? -1 : 1) * (1 + (fly ? 0 : k * 0.25)), sq);
  g.drawImage(img, Math.round(-w / 2), Math.round(-h), w, h);
  g.restore();
}

// Image k d'un ennemi pour l'interface (bestiaire animé), dans un carré de taille n.
export function enemyFrameIcon(type, k, n = 44) {
  const ck = `${type}#${k % enemyFrameCount(type)}#${n}`;
  if (iconCache[ck]) return iconCache[ck];
  const def = ENEMIES[type], own = !!SPR.enemies[type], look = own ? type : (def && def.look) || type;
  let fr = SPR.enemies[look] || SPR.enemies.wisp;
  if (def && def.tint && !own) fr = tinted(look, def.tint, fr);
  const f = fr[k % fr.length].c, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const s = Math.max(1, Math.floor(n / Math.max(f.width, f.height) * 2) / 2);
  x.drawImage(f, Math.round((n - f.width * s) / 2), Math.round((n - f.height * s) / 2), f.width * s, f.height * s);
  return (iconCache[ck] = c);
}
export function enemyFrameCount(type) { const def = ENEMIES[type], own = !!SPR.enemies[type]; return (SPR.enemies[own ? type : (def && def.look) || type] || SPR.enemies.wisp).length; }

export function drawEnemy(g, e, t, px = 3) {
  if (e.fall > 0) {   // tombe du ciel : ombre qui grossit, créature au-dessus
    const k = Math.min(1, e.fall / 1.2);
    g.fillStyle = `rgba(0,0,0,${0.3 * (1 - k)})`; g.beginPath(); g.ellipse(e.x, e.y + 8, e.r * (1 - k * 0.6), e.r * 0.4 * (1 - k * 0.6), 0, 0, 7); g.fill();
    g.save(); g.translate(0, -k * 260); drawEnemy(g, { ...e, fall: 0, hp: e.max }, t, px); g.restore();
    return;
  }
  let { key, frames } = enemyFrames(e);
  if (e.boss && e.dash && e.dash.warn > 0) {   // ruée annoncée : ligne rouge vers la cible
    g.strokeStyle = `rgba(255,70,50,${0.4 + 0.4 * Math.sin(t * 25)})`; g.lineWidth = e.r * 0.9; g.setLineDash([px * 4, px * 3]);
    g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.dash.tx, e.dash.ty); g.stroke(); g.setLineDash([]);
  }
  const drawn = SPR.enemyScale && SPR.enemyScale[key];
  // boss dessiné : 4 images de repos, puis 4 de coup de poing quand il frappe
  // planche de boss à 12 images : repos ×4, attaque ×4, blessé ×2, endormi ×2 (il se réveille en arrivant dans l'antre)
  if (drawn && e.boss && frames.length >= 8) {
    const F = frames, sleepy = !e.woke && e.home, wake = F.length >= 12 && !e.fake && (sleepy || (e.age || 0) - (e.wokeAt || 1.1) < 0.5);
    frames = wake ? (sleepy ? [F[10], F[11]] : [F[8], F[9]]) : F.length >= 12 && e.hp <= 0 ? [F[8], F[9]] : e.atk > 0 ? F.slice(4, 8) : F.slice(0, 4);
  }
  const f = drawn && e.boss && e.atk > 0 && frames.length >= 4 ? frames[Math.min(3, Math.floor((1 - e.atk / 0.7) * 4))] : e.type === 'mimic' ? (frames.length >= 6 ? (e.awake ? frames[2 + Math.floor(e.ph * 4) % 4] : frames[Math.floor(e.ph * 0.9) % 2]) : frames[e.awake ? 1 : 0]) : frames[Math.floor(e.ph * (e.type === 'goblin' ? 4 : e.type === 'vein' ? 2 : 0.9)) % frames.length];
  // le boss est frappé sans arrêt : un bref éclair seulement, sinon il resterait blanc
  const flash = e.boss ? e.hit > 0.09 && Math.floor(t * 20) % 3 === 0 : e.hit > 0.06 || (e.hit > 0 && Math.floor(t * 30) % 2);
  const img = flash ? f.white : f.c;
  const k = (e.boss ? px * 2 : px) * (drawn || 1);
  const w = img.width * k, h = img.height * k;
  const fly = e.type === 'wisp' || e.type === 'wind' || e.boss;
  const hover = fly ? Math.round(Math.sin(e.ph * 1.3) * 1.5) * px : 0;
  shadow(g, e.x, e.y + h * 0.45, w * 0.32, px * 1.6);
  if (e.elite) {   // élite : aura dorée qui pulse sous la créature
    const R = w * (0.75 + 0.08 * Math.sin(t * 4 + e.ph)), au = g.createRadialGradient(e.x, e.y + hover, 2, e.x, e.y + hover, R);
    au.addColorStop(0, 'rgba(255,214,80,.42)'); au.addColorStop(1, 'rgba(255,214,80,0)');
    g.fillStyle = au; g.beginPath(); g.arc(e.x, e.y + hover, R, 0, 7); g.fill();
  }
  if (e.type === 'wisp' || e.gold || e.boss) {
    const halo = g.createRadialGradient(e.x, e.y + hover, 2, e.x, e.y + hover, w * 0.9);
    halo.addColorStop(0, e.gold ? 'rgba(255,230,120,.45)' : e.rage ? `rgba(255,50,30,${0.4 + 0.15 * Math.sin(t * 8)})` : 'rgba(255,170,80,.35)'); halo.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(e.x, e.y + hover, w * 0.9, 0, 7); g.fill();
  }
  if (drawn && !e.boss && Math.cos(e.a) > 0.2) {
    // les planches regardent vers la gauche : on retourne quand le monstre va à droite
    g.save(); g.translate(Math.round(e.x), 0); g.scale(-1, 1);
    g.drawImage(img, Math.round(-w / 2), Math.round(e.y - h / 2 + hover), w, h); g.restore();
  } else g.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y - h / 2 + hover), w, h);
  if (e.event) {
    // créature d'événement : une flèche dorée qui rebondit au-dessus d'elle
    const ay = Math.round(e.y - h / 2 - px * 6 + Math.abs(Math.sin(t * 5)) * -px * 3);
    g.fillStyle = '#24161e'; g.fillRect(Math.round(e.x) - px * 3, ay - px, px * 6, px * 2); g.fillRect(Math.round(e.x) - px * 2, ay + px, px * 4, px); g.fillRect(Math.round(e.x) - px, ay + px * 2, px * 2, px);
    g.fillStyle = '#ffd246'; g.fillRect(Math.round(e.x) - px * 2, ay - px + 1, px * 4, px * 2 - 1); g.fillRect(Math.round(e.x) - px, ay + px, px * 2, px);
  }
  if (e.wanted) {   // avis de recherche : cible rouge et prime qui fond
    const ty = Math.round(e.y - h / 2 - px * 8);
    g.strokeStyle = '#ff5a5a'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y, w * 0.6 + Math.sin(t * 6) * 2, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(e.x - w * 0.75, e.y); g.lineTo(e.x - w * 0.45, e.y); g.moveTo(e.x + w * 0.45, e.y); g.lineTo(e.x + w * 0.75, e.y); g.stroke();
    g.font = `700 ${px * 6}px ${UI_FONT}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#24161e';
    const txt = 'Prime ' + Math.round(e.value); g.strokeText(txt, e.x, ty); g.fillStyle = '#ffd246'; g.fillText(txt, e.x, ty);
  }
  if (e.boss) bossExtras(g, e, t, px, w, h);
  if (e.elite) drawCrown(g, Math.round(e.x), Math.round(e.y - h / 2 + hover - px * 3 + Math.sin(t * 3 + e.ph) * px * 0.6), px);
  if (e.elite) { g.strokeStyle = 'rgba(255,210,70,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y + h * 0.42, w * 0.42, px * 2.5, 0, 0, 7); g.stroke(); }
  if (e.guard) { g.strokeStyle = '#aee6ff'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.arc(e.x, e.y, w * 0.6, 0, 7); g.stroke(); g.setLineDash([]); }
  if (e.frozen > 0 && !e.boss) { g.fillStyle = 'rgba(174,230,255,.35)'; g.fillRect(Math.round(e.x - w / 2), Math.round(e.y - h / 2 + hover), w, h); }
  if (e.burn > 0 && Math.random() < 0.3) { g.fillStyle = Math.random() < 0.5 ? '#ff7a3c' : '#ffd246'; g.fillRect(Math.round(e.x + (Math.random() - 0.5) * w * 0.6), Math.round(e.y - h * 0.3 + hover), px, px * 2); }
  if (e.slow > 0) {
    // ralenti : petits éclats de givre qui tournent autour
    for (let i = 0; i < 4; i++) {
      const an = t * 3 + i * Math.PI / 2, rx = w * 0.55, ry = h * 0.35;
      const ix = Math.round(e.x + Math.cos(an) * rx), iy = Math.round(e.y + hover + Math.sin(an) * ry);
      g.fillStyle = '#24161e'; g.fillRect(ix - px, iy - px, px * 3, px * 3);
      g.fillStyle = i % 2 ? '#aee6ff' : '#f0fbff'; g.fillRect(ix - px + 1, iy - px + 1, px * 3 - 2, px * 3 - 2);
    }
  }
  if (e.type === 'vein') {
    // filon : jauge dorée de l'or qu'il lui reste, avec le montant
    const bw = Math.max(34, w * 0.9), x0 = Math.round(e.x - bw / 2), y = Math.round(e.y - h / 2 + hover - 9), k = Math.max(0, Math.min(1, e.value / (e.total || 1)));
    g.fillStyle = '#24161e'; g.fillRect(x0 - 1, y - 1, bw + 2, 6);
    g.fillStyle = '#5a4614'; g.fillRect(x0, y, bw, 4);
    g.fillStyle = '#ffd246'; g.fillRect(x0, y, Math.round(bw * k), 4);
    g.fillStyle = '#fff3a8'; g.fillRect(x0, y, Math.round(bw * k), 1);
    g.font = `700 ${px * 5}px ${UI_FONT}`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#24161e';
    const txt = veinFmt(e.value); g.strokeText(txt, e.x, y - 4); g.fillStyle = '#ffd246'; g.fillText(txt, e.x, y - 4);
    g.textAlign = 'start';
  } else if (e.hp < e.max && !e.boss) {
    const bw = Math.max(18, w * 0.7), y = Math.round(e.y - h / 2 + hover - 7);
    g.fillStyle = '#24161e'; g.fillRect(Math.round(e.x - bw / 2) - 1, y - 1, bw + 2, 5);
    g.fillStyle = '#9be36b'; g.fillRect(Math.round(e.x - bw / 2), y, bw * Math.max(0, e.hp / e.max), 3);
  }
}

// Boss : bulle protectrice, armure, jauge d'étourdissement.
function bossExtras(g, e, t, px, w, h) {
  if (e.shield) {
    g.fillStyle = `rgba(160,220,255,${0.18 + 0.06 * Math.sin(t * 4)})`; g.strokeStyle = 'rgba(200,240,255,.8)'; g.lineWidth = 2;
    g.beginPath(); g.arc(e.x, e.y, Math.max(w, h) * 0.62, 0, 7); g.fill(); g.stroke();
  }
  const bw = Math.max(60, w * 0.8), x0 = Math.round(e.x - bw / 2); let y = Math.round(e.y + h * 0.5 + px * 3);
  if (e.armorMax) {
    g.fillStyle = '#24161e'; g.fillRect(x0 - 1, y - 1, bw + 2, 6);
    g.fillStyle = e.armor > 0 ? '#c8d0d8' : '#5a5a60'; g.fillRect(x0, y, bw * Math.max(0, e.armor / e.armorMax), 4); y += 8;
  }
  if (e.stunned > 0) {
    for (let i = 0; i < 3; i++) { const an = t * 5 + i * 2.1; g.fillStyle = '#ffe14a'; g.fillRect(Math.round(e.x + Math.cos(an) * w * 0.35) - px, Math.round(e.y - h * 0.55 + Math.sin(an) * px * 3) - px, px * 2, px * 2); }
  } else if (e.stunBar) {
    g.fillStyle = '#24161e'; g.fillRect(x0 - 1, y - 1, bw + 2, 4);
    g.fillStyle = '#ffe14a'; g.fillRect(x0, y, bw * Math.min(1, e.stunBar / 120), 2);
  }
}

// Flèches au bord de l'écran : portail du boss ouvert, créatures d'événement hors de vue.
function edgeArrows(g, world, t, camX, camY) {
  const { w, h } = world, r = world.run, list = [];
  if (r.lair && r.lair.open && !r.lair.done) list.push({ ...portalPos(world), color: '#ff9a3c', label: '♛' });
  for (const e of world.enemies) if (e.event && !e.dead) list.push({ x: e.x, y: e.y, color: '#ffd246', label: '!' });
  for (const p of list) {
    const sx = p.x - camX, sy = p.y - camY;
    if (sx > 0 && sy > 0 && sx < w && sy < h) continue;
    const cx = w / 2, cy = h / 2, dx = sx - cx, dy = sy - cy, k = Math.min((w / 2 - 34) / Math.abs(dx || 1), (h / 2 - 34) / Math.abs(dy || 1));
    const ax = cx + dx * k, ay = cy + dy * k, an = Math.atan2(dy, dx), pul = 1 + 0.12 * Math.sin(t * 6);
    g.save(); g.translate(ax, ay); g.rotate(an); g.scale(pul, pul);
    g.fillStyle = '#24161e'; g.beginPath(); g.moveTo(18, 0); g.lineTo(-10, -13); g.lineTo(-10, 13); g.closePath(); g.fill();
    g.fillStyle = p.color; g.beginPath(); g.moveTo(14, 0); g.lineTo(-7, -9); g.lineTo(-7, 9); g.closePath(); g.fill();
    g.restore();
    g.font = `400 13px ${UI_FONT}`; g.textAlign = 'center'; g.fillStyle = '#24161e'; g.fillText(p.label, ax - Math.cos(an) * 20 + 1, ay - Math.sin(an) * 20 + 6);
    g.fillStyle = '#fff6dc'; g.fillText(p.label, ax - Math.cos(an) * 20, ay - Math.sin(an) * 20 + 5);
  }
}

// Garde-robe : teinte de tenue par lignée (voir COSTUMES dans data.js).
let heroTints = {};
const tintSheets = new Map();
export function setHeroTints(m) { heroTints = m || {}; }
// Classes : planche propre à la classe choisie (ex. arA1 = Œil-de-faucon), sinon celle de sa voie (arA), sinon le héros de base.
let heroSkins = {};
export function setHeroSkins(cls) { heroSkins = cls || {}; }
function sheetOf(type) {
  const S = SPR.sheets; if (!S) return null;
  const c = heroSkins[type];
  const ok = id => S[id] && S[id].img.idle && S[id].img.idle.naturalWidth;
  if (c && ok(c)) return S[c];
  if (c && c.length > 3 && ok(c.slice(0, 3))) return S[c.slice(0, 3)];
  return S[type] || null;
}
function tintOf(src, color) {
  if (!color) return src;
  let byCol = tintSheets.get(src);
  if (!byCol) { byCol = {}; tintSheets.set(src, byCol); }
  if (byCol[color]) return byCol[color];
  const c = document.createElement('canvas'); c.width = src.width || src.naturalWidth; c.height = src.height || src.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.4; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (byCol[color] = c);
}

function drawChest(g, c, t) {
  const x = Math.round(c.x), y = Math.round(c.y);
  if (!c.open) {
    g.fillStyle = 'rgba(60,40,24,.45)'; g.beginPath(); g.ellipse(x, y + 4, 16, 6, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,84,48,.55)'; g.fillRect(x - 8, y - 2, 16, 6);
    const ph = (t * 0.7 + (c.x % 7) / 7) % 2.5;
    if (ph < 0.35) { const a = 1 - ph / 0.35; g.fillStyle = `rgba(255,240,170,${a})`; g.fillRect(x + 3, y - 10, 2, 8); g.fillRect(x, y - 7, 8, 2); }
    return;
  }
  if (c.t > 4) return;
  g.globalAlpha = Math.min(1, 4 - c.t);
  g.fillStyle = '#24161e'; g.fillRect(x - 11, y - 9, 22, 14);
  g.fillStyle = '#8a5a2e'; g.fillRect(x - 10, y - 4, 20, 8);
  g.fillStyle = '#5a3418'; g.fillRect(x - 10, y - 16, 20, 6);
  g.fillStyle = '#ffd246'; g.fillRect(x - 8, y - 8, 16, 3); g.fillRect(x - 2, y - 3, 4, 3);
  g.globalAlpha = 1;
}

// Héros : pieds posés en (x, y), regard vers la droite si face = 1.
// pose = { anim, k } pour les héros qui ont une planche dessinée (sinon ancien sprite à 2 images).
export function drawHero(g, type, x, y, face, bob, alpha = 1, px = 3, pose = null) {
  const tint = heroTints[type];
  const sheet = sheetOf(type);
  const anim = pose ? pose.anim : 'idle';
  if (sheet && sheet.img[anim] && sheet.img[anim].complete && sheet.img[anim].naturalWidth) {
    const [cw, ch] = sheet.cell, n = sheet.anims[anim];
    const k = ((pose ? Math.floor(pose.k) : 0) % n + n) % n;
    const sc = px / 2, w = cw * sc, h = ch * sc;
    g.save(); g.globalAlpha = alpha;
    shadow(g, x, y - px, 6 * px, 1.8 * px);
    g.translate(Math.round(x), Math.round(y)); g.scale(-face, 1); // la planche regarde vers la gauche
    g.drawImage(tintOf(sheet.img[anim], tint), k * cw, 0, cw, ch, -sheet.anchor * sc, -h + sc, w, h);
    g.restore();
    return;
  }
  const frames = SPR.heroes[type] || SPR.heroes.archer;
  const img = tintOf(frames[Math.floor(bob / Math.PI) % 2], tint);
  const w = img.width * px, h = img.height * px;
  g.save(); g.globalAlpha = alpha;
  shadow(g, x, y - px, 6 * px, 1.8 * px);
  g.translate(Math.round(x), Math.round(y)); g.scale(face, 1);
  g.drawImage(img, -8 * px, -h, w, h); // la colonne 8 est le milieu du corps
  g.restore();
}

// Choisit l'animation d'un héros sur la carte selon ce qu'il fait.
// Le tir est découpé en deux : on bande l'arc pendant la fin du temps de recharge,
// puis la flèche part (images 3 à 5) au moment exact où le jeu la crée.
function heroPose(world, u, t) {
  const sheet = sheetOf(u.type);
  if (!sheet) return null;
  if (u.stun > 0) return { anim: 'hurt', k: t * sheet.fps.hurt };
  if (u.drop > 0) return { anim: 'idle', k: 0 };
  if (u.moving) return { anim: 'walk', k: u.bob * sheet.fps.walk / 3 };
  const rel = sheet.release;
  if (u.recoil > 0) return { anim: 'attack', k: rel + (1 - u.recoil) * (sheet.anims.attack - rel) };
  const cd = world.stats.cooldown[u.type] || 1, wind = Math.min(0.3, cd * 0.5);
  if (u.aiming && u.cd < wind) return { anim: 'attack', k: Math.min(rel - 0.01, (1 - u.cd / wind) * rel) };
  return { anim: 'idle', k: u.bob * sheet.fps.idle / 3 };
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
  hardZone = !!(world.zone && world.zone.hard) && world.mode === 'map';
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
  if (!arena && world.stage && world.stage.id === 'neige') {
    // sol enneigé : seulement le décor, les personnages gardent leurs couleurs
    g.save();
    g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,0.6)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,215,240,0.42)'; g.fillRect(0, 0, w, h);
    g.restore();
  }

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
  if (!arena) drawAreas(g, world, t);
  const r = world.run;
  if (arena) drawBraziers(g, map, t, px);
  else if (r && (world.phase === 'expedition' || world.phase === 'tear')) drawPortal(g, world, t, px);
  if (r && !arena && (world.phase === 'expedition' || world.phase === 'tear' || world.phase === 'done')) {
    const b = bagPos(world);
    const max = bagMax(world.stats);
    if (world.phase === 'expedition') {
      const tier = tierOf(r.bag, world.stats);
      drawBag(g, b.x, b.y + 30, tier, Math.min(1, r.bag / max), t, 0, px);
      // gueule du sac
      g.strokeStyle = 'rgba(255,240,200,.18)'; g.setLineDash([3, 6]);
      g.beginPath(); g.arc(b.x, b.y, world.stats.bagMouth, 0, 7); g.stroke(); g.setLineDash([]);
    } else if (r.shake > 0) {
      const ct = r.climb ?? r.tier;
      drawBag(g, b.x, b.y + 30, ct, Math.min(1, r.bag / max) + 0.1, t, r.shake, px);
      // nom du palier atteint au-dessus du sac, qui « saute » à chaque montée
      const age = r.climbAge || 0, sc = 1 + Math.max(0, 0.35 - age) * 1.6;
      g.save(); g.translate(Math.round(b.x), Math.round(b.y - 58)); g.scale(sc, sc);
      g.font = `400 20px ${UI_FONT}`; g.textAlign = 'center'; g.lineJoin = 'round';
      const name = TIERS[ct].name.replace(/^Sac (de |d')/, '').toUpperCase() + ' !';
      g.strokeStyle = '#10140d'; g.lineWidth = 5; g.strokeText(name, 0, 0);
      g.fillStyle = TIERS[ct].glow; g.fillText(name, 0, 0);
      if (ct > 0) {
        const tag = '×' + String(TIERS[ct].mult).replace('.', ',');
        g.font = `400 16px ${UI_FONT}`; const tw = g.measureText(tag).width + 12;
        g.fillStyle = '#10140d'; g.fillRect(42, 26, tw + 6, 26);
        g.fillStyle = TIERS[ct].color; g.fillRect(44, 28, tw + 2, 22);
        g.fillStyle = '#1b1610'; g.fillRect(46, 30, tw - 2, 18);
        g.fillStyle = TIERS[ct].glow; g.textAlign = 'left'; g.fillText(tag, 51, 45);
      }
      g.restore();
      if (age < 0.18) { g.globalAlpha = (0.18 - age) / 0.18 * 0.85; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(b.x, b.y + 4, 34, 0, 7); g.fill(); g.globalAlpha = 1; }
    } else {
      // le sac vidé reste là, ouvert, au milieu de ses lambeaux
      drawBag(g, b.x, b.y + 30, r.tier, 0.05, t, 0, px);
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
    else if (f.kind === 'ray') {   // Rayon de glace : un faisceau large qui s'éteint
      g.lineCap = 'round'; g.lineWidth = 34 * (1 - k * 0.6); g.strokeStyle = 'rgba(174,230,255,.55)'; g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke();
      g.beginPath(); g.lineWidth = 10 * (1 - k * 0.6); g.strokeStyle = '#f0fbff'; g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.lineCap = 'butt';
    } else if (f.kind === 'bolt') {   // éclair du héraut
      g.lineWidth = 3; g.strokeStyle = f.color; let x = f.x, y = f.y - 220; g.moveTo(x, y);
      for (let i = 0; i < 6; i++) { y += 220 / 6; x = f.x + (i < 5 ? rnd2(f.x + i) * 18 : 0); g.lineTo(x, y); }
    }
    else g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * k, 0, 7);
    g.stroke();
  }
  g.globalAlpha = 1;

  for (const c of world.coins) {
    const a = c.fly ? 1 : Math.min(1, c.life / 1.5);
    const blink = !c.fly && c.life < 1.5 ? (Math.sin(t * 20) > 0 ? 1 : 0.4) : 1;
    g.globalAlpha = a * blink;
    const im = c.treat ? treatSprite(c.treat) : SPR.loot[c.kind || 'coin'] || SPR.coin;
    const k = c.item ? px + 1 : c.kind && c.kind !== 'coin' ? px : (c.big ? px + 1 : px);
    const nk = c.near ? 1.3 : 1;
    const s = im.width * k * nk, sh2 = im.height * k * nk;
    const z = c.z || 0;
    if (c.near) { // sous le gant : la pièce gonfle et brille avant d'être aspirée
      g.fillStyle = 'rgba(255,240,170,.35)'; g.beginPath(); g.arc(c.x, c.y - z, s * 0.85, 0, 7); g.fill();
    }
    if (z > 1) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(Math.round(c.x - s * 0.3), Math.round(c.y + sh2 * 0.35), Math.round(s * 0.6), px); }
    if (!c.kind || c.kind === 'coin') {
      const sw = Math.max(px, Math.round(s * Math.abs(Math.cos(t * 6 + (c.spin || 0))) / px) * px);
      g.drawImage(im, Math.round(c.x - sw / 2), Math.round(c.y - sh2 / 2 - z), sw, sh2);
    } else {
      if (c.item) { // besace : halo et rayon de la couleur de sa rareté
        const col = c.golden ? '#ffd246' : GEAR_RARITIES[c.item.rarity].color;
        g.save();
        if (c.beam > 0) { // chute épique : un grand rayon tombe du ciel sur la besace
          const k2 = c.beam / 1.8, bw = Math.round(px * (4 + 10 * k2));
          g.globalAlpha = 0.25 + 0.5 * k2; g.fillStyle = col;
          g.fillRect(Math.round(c.x - bw / 2), Math.round(c.y - z - 900), bw, 900);
          g.globalAlpha = 0.6 * k2; g.fillStyle = '#ffffff';
          g.fillRect(Math.round(c.x - bw / 6), Math.round(c.y - z - 900), Math.max(px, Math.round(bw / 3)), 900);
        }
        g.globalAlpha = (0.35 + 0.15 * Math.sin(t * 6)) * (c.golden || c.item.rarity >= 3 ? 1.4 : 1); g.fillStyle = col;
        g.beginPath(); g.arc(c.x, c.y - z, s * (c.item.rarity >= 2 ? 1.5 : 1.2), 0, 7); g.fill();
        if (!c.fly) g.fillRect(Math.round(c.x - px), Math.round(c.y - z - s * 3), px * 2, Math.round(s * 2.4));
        g.restore();
      } else if (c.kind !== 'bar') { // halo des gemmes et couronnes
        g.fillStyle = c.treat ? 'rgba(255,150,210,.35)' : c.kind === 'gem' ? 'rgba(120,230,255,.25)' : 'rgba(255,220,100,.25)';
        g.beginPath(); g.arc(c.x, c.y - z, s * 0.9, 0, 7); g.fill();
      }
      g.drawImage(im, Math.round(c.x - s / 2), Math.round(c.y - sh2 / 2 - z), s, sh2);
    }
    if (!c.fly && Math.sin(t * 3 + (c.spin || 0) * 5) > 0.97) { g.fillStyle = '#fff'; g.fillRect(Math.round(c.x + s * 0.2), Math.round(c.y - s * 0.4 - z), px, px); }
  }
  g.globalAlpha = 1;

  for (const z of world.hazards) drawHazard(g, z, t, px);
  // trésors enterrés : une bosse de terre qui tremble, cercle de progression quand on creuse
  for (const m of (world.run && world.run.mounds) || []) {
    const wob = Math.sin(t * 9) * (m.dig > 0 ? 2 : 0.6);
    g.fillStyle = '#24161e'; g.beginPath(); g.ellipse(m.x + wob, m.y, 22, 11, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#8a6a3a'; g.beginPath(); g.ellipse(m.x + wob, m.y, 19, 9, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#c9a06a'; g.fillRect(Math.round(m.x - 6 + wob), Math.round(m.y - 7), 5, 2);
    if (Math.sin(t * 4 + m.x) > 0.9) { g.fillStyle = '#ffe14a'; g.fillRect(Math.round(m.x + 4), Math.round(m.y - 5), px, px); }
    if (m.dig > 0) { g.strokeStyle = '#ffd246'; g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y - 4, 30, -Math.PI / 2, -Math.PI / 2 + m.dig * Math.PI * 2); g.stroke(); }
  }
  // zones alliées : pièges, sol gelé, flammes
  for (const z of world.zones || []) {
    if (z.turret) {   // tourelle de l'ingénieur : trépied et canon
      const x = Math.round(z.x), y = Math.round(z.y), f = z.face || 1;
      shadow(g, x, y + 6, 12, 3);
      g.fillStyle = '#24161e'; g.fillRect(x - 9, y - 2, 18, 8); g.fillRect(x - 7, y - 16, 14, 14); g.fillRect(f > 0 ? x + 2 : x - 16, y - 13, 14, 6);
      g.fillStyle = '#7a4a2a'; g.fillRect(x - 8, y - 1, 16, 5);
      g.fillStyle = '#e0a040'; g.fillRect(x - 6, y - 15, 12, 12);
      g.fillStyle = '#b8c0c8'; g.fillRect(f > 0 ? x + 3 : x - 15, y - 12, 12, 4);
      if (z.t < 3 && Math.floor(t * 6) % 2) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - 6, y - 15, 12, 12); }
      continue;
    }
    const a = Math.min(1, z.t / 0.5) * 0.35;
    if (z.look === 'vines') {   // ronces du druide
      g.globalAlpha = Math.min(1, z.t / 0.4);
      for (let i = 0; i < 7; i++) {
        const an = i / 7 * Math.PI * 2 + z.x, rr = z.r * (0.3 + 0.6 * ((i * 37) % 10) / 10), bx = z.x + Math.cos(an) * rr, by = z.y + Math.sin(an) * rr * 0.6;
        const hgt = 10 + (i % 3) * 5;
        g.strokeStyle = '#24161e'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 6, by - hgt / 2, bx - 2, by - hgt); g.stroke();
        g.strokeStyle = i % 2 ? '#3fa04a' : '#6fd08a'; g.lineWidth = 2; g.stroke();
      }
      g.globalAlpha = 1;
      continue;
    }
    if (z.look === 'acid') z.color = 'rgba(160,220,60,1)';
    g.globalAlpha = a; g.fillStyle = z.color; g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, 7); g.fill();
    g.globalAlpha = a * 2; g.strokeStyle = z.color; g.lineWidth = 2; g.setLineDash(z.root ? [6, 4] : []); g.stroke(); g.setLineDash([]);
    if (z.burn && Math.random() < 0.3) { g.fillStyle = '#ffd246'; g.fillRect(Math.round(z.x + (Math.random() - 0.5) * z.r), Math.round(z.y + (Math.random() - 0.5) * z.r * 0.6), px, px * 2); }
  }
  g.globalAlpha = 1;
  // frappes à venir : ombre au sol qui se resserre (pluie de flèches)
  for (const k of world.strikes || []) {
    if (k.kind === 'spirit') {
      g.fillStyle = 'rgba(208,128,255,.35)'; g.beginPath(); g.arc(k.x, k.y, 13, 0, 7); g.fill();
      g.fillStyle = '#d080ff'; g.fillRect(Math.round(k.x) - 5, Math.round(k.y) - 6, 10, 10);
      g.fillStyle = '#f0d0ff'; g.fillRect(Math.round(k.x) - 3, Math.round(k.y) - 4, 6, 5);
      g.fillStyle = '#24161e'; g.fillRect(Math.round(k.x) - 2, Math.round(k.y) - 3, 1, 2); g.fillRect(Math.round(k.x) + 1, Math.round(k.y) - 3, 1, 2);
      continue;
    }
    if (k.kind === 'flask') {   // fiole en cloche
      const q = 1 - Math.max(0, k.t / k.t0), x = k.x0 + (k.x - k.x0) * q, y = k.y0 + (k.y - k.y0) * q - Math.sin(q * Math.PI) * 70;
      g.strokeStyle = 'rgba(160,220,60,.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(k.x, k.y, k.r * q, k.r * 0.6 * q, 0, 0, 7); g.stroke();
      g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(q * 8);
      g.fillStyle = '#24161e'; g.fillRect(-5, -6, 10, 11); g.fillStyle = '#d0f060'; g.fillRect(-4, -2, 8, 6); g.fillStyle = '#e8f0f8'; g.fillRect(-2, -5, 4, 3);
      g.restore();
      continue;
    }
    if (k.kind === 'dagger') continue;
    if (k.kind === 'phoenix') {
      g.fillStyle = '#ff7a3c'; g.beginPath(); g.arc(k.x, k.y, 10, 0, 7); g.fill();
      g.fillStyle = '#fff0b0'; g.beginPath(); g.arc(k.x, k.y, 5, 0, 7); g.fill();
      continue;
    }
    const q = Math.max(0, k.t / k.max);
    g.strokeStyle = 'rgba(36,22,30,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(k.x, k.y, k.r * (0.4 + q), k.r * 0.5 * (0.4 + q), 0, 0, 7); g.stroke();
    if (q < 0.5) { const yy = k.y - q * 400; g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(k.x, yy); g.lineTo(k.x, yy - 14); g.stroke(); g.fillStyle = '#d8d8d8'; g.fillRect(k.x - 1, yy, 3, 3); }
  }
  // coffres cachés : une petite bosse qui scintille de temps en temps, ouverte quand on passe dessus
  if (world.mode === 'map') for (const c of (world.run && world.run.chests) || []) drawChest(g, c, t);
  for (const d of world.deaths || []) drawDeath(g, d, t, px);
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
  // lueur de l'arme équipée (épique et plus) sous les héros
  const looks = world.stats.looks || {};
  for (const u of world.heroes) {
    const lk = looks[u.type]; if (!lk || !lk.glow || u.drop > 0) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4 + u.x * 0.05);
    const gr = g.createRadialGradient(u.x, u.y + 9, 2, u.x, u.y + 9, 24);
    gr.addColorStop(0, `rgba(${lk.col},${0.28 + 0.18 * pulse})`); gr.addColorStop(1, `rgba(${lk.col},0)`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(u.x, u.y + 9, 24, 9, 0, 0, 7); g.fill();
    if (lk.myth) for (let i = 0; i < 2; i++) {
      const an = t * 3 + i * Math.PI, sx = u.x + Math.cos(an) * 16, sy = u.y - 6 + Math.sin(an) * 5;
      g.fillStyle = `rgba(${lk.col},.9)`; g.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3);
    }
  }
  const heroes = [...world.heroes].sort((a, b) => a.y - b.y);
  for (const u of heroes) {
    const pose = heroPose(world, u, t);
    const rc = pose ? 0 : (u.recoil || 0) * px * 1.5;
    if (u.drop > 0) { g.fillStyle = `rgba(0,0,0,${0.25 * (1 - u.drop)})`; g.beginPath(); g.ellipse(u.x, u.y + 10, 18 * (1 - u.drop * 0.6), 6 * (1 - u.drop * 0.6), 0, 0, 7); g.fill(); }
    const rk = u.rank || 1, hp = rk >= 2 ? px * (rk >= 3 ? 1.35 : 1.2) : px;
    if (rk >= 2 && u.drop <= 0) {   // héros de classe : halo et étoiles
      const col = rk >= 3 ? '255,207,74' : '220,230,245';
      const gr = g.createRadialGradient(u.x, u.y + 6, 2, u.x, u.y + 6, 30);
      gr.addColorStop(0, `rgba(${col},.35)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(u.x, u.y + 8, 30, 11, 0, 0, 7); g.fill();
    }
    drawHero(g, u.type, u.x - u.face * rc, u.y + 12 - u.drop * h * 0.5, u.face, u.moving ? u.bob * 2 : u.bob * 0.5, 1, hp, pose);
    if (rk >= 2 && u.drop <= 0) {
      g.font = `700 ${px * 4}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillStyle = rk >= 3 ? '#ffcf4a' : '#e8eef8';
      g.fillText('★'.repeat(rk), u.x, u.y - hp * 22);
    }
    if (u.fury > 0) { g.globalAlpha = 0.5; g.fillStyle = '#ff5a2a'; g.fillRect(Math.round(u.x - 2), Math.round(u.y - hp * 20), 4, 4); g.globalAlpha = 1; }
    if (u.stun > 0) {
      // étourdi : petites étoiles qui tournent au-dessus de la tête
      for (let i = 0; i < 3; i++) {
        const an = t * 5 + i * 2.1, sx2 = Math.round(u.x + Math.cos(an) * px * 5), sy2 = Math.round(u.y - px * 17 + Math.sin(an) * px * 1.5);
        g.fillStyle = '#24161e'; g.fillRect(sx2 - px * 1.5, sy2 - px * 0.5, px * 3, px); g.fillRect(sx2 - px * 0.5, sy2 - px * 1.5, px, px * 3);
        g.fillStyle = '#ffe14a'; g.fillRect(sx2 - px, sy2 - px * 0.5 + 1, px * 2, px - 2); g.fillRect(sx2 - px * 0.5 + 1, sy2 - px, px - 2, px * 2);
      }
    }
  }

  // assistants : lutin (lumière verte à ailes) et pie
  for (const hp2 of (world.run && world.run.helpers) || []) {
    const bobY = Math.sin(t * 6 + hp2.x * 0.01) * 3;
    if (hp2.kind === 'hound') {   // chien du pacte : sprite du chien des Enfers
      const fr = SPR.enemies.d_hound, f = fr[Math.floor(t * 6) % fr.length].c, k = 1.6, w = f.width * k, h = f.height * k;
      shadow(g, hp2.x, hp2.y + h * 0.45, w * 0.3, 3);
      g.save(); g.translate(Math.round(hp2.x), 0); g.scale((hp2.face || 1) > 0 ? -1 : 1, 1);
      g.drawImage(f, Math.round(-w / 2), Math.round(hp2.y - h / 2), w, h); g.restore();
      continue;
    }
    if (hp2.kind === 'sprite') {
      const gr = g.createRadialGradient(hp2.x, hp2.y + bobY, 1, hp2.x, hp2.y + bobY, 18);
      gr.addColorStop(0, 'rgba(180,255,140,.8)'); gr.addColorStop(1, 'rgba(180,255,140,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(hp2.x, hp2.y + bobY, 18, 0, 7); g.fill();
      const wf = Math.abs(Math.sin(t * 20)) * 5;
      g.fillStyle = 'rgba(230,255,220,.8)'; g.fillRect(Math.round(hp2.x - 7), Math.round(hp2.y + bobY - 3 - wf / 2), 5, 2 + wf); g.fillRect(Math.round(hp2.x + 2), Math.round(hp2.y + bobY - 3 - wf / 2), 5, 2 + wf);
      g.fillStyle = '#24161e'; g.fillRect(Math.round(hp2.x - 3), Math.round(hp2.y + bobY - 3), 6, 7);
      g.fillStyle = '#9bf06b'; g.fillRect(Math.round(hp2.x - 2), Math.round(hp2.y + bobY - 2), 4, 5);
    } else {
      const f = hp2.face || 1, x = Math.round(hp2.x), y = Math.round(hp2.y + bobY), wf = Math.sin(t * 14) > 0 ? -4 : 2;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y + 30, 8, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#1a1a22'; g.fillRect(x - 6, y - 3, 12, 6); g.fillRect(x + f * 5, y - 5, 5 * f > 0 ? 5 : -5, 4); g.fillRect(x - f * 12, y - 1, 7, 2);
      g.fillStyle = '#e8eef8'; g.fillRect(x - 3, y, 6, 3);
      g.fillStyle = '#2a3a6a'; g.fillRect(x - 5, y - 3 + wf, 9, 3);
      g.fillStyle = '#ffd246'; g.fillRect(x + f * 9, y - 3, 2, 2);
    }
  }
  if (world.run && world.run.pet && world.stats.pet) drawPet(g, world.run.pet, t, px, world);
  // mirage : le gant scintille
  if (world.run && world.run.mirage > 0 && world.pointer.inside) {
    const pw = { x: world.pointer.x + world.cam.x, y: world.pointer.y + world.cam.y };
    g.strokeStyle = `rgba(255,225,74,${0.35 + 0.25 * Math.sin(t * 8)})`; g.lineWidth = 3; g.setLineDash([8, 6]); g.lineDashOffset = -t * 30;
    g.beginPath(); g.arc(pw.x, pw.y, 150, 0, 7); g.stroke(); g.setLineDash([]);
  }
  // traînées lumineuses derrière les projectiles (flèches blanches, givre bleu, notes dorées)
  g.lineCap = 'round';
  for (const a of world.arrows) {
    const lk = looks[a.type];
    const len = (a.kind === 'arrow' ? 46 : 26) * (lk ? 1 + 0.15 * lk.r : 1);
    const col = a.kind === 'fire' ? '255,122,60' : lk ? lk.col : a.kind === 'frost' ? '174,230,255' : a.kind === 'note' ? '255,230,138' : '255,255,240';
    const tr = g.createLinearGradient(a.x, a.y, a.x - a.dx * len, a.y - a.dy * len);
    tr.addColorStop(0, `rgba(${col},${lk ? 0.9 : 0.75})`); tr.addColorStop(1, `rgba(${col},0)`);
    g.strokeStyle = tr; g.lineWidth = (a.kind === 'arrow' ? 2.5 : 4) + (lk ? 0.5 * lk.r : 0);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.dx * len, a.y - a.dy * len); g.stroke();
  }
  g.lineCap = 'butt';
  for (const a of world.arrows) {
    if (a.kind === 'frost') {
      g.fillStyle = '#24161e'; g.fillRect(Math.round(a.x) - px * 2, Math.round(a.y) - px * 2, px * 4, px * 4);
      g.fillStyle = '#aee6ff'; g.fillRect(Math.round(a.x) - px * 1.5, Math.round(a.y) - px * 1.5, px * 3, px * 3);
      g.fillStyle = '#f0fbff'; g.fillRect(Math.round(a.x) - px, Math.round(a.y) - px, px, px);
    } else if (a.kind === 'fire') {
      g.fillStyle = '#24161e'; g.fillRect(Math.round(a.x) - px * 2, Math.round(a.y) - px * 2, px * 4, px * 4);
      g.fillStyle = '#ff7a3c'; g.fillRect(Math.round(a.x) - px * 1.5, Math.round(a.y) - px * 1.5, px * 3, px * 3);
      g.fillStyle = '#fff0b0'; g.fillRect(Math.round(a.x) - px * 0.5, Math.round(a.y) - px * 0.5, px, px);
    } else if (a.kind === 'note') {
      g.fillStyle = '#ffe68a'; g.font = `700 ${px * 6}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('♪', a.x, a.y + px * 2);
    } else {
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.dx * 12, a.y - a.dy * 12); g.stroke();
      const lk = looks[a.type];
      g.fillStyle = lk ? `rgb(${lk.col})` : '#d8d8d8'; g.beginPath(); g.arc(a.x, a.y, lk ? 2.2 : 1.6, 0, 7); g.fill();
    }
  }

  if (r && r.relics && world.phase === 'tear') drawRelics(g, world, r.relics, t, px);

  g.textAlign = 'center'; g.lineJoin = 'round';
  for (const tx of world.texts) {
    g.globalAlpha = Math.min(1, tx.life * 3);
    const sc = tx.dmg ? 1 + Math.max(0, 0.6 - tx.pop * 6) : 1;
    g.font = `800 ${Math.round(tx.size * sc)}px 'Pixelify Sans', system-ui, sans-serif`;
    if (tx.box) { // coup critique : chiffre dans une étiquette rouge cernée
      const bw = g.measureText(tx.text).width + 12, bh = tx.size * sc + 4;
      g.fillStyle = '#10140d'; g.fillRect(Math.round(tx.x - bw / 2 - 2), Math.round(tx.y - bh + 4), Math.round(bw + 4), Math.round(bh + 4));
      g.fillStyle = tx.box; g.fillRect(Math.round(tx.x - bw / 2), Math.round(tx.y - bh + 6), Math.round(bw), Math.round(bh));
    }
    g.strokeStyle = '#24161e'; g.lineWidth = 3.5; g.strokeText(tx.text, tx.x, tx.y);
    g.fillStyle = tx.color; g.fillText(tx.text, tx.x, tx.y);
  }
  g.globalAlpha = 1;
  if (!arena) drawButterflies(g, world, t, px);
  g.restore();
  if (arena) drawEmbers(g, world, t, px); else drawLeaves(g, world, t, px);
  if (!arena && world.stage) drawAmbiance(g, world, t, camX, camY, dpr);
  g.drawImage(vignette(w, h, dpr), 0, 0, w, h);
  if (r && !arena && world.phase === 'expedition') edgeArrows(g, world, t, camX, camY);
  if (r && !arena && world.phase === 'done') {
    // fin d'expédition : la scène s'assombrit, un rond de lumière reste sur le sac
    const b = bagPos(world), k = Math.min(1, (r.doneT || 0) * 1.6);
    const sx = b.x - camX, sy = b.y - camY + 10;
    const gr = g.createRadialGradient(sx, sy, 40, sx, sy, Math.max(w, h) * 0.55);
    gr.addColorStop(0, 'rgba(8,10,6,0)'); gr.addColorStop(0.25, `rgba(8,10,6,${0.45 * k})`); gr.addColorStop(1, `rgba(8,10,6,${0.85 * k})`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  const cb = world.combo;
  if (cb.t > 0 && cb.n >= 3 && world.pointer.inside) {
    const sc = 1 + Math.max(0, cb.t - 0.9) * 2;
    g.globalAlpha = Math.min(1, cb.t * 2);
    g.font = `800 ${Math.round(18 * sc)}px 'Pixelify Sans', monospace`; g.textAlign = 'left';
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
    // anneau plein et fin cerné de sombre ; doré et pulsant quand l'attraction tire
    const pr = on ? rad + Math.sin(t * 10) * 2 : rad;
    if (on) { g.fillStyle = 'rgba(255,214,102,.10)'; g.beginPath(); g.arc(p.x, p.y, pr, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(16,20,13,.55)'; g.lineWidth = on ? 5 : 4;
    g.beginPath(); g.arc(p.x, p.y, pr, 0, 7); g.stroke();
    g.strokeStyle = on ? '#ffd666' : 'rgba(244,236,210,.9)'; g.lineWidth = on ? 2.5 : 1.5;
    g.beginPath(); g.arc(p.x, p.y, pr, 0, 7); g.stroke();
    // viseur au centre : petit rond et quatre crans
    const cx = Math.round(p.x), cy = Math.round(p.y), ink = on ? '#ffd666' : '#f4ecd2';
    g.strokeStyle = '#10140d'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.stroke();
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      g.fillStyle = '#10140d'; g.fillRect(cx + dx * 11 - 2, cy + dy * 11 - 2, 4, 4);
      g.fillStyle = ink; g.fillRect(cx + dx * 11 - 1, cy + dy * 11 - 1, 2, 2);
    }
    g.fillStyle = ink; g.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

// ---------- Ambiances d'étape ----------
let nightC = null;
function drawAmbiance(g, world, t, camX, camY, dpr) {
  const { w, h } = world, id = world.stage.id;
  if (id === 'crepuscule') {
    g.save();
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,190,140,0.55)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'screen';
    const sun = g.createLinearGradient(0, 0, 0, h);
    sun.addColorStop(0, 'rgba(255,150,80,0.22)'); sun.addColorStop(1, 'rgba(120,60,140,0.10)');
    g.fillStyle = sun; g.fillRect(0, 0, w, h);
    g.restore();
  } else if (id === 'minuit') {
    nightMask(g, world, t, camX, camY, 'rgba(12,16,44,0.78)');
    // étoiles
    g.fillStyle = '#dfe8ff';
    for (let i = 0; i < 40; i++) {
      g.globalAlpha = 0.15 + 0.25 * Math.abs(Math.sin(t * 0.8 + i * 1.7));
      g.fillRect(((i * 131.7) % w), ((i * 71.3) % (h * 0.5)), 2, 2);
    }
    g.globalAlpha = 1;
  } else if (id === 'neige') {
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 220; i++) {
      const sp = 30 + (i % 7) * 9, sz = 3 + (i % 3);
      const x = ((i * 97.13 + Math.sin(t * 0.7 + i) * 30 - camX * 0.3) % w + w) % w;
      const y = ((i * 53.71 + t * sp - camY * 0.3) % h + h) % h;
      g.globalAlpha = 0.5 + 0.4 * ((i * 13) % 5) / 5;
      g.fillRect(Math.round(x), Math.round(y), sz, sz);
    }
    g.globalAlpha = 1;
  } else if (id === 'brume') {
    // bancs de brume qui dérivent
    g.fillStyle = 'rgba(210,225,215,.16)';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 211 + t * (10 + i * 2) - camX * 0.5) % (w + 400) + w + 400) % (w + 400) - 200, y = (i * 137 - camY * 0.5) % h;
      g.beginPath(); g.ellipse(x, (y + h) % h, 240, 70, 0, 0, 7); g.fill();
    }
  } else if (id === 'automne') {
    const cols = ['#e07a2a', '#c84a2a', '#ffd070', '#a0481e'];
    for (let i = 0; i < 60; i++) {
      const sp = 26 + (i % 5) * 7, x = ((i * 97.1 + Math.sin(t * 1.3 + i) * 40 - camX * 0.3) % w + w) % w, y = ((i * 61.7 + t * sp - camY * 0.3) % h + h) % h;
      g.fillStyle = cols[i % 4]; g.fillRect(Math.round(x), Math.round(y), 4, Math.sin(t * 4 + i) > 0 ? 3 : 2);
    }
  } else if (id === 'desert') {
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,215,160,.35)'; g.fillRect(0, 0, w, h); g.restore();
    g.fillStyle = 'rgba(240,210,150,.5)';
    for (let i = 0; i < 70; i++) { const x = ((i * 131 + t * (90 + i % 4 * 20) - camX * 0.4) % w + w) % w, y = ((i * 71.3 - camY * 0.4) % h + h) % h + Math.sin(t * 2 + i) * 6; g.fillRect(Math.round(x), Math.round(y), 3, 1); }
  } else if (id === 'grotte' || id === 'lumi' || id === 'neant') {
    nightMask(g, world, t, camX, camY, id === 'grotte' ? 'rgba(20,12,40,0.62)' : id === 'lumi' ? 'rgba(6,30,34,0.6)' : 'rgba(18,6,34,0.7)');
    const cols = id === 'grotte' ? ['#b48cff', '#8ad0ff'] : id === 'lumi' ? ['#7fffd0', '#d0ff80'] : ['#ffffff', '#b48cff'];
    for (let i = 0; i < 46; i++) {
      const x = ((i * 157.3 + Math.sin(t * 0.6 + i) * 20 - camX * 0.6) % w + w) % w, y = ((i * 89.1 - t * (id === 'lumi' ? 12 : 4) - camY * 0.6) % h + h) % h;
      g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + i)); g.fillStyle = cols[i % 2]; g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    g.globalAlpha = 1;
  } else if (id === 'enfers') {
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,150,120,.4)'; g.fillRect(0, 0, w, h); g.restore();
    drawEmbers(g, world, t, 3);
  } else if (id === 'ciel') {
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(200,225,255,.12)'; g.fillRect(0, 0, w, h); g.restore();
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 6; i++) { const x = ((i * 311 + t * (30 + i * 6) - camX * 0.7) % (w + 300) + w + 300) % (w + 300) - 150, y = (i * 157) % h; g.beginPath(); g.ellipse(x, y, 90, 26, 0, 0, 7); g.ellipse(x + 50, y - 12, 50, 22, 0, 0, 7); g.fill(); }
  }
}

// Voile de nuit troué de lumière autour des héros, du sac, des feux follets et du butin.
function nightMask(g, world, t, camX, camY, fill) {
  const { w, h } = world;
    // nuit : un voile sombre, troué de lumière autour des héros, du sac, des feux follets et du butin
  if (!nightC || nightC.width !== w || nightC.height !== h) { nightC = document.createElement('canvas'); nightC.width = w; nightC.height = h; }
  const n = nightC.getContext('2d');
  n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, w, h);
  n.fillStyle = fill; n.fillRect(0, 0, w, h);
  n.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => {
    x -= camX; y -= camY;
    if (x < -r || y < -r || x > w + r || y > h + r) return;
    const gr = n.createRadialGradient(x, y, r * 0.15, x, y, r);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    n.fillStyle = gr; n.beginPath(); n.arc(x, y, r, 0, 7); n.fill();
  };
  const b = bagPos(world);
  hole(b.x, b.y, 200, 0.9);
  const lan = (world.stats && world.stats.lantern) || 1;
  for (const u of world.heroes) hole(u.x, u.y, (120 + 6 * Math.sin(t * 3 + u.x)) * lan, 0.85);
  for (const e of world.enemies) if (e.type === 'wisp' || e.boss || e.event) hole(e.x, e.y, e.boss ? 160 : e.type === 'vein' ? 110 : 55, 0.7);
  for (const c of world.coins) if (c.value >= 5) hole(c.x, c.y, 30, 0.5);
  const p = world.pointer;
  if (p.inside) hole(p.x + camX, p.y + camY, 90, 0.6);
  g.drawImage(nightC, 0, 0, w, h);
}

// Lieux nommés de la région : cercle pointillé au sol et nom en lettres pâles.
function drawAreas(g, world, t) {
  for (const a of (world.zone && world.zone.areaList) || []) {
    g.strokeStyle = 'rgba(255,240,200,.22)'; g.lineWidth = 3; g.setLineDash([10, 12]); g.lineDashOffset = -t * 6;
    g.beginPath(); g.ellipse(a.x, a.y, a.r, a.r / 1.4, 0, 0, 7); g.stroke(); g.setLineDash([]);
    g.font = `400 18px ${UI_FONT}`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(36,22,30,.5)';
    const ty = a.y - a.r / 1.4 + 22; g.strokeText(a.name.toUpperCase(), a.x, ty); g.fillStyle = 'rgba(255,240,200,.55)'; g.fillText(a.name.toUpperCase(), a.x, ty);
    g.font = `400 12px ${UI_FONT}`; const sub = `PV ×${String(a.hp).replace('.', ',')} · butin ×${String(a.gold).replace('.', ',')}`;
    g.strokeText(sub, a.x, ty + 16); g.fillText(sub, a.x, ty + 16);
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
  g.font = `800 15px 'Pixelify Sans', monospace`; g.textAlign = 'center'; g.lineJoin = 'round';
  const label = r && r.lair.done ? 'Portail refermé' : open ? world.zone.boss.lair : 'Portail scellé';
  g.strokeStyle = '#24161e'; g.lineWidth = 4; g.strokeText(label, p.x, y0 - 8);
  g.fillStyle = open ? '#ffb347' : '#c8b8b0'; g.fillText(label, p.x, y0 - 8);
  if (open) { const sub = 'clique pour entrer'; g.font = `700 12px 'Pixelify Sans', system-ui, sans-serif`; g.strokeText(sub, p.x, y0 + H + 16); g.fillStyle = '#fff2c8'; g.fillText(sub, p.x, y0 + H + 16); }
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
const HAZ = { fire: [[255, 70, 30], [255, 170, 60], '#ff5a2a'], ice: [[90, 170, 255], [190, 235, 255], '#7fd0ff'], spore: [[90, 200, 120], [200, 255, 140], '#6fe08a'] };
function drawHazard(g, z, t, px) {
  const k = 1 - z.t / z.warn, [a, b, line] = HAZ[z.kind] || HAZ.fire;
  g.fillStyle = `rgba(${a},${0.12 + k * 0.25})`;
  g.beginPath(); g.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, 7); g.fill();
  g.fillStyle = `rgba(${b},${0.25 + 0.2 * Math.sin(t * 30)})`;
  g.beginPath(); g.ellipse(z.x, z.y, z.r * k, z.r * 0.6 * k, 0, 0, 7); g.fill();
  g.strokeStyle = line; g.lineWidth = px; g.setLineDash([px * 2, px * 2]); g.lineDashOffset = -t * 30;
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

// Trésors de la Déchirure : un rai de lumière, un cadre à la couleur de la rareté, le nom dessous.
function drawRelics(g, world, relics, t, px) {
  const p = world.pointer, cx = world.cam.x, cy = world.cam.y;
  for (const o of relics) {
    if (o.got || o.x === undefined) continue;
    const col = RARITIES[o.rar].color, landed = o.t >= 0.6;
    const bob = landed ? Math.round(Math.sin(t * 3 + o.tx) * 3) : 0;
    const x = Math.round(o.x), y = Math.round(o.y + bob);
    const hover = p.inside && (p.x + cx - x) ** 2 + (p.y + cy - y) ** 2 < 60 * 60;
    if (landed) {
      const beam = g.createLinearGradient(0, y - 160, 0, y);
      beam.addColorStop(0, 'rgba(255,255,255,0)'); beam.addColorStop(1, col + '66');
      g.fillStyle = beam; g.fillRect(x - 10, y - 160, 20, 160);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 14, y + 40 - bob, 28, 4);
    }
    const S = hover ? 54 : 46;
    g.fillStyle = '#10140d'; g.fillRect(x - S / 2 - 2, y - S / 2 - 2, S + 4, S + 4);
    g.fillStyle = col; g.fillRect(x - S / 2, y - S / 2, S, S);
    g.fillStyle = '#1b1f18'; g.fillRect(x - S / 2 + 3, y - S / 2 + 3, S - 6, S - 6);
    const im = SPR.loot[o.kind];
    if (im) { const k = Math.max(1, Math.floor((S - 12) / Math.max(im.width, im.height))); g.drawImage(im, Math.round(x - im.width * k / 2), Math.round(y - im.height * k / 2), im.width * k, im.height * k); }
    if (!landed) continue;
    g.textAlign = 'center'; g.lineJoin = 'round';
    g.font = `400 13px ${UI_FONT}`;
    const rn = RARITIES[o.rar].name.toUpperCase();
    g.strokeStyle = '#10140d'; g.lineWidth = 4; g.strokeText(rn, x, y - S / 2 - 8); g.fillStyle = col; g.fillText(rn, x, y - S / 2 - 8);
    g.font = `500 14px 'Pixelify Sans', monospace`;
    g.strokeText(o.name, x, y + S / 2 + 16); g.fillStyle = '#f4ecd2'; g.fillText(o.name, x, y + S / 2 + 16);
  }
}

function rnd2(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }

// Copie teintée d'une planche (créatures provisoires en attendant leurs dessins).
const tintCache = {};
function tinted(key, color, frames) {
  const id = key + color;
  if (tintCache[id]) return tintCache[id];
  const tint = im => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.45; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  };
  return (tintCache[id] = frames.map(f => ({ ...f, c: tint(f.c), white: f.white })));
}
function veinFmt(v) { return v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' M' : v >= 1e4 ? Math.round(v / 1e3) + ' k' : String(Math.round(v)); }

// Familier actif : sprite, aura de sa rareté, forme dorée qui scintille.
function drawPet(g, h, t, px, world) {
  const S = SPECIES[h.sp], im = petSprite(h.sp, h.stage, h.gold);
  const k = h.stage === 2 ? Math.round(px * 1.5) : px * 2, w = im.width * k, hh = im.height * k;
  const fly = S.fly, hop = !fly && h.moving ? (Math.floor(t * 10) % 2 ? -k : 0) : Math.round(Math.sin(t * 3) * 1);
  const x = Math.round(h.x), y = Math.round(h.y + (fly ? -24 + Math.sin(t * 5) * 4 : hop));
  // ombre
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(h.x, h.y + 2, w * 0.35, 3 + px, 0, 0, 7); g.fill();
  // anneau d'aimant du scarabée
  if (h.ring) { g.save(); g.strokeStyle = 'rgba(245,176,112,.35)'; g.lineWidth = px; g.setLineDash([px * 3, px * 3]); g.lineDashOffset = -t * 20; g.beginPath(); g.ellipse(h.x, h.y, h.ring, h.ring * 0.7, 0, 0, 7); g.stroke(); g.restore(); }
  // lumière de la luciole
  if (S.mode === 'light' && world.run.petLight) { const L = world.run.petLight, gr = g.createRadialGradient(x, y - hh / 2, 4, x, y - hh / 2, L.r); gr.addColorStop(0, 'rgba(216,255,122,.28)'); gr.addColorStop(1, 'rgba(216,255,122,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y - hh / 2, L.r, 0, 7); g.fill(); }
  // aura de rareté (rare et plus), lueur propre à l'espèce
  const col = h.gold ? '#ffe14a' : h.rar ? PET_RARITIES[h.rar].color : S.glow;
  if (col) {
    const a = h.rar >= 3 || h.gold ? 0.55 : 0.35, rr = Math.max(w, hh) * (0.7 + 0.06 * Math.sin(t * 4));
    const gr = g.createRadialGradient(x, y - hh / 2, 2, x, y - hh / 2, rr);
    gr.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, '0')); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - hh / 2, rr, 0, 7); g.fill();
  }
  // traînée de braise (légendaire) ou étincelles (mythique, dorée)
  if ((h.rar >= 3 || h.gold) && Math.random() < 0.5) {
    const pc = h.gold ? ['#fff6c8', '#ffe14a'] : h.rar >= 4 ? ['#ff4a5a', '#ffd0d0'] : ['#ff9a3d', '#ffe0a0'];
    world.particles.push({ x: h.x + (Math.random() - 0.5) * w * 0.6, y: y - Math.random() * hh, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, grav: 0, life: 0.6, max: 0.6, size: px, color: pc[Math.floor(Math.random() * pc.length)] });
  }
  g.save(); g.translate(x, 0); g.scale(h.face || 1, 1);
  g.drawImage(im, Math.round(-w / 2), Math.round(y - hh), w, hh);
  g.restore();
  if (h.belly) { g.font = `${10 + px * 2}px ${UI_FONT}`; g.textAlign = 'center'; g.fillStyle = '#24161e'; g.fillText('×' + h.belly, x + 1, y - hh - 3); g.fillStyle = '#ffd246'; g.fillText('×' + h.belly, x, y - hh - 4); }
}
