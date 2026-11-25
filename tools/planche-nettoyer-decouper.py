from PIL import Image; import numpy as np, json
g=np.load('grid.npy'); al=np.load('al.npy'); bg=np.array([108,107,106.])
ny,nx=al.shape
for it in range(3):
  pad=np.pad(al,1); edge=al&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
  sat=g.max(2)-g.min(2); d=np.abs(g-bg).sum(2)
  al=al&~(edge&(d<60)&(sat<30))
lab=np.zeros(al.shape,int); n=0
for y in range(ny):
  for x in range(nx):
    if al[y,x] and not lab[y,x]:
      n+=1; st=[(y,x)]; lab[y,x]=n
      while st:
        a,b=st.pop()
        for dy in(-1,0,1):
          for dx in(-1,0,1):
            c,d2=a+dy,b+dx
            if 0<=c<ny and 0<=d2<nx and al[c,d2] and not lab[c,d2]: lab[c,d2]=n; st.append((c,d2))
sizes=np.bincount(lab.ravel()); keep=sizes[lab]>=6; keep[lab==0]=False; al&=keep
np.save('lab.npy',lab*al)
rows=al.any(1); bands=[]; y=0
while y<ny:
  if rows[y]:
    y0=y
    while y<ny and rows[y]: y+=1
    bands.append((y0,y))
  else: y+=1
frames=[]
for (y0,y1) in bands:
  cols=al[y0:y1].any(0); x=0; fr=[]
  while x<nx:
    if cols[x]:
      x0=x
      while x<nx and (cols[x] or cols[min(x+1,nx-1)] or cols[min(x+2,nx-1)]): x+=1
      fr.append((y0,y1,x0,x))
    else: x+=1
  frames.append(fr); print(len(fr),[(f[2],f[3]-f[2],f[1]-f[0]) for f in fr])
np.save('al2.npy',al); json.dump(frames,open('frames.json','w'))
