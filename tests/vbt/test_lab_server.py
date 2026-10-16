import importlib.util,json,threading,urllib.request,urllib.error
from pathlib import Path
import cv2,numpy as np
import pytest
spec=importlib.util.spec_from_file_location('vbt_lab_server',Path(__file__).parents[2]/'tools/vbt-lab/server.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

@pytest.fixture
def lab():
    server=module.LabServer(('127.0.0.1',0));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    yield server
    server.shutdown();server.server_close();thread.join()

def request(lab,path,body=None,*,origin=True,token=True,extra=None):
    headers={}
    if body is not None:
        if origin:headers['Origin']=lab.origin
        if token:headers['X-Lab-Token']=lab.token
    headers.update(extra or {})
    r=urllib.request.Request(lab.origin+path,data=body,headers=headers)
    return urllib.request.urlopen(r,timeout=10)


def test_server_binds_local_and_rejects_cross_origin_and_path_traversal(lab):
    with request(lab,'/') as r:
        assert r.headers['Cache-Control']=='no-store'
        assert b'video' in r.read()
        assert "frame-ancestors 'none'" in r.headers['Content-Security-Policy']
    for opts in [{'origin':False},{'token':False},{'extra':{'Origin':'https://evil.example'}}]:
        with pytest.raises(urllib.error.HTTPError) as e:request(lab,'/api/analyze',b'{}',**opts)
        assert e.value.code==403
    with pytest.raises(urllib.error.HTTPError) as e:request(lab,'/../.env')
    assert e.value.code==404


def test_server_manual_judge_cannot_pass_unseen_criteria(lab):
    with request(lab,'/api/judge',json.dumps({'lift':'bench','mode':'competition_practice','reviewed':True,'criteria':{},'commands':[],'events':{}}).encode()) as r:
        out=json.load(r)
    assert out['status']=='INDETERMINATE';assert not out['validated']
    assert out['missing']


def test_server_full_upload_track_and_measurement_suppression(lab,tmp_path):
    rng=np.random.default_rng(4);background=rng.integers(10,60,(160,240,3),np.uint8);patch=rng.integers(80,230,(24,24,3),np.uint8)
    file=tmp_path/'test.avi';w=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(240,160))
    for i in range(20):
        frame=background.copy();frame[100-i*2:124-i*2,100:124]=patch;w.write(frame)
    w.release()
    with request(lab,'/api/track',file.read_bytes(),extra={'X-ROI':'[100,100,24,24]','X-Consent':'confirmed'}) as r:track=json.load(r)
    assert len(track['samples'])==20;assert len(lab.jobs)==1
    assert len(track['source_sha256'])==64
    with request(lab,'/api/analyze',json.dumps({'job':track['job'],'reviewed':False}).encode()) as r:out=json.load(r)
    assert all(r['measurement']['mean_mps'] is None for r in out['repetitions'])
    assert out['provenance']['source_sha256']==track['source_sha256']
    with request(lab,'/api/analyze',json.dumps({'job':track['job'],'reviewed':True,'calibration':{'metres':.45,'pixels':150,'error':1,'same_plane':True,'fixed_camera':True}}).encode()) as r:out=json.load(r)
    assert out['repetitions'][0]['measurement']['mean_mps']==pytest.approx(.18,abs=.01)
    assert out['validated'] is False


def test_effort_endpoint_requires_personal_evidence(lab):
    with request(lab,'/api/effort',json.dumps({'athlete':'synthetic','lift':'bench','protocol':'paused','observations':[]}).encode()) as r:out=json.load(r)
    assert out['calibration']['model'] is None
