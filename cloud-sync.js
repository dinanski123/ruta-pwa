(() => {
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  const FLEET_KEY = 'ruta-fleet-v2';
  const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

  let client = null;
  let user = null;
  let vehicleId = null;
  let fleet = null;
  let channel = null;
  let pullTimer = null;
  let busy = false;
  let status = '';
  let readyPromise = null;
  let initializedUserId = null;
  let pendingPlan = null;

  const copy = {
    en: {
      cloud_title:'Cloud sync', cloud_desc:'Use the same account on Android and iPhone to keep RUTA data in sync.',
      email:'Email', password:'Password', signin:'Sign in', signup:'Create account', signout:'Sign out', sync:'Sync now',
      connected:'Connected as', synced:'Synced', check:'Check your email to confirm your account, then sign in.',
      invalid:'Enter a valid email and a password with at least 6 characters.',
      vehicles:'Vehicles', add_vehicle:'+ Add vehicle', manage:'Manage', select:'Select', remove:'Remove',
      remove_fuel:'Remove fuel entry?', remove_maint:'Remove maintenance item?', remove_vehicle:'Remove this vehicle from RUTA?',
      last_vehicle:'RUTA needs at least one vehicle.', add_vehicle_title:'Add vehicle', vehicle_type:'Vehicle type', car:'Car', motorcycle:'Motorcycle',
      year:'Year', make:'Make', model:'Model', trim:'Trim / variant (optional)', vehicle_name:'Display name (optional)',
      vehicle_name_hint:'e.g. Daily City or NMAX', current_odo:'Current odometer (km)',
      lookup_note:'Make/model suggestions use NHTSA vPIC. You can still type a model manually if it is not listed.',
      add_plan:'Add suggested maintenance plan', plan_title:'Suggested maintenance plan', plan:'Maintenance plan',
      apply_plan:'Add this plan', plan_added:'Maintenance plan added',
      general_plan:'RUTA general baseline — verify against your owner’s manual.',
      exact_plan:'Verified public-source maintenance schedule available', no_exact:'No verified public-source maintenance template is stored for this exact vehicle yet, so RUTA is showing a general baseline.',
      public_plan_badge:'Public-source plan', baseline_badge:'RUTA baseline', view_source:'Open public source',
      source:'Source', no_items:'No new maintenance items to add.', vehicle_removed:'Vehicle removed', fuel_removed:'Fuel entry removed', maint_removed:'Maintenance item removed',
      active:'Active', custom_vehicle:'My vehicle', archived_trips:'Trip Log has been removed from the app; old cloud trip rows are preserved as historical data.'
    },
    fil: {
      cloud_title:'Cloud sync', cloud_desc:'Gamitin ang parehong account sa Android at iPhone para mag-sync ang RUTA data.',
      email:'Email', password:'Password', signin:'Mag-sign in', signup:'Gumawa ng account', signout:'Mag-sign out', sync:'I-sync ngayon',
      connected:'Nakakonekta bilang', synced:'Naka-sync', check:'I-check ang email mo para kumpirmahin ang account, pagkatapos ay mag-sign in.',
      invalid:'Maglagay ng valid na email at password na may hindi bababa sa 6 na character.',
      vehicles:'Mga sasakyan', add_vehicle:'+ Magdagdag ng sasakyan', manage:'Pamahalaan', select:'Piliin', remove:'Alisin',
      remove_fuel:'Alisin ang fuel entry na ito?', remove_maint:'Alisin ang maintenance item na ito?', remove_vehicle:'Alisin ang sasakyang ito sa RUTA?',
      last_vehicle:'Kailangang may kahit isang sasakyan sa RUTA.', add_vehicle_title:'Magdagdag ng sasakyan', vehicle_type:'Uri ng sasakyan', car:'Kotse', motorcycle:'Motorsiklo',
      year:'Taon', make:'Make', model:'Model', trim:'Trim / variant (opsyonal)', vehicle_name:'Display name (opsyonal)',
      vehicle_name_hint:'hal. Daily City o NMAX', current_odo:'Kasalukuyang odometer (km)',
      lookup_note:'Ang make/model suggestions ay mula sa NHTSA vPIC. Maaari ka pa ring mag-type nang manual kung wala sa listahan.',
      add_plan:'Magdagdag ng suggested maintenance plan', plan_title:'Suggested maintenance plan', plan:'Maintenance plan',
      apply_plan:'Idagdag ang plan', plan_added:'Naidagdag ang maintenance plan',
      general_plan:'RUTA general baseline — i-verify sa owner’s manual mo.',
      exact_plan:'May verified public-source maintenance schedule', no_exact:'Wala pang verified public-source maintenance template para sa eksaktong sasakyang ito, kaya general baseline muna ang ipinapakita ng RUTA.',
      public_plan_badge:'Public-source plan', baseline_badge:'RUTA baseline', view_source:'Buksan ang public source',
      source:'Source', no_items:'Walang bagong maintenance item na kailangang idagdag.', vehicle_removed:'Inalis ang sasakyan', fuel_removed:'Inalis ang fuel entry', maint_removed:'Inalis ang maintenance item',
      active:'Aktibo', custom_vehicle:'Sasakyan ko', archived_trips:'Inalis na ang Trip Log sa app; pinapanatili ang lumang cloud trip rows bilang historical data.'
    }
  };

  const planNames = {
    en: {
      engine_oil_filter:'Engine oil & filter', tire_rotation:'Tire rotation', brake_inspection:'Brake inspection',
      engine_air_filter:'Engine air filter', tire_inspection:'Tire inspection', spark_plug:'Spark plug'
    },
    fil: {
      engine_oil_filter:'Engine oil at filter', tire_rotation:'I-rotate ang gulong', brake_inspection:'I-check ang preno',
      engine_air_filter:'Palitan / i-check ang air filter', tire_inspection:'I-check ang mga gulong', spark_plug:'Spark plug'
    }
  };

  function lang(){ return state?.settings?.language === 'en' ? 'en' : 'fil'; }
  function c(k){ return copy[lang()][k] ?? copy.en[k] ?? k; }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function uuid(){ return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4${Math.random().toString(16).slice(2,5)}-8${Math.random().toString(16).slice(2,5)}-${Math.random().toString(16).slice(2,14)}`; }
  function itemId(){ return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`; }
  function nowIso(){ return new Date().toISOString(); }

  function normalizeState(data){
    const d = data && typeof data === 'object' ? clone(data) : {};
    d.settings = d.settings || {};
    d.settings.odometer = Number(d.settings.odometer || 0);
    d.settings.currency = d.settings.currency || '₱';
    d.settings.language = d.settings.language === 'en' ? 'en' : 'fil';
    d.settings.theme = d.settings.theme === 'light' ? 'light' : 'dark';
    d.fuel = Array.isArray(d.fuel) ? d.fuel : [];
    d.maintenance = Array.isArray(d.maintenance) ? d.maintenance : [];
    // Trips are intentionally kept only as dormant legacy data. The Trip Log feature is removed.
    d.trips = Array.isArray(d.trips) ? d.trips : [];
    return d;
  }

  function blankVehicleState(){
    return {
      settings:{
        odometer:0,
        currency:state?.settings?.currency || '₱',
        language:state?.settings?.language === 'en' ? 'en' : 'fil',
        theme:state?.settings?.theme === 'light' ? 'light' : 'dark'
      },
      fuel:[], maintenance:[], trips:[]
    };
  }

  function vehicleDisplayName(rec){
    if(rec?.name && rec.name !== 'My vehicle') return rec.name;
    const parts = [rec?.year, rec?.make, rec?.model].filter(Boolean);
    return parts.length ? parts.join(' ') : c('custom_vehicle');
  }

  function ensureFleet(){
    try { fleet = JSON.parse(localStorage.getItem(FLEET_KEY) || 'null'); } catch(e){ fleet = null; }
    if(!fleet || !fleet.vehicles || typeof fleet.vehicles !== 'object'){
      const id = uuid();
      fleet = {
        version:2,
        activeVehicleId:id,
        vehicles:{
          [id]:{id,name:'My vehicle',vehicleType:'car',year:null,make:'',model:'',trim:'',engine:'',transmission:'',planSource:'',data:normalizeState(state)}
        }
      };
    }
    const ids = Object.keys(fleet.vehicles);
    if(!fleet.activeVehicleId || !fleet.vehicles[fleet.activeVehicleId]) fleet.activeVehicleId = ids[0];
    vehicleId = fleet.activeVehicleId;
    state = normalizeState(fleet.vehicles[vehicleId].data);
    persistFleet();
  }

  function persistFleet(){
    if(!fleet || !vehicleId || !fleet.vehicles[vehicleId]) return;
    fleet.activeVehicleId = vehicleId;
    fleet.vehicles[vehicleId].data = normalizeState(state);
    try {
      localStorage.setItem(FLEET_KEY, JSON.stringify(fleet));
      localStorage.setItem('ruta-vehicle-data', JSON.stringify(state));
    } catch(e){}
  }

  function currentRec(){ return fleet?.vehicles?.[vehicleId] || null; }
  function vehicleList(){ return Object.values(fleet?.vehicles || {}).sort((a,b)=>vehicleDisplayName(a).localeCompare(vehicleDisplayName(b))); }

  function cloudMeta(v){
    return {
      id:v.id,
      name:v.name || 'My vehicle',
      vehicleType:v.vehicle_type || 'car',
      year:v.year ?? null,
      make:v.make || '', model:v.model || '', trim:v.trim || '', engine:v.engine || '', transmission:v.transmission || '',
      planSource:v.plan_source || '',
      data:null
    };
  }

  function vehiclePayload(rec=currentRec()){
    const d = rec?.id === vehicleId ? state : normalizeState(rec?.data);
    return {
      name:rec?.name || 'My vehicle', vehicle_type:rec?.vehicleType || 'car', year:rec?.year || null,
      make:rec?.make || null, model:rec?.model || null, trim:rec?.trim || null, engine:rec?.engine || null,
      transmission:rec?.transmission || null, plan_source:rec?.planSource || null,
      odometer:Number(d.settings.odometer || 0), currency:d.settings.currency || '₱',
      language:d.settings.language || 'fil', theme:d.settings.theme || 'dark', archived_at:null
    };
  }

  function fuelPayload(x){
    return {id:String(x.id),user_id:user.id,vehicle_id:vehicleId,date:x.date,station:x.station||'',odometer:Number(x.odometer||0),liters:Number(x.liters||0),price_per_liter:Number(x.pricePerLiter||0),total:Number(x.total||0),lat:x.lat??null,lng:x.lng??null,deleted_at:null};
  }
  function maintPayload(x){
    return {id:String(x.id),user_id:user.id,vehicle_id:vehicleId,name:x.name||'Maintenance item',interval_km:Number(x.intervalKm||5000),last_odo:Number(x.lastOdo||0),source:x.source||'custom',source_note:x.sourceNote||null,template_key:x.templateKey||null,deleted_at:null};
  }

  async function loadSupabase(){
    if(window.supabase) return window.supabase;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return window.supabase;
  }

  async function pushVehicle(){
    if(!client||!user||!vehicleId||busy)return;
    const rec=currentRec(); if(!rec)return;
    const {error}=await client.from('ruta_vehicles').update(vehiclePayload(rec)).eq('id',vehicleId).eq('user_id',user.id);
    if(error) throw error;
  }
  async function pushFuel(x){ if(!client||!user||!vehicleId||busy||!x)return; const {error}=await client.from('ruta_fuel_entries').upsert(fuelPayload(x),{onConflict:'id'}); if(error)throw error; }
  async function pushMaint(x){ if(!client||!user||!vehicleId||busy||!x)return; const {error}=await client.from('ruta_maintenance_items').upsert(maintPayload(x),{onConflict:'id'}); if(error)throw error; }

  async function insertVehicle(rec){
    if(!client||!user||!rec)return;
    const {error}=await client.from('ruta_vehicles').insert({id:rec.id,user_id:user.id,...vehiclePayload(rec)});
    if(error && error.code !== '23505') throw error;
  }

  async function mergeMissing(table, rows, mapper){
    if(!rows?.length) return;
    const {data,error}=await client.from(table).select('id').eq('vehicle_id',vehicleId).eq('user_id',user.id);
    if(error) throw error;
    const ids=new Set((data||[]).map(r=>String(r.id)));
    const missing=rows.filter(r=>!ids.has(String(r.id))).map(mapper);
    if(missing.length){ const {error:e}=await client.from(table).insert(missing); if(e) throw e; }
  }

  async function fetchCloudVehicles(){
    const {data,error}=await client.from('ruta_vehicles').select('*').eq('user_id',user.id).is('archived_at',null).order('created_at',{ascending:true});
    if(error) throw error;
    return data || [];
  }

  function stateFromVehicleRow(v){
    const d=blankVehicleState();
    d.settings.odometer=Number(v.odometer||0); d.settings.currency=v.currency||'₱'; d.settings.language=v.language||'fil'; d.settings.theme=v.theme||'dark';
    return d;
  }

  async function reconcileVehicles(){
    let cloudRows=await fetchCloudVehicles();
    let locals=vehicleList();

    if(cloudRows.length && locals.length===1 && !cloudRows.some(v=>v.id===locals[0].id)){
      const old=locals[0];
      const target=cloudRows[0];
      const mapped={...cloudMeta(target),data:normalizeState(old.data)};
      delete fleet.vehicles[old.id];
      fleet.vehicles[target.id]=mapped;
      fleet.activeVehicleId=target.id; vehicleId=target.id; state=mapped.data;
      persistFleet();
      locals=vehicleList();
    }

    if(!cloudRows.length){
      for(const rec of locals) await insertVehicle(rec);
      cloudRows=await fetchCloudVehicles();
    }else{
      const cloudIds=new Set(cloudRows.map(v=>v.id));
      for(const rec of locals){ if(!cloudIds.has(rec.id)) await insertVehicle(rec); }
      cloudRows=await fetchCloudVehicles();
    }

    for(const row of cloudRows){
      const meta=cloudMeta(row);
      const existing=fleet.vehicles[row.id];
      if(existing){ Object.assign(existing,meta,{data:existing.data || stateFromVehicleRow(row)}); }
      else fleet.vehicles[row.id]={...meta,data:stateFromVehicleRow(row)};
    }
    persistFleet();
  }

  async function pull(mergeFirst=false){
    if(!client||!user||!vehicleId||busy) return;
    busy=true;
    try{
      const localSnapshot=normalizeState(state);
      if(mergeFirst){
        const {data:v0,error:v0e}=await client.from('ruta_vehicles').select('*').eq('id',vehicleId).eq('user_id',user.id).single();
        if(v0e) throw v0e;
        if(Number(localSnapshot.settings.odometer||0)>Number(v0.odometer||0)){
          await client.from('ruta_vehicles').update({odometer:Number(localSnapshot.settings.odometer||0)}).eq('id',vehicleId).eq('user_id',user.id);
        }
        await mergeMissing('ruta_fuel_entries',localSnapshot.fuel,fuelPayload);
        await mergeMissing('ruta_maintenance_items',localSnapshot.maintenance,maintPayload);
      }

      const [v,f,m]=await Promise.all([
        client.from('ruta_vehicles').select('*').eq('id',vehicleId).eq('user_id',user.id).single(),
        client.from('ruta_fuel_entries').select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id).is('deleted_at',null),
        client.from('ruta_maintenance_items').select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id).is('deleted_at',null)
      ]);
      if(v.error) throw v.error; if(f.error) throw f.error; if(m.error) throw m.error;

      const legacyTrips=Array.isArray(state.trips)?state.trips:[];
      state.settings.odometer=Number(v.data.odometer||0); state.settings.currency=v.data.currency||'₱'; state.settings.language=v.data.language||'fil'; state.settings.theme=v.data.theme||'dark';
      state.fuel=(f.data||[]).map(x=>({id:x.id,date:x.date,station:x.station,odometer:Number(x.odometer||0),liters:Number(x.liters||0),pricePerLiter:Number(x.price_per_liter||0),total:Number(x.total||0),lat:x.lat,lng:x.lng}));
      state.maintenance=(m.data||[]).map(x=>({id:x.id,name:x.name,intervalKm:Number(x.interval_km||5000),lastOdo:Number(x.last_odo||0),source:x.source||'custom',sourceNote:x.source_note||'',templateKey:x.template_key||''}));
      state.trips=legacyTrips;

      const rec=currentRec(); if(rec){ Object.assign(rec,cloudMeta(v.data),{data:normalizeState(state)}); }
      persistFleet();
      if(window.applyTheme) applyTheme(); document.documentElement.lang=state.settings.language==='en'?'en':'fil'; if(window.render) render();
      status=c('synced');
    }catch(e){ status=e.message||String(e); }
    finally{ busy=false; }
  }

  function schedulePull(){ clearTimeout(pullTimer); pullTimer=setTimeout(()=>pull(false),350); }
  async function realtime(){
    if(!client||!user)return;
    if(channel) await client.removeChannel(channel);
    channel=client.channel('ruta-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_vehicles',filter:`user_id=eq.${user.id}`},async()=>{try{await reconcileVehicles();renderVehicleBar();}catch(e){} schedulePull();})
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_fuel_entries',filter:`user_id=eq.${user.id}`},schedulePull)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_maintenance_items',filter:`user_id=eq.${user.id}`},schedulePull)
      .subscribe();
  }

  async function ready(firstMerge){
    if(!client||!user)return;
    if(readyPromise)return readyPromise;
    readyPromise=(async()=>{
      try{
        await reconcileVehicles();
        if(!fleet.vehicles[vehicleId]){ vehicleId=fleet.activeVehicleId=Object.keys(fleet.vehicles)[0]; state=normalizeState(fleet.vehicles[vehicleId].data); }
        await pull(firstMerge);
        await realtime();
        initializedUserId=user.id;
      }catch(e){ status=e.message||String(e); }
      finally{ renderVehicleBar(); setTimeout(injectPanels,0); }
    })();
    try{return await readyPromise;}finally{readyPromise=null;}
  }

  function injectStyles(){
    if(document.getElementById('rutaFleetStyles'))return;
    const s=document.createElement('style'); s.id='rutaFleetStyles';
    s.textContent=`
      #rutaVehicleBar{display:flex;gap:8px;align-items:center;padding:8px calc(20px + env(safe-area-inset-right)) 8px calc(20px + env(safe-area-inset-left));border-bottom:1px solid var(--panel-border);background:var(--bg)}
      #rutaVehicleBar select{flex:1;min-width:0;background:var(--panel);border:1px solid var(--panel-border-light);border-radius:5px;color:var(--text);padding:8px 10px;font:600 12px 'Manrope',sans-serif}
      .ruta-mini-btn{border:1px solid var(--panel-border-light);background:var(--panel);color:var(--teal);border-radius:5px;padding:8px 10px;font:700 12px 'Manrope',sans-serif;cursor:pointer;white-space:nowrap}
      .ruta-danger{color:var(--danger)!important;background:var(--danger-dim)!important}
      .ruta-card-actions{display:flex;justify-content:flex-end;margin-top:10px}
      .ruta-vehicle-card{background:var(--bg);border:1px solid var(--panel-border-light);border-radius:6px;padding:12px;margin-bottom:10px}
      .ruta-vehicle-card .title{font-weight:700;font-size:14px}.ruta-vehicle-card .sub{font-size:12px;color:var(--muted);margin-top:4px}
      .ruta-vehicle-actions{display:flex;gap:8px;margin-top:10px}.ruta-vehicle-actions button{flex:1}
      .ruta-plan-note{font-size:12px;color:var(--muted);line-height:1.45;margin:-4px 0 12px}
      .ruta-source{display:inline-block;margin-top:4px;font-size:10px;color:var(--muted);border:1px solid var(--panel-border-light);border-radius:3px;padding:2px 5px}
      .pms-item>div:last-child{flex-wrap:wrap;justify-content:flex-end}
    `;
    document.head.appendChild(s);
  }

  function renderVehicleBar(){
    if(!fleet)return;
    injectStyles();
    let bar=document.getElementById('rutaVehicleBar');
    if(!bar){
      bar=document.createElement('div'); bar.id='rutaVehicleBar';
      const header=document.querySelector('#phone > header'); if(header) header.insertAdjacentElement('afterend',bar);
    }
    const rows=vehicleList();
    bar.innerHTML=`<select id="rutaVehicleSelect" aria-label="${esc(c('vehicles'))}" onchange="rutaSelectVehicle(this.value)">${rows.map(v=>`<option value="${v.id}" ${v.id===vehicleId?'selected':''}>${esc(vehicleDisplayName(v))}</option>`).join('')}</select><button class="ruta-mini-btn" onclick="rutaOpenAddVehicle()">＋</button>`;
  }

  function decorateCurrentView(){
    if(typeof activeTab==='undefined')return;
    if(activeTab==='fuel'){
      const sorted=[...state.fuel].sort((a,b)=> new Date(b.date)-new Date(a.date) || b.odometer-a.odometer);
      document.querySelectorAll('#main .list-card').forEach((card,i)=>{
        const entry=sorted[i]; if(!entry||card.querySelector('.ruta-card-actions'))return;
        const row=document.createElement('div'); row.className='ruta-card-actions';
        row.innerHTML=`<button class="done-btn ruta-danger" onclick="rutaRemoveFuel('${entry.id}')">${c('remove')}</button>`; card.appendChild(row);
      });
    }
    if(activeTab==='pms' || activeTab==='home'){
      let items=state.maintenance.map(m=>({...m,...maintenanceStatus(m)})).sort((a,b)=>a.remaining-b.remaining);
      if(activeTab==='home')items=items.slice(0,3);
      document.querySelectorAll('#main .pms-item').forEach((card,i)=>{
        const item=items[i]; if(!item)return;
        const right=card.lastElementChild; if(!right||right.querySelector('.ruta-remove-maint'))return;
        const b=document.createElement('button'); b.className='done-btn ruta-danger ruta-remove-maint'; b.textContent=c('remove'); b.onclick=()=>window.rutaRemoveMaint(item.id); right.appendChild(b);
        if(item.source && item.source!=='custom'){
          const left=card.firstElementChild; if(left&&!left.querySelector('.ruta-source')){
            const badge=document.createElement('div'); badge.className='ruta-source'; badge.textContent=['public_template','manufacturer','oem_reference'].includes(item.source)?c('public_plan_badge'):c('baseline_badge'); left.appendChild(badge);
          }
        }
      });
    }
  }

  function injectPanels(){
    fleetPanel(); cloudPanel();
  }

  function fleetPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaFleetPanel'))return;
    const actions=sheet.querySelector('.form-actions');
    const rec=currentRec();
    const box=document.createElement('div'); box.id='rutaFleetPanel'; box.className='field';
    const detail=[rec?.year,rec?.make,rec?.model,rec?.trim].filter(Boolean).join(' ');
    box.innerHTML=`<label>${c('vehicles')}</label><div style="font-size:13px;font-weight:700;margin-bottom:3px">${esc(vehicleDisplayName(rec))}</div>${detail?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(detail)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary" onclick="rutaManageVehicles()">${c('manage')}</button><button class="btn btn-secondary" onclick="rutaOpenAddVehicle()">${c('add_vehicle')}</button></div><button class="geo-btn" style="margin-top:10px" onclick="rutaShowMaintenancePlan()">${c('plan')}</button>`;
    sheet.insertBefore(box,actions);
  }

  function cloudPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaCloudPanel'))return;
    const actions=sheet.querySelector('.form-actions');
    const box=document.createElement('div'); box.id='rutaCloudPanel'; box.className='field';
    if(user){
      box.innerHTML=`<label>${c('cloud_title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${c('connected')} ${esc(user.email||'')}${status?` • ${esc(status)}`:''}</div><div class="form-actions"><button class="btn btn-secondary" onclick="rutaCloudSyncNow()">${c('sync')}</button><button class="btn btn-secondary" onclick="rutaCloudSignOut()">${c('signout')}</button></div>`;
    }else{
      box.innerHTML=`<label>${c('cloud_title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${c('cloud_desc')}</div><input id="ruta_sync_email" type="email" autocomplete="email" placeholder="${c('email')}" style="margin-bottom:8px"><input id="ruta_sync_password" type="password" autocomplete="current-password" placeholder="${c('password')}">${status?`<div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(status)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary" onclick="rutaCloudSignIn()">${c('signin')}</button><button class="btn btn-secondary" onclick="rutaCloudSignUp()">${c('signup')}</button></div>`;
    }
    sheet.insertBefore(box,actions);
  }

  function panelRefresh(){ if(window.openSettings) openSettings(); setTimeout(injectPanels,0); }
  function creds(){return {email:(document.getElementById('ruta_sync_email')?.value||'').trim(),password:document.getElementById('ruta_sync_password')?.value||''};}

  window.rutaCloudSignUp=async()=>{const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signUp(x);if(error)status=error.message;else if(data.session){user=data.user;initializedUserId=null;await ready(true);status=c('synced');}else status=c('check');panelRefresh();};
  window.rutaCloudSignIn=async()=>{const x=creds();const {data,error}=await client.auth.signInWithPassword(x);if(error)status=error.message;else{user=data.user;initializedUserId=null;await ready(true);status=c('synced');}panelRefresh();};
  window.rutaCloudSignOut=async()=>{if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();user=null;initializedUserId=null;status='';panelRefresh();};
  window.rutaCloudSyncNow=async()=>{if(user){await reconcileVehicles();await pull(false);status=c('synced');}panelRefresh();};

  window.rutaSelectVehicle=async(id)=>{
    if(!fleet?.vehicles?.[id]||id===vehicleId)return;
    persistFleet();
    vehicleId=id; fleet.activeVehicleId=id; state=normalizeState(fleet.vehicles[id].data); persistFleet();
    if(typeof activeTab!=='undefined'&&activeTab==='trips')activeTab='home';
    if(window.applyTheme)applyTheme(); document.documentElement.lang=state.settings.language==='en'?'en':'fil'; if(window.render)render();
    renderVehicleBar();
    if(client&&user) await pull(false);
  };

  function typeLabel(rec){ return rec?.vehicleType==='motorcycle'?c('motorcycle'):c('car'); }

  window.rutaManageVehicles=()=>{
    const rows=vehicleList();
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${c('vehicles')}</h3>${rows.map(v=>`<div class="ruta-vehicle-card"><div class="title">${esc(vehicleDisplayName(v))}${v.id===vehicleId?` <span class="ruta-source">${c('active')}</span>`:''}</div><div class="sub">${esc(typeLabel(v))}${[v.year,v.make,v.model,v.trim].filter(Boolean).length?` • ${esc([v.year,v.make,v.model,v.trim].filter(Boolean).join(' '))}`:''}</div><div class="ruta-vehicle-actions"><button class="ruta-mini-btn" onclick="rutaSelectVehicle('${v.id}');closeOverlay()">${c('select')}</button><button class="ruta-mini-btn ruta-danger" onclick="rutaRemoveVehicle('${v.id}')">${c('remove')}</button></div></div>`).join('')}<div class="form-actions"><button class="btn btn-secondary" onclick="rutaOpenAddVehicle()">${c('add_vehicle')}</button><button class="btn btn-primary" onclick="closeOverlay()">${typeof t==='function'?t('close'):'Close'}</button></div></div></div>`);
  };

  async function vpicJson(url){
    const r=await fetch(url,{headers:{Accept:'application/json'}}); if(!r.ok) throw new Error('Vehicle lookup unavailable'); return r.json();
  }
  window.rutaVehicleTypeChanged=()=>{document.getElementById('rv_make').value='';document.getElementById('rv_model').value='';loadMakes();};
  async function loadMakes(){
    const type=document.getElementById('rv_type')?.value||'car'; const list=document.getElementById('rv_makes'); if(!list)return;
    list.innerHTML='';
    try{const j=await vpicJson(`${VPIC_BASE}/GetMakesForVehicleType/${type==='motorcycle'?'motorcycle':'car'}?format=json`); const names=[...new Set((j.Results||[]).map(x=>x.MakeName).filter(Boolean))].sort(); list.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join('');}catch(e){}
  }
  window.rutaLoadModels=async()=>{
    const type=document.getElementById('rv_type')?.value||'car'; const year=Number(document.getElementById('rv_year')?.value); const make=(document.getElementById('rv_make')?.value||'').trim(); const list=document.getElementById('rv_models'); if(!list||!year||!make)return;
    list.innerHTML='';
    try{const j=await vpicJson(`${VPIC_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicletype/${type==='motorcycle'?'motorcycle':'car'}?format=json`); const names=[...new Set((j.Results||[]).map(x=>x.Model_Name).filter(Boolean))].sort(); list.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join('');}catch(e){}
  };

  window.rutaOpenAddVehicle=()=>{
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${c('add_vehicle_title')}</h3><div class="field"><label>${c('vehicle_type')}</label><select id="rv_type" onchange="rutaVehicleTypeChanged()"><option value="car">${c('car')}</option><option value="motorcycle">${c('motorcycle')}</option></select></div><div class="field-row"><div class="field"><label>${c('year')}</label><input id="rv_year" type="number" min="1996" max="2100" value="${new Date().getFullYear()}" oninput="rutaLoadModels()"></div><div class="field"><label>${c('current_odo')}</label><input id="rv_odo" type="number" min="0" step="1" value="0"></div></div><div class="field"><label>${c('make')}</label><input id="rv_make" type="text" list="rv_makes" autocomplete="off" oninput="rutaLoadModels()"><datalist id="rv_makes"></datalist></div><div class="field"><label>${c('model')}</label><input id="rv_model" type="text" list="rv_models" autocomplete="off"><datalist id="rv_models"></datalist></div><div class="field"><label>${c('trim')}</label><input id="rv_trim" type="text"></div><div class="field"><label>${c('vehicle_name')}</label><input id="rv_name" type="text" placeholder="${esc(c('vehicle_name_hint'))}"></div><div class="ruta-plan-note">${c('lookup_note')}</div><label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-bottom:14px"><input id="rv_plan" type="checkbox" checked style="width:auto;margin-top:3px"> <span>${c('add_plan')}</span></label><div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${typeof t==='function'?t('cancel'):'Cancel'}</button><button class="btn btn-primary" onclick="rutaSaveVehicle()">${typeof t==='function'?t('save'):'Save'}</button></div></div></div>`);
    setTimeout(loadMakes,0);
  };

  window.rutaSaveVehicle=async()=>{
    const type=document.getElementById('rv_type')?.value==='motorcycle'?'motorcycle':'car';
    const year=Number(document.getElementById('rv_year')?.value)||null;
    const make=(document.getElementById('rv_make')?.value||'').trim(); const model=(document.getElementById('rv_model')?.value||'').trim(); const trim=(document.getElementById('rv_trim')?.value||'').trim();
    const odo=Math.max(0,Number(document.getElementById('rv_odo')?.value)||0); let name=(document.getElementById('rv_name')?.value||'').trim();
    const addPlan=document.getElementById('rv_plan')?.checked!==false;
    if(!name) name=[year,make,model].filter(Boolean).join(' ')||c('custom_vehicle');
    const id=uuid(); const data=blankVehicleState(); data.settings.odometer=odo;
    const rec={id,name,vehicleType:type,year,make,model,trim,engine:'',transmission:'',planSource:'',data};
    fleet.vehicles[id]=rec; persistFleet();
    if(client&&user){ try{await insertVehicle(rec);}catch(e){status=e.message||String(e);} }
    await window.rutaSelectVehicle(id);
    if(addPlan){ closeOverlay(); await window.rutaShowMaintenancePlan(); } else { closeOverlay(); renderVehicleBar(); }
  };

  window.rutaRemoveVehicle=async(id)=>{
    const rows=vehicleList(); if(rows.length<=1){alert(c('last_vehicle'));return;} if(!confirm(c('remove_vehicle')))return;
    if(client&&user){const {error}=await client.from('ruta_vehicles').update({archived_at:nowIso()}).eq('id',id).eq('user_id',user.id);if(error){status=error.message;return;}}
    delete fleet.vehicles[id];
    if(vehicleId===id){const next=Object.keys(fleet.vehicles)[0];vehicleId=next;fleet.activeVehicleId=next;state=normalizeState(fleet.vehicles[next].data);}
    persistFleet(); if(window.applyTheme)applyTheme(); if(window.render)render(); renderVehicleBar(); status=c('vehicle_removed'); window.rutaManageVehicles();
    if(client&&user)await pull(false);
  };

  async function exactTemplate(rec){
    if(!client||!rec?.make||!rec?.model)return null;
    try{
      const {data,error}=await client.from('ruta_maintenance_templates').select('*').eq('vehicle_type',rec.vehicleType||'car').ilike('make',rec.make).ilike('model',rec.model).eq('is_verified',true);
      if(error)return null;
      const y=Number(rec.year)||0;
      return (data||[]).find(x=>(!x.year_from||y>=x.year_from)&&(!x.year_to||y<=x.year_to))||null;
    }catch(e){return null;}
  }

  function generalPlan(rec){
    const car=[
      {key:'engine_oil_filter',intervalKm:10000}, {key:'tire_rotation',intervalKm:10000}, {key:'brake_inspection',intervalKm:10000}, {key:'engine_air_filter',intervalKm:20000}
    ];
    const moto=[
      {key:'engine_oil_filter',intervalKm:5000}, {key:'brake_inspection',intervalKm:5000}, {key:'tire_inspection',intervalKm:5000}, {key:'engine_air_filter',intervalKm:10000}, {key:'spark_plug',intervalKm:10000}
    ];
    const items=(rec?.vehicleType==='motorcycle'?moto:car).map(x=>({...x,name:planNames[lang()][x.key]}));
    return {kind:'general',label:c('general_plan'),items,matrix:items};
  }

  async function suggestedPlan(rec){
    const exact=await exactTemplate(rec);
    if(exact){
      const items=(Array.isArray(exact.items)?exact.items:[]).map(x=>({key:x.key||x.template_key||'',name:x.name||x.label||'Maintenance item',intervalKm:Number(x.intervalKm||x.interval_km||5000)}));
      return {kind:'public_template',label:exact.source_label||c('exact_plan'),sourceUrl:exact.source_url||'',items,matrix:items};
    }
    return generalPlan(rec);
  }

  window.rutaShowMaintenancePlan=async()=>{
    const rec=currentRec(); if(!rec)return; const plan=await suggestedPlan(rec); pendingPlan={vehicleId,plan};
    const existingKeys=new Set(state.maintenance.map(x=>x.templateKey).filter(Boolean));
    const items=(plan.items||[]).filter(x=>!existingKeys.has(x.key));
    const matrix=Array.isArray(plan.matrix)&&plan.matrix.length?plan.matrix:(plan.items||[]);
    const message=plan.kind==='public_template'?c('exact_plan'):c('no_exact');
    const matrixHtml=matrix.map(x=>{const bits=[];if(Number(x.dueKm||0)>0)bits.push(`${c('due_at')} ${Number(x.dueKm).toLocaleString('en-PH')} km`);if(Number(x.intervalKm||0)>0)bits.push(`${typeof t==='function'?t('every'):'Every'} ${Number(x.intervalKm).toLocaleString('en-PH')} km`);return `<div class="ruta-vehicle-card"><div class="title">${esc(x.name)}</div><div class="sub">${bits.join(' • ')}</div></div>`;}).join('');
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${c('plan_title')}</h3><div class="ruta-plan-note">${esc(message)}</div><div class="ruta-plan-note"><strong>${c('source')}:</strong> ${esc(plan.label)}</div>${plan.sourceUrl?`<div class="ruta-plan-note"><a href="${esc(plan.sourceUrl)}" target="_blank" rel="noopener noreferrer">${c('view_source')}</a></div>`:''}${matrixHtml||`<div class="ruta-plan-note">${c('no_items')}</div>`}<div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${typeof t==='function'?t('cancel'):'Cancel'}</button><button class="btn btn-primary" ${items.length?'':'disabled'} onclick="rutaApplyMaintenancePlan()">${c('apply_plan')}</button></div></div></div>`);
  };

  window.rutaApplyMaintenancePlan=async()=>{
    if(!pendingPlan||pendingPlan.vehicleId!==vehicleId)return;
    const {plan}=pendingPlan; const existingKeys=new Set(state.maintenance.map(x=>x.templateKey).filter(Boolean)); const added=[];
    for(const x of plan.items){
      if(existingKeys.has(x.key))continue;
      const item={id:itemId(),name:x.name||planNames[lang()][x.key]||'Maintenance item',intervalKm:Number(x.intervalKm||5000),lastOdo:currentOdo(),source:plan.kind==='public_template'?'public_template':'general',sourceNote:plan.label,templateKey:x.key||''};
      state.maintenance.push(item); added.push(item);
    }
    const rec=currentRec(); if(rec)rec.planSource=plan.label;
    await saveData();
    if(client&&user){for(const x of added)await pushMaint(x);await pushVehicle();}
    pendingPlan=null; closeOverlay(); if(window.render)render(); status=c('plan_added');
  };

  window.rutaRemoveFuel=async(id)=>{
    if(!confirm(c('remove_fuel')))return;
    state.fuel=state.fuel.filter(x=>String(x.id)!==String(id)); await saveData();
    if(client&&user){const {error}=await client.from('ruta_fuel_entries').update({deleted_at:nowIso()}).eq('id',String(id)).eq('vehicle_id',vehicleId).eq('user_id',user.id);if(error)status=error.message;}
    if(window.render)render(); status=c('fuel_removed');
  };

  window.rutaRemoveMaint=async(id)=>{
    if(!confirm(c('remove_maint')))return;
    state.maintenance=state.maintenance.filter(x=>String(x.id)!==String(id)); await saveData();
    if(client&&user){const {error}=await client.from('ruta_maintenance_items').update({deleted_at:nowIso()}).eq('id',String(id)).eq('vehicle_id',vehicleId).eq('user_id',user.id);if(error)status=error.message;}
    if(window.render)render(); status=c('maint_removed');
  };

  function wrapFunctions(){
    if(window.__rutaFleetWrapped)return; window.__rutaFleetWrapped=true;
    if(typeof TABS!=='undefined'){
      const ti=TABS.findIndex(x=>x.id==='trips'); if(ti>=0)TABS.splice(ti,1);
    }
    if(typeof activeTab!=='undefined'&&activeTab==='trips')activeTab='home';

    const originalSave=window.saveData;
    if(originalSave)window.saveData=async function(...a){const r=await originalSave.apply(this,a);persistFleet();return r;};

    const oldRender=window.render;
    if(oldRender)window.render=function(...a){const r=oldRender.apply(this,a);renderVehicleBar();setTimeout(decorateCurrentView,0);return r;};

    const oldSettings=window.openSettings;
    if(oldSettings)window.openSettings=function(...a){const r=oldSettings.apply(this,a);setTimeout(injectPanels,0);return r;};

    const oldLocalized=window.localizedMaintenanceName;
    if(oldLocalized)window.localizedMaintenanceName=function(item){if(item?.templateKey&&planNames[lang()][item.templateKey])return planNames[lang()][item.templateKey];return oldLocalized(item);};

    const wrap=(name,after)=>{const old=window[name];if(!old)return;window[name]=async function(...a){const r=await old.apply(this,a);persistFleet();try{await after(...a);}catch(e){status=e.message||String(e);}return r;};};
    wrap('setLanguage',pushVehicle); wrap('setCurrency',pushVehicle); wrap('setTheme',pushVehicle); wrap('saveStartingOdo',pushVehicle);
    wrap('saveFuelForm',async()=>{await pushFuel(state.fuel[state.fuel.length-1]);await pushVehicle();});
    wrap('saveMaintForm',async()=>{await pushMaint(state.maintenance[state.maintenance.length-1]);});
    wrap('saveEditMaintForm',async id=>{await pushMaint(state.maintenance.find(x=>x.id===id));});
    wrap('markDone',async id=>{await pushMaint(state.maintenance.find(x=>x.id===id));});
  }

  async function init(){
    try{
      while(typeof state === 'undefined' || !state) await new Promise(r=>setTimeout(r,30));
      ensureFleet(); injectStyles(); wrapFunctions(); if(window.render)render();
      const lib=await loadSupabase();
      client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data}=await client.auth.getSession(); user=data.session?.user||null;
      client.auth.onAuthStateChange((_e,s)=>{
        const next=s?.user||null; user=next;
        if(user && initializedUserId!==user.id) setTimeout(()=>ready(true),0);
        if(!user){initializedUserId=null;if(channel){client.removeChannel(channel);channel=null;}}
      });
      if(user) await ready(true);
      window.addEventListener('focus',()=>{if(user)schedulePull();});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)schedulePull();});
    }catch(e){ status=e.message||String(e); }
  }
  init();
})();
