"""Loopback-only isolated lab. No application auth, databases or cloud resources."""
import argparse,hashlib,json,secrets,sys,tempfile,threading
from dataclasses import asdict
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src'))
from vbt.vision import Box,track_video
from vbt.motion import Calibration
from vbt.pipeline import analyze
from vbt.judge import Attempt,CRITERIA,COMMANDS,EVENTS,RULE_VERSION,review_attempt
from vbt.effort import EffortObservation,calibrate,estimate_effort

MAX_BYTES=30*1024*1024

class LabServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address):
        super().__init__(address,Handler);self.token=secrets.token_urlsafe(32);self.jobs={};self.lock=threading.Lock()
    @property
    def origin(self):return 'http://127.0.0.1:'+str(self.server_port)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # No source names or private payloads in logs.
    def reply(self,status,body,mime='application/json'):
        data=body if isinstance(body,bytes) else json.dumps(body,allow_nan=False).encode()
        self.send_response(status)
        for k,v in {'Content-Type':mime,'Content-Length':str(len(data)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}.items():self.send_header(k,v)
        self.end_headers();self.wfile.write(data)
    def allowed(self):
        return self.headers.get('Host')=='127.0.0.1:'+str(self.server.server_port)
    def do_GET(self):
        if not self.allowed():return self.reply(403,{'error':'Invalid host'})
        route=urlsplit(self.path).path
        files={'/':'index.html','/lab.js':'lab.js','/lab.css':'lab.css'}
        if route=='/rules':return self.reply(200,{'criteria':CRITERIA,'commands':COMMANDS,'events':EVENTS,'version':RULE_VERSION})
        if route=='/session':return self.reply(200,{'token':self.server.token})
        if route not in files:return self.reply(404,{'error':'Not found'})
        name=files[route];mime='text/html; charset=utf-8' if name.endswith('html') else 'text/javascript; charset=utf-8' if name.endswith('js') else 'text/css; charset=utf-8'
        return self.reply(200,(Path(__file__).parent/name).read_bytes(),mime)
    def do_POST(self):
        if not self.allowed() or self.headers.get('Origin')!=self.server.origin or not secrets.compare_digest(self.headers.get('X-Lab-Token',''),self.server.token):
            return self.reply(403,{'error':'Local lab session required'})
        if not self.server.lock.acquire(blocking=False):return self.reply(409,{'error':'Another job is running'})
        try:
            try:size=int(self.headers.get('Content-Length','0'))
            except ValueError:return self.reply(400,{'error':'Invalid length'})
            if not 0<size<=MAX_BYTES:return self.reply(413,{'error':'Input limit is 30 MiB'})
            self.connection.settimeout(60)
            body=self.rfile.read(size)
            if len(body)!=size:return self.reply(400,{'error':'Incomplete input'})
            route=urlsplit(self.path).path
            if route=='/api/track':
                if self.headers.get('X-Consent')!='confirmed':return self.reply(400,{'error':'Confirm rights to use this test video'})
                box=json.loads(self.headers.get('X-ROI','null'))
                start_frame=int(self.headers.get('X-Start-Frame','0'))
                start_time=float(self.headers.get('X-Start-Time','0'))
                if not isinstance(box,list) or len(box)!=4 or any(type(x)is not int for x in box):return self.reply(400,{'error':'Choose an ROI'})
                with tempfile.TemporaryDirectory(prefix='dc-vbt-private-') as tmp:
                    file=Path(tmp)/'input.video';file.write_bytes(body);track=track_video(file,Box(*box),start_frame=start_frame,start_time=start_time)
                track['source_sha256']=hashlib.sha256(body).hexdigest();track['roi']=box
                job=secrets.token_urlsafe(16)
                # A new track invalidates the former overlay attestation/calibration.
                self.server.jobs.clear();self.server.jobs[job]=track
                return self.reply(200,{'job':job,'samples':[asdict(s) for s in track['samples']],
                    'boxes':[asdict(b) for b in track['boxes']],'status':track['status'],
                    'camera_stable':track['camera_stable'],'identity_verified':False,'source_sha256':track['source_sha256'],'roi':box,'flow_confirmed_frames':track['flow_confirmed_frames'],'start_frame':track['start_frame'],'failure_frame':track['failure_frame'],'failure_time':track['failure_time']})
            if route=='/api/judge':
                if size>32768:return self.reply(413,{'error':'Checklist too large'})
                o=json.loads(body)
                if not isinstance(o.get('commands'),list) or len(o['commands'])>10 or not isinstance(o.get('criteria'),dict) or not isinstance(o.get('events'),dict):
                    return self.reply(400,{'error':'Invalid checklist'})
                a=Attempt(o['lift'],o['criteria'],tuple(tuple(x) for x in o['commands']),o['events'],o.get('reviewed') is True)
                return self.reply(200,review_attempt(a,o.get('mode','training')))
            if route=='/api/effort':
                if size>32768:return self.reply(413,{'error':'Calibration too large'})
                o=json.loads(body);rows=o['observations']
                if not isinstance(rows,list) or len(rows)>200:return self.reply(400,{'error':'Use at most 200 calibration observations'})
                key={k:o[k] for k in ('athlete','lift','protocol')}
                c=calibrate([EffortObservation(**r) for r in rows],**key)
                estimate=None
                if o.get('velocity_mps') is not None:
                    estimate=estimate_effort(c,float(o['velocity_mps']),**key,reviewed_measurement=o.get('reviewed') is True,maximal_intent=o.get('maximal_intent') is True)
                return self.reply(200,{'calibration':c,'estimate':estimate})
            if route=='/api/analyze':
                if size>32768:return self.reply(413,{'error':'Report options too large'})
                options=json.loads(body);track=self.server.jobs.get(options.get('job'))
                if track is None:return self.reply(409,{'error':'Track expired; prepare it again'})
                raw=options.get('calibration');cal=None
                if raw is not None:
                    cal=Calibration.from_reference(float(raw['metres']),float(raw['pixels']),float(raw.get('error',2)),
                        same_plane=raw.get('same_plane') is True,fixed_camera=raw.get('fixed_camera') is True,reference='manual lab reference')
                out=analyze(track['samples'],track_status=('FLOW_ASSISTED_REVIEW_ONLY' if track.get('flow_confirmed_frames',0) else track['status']),camera_stable=track['camera_stable'],identity_reviewed=options.get('reviewed') is True,calibration=cal)
                out['provenance']={'source_sha256':track['source_sha256'],'roi':track['roi'],'algorithm':'roi-template-flow-v2','start_frame':track['start_frame'],'manual_restart':track['start_frame']>0}
                return self.reply(200,out)
            return self.reply(404,{'error':'Not found'})
        except (ValueError,KeyError,TypeError,OverflowError):return self.reply(400,{'error':'Invalid input or unreadable/unsupported source; no measurement accepted'})
        except Exception:return self.reply(422,{'error':'Analysis failed; no measurement accepted'})
        finally:self.server.lock.release()

def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);args=p.parse_args()
    server=LabServer(('127.0.0.1',args.port))
    print('Isolated research lab:',server.origin,flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.jobs.clear();server.server_close()

if __name__=='__main__':main()
