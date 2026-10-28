"""Build only the simplified BodyParts3D body navigation surface.
Arm/forearm/hand are owned by build-upper-limb.py.
Usage: python build-atlas.py /tmp/dc-atlas-source.zip /tmp/dc-element-parts.txt
Conversion dependency (offline tooling only): fast-simplification==0.1.13, numpy.
The body partitions are navigation zones, not anatomical muscle boundaries.
"""
from atlas_converter import load,emit,np
import fast_simplification
v,f,source=load('FJ2810');print('skin bounds',v.min(axis=0),v.max(axis=0),'triangles',len(f),flush=True)
v,f=fast_simplification.simplify(v,f,target_count=24000,agg=7)
low,high=v.min(axis=0),v.max(axis=0);height=high[1]-low[1]
labels={'head-context':('Head — context only','ראש — להתמצאות בלבד'),'cervical_neck':('Neck','צוואר'),'shoulder':('Shoulder','כתף'),'elbow':('Arm / elbow','זרוע ומרפק'),'forearm':('Forearm','אמה'),'wrist_hand':('Wrist / hand','שורש כף היד וכף היד'),'chest':('Chest','בית החזה'),'upper_back_scapula':('Upper back','גב עליון'),'core_abdomen':('Abdomen','בטן'),'lower_back_spine':('Lumbar back','גב תחתון'),'hip_glute':('Hip / glutes','ירך ועכוז'),'groin':('Pelvis / groin','אגן ומפשעה'),'thigh':('Thigh','ירך'),'knee':('Knee','ברך'),'lower_leg':('Lower leg','שוק'),'ankle_foot':('Ankle / foot','קרסול וכף רגל')}
def zone(point):
 x,y,z=point;h=(y-low[1])/height;a=abs(x);back=z<(low[2]+high[2])/2
 if h>.90:return 'head-context'
 if h>.84:return 'cervical_neck'
 if h>.73 and a>.12:return 'shoulder'
 if h>.59 and a>.18:return 'elbow'
 if h>.49 and a>.20:return 'forearm'
 if h>.38 and a>.20:return 'wrist_hand'
 if h>.68:return 'upper_back_scapula' if back else 'chest'
 if h>.55:return 'lower_back_spine' if back else 'core_abdomen'
 if h>.44:return 'hip_glute' if back else 'groin'
 if h>.29:return 'thigh'
 if h>.245:return 'knee'
 if h>.08:return 'lower_leg'
 return 'ankle_foot'
groups={}
for tri in f:groups.setdefault(zone(v[tri].mean(axis=0)),[]).append(tri)
parts=[]
for slug,(en,he) in labels.items():
 faces=np.array(groups.get(slug,[]))
 if not len(faces):raise ValueError('Missing navigation zone '+slug)
 indices,remap=np.unique(faces,return_inverse=True)
 parts.append((slug,en,he,'surface','both',None if slug=='head-context' else slug,v[indices],remap.reshape(-1,3),[source]))
emit('body',parts,'Original whole-body skin ELEMENT FJ2810 simplified to 24,000 triangles with fast-simplification 0.1.13, then partitioned into approximate navigation zones. Zones are NOT anatomical boundaries or muscle geometry. mm XYZ converted to metres X Z -Y; normals and materials added.',['muscle-detail','skeletal-layers','anatomical-region-boundaries','internal-organs'])
