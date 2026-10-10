window.Portal = {
  user:null,
  async api(action, options={}) {
    const response = await fetch('/api/reporting?action='+action,{credentials:'same-origin',cache:'no-store',...options});
    const data = await response.json();
    if (!response.ok) {
      if (response.status===401 || response.status===403) { document.body.classList.add('auth-pending'); location.replace('/login.html'); }
      // A removed report should not trap the browser in a stale selection.
      if (response.status===404 && action.startsWith('data&report=')) {sessionStorage.removeItem('mancomReport'); return this.api('data');}
      throw new Error(data.error || 'Could not load the report.');
    }
    return data;
  },
  mapRows(rows, mapping) {
    if (!mapping) return rows;
    let map; try {map=JSON.parse(mapping);} catch {throw new Error('Column Map must be valid JSON.');}
    if (!map || typeof map!=='object' || Array.isArray(map)) throw new Error('Column Map must be an object.');
    const heads=[...(rows[0] || [])];
    for (const [target,source] of Object.entries(map)) {
      const i=heads.findIndex(h=>String(h).trim().toLowerCase()===String(source).trim().toLowerCase());
      if (i<0) throw new Error('Mapped column not found: '+source);
      heads[i]=target;
    }
    if (new Set(heads.map(h=>String(h).trim().toLowerCase())).size!==heads.length) throw new Error('Column Map creates duplicate headers.');
    return [heads,...rows.slice(1)];
  },
  scope(rows) {
    if (!this.user) throw new Error('Sign in first.');
    const i=(rows[0] || []).findIndex(h=>String(h).trim().toLowerCase()==='area');
    if (i<0) throw new Error('This worksheet needs an Area column.');
    if (this.user.role==='admin') return rows;
    const norm=v=>String(v || '').trim().toLowerCase().replace(/\s+/g,' ');
    return [rows[0],...rows.slice(1).filter(r=>norm(r[i])===norm(this.user.area))];
  },
  details(rows) {
    let el=document.getElementById('response-detail');
    if (!el) { el=document.createElement('details'); el.id='response-detail'; document.getElementById('drop').before(el); }
    el.replaceChildren();
    const summary=document.createElement('summary'); summary.textContent=`Submission details · ${Math.max(0,rows.length-1)} rows`; el.append(summary);
    if (!rows.length) return;
    const note=document.createElement('p'); note.textContent='All submitted fields for this report. The cards and dashboard summarise the first submitted response per location; additional rows remain visible here.'; el.append(note);
    const wrap=document.createElement('div'); wrap.className='detail-scroll';
    const table=document.createElement('table');
    rows.forEach((row,i)=>{const tr=document.createElement('tr'); rows[0].forEach((_,j)=>{const td=document.createElement(i===0?'th':'td');td.textContent=row[j]??'';tr.append(td);});table.append(tr);});
    wrap.append(table);el.append(wrap);
  }
};
Portal.ready = new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve)).then(async()=>{
  try {
    const {user}=await Portal.api('me'); Portal.user=user;
    document.getElementById('identity').textContent=user.name+' · '+(user.role==='admin'?'Administrator · All areas':user.area+' · '+user.role.replaceAll('_',' '));
    document.getElementById('signout').onclick=async()=>{try {await Portal.api('logout',{method:'POST'});sessionStorage.removeItem('mancomReport');location.replace('/login.html');}catch(e){alert(e.message);}};
    document.body.classList.remove('auth-pending');
  } catch(e) {
    if (!document.getElementById('auth-error')) {
      const box=document.createElement('div');box.id='auth-error';box.className='auth-error';
      box.textContent=e.message+' ';const link=document.createElement('a');link.href='/login.html';link.textContent='Return to sign in';box.append(link);document.body.append(box);
    }
    throw e;
  }
});
// Revalidate sessions after browser back/forward cache restoration.
window.addEventListener('pageshow',e=>{if(e.persisted) location.reload();});
