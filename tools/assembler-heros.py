# Usage : python3 tools/assembler-heros.py dossier_des_bandes dossier_du_heros (après convertir-planche-ennemis.py … idle walk attack 5)
# Assemble les bandes converties (idle/walk/attack) au format des héros : cellules 60x52, pieds en bas, tête centrée sur anchor.
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
CW, CH, ANC = 60, 52, 31
def frames(name, n):
    a = np.array(Image.open(f'{src}/{name}.png').convert('RGBA')); cw = a.shape[1] // n
    res = []
    for k in range(n):
        f = a[:, k * cw:(k + 1) * cw]; ys, xs = np.where(f[..., 3] > 0)
        f = f[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        top = f[:min(12, f.shape[0])][..., 3] > 0; hx = np.where(top.any(0))[0]
        res.append((f, int(round(hx.mean()))))
    return res
def strip(fr, offs=None):
    s = np.zeros((CH, CW * len(fr), 4), np.uint8)
    for k, (f, hx) in enumerate(fr):
        dx, dy = (offs[k] if offs else (0, 0))
        h, w = f.shape[:2]; x0 = k * CW + ANC - hx + dx; y0 = CH - 1 - h + dy
        for yy in range(h):
            for xx in range(w):
                X, Y = x0 + xx, y0 + yy
                if f[yy, xx, 3] and k * CW <= X < (k + 1) * CW and 0 <= Y < CH: s[Y, X] = f[yy, xx]
    return Image.fromarray(s)
idle, walk, atk = frames('idle', 6), frames('walk', 8), frames('attack', 6)
strip(idle).save(f'{out}/idle.png'); strip(walk).save(f'{out}/walk.png'); strip(atk).save(f'{out}/attack.png')
strip([idle[0], idle[0]], [(3, 0), (1, 0)]).save(f'{out}/hurt.png')
strip([idle[0], idle[1], idle[2], idle[3]], [(0, 0), (0, -4), (0, -6), (0, -2)]).save(f'{out}/victory.png')
print('ok')
