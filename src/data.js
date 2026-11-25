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
    // Élémentaire primordial : vit dans la clairière sombre (position en fraction de la région).
    // Élémentaire primordial : on l'affronte dans son antre (voir ARENA). Sur la carte, sa clairière garde le portail.
    boss: { name: 'Brasier primordial', lair: 'Antre du Brasier', hp: 3400, value: 400, radius: 40, speed: 22, at: [0.84, 0.2], area: 0.13,
      fireEvery: 3.2, fireRadius: 48, fireWarn: 1.1, stun: 1.8, summonAt: [0.66, 0.33], summonN: 8 },
  },
];

// Familles d'élémentaires
export const ENEMIES = {
  wisp: { name: 'Feu follet', hp: 4, value: 2, radius: 10, speed: 62, color: '#ffb347', core: '#fff1c2' },
  golem: { name: 'Golem d\'argile', hp: 16, value: 6, radius: 18, speed: 20, color: '#b7774a', core: '#7a4a2a' },
  wind: { name: 'Esprit du vent', hp: 6, value: 3, radius: 13, speed: 44, color: '#d6f2ff', core: '#8fc7e6', dodge: 0.3 },
};
// Feu follet doré : version rare d'un feu follet, qui file vite et rapporte gros.
export const GOLD_WISP = { chance: 0.025, value: 15, hp: 1.5, speed: 1.7, color: '#ffd246' };

// Héros. shot : projectile (arrow, frost, note) ou 'melee'. Les dégâts et cadences de base
// sont multipliés par les améliorations de l'Atelier (voir computeStats).
export const HEROES = {
  archer: { name: 'Archer', plural: 'Archers', range: 200, damage: 3, cooldown: 0.65, shot: 'arrow', speed: 620, walkSpeed: 100,
    blurb: 'Tire de loin sur la cible la plus proche.' },
  mage: { name: 'Mage de givre', plural: 'Mages', range: 170, damage: 2.5, cooldown: 1.25, shot: 'frost', speed: 440, walkSpeed: 85,
    aoe: 55, slow: 0.5, slowTime: 1.6, blurb: 'Éclats de givre : dégâts de zone et ralentissement.' },
  knight: { name: 'Chevalier', plural: 'Chevaliers', range: 30, damage: 8, cooldown: 0.6, shot: 'melee', walkSpeed: 170,
    cleave: 34, blurb: 'Fonce au contact et frappe tout ce qui l\'entoure.' },
  bard: { name: 'Barde', plural: 'Bardes', range: 160, damage: 1, cooldown: 0.9, shot: 'note', speed: 360, walkSpeed: 100,
    aura: 150, auraBoost: 0.3, blurb: 'Ses chansons font tirer plus vite les héros proches.' },
};
export const HERO_ORDER = ['archer', 'mage', 'knight', 'bard'];

// Taille d'une région, en pixels d'écran (environ 3 × 3 écrans d'ordinateur).
export const MAP = { w: 2700, h: 1800 };

// Antre du boss : une salle fermée où l'on affronte l'élémentaire primordial seul.
// unlockTier : palier du sac à atteindre une fois en expédition pour ouvrir le portail.
export const ARENA = { w: 1200, h: 700, duration: 60, lootTime: 8, unlockTier: 2, firstBonus: 3 };

export const BASE = {
  duration: 30,          // s
  spawnEvery: 0.25,      // s entre deux apparitions
  maxEnemies: 90,
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

// Atelier du mage. x, y en cases de la grille. cost(l) = cost × growth^l.
// hero : icône du nœud (sprite du héros). Les id de l'étape 1 sont gardés pour les sauvegardes.
export const NODES = [
  { id: 'root', name: 'Le Sac du mage', branch: 'Départ', x: 5, y: 4, max: 1, cost: 0, growth: 1,
    desc: 'Le vieux mage te confie son sac. Tout part d\'ici.', effect: () => 'Débloqué' },

  // Compagnie : les héros
  { id: 'arrowDmg', parent: 'root', name: 'Flèches aiguisées', branch: 'Compagnie', hero: 'archer', x: 5, y: 3, max: 10, cost: 8, growth: 1.6,
    desc: 'Les flèches des archers font plus mal.', effect: l => `Dégâts ×${fmtNum(1 + 0.5 * l)}` },
  { id: 'arrowRate', parent: 'arrowDmg', name: 'Carquois rapide', branch: 'Compagnie', hero: 'archer', x: 4, y: 3, max: 6, cost: 20, growth: 1.8,
    desc: 'Les archers tirent plus souvent.', effect: l => `Cadence +${Math.round((1 / Math.pow(0.88, l) - 1) * 100)} %` },
  { id: 'archers', parent: 'arrowDmg', name: 'Recrue', branch: 'Compagnie', hero: 'archer', x: 6, y: 3, max: 4, cost: 50, growth: 2.6,
    desc: 'Un archer de plus à larguer à chaque expédition.', effect: l => `${3 + l} archers` },
  { id: 'mage', parent: 'arrowDmg', name: 'Mage de givre', branch: 'Compagnie', hero: 'mage', x: 5, y: 2, max: 3, cost: 90, growth: 3,
    desc: 'Un mage rejoint la compagnie. Ses éclats de givre touchent en zone et ralentissent.', effect: l => `${l} mage${l > 1 ? 's' : ''}` },
  { id: 'mageDmg', parent: 'mage', name: 'Givre mordant', branch: 'Compagnie', hero: 'mage', x: 4, y: 2, max: 8, cost: 60, growth: 1.7,
    desc: 'Les éclats de givre font plus mal et couvrent une zone plus large.', effect: l => `Dégâts ×${fmtNum(1 + 0.5 * l)}, zone +${10 * l} %` },
  { id: 'knight', parent: 'archers', name: 'Chevalier', branch: 'Compagnie', hero: 'knight', x: 7, y: 3, max: 3, cost: 160, growth: 3,
    desc: 'Un chevalier fonce sur les élémentaires et frappe tout autour de lui.', effect: l => `${l} chevalier${l > 1 ? 's' : ''}` },
  { id: 'knightDmg', parent: 'knight', name: 'Lame trempée', branch: 'Compagnie', hero: 'knight', x: 7, y: 2, max: 8, cost: 110, growth: 1.7,
    desc: 'Les chevaliers frappent plus fort.', effect: l => `Dégâts ×${fmtNum(1 + 0.5 * l)}` },
  { id: 'bard', parent: 'mage', name: 'Barde', branch: 'Compagnie', hero: 'bard', x: 5, y: 1, max: 2, cost: 300, growth: 3.5,
    desc: 'Un barde joue pour les héros proches : ils tirent et frappent plus vite.', effect: l => `${l} barde${l > 1 ? 's' : ''}` },
  { id: 'bardAura', parent: 'bard', name: 'Ballade entraînante', branch: 'Compagnie', hero: 'bard', x: 4, y: 1, max: 5, cost: 200, growth: 1.9,
    desc: 'La chanson du barde porte plus loin et donne plus d\'entrain.', effect: l => `Cadence +${30 + 8 * l} %, portée +${15 * l} %` },

  // Sac
  { id: 'capacity', parent: 'root', name: 'Coutures solides', branch: 'Sac', x: 6, y: 4, max: 12, cost: 10, growth: 1.7,
    desc: 'Le sac contient plus de pièces par palier.', effect: l => `${fmtNum(Math.round(120 * Math.pow(1.6, l)))} pièces au premier palier` },
  { id: 'tierCuir', parent: 'capacity', name: 'Cuir tanné', branch: 'Sac', tier: 1, x: 7, y: 4, max: 1, cost: 60, growth: 1,
    desc: 'Une fois la toile pleine, le sac passe en cuir : la Déchirure rapporte davantage.', effect: () => 'Palier cuir ×1,6' },
  { id: 'tierSoie', parent: 'tierCuir', name: 'Soie enchantée', branch: 'Sac', tier: 2, x: 8, y: 4, max: 1, cost: 700, growth: 1,
    desc: 'Un troisième palier, cousu de soie et de runes.', effect: () => 'Palier soie ×2,5' },
  { id: 'tierCeleste', parent: 'tierSoie', name: 'Étoffe céleste', branch: 'Sac', tier: 3, x: 9, y: 4, max: 1, cost: 6000, growth: 1,
    desc: 'Le dernier palier : une étoffe tissée de ciel étoilé.', effect: () => 'Palier céleste ×4' },
  { id: 'mouth', parent: 'capacity', name: 'Gueule vorace', branch: 'Sac', x: 6, y: 5, max: 6, cost: 40, growth: 1.9,
    desc: 'Le sac aspire tout seul les pièces de plus loin.', effect: l => `Aspiration ${Math.round(60 * (1 + 0.5 * l))} px` },

  // Arcanes
  { id: 'duration', parent: 'root', name: 'Longue expédition', branch: 'Arcanes', x: 5, y: 5, max: 6, cost: 12, growth: 1.9,
    desc: 'Chaque expédition dure plus longtemps.', effect: l => `${30 + 5 * l} s par expédition` },
  { id: 'horde', parent: 'duration', name: 'Appel des élémentaires', branch: 'Arcanes', x: 4, y: 5, max: 5, cost: 80, growth: 2,
    desc: 'Les élémentaires apparaissent plus vite et en plus grand nombre.', effect: l => `Apparitions +${20 * l} %` },
  { id: 'bossDmg', parent: 'duration', name: 'Fléau des primordiaux', branch: 'Arcanes', x: 5, y: 6, max: 6, cost: 150, growth: 2,
    desc: 'Tes héros font plus de dégâts aux élémentaires primordiaux.', effect: l => `Dégâts aux boss ×${fmtNum(1 + 0.4 * l)}` },

  // Récolte
  { id: 'glove', parent: 'root', name: 'Gant élargi', branch: 'Récolte', x: 4, y: 4, max: 6, cost: 10, growth: 1.8,
    desc: 'Le gant attire les pièces de plus loin.', effect: l => `Rayon ${Math.round(46 * (1 + 0.18 * l))} px` },
  { id: 'attraction', parent: 'glove', name: 'Attraction tenace', branch: 'Récolte', x: 3, y: 4, max: 5, cost: 35, growth: 1.9,
    desc: 'L\'Attraction (clic maintenu) dure plus longtemps.', effect: l => `${fmtNum(1.5 + 0.5 * l)} s d'Attraction` },
  { id: 'coinLife', parent: 'glove', name: 'Pièces patientes', branch: 'Récolte', x: 4, y: 5, max: 5, cost: 30, growth: 1.8,
    desc: 'Les pièces restent plus longtemps au sol avant de disparaître.', effect: l => `${8 + 2 * l} s au sol` },
  { id: 'goldWisp', parent: 'attraction', name: 'Flair doré', branch: 'Récolte', x: 2, y: 4, max: 5, cost: 120, growth: 2,
    desc: 'Les feux follets dorés apparaissent plus souvent.', effect: l => `Chance ×${fmtNum(1 + 0.6 * l)}` },
];

export function fmtNum(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

// Valeurs du moment, calculées à partir des niveaux achetés.
export function computeStats(level) {
  const L = id => level[id] || 0;
  const bardBoost = HEROES.bard.auraBoost + 0.08 * L('bardAura');
  return {
    duration: BASE.duration + 5 * L('duration'),
    spawnEvery: BASE.spawnEvery / (1 + 0.2 * L('horde')),
    maxEnemies: Math.round(BASE.maxEnemies * (1 + 0.2 * L('horde'))),
    heroes: { archer: BASE.archers + L('archers'), mage: L('mage'), knight: L('knight'), bard: L('bard') },
    archers: BASE.archers + L('archers'),
    damage: {
      archer: HEROES.archer.damage * (1 + 0.5 * L('arrowDmg')),
      mage: HEROES.mage.damage * (1 + 0.5 * L('mageDmg')),
      knight: HEROES.knight.damage * (1 + 0.5 * L('knightDmg')),
      bard: HEROES.bard.damage,
    },
    cooldown: {
      archer: HEROES.archer.cooldown * Math.pow(0.88, L('arrowRate')),
      mage: HEROES.mage.cooldown, knight: HEROES.knight.cooldown, bard: HEROES.bard.cooldown,
    },
    mageAoe: HEROES.mage.aoe * (1 + 0.1 * L('mageDmg')),
    bardAura: HEROES.bard.aura * (1 + 0.15 * L('bardAura')),
    bardBoost,
    bossMult: 1 + 0.4 * L('bossDmg'),
    goldChance: GOLD_WISP.chance * (1 + 0.6 * L('goldWisp')),
    bagCapacity: BASE.bagCapacity * Math.pow(1.6, L('capacity')),
    tiers: 1 + L('tierCuir') + (L('tierCuir') ? L('tierSoie') : 0) + (L('tierCuir') && L('tierSoie') ? L('tierCeleste') : 0),
    gloveRadius: BASE.gloveRadius * (1 + 0.18 * L('glove')),
    attraction: BASE.attraction + 0.5 * L('attraction'),
    coinLife: BASE.coinLife + 2 * L('coinLife'),
    bagMouth: BASE.bagMouth * (1 + 0.5 * L('mouth')),
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
