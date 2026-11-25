from PIL import Image; import numpy as np, json
g=np.load('grid.npy'); al=np.load('al2.npy'); lab=np.load('lab.npy'); frames=json.load(open('frames.json'))
CW,CH=60,52; AX=31
names=['idle','walk','attack','hurt','victory']
def crop(f):
  y0,y1,x0,x1=f; a=al[y0:y1,x0:x1].copy(); L=lab[y0:y1,x0:x1]
  ids,cnt=np.unique(L[a],return_counts=True); main=ids[cnt.argmax()]
  ys,xs=np.where(L==main); bb=(xs.min(),xs.max())
  for i in ids:
    yy,xx=np.where(L==i)
    if i!=main and (xx.max()<bb[0]-1 or xx.min()>bb[1]+1): a[L==i]=False
  r=np.zeros(a.shape+(4,),int); r[...,:3]=g[y0:y1,x0:x1].clip(0,255); r[...,3]=a*255; return r
ref=crop(frames[0][0]); ys,xs=np.where(ref[...,3]>0); top=ys.min()
T=ref[top:top+14]; Tm=T[...,3]>0
txs=np.where(Tm.any(0))[0]; T=T[:,txs.min():txs.max()+1]; Tm=Tm[:,txs.min():txs.max()+1]
# centre de la tête dans ref
headc=None
for row,name in zip(frames,names):
  strip=np.zeros((CH,CW*len(row),4),np.uint8)
  for k,f in enumerate(row):
    r=crop(f); a=r[...,3]>0; ys,xs=np.where(a)
    best=None
    for fy in range(0,max(1,r.shape[0]-T.shape[0]+1)):
      for fx in range(-T.shape[1]//2, r.shape[1]-T.shape[1]//2):
        P=np.zeros(T.shape,int); xa=max(0,fx); xb=min(r.shape[1],fx+T.shape[1]); ya=fy; yb=min(r.shape[0],fy+T.shape[0])
        P[:yb-ya,xa-fx:xb-fx]=r[ya:yb,xa:xb]
        sc=np.abs(P[...,:3]-T[...,:3])[Tm].sum()+((P[...,3]==0)&Tm).sum()*300
        if best is None or sc<best[0]: best=(sc,fx)
    hx=best[1]+T.shape[1]/2
    dy=CH-1-ys.max(); dx=int(round(AX-hx))
    for yy,xx in zip(ys,xs):
      ty,tx=yy+dy,xx+dx
      if 0<=ty<CH and 0<=tx<CW: strip[ty,k*CW+tx]=r[yy,xx]
      else: print('clip',name,k,ty,tx)
  Image.fromarray(strip).save(f'hero_{name}.png'); print(name,len(row))
