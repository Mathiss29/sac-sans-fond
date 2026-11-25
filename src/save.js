// Sauvegarde locale versionnée. On migre ici si le format change.
import { SAVE_KEY, SAVE_VERSION } from './data.js';

export function freshSave() {
  return { version: SAVE_VERSION, coins: 0, level: { root: 1 }, expeditions: 0, best: 0 };
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
  out.version = SAVE_VERSION;
  return out;
}

export function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
}
