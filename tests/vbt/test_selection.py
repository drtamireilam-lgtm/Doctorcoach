import cv2,numpy as np,pytest
from vbt.selection import suggest_regions,propose_boxes
from vbt.vision import Box


def make_video(tmp_path,mode):
    rng=np.random.default_rng(4);bg=rng.integers(10,60,(160,240,3),np.uint8);patch=rng.integers(80,230,(24,24,3),np.uint8)
    file=tmp_path/(mode+'.avi');writer=cv2.VideoWriter(str(file),cv2.VideoWriter_fourcc(*'MJPG'),30,(240,160))
    for i in range(25):
        frame=bg.copy();y=100 if mode=='static' else 100-i*2
        if mode!='occluded' or i<8:frame[y:y+24,100:124]=patch
        if mode=='pan':frame=cv2.warpAffine(frame,np.float32([[1,0,i*2],[0,1,0]]),(240,160))
        writer.write(frame)
    writer.release();return file


def test_assistance_offers_moving_patch_but_never_asserts_identity(tmp_path):
    out=suggest_regions(make_video(tmp_path,'moving'),Box(92,92,40,40))
    assert out['status']=='CANDIDATES_FOR_REVIEW' and 1<=len(out['candidates'])<=3
    assert not out['validated'] and not out['identity_verified']
    assert any(c['roi']==[100,100,24,24] for c in out['candidates'])
    assert all(not c['identity_verified'] and c['full_rate_checked'] and c['relative_motion_px']>=8 for c in out['candidates'])
    assert out['proposals_tested']<=12 and out['preview_frames']<=100


@pytest.mark.parametrize('mode',['static','occluded','pan'])
def test_static_occluded_or_panning_video_is_not_a_recommendation(tmp_path,mode):
    out=suggest_regions(make_video(tmp_path,mode),Box(92,92,40,40))
    assert out['status']=='NO_MOVING_CANDIDATE' and not out['candidates']


def test_proposals_are_local_bounded_and_untextured_sources_have_none():
    image=np.zeros((160,240,3),np.uint8)
    assert propose_boxes(image,Box(92,92,40,40))==[]
    with pytest.raises(ValueError):propose_boxes(image,Box(230,150,24,24))
    for limit in [0,13,True]:
        with pytest.raises(ValueError):propose_boxes(image,Box(92,92,40,40),limit)


def test_preview_respects_original_start_end_and_rejects_invalid_bounds(tmp_path):
    file=make_video(tmp_path,'moving')
    out=suggest_regions(file,Box(92,72,40,40),start_frame=10,end_time=.7)
    assert out['start_frame']==10 and out['preview_start_s']==pytest.approx(10/30,abs=.001)
    assert out['preview_end_s']<=.7001
    for args in [{'start_frame':-1},{'start_frame':True},{'start_time':float('nan')},{'end_time':0},{'end_time':float('inf')}]:
        with pytest.raises(ValueError):suggest_regions(file,Box(92,92,40,40),**args)
