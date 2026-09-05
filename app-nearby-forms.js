/* ---------- RENDER: NEARBY / FUEL WATCH ---------- */
function renderNearby(){
  const stationsMap = {};
  [...state.fuel].sort((a,b)=> new Date(a.date)-new Date(b.date)).forEach(f=>{
    if(!f.station) return;
    stationsMap[f.station] = { name:f.station, price:f.pricePerLiter, date:f.date, lat:f.lat, lng:f.lng };
  });
  let stations = Object.values(stationsMap);

  let banner = '';
  if(geoState.status==='idle'){
    tryGeolocation();
    banner = `<div class="location-banner"><span>${t('getting_location')}</span></div>`;
  } else if(geoState.status==='loading'){
    banner = `<div class="location-banner"><span>${t('getting_location')}</span></div>`;
  } else if(geoState.status==='ok'){
    stations = stations.map(s=> s.lat? {...s, dist: haversine(geoState.lat, geoState.lng, s.lat, s.lng)} : s);
    stations.sort((a,b)=>{
      if(a.dist===undefined && b.dist===undefined) return new Date(b.date)-new Date(a.date);
      if(a.dist===undefined) return 1;
      if(b.dist===undefined) return -1;
      return a.dist-b.dist;
    });
    banner = `<div class="location-banner"><span>${t('sorted_by_distance')}</span></div>`;
  } else {
    stations.sort((a,b)=> new Date(b.date)-new Date(a.date));
    const msg = geoState.status==='denied' ? t('location_denied') : t('location_unavailable');
    banner = `<div class="location-banner"><span>${msg}</span><button class="retry" onclick="tryGeolocation()">${t('retry')}</button></div>`;
  }

  const cards = stations.map(s=>`
    <div class="list-card station-card">
      <div class="top-row">
        <div class="title">${s.name}</div>
        ${s.dist!==undefined ? `<div class="dist">${s.dist.toFixed(1)} km</div>` : ''}
      </div>
      <div class="meta">
        <span>${t('last_price')} ${fmtMoney(s.price)}/L</span>
        <span>${t('last_visit')} ${s.date}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="section-title">${t('fuel_watch')}</div>
    ${banner}
    ${cards || `<div class="empty-state"><div class="big">📍</div><div class="msg">${t('no_stations')}</div></div>`}
  `;
}

/* ---------- FORMS ---------- */
function openFuelForm(){
  openOverlay(`
    <div class="form-overlay" onclick="if(event.target===this) closeOverlay()">
      <div class="form-sheet">
        <h3>${t('add_fuel_title')}</h3>
        <div class="geo-btn" id="geoTagBtn" onclick="geoTagStation()">${t('tag_location_btn')}</div>
        <div class="field"><label>${t('date')}</label><input id="f_date" type="date" value="${todayStr()}"></div>
        <div class="field"><label>${t('station_name')}</label><input id="f_station" type="text" placeholder="${t('station_placeholder')}"></div>
        <div class="field"><label>${t('odo_now')}</label><input id="f_odo" type="number" value="${currentOdo()||''}"></div>
        <div class="field-row">
          <div class="field"><label>${t('liters')}</label><input id="f_liters" type="number" step="0.01" placeholder="0.00"></div>
          <div class="field"><label>${t('price_per_liter')}</label><input id="f_price" type="number" step="0.01" placeholder="0.00"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="saveFuelForm()">${t('save')}</button>
        </div>
      </div>
    </div>
  `);
}
let pendingGeo = null;
function geoTagStation(){
  const btn = document.getElementById('geoTagBtn');
  btn.textContent = t('geo_getting');
  if(!navigator.geolocation){ btn.textContent=t('geo_none'); return; }
  navigator.geolocation.getCurrentPosition(
    pos=>{ pendingGeo = {lat:pos.coords.latitude, lng:pos.coords.longitude}; btn.textContent=t('geo_tagged'); },
    err=>{ pendingGeo=null; btn.textContent=t('geo_unavailable'); },
    {timeout:5500}
  );
}
async function saveFuelForm(){
  const date = document.getElementById('f_date').value || todayStr();
  const station = document.getElementById('f_station').value || 'Gas station';
  const odo = Number(document.getElementById('f_odo').value)||0;
  const liters = Number(document.getElementById('f_liters').value)||0;
  const price = Number(document.getElementById('f_price').value)||0;
  const entry = { id:uid(), date, station, odometer:odo, liters, pricePerLiter:price, total: liters*price, lat: pendingGeo?.lat, lng: pendingGeo?.lng };
  state.fuel.push(entry);
  if(odo > currentOdo()) state.settings.odometer = odo;
  pendingGeo = null;
  await saveData();
  closeOverlay();
  render();
}

function openTripForm(){
  openOverlay(`
    <div class="form-overlay" onclick="if(event.target===this) closeOverlay()">
      <div class="form-sheet">
        <h3>${t('add_trip_title')}</h3>
        <div class="field"><label>${t('date')}</label><input id="t_date" type="date" value="${todayStr()}"></div>
        <div class="field-row">
          <div class="field"><label>${t('start_odo')}</label><input id="t_start" type="number" value="${currentOdo()||''}"></div>
          <div class="field"><label>${t('end_odo')}</label><input id="t_end" type="number"></div>
        </div>
        <div class="field"><label>${t('purpose')}</label>
          <select id="t_purpose">
            <option>${t('purpose_work')}</option>
            <option>${t('purpose_personal')}</option>
            <option>${t('purpose_errand')}</option>
            <option>${t('purpose_other')}</option>
          </select>
        </div>
        <div class="field"><label>${t('note_optional')}</label><input id="t_note" type="text" placeholder="${t('note_placeholder')}"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="saveTripForm()">${t('save')}</button>
        </div>
      </div>
    </div>
  `);
}
async function saveTripForm(){
  const date = document.getElementById('t_date').value || todayStr();
  const start = Number(document.getElementById('t_start').value)||0;
  const end = Number(document.getElementById('t_end').value)||0;
  const purpose = document.getElementById('t_purpose').value;
  const note = document.getElementById('t_note').value;
  const distance = Math.max(0, end-start);
  state.trips.push({ id:uid(), date, startOdo:start, endOdo:end, distance, purpose, note });
  if(end > currentOdo()) state.settings.odometer = end;
  await saveData();
  closeOverlay();
  render();
}

function openMaintForm(){
  openOverlay(`
    <div class="form-overlay" onclick="if(event.target===this) closeOverlay()">
      <div class="form-sheet">
        <h3>${t('add_maint_title')}</h3>
        <div class="field"><label>${t('item_name')}</label><input id="m_name" type="text" placeholder="${t('item_name_placeholder')}"></div>
        <div class="field"><label>${t('interval_km')}</label><input id="m_interval" type="number" placeholder="5000"></div>
        <div class="field"><label>${t('last_done_odo')}</label><input id="m_last" type="number" value="${currentOdo()||0}"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="saveMaintForm()">${t('save')}</button>
        </div>
      </div>
    </div>
  `);
}
async function saveMaintForm(){
  const name = document.getElementById('m_name').value || 'Maintenance item';
  const interval = Number(document.getElementById('m_interval').value)||5000;
  const last = Number(document.getElementById('m_last').value)||0;
  state.maintenance.push({id:uid(), name, intervalKm:interval, lastOdo:last});
  await saveData();
  closeOverlay();
  render();
}
async function markDone(id){
  const item = state.maintenance.find(m=>m.id===id);
  if(item){ item.lastOdo = currentOdo(); await saveData(); render(); }
}
