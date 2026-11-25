from PIL import Image; import numpy as np, sys
CW,CH=60,52
cores={'h_knight':(26,28,24,28),'h_bard':(25,29,24,28),'h_mage':(30,32,22,26)}
h=sys.argv[1]; cx0,cx1,cy0,cy1=cores[h]
ref=np.array(Image.open(f'{h}/hero_idle.png')).astype(int)
M=4; tx0,tx1,ty0,ty1=cx0-M,cx1+M,cy0-M,cy1+M
T=ref[ty0:ty1,tx0:tx1]; m=np.ones(T.shape[:2],bool); m[M:M+cy1-cy0, M:M+cx1-cx0]=False; m&=T[...,3]>0
core=ref[cy0:cy1,cx0:cx1].copy()
for a,n in [('idle',6),('walk',8),('attack',6),('hurt',2),('victory',4)]:
  s=np.array(Image.open(f'{h}/hero_{a}.png')).astype(int); offs=[]
  for k in range(n):
    best=None
    for dy in range(-5,6):
      for dx in range(-5,6):
        P=s[ty0+dy:ty1+dy, k*CW+tx0+dx:k*CW+tx1+dx]
        if P.shape!=T.shape: continue
        sc=np.abs(P[...,:3]-T[...,:3])[m].sum()+((P[...,3]==0)&m).sum()*300
        if best is None or sc<best[0]: best=(sc,dy,dx)
    _,dy,dx=best; offs.append((dy,dx,best[0]//m.sum()))
    s[cy0+dy:cy1+dy, k*CW+cx0+dx:k*CW+cx1+dx]=core
  Image.fromarray(s.astype(np.uint8)).save(f'{h}/hero_{a}.png'); print(h,a,offs)
