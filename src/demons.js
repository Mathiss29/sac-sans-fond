// Démons maison (future région des Enfers), dessinés en ASCII comme le reste.
// Inspiration : le pack « Tiny RPG Character Asset Pack 02 » de Zerie (aucun pixel repris).
// sym() : on dessine la moitié gauche (8 colonnes) et on la recopie en miroir.
const sym = rows => rows.map(r => r + [...r].reverse().join(''));

const IMP_A = sym([
  '........',
  '..O.....',
  '.OhO....',
  '.OhHOOOO',
  'O.OOrrpp',
  'ObOrrrpp',
  'ObbOrerr',
  'ObbOrrrr',
  '.ObbOrrw',
  '..OOOrrr',
  '....ORRr',
  '...ORrrR',
  '...ORORR',
  '....ORRR',
  '....OROO',
  '....OO..',
]);
const IMP_B = sym([
  '........',
  'O.O.....',
  'ObOhO...',
  'ObbhHOOO',
  'ObbOOrpp',
  '.ObOrrpp',
  '..OOrerr',
  '...Orrrr',
  '...OOrrw',
  '....Orrr',
  '....ORRr',
  '...ORrrR',
  '...ORORR',
  '....ORRR',
  '....OROO',
  '....OO..',
]);

const HOUND_A = [
  '...ff.....O.O.....',
  '..fFff...OkOkO....',
  '.OfFFfO.OkkkkkO...',
  'OkOffOOOkkkekkkOO.',
  'OkkOOkkkkkkkkkrrwO',
  '.OkkkkkkkkkkkOrrO.',
  '..OkkkkkkkkkkkOO..',
  '..OkKkkkkkkkkKO...',
  '..OKkKKkkkKKkKO...',
  '..OKO.OKO.OKOKO...',
  '..OO..OO..OO.OO...',
];
const HOUND_B = [
  '..ff......O.O.....',
  '.fFff....OkOkO....',
  '.OfFFf..OkkkkkO...',
  'OkOffOOOkkkekkkOO.',
  'OkkOOkkkkkkkkkrrwO',
  '.OkkkkkkkkkkkOrrO.',
  '..OkkkkkkkkkkkOO..',
  '..OkKkkkkkkkkKO...',
  '...OKkKKkKKkKO....',
  '...OKOOKOOKOKO....',
  '...OO.OO.OO.OO....',
];

const BLOOD_A = sym([
  '........',
  '......OO',
  '....OOrr',
  '...Orrpp',
  '..Orrppp',
  '..Orrrpp',
  '.OrrOOOO',
  '.OrOwOwO',
  '.OrOkkkk',
  '.OrOwOwO',
  '.OrrOOOO',
  'OrrrrrrR',
  'ORrrrRRR',
  '.ORORRRO',
  '..O.OOO.',
]);
const BLOOD_B = sym([
  '........',
  '........',
  '......OO',
  '....OOrr',
  '...Orrpp',
  '..Orrppp',
  '.OrrrOOO',
  '.OrrOwOw',
  'OrrrOkkk',
  'OrrrOwOw',
  'OrrrrOOO',
  'ORrrrrrR',
  'ORRrrRRR',
  '.OOORRRO',
  '....OOO.',
]);

const SKULL_A = sym([
  '....O...',
  '...OfO..',
  '..OfFfO.',
  '..OfFLfO',
  '.OfFLLFf',
  '.OOOOOOO',
  '.OhhhhhH',
  'OhhhhhhH',
  'OhOOOhhH',
  'OhOeOhhH',
  'OhOOOhhH',
  '.OhhhhOh',
  '..OHwOwH',
  '..OOHOHO',
  '...OOOOO',
]);
const SKULL_B = sym([
  '.....O..',
  '...O.fO.',
  '..OfOFfO',
  '..OfFLfO',
  '.OfFLLFf',
  '.OOOOOOO',
  '.OhhhhhH',
  'OhhhhhhH',
  'OhOOOhhH',
  'OhOeOhhH',
  'OhOOOhhH',
  '.OhhhhOh',
  '..OHwOwH',
  '..OOHOHO',
  '...OOOOO',
]);

// Sorcier démon (boss) : robe, cornes, bâton à orbe de feu tenu à droite.
const WARLOCK_BODY = sym([
  '........',
  '.O......',
  'OhO.....',
  'OhHO.OOO',
  '.OhOOkkk',
  '..OOkkkk',
  '...Okkkk',
  '...OkOrr',
  '...OkOer',
  '...OkOrr',
  '...OOkOr',
  '..OKkkOO',
  '.OKkkRRk',
  '.OKkRRRk',
  'OKkkkRkk',
  'OKkkkkkk',
  'OKkkkkkk',
  'OKKkkkkk',
  'OKKKkkkk',
  'OOKKKkkk',
  '.OOOOOOO',
]);
function withStaff(rows, lift) {
  const out = rows.map(r => (r + '..').split(''));
  const put = (x, y, c) => { if (out[y] && x < out[y].length) out[y][x] = c; };
  const y0 = 2 - lift;
  // orbe
  [['O', 15, y0], ['O', 16, y0], ['O', 14, y0 + 1], ['f', 15, y0 + 1], ['L', 16, y0 + 1], ['O', 17, y0 + 1],
   ['O', 14, y0 + 2], ['F', 15, y0 + 2], ['f', 16, y0 + 2], ['O', 17, y0 + 2], ['O', 15, y0 + 3], ['O', 16, y0 + 3]].forEach(([c, x, y]) => put(x, y, c));
  for (let y = y0 + 4; y < 20; y++) { put(15, y, 'O'); put(16, y, 'w'); put(17, y, 'O'); }
  // main qui tient le bâton
  put(14, 12, 'O'); put(14, 13, 'r');
  return out.map(r => r.join(''));
}
const WARLOCK_A = withStaff(WARLOCK_BODY, 0);
const WARLOCK_B = withStaff(['................', ...WARLOCK_BODY.slice(0, -1)], 1);

export const DEMONS = {
  imp: { name: 'Diablotin', frames: [IMP_A, IMP_B], pal: { r: '#d23c3c', R: '#8a1e2a', p: '#ff8a6a', h: '#f0e0c0', H: '#a89070', b: '#9a3a5a', e: '#ffe14a', w: '#ffffff' } },
  hound: { name: 'Chien des Enfers', frames: [HOUND_A, HOUND_B], pal: { k: '#6a3a4e', K: '#3e2232', e: '#ffe14a', r: '#c8283a', w: '#ffffff', f: '#ff9a3c', F: '#ffe14a' } },
  blood: { name: 'Gueule de sang', frames: [BLOOD_A, BLOOD_B], pal: { r: '#b8203a', R: '#6e1024', p: '#e8506a', w: '#ffffff', k: '#3a0a18' } },
  skull: { name: 'Crâne ardent', frames: [SKULL_A, SKULL_B], pal: { h: '#efe4c8', H: '#b0a080', e: '#ff5a2a', w: '#ffffff', f: '#ff7a2c', F: '#ffb040', L: '#fff0b0' } },
  warlock: { name: 'Sorcier des abîmes', frames: [WARLOCK_A, WARLOCK_B], pal: { k: '#3a1e3a', K: '#24122a', h: '#f0e0c0', H: '#a89070', r: '#d23c3c', e: '#ffe14a', R: '#ff5a2a', w: '#8a5a3a', f: '#ff7a2c', F: '#e0461e', L: '#fff0b0' } },
};
