"""Build original right hip subset; inputs: source ZIP, official ELEMENT mapping table."""
import json,pathlib
from atlas_converter import load,emit,np
items=json.loads(pathlib.Path(__file__).with_name('hip-parts.json').read_text())['hip']
parts=[]
for slug,en,he,layer,ids in items:
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right-side mapping or spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 parts.append((slug,en,he,layer,'right','hip_glute',np.concatenate(vv),np.concatenate(ff),sources))
emit('hip',parts,'Original right hip bone, femur and twelve source-mapped hip muscles; all vertices/triangles retained, mm XYZ converted to metres X Z -Y; normals/materials added; no mirrored or synthesized structures. Source names and spatial laterality checked.',['cartilage','joint-capsule','ligaments','nerves','separate-tendons','iliotibial-tract','sacrum-and-lumbar-context-bones','contralateral-pelvis','unlisted-muscles'])
