# Convertit une planche ChatGPT d'ennemis (3 lignes × 4 images, fond gris uni) en bandes de sprites du jeu.
# Usage : python3 tools/convertir-planche-ennemis.py planche.png sortie_dossier nomA nomB nomC [taille_pixel]
# Pour chaque ligne : fond retiré, grille de pixels retrouvée (phase qui minimise la variance des blocs),
# une couleur par bloc, puis les 4 images posées pieds en bas, centrées, dans des cases de même taille.
import sys, numpy as np
from PIL import Image

src, out, *names = sys.argv[1:]
P = 8
if names and names[-1].isdigit(): P = int(names.pop())
a = np.array(Image.open(src).convert('RGB')).astype(int)
H, W = a.shape[:2]
bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]), 0)
fg = np.abs(a - bg).sum(2) > 36

def runs(v):
    out, on, s = [], False, 0
    for i, x in enumerate(list(v) + [False]):
        if x and not on: on, s = True, i
        if not x and on: on = False; out.append((s, i))
    return out

def fill_holes(img, maxn=60):
    # trous fermés à l'intérieur du sprite (couleur trop proche du fond gris) : on les rebouche
    a = img[..., 3] > 0; H, W = a.shape; seen = np.zeros_like(a)
    for y in range(H):
        for x in range(W):
            if a[y, x] or seen[y, x]: continue
            comp, st, edge = [], [(y, x)], False; seen[y, x] = True
            while st:
                cy, cx = st.pop(); comp.append((cy, cx))
                if cy in (0, H - 1) or cx in (0, W - 1): edge = True
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and not a[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; st.append((ny, nx))
            if not edge and len(comp) <= maxn:
                for cy, cx in comp: img[cy, cx, 3] = 255

rows = [r for r in runs(fg.any(1)) if r[1] - r[0] > 20]
sprites = []
for (y0, y1) in rows:
    cols = [c for c in runs(fg[y0:y1].any(0)) if c[1] - c[0] > 10]
    # fusionne les morceaux proches (ailes, pattes détachées)
    merged = []
    for c in cols:
        if merged and c[0] - merged[-1][1] < 3 * P: merged[-1] = (merged[-1][0], c[1])
        else: merged.append(c)
    line = []
    for (x0, x1) in merged:
        ys = np.where(fg[y0:y1, x0:x1].any(1))[0]
        sy0, sy1 = y0 + ys.min(), y0 + ys.max() + 1
        best = None
        for oy in range(P):
            for ox in range(P):
                ya, xa = sy0 - oy, x0 - ox
                nh, nw = (sy1 - ya + P - 1) // P, (x1 - xa + P - 1) // P
                blk = np.zeros((nh * P, nw * P, 3)); m = np.zeros((nh * P, nw * P), bool)
                yb, xb = max(0, ya), max(0, xa)
                piece = a[yb:ya + nh * P, xb:xa + nw * P]
                blk[yb - ya:yb - ya + piece.shape[0], xb - xa:xb - xa + piece.shape[1]] = piece
                m[yb - ya:yb - ya + piece.shape[0], xb - xa:xb - xa + piece.shape[1]] = fg[yb:ya + nh * P, xb:xa + nw * P]
                b = blk.reshape(nh, P, nw, P, 3).transpose(0, 2, 1, 3, 4).reshape(nh, nw, P * P, 3)
                sc = b.var(2).sum()
                if best is None or sc < best[0]: best = (sc, b, m.reshape(nh, P, nw, P).transpose(0, 2, 1, 3).reshape(nh, nw, P * P))
        _, b, m = best
        # couleur du bloc : médiane des pixels du centre ; opaque si plus de la moitié est dessinée
        c = b.reshape(b.shape[0], b.shape[1], P, P, 3)[:, :, 1:-1, 1:-1].reshape(b.shape[0], b.shape[1], -1, 3)
        img = np.zeros(b.shape[:2] + (4,), np.uint8)
        img[..., :3] = np.median(c, 2).clip(0, 255)
        img[..., 3] = (m.mean(2) > 0.5) * 255
        fill_holes(img)
        line.append(img)
    sprites.append(line)

for name, line in zip(names, sprites):
    cw = max(i.shape[1] for i in line) + 2; ch = max(i.shape[0] for i in line) + 1
    strip = np.zeros((ch, cw * len(line), 4), np.uint8)
    for k, im in enumerate(line):
        h, w = im.shape[:2]; dy = ch - h; dx = k * cw + (cw - w) // 2
        strip[dy:dy + h, dx:dx + w] = im
    Image.fromarray(strip).save(f'{out}/{name}.png')
    print(name, len(line), 'images', cw, 'x', ch)
