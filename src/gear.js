// Équipement de la Compagnie : objets, raretés, affinage des emplacements, recyclage en éclats.
// L'équipement appartient à la lignée (archers, mages…), pas à un héros : il survit aux changements de classe.
// L'affinage améliore l'EMPLACEMENT, pas l'objet : le bonus reste si on change d'objet.
import { HEROES, HERO_ORDER } from './data.js';

export const RARITIES = [
  { id: 'commune', name: 'Commune', color: '#c4c8b2', mult: 1, weight: 62, shards: 1 },
  { id: 'rare', name: 'Rare', color: '#5fb8ff', mult: 1.8, weight: 28, shards: 3 },
  { id: 'epique', name: 'Épique', color: '#c07aff', mult: 3, weight: 8, shards: 8 },
  { id: 'legendaire', name: 'Légendaire', color: '#ff9a3d', mult: 5, weight: 2, shards: 20 },
  // mythique : seulement après 2 victoires contre un boss ; porte un effet unique (voir MYTHS)
  { id: 'mythique', name: 'Mythique', color: '#ff4a5a', mult: 7, weight: 0.5, shards: 50 },
];
export const MYTHIC = 4;

// Effets uniques des objets mythiques. line : arme de cette lignée ; sinon charme (pour toute la compagnie)
export const MYTHS = {
  bounce: { line: 'archer', title: 'Ricochet', text: 'Chaque flèche rebondit sur un ennemi de plus' },
  shatter: { line: 'mage', title: 'Éclatement', text: 'Les ennemis tués par le givre explosent en éclats glacés' },
  quake: { line: 'knight', title: 'Séisme', text: '1 coup sur 4 lance une onde de choc qui frappe tout autour' },
  echo: { line: 'bard', title: 'Écho', text: '1 note sur 3 est rejouée aussitôt, sur une autre cible' },
  midas: { title: 'Toucher de Midas', text: '5 % des ennemis meurent en lâchant ×5 de pièces' },
  hourglass: { title: 'Temps volé', text: 'Chaque besace ramassée ajoute 2 s à l\'expédition' },
};
const CHARM_MYTHS = ['midas', 'hourglass'];

// Ensembles : l'arme et deux charmes d'une même famille, portés par la même lignée
export const SETS = {
  tempete: { name: 'Tempête', line: 'archer', weapon: 0, charms: ['feather', 'bracelet'],
    b2: ['rate', 12], b3: ['dmg', 30] },
  hiver: { name: 'Hiver éternel', line: 'mage', weapon: 0, charms: ['moon', 'tear'],
    b2: ['crit', 5], b3: ['dmg', 30] },
  rempart: { name: 'Rempart', line: 'knight', weapon: 0, charms: ['seal', 'totem'],
    b2: ['boss', 20], b3: ['dmg', 30] },
  fete: { name: 'Grande fête', line: 'bard', weapon: 0, charms: ['bell', 'mask'],
    b2: ['rate', 15], b3: ['gold', 20] },
};
export function setOf(it, line) {
  for (const [id, st] of Object.entries(SETS)) {
    if (it.kind === 'weapon' ? (it.line === st.line && (it.model || 0) === st.weapon) : st.charms.includes(it.kind) && (!line || line === st.line)) return id;
  }
  return null;
}
// pièces d'ensemble portées par une lignée
export function setCount(gear, k, setId, level = {}) {
  const st = SETS[setId]; if (st.line !== k) return 0;
  let n = 0;
  for (const s of SLOTS) { const it = gear.eq[k] && gear.eq[k][s.id]; if (it && (level[s.node] > 0 || !Object.keys(level).length) && setOf(it, k) === setId) n++; }
  return n;
}

// Icônes : case de assets/sprites/icones/objets.png (voir tools/dessiner-objets.py)
// planche 1 (ChatGPT, 6×4) ; la planche 2 viendra à la suite (cases 24 à 47)
export const GEAR_ICONS = ['bow', 'quiver', 'arrows', 'staff', 'crystal', 'orb', 'blade', 'sword', 'gauntlet', 'lyre', 'lute', 'horn',
  'ring', 'feather', 'moon', 'skull', 'eye', 'seal', 'purse', 'satchel', 'hourglass', 'coin', 'anvil', 'shard',
  'crossbow', 'elvenbow', 'knives', 'grimoire', 'wand', 'skullstaff', 'axe', 'mace', 'spear', 'drum', 'flute', 'tambourine',
  'clover', 'candle', 'bell', 'compass', 'rune', 'fang', 'totem', 'tear', 'mask', 'bracelet', 'egg', 'potion'];
// en attendant la planche 2 : icône la plus proche
export const ICON_FALLBACK = { crossbow: 'bow', elvenbow: 'bow', knives: 'arrows', grimoire: 'staff', wand: 'staff', skullstaff: 'skull',
  axe: 'blade', mace: 'gauntlet', spear: 'sword', drum: 'horn', flute: 'lute', tambourine: 'lyre',
  clover: 'coin', candle: 'hourglass', bell: 'horn', compass: 'eye', rune: 'shard', fang: 'skull', totem: 'skull', tear: 'crystal',
  mask: 'skull', bracelet: 'ring', egg: 'orb', potion: 'crystal' };

// Armes : trois modèles par lignée, chacun avec un nom par rareté. Effet principal : dégâts de la lignée.
// icon : case de objets.png (sinon icône de l'arbre). bonus : petit effet en plus, propre au modèle.
export const WEAPONS = {
  archer: [
    { icon: 'bow', names: ['Arc de frêne', 'Arc de chasse', 'Arc du faucon', 'Arc des tempêtes'] },
    { icon: 'quiver', names: ['Carquois de cuir', 'Carquois du pisteur', 'Carquois sans fin', 'Carquois de l\'aurore'], bonus: ['rate', 0.4] },
    { icon: 'arrows', names: ['Flèches de bouleau', 'Flèches barbelées', 'Flèches d\'argent', 'Flèches du zénith'], bonus: ['crit', 0.15] },
    { icon: 'crossbow', names: ['Arbalète de chêne', 'Arbalète à cric', 'Arbalète du siège', 'Arbalète du jugement'], bonus: ['boss', 0.8] },
    { icon: 'elvenbow', names: ['Arc de lierre', 'Arc sylvain', 'Arc de la clairière', 'Arc du Vieux Chêne'], bonus: ['range', 0.5] },
    { icon: 'knives', names: ['Dagues de lancer', 'Dagues du rôdeur', 'Dagues jumelles', 'Dagues de l\'ombre'], bonus: ['critDmg', 0.8] },
  ],
  mage: [
    { icon: 'staff', names: ['Bâton de saule', 'Bâton de givre', 'Sceptre d\'hiver', 'Bâton du blizzard'] },
    { icon: 'crystal', names: ['Cristal fêlé', 'Cristal de glace', 'Cœur de l\'hiver', 'Prisme éternel'], bonus: ['range', 0.4] },
    { icon: 'orb', names: ['Orbe tiède', 'Orbe de braise', 'Orbe du foyer', 'Orbe du phénix'], bonus: ['boss', 1] },
    { icon: 'grimoire', names: ['Grimoire usé', 'Grimoire du givre', 'Codex des glaces', 'Livre du premier hiver'], bonus: ['aoe', 0.6] },
    { icon: 'wand', names: ['Baguette de houx', 'Baguette d\'argent', 'Baguette astrale', 'Baguette des fées'], bonus: ['rate', 0.5] },
    { icon: 'skullstaff', names: ['Bâton d\'os', 'Bâton du nécromant', 'Bâton des âmes', 'Bâton du roi-liche'], bonus: ['crit', 0.2] },
  ],
  knight: [
    { icon: 'blade', names: ['Épée de fer', 'Lame trempée', 'Épée du rempart', 'Lame de l\'aube'] },
    { icon: 'sword', names: ['Épée longue', 'Épée du sergent', 'Épée du champion', 'Épée des rois'], bonus: ['critDmg', 1] },
    { icon: 'gauntlet', names: ['Gantelet cabossé', 'Gantelet d\'acier', 'Poing du bastion', 'Poing du titan'], bonus: ['rate', 0.4] },
    { icon: 'axe', names: ['Hache de bûcheron', 'Hache de guerre', 'Hache du berserker', 'Hache des tempêtes'], bonus: ['aoe', 0.6] },
    { icon: 'mace', names: ['Masse cloutée', 'Masse d\'armes', 'Masse du croisé', 'Masse du jugement'], bonus: ['boss', 0.8] },
    { icon: 'spear', names: ['Lance de milicien', 'Lance du garde', 'Lance du dragon', 'Lance céleste'], bonus: ['range', 0.6] },
  ],
  bard: [
    { icon: 'lyre', names: ['Lyre de bois', 'Lyre dorée', 'Lyre des vents', 'Lyre des astres'] },
    { icon: 'lute', names: ['Luth de voyage', 'Luth du ménestrel', 'Luth enchanté', 'Luth des légendes'], bonus: ['rate', 0.4] },
    { icon: 'horn', names: ['Cor de berger', 'Cor de chasse', 'Cor de guerre', 'Cor du dernier roi'], bonus: ['boss', 1] },
    { icon: 'drum', names: ['Tambour de peau', 'Tambour de marche', 'Tambour de guerre', 'Tambour du tonnerre'], bonus: ['aoe', 0.6] },
    { icon: 'flute', names: ['Flûte de roseau', 'Flûte d\'argent', 'Flûte enchantée', 'Flûte du pâtre céleste'], bonus: ['crit', 0.2] },
    { icon: 'tambourine', names: ['Tambourin', 'Tambourin à grelots', 'Tambourin des fêtes', 'Tambourin du carnaval'], bonus: ['gold', 0.5] },
  ],
};
// stat : dmg (dégâts de la lignée), rate (cadence), crit (points de chance), critDmg (dégâts critiques), range (portée),
// boss (dégâts aux boss) ; pour toute la compagnie : gold (valeur du butin), drop (besaces), time (secondes), glove (rayon du gant)
// per : effet pour 10 de puissance
export const STAT_TEXT = {
  dmg: v => `+${v} % de dégâts`, rate: v => `+${v} % de cadence`, crit: v => `+${v} % de chance de critique`,
  critDmg: v => `+${v} % de dégâts critiques`, range: v => `+${v} % de portée`, boss: v => `+${v} % de dégâts aux boss`,
  gold: v => `+${v} % de valeur du butin (compagnie)`, drop: v => `+${v} % de besaces (compagnie)`,
  time: v => `+${v} s par expédition (compagnie)`, glove: v => `+${v} % de rayon du gant (compagnie)`,
  goldWisp: v => `+${v} % de feux follets dorés (compagnie)`, focus: v => `+${v} s de Focus (compagnie)`,
  tear: v => `+${v} % de butin à la Déchirure (compagnie)`, event: v => `+${v} % de butin des événements (compagnie)`,
  coinLife: v => `+${v} s de pièces au sol (compagnie)`, aoe: v => `+${v} % de zone d'attaque (compagnie)`,
  stun: v => `−${v} % d'étourdissement (compagnie)`,
};
export const GLOBAL_STATS = ['gold', 'drop', 'time', 'glove', 'goldWisp', 'focus', 'tear', 'event', 'coinLife', 'aoe', 'stun'];
// effet de chaque stat pour 10 de puissance (sert aussi aux effets secondaires)
export const STAT_PER = { dmg: 6, rate: 4, crit: 2, critDmg: 10, range: 4, boss: 10, gold: 3, drop: 8, time: 0.8, glove: 3,
  goldWisp: 15, focus: 0.5, tear: 6, event: 8, coinLife: 0.6, aoe: 6, stun: 8 };
export const KINDS = {
  weapon: { stat: 'dmg', per: 10 },
  ring: { icon: 'ring', stat: 'dmg', per: 6, names: ['Anneau de cuivre', 'Anneau de braise', 'Anneau du brasier', 'Anneau du soleil noir'] },
  feather: { icon: 'feather', stat: 'rate', per: 4, names: ['Plume de pie', 'Plume de vent', 'Plume de griffon', 'Plume du roc'] },
  moon: { icon: 'moon', stat: 'crit', per: 2, names: ['Pierre laiteuse', 'Pierre de lune', 'Larme de lune', 'Œil de la nuit'] },
  skull: { icon: 'skull', stat: 'critDmg', per: 10, names: ['Crâne de rat', 'Crâne de loup', 'Crâne de troll', 'Crâne du dragon'] },
  eye: { icon: 'eye', stat: 'range', per: 4, names: ['Œil de verre', 'Œil de faucon', 'Œil d\'aigle', 'Œil du guetteur'] },
  seal: { icon: 'seal', stat: 'boss', per: 10, names: ['Sceau de cire', 'Sceau du chasseur', 'Sceau du tueur de géants', 'Sceau des primordiaux'] },
  purse: { icon: 'purse', stat: 'gold', per: 3, names: ['Bourse rapiécée', 'Bourse brodée', 'Bourse du marchand', 'Bourse sans fond'] },
  satchel: { icon: 'satchel', stat: 'drop', per: 8, names: ['Besace usée', 'Besace du pisteur', 'Besace du pillard', 'Besace du dragon'] },
  hourglass: { icon: 'hourglass', stat: 'time', per: 0.8, names: ['Sablier fêlé', 'Sablier de poche', 'Sablier d\'argent', 'Sablier du temps'] },
  glovecharm: { icon: 'coin', stat: 'glove', per: 3, names: ['Pièce porte-bonheur', 'Pièce aimantée', 'Pièce du collecteur', 'Pièce du roi avare'] },
  clover: { icon: 'clover', stat: 'goldWisp', per: 15, names: ['Trèfle séché', 'Trèfle à quatre feuilles', 'Trèfle doré', 'Trèfle des fées'] },
  candle: { icon: 'candle', stat: 'focus', per: 0.5, names: ['Bout de chandelle', 'Bougie de cire', 'Cierge du veilleur', 'Flamme éternelle'] },
  bell: { icon: 'bell', stat: 'tear', per: 6, names: ['Grelot fêlé', 'Clochette d\'argent', 'Cloche du sonneur', 'Cloche de l\'aurore'] },
  compass: { icon: 'compass', stat: 'event', per: 8, names: ['Boussole rouillée', 'Boussole du pisteur', 'Boussole du chasseur', 'Boussole des trésors'] },
  rune: { icon: 'rune', stat: 'aoe', per: 6, names: ['Rune ébréchée', 'Rune gravée', 'Rune de puissance', 'Rune primordiale'] },
  fang: { icon: 'fang', stat: 'dmg', per: 4, bonus: ['crit', 0.6], names: ['Croc de rat', 'Croc de loup', 'Croc de wyverne', 'Croc du grand dragon'] },
  totem: { icon: 'totem', stat: 'stun', per: 8, names: ['Totem de bois', 'Totem de pierre', 'Totem du chaman', 'Totem des ancêtres'] },
  tear: { icon: 'tear', stat: 'coinLife', per: 0.6, names: ['Larme de verre', 'Larme de sirène', 'Larme de phénix', 'Larme d\'étoile'] },
  mask: { icon: 'mask', stat: 'critDmg', per: 7, bonus: ['crit', 0.6], names: ['Masque de chiffon', 'Masque du bouffon', 'Masque du carnaval', 'Masque du roi-fou'] },
  bracelet: { icon: 'bracelet', stat: 'rate', per: 3, bonus: ['range', 0.6], names: ['Bracelet de corde', 'Bracelet de perles', 'Bracelet d\'argent', 'Bracelet des vents'] },
  egg: { icon: 'egg', stat: 'dmg', per: 4, bonus: ['boss', 0.6], names: ['Œuf de caille', 'Œuf de griffon', 'Œuf de wyverne', 'Œuf de dragon'] },
  potion: { icon: 'potion', stat: 'gold', per: 2, bonus: ['drop', 0.6], names: ['Fiole trouble', 'Potion de chance', 'Élixir du marchand', 'Élixir du roi'] },
};
// Trophées : un charme unique lâché par chaque boss la première fois qu'on le bat (légendaire, jamais tiré au hasard)
export const TROPHY_RARITY = 3;
const trophy = (icon, name, stat, per, bonus) => ({ icon, stat, per, bonus, trophy: true, names: [name, name, name, name, name] });
Object.assign(KINDS, {
  tr_clairiere: trophy('crystal', 'Cœur du Brasier', 'dmg', 6, ['boss', 0.8]),
  tr_marais: trophy('clover', 'Couronne de nénuphar', 'gold', 3, ['drop', 0.8]),
  tr_automne: trophy('blade', 'Faux rouillée', 'critDmg', 10, ['crit', 0.8]),
  tr_gel: trophy('fang', 'Croc du Yéti', 'stun', 8, ['dmg', 0.6]),
  tr_desert: trophy('shard', 'Dard de cuivre', 'crit', 2, ['critDmg', 0.8]),
  tr_grotte: trophy('crystal', 'Cœur de géode', 'aoe', 6, ['dmg', 0.6]),
  tr_lumi: trophy('potion', 'Spore royale', 'goldWisp', 15, ['gold', 0.6]),
  tr_enfers: trophy('sword', 'Lame ardente', 'dmg', 6, ['rate', 0.6]),
  tr_ciel: trophy('feather', 'Plume tempête', 'rate', 4, ['range', 0.8]),
  tr_neant: trophy('rune', 'Fil du sac sans fond', 'time', 0.8, ['tear', 0.8]),
});
export const CHARM_KINDS = ['ring', 'feather', 'moon', 'skull', 'eye', 'seal', 'purse', 'satchel', 'hourglass', 'glovecharm',
  'clover', 'candle', 'bell', 'compass', 'rune', 'fang', 'totem', 'tear', 'mask', 'bracelet', 'egg', 'potion'];
export const SLOTS = [
  { id: 'weapon', name: 'Arme', node: 'armory' },
  { id: 'charm1', name: 'Charme', node: 'charm1' },
  { id: 'charm2', name: 'Charme', node: 'charm2' },
];
export const RESERVE = 30;          // places dans la réserve (+10 par niveau du Coffre de l'armurier)
export const reserveSize = level => RESERVE + 10 * ((level && level.chest) || 0);
// Relance de l'effet secondaire : effets possibles, coût en éclats
export const ALT_STATS = { weapon: ['rate', 'crit', 'critDmg', 'range', 'boss', 'aoe', 'gold', 'drop'],
  charm: ['dmg', 'rate', 'crit', 'critDmg', 'range', 'boss', 'gold', 'drop', 'goldWisp', 'tear', 'event', 'aoe'] };
export const rerollCost = it => Math.ceil(4 * (it.rarity + 1) * (1 + 0.5 * (it.rerolls || 0)));
export function rerollAlt(it, rnd = Math.random) {
  const main = KINDS[it.kind].stat, cur = it.alt ? it.alt[0] : null;
  const pool = ALT_STATS[it.kind === 'weapon' ? 'weapon' : 'charm'].filter(st => st !== main && st !== cur);
  it.alt = [pool[Math.floor(rnd() * pool.length)], Math.round((0.3 + 0.5 * rnd()) * 100) / 100];
  it.rerolls = (it.rerolls || 0) + 1;
  return it;
}
export const REFINE_MAX = 15;
export const DROP = { chance: 0.005, gold: 0.08, event: 0.6, perRun: 4 };

export function freshGear() {
  return { inv: [], eq: {}, ref: {}, pity: {}, shards: 0, next: 1, news: 0 };
}
export function gearOf(save) {
  if (!save.gear) save.gear = freshGear();
  const g = save.gear;
  for (const k of HERO_ORDER) { g.eq[k] = g.eq[k] || {}; g.ref[k] = g.ref[k] || {}; }
  if (!g.found) {   // album : tout ce qu'on possède déjà compte comme découvert
    g.found = {};
    for (const it of g.inv) g.found[albumKey(it)] = 1;
    for (const k of HERO_ORDER) for (const s of SLOTS) if (g.eq[k][s.id]) g.found[albumKey(g.eq[k][s.id])] = 1;
  }
  return g;
}

const model = it => WEAPONS[it.line][it.model || 0];
export const itemName = it => (it.kind === 'weapon' ? model(it).names : KINDS[it.kind].names)[Math.min(3, it.rarity)];
export const itemIcon = it => it.kind === 'weapon' ? model(it).icon : KINDS[it.kind].icon;
export const CATALOG_SIZE = (Object.values(WEAPONS).reduce((t, l) => t + l.length, 0) + CHARM_KINDS.length) * RARITIES.length;
// clé d'album : un modèle dans une rareté
export const albumKey = it => it.kind === 'weapon' ? `w:${it.line}:${it.model || 0}:${it.rarity}` : `c:${it.kind}:${it.rarity}`;
export const ALBUM_STEP = 10;          // une récompense tous les 10 objets découverts
export const albumBonus = n => 2 * Math.floor(n / ALBUM_STEP);   // % de dégâts pour toute la compagnie
export const itemSlotKind = it => it.kind === 'weapon' ? 'weapon' : 'charm';
// effets de l'objet : [[stat, valeur]], multipliés par l'affinage de l'emplacement
const round = v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
export function itemEffects(it, refine = 0) {
  const k = KINDS[it.kind], m = it.power / 10 * (1 + 0.1 * refine);
  const out = [[k.stat, round(k.per * m)]];
  const bo = it.alt || (it.kind === 'weapon' ? model(it).bonus : k.bonus);
  if (bo) out.push([bo[0], round(STAT_PER[bo[0]] * bo[1] * m)]);
  return out;
}
export const itemValue = (it, refine = 0) => itemEffects(it, refine)[0][1];
export const itemText = (it, refine = 0) => itemEffects(it, refine).map(([st, v]) => STAT_TEXT[st](String(v).replace('.', ','))).join(' · ');
export const mythText = it => it.myth ? `✦ ${MYTHS[it.myth].title} : ${MYTHS[it.myth].text}` : '';

// Tirage d'un objet. ctx = { lines: lignées possédées, charms: charmes débloqués, ilvl, mythic: mythique possible }
// minRarity : rareté minimale (besace en or : épique ou mieux)
export function rollItem(ctx, id, rnd = Math.random, minRarity = 0) {
  const pool = RARITIES.map((r, i) => (i < minRarity || (i === MYTHIC && !ctx.mythic) ? 0 : r.weight));
  let w = rnd() * pool.reduce((t, x) => t + x, 0), rarity = minRarity;
  for (let i = 0; i < pool.length; i++) { if (!pool[i]) continue; w -= pool[i]; if (w <= 0) { rarity = i; break; } }
  const lines = ctx.lines.length ? ctx.lines : ['archer'];
  const weapon = !ctx.charms || rnd() < 0.5;
  const power = Math.max(1, Math.round(10 * RARITIES[rarity].mult * (1 + 0.2 * (ctx.ilvl || 0)) * (0.9 + 0.2 * rnd())));
  let it;
  if (weapon) { const line = lines[Math.floor(rnd() * lines.length)]; it = { id, kind: 'weapon', line, model: Math.floor(rnd() * WEAPONS[line].length), rarity, power }; }
  else it = { id, kind: CHARM_KINDS[Math.floor(rnd() * CHARM_KINDS.length)], rarity, power };
  if (rarity === MYTHIC) it.myth = weapon ? Object.keys(MYTHS).find(m => MYTHS[m].line === it.line) : CHARM_MYTHS[Math.floor(rnd() * CHARM_MYTHS.length)];
  return it;
}

// Objet équipé comparable : l'arme de la lignée, ou le plus faible des charmes
export function compareTo(gear, it) {
  if (it.kind === 'weapon') return gear.eq[it.line] && gear.eq[it.line].weapon || null;
  return null;
}
// « Meilleur ! » : plus puissant que l'arme équipée de sa lignée (ou emplacement vide)
export function isBetter(gear, it) {
  if (it.kind !== 'weapon') return false;
  const cur = compareTo(gear, it);
  return !cur || it.power > cur.power;
}

// Affinage d'un emplacement : prix, chance de réussite
export function refineCost(lv) {
  return { coins: Math.ceil(400 * Math.pow(1.65, lv)), shards: lv < 3 ? 0 : Math.ceil(2 * Math.pow(1.4, lv - 3)) };
}
export function refineChance(lv, bless = 0, pity = 0) {
  if (lv < 3) return 1;
  return Math.min(1, Math.max(0.3, 1 - 0.08 * (lv - 2)) + 0.04 * bless + pity);
}

// Bonus de l'équipement, pour computeStats. level : niveaux de l'arbre (emplacements débloqués)
// Apparence de l'arme en expédition : couleur des tirs et lueur du héros (rare et plus)
const SET_LOOK = { tempete: '120,205,255', hiver: '205,245,255', rempart: '255,214,110', fete: '255,140,210' };
export function weaponLook(it) {
  if (!it || it.rarity < 1) return null;
  const sid = setOf(it), hex = RARITIES[it.rarity].color;
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
  return { r: it.rarity, col: (sid && SET_LOOK[sid]) || rgb, glow: it.rarity >= 2, myth: it.rarity >= 4 };
}

// Défi de forge : titres permanents selon le meilleur affinage atteint (cumulatifs)
export const FORGE_TITLES = [
  { lv: 5, name: 'Apprenti forgeron', st: 'gold', v: 5 },
  { lv: 10, name: 'Maître forgeron', st: 'dmg', v: 5 },
  { lv: 15, name: 'Forgeron légendaire', st: 'critDmg', v: 25 },
];
export function forgeBest(gear) {
  let m = 0;
  for (const k in (gear && gear.ref) || {}) for (const s in gear.ref[k]) m = Math.max(m, gear.ref[k][s] || 0);
  return m;
}
export const forgeTitles = gear => FORGE_TITLES.filter(t => forgeBest(gear) >= t.lv);
export const forgeTitleText = t => STAT_TEXT[t.st](t.v).replace(' (compagnie)', '') + (GLOBAL_STATS.includes(t.st) ? '' : ' pour toute la compagnie');

export function gearBonus(gear, level) {
  const out = { dmg: {}, rate: {}, crit: {}, critDmg: {}, range: {}, boss: {}, gold: 0, drop: 0, time: 0, glove: 0, goldWisp: 0, focus: 0, tear: 0, event: 0, coinLife: 0, aoe: 0, stun: 0, myths: {}, looks: {} };
  if (!gear || !(level.armory > 0)) return out;
  const add = (st, v, k) => { if (GLOBAL_STATS.includes(st)) out[st] += v; else out[st][k] = (out[st][k] || 0) + v; };
  // ensembles
  for (const [id, st] of Object.entries(SETS)) {
    const n = setCount(gear, st.line, id, level);
    if (n >= 2) add(st.b2[0], st.b2[1], st.line);
    if (n >= 3) add(st.b3[0], st.b3[1], st.line);
  }
  // album : +2 % de dégâts pour tous, tous les 10 objets découverts
  const ab = albumBonus(Object.keys(gear.found || {}).length);
  if (ab) for (const k of HERO_ORDER) add('dmg', ab, k);
  for (const t of forgeTitles(gear)) {
    if (GLOBAL_STATS.includes(t.st)) add(t.st, t.v); else for (const k of HERO_ORDER) add(t.st, t.v, k);
  }
  for (const k of HERO_ORDER) {
    for (const s of SLOTS) {
      if (!(level[s.node] > 0)) continue;
      const it = gear.eq[k] && gear.eq[k][s.id];
      if (!it) continue;
      if (it.myth) out.myths[it.myth] = true;
      if (s.id === 'weapon') out.looks[k] = weaponLook(it);
      for (const [st, v] of itemEffects(it, (gear.ref[k] || {})[s.id] || 0)) add(st, v * (it.trophy ? 1 + 0.25 * (level.trophyRank || 0) : 1), k);
    }
  }
  return out;
}
export const lineName = k => HEROES[k].plural;
