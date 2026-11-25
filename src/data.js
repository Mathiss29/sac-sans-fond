// Toutes les données d'équilibrage du jeu. On ajuste ici sans toucher au moteur.

export const SAVE_KEY = 'sac-sans-fond/v1';
export const SAVE_VERSION = 1;

// Paliers du sac : chaque palier double la capacité totale (voir bagMax).
export const TIERS = [
  { id: 'toile', name: 'Sac de toile', color: '#d8c49a', seam: '#8f7a52', glow: '#fff2c8', mult: 1 },
  { id: 'cuir', name: 'Sac de cuir', color: '#9a6238', seam: '#5a3418', glow: '#ffbf7a', mult: 1.6 },
  { id: 'soie', name: 'Sac de soie enchantée', color: '#8e62d6', seam: '#4b2a86', glow: '#e0c8ff', mult: 2.5 },
  { id: 'celeste', name: 'Sac d\'étoffe céleste', color: '#5fd6f0', seam: '#1d6f8a', glow: '#d8fbff', mult: 4 },
];
export const FULL_BONUS = 1.25;

export const ZONES = [
  {
    id: 'clairiere', name: 'Clairière',
    ground: ['#6fa65a', '#4f8a45'], patch: '#86bb68', flower: ['#f6e27a', '#f29bb8', '#ffffff'],
    rock: '#8c8f86', tree: '#2f6b3c', path: '#c9a06a', water: '#3f8fc8',
    hpMult: 1, valueMult: 1,
    spawn: { wisp: 5, golem: 2, wind: 3 },
  },
];

// Familles d'élémentaires
export const ENEMIES = {
  wisp: { name: 'Feu follet', hp: 4, value: 2, radius: 10, speed: 62, color: '#ffb347', core: '#fff1c2' },
  golem: { name: 'Golem d\'argile', hp: 16, value: 6, radius: 18, speed: 20, color: '#b7774a', core: '#7a4a2a' },
  wind: { name: 'Esprit du vent', hp: 6, value: 3, radius: 13, speed: 44, color: '#d6f2ff', core: '#8fc7e6', dodge: 0.3 },
};

export const HEROES = {
  archer: { name: 'Archer', range: 200, damage: 3, cooldown: 0.9, arrowSpeed: 560, walkSpeed: 24 },
};

// Taille d'une région, en pixels d'écran (environ 3 × 3 écrans d'ordinateur).
export const MAP = { w: 2700, h: 1800 };

export const BASE = {
  duration: 30,          // s
  spawnEvery: 0.45,      // s entre deux apparitions
  maxEnemies: 55,
  archers: 3,
  bagCapacity: 120,      // pièces pour le premier palier
  gloveRadius: 46,       // px
  attraction: 1.5,       // s d'Attraction (rayon ×2)
  attractionRegen: 0.35, // s récupérées par seconde
  coinLife: 8,           // s avant qu'une pièce au sol disparaisse
  bagMouth: 60,          // px, rayon d'aspiration du sac
  tearDuration: 5,       // s pour ramasser pendant la Déchirure
  tearMaxCoins: 260,
};

// Atelier du mage, étape 1 : 8 nœuds. x, y en cases de la grille.
// cost(l) = cost × growth^l
export const NODES = [
  { id: 'root', name: 'Le Sac du mage', branch: 'Départ', x: 3, y: 2, max: 1, cost: 0, growth: 1,
    desc: 'Le vieux mage te confie son sac. Tout part d\'ici.', effect: () => 'Débloqué' },
  { id: 'arrowDmg', parent: 'root', name: 'Flèches aiguisées', branch: 'Compagnie', x: 3, y: 1, max: 8, cost: 8, growth: 1.7,
    desc: 'Les flèches des archers font plus mal.', effect: l => `Dégâts ×${fmtNum(1 + 0.5 * l)}` },
  { id: 'arrowRate', parent: 'arrowDmg', name: 'Carquois rapide', branch: 'Compagnie', x: 2, y: 1, max: 6, cost: 20, growth: 1.8,
    desc: 'Les archers tirent plus souvent.', effect: l => `Cadence +${Math.round((1 / Math.pow(0.88, l) - 1) * 100)} %` },
  { id: 'archers', parent: 'arrowDmg', name: 'Recrue', branch: 'Compagnie', x: 4, y: 1, max: 4, cost: 50, growth: 3,
    desc: 'Un archer de plus à larguer à chaque expédition.', effect: l => `${3 + l} archers` },
  { id: 'capacity', parent: 'root', name: 'Coutures solides', branch: 'Sac', x: 4, y: 2, max: 10, cost: 10, growth: 1.75,
    desc: 'Le sac contient plus de pièces par palier.', effect: l => `${fmtNum(Math.round(120 * Math.pow(1.6, l)))} pièces au premier palier` },
  { id: 'tierCuir', parent: 'capacity', name: 'Cuir tanné', branch: 'Sac', x: 5, y: 2, max: 1, cost: 60, growth: 1,
    desc: 'Le sac peut passer en cuir une fois la toile pleine : la Déchirure rapporte davantage.', effect: () => 'Palier cuir ×1,6' },
  { id: 'duration', parent: 'root', name: 'Longue expédition', branch: 'Arcanes', x: 3, y: 3, max: 6, cost: 12, growth: 1.9,
    desc: 'Chaque expédition dure plus longtemps.', effect: l => `${30 + 5 * l} s par expédition` },
  { id: 'glove', parent: 'root', name: 'Gant élargi', branch: 'Récolte', x: 2, y: 2, max: 6, cost: 10, growth: 1.8,
    desc: 'Le gant attire les pièces de plus loin.', effect: l => `Rayon ${Math.round(46 * (1 + 0.18 * l))} px` },
];

export function fmtNum(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

// Valeurs du moment, calculées à partir des niveaux achetés.
export function computeStats(level) {
  const L = id => level[id] || 0;
  return {
    duration: BASE.duration + 5 * L('duration'),
    spawnEvery: BASE.spawnEvery,
    maxEnemies: BASE.maxEnemies,
    archers: BASE.archers + L('archers'),
    arrowDamage: HEROES.archer.damage * (1 + 0.5 * L('arrowDmg')),
    arrowCooldown: HEROES.archer.cooldown * Math.pow(0.88, L('arrowRate')),
    bagCapacity: BASE.bagCapacity * Math.pow(1.6, L('capacity')),
    tiers: 1 + L('tierCuir'),
    gloveRadius: BASE.gloveRadius * (1 + 0.18 * L('glove')),
    attraction: BASE.attraction,
    coinLife: BASE.coinLife,
    bagMouth: BASE.bagMouth,
    tearDuration: BASE.tearDuration,
  };
}

export function nodeCost(node, lvl) {
  return Math.ceil(node.cost * Math.pow(node.growth, lvl));
}

// Palier i : de cap×(2^i − 1) à cap×(2^(i+1) − 1)
export function bagMax(stats) {
  return stats.bagCapacity * (Math.pow(2, stats.tiers) - 1);
}
export function tierOf(amount, stats) {
  let t = 0;
  while (t < stats.tiers - 1 && amount >= stats.bagCapacity * (Math.pow(2, t + 1) - 1)) t++;
  return t;
}
export function tierRange(t, stats) {
  return [stats.bagCapacity * (Math.pow(2, t) - 1), stats.bagCapacity * (Math.pow(2, t + 1) - 1)];
}
