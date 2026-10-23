"""Build original BodyParts3D arm geometry and a simplified body navigation surface.
Usage: python build-atlas.py /tmp/dc-atlas-source.zip /tmp/dc-element-parts.txt
Conversion dependency (offline tooling only): fast-simplification==0.1.13, numpy.
The body partitions are navigation zones, not anatomical muscle boundaries.
"""
import sys,json,zipfile,struct,hashlib,pathlib
import numpy as np
root=pathlib.Path(__file__).resolve().parents[2]
z=zipfile.ZipFile(sys.argv[1]);table=pathlib.Path(sys.argv[2]).read_text().splitlines()
files={pathlib.PurePosixPath(n).stem:n for n in z.namelist() if n.endswith('.obj')}
def load(fid):
 data=z.read(files[fid]);v=[];f=[]
 for line in data.decode().splitlines():
  s=line.split()
  if not s:continue
  if s[0]=='v':v.append((float(s[1])/1000,float(s[3])/1000,-float(s[2])/1000))
  elif s[0]=='f':
   face=[int(t.split('/')[0]) for t in s[1:]];face=[i-1 if i>0 else len(v)+i for i in face]
   for k in range(1,len(face)-1):f.append((face[0],face[k],face[k+1]))
 rows=[r for r in table if r.endswith('\t'+fid)]
 if not rows:raise ValueError('Unmapped source '+fid)
 return np.array(v),np.array(f),{'elementId':fid,'sha256':hashlib.sha256(data).hexdigest(),'mappingRows':rows}
def emit(name,parts,mods,unavailable):
 binary=bytearray();views=[];accessors=[];meshes=[];nodes=[];materials=[];structures=[]
 def accessor(a,typ,target):
  while len(binary)%4:binary.append(0)
  raw=a.tobytes();views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(raw),'target':target});binary.extend(raw)
  acc={'bufferView':len(views)-1,'componentType':5126 if a.dtype==np.float32 else 5123 if a.dtype==np.uint16 else 5125,'count':len(a),'type':typ}
  if typ=='VEC3':acc.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  accessors.append(acc);return len(accessors)-1
 for slug,en,he,layer,side,region,v,f,sources in parts:
  normals=np.zeros(v.shape);cross=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
  for k in range(3):np.add.at(normals,f[:,k],cross)
  normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
  color=[.88,.84,.71,1] if layer=='bone' else [.65,.18,.25,1] if layer=='muscle' else [.32,.46,.59,1]
  materials.append({'name':slug,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':.8},'doubleSided':True})
  meshes.append({'name':slug,'primitives':[{'attributes':{'POSITION':accessor(v.astype('<f4'),'VEC3',34962),'NORMAL':accessor(normals.astype('<f4'),'VEC3',34962)},'indices':accessor(f.flatten().astype('<u2' if len(v)<65536 else '<u4'),'SCALAR',34963),'material':len(materials)-1}]})
  nodes.append({'name':slug,'mesh':len(meshes)-1});structures.append({'id':slug,'en':en,'he':he,'layer':layer,'side':side,**({'regionId':region} if region else {}),'sources':sources,'triangles':len(f),'review':'pending'})
 doc={'asset':{'version':'2.0','generator':'DoctorCoach BodyParts3D atlas converter'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4);binary+=b'\0'*(-len(binary)%4)
 glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
 manifest={'assetId':'bp3d-4-'+name,'sourceUrl':'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip','creator':'The Database Center for Life Science','licenseId':'CC-BY-4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','licenseEvidence':'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html','attribution':'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International','modifications':mods,'downloadedSubsetSha256':hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(),'glbSha256':hashlib.sha256(glb).hexdigest(),'anatomicalReview':'pending','structures':structures,'unavailable':unavailable}
 out=root/'public/anatomy';(out/(name+'.glb')).write_bytes(glb)
 for p in [root/'lib/prepared'/(name+'-model.json'),out/(name+'-source-and-license.json')]:p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(name,len(glb),'bytes',sum(s['triangles'] for s in structures),'triangles',flush=True)
