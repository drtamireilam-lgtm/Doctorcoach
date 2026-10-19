'use client';
import type {ReactNode} from 'react';
import type {PlanItem} from '../lib/training';
import {workoutGroups} from '../lib/workout-sections';
import {Localize,useLanguage} from './language-provider';
export function WorkoutSections<T extends PlanItem>({items,children}:{items:T[];children:(item:T,index:number)=>ReactNode}){
 const english=useLanguage().language==='en';
 return <>{workoutGroups(items).map(group=><section className="workout-section-group" key={group.value} data-workout-section={group.value}>
  <h3>{english?({warmup:'Warm-up',main:'Main exercises',stretch:'Stretching'}[group.value]):group.label}</h3>
  <Localize>{group.items.map(item=>children(item,items.indexOf(item)))}</Localize>
 </section>)}</>;
}
