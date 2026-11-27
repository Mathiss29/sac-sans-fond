// Onglet « Ménagerie » de l'Atelier : le nid, la collection de familiers et la fiche du familier choisi.
import { showView } from './company.js';
import { gearOf } from './gear.js';
import { SPECIES, SPECIES_IDS, TREATS, PET_RARITIES, STAGES, GROW_NEED, ANCIENT, STAR_MAX, AWAKE_COST, ACCESSORIES, ACC_IDS, petsOf, petById, petSprite, treatSprite, accSprite,
  nestSlots, growthMult, hearts, petPower, nestBonus, feed, caress, releaseShards, starNeed, canAncient, makeAncient, awakeFodder, awaken, toggleScout, buyAcc, wear, collectionBonus, CHALLENGES, checkChallenges, ancientSpecies, NORMAL_SPECIES } from './pets.js';

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
  const a = pet.stage && pet.acc && ACCESSORIES[pet.acc] ? accSprite(pet.acc) : null, top = a ? a.height - 1 : 0;
  cv.width = Math.max(im.width, a ? a.width : 0); cv.height = im.height + top;
  const g = cv.getContext('2d');
  g.drawImage(im, Math.floor((cv.width - im.width) / 2), top);
  if (a) g.drawImage(a, Math.floor((cv.width - a.width) / 2), 0);
  const k = Math.max(1, Math.floor(size / Math.max(cv.width, cv.height)));
  cv.style.width = cv.width * k + 'px'; cv.style.height = cv.height * k + 'px';
  return cv;
}
function change(text = '') {
  const done = checkChallenges(C.save);
  if (done.length) { text = `Défi réussi : ${done.map(c => c.name).join(', ')} ! ${done.map(c => ACCESSORIES[c.acc].name).join(', ')} débloqué.`; C.play('gold'); }
  msg = text; C.write(); C.onChange(); render();
}
function place(uid, where) {
  const p = petsOf(C.save);
  p.nest = p.nest.filter(u => u !== uid); p.scout = p.scout.filter(u => u !== uid);
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
    slots.append(slotEl(pet && p.scout.includes(pet.uid) ? 'En fouille' : 'Nid', pet, pet && p.scout.includes(pet.uid) ? 'Rapporte des friandises' : pet ? (pet.stage ? `+${Math.round(nestBonus(pet) * 100)} % ${SPECIES[pet.sp].passive === 'gold' ? 'd\'or' : 'de dégâts'}` : 'Œuf au chaud') : 'Place libre', () => { sel = pet.uid; render(); }));
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
  const feasts = Object.entries(p.feasts).filter(([, n]) => n > 0);
  if (feasts.length) {
    col1.append(h('h3', '', 'Festins royaux'));
    const fr = h('div', 'pmTreats');
    for (const [sp, n] of feasts) fr.append(h('span', 'pmTreat feast', `${SPECIES[sp].name} ×${n}`));
    col1.append(fr, h('p', 'cuHint', 'Chaque boss battu en donne un. Il fait passer un adulte à 5 cœurs de son espèce au stade Ancien.'));
  }
  // accessoires (achetés en éclats)
  const g = gearOf(s);
  col1.append(h('h3', '', `Accessoires · ${g.shards} éclats`));
  const al = h('div', 'pmAccs');
  for (const id of ACC_IDS.filter(a => !ACCESSORIES[a].unique)) {
    const A = ACCESSORIES[id], it = h('div', 'pmAcc' + (p.acc[id] ? ' own' : ''));
    const cv = h('canvas'), im = accSprite(id); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
    const who = p.list.find(x => x.acc === id);
    const txt = h('span', 'pmAccTxt'); txt.append(h('b', '', A.name), h('span', '', A.fx + (who ? ' · porté par ' + petName(who) : '')));
    it.append(cv, txt);
    if (!p.acc[id]) {
      const b = h('button', 'btn small second', `${A.cost} éclats`); b.type = 'button'; b.disabled = g.shards < A.cost;
      b.onclick = () => { if (buyAcc(s, id, g.shards)) { g.shards -= A.cost; C.play('gold'); change(`${A.name} acheté ! Choisis qui le porte dans sa fiche.`); } };
      it.append(b);
    }
    al.append(it);
  }
  col1.append(al);
  // défis : accessoires uniques
  col1.append(h('h3', '', `Défis · ${CHALLENGES.filter(c => p.acc[c.acc]).length} / ${CHALLENGES.length}`));
  const dl2 = h('div', 'pmAccs');
  for (const c of CHALLENGES) {
    const A = ACCESSORIES[c.acc], won = !!p.acc[c.acc], v = Math.min(c.goal, c.val(p));
    const it = h('div', 'pmAcc chal' + (won ? ' own' : ''));
    const cv = h('canvas'), im = accSprite(c.acc); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
    if (!won) cv.style.filter = 'brightness(0) opacity(.5)';
    const who = p.list.find(x => x.acc === c.acc);
    const txt = h('span', 'pmAccTxt'); txt.append(h('b', '', `${c.name} · ${won ? A.name : '???'}`), h('span', '', won ? A.fx + (who ? ' · porté par ' + petName(who) : '') : c.txt));
    it.append(cv, txt, h('span', 'pmChalN num', won ? '✓' : `${v} / ${c.goal}`));
    dl2.append(it);
  }
  col1.append(dl2);

  // ----- collection -----
  const col2 = h('section', 'cuCol pmCol');
  const seen = SPECIES_IDS.filter(id => p.seen[id]);
  col2.append(h('h3', '', `Collection · ${seen.length} / ${SPECIES_IDS.length} espèces`));
  const nf = Object.keys(p.found).filter(k => !k.startsWith('gold|')).length, ng = Object.keys(p.found).length - nf;
  col2.append(h('p', 'pmColl', `Bonus de collection : +${Math.round(collectionBonus(s) * 100)} % d'or · ${nf} / ${SPECIES_IDS.length * PET_RARITIES.length} raretés, ${ng} forme${ng > 1 ? 's' : ''} dorée${ng > 1 ? 's' : ''}`));
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
    d.append(cv); d.title = p.seen[id] ? `${SPECIES[id].name} : ${SPECIES[id].power}` : SPECIES[id].hidden ? `??? · un œuf mystérieux apparaît quand les ${NORMAL_SPECIES} espèces ont eu un Ancien (${ancientSpecies(s)} / ${NORMAL_SPECIES})` : `??? · son œuf vient du boss de la région ${zoneName(id)}`;
    if (SPECIES[id].hidden && !p.seen[id]) d.classList.add('secret');
    sp.append(d);
  }
  col2.append(sp);
  if (!p.seen.dragon) col2.append(h('p', 'cuHint', `Une espèce secrète dort au fond du Sac… Anciens : ${ancientSpecies(s)} / ${NORMAL_SPECIES} espèces.`));

  // ----- fiche -----
  const col3 = h('section', 'cuCol pmCol pmCard');
  const pet = petById(s, sel);
  if (pet) fiche(col3, pet, p, s);
  box.append(col1, col2, col3);
}
const ZONE_NAMES = { clairiere: 'Clairière', marais: 'Marais brumeux', automne: 'Bois d\'automne', gel: 'Cimes gelées', desert: 'Désert de cuivre', grotte: 'Grottes de cristal', lumi: 'Forêt luminescente', enfers: 'Enfers', ciel: 'Îles célestes', neant: 'Néant', sac: 'Sac du mage' };
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
  if (pet.stars) tags.append(h('span', 'pmPill gold', '★'.repeat(Math.min(5, pet.stars)) + (pet.stars > 5 ? ' ×' + pet.stars : '')));
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
    const stars = pet.stars || 0;
    if (pet.stage < 3 || stars < STAR_MAX) {
      const need = pet.stage < 3 ? GROW_NEED[pet.stage] : starNeed(stars);
      const bar = h('div', 'cuBar pmFood'), f = h('i'); f.style.width = Math.min(100, pet.food / need * 100) + '%'; bar.append(f);
      col.append(h('span', 'pmFoodTxt num', pet.stage < 3 ? `Croissance ${Math.floor(pet.food)} / ${need} → ${STAGES[pet.stage + 1]}` : `Étoile ${stars + 1} / ${STAR_MAX} : ${Math.floor(pet.food)} / ${need} (+10 % de puissance chacune)`), bar);
    } else col.append(h('span', 'pmFoodTxt', `${STAR_MAX} étoiles : il est au sommet de sa forme !`));
    // stade Ancien et éveil : ce qui reste à viser en fin de partie
    const goals = h('div', 'pmGoals');
    if (pet.stage === 3) {
      const ok = canAncient(s, pet), nf = p.feasts[pet.sp] || 0;
      const x = h('button', 'btn small' + (ok ? '' : ' second'), 'Devenir Ancien'); x.type = 'button'; x.disabled = !ok;
      x.title = ok ? 'Puissance ×1,4, plus grand, et il brille' : `Il faut 5 cœurs (${hearts(pet)}/5) et un festin royal du boss de la région ${zoneName(pet.sp)} (${nf})`;
      x.onclick = () => { if (makeAncient(s, pet)) { C.play('gold'); change(`${petName(pet)} devient un Ancien !`); } };
      goals.append(x, h('span', 'cuHint', ok ? 'Prêt pour le dernier stade !' : S.hidden ? 'Ancien : 5 cœurs' : `Ancien : 5 cœurs + festin royal (${nf})`));
    }
    if (pet.rar < PET_RARITIES.length - 1) {
      const fod = awakeFodder(s, pet), ok = fod.length >= AWAKE_COST;
      const x = h('button', 'btn small second', `Éveil → ${PET_RARITIES[pet.rar + 1].name}`); x.type = 'button'; x.disabled = !ok;
      x.title = `Fusionne ${AWAKE_COST} doublons de la même espèce (œufs ou familiers hors nid) : ${fod.length} disponible${fod.length > 1 ? 's' : ''}`;
      x.onclick = () => { if (awaken(s, pet)) { C.play('gold'); change(`Éveil ! ${petName(pet)} devient ${PET_RARITIES[pet.rar].name}.`); } };
      goals.append(x, h('span', 'cuHint', `${fod.length} / ${AWAKE_COST} doublons`));
    }
    col.append(goals);
    // accessoire porté
    const owned = ACC_IDS.filter(a => p.acc[a]);
    if (owned.length) {
      const ac = h('div', 'pmBtns');
      ac.append(h('span', 'cuHint', 'Accessoire :'));
      for (const a of [null, ...owned]) {
        const x = h('button', 'btn small second' + ((pet.acc || null) === a ? ' on' : ''), a ? ACCESSORIES[a].name : 'Aucun'); x.type = 'button';
        x.onclick = () => { wear(s, pet, a); C.play('buy'); change(); };
        ac.append(x);
      }
      col.append(ac);
    }
  }
  if (msg) col.append(h('p', 'pmMsg', msg));
  // boutons
  const btns = h('div', 'pmBtns');
  const b = (label, fn, cls = 'second') => { const x = h('button', 'btn small ' + cls, label); x.type = 'button'; x.onclick = fn; btns.append(x); return x; };
  if (p.active !== pet.uid) b('Emmener en expédition', () => place(pet.uid, 'active'), '');
  if (!p.nest.includes(pet.uid) && p.active !== pet.uid) { const x = b('Mettre au nid', () => place(pet.uid, 'nest')); x.disabled = p.nest.length >= nestSlots(s); if (x.disabled) x.title = 'Le nid est plein'; }
  if (p.nest.includes(pet.uid) && pet.stage) b(p.scout.includes(pet.uid) ? 'Rappeler au nid' : 'Envoyer en fouille', () => { toggleScout(s, pet); C.play('buy'); change(p.scout.includes(pet.uid) ? 'Il part fouiller : il rapportera des friandises (et parfois un œuf) après chaque expédition.' : 'Il revient au nid.'); });
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
    p.list = p.list.filter(x => x !== pet); p.nest = p.nest.filter(u => u !== pet.uid); p.scout = p.scout.filter(u => u !== pet.uid); if (p.active === pet.uid) p.active = null;
    gearOf(s).shards += releaseShards(pet); sel = null;
    change(`${petName(pet)} retourne à la nature (+${releaseShards(pet)} éclats).`);
  };
  col.append(rel);
}
