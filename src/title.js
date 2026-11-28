// Écran d'accueil : Jouer (reprend la sauvegarde), Réglages, Nouveautés, Crédits et site du studio.
// La carte de la Clairière défile doucement derrière le logo.
import { moveCam } from './game.js';

// Site du studio de Mathis.
export const STUDIO = { name: 'Ombrelune Studio', url: 'https://ombrelune-studio.github.io/?depuis=sac-sans-fond' };

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let C = null, panel = null, raf = 0, vx = 14, vy = 6;

export const titleOpen = () => !$('title').hidden;

// Écran de chargement : le sac se remplit à mesure que les planches, icônes et polices arrivent.
const LOAD_TXT = ['Le vieux mage remplit le sac…', 'On compte les pièces…', 'Les héros lacent leurs bottes…', 'Le crapaud ouvre sa boutique…', 'On réveille les boss (doucement)…'];
export function trackLoading(jobs) {
  const fill = $('ldFill'), full = $('ldFull'), txt = $('ldTxt'), t0 = performance.now();
  let done = 0, shown = 0.08, finished = false, lastDone = t0;
  const all = jobs.map(p => Promise.resolve(p).catch(() => {}).then(() => { done++; lastDone = performance.now(); }));
  const tick = () => {
    // entre deux étapes, la barre avance doucement vers la suivante sans jamais l'atteindre
    const creep = 0.85 * (1 - Math.exp(-(performance.now() - lastDone) / 2500));
    const target = finished ? 1 : Math.min(0.97, 0.08 + 0.92 * (done + creep) / jobs.length);
    shown += (target - shown) * (finished ? 0.25 : 0.08);
    fill.style.width = (shown * 100).toFixed(1) + '%'; full.style.setProperty('--p', (shown * 100).toFixed(1) + '%');
    txt.textContent = LOAD_TXT[Math.min(LOAD_TXT.length - 1, Math.floor(shown * LOAD_TXT.length))];
    if (finished && shown > 0.99) { $('loader').classList.add('done'); setTimeout(() => $('loader').remove(), 500); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // on n'attend jamais plus de 12 s : le jeu fonctionne avec ses dessins provisoires
  Promise.race([Promise.all(all), new Promise(ok => setTimeout(ok, 12000))])
    .then(() => new Promise(ok => setTimeout(ok, Math.max(0, 700 - (performance.now() - t0)))))
    .then(() => { finished = true; });
}
// musique d'accueil : son propre morceau s'il est là, sinon celle de l'Atelier
let hasTrack = false;
fetch('assets/music/accueil.mp3', { method: 'HEAD' }).then(r => { hasTrack = r.ok; }, () => {});
export const titleTrack = () => hasTrack ? 'accueil' : 'atelier';

// Astuces du vieux mage, tirées au hasard sous le logo
const TIPS = [
  'Un sac plein à ras bord rapporte plus : vise la Déchirure.',
  'Maintiens le clic pour concentrer le Focus sur un ennemi.',
  'Les feux follets dorés valent leur pesant d\'or. Littéralement.',
  'Un boss endormi se réveille de mauvaise humeur. Frappe fort et vite.',
  'La touche M ouvre la carte du monde.',
  'Chaque palier du sac multiplie tout ce que tu ramasses.',
  'Une besace bien remplie, c\'est une Compagnie bien équipée.',
  'Les cartes de créature se trouvent sur ceux qu\'on bat. Collectionne-les.',
  'Le vieux crapaud de la boutique ne fait jamais crédit.',
  'Tab agrandit la mini-carte pendant l\'expédition.',
  'Un familier ancien vaut mieux que trois œufs.',
  'Ce sac n\'a pas de fond. Mais il a un appétit.',
  'Les élites portent une couronne : elles lâchent mieux.',
  'Rien ne se perd dans le sac. Presque rien.',
];
let tipTimer = 0, tipIdx = -1;
function nextTip() {
  const el = $('tTip');
  let i; do i = Math.floor(Math.random() * TIPS.length); while (i === tipIdx && TIPS.length > 1);
  tipIdx = i;
  el.classList.add('out');
  setTimeout(() => { el.textContent = '« ' + TIPS[i] + ' »'; el.classList.remove('out'); }, 350);
}

export function initTitle(ctx) {
  C = ctx;
  const s = C.save, played = s.expeditions > 0;
  $('tPlay').textContent = played ? 'Continuer' : 'Jouer';
  $('tPlaySub').textContent = played ? `${s.expeditions} expédition${s.expeditions > 1 ? 's' : ''} · ${C.fmt(s.coins)} pièces` : 'Nouvelle partie';
  $('tVersion').textContent = `version ${C.version}`;
  const st = $('tStudio');
  if (STUDIO.url) { st.href = STUDIO.url; st.querySelector('b').textContent = STUDIO.name || 'Notre studio'; }
  else { st.removeAttribute('href'); st.classList.add('soon'); st.title = 'Bientôt'; st.querySelector('b').textContent = STUDIO.name || 'Site du studio'; }
  $('tPlay').parentElement.onclick = play;
  $('tSettings').onclick = () => openPanel('Réglages', settings);
  $('tNews').onclick = () => openPanel('Nouveautés', renderNews);
  $('tCredits').onclick = () => openPanel('Crédits', renderCredits);
  $('tClose').onclick = closePanel;
  addEventListener('keydown', e => {
    if (!titleOpen() || (e.target.closest && e.target.closest('input,textarea'))) return;
    if (e.key === 'Escape' && panel) { e.preventDefault(); closePanel(); }
    else if (e.key === 'Enter' && !panel && document.activeElement === document.body) { e.preventDefault(); play(); }
  });
  // bouton pour revenir à l'accueil depuis l'Atelier
  const back = h('button', 'ghost', '⌂ Menu'); back.type = 'button'; back.id = 'menuBtn'; back.title = 'Écran d\'accueil';
  back.onclick = show;
  document.querySelector('#atelier .topRight').prepend(back);
  show();
}

export function show() {
  $('title').hidden = false; $('atelier').hidden = true;
  closePanel();
  const w = C.world; w.cam.x = Math.max(0, (w.mapW - w.w) * 0.3); w.cam.y = Math.max(0, (w.mapH - w.h) * 0.35);
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  nextTip(); clearInterval(tipTimer); tipTimer = setInterval(nextTip, 9000);
}

function play() {
  C.click();
  $('title').hidden = true; $('atelier').hidden = false;
  cancelAnimationFrame(raf); clearInterval(tipTimer);
}

let last = 0;
function loop(now) {
  if (!titleOpen()) return;
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  // la caméra glisse et rebondit sur les bords de la carte
  const w = C.world, ox = w.cam.x, oy = w.cam.y;
  moveCam(w, vx * dt, vy * dt);
  if (w.cam.x === ox && vx * dt !== 0) vx = -vx;
  if (w.cam.y === oy && vy * dt !== 0) vy = -vy;
  raf = requestAnimationFrame(loop);
}

function openPanel(title, fill) {
  C.click();
  $('tPanelTitle').textContent = title;
  const body = $('tPanelBody'); body.textContent = '';
  fill(body);
  $('tPanel').hidden = false; panel = title;
  $('tClose').focus();
}
function closePanel() { $('tPanel').hidden = true; panel = null; }

// mêmes options que l'onglet Épopée, sans le journal (il a son propre bouton)
function settings(body) {
  C.renderOptions(body);
  body.querySelectorAll('.epJournal').forEach(e => e.remove());
  [...body.querySelectorAll('h3')].filter(e => e.textContent === 'Journal').forEach(e => e.remove());
}

function renderNews(body) {
  for (const [v, title, lines] of C.journal) {
    const d = h('div', 'epJournal'); d.append(h('b', '', `${v} · ${title}`));
    const ul = h('ul'); for (const l of lines) ul.append(h('li', '', l)); d.append(ul); body.append(d);
  }
}

function renderCredits(body) {
  const rows = [
    ['Création', 'Mathis' + (STUDIO.name ? ` · ${STUDIO.name}` : '')],
    ['Musique', 'Mathis, composée avec Suno'],
    ['Personnages et monstres', 'Mathis, pixel art retouché à la main'],
    ['Développement', 'Mathis, avec l\'aide de Claude'],
    ['Polices', 'Pixelify Sans et Silkscreen (licence SIL OFL)'],
  ];
  const dl = h('dl', 'tCredits');
  for (const [k, v] of rows) dl.append(h('dt', '', k), h('dd', '', v));
  body.append(dl, h('p', 'cuHint', 'Merci d\'avoir ouvert le sac. Il n\'a pas de fond, mais il a un cœur.'));
}
