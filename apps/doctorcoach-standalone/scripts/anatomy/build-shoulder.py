"""Build a small self-contained GLB from official BodyParts3D 4.0 OBJ geometry.
Usage: python scripts/anatomy/build-shoulder.py ARCHIVE.zip isa_element_parts.txt
No geometry is synthesized. Coordinates: source mm XYZ -> metres XZY (-Y).
"""
import sys, json, zipfile, struct, hashlib, pathlib, math
root=pathlib.Path(__file__).resolve().parents[2]
archive=pathlib.Path(sys.argv[1]); table=pathlib.Path(sys.argv[2])
# Explicit source ELEMENT IDs, not fuzzy name matches.
items=[('clavicle','Clavicle','עצם הבריח','bone',['FJ3362']),('scapula','Scapula','עצם השכמה','bone',['FJ3384']),('humerus','Humerus','עצם הזרוע','bone',['FJ3368']),('deltoid','Deltoid','דלתואיד','muscle',['FJ1467','FJ1468','FJ1513']),('supraspinatus','Supraspinatus','סופרספינטוס','muscle',['FJ1506']),('infraspinatus','Infraspinatus','אינפרספינטוס','muscle',['FJ1500']),('subscapularis','Subscapularis','סאבסקפולריס','muscle',['FJ1504']),('teres-minor','Teres minor','טרס מינור','muscle',['FJ1508']),('teres-major','Teres major','טרס מייג׳ור','muscle',['FJ1507']),('trapezius','Trapezius','טרפזיוס','muscle',['FJ1520','FJ1521','FJ1554']),('serratus-anterior','Serratus anterior','סרטוס אנטריור','muscle',['FJ1459']),('pectoralis-major','Pectoralis major','פקטורליס מייג׳ור','muscle',['FJ1447','FJ1446','FJ1464'])]
z=zipfile.ZipFile(archive); files={pathlib.PurePosixPath(n).stem:n for n in z.namelist() if n.endswith('.obj')}
sourceRows=table.read_text().splitlines(); structures=[]; binary=bytearray(); views=[]; accessors=[]; meshes=[]; nodes=[]; materials=[]
def buffer(data,target):
 while len(binary)%4:binary.append(0)
 index=len(views);views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data),'target':target});binary.extend(data);return index
def accessor(values,typ,component,target):
 n=3 if typ=='VEC3' else 1
 flat=[v for row in values for v in row] if n==3 else values
 fmt='f' if component==5126 else 'H' if component==5123 else 'I'
 a={'bufferView':buffer(struct.pack('<'+str(len(flat))+fmt,*flat),target),'componentType':component,'count':len(values),'type':typ}
 if typ=='VEC3':a.update(min=[min(p[k] for p in values) for k in range(3)],max=[max(p[k] for p in values) for k in range(3)])
 accessors.append(a);return len(accessors)-1
for slug,en,he,layer,ids in items:
 vertices=[]; triangles=[]; sources=[]
 for fid in ids:
  data=z.read(files[fid]);local=[]; faces=[]
  for line in data.decode().splitlines():
   s=line.split()
   if not s:continue
   if s[0]=='v':local.append((float(s[1])/1000,float(s[3])/1000,-float(s[2])/1000))
   elif s[0]=='f':
    face=[int(t.split('/')[0]) for t in s[1:]]; face=[i-1 if i>0 else len(local)+i for i in face]
    for k in range(1,len(face)-1):faces.append((face[0],face[k],face[k+1]))
  offset=len(vertices);vertices.extend(local);triangles.extend(tuple(i+offset for i in face) for face in faces)
  rows=[row for row in sourceRows if row.endswith('\t'+fid) and '\tright ' in row or row.endswith('\t'+fid) and '\t' in row and any(w in row for w in ['right deltoid','right trapezius','right pectoralis'])]
  sources.append({'elementId':fid,'sha256':hashlib.sha256(data).hexdigest(),'mappingRows':rows})
 if not vertices or not triangles:raise ValueError(slug)
 normals=[[0.,0.,0.] for _ in vertices]
 for a,b,c in triangles:
  u=[vertices[b][k]-vertices[a][k] for k in range(3)];v=[vertices[c][k]-vertices[a][k] for k in range(3)]; n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
  for i in (a,b,c):
   for k in range(3):normals[i][k]+=n[k]
 normals=[tuple(v/max(math.sqrt(sum(x*x for x in n)),1e-12) for v in n) for n in normals]
 color=[.88,.84,.71,1] if layer=='bone' else [.65,.18,.25,1]
 material=len(materials);materials.append({'name':slug,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':.8},'doubleSided':True})
 meshes.append({'name':slug,'primitives':[{'attributes':{'POSITION':accessor(vertices,'VEC3',5126,34962),'NORMAL':accessor(normals,'VEC3',5126,34962)},'indices':accessor([i for f in triangles for i in f],'SCALAR',5123 if len(vertices)<65536 else 5125,34963),'material':material}]})
 nodes.append({'name':slug,'mesh':len(meshes)-1})
 structures.append({'id':slug,'en':en,'he':he,'layer':layer,'side':'right','sources':sources,'triangles':len(triangles),'review':'pending'})
doc={'asset':{'version':'2.0','generator':'DoctorCoach BodyParts3D subset converter'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*(-len(j)%4);binary+=b'\0'*(-len(binary)%4)
glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
out=root/'public/anatomy';out.mkdir(parents=True,exist_ok=True);(out/'shoulder.glb').write_bytes(glb)
manifest={'assetId':'bp3d-4-right-shoulder','sourceUrl':'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip','creator':'The Database Center for Life Science','licenseId':'CC-BY-4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','licenseEvidence':'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html','attribution':'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International','modifications':'Right shoulder subset; combined ELEMENT parts, millimetres converted to metres, coordinate basis rotated, vertex normals generated, GLB materials added. No invented geometry.','downloadedSubsetSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'glbSha256':hashlib.sha256(glb).hexdigest(),'anatomicalReview':'pending','structures':structures,'unavailable':['latissimus-dorsi','glenohumeral-joint','acromioclavicular-joint','sternoclavicular-joint','separate-tendons','ligaments','nerves']}
(root/'lib/prepared/shoulder-model.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(out/'source-and-license.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(len(glb), 'bytes',sum(s['triangles'] for s in structures),'triangles')
