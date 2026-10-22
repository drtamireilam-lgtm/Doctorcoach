"""Retain exact midline/right cervical geometry from BodyParts3D; missing right longus colli is never mirrored."""
import json,pathlib
from atlas_converter import load,emit,np
parts=[]
for slug,en,he,layer,ids in json.loads(pathlib.Path(__file__).with_name('neck-parts.json').read_text())['neck']:
 midline=slug in ['sternum','occipital-bone'] or slug.startswith(('cervical-','thoracic-'))
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if midline:
   if not v[:,0].min()<0<v[:,0].max():raise ValueError('Midline spatial check failed: '+fid)
  elif not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right mapping/spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 parts.append((slug,en,he,layer,'midline' if midline else 'right','cervical_neck',np.concatenate(vv),np.concatenate(ff),sources))
emit('neck',parts,'Original C1-C7, T1-T6, occipital bone and combined sternal components at midline; right temporal bone, shoulder/rib attachment context and twelve selectable muscle entries. Three source scalene muscles combined as the named scalenes group; descending trapezius portion labeled upper trapezius. Four suboccipital muscles remain individually selectable. Original positions/triangles retained, mm XYZ converted to metres X Z -Y, normals/unique materials added. No mirroring, cropping or fabricated right longus colli.',['longus-colli','intervertebral-discs','cartilage','ligaments','joint-capsules','separate-tendons','nerves','vessels','spinal-cord','complete-skull','contralateral-paired-structures','unlisted-muscles'])
