import questionnaire from './prepared/intake-questions.json' with {type:'json'};
import {consents,safetyFlags,type Answers,type ConsentState} from './intake.ts';
export type IntakeIssue={id:string;label:string;step:string};
const steps:Record<string,string[]>={safety:['name','phone','current_injury','red_flags'],injury:['body_region','onset','duration','pain_score'],background:['age','medical_history'],training:['training_frequency','training_style','specific_goals']};
export function onboardingIssues(step:string,answers:Answers,choices:ConsentState):IntakeIssue[]{
 const issues:IntakeIssue[]=[];
 if(!['welcome','finish'].includes(step))for(const c of consents)if(c.required&&!choices[c.id])issues.push({id:'consent_'+c.id,label:c.title,step:'consent'});
 for(const section of step==='training'?['safety',...(answers.current_injury==='yes'?['injury']:[]),'background','training']:[step])for(const id of steps[section]??[]){
  const value=answers[id],q=questionnaire.questions.find(q=>q.id===id);let invalid=false;
  if(id==='name')invalid=typeof value!=='string'||value.trim().length<2;
  else if(id==='phone')invalid=!!value&&!/^[+\d()\s-]{7,30}$/.test(String(value));
  else if(id==='red_flags')invalid=!Array.isArray(value)||!value.length||value.some(v=>!safetyFlags.some(f=>f.id===v))||value.includes('none')&&value.length>1;
  else if(q?.type==='number'||q?.type==='scale')invalid=typeof value!=='number'||!Number.isInteger(value)||value<(q.min??0)||value>(q.max??100);
  else if(q?.type.startsWith('multi_select')){const options=(q.options??[]).map(o=>typeof o==='string'?o:o.value);invalid=!Array.isArray(value)||!value.length||value.some(v=>!options.includes(v));}
  else if(q?.type==='single_select'){const options=(q.options??[]).map(o=>typeof o==='string'?o:o.value);invalid=typeof value!=='string'||!options.includes(value);}
  else invalid=typeof value!=='string'||!value.trim();
  if(invalid)issues.push({id,label:id==='name'?'שם מלא':id==='phone'?'טלפון לתיאום':id==='red_flags'?'סקר סימני אזהרה':q?.question??id,step:section});
 }
 return issues;
}
