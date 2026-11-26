// Onglet Compagnie : équipement des lignées, forge (affinage), réserve et recyclage ; écran « Sers-toi ! ».
import { HEROES, HERO_ORDER } from './data.js';
import { TREE_ICONS, treeIcons } from './sprites.js';
import { RARITIES, GEAR_ICONS, ICON_FALLBACK, SLOTS, RESERVE, REFINE_MAX, CATALOG_SIZE, gearOf, itemName, itemIcon, itemText,
  isBetter, refineCost, refineChance, gearBonus } from './gear.js';

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

// ---------- Icônes ----------
let gearSheet = null, treeSheet = null;
export const gearSheetReady = new Promise(ok => {
  const im = new Image();
  im.onload = () => { gearSheet = im; ok(im); }; im.onerror = () => ok(null);
  im.src = 'assets/sprites/icones/objets.png';
});
treeIcons.then(im => { treeSheet = im; });
const iconCache = {};
// Icône 64×64 : planche des objets, sinon planche de l'arbre
export function gearIconCanvas(name) {
  if (iconCache[name]) return iconCache[name];
  if (gearSheet && GEAR_ICONS.indexOf(name) * 64 >= gearSheet.width && ICON_FALLBACK[name]) return gearIconCanvas(ICON_FALLBACK[name]);
  const gi = GEAR_ICONS.indexOf(name), ti = TREE_ICONS.indexOf(name);
  const src = gi >= 0 ? gearSheet : ti >= 0 ? treeSheet : null;
  if (!src) return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, (gi >= 0 ? gi : ti) * 64, 0, 64, 64, 0, 0, 64, 64);
  return (iconCache[name] = c);
}
function iconEl(name, cls = 'gIco') {
  const c = document.createElement('canvas'); c.width = c.height = 64; c.className = cls;
  const draw = () => { const s = gearIconCanvas(name); if (s) c.getContext('2d').drawImage(s, 0, 0); };
  draw(); if (!gearIconCanvas(name)) Promise.all([gearSheetReady, treeIcons]).then(draw);
  return c;
}
// Effets de rareté sur un cadre d'objet : lueur (rare), reflet et étincelles (épique), rayons tournants (légendaire)
function rarFx(el, rarity) {
  el.classList.add('rar', 'rar' + rarity);
  if (rarity < 1) return el;
  const back = h('span', 'fxb'), front = h('span', 'fxf');
  if (rarity >= 3) back.append(h('i', 'rays'));
  if (rarity >= 2) {
    front.append(h('i', 'shine'));
    const n = rarity >= 3 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const sp = h('i', 'spk'); sp.style.left = [18, 74, 30, 64][i] + '%'; sp.style.top = [22, 30, 76, 70][i] + '%';
      sp.style.animationDelay = (i * 0.45) + 's'; front.append(sp);
    }
  }
  el.prepend(back); el.append(front);
  return el;
}
const pct = v => String(Math.round(v)).replace('.', ',');

// ---------- État ----------
let C = null;                       // contexte donné par main.js
let line = 'archer', tab = 'equip', refSlot = 'weapon', recycleMode = false, picked = null, open = false;
const L = id => (C.save.level[id] || 0);
const owned = () => HERO_ORDER.filter(k => heroCount(k) > 0);
function heroCount(k) {
  const lv = C.save.level, n = id => lv[id] || 0;
  return { archer: 1, mage: n('mage'), knight: n('knight'), bard: n('bard') }[k];
}
const slotOpen = s => L(SLOTS.find(x => x.id === s).node) > 0;

export function initCompany(ctx) {
  C = ctx;
  const tabs = document.querySelector('#atelier .tabs');
  const tree = tabs.querySelector('.tab');
  tree.dataset.view = 'tree';
  const comp = h('button', 'tab', 'Compagnie'); comp.type = 'button'; comp.id = 'tabCompany'; comp.dataset.view = 'company';
  comp.append(h('span', 'tabBang', '!'));
  tree.after(comp);
  tree.onclick = () => show(false);
  comp.onclick = () => show(true);
  addEventListener('keydown', e => {
    if ($('atelier').hidden || !open) return;
    if (e.key === 'Escape') { recycleMode = false; picked = null; render(); }
  });
  companyRefresh();
}
function show(on) {
  if (on && !L('armory')) return;
  open = on;
  $('treeWrap').hidden = on; $('company').hidden = !on;
  document.querySelectorAll('#atelier .tabs .tab').forEach(t => t.classList.toggle('on', (t.dataset.view === 'company') === on));
  $('atelier').querySelector('.hintTxt').innerHTML = on ? 'Clique un objet pour l\'équiper<br>Survole pour comparer' : 'Clique une compétence pour l\'acheter<br>Glisse pour voir, molette pour zoomer';
  if (on) { const g = gearOf(C.save); g.news = 0; C.write(); }
  companyRefresh();
}

export function companyRefresh() {
  if (!C) return;
  const t = $('tabCompany'), on = L('armory') > 0;
  t.hidden = !on;
  const g = C.save.gear;
  t.classList.toggle('bang', on && !open && !!(g && (g.news > 0 || !g.visited)));
  if (!on && open) show(false);
  if (open) render();
}

// ---------- Rendu de l'écran ----------
function render() {
  const g = gearOf(C.save); g.visited = true;
  const box = $('company'); box.innerHTML = '';
  if (!owned().includes(line)) line = owned()[0];
  box.append(renderLines(g), renderCenter(g), renderReserve(g));
}

function lineBonus(g, k) {
  const b = gearBonus(g, C.save.level);
  return b.dmg[k] || 0;
}
function renderLines(g) {
  const col = h('div', 'cPanel cLines');
  col.append(h('div', 'cTitle', 'Lignées'));
  for (const k of owned()) {
    const b = h('button', 'cLine' + (k === line ? ' on' : '')); b.type = 'button';
    const ic = document.createElement('canvas'); ic.width = ic.height = 68; ic.getContext('2d').drawImage(C.heroIcon(k), 0, 0);
    const txt = h('div', 'cLineTxt');
    txt.append(h('div', 'nm', HEROES[k].plural), h('div', 'pc num', `+${pct(lineBonus(g, k))} % de dégâts`));
    const slots = h('div', 'cMini');
    for (const s of SLOTS) {
      const cell = h('span', 'mini' + (slotOpen(s.id) ? '' : ' locked'));
      const it = g.eq[k][s.id], rf = g.ref[k][s.id] || 0;
      if (!slotOpen(s.id)) cell.textContent = '🔒';
      else if (it) { cell.append(iconEl(itemIcon(it))); cell.style.setProperty('--r', RARITIES[it.rarity].color); cell.classList.add('full'); rarFx(cell, it.rarity); }
      if (rf && slotOpen(s.id)) cell.append(h('b', 'rf', '+' + rf));
      slots.append(cell);
    }
    b.append(ic, txt, slots);
    b.onclick = () => { line = k; picked = null; render(); };
    col.append(b);
  }
  const g2 = h('div', 'cFoot');
  g2.append(h('span', '', `Collection : ${CATALOG_SIZE} objets à trouver`));
  col.append(g2);
  return col;
}

function renderCenter(g) {
  const col = h('div', 'cPanel cCenter');
  const sub = h('div', 'cSub');
  for (const [id, label, need] of [['equip', 'Équiper', 'armory'], ['refine', 'Affiner', 'refine']]) {
    const b = h('button', 'cSubTab' + (tab === id ? ' on' : ''), label); b.type = 'button';
    if (!L(need)) { b.disabled = true; b.title = 'Débloque « Forge : affinage » dans l\'arbre'; b.textContent = '🔒 ' + label; }
    b.onclick = () => { tab = id; render(); };
    sub.append(b);
  }
  col.append(sub);
  if (tab === 'refine' && L('refine')) col.append(renderRefine(g)); else col.append(renderEquip(g));
  return col;
}

function slotCard(g, s, big = true) {
  const it = g.eq[line][s.id], rf = g.ref[line][s.id] || 0, op = slotOpen(s.id);
  const card = h('div', 'cSlot' + (it ? ' full' : '') + (op ? '' : ' locked'));
  if (it) card.style.setProperty('--r', RARITIES[it.rarity].color);
  const frame = h('div', 'cSlotIco');
  if (it) { frame.append(iconEl(itemIcon(it))); frame.style.setProperty('--r', RARITIES[it.rarity].color); rarFx(frame, it.rarity); }
  else frame.append(h('span', 'ph', op ? (s.id === 'weapon' ? '⚔' : '✦') : '🔒'));
  if (rf) frame.append(h('b', 'rf', '+' + rf));
  const txt = h('div', 'cSlotTxt');
  txt.append(h('div', 'k', s.name + (rf ? ` · emplacement +${rf}` : '')));
  if (!op) txt.append(h('div', 'nm dim', s.id === 'weapon' ? 'Armurerie' : s.id === 'charm1' ? 'Débloque « Emplacement de charme »' : 'Débloque « Deuxième charme »'));
  else if (it) {
    const nm = h('div', 'nm', itemName(it)); nm.style.color = RARITIES[it.rarity].color;
    txt.append(nm, h('div', 'eff', itemText(it, rf)));
  } else txt.append(h('div', 'nm dim', 'Vide'));
  card.append(frame, txt);
  if (it && big) {
    card.title = 'Clique pour ranger dans la réserve';
    card.onclick = () => {
      if (g.inv.length >= RESERVE) return;
      g.inv.push(it); g.eq[line][s.id] = null; changed('click');
    };
  }
  return card;
}

function renderEquip(g) {
  const w = h('div', 'cEquip');
  const head = h('div', 'cHead');
  const ic = document.createElement('canvas'); ic.width = ic.height = 68; ic.getContext('2d').drawImage(C.heroIcon(line), 0, 0);
  head.append(ic, h('div', 'cHeadTxt', HEROES[line].plural));
  w.append(head);
  for (const s of SLOTS) w.append(slotCard(g, s));
  w.append(h('p', 'cHint', 'L\'équipement appartient à la lignée : il reste quand tes héros changent de classe.'));
  return w;
}

function renderRefine(g) {
  const w = h('div', 'cRefine');
  const pick = h('div', 'cRefPick');
  for (const s of SLOTS) {
    const b = h('button', 'cRefSlot' + (refSlot === s.id ? ' on' : '')); b.type = 'button';
    const it = g.eq[line][s.id], rf = g.ref[line][s.id] || 0;
    if (!slotOpen(s.id)) { b.disabled = true; b.append(h('span', 'ph', '🔒')); }
    else if (it) { b.append(iconEl(itemIcon(it))); b.style.setProperty('--r', RARITIES[it.rarity].color); rarFx(b, it.rarity); }
    else b.append(h('span', 'ph', s.id === 'weapon' ? '⚔' : '✦'));
    if (rf) b.append(h('b', 'rf', '+' + rf));
    b.onclick = () => { refSlot = s.id; render(); };
    pick.append(b);
  }
  if (!slotOpen(refSlot)) refSlot = 'weapon';
  const s = SLOTS.find(x => x.id === refSlot), it = g.eq[line][s.id], lv = g.ref[line][s.id] || 0;
  const key = line + '.' + s.id, pity = g.pity[key] || 0;
  const title = h('div', 'cRefTitle', `+${lv} ${it ? itemName(it) : (s.id === 'weapon' ? 'Emplacement d\'arme' : 'Emplacement de charme')}`);
  if (it) title.style.color = RARITIES[it.rarity].color;
  const dots = h('div', 'cDots');
  for (let i = 0; i < REFINE_MAX; i++) dots.append(h('i', i < lv ? 'on' : ''));
  const anvil = h('div', 'cAnvil'); anvil.append(iconEl('anvil', 'anvil'));
  w.append(pick, title, dots, anvil);
  if (lv >= REFINE_MAX) { w.append(h('p', 'cOk', 'Emplacement au maximum !')); return w; }
  const now = h('div', 'cNow', it ? itemText(it, lv) : `Bonus de l'objet ×${(1 + 0.1 * lv).toFixed(1).replace('.', ',')}`);
  const next = h('div', 'cNext', '→ ' + (it ? itemText(it, lv + 1) : `Bonus de l'objet ×${(1 + 0.1 * (lv + 1)).toFixed(1).replace('.', ',')}`));
  const ch = refineChance(lv, L('blessed'), pity);
  const rate = h('div', 'cRate' + (ch >= 1 ? ' safe' : ''), ch >= 1 ? 'Sans risque : ne peut pas échouer' : `Réussite ${Math.round(ch * 100)} %`);
  w.append(now, next, rate);
  if (ch < 1) w.append(h('div', 'cFail', 'Échec : niveau gardé, +5 % de chance au suivant'));
  const cost = refineCost(lv), money = C.save.coins, sh = g.shards;
  const btn = h('button', 'cRefBtn'); btn.type = 'button';
  btn.append(h('span', 'lbl', 'Affiner'), h('span', 'sep'));
  const c1 = h('span', 'cost' + (money < cost.coins ? ' no' : '')); c1.append(h('span', 'coin-ico'), ' ' + C.fmt(cost.coins)); btn.append(c1);
  if (cost.shards) { const c2 = h('span', 'cost' + (sh < cost.shards ? ' no' : '')); c2.append(iconEl('shard', 'mIco'), ' ' + cost.shards); btn.append(c2); }
  btn.disabled = money < cost.coins || sh < cost.shards;
  btn.onclick = () => {
    if (money < cost.coins || sh < cost.shards) return;
    C.unlockAudio();
    C.save.coins -= cost.coins; g.shards -= cost.shards;
    const ok = Math.random() < ch;
    if (ok) { g.ref[line][s.id] = lv + 1; g.pity[key] = 0; C.play('tier'); }
    else { g.pity[key] = pity + 0.05; C.play('warn'); }
    changed();
    const res = h('div', 'cRefFx ' + (ok ? 'ok' : 'ko'), ok ? `+${lv + 1} !` : 'Échec…');
    $('company').querySelector('.cAnvil')?.append(res);
    $('company').querySelector('.cAnvil .anvil')?.classList.add('hit');
  };
  w.append(btn);
  if (cost.shards && !L('recycle')) w.append(h('p', 'cHint', 'Il faut des éclats : débloque le Recyclage dans l\'arbre.'));
  return w;
}

function renderReserve(g) {
  const col = h('div', 'cPanel cReserve');
  const top = h('div', 'cTitle');
  top.append(h('span', '', `Réserve ${g.inv.length}/${RESERVE}`));
  const sh = h('span', 'shards num'); sh.append(iconEl('shard', 'mIco'), ' ' + C.fmt(g.shards)); sh.title = 'Éclats : obtenus en recyclant, servent à l\'affinage';
  top.append(sh);
  col.append(top);
  const grid = h('div', 'cGrid');
  const sorted = g.inv.slice().sort((a, b) => b.rarity - a.rarity || b.power - a.power);
  for (const it of sorted) {
    const cell = h('button', 'cItem' + (it.isNew ? ' new' : '') + (picked === it.id ? ' sel' : '') + (recycleMode ? ' rec' : '')); cell.type = 'button';
    cell.style.setProperty('--r', RARITIES[it.rarity].color);
    cell.append(iconEl(itemIcon(it)));
    rarFx(cell, it.rarity);
    if (it.kind === 'weapon') {
      const cur = g.eq[it.line].weapon;
      if (owned().includes(it.line) && (!cur || it.power > cur.power)) cell.append(h('b', 'up', '▲'));
      cell.append(h('i', 'who', HEROES[it.line].name[0]));
    }
    if (it.isNew) cell.append(h('b', 'nw', '!'));
    cell.onmouseenter = () => { detail(g, it); };
    cell.onfocus = () => detail(g, it);
    cell.onclick = () => {
      it.isNew = false;
      if (recycleMode) { recycle(g, [it]); return; }
      equip(g, it);
    };
    grid.append(cell);
  }
  for (let i = g.inv.length; i < RESERVE; i++) grid.append(h('span', 'cItem empty'));
  col.append(grid);
  col.append(h('div', 'cDetail', 'Survole un objet pour voir ses effets.'));
  const foot = h('div', 'cRecycle');
  if (L('recycle')) {
    const rb = h('button', 'cBtn' + (recycleMode ? ' on' : ''), recycleMode ? 'Terminer' : 'Recycler'); rb.type = 'button';
    rb.onclick = () => { recycleMode = !recycleMode; render(); };
    foot.append(rb);
    for (let r = 0; r < 2; r++) {
      const list = g.inv.filter(x => x.rarity === r);
      const b = h('button', 'cBtn small', `Recycler les ${RARITIES[r].name.toLowerCase()}s (${list.length})`); b.type = 'button';
      b.style.color = RARITIES[r].color; b.disabled = !list.length;
      b.onclick = () => recycle(g, list);
      foot.append(b);
    }
    if (recycleMode) foot.append(h('p', 'cHint', 'Clique un objet pour le recycler en éclats.'));
  } else foot.append(h('p', 'cHint', '🔒 Recyclage : débloque-le dans l\'arbre (branche Équipement).'));
  col.append(foot);
  return col;
}

function detail(g, it) {
  const d = $('company').querySelector('.cDetail'); if (!d) return;
  d.innerHTML = '';
  const r = RARITIES[it.rarity];
  const nm = h('div', 'nm', itemName(it)); nm.style.color = r.color;
  const meta = h('div', 'meta', `${r.name} · ${it.kind === 'weapon' ? 'Arme des ' + HEROES[it.line].plural.toLowerCase() : 'Charme'} · Puissance ${it.power}`);
  const eff = h('div', 'eff', itemText(it));
  d.append(nm, meta, eff);
  // comparaison avec ce qui est équipé
  const k = it.kind === 'weapon' ? it.line : line;
  const cur = it.kind === 'weapon' ? g.eq[k].weapon : null;
  if (it.kind === 'weapon' && owned().includes(k)) {
    const diff = it.power - (cur ? cur.power : 0);
    d.append(h('div', 'cmp ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : ''), cur ? `${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}${diff} de puissance par rapport à ${itemName(cur)}` : '▲ Emplacement vide'));
  }
  if (recycleMode) d.append(h('div', 'meta', `Recyclage : +${r.shards} éclat${r.shards > 1 ? 's' : ''}`));
}

function equip(g, it) {
  let k = line, slot;
  if (it.kind === 'weapon') {
    k = it.line;
    if (!owned().includes(k)) { picked = it.id; render(); return; }
    slot = 'weapon';
  } else {
    const free = ['charm1', 'charm2'].filter(s => slotOpen(s));
    if (!free.length) { picked = it.id; render(); flashHint('Débloque « Emplacement de charme » dans l\'arbre pour porter des charmes.'); return; }
    slot = free.find(s => !g.eq[k][s]) || free.reduce((a, b) => (g.eq[k][a].power <= g.eq[k][b].power ? a : b));
  }
  const old = g.eq[k][slot];
  g.inv = g.inv.filter(x => x !== it);
  if (old) g.inv.push(old);
  g.eq[k][slot] = it; line = k;
  changed('buy');
}
function recycle(g, list) {
  if (!list.length) return;
  for (const it of list) g.shards += RARITIES[it.rarity].shards;
  const set = new Set(list); g.inv = g.inv.filter(x => !set.has(x));
  changed('coin');
}
function flashHint(msg) {
  const d = $('company').querySelector('.cDetail'); if (d) { d.textContent = msg; d.classList.add('warn'); }
}
function changed(sound) {
  C.write(); if (sound) { C.unlockAudio(); C.play(sound); }
  C.onChange(); render();
}

// ---------- « Sers-toi ! » : les objets trouvés sortent de la besace un par un ----------
export function showLoot(items, done) {
  const g = gearOf(C.save);
  const ov = h('div', 'lootScreen'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Objets trouvés');
  ov.append(h('h2', 'lootTitle', 'Sers-toi !'));
  const row = h('div', 'lootRow');
  items.forEach((it, i) => {
    const r = RARITIES[it.rarity];
    const card = h('div', 'lootCard r' + it.rarity); card.style.setProperty('--r', r.color); card.style.animationDelay = (0.25 + i * 0.28) + 's';
    card.append(h('div', 'rar', r.name + (it.rarity >= 2 ? ' !' : '')));
    const fr = h('div', 'fr'); fr.append(iconEl(itemIcon(it))); rarFx(fr, it.rarity); card.append(fr);
    card.append(h('div', 'nm', itemName(it)));
    const tag = it.recycled ? 'Réserve pleine : recyclé' : isBetter(g, it) && C.save.level[{ archer: 'root', mage: 'mage', knight: 'knight', bard: 'bard' }[it.line]] ? 'Meilleur !' : 'Nouveau';
    card.append(h('div', 'tag' + (tag === 'Meilleur !' ? ' best' : ''), tag));
    card.append(h('div', 'eff', itemText(it)));
    row.append(card);
    setTimeout(() => { C.play(it.rarity >= 2 ? 'tier' : 'gold'); }, (0.25 + i * 0.28) * 1000);
  });
  ov.append(row);
  const ok = h('button', 'btn lootOk', 'Ranger dans la réserve'); ok.type = 'button';
  ok.append(h('kbd', '', 'Entrée'));
  const close = () => { ov.remove(); removeEventListener('keydown', key, true); done(); };
  const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  ok.onclick = close; addEventListener('keydown', key, true);
  ov.append(ok);
  $('app').append(ov); ok.focus();
  companyRefresh();
}
