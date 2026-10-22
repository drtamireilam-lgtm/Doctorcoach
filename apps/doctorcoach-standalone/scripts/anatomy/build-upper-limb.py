"""Convert exact source-mapped right upper-limb subsets. Same inputs as build-atlas.py."""
import json,pathlib
from atlas_converter import load,emit,np
catalog=json.loads(pathlib.Path(__file__).with_name('upper-limb-parts.json').read_text())
for name,items in catalog.items():
 if name=='shoulder':continue
 parts=[]
 for slug,en,he,layer,ids in items:
  vv=[];ff=[];sources=[];offset=0
  for fid in ids:
   v,f,source=load(fid)
   if not any('right' in row.split('\t')[1] for row in source['mappingRows']):raise ValueError('Missing right-side mapping: '+slug+' '+fid)
   vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
  parts.append((slug,en,he,layer,'right','wrist_hand' if name=='hand' else 'forearm' if name=='forearm' or slug=='brachioradialis' else 'elbow',np.concatenate(vv),np.concatenate(ff),sources))
 emit(name,parts,'Explicit right-side BodyParts3D ELEMENT mapping; component heads combined only where named in the catalog; original source vertices/triangles retained, mm XYZ converted to metres X Z -Y; normals/materials added. No invented structures.',['separate-tendons','ligaments','nerves','cartilage','unlisted-muscles']+(['forearm-context-bones'] if name=='hand' else []))
