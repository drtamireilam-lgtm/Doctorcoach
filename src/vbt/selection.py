"""Bounded, offline ROI proposals. Geometry/motion are NOT bar identity evidence."""
import math,time
import cv2
import numpy as np
from .vision import Box,track_video


def propose_boxes(frame,seed,limit=12):
    seed.validate(frame.shape)
    if type(limit) is not int or not 1<=limit<=12:raise ValueError('Invalid proposal limit')
    gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY);height,width=gray.shape
    cx,cy=seed.x+seed.w/2,seed.y+seed.h/2
    radius=min(120,max(60,seed.w*3));x0,y0=max(0,int(cx-radius)),max(0,int(cy-radius))
    crop=gray[y0:min(height,int(cy+radius)),x0:min(width,int(cx+radius))]
    centres=[(cx,cy,'clicked')]
    ellipses=[]
    contours,_=cv2.findContours(cv2.Canny(crop,70,140),cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE)
    for contour in contours:
        if len(contour)<30:continue
        (x,y),(w,h),angle=cv2.fitEllipse(contour)
        if min(w,h)<30 or max(w,h)>220 or min(w,h)/max(w,h)<.45:continue
        theta=math.radians(angle);p=contour[:,0]-[x,y]
        u=p[:,0]*math.cos(theta)+p[:,1]*math.sin(theta)
        v=-p[:,0]*math.sin(theta)+p[:,1]*math.cos(theta)
        error=np.abs(np.sqrt((u/(w/2))**2+(v/(h/2))**2)-1)*min(w,h)/2
        if np.quantile(error,.9)>3.5:continue
        x+=x0;y+=y0
        if math.hypot(x-cx,y-cy)<=radius:ellipses.append((float(np.median(error)),x,y))
    for _,x,y in sorted(ellipses)[:2]:centres.append((x,y,'ellipse proposal'))
    circles=cv2.HoughCircles(cv2.GaussianBlur(crop,(5,5),1),cv2.HOUGH_GRADIENT,1.2,20,param1=100,param2=25,minRadius=15,maxRadius=110)
    if circles is not None:
        for x,y,_ in circles[0][:3]:
            if math.hypot(x+x0-cx,y+y0-cy)<=radius:centres.append((float(x+x0),float(y+y0),'circle proposal'))
    boxes=[];seen=set()
    for x,y,reason in centres:
        for size in sorted(set([max(16,round(min(seed.w,seed.h)*.6)),min(80,max(seed.w,seed.h))])):
            if size>min(width,height):continue
            box=Box(max(0,min(width-size,round(x-size/2))),max(0,min(height-size,round(y-size/2))),size,size)
            key=(box.x,box.y,box.w,box.h)
            if key in seen:continue
            seen.add(key)
            if gray[box.y:box.y+box.h,box.x:box.x+box.w].std()<8:continue
            boxes.append((box,reason))
            if len(boxes)>=limit:return boxes
    return boxes


def _preview(filename,start_frame,start_time,end_time):
    if type(start_frame) is not int or not 0<=start_frame<1800:raise ValueError('Invalid start frame')
    if not math.isfinite(start_time) or not 0<=start_time<=60:raise ValueError('Invalid start time')
    if end_time is not None and (not math.isfinite(end_time) or not start_time<end_time<=60):raise ValueError('Invalid end')
    cap=cv2.VideoCapture(str(filename));timestamps=[];actual_start=None;shape=None
    try:
        index=0;last_decoded=None
        while index<1800:
            ok,frame=cap.read()
            if not ok:break
            t=float(cap.get(cv2.CAP_PROP_POS_MSEC))/1000
            if not math.isfinite(t) or t<0 or (last_decoded is not None and t<=last_decoded):raise ValueError('Invalid source timestamps')
            last_decoded=t
            if index<start_frame or t<start_time-.0001:index+=1;continue
            if actual_start is None:
                actual_start=index
                if end_time is not None and t>=end_time:raise ValueError('End before start')
                shape=frame.shape
                if shape[0]*shape[1]>3840*2160:raise ValueError('Resolution limit')
                if max(shape[:2])>1280:raise ValueError('Assisted selection limit is 1280px per side')
            if frame.shape!=shape:raise ValueError('Frame size changed')
            if timestamps:
                preview_end=min(end_time if end_time is not None else timestamps[0]+10,timestamps[0]+10)
                if t>preview_end+.0001:break
            if not timestamps or t-timestamps[-1]>=.09:
                if len(timestamps)>=100:break
                timestamps.append(t)
                if len(timestamps)==1:original=frame.copy()
            index+=1
        if len(timestamps)<3:raise ValueError('Insufficient preview frames')
        if any(not 0<b-a<=.15 for a,b in zip(timestamps,timestamps[1:])):raise ValueError('Unsupported preview timestamps')
        return original,timestamps,actual_start
    finally:cap.release()


def suggest_regions(filename,seed,*,start_frame=0,start_time=0,end_time=None):
    deadline=time.monotonic()+25
    original,times,actual_start=_preview(filename,start_frame,start_time,end_time)
    seed.validate(original.shape)
    if max(original.shape[:2])>1280:raise ValueError('Assisted selection limit is 1280px per side; manual tracking remains available')
    results=[];proposals=propose_boxes(original,seed);tested=0
    for box,reason in proposals:
        if time.monotonic()>deadline:break
        tested+=1
        # Use the actual full-rate tracker for ranking. Sparse preview tracking can
        # survive a different path than the full-rate run; never recommend on that basis.
        track=track_video(filename,box,start_frame=actual_start,end_time=times[-1],max_frames=min(1800,actual_start+602))
        samples=track['samples'];status=track['status']
        if len(samples)<3 or not track['camera_stable'] or status!='CANDIDATE_ONLY':continue
        coverage=(samples[-1].t-samples[0].t)/(times[-1]-times[0])
        movement=float(np.linalg.norm(np.ptp(np.asarray([[s.x,s.y] for s in samples]),axis=0)))
        # A static rack is easy to track: survival alone is never a recommendation.
        if coverage<.98 or movement<8:continue
        mean=float(np.mean([s.score for s in samples]));distance=math.hypot(box.x+box.w/2-(seed.x+seed.w/2),box.y+box.h/2-(seed.y+seed.h/2))
        rank=.75*coverage+.2*mean+.05*max(0,1-distance/120)
        results.append({'roi':[box.x,box.y,box.w,box.h],'proposal':reason,'preview_coverage':coverage,'relative_motion_px':movement,'ranking_score':rank,'preview_status':status,'identity_verified':False,'full_rate_checked':True})
    selected=[]
    for candidate in sorted(results,key=lambda c:c['ranking_score'],reverse=True):
        x,y,w,h=candidate['roi']
        if any(math.hypot(x+w/2-(v['roi'][0]+v['roi'][2]/2),y+h/2-(v['roi'][1]+v['roi'][3]/2))<12 for v in selected):continue
        selected.append(candidate)
        if len(selected)==3:break
    return {'status':'CANDIDATES_FOR_REVIEW' if selected else 'NO_MOVING_CANDIDATE','candidates':selected,'validated':False,'identity_verified':False,'preview_start_s':times[0],'preview_end_s':times[-1],'start_frame':actual_start,'preview_frames':len(times),'proposals_tested':tested,'search_truncated':tested<len(proposals),'warning':'Motion/geometry proposals only. Review the selected ROI, then run full-rate tracking; candidate survival is not bar identity or velocity accuracy.'}
