"""Common offline analysis contract for the CLI and isolated local lab."""
from dataclasses import asdict
from .motion import Calibration,Sample,segment_concentrics,velocity,validate_samples

SCHEMA_VERSION='dc-vbt-research-1'

def analyze(samples,*,track_status,camera_stable,identity_reviewed=False,calibration=None):
    reps=segment_concentrics(samples)
    permitted=track_status=='CANDIDATE_ONLY'
    return {
        'schema_version':SCHEMA_VERSION,'validated':False,
        'track_status':track_status,'camera_stable':camera_stable,
        'motion_status':validate_samples(samples) or 'CANDIDATE_MOTION',
        'calibration':asdict(calibration) if calibration is not None else None,
        'identity_reviewed':identity_reviewed is True,
        'measurement_basis':'manual_roi_template_tracking|source_timestamps|vertical_displacement',
        'repetitions':[dict(rep,measurement=velocity(samples[rep['start']:rep['end']+1],calibration,
            identity_reviewed=identity_reviewed is True and permitted,camera_stable=camera_stable is True)) for rep in reps],
        'warnings':['Candidate segmentation is not an independently validated rep count.',
                    'Velocity bounds exclude unmodelled perspective and annotation error.',
                    'Bar motion cannot establish joint depth, body contact or official IPF outcomes.'],
        'effort':{'status':'REQUIRES_PERSONAL_CALIBRATION','rpe':None,'rir':None},
    }
