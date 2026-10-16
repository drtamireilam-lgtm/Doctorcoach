import pytest
from vbt.motion import Sample,Calibration
from vbt.pipeline import analyze
from vbt.validation import compare_annotations

def test_annotation_comparison_detects_background_tracking_and_missing_frames():
    truth=[{'t':i/30,'x':10,'y':100-i,'object':'bar'} for i in range(30)]
    good=[dict(r) for r in truth]
    assert compare_annotations(good,truth)['identity_position_agreement']==1
    bad=[dict(r,y=0) for r in truth]
    assert compare_annotations(bad,truth)['identity_position_agreement']==0
    assert compare_annotations(good[:15],truth)['coverage']==.5
    with pytest.raises(ValueError):compare_annotations(good,[])


def test_failed_whole_track_cannot_emit_velocity_for_earlier_good_segment():
    samples=[Sample(i/30,0,100-i*2) for i in range(20)]
    cal=Calibration(.003,.01,True,True,'synthetic ruler')
    out=analyze(samples,track_status='OCCLUDED_OR_CHANGED',camera_stable=True,identity_reviewed=True,calibration=cal)
    assert out['repetitions']
    assert all(r['measurement']['mean_mps'] is None for r in out['repetitions'])
    assert out['effort']['rpe'] is None
    assert out['validated'] is False
