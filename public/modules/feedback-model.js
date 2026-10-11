import {text,key,column,count} from './schema.js';
export const ratingLabels=['Poor','Fair','Satisfactory','Good','Excellent'];
export function score(v,max=5){const k=key(v),i=ratingLabels.findIndex(l=>key(l)===k);if(i>=0)return i+1;const n=count(v);return n!==null&&Number.isInteger(n)&&n>=1&&n<=max?n:null;}
const metadata=/^(id|response id|start time|completion time|timestamp|email|email address|name(?:\d|\b)|full name|phone|language|select your country|country|area\b|respondent type|role$|programme location|program location|outreach location)/;
export function analyse(headers,rows,options={}) {
 const overall=column(headers,'Overall'),rec=column(headers,'Recommendation');
 const questions=[];
 headers.forEach((label,i)=>{
  if(metadata.test(key(label))||i===rec)return;
  const values=rows.map(r=>r.values[i]).filter(v=>text(v));
  if(!values.length)return;
  const mapped=values.map(v=>score(v));
  const verbal=values.some(v=>ratingLabels.some(l=>key(l)===key(v)));
  const numericHeading=/rate|rating|score|out of 5|1 5/.test(key(label));
  const valid=mapped.filter(v=>v!==null);
  if(valid.length && (verbal||numericHeading)&&valid.length/values.length>=0.7){
   const dist=ratingLabels.map((_,j)=>valid.filter(v=>v===j+1).length);
   questions.push({index:i,label:text(label),n:valid.length,missing:rows.length-values.length,unrecognised:values.length-valid.length,mean:valid.reduce((a,b)=>a+b,0)/valid.length,positive:valid.filter(v=>v>=4).length/valid.length*100,dist});
  }
 });
 const overallMetric=questions.find(q=>q.index===overall)||null;
 const recommendations={Keep:0,Tune:0,Redesign:0,Other:0};let recommendationN=0;
 if(rec>=0)rows.forEach(r=>{const s=key(r.values[rec]);if(!s)return;recommendationN++;if(s.startsWith('keep'))recommendations.Keep++;else if(s.startsWith('change some'))recommendations.Tune++;else if(s.startsWith('reconsider'))recommendations.Redesign++;else recommendations.Other++;});
 const byArea=new Map();rows.forEach(r=>{const a=r.area||'Unassigned';byArea.set(a,(byArea.get(a)||0)+1);});
 const textQuestions=headers.map((label,index)=>({label,index})).filter(q=>!metadata.test(key(q.label))&&!questions.some(x=>x.index===q.index)&&q.index!==rec&&rows.some(r=>text(r.values[q.index]).length>35));
 const themes=[['Timing / rest',/timing|schedule|rest\b|tired|packed|time management/i],['Accommodation / arrival',/accommodation|room|arrival|accreditation|registration/i],['Food / refreshment',/food|feeding|refreshment|meal/i],['Interaction / recreation',/games?|sport|interactive|interaction|recreation|networking/i],['Sound / connectivity',/sound|audio|network|internet|microphone|connectivity/i],['Prayer / Bible study',/prayer|bible|spiritual/i]];
 const themeCounts=themes.map(([label,regex])=>({label,count:rows.filter(r=>textQuestions.some(q=>regex.test(text(r.values[q.index])))).length})).filter(t=>t.count>0);
 const blessingIndices=headers.map((h,i)=>({h:key(h),i})).filter(x=>/^(salvation|sanctification|baptism of the holy ghost|healing|re anointing|others|other blessings)$/.test(x.h));
 const blessings=blessingIndices.map(x=>({label:headers[x.i],count:rows.filter(r=>['yes','true','1'].includes(key(r.values[x.i]))).length}));
 const multi=headers.findIndex(h=>key(h)==='record of blessings');if(multi>=0){const tally=new Map();rows.forEach(r=>{new Set(text(r.values[multi]).split(/[;,]/).map(text).filter(Boolean)).forEach(v=>tally.set(v,(tally.get(v)||0)+1));});for(const [label,n] of tally)blessings.push({label,count:n});}
 const heatmap=[...byArea.keys()].sort().map(area=>({area,cells:questions.map(q=>{const s=rows.filter(r=>(r.area||'Unassigned')===area).map(r=>score(r.values[q.index])).filter(v=>v!==null);return s.length?{mean:s.reduce((a,b)=>a+b,0)/s.length,n:s.length}:null;})}));
 return {n:rows.length,questions,overall:overallMetric,recommendations,recommendationN,areas:[...byArea].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count),textQuestions,themeCounts,blessings,heatmap};
}
