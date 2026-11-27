// Onglet « Ménagerie » de l'Atelier : le nid, la collection de familiers et la fiche du familier choisi.
import { showView } from './company.js';
import { gearOf } from './gear.js';
import { SPECIES, SPECIES_IDS, TREATS, PET_RARITIES, STAGES, GROW_NEED, petsOf, petById, petSprite, treatSprite, nestSlots, growthMult,
  hearts, petPower, nestBonus, feed, caress, releaseShards } from './pets.js';

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
let C = null, tab = null, sel = null, msg = '', confirmRelease = false;

export function initPets(ctx) {
  C = ctx;
  const tabs = document.querySelector('#atelier .tabs');
  tab = h('button', 'tab', 'Ménagerie'); tab.type = 'button'; tab.id = 'tabPets'; tab.dataset.view = 'pets';
  tab.append(h('span', 'tabBang', '!'));
  tabs.append(tab);
  tab.onclick = () => { showView('pets'); petsOf(C.save).news = 0; C.write(); render(); petsRefresh(); };
  petsRefresh();
}
export function petsRefresh() {
  if (!C) return;
  const p = petsOf(C.save);
  tab.hidden = !p.list.length;
  tab.classList.toggle('bang', $('pets').hidden && p.news > 0);
  if (!$('pets').hidden) render();
}

const petName = pet => pet.name || SPECIES[pet.sp].name;
function pic(pet, size) {
  const im = petSprite(pet.sp, pet.stage, pet.gold, pet.rar), cv = h('canvas');
  cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
  const k = Math.max(1, Math.floor(size / Math.max(im.width, im.height)));
  cv.style.width = im.width * k + 'px'; cv.style.height = im.height * k + 'px';
  return cv;
}
function change(text = '') { msg = text; C.write(); C.onChange(); render(); }
function place(uid, where) {
  const p = petsOf(C.save);
  p.nest = p.nest.filter(u => u !== uid);
  if (p.active === uid) p.active = null;
  if (where === 'active') { if (p.active) { const old = p.active; p.active = null; if (p.nest.length < nestSlots(C.save)) p.nest.push(old); } p.active = uid; }
  else if (where === 'nest') p.nest.push(uid);
  C.play('buy');
  change();
}

function slotEl(label, pet, sub, onClick) {
  const d = h('button', 'pmSlot' + (pet ? '' : ' empty') + (label === 'Expédition' ? ' act' : '')); d.type = 'button';
  d.append(h('span', 'pmLbl', label));
  if (pet) {
    d.style.setProperty('--rc', pet.gold ? '#ffe14a' : PET_RARITIES[pet.rar].color);
    d.append(pic(pet, 56), h('span', 'pmNm', petName(pet)), h('span', 'pmBn', sub));
    d.onclick = onClick;
  } else d.append(h('span', 'pmBn', sub));
  return d;
}

function render() {
  const box = $('pets'); box.innerHTML = '';
  const s = C.save, p = petsOf(s);
  if (!sel || !petById(s, sel)) sel = p.active || (p.list[0] && p.list[0].uid);
  // ----- nid -----
  const col1 = h('section', 'cuCol pmCol');
  col1.append(h('h3', '', 'Le nid'));
  const slots = h('div', 'pmSlots');
  const act = petById(s, p.active);
  slots.append(slotEl('Expédition', act, act ? (act.stage ? 'Pouvoir complet' : 'Encore dans l\'œuf') : 'Choisis un familier', () => { sel = act.uid; render(); }));
  for (let i = 0; i < nestSlots(s); i++) {
    const pet = petById(s, p.nest[i]);
    slots.append(slotEl('Nid', pet, pet ? (pet.stage ? `+${Math.round(nestBonus(pet) * 100)} % ${SPECIES[pet.sp].passive === 'gold' ? 'd\'or' : 'de dégâts'}` : 'Œuf au chaud') : 'Place libre', () => { sel = pet.uid; render(); }));
  }
  col1.append(slots);
  col1.append(h('p', 'cuHint', `Un familier part en expédition. Ceux du nid donnent 25 % de leur valeur en bonus passif.${(s.level.bigNest || 0) ? '' : ' Le nœud « Grand nid » de l\'arbre ajoute une place.'}`));
  col1.append(h('h3', '', 'Friandises'));
  const tr = h('div', 'pmTreats');
  const owned = Object.entries(p.treats).filter(([, n]) => n > 0);
  if (!owned.length) tr.append(h('p', 'cuHint', 'Les monstres en lâchent parfois en expédition. Chaque région a la sienne.'));
  for (const [id, n] of owned) {
    const t = h('span', 'pmTreat'), cv = h('canvas'); cv.width = cv.height = 4; cv.getContext('2d').drawImage(treatSprite(id), 0, 0);
    t.append(cv, `${TREATS[id].name} ×${n}`); t.title = 'Friandise préférée du ' + SPECIES[SPECIES_IDS.find(k => SPECIES[k].treat[0] === id)].name; tr.append(t);
  }
  col1.append(tr);
  if (growthMult(s) > 1) col1.append(h('p', 'cuHint', `Nid douillet : croissance ×${String(growthMult(s)).replace('.', ',')}`));

  // ----- collection -----
  const col2 = h('section', 'cuCol pmCol');
  const seen = SPECIES_IDS.filter(id => p.seen[id]);
  col2.append(h('h3', '', `Collection · ${seen.length} / ${SPECIES_IDS.length} espèces`));
  const grid = h('div', 'pmGrid');
  for (const pet of [...p.list].sort((a, b) => (b.uid === p.active) - (a.uid === p.active) || b.stage - a.stage || b.rar - a.rar)) {
    const c = h('button', 'pmCell' + (pet.uid === sel ? ' sel' : '')); c.type = 'button';
    c.style.setProperty('--rc', pet.gold ? '#ffe14a' : PET_RARITIES[pet.rar].color);
    c.append(pic(pet, 44));
    c.append(h('span', 'pmLv', pet.uid === p.active ? '★' : p.nest.includes(pet.uid) ? 'nid' : STAGES[pet.stage].slice(0, 2)));
    c.title = `${petName(pet)} · ${PET_RARITIES[pet.rar].name} · ${STAGES[pet.stage]}`;
    c.onclick = () => { sel = pet.uid; msg = ''; confirmRelease = false; render(); };
    grid.append(c);
  }
  col2.append(grid);
  col2.append(h('h3', '', 'Espèces'));
  const sp = h('div', 'pmSpecies');
  for (const id of SPECIES_IDS) {
    const d = h('span', 'pmSp' + (p.seen[id] ? '' : ' unknown')), cv = h('canvas'), im = petSprite(id);
    cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
    d.append(cv); d.title = p.seen[id] ? `${SPECIES[id].name} : ${SPECIES[id].power}` : `??? · son œuf vient du boss de la région ${zoneName(id)}`;
    sp.append(d);
  }
  col2.append(sp);

  // ----- fiche -----
  const col3 = h('section', 'cuCol pmCol pmCard');
  const pet = petById(s, sel);
  if (pet) fiche(col3, pet, p, s);
  box.append(col1, col2, col3);
}
const ZONE_NAMES = { clairiere: 'Clairière', marais: 'Marais brumeux', automne: 'Bois d\'automne', gel: 'Cimes gelées', desert: 'Désert de cuivre', grotte: 'Grottes de cristal', lumi: 'Forêt luminescente', enfers: 'Enfers', ciel: 'Îles célestes', neant: 'Néant' };
const zoneName = id => ZONE_NAMES[SPECIES[id].zone] || SPECIES[id].zone;

function fiche(col, pet, p, s) {
  const S = SPECIES[pet.sp], rc = pet.gold ? '#ffe14a' : PET_RARITIES[pet.rar].color;
  col.style.setProperty('--rc', rc);
  const top = h('div', 'pmTop');
  const big = h('button', 'pmBig'); big.type = 'button'; big.append(pic(pet, 96));
  big.title = pet.stage ? (pet.petted ? 'Il a déjà eu sa caresse : reviens après une expédition' : 'Clique pour le caresser (+affection, une fois par expédition)') : 'L\'œuf éclot à la fin de la prochaine expédition';
  big.onclick = () => { if (caress(pet)) { C.play('gold'); big.classList.add('purr'); change('Il ronronne de bonheur ♥'); } };
  const id = h('div', 'pmId');
  const nm = h('input', 'pmName'); nm.id = 'pmName'; nm.value = petName(pet); nm.maxLength = 18; nm.setAttribute('aria-label', 'Nom du familier');
  nm.onchange = () => { pet.name = nm.value.trim() === S.name ? '' : nm.value.trim().slice(0, 18); C.write(); C.onChange(); };
  const tags = h('div', 'pmTags');
  tags.append(h('span', 'pmPill', PET_RARITIES[pet.rar].name), h('span', 'pmPill st', STAGES[pet.stage]));
  if (pet.gold) tags.append(h('span', 'pmPill gold', 'Forme dorée'));
  id.append(nm, tags, h('span', 'pmSpName', pet.name ? S.name : 'Famille : ' + zoneName(pet.sp)));
  top.append(big, id);
  col.append(top);
  if (!pet.stage) {
    col.append(h('p', 'cuHint', 'Cet œuf éclot à la fin de la prochaine expédition. Une chance sur 50 que le familier sorte en forme dorée (+50 %).'));
  } else {
    const hv = hearts(pet);
    const dl = h('dl', 'pmStats');
    const row = (a, b, cls) => { dl.append(h('dt', '', a)); const d = h('dd', cls || '', b); dl.append(d); return d; };
    row('Pouvoir', S.power);
    row('Duel de boss', S.bossTxt);
    row('Au nid', `+${Math.round(nestBonus(pet) * 100)} % ${S.passive === 'gold' ? 'd\'or ramassé' : 'de dégâts des héros'}`);
    row('Puissance', String(Math.round(petPower(pet) * 100)), 'num');
    row('Affection', '♥'.repeat(hv) + '♡'.repeat(5 - hv) + (hv >= 5 ? '  talent : puissance +25 %' : ''), 'pmHearts');
    row('Préfère', S.treat[1]);
    col.append(dl);
    if (pet.stage < 3) {
      const need = GROW_NEED[pet.stage];
      const bar = h('div', 'cuBar pmFood'), f = h('i'); f.style.width = Math.min(100, pet.food / need * 100) + '%'; bar.append(f);
      col.append(h('span', 'pmFoodTxt num', `Croissance ${Math.floor(pet.food)} / ${need} → ${STAGES[pet.stage + 1]}`), bar);
    }
  }
  if (msg) col.append(h('p', 'pmMsg', msg));
  // boutons
  const btns = h('div', 'pmBtns');
  const b = (label, fn, cls = 'second') => { const x = h('button', 'btn small ' + cls, label); x.type = 'button'; x.onclick = fn; btns.append(x); return x; };
  if (p.active !== pet.uid) b('Emmener en expédition', () => place(pet.uid, 'active'), '');
  if (!p.nest.includes(pet.uid) && p.active !== pet.uid) { const x = b('Mettre au nid', () => place(pet.uid, 'nest')); x.disabled = p.nest.length >= nestSlots(s); if (x.disabled) x.title = 'Le nid est plein'; }
  if (p.active === pet.uid || p.nest.includes(pet.uid)) b('Retirer', () => place(pet.uid, null));
  col.append(btns);
  if (pet.stage) {
    const fb = h('div', 'pmBtns');
    const ids = Object.keys(p.treats).filter(t => p.treats[t] > 0).sort((a, b2) => (b2 === S.treat[0]) - (a === S.treat[0]));
    for (const t of ids) {
      const x = h('button', 'btn small second pmFeed' + (t === S.treat[0] ? ' fav' : ''), `Donner : ${TREATS[t].name} (${p.treats[t]})`); x.type = 'button';
      const cv = h('canvas'); cv.width = cv.height = 4; cv.getContext('2d').drawImage(treatSprite(t), 0, 0); x.prepend(cv);
      x.onclick = () => { const st = pet.stage, m = feed(s, pet, t, 1); if (m) { C.play(pet.stage > st ? 'gold' : 'tick', { k: 0.5 }); change(m); } };
      fb.append(x);
    }
    if (ids.length) {
      const x = h('button', 'btn small second', 'Tout donner'); x.type = 'button';
      x.onclick = () => { const st = pet.stage; let m = ''; for (const t of ids) m = feed(s, pet, t, p.treats[t]) || m; C.play(pet.stage > st ? 'gold' : 'buy'); change(m); };
      fb.append(x);
    } else fb.append(h('p', 'cuHint', 'Pas de friandise en réserve : ramasse-en en expédition.'));
    col.append(fb);
  }
  // relâcher (deux clics, rend des éclats)
  const rel = h('button', 'ghost pmRelease', confirmRelease ? `Sûr ? Il rend ${releaseShards(pet)} éclats` : 'Relâcher'); rel.type = 'button';
  rel.onclick = () => {
    if (!confirmRelease) { confirmRelease = true; render(); return; }
    confirmRelease = false;
    p.list = p.list.filter(x => x !== pet); p.nest = p.nest.filter(u => u !== pet.uid); if (p.active === pet.uid) p.active = null;
    gearOf(s).shards += releaseShards(pet); sel = null;
    change(`${petName(pet)} retourne à la nature (+${releaseShards(pet)} éclats).`);
  };
  col.append(rel);
}
