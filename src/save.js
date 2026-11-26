// Sauvegarde locale versionnée. On migre ici si le format change.
import { SAVE_KEY, SAVE_VERSION } from './data.js';

export function freshSave() {
  return { version: SAVE_VERSION, coins: 0, level: { root: 1 }, expeditions: 0, best: 0, maxTier: 0 };
}

export function loadSave() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
  if (!raw || typeof raw !== 'object') return freshSave();
  return migrate(raw);
}

function migrate(s) {
  const out = Object.assign(freshSave(), s);
  out.level = Object.assign({ root: 1 }, s.level || {});
  if (!out.zoneTier) out.zoneTier = { clairiere: out.maxTier || 0 };
  // valeurs abîmées (sauvegarde modifiée à la main, bug ancien) : on répare plutôt que de planter
  for (const k of ['coins', 'expeditions', 'best', 'maxTier']) if (!Number.isFinite(out[k]) || out[k] < 0) out[k] = 0;
  for (const [k, v] of Object.entries(out.level)) if (!Number.isFinite(v) || v < 0) delete out.level[k];
  out.level.root = 1;
  if (out.bosses && typeof out.bosses !== 'object') out.bosses = {};
  if (!Number.isInteger(out.region) || out.region < 0) out.region = 0;
  if ((s.version || 1) < 2) toBigTree(out);
  out.version = SAVE_VERSION;
  return out;
}

export function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
}

// Version 2 : le grand arbre. On garde tout ce qui est acheté ;
// les anciens nœuds « nombre de héros » deviennent les nœuds ×2 / ×3.
function toBigTree(out) {
  const lv = out.level, n = k => lv[k] || 0;
  const a = n('archers'), m = n('mage'), k = n('knight'), b = n('bard');
  delete lv.archers;
  if (a >= 1) lv.archers2 = 1;
  if (a >= 3) lv.archers3 = 1;
  if (m >= 2) lv.mage2 = 1;
  if (m >= 3) lv.mage3 = 1;
  if (m) lv.mage = 1;
  if (k >= 2) lv.knight2 = 1;
  if (k >= 3) lv.knight3 = 1;
  if (k) lv.knight = 1;
  if (b >= 2) lv.bard2 = 1;
  if (b) lv.bard = 1;
  // palier le plus haut déjà atteint : on le devine (portail de l'antre ouvert = palier Soie)
  out.maxTier = Math.max(out.maxTier || 0, out.lairOpen ? 2 : n('tierCuir') && out.expeditions ? 1 : 0);
}

// Export / import en texte : JSON encodé en base 64, préfixé pour reconnaître une sauvegarde.
const PREFIX = 'SSF1:';
export function exportSave(save) {
  const json = JSON.stringify(save);
  return PREFIX + btoa(unescape(encodeURIComponent(json)));
}
// Renvoie un message d'erreur, ou '' si la sauvegarde est chargée (dans le stockage du navigateur).
export function importSave(txt) {
  let raw = null;
  try {
    const body = txt.startsWith(PREFIX) ? txt.slice(PREFIX.length) : txt;
    raw = JSON.parse(body.trim().startsWith('{') ? body : decodeURIComponent(escape(atob(body.trim()))));
  } catch (e) { return 'Ce texte n\'est pas une sauvegarde valide.'; }
  if (!raw || typeof raw !== 'object' || typeof raw.level !== 'object' || typeof raw.coins !== 'number') return 'Ce texte n\'est pas une sauvegarde de Sac sans Fond.';
  if ((raw.version || 1) > SAVE_VERSION) return 'Cette sauvegarde vient d\'une version plus récente du jeu.';
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(migrate(raw))); } catch (e) { return 'Impossible d\'écrire la sauvegarde (stockage plein ou bloqué).'; }
  return '';
}
