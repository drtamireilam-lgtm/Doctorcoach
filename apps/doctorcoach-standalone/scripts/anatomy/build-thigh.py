"""Preserve exact original right thigh geometry; never mirror or synthesize missing structures."""
import json,pathlib
from atlas_converter import load,emit,np
parts=[]
for slug,en,he,layer,ids in json.loads(pathlib.Path(__file__).with_name('thigh-parts.json').read_text())['thigh']:
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right mapping/spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 region='groin' if slug in ['adductor-longus','adductor-brevis','adductor-magnus','gracilis','pectineus'] else 'thigh'
 parts.append((slug,en,he,layer,'right',region,np.concatenate(vv),np.concatenate(ff),sources))
emit('thigh',parts,'Original right hip bone, femur, patella, tibia and fibula with fourteen individually selectable thigh muscles, including five medial/adductor entries and sartorius. Original source positions and triangles retained; mm XYZ converted to metres X Z -Y; normals and unique materials added. No mirroring, cropping or fabricated structures. Adductor magnus is a single source mesh; its functional portions are not separately selectable.',['separate-tendons','ligaments','nerves','cartilage','joint-capsules','vessels','contralateral-paired-structures','iliopsoas','obturator-externus','unlisted-muscles'])
