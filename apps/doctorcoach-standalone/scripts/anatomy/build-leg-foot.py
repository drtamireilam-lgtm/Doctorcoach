"""Convert exact right calf and foot subsets; inputs: source ZIP and official mapping table."""
import json,pathlib
from atlas_converter import load,emit,np
catalog=json.loads(pathlib.Path(__file__).with_name('leg-foot-parts.json').read_text())
for name,items in catalog.items():
 parts=[]
 for slug,en,he,layer,ids in items:
  vv=[];ff=[];sources=[];offset=0
  for fid in ids:
   v,f,source=load(fid)
   if not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right-side mapping or spatial check failed: '+fid)
   vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
  parts.append((slug,en,he,layer,'right','lower_leg' if name=='lowerleg' else 'ankle_foot',np.concatenate(vv),np.concatenate(ff),sources))
 emit(name,parts,'Original right calf/foot subset including 26 major foot bones and context leg bones; explicitly cataloged muscle heads combined; original vertices/triangles retained, mm XYZ converted to metres X Z -Y; normals and unique materials added; spatial laterality checked. No synthesized or mirrored structures.',['ligaments','cartilage','joint-capsules','separate-tendons','nerves','unlisted-muscles','sesamoids']+(['unlisted-intrinsic-foot-muscles'] if name=='foot' else ['intrinsic-foot-muscles']))
