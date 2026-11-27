// Familiers : petites bêtes qui éclosent des œufs du Sac, qu'on nourrit dans la Ménagerie
// et qui suivent la compagnie en expédition (1 actif, les autres au nid donnent un bonus passif).
// Ici : les données, les dessins et les règles. L'écran est dans pets-ui.js, le comportement en jeu dans game.js.

export const PET_RARITIES = [
  { name: 'Commun', color: '#c4c8b2', weight: 62 },
  { name: 'Rare', color: '#5fb8ff', weight: 28 },
  { name: 'Épique', color: '#c07aff', weight: 8 },
  { name: 'Légendaire', color: '#ff9a3d', weight: 2 },
  { name: 'Mythique', color: '#ff4a5a', weight: 0.5 },
];
export const STAGES = ['Œuf', 'Bébé', 'Jeune', 'Adulte', 'Ancien'];
const STAGE_POWER = [0, 0.5, 0.75, 1, 1.4];
export const ANCIENT = 4;
export const STAR_MAX = 10;
export const starNeed = stars => 150 * (stars + 1);   // nourriture pour l'étoile suivante (adulte et Ancien)
export const AWAKE_COST = 2;                           // doublons (œufs ou familiers de la même espèce) pour monter d'une rareté
export const GROW_NEED = [0, 100, 200];   // nourriture pour passer bébé → jeune, puis jeune → adulte
export const TREAT_FOOD = 10;
export const HEART_PTS = 25;               // points d'affection par cœur (5 cœurs = talent)
export const GOLD_CHANCE = 1 / 50;

const K = '#1a1410';
// mode : comportement en expédition ; boss : attaque spéciale en duel ; passive : bonus quand il est au nid
export const SPECIES = {
  ferret: { name: 'Furet doré', zone: 'clairiere', treat: ['miel', 'Miel doré', '#ffcf4a'], mode: 'fetch', boss: 'bite', passive: 'gold',
    power: 'Court ramasser l\'or tombé au sol et le renvoie au sac.', bossTxt: 'Morsure : gros dégâts au boss',
    pal: { '1': '#e8b04a', '2': '#a8682a', '3': '#fff0b0', e: K, w: '#fff' },
    map: ['..........kk..', '.........k33k.', '........k1e13k', '.kk....k11111k', 'k12k..k1111kk.', 'k1k.kk1111k...', '.k.k111111k...', '...k31111k2k..', '...k2kk2k.kk..', '...kk.kk......'] },
  toad: { name: 'Crapaud-tirelire', zone: 'marais', treat: ['mouche', 'Mouches', '#9fb060'], mode: 'gulp', boss: 'gold', passive: 'gold',
    power: 'Gobe les pièces au sol puis les recrache dans le sac, valeur augmentée.', bossTxt: 'Coup de langue : le boss perd des pièces',
    pal: { '1': '#5f9a3a', '2': '#3a6424', '3': '#cfe08a', g: '#ffcf4a', e: K, w: '#fff' },
    map: ['..kkk....kkk..', '.k1w1k..k1w1k.', '.k1ek1kk1ek1k.', 'k111111111111k', 'k1kkkkkkkkkk1k', 'k133333333331k', 'k133g3333g331k', '.k1333333331k.', '.k22k2kk2k22k.', '.kkk.kk.kk.kkk'] },
  fox: { name: 'Renardeau roux', zone: 'automne', treat: ['gland', 'Glands', '#b07a3a'], mode: 'dig', boss: 'bite', passive: 'gold',
    power: 'Flaire les trésors enterrés et les déterre : un tas de pièces jaillit.', bossTxt: 'Morsure : gros dégâts au boss',
    pal: { '1': '#e0702a', '2': '#a04a18', '3': '#fbe6c8', e: K, w: '#fff' },
    map: ['k..........k', 'kk........kk', 'k1k......k1k', 'k11kkkkkk11k', 'k1111111111k', 'k1ew1111ew1k', 'k3311111133k', '.k33311333k.', '..k333k333k.', '...k33333k..', '..k1k111k1k.', '..kk.kkk.kk.'] },
  owl: { name: 'Hibou de givre', zone: 'gel', treat: ['flocon', 'Flocons sucrés', '#cfe8ff'], mode: 'frost', boss: 'freeze', passive: 'dmg', fly: true,
    power: 'Survole les hordes et les gèle : les ennemis sous ses ailes sont ralentis.', bossTxt: 'Souffle glacé : gèle le boss 2 s',
    pal: { '1': '#8fb6d8', '2': '#e4f2ff', '3': '#cfe6f7', o: '#f0a040', e: K, w: '#fff' },
    map: ['.kk......kk.', '.k1k....k1k.', '.k11kkkk11k.', 'k1333113331k', 'k3ww3113ww3k', 'k3we3oo3we3k', 'k1333113331k', 'k1122222211k', 'k1222222221k', 'k1222222221k', '.k22222222k.', '..kokkkkok..'] },
  scarab: { name: 'Scarabée de cuivre', zone: 'desert', treat: ['datte', 'Dattes', '#8a4a20'], mode: 'magnet', boss: 'gold', passive: 'gold',
    power: 'Aimant vivant : attire vers le sac les pièces autour de lui.', bossTxt: 'Carapace aimantée : arrache des pièces au boss',
    pal: { '1': '#d07a3a', '2': '#8a4520', '3': '#f5b070', e: K },
    map: ['...k....k...', '....k..k....', '...kkkkkk...', '..k1e11e1k..', '.kkkkkkkkkk.', 'k2133kk3312k', 'k2133kk3312k', 'k2113kk3112k', '.k211kk112k.', 'k.kkkkkkkk.k'] },
  bat: { name: 'Chauve-souris de cristal', zone: 'grotte', treat: ['quartz', 'Éclats de quartz', '#e0d4ff'], mode: 'gems', boss: 'bite', passive: 'gold', fly: true,
    power: 'Frôle les ennemis et leur chipe des gemmes.', bossTxt: 'Morsure de cristal : gros dégâts au boss',
    pal: { '1': '#8a6fd8', '2': '#5a44a0', '3': '#e0d4ff', r: '#ff6a8a', e: '#ff6a8a' },
    map: ['k............k', 'k1k..k..k..k1k', 'k11kk1kk1kk11k', 'k111k1111k111k', 'k1111r11r1111k', '.k1111331111k.', '..k1k1111k1k..', '...k.k11k.k...', '......kk......'] },
  firefly: { name: 'Luciole de lune', zone: 'lumi', treat: ['rosee', 'Rosée de lune', '#d8ff7a'], mode: 'light', boss: 'cheer', passive: 'dmg', fly: true, glow: '#d8ff7a',
    power: 'Éclaire la compagnie : les héros dans sa lumière agissent plus vite.', bossTxt: 'Éclat de lune : libère les héros étourdis et les accélère',
    pal: { '1': '#3d4a6b', '2': '#6a7aa8', '3': '#d8ff7a', w: '#c8e4ff', e: '#fff' },
    map: ['..k....k..', '...k..k...', '..kkkkkk..', '.k1e11e1k.', '.k111111k.', 'kwkk11kkwk', 'kwwk22kwwk', '.kk3333kk.', '..k3333k..', '...kkkk...'] },
  imp: { name: 'Diablotin', zone: 'enfers', treat: ['braise', 'Charbon ardent', '#ff7a3c'], mode: 'bite', boss: 'burn', passive: 'dmg',
    power: 'Mord les monstres et les enflamme.', bossTxt: 'Flammèche : brûle le boss',
    pal: { '1': '#c8323a', '2': '#f0e0c0', '3': '#ff8a6a', y: '#ffd84a', e: '#ffd84a', w: '#fff' },
    map: ['k..........k', 'k2k......k2k', '.k2k....k2k.', '..k1kkkk1k..', '.k11111111k.', '.k1y1111y1k.', '.k11kkkk11k.', '..k1wkkw1k..', '.k11111111k.', 'k1k111111k1k', 'kk.k1kk1k.kk', '...kk..kk...'] },
  jelly: { name: 'Méduse céleste', zone: 'ciel', treat: ['nuage', 'Nuages sucrés', '#ffe0f4'], mode: 'rain', boss: 'gold', passive: 'gold', fly: true, glow: '#ff9ad8',
    power: 'De temps en temps, fait pleuvoir des pièces autour d\'elle.', bossTxt: 'Averse d\'étoiles : le boss perd des pièces',
    pal: { '1': '#ff9ad8', '2': '#c070e0', '3': '#ffe0f4', e: K },
    map: ['...kkkkkk...', '..k333333k..', '.k31111113k.', 'k3111111113k', 'k11e1111e11k', 'k1111111111k', 'kk2kk22kk2kk', '.k2..k2..k2.', '..k2..k2..k2', '.k2..k2..k2.'] },
  minibag: { name: 'Petit Sac', zone: 'neant', treat: ['ombre', 'Fil d\'ombre', '#b48cff'], mode: 'swallow', boss: 'bite', passive: 'gold', glow: '#ff4a5a',
    power: 'Mini-Déchirure : une fois par expédition, avale tout le butin à l\'écran.', bossTxt: 'Bouchée du néant : gros dégâts au boss',
    pal: { '1': '#3a2a5a', '2': '#ffcf4a', '3': '#ff4a5a', e: '#ff4a5a' },
    map: ['....kkkk....', '...k2222k...', '....k22k....', '..kkk22kkk..', '.k11111111k.', 'k1111111111k', 'k11e1111e11k', 'k1111kk1111k', 'k111k33k111k', 'k1111kk1111k', '.k11111111k.', '..kkkkkkkk..'] },
};
export const SPECIES_IDS = Object.keys(SPECIES);
export const TREATS = Object.fromEntries(SPECIES_IDS.map(id => [SPECIES[id].treat[0], { id: SPECIES[id].treat[0], name: SPECIES[id].treat[1], color: SPECIES[id].treat[2], zone: SPECIES[id].zone }]));
// Accessoires : achetés en éclats, un seul porteur à la fois, dessinés sur la tête du familier.
export const ACCESSORIES = {
  straw: { name: 'Chapeau de paille', cost: 60, fx: 'Friandises ×1,5 en expédition', pal: { '1': '#e8c060', '2': '#c04040' }, map: ['...kkkk...', '..k1111k..', 'kk122221kk', 'k11111111k', '.kkkkkkkk.'] },
  bow: { name: 'Nœud rose', cost: 60, fx: 'Affection ×2', pal: { '1': '#ff7ab0' }, map: ['kk...kk', 'k1k.k1k', 'k11k11k', 'k1k.k1k', 'kk...kk'] },
  wizard: { name: 'Bonnet de mage', cost: 120, fx: 'Puissance +10 %', pal: { '1': '#5a4ab0', '2': '#ffe14a' }, map: ['....kk...', '...k12k..', '..k1111k.', '..k1121k.', '.k111111k', 'kkkkkkkkk'] },
  horns: { name: 'Casque à cornes', cost: 120, fx: 'Attaque de boss ×1,5', pal: { '1': '#f0e0c0', '2': '#8a8a9a' }, map: ['k........k', 'k1k....k1k', '.k1kkkk1k.', '..k2222k..', '..kkkkkk..'] },
  crown: { name: 'Couronne', cost: 200, fx: 'Bonus au nid ×1,5', pal: { '1': '#ffd246', '2': '#ff4a5a' }, map: ['k.k.k.k', 'k1k1k1k', 'k11111k', 'k12121k', 'kkkkkkk'] },
  halo: { name: 'Auréole', cost: 200, fx: 'Œufs plus fréquents (+3 %)', float: true, pal: { '1': '#fff6a0' }, map: ['.kkkkkk.', 'k111111k', '.kkkkkk.'] },
};
export const ACC_IDS = Object.keys(ACCESSORIES);
export const speciesOfZone = zid => SPECIES_IDS.find(id => SPECIES[id].zone === String(zid).replace(/2$/, '')) || null;

// ---------- dessins ----------
const BABY = ['..kkkk..', '.k1111k.', 'k1e11e1k', 'k113311k', 'k211112k', '.k2222k.', '..kkkk..'];
const EGG = ['..kkkk..', '.k1111k.', 'k11w111k', 'k1w1221k', 'k111111k', 'k122111k', 'k111121k', 'k111111k', '.k1111k.', '..kkkk..'];
const TREAT = ['.kk.', 'k12k', 'k22k', '.kk.'];
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function paint(map, pal) {
  const c = document.createElement('canvas'); c.width = Math.max(...map.map(r => r.length)); c.height = map.length;
  const g = c.getContext('2d');
  map.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ch === 'k' ? K : pal[ch] || pal['1']; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const GOLD_PAL = { '1': '#ffe14a', '2': '#d49a10', '3': '#fffbe0', g: '#fff6c8', o: '#fff6c8', r: '#fff', y: '#fff', w: '#fff', e: K };
const cache = {};
// Image d'un familier (ou de son œuf) : stage 0 = œuf, 1 = bébé, 2-3 = dessin complet.
export function petSprite(sp, stage = 3, gold = false, rar = 0) {
  const key = `${sp}|${stage}|${gold}|${stage ? '' : rar}`;
  if (cache[key]) return cache[key];
  const S = SPECIES[sp];
  let pal = gold ? { ...S.pal, ...GOLD_PAL, e: S.pal.e === K ? K : '#ff4a5a' } : S.pal;
  pal = { ...pal, '2': pal['2'] || shade(pal['1'], 0.7), '3': pal['3'] || shade(pal['1'], 1.3) };
  if (!stage) { const col = PET_RARITIES[rar].color; return (cache[key] = paint(EGG, { '1': col, '2': shade(col, 0.65), w: '#fff' })); }
  return (cache[key] = paint(stage === 1 ? BABY : S.map, pal));
}
export function accSprite(id) {
  const key = 'acc|' + id;
  if (!cache[key]) cache[key] = paint(ACCESSORIES[id].map, ACCESSORIES[id].pal);
  return cache[key];
}
export function treatSprite(id) {
  const key = 'treat|' + id;
  if (!cache[key]) { const col = TREATS[id].color; cache[key] = paint(TREAT, { '1': '#fff', '2': col }); }
  return cache[key];
}

// ---------- sauvegarde ----------
export function petsOf(save) {
  if (!save.pets) save.pets = { list: [], active: null, nest: [], treats: {}, seen: {}, next: 1, news: 0 };
  const p = save.pets;
  p.list = (p.list || []).filter(x => x && SPECIES[x.sp]);
  p.treats = p.treats || {}; p.seen = p.seen || {}; p.feasts = p.feasts || {}; p.found = p.found || {}; p.acc = p.acc || {}; p.nest = (p.nest || []).filter(u => p.list.some(x => x.uid === u));
  if (p.active && !p.list.some(x => x.uid === p.active)) p.active = null;
  p.scout = (p.scout || []).filter(u => p.nest.includes(u));
  for (const x of p.list) if (x.stage) { p.found[x.sp + '|' + x.rar] = 1; if (x.gold) p.found['gold|' + x.sp] = 1; }
  return p;
}
export const petById = (save, uid) => petsOf(save).list.find(x => x.uid === uid) || null;
export const nestSlots = save => 2 + ((save.level && save.level.bigNest) || 0);
export const growthMult = save => 1 + 0.5 * ((save.level && save.level.cozyNest) || 0);
export const hearts = pet => Math.min(5, Math.floor((pet.aff || 0) / HEART_PTS));

// Puissance d'un familier : stade × rareté × forme dorée × talent (5 cœurs). Un adulte commun vaut 1.
export function petPower(pet) {
  if (!pet || !pet.stage) return 0;
  return STAGE_POWER[pet.stage] * (1 + 0.3 * pet.rar) * (pet.gold ? 1.5 : 1) * (hearts(pet) >= 5 ? 1.25 : 1) * (1 + 0.1 * (pet.stars || 0)) * (pet.acc === 'wizard' ? 1.1 : 1);
}
// bonus passif au nid : 25 % de la valeur du familier (un adulte commun en expédition « vaut » +20 %)
export const nestBonus = pet => 0.25 * 0.2 * petPower(pet) * (pet.acc === 'crown' ? 1.5 : 1);
// Bonus de collection : +1 % d'or par couple espèce × rareté découvert, +2 % par forme dorée.
export function collectionBonus(save) { const f = petsOf(save).found; return Object.keys(f).reduce((t, k) => t + (k.startsWith('gold|') ? 0.02 : 0.01), 0); }
export function markFound(save, pet) { const f = petsOf(save).found; f[pet.sp + '|' + pet.rar] = 1; if (pet.gold) f['gold|' + pet.sp] = 1; }

export function rollRarity(rnd = Math.random, min = 0) {
  const w = PET_RARITIES.map((r, i) => (i < min ? 0 : r.weight)), tot = w.reduce((a, b) => a + b, 0);
  let x = rnd() * tot;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return min;
}
export function addEgg(save, sp, rar) {
  const p = petsOf(save);
  const pet = { uid: p.next++, sp, rar, stage: 0, food: 0, aff: 0, gold: false, born: save.expeditions || 0, name: '' };
  p.list.push(pet); p.news = (p.news || 0) + 1;
  // les premières bêtes partent d'elles-mêmes en expédition / au nid
  return pet;
}
function autoPlace(save, pet) {
  const p = petsOf(save);
  if (!p.active) p.active = pet.uid;
  else if (p.active !== pet.uid && !p.nest.includes(pet.uid) && p.nest.length < nestSlots(save)) p.nest.push(pet.uid);
}

// Fin d'expédition : œufs trouvés, éclosions, friandises, fouilles. Renvoie des lignes pour le bilan [titre, texte, couleur].
export function petsAfterRun(save, r, ctx) {
  const p = petsOf(save), news = [];
  const pool = ctx.zonesOpen.map(speciesOfZone).filter(Boolean);
  const any = () => pool[Math.floor(Math.random() * pool.length)] || 'ferret';
  // friandises ramassées
  for (const [id, n] of Object.entries(r.treats || {})) { p.treats[id] = (p.treats[id] || 0) + n; news.push(['Friandise : ' + TREATS[id].name, '+' + n, TREATS[id].color]); }
  // festin du boss : chaque victoire contre un boss en donne un (sert à faire passer un adulte au stade Ancien)
  const zsp = speciesOfZone(ctx.zoneId);
  if (r.bossKilled && !ctx.dungeon && zsp) { p.feasts[zsp] = (p.feasts[zsp] || 0) + 1; news.push(['Festin royal', `pour ${SPECIES[zsp].name} (stade Ancien)`, '#ffd246']); }
  // éclosions (œufs trouvés avant cette expédition)
  for (const pet of p.list) {
    if (pet.stage === 0 && pet.born < save.expeditions) {
      pet.stage = 1; pet.gold = Math.random() < GOLD_CHANCE; p.seen[pet.sp] = 1; p.news++;
      markFound(save, pet); autoPlace(save, pet);
      news.push([pet.gold ? 'Éclosion dorée !' : 'Éclosion !', `${SPECIES[pet.sp].name} (${PET_RARITIES[pet.rar].name})`, pet.gold ? '#ffe14a' : PET_RARITIES[pet.rar].color]);
    }
  }
  // fouilles : les familiers envoyés fouiller rapportent des friandises, parfois un œuf
  const eggs = [];
  for (const uid of p.scout) {
    const pet = petById(save, uid); if (!pet || !pet.stage) continue;
    const pw = petPower(pet), sp = any(), id = SPECIES[sp].treat[0], n = 2 + Math.round(pw + Math.random() * 2);
    p.treats[id] = (p.treats[id] || 0) + n;
    news.push([`Fouille de ${pet.name || SPECIES[pet.sp].name}`, `${n} × ${TREATS[id].name}`, '#9fe07a']);
    if (Math.random() < Math.min(0.08, 0.03 + 0.01 * pw)) eggs.push([any(), rollRarity(), 'rapporté par ' + (pet.name || SPECIES[pet.sp].name)]);
  }
  // nouveaux œufs : le premier arrive tout seul, puis la Déchirure en lâche parfois, et chaque boss en donne un la première fois
  if (!p.list.length && save.expeditions >= 2) eggs.push(['ferret', 0]);
  if (ctx.bossFirst && zsp) eggs.push([zsp, rollRarity(Math.random, ctx.hard ? 2 : 1)]);
  const act = petById(save, p.active), halo = act && act.acc === 'halo' ? 0.03 : 0;
  if (!r.lair.only && !ctx.dungeon && Math.random() < 0.05 + 0.03 * (r.tier || 0) + halo) eggs.push([any(), rollRarity()]);
  for (const [sp, rar, why] of eggs) { addEgg(save, sp, rar); news.push(['Œuf trouvé !', `${PET_RARITIES[rar].name} · ${why || 'éclot après la prochaine expédition'}`, PET_RARITIES[rar].color]); }
  // la caresse se recharge à chaque expédition
  for (const pet of p.list) pet.petted = false;
  return news;
}

// Nourrir : bébé → jeune → adulte, puis des étoiles (jusqu'à 10, +10 % de puissance chacune). Renvoie le texte à afficher.
export function feed(save, pet, treatId, n = 1) {
  const p = petsOf(save);
  n = Math.min(n, p.treats[treatId] || 0);
  if (!pet || !pet.stage || !n || (pet.stage >= 3 && (pet.stars || 0) >= STAR_MAX)) return '';
  const fav = SPECIES[pet.sp].treat[0] === treatId;
  p.treats[treatId] -= n;
  pet.aff = (pet.aff || 0) + n * (fav ? 8 : 4) * (pet.acc === 'bow' ? 2 : 1);
  pet.food += n * TREAT_FOOD * (fav ? 2 : 1) * growthMult(save);
  let msg = fav ? 'Sa friandise préférée !' : 'Miam !';
  while (pet.stage < 3 && pet.food >= GROW_NEED[pet.stage]) { pet.food -= GROW_NEED[pet.stage]; pet.stage++; msg = `Il grandit : ${STAGES[pet.stage]} !`; }
  while (pet.stage >= 3 && (pet.stars || 0) < STAR_MAX && pet.food >= starNeed(pet.stars || 0)) { pet.food -= starNeed(pet.stars || 0); pet.stars = (pet.stars || 0) + 1; msg = `Nouvelle étoile : ${pet.stars} ★ !`; }
  if ((pet.stars || 0) >= STAR_MAX) pet.food = 0;
  return msg;
}
export function caress(pet) {
  if (!pet || !pet.stage || pet.petted) return false;
  pet.petted = true; pet.aff = (pet.aff || 0) + 10 * (pet.acc === 'bow' ? 2 : 1); return true;
}
// Stade Ancien : un adulte à 5 cœurs + un festin royal de sa région.
export const canAncient = (save, pet) => pet && pet.stage === 3 && hearts(pet) >= 5 && (petsOf(save).feasts[pet.sp] || 0) > 0;
export function makeAncient(save, pet) {
  if (!canAncient(save, pet)) return false;
  petsOf(save).feasts[pet.sp]--; pet.stage = ANCIENT; return true;
}
// Éveil : deux doublons de la même espèce (œufs ou familiers, pas ceux qui travaillent) font monter la rareté d'un cran.
export function awakeFodder(save, pet) {
  const p = petsOf(save);
  return p.list.filter(x => x !== pet && x.sp === pet.sp && x.uid !== p.active && !p.nest.includes(x.uid)).sort((a, b) => a.stage - b.stage || a.rar - b.rar);
}
export function awaken(save, pet) {
  const p = petsOf(save), fod = awakeFodder(save, pet).slice(0, AWAKE_COST);
  if (!pet || pet.rar >= PET_RARITIES.length - 1 || fod.length < AWAKE_COST) return false;
  // les accessoires des doublons restent achetés : on peut les remettre à un autre
  p.list = p.list.filter(x => !fod.includes(x));
  pet.rar++; if (pet.stage) markFound(save, pet); return true;
}
// Fouille : un familier du nid part fouiller au lieu de donner son bonus.
export function toggleScout(save, pet) {
  const p = petsOf(save);
  if (p.scout.includes(pet.uid)) p.scout = p.scout.filter(u => u !== pet.uid);
  else if (p.nest.includes(pet.uid) && pet.stage) p.scout.push(pet.uid);
}
// Accessoires : achat en éclats, un porteur à la fois.
export function buyAcc(save, id, shards) {
  const p = petsOf(save);
  if (p.acc[id] || shards < ACCESSORIES[id].cost) return false;
  p.acc[id] = 1; return true;
}
export function wear(save, pet, id) {
  const p = petsOf(save);
  for (const x of p.list) if (x.acc === id) x.acc = null;
  if (id && p.acc[id]) pet.acc = id; else pet.acc = null;
}
// Relâcher un familier : il rend des éclats (la forge s'en sert).
export const releaseShards = pet => 5 * (pet.rar + 1) * (pet.stage + 1) * (pet.gold ? 3 : 1);

// Ce que les familiers apportent à l'expédition : le familier actif et les bonus du nid.
export function applyPets(stats, save) {
  const p = petsOf(save);
  const act = petById(save, p.active);
  stats.pet = act && act.stage ? { sp: act.sp, rar: act.rar, stage: act.stage, gold: !!act.gold, power: petPower(act), name: act.name || SPECIES[act.sp].name } : null;
  let gold = 0, dmg = 0;
  for (const uid of p.nest.slice(0, nestSlots(save))) {
    const pet = petById(save, uid);
    if (!pet || !pet.stage || uid === p.active || p.scout.includes(uid)) continue;
    if (SPECIES[pet.sp].passive === 'gold') gold += nestBonus(pet); else dmg += nestBonus(pet);
  }
  stats.petGold = 1 + gold + collectionBonus(save); stats.petDmg = 1 + dmg;
  if (stats.pet) stats.pet.acc = act.acc || null;
  return stats;
}
