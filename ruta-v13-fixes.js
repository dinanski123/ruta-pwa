(() => {
  'use strict';
  if (window.__RUTA_V13_LOADED) return;
  window.__RUTA_V13_LOADED = true;

  const VERSION = '1.3.0';
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  const FLEET_KEY = 'ruta-fleet-v2';
  const QUEUE_KEY = 'ruta-v13-sync-queue';
  let syncClient = null;
  let syncBusy = false;
  let syncStatus = '';

  const TXT = {
    en: {
      odo:'Current odometer (km)', price:'Price per liter', total:'Total purchase', liters:'Calculated liters',
      add:'Add fuel log', edit:'Edit fuel log', editBtn:'Edit', remove:'Remove',
      invalid:'Enter odometer, price per liter, and total purchase greater than zero.',
      removeConfirm:'Remove this fuel log?', noFuel:'No fuel entries yet. Add odometer, price per liter, and total purchase.',
      syncing:'Syncing…', synced:'Cloud sync verified', pending:'Saved locally — waiting to sync', signedOut:'Sign in to use cloud sync', error:'Cloud sync needs attention', engine:'RUTA sync v1.3'
    },
    fil: {
      odo:'Kasalukuyang odometer (km)', price:'Presyo kada litro', total:'Kabuuang binayaran', liters:'Kalkuladong litro',
      add:'Magdagdag ng fuel log', edit:'I-edit ang fuel log', editBtn:'I-edit', remove:'Alisin',
      invalid:'Ilagay ang odometer, presyo kada litro, at kabuuang binayaran na higit sa zero.',
      removeConfirm:'Alisin ang fuel log na ito?', noFuel:'Wala pang fuel entry. Idagdag ang odometer, presyo kada litro, at kabuuang binayaran.',
      syncing:'Nagsi-sync…', synced:'Na-verify ang cloud sync', pending:'Naka-save locally — naghihintay mag-sync', signedOut:'Mag-sign in para gumamit ng cloud sync', error:'Kailangang tingnan ang cloud sync', engine:'RUTA sync v1.3'
    }
  };

  const lang = () => state?.settings?.language === 'en' ? 'en' : 'fil';
  const tx = k => TXT[lang()][k] || TXT.en[k] || k;
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const litersFor = e => num(e?.liters) > 0 ? num(e.liters) : (num(e?.total) > 0 && num(e?.pricePerLiter) > 0 ? num(e.total) / num(e.pricePerLiter) : 0);
  const nowIso = () => new Date().toISOString();

  function activeVehicleId(){
    try { return JSON.parse(localStorage.getItem(FLEET_KEY) || 'null')?.activeVehicleId || null; }
    catch { return null; }
  }
  function activeVehicleRecord(){
    try { const f=JSON.parse(localStorage.getItem(FLEET_KEY)||'null'); return f?.vehicles?.[f?.activeVehicleId] || null; }
    catch { return null; }
  }
  function monthKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

  computeFuelStats = function(){
    const rows=[...(state?.fuel||[])].sort((a,b)=>num(a.odometer)-num(b.odometer)||String(a.date||'').localeCompare(String(b.date||'')));
    const values=[];
    for(let i=1;i<rows.length;i++){
      const distance=num(rows[i].odometer)-num(rows[i-1].odometer);
      const liters=litersFor(rows[i]);
      if(distance>0 && liters>0) values.push(distance/liters);
    }
    const last5=values.slice(-5);
    const avgKml=last5.length ? last5.reduce((a,b)=>a+b,0)/last5.length : null;
    const mk=monthKey();
    const monthSpend=(state?.fuel||[]).filter(e=>String(e.date||'').slice(0,7)===mk).reduce((sum,e)=>sum+num(e.total),0);
    return {avgKml,monthSpend};
  };

  function entryKml(entry){
    const rows=[...(state?.fuel||[])].sort((a,b)=>num(a.odometer)-num(b.odometer)||String(a.date||'').localeCompare(String(b.date||'')));
    const i=rows.findIndex(e=>String(e.id)===String(entry.id));
    if(i<1) return null;
    const distance=num(rows[i].odometer)-num(rows[i-1].odometer), liters=litersFor(rows[i]);
    return distance>0 && liters>0 ? distance/liters : null;
  }

  renderFuel = function(){
    const rows=[...(state?.fuel||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||num(b.odometer)-num(a.odometer));
    const cards=rows.map(e=>{
      const liters=litersFor(e), kml=entryKml(e);
      return `<div class="list-card"><div class="top-row"><div class="title">${esc(fmtKm(e.odometer))}</div><div class="amount">${esc(fmtMoney(e.total))}</div></div><div class="meta"><span>${esc(e.date||'')}</span><span>${esc(fmtMoney(e.pricePerLiter))}/L</span>${liters>0?`<span>${liters.toFixed(2)} L</span>`:''}</div>${kml?`<div class="kml-badge">${kml.toFixed(1)} km/L</div>`:''}<div class="ruta-card-actions" style="gap:8px"><button class="done-btn" onclick="rutaEditFuel('${esc(e.id)}')">${tx('editBtn')}</button><button class="done-btn ruta-danger" onclick="rutaRemoveFuel('${esc(e.id)}')">${tx('remove')}</button></div></div>`;
    }).join('');
    return `<div class="section-title">${t('fuel_log')} <button class="btn-add" onclick="openFuelForm()">${t('add')}</button></div>${cards||`<div class="empty-state"><div class="big">⛽</div><div class="msg">${tx('noFuel')}</div></div>`}`;
  };

  openFuelForm = function(id=''){
    const item=id?(state?.fuel||[]).find(e=>String(e.id)===String(id)):null;
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${item?tx('edit'):tx('add')}</h3><div class="field"><label>${tx('odo')}</label><input id="v13_odo" type="number" min="0" step="1" inputmode="decimal" value="${item?num(item.odometer):(num(currentOdo())||'')}"></div><div class="field"><label>${tx('price')}</label><input id="v13_price" type="number" min="0" step="0.01" inputmode="decimal" value="${item?num(item.pricePerLiter):''}"></div><div class="field"><label>${tx('total')}</label><input id="v13_total" type="number" min="0" step="0.01" inputmode="decimal" value="${item?num(item.total):''}"></div><div id="v13_liters" class="ruta-plan-note"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button><button class="btn btn-primary" onclick="rutaSaveFuelSimple('${esc(id)}')">${t('save')}</button></div></div></div>`);
    const refresh=()=>{const p=num(document.getElementById('v13_price')?.value),total=num(document.getElementById('v13_total')?.value),el=document.getElementById('v13_liters');if(el)el.textContent=p>0&&total>0?`${tx('liters')}: ${(total/p).toFixed(2)} L`:'';};
    document.getElementById('v13_price')?.addEventListener('input',refresh);
    document.getElementById('v13_total')?.addEventListener('input',refresh);
    refresh();
  };
  window.rutaEditFuel=id=>openFuelForm(id);

  function loadQueue(){try{const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(q)?q:[];}catch{return[];}}
  function saveQueue(q){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));}catch{}}
  function queue(op){let q=loadQueue(),key=`${op.type}|${op.vehicleId}|${op.id}`;q=q.filter(x=>`${x.type}|${x.vehicleId}|${x.id}`!==key);q.push({...op,queuedAt:nowIso()});saveQueue(q);showStatus(tx('pending'));}

  async function getClient(){
    if(syncClient)return syncClient;
    for(let i=0;i<100&&!window.supabase;i++) await new Promise(r=>setTimeout(r,100));
    if(!window.supabase) throw new Error('Supabase client did not load');
    syncClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return syncClient;
  }
  async function getUser(){const sb=await getClient(),{data,error}=await sb.auth.getSession();if(error)throw error;return data?.session?.user||null;}

  function fuelPayload(e,userId,vehicleId){return {id:String(e.id),user_id:userId,vehicle_id:vehicleId,date:e.date||todayStr(),station:e.station||null,odometer:num(e.odometer),liters:litersFor(e),price_per_liter:num(e.pricePerLiter),total:num(e.total),lat:e.lat??null,lng:e.lng??null,deleted_at:null};}
  function maintPayload(e,userId,vehicleId){return {id:String(e.id),user_id:userId,vehicle_id:vehicleId,name:e.name||'Maintenance item',interval_km:Math.max(1,num(e.intervalKm)||5000),last_odo:Math.max(0,num(e.lastOdo)),source:e.source||'custom',source_note:e.sourceNote||null,template_key:e.templateKey||null,deleted_at:null};}
  function fromFuel(r){return {id:r.id,date:r.date,station:r.station||'',odometer:num(r.odometer),liters:num(r.liters),pricePerLiter:num(r.price_per_liter),total:num(r.total),lat:r.lat,lng:r.lng,updatedAt:r.updated_at||null};}
  function fromMaint(r){return {id:r.id,name:r.name,intervalKm:num(r.interval_km)||5000,lastOdo:num(r.last_odo),source:r.source||'custom',sourceNote:r.source_note||'',templateKey:r.template_key||'',updatedAt:r.updated_at||null};}

  async function ensureVehicle(sb,u,vid){
    const rec=activeVehicleRecord()||{};
    const {data:remote,error}=await sb.from('ruta_vehicles').select('id,odometer').eq('id',vid).eq('user_id',u.id).maybeSingle();
    if(error)throw error;
    const payload={name:rec.name||'My vehicle',vehicle_type:rec.vehicleType||'car',year:rec.year||null,make:rec.make||null,model:rec.model||null,trim:rec.trim||null,engine:rec.engine||null,transmission:rec.transmission||null,plan_source:rec.planSource||null,odometer:Math.max(num(state.settings.odometer),num(remote?.odometer)),currency:state.settings.currency||'₱',language:state.settings.language==='en'?'en':'fil',theme:state.settings.theme==='light'?'light':'dark',archived_at:null};
    if(remote){const {error:e}=await sb.from('ruta_vehicles').update(payload).eq('id',vid).eq('user_id',u.id);if(e)throw e;}
    else{const {error:e}=await sb.from('ruta_vehicles').insert({id:vid,user_id:u.id,...payload});if(e)throw e;}
  }

  async function flushQueue(){
    if(navigator.onLine===false)return false;
    const q=loadQueue();if(!q.length)return true;
    const sb=await getClient(),u=await getUser();if(!u){showStatus(tx('signedOut'));return false;}
    const keep=[];
    for(const op of q){
      try{
        await ensureVehicle(sb,u,op.vehicleId);
        if(op.type==='fuel-upsert'){
          const {data,error}=await sb.from('ruta_fuel_entries').upsert(fuelPayload(op.entry,u.id,op.vehicleId),{onConflict:'id'}).select('updated_at').single();if(error)throw error;
          const local=(state.fuel||[]).find(e=>String(e.id)===String(op.id));if(local)local.updatedAt=data?.updated_at||local.updatedAt||null;
        }else if(op.type==='fuel-delete'){
          const {error}=await sb.from('ruta_fuel_entries').update({deleted_at:op.deletedAt||nowIso()}).eq('id',String(op.id)).eq('user_id',u.id).eq('vehicle_id',op.vehicleId);if(error)throw error;
        }
      }catch{keep.push(op);}
    }
    saveQueue(keep);if(keep.length){showStatus(tx('pending'));return false;}await saveData();return true;
  }

  window.rutaSaveFuelSimple=async id=>{
    const odo=num(document.getElementById('v13_odo')?.value),price=num(document.getElementById('v13_price')?.value),total=num(document.getElementById('v13_total')?.value);
    if(odo<0||price<=0||total<=0){alert(tx('invalid'));return;}
    let e=(state.fuel||[]).find(x=>String(x.id)===String(id));
    if(e){e.odometer=odo;e.pricePerLiter=price;e.total=total;e.liters=total/price;}
    else{e={id:uid(),date:todayStr(),station:'',odometer:odo,liters:total/price,pricePerLiter:price,total,lat:null,lng:null,updatedAt:null};state.fuel.push(e);}
    if(odo>num(currentOdo()))state.settings.odometer=odo;
    await saveData();closeOverlay();render();
    const vid=activeVehicleId();if(vid)queue({type:'fuel-upsert',id:String(e.id),vehicleId:vid,entry:{...e}});
    try{if(await flushQueue())showStatus(tx('synced'));}catch{showStatus(tx('pending'));}
  };

  window.rutaRemoveFuel=async id=>{
    if(!confirm(tx('removeConfirm')))return;
    const vid=activeVehicleId();state.fuel=state.fuel.filter(e=>String(e.id)!==String(id));await saveData();render();
    if(vid)queue({type:'fuel-delete',id:String(id),vehicleId:vid,deletedAt:nowIso()});
    try{if(await flushQueue())showStatus(tx('synced'));}catch{showStatus(tx('pending'));}
  };

  async function syncSnapshot(){
    if(syncBusy)return;syncBusy=true;showStatus(tx('syncing'));
    try{
      const sb=await getClient(),u=await getUser();if(!u){showStatus(tx('signedOut'));return;}
      const vid=activeVehicleId();if(!vid)throw new Error('No active vehicle');
      await ensureVehicle(sb,u,vid);await flushQueue();
      const [fr,mr,vr]=await Promise.all([
        sb.from('ruta_fuel_entries').select('*').eq('user_id',u.id).eq('vehicle_id',vid),
        sb.from('ruta_maintenance_items').select('*').eq('user_id',u.id).eq('vehicle_id',vid),
        sb.from('ruta_vehicles').select('*').eq('user_id',u.id).eq('id',vid).single()
      ]);
      if(fr.error)throw fr.error;if(mr.error)throw mr.error;if(vr.error)throw vr.error;

      const remoteFuel=new Map((fr.data||[]).map(r=>[String(r.id),r]));
      const fuel=[];
      for(const local of state.fuel||[]){
        const r=remoteFuel.get(String(local.id));
        if(r?.deleted_at){remoteFuel.delete(String(local.id));continue;}
        if(!r){const {data,error}=await sb.from('ruta_fuel_entries').upsert(fuelPayload(local,u.id,vid),{onConflict:'id'}).select().single();if(error)throw error;fuel.push(fromFuel(data));}
        else{fuel.push(fromFuel(r));}
        remoteFuel.delete(String(local.id));
      }
      for(const r of remoteFuel.values())if(!r.deleted_at)fuel.push(fromFuel(r));
      state.fuel=fuel;

      const remoteMaint=new Map((mr.data||[]).map(r=>[String(r.id),r]));
      const maint=[];
      for(const local of state.maintenance||[]){
        const r=remoteMaint.get(String(local.id));
        if(r?.deleted_at){remoteMaint.delete(String(local.id));continue;}
        if(!r){const {data,error}=await sb.from('ruta_maintenance_items').upsert(maintPayload(local,u.id,vid),{onConflict:'id'}).select().single();if(error)throw error;maint.push(fromMaint(data));}
        else{maint.push(fromMaint(r));}
        remoteMaint.delete(String(local.id));
      }
      for(const r of remoteMaint.values())if(!r.deleted_at)maint.push(fromMaint(r));
      state.maintenance=maint;

      state.settings.odometer=Math.max(num(state.settings.odometer),num(vr.data.odometer),...(state.fuel||[]).map(e=>num(e.odometer)));
      await sb.from('ruta_vehicles').update({odometer:state.settings.odometer,currency:state.settings.currency||'₱',language:state.settings.language==='en'?'en':'fil',theme:state.settings.theme==='light'?'light':'dark'}).eq('id',vid).eq('user_id',u.id);
      await saveData();render();showStatus(tx('synced'));
    }catch(e){console.error('RUTA v1.3 sync',e);showStatus(navigator.onLine===false?tx('pending'):`${tx('error')}: ${e.message||e}`);}
    finally{syncBusy=false;}
  }

  const previousSync=window.rutaCloudSyncNow;
  window.rutaCloudSyncNow=async()=>{try{if(typeof previousSync==='function')await previousSync();}catch{}await syncSnapshot();};

  function showStatus(message){
    syncStatus=message||syncStatus;
    const panel=document.getElementById('rutaCloudPanel');if(!panel)return;
    let el=panel.querySelector('#rutaV13Status');if(!el){el=document.createElement('div');el.id='rutaV13Status';el.style.cssText='font-size:11px;color:var(--teal);margin-top:8px;line-height:1.4';panel.appendChild(el);}el.textContent=`${tx('engine')} • ${syncStatus||tx('synced')}`;
  }

  const oldAbout=window.rutaOpenAbout;
  if(typeof oldAbout==='function')window.rutaOpenAbout=()=>{oldAbout();setTimeout(()=>{const el=document.querySelector('.ruta-version');if(el)el.textContent=`v${VERSION}`;},0);};
  new MutationObserver(()=>showStatus(syncStatus)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('online',()=>flushQueue().then(ok=>{if(ok)syncSnapshot();}).catch(()=>{}));
  setTimeout(()=>{showStatus(loadQueue().length?tx('pending'):'');flushQueue().catch(()=>{});},1500);
})();
