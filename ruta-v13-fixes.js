(() => {
  'use strict';
  if (window.__RUTA_V13_LOADED) return;
  window.__RUTA_V13_LOADED = true;

  const VERSION = '1.3.1';
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  const FLEET_KEY = 'ruta-fleet-v2';
  const FUEL_QUEUE_KEY = 'ruta-v131-fuel-upserts';
  let fuelClient = null;
  let flushingFuel = false;

  const TXT = {
    en: {
      odo:'Current odometer (km)', price:'Price per liter', total:'Total purchase', liters:'Calculated liters',
      add:'Add fuel log', edit:'Edit fuel log', editBtn:'Edit', remove:'Remove',
      invalid:'Enter a valid odometer, price per liter, and total purchase greater than zero.',
      noFuel:'No fuel entries yet. Add odometer, price per liter, and total purchase.',
      stale:'A newer cloud copy exists. RUTA kept the newer cloud entry.'
    },
    fil: {
      odo:'Kasalukuyang odometer (km)', price:'Presyo kada litro', total:'Kabuuang binayaran', liters:'Kalkuladong litro',
      add:'Magdagdag ng fuel log', edit:'I-edit ang fuel log', editBtn:'I-edit', remove:'Alisin',
      invalid:'Maglagay ng valid na odometer, presyo kada litro, at kabuuang binayaran na higit sa zero.',
      noFuel:'Wala pang fuel entry. Idagdag ang odometer, presyo kada litro, at kabuuang binayaran.',
      stale:'May mas bagong cloud copy. Pinanatili ng RUTA ang mas bagong cloud entry.'
    }
  };

  const lang = () => state?.settings?.language === 'en' ? 'en' : 'fil';
  const tx = key => TXT[lang()][key] || TXT.en[key] || key;
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const litersFor = entry => num(entry?.liters) > 0
    ? num(entry.liters)
    : (num(entry?.total) > 0 && num(entry?.pricePerLiter) > 0 ? num(entry.total) / num(entry.pricePerLiter) : 0);

  function fleet(){
    try { return JSON.parse(localStorage.getItem(FLEET_KEY) || 'null'); }
    catch { return null; }
  }
  function activeVehicleId(){ return fleet()?.activeVehicleId || null; }
  function activeVehicleRecord(){
    const f = fleet();
    return f?.vehicles?.[f?.activeVehicleId] || null;
  }
  function monthKey(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  }
  function isNewer(remote, base){
    if (!remote || !base) return false;
    const a = Date.parse(remote), b = Date.parse(base);
    return Number.isFinite(a) && Number.isFinite(b) && a > b + 5;
  }

  // Fuel stats: distance between fill-ups divided by liters bought at the newer fill-up.
  computeFuelStats = function(){
    const rows = [...(state?.fuel || [])]
      .filter(entry => num(entry.odometer) >= 0)
      .sort((a,b) => num(a.odometer) - num(b.odometer) || String(a.date || '').localeCompare(String(b.date || '')));
    const values = [];
    for (let i = 1; i < rows.length; i++) {
      const distance = num(rows[i].odometer) - num(rows[i - 1].odometer);
      const liters = litersFor(rows[i]);
      if (distance > 0 && liters > 0) values.push(distance / liters);
    }
    const last5 = values.slice(-5);
    const avgKml = last5.length ? last5.reduce((sum,v) => sum + v, 0) / last5.length : null;
    const mk = monthKey();
    const monthSpend = (state?.fuel || [])
      .filter(entry => String(entry.date || '').slice(0,7) === mk)
      .reduce((sum,entry) => sum + num(entry.total), 0);
    return {avgKml, monthSpend};
  };

  function entryKml(entry){
    const rows = [...(state?.fuel || [])]
      .sort((a,b) => num(a.odometer) - num(b.odometer) || String(a.date || '').localeCompare(String(b.date || '')));
    const index = rows.findIndex(row => String(row.id) === String(entry.id));
    if (index < 1) return null;
    const distance = num(rows[index].odometer) - num(rows[index - 1].odometer);
    const liters = litersFor(rows[index]);
    return distance > 0 && liters > 0 ? distance / liters : null;
  }

  renderFuel = function(){
    const rows = [...(state?.fuel || [])]
      .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || num(b.odometer) - num(a.odometer));
    const cards = rows.map(entry => {
      const liters = litersFor(entry);
      const kml = entryKml(entry);
      const id = esc(entry.id);
      return `<div class="list-card">
        <div class="top-row"><div class="title">${esc(fmtKm(entry.odometer))}</div><div class="amount">${esc(fmtMoney(entry.total))}</div></div>
        <div class="meta"><span>${esc(entry.date || '')}</span><span>${esc(fmtMoney(entry.pricePerLiter))}/L</span>${liters > 0 ? `<span>${liters.toFixed(2)} L</span>` : ''}</div>
        ${kml ? `<div class="kml-badge">${kml.toFixed(1)} km/L</div>` : ''}
        <div class="ruta-card-actions" style="gap:8px"><button class="done-btn" onclick="rutaEditFuel('${id}')">${tx('editBtn')}</button><button class="done-btn ruta-danger" onclick="rutaRemoveFuel('${id}')">${tx('remove')}</button></div>
      </div>`;
    }).join('');
    return `<div class="section-title">${t('fuel_log')} <button class="btn-add" onclick="openFuelForm()">${t('add')}</button></div>${cards || `<div class="empty-state"><div class="big">⛽</div><div class="msg">${tx('noFuel')}</div></div>`}`;
  };

  openFuelForm = function(id = ''){
    const item = id ? (state?.fuel || []).find(entry => String(entry.id) === String(id)) : null;
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet">
      <h3>${item ? tx('edit') : tx('add')}</h3>
      <div class="field"><label>${tx('odo')}</label><input id="v131_odo" type="number" min="0" step="1" inputmode="decimal" value="${item ? num(item.odometer) : (num(currentOdo()) || '')}"></div>
      <div class="field"><label>${tx('price')}</label><input id="v131_price" type="number" min="0" step="0.01" inputmode="decimal" value="${item ? num(item.pricePerLiter) : ''}"></div>
      <div class="field"><label>${tx('total')}</label><input id="v131_total" type="number" min="0" step="0.01" inputmode="decimal" value="${item ? num(item.total) : ''}"></div>
      <div id="v131_liters" class="ruta-plan-note"></div>
      <div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button><button class="btn btn-primary" onclick="rutaSaveFuelSimple('${esc(id)}')">${t('save')}</button></div>
    </div></div>`);
    const refresh = () => {
      const price = num(document.getElementById('v131_price')?.value);
      const total = num(document.getElementById('v131_total')?.value);
      const target = document.getElementById('v131_liters');
      if (target) target.textContent = price > 0 && total > 0 ? `${tx('liters')}: ${(total / price).toFixed(2)} L` : '';
    };
    document.getElementById('v131_price')?.addEventListener('input', refresh);
    document.getElementById('v131_total')?.addEventListener('input', refresh);
    refresh();
  };
  window.rutaEditFuel = id => openFuelForm(id);

  async function supabaseClient(){
    if (fuelClient) return fuelClient;
    for (let i = 0; i < 80 && !window.supabase; i++) await new Promise(resolve => setTimeout(resolve, 100));
    if (!window.supabase) return null;
    fuelClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return fuelClient;
  }
  async function sessionUser(){
    const sb = await supabaseClient();
    if (!sb) return null;
    const {data,error} = await sb.auth.getSession();
    if (error) throw error;
    return data?.session?.user || null;
  }
  function loadFuelQueue(){
    try {
      const rows = JSON.parse(localStorage.getItem(FUEL_QUEUE_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }
  function saveFuelQueue(rows){
    try { localStorage.setItem(FUEL_QUEUE_KEY, JSON.stringify(rows)); }
    catch {}
  }
  function queueFuel(entry, userId, vehicleId){
    const key = `${userId}|${vehicleId}|${entry.id}`;
    let rows = loadFuelQueue().filter(row => `${row.userId}|${row.vehicleId}|${row.entry?.id}` !== key);
    rows.push({userId, vehicleId, entry:{...entry}, queuedAt:new Date().toISOString()});
    saveFuelQueue(rows);
  }
  function fuelPayload(entry, userId, vehicleId){
    return {
      id:String(entry.id), user_id:userId, vehicle_id:vehicleId, date:entry.date || todayStr(), station:entry.station || '',
      odometer:num(entry.odometer), liters:litersFor(entry), price_per_liter:num(entry.pricePerLiter), total:num(entry.total),
      lat:entry.lat ?? null, lng:entry.lng ?? null, deleted_at:null
    };
  }
  async function ensureVehicle(sb, user, vehicleId){
    const rec = activeVehicleRecord() || {};
    const {data:remote,error} = await sb.from('ruta_vehicles').select('id,odometer,archived_at').eq('id', vehicleId).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (remote?.archived_at) throw new Error('Vehicle is archived in cloud');
    if (remote) return;
    const payload = {
      id:vehicleId, user_id:user.id, name:rec.name || 'My vehicle', vehicle_type:rec.vehicleType || 'car', year:rec.year || null,
      make:rec.make || null, model:rec.model || null, trim:rec.trim || null, engine:rec.engine || null, transmission:rec.transmission || null,
      plan_source:rec.planSource || null, odometer:num(state?.settings?.odometer), currency:state?.settings?.currency || '₱',
      language:state?.settings?.language === 'en' ? 'en' : 'fil', theme:state?.settings?.theme === 'light' ? 'light' : 'dark', archived_at:null
    };
    const {error:insertError} = await sb.from('ruta_vehicles').insert(payload);
    if (insertError) throw insertError;
  }
  async function upsertFuel(entry, user, vehicleId){
    const sb = await supabaseClient();
    if (!sb) throw new Error('Supabase client unavailable');
    await ensureVehicle(sb, user, vehicleId);
    const {data:remote,error:readError} = await sb.from('ruta_fuel_entries').select('id,updated_at,deleted_at').eq('id', String(entry.id)).eq('user_id', user.id).maybeSingle();
    if (readError) throw readError;
    if (remote?.deleted_at || (remote && isNewer(remote.updated_at, entry.updatedAt))) {
      if (remote?.deleted_at) state.fuel = (state.fuel || []).filter(row => String(row.id) !== String(entry.id));
      await saveData();
      if (typeof window.rutaCloudSyncNow === 'function') setTimeout(() => window.rutaCloudSyncNow(), 0);
      if (!remote?.deleted_at) alert(tx('stale'));
      return true;
    }
    const {data,error} = await sb.from('ruta_fuel_entries').upsert(fuelPayload(entry, user.id, vehicleId), {onConflict:'id'}).select('updated_at').single();
    if (error) throw error;
    const local = (state.fuel || []).find(row => String(row.id) === String(entry.id));
    if (local) local.updatedAt = data?.updated_at || local.updatedAt || null;
    await saveData();
    return true;
  }
  async function flushFuelQueue(){
    if (flushingFuel || navigator.onLine === false) return false;
    const rows = loadFuelQueue();
    if (!rows.length) return true;
    flushingFuel = true;
    try {
      const user = await sessionUser();
      if (!user) return false;
      const keep = [];
      for (const row of rows) {
        if (row.userId !== user.id) { keep.push(row); continue; }
        try { await upsertFuel(row.entry, user, row.vehicleId); }
        catch { keep.push(row); }
      }
      saveFuelQueue(keep);
      return !keep.some(row => row.userId === user.id);
    } finally {
      flushingFuel = false;
    }
  }

  window.rutaSaveFuelSimple = async id => {
    const odo = num(document.getElementById('v131_odo')?.value);
    const price = num(document.getElementById('v131_price')?.value);
    const total = num(document.getElementById('v131_total')?.value);
    if (odo < 0 || price <= 0 || total <= 0) { alert(tx('invalid')); return; }

    let entry = (state.fuel || []).find(row => String(row.id) === String(id));
    if (entry) {
      entry.odometer = odo;
      entry.pricePerLiter = price;
      entry.total = total;
      entry.liters = total / price;
    } else {
      entry = {id:uid(), date:todayStr(), station:'', odometer:odo, liters:total / price, pricePerLiter:price, total, lat:null, lng:null, updatedAt:null};
      state.fuel.push(entry);
    }
    if (odo > num(currentOdo())) state.settings.odometer = odo;
    await saveData();
    closeOverlay();
    render();

    const vehicleId = activeVehicleId();
    if (!vehicleId) return;
    try {
      const user = await sessionUser();
      if (!user) return;
      if (navigator.onLine === false) { queueFuel(entry, user.id, vehicleId); return; }
      await upsertFuel(entry, user, vehicleId);
    } catch {
      try {
        const user = await sessionUser();
        if (user) queueFuel(entry, user.id, vehicleId);
      } catch {}
    }
  };

  // Keep the original cloud engine authoritative. v1.3.1 only flushes its small
  // fuel-upsert queue before asking the existing cloud-sync.js engine to reconcile.
  const originalCloudSyncNow = window.rutaCloudSyncNow;
  if (typeof originalCloudSyncNow === 'function') {
    window.rutaCloudSyncNow = async (...args) => {
      await flushFuelQueue().catch(() => false);
      return originalCloudSyncNow(...args);
    };
  }

  const originalSignIn = window.rutaCloudSignIn;
  if (typeof originalSignIn === 'function') {
    window.rutaCloudSignIn = async (...args) => {
      const result = await originalSignIn(...args);
      await flushFuelQueue().catch(() => false);
      return result;
    };
  }
  const originalSignUp = window.rutaCloudSignUp;
  if (typeof originalSignUp === 'function') {
    window.rutaCloudSignUp = async (...args) => {
      const result = await originalSignUp(...args);
      await flushFuelQueue().catch(() => false);
      return result;
    };
  }

  const originalAbout = window.rutaOpenAbout;
  if (typeof originalAbout === 'function') {
    window.rutaOpenAbout = (...args) => {
      const result = originalAbout(...args);
      setTimeout(() => {
        const badge = document.querySelector('.ruta-version');
        if (badge) badge.textContent = `v${VERSION}`;
      }, 0);
      return result;
    };
  }

  async function flushThenSync(){
    const ok = await flushFuelQueue().catch(() => false);
    if (ok && typeof originalCloudSyncNow === 'function') {
      try { await originalCloudSyncNow(); } catch {}
    }
  }
  window.addEventListener('online', () => { flushThenSync(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && loadFuelQueue().length) flushThenSync();
  });
  setTimeout(() => { if (loadFuelQueue().length) flushFuelQueue(); }, 1200);
})();
