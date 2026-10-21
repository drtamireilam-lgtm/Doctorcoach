"""Download only exact shoulder ELEMENTs from official archive using validated HTTP ranges."""
import pathlib,struct,subprocess,zipfile,zlib,concurrent.futures
url='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip'
size=142903898
ids={'FJ3362','FJ3384','FJ3368','FJ1467','FJ1468','FJ1513','FJ1506','FJ1500','FJ1504','FJ1508','FJ1507','FJ1520','FJ1521','FJ1554','FJ1459','FJ1447','FJ1446','FJ1464'}
def fetch(start,end):
 data=subprocess.check_output(['curl','-sSL','--fail','--retry','2','--max-time','60','-r',f'{start}-{end}',url])
 if len(data)!=end-start+1:raise ValueError('Server did not honor byte range')
 return data
tail=fetch(size-203898,size-1);p=tail.find(b'PK\x01\x02');entries=[]
while p>=0 and tail[p:p+4]==b'PK\x01\x02':
 h=struct.unpack_from('<I6H3I5H2I',tail,p);n,x,c=h[10:13];name=tail[p+46:p+46+n].decode();fid=pathlib.PurePosixPath(name).stem
 if fid in ids:entries.append((name,h[8],h[16]))
 p+=46+n+x+c
if len(entries)!=len(ids):raise ValueError('Missing ELEMENTs')
def entry(item):
 name,length,offset=item
 # Local file header is 30 bytes plus name and optional extra. Read a generous prefix first.
 head=fetch(offset,offset+29);h=struct.unpack('<IHHHHHIIIHH',head);start=offset+30+h[9]+h[10]
 packed=fetch(start,start+length-1);data=zlib.decompress(packed,-15)
 return name,data
out=pathlib.Path('/tmp/dc-shoulder-source.zip')
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in pool.map(entry,entries):z.writestr(name,data);print(name,len(data),flush=True)
print(out)
