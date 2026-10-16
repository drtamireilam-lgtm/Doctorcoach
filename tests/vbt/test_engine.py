from vbt.engine import mean_concentric_velocity
from vbt.tracker import verify_track

def test_unverified_is_rejected():
    assert mean_concentric_velocity(100, 1, .001, False).status == "REJECT_UNVERIFIED_TRACK"

def test_uncalibrated_is_rejected():
    assert mean_concentric_velocity(100, 1, None, True).mean_mps is None

def test_calibrated_measurement():
    result = mean_concentric_velocity(100, 2, .005, True)
    assert result.status == "OK"
    assert result.mean_mps == .25

def test_track_drift_rejected():
    assert not verify_track(True, 50, 60, 3.5).accepted

def test_track_identity_required():
    assert not verify_track(False, 50, 60, .1).accepted

def test_track_gate_accepts_valid_candidate():
    assert verify_track(True, 50, 60, .1).accepted
