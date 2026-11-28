// Onglet « Épopée » de l'Atelier : ton épopée (chiffres de la partie), bestiaire et garde-robe.
import { ENEMIES, ZONES, LEVELS, HEROES, ALL_HEROES, COSTUMES, TIERS, MASTERY, CLASS_ULTS, CLASS_ULT_GOAL } from './data.js';
import { SPR } from './sprites.js';
import { setFxIntense } from './render.js';
import { NODES } from './tree.js';
import { showView } from './company.js';
import { setVolumes } from './audio.js';
import { copyReport } from './bugreport.js';
export const VERSION = '1.0.4';
// Journal des versions, du plus récent au plus ancien.
export const JOURNAL = [
  ['1.0.4', 'Le chemin de l\'antre', ['La condition pour ouvrir l\'antre du boss est écrite sur la case de la région, avec ton record de palier', 'Le portail scellé dit quoi faire et montre une jauge', 'Le portail s\'ouvre dès que le sac atteint la soie, sans attendre l\'expédition suivante', 'Le vieux mage explique l\'antre à la première ouverture', 'Portails ouverts ou scellés sur la carte du monde', 'Nouvelle quête : ouvrir le portail d\'une région', 'Deux nouvelles astuces sur l\'accueil']],
  ['1.0.3', 'L\'accueil', ['Écran d\'accueil avec le logo animé et sa musique « Magical Coin Path » : Jouer ou Continuer, Réglages, Nouveautés, Crédits', 'Astuces du vieux mage et icône d\'onglet', 'Lien vers le site d\'Ombrelune Studio', 'Bouton « ⌂ Menu » dans l\'Atelier pour revenir à l\'accueil']],
  ['1.0.2', 'Les classes', ['Les 24 classes ont leur sprite, et la fiche de l\'arbre montre les deux classes du choix en animation', 'Effets d\'attaque propres à chaque classe et à chaque voie des nouveaux héros', 'Pose de victoire de l\'équipe sur l\'écran de fin d\'expédition', 'Un petit air par lignée quand tu prends une classe', 'Option « Effets intenses »']],
  ['1.0.1', 'Corrections', ['Les pièces ne tournent plus autour du sac sans y entrer', 'Filons fluides même en fin de partie, avec une jauge de l\'or restant', 'Bouton « 🐞 Bug » : copie un rapport à coller sur Discord']],
  ['1.0', 'Le grand voyage', ['10 régions et 20 niveaux sur une carte du monde (touche M), chacune avec son boss et sa mécanique', 'Ultimes à épreuve (E, R, T, Y) et changements de classe à deux rangs', '5 nouveaux héros : voleur, druide, ingénieur, alchimiste, invocateur', 'Lutin, pie et chien des Enfers ; 7 nouveaux événements', 'Curiosités : cartes de créature, boutique du vieux crapaud, quêtes, donjons', 'Épopée : bilan de la partie, bestiaire, garde-robe, options', 'Sauvegarde exportable, volumes séparés, flèches vers le portail, grande mini-carte (Tab)']],
  ['0.9', 'La forge', ['Compagnie, équipement en 5 raretés, ensembles, forge, album']],
  ['0.8', 'Le rendu', ['Nouveau rendu fidèle, grand arbre en croix, musiques']],
];

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let C = null, tab = null, sub = 'epic';
const L = id => (C.save.level[id] || 0);

// Fin d'expédition : on cumule les chiffres de la partie et le bestiaire.
export function recordRun(save, r, gained) {
  const st = save.epic || (save.epic = { coins: 0, kills: 0, time: 0, events: 0, bestTier: 0 });
  st.coins += gained; st.kills += r.kills || 0; st.time += r.t || 0; st.events += r.eventsGot || 0; st.bestTier = Math.max(st.bestTier, r.tier || 0);
  const b = save.bestiary || (save.bestiary = {});
  for (const [k, n] of Object.entries(r.killsBy || {})) b[k] = (b[k] || 0) + n;
}
export const costumesWon = save => COSTUMES.filter(c => Object.values(save.bosses || {}).filter(v => v > 0).length >= c.need);
export function heroTints(save) {
  if (!(save.level.looks > 0)) return {};
  const out = {};
  for (const [k, id] of Object.entries(save.looks || {})) { const c = COSTUMES.find(x => x.id === id); if (c && c.tint) out[k] = c.tint; }
  return out;
}

export function initEpic(ctx) {
  C = ctx;
  const tabs = document.querySelector('#atelier .tabs');
  tab = h('button', 'tab', 'Épopée'); tab.type = 'button'; tab.id = 'tabEpic'; tab.dataset.view = 'epic';
  tabs.append(tab);
  tab.onclick = () => { showView('epic'); render(); };
}
export function epicRefresh() { if (C && !$('epic').hidden) render(); }

const fmtTime = s => { s = Math.floor(s); const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60; return hh ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`; };

function render() {
  const box = $('epic'); box.innerHTML = '';
  const nav = h('nav', 'epNav');
  for (const [id, label] of [['epic', 'Ton épopée'], ['beasts', 'Bestiaire'], ['classes', 'Classes'], ['looks', 'Garde-robe'], ['opts', 'Options et journal']]) {
    const b = h('button', 'cSubTab' + (sub === id ? ' on' : ''), label); b.type = 'button';
    b.onclick = () => { sub = id; render(); };
    nav.append(b);
  }
  box.append(nav);
  const body = h('div', 'epBody'); box.append(body);
  if (sub === 'epic') renderEpic(body); else if (sub === 'beasts') renderBeasts(body); else if (sub === 'classes') renderClasses(body); else if (sub === 'opts') renderOpts(body); else renderLooks(body);
}

function renderEpic(body) {
  const s = C.save, st = s.epic || {}, bosses = s.bosses || {};
  const won = LEVELS.filter(l => bosses[l.id] > 0).length;
  const bought = NODES.filter(n => !n.soon && (s.level[n.id] || 0) > 0).length, live = NODES.filter(n => !n.soon).length;
  const heroes = ALL_HEROES.filter(k => C.stats().heroes[k] > 0).length;
  const cards = s.curio ? Object.keys(s.curio.cards).length : 0;
  const items = s.gear ? Object.keys(s.gear.found || {}).length : 0;
  const tiles = [
    ['Expéditions', C.fmt(s.expeditions)], ['Temps de jeu', fmtTime(st.time || 0)], ['Pièces gagnées', C.fmt(st.coins || 0)],
    ['Record d\'une expédition', C.fmt(s.best || 0)], ['Ennemis vaincus', C.fmt(st.kills || 0)], ['Événements réussis', C.fmt(st.events || 0)],
    ['Boss de niveau vaincus', `${won} / ${LEVELS.length}`], ['Meilleur sac', TIERS[Math.min(TIERS.length - 1, s.maxTier || 0)].name], ['Compétences', `${bought} / ${live}`],
    ['Héros dans la compagnie', `${heroes} / ${ALL_HEROES.length}`], ['Cartes', String(cards)], ['Objets découverts', String(items)],
  ];
  const grid = h('div', 'epTiles');
  for (const [a, v] of tiles) { const d = h('div', 'epTile'); d.append(h('span', 'epV', v), h('span', 'epK', a)); grid.append(d); }
  body.append(grid);
  // frise des régions
  const fr = h('div', 'epRegions');
  for (const z of ZONES) {
    const a = bosses[z.id] > 0, b = bosses[z.id + '2'] > 0;
    const d = h('div', 'epReg' + (a ? ' a' : '') + (b ? ' b' : ''));
    d.style.setProperty('--g', z.ground[0]); d.style.setProperty('--bc', z.boss.color || '#ff9a46');
    d.append(h('b', '', z.name), h('span', '', (a ? '♛' : '·') + ' ' + (b ? '♛' : '·')));
    const ms = MASTERY[z.id], on = L('mastery') > 0;
    if (ms && on) d.append(h('i', 'epMast' + (b ? ' ok' : ''), (b ? '★ ' : '☆ ') + ms[2]));
    d.title = `${z.boss.name} : ${a ? 'vaincu' : 'pas encore'} · niveau II : ${b ? 'vaincu' : 'pas encore'}` + (ms && on ? ` · maîtrise : ${ms[2]}${b ? ' (acquise)' : ''}` : '');
    fr.append(d);
  }
  body.append(h('h3', '', 'Régions'), fr);
}

// bestiaire animé : les créatures déjà vues bougent (6 images par seconde)
let anim = [], animTimer = null;
function animate() {
  if (!anim.length || $('epic').hidden || sub !== 'beasts' || !anim[0].cv.isConnected) { animTimer = null; return; }
  const f = Math.floor(performance.now() / 160);
  for (const a of anim) { const x = a.cv.getContext('2d'), z = a.size || 44; x.clearRect(0, 0, z, z); x.drawImage(C.enemyFrameIcon(a.k, a.seq ? a.seq[f % a.seq.length] : f % a.n, z), 0, 0); }
  animTimer = setTimeout(animate, 160);
}
function renderBeasts(body) {
  anim = [];
  if (!animTimer) animTimer = setTimeout(animate, 160);
  const b = C.save.bestiary || {};
  const ids = Object.keys(ENEMIES).filter(k => k !== 'boss');
  const seen = ids.filter(k => b[k] > 0).length;
  body.append(h('p', 'cuHint', `${seen} / ${ids.length} créatures rencontrées. Survole une fiche pour la lire.`));
  const grid = h('div', 'epBeasts');
  const ROLE = { weak: 'Faible, en nombre', fast: 'Rapide, esquive', tough: 'Costaud, lent' };
  for (const k of ids) {
    const n = b[k] || 0, def = ENEMIES[k];
    const d = h('div', 'epBeast' + (n ? '' : ' unknown'));
    const cv = h('canvas'); cv.width = cv.height = 44; cv.getContext('2d').drawImage(C.enemyFrameIcon(k, 0), 0, 0);
    if (n) anim.push({ cv, k, n: C.enemyFrameCount(k) });
    d.append(cv, h('b', '', n ? def.name : '???'), h('span', '', n ? `${C.fmt(n)} vaincus` : 'jamais vu'));
    if (n) {
      const zone = ZONES.find(z => z.spawn && z.spawn[k]);
      d.title = `${def.name} · ${def.role ? ROLE[def.role] : def.king ? 'Se divise en mourant' : def.puffer ? 'Gonfle avec le temps' : def.healer ? 'Soigne ses voisins' : def.bandit ? 'Vole tes pièces' : def.mvp ? 'Rare, file très vite' : 'Créature d\'événement'}${zone ? ' · ' + zone.name : ''}`;
    }
    grid.append(d);
  }
  body.append(grid);
  const bossGrid = h('div', 'epBosses');
  for (const z of ZONES) {
    const n = (b['boss:' + z.id] || 0) + (b['boss:' + z.id + '2'] || 0);
    const d = h('div', 'epBeast boss' + (n ? '' : ' unknown'));
    d.style.setProperty('--bc', z.boss.color || '#ff9a46');
    // portrait : en boucle (repos puis attaque) une fois vaincu, silhouette endormie avant
    const look = z.boss.look || 'boss', cv = h('canvas'); cv.width = cv.height = 104;
    if (C.enemyFrameCount(look) >= 8) {
      const x = cv.getContext('2d'); x.drawImage(C.enemyFrameIcon(look, n || C.enemyFrameCount(look) < 12 ? 0 : 10, 104), 0, 0);
      if (n) anim.push({ cv, k: look, size: 104, seq: [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 6, 7] });
      else { x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(20,14,24,.85)'; x.fillRect(0, 0, 104, 104); }
      d.append(cv);
    }
    d.append(h('b', '', n ? z.boss.name : '???'), h('span', '', n ? `${n} fois · ${z.boss.lair}` : z.name));
    bossGrid.append(d);
  }
  body.append(h('h3', '', 'Boss'), bossGrid);
}

// Codex des classes : chaque classe de l'arbre, animée une fois choisie, en silhouette sinon.
let clsAnim = [], clsTimer = null;
const sheetFor = id => { const S = SPR.sheets || {}, ok = k => S[k] && S[k].img.idle && S[k].img.idle.naturalWidth; return ok(id) ? S[id] : ok(id.slice(0, 3)) ? S[id.slice(0, 3)] : null; };
function drawCls(cv, sh, f, dark) {
  const x = cv.getContext('2d'), [cw, ch] = sh.cell, sc = 2;
  x.clearRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
  x.drawImage(sh.img.idle, (f % sh.anims.idle) * cw, 0, cw, ch, (cv.width - cw * sc) / 2, cv.height - ch * sc, cw * sc, ch * sc);
  if (dark) { x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(20,14,24,.9)'; x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-over'; }
}
function animateCls() {
  if (!clsAnim.length || $('epic').hidden || sub !== 'classes' || !clsAnim[0].cv.isConnected) { clsTimer = null; return; }
  const f = Math.floor(performance.now() / 160);
  for (const a of clsAnim) drawCls(a.cv, a.sh, f, false);
  clsTimer = setTimeout(animateCls, 160);
}
function renderClasses(body) {
  clsAnim = [];
  if (!clsTimer) clsTimer = setTimeout(animateCls, 160);
  const all = NODES.filter(n => n.type === 'cls');
  const got = all.filter(n => L(n.id) > 0).length;
  body.append(h('p', 'cuHint', `${got} / ${all.length} classes choisies. Une voie de rang 2 débloque un ultime de classe après ${CLASS_ULT_GOAL} lancers de l'ultime de sa lignée.`));
  const lines = ALL_HEROES.filter(k => all.some(n => n.branch === k));
  const cnt = C.save.clsUlt || {};
  for (const ln of lines) {
    const grid = h('div', 'epClasses');
    for (const n of all.filter(m => m.branch === ln)) {
      const on = L(n.id) > 0, sh = sheetFor(n.id) || sheetFor(ln), d = h('div', 'epCls' + (on ? ' on' : ''));
      const cv = h('canvas'); cv.width = 96; cv.height = 100;
      if (sh) { drawCls(cv, sh, 0, !on); if (on) clsAnim.push({ cv, sh }); } else cv.className = 'noArt';
      d.append(cv, h('b', '', n.name), h('span', '', (n.badge || '') + (on ? ' · choisie' : '')));
      const cu = CLASS_ULTS[n.id];
      if (cu) d.append(h('i', 'epClsUlt' + ((cnt[n.id] || 0) >= CLASS_ULT_GOAL ? ' ok' : ''), `${cu[0]} : ${Math.min(CLASS_ULT_GOAL, cnt[n.id] || 0)}/${CLASS_ULT_GOAL}`));
      d.title = n.desc + (cu ? ` · Ultime de classe : ${cu[1]}` : '');
      grid.append(d);
    }
    body.append(h('h3', '', HEROES[ln] ? HEROES[ln].plural : ln), grid);
  }
}

function renderLooks(body) {
  if (!L('looks')) { body.append(h('p', 'cuHint', 'Achète « Garde-robe » dans l\'arbre (Équipement) pour changer la tenue de tes héros.')); return; }
  const s = C.save, won = costumesWon(s).map(c => c.id);
  s.looks = s.looks || {};
  body.append(h('p', 'cuHint', 'Chaque boss de niveau vaincu peut débloquer une tenue. Clique pour habiller une lignée.'));
  for (const k of ALL_HEROES.filter(t => C.stats().heroes[t] > 0)) {
    const row = h('div', 'epLookRow');
    const cv = h('canvas'); cv.width = cv.height = 68; C.drawHeroIcon(cv.getContext('2d'), k);
    row.append(cv, h('b', '', HEROES[k].plural));
    const opts = h('div', 'epLookOpts');
    for (const c of COSTUMES) {
      const ok = won.includes(c.id), cur = (s.looks[k] || 'base') === c.id;
      const b = h('button', 'epLook' + (cur ? ' on' : ''), ok ? c.name : `🔒 ${c.need}`); b.type = 'button';
      b.style.setProperty('--t', c.tint || '#c4c8b2'); b.disabled = !ok;
      b.title = ok ? c.name : `Bats ${c.need} boss de niveau`;
      b.onclick = () => { s.looks[k] = c.id; C.write(); C.onChange(); render(); };
      opts.append(b);
    }
    row.append(opts); body.append(row);
  }
}

export function applyVolumes(save) { const v = save.vol || { sfx: 1, music: 1 }; setVolumes(v.sfx, v.music); }
function renderOpts(body) {
  const s = C.save; s.vol = s.vol || { sfx: 1, music: 1 };
  body.append(h('h3', '', `Sac sans Fond · version ${VERSION}`));
  for (const [k, label] of [['music', 'Musique'], ['sfx', 'Bruitages']]) {
    const row = h('label', 'epVol'); const r = h('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(s.vol[k] * 100);
    const out = h('span', 'num', r.value + ' %');
    r.oninput = () => { s.vol[k] = r.value / 100; out.textContent = r.value + ' %'; applyVolumes(s); };
    r.onchange = () => C.write();
    row.append(h('span', '', label), r, out); body.append(row);
  }
  { const row = h('label', 'epVol epFx'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!s.fxIntense;
    cb.onchange = () => { s.fxIntense = cb.checked; setFxIntense(cb.checked); C.write(); };
    row.append(h('span', '', 'Effets intenses'), cb, h('span', 'cuHint', 'ondes, coups et éclairs plus grands')); body.append(row); }
  body.append(h('h3', '', 'Sauvegarde'));
  body.append(h('p', 'cuHint', 'Copie ce texte pour garder ta partie ou la reprendre sur un autre appareil. Colle un texte de sauvegarde puis « Importer » pour la charger.'));
  const ta = h('textarea', 'epSave'); ta.rows = 4; ta.spellcheck = false;
  const btns = h('div', 'epBtns');
  const ex = h('button', 'btn small', 'Exporter'); ex.type = 'button';
  ex.onclick = () => { ta.value = C.exportSave(); ta.select(); const ok = () => { ex.textContent = 'Copié !'; }, ko = () => { ex.textContent = 'Sélectionné : copie-le'; }; try { navigator.clipboard.writeText(ta.value).then(ok, ko); } catch (e) { ko(); } };
  const im = h('button', 'btn small second', 'Importer'); im.type = 'button';
  const msg = h('span', 'cuHint', '');
  im.onclick = () => { const err = C.importSave(ta.value.trim()); if (err) msg.textContent = err; };
  btns.append(ex, im, msg); body.append(ta, btns);
  body.append(h('h3', '', 'Signaler un bug'));
  body.append(h('p', 'cuHint', 'Copie un petit rapport (version, appareil, fluidité, partie en cours, dernières erreurs) à coller sur Discord avec ce qui s\'est passé. Rien n\'est envoyé tout seul.'));
  const bug = h('button', 'btn small', '🐞 Copier le rapport'); bug.type = 'button'; bug.onclick = () => copyReport(bug);
  const bb = h('div', 'epBtns'); bb.append(bug); body.append(bb);
  body.append(h('h3', '', 'Journal'));
  for (const [v, title, lines] of JOURNAL) {
    const d = h('div', 'epJournal'); d.append(h('b', '', `${v} · ${title}`));
    const ul = h('ul'); for (const l of lines) ul.append(h('li', '', l)); d.append(ul); body.append(d);
  }
}

// Réglages réutilisés par l'écran d'accueil (mêmes options que l'onglet Épopée).
export function renderOptions(body) { renderOpts(body); }
