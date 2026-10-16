import json,os,subprocess,sys
import cv2,numpy as np


def test_cli_default_withholds_speed_and_never_overwrites_report(tmp_path):
    rng=np.random.default_rng(3);bg=rng.integers(10,60,(160,240,3),np.uint8);patch=rng.integers(80,230,(24,24,3),np.uint8)
    video=tmp_path/'input.avi';out=tmp_path/'new-report.json'
    writer=cv2.VideoWriter(str(video),cv2.VideoWriter_fourcc(*'MJPG'),30,(240,160))
    for i in range(20):
        frame=bg.copy();frame[100-i*2:124-i*2,100:124]=patch;writer.write(frame)
    writer.release()
    command=[sys.executable,'-m','vbt',str(video),'--roi','100','100','24','24','--output',str(out)]
    first=subprocess.run(command,capture_output=True,text=True)
    assert first.returncode==0,first.stderr
    report=json.loads(out.read_text());assert report['validated'] is False
    assert report['repetitions'];assert all(r['measurement']['mean_mps'] is None for r in report['repetitions'])
    assert report['provenance']['source_sha256']
    original=out.read_bytes();second=subprocess.run(command,capture_output=True,text=True)
    assert second.returncode!=0
    assert original==out.read_bytes()
