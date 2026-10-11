import {cleanRich} from '../public/modules/checklist-rich.js';
import {randomBytes} from 'node:crypto';
import {AppError} from './data.js';
import {directory} from '../public/modules/schema.js';
export const PAGE_HEADERS=['ID','Revision','Status','Expires','Updated','Updated by','Definition JSON'];
export const RESPONSE_HEADERS=['Submitted at','Submission ID','Page ID','Revision','Programme','Area','Name','Email','Role','Answers JSON','Answers'];
const fail=(s,m)=>{throw new AppError(s,m);};
export function definition(d){
 if(!d||typeof d.title!=='string'||!d.title.trim()||d.title.length>180||typeof d.text!=='string'||d.text.length>18000||!Array.isArray(d.fields)||!d.fields.length||d.fields.length>40)fail(400,'Supply a title, guidance and 1–40 questions.');
 if(JSON.stringify(d).length>40000)fail(400,'Please shorten the guidance or question options.');
 const ids=new Set();const fields=d.fields.map(f=>{
  if(!f||!/^[a-z][a-z0-9_]{0,39}$/.test(f.id)||ids.has(f.id)||!['text','textarea','number','date','select'].includes(f.type)||typeof f.label!=='string'||!f.label.trim()||f.label.length>300)fail(400,'Each question needs a unique ID, label and supported type.');
  ids.add(f.id); const options=f.type==='select'?f.options:[];
  if(f.type==='select'&&(!Array.isArray(options)||options.length<2||options.length>15||options.some(o=>typeof o!=='string'||!o.trim()||o.length>100)||new Set(options).size!==options.length))fail(400,'Choice questions need 2–15 distinct options.');
  return {id:f.id,label:f.label.trim(),type:f.type,required:!!f.required,options};
 });let rich;try{if(d.rich)rich=cleanRich(d.rich);}catch(e){fail(400,e.message);}
 return {title:d.title.trim(),text:rich?rich.ops.map(o=>o.insert).join(''):d.text,fields,...(rich?{rich}:{})};
}
export function pages(rows){
 const map=new Map(); for(const r of rows.slice(1)){if(!r[0])continue;const old=map.get(r[0])||{};let def;try{def=JSON.parse(r[6]);}catch{fail(422,'Invalid stored checklist definition. Contact the administrator.');}
 const entry={id:r[0],revision:r[1],status:r[2],expires:r[3],updated:r[4],definition:def};
 if(r[2]==='draft')old.draft=entry;else {old.live=entry;if(r[2]==='published')delete old.draft;}map.set(r[0],old);
 }return map;
}
export async function readiness({action,req,user,read,append,now=Date.now()}){
 const isPublic=action.startsWith('public-');if(isPublic)action=action.slice(7);
 const admin=user?.role==='admin';
 if(isPublic&&!['readiness-page','readiness-submit'].includes(action))fail(404,'Unknown action.');
 if(!['readiness-list','readiness-page','readiness-save','readiness-submit','readiness-responses'].includes(action))fail(404,'Unknown readiness action.');
 const mutation=['readiness-save','readiness-submit'].includes(action);
 if(req.method!==(mutation?'POST':'GET'))fail(405,'Method not allowed.');
 if(['readiness-save','readiness-responses'].includes(action)&&!admin)fail(403,'Administrator access required.');
 const [stored]=await read(['Programme Checklists']);const all=pages(stored);
 const open=p=>p?.status==='published'&&Date.parse(p.expires)>now;
 if(action==='readiness-list')return {pages:[...all.values()].map(p=>admin?{...p,open:open(p.live)}:p.live).filter(p=>admin||open(p))};
 const body=req.body||{};const id=mutation?body.id:req.query.id;
 if(action==='readiness-save'){
  const mode=body.mode;if(!['draft','published','closed'].includes(mode))fail(400,'Invalid publication mode.');
  if(id&&!all.has(id))fail(404,'Checklist not found.');
  const current=all.get(id);const def=mode==='closed'?current?.live?.definition:definition(body.definition);
  if(!def)fail(400,'Publish this checklist before closing it.');
  if(mode==='published'&&(!Number.isInteger(body.days)||body.days<1||body.days>90))fail(400,'Choose 1–90 days.');
  const page={id:id||randomBytes(24).toString('hex'),revision:randomBytes(12).toString('hex'),status:mode,expires:mode==='published'?new Date(now+body.days*86400000).toISOString():(current?.live?.expires||''),updated:new Date(now).toISOString(),definition:def};
  await append('Programme Checklists',PAGE_HEADERS,[[page.id,page.revision,mode,page.expires,page.updated,user.email,JSON.stringify(def)]]);
  return {page};
 }
 if(action==='readiness-responses'){
  const [rows]=await read(['Area Readiness']);return {headers:rows[0]||RESPONSE_HEADERS,rows:rows.slice(1).filter(r=>!id||r[2]===id)};
 }
 const page=all.get(id)?.live;if(!page)fail(404,'This checklist link was not found.');
 if(!open(page))fail(410,'This readiness link has closed. Please contact the secretariat for a new link.');
 if(action==='readiness-page'){if(!isPublic)return {page};const [areas]=await read(['Areas']);return {page,areas:directory(areas).names};}
 if(body.revision!==page.revision)fail(409,'The checklist has changed. Reload the page before submitting.');
 const [areas]=await read(['Areas']);const roster=directory(areas);const area=roster.resolve(isPublic||admin?body.area:user.area);
 if(isPublic){const name=typeof body.name==='string'?body.name.trim():'';const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(!name||name.length>120||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter your name and a valid email address.');
 if(body.website)fail(400,'Submission could not be accepted.');
 user={name,email,role:'public_link_unverified'};}
 if(!area)fail(422,'Your area must match the Areas roster. Contact the administrator.');
 if(!body.answers||typeof body.answers!=='object'||Array.isArray(body.answers))fail(400,'Invalid answers.');
 const answers={};for(const f of page.definition.fields){const v=body.answers[f.id];if(v!==undefined&&typeof v!=='string')fail(400,'Invalid answer type.');const value=(v||'').trim();
 if(f.required&&!value)fail(400,'Please complete: '+f.label);
 if(value.length>(f.type==='textarea'?2500:500))fail(400,'Answer too long: '+f.label);
 if(value&&f.type==='select'&&!f.options.includes(value))fail(400,'Choose a valid option: '+f.label);
 if(value&&f.type==='number'&&(!/^\d+$/.test(value)||Number(value)>10000000))fail(400,'Enter a nonnegative whole number: '+f.label);
 if(value&&f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))fail(400,'Enter a valid date: '+f.label);
 answers[f.id]=value;
 }
 if(JSON.stringify(answers).length>20000)fail(400,'Please shorten your answers to under 20,000 characters in total.');
 const submissionId=randomBytes(12).toString('hex');
 await append('Area Readiness',RESPONSE_HEADERS,[[new Date(now).toISOString(),submissionId,page.id,page.revision,page.definition.title,area,user.name,user.email,user.role,JSON.stringify(answers),page.definition.fields.map(f=>f.label+': '+answers[f.id]).join('\n')]]);
 return {submissionId};
}
