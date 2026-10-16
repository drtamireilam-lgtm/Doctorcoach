"""Quality gate for candidate bar tracks. Identity must be externally verified."""
from dataclasses import dataclass

@dataclass(frozen=True)
class TrackGate:
    accepted: bool
    reason: str

def verify_track(identity_verified: bool, valid_frames: int, total_frames: int,
                 max_forward_backward_error_px: float, threshold_px: float = 2.0) -> TrackGate:
    if not identity_verified:
        return TrackGate(False, "REJECT_UNVERIFIED_TRACK")
    if total_frames <= 0 or valid_frames < 2 or valid_frames > total_frames:
        return TrackGate(False, "REJECT_INSUFFICIENT_FRAMES")
    if max_forward_backward_error_px < 0 or max_forward_backward_error_px > threshold_px:
        return TrackGate(False, "REJECT_TRACK_DRIFT")
    return TrackGate(True, "OK")
