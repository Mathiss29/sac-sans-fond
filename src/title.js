// Écran d'accueil : Jouer (reprend la sauvegarde), Réglages, Nouveautés, Crédits et site du studio.
// La carte de la Clairière défile doucement derrière, le sac respire au-dessus du titre.
import { drawBag } from './render.js';
import { moveCam } from './game.js';

// Site du studio de Mathis.
export const STUDIO = { name: 'Ombrelune Studio', url: 'https://ombrelune-studio.github.io/?depuis=sac-sans-fond' };

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let C = null, panel = null, raf = 0, t0 = 0, vx = 14, vy = 6;

export const titleOpen = () => !$('title').hidden;

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
  t0 = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}

function play() {
  C.click();
  $('title').hidden = true; $('atelier').hidden = false;
  cancelAnimationFrame(raf);
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
  drawLogoBag(Math.max(0, (now - t0) / 1000));
  raf = requestAnimationFrame(loop);
}

// sac du logo : il se remplit doucement, monte d'un palier et recommence
const coins = [];
function drawLogoBag(t) {
  const cv = $('tBag'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  const maxT = Math.min(3, C.save.maxTier || 0), cyc = t % 9, tier = Math.min(maxT, Math.floor(t / 9) % (maxT + 1));
  const fill = Math.min(1, cyc / 8);
  if (Math.random() < 0.12) coins.push({ x: W / 2 + (Math.random() - 0.5) * 120, y: -10, v: 60 + Math.random() * 60 });
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i]; c.v += 500 * 0.016; c.y += c.v * 0.016; c.x += (W / 2 - c.x) * 0.04;
    if (c.y > H - 70) { coins.splice(i, 1); continue; }
    g.fillStyle = '#7a4a12'; g.fillRect(Math.round(c.x) - 4, Math.round(c.y) - 4, 8, 8);
    g.fillStyle = '#ffcf4a'; g.fillRect(Math.round(c.x) - 3, Math.round(c.y) - 3, 6, 6);
    g.fillStyle = '#fff2b0'; g.fillRect(Math.round(c.x) - 2, Math.round(c.y) - 2, 2, 2);
  }
  drawBag(g, W / 2, H - 14, tier, fill, t, 0, 5);
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
