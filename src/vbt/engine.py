"""Conservative VBT calculations. Never infer m/s from uncalibrated pixels."""
from dataclasses import dataclass
from typing import Optional
from math import isfinite

@dataclass(frozen=True)
class VelocityResult:
    mean_mps: Optional[float]
    status: str
    validated: bool = False

def mean_concentric_velocity(displacement_px: float, duration_s: float,
                             metres_per_pixel: Optional[float],
                             bar_identity_verified: bool) -> VelocityResult:
    if not bar_identity_verified:
        return VelocityResult(None, "REJECT_UNVERIFIED_TRACK")
    if metres_per_pixel is None or not isfinite(metres_per_pixel) or metres_per_pixel <= 0:
        return VelocityResult(None, "REJECT_UNCALIBRATED")
    if not all(isfinite(n) for n in (duration_s, displacement_px)) or duration_s <= 0 or displacement_px < 0:
        return VelocityResult(None, "REJECT_INVALID_INPUT")
    value=displacement_px * metres_per_pixel / duration_s
    if not isfinite(value):
        return VelocityResult(None, "REJECT_INVALID_INPUT")
    return VelocityResult(value, "OK")
