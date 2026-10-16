import cv2
import numpy as np
import pytest
from vbt.vision import Box,RoiTracker,track_video,plate_candidates
from vbt.motion import velocity,Calibration

def fixture():
    rng=np.random.default_rng(25)
    background=rng.integers(10,60,(240,320,3),dtype=np.uint8)
    template=rng.integers(80,240,(24,24,3),dtype=np.uint8)
    def frame(x=140,y=160):
        image=background.copy();image[y:y+24,x:x+24]=template;return image
    return frame,background,template


def test_synthetic_tracking_accuracy_and_camera_gate():
    frame,_,_=fixture();tracker=RoiTracker(frame(),Box(140,160,24,24));points=[]
    for i in range(30):
        p,status=tracker.update(frame(y=160-i*2),i/30)
        assert status=='CANDIDATE_ONLY';assert p.y==pytest.approx(172-i*2,abs=.5);points.append(p)
    assert tracker.camera_stable
    c=Calibration.from_reference(.45,150,1,same_plane=True,fixed_camera=True,reference='synthetic')
    assert velocity(points,c,camera_stable=True)['mean_mps'] is None
    out=velocity(points,c,camera_stable=True,identity_reviewed=True)
    assert out['mean_mps']==pytest.approx(.18,abs=.005)


def test_occlusion_stops_instead_of_switching_to_background():
    frame,background,_=fixture();t=RoiTracker(frame(),Box(140,160,24,24))
    assert t.update(frame(),0)[0]
    assert t.update(background,1/30)[0] is None
    assert t.update(frame(),2/30)[1]=='TRACK_LOST'


def test_identical_distractor_is_ambiguous():
    frame,_,template=fixture();image=frame();t=RoiTracker(image,Box(140,160,24,24))
    image[160:184,170:194]=template
    assert t.update(image,0)[1]=='AMBIGUOUS_OBJECT'


def test_camera_pan_rejected():
    frame,_,_=fixture();initial=frame();t=RoiTracker(initial,Box(140,160,24,24));t.update(initial,0)
    shifted=cv2.warpAffine(initial,np.float32([[1,0,8],[0,1,0]]),(320,240))
    assert t.update(shifted,1/30)[1]=='CAMERA_MOVEMENT'


def test_untextured_roi_and_invalid_timestamps():
    with pytest.raises(ValueError):RoiTracker(np.zeros((100,100,3),np.uint8),Box(10,10,20,20))
    frame,_,_=fixture();t=RoiTracker(frame(),Box(140,160,24,24));t.update(frame(),0)
    assert t.update(frame(),0)[1]=='INVALID_TIMESTAMPS'


def test_real_decode_pipeline_with_synthetic_private_video(tmp_path):
    frame,_,_=fixture();file=tmp_path/'generated.avi'
    writer=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(320,240))
    assert writer.isOpened()
    for i in range(24):writer.write(frame(y=160-i*2))
    writer.release()
    track=track_video(file,Box(140,160,24,24))
    assert len(track['samples'])==24
    assert track['identity_verified'] is False
    assert track['camera_stable'] is True
    assert all(abs(p.y-(172-i*2))<1 for i,p in enumerate(track['samples']))


def test_plate_proposals_never_claim_identity():
    image=np.zeros((240,320,3),np.uint8);cv2.circle(image,(150,120),35,(255,255,255),3)
    candidates=plate_candidates(image)
    assert candidates
    assert all(p['identity_verified'] is False for p in candidates)


def test_slow_camera_drift_accumulates_and_is_rejected():
    frame,_,_=fixture();image=frame();t=RoiTracker(image,Box(140,160,24,24))
    states=[]
    for i in range(10):
        moved=cv2.warpAffine(image,np.float32([[1,0,i*1.0],[0,1,0]]),(320,240))
        _,status=t.update(moved,i/30);states.append(status)
        if t.failed:break
    assert states[-1]=='CAMERA_MOVEMENT'


def test_featureless_background_cannot_confirm_camera_stability():
    _,_,patch=fixture();image=np.full((240,320,3),30,np.uint8);image[100:124,100:124]=patch
    t=RoiTracker(image,Box(100,100,24,24));t.update(image,0)
    assert not t.camera_stable


def test_manual_restart_uses_exact_frame_and_original_timestamps(tmp_path):
    frame,_,_=fixture();file=tmp_path/'restart.avi'
    writer=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(320,240))
    for i in range(24):writer.write(frame(y=160-i*2))
    writer.release()
    track=track_video(file,Box(140,140,24,24),start_frame=10)
    assert track['start_frame']==10
    assert len(track['samples'])==14
    assert track['samples'][0].t==pytest.approx(10/30,abs=.001)
    assert track['samples'][0].y==pytest.approx(152,abs=1)
    assert track['failure_frame'] is None
    timed=track_video(file,Box(140,140,24,24),start_time=10/30)
    assert timed['start_frame']==10
    for bad in [-1,1800,1.2,True]:
        with pytest.raises(ValueError):track_video(file,Box(140,140,24,24),start_frame=bad)
    for bad in [-1,float('nan'),61]:
        with pytest.raises(ValueError):track_video(file,Box(140,140,24,24),start_time=bad)


def test_lost_track_reports_exact_correction_frame(tmp_path):
    frame,background,_=fixture();file=tmp_path/'lost.avi'
    writer=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(320,240))
    for i in range(15):writer.write(frame(y=160-i*2) if i<8 else background)
    writer.release()
    track=track_video(file,Box(140,160,24,24))
    assert len(track['samples'])==8
    assert track['failure_frame']==8
    assert track['failure_time']==pytest.approx(8/30,abs=.001)


def rotated_fixture(angle=2):
    rng=np.random.default_rng(25)
    background=rng.integers(10,60,(240,320,3),dtype=np.uint8)
    patch=rng.integers(80,240,(40,40,3),dtype=np.uint8)
    first=background.copy();first[140:180,140:180]=patch
    second=background.copy()
    second[138:178,140:180]=cv2.warpAffine(patch,cv2.getRotationMatrix2D((20,20),angle,1),(40,40),borderMode=cv2.BORDER_REFLECT)
    return first,second


def test_small_rotation_requires_flow_and_retains_raw_uncertainty():
    first,second=rotated_fixture();tracker=RoiTracker(first,Box(140,140,40,40))
    tracker.update(first,0);sample,status=tracker.update(second,1/30)
    assert status=='CANDIDATE_ONLY' and tracker.flow_confirmed_frames==1
    assert sample.y==pytest.approx(158,abs=1)
    assert .65<=sample.score<.8 # Flow support must not inflate visual confidence.
    cal=Calibration.from_reference(.45,150,1,same_plane=True,fixed_camera=True,reference='synthetic')
    from vbt.motion import Sample
    points=[Sample(i/30,160,160-i*2,sample.score) for i in range(10)]
    assert velocity(points,cal,camera_stable=True,identity_reviewed=True)['mean_mps'] is None


def test_weak_template_without_flow_consensus_stops(monkeypatch):
    first,second=rotated_fixture();tracker=RoiTracker(first,Box(140,140,40,40));tracker.update(first,0)
    monkeypatch.setattr(cv2,'goodFeaturesToTrack',lambda *a,**k:None)
    assert tracker.update(second,1/30)[1]=='APPEARANCE_FLOW_DISAGREEMENT'
    assert tracker.update(first,2/30)[1]=='TRACK_LOST'


def test_fixed_reference_flow_handles_small_rotation_without_reseeding():
    from vbt.vision import ReferenceFlow
    first,second=rotated_fixture(angle=1.5);gray=lambda f:cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    flow=ReferenceFlow(gray(first),Box(140,140,40,40))
    initial=flow.initial_count
    _,aliased=rotated_fixture(angle=2)
    assert ReferenceFlow(gray(first),Box(140,140,40,40)).advance(gray(aliased)) is None
    result=flow.advance(gray(second))
    assert result is not None
    box,score=result
    assert box.y==pytest.approx(138,abs=1) and score>=.8
    assert 8<=len(flow.points)<=initial
    blank=np.zeros_like(gray(first))
    assert flow.advance(blank) is None
    assert flow.advance(gray(second)) is None # No silent reacquisition.


def test_reference_flow_does_not_follow_a_distant_copy():
    from vbt.vision import ReferenceFlow
    first,_=rotated_fixture();gray=cv2.cvtColor(first,cv2.COLOR_BGR2GRAY)
    flow=ReferenceFlow(gray,Box(140,140,40,40))
    replaced=gray.copy();replaced[140:180,140:180]=20
    replaced[30:70,30:70]=gray[140:180,140:180]
    assert flow.advance(replaced) is None


def test_explicit_end_is_not_a_bridge_over_failure(tmp_path):
    frame,background,_=fixture();file=tmp_path/'bounded.avi'
    writer=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(320,240))
    for i in range(15):writer.write(frame(y=160-i*2) if i<8 else background)
    writer.release()
    before=track_video(file,Box(140,160,24,24),end_time=.2)
    assert before['status']=='CANDIDATE_ONLY' and len(before['samples'])==7
    assert before['end_time']==.2
    after=track_video(file,Box(140,160,24,24),end_time=.4)
    assert after['failure_frame']==8 # Bound may never bypass an earlier stop.
    for end in [0,-1,float('nan'),61]:
        with pytest.raises(ValueError):track_video(file,Box(140,160,24,24),end_time=end)
    with pytest.raises(ValueError):track_video(file,Box(140,140,24,24),start_frame=10,end_time=.2)
