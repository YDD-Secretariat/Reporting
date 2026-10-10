window.Portal = {
  user: null,
  async api(action, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const qs = new URLSearchParams({ action, ...(options.query || {}) });
    const res = await fetch('/api/reporting?' + qs, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(options.body || {}) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  filterByArea(rows) {
    if (!this.user || this.user.role === 'admin' || !rows?.length) return rows || [];
    const heads = rows[0].map(h => String(h || '').trim().toLowerCase());
    const i = heads.findIndex(h => h === 'area');
    if (i < 0) return rows;
    const norm = v => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return [rows[0], ...rows.slice(1).filter(r => norm(r[i]) === norm(this.user.area))];
  },
  details(rows) {
    let el = document.getElementById('response-detail');
    if (!el) {
      el = document.createElement('details');
      el.id = 'response-detail';
      const host = document.getElementById('drop') || document.getElementById('main');
      if (host) host.before(el);
      else document.body.append(el);
    }
    el.replaceChildren();
    const summary = document.createElement('summary');
    summary.textContent = `Submission details · ${Math.max(0, rows.length - 1)} rows`;
    el.append(summary);
    if (!rows.length) return;
    const note = document.createElement('p');
    note.textContent = 'All submitted fields. Cards and charts summarise first response per location where applicable; every row remains here.';
    el.append(note);
    const wrap = document.createElement('div');
    wrap.className = 'detail-scroll';
    const table = document.createElement('table');
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      (rows[0] || []).forEach((_, j) => {
        const td = document.createElement(i === 0 ? 'th' : 'td');
        td.textContent = row[j] ?? '';
        tr.append(td);
      });
      table.append(tr);
    });
    wrap.append(table);
    el.append(wrap);
  }
};

Portal.ready = new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve)).then(async () => {
  try {
    const { user } = await Portal.api('me');
    Portal.user = user;
    const identity = document.getElementById('identity');
    if (identity) {
      identity.textContent = user.name + ' · ' +
        (user.role === 'admin' ? 'Administrator · All areas' : user.area + ' · ' + user.role.replaceAll('_', ' '));
    }
    const signout = document.getElementById('signout');
    if (signout) {
      signout.onclick = async () => {
        try {
          await Portal.api('logout', { method: 'POST' });
          sessionStorage.removeItem('mancomReport');
          sessionStorage.removeItem('mancomMode');
          location.replace('/login.html');
        } catch (e) { alert(e.message); }
      };
    }
    document.body.classList.remove('auth-pending');
  } catch (e) {
    if (!document.getElementById('auth-error')) {
      const box = document.createElement('div');
      box.id = 'auth-error';
      box.className = 'auth-error';
      box.textContent = e.message + ' ';
      const link = document.createElement('a');
      link.href = '/login.html';
      link.textContent = 'Return to sign in';
      box.append(link);
      document.body.append(box);
    }
    throw e;
  }
});
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
