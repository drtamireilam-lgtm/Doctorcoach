"""Human-evidence rule checklist, never an official or video-validated referee.

Rules: IPF technical book effective 2026-03-01 v3, sections 4.1--4.3.
No fixed bench pause duration is prescribed by that rulebook.
"""
from dataclasses import dataclass,field
from math import isfinite

RULE_VERSION='IPF-2026-03-01-v3'
RULE_URL='https://www.powerlifting.sport/fileadmin/ipf/data/rules/technical-rules/english/2026_IPF_Technical_Rulebook__effective_01_March_2026__v3.pdf'
CRITERIA={
 'squat':('start_upright_knees_locked','hip_below_knee','single_descent','no_downward_reversal','finish_upright_knees_locked','feet_legal','no_assistance','rack_controlled'),
 'bench':('start_elbows_locked','head_shoulders_butt_contact','feet_flat','legal_grip','chest_or_abdominal_contact','no_belt_contact','both_elbows_at_or_below_shoulders','bar_motionless_at_bottom','no_heave_or_body_thrust','no_bar_downward_reversal','finish_elbows_locked','no_assistance','rack_controlled'),
 'deadlift':('finish_knees_locked','finish_erect_deltoids_behind_bar','no_downward_reversal','no_thigh_support','feet_legal','both_hands_control_descent','no_assistance'),
}
COMMANDS={'squat':('Squat','Rack'),'bench':('Start','Press','Rack'),'deadlift':('Down',)}
EVENTS={'squat':('descent','finish','racked'),'bench':('descent','bottom','ascent','finish','racked'),'deadlift':('ascent','finish','descent')}

@dataclass(frozen=True)
class Attempt:
    lift: str
    criteria: dict[str,bool|None]
    commands: tuple[tuple[str,float],...] = ()
    events: dict[str,float] = field(default_factory=dict)
    evidence_reviewed: bool = False


def review_attempt(attempt:Attempt,mode='training'):
    out={'status':'NOT_JUDGED_TRAINING','validated':False,'rule_version':RULE_VERSION,'missing':[],'violations':[]}
    if attempt.lift not in CRITERIA or mode not in ('training','competition_practice'):
        return dict(out,status='INVALID_MODE_OR_LIFT')
    if mode=='training':return out
    if attempt.evidence_reviewed is not True:return dict(out,status='UNREVIEWED_EVIDENCE')
    if any(v is not None and type(v)is not bool for v in attempt.criteria.values()):return dict(out,status='INVALID_EVIDENCE')
    missing=[k for k in CRITERIA[attempt.lift] if attempt.criteria.get(k) is None]
    violations=[k for k in CRITERIA[attempt.lift] if attempt.criteria.get(k) is False]
    names=tuple(name for name,_ in attempt.commands)
    times=[t for _,t in attempt.commands]+list(attempt.events.values())
    if any(type(t)not in (int,float) or not isfinite(t) or t<0 for t in times):return dict(out,status='INVALID_TIMELINE')
    if not attempt.commands:missing.append('command_timeline')
    elif names!=COMMANDS[attempt.lift] or any(b[1]<=a[1] for a,b in zip(attempt.commands,attempt.commands[1:])):violations.append('command_sequence')
    for event in EVENTS[attempt.lift]:
        if event not in attempt.events:missing.append('event_'+event)
    if names==COMMANDS[attempt.lift] and all(event in attempt.events for event in EVENTS[attempt.lift]):
        c=dict(attempt.commands);e=attempt.events
        sequence=([c['Squat'],e['descent'],e['finish'],c['Rack'],e['racked']] if attempt.lift=='squat' else
                  [c['Start'],e['descent'],e['bottom'],c['Press'],e['ascent'],e['finish'],c['Rack'],e['racked']] if attempt.lift=='bench' else
                  [e['ascent'],e['finish'],c['Down'],e['descent']])
        if any(b<a for a,b in zip(sequence,sequence[1:])):violations.append('movement_before_command_or_invalid_order')
    status='REVIEW_VIOLATION' if violations else 'INDETERMINATE' if missing else 'CHECKLIST_PASS_NOT_OFFICIAL'
    return dict(out,status=status,missing=missing,violations=violations)
