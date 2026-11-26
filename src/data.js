// Toutes les données d'équilibrage du jeu. On ajuste ici sans toucher au moteur.

export const SAVE_KEY = 'sac-sans-fond/v1';
export const SAVE_VERSION = 2;

// Paliers du sac : chaque palier double la capacité totale (voir bagMax).
export const TIERS = [
  { id: 'toile', name: 'Sac de toile', color: '#d8c49a', seam: '#8f7a52', glow: '#fff2c8', mult: 1 },
  { id: 'cuir', name: 'Sac de cuir', color: '#9a6238', seam: '#5a3418', glow: '#ffbf7a', mult: 1.6 },
  { id: 'soie', name: 'Sac de soie enchantée', color: '#8e62d6', seam: '#4b2a86', glow: '#e0c8ff', mult: 2.5 },
  { id: 'celeste', name: 'Sac d\'étoffe céleste', color: '#5fd6f0', seam: '#1d6f8a', glow: '#d8fbff', mult: 4 },
];
export const FULL_BONUS = 1.25;
// Sac plein : les pièces en trop débordent ; seule une petite part arrive quand même dans la bourse.
export const OVERFLOW_RATE = 0.1;

export const ZONES = [
  {
    id: 'clairiere', name: 'Clairière', stage: 'Clairière du matin',
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
// Créatures d'événement (n'apparaissent pas dans les hordes). Leurs PV suivent les dégâts de l'archer.
export const EVENT_FOES = {
  vein: { name: 'Filon d\'or', hp: 30, value: 0, radius: 22, speed: 0, color: '#ffd246', core: '#8c8f86', still: true },
  goblin: { name: 'Gobelin voleur', hp: 10, value: 0, radius: 12, speed: 150, color: '#6fae4c', core: '#4a7d34' },
  mimic: { name: 'Mimique', hp: 22, value: 0, radius: 18, speed: 0, color: '#c9a06a', core: '#5a3418', still: true },
};
Object.assign(ENEMIES, EVENT_FOES);

// Étapes : chaque expédition se déroule dans une ambiance, qui tourne d'une expédition à l'autre.
// mods : changements de jeu propres à l'étape.
export const STAGES = [
  { id: 'matin', name: 'Clairière du matin', blurb: 'Le calme avant la récolte', mods: {} },
  { id: 'crepuscule', name: 'Crépuscule doré', blurb: 'Feux follets dorés ×2', mods: { gold: 2 } },
  { id: 'minuit', name: 'Clairière de minuit', blurb: 'Butin +30 %, mais il fait noir', mods: { value: 1.3 } },
  { id: 'neige', name: 'Clairière enneigée', blurb: 'Ennemis lents et robustes · butin +15 %', mods: { hp: 1.25, speed: 0.75, value: 1.15 } },
];
export function stageFor(expeditions) { return STAGES[expeditions % STAGES.length]; }

// Événements : deux par expédition, à des moments tirés au hasard.
// share : part de la capacité du sac que l'événement peut rapporter.
export const EVENTS = {
  vein: { title: 'Filon d\'or !', sub: 'Frappe-le : chaque coup fait jaillir de l\'or', share: 0.16, life: 14 },
  rain: { title: 'Pluie de pièces !', sub: 'Passe le gant dessus, vite', share: 0.12, life: 5 },
  goblin: { title: 'Gobelin voleur !', sub: 'Il file avec un sac d\'or : attrape-le', share: 0.2, life: 11 },
  mimic: { title: 'Un coffre ?', sub: 'Ouvre-le à coups d\'épée…', share: 0.24, life: 18 },
};
export const EVENT_WINDOWS = [[0.18, 0.42], [0.55, 0.78]];

// Feu follet doré : version rare d'un feu follet, qui file vite et rapporte gros.
export const GOLD_WISP = { chance: 0.025, value: 15, hp: 1.5, speed: 1.7, color: '#ffd246' };

// Héros. shot : projectile (arrow, frost, note) ou 'melee'. Les dégâts et cadences de base
// sont multipliés par les améliorations de l'Atelier (voir computeStats).
export const HEROES = {
  archer: { name: 'Archer', plural: 'Archers', range: 200, damage: 3, cooldown: 0.65, shot: 'arrow', speed: 620, walkSpeed: 100,
    blurb: 'Tire de loin sur la cible la plus proche.' },
  mage: { name: 'Mage de givre', plural: 'Mages', range: 170, damage: 2.5, cooldown: 1.25, shot: 'frost', speed: 440, walkSpeed: 85,
    aoe: 45, slow: 0.4, slowTime: 1.6, blurb: 'Éclats de givre : dégâts de zone et ralentissement.' },
  knight: { name: 'Chevalier', plural: 'Chevaliers', range: 30, damage: 6, cooldown: 0.6, shot: 'melee', walkSpeed: 170,
    cleave: 28, blurb: 'Fonce au contact et frappe tout ce qui l\'entoure.' },
  bard: { name: 'Barde', plural: 'Bardes', range: 160, damage: 1, cooldown: 0.9, shot: 'note', speed: 360, walkSpeed: 100,
    aura: 150, auraBoost: 0.1, blurb: 'Ses chansons font tirer plus vite les héros proches.' },
};
export const HERO_ORDER = ['archer', 'mage', 'knight', 'bard'];

// Taille d'une région, en pixels d'écran (environ 3 × 3 écrans d'ordinateur).
export const MAP = { w: 2700, h: 1800 };

// Antre du boss : une salle fermée où l'on affronte l'élémentaire primordial seul.
// unlockTier : palier du sac à atteindre une fois en expédition pour ouvrir le portail.
export const ARENA = { w: 1200, h: 700, duration: 60, lootTime: 8, unlockTier: 2, firstBonus: 3 };

export const BASE = {
  duration: 30,          // s
  spawnEvery: 1.6,       // s entre deux hordes
  maxEnemies: 220,
  startPacks: 9,         // hordes présentes au départ
  archers: 2,           // archers au départ (×2 et ×3 dans l'arbre)
  bagCapacity: 120,      // pièces pour le premier palier
  gloveRadius: 54,       // px
  attraction: 3,         // s de Focus (ou d'Attraction pendant la Déchirure)
  focusRecovery: 8,      // s pour recharger entièrement la jauge
  coinLife: 8,           // s avant qu'une pièce au sol disparaisse
  bagMouth: 60,          // px, rayon d'aspiration du sac
  tearDuration: 5,       // s pour ramasser pendant la Déchirure
  tearMaxCoins: 260,
};

// L'arbre de l'Atelier est dans tree.js.

export function fmtNum(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

// Valeurs du moment, calculées à partir des niveaux achetés dans le grand arbre (voir tree.js).
// gb : bonus de l'équipement (voir gearBonus dans gear.js), facultatif.
export function computeStats(level, gb = null) {
  const L = id => level[id] || 0;
  const G = (st, k) => 1 + ((gb && gb[st][k]) || 0) / 100;
  const GG = st => (gb && gb[st]) || 0;   // bonus de toute la compagnie
  const all = 1 + 0.04 * L('training');
  const shooter = 1 + 0.06 * L('longbow');
  const bardBoost = HEROES.bard.auraBoost + 0.02 * L('bardAura');
  const events = ['rain'];
  if (L('evVein')) events.push('vein');
  if (L('evGoblin')) events.push('goblin');
  if (L('evMimic')) events.push('mimic');
  const heroes = {
    archer: BASE.archers * (1 + L('archers2') + L('archers3')),
    mage: L('mage') + L('mage2') + L('mage3'),
    knight: L('knight') + L('knight2') + L('knight3'),
    bard: L('bard') + L('bard2') + L('bard3'),
  };
  return {
    duration: BASE.duration + 5 * L('duration') + 3 * L('sandglass') + Math.round(((gb && gb.time) || 0) * 10) / 10,
    spawnEvery: BASE.spawnEvery / (1 + 0.2 * L('horde')),
    maxEnemies: Math.round(BASE.maxEnemies * (1 + 0.2 * L('horde'))),
    heroes,
    archers: heroes.archer,
    damage: {
      archer: HEROES.archer.damage * (1 + 0.05 * L('arrowDmg')) * all * G('dmg', 'archer'),
      mage: HEROES.mage.damage * (1 + 0.05 * L('mageDmg')) * all * G('dmg', 'mage'),
      knight: HEROES.knight.damage * (1 + 0.05 * L('knightDmg')) * all * G('dmg', 'knight'),
      bard: HEROES.bard.damage * all * G('dmg', 'bard'),
    },
    // PV des créatures d'événement : suivent les dégâts de l'arbre, pas ceux de l'équipement
    archerBase: HEROES.archer.damage * (1 + 0.05 * L('arrowDmg')) * all,
    cooldown: {
      archer: HEROES.archer.cooldown * Math.pow(0.98, L('arrowRate')) / G('rate', 'archer'),
      mage: HEROES.mage.cooldown / G('rate', 'mage'), knight: HEROES.knight.cooldown / G('rate', 'knight'), bard: HEROES.bard.cooldown / G('rate', 'bard'),
    },
    critMultBy: { archer: G('critDmg', 'archer'), mage: G('critDmg', 'mage'), knight: G('critDmg', 'knight'), bard: G('critDmg', 'bard') },
    dropMult: 1 + ((gb && gb.drop) || 0) / 100,
    critBy: { archer: (G('crit', 'archer') - 1), mage: (G('crit', 'mage') - 1), knight: (G('crit', 'knight') - 1), bard: (G('crit', 'bard') - 1) },
    bossBy: { archer: G('boss', 'archer'), mage: G('boss', 'mage'), knight: G('boss', 'knight'), bard: G('boss', 'bard') },
    gearOn: L('armory') > 0,
    myths: (gb && gb.myths) || {},
    looks: (gb && gb.looks) || {},
    range: { archer: (shooter + 0.08 * L('hawk')) * G('range', 'archer'), mage: shooter * G('range', 'mage'), bard: shooter * G('range', 'bard'), knight: G('range', 'knight') },
    cleave: (1 + 0.08 * L('whirl')) * (1 + GG('aoe') / 100),
    slowTime: HEROES.mage.slowTime + 0.3 * L('deepFrost'),
    critChance: 0.12 + 0.03 * L('crit'),
    critMult: 2 + 0.2 * L('critDmg'),
    mageAoe: HEROES.mage.aoe * (1 + 0.02 * L('mageDmg')) * (1 + GG('aoe') / 100),
    bardAura: HEROES.bard.aura * (1 + 0.04 * L('bardAura') + 0.08 * L('choir')) * (1 + GG('aoe') / 100),
    bardBoost,
    bossMult: (1 + 0.1 * L('bossDmg')) * (1 + 0.1 * L('veteran')),
    goldChance: GOLD_WISP.chance * (1 + 0.6 * L('goldWisp')) * (1 + GG('goldWisp') / 100),
    bagCapacity: BASE.bagCapacity * Math.pow(1.6, L('capacity')) * Math.pow(1.25, L('seams2')),
    tiers: 1 + L('tierCuir') + (L('tierCuir') ? L('tierSoie') : 0) + (L('tierCuir') && L('tierSoie') ? L('tierCeleste') : 0),
    gloveRadius: BASE.gloveRadius * (1 + 0.18 * L('glove')) * (1 + ((gb && gb.glove) || 0) / 100),
    attraction: BASE.attraction + 0.75 * L('attraction') + Math.round(GG('focus') * 10) / 10,
    coinLife: BASE.coinLife + 2 * L('coinLife') + GG('coinLife'),
    bagMouth: BASE.bagMouth * (1 + 0.5 * L('mouth')),
    tearDuration: BASE.tearDuration + 2 * L('tearRain'),
    tearMult: (1 + 0.1 * L('goldTear')) * (1 + GG('tear') / 100),
    tearWaves: 4 + L('wave'),
    valueMult: (1 + 0.05 * L('heavyCoins')) * (1 + ((gb && gb.gold) || 0) / 100),
    events, eventCount: 1 + L('evTwo'),
    eventMult: (1 + 0.15 * L('hunter')) * (1 + GG('event') / 100),
    stunMult: Math.max(0.2, 1 - GG('stun') / 100),
    veinMult: 1 + 0.2 * L('vein'),
    goblinSpeed: Math.max(0.4, 1 - 0.1 * L('goblin')),
    rainLife: 1 + 0.2 * L('goldRain'),
  };
}

// Coût du niveau suivant. Les paliers du sac profitent des « Coutures bon marché ».
export function nodeCost(node, lvl, level = {}) {
  const cheap = node.tier ? Math.pow(0.92, level.cheapTiers || 0) : 1;
  return Math.ceil(node.cost * Math.pow(node.growth, lvl) * cheap);
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
