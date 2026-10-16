from vbt.quality import Point, evaluate_track

def pts(n=10, verified=True, step=-2):
    return [Point(i, 30, 200 + step*i, verified) for i in range(n)]

def test_valid_preliminary_velocity():
    r=evaluate_track(pts(), total_frames=10, fps=10, metres_per_pixel=.01)
    assert r.status=='OK_PRELIMINARY' and abs(r.mean_concentric_mps-.2)<1e-9

def test_reject_unverified():
    assert evaluate_track(pts(verified=False),total_frames=10,fps=10,metres_per_pixel=.01).status=='REJECT_UNVERIFIED_BAR'

def test_reject_uncalibrated():
    assert evaluate_track(pts(),total_frames=10,fps=10).status=='REJECT_UNCALIBRATED'

def test_reject_sparse():
    assert evaluate_track(pts(5),total_frames=10,fps=10,metres_per_pixel=.01).status=='REJECT_LOW_COVERAGE'

def test_reject_jump():
    p=pts(); p[5]=Point(5,30,100,True)
    assert evaluate_track(p,total_frames=10,fps=10,metres_per_pixel=.01).status=='REJECT_JUMP'

def test_reject_static():
    assert evaluate_track(pts(step=0),total_frames=10,fps=10,metres_per_pixel=.01).status=='REJECT_NO_CONCENTRIC_DISPLACEMENT'

def test_reject_duplicate_frames():
    p=pts();p[3]=Point(2,30,194,True)
    assert evaluate_track(p,total_frames=10,fps=10,metres_per_pixel=.01).status=='REJECT_INVALID_FRAME_SEQUENCE'

def test_reject_bad_video():
    assert evaluate_track(pts(),total_frames=10,fps=0).status=='REJECT_INVALID_VIDEO'
