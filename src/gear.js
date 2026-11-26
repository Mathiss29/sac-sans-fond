// Équipement de la Compagnie : objets, raretés, affinage des emplacements, recyclage en éclats.
// L'équipement appartient à la lignée (archers, mages…), pas à un héros : il survit aux changements de classe.
// L'affinage améliore l'EMPLACEMENT, pas l'objet : le bonus reste si on change d'objet.
import { HEROES, HERO_ORDER } from './data.js';

export const RARITIES = [
  { id: 'commune', name: 'Commune', color: '#c4c8b2', mult: 1, weight: 62, shards: 1 },
  { id: 'rare', name: 'Rare', color: '#5fb8ff', mult: 1.8, weight: 28, shards: 3 },
  { id: 'epique', name: 'Épique', color: '#c07aff', mult: 3, weight: 8, shards: 8 },
  { id: 'legendaire', name: 'Légendaire', color: '#ff9a3d', mult: 5, weight: 2, shards: 20 },
];

// Icônes : case de assets/sprites/icones/objets.png (voir tools/dessiner-objets.py)
export const GEAR_ICONS = ['bow', 'staff', 'blade', 'lyre', 'ring', 'feather', 'moon', 'purse', 'seal', 'anvil', 'shard', 'satchel'];

// Armes : trois modèles par lignée, chacun avec un nom par rareté. Effet principal : dégâts de la lignée.
// icon : case de objets.png (sinon icône de l'arbre). bonus : petit effet en plus, propre au modèle.
export const WEAPONS = {
  archer: [
    { icon: 'bow', names: ['Arc de frêne', 'Arc de chasse', 'Arc du faucon', 'Arc des tempêtes'] },
    { icon: 'quiver', names: ['Carquois de cuir', 'Carquois du pisteur', 'Carquois sans fin', 'Carquois de l\'aurore'], bonus: ['rate', 0.4] },
    { icon: 'arrow', names: ['Flèches de bouleau', 'Flèches barbelées', 'Flèches d\'argent', 'Flèches du zénith'], bonus: ['crit', 0.15] },
  ],
  mage: [
    { icon: 'staff', names: ['Bâton de saule', 'Bâton de givre', 'Sceptre d\'hiver', 'Bâton du blizzard'] },
    { icon: 'crystal', names: ['Cristal fêlé', 'Cristal de glace', 'Cœur de l\'hiver', 'Prisme éternel'], bonus: ['range', 0.4] },
    { icon: 'firewisp', names: ['Orbe tiède', 'Orbe de braise', 'Orbe du foyer', 'Orbe du phénix'], bonus: ['boss', 1] },
  ],
  knight: [
    { icon: 'blade', names: ['Épée de fer', 'Lame trempée', 'Épée du rempart', 'Lame de l\'aube'] },
    { icon: 'sword', names: ['Épée longue', 'Épée du sergent', 'Épée du champion', 'Épée des rois'], bonus: ['critDmg', 1] },
    { icon: 'glove', names: ['Gantelet cabossé', 'Gantelet d\'acier', 'Poing du bastion', 'Poing du titan'], bonus: ['rate', 0.4] },
  ],
  bard: [
    { icon: 'lyre', names: ['Lyre de bois', 'Lyre dorée', 'Lyre des vents', 'Lyre des astres'] },
    { icon: 'lute', names: ['Luth de voyage', 'Luth du ménestrel', 'Luth enchanté', 'Luth des légendes'], bonus: ['rate', 0.4] },
    { icon: 'horn', names: ['Cor de berger', 'Cor de chasse', 'Cor de guerre', 'Cor du dernier roi'], bonus: ['boss', 1] },
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
};
export const GLOBAL_STATS = ['gold', 'drop', 'time', 'glove'];
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
  glovecharm: { icon: 'coinclock', stat: 'glove', per: 3, names: ['Pièce porte-bonheur', 'Pièce aimantée', 'Pièce du collecteur', 'Pièce du roi avare'] },
};
export const CHARM_KINDS = ['ring', 'feather', 'moon', 'skull', 'eye', 'seal', 'purse', 'satchel', 'hourglass', 'glovecharm'];
export const SLOTS = [
  { id: 'weapon', name: 'Arme', node: 'armory' },
  { id: 'charm1', name: 'Charme', node: 'charm1' },
  { id: 'charm2', name: 'Charme', node: 'charm2' },
];
export const RESERVE = 30;          // places dans la réserve
export const REFINE_MAX = 15;
export const DROP = { chance: 0.005, gold: 0.08, event: 0.6, perRun: 4 };

export function freshGear() {
  return { inv: [], eq: {}, ref: {}, pity: {}, shards: 0, next: 1, news: 0 };
}
export function gearOf(save) {
  if (!save.gear) save.gear = freshGear();
  const g = save.gear;
  for (const k of HERO_ORDER) { g.eq[k] = g.eq[k] || {}; g.ref[k] = g.ref[k] || {}; }
  return g;
}

const model = it => WEAPONS[it.line][it.model || 0];
export const itemName = it => it.kind === 'weapon' ? model(it).names[it.rarity] : KINDS[it.kind].names[it.rarity];
export const itemIcon = it => it.kind === 'weapon' ? model(it).icon : KINDS[it.kind].icon;
export const CATALOG_SIZE = (Object.values(WEAPONS).reduce((t, l) => t + l.length, 0) + CHARM_KINDS.length) * RARITIES.length;
export const itemSlotKind = it => it.kind === 'weapon' ? 'weapon' : 'charm';
// effets de l'objet : [[stat, valeur]], multipliés par l'affinage de l'emplacement
const round = v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
export function itemEffects(it, refine = 0) {
  const k = KINDS[it.kind], m = it.power / 10 * (1 + 0.1 * refine);
  const out = [[k.stat, round(k.per * m)]];
  const bo = it.kind === 'weapon' && model(it).bonus;
  if (bo) out.push([bo[0], round(KINDS[CHARM_KINDS.find(c => KINDS[c].stat === bo[0])].per * bo[1] * m)]);
  return out;
}
export const itemValue = (it, refine = 0) => itemEffects(it, refine)[0][1];
export const itemText = (it, refine = 0) => itemEffects(it, refine).map(([st, v]) => STAT_TEXT[st](String(v).replace('.', ','))).join(' · ');

// Tirage d'un objet. ctx = { lines: lignées possédées, charms: charmes débloqués, ilvl }
export function rollItem(ctx, id, rnd = Math.random) {
  let w = rnd() * RARITIES.reduce((t, r) => t + r.weight, 0), rarity = 0;
  for (let i = 0; i < RARITIES.length; i++) { w -= RARITIES[i].weight; if (w <= 0) { rarity = i; break; } }
  const lines = ctx.lines.length ? ctx.lines : ['archer'];
  const weapon = !ctx.charms || rnd() < 0.5;
  const power = Math.max(1, Math.round(10 * RARITIES[rarity].mult * (1 + 0.2 * (ctx.ilvl || 0)) * (0.9 + 0.2 * rnd())));
  if (weapon) { const line = lines[Math.floor(rnd() * lines.length)]; return { id, kind: 'weapon', line, model: Math.floor(rnd() * WEAPONS[line].length), rarity, power }; }
  return { id, kind: CHARM_KINDS[Math.floor(rnd() * CHARM_KINDS.length)], rarity, power };
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
export function gearBonus(gear, level) {
  const out = { dmg: {}, rate: {}, crit: {}, critDmg: {}, range: {}, boss: {}, gold: 0, drop: 0, time: 0, glove: 0 };
  if (!gear || !(level.armory > 0)) return out;
  for (const k of HERO_ORDER) {
    for (const s of SLOTS) {
      if (!(level[s.node] > 0)) continue;
      const it = gear.eq[k] && gear.eq[k][s.id];
      if (!it) continue;
      for (const [st, v] of itemEffects(it, (gear.ref[k] || {})[s.id] || 0)) {
        if (GLOBAL_STATS.includes(st)) out[st] += v;
        else out[st][k] = (out[st][k] || 0) + v;
      }
    }
  }
  return out;
}
export const lineName = k => HEROES[k].plural;
