// Curiosités : cartes de créatures, boutique du vieux crapaud, quêtes et donjons.
// Les données (save.curio) et les règles sont ici ; l'onglet « Curiosités » de l'Atelier aussi.
import { ENEMIES, ZONES, LEVELS, levelZone, HERO_ORDER, TIERS } from './data.js';

// ---------- Cartes ----------
// Une carte par créature. Son effet dépend de la créature ; chaque étoile ajoute la même valeur.
const FX = {
  gold: [3, v => `Butin +${v} %`], dmg: [4, v => `Dégâts +${v} %`], boss: [6, v => `Dégâts aux boss +${v} %`],
  event: [6, v => `Événements +${v} %`], time: [1, v => `+${v} s par expédition`], glove: [4, v => `Gant +${v} %`],
  goldWisp: [8, v => `Feux follets dorés +${v} %`], tear: [5, v => `Déchirure +${v} %`], crit: [1.5, v => `Critiques +${v} %`],
};
const FX_ORDER = ['gold', 'dmg', 'glove', 'boss', 'goldWisp', 'event', 'tear', 'crit', 'time'];
export const CARD_IDS = Object.keys(ENEMIES).filter(k => k !== 'boss');
export const cardFx = id => FX_ORDER[CARD_IDS.indexOf(id) % FX_ORDER.length];
export const cardValue = (id, stars) => Math.round(FX[cardFx(id)][0] * stars * 10) / 10;
export const cardText = (id, stars) => FX[cardFx(id)][1](String(cardValue(id, stars)).replace('.', ','));
export const STAR_MAX = 5;
export const CARD_DROP = 0.004;   // par ennemi vaincu (élites ×5), 3 cartes au plus par expédition

export function curioOf(save) {
  if (!save.curio) save.curio = { cards: {}, eq: [], shop: { day: -1, stock: [], sold: [] }, active: [], quests: [], keys: 0, news: 0, dungeons: 0 };
  return save.curio;
}
export const cardSlots = level => 1 + ((level && level.slot) || 0);

// Ajoute les cartes trouvées. Doublons : +1 étoile avec le Grand album, sinon 2 éclats.
export function addCards(save, ids, gearOf) {
  const c = curioOf(save), out = [];
  for (const id of ids) {
    const have = c.cards[id];
    if (!have) { c.cards[id] = { stars: 1 }; c.news++; out.push({ id, isNew: true, stars: 1 }); }
    else if (save.level.slot2 > 0 && have.stars < STAR_MAX) { have.stars++; out.push({ id, up: true, stars: have.stars }); }
    else { gearOf(save).shards += 2; out.push({ id, shards: 2, stars: have.stars }); }
  }
  // place libre : la carte s'équipe toute seule
  for (const o of out) if (o.isNew && c.eq.length < cardSlots(save.level)) c.eq.push(o.id);
  return out;
}

// Bonus des cartes équipées et des potions actives, ajoutés au bonus d'équipement.
export function curioBonus(save, out) {
  const c = save.curio;
  if (!c) return out;
  const addAll = (st, v) => { for (const k of HERO_ORDER) out[st][k] = (out[st][k] || 0) + v; };
  for (const id of c.eq.slice(0, cardSlots(save.level))) {
    const cd = c.cards[id]; if (!cd) continue;
    const fx = cardFx(id), v = cardValue(id, cd.stars);
    if (fx === 'dmg' || fx === 'boss' || fx === 'crit') addAll(fx, v); else out[fx] = (out[fx] || 0) + v;
  }
  for (const p of c.active) {
    const P = POTIONS[p]; if (!P) continue;
    if (P.all) addAll(P.all[0], P.all[1]); else if (P.st) out[P.st[0]] = (out[P.st[0]] || 0) + P.st[1];
  }
  return out;
}
export const extraEvents = save => (save.curio && save.curio.active.includes('bait')) ? 1 : 0;

// ---------- Boutique ----------
// Potions et appâts : ils agissent sur la prochaine expédition seulement.
export const POTIONS = {
  fury: { name: 'Potion de rage', text: 'Dégâts +50 % pour la prochaine expédition', all: ['dmg', 50], k: 0.35, ico: '#e8743b' },
  haste: { name: 'Sablier de poche', text: '+15 s pour la prochaine expédition', st: ['time', 15], k: 0.3, ico: '#e7d3a1' },
  gold: { name: 'Élixir doré', text: 'Butin +40 % pour la prochaine expédition', st: ['gold', 40], k: 0.4, ico: '#ffd246' },
  lure: { name: 'Appât à follets', text: 'Deux fois plus de feux follets dorés', st: ['goldWisp', 100], k: 0.25, ico: '#ffe14a' },
  bait: { name: 'Appât à surprises', text: 'Un événement de plus pendant la prochaine expédition', k: 0.3, ico: '#7fd0ff' },
  oil: { name: 'Gant huilé', text: 'Gant +30 % pour la prochaine expédition', st: ['glove', 30], k: 0.2, ico: '#9bf06b' },
  slayer: { name: 'Huile du tueur', text: 'Dégâts aux boss +60 % pour la prochaine expédition', all: ['boss', 60], k: 0.3, ico: '#ff5e4d' },
};
export const RELIC = { name: 'Relique mystère', text: 'Un objet d\'équipement au hasard, rare au minimum', shards: 25 };
export const potionPrice = (save, id) => Math.max(40, Math.round((save.best || 0) * POTIONS[id].k / 10) * 10);
export function shopStock(save) {
  const c = curioOf(save), s = c.shop;
  if (s.day !== save.expeditions) {
    const ids = Object.keys(POTIONS).sort(() => Math.random() - 0.5);
    s.stock = ids.slice(0, Math.min(ids.length, 3 + (save.level.shelf || 0)));
    if (save.level.relics > 0) s.stock.push('relic');
    s.sold = []; s.day = save.expeditions;
  }
  return s.stock;
}

// ---------- Quêtes ----------
const lvName = i => LEVELS[i].name;
export const questSlots = level => (level.quests > 0 ? 1 + (level.quest2 || 0) : 0);
export function newQuest(save, open) {
  const lv = Math.max(0, Math.min(open, LEVELS.length - 1)), z = LEVELS[lv];
  const kinds = ['kills', 'tier', 'events', 'coins'];
  if ((save.bosses || {})[z.id] > 0 || (save.lairs || {})[z.id]) kinds.push('boss');
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const rewards = ['shards', 'card'];
  if (save.level.dungeon > 0) rewards.push('key', 'key');
  if (save.level.armory > 0) rewards.push('gear');
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  const q = { kind, lv, zone: z.id, prog: 0, reward };
  if (kind === 'kills') q.goal = 150 + 25 * lv;
  else if (kind === 'tier') q.goal = Math.min(3, 1 + Math.floor(lv / 4));
  else if (kind === 'events') q.goal = 3 + Math.floor(lv / 5);
  else if (kind === 'coins') { q.goal = Math.max(100, Math.round((save.best || 100) * 1.1)); q.zone = null; }
  else q.goal = 1;
  return q;
}
export function questText(q) {
  const where = q.zone ? ` (${lvName(q.lv)})` : '';
  const T = {
    kills: () => `Vaincs ${q.goal} ennemis${where}`,
    tier: () => `Remplis le sac jusqu'au palier ${TIERS[q.goal].name.replace(/^Sac (de |d'|en )/, '')}${where}`,
    events: () => `Réussis ${q.goal} événements${where}`,
    coins: () => `Gagne ${q.goal} pièces en une expédition`,
    boss: () => `Bats ${levelZone(q.lv).boss.name}${where}`,
  };
  return T[q.kind]();
}
export const REWARD_TEXT = { shards: 'éclats', card: 'une carte', key: 'une clé de donjon', gear: 'une besace rare' };
export function fillQuests(save, open) {
  const c = curioOf(save), n = questSlots(save.level);
  while (c.quests.length < n) c.quests.push(newQuest(save, open));
  if (c.quests.length > n) c.quests.length = n;
}
// Fin d'expédition : avance les quêtes ; renvoie celles qui sont accomplies.
export function progressQuests(save, info) {
  const c = curioOf(save), done = [];
  for (const q of c.quests) {
    if (q.zone && q.zone !== info.zone) continue;
    if (q.kind === 'kills') q.prog += info.kills;
    else if (q.kind === 'events') q.prog += info.events;
    else if (q.kind === 'tier') q.prog = Math.max(q.prog, info.lairOnly ? 0 : info.tier);
    else if (q.kind === 'coins') q.prog = Math.max(q.prog, info.gained);
    else if (q.kind === 'boss' && info.boss) q.prog = 1;
    if (q.prog >= q.goal) done.push(q);
  }
  c.quests = c.quests.filter(q => !done.includes(q));
  return done;
}

// ---------- Donjons ----------
// Une clé = une tentative de 2 minutes contre un gardien taillé dans la créature costaude de la région.
const DMECH = ['fire', 'guards', 'copies', 'armor', 'dash', 'spores', 'quake'];
export function dungeonZone(base) {
  const tough = Object.keys(base.spawn).find(k => ENEMIES[k].role === 'tough') || 'golem', T = ENEMIES[tough];
  const mech = DMECH[Math.floor(Math.random() * DMECH.length)];
  return { ...base, id: 'donjon', dungeon: true,
    boss: { ...base.boss, name: 'Gardien : ' + T.name, lair: 'Donjon ' + (base.levelName || base.name).replace(/^(Les |Le |La )/, ''), hp: base.boss.hp * 0.7, value: base.boss.value * 2.5,
      mech, look: T.look || tough, tint: T.tint || T.color, color: T.color, duration: 120 } };
}
export { ZONES };
