// Pure functions: no I/O. Turns Area Readiness rows + the checklist definition into dashboard data.
// Everything is derived from the form definition, so editing questions in the checklist editor
// does not break the dashboard (workstreams are discovered, not hard-coded).
const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const NONE = /^(none|nil|nill|n\/a|na|no|nothing|-+|\.+)(\s+for now)?\.?$/i;
export const STATUS = {ready:'Ready', progress:'In progress', notReady:'Not ready'};
const RANK = ['Low', 'Medium', 'High', 'Critical'];

export function classify(def) {
  const fields = def?.fields || [];
  const isStatus = f => f.type === 'select' && (f.options || []).some(o => norm(o) === 'ready') && (f.options || []).some(o => /progress|not ready/i.test(o));
  const overall = fields.find(f => f.id === 'overall') || fields.find(f => /^overall/i.test(f.label) && f.type === 'select');
  const workstreams = fields.filter(f => isStatus(f) && f !== overall).map(f => ({id: f.id, label: (f.label.split(':')[0] || f.label).trim(), full: f.label}));
  const by = (re, ids = []) => fields.find(f => ids.includes(f.id)) || fields.find(f => re.test(f.label));
  return {
    workstreams, overall,
    attendance: fields.find(f => f.id === 'count') || fields.find(f => f.type === 'number'),
    dryRun: fields.find(f => f.type === 'date'),
    venue: by(/venue name|hub/i, ['venue']), contact: by(/contact person|coordinator/i, ['contact']), phone: by(/phone|whatsapp/i, ['phone']),
    budget: by(/budget/i, ['budget']), gaps: by(/outstanding|gaps/i, ['gaps']), support: by(/support/i, ['support'])
  };
}

export function parseAmount(raw) {
  const text = String(raw ?? '').replace(/(\d),\s+(\d{3})/g, '$1,$2');
  if (!/\d/.test(text) || NONE.test(text.trim())) return {amount: null, flag: null};
  const num = s => Number(s.replace(/,/g, ''));
  const money = [...text.matchAll(/(?:₦|ngn|#|\bn)\s*(\d[\d,]*(?:\.\d+)?)/gi)].map(m => m[1]);
  const total = text.match(/total[^\d]{0,12}(?:₦|ngn|#|n)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  const pick = total?.[1] ?? money[0] ?? text.match(/\d[\d,]*(?:\.\d+)?/)?.[0];
  if (!pick) return {amount: null, flag: null};
  const bad = /,\d{1,2}$/.test(pick.replace(/\.\d+$/, ''));
  const value = num(pick);
  if (!Number.isFinite(value)) return {amount: null, flag: null};
  return bad ? {amount: null, flag: 'Budget figure looks malformed (check commas/zeros); shown as entered and excluded from totals'} : {amount: value, flag: null};
}

const digits = s => String(s ?? '').replace(/\D/g, '');
export function lagosDay(ms) { return new Date(ms + 3600000).toISOString().slice(0, 10); }

export function riskOf(open, notReady, overall, dryRunDay, today) {
  let score = 2 * notReady + open;
  if (/^not/i.test(overall || '')) score += 3;
  let level = score >= 6 ? 'Critical' : score >= 4 ? 'High' : score >= 2 ? 'Medium' : score >= 1 ? 'Low' : 'Complete';
  if (level !== 'Complete' && dryRunDay && dryRunDay <= today && level !== 'Critical') level = RANK[Math.min(3, RANK.indexOf(level) + 1)];
  return level;
}

export function buildAreas({def, headers, rows, pageId, rosterNames = [], resolve = v => v, now = Date.now()}) {
  const c = classify(def), today = lagosDay(now);
  const h = headers.map(norm), col = n => h.indexOf(norm(n));
  const ix = {at: col('Submitted at'), id: col('Submission ID'), page: col('Page ID'), area: col('Area'), name: col('Name'), email: col('Email'), json: col('Answers JSON')};
  const mine = rows.filter(r => (!pageId || r[ix.page] === pageId) && r[ix.area]);
  const groups = new Map();
  for (const r of mine) {
    const area = resolve(r[ix.area]) || String(r[ix.area]).trim();
    (groups.get(area) || groups.set(area, []).get(area)).push(r);
  }
  const areas = [];
  for (const [area, list] of groups) {
    list.sort((a, b) => Date.parse(a[ix.at]) - Date.parse(b[ix.at]));
    const r = list[list.length - 1];
    let a = {}; try { a = JSON.parse(r[ix.json] || '{}'); } catch { a = {}; }
    const val = f => (f ? String(a[f.id] ?? '').trim() : '');
    const work = Object.fromEntries(c.workstreams.map(w => [w.label, val(w) || 'Not answered']));
    const states = Object.values(work);
    const notReady = states.filter(s => /^not ready$/i.test(s)).length;
    const open = states.filter(s => !/^ready$/i.test(s)).length;
    const status = val(c.overall) || 'Not stated';
    const att = c.attendance ? Number(val(c.attendance)) : NaN;
    const {amount, flag: budgetFlag} = parseAmount(val(c.budget));
    const dryRun = val(c.dryRun) || null;
    const contact = val(c.contact), phone = val(c.phone), gaps = val(c.gaps);
    const flags = [];
    if (open && NONE.test(gaps.trim())) flags.push(`Outstanding items say “${gaps.trim()}” but ${open} of ${states.length} workstreams are not marked Ready.`);
    if (open && /^fully/i.test(status)) flags.push('Marked “Fully Ready” while workstreams are still open.');
    if (open && gaps && !NONE.test(gaps.trim()) && !/[a-z]{3}/i.test(gaps)) flags.push('Outstanding items contain no task description (date only).');
    if (digits(contact).length >= 3 && !/[a-z]/i.test(contact)) flags.push('Contact person field contains a phone number, not a name.');
    if (phone && digits(phone).length < 10) flags.push('Phone number looks incomplete.');
    if (budgetFlag) flags.push(budgetFlag);
    if (amount == null && !budgetFlag) flags.push('No usable budget figure supplied.');
    const said = Number(val(c.budget).match(/(\d{2,4})\s*(?:participants|attendees|people|persons|delegates)/i)?.[1]);
    if (Number.isFinite(said) && Number.isFinite(att) && said !== att) flags.push(`Attendance is ${att} but the budget note refers to ${said} participants.`);
    if (dryRun && open && dryRun <= today) flags.push(dryRun === today ? 'Dry run is today with workstreams still open.' : 'Dry-run date has passed with workstreams still open.');
    if (!dryRun) flags.push('No dry-run date supplied.');
    const actions = [];
    const lagging = c.workstreams.map(w => w.label).filter(l => !/^ready$/i.test(work[l]));
    if (lagging.length) actions.push(`Close open workstreams: ${lagging.join(', ')}.`);
    if (amount == null || budgetFlag) actions.push('Obtain an itemised, correctly formatted draft budget.');
    if (open && NONE.test(gaps.trim())) actions.push('Ask for owners and dates against each open workstream.');
    if (flags.some(f => /Contact|Phone/.test(f))) actions.push('Verify contact name and phone number.');
    areas.push({
      area, coordinator: r[ix.name] || '', email: r[ix.email] || '', submittedAt: r[ix.at], submissionId: r[ix.id], updates: list.length,
      attendance: Number.isFinite(att) ? att : null, status, venue: val(c.venue), contact, phone, dryRun,
      budget: amount, budgetText: val(c.budget), gaps, support: val(c.support), supportAmount: parseAmount(val(c.support)).amount,
      work, openCount: open, readyCount: states.length - open, workTotal: states.length,
      risk: riskOf(open, notReady, status, dryRun, today), flags, actions
    });
  }
  const reported = new Set(areas.map(a => a.area));
  const pending = rosterNames.filter(n => !reported.has(n)).sort();
  areas.sort((x, y) => RANK.indexOf(y.risk) - RANK.indexOf(x.risk) || x.area.localeCompare(y.area));
  return {areas, pending, workstreams: c.workstreams.map(w => w.label), totalSubmissions: mine.length, today};
}
