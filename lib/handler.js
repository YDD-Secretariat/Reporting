import { scopedTable, reportRows, rawRows, column, table } from '../public/modules/schema.js';
import { randomBytes } from 'node:crypto';
import { AppError, objects, userFromRows, programmes, scopeRows, mappedRows } from './data.js';
import { readiness } from './readiness.js';
import { readSheets, listSheets, identity, required, appendReadiness } from './google.js';
import { readSession, signSession, setCookie, sameOrigin } from './session.js';
const send = (res,status,data) => {if(Buffer.byteLength(JSON.stringify(data),'utf8')>3900000)return res.status(413).json({ok:false,error:'This source exceeds the response size limit. Split it into programme or period tabs and register them separately.'});return res.status(status).json(data);};
export function createHandler(deps = {}) {
const read = deps.readSheets || readSheets;
const verifier = deps.identity || identity;
async function authorized(email,sub,emailAuthority = false) {
  const [rows] = await read(['Users'], process.env.GOOGLE_USERS_SHEET_ID || required('GOOGLE_SHEET_ID'));
  return userFromRows(rows,email,sub,emailAuthority);
}
return async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Vary','Cookie');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const action = req.query.action || 'data';
    if (action === 'config' && req.method === 'GET') {
      const nonce = randomBytes(24).toString('hex');
      res.setHeader('Set-Cookie',`mancom_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV==='development'?'':'; Secure'}`);
      return send(res,200,{ok:true,clientId:required('GOOGLE_CLIENT_ID'),nonce});
    }
    if (action === 'login' && req.method === 'POST') {
      sameOrigin(req);
      if (!String(req.headers['content-type']).startsWith('application/json')) throw new AppError(415,'Use JSON.');
      const credential = req.body?.credential;
      if (typeof credential !== 'string' || credential.length > 12000) throw new AppError(400,'Invalid sign-in request.');
      let payload;
      try { payload = (await verifier.verifyIdToken({idToken:credential,audience:required('GOOGLE_CLIENT_ID')})).getPayload(); }
      catch { throw new AppError(401,'Google sign-in could not be verified. Please try again.'); }
      const nonce = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('mancom_nonce='))?.slice(13);
      if (!nonce || payload.nonce !== nonce || !payload.email_verified || !payload.email || !payload.sub) throw new AppError(401,'Sign-in verification expired. Reload the login page.');
      const emailAuthority = payload.email_verified === true && (payload.email.toLowerCase().endsWith('@gmail.com') || (typeof payload.hd === 'string' && payload.hd.length > 0));
      const user = await authorized(payload.email,payload.sub,emailAuthority);
      setCookie(res,signSession(user));
      return send(res,200,{ok:true,user});
    }
    if (action === 'logout' && req.method === 'POST') { sameOrigin(req); setCookie(res,'',true); return send(res,200,{ok:true}); }
    if (action.startsWith('readiness-')) {
      const session=readSession(req);
      const user=await authorized(session.email,session.sub,session.emailAuthority);
      if(req.method==='POST'){sameOrigin(req);if(!String(req.headers['content-type']).startsWith('application/json'))throw new AppError(415,'Use JSON.');if(Buffer.byteLength(JSON.stringify(req.body||{}))>60000)throw new AppError(413,'Checklist request too large.');}
      return send(res,200,{ok:true,...await readiness({action,req,user,read,append:deps.appendReadiness||appendReadiness})});
    }
    if (req.method !== 'GET') throw new AppError(405,'Method not allowed.');
    if (!['me','data','catalog','feedback','roster'].includes(action)) throw new AppError(404,'Unknown action.');
    const session = readSession(req);
    // Re-read assignments on every request: disabling an account or changing its area takes effect immediately.
    if (action === 'me') return send(res,200,{ok:true,user:await authorized(session.email,session.sub,session.emailAuthority)});
    if(action==='roster'){
      const user=await authorized(session.email,session.sub,session.emailAuthority);const [areas]=await read(['Areas']);const scoped=scopedTable(areas,areas,user);
      const aliasIndex=scoped.headers.findIndex(h=>String(h).trim().toLowerCase()==='aliases');
      if(aliasIndex>=0)scoped.rows.forEach(r=>{r.values=[...r.values];r.values[aliasIndex]=String(r.values[aliasIndex]||'').split('|').filter(a=>scoped.directory.resolve(a)===r.area).join('|');});
      return send(res,200,{ok:true,areas:rawRows(scoped)});
    }
    let user, registry;
    if (!process.env.GOOGLE_USERS_SHEET_ID || process.env.GOOGLE_USERS_SHEET_ID === required('GOOGLE_SHEET_ID')) {
      const [users, programs] = await read(['Users','Programmes']);
      user = userFromRows(users,session.email,session.sub,session.emailAuthority); registry = programs;
    } else {
      user = await authorized(session.email,session.sub,session.emailAuthority);
      [registry] = await read(['Programmes']);
    }
    let reports = programmes(registry);
    if(action==='catalog'||action==='feedback') {
      const titles=await (deps.listSheets||listSheets)();
      const registered=new Set(objects(registry).map(r=>String(r['sheet name']||r.sheet||'').trim()));
      for(const title of titles)if(/^feedback(?:$|[ _-])/i.test(title)&&!registered.has(title)){
        const id='auto_'+Buffer.from(title).toString('base64url');
        if(!reports.some(p=>p.key===id))reports.push({key:id,sheet:title,label:title.replace(/^feedback[ _-]*/i,'')||'Feedback',type:'feedback',scope:'all',mapping:'',audience:''});
      }
    }
    if(action==='catalog')return send(res,200,{ok:true,user,reports:reports.map(({key,label,type,audience})=>({key,label,type,audience}))});
    const eligible=reports.filter(p=>p.type===(action==='feedback'?'feedback':'report'));
    const p=req.query.report?eligible.find(p=>p.key===req.query.report):eligible[0];
    if(!p)throw new AppError(404,action==='feedback'?'No active feedback source. Add a Feedback tab or a Programmes row with Type=feedback.':'Report not found or inactive.');
    const [areas,branches,raw]=await read(['Areas','Branches',p.sheet]);
    const scoped=scopedTable(raw,areas,user,p.mapping);
    if(action==='feedback')return send(res,200,{ok:true,user,generatedAt:new Date().toISOString(),selectedReport:p.key,label:p.label,audience:p.audience,headers:scoped.headers,
      rows:scoped.rows.map(r=>({values:r.values,area:r.area,audience:p.audience||((column(scoped.headers,'Respondent type')>=0&&r.values[column(scoped.headers,'Respondent type')])||'Not specified')})),
      warnings:scoped.warnings,unmatched:scoped.unmatched});
    const normalized=reportRows(scoped,p.mapping);
    const sa=scopedTable(areas,areas,user),sb=scopedTable(branches,areas,user);
    const canonicalRaw=s=>[s.headers,...s.rows.map(r=>{const values=[...r.values];if(s.areaIndex>=0)values[s.areaIndex]=r.area||r.rawArea;return values;})];
    return send(res,200,{ok:true,user,generatedAt:new Date().toISOString(),selectedReport:p.key,
      programmes:[['Key','Sheet name','Label','Scope','Active'],...eligible.map(p=>[p.key,p.sheet,p.label,p.scope,'YES'])],
      areas:canonicalRaw(sa),branches:canonicalRaw(sb),records:normalized.records,details:rawRows(scoped),warnings:normalized.warnings,
      unmatched:scoped.unmatched});

  } catch(e) {
    if (!e.status) console.error('Reporting request failed',e.name);
    return send(res,e.status || 500,{ok:false,error:e.status?e.message:'Something went wrong. Please retry or contact the administrator.'});
  }
}

}
