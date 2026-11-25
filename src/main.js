// Point d'entrée : boucle à pas fixe, entrées, interface (HUD, Atelier, bilan).
import { ZONES, TIERS, NODES, computeStats, nodeCost, bagMax, tierOf, tierRange } from './data.js';
import { loadSave, writeSave, freshSave } from './save.js';
import { createWorld, startExpedition, update, dropHero, canDrop, moveCam, centerCam, clampCam, pointerWorld, bagPos } from './game.js';
import { render, drawHero, drawBag, getMap } from './render.js';

const $ = id => document.getElementById(id);
const app = $('app'), cv = $('cv'), g = cv.getContext('2d');
let save = loadSave();
let stats = computeStats(save.level);
let dpr = 1;
const world = createWorld(800, 600);
world.zone = ZONES[0];
world.stats = stats;

function resize() {
  const r = app.getBoundingClientRect();
  world.w = Math.max(320, r.width); world.h = Math.max(320, r.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = world.w * dpr; cv.height = world.h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  clampCam(world);
}
window.addEventListener('resize', resize);
resize();

function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const u = ['k', 'M', 'G', 'T'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0)).replace('.', ',') + u[i];
}

// ---------- Bannières ----------
const bannerQ = []; let bannerBusy = 0;
function tickBanner(dt) {
  bannerBusy -= dt;
  if (bannerBusy > 0 || !bannerQ.length) return;
  const { title, sub } = bannerQ.shift();
  const el = $('banner'); el.textContent = title;
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  bannerBusy = 1.4;
}

// ---------- Expédition ----------
function go() {
  stats = computeStats(save.level);
  startExpedition(world, stats, ZONES[0]);
  $('atelier').hidden = true; $('result').hidden = true;
  $('hud').hidden = false; $('dropBar').hidden = false; $('hint').hidden = false; $('mapUi').hidden = false; document.querySelectorAll('.edge').forEach(b => { b.hidden = false; });
  buildDropBar();
}

function buildDropBar() {
  const box = $('dropBar'); box.innerHTML = '';
  const n = world.run.toDrop.archer;
  const b = document.createElement('div');
  b.className = 'card' + (n <= 0 ? ' empty' : '');
  const c = document.createElement('canvas'); c.width = c.height = 68;
  const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; drawHero(cg, 'archer', 34, 62, 1, 0, 1, 3);
  const name = document.createElement('span'); name.textContent = 'Archers';
  const cnt = document.createElement('span'); cnt.className = 'cnt num'; cnt.textContent = n;
  b.append(c, name, cnt);
  box.append(b);
  if (n <= 0) $('hint').textContent = 'ZQSD ou flèches pour te déplacer · Passe le gant sur les pièces';
  else $('hint').textContent = 'Clique pour larguer tes archers · ZQSD ou flèches pour te déplacer';
}

function finishExpedition() {
  const r = world.run;
  const net = 0;
  const gained = r.tearGot + r.overflow + net;
  save.expeditions++;
  save.best = Math.max(save.best, gained);
  writeSave(save);
  const rows = [
    ['Élémentaires vaincus', fmt(r.kills)],
    ['Pièces dans le sac', fmt(r.bag)],
    ['Palier atteint', TIERS[r.tier].name + (r.full ? ' (plein)' : '')],
    ['Multiplicateur', '×' + r.mult.toFixed(2).replace('.', ',')],
    ['Pièces raflées', `${fmt(r.tearGot)} / ${fmt(r.tearTotal)}`],
  ];
  if (r.overflow > 0) rows.push(['Surplus du sac plein', '+' + fmt(r.overflow)]);
  const dl = $('resList'); dl.innerHTML = '';
  for (const [a, b] of rows) {
    const dt = document.createElement('dt'); dt.textContent = a;
    const dd = document.createElement('dd'); dd.textContent = b; dd.className = 'num';
    dl.append(dt, dd);
  }
  $('resTotal').textContent = '+' + fmt(gained);
  $('hud').hidden = true; $('dropBar').hidden = true; $('hint').hidden = true; $('mapUi').hidden = true;
  $('result').hidden = false;
  $('back').focus();
}

function toAtelier() {
  world.phase = 'idle'; world.run = null; world.heroes = []; world.coins = [];
  stats = computeStats(save.level); world.stats = stats;
  $('result').hidden = true; $('atelier').hidden = false;
  renderTree();
}

function drainEvents() {
  for (const ev of world.events) {
    if (ev.kind === 'banner') bannerQ.push(ev);
    else if (ev.kind === 'coins') save.coins += ev.value;
    else if (ev.kind === 'done') finishExpedition();
    else if (ev.kind === 'tear') { $('dropBar').hidden = true; $('hint').hidden = true; document.querySelectorAll('.edge').forEach(b => { b.hidden = true; }); }
  }
  world.events.length = 0;
}

// ---------- HUD ----------
function hud() {
  const r = world.run;
  if (!r || (world.phase !== 'expedition' && world.phase !== 'tear')) return;
  $('wallet').textContent = fmt(save.coins);
  const tier = world.phase === 'tear' ? r.tier : tierOf(r.bag, stats);
  const [lo, hi] = tierRange(tier, stats);
  const max = bagMax(stats);
  const f = world.phase === 'tear' ? 0 : Math.min(1, (r.bag - lo) / (hi - lo));
  $('tierName').textContent = TIERS[tier].name;
  $('tierName').style.color = TIERS[tier].color;
  $('tierMult').textContent = '×' + String(TIERS[tier].mult).replace('.', ',') + (r.full ? ' +25 %' : '');
  $('bagBox').style.setProperty('--tier', TIERS[tier].color);
  $('bagFill').style.width = (f * 100) + '%';
  $('bagTxt').textContent = world.phase === 'tear'
    ? `Raflé : ${fmt(r.tearGot)} / ${fmt(r.tearTotal)}`
    : `${fmt(r.bag)} / ${fmt(Math.min(hi, max))}${r.full ? ' · plein' : ''}`;
  const left = world.phase === 'tear' ? Math.max(0, r.shake > 0 ? r.tearDur || stats.tearDuration : r.tearT) : Math.max(0, r.duration - r.t);
  $('timer').textContent = left.toFixed(1);
  $('timer').style.color = world.phase === 'tear' ? 'var(--gold)' : (left < 5 ? 'var(--ember)' : 'var(--parch)');
  $('zoneTxt').textContent = world.phase === 'tear' ? 'Déchirure !' : world.zone.name;
  $('attrFill').style.width = (r.attraction / stats.attraction * 100) + '%';
}

// ---------- Atelier ----------
const GX = 120, GY = 110, PAD = 70;
let selected = 'root';
const L = id => save.level[id] || 0;
const visible = n => !n.parent || L(n.parent) > 0 || L(n.id) > 0;
const pos = n => ({ x: PAD + n.x * GX - GX + 20, y: PAD + n.y * GY - GY + 30 });

function nodeIcon(n) {
  const c = document.createElement('canvas'); c.width = c.height = 92;
  const ig = c.getContext('2d'); ig.imageSmoothingEnabled = false;
  if (n.branch === 'Compagnie') drawHero(ig, 'archer', 46, 84, 1, 0, 1, 4);
  else if (n.branch === 'Sac' || n.id === 'root') drawBag(ig, 46, 86, n.id === 'tierCuir' ? 1 : 0, 0.1, 0, 0, 3);
  ig.scale(2, 2);
  if (n.branch === 'Compagnie' || n.branch === 'Sac' || n.id === 'root') return c;
  else if (n.branch === 'Arcanes') {
    ig.strokeStyle = '#e8d6a8'; ig.lineWidth = 2.5; ig.fillStyle = '#ffcf4a';
    ig.beginPath(); ig.moveTo(13, 8); ig.lineTo(33, 8); ig.lineTo(13, 38); ig.lineTo(33, 38); ig.closePath(); ig.stroke();
    ig.beginPath(); ig.moveTo(17, 12); ig.lineTo(29, 12); ig.lineTo(23, 21); ig.fill();
    ig.beginPath(); ig.moveTo(23, 29); ig.lineTo(30, 36); ig.lineTo(16, 36); ig.fill();
  } else {
    ig.strokeStyle = 'rgba(255,248,225,.8)'; ig.setLineDash([3, 3]); ig.lineWidth = 1.5;
    ig.beginPath(); ig.arc(23, 23, 16, 0, 7); ig.stroke(); ig.setLineDash([]);
    ig.fillStyle = '#ffd34d'; ig.beginPath(); ig.ellipse(23, 23, 6, 5.5, 0, 0, 7); ig.fill();
  }
  return c;
}

function renderTree() {
  $('atelierWallet').textContent = fmt(save.coins);
  const inner = $('treeInner'), svg = $('treeLines');
  const maxX = Math.max(...NODES.map(n => n.x)), maxY = Math.max(...NODES.map(n => n.y));
  const W = PAD * 2 + maxX * GX - GX + 40 + 120, H = PAD * 2 + maxY * GY - GY + 60;
  inner.style.width = W + 'px'; inner.style.height = H + 'px';
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  inner.querySelectorAll('.node,.branchLbl').forEach(e => e.remove());
  svg.innerHTML = '';
  for (const n of NODES) {
    if (!visible(n) || !n.parent) continue;
    const a = pos(NODES.find(m => m.id === n.parent)), b = pos(n);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: L(n.id) ? '#ffcf4a' : '#6b4f2f', 'stroke-width': L(n.id) ? 4 : 3, 'stroke-linecap': 'round' })
      .forEach(([k, v]) => ln.setAttribute(k, v));
    svg.append(ln);
  }
  for (const n of NODES) {
    if (!visible(n)) continue;
    const p = pos(n), lv = L(n.id), isMax = lv >= n.max;
    const b = document.createElement('button');
    b.className = 'node' + (lv ? ' owned' : '') + (isMax ? ' max' : save.coins >= nodeCost(n, lv) ? ' afford' : '') + (selected === n.id ? ' sel' : '');
    b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
    b.setAttribute('aria-label', n.name);
    b.append(nodeIcon(n));
    const l = document.createElement('span'); l.className = 'lv num';
    l.textContent = isMax ? (n.max > 1 ? 'MAX' : '✓') : `${lv}/${n.max}`;
    b.append(l);
    b.onclick = () => { selected = n.id; renderTree(); };
    b.ondblclick = () => { selected = n.id; buy(n); };
    inner.append(b);
  }
  renderInfo();
  $('stats').textContent = save.expeditions ? `${save.expeditions} expédition${save.expeditions > 1 ? 's' : ''} · record ${fmt(save.best)} pièces` : '';
}

function renderInfo() {
  const n = NODES.find(m => m.id === selected) || NODES[0];
  const lv = L(n.id), isMax = lv >= n.max;
  const box = $('info'); box.innerHTML = '';
  const br = document.createElement('div'); br.className = 'branch';
  br.textContent = n.branch + (n.max > 1 ? ` · niveau ${lv}/${n.max}` : '');
  const h = document.createElement('h3'); h.textContent = n.name;
  const p = document.createElement('p'); p.textContent = n.desc;
  const e = document.createElement('div'); e.className = 'eff';
  e.textContent = isMax ? n.effect(lv) : lv ? `${n.effect(lv)}  →  ${n.effect(lv + 1)}` : n.effect(1);
  box.append(br, h, p, e);
  if (!isMax) {
    const b = document.createElement('button'); b.className = 'btn';
    b.append(`Acheter · ${fmt(nodeCost(n, lv))} `);
    const i = document.createElement('span'); i.className = 'coin-ico'; b.append(i);
    b.disabled = save.coins < nodeCost(n, lv);
    b.onclick = () => buy(n);
    box.append(b);
  }
}

function buy(n) {
  const lv = L(n.id);
  if (lv >= n.max) return;
  const c = nodeCost(n, lv);
  if (save.coins < c) return;
  save.coins -= c; save.level[n.id] = lv + 1;
  writeSave(save);
  stats = computeStats(save.level);
  renderTree();
}

// ---------- Entrées ----------
const p = world.pointer;
function setPointer(e) { const r = cv.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; p.inside = true; }
cv.addEventListener('pointermove', setPointer);
cv.addEventListener('pointerenter', setPointer);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') p.inside = false; p.down = false; });
cv.addEventListener('pointerdown', e => {
  setPointer(e); p.down = true; p.usedForDrop = false;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
  if (canDrop(world) && p.y > 60) { const q = pointerWorld(world); dropHero(world, q.x, q.y); p.usedForDrop = true; buildDropBar(); }
});
cv.addEventListener('pointerup', e => { p.down = false; if (e.pointerType !== 'mouse') p.inside = false; });
cv.addEventListener('pointercancel', () => { p.down = false; p.inside = false; });
// Déplacement de la caméra : ZQSD sur clavier français, WASD sur clavier anglais (mêmes touches physiques), ou flèches.
const CAM_KEYS = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const held = new Set();
const playing = () => world.phase === 'expedition' || world.phase === 'tear';
window.addEventListener('keydown', e => {
  if (CAM_KEYS[e.code] && playing()) { held.add(e.code); e.preventDefault(); }
});
window.addEventListener('keyup', e => held.delete(e.code));
window.addEventListener('blur', () => { held.clear(); edgeHeld.clear(); });
const edgeHeld = new Set();
document.querySelectorAll('.edge').forEach(b => {
  const dir = b.dataset.dir;
  b.addEventListener('pointerdown', e => { edgeHeld.add(dir); try { b.setPointerCapture(e.pointerId); } catch (_) { /* rien */ } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => edgeHeld.delete(dir));
});
const EDGE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function scrollCam(dt) {
  if (world.phase !== 'expedition') return;
  let dx = 0, dy = 0;
  for (const k of held) { dx += CAM_KEYS[k][0]; dy += CAM_KEYS[k][1]; }
  for (const k of edgeHeld) { dx += EDGE[k][0]; dy += EDGE[k][1]; }
  if (!dx && !dy) return;
  const n = Math.hypot(dx, dy), sp = 760 * dt;
  moveCam(world, dx / n * sp, dy / n * sp);
}

// ---------- Mini-map ----------
const mm = $('minimap'), mg = mm.getContext('2d');
function drawMinimap() {
  if (!playing()) return;
  const map = getMap(world);
  const W = mm.clientWidth, H = Math.round(W * world.mapH / world.mapW);
  if (mm.width !== W * dpr || mm.height !== H * dpr) { mm.width = W * dpr; mm.height = H * dpr; mm.style.height = H + 'px'; }
  const k = W / world.mapW;
  mg.setTransform(dpr, 0, 0, dpr, 0, 0);
  mg.imageSmoothingEnabled = true;
  mg.drawImage(map.c, 0, 0, W, H);
  const dot = (x, y, r, col) => { mg.fillStyle = col; mg.fillRect(Math.round(x * k - r / 2), Math.round(y * k - r / 2), r, r); };
  for (const c of world.coins) dot(c.x, c.y, 2, '#ffd34d');
  for (const e of world.enemies) dot(e.x, e.y, 3, '#ff6b4a');
  const b = bagPos(world); dot(b.x, b.y, 6, '#fff2c8');
  for (const u of world.heroes) dot(u.x, u.y, 4, '#7ee06b');
  mg.strokeStyle = '#fff'; mg.lineWidth = 1.5;
  mg.strokeRect(world.cam.x * k, world.cam.y * k, world.w * k, world.h * k);
}
function minimapJump(e) {
  if (world.phase !== 'expedition') return;
  const r = mm.getBoundingClientRect();
  centerCam(world, (e.clientX - r.left) / r.width * world.mapW, (e.clientY - r.top) / r.height * world.mapH);
}
mm.addEventListener('pointerdown', e => { minimapJump(e); try { mm.setPointerCapture(e.pointerId); } catch (_) { /* rien */ } });
mm.addEventListener('pointermove', e => { if (e.buttons) minimapJump(e); });

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && (world.phase === 'expedition' || world.phase === 'tear')) { world.holdKey = true; e.preventDefault(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') world.holdKey = false; });

$('go').onclick = go;
$('back').onclick = toAtelier;
let resetArmed = 0;
$('reset').onclick = () => {
  if (Date.now() - resetArmed < 3000) {
    save = freshSave(); writeSave(save); selected = 'root'; renderTree();
    $('reset').textContent = 'Recommencer à zéro';
  } else {
    resetArmed = Date.now(); $('reset').textContent = 'Clique encore pour tout effacer';
    setTimeout(() => { $('reset').textContent = 'Recommencer à zéro'; }, 3000);
  }
};

// ---------- Boucle à pas fixe ----------
const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  const wr = $('walletBox').getBoundingClientRect(), ar = app.getBoundingClientRect();
  world.walletPos = { x: wr.left - ar.left + 20, y: wr.top - ar.top + wr.height / 2 };
  while (acc >= STEP) {
    scrollCam(STEP);
    update(world, STEP);
    drainEvents();
    tickBanner(STEP);
    acc -= STEP;
  }
  render(g, world, dpr);
  hud();
  drawMinimap();
  requestAnimationFrame(frame);
}

// premier nœud utile sélectionné par défaut
selected = (NODES.find(n => visible(n) && L(n.id) < n.max && n.id !== 'root') || NODES[0]).id;
renderTree();
requestAnimationFrame(frame);

// Accès pour les tests automatisés
window.__game = { world, get save() { return save; }, go, toAtelier };
