// Point d'entrée : boucle à pas fixe, entrées, interface (HUD, Atelier, bilan).
import { ZONES, LEVELS, levelZone, ENEMIES, stageFor, TIERS, HEROES, HERO_ORDER, ALL_HEROES, ARENA, ULTS, TRIALS, computeStats, masteryBonus, mastered, nodeCost, bagMax, tierOf, tierRange } from './data.js';
import { loadSave, writeSave, freshSave, exportSave, importSave } from './save.js';
import { unlockAudio, play, setMuted, setTrack, unlockMusic } from './audio.js';
import { RARITIES } from './game.js';
import { useUlt, ultReady, createWorld, startExpedition, startLair, enterArena, canEnterPortal, portalPos, update, dropHero, canDrop, selectHero, moveCam, centerCam, clampCam, pointerWorld, bagPos, LAYOUTS, LAYOUT_NAMES, dailyLayout } from './game.js';
import { setHeroTints, setHeroSkins, render, drawHero, drawBag, getMap, enemyIcon, enemyFrameIcon, enemyFrameCount, heroSheetsReady } from './render.js';
import { HERO_SHEETS, TREE_ICONS, treeIcons, buildSprites as getSprites } from './sprites.js';
import { NODES, NODE, BRANCHES, TREE_LABELS } from './tree.js';
import { gearOf, gearBonus, reserveSize, albumKey, rollItem } from './gear.js';
import { curioOf, curioBonus, extraEvents, addCards, progressQuests, fillQuests, questText, REWARD_TEXT, dungeonZone, CARD_IDS } from './curio.js';
import { initCurio, curioRefresh } from './curio-ui.js';
import { initEpic, epicRefresh, recordRun, heroTints, applyVolumes, VERSION } from './epic-ui.js';
import { initBugReport, copyReport } from './bugreport.js';
import { applyPets, petsOf, petsAfterRun, petSprite } from './pets.js';
import { initPets, petsRefresh } from './pets-ui.js';
import { initCompany, gearIconCanvas, showLoot, companyRefresh, gearSheetReady } from './company.js';
let iconSheet = null;
treeIcons.then(im => { iconSheet = im; if (im) renderTree(); });

const $ = id => document.getElementById(id);
const app = $('app'), cv = $('cv'), g = cv.getContext('2d');
let save = loadSave();
const heroIcons = {};   // icônes des héros (refaites quand la tenue change)
// stats du moment : arbre + équipement de la Compagnie
function calcStats() {
  setHeroTints(heroTints(save));
  for (const k in heroIcons) delete heroIcons[k];
  const s = computeStats(save.level, curioBonus(save, masteryBonus(save, gearBonus(save.gear, save.level))));
  s.eventCount += extraEvents(save);
  applyPets(s, save); s.petsOn = petsOf(save).list.some(p => p.stage > 0);
  setHeroSkins(s.cls);
  return s;
}
let stats = calcStats();
let dpr = 1;
const world = createWorld(800, 600);
// ---------- Monde : 20 niveaux (10 régions × normal / II) ----------
const LV = () => Math.max(0, Math.min(LEVELS.length - 1, save.region || 0));
const curZone = () => levelZone(LV());
const winsOf = id => (save.bosses || {})[id] || 0;
// le niveau suivant s'ouvre quand le boss du précédent est battu ; les Enfers demandent aussi le portail
function levelOpen(i) {
  if (i <= 0) return true;
  if (!(winsOf(LEVELS[i - 1].id) > 0)) return false;
  return !(ZONES[LEVELS[i].zone].demon && !L('portal'));
}
// plus loin niveau atteint sur le chemin (boss précédents battus), pour les conditions de l'arbre
function reached() { let i = 0; while (i + 1 < LEVELS.length && winsOf(LEVELS[i].id) > 0) i++; return i; }
const totalWins = () => Object.values(save.bosses || {}).reduce((t, v) => t + (v > 0 ? 1 : 0), 0);
world.zone = curZone();
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
  const { title, sub, big } = bannerQ.shift();
  const el = $('banner'); el.textContent = '';
  el.classList.toggle('big', !!big);
  // les lettres tombent une à une, comme un tampon
  [...title].forEach((ch, i) => { const l = document.createElement('span'); l.className = 'lt'; l.textContent = ch === ' ' ? '\u00a0' : ch; l.style.animationDelay = (i * 0.025) + 's'; el.append(l); });
  if (sub) { const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  bannerBusy = 1.4;
}

// ---------- Titre de phase (fin d'expédition) ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function phaseShow(title, sub, bar) {
  const el = $('phase');
  $('phaseTitle').textContent = title; $('phaseSub').textContent = sub || ''; $('phaseBar').hidden = !bar;
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
function tierFrac(r, k) {
  // jusqu'où la barre doit monter une fois le palier k atteint
  if (k < r.tier) return (k + 1) / TIERS.length;
  const [lo, hi] = tierRange(r.tier, stats);
  return (r.tier + Math.max(0.08, Math.min(1, (r.bag - lo) / (hi - lo)))) / TIERS.length;
}
function phaseFill(r, k, secs) {
  const f = $('phaseFill');
  f.style.transition = `width ${secs}s cubic-bezier(.4,0,.6,1)`;
  f.style.width = (tierFrac(r, k) * 100) + '%';
  f.style.background = TIERS[k].color; f.style.boxShadow = `0 0 10px ${TIERS[k].glow}`;
}
function flash() { const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }

// ---------- Transition d'écran : un rideau de losanges pixel ----------
let wiping = false;
function wipe(mid) {
  if (wiping) return;
  const cv = $('wipe');
  if (reduceMotion) { mid(); return; }
  wiping = true;
  const dpr2 = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr2; cv.height = H * dpr2; cv.style.display = 'block';
  const g = cv.getContext('2d'); g.setTransform(dpr2, 0, 0, dpr2, 0, 0);
  const C = 30, IN = 380, HOLD = 90, OUT = 420, SW = 0.45;
  let t0 = performance.now(), swapped = false;
  const frame = now => {
    const e = now - t0;
    let p, out = false;
    if (e < IN) p = e / IN; else if (e < IN + HOLD) p = 1; else { p = 1 - (e - IN - HOLD) / OUT; out = true; }
    if (!swapped && e >= IN) { swapped = true; mid(); }
    g.clearRect(0, 0, W, H); g.fillStyle = '#1b1624';
    for (let y = 0; y <= H + C; y += C) for (let x = 0; x <= W + C; x += C) {
      const ox = (Math.round(y / C) % 2) * C / 2;
      const d = ((x + ox) / (W + C)) * SW;                         // balayage de gauche à droite
      const local = Math.min(1, Math.max(0, p * (1 + SW) - (out ? SW - d : d)));
      const h = local * C * 1.02;
      if (h <= 0.5) continue;
      const cx = x + ox, cy = y;
      g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + h, cy); g.lineTo(cx, cy + h); g.lineTo(cx - h, cy); g.closePath(); g.fill();
    }
    if (e < IN + HOLD + OUT) requestAnimationFrame(frame);
    else { g.clearRect(0, 0, W, H); cv.style.display = 'none'; wiping = false; }
  };
  requestAnimationFrame(frame);
}

// ---------- Carte du monde ----------
const MECH = { fire: 'Cercles de feu sous les héros', guards: 'Bulle protégée : abats d\'abord ses gardes', copies: 'Fait apparaître de fausses copies', quake: 'Séismes de glace plus larges',
  armor: 'Armure à briser avant de vraiment le blesser', spores: 'Nuages de spores', imps: 'Appelle des diablotins', dash: 'Fonce à travers la salle (ligne rouge)', final: 'Gardes, copies et ruées : tout à la fois' };
const FAMILY = { king: 'Rois des élémentaires (se divisent)', puffer: 'Boursouflés (gonflent avec le temps)', healer: 'Soigneurs', bandit: 'Bandits (volent tes pièces)', mvp: 'Lapin d\'or (rare et très rapide)' };
let wmSel = 0;
function wmPos(i) { const row = Math.floor(i / 5), c = i % 5, col = row % 2 ? 4 - c : c; return { x: 10 + col * 20, y: 13 + row * 24.5 }; }
function openWorld() { wmSel = LV(); $('worldMap').hidden = false; renderWorld(); }
function renderWorld() {
  const box = $('wmPath'), svg = $('wmLines');
  box.querySelectorAll('.wmNode,.wmRegion').forEach(e => e.remove());
  const done = LEVELS.filter(l => winsOf(l.id) > 0).length;
  $('wmSub').textContent = `${done} / ${LEVELS.length} boss vaincus`;
  let d = '';
  LEVELS.forEach((lv, i) => { const p = wmPos(i); d += (i ? ' L' : 'M') + p.x + ' ' + p.y; });
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
  const open = LEVELS.map((_, i) => levelOpen(i));
  let lit = ''; LEVELS.forEach((lv, i) => { if (!open[i]) return; const p = wmPos(i); lit += (lit ? ' L' : 'M') + p.x + ' ' + p.y; });
  svg.innerHTML = `<path d="${d}" fill="none" stroke="#1a1410" stroke-width="1.6" vector-effect="non-scaling-stroke" style="stroke-width:10px"/><path d="${d}" fill="none" stroke="#4a4030" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" style="stroke-width:4px"/><path d="${lit}" fill="none" stroke="#e6c875" vector-effect="non-scaling-stroke" style="stroke-width:4px"/>`;
  LEVELS.forEach((lv, i) => {
    const z = ZONES[lv.zone], p = wmPos(i), b = document.createElement('button');
    const won = winsOf(lv.id) > 0;
    b.type = 'button';
    b.className = 'wmNode' + (open[i] ? '' : ' locked') + (won ? ' won' : '') + (i === LV() ? ' cur' : '') + (i === wmSel ? ' sel' : '') + (lv.hard ? ' hard' : '');
    b.style.left = p.x + '%'; b.style.top = p.y + '%';
    b.style.setProperty('--g', z.ground[0]); b.style.setProperty('--g2', z.ground[1]); b.style.setProperty('--bc', z.boss.color || '#ff9a46');
    b.innerHTML = `<span class="wmNum">${i + 1}</span>${won ? '<span class="wmCrown">♛</span>' : open[i] ? '' : '<span class="wmLock">🔒</span>'}<span class="wmName">${lv.name}</span>`;
    b.onclick = () => { wmSel = i; renderWorld(); };
    b.ondblclick = () => { if (open[i]) travel(i); };
    box.append(b);
  });
  // panneau d'aperçu
  const lv = LEVELS[wmSel], z = levelZone(wmSel), info = $('wmInfo'); info.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = lv.name; h.style.color = z.boss.color || '#e6c875';
  const bl = document.createElement('p'); bl.className = 'wmBlurb'; bl.textContent = z.blurb || 'Là où tout commence : l\'ambiance change à chaque expédition';
  const foes = document.createElement('div'); foes.className = 'wmFoes';
  for (const k of Object.keys(z.spawn)) { const c = document.createElement('canvas'); c.width = c.height = 22; c.getContext('2d').drawImage(enemyIcon(k), 0, 0); c.title = ENEMIES[k].name; foes.append(c); }
  const dl = document.createElement('dl');
  const row = (a, v) => { const dt = document.createElement('dt'); dt.textContent = a; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); };
  row('Boss', z.boss.name + (lv.hard ? ' (plus rapide)' : ''));
  row('Combat', MECH[z.boss.mech] || '');
  row('Ennemis', 'PV ×' + fmt(lv.hp));
  row('Butin', '×' + fmt(lv.value));
  if (z.mods && z.mods.speed) row('Climat', 'Tout le monde avance ' + Math.round((1 - z.mods.speed) * 100) + ' % moins vite');
  if (z.demon) row('Démons', 'Frappés plus fort avec « Fléau des démons »');
  const news = Object.keys(lv.families).filter(k => lv.families[k] && !(wmSel > 0 && LEVELS[wmSel - 1].families[k]));
  if (news.length) row('Nouveau', news.map(k => FAMILY[k]).join(', '));
  const best = (save.zoneTier || {})[z.id.replace(/2$/, '')];
  if (best !== undefined) row('Meilleur sac', TIERS[best].name);
  row('Boss vaincu', winsOf(lv.id) ? winsOf(lv.id) + ' fois' : 'pas encore');
  const btn = document.createElement('button'); btn.className = 'btn'; btn.type = 'button';
  if (open[wmSel]) { btn.textContent = wmSel === LV() ? 'Tu es ici' : 'Partir ici'; btn.disabled = wmSel === LV(); btn.onclick = () => travel(wmSel); }
  else {
    btn.disabled = true;
    btn.textContent = '🔒 ' + (wmSel > 0 && !(winsOf(LEVELS[wmSel - 1].id) > 0) ? `Bats ${levelZone(wmSel - 1).boss.name} (${LEVELS[wmSel - 1].name})` : 'Achète « Portail des Enfers » dans l\'arbre');
  }
  info.append(h, bl, foes, dl, btn);
}
function randOpen() { const l = LEVELS.map((_, i) => i).filter(levelOpen); return l[Math.floor(Math.random() * l.length)] || 0; }
function goDungeon() {
  const c = curioOf(save);
  if (!(c.keys > 0)) return;
  c.keys--; writeSave(save);
  wipe(() => {
    $('phase').hidden = true;
    stats = calcStats(); world.gearCtx = gearCtx();
    startLair(world, stats, dungeonZone(curZone()), { first: false, dungeon: true });
    showRunUi();
  });
}
function travel(i) {
  if (!levelOpen(i)) return;
  save.region = i; writeSave(save);
  world.zone = curZone();
  $('worldMap').hidden = true;
  renderTree(); play('buy');
}

// ---------- Expédition ----------
// Portail de l'antre : ouvert une fois le palier Soie atteint (ou le boss déjà battu).
function lairOpen() {
  const z = curZone();
  if (winsOf(z.id) > 0) return true;
  if (z.demon && !L('demonLord')) return false;
  return !!((save.lairs || {})[z.id] || (z.id === 'clairiere' && save.lairOpen));
}
const lairInfo = () => ({ open: lairOpen(), first: !(winsOf(curZone().id) > 0) });
function showRunUi() {
  $('atelier').hidden = true; $('result').hidden = true;
  $('hud').hidden = false; $('dropBar').hidden = false; $('hint').hidden = false; $('mapUi').hidden = false;
  arenaUi();
  buildDropBar();
}
function go() { wipe(goNow); }
function goNow() {
  $('phase').hidden = true;
  stats = calcStats(); world.gearCtx = gearCtx();
  const z = curZone();
  stats.layoutPick = save.layoutPick; stats.masteredHere = mastered(save).includes(String(z.id).replace(/2$/, ''));
  startExpedition(world, stats, z, lairInfo(), stageFor(save.expeditions, z));
  showRunUi();
}
function goLair() {
  if (!lairOpen()) return;
  stats = calcStats(); world.gearCtx = gearCtx();
  startLair(world, stats, curZone(), lairInfo());
  showRunUi();
}
// Ce qu'il faut pour tirer un objet : lignées possédées, charmes débloqués, niveau des objets.
function gearCtx() {
  if (!(save.level.armory > 0)) return null;
  const g = gearOf(save);
  return { lines: HERO_ORDER.filter(k => stats.heroes[k] > 0), charms: save.level.charm1 > 0,
    ilvl: Math.min(8, (save.maxTier || 0) + Math.min(4, totalWins()) + Math.floor(LV() / 4)), first: !g.firstDone,
    mythic: winsOf('clairiere') >= 2 || totalWins() >= 3, found: g.found || {} };
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
function heroIcon(type) {
  if (heroIcons[type]) return heroIcons[type];
  const c = document.createElement('canvas'); c.width = c.height = 68;
  const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false; drawHero(cg, type, 34, 64, 1, 0, 1, HERO_SHEETS[type] ? 2 : 3);
  return (heroIcons[type] = c);
}
function buildDropBar() {
  const box = $('dropBar'); box.innerHTML = '';
  const r = world.run;
  const types = ALL_HEROES.filter(k => stats.heroes[k] > 0);
  box.classList.toggle('many', types.length > 5);
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
  const wasOpen = lairOpen(), zid = world.zone.id, base = ZONES[LEVELS[LV()].zone].id;
  if (!r.lair.only) { save.zoneTier = save.zoneTier || {}; save.zoneTier[base] = Math.max(save.zoneTier[base] || 0, r.tier); }
  if (!r.lair.only && r.tier >= ARENA.unlockTier) { save.lairs = save.lairs || {}; save.lairs[zid] = true; if (zid === 'clairiere') save.lairOpen = true; }
  const unlocked = !wasOpen && lairOpen();
  const lairWait = !lairOpen() && world.zone.demon && (save.lairs || {})[zid];
  // objets trouvés : rangés dans la réserve (ceux qui ne rentrent pas sont recyclés en éclats)
  // Curiosités : cartes trouvées, donjon, quêtes ; les potions sont bues
  const extra = [], gc = gearCtx(), news = [];
  if (r.lair.dungeon && r.bossKilled) {
    curioOf(save).dungeons++;
    if (gc) for (let i = 0; i < 2; i++) extra.push(rollItem(gc, 0, Math.random, 1));
    const pool = Object.keys(world.zone.spawn); (r.cards = r.cards || []).push(pool[Math.floor(Math.random() * pool.length)]);
    gearOf(save).shards += 20 + 5 * LV();
  }
  const qDone = save.curio ? progressQuests(save, { zone: world.zone.dungeon ? null : world.zone.id, kills: r.kills, events: r.eventsGot || 0, tier: r.tier || 0, gained, boss: r.bossKilled && !world.zone.dungeon, lairOnly: r.lair.only }) : [];
  for (const q of qDone) {
    news.push(['Quête accomplie', questText(q) + ' → ' + REWARD_TEXT[q.reward], '#e7d3a1']);
    if (q.reward === 'shards') gearOf(save).shards += 15 + 5 * q.lv;
    else if (q.reward === 'key') curioOf(save).keys++;
    else if (q.reward === 'card') (r.cards = r.cards || []).push(CARD_IDS.filter(id => !(save.curio.cards[id]))[0] || CARD_IDS[Math.floor(Math.random() * CARD_IDS.length)]);
    else if (q.reward === 'gear' && gc) extra.push(rollItem(gc, 0, Math.random, 1));
  }
  const cardsGot = r.cards && r.cards.length && L('cabinet') ? addCards(save, r.cards, gearOf) : [];
  if (save.curio) { save.curio.active = []; fillQuests(save, randOpen()); }
  const found = storeItems([...(r.items || []), ...extra]);
  const firstWin = r.bossKilled && !world.zone.dungeon && winsOf(zid) === 1;
  news.push(...petsAfterRun(save, r, { bossFirst: firstWin, zoneId: zid, hard: /2$/.test(zid), dungeon: !!world.zone.dungeon, zonesOpen: LEVELS.filter((_, i) => levelOpen(i)).map(l => ZONES[l.zone].id) }));
  stats = calcStats();
  recordRun(save, r, gained);
  const trialsDone = checkTrials(r);
  writeSave(save);
  const rows = [['Élémentaires vaincus', fmt(r.kills), '#c4c8b2']];
  if (!r.lair.only) {
    rows.push(['Pièces dans le sac', fmt(r.bag), '#e9cf86']);
    if (r.overflow > 0) rows.push(['Surplus du sac plein', '+' + fmt(r.overflow), '#e9cf86']);
    if (r.golds) rows.push(['Feux follets dorés', fmt(r.golds), '#ffd246']);
    if (r.eventsGot) rows.push(['Événements réussis', fmt(r.eventsGot), '#7fd0ff']);
  }
  if (r.dmg && r.dmg.pet > 0 && world.stats.pet) rows.push([world.stats.pet.name + ' (familier)', fmt(Math.round(r.dmg.pet)) + ' dégâts', '#ffb0d8']);
  if (r.boss) {
    rows.push([world.zone.boss.name, r.bossKilled ? 'vaincu !' : `${Math.round((1 - Math.max(0, r.boss.hp) / r.boss.max) * 100)} % de dégâts`, '#ff9f7a']);
    rows.push(['Butin de l\'antre', '+' + fmt(r.lair.got), '#ff9f7a']);
  }
  if (unlocked) rows.push([world.zone.boss.lair, 'portail ouvert !', '#c8a2ff']);
  if (lairWait) rows.push([world.zone.boss.lair, 'demande « Seigneur des Enfers »', '#ff7a5a']);
  if (r.bossKilled && winsOf(zid) === 1 && LV() + 1 < LEVELS.length) rows.push(['Nouveau niveau', LEVELS[LV() + 1].name + (levelOpen(LV() + 1) ? ' ouvert !' : ' (portail des Enfers requis)'), '#9fe07a']);
  if (found.length) rows.push(['Besaces d\'équipement', String(found.length), '#c07aff']);
  for (const c of cardsGot) rows.push(['Carte : ' + ENEMIES[c.id].name, c.isNew ? 'nouvelle !' : c.up ? `${c.stars} ★` : '+2 éclats', '#e7d3a1']);
  if (r.lair.dungeon) rows.push([world.zone.boss.lair, r.bossKilled ? 'pillé : 2 besaces, une carte, des éclats' : 'raté…', '#c8a2ff']);
  rows.push(...news);
  for (const o of r.relicsGot || []) rows.push([`${o.name} (${RARITIES[o.rar].name})`, '+' + fmt(o.value), RARITIES[o.rar].color]);
  if (r.relics && r.relics.length) rows.push(['Trésors attrapés', `${(r.relicsGot || []).length} / ${r.relics.length}`, '#e9cf86']);
  const dl = $('resList'); dl.innerHTML = '';
  for (const [a, b, c] of rows) {
    const dt = document.createElement('dt'); dt.textContent = a; dt.style.setProperty('--c', c);
    const dd = document.createElement('dd'); dd.textContent = b; dd.className = 'num';
    dl.append(dt, dd);
  }
  // en-tête : numéro d'expédition, palier du sac atteint et multiplicateur
  $('resSub').textContent = r.lair.only ? world.zone.boss.lair : `Expédition ${save.expeditions} · ${world.zone.levelName || world.zone.stage || world.zone.name}${world.zone.amb ? '' : ' · ' + world.zone.stage}`;
  const tier = r.tier || 0, [lo, hi] = tierRange(tier, stats);
  $('resTierIco').style.background = TIERS[tier].color;
  $('resTierIco').title = TIERS[tier].name;
  $('resTierFill').style.width = ((tier + Math.max(0.05, Math.min(1, (r.bag - lo) / (hi - lo)))) / TIERS.length * 100) + '%';
  $('resTierFill').style.background = TIERS[tier].color;
  $('resMult').textContent = r.lair.only ? '' : '×' + r.mult.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  document.querySelector('#result .resTier').style.display = r.lair.only ? 'none' : '';
  $('resGot').textContent = r.lair.only ? fmt(r.lair.got) : `${fmt(r.tearGot)} / ${fmt(r.tearTotal)}`;
  // objectif suivant
  const bossDone = ((save.bosses || {})[world.zone.id] || 0) > 0;
  $('resGoal').textContent = world.zone.dungeon ? `Clés de donjon restantes : ${curioOf(save).keys}` : lairOpen() && !bossDone ? `${world.zone.boss.name} t'attend dans son antre !`
    : tier < stats.tiers - 1 ? `Prochain palier : ${TIERS[tier + 1].name}` : 'Sac au palier maximal !';
  // dégâts par héros, à gauche
  const dmg = r.dmg || {}, types = ALL_HEROES.filter(k => dmg[k] > 0);
  const top = Math.max(1, ...types.map(k => dmg[k])), sum = types.reduce((t, k) => t + dmg[k], 0);
  const ul = $('dmgList'); ul.innerHTML = '';
  for (const k of types.sort((x, y) => dmg[y] - dmg[x])) {
    const li = document.createElement('li');
    const ic = document.createElement('canvas'); ic.width = ic.height = 68; ic.getContext('2d').drawImage(heroIcon(k), 0, 0);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = HEROES[k].plural;
    const bar = document.createElement('span'); bar.className = 'dbar'; const fill = document.createElement('i'); bar.append(fill);
    const v = document.createElement('span'); v.className = 'num'; v.textContent = fmt(Math.round(dmg[k]));
    const pc = document.createElement('span'); pc.className = 'pc num'; pc.textContent = Math.round(dmg[k] / sum * 100) + ' %';
    li.append(ic, nm, v, pc, bar); ul.append(li);
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (dmg[k] / top * 100) + '%'; }));
  }
  $('resDmg').hidden = !types.length;
  const better = save.lastDmg > 0 && sum > save.lastDmg * 1.05 ? Math.round((sum / save.lastDmg - 1) * 100) : 0;
  $('resBetter').hidden = !better;
  $('resBetter').textContent = `+${better} % de dégâts par rapport à la dernière fois`;
  if (sum > 0) { save.lastDmg = sum; writeSave(save); }
  $('resRecord').hidden = !record;
  const can = NODES.filter(n => visible(n) && !n.soon && !lockedNow(n) && L(n.id) < capOf(n) && save.coins >= costOf(n, L(n.id))).length;
  $('resNews').textContent = (trialsDone.length ? `Épreuve réussie : ${trialsDone.map(id => NODE[id].name).join(', ')} débloqué ! ` : '') + (can ? `${can} compétence${can > 1 ? 's' : ''} à acheter !` : '');
  $('resNews').classList.toggle('trialWin', trialsDone.length > 0);
  $('hud').hidden = true; $('dropBar').hidden = true; $('hint').hidden = true; $('mapUi').hidden = true; $('attrBox').hidden = true; $('ultBar').hidden = true;
  $('phase').hidden = true;
  // la scène s'assombrit d'abord sur le sac, puis le bilan glisse depuis la droite et le total compte
  const showResult = () => {
    if (world.phase !== 'done') return;
    $('result').hidden = false;
    $('back').focus();
    const t0 = performance.now(), el = $('resTotal');
    let lastTick = 0;
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / 900)); el.textContent = '+' + fmt(Math.round(gained * (1 - Math.pow(1 - k, 3))));
      if (gained > 0 && now - lastTick > 55 && k < 1) { lastTick = now; play('tick', { k }); }
      if (k < 1) requestAnimationFrame(tick); else if (gained > 0) { play(record ? 'gold' : 'buy'); el.classList.remove('land'); void el.offsetWidth; el.classList.add('land'); }
    };
    el.textContent = '+0'; requestAnimationFrame(tick);
  };
  // écran « Sers-toi ! » d'abord s'il y a des objets, puis le bilan
  setTimeout(() => { if (world.phase !== 'done') return; if (found.length) showLoot(found, showResult); else showResult(); }, world.mode === 'arena' ? 200 : 750);
}
// Épreuves d'ultime : on garde le meilleur essai ; réussie = l'ultime est débloqué.
function checkTrials(r) {
  const done = [];
  if (!save.trials || !r.cnt) return done;
  for (const id of Object.keys(save.trials)) {
    if (L(id)) continue;
    const tr = TRIALS[id], v = r.cnt[tr.stat] || 0;
    save.trials[id] = Math.max(save.trials[id] || 0, Math.min(tr.goal, v));
    if (v >= tr.goal) { save.level[id] = 1; done.push(id); }
  }
  if (done.length) stats = calcStats();
  return done;
}
function storeItems(items) {
  if (!items.length || !(save.level.armory > 0)) return [];
  const g = gearOf(save);
  const out = [];
  for (const it of items) {
    it.id = g.next++;
    it.isNew = true;
    const key = albumKey(it);
    if (!g.found[key]) { g.found[key] = 1; it.albumNew = true; g.albumNews = (g.albumNews || 0) + 1; }
    if (g.inv.length < reserveSize(save.level)) { g.inv.push(it); g.news++; } else { it.recycled = true; g.shards += [1, 3, 8, 20, 50][it.rarity]; }
    out.push(it);
  }
  g.firstDone = true;
  return out;
}

function toAtelier() { wipe(toAtelierNow); }
function toAtelierNow() {
  $('phase').hidden = true;
  world.phase = 'idle'; world.run = null; world.heroes = []; world.coins = [];
  stats = calcStats(); world.stats = stats;
  $('result').hidden = true; $('atelier').hidden = false;
  renderTree(); companyRefresh(); curioRefresh(); epicRefresh(); petsRefresh();
  focusCheapest();
}
// En revenant au bilan : la vue se pose sur la compétence achetable la moins chère, qui clignote.
function focusCheapest() {
  const can = NODES.filter(n => visible(n) && !n.soon && !lockedNow(n) && L(n.id) < capOf(n) && save.coins >= costOf(n, L(n.id)));
  if (!can.length) { centerTree(); return; }
  const n = can.reduce((a, b) => costOf(a, L(a.id)) <= costOf(b, L(b.id)) ? a : b);
  const sc = $('treeScroll'), q = pos(n);
  sc.scrollTo({ left: q.x * treeZoom - sc.clientWidth / 2, top: q.y * treeZoom - sc.clientHeight / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  const el = $('treeInner').querySelector(`[data-id="${n.id}"]`);
  if (el) { el.classList.remove('beckon'); void el.offsetWidth; el.classList.add('beckon'); setTimeout(() => el.classList.remove('beckon'), 4200); }
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
  buried: ['Trésor enterré !', 'Une bosse est apparue dans l\'herbe. Garde le gant posé dessus une seconde pour déterrer le trésor.', 'coin'],
  wanted: ['Avis de recherche !', 'Un élémentaire marqué d\'une cible porte une prime. Elle fond chaque seconde : abats-le vite !', 'golem'],
  lucky: ['Sac chanceux !', 'Pendant quelques secondes, chaque coup de tes héros fait tomber de l\'or. Frappe tout ce qui bouge !', 'coin'],
  skyfall: ['Pluie d\'élémentaires !', 'Une horde tombe du ciel près de tes héros. Ils valent deux fois et demie plus que d\'habitude.', 'wisp'],
  rush: ['Ruée dorée !', 'Une file de feux follets dorés traverse la carte sans s\'arrêter. Place tes héros sur leur chemin !', 'gold'],
  mirage: ['Mirage doré !', 'Pendant 8 s, les ennemis vaincus près du gant valent le triple. Promène-le au milieu des combats.', 'coin'],
  treasure: ['Gobelin des trésors !', 'Il est chargé d\'or : chaque coup lui fait perdre des pièces. Frappe-le le plus possible avant qu\'il ne file.', 'goblin'],
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
    else if (ev.kind === 'boss' && world.zone.dungeon) { /* gardien de donjon : ne compte pas comme boss de région */ }
    else if (ev.kind === 'boss') { save.bosses = save.bosses || {}; save.bosses[world.zone.id] = (save.bosses[world.zone.id] || 0) + 1; writeSave(save); }
    else if (ev.kind === 'arena') { arenaUi(); buildDropBar(); }
    else if (ev.kind === 'reinforce') buildDropBar();
    else if (ev.kind === 'secret' && !L(ev.id)) {
      save.level[ev.id] = 1; writeSave(save); stats = calcStats();
      bannerQ.push({ kind: 'banner', big: true, title: 'Secret découvert !', sub: NODE[ev.id].name + ' : ' + NODE[ev.id].desc });
      play('gold');
    }
    else if (ev.kind === 'flash') flash();
    else if (ev.kind === 'tierUp') { phaseFill(world.run, ev.tier, 0.5); }
    else if (ev.kind === 'burst') { flash(); phaseShow(ev.title, ev.sub, false); }
    else if (ev.kind === 'tear') {
      const r = world.run, f = $('phaseFill');
      f.style.transition = 'none'; f.style.width = '0%';
      phaseShow('Le sac déborde !', '', true);
      requestAnimationFrame(() => phaseFill(r, 0, 0.7));
      $('dropBar').hidden = true; $('hint').hidden = true; document.querySelectorAll('.edge').forEach(b => { b.hidden = true; }); }
  }
  world.events.length = 0;
}

// ---------- HUD ----------
// Compteurs vivants : le chiffre saute et un « +N » monte à côté quand il grimpe.
const hudPrev = { wallet: null, bag: null };
const floats = {};
function bump(id, delta) {
  const box = $(id);
  if (!box.classList.contains('bump') || delta > 0) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
  const now = performance.now(), f = floats[id];
  if (f && now - f.t < 400 && f.el.isConnected) { f.v += delta; f.t = now; f.el.textContent = '+' + fmt(Math.round(f.v)); return; }
  const el = document.createElement('span'); el.className = 'hudPlus num'; el.textContent = '+' + fmt(Math.round(delta));
  box.append(el); setTimeout(() => el.remove(), 1100);
  floats[id] = { el, v: delta, t: now };
}
function hud() {
  const r = world.run;
  if (!r || (world.phase !== 'expedition' && world.phase !== 'tear')) { hudPrev.wallet = hudPrev.bag = null; return; }
  if (hudPrev.wallet !== null && save.coins - hudPrev.wallet >= 1) bump('walletBox', save.coins - hudPrev.wallet);
  if (hudPrev.bag !== null && r.bag - hudPrev.bag >= 1) bump('bagBox', r.bag - hudPrev.bag);
  if (hudPrev.wallet === null || save.coins - hudPrev.wallet >= 1) hudPrev.wallet = save.coins;
  if (hudPrev.bag === null || r.bag - hudPrev.bag >= 1 || r.bag < hudPrev.bag) hudPrev.bag = r.bag;
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
  ultHud(r);
  const boss = r.boss;
  $('bossBar').hidden = !(boss && ar && world.phase === 'expedition' && !boss.dead);
  if (boss && !boss.dead) { $('bossName').textContent = boss.def.name; $('bossFill').style.width = Math.max(0, boss.hp / boss.max * 100) + '%'; }
}

// Ultimes : un bouton par lignée qui en a un, avec sa jauge ; épreuve en cours affichée dessous.
let ultSig = '';
function ultHud(r) {
  const box = $('ultBar');
  const types = ALL_HEROES.filter(k => stats.ults && stats.ults[k]);
  const trials = Object.keys(save.trials || {}).filter(id => !L(id));
  box.hidden = world.phase !== 'expedition' || (!types.length && !trials.length);
  if (box.hidden) return;
  const sig = types.join() + '|' + trials.join();
  if (sig !== ultSig) {
    ultSig = sig; box.innerHTML = '';
    for (const k of types) {
      const b = document.createElement('button'); b.className = 'ult'; b.dataset.k = k; b.type = 'button';
      b.title = `${ULTS[k].name} (touche ${ULTS[k].label}) : vise le gant, sinon le groupe le plus dense`;
      const c = document.createElement('canvas'); c.width = c.height = 68; c.getContext('2d').drawImage(heroIcon(k), 0, 0);
      b.append(c, Object.assign(document.createElement('span'), { className: 'nm', textContent: ULTS[k].name }),
        Object.assign(document.createElement('span'), { className: 'key', textContent: ULTS[k].label }), Object.assign(document.createElement('i'), { className: 'fill' }));
      b.onpointerdown = e => { e.stopPropagation(); useUlt(world, k); };
      box.append(b);
    }
    for (const id of trials) box.append(Object.assign(document.createElement('div'), { className: 'trial', id: 'tr_' + id }));
  }
  for (const b of box.querySelectorAll('.ult')) {
    const k = b.dataset.k, v = r.ult ? r.ult[k] : 0;
    b.querySelector('.fill').style.height = (v * 100) + '%';
    b.classList.toggle('ready', ultReady(world, k));
  }
  for (const id of trials) {
    const el = $('tr_' + id); if (!el) continue;
    const tr = TRIALS[id], v = Math.min(tr.goal, Math.floor((r.cnt && r.cnt[tr.stat]) || 0));
    el.textContent = `Épreuve ${NODE[id].name} : ${v}/${tr.goal}`; el.classList.toggle('ok', v >= tr.goal);
  }
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
const ctx = () => ({ maxTier: save.maxTier || 0, bossWins: winsOf('clairiere'), L, reached: reached(), bosses: save.bosses || {}, zoneTier: save.zoneTier || {} });
// épreuves d'ultime : acceptée (meilleur score enregistré) mais pas encore réussie
const trialOn = n => n.type === 'ult' && !L(n.id) && save.trials && save.trials[n.id] !== undefined;
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
  if (key.startsWith('p_')) { const im = petSprite(key.slice(2)), k = Math.floor(64 / Math.max(im.width, im.height)); ig.drawImage(im, Math.round(46 - im.width * k / 2), Math.round(46 - im.height * k / 2), im.width * k, im.height * k); return c; }
  if (key.startsWith('g_')) { const gi = gearIconCanvas(key.slice(2)); if (gi) ig.drawImage(gi, 0, 0, 64, 64, 6, 6, 80, 80); return c; }
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

// Cartographe : choix du paysage à côté du bouton d'expédition (★ = paysage du jour)
function layoutUi() {
  let sel = $('layoutPick');
  if (!L('carto')) { if (sel) sel.remove(); return; }
  if (!sel) {
    sel = document.createElement('select'); sel.id = 'layoutPick'; sel.title = 'Paysage de la prochaine expédition';
    sel.onchange = () => { save.layoutPick = sel.value || null; writeSave(save); };
    document.querySelector('.footLeft').append(sel);
  }
  const day = L('daily') ? dailyLayout() : null;
  const opts = [['', 'Paysage au hasard'], ...LAYOUTS.map(k => [k, LAYOUT_NAMES[k].replace('Carte : ', '') + (k === day ? ' ★ +30 %' : '')])];
  const sig = opts.map(o => o[1]).join();
  if (sel.dataset.sig !== sig) { sel.dataset.sig = sig; sel.innerHTML = ''; for (const [v, t] of opts) sel.append(Object.assign(document.createElement('option'), { value: v, textContent: t })); }
  sel.value = save.layoutPick || '';
}
function renderTree() {
  layoutUi();
  $('atelierWallet').textContent = fmt(save.coins);
  const lb = $('lairBtn'), open = lairOpen();
  lb.disabled = !open;
  const z = curZone();
  $('zoneName').textContent = z.levelName;
  $('zoneBoss').textContent = (open ? '♛ ' : '🔒 ') + z.boss.lair;
  document.querySelector('#lairBtn').style.setProperty('--zc', z.boss.color || '#ff9a46');
  $('runsChip').textContent = `Expéditions : ${save.expeditions}`;
  lb.title = open ? `Affronter ${z.boss.name} directement` : z.demon && (save.lairs || {})[z.id] ? 'Achète « Seigneur des Enfers » dans l\'arbre pour ouvrir son antre' : `Remplis le sac jusqu'au palier « ${TIERS[ARENA.unlockTier].name} » ici pour ouvrir le portail`;
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
    const afford = !tz && !isMax && !locked && !capped && !trialOn(n) && save.coins >= costOf(n, lv);
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
      if (trialOn(n)) b.append(Object.assign(document.createElement('span'), { className: 'trialTag', textContent: `${Math.floor(save.trials[n.id])}/${TRIALS[n.id].goal}` }));
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
  if (n.type === 'ult' && !lv) {
    const tr = TRIALS[n.id];
    add('p', 'cond', 'Épreuve : ' + tr.text + '.');
    if (trialOn(n)) {
      add('p', '', `Meilleur essai : ${Math.floor(save.trials[n.id])} / ${tr.goal}. L'épreuve compte pendant tes expéditions.`);
    } else {
      const pr = document.createElement('div'); pr.className = 'price';
      pr.append(Object.assign(document.createElement('span'), { textContent: 'Gratuit' }), Object.assign(document.createElement('span'), { className: 'go', textContent: 'Clique pour accepter l\'épreuve' }));
      box.append(pr);
    }
    return;
  }
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
  if (n.type === 'ult') {
    if (trialOn(n) || lv) return;
    save.trials = save.trials || {}; save.trials[n.id] = 0;
    unlockAudio(); play('buy'); writeSave(save); renderTree();
    buyFx(n, 0, []);
    return;
  }
  const c = costOf(n, lv);
  if (save.coins < c) return;
  const hidden = new Set(NODES.filter(m => !visible(m)).map(m => m.id));
  save.coins -= c; save.level[n.id] = lv + 1;
  unlockAudio(); play('buy');
  writeSave(save);
  stats = calcStats();
  renderTree(); companyRefresh();
  buyFx(n, c, NODES.filter(m => hidden.has(m.id) && visible(m)));
  if (n.type === 'cls' || /Fork$/.test(n.id)) classChange(n);
}

// Écran « Changement de classe ! » : les exemplaires tournent en cercle puis fusionnent.
function classChange(n) {
  const line = { archer: 'archer', mage: 'mage', knight: 'knight', bard: 'bard' }[n.branch] || 'archer';
  const fork = /Fork$/.test(n.id);
  const ov = document.createElement('div'); ov.className = 'classOv';
  const ring = document.createElement('div'); ring.className = 'ring';
  for (let i = 0; i < 3; i++) {
    const c = document.createElement('canvas'); c.width = c.height = 68; c.className = 'mini';
    c.getContext('2d').drawImage(heroIcon(line), 0, 0); c.style.setProperty('--i', i); ring.append(c);
  }
  const big = document.createElement('canvas'); big.width = big.height = 68; big.className = 'big';
  big.getContext('2d').drawImage(heroIcon(line), 0, 0);
  const rk = fork ? 2 : n.id.length === 4 ? 3 : 2;
  const t = document.createElement('h2'); t.textContent = 'Changement de classe !';
  const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = (fork ? HEROES[line].plural + ' fusionnés' : n.name) + '  ' + '★'.repeat(rk);
  const d = document.createElement('p'); d.textContent = fork ? 'Les exemplaires fusionnent en un seul héros plus fort, qui garde toutes les améliorations. Choisis maintenant sa voie dans l\'arbre.' : n.desc;
  const ok = document.createElement('button'); ok.className = 'btn'; ok.textContent = 'Super !';
  ov.append(ring, big, t, nm, d, ok); $('app').append(ov);
  play('tier'); setTimeout(() => play('gold'), 1200);
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(); } };
  ok.onclick = close; addEventListener('keydown', key, true);
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
  if (cost > 0) {
    const d = document.createElement('span'); d.className = 'walletDelta num'; d.textContent = '−' + fmt(cost);
    w.append(d); setTimeout(() => d.remove(), 1200);
  }
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
  for (const k of ALL_HEROES) if (e.code === ULTS[k].key && world.phase === 'expedition') useUlt(world, k);
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (m && world.phase === 'expedition') {
    const type = ALL_HEROES.filter(k => stats.heroes[k] > 0)[+m[1] - 1];
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
  for (const a of world.zone.areaList || []) { mg.strokeStyle = 'rgba(255,240,200,.6)'; mg.lineWidth = 1; mg.setLineDash([2, 2]); mg.beginPath(); mg.ellipse(a.x * k, a.y * k, a.r * k, a.r / 1.4 * k, 0, 0, 7); mg.stroke(); mg.setLineDash([]); }
  const dot = (x, y, r, col) => { mg.fillStyle = col; mg.fillRect(Math.round(x * k - r / 2), Math.round(y * k - r / 2), r, r); };
  for (const c of world.coins) dot(c.x, c.y, 2, '#ffd34d');
  for (const e of world.enemies) if (!e.boss) dot(e.x, e.y, e.gold ? 4 : 3, e.gold ? '#ffe14a' : '#ff6b4a');
  // Longue-vue : feux follets dorés, créatures d'événement et butin rare mis en évidence
  if (stats.spyglass) {
    const pulse = 5 + 2 * Math.sin(performance.now() / 200);
    for (const e of world.enemies) if (e.gold || e.event) { mg.strokeStyle = e.event ? '#ff5a5a' : '#ffe14a'; mg.lineWidth = 1.5; mg.strokeRect(e.x * k - pulse / 2, e.y * k - pulse / 2, pulse, pulse); }
    for (const m of (world.run && world.run.mounds) || []) dot(m.x, m.y, 5, '#c9a06a');
  }
  // Carte annotée : coffres cachés (fermés) et créatures d'événement
  if (stats.fullMap) {
    for (const c of (world.run && world.run.chests) || []) if (!c.open) { dot(c.x, c.y, 6, '#24161e'); dot(c.x, c.y, 4, '#ffd246'); }
    for (const e of world.enemies) if (e.event) dot(e.x, e.y, 5, '#ff5a5a');
  }
  for (const h of (world.run && world.run.helpers) || []) dot(h.x, h.y, 3, h.kind === 'sprite' ? '#9bf06b' : h.kind === 'hound' ? '#ff7a3c' : '#e8eef8');
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
$('worldBtn').onclick = () => openWorld();
$('wmClose').onclick = () => { $('worldMap').hidden = true; };
$('lairBtn').onclick = goLair;
addEventListener('keydown', e => {
  if ($('atelier').hidden || !$('result').hidden || e.target.closest && e.target.closest('input,textarea')) return;
  if (e.code === 'KeyM') { e.preventDefault(); if ($('worldMap').hidden) openWorld(); else $('worldMap').hidden = true; }
  else if (e.code === 'Escape' && !$('worldMap').hidden) $('worldMap').hidden = true;
});
// Tab : grande mini-carte pendant l'expédition
addEventListener('keydown', e => { if (e.code === 'Tab' && playing() && world.mode === 'map') { e.preventDefault(); mm.classList.toggle('big'); } });
$('back').onclick = toAtelier;
$('again').onclick = () => go();
addEventListener('keydown', e => {
  if ($('result').hidden) return;
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); $('again').click(); }
});
let resetArmed = 0;
$('reset').onclick = () => {
  if (Date.now() - resetArmed < 3000) {
    save = freshSave(); seen.clear(); writeSave(save); selected = 'root'; stats = calcStats(); renderTree();
    $('reset').textContent = 'Recommencer à zéro';
  } else {
    resetArmed = Date.now(); $('reset').textContent = 'Clique encore pour tout effacer';
    setTimeout(() => { $('reset').textContent = 'Recommencer à zéro'; }, 3000);
  }
};

// Musique du moment : Atelier, expédition, ou boss dans son antre.
// musique d'expédition : propre à l'ambiance quand elle en a une (matin, minuit), sinon le thème commun
// les régions qui ont leur propre morceau (niveau normal et niveau II)
const REGION_TRACKS = { marais: 'marais' };
const stageTrack = () => REGION_TRACKS[((world.zone && world.zone.id) || '').replace(/2$/, '')] || ({ matin: 'matin', minuit: 'minuit' }[world.stage && world.stage.id] || 'expedition');
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
  const sp = window.__speed || 1;   // accéléré seulement par les tests automatisés
  acc += Math.max(0, Math.min(0.25 * sp, (now - last) / 1000 * sp)); last = now;
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

initCompany({ get save() { return save; }, write: () => writeSave(save), fmt, heroIcon, play, unlockAudio,
  onChange: () => { stats = calcStats(); renderTree(); } });
initCurio({ get save() { return save; }, write: () => writeSave(save), fmt, play, enemyIcon, gearCtx, goDungeon, open: () => randOpen(),
  onChange: () => { stats = calcStats(); renderTree(); },
  storeAndShow: items => { const f = storeItems(items.filter(Boolean)); writeSave(save); if (f.length) showLoot(f, () => { companyRefresh(); }); } });
applyVolumes(save);
initBugReport({ get save() { return save; }, world, fmt, version: VERSION });
$('bugBtn').addEventListener('click', e => copyReport(e.currentTarget));
initEpic({ get save() { return save; }, write: () => writeSave(save), fmt, enemyIcon, enemyFrameIcon, enemyFrameCount, stats: () => stats,
  exportSave: () => exportSave(save), importSave: txt => { const err = importSave(txt); if (!err) location.reload(); return err; },
  drawHeroIcon: (cg, k) => { cg.imageSmoothingEnabled = false; drawHero(cg, k, 34, 64, 1, 0, 1, HERO_SHEETS[k] ? 2 : 3); },
  onChange: () => { stats = calcStats(); renderTree(); } });
initPets({ get save() { return save; }, write: () => writeSave(save), play, onChange: () => { stats = calcStats(); } });
gearSheetReady.then(() => renderTree());

// Accès pour les tests automatisés
window.__game = { world, get save() { return save; }, go, goLair, goDungeon, toAtelier, lairOpen, travel, openWorld, region: i => { save.region = i; world.zone = curZone(); }, useUlt: k => useUlt(world, k),
  buyable: () => NODES.filter(n => visible(n) && !lockedNow(n) && L(n.id) < capOf(n)).map(n => ({ id: n.id, cost: costOf(n, L(n.id)) })),
  buy: id => buy(NODE[id]) };
