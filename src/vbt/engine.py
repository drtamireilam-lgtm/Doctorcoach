"""Conservative VBT calculations. Never infer m/s from uncalibrated pixels."""
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class VelocityResult:
    mean_mps: Optional[float]
    status: str

def mean_concentric_velocity(displacement_px: float, duration_s: float,
                             metres_per_pixel: Optional[float],
                             bar_identity_verified: bool) -> VelocityResult:
    if not bar_identity_verified:
        return VelocityResult(None, "REJECT_UNVERIFIED_TRACK")
    if metres_per_pixel is None or metres_per_pixel <= 0:
        return VelocityResult(None, "REJECT_UNCALIBRATED")
    if duration_s <= 0 or displacement_px < 0:
        return VelocityResult(None, "REJECT_INVALID_INPUT")
    return VelocityResult(displacement_px * metres_per_pixel / duration_s, "OK")
