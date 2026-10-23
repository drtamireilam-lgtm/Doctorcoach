"""Build one bilateral skeleton in the existing atlas coordinate space.

Usage: python build-skeleton.py skeleton-subset.zip isa_element_parts.txt
Requires numpy; no mesh simplification or new source geometry is introduced.
"""
import hashlib,json,pathlib
from atlas_converter import load,emit,np,root

catalog=json.loads(pathlib.Path(__file__).with_name('skeleton-parts.json').read_text(encoding='utf8'))
if hashlib.sha256(pathlib.Path(__import__('sys').argv[2]).read_bytes()).hexdigest()!=catalog['mappingSha256']:
    raise ValueError('Official source mapping changed; re-audit before conversion')
duplicate,duplicate_faces,_=load('FJ2772')
retained,retained_faces,_=load('FJ3201')
if not np.array_equal(duplicate,retained) or not np.array_equal(duplicate_faces,retained_faces):
    raise ValueError('Hyoid exclusion no longer matches identical source geometry')

parts=[];used=set();geometry=set()
for item in catalog['structures']:
    vv=[];ff=[];sources=[];offset=0
    for fid in item['sourceIds']:
        if fid in used:raise ValueError('Repeated source ELEMENT: '+fid)
        used.add(fid);v,f,source=load(fid)
        digest=hashlib.sha256(v.astype('<f4').tobytes()+f.astype('<u4').tobytes()).hexdigest()
        if digest in geometry:raise ValueError('Duplicate geometry: '+fid)
        geometry.add(digest)
        if item['side']=='left' and v[:,0].mean()<=0 or item['side']=='right' and v[:,0].mean()>=0:
            raise ValueError('Source label/position mismatch: '+fid)
        vv.append(v);ff.append(f+offset);offset+=len(v);sources.append(source)
    parts.append((item['id'],item['en'],item['he'],'bone',item['side'],item.get('regionId'),np.concatenate(vv),np.concatenate(ff),sources))
if len(used)!=205 or len(parts)!=201:raise ValueError('Audited skeleton inventory changed')
emit('skeleton',parts,'Whole-body reference skeleton with original left/right and midline bones in shared source coordinates. 205 distinct ELEMENTs form 201 selectable structures (sternum combined; foot sesamoids grouped by side). Duplicate hyoid FJ2772 excluded after exact vertex/face comparison with FJ3201. All included source triangles retained. mm XYZ converted to metres X Z -Y, normals and unique materials added. No per-bone recentering, repositioning, scaling, mirroring, welding or fabricated joint tissue.',['coccyx','auditory-ossicles','teeth','intervertebral-discs','articular-cartilage','costal-cartilage','ligaments','muscles','nerves','vessels'])
out=root/'public/anatomy/skeleton.glb'
if out.stat().st_size>12*1024*1024:raise ValueError('Whole-body asset exceeds 12 MiB budget')
for target in [root/'lib/prepared/skeleton-model.json',root/'public/anatomy/skeleton-source-and-license.json']:
    manifest=json.loads(target.read_text(encoding='utf8'))
    manifest['sourceMappingSha256']=catalog['mappingSha256']
    manifest['excludedElements']=catalog['excludedElements']
    manifest['coverage']={'status':'whole-body reference; incomplete fine anatomy; clinical review pending','selectableStructures':201,'includedSourceElements':205,'triangles':sum(p[7].shape[0] for p in parts),'coordinateSystem':'metres, Y-up, faces +Z; all source world positions retained'}
    target.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
