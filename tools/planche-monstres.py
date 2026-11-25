from PIL import Image; import numpy as np, json
g=np.load('grid.npy'); al=np.load('al2.npy'); frames=json.load(open('frames.json'))
# séparer les images collées (poing du boss)
fr=[]
for row in frames:
  out=[]
  for f in row:
    y0,y1,x0,x1=f
    if x1-x0>70:
      cols=al[y0:y1,x0:x1].sum(0); mid=(x1-x0)//2; lo=mid-12; cut=lo+int(np.argmin(cols[lo:mid+12]))
      out+= [(y0,y1,x0,x0+cut),(y0,y1,x0+cut,x1)]
    else: out.append(tuple(f))
  fr.append(out)
spec=[('wisp',36,32),('gold',36,32),('golem',52,40),('wind',36,32),('boss',72,50)]
for (name,CW,CH),row in zip(spec,fr):
  # gabarit : haut du corps de la 1re image
  def crop(f):
    y0,y1,x0,x1=f; a=al[y0:y1,x0:x1]; r=np.zeros(a.shape+(4,),int); r[...,:3]=g[y0:y1,x0:x1].clip(0,255); r[...,3]=a*255; return r
  ref=crop(row[0]); ys,xs=np.where(ref[...,3]>0); top=ys.min()
  T=ref[top:top+12]; Tm=T[...,3]>0; tx=np.where(Tm.any(0))[0]; T=T[:,tx.min():tx.max()+1]; Tm=Tm[:,tx.min():tx.max()+1]
  strip=np.zeros((CH,CW*len(row),4),np.uint8); clip=0
  for k,f in enumerate(row):
    r=crop(f); ys,xs=np.where(r[...,3]>0); best=None
    for fy in range(0,max(1,r.shape[0]-T.shape[0]+1)):
      for fx in range(-T.shape[1]//2, r.shape[1]-T.shape[1]//2):
        P=np.zeros(T.shape,int); xa=max(0,fx); xb=min(r.shape[1],fx+T.shape[1]); yb=min(r.shape[0],fy+T.shape[0])
        P[:yb-fy,xa-fx:xb-fx]=r[fy:yb,xa:xb]
        sc=np.abs(P[...,:3]-T[...,:3])[Tm].sum()+((P[...,3]==0)&Tm).sum()*300
        if best is None or sc<best[0]: best=(sc,fx)
    hx=best[1]+T.shape[1]/2
    dy=CH-1-ys.max(); dx=int(round(CW/2-hx))
    for yy,xx in zip(ys,xs):
      ty,tx_=yy+dy,xx+dx
      if 0<=ty<CH and 0<=tx_<CW: strip[ty,k*CW+tx_]=r[yy,xx]
      else: clip+=1
  Image.fromarray(strip).save(f'mon_{name}.png'); print(name,len(row),'clip',clip)
