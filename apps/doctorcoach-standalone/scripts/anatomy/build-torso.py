"""Exact right chest/abdominal subset and midline sternum from BodyParts3D; no invented geometry."""
import json,pathlib
from atlas_converter import load,emit,np
parts=[]
for slug,en,he,layer,ids in json.loads(pathlib.Path(__file__).with_name('torso-parts.json').read_text())['torso']:
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if slug=='sternum':
   expected={'FJ3290':'manubrium','FJ3178':'body of sternum','FJ3153':'xiphoid process'}
   if not any(r.split('\t')[1]==expected[fid] for r in source['mappingRows']) or not v[:,0].min()<0<v[:,0].max():raise ValueError('Sternal identity/midline check failed: '+fid)
  elif not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right source mapping/spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 parts.append((slug,en,he,layer,'midline' if slug=='sternum' else 'right','core_abdomen' if slug=='external-oblique' else 'chest',np.concatenate(vv),np.concatenate(ff),sources))
emit('torso',parts,'Original right ribs, attachment-context bones, seven costal cartilages and four muscles; midline manubrium, body of sternum and xiphoid combined as sternum; three original pectoralis major parts combined. All source vertices/triangles retained, mm XYZ converted to metres X Z -Y; normals/unique materials added. No mirroring, cropping or fabricated abdominal muscles.',['rectus-abdominis','internal-oblique','transversus-abdominis','intercostal-muscles','diaphragm','internal-organs','nerves','vessels','ligaments','joint-capsules','separate-tendons','contralateral-paired-structures','unlisted-muscles','costal-cartilages-8-10'])
