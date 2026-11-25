from PIL import Image; import numpy as np, sys
p=float(sys.argv[1])
im=np.array(Image.open('src.png').convert('RGB')).astype(float); g=im.sum(2); out=[]
for ax in (1,0):
    d=np.abs(np.diff(g,axis=ax)); prof=d.sum(0) if ax==1 else d.sum(1)
    x=np.arange(len(prof))+0.5  # edge between pixel i and i+1 at i+1
    x=np.arange(len(prof))+1.0
    z=(prof*np.exp(-2j*np.pi*x/p)).sum(); out.append((np.angle(z)/(2*np.pi)*p)%p)
print(out[0],out[1])
