(() => {
  'use strict';

  const VERSION = '1.3.0';
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  const FLEET_KEY = 'ruta-fleet-v2';
  const QUEUE_KEY = 'ruta-v13-sync-queue';

  let v13Client = null;
  let v13Status = '';
  let syncBusy = false;
  let lastAutoSync = 0;

  const tx = {
    en: {
      currentOdo: 'Current odometer (km)',
      price: 'Price per liter',
      total: 'Total purchase',
      liters: 'Calculated liters',
      addTitle: 'Add fuel log',
      editTitle: 'Edit fuel log',
      edit: 'Edit',
      remove: 'Remove',
      invalid: 'Enter an odometer, price per liter, and total purchase greater than zero.',
      removeConfirm: 'Remove this fuel log?',
      syncing: 'Syncing…',
      synced: 'Cloud sync verified',
      pending: 'Saved locally — will sync when online',
      signedOut: 'Sign in to use cloud sync',
      syncError: 'Cloud sync needs attention',
      engine: 'RUTA sync engine v1.3',
      noFuel: 'No fuel entries yet. Add current odometer, price per liter, and total purchase.'
    },
    fil: {
      currentOdo: 'Kasalukuyang odometer (km)',
      price: 'Presyo kada litro',
      total: 'Kabuuang binayaran',
      liters: 'Kalkuladong litro',
      addTitle: 'Magdagdag ng fuel log',
      editTitle: 'I-edit ang fuel log',
      edit: 'I-edit',
      remove: 'Alisin',
      invalid: 'Ilagay ang odometer, presyo kada litro, at kabuuang binayaran na higit sa zero.',
      removeConfirm: 'Alisin ang fuel log na ito?',
      syncing: 'Nagsi-sync…',
      synced: 'Na-verify ang cloud sync',
      pending: 'Naka-save locally — magsi-sync kapag online',
      signedOut: 'Mag-sign in para gumamit ng cloud sync',
      syncError: 'Kailangang tingnan ang cloud sync',
      engine: 'RUTA sync engine v1.3',
      noFuel: 'Wala pang fuel entry. Idagdag ang odometer, presyo kada litro, at kabuuang binayaran.'
    }
  };

  function lang(){ return state?.settings?.language === 'en' ? 'en' : 'fil'; }
  function x(k){ return tx[lang()][k] || tx.en[k] || k; }
  function n(v){ const z = Number(v); return Number.isFinite(z) ? z : 0; }
  function isoNow(){ return new Date().toISOString(); }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fuelLiters(entry){
    const stored = n(entry?.liters);
    if(stored > 0) return stored;
    const total = n(entry?.total), price = n(entry?.pricePerLiter);
    return total > 0 && price > 0 ? total / price : 0;
  }
  function monthKeyLocal(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function currentVehicleId(){
    try{
      const f = JSON.parse(localStorage.getItem(FLEET_KEY) || 'null');
      return f?.activeVehicleId || null;
    }catch(e){ return null; }
  }
  function currentVehicleRecord(){
    try{
      const f = JSON.parse(localStorage.getItem(FLEET_KEY) || 'null');
      return f?.vehicles?.[f?.activeVehicleId] || null;
    }catch(e){ return null; }
  }

  // ----- Fuel calculations -----
  computeFuelStats = function(){
    const valid = [...(state?.fuel || [])]
      .filter(e => n(e.odometer) >= 0)
      .sort((a,b) => n(a.odometer)-n(b.odometer) || String(a.date||'').localeCompare(String(b.date||'')));

    const kmls = [];
    for(let i=1;i<valid.length;i++){
      const dist = n(valid[i].odometer) - n(valid[i-1].odometer);
      const liters = fuelLiters(valid[i]);
      if(dist > 0 && liters > 0) kmls.push(dist / liters);
    }
    const last5 = kmls.slice(-5);
    const avgKml = last5.length ? last5.reduce((a,b)=>a+b,0) / last5.length : null;
    const mk = monthKeyLocal();
    const monthSpend = (state?.fuel || [])
      .filter(e => String(e.date || '').slice(0,7) === mk)
      .reduce((sum,e) => sum + n(e.total), 0);
    return {avgKml, monthSpend};
  };

  function intervalKml(entry){
    const sorted = [...(state?.fuel || [])].sort((a,b)=>n(a.odometer)-n(b.odometer) || String(a.date||'').localeCompare(String(b.date||'')));
    const idx = sorted.findIndex(e => String(e.id) === String(entry.id));
    if(idx <= 0) return null;
    const dist = n(sorted[idx].odometer) - n(sorted[idx-1].odometer);
    const liters = fuelLiters(sorted[idx]);
    return dist > 0 && liters > 0 ? dist / liters : null;
  }

  renderFuel = function(){
    const rows = [...(state?.fuel || [])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || n(b.odometer)-n(a.odometer));
    const cards = rows.map(entry => {
      const liters = fuelLiters(entry);
      const kml = intervalKml(entry);
      return `<div class="list-card">
        <div class="top-row">
          <div class="title">${escapeHtml(fmtKm(entry.odometer))}</div>
          <div class="amount">${escapeHtml(fmtMoney(entry.total))}</div>
        </div>
        <div class="meta">
          <span>${escapeHtml(entry.date || '')}</span>
          <span>${escapeHtml(fmtMoney(entry.pricePerLiter))}/L</span>
          ${liters>0?`<span>${liters.toFixed(2)} L</span>`:''}
        </div>
        ${kml?`<div class="kml-badge">${kml.toFixed(1)} km/L</div>`:''}
        <div class="ruta-card-actions" style="gap:8px">
          <button class="done-btn" onclick="rutaEditFuel('${escapeHtml(entry.id)}')">${x('edit')}</button>
          <button class="done-btn ruta-danger" onclick="rutaRemoveFuel('${escapeHtml(entry.id)}')">${x('remove')}</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="section-title">${t('fuel_log')} <button class="btn-add" onclick="openFuelForm()">${t('add')}</button></div>${cards || `<div class="empty-state"><div class="big">⛽</div><div class="msg">${x('noFuel')}</div></div>`}`;
  };

  openFuelForm = function(id=''){
    const item = id ? (state?.fuel || []).find(e=>String(e.id)===String(id)) : null;
    const odo = item ? n(item.odometer) : n(currentOdo());
    const price = item ? n(item.pricePerLiter) : 0;
    const total = item ? n(item.total) : 0;
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet">
      <h3>${item?x('editTitle'):x('addTitle')}</h3>
      <div class="field"><label>${x('currentOdo')}</label><input id="v13_f_odo" type="number" min="0" step="1" value="${odo||''}" inputmode="decimal"></div>
      <div class="field"><label>${x('price')}</label><input id="v13_f_price" type="number" min="0" step="0.01" value="${price||''}" inputmode="decimal"></div>
      <div class="field"><label>${x('total')}</label><input id="v13_f_total" type="number" min="0" step="0.01" value="${total||''}" inputmode="decimal"></div>
      <div id="v13_f_liters" class="ruta-plan-note"></div>
      <div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button><button class="btn btn-primary" onclick="rutaSaveFuelSimple('${escapeHtml(id)}')">${t('save')}</button></div>
    </div></div>`);
    const refresh = ()=>{
      const p=n(document.getElementById('v13_f_price')?.value), total=n(document.getElementById('v13_f_total')?.value);
      const el=document.getElementById('v13_f_liters'); if(el)el.textContent=p>0&&total>0?`${x('liters')}: ${(total/p).toFixed(2)} L`:'';
    };
    document.getElementById('v13_f_price')?.addEventListener('input',refresh);
    document.getElementById('v13_f_total')?.addEventListener('input',refresh);
    refresh();
  };
  window.rutaEditFuel = id => openFuelForm(id);

  // ----- Lightweight persistent sync queue -----
  function loadQueue(){
    try{ const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]'); return Array.isArray(q)?q:[]; }catch(e){ return []; }
  }
  function saveQueue(q){ try{ localStorage.setItem(QUEUE_KEY,JSON.stringify(q)); }catch(e){} }
  function queueKey(op){ return `${op.type}|${op.vehicleId||''}|${op.id||''}`; }
  function queueOp(op){
    let q=loadQueue(); const key=queueKey(op);
    q=q.filter(v=>queueKey(v)!==key); q.push({...op,queuedAt:isoNow()}); saveQueue(q); updateCloudStatus(x('pending'));
  }

  async function waitSupabase(){
    if(window.supabase) return window.supabase;
    for(let i=0;i<100;i++){
      await new Promise(r=>setTimeout(r,100));
      if(window.supabase) return window.supabase;
    }
    throw new Error('Supabase client did not load');
  }
  async function client(){
    if(v13Client) return v13Client;
    const lib=await waitSupabase();
    v13Client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return v13Client;
  }
  async function authUser(){
    const sb=await client(); const {data,error}=await sb.auth.getSession(); if(error)throw error; return data?.session?.user || null;
  }

  function fuelRow(entry,userId,vehicleId){
    const price=n(entry.pricePerLiter), total=n(entry.total), liters=fuelLiters(entry);
    return {id:String(entry.id),user_id:userId,vehicle_id:vehicleId,date:entry.date||todayStr(),station:entry.station||null,odometer:n(entry.odometer),liters,price_per_liter:price,total,lat:entry.lat??null,lng:entry.lng??null,deleted_at:null};
  }
  function maintRow(entry,userId,vehicleId){
    return {id:String(entry.id),user_id:userId,vehicle_id:vehicleId,name:entry.name||'Maintenance item',interval_km:Math.max(1,n(entry.intervalKm)||5000),last_odo:Math.max(0,n(entry.lastOdo)),source:entry.source||'custom',source_note:entry.sourceNote||null,template_key:entry.templateKey||null,deleted_at:null};
  }

  async function ensureVehicle(sb,u,vid){
    if(!vid) throw new Error('No active vehicle');
    const rec=currentVehicleRecord()||{};
    const {data:remote,error}=await sb.from('ruta_vehicles').select('id,odometer,archived_at').eq('id',vid).eq('user_id',u.id).maybeSingle();
    if(error)throw error;
    const payload={name:rec.name||'My vehicle',vehicle_type:rec.vehicleType||'car',year:rec.year||null,make:rec.make||null,model:rec.model||null,trim:rec.trim||null,engine:rec.engine||null,transmission:rec.transmission||null,plan_source:rec.planSource||null,odometer:Math.max(n(state?.settings?.odometer),n(remote?.odometer)),currency:state?.settings?.currency||'₱',language:state?.settings?.language==='en'?'en':'fil',theme:state?.settings?.theme==='light'?'light':'dark',archived_at:null};
    if(remote){ const {error:e}=await sb.from('ruta_vehicles').update(payload).eq('id',vid).eq('user_id',u.id); if(e)throw e; }
    else { const {error:e}=await sb.from('ruta_vehicles').insert({id:vid,user_id:u.id,...payload}); if(e)throw e; }
  }

  function updateLocalFuelStamp(id,stamp){
    const e=(state?.fuel||[]).find(v=>String(v.id)===String(id)); if(e)e.updatedAt=stamp||e.updatedAt||null;
  }
  function updateLocalMaintStamp(id,stamp){
    const e=(state?.maintenance||[]).find(v=>String(v.id)===String(id)); if(e)e.updatedAt=stamp||e.updatedAt||null;
  }

  async function flushQueue(){
    if(typeof navigator!=='undefined' && navigator.onLine===false) return false;
    let q=loadQueue(); if(!q.length)return true;
    const sb=await client(), u=await authUser(); if(!u){ updateCloudStatus(x('signedOut')); return false; }
    const keep=[];
    for(const op of q){
      try{
        await ensureVehicle(sb,u,op.vehicleId);
        if(op.type==='fuel-upsert'){
          const {data,error}=await sb.from('ruta_fuel_entries').upsert(fuelRow(op.entry,u.id,op.vehicleId),{onConflict:'id'}).select('updated_at').single();
          if(error)throw error; updateLocalFuelStamp(op.id,data?.updated_at);
        }else if(op.type==='fuel-delete'){
          const {error}=await sb.from('ruta_fuel_entries').update({deleted_at:op.deletedAt||isoNow()}).eq('id',String(op.id)).eq('user_id',u.id).eq('vehicle_id',op.vehicleId); if(error)throw error;
        }
      }catch(e){ keep.push(op); }
    }
    saveQueue(keep);
    if(keep.length){ updateCloudStatus(x('pending')); return false; }
    try{ await saveData(); }catch(e){}
    return true;
  }

  window.rutaSaveFuelSimple = async id => {
    const odo=n(document.getElementById('v13_f_odo')?.value), price=n(document.getElementById('v13_f_price')?.value), total=n(document.getElementById('v13_f_total')?.value);
    if(odo<0 || price<=0 || total<=0){ alert(x('invalid')); return; }
    const liters=total/price;
    let entry=(state?.fuel||[]).find(e=>String(e.id)===String(id));
    if(entry){
      entry.odometer=odo; entry.pricePerLiter=price; entry.total=total; entry.liters=liters; entry.updatedAt=entry.updatedAt||null;
    }else{
      entry={id:uid(),date:todayStr(),station:'',odometer:odo,liters,pricePerLiter:price,total,lat:null,lng:null,updatedAt:null};
      state.fuel.push(entry);
    }
    if(odo>n(currentOdo()))state.settings.odometer=odo;
    await saveData(); closeOverlay(); render();
    const vid=currentVehicleId(); if(vid)queueOp({type:'fuel-upsert',id:String(entry.id),vehicleId:vid,entry:{...entry}});
    try{ if(await flushQueue())updateCloudStatus(x('synced')); }catch(e){updateCloudStatus(x('pending'));}
  };

  window.rutaRemoveFuel = async id => {
    if(!confirm(x('removeConfirm')))return;
    const vid=currentVehicleId();
    state.fuel=state.fuel.filter(e=>String(e.id)!==String(id));
    await saveData(); render();
    if(vid)queueOp({type:'fuel-delete',id:String(id),vehicleId:vid,deletedAt:isoNow()});
    try{ if(await flushQueue())updateCloudStatus(x('synced')); }catch(e){updateCloudStatus(x('pending'));}
  };

  function fromFuelRow(r){ return {id:r.id,date:r.date,station:r.station||'',odometer:n(r.odometer),liters:n(r.liters),pricePerLiter:n(r.price_per_liter),total:n(r.total),lat:r.lat,lng:r.lng,updatedAt:r.updated_at||null}; }
  function fromMaintRow(r){ return {id:r.id,name:r.name,intervalKm:n(r.interval_km)||5000,lastOdo:n(r.last_odo),source:r.source||'custom',sourceNote:r.source_note||'',templateKey:r.template_key||'',updatedAt:r.updated_at||null}; }
  function remoteNewer(remoteStamp,localStamp){
    const r=Date.parse(remoteStamp||''), l=Date.parse(localStamp||'');
    if(!Number.isFinite(r))return false; if(!Number.isFinite(l))return true; return r>l;
  }

  async function syncSnapshot(){
    if(syncBusy)return;
    syncBusy=true; updateCloudStatus(x('syncing'));
    try{
      const sb=await client(), u=await authUser();
      if(!u){ updateCloudStatus(x('signedOut')); return; }
      const vid=currentVehicleId(); if(!vid)throw new Error('No active vehicle');
      await ensureVehicle(sb,u,vid);
      await flushQueue();

      const [fv,mv,vv]=await Promise.all([
        sb.from('ruta_fuel_entries').select('*').eq('user_id',u.id).eq('vehicle_id',vid),
        sb.from('ruta_maintenance_items').select('*').eq('user_id',u.id).eq('vehicle_id',vid),
        sb.from('ruta_vehicles').select('*').eq('user_id',u.id).eq('id',vid).single()
      ]);
      if(fv.error)throw fv.error; if(mv.error)throw mv.error; if(vv.error)throw vv.error;

      const remoteFuel=new Map((fv.data||[]).map(r=>[String(r.id),r]));
      const fuelOut=[];
      for(const local of [...(state.fuel||[])]){
        const r=remoteFuel.get(String(local.id));
        if(r?.deleted_at){ remoteFuel.delete(String(local.id)); continue; }
        if(!r){
          const {data,error}=await sb.from('ruta_fuel_entries').upsert(fuelRow(local,u.id,vid),{onConflict:'id'}).select().single(); if(error)throw error; fuelOut.push(fromFuelRow(data));
        }else if(remoteNewer(r.updated_at,local.updatedAt)) fuelOut.push(fromFuelRow(r));
        else {
          const {data,error}=await sb.from('ruta_fuel_entries').upsert(fuelRow(local,u.id,vid),{onConflict:'id'}).select().single(); if(error)throw error; fuelOut.push(fromFuelRow(data));
        }
        remoteFuel.delete(String(local.id));
      }
      for(const r of remoteFuel.values())if(!r.deleted_at)fuelOut.push(fromFuelRow(r));
      state.fuel=fuelOut;

      const remoteMaint=new Map((mv.data||[]).map(r=>[String(r.id),r]));
      const maintOut=[];
      for(const local of [...(state.maintenance||[])]){
        const r=remoteMaint.get(String(local.id));
        if(r?.deleted_at){ remoteMaint.delete(String(local.id)); continue; }
        if(!r){
          const {data,error}=await sb.from('ruta_maintenance_items').upsert(maintRow(local,u.id,vid),{onConflict:'id'}).select().single(); if(error)throw error; maintOut.push(fromMaintRow(data));
        }else if(remoteNewer(r.updated_at,local.updatedAt)) maintOut.push(fromMaintRow(r));
        else {
          const {data,error}=await sb.from('ruta_maintenance_items').upsert(maintRow(local,u.id,vid),{onConflict:'id'}).select().single(); if(error)throw error; maintOut.push(fromMaintRow(data));
        }
        remoteMaint.delete(String(local.id));
      }
      for(const r of remoteMaint.values())if(!r.deleted_at)maintOut.push(fromMaintRow(r));
      state.maintenance=maintOut;

      state.settings.odometer=Math.max(n(state.settings.odometer),n(vv.data.odometer),...state.fuel.map(e=>n(e.odometer)));
      await sb.from('ruta_vehicles').update({odometer:state.settings.odometer,currency:state.settings.currency||'₱',language:state.settings.language==='en'?'en':'fil',theme:state.settings.theme==='light'?'light':'dark'}).eq('id',vid).eq('user_id',u.id);
      await saveData(); render(); updateCloudStatus(x('synced'));
    }catch(e){ console.error('RUTA v1.3 sync:',e); updateCloudStatus(navigator.onLine===false?x('pending'):`${x('syncError')}: ${e.message||e}`); }
    finally{ syncBusy=false; }
  }

  const previousSyncNow=window.rutaCloudSyncNow;
  window.rutaCloudSyncNow=async()=>{
    try{ if(typeof previousSyncNow==='function')await previousSyncNow(); }catch(e){}
    await syncSnapshot();
  };

  function updateCloudStatus(message){
    v13Status=message||v13Status;
    const panel=document.getElementById('rutaCloudPanel'); if(!panel)return;
    let el=panel.querySelector('#rutaV13Status');
    if(!el){ el=document.createElement('div'); el.id='rutaV13Status'; el.style.cssText='font-size:11px;color:var(--teal);margin-top:8px;line-height:1.4'; panel.appendChild(el); }
    el.textContent=`${x('engine')} • ${v13Status||x('synced')}`;
  }
  function decorateAbout(){
    const el=document.querySelector('.ruta-version'); if(el)el.textContent=`v${VERSION}`;
  }
  const oldAbout=window.rutaOpenAbout;
  if(typeof oldAbout==='function')window.rutaOpenAbout=()=>{ oldAbout(); setTimeout(decorateAbout,0); };

  const observer=new MutationObserver(()=>{ updateCloudStatus(v13Status); decorateAbout(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('online',()=>{ flushQueue().then(ok=>{if(ok)syncSnapshot();}).catch(()=>{}); });
  window.addEventListener('focus',()=>{
    const now=Date.now(); if(now-lastAutoSync<15000)return; lastAutoSync=now;
    flushQueue().catch(()=>{});
  });

  setTimeout(()=>{
    updateCloudStatus(loadQueue().length?x('pending'):'');
    flushQueue().then(ok=>{if(ok && document.visibilityState==='visible')syncSnapshot();}).catch(()=>{});
  },1800);
})();
