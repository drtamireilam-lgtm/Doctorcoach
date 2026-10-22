"""Build original right knee subset; inputs: source ZIP, official ELEMENT mapping table."""
import json,pathlib
from atlas_converter import load,emit,np
items=json.loads(pathlib.Path(__file__).with_name('knee-parts.json').read_text())['knee']
parts=[]
for slug,en,he,layer,ids in items:
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right-side mapping or spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 parts.append((slug,en,he,layer,'right','knee',np.concatenate(vv),np.concatenate(ff),sources))
emit('knee',parts,'Original right knee bones and ten muscle structures with right hip bone and calcaneus for attachment context; gastrocnemius heads combined; original vertices/triangles retained, mm XYZ converted to metres X Z -Y; normals/materials added. Spatial laterality checked; no synthesized structures.',['menisci','cruciate-ligaments','collateral-ligaments','cartilage','joint-capsule','separate-tendons','nerves','unlisted-muscles','remaining-foot-bones'])
