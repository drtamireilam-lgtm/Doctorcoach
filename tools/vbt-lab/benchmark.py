"""Reproducible generated-video benchmark. No human accuracy claims."""
import json,sys,tempfile
from dataclasses import asdict
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'src'))
import cv2,numpy as np
from vbt.vision import Box,track_video
from vbt.validation import compare_annotations
from vbt.pipeline import analyze
from vbt.motion import Calibration

def run():
    cases=[]
    with tempfile.TemporaryDirectory(prefix='dc-vbt-synthetic-') as tmp:
        for lift in ['bench','squat','deadlift']:
            for fps in [24,30,60]:
                for condition in ['clean','occlusion','distractor','slow_camera_pan']:
                    seed=17+['bench','squat','deadlift'].index(lift)
                    rng=np.random.default_rng(seed)
                    bg=rng.integers(10,60,(240,320,3),np.uint8);patch=rng.integers(80,230,(24,24,3),np.uint8)
                    source=Path(tmp)/f'{lift}-{fps}-{condition}.avi'
                    writer=cv2.VideoWriter(str(source),cv2.VideoWriter_fourcc(*'MJPG'),fps,(320,240))
                    truth=[];frames=fps
                    for i in range(frames):
                        y=170-round(60*i/fps);image=bg.copy()
                        if condition!='occlusion' or i<frames//2:image[y:y+24,140:164]=patch
                        if condition=='distractor' and i>=frames//2:image[y:y+24,170:194]=patch
                        dx=round(i*.4) if condition=='slow_camera_pan' else 0
                        if dx:image=cv2.warpAffine(image,np.float32([[1,0,dx],[0,1,0]]),(320,240))
                        writer.write(image);truth.append({'t':i/fps,'x':152+dx,'y':y+12,'object':'bar'})
                    writer.release();track=track_video(source,Box(140,170,24,24))
                    metrics=compare_annotations([asdict(p) for p in track['samples']],truth)
                    # This manual attestation is true only because the fixture supplies exact truth.
                    report=analyze(track['samples'],track_status=track['status'],camera_stable=track['camera_stable'],identity_reviewed=condition=='clean',calibration=Calibration(.003,.01,True,True,'synthetic ruler'))
                    measured=[r['measurement']['mean_mps'] for r in report['repetitions'] if r['measurement']['mean_mps'] is not None]
                    expected=.18
                    passed=(track['status']=='CANDIDATE_ONLY' and metrics['identity_position_agreement']>=.95 and bool(measured) and max(abs(v-expected) for v in measured)<.015) if condition=='clean' else not measured and track['status']!='CANDIDATE_ONLY'
                    cases.append({'lift_scenario':lift,'fps':fps,'condition':condition,'track_status':track['status'],'camera_stable':track['camera_stable'],'expected_mps':expected if condition=='clean' else None,'measured_mps':measured,'annotation_metrics':metrics,'passed':bool(passed)})
    return {'dataset':'generated textured patch; lift names denote scenarios, not human pose','human_videos':0,'validated_on_athletes':False,'cases':cases,'passed':sum(c['passed'] for c in cases),'failed':sum(not c['passed'] for c in cases)}

if __name__=='__main__':
    report=run()
    if len(sys.argv)!=2:raise SystemExit('Specify a new report output path')
    with open(sys.argv[1],'x') as f:json.dump(report,f,indent=2,allow_nan=False)
    print(f"Synthetic cases: {report['passed']} passed, {report['failed']} failed")
    raise SystemExit(1 if report['failed'] else 0)
