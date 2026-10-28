'use client';
import type {ReactNode} from 'react';
import type {PlanItem} from '../lib/training';
import {workoutSection} from '../lib/workout-sections';
import {Localize,useLanguage} from './language-provider';
export function WorkoutSections<T extends PlanItem>({items,children}:{items:T[];children:(item:T,index:number)=>ReactNode}){
 const english=useLanguage().language==='en';
 const groups=[{value:'preparation',label:english?'Warm-up & Mobility':'חימום ומוביליטי',items:items.filter(item=>workoutSection(item)!=='main')},{value:'main',label:english?'Main workout':'האימון המרכזי',items:items.filter(item=>workoutSection(item)==='main')}].filter(group=>group.items.length>0);
 return <>{groups.map(group=><section className="workout-section-group" key={group.value} data-workout-section={group.value}>
  <h3>{group.label}</h3>
  <Localize>{group.items.map(item=>children(item,items.indexOf(item)))}</Localize>
 </section>)}</>;
}
