"""Personal, session-held-out calibration. No population speed-to-RPE lookup."""
from dataclasses import dataclass
from math import isfinite,sqrt
from statistics import mean

@dataclass(frozen=True)
class EffortObservation:
    athlete: str
    lift: str
    protocol: str
    session: str
    velocity_mps: float
    rir: float
    maximal_intent: bool
    reviewed_measurement: bool
    label_source: str = 'self_report'


def _fit(rows):
    xs=[r.velocity_mps for r in rows];ys=[r.rir for r in rows];x=mean(xs);y=mean(ys)
    variance=sum((v-x)**2 for v in xs)
    if variance<1e-6:raise ValueError('Insufficient speed range')
    slope=sum((a-x)*(b-y) for a,b in zip(xs,ys))/variance
    if slope<=0:raise ValueError('Non-monotonic personal relationship')
    return y-slope*x,slope


def calibrate(rows,*,athlete,lift,protocol):
    out={'status':'INSUFFICIENT_PERSONAL_DATA','validated':False,'model':None}
    selected=[r for r in rows if (r.athlete,r.lift,r.protocol)==(athlete,lift,protocol)]
    if any(not all(isfinite(v) for v in (r.velocity_mps,r.rir)) or not 0<r.velocity_mps<=3 or not 0<=r.rir<=4 or not r.session for r in selected):
        return dict(out,status='INVALID_CALIBRATION_DATA')
    # Only a labelled last concentric rep per independently reviewed set is input.
    if any(r.maximal_intent is not True or r.reviewed_measurement is not True or r.label_source not in ('self_report','observed_to_failure') for r in selected):
        return dict(out,status='UNREVIEWED_OR_SUBMAXIMAL_INTENT')
    sessions=sorted({r.session for r in selected})
    if len(selected)<9 or len(sessions)<3 or any(sum(r.session==s for r in selected)<3 for s in sessions) or max((r.rir for r in selected),default=0)-min((r.rir for r in selected),default=0)<2:
        return out
    try:
        intercept,slope=_fit(selected);errors=[]
        for held in sessions:
            train=[r for r in selected if r.session!=held];test=[r for r in selected if r.session==held]
            a,b=_fit(train);errors.extend(abs(a+b*r.velocity_mps-r.rir) for r in test)
    except ValueError:
        return dict(out,status='UNSTABLE_CALIBRATION')
    mae=mean(errors);worst=max(errors)
    if mae>1 or worst>2:return dict(out,status='HELD_OUT_ERROR_TOO_HIGH',held_out_mae=mae)
    return dict(out,status='PERSONAL_RESEARCH_MODEL',held_out_mae=mae,model={
        'athlete':athlete,'lift':lift,'protocol':protocol,'intercept':intercept,'slope':slope,
        'min_speed':min(r.velocity_mps for r in selected),'max_speed':max(r.velocity_mps for r in selected),
        'min_rir':min(r.rir for r in selected),'max_rir':max(r.rir for r in selected),
        'error_band':max(1.,worst),'sessions':len(sessions),'samples':len(selected),
        'label_source':'self_report' if any(r.label_source=='self_report' for r in selected) else 'observed_to_failure'})


def estimate_effort(calibration,velocity_mps,*,athlete,lift,protocol,reviewed_measurement,maximal_intent):
    out={'status':'UNAVAILABLE','rir':None,'rpe':None,'validated':False}
    model=calibration.get('model')
    if calibration.get('status')!='PERSONAL_RESEARCH_MODEL' or not model:return out
    if (athlete,lift,protocol)!=(model['athlete'],model['lift'],model['protocol']):return dict(out,status='PROFILE_MISMATCH')
    if not reviewed_measurement or not maximal_intent:return dict(out,status='UNREVIEWED_OR_SUBMAXIMAL_INTENT')
    if not isfinite(velocity_mps) or not model['min_speed']<=velocity_mps<=model['max_speed']:return dict(out,status='NO_EXTRAPOLATION')
    rir=model['intercept']+model['slope']*velocity_mps
    if not model['min_rir']<=rir<=model['max_rir']:return dict(out,status='NO_EXTRAPOLATION')
    band=model['error_band'];low=max(0,rir-band);high=min(4,rir+band)
    return dict(out,status='PERSONAL_ESTIMATE_NOT_VALIDATED',rir=rir,rpe=10-rir,rir_range=[low,high],rpe_range=[10-high,10-low],label_source=model['label_source'])
