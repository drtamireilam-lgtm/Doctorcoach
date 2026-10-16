"""Conservative acceptance gates for manually annotated barbell tracking."""
from dataclasses import dataclass
from math import hypot, isfinite
from statistics import median
from typing import Sequence

@dataclass(frozen=True)
class Point:
    frame: int
    x: float
    y: float
    verified_bar: bool = False

@dataclass(frozen=True)
class TrackReport:
    status: str
    coverage: float
    median_step_px: float | None
    max_step_px: float | None
    mean_concentric_mps: float | None

def evaluate_track(points: Sequence[Point], *, total_frames: int, fps: float,
                   metres_per_pixel: float | None = None,
                   min_coverage: float = .8, max_step_px: float = 35.0,
                   movement: str = 'up') -> TrackReport:
    """Evaluate a single monotonic concentric interval, not full rep segmentation."""
    def reject(reason, coverage=0., med=None, maxstep=None):
        return TrackReport(reason, coverage, med, maxstep, None)
    if total_frames < 2 or not isfinite(fps) or fps <= 0:
        return reject('REJECT_INVALID_VIDEO')
    if len(points) < 2:
        return reject('REJECT_INSUFFICIENT_POINTS')
    if any(not (isfinite(p.x) and isfinite(p.y)) for p in points):
        return reject('REJECT_NONFINITE_COORDINATE')
    frames = [p.frame for p in points]
    if frames[0] < 0 or frames[-1] >= total_frames or any(b <= a for a,b in zip(frames,frames[1:])):
        return reject('REJECT_INVALID_FRAME_SEQUENCE')
    coverage = len(points) / total_frames
    if not all(p.verified_bar for p in points):
        return reject('REJECT_UNVERIFIED_BAR', coverage)
    steps = [hypot(b.x-a.x, b.y-a.y) / (b.frame-a.frame) for a,b in zip(points,points[1:])]
    med, maximum = median(steps), max(steps)
    if coverage < min_coverage:
        return reject('REJECT_LOW_COVERAGE', coverage, med, maximum)
    if maximum > max_step_px:
        return reject('REJECT_JUMP', coverage, med, maximum)
    if metres_per_pixel is None or not isfinite(metres_per_pixel) or metres_per_pixel <= 0:
        return reject('REJECT_UNCALIBRATED', coverage, med, maximum)
    if movement not in ('up','down'):
        return reject('REJECT_INVALID_DIRECTION', coverage, med, maximum)
    signed_px = (points[0].y-points[-1].y) if movement == 'up' else (points[-1].y-points[0].y)
    if signed_px <= 0:
        return reject('REJECT_NO_CONCENTRIC_DISPLACEMENT', coverage, med, maximum)
    duration = (frames[-1]-frames[0])/fps
    return TrackReport('OK_PRELIMINARY', coverage, med, maximum, signed_px*metres_per_pixel/duration)
