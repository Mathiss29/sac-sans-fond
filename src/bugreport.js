// « Signaler un bug » : copie un petit rapport (version, appareil, fluidité, partie, dernières
// erreurs) à coller sur Discord. Rien n'est envoyé nulle part : tout reste dans le presse-papiers.
import { LEVELS } from './data.js';

const errors = [];
function keep(msg) { if (!msg) return; errors.push(new Date().toTimeString().slice(0, 8) + ' ' + String(msg).slice(0, 200)); if (errors.length > 5) errors.shift(); }
window.addEventListener('error', e => keep(e.message + (e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : '')));
window.addEventListener('unhandledrejection', e => keep('promesse : ' + (e.reason && e.reason.message || e.reason)));

// Images par seconde sur les 10 dernières secondes (moyenne et pire seconde).
const fpsLog = []; let n = 0, t0 = performance.now();
function tick(now) {
  n++;
  if (now - t0 >= 1000) { if (now > 3000) fpsLog.push(Math.round(n * 1000 / (now - t0))); if (fpsLog.length > 10) fpsLog.shift(); n = 0; t0 = now; }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

let C = null;
export function initBugReport(ctx) { C = ctx; }

export function bugReport() {
  const s = C.save, w = C.world, lv = LEVELS[s.region || 0];
  const avg = fpsLog.length ? Math.round(fpsLog.reduce((a, b) => a + b, 0) / fpsLog.length) : '?';
  const ua = navigator.userAgent.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const lines = [
    `**Sac sans Fond ${C.version}** · ${new Date().toLocaleString('fr-FR')}`,
    `Navigateur : ${ua}`,
    `Écran : ${innerWidth}×${innerHeight} (zoom ${devicePixelRatio})`,
    `Fluidité : ${avg} i/s en moyenne, pire seconde ${fpsLog.length ? Math.min(...fpsLog) : '?'} i/s`,
    `Partie : ${s.expeditions || 0} expéditions · région ${lv ? lv.name : '?'} · ${Object.keys(s.level || {}).length} compétences · ${C.fmt(s.coins || 0)} pièces`,
    `En cours : ${w.phase}${w.mode === 'arena' ? ' (antre)' : ''} · ${w.enemies.length} ennemis · ${w.coins.length} pièces · ${w.heroes.length} héros`,
    errors.length ? 'Erreurs :\n' + errors.map(e => '- ' + e).join('\n') : 'Erreurs : aucune',
    'Ce qui s\'est passé : ',
  ];
  return lines.join('\n');
}

// Bouton qui copie le rapport et l'indique sur lui-même.
export function copyReport(btn) {
  const txt = bugReport(), label = btn.textContent;
  const done = m => { btn.textContent = m; setTimeout(() => { btn.textContent = label; }, 2200); };
  try { navigator.clipboard.writeText(txt).then(() => done('Copié !'), () => { prompt('Copie ce rapport :', txt); }); }
  catch (e) { prompt('Copie ce rapport :', txt); }
}
