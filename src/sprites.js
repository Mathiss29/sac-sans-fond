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
  gold: { f: '#ffd246', F: '#d2961e', l: '#fff096', L: '#ffffff', O: '#5a3a10' },
  golem: { k: '#be7850', K: '#8c5238', y: '#ffd25a', d: '#6a3a24' },
  wind: { w: '#8ed2e6', W: '#e6f7fb', O: '#2a3e5a' },
};

const COIN = ['..OOO..', '.OlyyO.', 'OlyyyYO', 'OyyyyYO', 'OyyyYYO', '.OYYYO.', '..OOO..'];
const COIN_PAL = { O: '#6e3c14', y: '#ffcd3c', l: '#fff5b4', Y: '#d28c1e' };

// ---------- Construction des canvas ----------

function toCanvas(rows, pal) {
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
function whiteOf(c) {
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
export function buildSprites() {
  if (SPR.ready) return SPR;
  SPR.heroes = {};
  for (const [id, def] of Object.entries(HEROES)) SPR.heroes[id] = heroFrames(def);
  const mk = (frames, pal) => frames.map(f => { const c = toCanvas(f, { ...BASE_PAL, ...pal }); return { c, white: whiteOf(c) }; });
  SPR.enemies = {
    wisp: mk(WISP, ENEMY_PAL.wisp),
    gold: mk(WISP, ENEMY_PAL.gold),
    golem: mk(GOLEM, ENEMY_PAL.golem),
    wind: mk(WIND, ENEMY_PAL.wind),
  };
  SPR.coin = toCanvas(COIN, COIN_PAL);
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
