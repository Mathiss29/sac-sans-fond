from PIL import Image; import numpy as np, sys
im=np.array(Image.open('src.png').convert('RGB')).astype(float); H,W,_=im.shape
px,py,ox,oy=[float(a) for a in sys.argv[1:5]]
nx=int((W-ox)//px); ny=int((H-oy)//py)
grid=np.zeros((ny,nx,3))
for j in range(ny):
  for i in range(nx):
    x0=ox+i*px; y0=oy+j*py
    b=im[int(y0+1.5):int(y0+py-1.5), int(x0+1.5):int(x0+px-1.5)].reshape(-1,3)
    grid[j,i]=np.median(b,0)
bg=np.array([108,107,106.])
al=np.abs(grid-bg).sum(2)>20
np.save('grid.npy',grid); np.save('al.npy',al)
rgba=np.zeros((ny,nx,4),np.uint8); rgba[...,:3]=grid.clip(0,255); rgba[...,3]=al*255
Image.fromarray(rgba).save('grid.png')
Image.fromarray(rgba).resize((nx*6,ny*6),Image.NEAREST).save('grid_z.png')
print(nx,ny)
