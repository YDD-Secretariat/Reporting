import { randomBytes } from 'node:crypto';
import { AppError, userFromRows, programmes, scopeRows, mappedRows } from './data.js';
import { readSheets, identity, required } from './google.js';
import { readSession, signSession, setCookie, sameOrigin } from './session.js';
const send = (res,status,data) => res.status(status).json(data);
export function createHandler(deps = {}) {
const read = deps.readSheets || readSheets;
const verifier = deps.identity || identity;
async function authorized(email,sub) {
  const [rows] = await read(['Users'], process.env.GOOGLE_USERS_SHEET_ID || required('GOOGLE_SHEET_ID'));
  return userFromRows(rows,email,sub);
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
      let user;
      try { user = await authorized(payload.email,payload.sub); }
      catch(e) { if (e.status===403) return send(res,403,{ok:false,error:e.message,accountId:payload.sub,email:payload.email}); throw e; }
      setCookie(res,signSession(user));
      return send(res,200,{ok:true,user});
    }
    if (action === 'logout' && req.method === 'POST') { sameOrigin(req); setCookie(res,'',true); return send(res,200,{ok:true}); }
    if (req.method !== 'GET') throw new AppError(405,'Method not allowed.');
    if (!['me','data'].includes(action)) throw new AppError(404,'Unknown action.');
    const session = readSession(req);
    // Re-read assignments on every request: disabling an account or changing its area takes effect immediately.
    if (action === 'me') return send(res,200,{ok:true,user:await authorized(session.email,session.sub)});
    let user, registry;
    if (!process.env.GOOGLE_USERS_SHEET_ID || process.env.GOOGLE_USERS_SHEET_ID === required('GOOGLE_SHEET_ID')) {
      const [users, programs] = await read(['Users','Programmes']);
      user = userFromRows(users,session.email,session.sub); registry = programs;
    } else {
      user = await authorized(session.email,session.sub);
      [registry] = await read(['Programmes']);
    }
    const reports = programmes(registry);
    const p = req.query.report ? reports.find(p=>p.key===req.query.report) : reports[0];
    if (!p) throw new AppError(404,'Report not found or inactive.');
    const [areas,branches,raw] = await read(['Areas','Branches',p.sheet]);
    const records = mappedRows(raw,p.mapping);
    return send(res,200,{ok:true,user,generatedAt:new Date().toISOString(),selectedReport:p.key,
      programmes:[['Key','Sheet name','Label','Scope','Active'],...reports.map(p=>[p.key,p.sheet,p.label,p.scope,'YES'])],
      areas:scopeRows(areas,user,'Areas'),branches:scopeRows(branches,user,'Branches'),
      records:scopeRows(records,user,p.label)});
  } catch(e) {
    if (!e.status) console.error('Reporting request failed',e.name);
    return send(res,e.status || 500,{ok:false,error:e.status?e.message:'Something went wrong. Please retry or contact the administrator.'});
  }
}

}
