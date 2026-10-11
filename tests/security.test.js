import test from 'node:test';
import assert from 'node:assert/strict';
import { userFromRows, scopeRows, programmes, mappedRows } from '../lib/data.js';
import { signSession, readSession } from '../lib/session.js';
import { createHandler } from '../lib/handler.js';
process.env.SESSION_SECRET='test-only-012345678901234567890123456789';
process.env.GOOGLE_SHEET_ID='test-book';process.env.GOOGLE_CLIENT_ID='test-client';process.env.APP_ORIGIN='https://reports.example';
const headers=['Email','Name','Role','Area','Active','Google Subject'];
const rows=[headers,['a@example.com','Area A Secretary','area_secretary','Area A','YES','sub-a'],['b@example.com','Area B Leader','area_leader','Area B','YES','sub-b'],['admin@example.com','Admin','admin','','YES','sub-admin']];
const user=userFromRows(rows,'a@example.com','sub-a');
const sheets={Users:rows,Programmes:[['Key','Sheet name','Label','Scope','Active'],['school','BACK TO SCHOOL 2026','Back to School 2026','all','YES'],['camp','Camp 2026','Camp 2026','all','YES']],Areas:[['Area','Leader'],['Area A','Alice'],['Area B','Bob']],Branches:[['Area','Branch'],['Area A','A Church'],['Area B','B Church']], 'BACK TO SCHOOL 2026':[['Area','Branch location','Total'],['Area A','A Church',10],['Area B','B Church',99]], 'Camp 2026':[['Area','Branch location','Total'],['Area A','A Church',25],['Area B','B Church',250]]};
const handler=createHandler({readSheets:async(names)=>names.map(n=>sheets[n]),identity:{verifyIdToken:async()=>({getPayload:()=>({email:'a@example.com',sub:'sub-a',email_verified:true,nonce:'testnonce'})})}});
async function call(query={},options={}){
 const req={query,method:'GET',headers:{cookie:'mancom_session='+signSession(user)},...options};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(d){this.data=d;}};
 await handler(req,res);return res;
}
test('missing authentication cannot fetch data',async()=>{const r=await call({}, {headers:{}});assert.equal(r.code,401);assert.equal(r.data.records,undefined);});
test('server filters all private datasets; spoofed area and role are ignored',async()=>{const r=await call({report:'school',area:'Area B',role:'admin'});assert.equal(r.code,200);for(const key of ['areas','branches','records'])assert.equal(r.data[key].length,2);assert.ok(!JSON.stringify(r.data).includes('Bob'));assert.ok(!JSON.stringify(r.data).includes('B Church'));assert.ok(!JSON.stringify(r.data).includes('sub-b'));});
test('admin sees all areas',async()=>{const admin=userFromRows(rows,'admin@example.com','sub-admin');const r=await call({}, {headers:{cookie:'mancom_session='+signSession(admin)}});assert.equal(r.data.records.length,3);});
test('report switches to a different sheet and unknown keys fail',async()=>{const result=(await call({report:'camp'})).data.records;assert.equal(result[1][result[0].indexOf('Total')],25);assert.equal((await call({report:'Users'})).code,404);});
test('disabling a user revokes an existing session',async()=>{rows[1][4]='NO';try{assert.equal((await call()).code,403);}finally{rows[1][4]='YES';}});
test('blank area and unknown roles fail closed',()=>{assert.throws(()=>userFromRows([headers,['x','X','area_leader','','YES','s']],'x','s'));assert.throws(()=>userFromRows([headers,['x','X','owner','A','YES','s']],'x','s'));});
test('account subject binding prevents impersonation or email reassignment',()=>assert.throws(()=>userFromRows(rows,'a@example.com','another-sub')));
test('missing area header fails closed even for admin',()=>{assert.throws(()=>scopeRows([['Name'],['secret']],user));assert.throws(()=>scopeRows([['Name']],{role:'admin'}));});
test('headers-only report is a valid zero-submission report',()=>assert.deepEqual(scopeRows([['Area','Total']],user),[['Area','Total']]));
test('session tampering and expiry fail',()=>{const token=signSession(user);assert.throws(()=>readSession({headers:{cookie:'mancom_session='+token+'x'}}));assert.throws(()=>readSession({headers:{cookie:'mancom_session='+signSession(user,0)}}));});
test('sensitive sheet cannot be registered as a report; duplicate keys rejected',()=>{assert.throws(()=>programmes([['Key','Sheet name','Active'],['x','Credentials','YES']]));assert.throws(()=>programmes([['Key','Sheet name','Active'],['x','Report A','YES'],['x','Report B','YES']]));});
test('different form labels can be mapped before area filtering',()=>{const result=mappedRows([['District','Attendance'],['Area A',42],['Area B',500]],'{"Area":"District","Total":"Attendance"}');assert.deepEqual(scopeRows(result,user),[['Area','Total'],['Area A',42]]);assert.throws(()=>mappedRows(result,'{"Area":"missing"}'));});
test('cross-origin login and logout are rejected',async()=>{for(const action of ['login','logout']){const r=await call({action},{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:{credential:'test'}});assert.equal(r.code,403);}});
test('verified Google login uses nonce and issues HttpOnly secure cookie',async()=>{const r=await call({action:'login'},{method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json',cookie:'mancom_nonce=testnonce'},body:{credential:'verified-token'}});assert.equal(r.code,200);assert.match(r.headers['Set-Cookie'],/HttpOnly/);assert.match(r.headers['Set-Cookie'],/Secure/);});
test('nonce replay from a different browser is rejected',async()=>{const r=await call({action:'login'},{method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json',cookie:'mancom_nonce=othernonce'},body:{credential:'verified-token'}});assert.equal(r.code,401);});
test('responses are not shared-cacheable and there are no report write actions',async()=>{const r=await call();assert.match(r.headers['Cache-Control'],/no-store/);assert.equal((await call({action:'data'},{method:'POST'})).code,405);});

test('approved email with authoritative Google ownership needs no subject column',()=>{
 const simple=[['Email','Name','Role','Area','Active'],['leader@gmail.com','Leader','area_leader','Area A','YES']];
 assert.equal(userFromRows(simple,'leader@gmail.com','new-sub',true).area,'Area A');
 assert.throws(()=>userFromRows(simple,'unlisted@gmail.com','new-sub',true));
 assert.throws(()=>userFromRows(simple,'leader@gmail.com','new-sub',false));
});
test('new email-only login persists verification and keeps area filtering',async()=>{
 const localRows=[['Email','Name','Role','Area','Active'],['secretary@gmail.com','Secretary','area_secretary','Area A','YES']];
 const h=createHandler({readSheets:async names=>names.map(n=>n==='Users'?localRows:sheets[n]),identity:{verifyIdToken:async()=>({getPayload:()=>({email:'secretary@gmail.com',sub:'new-google-sub',email_verified:true,nonce:'testnonce'})})}});
 const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(d){this.data=d;}});
 const login=res();await h({query:{action:'login'},method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json',cookie:'mancom_nonce=testnonce'},body:{credential:'verified'}},login);
 assert.equal(login.code,200);const cookie=login.headers['Set-Cookie'].split(';')[0];
 const data=res();await h({query:{action:'data'},method:'GET',headers:{cookie}},data);assert.equal(data.code,200);assert.equal(data.data.records.length,2);
 localRows[1][4]='NO';const revoked=res();await h({query:{action:'data'},method:'GET',headers:{cookie}},revoked);assert.equal(revoked.code,403);
});
test('Workspace email can log in without manual subject collection',async()=>{
 const h=createHandler({readSheets:async()=>[[['Email','Name','Role','Area','Active'],['leader@church.example','Leader','area_leader','Area A','YES']]],identity:{verifyIdToken:async()=>({getPayload:()=>({email:'leader@church.example',sub:'workspace-sub',hd:'church.example',email_verified:true,nonce:'testnonce'})})}});
 const r={setHeader(){},status(c){this.code=c;return this;},json(d){this.data=d;}};
 await h({query:{action:'login'},method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json',cookie:'mancom_nonce=testnonce'},body:{credential:'verified'}},r);assert.equal(r.code,200);
});
