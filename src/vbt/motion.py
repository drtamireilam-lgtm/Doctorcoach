"""Timestamped image-plane motion. All accepted measurements remain preliminary."""
from dataclasses import dataclass, asdict
from math import isfinite, hypot
from statistics import median

@dataclass(frozen=True)
class Sample:
    t: float
    x: float
    y: float
    score: float = 1.0

@dataclass(frozen=True)
class Calibration:
    metres_per_pixel: float
    relative_error: float
    same_plane: bool
    fixed_camera: bool
    reference: str

    @classmethod
    def from_reference(cls, metres, pixels, pixel_error, *, same_plane, fixed_camera, reference):
        if not all(isfinite(v) for v in (metres,pixels,pixel_error)) or metres<=0 or pixels<10 or not 0<=pixel_error<pixels:
            raise ValueError('Invalid calibration reference')
        return cls(metres/pixels,pixel_error/pixels,same_plane,fixed_camera,reference)

    def valid(self):
        return (isfinite(self.metres_per_pixel) and self.metres_per_pixel>0 and
                isfinite(self.relative_error) and 0<=self.relative_error<=.1 and
                self.same_plane is True and self.fixed_camera is True and bool(self.reference.strip()))


def validate_samples(samples, max_gap=.15):
    if len(samples)<3: return 'INSUFFICIENT_SAMPLES'
    if any(not all(isfinite(v) for v in (s.t,s.x,s.y,s.score)) or s.t<0 or not 0<=s.score<=1 for s in samples):
        return 'INVALID_SAMPLE'
    if any(b.t<=a.t for a,b in zip(samples,samples[1:])): return 'INVALID_TIMESTAMPS'
    gaps=[b.t-a.t for a,b in zip(samples,samples[1:])]
    if any(g>max_gap or g>2.5*median(gaps) for g in gaps): return 'TEMPORAL_GAP'
    if any(s.score<.8 for s in samples): return 'LOW_TRACK_CONFIDENCE'
    return None


def velocity(samples, calibration=None, *, identity_reviewed=False, camera_stable=False):
    """Mean vertical concentric displacement / elapsed source time; not path speed.

    Bounds cover declared scale/point/time uncertainty only, not perspective error.
    """
    reason=validate_samples(samples)
    out={'status':reason or 'PRELIMINARY','mean_mps':None,'bounds_mps':None,'validated':False}
    if reason: return out
    if identity_reviewed is not True: return dict(out,status='UNVERIFIED_BAR_IDENTITY')
    if camera_stable is not True: return dict(out,status='UNVERIFIED_CAMERA')
    if calibration is None or not calibration.valid(): return dict(out,status='UNCALIBRATED')
    if any(b.y-a.y>1.5 for a,b in zip(samples,samples[1:])): return dict(out,status='REVERSAL')
    displacement=samples[0].y-samples[-1].y
    dt=samples[-1].t-samples[0].t
    if displacement<5 or dt<.15: return dict(out,status='INSUFFICIENT_MOTION')
    mpp=calibration.metres_per_pixel
    value=displacement*mpp/dt
    # +/-2px per endpoint and one largest source interval per endpoint.
    timing=max(b.t-a.t for a,b in zip(samples,samples[1:]))
    if dt<=2*timing:return dict(out,status='INSUFFICIENT_TIME_RESOLUTION')
    low=max(0,displacement-4)*mpp*(1-calibration.relative_error)/(dt+2*timing)
    high=(displacement+4)*mpp*(1+calibration.relative_error)/(dt-2*timing)
    if not all(isfinite(v) for v in (value,low,high)):return dict(out,status='NUMERIC_OVERFLOW')
    return dict(out,mean_mps=value,bounds_mps=[low,high],duration_s=dt,displacement_px=displacement)


def segment_concentrics(samples, *, min_displacement_px=12, min_duration_s=.15, reversal_tolerance_px=2):
    """Candidate upward bouts for the three lifts; not a rep counter/judge.

    No smoothing across gaps, no filling occlusion, and no merging across reversals.
    Bottom pauses start the candidate at the first moving sample's predecessor.
    """
    if not all(isfinite(v) and v>0 for v in (min_displacement_px,min_duration_s,reversal_tolerance_px)):
        raise ValueError('Invalid segmentation settings')
    if validate_samples(samples): return []
    bouts=[];start=0;peak=0
    def emit(end):
        if end>start and samples[start].y-samples[end].y>=min_displacement_px and samples[end].t-samples[start].t>=min_duration_s:
            bouts.append({'start':start,'end':end,'start_s':samples[start].t,'end_s':samples[end].t,'status':'CANDIDATE_CONCENTRIC'})
    for i in range(1,len(samples)):
        if samples[i].y < samples[peak].y:
            peak=i
        if samples[i].y-samples[peak].y>reversal_tolerance_px:
            emit(peak);start=i;peak=i
        elif peak==start and samples[i].y>=samples[start].y:
            start=i;peak=i
    emit(peak)
    return bouts
