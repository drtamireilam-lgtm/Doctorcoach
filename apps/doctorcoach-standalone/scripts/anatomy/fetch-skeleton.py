"""Fetch original 4.0 bone ELEMENTs only; verify byte ranges and each ZIP CRC.

Usage: python fetch-skeleton.py SOURCE_DIRECTORY OUTPUT.zip
SOURCE_DIRECTORY contains official isa_element_parts.txt and archive-directory.bin
(the final 203898 bytes of the 142903898-byte official archive).
No installation, credentials or application deployment are involved.
"""
import concurrent.futures, pathlib, struct, subprocess, sys, zipfile, zlib

url = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip'
source = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
rows = [r.split('\t') for r in (source/'isa_element_parts.txt').read_text().splitlines()[1:]]
ids = {r[2] for r in rows if r[0] == 'FMA5018'} | {'FJ3153', 'FJ3178', 'FJ3290'}
directory = (source/'archive-directory.bin').read_bytes()
p = directory.find(b'PK\x01\x02')
entries = []
while p >= 0 and directory[p:p+4] == b'PK\x01\x02':
    h = struct.unpack_from('<I6H3I5H2I', directory, p)
    n, x, c = h[10:13]
    name = directory[p+46:p+46+n].decode()
    if pathlib.PurePosixPath(name).stem in ids:
        entries.append({'name': name, 'size': h[8], 'offset': h[16], 'crc': h[7]})
    p += 46+n+x+c
if len(entries) != len(ids):
    raise ValueError('Source archive does not contain every selected bone ELEMENT')

# Batch nearby entries to avoid hundreds of HTTP round trips; no geometry is changed.
groups = []
for entry in sorted(entries, key=lambda e:e['offset']):
    end = entry['offset']+30+len(entry['name'].encode())+4096+entry['size']-1
    if groups and entry['offset']-groups[-1]['end'] < 50000 and end-groups[-1]['start'] < 512000:
        groups[-1]['end'] = max(groups[-1]['end'],end)
        groups[-1]['entries'].append(entry)
    else:
        groups.append({'start':entry['offset'],'end':end,'entries':[entry]})
print(len(ids),'source elements,',len(groups),'bounded requests,',sum(g['end']-g['start']+1 for g in groups),'download bytes',flush=True)

def fetch(group):
    start,end = group['start'],min(group['end'],142903897)
    data = subprocess.check_output(['curl.exe' if sys.platform=='win32' else 'curl','--silent','--show-error','--fail','--location','--retry','2','--max-time','60','--range',f'{start}-{end}',url])
    if len(data) != end-start+1:
        raise ValueError('Server did not return the exact requested byte range')
    result = []
    for entry in group['entries']:
        offset = entry['offset']-start
        h = struct.unpack_from('<IHHHHHIIIHH',data,offset)
        if h[0] != 0x04034b50 or h[3] != 8:
            raise ValueError('Unexpected source ZIP header')
        payload = offset+30+h[9]+h[10]
        raw = zlib.decompress(data[payload:payload+entry['size']],-15)
        if zlib.crc32(raw) != entry['crc']:
            raise ValueError('Source CRC mismatch: '+entry['name'])
        result.append((entry['name'],raw))
    return result

contents = []
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(fetch,groups):
        contents.extend(result)
        print('Verified',len(contents),'/',len(ids),flush=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
    for name,data in sorted(contents):
        info = zipfile.ZipInfo(name,(2026,10,24,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info,data)
print(out,flush=True)
