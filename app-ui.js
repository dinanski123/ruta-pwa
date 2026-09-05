/* ---------- SETTINGS SHEET ---------- */
function openSettings(){
  openOverlay(`
    <div class="form-overlay" onclick="if(event.target===this) closeOverlay()">
      <div class="form-sheet">
        <h3>${t('settings')}</h3>
        <div class="field">
          <label>${t('language')}</label>
          <div class="toggle-group">
            <button class="toggle-btn ${state.settings.language==='en'?'active':''}" onclick="setLanguage('en')">EN</button>
            <button class="toggle-btn ${state.settings.language==='fil'?'active':''}" onclick="setLanguage('fil')">FIL</button>
          </div>
        </div>
        <div class="field">
          <label>${t('currency')}</label>
          <div class="toggle-group">
            <button class="toggle-btn ${state.settings.currency==='₱'?'active':''}" onclick="setCurrency('₱')">₱ PHP</button>
            <button class="toggle-btn ${state.settings.currency==='$'?'active':''}" onclick="setCurrency('$')">$ USD</button>
          </div>
        </div>
        <div class="field">
          <label>${t('theme')}</label>
          <div class="toggle-group">
            <button class="toggle-btn ${state.settings.theme==='dark'?'active':''}" onclick="setTheme('dark')">${t('dark')}</button>
            <button class="toggle-btn ${state.settings.theme==='light'?'active':''}" onclick="setTheme('light')">${t('light')}</button>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="closeOverlay()">${t('close')}</button>
        </div>
      </div>
    </div>
  `);
}

/* ---------- RENDER: DASHBOARD ---------- */
function renderHome(){
  const {avgKml, monthSpend} = computeFuelStats();
  const withStatus = state.maintenance.map(m=>({...m, ...maintenanceStatus(m)}));
  withStatus.sort((a,b)=>a.remaining-b.remaining);
  const top3 = withStatus.slice(0,3);

  return `
    <div class="hero">
      <div class="num">${currentOdo().toLocaleString('en-PH')}</div>
      <div class="label">${t('odo_label')} (km)</div>
    </div>
    <div class="stat-row">
      <div class="stat-card teal">
        <div class="v">${avgKml? avgKml.toFixed(1) : '—'}</div>
        <div class="l">${t('avg_kml')}</div>
      </div>
      <div class="stat-card amber">
        <div class="v">${fmtMoney(monthSpend)}</div>
        <div class="l">${t('month_spend')}</div>
      </div>
    </div>
    <div class="section-title">${t('upcoming_pms')}</div>
    ${top3.map(m=>pmsItemHtml(m)).join('') || `<div class="empty-state"><div class="msg">${t('no_pms')}</div></div>`}
  `;
}

/* ---------- RENDER: FUEL ---------- */
function renderFuel(){
  const sorted = [...state.fuel].sort((a,b)=> new Date(b.date)-new Date(a.date) || b.odometer-a.odometer);
  const bySortedOdo = [...state.fuel].sort((a,b)=>a.odometer-b.odometer);

  const cards = sorted.map(entry=>{
    const idx = bySortedOdo.findIndex(e=>e.id===entry.id);
    let kmlBadge = '';
    if(idx>0){
      const dist = bySortedOdo[idx].odometer - bySortedOdo[idx-1].odometer;
      if(dist>0 && entry.liters>0){
        kmlBadge = `<div class="kml-badge">${(dist/entry.liters).toFixed(1)} km/L</div>`;
      }
    }
    return `
    <div class="list-card">
      <div class="top-row">
        <div class="title">${entry.station || 'Gas station'}</div>
        <div class="amount">${fmtMoney(entry.total)}</div>
      </div>
      <div class="meta">
        <span>${entry.date}</span>
        <span>${fmtKm(entry.odometer)}</span>
        <span>${entry.liters}L @ ${fmtMoney(entry.pricePerLiter)}/L</span>
        ${entry.lat ? `<span>📍 ${t('tagged')}</span>` : ''}
      </div>
      ${kmlBadge}
    </div>`;
  }).join('');

  return `
    <div class="section-title">${t('fuel_log')} <button class="btn-add" onclick="openFuelForm()">${t('add')}</button></div>
    ${cards || `<div class="empty-state"><div class="big">⛽</div><div class="msg">${t('no_fuel')}</div></div>`}
  `;
}

/* ---------- RENDER: TRIPS ---------- */
function renderTrips(){
  const sorted = [...state.trips].sort((a,b)=> new Date(b.date)-new Date(a.date));
  const cards = sorted.map(tr=>`
    <div class="list-card">
      <div class="top-row">
        <div class="title">${tr.purpose}</div>
        <div class="amount" style="color:var(--teal)">${fmtKm(tr.distance)}</div>
      </div>
      <div class="meta">
        <span>${tr.date}</span>
        <span>${fmtKm(tr.startOdo)} → ${fmtKm(tr.endOdo)}</span>
      </div>
      ${tr.note ? `<div class="meta" style="margin-top:6px">${tr.note}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="section-title">${t('trip_log')} <button class="btn-add" onclick="openTripForm()">${t('add')}</button></div>
    ${cards || `<div class="empty-state"><div class="big">🛣️</div><div class="msg">${t('no_trips')}</div></div>`}
  `;
}

/* ---------- RENDER: PMS ---------- */
function pmsItemHtml(m){
  const {remaining,status} = m.remaining!==undefined ? m : {...m, ...maintenanceStatus(m)};
  const statusLabel = status==='overdue' ? t('status_overdue', Math.abs(remaining)) : status==='soon' ? t('status_soon', remaining) : t('status_ok', remaining);
  return `
    <div class="pms-item ${status}">
      <div>
        <div class="name">${m.name}</div>
        <div class="sub">${t('every')} ${fmtKm(m.intervalKm)} • ${t('last_done_at')} ${fmtKm(m.lastOdo)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="pms-status ${status}">${statusLabel}</div>
        <button class="done-btn" onclick="markDone('${m.id}')">${t('done')}</button>
      </div>
    </div>
  `;
}
function renderPms(){
  const withStatus = state.maintenance.map(m=>({...m, ...maintenanceStatus(m)}));
  withStatus.sort((a,b)=>a.remaining-b.remaining);
  return `
    <div class="section-title">${t('maint_schedule')} <button class="btn-add" onclick="openMaintForm()">${t('add_item')}</button></div>
    ${withStatus.map(pmsItemHtml).join('')}
  `;
}
