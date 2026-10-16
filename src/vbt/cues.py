"""Opt-in practice cue state machine consuming manually reviewed observations.

This is not a live pose model. Hold duration is an engineering debounce, NOT an
IPF minimum pause. No cue can override the athlete's or coach's safety judgment.
"""
from dataclasses import dataclass,field
from math import isfinite

@dataclass(frozen=True)
class Observation:
    t:float
    stage:str
    reviewed:bool
    confidence:float
    checks:dict[str,bool]=field(default_factory=dict)

NEEDS={
 'bench':(('setup','Start',('motionless','setup_legal','elbows_locked')),('bottom','Press',('motionless','chest_contact','both_elbows_depth','body_contact')),('finish','Rack',('motionless','elbows_locked','body_contact'))),
 'squat':(('setup','Squat',('motionless','upright','knees_locked')),('finish','Rack',('motionless','upright','knees_locked','depth_reviewed'))),
 'deadlift':(('finish','Down',('motionless','upright','knees_locked','shoulders_position')) ,),
}

class PracticeCues:
    def __init__(self,lift,*,enabled=False,mode='training',hold_s=.5):
        if lift not in NEEDS or mode not in ('training','competition_practice') or not isfinite(hold_s) or not .2<=hold_s<=3:raise ValueError('Invalid cue settings')
        self.lift=lift;self.enabled=enabled;self.mode=mode;self.hold_s=hold_s;self.step=0;self.since=None;self.last=None;self.blocked=False
        self.phase_seen=False;self.descent_seen=False

    def update(self,obs:Observation,*,now:float):
        if not self.enabled or self.mode!='competition_practice' or self.blocked or self.step>=len(NEEDS[self.lift]):return None
        if not all(isfinite(v) for v in (obs.t,obs.confidence,now)) or obs.t<0 or not 0<=now-obs.t<=.25 or not 0<=obs.confidence<=1:
            self.blocked=True;return None
        if self.last is not None and not 0<obs.t-self.last<=.25:
            self.blocked=True;return None
        self.last=obs.t
        if obs.reviewed is not True or obs.confidence<.95:
            self.blocked=True;return None
        stage,command,needs=NEEDS[self.lift][self.step]
        if (stage=='setup' and obs.stage in ('descent','ascent')) or (stage=='bottom' and obs.stage=='ascent'):
            self.blocked=True;return None
        # Reaching finish without an observed concentric phase must never rack/down.
        if obs.stage=='descent':self.descent_seen=True
        if obs.stage=='ascent':self.phase_seen=True
        if stage=='bottom' and not self.descent_seen:self.since=None;return None
        if stage=='finish' and (not self.phase_seen or (self.lift=='squat' and not self.descent_seen)):self.since=None;return None
        if obs.stage!=stage or not all(obs.checks.get(k) is True for k in needs):self.since=None;return None
        if self.since is None:self.since=obs.t
        if obs.t-self.since+1e-9<self.hold_s:return None
        self.step+=1;self.since=None;self.phase_seen=False
        return {'command':command,'t':obs.t,'status':'PRACTICE_CUE_NOT_OFFICIAL','live_validated':False}
