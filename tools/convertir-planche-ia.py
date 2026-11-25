from PIL import Image
import numpy as np
src=Image.open('src.png').convert('RGB'); im=np.array(src).astype(float)
H,W,_=im.shape
px,py=11.4263,11.2969; ox,oy=7.52,2.46
segs=[(57, 358), (427, 752), (797, 1143), (1190, 1427), (1530, 2134)]
names=['imp','hound','blood','skull','warlock']
bg=np.array([107,107,106.]); shadow=np.array([78,63,64.])
nx=int((W-ox)//px); ny=int((H-oy)//py)
grid=np.zeros((ny,nx,3))
for j in range(ny):
    for i in range(nx):
        x0=ox+i*px; y0=oy+j*py
        b=im[int(y0+3):int(y0+py-3), int(x0+3):int(x0+px-3)].reshape(-1,3)
        grid[j,i]=np.median(b,0)
alpha=np.ones((ny,nx),bool)
d_bg=np.abs(grid-bg).sum(2); d_sh=np.abs(grid-shadow).sum(2)
alpha[d_bg<22]=False
# ombres : couleur d'ombre, on les retire (le jeu dessine la sienne)
alpha[d_sh<26]=False
out={}
for (a,b),n in zip(segs,names):
    i0=int((a-ox)//px)-1; i1=int((b-ox)//px)+2
    sub=grid[:,i0:i1]; al=alpha[:,i0:i1]
    rows=np.where(al.any(1))[0]; cols=np.where(al.any(0))[0]
    sub=sub[rows[0]:rows[-1]+1, cols[0]:cols[-1]+1]; al=al[rows[0]:rows[-1]+1, cols[0]:cols[-1]+1]
    rgba=np.zeros(sub.shape[:2]+(4,),np.uint8); rgba[...,:3]=sub.clip(0,255); rgba[...,3]=al*255
    Image.fromarray(rgba,'RGBA').save(n+'.png'); out[n]=rgba.shape[:2]
print(out)
