"""Compare packaged geometry against original source OBJ coordinates/triangles.
Run: python audit-upper-limb.py /tmp/dc-upper-limb-source.zip /tmp/dc-element-parts.txt
This establishes source fidelity, identities and laterality, not clinical approval.
"""
import sys,json,pathlib,struct,hashlib
from atlas_converter import load,np,root
catalog=json.loads((pathlib.Path(sys.argv[3]) if len(sys.argv)>3 else pathlib.Path(__file__).with_name('upper-limb-parts.json')).read_text());results=[]
for name,items in catalog.items():
 raw=(root/'public/anatomy'/(name+'.glb')).read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);start=28+size
 manifest=json.loads((root/'lib/prepared'/(name+'-model.json')).read_text());assert hashlib.sha256(raw).hexdigest()==manifest['glbSha256']
 used=set();materials=set()
 def data(index):
  a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];off=start+v.get('byteOffset',0)+a.get('byteOffset',0)
  n=3 if a['type']=='VEC3' else 1;dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
  return np.frombuffer(raw,dtype=dtype,count=a['count']*n,offset=off)
 for slug,en,he,layer,ids in items:
  entry=next(s for s in manifest['structures'] if s['id']==slug);assert [s['elementId'] for s in entry['sources']]==ids
  vertices=[];indices=[];offset=0
  for fid in ids:
   assert fid not in used;used.add(fid);v,f,src=load(fid);record=next(s for s in entry['sources'] if s['elementId']==fid)
   assert v[:,0].mean()<0,name+':'+slug+' right-side spatial coordinates disagree'
   assert record['sha256']==src['sha256'];assert record['mappingRows']==src['mappingRows'] or set(record['mappingRows']).issubset(src['mappingRows'])
   assert any('right' in r.split('\t')[1] for r in record['mappingRows']);vertices.append(v);indices.append(f+offset);offset+=len(v)
  node=next(n for n in doc['nodes'] if n['name']==slug);mesh=doc['meshes'][node['mesh']];assert mesh['name']==slug
  primitive=mesh['primitives'][0];material=primitive['material'];assert material not in materials;materials.add(material);assert doc['materials'][material]['name']==slug
  expected=np.concatenate(vertices).astype('<f4').flatten();actual=data(primitive['attributes']['POSITION']);assert np.array_equal(actual,expected),name+':'+slug+' positions differ'
  assert np.array_equal(data(primitive['indices']),np.concatenate(indices).flatten()),name+':'+slug+' triangles differ'
  results.append({'model':name,'structure':slug,'elements':ids,'sourceCoordinatesAndTriangles':'exact float32 match','rightSideEvidence':True,'uniqueMaterial':True})
print(json.dumps({'status':'source fidelity and mapping checked','clinicalReview':'pending','structures':results},ensure_ascii=False,indent=2))
