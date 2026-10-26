"""Preserve exact BodyParts3D midline spine and right back geometry; no fabricated anatomy."""
import json,pathlib
from atlas_converter import load,emit,np
parts=[]
for slug,en,he,layer,ids in json.loads(pathlib.Path(__file__).with_name('spine-parts.json').read_text())['spine']:
 midline=slug=='sacrum' or slug.startswith(('cervical-','thoracic-','lumbar-'))
 vv=[];ff=[];sources=[];offset=0
 for fid in ids:
  v,f,source=load(fid)
  if midline:
   if not v[:,0].min()<0<v[:,0].max():raise ValueError('Midline geometry does not cross sagittal plane: '+fid)
  elif not any('right' in r.split('\t')[1] for r in source['mappingRows']) or v[:,0].mean()>=0:raise ValueError('Right source mapping/spatial check failed: '+fid)
  vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
 parts.append((slug,en,he,layer,'midline' if midline else 'right','lower_back_spine',np.concatenate(vv),np.concatenate(ff),sources))
emit('spine',parts,'Original 24 presacral vertebrae and sacrum at midline, right attachment-context bones and eight right back muscles. Three original trapezius portions combined. All vertices/triangles retained; mm XYZ converted to metres X Z -Y, normals and unique materials added. No mirroring, cropping or synthesized anatomy.',['intervertebral-discs','ligaments','cartilage','joint-capsules','separate-tendons','nerves','spinal-cord','coccyx','skull','latissimus-dorsi','multifidus','quadratus-lumborum','contralateral-paired-structures','unlisted-muscles'])
