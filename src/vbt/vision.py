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


class RoiTracker:
    def __init__(self, frame, box:Box, *, search_radius=35, min_score=.85, min_margin=.08):
        box.validate(frame.shape)
        if not 0<min_score<=1 or not 0<=min_margin<=1 or type(search_radius)is not int or search_radius<1:
            raise ValueError('Invalid tracker settings')
        self.box=box;self.radius=search_radius;self.min_score=min_score;self.min_margin=min_margin
        gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
        self.template=gray[box.y:box.y+box.h,box.x:box.x+box.w].copy()
        if self.template.std()<8:raise ValueError('ROI has insufficient texture')
        self.shape=frame.shape;self.failed=False
        self.previous=gray;self.camera_motion=[];self.camera_offset=np.zeros(2);self.last_time=None

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
        if not math.isfinite(score) or score<self.min_score:self.failed=True;return None,'OCCLUDED_OR_CHANGED'
        alternatives=response.copy();lx,ly=loc;exclusion=max(3,min(b.w,b.h)//3)
        alternatives[max(0,ly-exclusion):ly+exclusion+1,max(0,lx-exclusion):lx+exclusion+1]=-1
        margin=score-float(alternatives.max())
        if margin<self.min_margin:self.failed=True;return None,'AMBIGUOUS_OBJECT'
        new=Box(x0+lx,y0+ly,b.w,b.h)
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


def track_video(filename,box,*,max_frames=1800):
    cap=cv2.VideoCapture(str(filename))
    try:
        ok,frame=cap.read()
        if not ok:raise ValueError('Cannot decode video')
        if frame.shape[0]*frame.shape[1]>3840*2160:raise ValueError('Video resolution exceeds research limit')
        tracker=RoiTracker(frame,box);samples=[];boxes=[];status='CANDIDATE_ONLY';index=0
        while ok:
            if index>=max_frames:status='FRAME_LIMIT';break
            t=float(cap.get(cv2.CAP_PROP_POS_MSEC))/1000
            sample,status=tracker.update(frame,t)
            if sample is None:break
            samples.append(sample);boxes.append(tracker.box)
            ok,frame=cap.read();index+=1
        return {'samples':samples,'boxes':boxes,'status':status,'camera_stable':tracker.camera_stable,'identity_verified':False}
    finally:cap.release()
