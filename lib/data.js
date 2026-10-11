export const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
export const yes = v => ['yes','true','1','y'].includes(norm(v));
export class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function objects(rows) {
  const heads = (rows[0] || []).map(norm);
  if (new Set(heads.filter(Boolean)).size !== heads.filter(Boolean).length) throw new AppError(422, 'Duplicate column headers. Check your sheet.');
  return rows.slice(1).filter(r => r.some(v => String(v).trim())).map(r => Object.fromEntries(heads.map((h,i) => [h, r[i] ?? ''])));
}
export function userFromRows(rows, email, subject, emailAuthority = false) {
  const found = objects(rows).filter(r => norm(r.email) === norm(email) && yes(r.active));
  if (found.length !== 1) throw new AppError(403, 'Your account is not enabled. Ask the secretariat administrator.');
  const r = found[0], role = norm(r.role), area = String(r.area || '').trim();
  if (!['admin','area_leader','area_secretary'].includes(role) || (role !== 'admin' && !area)) throw new AppError(403, 'Your role or area assignment needs administrator attention.');
  const enrolledSubject = String(r['google subject'] || '').trim();
  if (enrolledSubject && enrolledSubject !== subject) throw new AppError(403, 'This Google account does not match the optional account restriction set by your administrator.');
  if (!enrolledSubject && emailAuthority !== true) throw new AppError(403, 'Use an approved Gmail or Google Workspace address. Google cannot verify current ownership of this external email address.');
  return {email:norm(email), sub:subject, emailAuthority:emailAuthority === true, name:String(r.name || email), role, area:role === 'admin' ? '' : area};
}
export function scopeRows(rows, user, label = 'Report', areaHeader = 'Area') {
  const index = (rows[0] || []).findIndex(h => norm(h) === norm(areaHeader));
  if (index < 0) throw new AppError(422, `${label} needs a ${areaHeader} column; access has been stopped to protect area data.`);
  if (user.role === 'admin') return rows;
  return [rows[0], ...rows.slice(1).filter(r => norm(r[index]) === norm(user.area))];
}
export function programmes(rows) {
  const reserved = new Set(['users','credentials','programme checklists','area readiness','now','last','members','strategy','contacts','programmes','areas','branches']);
  const out = objects(rows).filter(r => yes(r.active)).map(r => ({
    key:String(r.key || '').trim(), sheet:String(r['sheet name'] || r.sheet || '').trim(),
    label:String(r.label || r.programme || r.key || '').trim(), scope:String(r.scope || 'all').trim(),
    mapping:String(r['column map'] || '').trim(), type:norm(r.type || r.kind || (/^feedback(?:$|[ _-])/i.test(String(r['sheet name']||r.sheet||''))?'feedback':'report')), audience:String(r.audience || '').trim()
  }));
  const keys = new Set();
  for (const p of out) {
    if (!/^[a-zA-Z0-9_-]+$/.test(p.key) || keys.has(p.key) || reserved.has(norm(p.sheet)) || !p.sheet) throw new AppError(422, 'Programmes needs unique keys and valid report sheet names. System sheets cannot be reports.');
    if (!['report','feedback'].includes(p.type)) throw new AppError(422, 'Programme Type must be report or feedback.');
    keys.add(p.key);
  }
  return out;
}
export function mappedRows(rows, mapping) {
  if (!mapping) return rows;
  let map;
  try { map = JSON.parse(mapping); } catch { throw new AppError(422, 'Programmes → Column Map must be blank or valid JSON. Put notes such as Every branch reports in a separate Notes column.'); }
  if (!map || Array.isArray(map) || typeof map !== 'object' || Object.values(map).some(v => typeof v !== 'string')) throw new AppError(422, 'Column Map must map standard column names to source column names.');
  const allowed = ['Area','Category','Branch location','Name','Phone','Date held','Teenage male','Teenage female','Parents','Total','Salvation','Sanctification','Holy ghost','Healing','Re-anointing','Other blessings'];
  const heads = [...(rows[0] || [])];
  for (const [target, source] of Object.entries(map)) {
    if (!allowed.includes(target)) throw new AppError(422, `Unsupported mapped column: ${target}`);
    const i = heads.findIndex(h => norm(h) === norm(source));
    if (i < 0) throw new AppError(422, `Mapped column not found: ${source}`);
    heads[i] = target;
  }
  if (new Set(heads.map(norm)).size !== heads.length) throw new AppError(422, 'Column mapping creates duplicate headers.');
  return [heads, ...rows.slice(1)];
}
