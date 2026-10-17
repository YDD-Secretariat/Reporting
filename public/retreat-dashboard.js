(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const naira = n => n == null ? 'Not supplied' : new Intl.NumberFormat('en-NG', {style:'currency', currency:'NGN', maximumFractionDigits:0}).format(n);
  const short = n => '₦' + new Intl.NumberFormat('en-NG', {notation: n >= 1e6 ? 'compact' : 'standard', maximumFractionDigits: 1}).format(n);
  const when = iso => iso ? new Date(iso).toLocaleString('en-NG', {timeZone:'Africa/Lagos', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '—';
  const REFRESH_MS = 60000;
  let D = null, pageId = new URLSearchParams(location.search).get('id') || '', timer;

  const pill = (t, cls) => {
    const c = cls || ({Ready:'ready','In progress':'progress','Not ready':'critical',Critical:'critical',High:'critical',Medium:'progress',Low:'unknown',Complete:'complete'}[t] || 'notans');
    return `<span class="pill ${c}">${esc(t)}</span>`;
  };
  const statusKey = s => /^fully/i.test(s) ? 'Fully Ready' : /^mostly/i.test(s) ? 'Mostly Ready' : /^not/i.test(s) ? 'Not Ready' : s;
  const statusPill = s => pill(statusKey(s) + (/^fully/i.test(s) ? ' (self-reported)' : ''), /^fully/i.test(s) ? 'ready' : /^mostly/i.test(s) ? 'progress' : /^not/i.test(s) ? 'critical' : 'notans');

  function kpis() {
    const A = D.areas, n = A.length, c = f => A.filter(f).length;
    const budgets = A.reduce((s, a) => s + (a.budget || 0), 0);
    const support = A.reduce((s, a) => s + (a.supportAmount || 0), 0);
    const items = [
      ['Reporting areas', `${n} / ${D.rosterSize}`, `${D.pending.length} yet to report · ${D.totalSubmissions} updates received`],
      ['Expected attendance', A.reduce((s, a) => s + (a.attendance || 0), 0).toLocaleString('en-NG'), 'Combined latest estimates'],
      ['Self-reported fully ready', c(a => /^fully/i.test(a.status)), `${c(a => /^fully/i.test(a.status) && a.openCount)} still have an open workstream`],
      ['Mostly ready', c(a => /^mostly/i.test(a.status)), 'Self-reported status'],
      ['Priority risk areas', c(a => ['Critical', 'High'].includes(a.risk)), 'Critical or High — follow up'],
      ['Submitted budget figures', budgets ? short(budgets) : '—', 'Parsed totals; malformed entries excluded'],
      ['Support requests identified', support ? naira(support) : '—', 'Only where an amount was stated'],
      ['Missing / unusable budgets', c(a => a.budget == null), 'Needs follow-up']
    ];
    $('kpis').innerHTML = items.map(x => `<div class="card"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${esc(x[1])}</div><div class="kpi-sub">${esc(x[2])}</div></div>`).join('');
  }

  function work() {
    const A = D.areas, n = A.length || 1;
    $('workChart').innerHTML = D.workstreams.map(w => {
      const r = A.filter(a => a.work[w] === 'Ready').length, nr = A.filter(a => a.work[w] === 'Not ready').length, p = A.length - r - nr;
      return `<div class="bar-row"><div>${esc(w)}</div><div><div class="seg"><i style="width:${r / n * 100}%;background:#27845a"></i><i style="width:${p / n * 100}%;background:#d7a238"></i><i style="width:${nr / n * 100}%;background:#bd352b"></i></div><div class="small muted" style="margin-top:3px">${r} ready · ${p} in progress${nr ? ` · ${nr} not ready` : ''}</div></div><strong>${r}/${A.length}</strong></div>`;
    }).join('') + '<div class="small muted" style="margin-top:12px"><span style="color:#27845a">■</span> Ready &nbsp; <span style="color:#d7a238">■</span> In progress &nbsp; <span style="color:#bd352b">■</span> Not ready</div>';
  }

  function alerts() {
    const A = D.areas, out = [];
    A.filter(a => a.risk === 'Critical').forEach(a => out.push(['red', a.area, `${a.openCount} of ${a.workTotal} workstreams open${a.flags[0] ? '; ' + a.flags[0] : ''}`]));
    D.workstreams.forEach(w => { const k = A.filter(a => a.work[w] !== 'Ready').length; if (A.length && k / A.length >= 0.5) out.push(['', w, `${k} of ${A.length} areas have this workstream open.`]); });
    const dq = A.filter(a => a.flags.length).length;
    if (dq) out.push(['', 'Data checks', `${dq} of ${A.length} submissions have flags to verify (open an area for detail).`]);
    if (D.pending.length) out.push(['', 'Not yet reported', `${D.pending.length} areas have not submitted an update.`]);
    $('alerts').innerHTML = out.map(a => `<div class="alert ${a[0]}"><strong>${esc(a[1])}:</strong> ${esc(a[2])}</div>`).join('') || '<div class="muted">Nothing needs attention.</div>';
  }

  function pending() {
    $('pendingCount').textContent = `(${D.pending.length})`;
    $('pending').innerHTML = D.pending.map(p => `<span class="chip">${esc(p)}</span>`).join('') || '<span class="muted">All rostered areas have reported.</span>';
  }

  function attendance() {
    const s = [...D.areas].filter(a => a.attendance != null).sort((a, b) => b.attendance - a.attendance), max = Math.max(1, ...s.map(a => a.attendance));
    $('attendanceChart').innerHTML = s.map(a => `<div class="bar-row"><div title="${esc(a.area)}">${esc(a.area)}</div><div class="track"><div class="fill" style="width:${a.attendance / max * 100}%"></div></div><strong>${a.attendance}</strong></div>`).join('') || '<div class="muted">No attendance figures yet.</div>';
  }

  function filters() {
    const keep = id => $(id).value;
    const sv = keep('statusFilter'), wv = keep('workFilter');
    $('statusFilter').innerHTML = '<option value="">All reported statuses</option>' + [...new Set(D.areas.map(a => statusKey(a.status)))].map(s => `<option>${esc(s)}</option>`).join('');
    $('workFilter').innerHTML = '<option value="">All workstreams (open)</option>' + D.workstreams.map(w => `<option>${esc(w)}</option>`).join('');
    $('statusFilter').value = sv; $('workFilter').value = wv;
  }

  function table() {
    const q = $('search').value.toLowerCase(), st = $('statusFilter').value, wf = $('workFilter').value, rf = $('riskFilter').value;
    const rows = D.areas.filter(a => (!q || [a.area, a.coordinator, a.venue].join(' ').toLowerCase().includes(q)) && (!st || statusKey(a.status) === st) && (!wf || a.work[wf] !== 'Ready') && (!rf || a.risk === rf));
    $('areaRows').innerHTML = rows.map(a => `<tr><td><span class="area-name" data-area="${esc(a.area)}">${esc(a.area)}</span>${a.updates > 1 ? ` <span class="small muted">(${a.updates} updates)</span>` : ''}</td><td>${esc(a.coordinator)}</td><td>${a.attendance ?? '—'}</td><td>${statusPill(a.status)}</td><td>${a.readyCount}/${a.workTotal}</td><td>${a.openCount}/${a.workTotal}</td><td>${a.budget != null ? esc(naira(a.budget)) : '<span class="muted">' + (a.budgetText ? 'Unclear — see detail' : 'Not supplied') + '</span>'}</td><td>${esc(a.dryRun || '—')}</td><td>${pill(a.risk)}${a.flags.length ? ` <span title="${esc(a.flags.length + ' flag(s)')}" style="color:#a66b00">⚑</span>` : ''}</td><td class="small muted">${esc(when(a.submittedAt))}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">No areas match.</td></tr>';
    $('rowCount').textContent = `Showing ${rows.length} of ${D.areas.length} reporting areas`;
  }

  function detail(name) {
    const a = D.areas.find(x => x.area === name); if (!a) return;
    $('dTitle').textContent = a.area;
    $('dSub').textContent = `${a.coordinator} · ${a.attendance ?? '—'} expected · ${a.status} · updated ${when(a.submittedAt)}`;
    $('dContent').innerHTML = `<div class="detail-grid">
      <div class="detail-box"><h3>Venue</h3><p>${esc(a.venue) || '—'}</p></div>
      <div class="detail-box"><h3>Contact</h3><p>${esc(a.contact) || '—'}<br>${esc(a.phone) || '—'}<br><span class="muted">${esc(a.email)}</span></p></div>
      <div class="detail-box"><h3>Dry-run date</h3><p>${esc(a.dryRun || '—')}</p></div>
      <div class="detail-box"><h3>Budget / support</h3><p>${a.budget != null ? esc(naira(a.budget)) : 'No usable figure'}<br><span class="muted">As entered:</span><pre class="long">${esc(a.budgetText || '—')}</pre>${a.support ? `<span class="muted">Support / successes:</span> ${esc(a.support)}` : ''}</p></div></div>
      <h3 style="color:#132b4a">Workstream checklist</h3><div class="worklist">${D.workstreams.map(w => `<div class="workitem"><span>${esc(w)}</span>${pill(a.work[w])}</div>`).join('')}</div>
      <div class="detail-box" style="margin-top:14px"><h3>Outstanding items (as entered)</h3><pre class="long">${esc(a.gaps || '—')}</pre></div>
      <div class="detail-box" style="margin-top:10px"><h3>Data checks</h3>${a.flags.map(f => `<div class="flag">${esc(f)}</div>`).join('') || '<p class="muted">No issues detected.</p>'}</div>
      <div class="detail-box" style="margin-top:10px"><h3>Suggested next actions</h3>${a.actions.map(f => `<div class="flag">${esc(f)}</div>`).join('') || '<p class="muted">None.</p>'}</div>
      <p class="small muted">Read-only view of the latest submission. Updates by the area appear here automatically on the next refresh.</p>`;
    $('detail').classList.add('show');
  }

  function csv() {
    const H = ['Area', 'Coordinator', 'Email', 'Attendance', 'Reported status', 'Venue', 'Contact', 'Phone', 'Dry run', 'Budget (parsed)', 'Budget (as entered)', 'Risk', 'Updated', 'Flags', ...D.workstreams];
    const R = D.areas.map(a => [a.area, a.coordinator, a.email, a.attendance, a.status, a.venue, a.contact, a.phone, a.dryRun, a.budget, a.budgetText, a.risk, a.submittedAt, a.flags.join(' | '), ...D.workstreams.map(w => a.work[w])]);
    // Prefix risky leading characters so spreadsheet apps never evaluate cell text as a formula.
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const blob = new Blob(['\ufeff' + [H, ...R].map(r => r.map(cell).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8;'});
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'area-readiness.csv'; l.click(); URL.revokeObjectURL(l.href);
  }

  function render() {
    $('title').textContent = D.page.title;
    $('subtitle').textContent = `Live from the Area Readiness sheet · latest update per area${D.page.open ? '' : ' · submission link closed'}`;
    $('notice').innerHTML = `<strong>Live data.</strong> Refreshes every minute. Each area's most recent submission is used; earlier updates stay in the sheet. Figures are self-reported by areas, not independently verified.`;
    $('pageSel').innerHTML = D.pages.map(p => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join(''); $('pageSel').value = D.page.id;
    $('pageSel').parentElement.hidden = D.pages.length < 2;
    kpis(); work(); alerts(); pending(); attendance(); filters(); table();
  }

  async function load(manual) {
    try {
      const data = await Portal.api('readiness-dashboard' + (pageId ? '&id=' + encodeURIComponent(pageId) : ''));
      D = data; pageId = data.page.id; render();
      $('dot').className = 'dot'; $('stamp').textContent = 'Updated ' + new Date(data.generatedAt).toLocaleTimeString('en-NG', {timeZone: 'Africa/Lagos'});
    } catch (e) {
      $('dot').className = 'dot off'; $('stamp').textContent = D ? 'Refresh failed — showing last data' : 'Could not load';
      if (!D) $('notice').textContent = e.message;
      if (manual) alert(e.message);
    }
  }

  const start = () => { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS); };
  Portal.ready.then(() => {
    if (Portal.user.role !== 'admin') { document.body.classList.remove('auth-pending'); $('notice').textContent = 'This dashboard is available to administrators only.'; return; }
    ['search', 'statusFilter', 'workFilter', 'riskFilter'].forEach(id => $(id).addEventListener('input', () => D && table()));
    $('areaRows').addEventListener('click', e => { const t = e.target.closest('.area-name'); if (t) detail(t.dataset.area); });
    $('dClose').onclick = () => $('detail').classList.remove('show');
    $('detail').onclick = e => { if (e.target === $('detail')) $('detail').classList.remove('show'); };
    $('refresh').onclick = () => load(true); $('csv').onclick = () => D && csv();
    $('pageSel').onchange = () => { pageId = $('pageSel').value; load(true); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
    load(); start();
  }).catch(() => {});
})();
