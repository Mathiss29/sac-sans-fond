// Point d'entrée : boucle à pas fixe, entrées, interface (HUD, Atelier, bilan).
import { ZONES, stageFor, TIERS, HEROES, HERO_ORDER, ARENA, computeStats, nodeCost, bagMax, tierOf, tierRange } from './data.js';
import { loadSave, writeSave, freshSave } from './save.js';
import { unlockAudio, play, setMuted, setTrack, unlockMusic } from './audio.js';
import { createWorld, startExpedition, startLair, enterArena, canEnterPortal, portalPos, update, dropHero, canDrop, selectHero, moveCam, centerCam, clampCam, pointerWorld, bagPos } from './game.js';
import { render, drawHero, drawBag, getMap, enemyIcon, heroSheetsReady } from './render.js';
import { HERO_SHEETS, TREE_ICONS, treeIcons, buildSprites as getSprites } from './sprites.js';
import { NODES, NODE, BRANCHES, TREE_LABELS } from './tree.js';
let iconSheet = null;
treeIcons.then(im => { iconSheet = im; if (im) renderTree(); });

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
// Portail de l'antre : ouvert une fois le palier Soie atteint (ou le boss déjà battu).
const lairOpen = () => !!save.lairOpen || ((save.bosses || {})[ZONES[0].id] || 0) > 0;
const lairInfo = () => ({ open: lairOpen(), first: !((save.bosses || {})[ZONES[0].id] > 0) });
function showRunUi() {
  $('atelier').hidden = true; $('result').hidden = true;
  $('hud').hidden = false; $('dropBar').hidden = false; $('hint').hidden = false; $('mapUi').hidden = false;
  arenaUi();
  buildDropBar();
}
function go() {
  stats = computeStats(save.level);
  startExpedition(world, stats, ZONES[0], lairInfo(), stageFor(save.expeditions));
  showRunUi();
}
function goLair() {
  if (!lairOpen()) return;
  stats = computeStats(save.level);
  startLair(world, stats, ZONES[0], lairInfo());
  showRunUi();
}
// Dans l'antre : pas de sac ni de mini-carte ; flèches seulement si la salle dépasse de l'écran.
function arenaUi() {
  const arena = world.mode === 'arena';
  $('bagBox').hidden = arena;
  $('minimap').hidden = arena;
  const fits = world.mapW <= world.w && world.mapH <= world.h;
  document.querySelectorAll('.edge').forEach(b => { b.hidden = arena && fits; });
}

// Cartes des héros à larguer : un clic (ou 1, 2, 3, 4) choisit lequel tombera au prochain clic sur la carte.
const heroIcons = {};
function heroIcon(type) {
  if (heroIcons[type]) return heroIcons[type];
  const c = document.createElement('canvas'); c.width = c.height = 68;
  const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; drawHero(cg, type, 34, 64, 1, 0, 1, HERO_SHEETS[type] ? 2 : 3);
  return (heroIcons[type] = c);
}
function buildDropBar() {
  const box = $('dropBar'); box.innerHTML = '';
  const r = world.run;
  const types = HERO_ORDER.filter(k => stats.heroes[k] > 0);
  types.forEach((type, i) => {
    const n = r.toDrop[type];
    const b = document.createElement('button');
    b.className = 'card' + (n <= 0 ? ' empty' : '') + (r.sel === type && n > 0 ? ' sel' : '');
    b.title = `${HEROES[type].name} (touche ${i + 1}) : ${HEROES[type].blurb}`;
    const c = document.createElement('canvas'); c.width = c.height = 68;
    c.getContext('2d').drawImage(heroIcon(type), 0, 0);
    const key = document.createElement('span'); key.className = 'key'; key.textContent = i + 1;
    const name = document.createElement('span'); name.className = 'nm'; name.textContent = HEROES[type].plural;
    const cnt = document.createElement('span'); cnt.className = 'cnt num'; cnt.textContent = n;
    b.append(key, c, name, cnt);
    b.onclick = () => { selectHero(world, type); buildDropBar(); };
    box.append(b);
  });
  const left = types.reduce((t, k) => t + r.toDrop[k], 0);
  if (left <= 0) $('hint').textContent = 'Passe le gant sur le butin · Maintiens le clic : Focus · ZQSD pour te déplacer';
  else $('hint').textContent = `Clique sur la carte pour larguer : ${HEROES[r.sel].name} · ZQSD ou flèches pour te déplacer`;
}

function finishExpedition() {
  const r = world.run;
  const gained = r.tearGot + r.overflow + r.lair.got;
  save.expeditions++;
  const record = save.expeditions > 1 && gained > save.best;
  save.best = Math.max(save.best, gained);
  if (!r.lair.only) save.maxTier = Math.max(save.maxTier || 0, r.tier);
  const unlocked = !lairOpen() && r.tier >= ARENA.unlockTier;
  if (unlocked) save.lairOpen = true;
  writeSave(save);
  const rows = [['Élémentaires vaincus', fmt(r.kills)]];
  if (!r.lair.only) {
    rows.push(
      ['Pièces dans le sac', fmt(r.bag)],
      ['Palier atteint', TIERS[r.tier].name + (r.full ? ' (plein)' : '')],
      ['Multiplicateur', '×' + r.mult.toFixed(2).replace('.', ',')],
      ['Pièces raflées', `${fmt(r.tearGot)} / ${fmt(r.tearTotal)}`],
    );
    if (r.overflow > 0) rows.push(['Surplus du sac plein', '+' + fmt(r.overflow)]);
    if (r.golds) rows.push(['Feux follets dorés aperçus', fmt(r.golds)]);
    if (r.eventsGot) rows.push(['Événements réussis', fmt(r.eventsGot)]);
  }
  if (r.boss) {
    rows.push([world.zone.boss.name, r.bossKilled ? 'vaincu !' : `${Math.round((1 - Math.max(0, r.boss.hp) / r.boss.max) * 100)} % de dégâts`]);
    rows.push(['Butin de l\'antre', '+' + fmt(r.lair.got)]);
  }
  if (unlocked) rows.push([world.zone.boss.lair, 'portail ouvert !']);
  const dl = $('resList'); dl.innerHTML = '';
  for (const [a, b] of rows) {
    const dt = document.createElement('dt'); dt.textContent = a;
    const dd = document.createElement('dd'); dd.textContent = b; dd.className = 'num';
    dl.append(dt, dd);
  }
  // le total compte jusqu'au gain, puis on annonce ce qui est achetable
  const t0 = performance.now(), el = $('resTotal');
  const tick = now => { const k = Math.min(1, (now - t0) / 900); el.textContent = '+' + fmt(Math.round(gained * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  $('resRecord').hidden = !record;
  const can = NODES.filter(n => visible(n) && !n.soon && !lockedNow(n) && L(n.id) < capOf(n) && save.coins >= costOf(n, L(n.id))).length;
  $('resNews').textContent = can ? `${can} compétence${can > 1 ? 's' : ''} à acheter !` : '';
  $('hud').hidden = true; $('dropBar').hidden = true; $('hint').hidden = true; $('mapUi').hidden = true; $('attrBox').hidden = true;
  $('result').hidden = false;
  $('back').focus();
}

function toAtelier() {
  world.phase = 'idle'; world.run = null; world.heroes = []; world.coins = [];
  stats = computeStats(save.level); world.stats = stats;
  $('result').hidden = true; $('atelier').hidden = false;
  renderTree();
  centerTree();
}

// Son : coupé ou non, mémorisé dans la sauvegarde.
function refreshMute() {
  setMuted(!!save.muted);
  document.querySelectorAll('.mute').forEach(b => { b.textContent = save.muted ? '🔇' : '🔊'; b.setAttribute('aria-label', save.muted ? 'Remettre le son' : 'Couper le son'); });
}
document.querySelectorAll('.mute').forEach(b => b.addEventListener('click', () => { unlockAudio(); save.muted = !save.muted; writeSave(save); refreshMute(); }));
window.addEventListener('pointerdown', () => { unlockAudio(); unlockMusic(); });
window.addEventListener('keydown', () => { unlockAudio(); unlockMusic(); });
refreshMute();

// Première fois qu'un événement arrive : le jeu se met en pause et une fiche l'explique.
let paused = false;
const EVENT_HELP = {
  rain: ['Pluie de pièces !', 'Des pièces tombent du ciel pendant quelques secondes. Passe le gant dessus pour les ramasser avant qu\'elles ne disparaissent.', 'coin'],
  vein: ['Filon d\'or !', 'Un rocher veiné d\'or. Chaque coup de tes héros en fait jaillir des pièces : largue-les près de lui !', 'vein'],
  goblin: ['Gobelin voleur !', 'Il file avec un sac d\'or. Rattrape-le avec tes héros avant qu\'il ne s\'échappe : il lâche tout son butin.', 'goblin'],
  mimic: ['Un coffre ?', 'Méfie-toi, c\'est une mimique. Frappe-la pour la réveiller, puis abats-la pour son trésor. Attention, elle mord !', 'mimic'],
};
function eventIntro(kind) {
  save.eventsSeen = save.eventsSeen || {};
  const h = EVENT_HELP[kind];
  if (!h || save.eventsSeen[kind]) return;
  save.eventsSeen[kind] = true; writeSave(save);
  paused = true;
  const card = document.createElement('div'); card.className = 'evCard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', h[0]);
  const ic = document.createElement('canvas'); ic.width = ic.height = 64;
  const g2 = ic.getContext('2d'); g2.imageSmoothingEnabled = false;
  const spr = getSprites();
  const src = h[2] === 'coin' ? spr.coin : spr.enemies[h[2]] && spr.enemies[h[2]][h[2] === 'mimic' ? 0 : 0].c;
  if (src) { const k = Math.min(56 / src.width, 56 / src.height); g2.drawImage(src, 32 - src.width * k / 2, 32 - src.height * k / 2, src.width * k, src.height * k); }
  const t = document.createElement('h3'); t.textContent = h[0];
  const p = document.createElement('p'); p.textContent = h[1];
  const ok = document.createElement('button'); ok.className = 'btn'; ok.textContent = 'Compris';
  const close = () => { card.remove(); paused = false; removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  ok.onclick = close; addEventListener('keydown', key, true);
  const body = document.createElement('div'); body.append(t, p);
  card.append(ic, body, ok); $('app').append(card); ok.focus();
}

function drainEvents() {
  for (const s of world.sfx) play(s.name, s);
  world.sfx.length = 0;
  for (const ev of world.events) {
    if (ev.kind === 'banner') bannerQ.push(ev);
    else if (ev.kind === 'coins') save.coins += ev.value;
    else if (ev.kind === 'done') finishExpedition();
    else if (ev.kind === 'eventIntro') eventIntro(ev.ev);
    else if (ev.kind === 'boss') { save.bosses = save.bosses || {}; save.bosses[world.zone.id] = (save.bosses[world.zone.id] || 0) + 1; writeSave(save); }
    else if (ev.kind === 'arena') { arenaUi(); buildDropBar(); }
    else if (ev.kind === 'tear') { $('dropBar').hidden = true; $('hint').hidden = true; document.querySelectorAll('.edge').forEach(b => { b.hidden = true; }); }
  }
  world.events.length = 0;
}

// ---------- HUD ----------
function hud() {
  const r = world.run;
  if (!r || (world.phase !== 'expedition' && world.phase !== 'tear')) return;
  $('wallet').textContent = fmt(save.coins);
  const ar = world.mode === 'arena' && r.arena;
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
  const left = ar ? Math.max(0, ar.won ? ar.loot : ar.duration - ar.t)
    : world.phase === 'tear' ? Math.max(0, r.shake > 0 ? r.tearDur || stats.tearDuration : r.tearT) : Math.max(0, r.duration - r.t);
  $('timer').textContent = left.toFixed(1);
  $('timer').style.color = world.phase === 'tear' || (ar && ar.won) ? 'var(--gold)' : (left < 5 ? 'var(--ember)' : 'var(--parch)');
  $('zoneTxt').textContent = ar ? (ar.won ? 'Butin !' : world.zone.boss.lair) : world.phase === 'tear' ? 'Déchirure !' : `Expédition ${save.expeditions + 1} · ${world.zone.stage || world.zone.name}`;
  // « +N dans le sac » : ce que l'expédition a déjà rapporté
  const gain = ar ? r.lair.got : world.phase === 'tear' ? r.tearGot : r.bag;
  const gtxt = '+' + fmt(gain) + (ar ? ' de butin' : world.phase === 'tear' ? ' raflées' : ' dans le sac');
  if ($('runGain').textContent !== gtxt) { $('runGain').textContent = gtxt; $('runGain').classList.remove('pop'); void $('runGain').offsetWidth; $('runGain').classList.add('pop'); }
  // jauge du clic maintenu
  const ab = $('attrBox'), tear = world.phase === 'tear';
  ab.hidden = false; ab.classList.toggle('lock', !!r.focusLock); ab.classList.toggle('tear', tear);
  $('attrName').textContent = 'Maintenir le clic : ' + (tear ? 'Attraction' : 'Focus');
  $('attrTxt').textContent = r.focusLock ? 'recharge…' : r.attraction.toFixed(1).replace('.', ',') + ' s';
  screenCount();
  $('attrFill').style.width = (r.attraction / stats.attraction * 100) + '%';
  const boss = r.boss;
  $('bossBar').hidden = !(boss && ar && world.phase === 'expedition' && !boss.dead);
  if (boss && !boss.dead) { $('bossName').textContent = boss.def.name; $('bossFill').style.width = Math.max(0, boss.hp / boss.max * 100) + '%'; }
}

// Compteur « À l'écran » : élémentaires visibles par famille, avec leurs PV.
let screenT = 0;
function screenCount() {
  const now = performance.now(); if (now - screenT < 200) return; screenT = now;
  const c = world.cam, n = {}, hp = {};
  for (const e of world.enemies) {
    if (e.dead || e.boss || e.x < c.x || e.x > c.x + world.w || e.y < c.y || e.y > c.y + world.h) continue;
    const k = e.gold ? 'gold' : e.type; n[k] = (n[k] || 0) + 1; hp[k] = e.max;
  }
  const box = $('screenList'); box.innerHTML = '';
  const keys = Object.keys(n).sort((a, b) => n[b] - n[a]);
  $('screenBox').hidden = !keys.length;
  for (const k of keys) {
    const row = document.createElement('div'); row.className = 'row';
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 22; cv2.getContext('2d').drawImage(enemyIcon(k), 0, 0);
    const cnt = document.createElement('span'); cnt.textContent = '×' + n[k];
    const h = document.createElement('span'); h.className = 'hp num'; h.textContent = fmt(hp[k]) + ' PV';
    row.append(cv2, cnt, h); box.append(row);
  }
}

// ---------- Atelier : le grand arbre ----------
// Une croix qui part du sac. Brouillard : on voit les nœuds achetés, leurs enfants, et des « ? » un cran plus loin.
const G = 84, PAD = 90;
const minX = Math.min(...NODES.map(n => n.x)), minY = Math.min(...NODES.map(n => n.y));
const maxX = Math.max(...NODES.map(n => n.x)), maxY = Math.max(...NODES.map(n => n.y));
let selected = 'root', hover = null;
// nœuds déjà vus (pour l'étiquette « Nouveau ») ; une ancienne sauvegarde a tout vu
const seen = new Set(save.seen || []);
const mixDim = hex => { const v = parseInt(hex.slice(1), 16); const c = k => Math.round(((v >> k) & 255) * 0.42 + 20); return `rgb(${c(16)},${c(8)},${c(0)})`; };
const L = id => save.level[id] || 0;
const visible = n => !n.parent || L(n.parent) > 0 || L(n.id) > 0;
const teaser = () => false; // pas de « ? » : on ne voit que les nœuds révélés
const colorOf = n => (BRANCHES[n.branch] || BRANCHES.depart)[1];
const branchName = n => (BRANCHES[n.branch] || BRANCHES.depart)[0];
const ctx = () => ({ maxTier: save.maxTier || 0, bossWins: (save.bosses || {})[ZONES[0].id] || 0 });
// niveau maximum achetable pour l'instant (certains nœuds se débloquent par étapes)
const capOf = n => n.cap ? Math.min(n.max, n.cap(L)) : n.max;
const lockedNow = n => n.soon || (n.need && !n.need(ctx()) && !L(n.id));
// une seule voie par fourche de classe (pas encore en jeu, mais on garde la règle)
const costOf = (n, lv) => nodeCost(n, lv, save.level);
const pos = n => ({ x: PAD + (n.x - minX) * G, y: PAD + (n.y - minY) * G });

const demonImgs = {};
function iconSource(key) {
  if (key.startsWith('d_')) {
    const id = key.slice(2);
    if (!demonImgs[id]) { const im = new Image(); im.onload = () => renderTree(); im.src = `assets/sprites/demons/${id}.png`; demonImgs[id] = im; }
    return demonImgs[id].complete && demonImgs[id].naturalWidth ? demonImgs[id] : null;
  }
  const spr = getSprites();
  const m = { m_gold: ['gold', 0], m_golem: ['golem', 0], m_boss: ['boss', 0], e_vein: ['vein', 0], e_goblin: ['goblin', 0], e_mimic: ['mimic', 0], e_mimicOpen: ['mimic', 3] }[key];
  if (m && spr.enemies && spr.enemies[m[0]]) { const f = spr.enemies[m[0]]; return (f[m[1]] || f[0]).c; }
  return null;
}
function nodeIcon(n) {
  const c = document.createElement('canvas'); c.width = c.height = 92;
  const ig = c.getContext('2d'); ig.imageSmoothingEnabled = false;
  const key = n.icon || '', ii = TREE_ICONS.indexOf(key);
  if (iconSheet && ii >= 0) { ig.drawImage(iconSheet, ii * 64, 0, 64, 64, 6, 6, 80, 80); return c; }
  if (HEROES[key]) { drawHero(ig, key, 46, 84, 1, 0, 1, 4); return c; }
  if (/^bag\d$/.test(key)) { drawBag(ig, 46, 86, +key[3], 0.1, 0, 0, 3); return c; }
  const src = iconSource(key);
  if (src) {
    const k = Math.min(80 / src.width, 80 / src.height);
    ig.drawImage(src, Math.round(46 - src.width * k / 2), Math.round(46 - src.height * k / 2), Math.round(src.width * k), Math.round(src.height * k));
  }
  return c;
}

function renderTree() {
  $('atelierWallet').textContent = fmt(save.coins);
  const lb = $('lairBtn'), open = lairOpen();
  lb.disabled = !open;
  $('zoneBoss').textContent = (open ? '♛ ' : '🔒 ') + ZONES[0].boss.lair;
  $('runsChip').textContent = `Expéditions : ${save.expeditions}`;
  lb.title = open ? `Affronter ${ZONES[0].boss.name} directement` : `Remplis le sac jusqu'au palier « ${TIERS[ARENA.unlockTier].name} » pour ouvrir le portail`;
  const inner = $('treeInner'), svg = $('treeLines');
  const W = PAD * 2 + (maxX - minX) * G, H = PAD * 2 + (maxY - minY) * G;
  inner.style.width = W + 'px'; inner.style.height = H + 'px';
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  inner.querySelectorAll('.node,.branchLbl').forEach(e => e.remove());
  svg.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.append(e); return e; };
  const defs = el('defs', {});
  const f = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, f);
  const m = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
  const R = pos(NODE.root);
  // chemins droits, en coude quand il le faut (grille)
  for (const n of NODES) {
    if (!n.parent || !(visible(n) || teaser(n))) continue;
    const a = pos(NODE[n.parent]), b = pos(n), own = L(n.id) > 0;
    const d = a.x === b.x || a.y === b.y ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${a.y} L${b.x},${b.y}`;
    // traits à angle droit, couleur de la branche : vive si achetée, éteinte sinon
    el('path', { d, fill: 'none', stroke: '#10140d', 'stroke-width': own ? 8 : 6, 'stroke-linejoin': 'miter' });
    el('path', { d, fill: 'none', stroke: own ? colorOf(n) : '#272d23', 'stroke-width': own ? 4 : 2,
      'stroke-linejoin': 'miter', 'stroke-dasharray': visible(n) ? '' : '3 4' });
  }
  // étiquette de branche : petit texte en couleur au-dessus du premier nœud de la branche
  const labelled = new Set();
  for (const n of NODES) {
    if (n.id === 'root' || labelled.has(n.branch) || !visible(n) || NODE[n.parent].branch === n.branch) continue;
    labelled.add(n.branch);
    const lb2 = document.createElement('div'); lb2.className = 'branchLbl'; lb2.textContent = branchName(n);
    lb2.style.setProperty('--c', colorOf(n));
    // branche verticale : étiquette à côté du nœud ; branche horizontale : au-dessus
    const q = pos(n), par = NODE[n.parent];
    if (par.x === n.x) { lb2.classList.add(n.x < 0 ? 'left' : 'right'); lb2.style.left = (q.x + (n.x < 0 ? -32 : 32)) + 'px'; lb2.style.top = q.y + 'px'; }
    else { lb2.style.left = q.x + 'px'; lb2.style.top = (q.y - 38) + 'px'; }
    inner.append(lb2);
  }
  for (const n of NODES) {
    const shown = visible(n), tz = !shown && teaser(n);
    if (!shown && !tz) continue;
    const p = pos(n), lv = L(n.id), isMax = lv >= n.max, capped = !isMax && lv >= capOf(n), locked = shown && lockedNow(n);
    const afford = !tz && !isMax && !locked && !capped && save.coins >= costOf(n, lv);
    const b = document.createElement('button');
    b.className = 'node t-' + n.type + (tz ? ' teaser' : '') + (lv ? ' owned' : '') + (n.soon && shown ? ' soon' : '') + (locked && !n.soon ? ' locked' : '')
      + (isMax ? ' max' : '') + (afford ? ' afford' : '') + (selected === n.id ? ' sel' : '') + (n.id === 'root' ? ' root' : '');
    b.style.setProperty('--c', colorOf(n));
    b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
    b.dataset.id = n.id;
    b.setAttribute('aria-label', tz ? 'Compétence cachée' : n.name);
    if (tz) { const q = document.createElement('span'); q.className = 'q'; q.textContent = '?'; b.append(q); }
    else {
      b.append(nodeIcon(n));
      if (n.badge) { const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = n.badge; b.append(bd); }
      if (locked) { const pd = document.createElement('span'); pd.className = 'pad'; pd.textContent = n.soon ? '…' : '🔒'; b.append(pd); }
      if (afford) b.append(Object.assign(document.createElement('span'), { className: 'dot' }));
      if (!seen.has(n.id) && n.id !== 'root') b.append(Object.assign(document.createElement('span'), { className: 'newTag', textContent: 'Nouveau' }));
      if (lv && n.id !== 'root') b.append(Object.assign(document.createElement('span'), { className: 'ok', textContent: '✓' }));
    }
    // un clic achète (comme une caisse enregistreuse) ; survol ou clic montrent la fiche
    b.onclick = () => { selected = n.id; if (!tz && afford) buy(n); else renderTree(); };
    b.onmouseenter = () => { hover = n.id; renderInfo(); if (!seen.has(n.id)) { seen.add(n.id); save.seen = [...seen]; writeSave(save); b.querySelector('.newTag')?.remove(); } };
    b.onmouseleave = () => { hover = null; renderInfo(); };
    inner.append(b);
  }
  renderInfo();
  const live = NODES.filter(n => !n.soon), owned = live.filter(n => L(n.id) > 0).length;
  $('stats').textContent = (save.expeditions ? `${save.expeditions} expédition${save.expeditions > 1 ? 's' : ''} · record ${fmt(save.best)} pièces · ` : '') + `${owned}/${live.length} compétences`;
}

function renderInfo() {
  const n = NODE[hover || selected] || NODE.root;
  const lv = L(n.id), isMax = lv >= n.max;
  const box = $('info'); box.innerHTML = '';
  queueMicrotask(() => placeInfo(n));
  if (visible(n)) { const ic = nodeIcon(n); ic.className = 'infoIco'; box.append(ic); }
  box.style.setProperty('--c', colorOf(n));
  const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; box.append(e); return e; };
  if (!visible(n)) {
    add('div', 'branch', branchName(n)); add('h3', '', '???');
    add('p', 'locked', `Achète d'abord « ${NODE[n.parent].name} » pour révéler cette compétence.`);
    return;
  }
  const kind = { up: 'Amélioration', unlock: 'Déblocage', major: 'Majeur', ult: 'Ultime', lock: 'Déblocage', secret: 'Secret', cls: 'Classe' }[n.type] || '';
  const hd = add('div', 'branch', branchName(n) + (n.badge ? ` · ${n.badge}` : ''));
  hd.append(Object.assign(document.createElement('i'), { textContent: n.max > 1 && !n.soon ? `Niv. ${lv}/${n.max}` : kind }));
  add('h3', '', n.name);
  add('p', '', n.desc);
  if (n.soon) { if (n.cond) add('p', 'cond', n.cond); add('p', 'locked', 'Bientôt dans le jeu.'); return; }
  const eff = add('div', 'eff', isMax ? n.effect(lv) : lv ? n.effect(lv) + '  →  ' : '');
  if (!isMax) eff.append(Object.assign(document.createElement('b'), { textContent: n.effect(lv + 1) }));
  if (lockedNow(n)) { add('p', 'locked', '🔒 ' + n.cond); return; }
  if (!isMax && lv >= capOf(n)) { add('p', 'locked', '🔒 ' + (n.capMsg || 'Pas encore disponible.')); return; }
  if (isMax) return;
  const c = costOf(n, lv), pr = document.createElement('div'); pr.className = 'price';
  const amt = document.createElement('span'); const i = document.createElement('span'); i.className = 'coin-ico';
  amt.append(i, ' ' + fmt(c));
  pr.append(amt, save.coins >= c ? Object.assign(document.createElement('span'), { className: 'go', textContent: 'Clique pour acheter' })
    : Object.assign(document.createElement('span'), { className: 'need', textContent: `Il manque ${fmt(c - save.coins)}` }));
  box.append(pr);
}
// La fiche suit le nœud : à sa droite, ou à sa gauche près du bord.
function placeInfo(n) {
  const box = $('info'), wrap = $('treeWrap'), el = $('treeInner').querySelector(`[data-id="${n.id}"]`);
  if (!el) { box.style.left = '-9999px'; return; }
  const r = el.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  const bw = Math.min(300, w.width - 32);
  let x = r.right - w.left + 12;
  if (x + bw > w.width - 8) x = r.left - w.left - bw - 12;
  x = Math.max(8, x);
  const y = Math.max(8, Math.min(r.top - w.top - 10, w.height - box.offsetHeight - 8));
  box.style.left = x + 'px'; box.style.top = y + 'px';
}

function buy(n) {
  const lv = L(n.id);
  if (n.soon || lockedNow(n) || !visible(n) || lv >= capOf(n)) return;
  const c = costOf(n, lv);
  if (save.coins < c) return;
  const hidden = new Set(NODES.filter(m => !visible(m)).map(m => m.id));
  save.coins -= c; save.level[n.id] = lv + 1;
  unlockAudio(); play('buy');
  writeSave(save);
  stats = computeStats(save.level);
  renderTree();
  buyFx(n, c, NODES.filter(m => hidden.has(m.id) && visible(m)));
}

// Effets d'achat : le nœud rebondit, des étincelles jaillissent, le prix s'envole, les nœuds révélés éclosent.
function buyFx(n, cost, revealed) {
  const inner = $('treeInner'), el = inner.querySelector(`[data-id="${n.id}"]`), q = pos(n), col = colorOf(n);
  if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  for (let i = 0; i < 14; i++) {
    const sp = document.createElement('i'); sp.className = 'spark';
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4, d = 34 + Math.random() * 34;
    sp.style.left = q.x + 'px'; sp.style.top = q.y + 'px'; sp.style.background = i % 3 ? col : '#ffe68a';
    sp.style.setProperty('--dx', Math.cos(a) * d + 'px'); sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
    inner.append(sp); setTimeout(() => sp.remove(), 650);
  }
  const ring = document.createElement('i'); ring.className = 'buyRing'; ring.style.left = q.x + 'px'; ring.style.top = q.y + 'px'; ring.style.borderColor = col;
  inner.append(ring); setTimeout(() => ring.remove(), 600);
  if (cost > 0) {
    const t = document.createElement('span'); t.className = 'costFly'; t.textContent = '−' + fmt(cost);
    t.style.left = q.x + 'px'; t.style.top = (q.y - 30) + 'px'; inner.append(t); setTimeout(() => t.remove(), 1100);
  }
  const w = $('atelierWallet').parentElement; w.classList.remove('spend'); void w.offsetWidth; w.classList.add('spend');
  revealed.forEach((m, i) => {
    const e = inner.querySelector(`[data-id="${m.id}"]`);
    if (e) { e.style.animationDelay = (0.15 + i * 0.08) + 's'; e.classList.add('reveal'); }
  });
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
  const q = pointerWorld(world);
  if (p.y > 60 && canEnterPortal(world, q.x, q.y)) { enterArena(world); p.usedForDrop = true; return; }
  if (canDrop(world) && p.y > 60) { dropHero(world, q.x, q.y); p.usedForDrop = true; buildDropBar(); }
});
cv.addEventListener('pointerup', e => { p.down = false; if (e.pointerType !== 'mouse') p.inside = false; });
cv.addEventListener('pointercancel', () => { p.down = false; p.inside = false; });
// Déplacement de la caméra : ZQSD sur clavier français, WASD sur clavier anglais (mêmes touches physiques), ou flèches.
const CAM_KEYS = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const held = new Set();
const playing = () => world.phase === 'expedition' || world.phase === 'tear';
window.addEventListener('keydown', e => {
  if (CAM_KEYS[e.code] && playing()) { held.add(e.code); e.preventDefault(); }
  const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code);
  if (m && world.phase === 'expedition') {
    const type = HERO_ORDER.filter(k => stats.heroes[k] > 0)[+m[1] - 1];
    if (type) { selectHero(world, type); buildDropBar(); }
  }
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
  if (!playing() || world.mode !== 'map') return;
  const map = getMap(world);
  const W = mm.clientWidth, H = Math.round(W * world.mapH / world.mapW);
  if (mm.width !== W * dpr || mm.height !== H * dpr) { mm.width = W * dpr; mm.height = H * dpr; mm.style.height = H + 'px'; }
  const k = W / world.mapW;
  mg.setTransform(dpr, 0, 0, dpr, 0, 0);
  mg.imageSmoothingEnabled = true;
  mg.drawImage(map.c, 0, 0, W, H);
  const dot = (x, y, r, col) => { mg.fillStyle = col; mg.fillRect(Math.round(x * k - r / 2), Math.round(y * k - r / 2), r, r); };
  for (const c of world.coins) dot(c.x, c.y, 2, '#ffd34d');
  for (const e of world.enemies) if (!e.boss) dot(e.x, e.y, e.gold ? 4 : 3, e.gold ? '#ffe14a' : '#ff6b4a');
  const b = bagPos(world); dot(b.x, b.y, 6, '#fff2c8');
  for (const u of world.heroes) dot(u.x, u.y, 4, '#7ee06b');
  const lr = world.run && world.run.lair, pp = portalPos(world);
  if (lr && lr.open && !lr.done) { dot(pp.x, pp.y, 8, '#24161e'); dot(pp.x, pp.y, 6, '#ff9a3c'); }
  mg.strokeStyle = '#fff'; mg.lineWidth = 1.5;
  mg.strokeRect(world.cam.x * k, world.cam.y * k, world.w * k, world.h * k);
}
function minimapJump(e) {
  if (world.phase !== 'expedition' || world.mode !== 'map') return;
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
$('lairBtn').onclick = goLair;
$('back').onclick = toAtelier;
$('again').onclick = () => { $('result').hidden = true; go(); };
addEventListener('keydown', e => {
  if ($('result').hidden) return;
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); $('again').click(); }
});
let resetArmed = 0;
$('reset').onclick = () => {
  if (Date.now() - resetArmed < 3000) {
    save = freshSave(); seen.clear(); writeSave(save); selected = 'root'; stats = computeStats(save.level); renderTree();
    $('reset').textContent = 'Recommencer à zéro';
  } else {
    resetArmed = Date.now(); $('reset').textContent = 'Clique encore pour tout effacer';
    setTimeout(() => { $('reset').textContent = 'Recommencer à zéro'; }, 3000);
  }
};

// Musique du moment : Atelier, expédition, ou boss dans son antre.
// musique d'expédition : propre à l'ambiance quand elle en a une (matin, minuit), sinon le thème commun
const stageTrack = () => ({ matin: 'matin', minuit: 'minuit' }[world.stage && world.stage.id] || 'expedition');
function musicFor() {
  if (world.phase === 'expedition') return world.mode === 'arena' ? 'boss' : stageTrack();
  if (world.phase === 'done' && world.mode === 'arena') return 'boss';
  if (world.phase === 'tear') return stageTrack();
  return 'atelier';
}

// ---------- Boucle à pas fixe ----------
const STEP = 1 / 60;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  const wr = $('walletBox').getBoundingClientRect(), ar = app.getBoundingClientRect();
  world.walletPos = { x: wr.left - ar.left + 20, y: wr.top - ar.top + wr.height / 2 };
  if (paused) acc = 0;
  while (acc >= STEP) {
    scrollCam(STEP);
    update(world, STEP);
    drainEvents();
    tickBanner(STEP);
    acc -= STEP;
  }
  render(g, world, dpr);
  hud();
  setTrack(musicFor());
  drawMinimap();
  requestAnimationFrame(frame);
}

// Sur petit écran, l'arbre déborde : on le centre sur le nœud sélectionné.
// Glisser pour se déplacer dans l'arbre, molette pour zoomer.
let treeZoom = 1;
(function treePan() {
  const sc = $('treeScroll'), inner = $('treeInner');
  let drag = null;
  sc.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop, moved: false };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && dx * dx + dy * dy < 36) return;
    drag.moved = true; sc.classList.add('drag');
    sc.scrollLeft = drag.l - dx; sc.scrollTop = drag.t - dy;
  });
  addEventListener('pointerup', () => { if (drag && drag.moved) { sc.classList.remove('drag'); suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); } drag = null; });
  sc.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  sc.addEventListener('scroll', () => placeInfo(NODE[hover || selected] || NODE.root));
  sc.addEventListener('wheel', e => {
    e.preventDefault();
    const r = sc.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (sc.scrollLeft + mx) / treeZoom, wy = (sc.scrollTop + my) / treeZoom;
    treeZoom = Math.max(0.45, Math.min(1.4, treeZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    inner.style.zoom = treeZoom;
    sc.scrollLeft = wx * treeZoom - mx; sc.scrollTop = wy * treeZoom - my;
  }, { passive: false });
})();
let suppressClick = false;

function centerTree() {
  const sc = $('treeScroll'), q = pos(NODE.root);
  sc.scrollLeft = q.x * treeZoom - sc.clientWidth / 2; sc.scrollTop = q.y * treeZoom - sc.clientHeight / 2;
}

// premier nœud utile sélectionné par défaut
if (!save.seen && save.expeditions > 0) { for (const n of NODES) if (visible(n)) seen.add(n.id); save.seen = [...seen]; }
selected = (NODES.find(n => visible(n) && !n.soon && !lockedNow(n) && L(n.id) < n.max && n.id !== 'root') || NODE.root).id;
renderTree();
centerTree();
requestAnimationFrame(frame);
// les planches dessinées arrivent après le premier affichage : on redessine les icônes
heroSheetsReady.then(() => { for (const k in heroIcons) delete heroIcons[k]; renderTree(); });

// Accès pour les tests automatisés
window.__game = { world, get save() { return save; }, go, goLair, toAtelier };
