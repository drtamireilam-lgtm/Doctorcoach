"""Download only cataloged ELEMENTs, with exact ranges and ZIP CRC validation."""
import pathlib,json,struct,subprocess,zipfile,zlib,concurrent.futures
url='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip';size=142903898
out=pathlib.Path('/tmp/dc-upper-limb-source.zip')
cached={}
if out.exists():
 with zipfile.ZipFile(out) as previous:cached={n:previous.read(n) for n in previous.namelist()}
catalog=json.loads(pathlib.Path(__file__).with_name('upper-limb-parts.json').read_text());ids={fid for items in catalog.values() for item in items for fid in item[4]}
def fetch(start,end):
 data=subprocess.check_output(['curl','-sSL','--fail','--retry','2','--max-time','60','-r',f'{start}-{end}',url])
 if len(data)!=end-start+1:raise ValueError('Server did not honor byte range')
 return data
tail=fetch(size-203898,size-1);p=tail.find(b'PK\x01\x02');entries=[]
while p>=0 and tail[p:p+4]==b'PK\x01\x02':
 h=struct.unpack_from('<I6H3I5H2I',tail,p);n,x,c=h[10:13];name=tail[p+46:p+46+n].decode()
 if pathlib.PurePosixPath(name).stem in ids:entries.append((name,h[8],h[16],h[7]))
 p+=46+n+x+c
if len(entries)!=len(ids):raise ValueError('Missing ELEMENTs')
def entry(item):
 name,length,offset,crc=item
 if name in cached and zlib.crc32(cached[name])==crc:return name,cached[name]
 raw=fetch(offset,offset+30+len(name.encode())+4096+length-1);h=struct.unpack_from('<IHHHHHIIIHH',raw);start=30+h[9]+h[10]
 packed=raw[start:start+length]
 if len(packed)!=length:raise ValueError('Unexpected ZIP extra header')
 data=zlib.decompress(packed,-15)
 if zlib.crc32(data)!=crc:raise ValueError('Source CRC mismatch '+name)
 return name,data
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in pool.map(entry,entries):z.writestr(name,data);print(name,len(data),flush=True)
print(out)
