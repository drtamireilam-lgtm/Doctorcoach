"""ROI-assisted candidate detector/tracker. Never asserts object identity."""
from dataclasses import dataclass
import math
import cv2
import numpy as np
from .motion import Sample

@dataclass(frozen=True)
class Box:
    x:int; y:int; w:int; h:int

    def validate(self,shape):
        height,width=shape[:2]
        if any(type(v) is not int for v in (self.x,self.y,self.w,self.h)) or self.w<8 or self.h<8 or self.x<0 or self.y<0 or self.x+self.w>width or self.y+self.h>height:
            raise ValueError('ROI must be inside the image and at least 8x8')


def plate_candidates(frame):
    """Geometric circle proposals only. Rack wheels may look identical to plates."""
    gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    circles=cv2.HoughCircles(cv2.GaussianBlur(gray,(5,5),1),cv2.HOUGH_GRADIENT,1.2,24,param1=100,param2=30,minRadius=8,maxRadius=max(9,min(gray.shape)//3))
    if circles is None:return []
    return [{'x':float(x),'y':float(y),'radius':float(r),'identity_verified':False} for x,y,r in circles[0][:20]]


class ReferenceFlow:
    """Fixed seed feature identities; no re-seeding or template adaptation.

    This is candidate overlay support, never metric evidence. Discarded identities
    cannot be recovered silently; lack of geometric/appearance evidence latches off.
    """
    def __init__(self,gray,box):
        mask=np.zeros_like(gray);mask[box.y:box.y+box.h,box.x:box.x+box.w]=255
        self.points=cv2.goodFeaturesToTrack(gray,80,.01,2,mask=mask)
        self.reference=None if self.points is None else self.points.copy()
        self.initial_count=0 if self.points is None else len(self.points)
        self.previous=gray.copy();self.box=box
        self.template=gray[box.y:box.y+box.h,box.x:box.x+box.w].copy()
        self.failed=self.initial_count<8

    def advance(self,gray):
        if self.failed:return None
        nxt,ok,_=cv2.calcOpticalFlowPyrLK(self.previous,gray,self.points,None)
        if nxt is None:self.failed=True;return None
        back,bok,_=cv2.calcOpticalFlowPyrLK(gray,self.previous,nxt,None)
        if back is None:self.failed=True;return None
        valid=(ok.ravel()==1)&(bok.ravel()==1)&(np.linalg.norm(back-self.points,axis=2).ravel()<.75)
        refs=self.reference[valid];points=nxt[valid]
        if len(points)<max(8,self.initial_count*.35):self.failed=True;return None
        matrix,inliers=cv2.estimateAffinePartial2D(refs[:,0],points[:,0],method=cv2.RANSAC,ransacReprojThreshold=1.5)
        if matrix is None or inliers is None or inliers.mean()<.7:self.failed=True;return None
        selected=inliers.ravel()==1
        if selected.sum()<8 or min(np.ptp(refs[selected,0],axis=0))<8:self.failed=True;return None
        scale=float(np.hypot(matrix[0,0],matrix[0,1]));angle=abs(math.degrees(math.atan2(matrix[1,0],matrix[0,0])))
        if not .8<=scale<=1.25 or angle>20:self.failed=True;return None
        b=self.box
        # Warp only the reference patch; reference pixels/identities never change.
        local=matrix.copy();local[:,2]+=matrix[:,:2]@np.array([b.x,b.y])
        patch=cv2.warpAffine(gray,local,(b.w,b.h),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
        score=float(cv2.matchTemplate(patch,self.template,cv2.TM_CCOEFF_NORMED)[0,0])
        centre=matrix@np.array([b.x+b.w/2,b.y+b.h/2,1.])
        x,y=round(float(centre[0])-b.w/2),round(float(centre[1])-b.h/2)
        if not math.isfinite(score) or score<.8 or x<0 or y<0 or x+b.w>gray.shape[1] or y+b.h>gray.shape[0]:
            self.failed=True;return None
        self.points=points[selected];self.reference=refs[selected];self.previous=gray.copy()
        return Box(x,y,b.w,b.h),score


class RoiTracker:
    def __init__(self, frame, box:Box, *, search_radius=35, min_score=.85, min_margin=.08):
        box.validate(frame.shape)
        if not 0<min_score<=1 or not 0<=min_margin<=1 or type(search_radius)is not int or search_radius<1:
            raise ValueError('Invalid tracker settings')
        self.box=box;self.radius=search_radius;self.min_score=min_score;self.min_margin=min_margin
        gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        self.template=gray[box.y:box.y+box.h,box.x:box.x+box.w].copy()
        if self.template.std()<8:raise ValueError('ROI has insufficient texture')
        self.shape=frame.shape;self.failed=False;self.reference_flow=ReferenceFlow(gray,box)
        self.previous=gray;self.flow_confirmed_frames=0;self.camera_motion=[];self.camera_offset=np.zeros(2);self.last_time=None

    def update(self,frame,t):
        if self.failed:return None,'TRACK_LOST'
        if not math.isfinite(t) or t<0 or (self.last_time is not None and not 0<t-self.last_time<=.15):
            self.failed=True;return None,'INVALID_TIMESTAMPS'
        if frame.shape!=self.shape:self.failed=True;return None,'FRAME_SIZE_CHANGED'
        gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY);b=self.box;r=self.radius
        x0,y0=max(0,b.x-r),max(0,b.y-r)
        x1,y1=min(gray.shape[1],b.x+b.w+r),min(gray.shape[0],b.y+b.h+r)
        response=cv2.matchTemplate(gray[y0:y1,x0:x1],self.template,cv2.TM_CCOEFF_NORMED)
        _,score,_,loc=cv2.minMaxLoc(response)
        reference_candidate=self.reference_flow.advance(gray)
        if not math.isfinite(score):self.failed=True;return None,'OCCLUDED_OR_CHANGED'
        alternatives=response.copy();lx,ly=loc;exclusion=max(3,min(b.w,b.h)//3)
        alternatives[max(0,ly-exclusion):ly+exclusion+1,max(0,lx-exclusion):lx+exclusion+1]=-1
        margin=score-float(alternatives.max())
        if margin<self.min_margin:self.failed=True;return None,'AMBIGUOUS_OBJECT'
        new=Box(x0+lx,y0+ly,b.w,b.h)
        if score<self.min_score:
            # Keep the ORIGINAL template: never adapt it into a rack/background patch.
            # A lower appearance match is a candidate only with independent short-term
            # bidirectional feature-flow consensus in the previous object ROI.
            mask=np.zeros_like(gray);mask[b.y:b.y+b.h,b.x:b.x+b.w]=255
            points=cv2.goodFeaturesToTrack(self.previous,60,.02,3,mask=mask)
            agreed=False
            if points is not None and len(points)>=8:
                nxt,ok,_=cv2.calcOpticalFlowPyrLK(self.previous,gray,points,None)
                if nxt is not None:
                    back,back_ok,_=cv2.calcOpticalFlowPyrLK(gray,self.previous,nxt,None)
                    if back is not None:
                        valid=(ok.ravel()==1)&(back_ok.ravel()==1)&(np.linalg.norm(back-points,axis=2).ravel()<.75)
                        if valid.sum()>=8 and valid.mean()>=.7:
                            shifts=(nxt-points)[valid,0];offset=np.median(shifts,axis=0)
                            consensus=np.linalg.norm(shifts-offset,axis=1)<1.5
                            spread=np.ptp(points[valid,0][consensus],axis=0) if consensus.sum()>=8 else np.zeros(2)
                            agreed=bool(consensus.mean()>=.8 and min(spread)>=8 and np.linalg.norm(offset-[new.x-b.x,new.y-b.y])<=2.5)
            if score<.65:agreed=False
            if not agreed:
                if reference_candidate is None:
                    self.failed=True;return None,('OCCLUDED_OR_CHANGED' if score<.65 else 'APPEARANCE_FLOW_DISAGREEMENT')
                candidate,warped_score=reference_candidate
                if np.hypot(candidate.x-b.x,candidate.y-b.y)>self.radius:
                    self.failed=True;return None,'REFERENCE_FLOW_JUMP'
                new=candidate
                score=min(score,warped_score) # Never inflate original appearance confidence.
            self.flow_confirmed_frames+=1
        # Estimate camera motion using background features outside both old/new ROIs.
        mask=np.full(gray.shape,255,np.uint8)
        for box in (b,new):
            cv2.rectangle(mask,(max(0,box.x-5),max(0,box.y-5)),(box.x+box.w+5,box.y+box.h+5),0,-1)
        features=cv2.goodFeaturesToTrack(self.previous,100,.02,8,mask=mask)
        movement=None
        if features is not None and len(features)>=8:
            nxt,ok,_=cv2.calcOpticalFlowPyrLK(self.previous,gray,features,None)
            if nxt is not None:
                back,back_ok,_=cv2.calcOpticalFlowPyrLK(gray,self.previous,nxt,None)
                if back is not None:
                    valid=(ok.ravel()==1)&(back_ok.ravel()==1)&(np.linalg.norm(back-features,axis=2).ravel()<1)
                    if valid.sum()>=8:
                        offset=np.median((nxt-features)[valid,0],axis=0)
                        self.camera_offset+=offset
                        movement=float(max(np.linalg.norm(offset),np.linalg.norm(self.camera_offset)))
        self.camera_motion.append(movement)
        if movement is not None and movement>2:
            self.failed=True;return None,'CAMERA_MOVEMENT'
        self.box=new;self.previous=gray;self.last_time=t
        return Sample(t,new.x+new.w/2,new.y+new.h/2,min(1,max(0,score))), 'CANDIDATE_ONLY'

    @property
    def camera_stable(self):
        return bool(self.camera_motion) and all(v is not None and v<=2 for v in self.camera_motion)


def track_video(filename,box,*,max_frames=1800,start_frame=0,start_time=0,end_time=None):
    if type(start_frame) is not int or not 0<=start_frame<1800:
        raise ValueError("Invalid start frame")
    if not math.isfinite(start_time) or not 0<=start_time<=60:raise ValueError("Invalid start time")
    if end_time is not None and (not math.isfinite(end_time) or not start_time<end_time<=60):raise ValueError("Invalid end time")
    cap=cv2.VideoCapture(str(filename))
    try:
        # Decode sequentially: do not trust codec keyframe seeking for correction anchors.
        for _ in range(start_frame):
            if not cap.read()[0]:raise ValueError("Start frame outside video")
        ok,frame=cap.read()
        while ok and float(cap.get(cv2.CAP_PROP_POS_MSEC))/1000 < start_time-0.0001:
            ok,frame=cap.read();start_frame+=1
            if start_frame>=1800:raise ValueError("Start frame outside limit")
        if not ok:raise ValueError('Cannot decode video')
        if frame.shape[0]*frame.shape[1]>3840*2160:raise ValueError('Video resolution exceeds research limit')
        if end_time is not None and float(cap.get(cv2.CAP_PROP_POS_MSEC))/1000>=end_time:raise ValueError('End must follow selected frame')
        tracker=RoiTracker(frame,box);samples=[];boxes=[];status='CANDIDATE_ONLY';index=start_frame;failure_time=None;failure_frame=None
        while ok:
            if index>=max_frames:status='FRAME_LIMIT';break
            t=float(cap.get(cv2.CAP_PROP_POS_MSEC))/1000
            if end_time is not None and t>end_time+.0001:break
            sample,status=tracker.update(frame,t)
            if sample is None:
                failure_time=t;failure_frame=index;break
            samples.append(sample);boxes.append(tracker.box)
            ok,frame=cap.read();index+=1
        return {'samples':samples,'boxes':boxes,'status':status,'camera_stable':tracker.camera_stable,'identity_verified':False,'start_frame':start_frame,'failure_frame':failure_frame,'failure_time':failure_time,'flow_confirmed_frames':tracker.flow_confirmed_frames,'end_time':end_time}
    finally:cap.release()
