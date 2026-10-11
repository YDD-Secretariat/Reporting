// Shared by the server and local workbook reader. No fuzzy matching of access boundaries.
export const text = v => String(v ?? '').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').trim().replace(/\s+/g,' ');
export const key = v => text(v).toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const areaKey = v => key(v).replace(/^area\s+|\s+area$/g,'').trim();
export const count = v => {
  if (typeof v==='number') return Number.isFinite(v)&&v>=0?v:null;
  const s=text(v).toLowerCase().replace(/,/g,'');
  if (['nil','none','zero','no','nill'].includes(s))return 0;
  return /^\d+(\.\d+)?$/.test(s)?Number(s):null;
};
const aliases={
 Area:['area','select your area','which area','your area','church area','area name','area e g kwara area','area e g anthony'],
 'Branch location':['branch location','branch','church branch','branch name','name of branch','location','programme location address','program location','outreach location'],
 Category:['category','category of church location','church category','location category'],
 Name:['name firstname lastname','full name','name optional','name2','name','correspondent','submitted by'],
 Phone:['phone number','phone','telephone','mobile number'],
 'Date held':['date held','programme date','program date','date of programme'],
 'Teenage male':['teenage male','male','males','male attendance','total male'],
 'Teenage female':['teenage female','female','females','female attendance','total female'],
 Parents:['parents','parents attendance'],Total:['total','total attendance','attendance','total number of participants','number of attendees','total participants'],
 Salvation:['salvation'],Sanctification:['sanctification','satification'],
 'Holy ghost':['baptism of the holy ghost','holy ghost','baptism of holy ghost'],
 Healing:['healing'],'Re-anointing':['re anointing','reanointing'],'Other blessings':['other blessings','others'],
 Activity:['programmes if applicable','programmes','programme','program','activity','session name','event name'],
 'Respondent type':['respondent type','respondent category','participant type','role','are you a leader or participant'],
 Timestamp:['completion time','timestamp','submission time','submitted at','end time'],
 Overall:['overall how would you rate the programme','overall how would you rate the program','overall rating','overall satisfaction'],
 Recommendation:['final recommendation','recommendation'],
};
export function column(headers, field, override) {
 const h=headers.map(key);
 if(override){const hit=h.map((x,i)=>x===key(override)?i:-1).filter(i=>i>=0);return hit.length===1?hit[0]:-1;}
 for(const a of aliases[field]||[key(field)]){const hit=h.map((x,i)=>x===a?i:-1).filter(i=>i>=0);if(hit.length===1)return hit[0];if(hit.length>1)return -1;}
 if(field==='Area'){const hit=h.map((x,i)=>/^area (e g|eg|select|please)|^(select|choose|what is|which is) (your |the )?(church )?area\b/.test(x)?i:-1).filter(i=>i>=0);return hit.length===1?hit[0]:-1;}
 return -1;
}
export function table(input) {
 const rows=(input||[]).filter(r=>Array.isArray(r)&&r.some(v=>text(v)));
 if(!rows.length)return {headers:[],rows:[],headerRow:0};
 // Locate an area-bearing header in the first ten rows, accommodating title rows.
 let i=0; while(i<rows.length-1 && i<9 && rows[i].filter(v=>text(v)).length<=1 && column(rows[i],'Area')<0)i++;
 const headers=rows[i].map(text);
 return {headers,rows:rows.slice(i+1).filter(r=>r.some(v=>text(v))),headerRow:i+1};
}
export function directory(areaRows) {
 const t=table(areaRows),ci=column(t.headers,'Area'), ai=t.headers.map(key).indexOf('aliases');
 const index=new Map(), collisions=new Set();
 const add=(v,name)=>{const k=areaKey(v);if(!k)return;if(index.has(k)&&index.get(k)!==name)collisions.add(k);else index.set(k,name);};
 t.rows.forEach(r=>{const name=text(r[ci]);if(!name)return;add(name,name);if(ai>=0)text(r[ai]).split('|').forEach(a=>add(a,name));});
 return {resolve(v){const k=areaKey(v);return !collisions.has(k)?index.get(k)||null:null;},collisions:[...collisions],names:[...new Set(index.values())]};
}
export function mappingValue(value) {
 if(!text(value))return {};
 let m;try{m=JSON.parse(value);}catch{return {__warning:'Column Map contains notes or invalid JSON. Automatic matching is being used; move notes to a Notes column.'};}
 if(!m||Array.isArray(m)||typeof m!=='object'||Object.values(m).some(v=>typeof v!=='string'))return {__warning:'Column Map must map standard field names to source headings. Automatic matching is being used.'};
 return m;
}
export function scopedTable(input,areaRows,user,mapping='') {
 const t=table(input),dir=directory(areaRows),map=mappingValue(mapping), idx=column(t.headers,'Area',map.Area);
 const target=dir.resolve(user.area),warnings=[];
 if(map.__warning)warnings.push(map.__warning);
 if(t.headerRow>1)warnings.push(`Column headings detected on row ${t.headerRow}.`);
 if(idx<0)warnings.push('Area column is missing or ambiguous. Only administrators can review these unassigned rows.');
 if(user.role!=='admin'&&!target)warnings.push('Your assigned area could not be matched uniquely to the Areas roster. Ask your administrator.');
 const unmatched=new Map();let withheld=0;
 const result=[];
 for(const row of t.rows){const raw=idx>=0?text(row[idx]):'',canonical=dir.resolve(raw);if(!canonical){withheld++;unmatched.set(raw||'(blank)',(unmatched.get(raw||'(blank)')||0)+1);}
  if(user.role==='admin'||(target&&canonical===target))result.push({values:row,area:canonical||null,rawArea:raw});
 }
 if(user.role==='admin'&&withheld)warnings.push(`${withheld} rows need area review and are withheld from area accounts.`);
 if(user.role==='admin'&&dir.collisions.length)warnings.push('Ambiguous aliases in Areas: '+dir.collisions.join(', '));
 return {headers:t.headers,rows:result,areaIndex:idx,warnings,unmatched:user.role==='admin'?[...unmatched].map(([value,count])=>({value,count})):[],directory:dir};
}
export function reportRows(scoped,mapping='') {
 const map=mappingValue(mapping), fields=['Area','Category','Branch location','Name','Phone','Date held','Teenage male','Teenage female','Parents','Total','Salvation','Sanctification','Holy ghost','Healing','Re-anointing','Other blessings','Activity'];
 const numeric=new Set(fields.slice(6,16)), idx=Object.fromEntries(fields.map(f=>[f,column(scoped.headers,f,map[f])]));
 let invalid=0;
 const rows=scoped.rows.map(row=>fields.map(f=>{
  if(f==='Area')return row.area||`Unassigned: ${row.rawArea||'blank'}`;
  const v=idx[f]>=0?row.values[idx[f]]:'';
  if(numeric.has(f)){const n=count(v);if(text(v)&&n===null)invalid++;return n===null?'':n;}
  if(f==='Category'){const k=key(v);if(['area headquaters','area headquarters','central','area hq','headquarters'].includes(k))return 'Area Headquaters';if(k==='zonal')return 'Zone';if(k==='branch based')return 'Branch';}
  return v??'';
 }));
 const warnings=[...scoped.warnings];
 for(const f of ['Branch location','Total'])if(idx[f]<0)warnings.push(f==='Total'?'No Total column detected. Attendance uses recognised male, female and parent fields where available.':'No branch/location column detected. Submission rows remain available in details.');
 if(invalid)warnings.push(`${invalid} attendance/blessing values are not numeric and were not added to totals.`);
 return {records:[fields,...rows],warnings};
}
export function rawRows(scoped){return [scoped.headers,...scoped.rows.map(r=>r.values)];}
