// Pixel art du jeu, dessiné à la main sous forme de cartes de caractères.
// Chaque lettre est une couleur de la palette ; '.' est transparent.
// Les sprites sont convertis en petits canvas au chargement, puis agrandis sans lissage.

const BASE_PAL = {
  O: '#24161e', // contour
  s: '#fad6aa', S: '#deaa80', e: '#24161e', r: '#f08c82', // peau, yeux, joues
  t: '#ebe6d2', // corde, plume
  w: '#96643c', // bois
  y: '#f0c850', // or
};

// ---------- Héros : un corps commun, des têtes et des objets différents ----------

const BODY = [
  '......OOOO......',
  '....OOhhhhOO....',
  '...OhhhhhhhgO...',
  '..OhhhhhhhhhgO..',
  '..OhhHHHHHHhhO..',
  '.OhhHssssssHhhO.',
  '.OhHsseSSesSHhO.',
  '.OhHssessesSHhO.',
  '.OhHsrssssrsHhO.',
  '..OHHSsssSSHHO..',
  '..OcHHHHHHHHcO..',
  '.OsOccCbbCccOsO.',
  '.OsOccyccyccOsO.',
  '..OOcccccccCOO..',
  '...OppppppppO...',
  '...OppOOOOppO...',
  '...OBBO..OBBO...',
  '...OOO....OOO...',
];
const LEGS_B = ['...OppppppppO...', '...OBBOOOOBBO...', '...OOO....OOO...'];
// Deuxième image de marche : le haut du corps descend d'un pixel, les jambes se rapprochent.
const walk2 = rows => ['.'.repeat(16), ...rows.slice(0, rows.length - 4), ...LEGS_B];

const HEROES = {
  archer: {
    pal: { h: '#62a852', H: '#3e783c', g: '#96cd6e', c: '#a8704a', C: '#7a4e32', b: '#5a3a28', p: '#6e5a46', B: '#503428' },
    head: null,
    items: [{ x: 13, y: 6, rows: [
      '..O..', '.OwO.', '.OtwO', '.Ot.wO', '.Ot.wO', '.Ot.wO', '.Ot.wO', '.Ot.wO', '.OtwO', '.OwO.', '..O..',
    ] }],
  },
  mage: {
    pal: { a: '#4a78d0', A: '#2e4c96', i: '#aee6ff', I: '#f0fbff', h: '#e6eef8', H: '#b4c4dc', g: '#ffffff',
      c: '#5a8cdc', C: '#3a60aa', b: '#2e4c96', y: '#aee6ff', p: '#3a60aa', B: '#2a3a6a' },
    head: [
      '........O.......',
      '.......OaO......',
      '......OaaAO.....',
      '.....OaaiaAO....',
      '....OaaaaaaAO...',
      '..OOaaaaaaaaAOO.',
      '.OAAAAAAAAAAAAAO',
    ],
    cut: 5,
    items: [{ x: 13, y: 8, rows: [
      '.OOO.', 'OIiiO', 'OiIiO', '.OiO.', '.OwO.', '.OwO.', '.OwO.', '.OwO.', '..O..',
    ] }],
  },
  knight: {
    pal: { h: '#b4bccb', H: '#7c8498', g: '#e6ebf3', c: '#b4bccb', C: '#7c8498', b: '#6a4630', p: '#5a6276', B: '#3c4252',
      R: '#e0505a', u: '#3c6cc8', n: '#f0f4fa' },
    head: [
      '.......OOO......',
      '......ORRRO.....',
      '.......ORO......',
    ],
    cut: 0,
    items: [
      { x: 0, y: 11, rows: ['.OOOOO.', 'OuuyuuO', 'OyyyyyO', 'OuuyuuO', '.OuyuO.', '..OOO..'] },
      { x: 12, y: 6, rows: ['..O..', '.OnO.', '.OnO.', '.OnO.', '.OnO.', '.OnO.', 'OyyyO', '.OwO.', '..O..'] },
    ],
  },
  bard: {
    pal: { h: '#a0603a', H: '#784228', g: '#c48050', c: '#c84650', C: '#963040', b: '#f0c850', y: '#fff0a0',
      p: '#f0e0b4', B: '#6a4630', m: '#c84650', M: '#963040', k: '#e8b878', K: '#b07c48', z: '#4a2a1a' },
    head: [
      '...........OO...',
      '..........OtO...',
      '....OOOOOOtO....',
      '...OmmmmmmtmO...',
      '..OmmmmmmmmmMO..',
      '.OMMMMMMMMMMMMO.',
    ],
    cut: 4,
    items: [{ x: 0, y: 8, rows: [
      '.......OO', '......OwO', '.....OwO.', '.OOOOwO..', 'OkkkkOO..', 'OkzzkKO..', 'OkkkkKO..', '.OKKKO...', '..OOO....',
    ] }],
  },
};

// ---------- Élémentaires ----------

const WISP = [
  [
    '......O.........',
    '.....OfO...O....',
    '....OflfO.OfO...',
    '....OflfOOflO...',
    '...OfllffflfO...',
    '..OfllLllllffO..',
    '..OflLLLLLlffO..',
    '.OflLLLLLLLlfFO.',
    '.OflLeLLLeLlfFO.',
    '.OflLeLLLeLlfFO.',
    '.OfflLLLLLLlfFO.',
    '..OfflllllffFO..',
    '...OFfffffFFO...',
    '....OOFFFFOO....',
    '......OOOO......',
  ],
  [
    '................',
    '........O.......',
    '.....O.OfO......',
    '....OfOOflO.O...',
    '....OflfflfOfO..',
    '...OfllffllflO..',
    '..OfllLllllffO..',
    '.OflLLLLLLLlfFO.',
    '.OflLeLLLeLlfFO.',
    '.OflLeLLLeLlfFO.',
    '.OfflLLLLLLlfFO.',
    '..OfflllllffFO..',
    '...OFfffffFFO...',
    '....OOFFFFOO....',
    '......OOOO......',
  ],
];
const GOLEM = (() => {
  const top = [
    '....OOOOOOOO....',
    '...OkkkkkkkkO...',
    '..OkkkKkkkkkKO..',
    '..OkkyykkyykKO..',
    '..OkkyykkyykKO..',
    '..OKkkkkkkkkKO..',
    '.OOKKkkkkkkKKOO.',
    'OkkOKKKKKKKKOkkO',
    'OkkOkkkkkkkkOkkO',
    'OKkOkkkdkkkkOKkO',
    'OKKOkkkkdkkkOKKO',
    '.OOOkkkkkkkKOOO.',
    '...OKkkkkkKKO...',
  ];
  return [
    [...top, '...OKKOOOOKKO...', '...OKKO..OKKO...', '...OOOO..OOOO...'],
    ['.'.repeat(16), ...top, '...OKKOOOOKKO...', '...OOOO..OOOO...'],
  ];
})();
const WIND = [
  [
    '......OOOO......',
    '....OOwwwwOO....',
    '...OwwWWWWwwO...',
    '..OwWWWWWWWWwO..',
    '..OwWWeWWeWWwO..',
    '..OwWWeWWeWWwO..',
    '..OwWWWWWWWWwO..',
    '...OwWWWWWWwO...',
    '....OwwWWwwO....',
    '.....OOwwWO.....',
    '.......OwWO.....',
    '........OwO.....',
    '.........O......',
  ],
  [
    '......OOOO......',
    '....OOwwwwOO....',
    '...OwwWWWWwwO...',
    '..OwWWWWWWWWwO..',
    '..OwWWeWWeWWwO..',
    '..OwWWeWWeWWwO..',
    '..OwWWWWWWWWwO..',
    '...OwWWWWWWwO...',
    '....OwwWWwwO....',
    '.....OWwwOO.....',
    '.....OWwO.......',
    '.....OwO........',
    '......O.........',
  ],
];
const ENEMY_PAL = {
  wisp: { f: '#ff9a3c', F: '#e65032', l: '#ffe682', L: '#fffadc' },
  boss: { f: '#ff5a2a', F: '#a8242a', l: '#ffb040', L: '#fff0b0', O: '#3a0e14' },
  gold: { f: '#ffd246', F: '#d2961e', l: '#fff096', L: '#ffffff', O: '#5a3a10' },
  golem: { k: '#be7850', K: '#8c5238', y: '#ffd25a', d: '#6a3a24' },
  wind: { w: '#8ed2e6', W: '#e6f7fb', O: '#2a3e5a' },
};

const COIN = ['..OOO..', '.OlyyO.', 'OlyyyYO', 'OyyyyYO', 'OyyyYYO', '.OYYYO.', '..OOO..'];
const COIN_PAL = { O: '#6e3c14', y: '#ffcd3c', l: '#fff5b4', Y: '#d28c1e' };
// Butin plus précieux que la pièce : lingot (×5), gemme (×25), couronne (×100).
const BAR = [
  '...OOOOOOO..',
  '..OllllyyYO.',
  '.OlyyyyyyYYO',
  'OlyyyyyyyYYO',
  'OyyyyyyyYYOO',
  'OYYYYYYYYOO.',
  '.OOOOOOOOO..',
];
const GEM = [
  '..OOOOO..',
  '.OwwlbbO.',
  'OwllbbbBO',
  'OOOOOOOOO',
  '.OlbbbBO.',
  '..ObbBO..',
  '...OBO...',
  '....O....',
];
const CROWN = [
  '.O...O...O.',
  'OlO.OlO.OyO',
  'OyyOyyyOyYO',
  'OlyyyyyyyYO',
  'OyrRyybByYO',
  'OyyyyyyyyYO',
  'OYYYYYYYYYO',
  '.OOOOOOOOO.',
];
const LOOT_PAL = { O: '#5a2e10', y: '#ffcd3c', l: '#fff5b4', Y: '#d28c1e', w: '#ffffff', b: '#5fd6f0', B: '#1d6f8a', r: '#ff5a5a', R: '#a8201e' };
const GEM_PAL = { ...LOOT_PAL, O: '#123a52', l: '#b8f2ff' };

// ---------- Construction des canvas ----------

export function toCanvas(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const col = pal[rows[y][x]];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return c;
}
// Version blanche du sprite, pour le flash quand il est touché.
export function whiteOf(c) {
  const w = document.createElement('canvas'); w.width = c.width; w.height = c.height;
  const g = w.getContext('2d'); g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return w;
}
// Place un petit dessin (objet tenu) par-dessus une carte, en élargissant si besoin.
function stamp(rows, item) {
  const out = rows.map(r => r.split(''));
  item.rows.forEach((line, dy) => {
    const y = item.y + dy;
    if (y < 0 || y >= out.length) { if (line.replace(/\./g, '')) console.warn('sprite coupé : objet hors cadre', item); return; }
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx]; if (ch === '.') continue;
      const x = item.x + dx;
      while (out[y].length <= x) out[y].push('.');
      out[y][x] = ch;
    }
  });
  const w = Math.max(...out.map(r => r.length));
  return out.map(r => r.join('').padEnd(w, '.'));
}
function heroFrames(def) {
  const stand = def.head ? [...def.head, ...BODY.slice(def.cut)] : BODY;
  const offset = def.head ? def.head.length - def.cut : 0;
  return [stand, walk2(stand)].map((rows, k) => {
    for (const it of def.items) rows = stamp(rows, { ...it, y: it.y + offset + k });
    return toCanvas(rows, { ...BASE_PAL, ...def.pal });
  });
}

export const SPR = {};

// Planches dessinées (générées avec l'IA puis converties) : une bande par animation,
// cellules de taille fixe, pieds sur la dernière ligne. Le personnage regarde vers la gauche.
export const HERO_SHEETS = {
  archer: { cell: [48, 52], anchor: 23, fps: { idle: 6, walk: 11, hurt: 6, victory: 6 },
    anims: { idle: 6, walk: 8, attack: 6, hurt: 2, victory: 4 }, release: 3 },
  mage: { cell: [60, 52], anchor: 31, fps: { idle: 6, walk: 11, hurt: 6, victory: 6 },
    anims: { idle: 6, walk: 8, attack: 6, hurt: 2, victory: 4 }, release: 3 },
  knight: { cell: [60, 52], anchor: 31, fps: { idle: 6, walk: 12, hurt: 6, victory: 6 },
    anims: { idle: 6, walk: 8, attack: 6, hurt: 2, victory: 4 }, release: 2 },
  bard: { cell: [60, 52], anchor: 31, fps: { idle: 6, walk: 11, hurt: 6, victory: 6 },
    anims: { idle: 6, walk: 8, attack: 6, hurt: 2, victory: 4 }, release: 2 },
};
export function loadHeroSheets(base = 'assets/sprites/heros/') {
  SPR.sheets = SPR.sheets || {};
  const jobs = [];
  for (const [id, def] of Object.entries(HERO_SHEETS)) {
    const sheet = { ...def, img: {} };
    for (const anim of Object.keys(def.anims)) {
      const im = new Image();
      jobs.push(new Promise(ok => { im.onload = () => ok(true); im.onerror = () => ok(false); }));
      im.src = `${base}${id}/${anim}.png`;
      sheet.img[anim] = im;
    }
    SPR.sheets[id] = sheet;
  }
  return Promise.all(jobs).then(r => r.every(Boolean));
}

export function buildSprites() {
  if (SPR.ready) return SPR;
  SPR.heroes = {};
  for (const [id, def] of Object.entries(HEROES)) SPR.heroes[id] = heroFrames(def);
  const mk = (frames, pal) => frames.map(f => { const c = toCanvas(f, { ...BASE_PAL, ...pal }); return { c, white: whiteOf(c) }; });
  SPR.enemies = {
    wisp: mk(WISP, ENEMY_PAL.wisp),
    gold: mk(WISP, ENEMY_PAL.gold),
    boss: mk(WISP, ENEMY_PAL.boss),
    golem: mk(GOLEM, ENEMY_PAL.golem),
    wind: mk(WIND, ENEMY_PAL.wind),
  };
  SPR.coin = toCanvas(COIN, COIN_PAL);
  SPR.loot = { coin: SPR.coin, bar: toCanvas(BAR, LOOT_PAL), gem: toCanvas(GEM, GEM_PAL), crown: toCanvas(CROWN, LOOT_PAL) };
  SPR.ready = true;
  return SPR;
}

// ---------- Dessin procédural en pixels (sac, décor) ----------

export function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
export function mix(hex, f) {
  const [r, g, b] = hexRgb(hex);
  const ch = v => Math.max(0, Math.min(255, Math.round(v + (f > 0 ? (255 - v) * f : v * f))));
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

// Sac en pixel art : forme de bourse, ombré, coutures, runes, fissures.
// size = rayon du ventre en pixels d'art (10 à 16 environ).
const bagCache = new Map();
export function bagSprite(tier, size, cracks, runesOn) {
  const key = `${tier.id}:${size}:${cracks}:${runesOn}`;
  if (bagCache.has(key)) return bagCache.get(key);
  const R = size, neck = Math.max(2, Math.round(R * 0.22));
  const frill = Math.max(3, Math.round(R * 0.35)), neckLen = Math.max(2, Math.round(R * 0.25));
  const W = Math.round(R * 2.2) + 4, H = Math.ceil(R * 1.9 + neckLen + frill + 3);
  const cx = W / 2, cy = H - R * 0.9 - 1; // centre du ventre
  const bodyTop = cy - R * 0.95;
  const nt = 0; // haut de la collerette
  const neckY = frill + 1; // ligne de la ficelle
  const inside = (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const dx = (px - cx) / (R * 1.08), dy = (py - cy) / (R * (py > cy ? 0.9 : 0.95));
    if (dx * dx + dy * dy <= 1) return true;
    // épaules arrondies vers le col
    if (py < bodyTop + R * 0.3 && py >= neckY) {
      const k = Math.max(0, Math.min(1, (bodyTop + R * 0.3 - py) / (bodyTop + R * 0.3 - neckY)));
      const half = R * 0.6 * Math.sqrt(1 - k) + neck * k;
      return Math.abs(px - cx) <= Math.max(neck, half);
    }
    // collerette froncée au-dessus de la ficelle
    if (py < neckY && py >= nt) {
      const k = (neckY - py) / frill;
      const wave = (Math.floor(px) % 3 === 0 && py < nt + 1.5) ? -1 : 0;
      return py >= nt + (wave ? 1 : 0) && Math.abs(px - cx) <= neck + 0.6 + k * R * 0.45;
    }
    return false;
  };
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const base = tier.color, light = mix(base, 0.35), dark = mix(base, -0.3), darker = mix(base, -0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    let col;
    if (edge) col = '#24161e';
    else {
      const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - cy) / R;
      const l = -nx * 0.6 - ny * 0.8;
      col = l > 0.55 ? light : l < -0.45 ? darker : l < -0.1 ? dark : base;
      if (y < neckY) col = (x + y) % 2 ? base : light; // collerette
    }
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  // ouverture sombre et ficelle
  g.fillStyle = '#3a2014'; g.fillRect(Math.round(cx - neck - frill * 0.3), nt + 1, Math.round(neck * 2 + frill * 0.6), 1);
  const knotY = neckY;
  g.fillStyle = '#c9a45a'; g.fillRect(Math.round(cx - neck - 1), knotY, neck * 2 + 2, 1);
  g.fillStyle = '#8a6a32'; g.fillRect(Math.round(cx + neck - 1), knotY + 1, 1, 2); g.fillRect(Math.round(cx + neck), knotY + 3, 1, 1);
  // couture en pointillés sur le flanc gauche
  g.fillStyle = tier.seam;
  for (let a = 0.6; a < 2.2; a += 0.22) {
    const x = Math.round(cx - Math.sin(a) * R * 0.62), y = Math.round(cy - Math.cos(a) * R * 0.7);
    if (inside(x, y)) g.fillRect(x, y, 1, 1);
  }
  // pièce du blason au centre
  g.fillStyle = tier.seam; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
  g.fillStyle = runesOn ? tier.glow : light; g.fillRect(Math.round(cx), Math.round(cy), 1, 1);
  if (runesOn) {
    g.fillStyle = tier.glow;
    for (const [dx, dy] of [[-0.55, -0.15], [0.5, -0.3], [0.1, 0.5], [-0.3, 0.45]]) g.fillRect(Math.round(cx + dx * R), Math.round(cy + dy * R), 1, 1);
  }
  if (cracks) {
    g.fillStyle = tier.glow;
    let x = Math.round(cx + R * 0.45), y = Math.round(cy - R * 0.5);
    for (let i = 0; i < Math.round(R * 0.6); i++) { g.fillRect(x, y, 1, 1); y++; x += i % 2 ? 1 : -1; }
    if (cracks > 1) { x = Math.round(cx - R * 0.6); y = Math.round(cy - R * 0.1); for (let i = 0; i < Math.round(R * 0.5); i++) { g.fillRect(x, y, 1, 1); y++; x += i % 3 ? 0 : 1; } }
  }
  const out = { c, w: W, h: H, footY: H - 1 };
  bagCache.set(key, out);
  return out;
}

// Décor de la prairie, dessiné en basse résolution.
export function buildMeadow(w, h, zone, seed = 7) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = zone.ground[0]; g.fillRect(0, 0, w, h);
  // grandes taches d'herbe plus claire/plus sombre, en blocs
  for (let i = 0; i < (w * h) / 2600; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), r = 4 + Math.floor(rnd() * 10);
    g.fillStyle = rnd() < 0.5 ? zone.patch : zone.ground[1];
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) {
      if ((xx * xx) / 4 + yy * yy <= r * r * (0.8 + rnd() * 0.3)) g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
  // brins d'herbe
  g.fillStyle = zone.ground[1];
  for (let i = 0; i < (w * h) / 40; i++) { const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h); g.fillRect(x, y, 1, 2); if (rnd() < 0.4) g.fillRect(x + 1, y + 1, 1, 1); }
  g.fillStyle = zone.patch;
  for (let i = 0; i < (w * h) / 120; i++) g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
  // fleurs
  for (let i = 0; i < (w * h) / 700; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    g.fillStyle = zone.flower[Math.floor(rnd() * zone.flower.length)];
    g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1);
    g.fillStyle = '#f2b33d'; g.fillRect(x, y, 1, 1);
  }
  // rochers
  for (let i = 0; i < Math.max(4, (w * h) / 6000); i++) blob(g, Math.floor(rnd() * w), Math.floor(rnd() * h), 2 + Math.floor(rnd() * 3), zone.rock, rnd);
  // lisière d'arbres
  const trees = [];
  const n = Math.round((w + h) / 9);
  for (let i = 0; i < n; i++) {
    const edge = Math.floor(rnd() * 4), d = rnd() * 10 - 3;
    const x = edge === 0 || edge === 2 ? rnd() * w : edge === 1 ? w - d : d;
    const y = edge === 1 || edge === 3 ? rnd() * h : edge === 0 ? d : h - d + 4;
    trees.push([Math.round(x), Math.round(y), 6 + Math.floor(rnd() * 5)]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of trees) tree(g, x, y, r, zone.tree, rnd);
  return c;
}

function blob(g, x, y, r, col, rnd) {
  const light = mix(col, 0.3), dark = mix(col, -0.35);
  g.fillStyle = 'rgba(0,0,0,.2)';
  for (let xx = -r; xx <= r; xx++) g.fillRect(x + xx, y + Math.round(r * 0.7) + 1, 1, 1);
  for (let yy = -r; yy <= r; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
    const d = (xx * xx) / ((r + 1) * (r + 1)) + (yy * yy) / (r * r * 0.6);
    if (d > 1) continue;
    const edge = d > 0.62;
    g.fillStyle = edge ? '#24161e' : yy < -r * 0.2 && xx < 0 ? light : yy > r * 0.2 ? dark : col;
    g.fillRect(x + xx, y + yy, 1, 1);
  }
}

function tree(g, x, y, r, col, rnd) {
  const light = mix(col, 0.25), lighter = mix(col, 0.45), dark = mix(col, -0.35);
  // ombre et tronc
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let xx = -r; xx <= r; xx++) for (let yy = 0; yy < 3; yy++) g.fillRect(x + xx, y + r + yy, 1, 1);
  g.fillStyle = '#24161e'; g.fillRect(x - 2, y + r - 3, 4, 6);
  g.fillStyle = '#7a4e32'; g.fillRect(x - 1, y + r - 3, 2, 5);
  // feuillage : un gros rond bosselé, contour sombre
  const pts = [];
  for (let yy = -r - 1; yy <= r; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) {
    const bump = Math.sin(Math.atan2(yy, xx) * 5 + x) * 0.9;
    if (xx * xx + yy * yy <= (r + bump) * (r + bump)) pts.push([xx, yy]);
  }
  const set = new Set(pts.map(p => p.join(',')));
  for (const [xx, yy] of pts) {
    const edge = !set.has(`${xx - 1},${yy}`) || !set.has(`${xx + 1},${yy}`) || !set.has(`${xx},${yy - 1}`) || !set.has(`${xx},${yy + 1}`);
    const l = (-xx * 0.6 - yy * 0.8) / r;
    g.fillStyle = edge ? '#1c2a1c' : l > 0.6 ? lighter : l > 0.15 ? light : l < -0.4 ? dark : col;
    g.fillRect(x + xx, y + yy, 1, 1);
  }
}

// Grande map d'une région : chemins de terre, bosquets, étang, clairière du campement au centre,
// clairière sombre du boss dans un coin. Dessinée en basse résolution (1 pixel = 1 pixel d'art).
// Renvoie le canvas et quelques repères (en pixels d'art) pour le jeu et la mini-map.
export function buildMap(w, h, zone, seed = 11) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const busy = new Uint8Array(w * h); // 1 = chemin/eau/campement : pas d'arbre ni de rocher
  const mark = (x, y, r) => {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      const X = Math.round(x + xx), Y = Math.round(y + yy);
      if (X >= 0 && Y >= 0 && X < w && Y < h && xx * xx + yy * yy <= r * r) busy[Y * w + X] = 1;
    }
  };
  const isBusy = (x, y, r = 0) => {
    for (let yy = -r; yy <= r; yy += Math.max(1, r)) for (let xx = -r; xx <= r; xx += Math.max(1, r)) {
      const X = Math.round(x + xx), Y = Math.round(y + yy);
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      if (busy[Y * w + X]) return true;
    }
    return false;
  };

  // sol et taches d'herbe
  g.fillStyle = zone.ground[0]; g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 2200; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), r = 5 + Math.floor(rnd() * 14);
    g.fillStyle = rnd() < 0.5 ? zone.patch : zone.ground[1];
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) {
      if ((xx * xx) / 4 + yy * yy <= r * r * (0.8 + rnd() * 0.3)) g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
  g.fillStyle = zone.ground[1];
  for (let i = 0; i < (w * h) / 40; i++) { const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h); g.fillRect(x, y, 1, 2); if (rnd() < 0.4) g.fillRect(x + 1, y + 1, 1, 1); }
  g.fillStyle = zone.patch;
  for (let i = 0; i < (w * h) / 120; i++) g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);

  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  const boss = { x: Math.round(w * 0.84), y: Math.round(h * 0.2), r: Math.round(Math.min(w, h) * 0.13) };
  const pond = { x: Math.round(w * 0.24), y: Math.round(h * 0.28), r: Math.round(Math.min(w, h) * 0.08) };

  // clairière du boss : sol sombre et cercle de pierres
  for (let yy = -boss.r; yy <= boss.r; yy++) for (let xx = -boss.r; xx <= boss.r; xx++) {
    const d = (xx * xx + yy * yy) / (boss.r * boss.r);
    const edge = 1 - (Math.sin(Math.atan2(yy, xx) * 7) * 0.06 + 0.06);
    if (d > edge) continue;
    g.fillStyle = d > edge - 0.12 ? zone.ground[1] : mix(zone.ground[1], -0.28);
    g.fillRect(boss.x + xx, boss.y + yy, 1, 1);
  }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob(g, Math.round(boss.x + Math.cos(a) * boss.r * 0.8), Math.round(boss.y + Math.sin(a) * boss.r * 0.6), 2, mix(zone.rock, -0.15), rnd); }
  mark(boss.x, boss.y, boss.r);

  // chemins : du campement vers les bords et vers la clairière du boss
  const dirt = zone.path || '#c9a06a', dirtDark = mix(dirt, -0.25), dirtLight = mix(dirt, 0.2);
  const paths = [
    [cx, cy, 0, Math.round(h * 0.62)], [cx, cy, w, Math.round(h * 0.45)],
    [cx, cy, Math.round(w * 0.42), h], [cx, cy, boss.x, boss.y], [cx, cy, Math.round(w * 0.36), 0],
  ];
  const dots = [];
  for (const [x0, y0, x1, y1] of paths) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    const ph = rnd() * 6, amp = 6 + rnd() * 10;
    const nx = -(y1 - y0) / n, ny = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) {
      const k = i / n, wob = Math.sin(k * 7 + ph) * amp * Math.sin(k * Math.PI);
      dots.push([x0 + (x1 - x0) * k + nx * wob, y0 + (y1 - y0) * k + ny * wob]);
    }
  }
  const PW = 3;
  g.fillStyle = dirtDark; for (const [x, y] of dots) g.fillRect(Math.round(x) - PW - 1, Math.round(y) - PW, PW * 2 + 2, PW * 2 + 1);
  g.fillStyle = dirt; for (const [x, y] of dots) g.fillRect(Math.round(x) - PW, Math.round(y) - PW + 1, PW * 2, PW * 2 - 1);
  g.fillStyle = dirtLight; for (let i = 0; i < dots.length; i += 7) { const [x, y] = dots[i]; g.fillRect(Math.round(x) - 1 + (i % 3), Math.round(y) - 1, 1, 1); }
  for (const [x, y] of dots) mark(x, y, PW + 3);

  // clairière du campement (là où trône le sac)
  const camp = Math.round(Math.min(w, h) * 0.04);
  for (let yy = -camp; yy <= camp; yy++) for (let xx = -camp * 1.4; xx <= camp * 1.4; xx++) {
    const d = (xx * xx) / (camp * camp * 1.96) + (yy * yy) / (camp * camp);
    if (d > 1) continue;
    g.fillStyle = d > 0.86 ? dirtDark : d > 0.7 && rnd() < 0.25 ? dirtLight : dirt;
    g.fillRect(cx + Math.round(xx), cy + Math.round(yy), 1, 1);
  }
  mark(cx, cy, Math.round(camp * 1.5));
  // pierres autour du campement
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; blob(g, Math.round(cx + Math.cos(a) * camp * 1.5), Math.round(cy + Math.sin(a) * camp * 1.05), 1 + (i % 2), zone.rock, rnd); }

  // étang
  const water = zone.water || '#3f8fc8', wDark = mix(water, -0.35), wLight = mix(water, 0.45);
  for (let yy = -pond.r; yy <= pond.r; yy++) for (let xx = -pond.r * 1.6; xx <= pond.r * 1.6; xx++) {
    const ang = Math.atan2(yy, xx), rr = 1 + Math.sin(ang * 3 + 1) * 0.12;
    const d = Math.sqrt((xx * xx) / 2.56 + yy * yy) / (pond.r * rr);
    if (d > 1) continue;
    g.fillStyle = d > 0.9 ? '#24161e' : d > 0.8 ? mix(zone.ground[1], -0.2) : yy < -pond.r * 0.3 && d > 0.6 ? wLight : d > 0.55 ? water : wDark;
    g.fillRect(pond.x + Math.round(xx), pond.y + Math.round(yy), 1, 1);
  }
  g.fillStyle = wLight;
  for (let i = 0; i < 14; i++) { const x = pond.x + Math.round((rnd() - 0.5) * pond.r * 2), y = pond.y + Math.round((rnd() - 0.5) * pond.r); g.fillRect(x, y, 3, 1); }
  mark(pond.x, pond.y, Math.round(pond.r * 1.7));

  // fleurs et rochers sur l'herbe libre
  for (let i = 0; i < (w * h) / 600; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    if (isBusy(x, y)) continue;
    g.fillStyle = zone.flower[Math.floor(rnd() * zone.flower.length)];
    g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1);
    g.fillStyle = '#f2b33d'; g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < (w * h) / 5000; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    if (!isBusy(x, y, 3)) blob(g, x, y, 2 + Math.floor(rnd() * 3), zone.rock, rnd);
  }

  // bosquets + lisière épaisse sur les bords
  const trees = [];
  const tryTree = (x, y) => {
    const r = 6 + Math.floor(rnd() * 5);
    if (x < -4 || y < -4 || x > w + 4 || y > h + 4 || isBusy(x, y + r, Math.round(r * 0.6))) return;
    trees.push([Math.round(x), Math.round(y), r]);
  };
  const clumps = Math.round((w * h) / 9000);
  for (let i = 0; i < clumps; i++) {
    const x0 = rnd() * w, y0 = rnd() * h, rad = 14 + rnd() * 30, n = 4 + Math.floor(rnd() * 12);
    for (let k = 0; k < n; k++) { const a = rnd() * 7, d = Math.sqrt(rnd()) * rad; tryTree(x0 + Math.cos(a) * d * 1.3, y0 + Math.sin(a) * d); }
  }
  const edgeN = Math.round((w + h) / 4);
  for (let i = 0; i < edgeN; i++) {
    const edge = Math.floor(rnd() * 4), d = rnd() * 22 - 4;
    const x = edge === 0 || edge === 2 ? rnd() * w : edge === 1 ? w - d : d;
    const y = edge === 1 || edge === 3 ? rnd() * h : edge === 0 ? d : h - d + 4;
    tryTree(x, y);
  }
  trees.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of trees) tree(g, x, y, r, zone.tree, rnd);

  return { c, camp: { x: cx, y: cy, r: camp }, boss, pond };
}

// Antre du boss : salle ronde de dalles, fissures de lave, cercle runique, braseros sur le pourtour.
// Renvoie aussi la position des braseros (en pixels d'art) pour animer leurs flammes.
export function buildArena(w, h, seed = 23) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const cx = w / 2, cy = h * 0.52, rx = w * 0.45, ry = h * 0.42;
  const inFloor = (x, y, k = 1) => ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 <= 1;
  // roche sombre tout autour
  g.fillStyle = '#2a1a1e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 30; i++) { g.fillStyle = rnd() < 0.5 ? '#33202a' : '#211418'; g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1 + (rnd() < 0.3), 1); }
  for (let i = 0; i < (w * h) / 1400; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h);
    if (!inFloor(x, y, 1.12)) blob(g, x, y, 2 + Math.floor(rnd() * 4), '#4a3438', rnd);
  }
  // mares de lave dans les coins
  const lava = (x0, y0, r) => {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 1.5; xx <= r * 1.5; xx++) {
      const d = (xx * xx) / (r * r * 2.25) + (yy * yy) / (r * r);
      const wob = 1 + Math.sin(Math.atan2(yy, xx) * 5 + x0) * 0.1;
      if (d > wob) continue;
      g.fillStyle = d > wob - 0.15 ? '#24161e' : d > wob - 0.35 ? '#e0461e' : rnd() < 0.08 ? '#fff0b0' : d < 0.3 ? '#ffd25a' : '#ff7a2c';
      g.fillRect(Math.round(x0 + xx), Math.round(y0 + yy), 1, 1);
    }
  };
  lava(w * 0.08, h * 0.12, Math.round(h * 0.07)); lava(w * 0.93, h * 0.14, Math.round(h * 0.06));
  lava(w * 0.06, h * 0.9, Math.round(h * 0.06)); lava(w * 0.95, h * 0.88, Math.round(h * 0.07));
  // bord de la salle : muret sombre puis dalles
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inFloor(x, y, 1.04)) continue;
    if (!inFloor(x, y)) { g.fillStyle = y < cy ? '#5c4448' : '#24161e'; g.fillRect(x, y, 1, 1); continue; }
    const TW = 9, TH = 6, row = Math.floor(y / TH), off = row % 2 ? 4 : 0, col = Math.floor((x + off) / TW);
    const mortar = y % TH === 0 || (x + off) % TW === 0;
    const v = ((row * 73 + col * 151) % 7) / 7;
    g.fillStyle = mortar ? '#33242a' : v < 0.3 ? '#5a4446' : v < 0.7 ? '#4e3a3c' : '#634b4a';
    g.fillRect(x, y, 1, 1);
    if (!mortar && y % TH === 1 && rnd() < 0.25) { g.fillStyle = '#6e5654'; g.fillRect(x, y, 1, 1); }
  }
  // cercle runique au centre
  const rr = Math.min(rx, ry) * 0.42;
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    g.fillStyle = '#7a3a2a'; g.fillRect(Math.round(cx + Math.cos(a) * rr * 1.4), Math.round(cy + Math.sin(a) * rr), 1, 1);
    g.fillRect(Math.round(cx + Math.cos(a) * (rr * 1.4 - 5)), Math.round(cy + Math.sin(a) * (rr - 4)), 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (rr * 1.4 - 2.5)), y = Math.round(cy + Math.sin(a) * (rr - 2));
    g.fillStyle = '#c0582c'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
  }
  // fissures de lave
  for (let k = 0; k < 9; k++) {
    let x = cx + (rnd() - 0.5) * rx * 1.6, y = cy + (rnd() - 0.5) * ry * 1.6, a = rnd() * 7;
    const n = 14 + Math.floor(rnd() * 22);
    for (let i = 0; i < n; i++) {
      if (!inFloor(x, y, 0.95)) break;
      g.fillStyle = '#24161e'; g.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
      g.fillStyle = i % 5 === 2 ? '#ffd25a' : '#ff7a2c'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      a += (rnd() - 0.5) * 1.2; x += Math.cos(a); y += Math.sin(a) * 0.7;
    }
  }
  // braseros sur le pourtour (le haut de la salle seulement, pour ne pas gêner)
  const braziers = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i + 0.5) / 6 * Math.PI;
    const x = Math.round(cx + Math.cos(a) * rx * 0.97), y = Math.round(cy + Math.sin(a) * ry * 0.97);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 4, y + 3, 9, 2);
    g.fillStyle = '#24161e'; g.fillRect(x - 4, y - 4, 9, 8);
    g.fillStyle = '#6e5654'; g.fillRect(x - 3, y - 3, 7, 6);
    g.fillStyle = '#8a7068'; g.fillRect(x - 3, y - 3, 7, 1);
    g.fillStyle = '#4a3438'; g.fillRect(x - 3, y + 1, 7, 2);
    g.fillStyle = '#24161e'; g.fillRect(x - 5, y - 6, 11, 2);
    g.fillStyle = '#8a5a3a'; g.fillRect(x - 4, y - 6, 9, 1);
    braziers.push({ x, y: y - 6 });
  }
  return { c, braziers, center: { x: cx, y: cy } };
}

// Portail de pierre : arche et piliers. L'intérieur (tourbillon) est dessiné à part, animé.
let portalCache = null;
export function portalSprite() {
  if (portalCache) return portalCache;
  const W = 26, H = 30;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const stone = '#8a7a72', light = '#b0a296', dark = '#5a4c48', ink = '#24161e';
  const cx = 13, top = 12, R = 11;
  // arche : couronne entre R-3 et R
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let inStone = false, d;
    if (y <= top) { d = Math.hypot(x + 0.5 - cx, y + 0.5 - top); inStone = d <= R + 1 && d >= R - 3; }
    else inStone = (x >= cx - R - 1 && x <= cx - R + 3) || (x >= cx + R - 4 && x <= cx + R);
    if (!inStone) continue;
    let edge = false;
    if (y <= top) edge = d > R || d < R - 2;
    else edge = x === cx - R - 1 || x === cx - R + 3 || x === cx + R - 4 || x === cx + R || y === H - 1;
    g.fillStyle = edge ? ink : (x + y) % 7 === 0 ? dark : x < cx && (y < top || x === cx - R) ? light : stone;
    g.fillRect(x, y, 1, 1);
  }
  // clé de voûte et socles
  g.fillStyle = ink; g.fillRect(cx - 2, 0, 5, 4); g.fillStyle = '#ff9a3c'; g.fillRect(cx - 1, 1, 3, 2);
  g.fillStyle = ink; g.fillRect(cx - R - 2, H - 4, 7, 4); g.fillRect(cx + R - 5, H - 4, 7, 4);
  g.fillStyle = dark; g.fillRect(cx - R - 1, H - 3, 5, 2); g.fillRect(cx + R - 4, H - 3, 5, 2);
  portalCache = { c, w: W, h: H, inner: { x: cx, y: 17, rx: 8, ry: 13 } };
  return portalCache;
}
