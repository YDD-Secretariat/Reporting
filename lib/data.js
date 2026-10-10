/**
 * MANCOM reporting — data layer (v2.1)
 * Durable, lightweight: synonyms + area aliases + email-first enrolment.
 * Never breaks on header variation; only Area is required for access control.
 */

export const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
export const yes = v => ['yes', 'true', '1', 'y'].includes(norm(v));
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const CANONICAL_REPORT = [
  'Area', 'Category', 'Branch location', 'Name', 'Phone', 'Date held',
  'Teenage male', 'Teenage female', 'Parents', 'Male', 'Female', 'Total',
  'Salvation', 'Sanctification', 'Holy ghost', 'Healing', 'Re-anointing', 'Other blessings'
];

/**
 * Synonym map: normalised source header → canonical name.
 * Covers sample reports across years/programmes. Extend this object for new labels — no code changes.
 */
export const HEADER_SYNONYMS = {
  'area': 'Area',
  'area name': 'Area',
  'area (e.g anthony)': 'Area',
  'select your area': 'Area',
  'category': 'Category',
  'category of church location': 'Category',
  'church location category': 'Category',
  'branch location': 'Branch location',
  'branch': 'Branch location',
  'location': 'Branch location',
  'programme location': 'Branch location',
  'name': 'Name',
  'name (firstname, lastname)': 'Name',
  'name (first name, last name)': 'Name',
  'full name': 'Name',
  'phone': 'Phone',
  'phone number': 'Phone',
  'phone no': 'Phone',
  'date held': 'Date held',
  'date': 'Date held',
  'programme date': 'Date held',
  'teenage male': 'Teenage male',
  'teen male': 'Teenage male',
  'male (teenage)': 'Teenage male',
  'teenage female': 'Teenage female',
  'teen female': 'Teenage female',
  'female (teenage)': 'Teenage female',
  'parents': 'Parents',
  'parent': 'Parents',
  'male': 'Male',
  'female': 'Female',
  'total': 'Total',
  'total attendance': 'Total',
  'attendance': 'Total',
  'salvation': 'Salvation',
  'sanctification': 'Sanctification',
  'holy ghost': 'Holy ghost',
  'baptism of the holy ghost': 'Holy ghost',
  'baptism of holy ghost': 'Holy ghost',
  'holy spirit': 'Holy ghost',
  'baptism of the holy spirit': 'Holy ghost',
  'healing': 'Healing',
  're-anointing': 'Re-anointing',
  'reanointing': 'Re-anointing',
  're anointing': 'Re-anointing',
  'other blessings': 'Other blessings',
  'others': 'Other blessings',
  'other': 'Other blessings'
};

export function objects(rows) {
  const heads = (rows[0] || []).map(norm);
  const nonEmpty = heads.filter(Boolean);
  if (new Set(nonEmpty).size !== nonEmpty.length) {
    throw new AppError(422, 'Duplicate column headers. Check your sheet.');
  }
  return rows.slice(1)
    .filter(r => r.some(v => String(v).trim()))
    .map(r => Object.fromEntries(heads.map((h, i) => [h, r[i] ?? ''])));
}

/**
 * Enrolment: email-first.
 * Active=YES + matching verified email → allowed.
 * Google Subject blank → no binding (bulk-friendly).
 * Google Subject present → must match token sub.
 */
export function userFromRows(rows, email, subject) {
  const found = objects(rows).filter(r => norm(r.email) === norm(email) && yes(r.active));
  if (found.length !== 1) {
    throw new AppError(403, 'Your account is not enabled. Ask the secretariat administrator.');
  }
  const r = found[0];
  const role = norm(r.role);
  const area = String(r.area || '').trim();
  if (!['admin', 'area_leader', 'area_secretary'].includes(role) || (role !== 'admin' && !area)) {
    throw new AppError(403, 'Your role or area assignment needs administrator attention.');
  }
  const enrolledSub = String(r['google subject'] || '').trim();
  if (enrolledSub && enrolledSub !== subject) {
    throw new AppError(403, 'This Google account does not match the enrolled account for your email. Contact the administrator.');
  }
  return {
    email: norm(email),
    sub: subject,
    name: String(r.name || email),
    role,
    area: role === 'admin' ? '' : area
  };
}

export function buildAreaAliases(branchRows) {
  const map = new Map();
  if (!branchRows || !branchRows.length) return map;
  const heads = (branchRows[0] || []).map(h => norm(h));
  const areaIdx = heads.findIndex(h => h === 'area');
  const aliasIdx = heads.findIndex(h => h === 'alias' || h === 'aliases' || h === 'area alias');
  if (areaIdx < 0) return map;
  for (const row of branchRows.slice(1)) {
    const canonical = String(row[areaIdx] ?? '').trim();
    if (!canonical) continue;
    map.set(norm(canonical), canonical);
    const short = canonical.replace(/\s+area$/i, '').trim();
    if (short && short !== canonical) map.set(norm(short), canonical);
    if (aliasIdx >= 0) {
      String(row[aliasIdx] ?? '')
        .split(/[|;,]/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(a => map.set(norm(a), canonical));
    }
  }
  return map;
}

export function resolveArea(raw, aliasMap) {
  const n = norm(raw);
  if (!n) return '';
  if (aliasMap && aliasMap.has(n)) return aliasMap.get(n);
  const stripped = n.replace(/\s+area$/, '');
  if (aliasMap && aliasMap.has(stripped)) return aliasMap.get(stripped);
  return String(raw ?? '').trim();
}

export function mappedRows(rows, mapping, aliasMap = null) {
  if (!rows || !rows.length) return rows || [];
  const heads = [...(rows[0] || [])].map(h => String(h ?? '').replace(/\s+/g, ' ').trim());

  let map = null;
  if (mapping) {
    try {
      map = JSON.parse(mapping);
    } catch {
      throw new AppError(422, 'Column Map must be valid JSON.');
    }
    if (!map || Array.isArray(map) || typeof map !== 'object') {
      throw new AppError(422, 'Column Map must be an object of standard → source column names.');
    }
  }

  const resultHeads = heads.map((h) => {
    const n = norm(h);
    if (map) {
      for (const [target, source] of Object.entries(map)) {
        if (norm(source) === n) return target;
      }
    }
    if (HEADER_SYNONYMS[n]) return HEADER_SYNONYMS[n];
    const firstLine = norm(h.split(/\n/)[0]);
    if (HEADER_SYNONYMS[firstLine]) return HEADER_SYNONYMS[firstLine];
    return h;
  });

  const seen = new Map();
  for (let i = 0; i < resultHeads.length; i++) {
    const key = norm(resultHeads[i]);
    if (!key) continue;
    if (seen.has(key)) resultHeads[i] = `${resultHeads[i]} (${i + 1})`;
    else seen.set(key, i);
  }

  const areaIdx = resultHeads.findIndex(h => norm(h) === 'area');
  if (areaIdx < 0) {
    throw new AppError(422, 'Report needs an Area column (or a Column Map that provides one). Access stopped to protect area data.');
  }

  const out = [resultHeads];
  for (const row of rows.slice(1)) {
    const next = [...row];
    while (next.length < resultHeads.length) next.push('');
    if (aliasMap) next[areaIdx] = resolveArea(next[areaIdx], aliasMap);
    out.push(next);
  }
  return out;
}

export function scopeRows(rows, user, label = 'Report', areaHeader = 'Area', aliasMap = null) {
  const index = (rows[0] || []).findIndex(h => norm(h) === norm(areaHeader));
  if (index < 0) {
    throw new AppError(422, `${label} needs a ${areaHeader} column; access has been stopped to protect area data.`);
  }
  if (user.role === 'admin') return rows;
  const userArea = resolveArea(user.area, aliasMap) || user.area;
  return [
    rows[0],
    ...rows.slice(1).filter(r => {
      const cell = resolveArea(r[index], aliasMap) || String(r[index] ?? '').trim();
      return norm(cell) === norm(userArea);
    })
  ];
}

export function programmes(rows, reservedExtra = []) {
  const reserved = new Set([
    'users', 'credentials', 'now', 'last', 'members', 'strategy', 'contacts',
    'programmes', 'areas', 'branches', 'feedback', ...reservedExtra.map(norm)
  ]);
  const out = objects(rows).filter(r => yes(r.active)).map(r => ({
    key: String(r.key || '').trim(),
    sheet: String(r['sheet name'] || r.sheet || '').trim(),
    label: String(r.label || r.programme || r.key || '').trim(),
    scope: String(r.scope || 'all').trim(),
    mapping: String(r['column map'] || '').trim(),
    kind: norm(r.kind || r.type || 'report') || 'report'
  }));
  const keys = new Set();
  for (const p of out) {
    if (!/^[a-zA-Z0-9_-]+$/.test(p.key) || keys.has(p.key) || reserved.has(norm(p.sheet)) || !p.sheet) {
      throw new AppError(422, 'Programmes needs unique keys and valid report sheet names. System sheets cannot be reports.');
    }
    keys.add(p.key);
  }
  if (!out.length) throw new AppError(422, 'Add at least one active report to Programmes.');
  return out;
}

export function feedbackProgrammes(feedbackRows, programmeRows) {
  if (feedbackRows && feedbackRows.length > 1) {
    try {
      return programmes(feedbackRows).map(p => ({ ...p, kind: 'feedback' }));
    } catch { /* ignore */ }
  }
  if (programmeRows) {
    try {
      return programmes(programmeRows).filter(p => p.kind === 'feedback');
    } catch { return []; }
  }
  return [];
}

export function mapFeedbackRows(rows, mapping, aliasMap = null) {
  if (!rows || !rows.length) return rows || [];
  return mappedRows(rows, mapping, aliasMap);
}
