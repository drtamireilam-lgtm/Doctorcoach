"""Offline CLI. Outputs to stdout only if explicitly requested by the operator."""
import argparse,hashlib,json
from dataclasses import asdict
from pathlib import Path
from .vision import Box,track_video
from .motion import Calibration
from .pipeline import analyze

def main():
    p=argparse.ArgumentParser(description='Experimental offline DoctorCoach VBT. No production access.')
    p.add_argument('video',type=Path);p.add_argument('--roi',type=int,nargs=4,required=True,metavar=('X','Y','WIDTH','HEIGHT'))
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--reviewed-overlay',action='store_true',help='Operator attests this whole exact track was reviewed on video')
    p.add_argument('--reference-metres',type=float);p.add_argument('--reference-pixels',type=float)
    p.add_argument('--reference-pixel-error',type=float,default=2)
    p.add_argument('--same-plane-fixed-camera',action='store_true')
    args=p.parse_args()
    if args.video.stat().st_size>30*1024*1024:p.error('Video must be at most 30 MiB')
    if args.output.exists():p.error('Output already exists; choose a new file')
    track=track_video(args.video,Box(*args.roi));cal=None
    if args.reference_metres is not None and args.reference_pixels is not None:
        cal=Calibration.from_reference(args.reference_metres,args.reference_pixels,args.reference_pixel_error,
            same_plane=args.same_plane_fixed_camera,fixed_camera=args.same_plane_fixed_camera,reference='operator reference')
    out=analyze(track['samples'],track_status=('FLOW_ASSISTED_REVIEW_ONLY' if track.get('flow_confirmed_frames',0) else track['status']),camera_stable=track['camera_stable'],identity_reviewed=args.reviewed_overlay,calibration=cal)
    out['samples']=[asdict(s) for s in track['samples']]
    with args.video.open('rb') as source_file:source_hash=hashlib.file_digest(source_file,'sha256').hexdigest()
    out['provenance']={'source_sha256':source_hash,'roi':args.roi,'algorithm':'roi-template-flow-v2'}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open('x',encoding='utf8') as f:json.dump(out,f,allow_nan=False,indent=2)
    print('Research report written. Not a validated measurement or judge.')

if __name__=='__main__':main()
