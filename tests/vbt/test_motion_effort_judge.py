import math
import pytest
from vbt.motion import Sample,Calibration,velocity,segment_concentrics
from vbt.effort import EffortObservation,calibrate,estimate_effort
from vbt.judge import Attempt,CRITERIA,review_attempt
from vbt.cues import Observation,PracticeCues
from vbt.engine import mean_concentric_velocity
from vbt.tracker import verify_track

@pytest.mark.parametrize('n',[float('nan'),float('inf'),-float('inf')])
def test_legacy_nonfinite_never_accepted(n):
    assert mean_concentric_velocity(10,n,.01,True).mean_mps is None
    assert mean_concentric_velocity(n,1,.01,True).mean_mps is None
    assert mean_concentric_velocity(10,1,n,True).mean_mps is None
    assert not verify_track(True,3,3,n).accepted


def upward():return [Sample(i/30,50,100-i*2) for i in range(16)]
def scale():return Calibration.from_reference(.45,150,1,same_plane=True,fixed_camera=True,reference='Synthetic same-plane ruler')

def test_velocity_gates_and_uncertainty():
    p=upward();assert velocity(p,scale())['mean_mps'] is None
    assert velocity(p,scale(),identity_reviewed=True)['mean_mps'] is None
    assert velocity(p,None,identity_reviewed=True,camera_stable=True)['mean_mps'] is None
    out=velocity(p,scale(),identity_reviewed=True,camera_stable=True)
    assert out['mean_mps']==pytest.approx(.18)
    assert out['bounds_mps'][0]<.18<out['bounds_mps'][1]
    assert out['validated'] is False

@pytest.mark.parametrize('kind',['gap','duplicate','nan','reverse','low_confidence'])
def test_bad_motion_suppressed(kind):
    p=upward()
    if kind=='gap':p[7:10]=[]
    if kind=='duplicate':p[3]=p[2]
    if kind=='nan':p[4]=Sample(float('nan'),0,0)
    if kind=='reverse':p[5]=Sample(5/30,50,120)
    if kind=='low_confidence':p[5]=Sample(5/30,50,90,.5)
    assert velocity(p,scale(),identity_reviewed=True,camera_stable=True)['mean_mps'] is None


def test_segmentation_does_not_count_descent_or_static():
    assert segment_concentrics([Sample(i/30,0,20) for i in range(30)])==[]
    assert segment_concentrics([Sample(i/30,0,i) for i in range(30)])==[]
    y=[100]*5+list(range(100,60,-2))+[62]*5+list(range(62,102,2))+list(range(100,60,-2))
    reps=segment_concentrics([Sample(i/30,0,v) for i,v in enumerate(y)])
    assert len(reps)==2
    assert reps[0]['end']<reps[1]['start']


def observations():
    return [EffortObservation('a','bench','paused|max-intent|80kg',str(s),.2+.1*r,r,True,True) for s in range(3) for r in [0,1,2,3]]
def fit(rows=None):return calibrate(observations() if rows is None else rows,athlete='a',lift='bench',protocol='paused|max-intent|80kg')

def test_personal_effort_validation_and_profile_separation():
    c=fit();assert c['status']=='PERSONAL_RESEARCH_MODEL';assert c['held_out_mae']<1e-8
    out=estimate_effort(c,.35,athlete='a',lift='bench',protocol='paused|max-intent|80kg',reviewed_measurement=True,maximal_intent=True)
    assert out['rir']==pytest.approx(1.5);assert out['rpe']==pytest.approx(8.5);assert out['validated'] is False
    assert estimate_effort(c,.35,athlete='other',lift='bench',protocol='paused|max-intent|80kg',reviewed_measurement=True,maximal_intent=True)['rir'] is None
    assert estimate_effort(c,.9,athlete='a',lift='bench',protocol='paused|max-intent|80kg',reviewed_measurement=True,maximal_intent=True)['rir'] is None
    assert fit(observations()[:4])['model'] is None


def test_reversed_relationship_and_unknown_intent_rejected():
    rows=observations()
    rows=[EffortObservation(r.athlete,r.lift,r.protocol,r.session,.7-r.velocity_mps,r.rir,True,True) for r in rows]
    assert fit(rows)['model'] is None
    r=observations()[0]
    rows=observations();rows[0]=EffortObservation(r.athlete,r.lift,r.protocol,r.session,r.velocity_mps,r.rir,False,True)
    assert fit(rows)['status']=='UNREVIEWED_OR_SUBMAXIMAL_INTENT'


def bench_attempt(criteria=None,commands=None):
    return Attempt('bench',criteria if criteria is not None else {k:True for k in CRITERIA['bench']},
        commands if commands is not None else (('Start',0),('Press',2),('Rack',4)),
        {'descent':1,'bottom':1.8,'ascent':2.1,'finish':3.5,'racked':4.5},True)

def test_judge_mode_missing_evidence_and_no_fixed_pause():
    assert review_attempt(bench_attempt())['status']=='NOT_JUDGED_TRAINING'
    assert review_attempt(bench_attempt(),'competition_practice')['status']=='CHECKLIST_PASS_NOT_OFFICIAL'
    partial={k:True for k in CRITERIA['bench']};partial.pop('feet_flat')
    assert review_attempt(bench_attempt(partial),'competition_practice')['status']=='INDETERMINATE'
    partial['feet_flat']=False
    assert review_attempt(bench_attempt(partial),'competition_practice')['status']=='REVIEW_VIOLATION'
    assert review_attempt(bench_attempt(commands=(('Start',0),('Press',3),('Rack',4))),'competition_practice')['status']=='REVIEW_VIOLATION'


def test_squat_and_deadlift_checklists():
    for lift,commands,events in [('squat',(('Squat',0),('Rack',3)),{'descent':1,'finish':2.5,'racked':4}),('deadlift',(('Down',3),),{'ascent':0,'finish':2.5,'descent':3.1})]:
        a=Attempt(lift,{k:True for k in CRITERIA[lift]},commands,events,True)
        assert review_attempt(a,'competition_practice')['status']=='CHECKLIST_PASS_NOT_OFFICIAL'


def test_cues_opt_in_freshness_and_no_duplicate():
    checks={'motionless':True,'setup_legal':True,'elbows_locked':True}
    disabled=PracticeCues('bench');assert disabled.update(Observation(0,'setup',True,1,checks),now=0) is None
    engine=PracticeCues('bench',enabled=True,mode='competition_practice')
    outputs=[engine.update(Observation(i/10,'setup',True,1,checks),now=i/10) for i in range(9)]
    assert [o['command'] for o in outputs if o]==['Start']
    assert engine.update(Observation(1,'bottom',True,1,{}),now=2) is None
    assert engine.blocked


def test_cues_cannot_finish_from_static_unracked_bar():
    e=PracticeCues('deadlift',enabled=True,mode='competition_practice')
    checks={'motionless':True,'upright':True,'knees_locked':True,'shoulders_position':True}
    assert all(e.update(Observation(i/10,'finish',True,1,checks),now=i/10) is None for i in range(20))


def test_known_timeline_violation_not_hidden_by_missing_body_evidence():
    partial={k:True for k in CRITERIA['bench']};partial.pop('feet_flat')
    result=review_attempt(bench_attempt(partial,commands=(('Start',0),('Press',3),('Rack',4))),'competition_practice')
    assert result['status']=='REVIEW_VIOLATION'
    assert 'feet_flat' in result['missing']


def test_cue_full_bench_sequence_and_evidence_loss():
    engine=PracticeCues('bench',enabled=True,mode='competition_practice');results=[];i=0
    stages=[('setup',{'motionless':True,'setup_legal':True,'elbows_locked':True}),
            ('descent',{}),('bottom',{'motionless':True,'chest_contact':True,'both_elbows_depth':True,'body_contact':True}),
            ('ascent',{}),('finish',{'motionless':True,'elbows_locked':True,'body_contact':True})]
    for stage,checks in stages:
        for _ in range(7):
            t=i/10;i+=1;result=engine.update(Observation(t,stage,True,1,checks),now=t)
            if result:results.append(result['command'])
    assert results==['Start','Press','Rack']
    broken=PracticeCues('squat',enabled=True,mode='competition_practice')
    assert broken.update(Observation(0,'setup',False,1,{}),now=0) is None
    assert broken.blocked


def test_calibration_rejects_incompatible_session_shift():
    rows=[EffortObservation('a','bench','paused|max-intent|80kg',str(s),.2+.1*r+.4*s,r,True,True) for s in range(3) for r in [0,1,3]]
    assert fit(rows)['model'] is None


def test_overflow_does_not_escape_as_a_measurement():
    assert mean_concentric_velocity(1e308,1,1e308,True).mean_mps is None

@pytest.mark.parametrize('lift,stage',[('bench','descent'),('bench','ascent'),('squat','descent')])
def test_motion_before_start_latches_cues_off(lift,stage):
    e=PracticeCues(lift,enabled=True,mode='competition_practice')
    assert e.update(Observation(0,stage,True,1,{}),now=0) is None
    assert e.blocked


def test_bench_ascent_before_press_cannot_generate_later_cues():
    e=PracticeCues('bench',enabled=True,mode='competition_practice');checks={'motionless':True,'setup_legal':True,'elbows_locked':True}
    for i in range(6):e.update(Observation(i/10,'setup',True,1,checks),now=i/10)
    assert e.update(Observation(.6,'ascent',True,1,{}),now=.6) is None
    assert e.blocked


def test_time_uncertainty_must_not_include_zero_duration():
    samples=[Sample(0,0,100),Sample(.1,0,90),Sample(.2,0,80)]
    assert velocity(samples,scale(),identity_reviewed=True,camera_stable=True)['status']=='INSUFFICIENT_TIME_RESOLUTION'
