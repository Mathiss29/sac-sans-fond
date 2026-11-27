// Toutes les données d'équilibrage du jeu. On ajuste ici sans toucher au moteur.

export const SAVE_KEY = 'sac-sans-fond/v1';
export const SAVE_VERSION = 3;

// Paliers du sac : chaque palier double la capacité totale (voir bagMax).
export const TIERS = [
  { id: 'toile', name: 'Sac de toile', color: '#d8c49a', seam: '#8f7a52', glow: '#fff2c8', mult: 1 },
  { id: 'cuir', name: 'Sac de cuir', color: '#9a6238', seam: '#5a3418', glow: '#ffbf7a', mult: 1.6 },
  { id: 'soie', name: 'Sac de soie enchantée', color: '#8e62d6', seam: '#4b2a86', glow: '#e0c8ff', mult: 2.5 },
  { id: 'celeste', name: 'Sac d\'étoffe céleste', color: '#5fd6f0', seam: '#1d6f8a', glow: '#d8fbff', mult: 4 },
  { id: 'demon', name: 'Sac en cuir de démon', color: '#d8402a', seam: '#5a1410', glow: '#ffb07a', mult: 6 },
  { id: 'void', name: 'Sac d\'étoffe du néant', color: '#3a2458', seam: '#b48cff', glow: '#e8d8ff', mult: 10 },
];
export const FULL_BONUS = 1.25;
// Sac plein : les pièces en trop débordent ; seule une petite part arrive quand même dans la bourse.
export const OVERFLOW_RATE = 0.1;

// Régions : 10 biomes, chacun avec ses couleurs, ses 3 élémentaires, son boss et son ambiance.
// boss.mech : mécanique du boss (fire, guards, copies, quake, armor, spores, imps, dash, final).
const B0 = { radius: 40, speed: 22, at: [0.84, 0.2], area: 0.13, fireEvery: 3.2, fireRadius: 48, fireWarn: 1.1, stun: 1.8, summonAt: [0.66, 0.33], summonN: 8 };
export const ZONES = [
  {
    id: 'clairiere', name: 'Clairière', stage: 'Clairière du matin', amb: null,
    ground: ['#6fa65a', '#4f8a45'], patch: '#86bb68', flower: ['#f6e27a', '#f29bb8', '#ffffff'],
    rock: '#8c8f86', tree: '#2f6b3c', path: '#c9a06a', water: '#3f8fc8',
    hpMult: 1, valueMult: 1,
    spawn: { wisp: 5, golem: 2, wind: 3 },
    areas: [['Bois profonds', 0.18, 0.26, 2, 2.4], ['Lisière fleurie', 0.78, 0.78, 1.5, 1.7]],
    // Élémentaire primordial : on l'affronte dans son antre (voir ARENA). Sur la carte, sa clairière garde le portail.
    boss: { ...B0, name: 'Brasier primordial', lair: 'Antre du Brasier', hp: 3400, value: 400, mech: 'fire' },
  },
  { id: 'marais', name: 'Marais brumeux', stage: 'Marais brumeux', amb: 'brume', blurb: 'La brume cache les hordes',
    ground: ['#4f7a55', '#3d6446'], patch: '#628c5c', flower: ['#c8d878', '#9fc0a0', '#e0f0c0'], rock: '#6a7468', tree: '#24503a', path: '#8a7a50', water: '#3a6a58',
    spawn: { frog: 5, mosquito: 3, mudgolem: 2 }, areas: [['Tourbière', 0.2, 0.3, 2, 2.4], ['Roselière', 0.75, 0.72, 1.5, 1.7]],
    boss: { ...B0, name: 'Reine des crapauds', look: 'boss_marais', lair: 'Mare de la Reine', hp: 3400, value: 400, mech: 'guards', color: '#7ac060', tint: '#6aa040' } },
  { id: 'automne', name: 'Bois d\'automne', stage: 'Bois d\'automne', amb: 'automne', blurb: 'Les feuilles tombent… et les citrouilles marchent',
    ground: ['#9a8a48', '#7e6e38'], patch: '#b09a50', flower: ['#e07a2a', '#c84a2a', '#ffd070'], rock: '#8a7a6a', tree: '#a0481e', path: '#c9a06a', water: '#4a7a98',
    spawn: { pumpkin: 5, leaves: 3, stump: 2 }, areas: [['Sous-bois roux', 0.22, 0.28, 2, 2.4], ['Champ de citrouilles', 0.76, 0.76, 1.5, 1.7]],
    boss: { ...B0, name: 'Épouvantail géant', look: 'boss_automne', lair: 'Champ de l\'Épouvantail', hp: 3400, value: 400, mech: 'copies', color: '#e0a040', tint: '#c87a2a' } },
  { id: 'gel', name: 'Cimes gelées', stage: 'Cimes gelées', amb: 'neige', blurb: 'Le froid ralentit tout le monde',
    ground: ['#d8e4ec', '#bccbd8'], patch: '#e8f0f6', flower: ['#ffffff', '#c8e0f0', '#a0c8e8'], rock: '#8a98a8', tree: '#2a5a5a', path: '#a8b8c8', water: '#6ab0d8',
    spawn: { snowball: 4, icebat: 4, troll: 2 }, mods: { speed: 0.8 }, areas: [['Crevasses', 0.2, 0.25, 2, 2.4], ['Col venteux', 0.78, 0.75, 1.5, 1.7]],
    boss: { ...B0, name: 'Yéti des glaces', look: 'boss_gel', lair: 'Grotte du Yéti', hp: 3400, value: 400, mech: 'quake', color: '#cfe8ff', tint: '#a0d0ff' } },
  { id: 'desert', name: 'Désert de cuivre', stage: 'Désert de cuivre', amb: 'desert', blurb: 'La chaleur fait danser l\'air',
    ground: ['#d8a868', '#c89050'], patch: '#e0b878', flower: ['#7a9a40', '#e0d0a0', '#c86a3a'], rock: '#a07050', tree: '#5a7a30', path: '#e8c890', water: '#3a9ab0',
    spawn: { beetle: 5, dustdevil: 3, scarab: 2 }, areas: [['Ruines', 0.2, 0.28, 2, 2.4], ['Oasis', 0.75, 0.75, 1.5, 1.7]],
    boss: { ...B0, name: 'Scorpion de cuivre', look: 'boss_desert', lair: 'Nid du Scorpion', hp: 3400, value: 400, mech: 'armor', color: '#e08a40', tint: '#c87a3a' } },
  { id: 'grotte', name: 'Grottes de cristal', stage: 'Grottes de cristal', amb: 'grotte', blurb: 'Seuls les cristaux éclairent',
    ground: ['#4a4060', '#3a3250'], patch: '#5a5070', flower: ['#b48cff', '#8ad0ff', '#e0c0ff'], rock: '#6a6080', tree: '#7a5ab0', path: '#7a7090', water: '#4a6ab0',
    spawn: { spider: 5, moth: 3, turtle: 2 }, areas: [['Géode', 0.22, 0.25, 2, 2.4], ['Lac souterrain', 0.75, 0.78, 1.5, 1.7]],
    boss: { ...B0, name: 'Golem de cristal', look: 'boss_grotte', lair: 'Cœur de la géode', hp: 3400, value: 400, mech: 'guards', color: '#b48cff', tint: '#9a6aff' } },
  { id: 'lumi', name: 'Forêt luminescente', stage: 'Forêt luminescente', amb: 'lumi', blurb: 'Les champignons brillent dans la nuit',
    ground: ['#2a4a48', '#203a3a'], patch: '#346058', flower: ['#7fffd0', '#d0ff80', '#80c0ff'], rock: '#4a5a60', tree: '#1a6a5a', path: '#5a6a58', water: '#2a5a80',
    spawn: { shroom: 5, firefly: 3, brute: 2 }, areas: [['Cercle des fées', 0.2, 0.3, 2, 2.4], ['Sous les géants', 0.76, 0.74, 1.5, 1.7]],
    boss: { ...B0, name: 'Champignon-roi', look: 'boss_lumi', lair: 'Trône moussu', hp: 3400, value: 400, mech: 'spores', color: '#7fffd0', tint: '#40c0a0' } },
  { id: 'enfers', name: 'Les Enfers', stage: 'Les Enfers', amb: 'enfers', blurb: 'La lave gronde sous les pieds', demon: true,
    ground: ['#5a2a24', '#481e1c'], patch: '#6a3428', flower: ['#ff7a3c', '#ffd246', '#c83a2a'], rock: '#3a2a2a', tree: '#2a1a1a', path: '#8a4a30', water: '#e05a20',
    spawn: { imp: 5, hound: 3, skull: 2 }, areas: [['Fournaise', 0.22, 0.26, 2, 2.4], ['Champs de cendre', 0.76, 0.76, 1.5, 1.7]],
    boss: { ...B0, name: 'Seigneur des Enfers', look: 'boss_enfers', lair: 'Trône de lave', hp: 3400, value: 400, mech: 'imps', color: '#ff5e4d' } },
  { id: 'ciel', name: 'Îles célestes', stage: 'Îles célestes', amb: 'ciel', blurb: 'Le vent souffle entre les nuages',
    ground: ['#b8d8e8', '#a0c8dc'], patch: '#d0e8f4', flower: ['#ffffff', '#ffe8a0', '#c0d8ff'], rock: '#e0e0e8', tree: '#78a8c8', path: '#f0f0f8', water: '#88c8f0',
    spawn: { puff: 5, harpy: 3, guardian: 2 }, areas: [['Temple du vent', 0.2, 0.25, 2, 2.4], ['Nuages d\'orage', 0.76, 0.76, 1.5, 1.7]],
    boss: { ...B0, name: 'Griffon tempête', look: 'boss_ciel', lair: 'Aire du Griffon', hp: 3400, value: 400, mech: 'dash', color: '#ffe8a0', tint: '#f0e0a0' } },
  { id: 'neant', name: 'Le Néant', stage: 'Le Néant', amb: 'neant', blurb: 'Ici, plus rien n\'a de fond',
    ground: ['#2a1a40', '#201434'], patch: '#3a2450', flower: ['#b48cff', '#ffffff', '#6040c0'], rock: '#3a3050', tree: '#4a2a7a', path: '#4a3a68', water: '#1a1030',
    spawn: { blob: 5, shade: 3, voideye: 2 }, areas: [['Faille', 0.2, 0.28, 2, 2.4], ['Débris d\'étoiles', 0.76, 0.75, 1.5, 1.7]],
    boss: { ...B0, name: 'Ombre du sac', look: 'boss_neant', lair: 'Fond du sac', hp: 3400, value: 400, mech: 'final', color: '#b48cff', tint: '#6030a0' } },
];
// 20 niveaux : chaque région a un niveau normal puis un niveau difficile (II), avec le même boss plus fort.
export const LEVELS = [];
ZONES.forEach((z, i) => [0, 1].forEach(hard => {
  const n = LEVELS.length;
  LEVELS.push({ i: n, id: hard ? z.id + '2' : z.id, zone: i, hard, name: z.name + (hard ? ' II' : ''),
    hp: Math.pow(1.8, n), value: Math.pow(1.6, n),
    // familles qui apparaissent selon l'avancée
    families: { king: n >= 2, puffer: n >= 3, healer: n >= 5, bandit: n >= 6, mvp: n >= 8 } });
}));
// Zone du niveau : couleurs et boss de la région, multiplicateurs du niveau.
export function levelZone(lv) {
  const L = typeof lv === 'number' ? LEVELS[lv] : lv, z = ZONES[L.zone];
  return { ...z, id: L.id, level: L.i, levelName: L.name, hard: L.hard, families: L.families, hpMult: L.hp, valueMult: L.value,
    boss: { ...z.boss, faster: L.hard ? 1.35 : 1 } };
}

// Familles d'élémentaires
export const ENEMIES = {
  wisp: { name: 'Feu follet', hp: 4, value: 2, radius: 10, speed: 62, color: '#ffb347', core: '#fff1c2', role: 'weak' },
  golem: { name: 'Golem d\'argile', hp: 16, value: 6, radius: 18, speed: 20, color: '#b7774a', core: '#7a4a2a', role: 'tough' },
  wind: { name: 'Esprit du vent', hp: 6, value: 3, radius: 13, speed: 44, color: '#d6f2ff', core: '#8fc7e6', dodge: 0.3, role: 'fast' },
};
// Élémentaires des autres régions : mêmes rôles (faible / rapide / costaud), dessins provisoires teintés
// (look = planche d'origine, tint = couleur) en attendant leurs planches.
const ROLE = { weak: ['wisp', { hp: 4, value: 2, radius: 10, speed: 62 }], fast: ['wind', { hp: 6, value: 3, radius: 13, speed: 50, dodge: 0.25 }], tough: ['golem', { hp: 16, value: 6, radius: 18, speed: 20 }] };
const KIN = [
  ['frog', 'weak', 'Grenouille gluante', '#7ac060'], ['mosquito', 'fast', 'Moustique géant', '#a0b080'], ['mudgolem', 'tough', 'Golem de boue', '#5a7a40'],
  ['pumpkin', 'weak', 'Citrouille marcheuse', '#e07a2a'], ['leaves', 'fast', 'Tourbillon de feuilles', '#d04a2a'], ['stump', 'tough', 'Souche vivante', '#7a4a2a'],
  ['snowball', 'weak', 'Boule de neige', '#f0f8ff'], ['icebat', 'fast', 'Chauve-souris de glace', '#9fd8ff'], ['troll', 'tough', 'Troll du givre', '#cfe8ff'],
  ['beetle', 'weak', 'Scarabée des sables', '#c9a06a'], ['dustdevil', 'fast', 'Diable de poussière', '#e0c080'], ['scarab', 'tough', 'Scarabée de cuivre', '#c87a3a'],
  ['spider', 'weak', 'Araignée de cristal', '#b48cff'], ['moth', 'fast', 'Papillon des grottes', '#d0b0ff'], ['turtle', 'tough', 'Tortue de cristal', '#8a6ad0'],
  ['shroom', 'weak', 'Champignon sauteur', '#7fffd0'], ['firefly', 'fast', 'Luciole', '#d0ff80'], ['brute', 'tough', 'Brute champignon', '#40a080'],
  ['puff', 'weak', 'Petit nuage', '#ffffff'], ['harpy', 'fast', 'Harpie blanche', '#f0f0ff'], ['guardian', 'tough', 'Gardien du temple', '#e8e0c8'],
  ['blob', 'weak', 'Goutte du néant', '#8040c0'], ['shade', 'fast', 'Ombre vacillante', '#5a3080'], ['voideye', 'tough', 'Œil du néant', '#6030a0'],
];
for (const [id, role, name, tint] of KIN) {
  const [look, st] = ROLE[role];
  ENEMIES[id] = { name, ...st, color: tint, core: '#24161e', look, tint, role };
}
// Démons des Enfers : dessins maison (assets/sprites/demons), une image chacun.
Object.assign(ENEMIES, {
  imp: { name: 'Diablotin', hp: 4, value: 2, radius: 11, speed: 66, color: '#c83a2a', core: '#ffd246', look: 'd_imp', role: 'weak', demon: true },
  hound: { name: 'Chien des Enfers', hp: 6, value: 3, radius: 13, speed: 70, color: '#8a2a20', core: '#ff7a3c', look: 'd_hound', role: 'fast', demon: true },
  skull: { name: 'Crâne ardent', hp: 16, value: 6, radius: 16, speed: 24, color: '#e0d0b0', core: '#ff5e4d', look: 'd_skull', role: 'tough', demon: true },
});
// Familles qui apparaissent dans toutes les régions à partir d'un certain niveau.
Object.assign(ENEMIES, {
  king: { name: 'Roi des élémentaires', hp: 60, value: 30, radius: 26, speed: 18, color: '#ffd246', core: '#24161e', look: 'golem', tint: '#ffd246', king: true },
  puffer: { name: 'Boursouflé', hp: 10, value: 4, radius: 12, speed: 30, color: '#ff80c0', core: '#24161e', look: 'wisp', tint: '#ff80c0', puffer: true },
  healer: { name: 'Soigneur', hp: 8, value: 5, radius: 12, speed: 40, color: '#80ff90', core: '#24161e', look: 'wind', tint: '#60e070', healer: true },
  bandit: { name: 'Bandit', hp: 12, value: 6, radius: 12, speed: 90, color: '#806040', core: '#24161e', look: 'goblin', tint: '#604020', bandit: true },
  mvp: { name: 'Lapin d\'or', hp: 30, value: 160, radius: 12, speed: 150, color: '#ffe14a', core: '#24161e', look: 'gold', tint: '#fff080', mvp: true },
});
// Créatures d'événement (n'apparaissent pas dans les hordes). Leurs PV suivent les dégâts de l'archer.
export const EVENT_FOES = {
  vein: { name: 'Filon d\'or', hp: 30, value: 0, radius: 22, speed: 0, color: '#ffd246', core: '#8c8f86', still: true },
  goblin: { name: 'Gobelin voleur', hp: 10, value: 0, radius: 12, speed: 150, color: '#6fae4c', core: '#4a7d34' },
  mimic: { name: 'Mimique', hp: 22, value: 0, radius: 18, speed: 0, color: '#c9a06a', core: '#5a3418', still: true },
  treasure: { name: 'Gobelin des trésors', hp: 40, value: 0, radius: 14, speed: 120, color: '#ffd246', core: '#4a7d34', look: 'goblin', tint: '#ffd246' },
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
// En Clairière, l'ambiance tourne d'une expédition à l'autre ; ailleurs, chaque région a la sienne.
export function stageFor(expeditions, zone = ZONES[0]) {
  if (!zone.amb) return STAGES[expeditions % STAGES.length];
  return { id: zone.amb, name: zone.levelName || zone.name, blurb: zone.blurb || '', mods: zone.mods || {} };
}

// Événements : deux par expédition, à des moments tirés au hasard.
// share : part de la capacité du sac que l'événement peut rapporter.
export const EVENTS = {
  buried: { title: 'Trésor enterré !', sub: 'Garde le gant 1 s sur la bosse pour le déterrer', share: 0.18, life: 15 },
  wanted: { title: 'Avis de recherche !', sub: 'Un élémentaire marqué : sa prime fond chaque seconde', share: 0.22, life: 16 },
  lucky: { title: 'Sac chanceux !', sub: 'Chaque coup fait tomber de l\'or', share: 0.14, life: 6 },
  skyfall: { title: 'Pluie d\'élémentaires !', sub: 'Ils tombent du ciel… et valent ×2,5', share: 0, life: 0 },
  rush: { title: 'Ruée dorée !', sub: 'Des feux follets dorés traversent la carte : attrape-les', share: 0.2, life: 9 },
  mirage: { title: 'Mirage doré !', sub: 'Les ennemis vaincus sous le gant valent ×3', share: 0, life: 8 },
  treasure: { title: 'Gobelin des trésors !', sub: 'Chaque coup lui fait perdre des pièces', share: 0.26, life: 14 },
  vein: { title: 'Filon d\'or !', sub: 'Frappe-le : chaque coup fait jaillir de l\'or', share: 0.16, life: 14 },
  rain: { title: 'Pluie de pièces !', sub: 'Passe le gant dessus, vite', share: 0.12, life: 5 },
  goblin: { title: 'Gobelin voleur !', sub: 'Il file avec un sac d\'or : attrape-le', share: 0.2, life: 11 },
  mimic: { title: 'Un coffre ?', sub: 'Ouvre-le à coups d\'épée…', share: 0.24, life: 18 },
};
export const EVENT_WINDOWS = [[0.15, 0.35], [0.42, 0.6], [0.66, 0.84]];

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
// Les 5 nouveaux héros (dessins provisoires en attendant leurs planches)
Object.assign(HEROES, {
  thief: { name: 'Voleur', plural: 'Voleurs', range: 24, damage: 4, cooldown: 0.4, shot: 'melee', walkSpeed: 200, cleave: 12, steal: 0.25,
    blurb: 'Rapide au contact ; ses coups font parfois tomber des pièces.' },
  druid: { name: 'Druide', plural: 'Druides', range: 180, damage: 2.5, cooldown: 1.6, shot: 'vines', walkSpeed: 90,
    blurb: 'Fait jaillir des ronces qui immobilisent et blessent.' },
  engineer: { name: 'Ingénieur', plural: 'Ingénieurs', range: 210, damage: 2.5, cooldown: 0.9, shot: 'bolt', speed: 700, walkSpeed: 95, turretEvery: 9,
    blurb: 'Tire des carreaux et pose des tourelles automatiques.' },
  alchemist: { name: 'Alchimiste', plural: 'Alchimistes', range: 170, damage: 5, cooldown: 1.5, shot: 'flask', walkSpeed: 90, aoe: 55,
    blurb: 'Lance des fioles qui explosent et laissent une flaque acide.' },
  summoner: { name: 'Invocateur', plural: 'Invocateurs', range: 230, damage: 7, cooldown: 2.2, shot: 'spirit', walkSpeed: 85,
    blurb: 'Invoque des esprits qui foncent sur les ennemis et explosent.' },
});
// Garde-robe : tenues teintes, gagnées en battant des boss de niveau (need = nombre de niveaux vaincus).
export const COSTUMES = [
  { id: 'base', name: 'Tenue d\'origine', tint: null, need: 0 },
  { id: 'azur', name: 'Azur', tint: '#4a78ff', need: 1 },
  { id: 'braise', name: 'Braise', tint: '#ff5a2a', need: 3 },
  { id: 'jade', name: 'Jade', tint: '#40e0a0', need: 6 },
  { id: 'ombre', name: 'Ombre', tint: '#2a1440', need: 9 },
  { id: 'or', name: 'Or massif', tint: '#ffd246', need: 12 },
  { id: 'givre', name: 'Givre', tint: '#cfe8ff', need: 16 },
  { id: 'neant', name: 'Néant', tint: '#b48cff', need: 20 },
];
export const HERO_ORDER = ['archer', 'mage', 'knight', 'bard'];   // lignées avec classes, ultimes et équipement
export const NEW_HEROES = ['thief', 'druid', 'engineer', 'alchemist', 'summoner'];
export const ALL_HEROES = [...HERO_ORDER, ...NEW_HEROES];

// Ultimes : un par lignée, débloqué en réussissant une épreuve pendant une expédition.
export const ULTS = {
  archer: { id: 'rainArrows', name: 'Pluie de flèches', key: 'KeyE', label: 'E' },
  mage: { id: 'iceRay', name: 'Rayon de glace', key: 'KeyR', label: 'R' },
  knight: { id: 'charge', name: 'Charge', key: 'KeyT', label: 'T' },
  bard: { id: 'hymn', name: 'Hymne héroïque', key: 'KeyY', label: 'Y' },
  // nouveaux héros : achetés directement dans l'arbre (pas d'épreuve)
  thief: { id: 'thiefUlt', name: 'Razzia', key: 'KeyU', label: 'U' },
  druid: { id: 'druidUlt', name: 'Forêt vivante', key: 'KeyI', label: 'I' },
  engineer: { id: 'engineerUlt', name: 'Barrage d\'artillerie', key: 'KeyO', label: 'O' },
  alchemist: { id: 'alchemistUlt', name: 'Grand chaudron', key: 'KeyP', label: 'P' },
  summoner: { id: 'summonerUlt', name: 'Légion spectrale', key: 'KeyJ', label: 'J' },
};
// Épreuves : stat comptée pendant une expédition (voir run.cnt dans game.js) et objectif.
export const TRIALS = {
  rainArrows: { stat: 'kills', goal: 300, text: 'Tue 300 élémentaires en une seule expédition' },
  iceRay: { stat: 'slowed', goal: 150, text: 'Ralentis 150 ennemis avec tes mages en une seule expédition' },
  charge: { stat: 'knocked', goal: 100, text: 'Repousse 100 ennemis avec tes chevaliers en une seule expédition' },
  hymn: { stat: 'auraT', goal: 20, text: 'Garde 3 héros dans l\'aura d\'un barde pendant 20 s en une seule expédition' },
};
export const ULT_CD = 30;   // s de recharge d'un ultime
// Changement de classe : le nœud de fourche fusionne les exemplaires d'une lignée.
export const FORKS = { archer: 'archerFork', mage: 'mageFork', knight: 'knightFork', bard: 'bardFork' };
export const CLASS_LINE = { ar: 'archer', ma: 'mage', kn: 'knight', ba: 'bard' };
export const MERGE_MULT = [1, 1, 1.5, 2.2];   // multiplicateur de puissance par rang (×nombre d'exemplaires fusionnés)

// Maîtrise des régions (nœud « Maîtrise ») : une région dont le boss de niveau II est battu
// donne un bonus permanent partout. [stat, valeur, texte] ; stat par héros (dmg, crit…) ou de compagnie.
export const MASTERY = {
  clairiere: ['dmg', 5, 'Dégâts +5 %'], marais: ['gold', 5, 'Butin +5 %'], automne: ['critDmg', 10, 'Dégâts critiques +10 %'],
  gel: ['stun', 10, 'Étourdissements −10 %'], desert: ['crit', 2, 'Critique +2 %'], grotte: ['aoe', 6, 'Zones d\'effet +6 %'],
  lumi: ['goldWisp', 15, 'Feux follets dorés +15 %'], enfers: ['boss', 10, 'Dégâts aux boss +10 %'], ciel: ['rate', 4, 'Cadence +4 %'],
  neant: ['time', 3, '+3 s par expédition'],
};
export const mastered = save => Object.keys(MASTERY).filter(id => ((save.bosses || {})[id + '2'] || 0) > 0);
export function masteryBonus(save, out) {
  if (!(save.level.mastery > 0)) return out;
  const k = 1 + 0.25 * (save.level.masteryUp || 0);
  for (const id of mastered(save)) {
    const [st, v] = MASTERY[id];
    if (typeof out[st] === 'object') for (const h of HERO_ORDER) out[st][h] = (out[st][h] || 0) + v * k;
    else out[st] = (out[st] || 0) + v * k;
  }
  return out;
}

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
  for (const [node, ev] of [['evVein', 'vein'], ['evGoblin', 'goblin'], ['evMimic', 'mimic'], ['evBuried', 'buried'], ['evWanted', 'wanted'], ['evLucky', 'lucky'],
    ['evSkyfall', 'skyfall'], ['evRush', 'rush'], ['evMirage', 'mirage'], ['evTreasure', 'treasure']]) if (L(node)) events.push(ev);
  const base = {
    archer: BASE.archers * (1 + L('archers2') + L('archers3')),
    mage: L('mage') + L('mage2') + L('mage3'),
    knight: L('knight') + L('knight2') + L('knight3'),
    bard: L('bard') + L('bard2') + L('bard3'),
  };
  // classes : rang 1 (exemplaires), 2 (fusionnés + voie A/B), 3 (spécialité)
  const pre = { archer: 'ar', mage: 'ma', knight: 'kn', bard: 'ba' };
  const rank = {}, cls = {}, merge = {}, heroes = {};
  const has = id => L(id) > 0;
  for (const k of HERO_ORDER) {
    const p = pre[k];
    const r3 = [p + 'A1', p + 'A2', p + 'B1', p + 'B2'].find(has);
    rank[k] = has(FORKS[k]) && base[k] > 0 ? (r3 ? 3 : 2) : 1;
    cls[k] = r3 || [p + 'A', p + 'B'].find(has) || null;
    merge[k] = rank[k] >= 2 ? base[k] * MERGE_MULT[rank[k]] : 1;
    heroes[k] = (rank[k] >= 2 ? 1 : base[k]) + (has('ost') && base[k] > 0 ? 1 : 0);
  }
  const C = id => has(id);   // une classe précise est-elle prise ?
  if (C('baB2')) { if (heroes.knight) heroes.knight++; else heroes.archer++; }
  const conductor = C('baA2') ? 1.3 : 1;
  // nouveaux héros : un exemplaire, deux avec le nœud ×2, dégâts +5 % par niveau
  const nd = {}, ncd = {};
  for (const k of NEW_HEROES) {
    heroes[k] = L(k) + L(k + '2') + L(k + '3') + (has('ost') && L(k) ? 1 : 0);
    nd[k] = HEROES[k].damage * (1 + 0.05 * L(k + 'Dmg')) * all;
    ncd[k] = HEROES[k].cooldown * Math.pow(0.97, L(k + 'Rate')) / conductor;
  }
  return {
    rank, cls, has: Object.fromEntries(['arA', 'arB', 'arA1', 'arA2', 'arB1', 'arB2', 'maA', 'maB', 'maA1', 'maA2', 'maB1', 'maB2', 'knA', 'knB', 'knA1', 'knA2', 'knB1', 'knB2', 'baA', 'baB', 'baA1', 'baA2', 'baB1', 'baB2'].map(id => [id, C(id)])),
    ults: Object.fromEntries(ALL_HEROES.map(k => [k, has(ULTS[k].id) && (NEW_HEROES.includes(k) ? heroes[k] : base[k]) > 0])),
    ultPow: Object.fromEntries(NEW_HEROES.map(k => [k, 1 + 0.3 * L(k + 'Ult2')])),
    // pouvoirs des nouveaux héros
    steal: 1 + 0.25 * L('thiefPow'), stealValue: 1 + 0.3 * L('thiefPow'), thorns: L('druidPow'),
    turretDouble: L('engineerPow') > 0, turretDmg: 1 + 0.2 * L('engineerPow'), acid: L('alchemistPow'), spirits: 1 + L('summonerPow'),
    // chasse aux boss
    bossNap: 1.5 * L('bossNap'), rageAt: has('lateRage') ? 0.2 : 0.33, lootTime: 3 * L('lairLoot'), bossGold: 1 + 0.2 * L('bossGold'),
    // cartographie, maîtrise, élites
    carto: has('carto'), fullMap: has('fullMap'), chests: L('chests'), daily: has('daily'), masteryHome: 0.1 * L('masteryHome'),
    eliteChance: 0.03 + 0.015 * L('eliteMore'), eliteLoot: has('eliteLoot'),
    ultCd: ULT_CD * Math.pow(0.9, L('encore')),
    rainN: 16 + 4 * L('deluge'), winter: 0.1 * L('winter'), chargeLen: 260 * (1 + 0.2 * L('furious')), hymnTime: 3 + L('recall'),
    pierce: L('pierce') + (C('arA2') ? 99 : 0), doubleShot: 0.06 * L('double'), master: has('master') || C('arB2'),
    bounce: L('bounce') + (C('arB1') ? 3 : 0), shards: L('shards'), archmage: has('archmage'), frostNova: has('frostNova'), frostLand: has('frostLand'),
    knock: 1 + 0.3 * L('heavy'), taunt: has('taunt'), lament: 0.05 * L('lament') + (C('baB') ? 0.2 : 0),
    opening: has('opening'), reinforce: L('reinforce'), dropFury: has('drop'), shockwave: has('shockwave'),
    duration: BASE.duration + 5 * L('duration') + 3 * L('sandglass') + Math.round(((gb && gb.time) || 0) * 10) / 10,
    spawnEvery: BASE.spawnEvery / (1 + 0.2 * L('horde')),
    maxEnemies: Math.round(BASE.maxEnemies * (1 + 0.2 * L('horde'))),
    heroes,
    archers: heroes.archer,
    damage: {
      archer: (HEROES.archer.damage + L('steel')) * (1 + 0.05 * L('arrowDmg')) * all * G('dmg', 'archer') * merge.archer,
      mage: HEROES.mage.damage * (1 + 0.05 * L('mageDmg')) * all * G('dmg', 'mage') * merge.mage,
      knight: HEROES.knight.damage * (1 + 0.05 * L('knightDmg')) * all * G('dmg', 'knight') * merge.knight,
      bard: HEROES.bard.damage * all * G('dmg', 'bard') * merge.bard, ...nd,
    },
    // PV des créatures d'événement : suivent les dégâts de l'arbre, pas ceux de l'équipement
    archerBase: HEROES.archer.damage * (1 + 0.05 * L('arrowDmg')) * all,
    cooldown: {
      archer: HEROES.archer.cooldown * Math.pow(0.98, L('arrowRate')) / G('rate', 'archer') / conductor,
      mage: HEROES.mage.cooldown / G('rate', 'mage') / conductor, knight: HEROES.knight.cooldown / G('rate', 'knight') / conductor, bard: HEROES.bard.cooldown / G('rate', 'bard') / conductor, ...ncd,
    },
    turrets: 2 + L('engineer2') * 2 + L('engineer3') * 2,
    critMultBy: { archer: G('critDmg', 'archer'), mage: G('critDmg', 'mage'), knight: G('critDmg', 'knight'), bard: G('critDmg', 'bard') },
    dropMult: 1 + ((gb && gb.drop) || 0) / 100,
    critBy: { archer: (G('crit', 'archer') - 1) + (C('arA1') ? 0.15 : 0), mage: (G('crit', 'mage') - 1), knight: (G('crit', 'knight') - 1), bard: (G('crit', 'bard') - 1) },
    bossBy: { archer: G('boss', 'archer'), mage: G('boss', 'mage'), knight: G('boss', 'knight') * (C('knB2') ? 2 : 1), bard: G('boss', 'bard') },
    gearOn: L('armory') > 0,
    myths: (gb && gb.myths) || {},
    looks: (gb && gb.looks) || {},
    range: { archer: (shooter + 0.08 * L('hawk')) * G('range', 'archer'), mage: shooter * G('range', 'mage'), bard: shooter * G('range', 'bard'), knight: G('range', 'knight') },
    cleave: (1 + 0.08 * L('whirl')) * (1 + GG('aoe') / 100) * (C('knB1') ? 1.8 : 1),
    slowTime: HEROES.mage.slowTime + 0.3 * L('deepFrost'),
    critChance: 0.12 + 0.03 * L('crit'),
    critMult: 2 + 0.2 * L('critDmg'),
    mageAoe: HEROES.mage.aoe * (1 + 0.02 * L('mageDmg')) * (1 + GG('aoe') / 100),
    bardAura: C('baA') ? 2000 : HEROES.bard.aura * (1 + 0.04 * L('bardAura') + 0.08 * L('choir')) * (1 + GG('aoe') / 100),
    bardBoost: bardBoost + (rank.bard >= 2 ? 0.1 : 0),
    bossMult: (1 + 0.1 * L('bossDmg')) * (1 + 0.1 * L('veteran')),
    goldChance: GOLD_WISP.chance * (1 + 0.6 * L('goldWisp')) * (1 + GG('goldWisp') / 100),
    bagCapacity: BASE.bagCapacity * Math.pow(1.6, L('capacity')) * Math.pow(1.25, L('seams2')),
    tiers: (() => { let t = 1; for (const k of ['tierCuir', 'tierSoie', 'tierCeleste', 'tierDemon', 'tierVoid']) { if (!L(k)) break; t++; } return t; })(),
    gloveRadius: BASE.gloveRadius * (1 + 0.18 * L('glove')) * (1 + ((gb && gb.glove) || 0) / 100) * (has('goldHand') ? 1.25 : 1),
    attraction: BASE.attraction + 0.75 * L('attraction') + Math.round(GG('focus') * 10) / 10,
    coinLife: BASE.coinLife + 2 * L('coinLife') + GG('coinLife'),
    bagMouth: BASE.bagMouth * (1 + 0.5 * L('mouth')),
    tearDuration: (BASE.tearDuration + 2 * L('tearRain')) * (has('frozenTime') ? 1.5 : 1),
    tearMult: (1 + 0.1 * L('goldTear')) * (1 + GG('tear') / 100),
    tearWaves: 4 + L('wave'),
    valueMult: (1 + 0.05 * L('heavyCoins')) * (1 + ((gb && gb.gold) || 0) / 100),
    events, eventCount: 1 + L('evTwo') + L('evThree'), downpour: L('downpour'),
    sprite: has('sprite'), spriteSpeed: 1 + 0.15 * L('spriteFast'), magpie: has('magpie'), magpieBold: L('magpieBold'),
    magnet: 25 * L('magnet'), pull: 70 * (1 + 0.15 * L('quickHand')) * (has('goldHand') ? 2 : 1), mimicTame: has('mimic'), fairy: has('fairyFingers'),
    overflowRate: OVERFLOW_RATE + 0.04 * L('falseBottom'), tripleBottom: has('tripleBottom'), deepMouth: has('deepMouth'),
    gemMult: 1 + 0.15 * L('gems'), crownChance: 0.01 * L('crown'), suction: has('suctionWave'),
    cards: has('cabinet'), elite: has('elite'), demonMult: 1 + 0.1 * L('demonBane'), embers: 1 + 0.1 * L('embers'), pact: has('pact'),
    goldHorde: L('goldHorde'), lantern: 1 + 0.3 * L('lantern'), furBoots: has('furBoots'), spyglass: has('spyglass'),
    eventMult: (1 + 0.15 * L('hunter')) * (1 + GG('event') / 100),
    stunMult: Math.max(0.2, 1 - GG('stun') / 100) * (1 - 0.25 * L('shield')),
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
