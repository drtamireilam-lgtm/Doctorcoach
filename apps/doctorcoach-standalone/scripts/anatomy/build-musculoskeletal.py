"""Build bilateral existing muscle groups over the validated unified skeleton.

Usage: python build-musculoskeletal.py muscle-subset.zip isa_element_parts.txt
Requires NumPy. No simplification, repositioning or new mirroring.
"""
import gzip,hashlib,json,pathlib,struct,sys
from atlas_converter import load,emit,np,root

catalog=json.loads(pathlib.Path(__file__).with_name('musculoskeletal-parts.json').read_text(encoding='utf8'))
if hashlib.sha256(pathlib.Path(sys.argv[2]).read_bytes()).hexdigest()!=catalog['mappingSha256']:
    raise ValueError('Source mapping changed; re-audit required')
skeleton=json.loads((root/'lib/prepared/skeleton-model.json').read_text(encoding='utf8'))
base=(root/'public/anatomy/skeleton.glb').read_bytes()
if hashlib.sha256(base).hexdigest()!=skeleton['glbSha256']:
    raise ValueError('Skeleton checksum mismatch')
size=struct.unpack_from('<I',base,12)[0]
doc=json.loads(base[20:20+size]);binary=memoryview(base)[28+size:]
nodes={node['name']:node for node in doc['nodes']}
def buffer(index,components):
    accessor=doc['accessors'][index];view=doc['bufferViews'][accessor['bufferView']]
    dtype={5123:'<u2',5125:'<u4',5126:'<f4'}[accessor['componentType']]
    offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
    return np.frombuffer(binary,dtype=dtype,count=accessor['count']*components,offset=offset)

parts=[]
for item in skeleton['structures']:
    node=nodes[item['id']]
    if any(k in node for k in ['translation','rotation','scale','matrix']):
        raise ValueError('Skeleton node transforms require an explicit re-audit')
    primitive=doc['meshes'][node['mesh']]['primitives'][0]
    vertices=buffer(primitive['attributes']['POSITION'],3).reshape(-1,3)
    faces=buffer(primitive['indices'],1).reshape(-1,3)
    parts.append((item['id'],item['en'],item['he'],'bone',item['side'],item.get('regionId'),vertices,faces,item['sources']))

used=set();geometry=set()
for item in catalog['structures']:
    vv=[];ff=[];sources=[];offset=0
    for fid in item['sourceIds']:
        if fid in used:raise ValueError('Repeated muscle source: '+fid)
        used.add(fid);v,f,source=load(fid)
        if not any(item['side'] in row.split('\t')[1] for row in source['mappingRows']):
            raise ValueError('Official side mapping mismatch: '+fid)
        if item['side']=='left' and v[:,0].mean()<=0 or item['side']=='right' and v[:,0].mean()>=0:
            raise ValueError('Source laterality mismatch: '+fid)
        fingerprint=hashlib.sha256(v.astype('<f4').tobytes()+f.astype('<u4').tobytes()).hexdigest()
        if fingerprint in geometry:raise ValueError('Repeated muscle geometry: '+fid)
        geometry.add(fingerprint)
        vv.append(v);ff.append(f+offset);sources.append(source);offset+=len(v)
    parts.append((item['id'],item['en'],item['he'],'muscle',item['side'],item.get('regionId'),np.concatenate(vv),np.concatenate(ff),sources))
if len(used)!=214 or len(parts)!=379:raise ValueError('Audited inventory changed')
emit('musculoskeletal',parts,'Unchanged validated skeleton position/index buffers plus 89 existing regional muscle groups on both actual source sides (178 muscle structures, 214 distinct muscle ELEMENTs). All muscle triangles retained, mm XYZ converted to metres X Z -Y. No new mirroring, repositioning, scaling, welding or fabricated anatomy. Full trapezius replaces overlapping upper-trapezius. Scalenes and other regional groups remain grouped. Original official source geometry may itself include mirrored meshes; M suffixes are preserved as provenance, not a claim of independent acquisition.',['coccyx','auditory-ossicles','teeth','intervertebral-discs','articular-cartilage','costal-cartilage','ligaments','nerves','vessels','separate-tendons','latissimus-dorsi','rectus-abdominis','internal-oblique','transversus-abdominis','multifidus','quadratus-lumborum','unlisted-muscles'])
out=root/'public/anatomy/musculoskeletal.glb'
if out.stat().st_size>32*1024*1024:raise ValueError('Combined model exceeds 32 MiB budget')
packed=bytearray(gzip.compress(out.read_bytes(),compresslevel=9,mtime=0))
packed[9]=255  # Stable gzip OS byte across converter operating systems.
if len(packed)>25*1024*1024:raise ValueError('Package exceeds the Workers 25 MiB static-asset limit')
out.with_suffix('.glb.gz').write_bytes(packed)
out.unlink()  # Only this generated intermediate; do not publish an oversized raw asset.
byid={s['id']:s for s in catalog['structures']}
for target in [root/'lib/prepared/musculoskeletal-model.json',root/'public/anatomy/musculoskeletal-source-and-license.json']:
    manifest=json.loads(target.read_text(encoding='utf8'))
    for item in manifest['structures']:
        if item['layer']=='muscle':item['learningId']=byid[item['id']]['learningId']
    manifest['sourceMappingSha256']=catalog['mappingSha256']
    manifest['skeletonBaseSha256']=skeleton['glbSha256']
    manifest['transport']={'encoding':'gzip','sha256':hashlib.sha256(packed).hexdigest(),'maxBytes':25*1024*1024}
    manifest['coverage']={'status':'partial muscle coverage; clinical review pending','bones':201,'muscles':178,'bilateralMuscleGroups':89,'muscleSourceElements':214,'triangles':sum(p[7].shape[0] for p in parts),'coordinateSystem':'metres, Y-up, faces +Z; original shared positions retained'}
    target.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Lossless package',len(packed),'bytes',flush=True)
