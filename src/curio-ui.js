// Onglet « Curiosités » de l'Atelier : cartes, boutique du vieux crapaud, quêtes et donjon.
import { ENEMIES } from './data.js';
import { gearOf, rollItem } from './gear.js';
import { showView } from './company.js';
import { curioOf, CARD_IDS, cardText, cardSlots, STAR_MAX, POTIONS, RELIC, potionPrice, shopStock, questText, REWARD_TEXT, fillQuests } from './curio.js';

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let C = null, tab = null;
const L = id => (C.save.level[id] || 0);

export function initCurio(ctx) {
  C = ctx;
  const tabs = document.querySelector('#atelier .tabs');
  tab = h('button', 'tab', 'Curiosités'); tab.type = 'button'; tab.id = 'tabCurio'; tab.dataset.view = 'curio';
  tab.append(h('span', 'tabBang', '!'));
  tabs.append(tab);
  tab.onclick = () => { showView('curio'); const c = curioOf(C.save); c.news = 0; C.write(); render(); curioRefresh(); };
  curioRefresh();
}
export function curioRefresh() {
  if (!C) return;
  const on = L('cabinet') > 0;
  tab.hidden = !on;
  if (!on) return;
  const c = curioOf(C.save);
  if (L('quests')) fillQuests(C.save, C.open());
  tab.classList.toggle('bang', $('curio').hidden && (c.news > 0 || c.keys > 0));
  if (!$('curio').hidden) render();
}

function cardEl(id, stars, opts = {}) {
  const d = h('button', 'cCard' + (stars ? '' : ' unknown') + (opts.eq ? ' eq' : '')); d.type = 'button';
  d.style.setProperty('--sc', ['#6a6a6a', '#c4c8b2', '#7fd0ff', '#c07aff', '#ffb347', '#ff5e4d'][stars || 0]);
  const cv = h('canvas'); cv.width = cv.height = 22; cv.getContext('2d').drawImage(C.enemyIcon(id), 0, 0);
  d.append(cv, h('span', 'cName', stars ? ENEMIES[id].name : '???'));
  if (stars) { d.append(h('span', 'cStars', '★'.repeat(stars) + '☆'.repeat(STAR_MAX - stars))); d.append(h('span', 'cFx', cardText(id, stars))); }
  d.title = stars ? `${ENEMIES[id].name} : ${cardText(id, stars)}` : 'Carte encore inconnue : elle tombe de cette créature';
  return d;
}

function render() {
  const box = $('curio'); box.innerHTML = '';
  const s = C.save, c = curioOf(s), g = gearOf(s);
  // ----- cartes -----
  const col1 = h('section', 'cuCol');
  const owned = CARD_IDS.filter(id => c.cards[id]);
  col1.append(h('h3', '', `Cartes · ${owned.length} / ${CARD_IDS.length}`));
  const n = cardSlots(s.level);
  const slots = h('div', 'cuSlots');
  for (let i = 0; i < n; i++) {
    const id = c.eq[i];
    if (id && c.cards[id]) { const el = cardEl(id, c.cards[id].stars, { eq: true }); el.onclick = () => { c.eq.splice(i, 1); change(); }; el.title += ' · clic : retirer'; slots.append(el); }
    else slots.append(h('div', 'cSlot', 'Emplacement libre'));
  }
  col1.append(slots);
  col1.append(h('p', 'cuHint', L('slot2') ? 'Les doublons ajoutent une étoile.' : 'Doublons : +2 éclats (« Grand album » : +1 étoile).'));
  const grid = h('div', 'cuGrid');
  for (const id of CARD_IDS) {
    const cd = c.cards[id], el = cardEl(id, cd ? cd.stars : 0, { eq: c.eq.includes(id) });
    if (cd) el.onclick = () => {
      const k = c.eq.indexOf(id);
      if (k >= 0) c.eq.splice(k, 1); else { if (c.eq.length >= n) c.eq.shift(); c.eq.push(id); }
      change();
    };
    grid.append(el);
  }
  col1.append(grid);
  box.append(col1);
  // ----- boutique -----
  const col2 = h('section', 'cuCol');
  if (L('shop')) {
    const head = h('div', 'cuShopHead');
    const fr = h('canvas'); fr.width = fr.height = 22; fr.getContext('2d').drawImage(C.enemyIcon('frog'), 0, 0);
    head.append(fr, h('div', '', ''));
    head.lastChild.append(h('h3', '', 'Boutique du vieux crapaud'), h('p', 'cuHint', '« Ça ne dure qu\'une expédition, croâ. »'));
    col2.append(head);
    const stock = shopStock(s);
    for (const id of stock) {
      const relic = id === 'relic', P = relic ? RELIC : POTIONS[id];
      const sold = c.shop.sold.includes(id), active = c.active.includes(id);
      const row = h('div', 'cuItem' + (sold ? ' sold' : ''));
      const ico = h('span', 'cuIco'); ico.style.background = relic ? '#c07aff' : P.ico;
      const txt = h('div', 'cuTxt'); txt.append(h('b', '', P.name), h('span', '', P.text));
      const price = relic ? RELIC.shards : potionPrice(s, id);
      const can = relic ? g.shards >= price && !!C.gearCtx() : s.coins >= price;
      const b = h('button', 'btn small', sold ? (active ? 'Prête' : 'Vendu') : relic ? `${price} éclats` : C.fmt(price)); b.type = 'button';
      b.disabled = sold || !can;
      if (!relic && !sold) b.prepend(h('span', 'coin-ico'));
      b.onclick = () => {
        if (relic) { g.shards -= price; c.shop.sold.push(id); C.write(); C.storeAndShow([rollItem(C.gearCtx(), 0, Math.random, 1)]); }
        else { s.coins -= price; c.shop.sold.push(id); c.active.push(id); C.play('buy'); }
        change();
      };
      row.append(ico, txt, b); col2.append(row);
    }
    col2.append(h('p', 'cuHint', 'Nouveau stock après chaque expédition.' + (c.active.length ? ` Actif : ${c.active.map(p => POTIONS[p].name).join(', ')}.` : '')));
  } else col2.append(h('h3', '', 'Boutique'), h('p', 'cuHint', 'Achète « Boutique » dans l\'arbre (Curiosités) pour l\'ouvrir.'));
  box.append(col2);
  // ----- quêtes et donjon -----
  const col3 = h('section', 'cuCol');
  col3.append(h('h3', '', 'Quêtes'));
  if (L('quests')) {
    for (const q of c.quests) {
      const row = h('div', 'cuQuest');
      row.append(h('b', '', questText(q)));
      const bar = h('div', 'cuBar'); const fill = h('i'); fill.style.width = Math.min(100, q.prog / q.goal * 100) + '%'; bar.append(fill);
      row.append(bar, h('span', 'cuHint', `${C.fmt(Math.min(q.prog, q.goal))} / ${C.fmt(q.goal)} · récompense : ${REWARD_TEXT[q.reward]}`));
      col3.append(row);
    }
  } else col3.append(h('p', 'cuHint', 'Achète « Quêtes » dans l\'arbre pour en recevoir.'));
  col3.append(h('h3', '', 'Donjon'));
  if (L('dungeon')) {
    col3.append(h('p', 'cuHint', `Clés : ${c.keys} · donjons pillés : ${c.dungeons}. Un gardien de la région actuelle, 2 minutes pour le battre.`));
    const b = h('button', 'btn', c.keys > 0 ? 'Entrer (1 clé)' : 'Pas de clé'); b.type = 'button'; b.disabled = !(c.keys > 0);
    b.onclick = () => C.goDungeon();
    col3.append(b);
  } else col3.append(h('p', 'cuHint', 'Achète « Donjons » dans l\'arbre : les quêtes donneront des clés.'));
  col3.append(h('p', 'cuShards', `Éclats : ${g.shards}`));
  box.append(col3);
}
function change() { C.write(); C.onChange(); render(); }
