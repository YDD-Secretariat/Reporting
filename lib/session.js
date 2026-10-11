import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './data.js';
const cookieName = 'mancom_session';
function secret() { const s = process.env.SESSION_SECRET; if (!s || s.length < 32) throw new AppError(503,'Set SESSION_SECRET to a random value of at least 32 characters.'); return s; }
function signature(text) { return createHmac('sha256',secret()).update(text).digest('base64url'); }
export function signSession(user, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({sub:user.sub,email:user.email,emailAuthority:user.emailAuthority === true,exp:Math.floor(now/1000)+28800})).toString('base64url');
  return payload + '.' + signature(payload);
}
export function readSession(req, now = Date.now()) {
  const raw = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if (!raw || raw.length > 4096) throw new AppError(401,'Please sign in.');
  const [payload,sig,...rest] = raw.split('.'), expected = signature(payload);
  if (rest.length || !sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw new AppError(401,'Please sign in again.');
  let data; try { data = JSON.parse(Buffer.from(payload,'base64url').toString()); } catch { throw new AppError(401,'Please sign in again.'); }
  if (!Number.isFinite(data.exp) || data.exp <= now/1000 || !data.email || !data.sub) throw new AppError(401,'Your session expired. Please sign in again.');
  return data;
}
export function setCookie(res, value, clear=false) {
  res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:28800}${process.env.NODE_ENV === 'development' ? '' : '; Secure'}`);
}
export function sameOrigin(req) {
  const wanted = process.env.APP_ORIGIN;
  if (!wanted || req.headers.origin !== wanted) throw new AppError(403,'Request origin is not allowed.');
}
