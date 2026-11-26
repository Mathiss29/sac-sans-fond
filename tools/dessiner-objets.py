# Dessine les icônes d'objets (équipement, forge) en pixel art, 64×64 par case,
# dans le style de assets/sprites/icones/arbre.png : contour sombre épais, 3 tons, lumière en haut à gauche.
# Usage : python3 tools/dessiner-objets.py  → assets/sprites/icones/objets.png
import math, sys
from PIL import Image, ImageDraw

OUT = 'assets/sprites/icones/objets.png'
INK = (36, 28, 37, 255)
ORDER = ['bow', 'staff', 'blade', 'lyre', 'ring', 'feather', 'moon', 'purse', 'seal', 'anvil', 'shard', 'satchel']

def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

WOOD = [rgb('#c48a52'), rgb('#9a6238'), rgb('#6a3a1e')]
STEEL = [rgb('#f0f4f8'), rgb('#b4bcc8'), rgb('#6e7888')]
GOLD = [rgb('#ffe08a'), rgb('#e0a83a'), rgb('#a0621a')]
RED = [rgb('#ff9a6a'), rgb('#d8442e'), rgb('#8a1e1e')]
ICE = [rgb('#e4faff'), rgb('#7fd0ff'), rgb('#3a6ec0')]
PURP = [rgb('#e0c8ff'), rgb('#a070e8'), rgb('#5a2e96')]
LEATH = [rgb('#c99a62'), rgb('#8e5a32'), rgb('#5a341c')]
IRON = [rgb('#8a909e'), rgb('#5a606e'), rgb('#363a46')]
CREAM = rgb('#f4e6c0')
WHITE = rgb('#ffffff')


class Icon:
    def __init__(self):
        self.im = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def poly(self, pts, c): self.d.polygon([tuple(map(round, p)) for p in pts], fill=c)
    def rect(self, x0, y0, x1, y1, c): self.d.rectangle([x0, y0, x1, y1], fill=c)
    def disc(self, cx, cy, r, c): self.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    def ell(self, x0, y0, x1, y1, c): self.d.ellipse([x0, y0, x1, y1], fill=c)
    def px(self, x, y, c): self.im.putpixel((x, y), c)
    def line(self, pts, c, w=1): self.d.line([tuple(map(round, p)) for p in pts], fill=c, width=w)

    def thick(self, x0, y0, x1, y1, w, tones):
        """Barre épaisse de (x0,y0) à (x1,y1) : ton clair côté haut-gauche, sombre côté bas-droite."""
        dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        if nx + ny > 0: nx, ny = -nx, -ny          # la normale pointe vers le haut-gauche
        h = w / 2
        self.poly([(x0 + nx * h, y0 + ny * h), (x1 + nx * h, y1 + ny * h), (x1 - nx * h, y1 - ny * h), (x0 - nx * h, y0 - ny * h)], tones[1])
        self.line([(x0 + nx * (h - 1), y0 + ny * (h - 1)), (x1 + nx * (h - 1), y1 + ny * (h - 1))], tones[0], 1)
        self.line([(x0 - nx * (h - 0.5), y0 - ny * (h - 0.5)), (x1 - nx * (h - 0.5), y1 - ny * (h - 0.5))], tones[2], 1)

    def shade_disc(self, cx, cy, r, tones):
        self.disc(cx, cy, r, tones[2]); self.disc(cx - 1, cy - 1, r - 1, tones[1]); self.disc(cx - r * 0.35, cy - r * 0.35, max(1, r * 0.35), tones[0])

    def finish(self, outline=2):
        # contour sombre de 2 px autour de tout ce qui est dessiné, puis petite ombre au sol
        a = self.im.copy(); src = a.load(); W, H = a.size
        out = Image.new('RGBA', a.size, (0, 0, 0, 0)); o = out.load()
        for y in range(H):
            for x in range(W):
                if src[x, y][3]: continue
                near = any(0 <= x + dx < W and 0 <= y + dy < H and src[x + dx, y + dy][3]
                           for dx in range(-outline, outline + 1) for dy in range(-outline, outline + 1) if abs(dx) + abs(dy) <= outline + (outline > 1) - 0)
                if near: o[x, y] = INK
        out.alpha_composite(a)
        return out


def bow():
    i = Icon()
    # arc : un demi-cercle épais, ouvert vers la gauche, en diagonale
    pts = []
    for k in range(0, 41):
        t = -1.25 + 2.5 * k / 40
        pts.append((22 + 30 * math.cos(t) * 0.78, 32 + 26 * math.sin(t)))
    for a, b in zip(pts, pts[1:]): i.thick(a[0], a[1], b[0], b[1], 5, WOOD)
    # embouts dorés
    for p in (pts[0], pts[-1]): i.shade_disc(p[0], p[1], 3, GOLD)
    # corde
    i.line([pts[0], pts[-1]], CREAM, 1)
    # poignée en cuir
    i.rect(43, 27, 48, 37, LEATH[1]); i.rect(43, 27, 44, 37, LEATH[0]); i.rect(47, 27, 48, 37, LEATH[2])
    for y in (29, 32, 35): i.line([(43, y), (48, y)], LEATH[2])
    # flèche encochée
    i.thick(10, 32, 50, 32, 2, WOOD)
    i.poly([(50, 28), (58, 32), (50, 36)], STEEL[1]); i.poly([(50, 28), (58, 32), (52, 32)], STEEL[0])
    i.poly([(8, 28), (14, 31), (12, 32)], RED[1]); i.poly([(8, 36), (14, 33), (12, 32)], RED[2])
    return i.finish()


def staff():
    i = Icon()
    i.thick(14, 56, 40, 22, 5, WOOD)
    for t in (0.3, 0.55):  # bagues
        x, y = 14 + 26 * t, 56 - 34 * t; i.shade_disc(x, y, 3.2, GOLD)
    # griffes qui tiennent le cristal
    i.thick(38, 24, 36, 16, 3, GOLD); i.thick(40, 22, 48, 22, 3, GOLD)
    # cristal de givre
    i.poly([(44, 4), (56, 12), (52, 26), (38, 22), (36, 10)], ICE[1])
    i.poly([(44, 4), (36, 10), (38, 22), (45, 15)], ICE[0])
    i.poly([(56, 12), (52, 26), (45, 15)], ICE[2])
    i.px(41, 9, WHITE); i.px(40, 10, WHITE); i.px(42, 8, WHITE)
    # étincelles
    for x, y in ((28, 10), (58, 30), (32, 4)):
        i.px(x, y, ICE[0]); i.px(x - 1, y, ICE[1]); i.px(x + 1, y, ICE[1]); i.px(x, y - 1, ICE[1]); i.px(x, y + 1, ICE[1])
    return i.finish()


def blade():
    i = Icon()
    # lame large, diagonale vers le haut à droite
    i.poly([(20, 42), (50, 12), (56, 8), (52, 14), (24, 46)], STEEL[1])
    i.poly([(20, 42), (50, 12), (56, 8), (22, 44)], STEEL[0])
    i.poly([(24, 46), (52, 14), (56, 8), (25, 44)], STEEL[2])
    i.line([(23, 43), (52, 12)], STEEL[2])
    # garde
    i.thick(12, 38, 28, 54, 5, GOLD)
    i.shade_disc(20, 46, 3.5, RED)
    # poignée + pommeau
    i.thick(18, 48, 9, 57, 4, LEATH)
    i.shade_disc(7, 59, 3.5, GOLD)
    return i.finish()


def lyre():
    i = Icon()
    # cadre en U doré
    for side in (-1, 1):
        pts = [(32 + side * (8 + 10 * math.sin(t / 20 * math.pi * 0.95)), 50 - t * 2.1) for t in range(0, 21)]
        for a, b in zip(pts, pts[1:]): i.thick(a[0], a[1], b[0], b[1], 5, GOLD)
        i.shade_disc(pts[-1][0] - side * 2, pts[-1][1] - 1, 3.5, GOLD)
    # caisse
    i.ell(19, 44, 45, 58, WOOD[2]); i.ell(19, 43, 44, 56, WOOD[1]); i.ell(22, 45, 32, 50, WOOD[0])
    # barre du haut
    i.thick(16, 14, 48, 14, 4, WOOD)
    # cordes
    for x in (26, 30, 34, 38): i.line([(x, 16), (x, 49)], CREAM)
    # note
    i.rect(54, 26, 55, 36, PURP[1]); i.ell(50, 34, 55, 38, PURP[1]); i.rect(55, 26, 59, 28, PURP[1])
    return i.finish()


def ring():
    i = Icon()
    i.ell(12, 26, 50, 58, GOLD[2]); i.ell(12, 25, 49, 56, GOLD[1]); i.ell(14, 27, 30, 40, GOLD[0])
    i.ell(19, 32, 43, 51, (0, 0, 0, 0))
    i.ell(20, 33, 42, 50, (0, 0, 0, 0))
    # chaton et gemme
    i.poly([(22, 26), (40, 26), (44, 30), (18, 30)], GOLD[2])
    i.poly([(31, 6), (42, 16), (38, 28), (24, 28), (20, 16)], RED[1])
    i.poly([(31, 6), (20, 16), (24, 28), (31, 18)], RED[0]); i.poly([(42, 16), (38, 28), (31, 18)], RED[2])
    i.px(26, 14, WHITE); i.px(27, 13, WHITE)
    # flammèches
    for x, y, h in ((14, 14, 7), (48, 12, 8), (52, 26, 5)):
        i.poly([(x, y - h), (x + 3, y), (x, y + 2), (x - 3, y)], RGB_ORANGE)
        i.poly([(x, y - h // 2), (x + 1, y), (x - 1, y)], GOLD[0])
    return i.finish()


def feather():
    i = Icon()
    # plume en diagonale : vexille en éventail le long du rachis
    for k in range(0, 34):
        t = k / 33
        x, y = 16 + 32 * t, 54 - 44 * t
        w = 9 * math.sin(t * math.pi) ** 0.8 + 1
        i.line([(x, y), (x - w * 0.9, y - w * 0.9 + 6)], ICE[1] if k % 5 else ICE[2], 2)
        i.line([(x, y), (x + w * 0.9, y + w * 0.9 - 6 + 4)], ICE[0] if k % 6 else ICE[1], 2)
    i.line([(12, 58), (48, 10)], CREAM, 2)
    i.line([(12, 58), (20, 48)], LEATH[1], 2)
    # tourbillon de vent
    for x, y in ((50, 40), (54, 30), (44, 50)):
        i.px(x, y, WHITE); i.px(x - 1, y, ICE[0]); i.px(x + 1, y, ICE[0]); i.px(x, y - 1, ICE[0]); i.px(x, y + 1, ICE[0])
    return i.finish()


def moon():
    i = Icon()
    # chaîne
    for k in range(9):
        a = math.pi * (0.1 + 0.8 * k / 8)
        x = 32 - 20 * math.cos(a); y = 22 - 18 * math.sin(a)
        i.ell(x - 2, y - 2, x + 2, y + 2, GOLD[1]); i.px(round(x), round(y), GOLD[2])
    i.thick(32, 18, 32, 24, 4, GOLD)
    # médaillon
    i.disc(32, 38, 17, GOLD[2]); i.disc(31, 37, 16, GOLD[1]); i.disc(32, 38, 13, ICE[2])
    i.disc(31, 37, 12, ICE[1]); i.disc(35, 34, 10, ICE[2])  # croissant
    i.disc(26, 33, 3, ICE[0]); i.px(25, 32, WHITE)
    i.disc(36, 35, 9, (0, 0, 0, 0)); i.disc(36, 35, 8, rgb('#1d2a4a'))
    for x, y in ((38, 33), (34, 40), (41, 39)): i.px(x, y, WHITE)
    return i.finish()


def purse():
    i = Icon()
    # bourse ventrue
    i.ell(12, 22, 52, 58, LEATH[2]); i.ell(12, 21, 50, 55, LEATH[1]); i.ell(16, 25, 30, 38, LEATH[0])
    # col froncé + cordon
    i.poly([(22, 14), (42, 14), (38, 24), (26, 24)], LEATH[1]); i.poly([(22, 14), (28, 14), (28, 24), (26, 24)], LEATH[0])
    i.thick(22, 24, 42, 24, 3, RED)
    i.thick(42, 24, 48, 32, 2, RED); i.shade_disc(48, 33, 2.5, GOLD)
    # broderie dorée
    for k in range(5): i.px(22 + k * 5, 40 + (k % 2) * 2, GOLD[0]); i.px(23 + k * 5, 41, GOLD[1])
    i.thick(24, 46, 40, 46, 2, GOLD)
    # pièces qui débordent
    for cx, cy in ((26, 11), (36, 8), (44, 14)): i.shade_disc(cx, cy, 5, GOLD); i.px(cx - 2, cy - 2, WHITE)
    return i.finish()


def seal():
    i = Icon()
    # ruban
    i.poly([(22, 40), (30, 44), (24, 62), (20, 56), (14, 60)], RED[2]); i.poly([(42, 40), (34, 44), (40, 62), (44, 56), (50, 60)], RED[1])
    # cachet de cire aux bords irréguliers
    pts = [(32 + (22 if k % 2 else 19) * math.cos(k * math.pi / 8), 30 + (22 if k % 2 else 19) * math.sin(k * math.pi / 8)) for k in range(16)]
    i.poly(pts, RED[2]); i.poly([(x - 1, y - 1) for x, y in pts], RED[1])
    i.disc(32, 30, 14, RED[2]); i.disc(31, 29, 13, RED[1])
    i.disc(26, 23, 4, RED[0])
    # crâne de géant gravé
    i.ell(25, 21, 38, 33, RED[2]); i.rect(28, 32, 35, 36, RED[2])
    i.disc(29, 27, 2, RED[1]); i.disc(34, 27, 2, RED[1])
    for x in (29, 31, 33): i.px(x, 35, RED[1])
    return i.finish()


def anvil():
    i = Icon()
    # enclume
    i.poly([(6, 28), (16, 26), (50, 26), (58, 22), (56, 30), (48, 36), (16, 36), (10, 32)], IRON[1])
    i.poly([(6, 28), (16, 26), (50, 26), (58, 22), (56, 24), (16, 29), (8, 30)], IRON[0])
    i.poly([(48, 36), (56, 30), (52, 36)], IRON[2])
    i.rect(22, 36, 42, 46, IRON[2]); i.rect(22, 36, 25, 46, IRON[1])
    i.poly([(14, 54), (20, 46), (44, 46), (50, 54)], IRON[1]); i.rect(14, 54, 50, 58, IRON[2]); i.line([(20, 47), (44, 47)], IRON[0])
    # marteau posé en biais au-dessus
    i.thick(30, 22, 52, 2, 5, WOOD)
    i.poly([(18, 14), (30, 3), (40, 14), (28, 25)], IRON[1]); i.poly([(18, 14), (30, 3), (32, 5), (20, 16)], IRON[0]); i.poly([(40, 14), (28, 25), (27, 22), (38, 12)], IRON[2])
    # étincelles
    for x, y in ((12, 18), (52, 12), (56, 40), (8, 40)):
        i.px(x, y, GOLD[0]); i.px(x + 1, y, GOLD[1]); i.px(x - 1, y, GOLD[1]); i.px(x, y + 1, GOLD[1]); i.px(x, y - 1, GOLD[1])
    return i.finish()


def shard():
    i = Icon()
    i.poly([(34, 4), (46, 20), (40, 58), (24, 50), (20, 22)], PURP[1])
    i.poly([(34, 4), (20, 22), (24, 50), (31, 26)], PURP[0])
    i.poly([(46, 20), (40, 58), (31, 26)], PURP[2])
    i.line([(31, 26), (34, 4)], WHITE); i.px(26, 20, WHITE); i.px(25, 22, WHITE)
    i.poly([(14, 40), (20, 46), (16, 56), (9, 50)], PURP[1]); i.poly([(14, 40), (9, 50), (13, 48)], PURP[0])
    for x, y in ((50, 8), (54, 40)): i.px(x, y, PURP[0]); i.px(x - 1, y, PURP[1]); i.px(x + 1, y, PURP[1]); i.px(x, y - 1, PURP[1]); i.px(x, y + 1, PURP[1])
    return i.finish()


def satchel():
    i = Icon()
    # bandoulière
    i.thick(14, 30, 24, 8, 3, LEATH); i.thick(50, 30, 40, 8, 3, LEATH); i.thick(24, 8, 40, 8, 3, LEATH)
    # besace
    i.rect(10, 26, 54, 56, LEATH[2]); i.rect(10, 26, 52, 54, LEATH[1]); i.rect(10, 26, 14, 54, LEATH[0])
    # rabat
    i.poly([(8, 24), (56, 24), (54, 40), (32, 46), (10, 40)], rgb('#6a3a5a'))
    i.poly([(8, 24), (56, 24), (54, 28), (10, 28)], rgb('#9a5a86'))
    i.line([(11, 39), (32, 45), (53, 39)], rgb('#4a2440'))
    # boucle et gemme
    i.rect(28, 40, 36, 50, GOLD[1]); i.rect(30, 42, 34, 48, LEATH[2]); i.px(28, 40, GOLD[0])
    i.shade_disc(32, 32, 3.5, ICE)
    return i.finish()


RGB_ORANGE = rgb('#ff8a2a')
DRAW = dict(bow=bow, staff=staff, blade=blade, lyre=lyre, ring=ring, feather=feather, moon=moon, purse=purse,
            seal=seal, anvil=anvil, shard=shard, satchel=satchel)

if __name__ == '__main__':
    sheet = Image.new('RGBA', (64 * len(ORDER), 64), (0, 0, 0, 0))
    for k, name in enumerate(ORDER):
        sheet.alpha_composite(DRAW[name](), (64 * k, 0))
    sheet.save(sys.argv[1] if len(sys.argv) > 1 else OUT)
    print('ok', sheet.size)
