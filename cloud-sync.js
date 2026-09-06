(() => {
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  const FLEET_KEY = 'ruta-fleet-v2';
  const OUTBOX_KEY = 'ruta-sync-outbox-v1';
  const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
  const RUTA_VERSION = '1.2.0';
  const SYNTHIQ_URL = 'https://synthiq-media-browser.vercel.app/';
  const ADMIN_EMAIL = 'ferdz.degracia@gmail.com';
  const SUPPORT_CACHE_KEY = 'ruta-support-methods-v1';

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
  let outbox = [];
  let flushing = false;

  const copy = {
    en: {
      cloud_title:'Cloud sync', cloud_desc:'Use the same account on Android and iPhone to keep RUTA data in sync.',
      about_title:'About RUTA', about_desc:'About the app, why it exists, version and credits.', about_open:'Open About',
      support_title:'Support RUTA', support_desc:'Optional donations help with hosting, testing devices, coffee and the occasional bug hunt.', support_open:'Open Support',
      support_empty:'No donation methods are published yet.', support_admin_hint:'Admin mode: you can add, edit or remove e-wallet details.', support_readonly:'Donation details are read-only. Admin editing appears only when the authorized account is signed in.',
      add_support:'+ Add e-wallet', edit_support:'Edit e-wallet', provider:'Provider / e-wallet', account_name:'Account name', account_id:'Account number / ID', payment_link:'Payment link (optional)', note:'Note (optional)', active_label:'Publish this method', sort_order:'Display order',
      support_saved:'Support method saved.', support_removed:'Support method removed.', remove_support:'Remove this e-wallet method?', open_payment:'Open payment link', copy_value:'Copy', copied:'Copied', loading_support:'Loading support options…', support_error:'Support information is unavailable right now.', official_site:'Official SynthIQ site',
      email:'Email', password:'Password', show_password:'Show password', signin:'Sign in', signup:'Create account', signout:'Sign out', sync:'Sync now',
      connected:'Connected as', synced:'Synced', check:'Check your email to confirm your account, then sign in.',
      invalid:'Enter a valid email and a password with at least 6 characters.',
      sync_loading:'Connecting to cloud…', pending_sync:'Offline changes saved — waiting to sync.', stale_change:'A newer cloud change was kept; a stale local edit was skipped.',
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
      about_title:'About RUTA', about_desc:'Tungkol sa app, bakit ito mahalaga, version at credits.', about_open:'Buksan ang About',
      support_title:'Support RUTA', support_desc:'Optional donations para sa hosting, testing devices, kape at paminsan-minsang bug hunt.', support_open:'Buksan ang Support',
      support_empty:'Wala pang published na donation method.', support_admin_hint:'Admin mode: puwede kang magdagdag, mag-edit o mag-alis ng e-wallet details.', support_readonly:'Read-only ang donation details. Lalabas lang ang admin editing kapag naka-sign in ang authorized account.',
      add_support:'+ Magdagdag ng e-wallet', edit_support:'I-edit ang e-wallet', provider:'Provider / e-wallet', account_name:'Pangalan ng account', account_id:'Account number / ID', payment_link:'Payment link (opsyonal)', note:'Note (opsyonal)', active_label:'I-publish ang method na ito', sort_order:'Display order',
      support_saved:'Na-save ang support method.', support_removed:'Inalis ang support method.', remove_support:'Alisin ang e-wallet method na ito?', open_payment:'Buksan ang payment link', copy_value:'Kopyahin', copied:'Nakopya', loading_support:'Kinukuha ang support options…', support_error:'Hindi available ang support information ngayon.', official_site:'Official SynthIQ site',
      email:'Email', password:'Password', show_password:'Ipakita ang password', signin:'Mag-sign in', signup:'Gumawa ng account', signout:'Mag-sign out', sync:'I-sync ngayon',
      connected:'Nakakonekta bilang', synced:'Naka-sync', check:'I-check ang email mo para kumpirmahin ang account, pagkatapos ay mag-sign in.',
      invalid:'Maglagay ng valid na email at password na may hindi bababa sa 6 na character.',
      sync_loading:'Kumokonekta sa cloud…', pending_sync:'Naka-save ang offline changes — naghihintay mag-sync.', stale_change:'Mas bagong cloud change ang pinanatili; nilaktawan ang lumang local edit.',
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
      updatedAt:v.updated_at || null,
      archivedAt:v.archived_at || null,
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

  function fuelPayload(x,vid=vehicleId){
    return {id:String(x.id),user_id:user.id,vehicle_id:vid,date:x.date,station:x.station||'',odometer:Number(x.odometer||0),liters:Number(x.liters||0),price_per_liter:Number(x.pricePerLiter||0),total:Number(x.total||0),lat:x.lat??null,lng:x.lng??null,deleted_at:null};
  }
  function maintPayload(x,vid=vehicleId){
    return {id:String(x.id),user_id:user.id,vehicle_id:vid,name:x.name||'Maintenance item',interval_km:Number(x.intervalKm||5000),last_odo:Number(x.lastOdo||0),source:x.source||'custom',source_note:x.sourceNote||null,template_key:x.templateKey||null,deleted_at:null};
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

  function loadOutbox(){
    try{ const x=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]'); outbox=Array.isArray(x)?x:[]; }
    catch(e){ outbox=[]; }
  }
  function persistOutbox(){ try{ localStorage.setItem(OUTBOX_KEY,JSON.stringify(outbox)); }catch(e){} }
  function opIdentity(op){ return `${op.userId||''}|${op.type}|${op.id}`; }
  function queueOp(op){
    if(!user)return;
    const entry={...clone(op),userId:user.id,queuedAt:nowIso()};
    const key=opIdentity(entry);
    outbox=outbox.filter(x=>opIdentity(x)!==key);
    outbox.push(entry); persistOutbox();
  }
  function hasPendingForUser(){ return !!user && outbox.some(x=>x.userId===user.id); }
  function newerThan(remote,base){
    if(!remote||!base)return false;
    const a=Date.parse(remote), b=Date.parse(base);
    return Number.isFinite(a)&&Number.isFinite(b)&&a>b+5;
  }
  function updateLocalVersion(op,row){
    if(!row)return;
    if(op.type==='vehicle'){
      const rec=fleet?.vehicles?.[op.id];
      if(rec){ rec.updatedAt=row.updated_at||rec.updatedAt||null; rec.archivedAt=row.archived_at||null; }
      return;
    }
    const stamp=row.updated_at||null;
    const rec=fleet?.vehicles?.[op.vehicleId]; if(!rec?.data)return;
    const arr=op.type==='fuel'?rec.data.fuel:rec.data.maintenance;
    const item=Array.isArray(arr)?arr.find(x=>String(x.id)===String(op.id)):null;
    if(item)item.updatedAt=stamp||item.updatedAt||null;
    if(op.vehicleId===vehicleId){
      const liveArr=op.type==='fuel'?state.fuel:state.maintenance;
      const live=Array.isArray(liveArr)?liveArr.find(x=>String(x.id)===String(op.id)):null;
      if(live)live.updatedAt=stamp||live.updatedAt||null;
    }
  }

  async function flushOutbox(){
    if(!client||!user||flushing)return hasPendingForUser();
    if(typeof navigator!=='undefined' && navigator.onLine===false){ status=c('pending_sync'); return hasPendingForUser(); }
    flushing=true;
    const keep=[];
    let hadConflict=false;
    try{
      for(const op of outbox){
        if(op.userId!==user.id){ keep.push(op); continue; }
        try{
          let remote=null, result=null;
          if(op.type==='vehicle'){
            const q=await client.from('ruta_vehicles').select('id,updated_at,archived_at').eq('id',op.id).eq('user_id',user.id).maybeSingle();
            if(q.error)throw q.error; remote=q.data;
            if(op.action==='archive'){
              if(remote && !remote.archived_at){
                const r=await client.from('ruta_vehicles').update({archived_at:op.deletedAt||nowIso()}).eq('id',op.id).eq('user_id',user.id).select().single();
                if(r.error)throw r.error; result=r.data;
              }
            }else{
              if(remote?.archived_at || (remote && newerThan(remote.updated_at,op.baseUpdatedAt))){ hadConflict=true; status=c('stale_change'); continue; }
              if(remote){
                const r=await client.from('ruta_vehicles').update(op.payload).eq('id',op.id).eq('user_id',user.id).select().single();
                if(r.error)throw r.error; result=r.data;
              }else{
                const r=await client.from('ruta_vehicles').insert({id:op.id,user_id:user.id,...op.payload}).select().single();
                if(r.error)throw r.error; result=r.data;
              }
            }
          }else{
            const table=op.type==='fuel'?'ruta_fuel_entries':'ruta_maintenance_items';
            const q=await client.from(table).select('id,updated_at,deleted_at').eq('id',String(op.id)).eq('user_id',user.id).maybeSingle();
            if(q.error)throw q.error; remote=q.data;
            if(op.action==='delete'){
              if(remote && !remote.deleted_at){
                const r=await client.from(table).update({deleted_at:op.deletedAt||nowIso()}).eq('id',String(op.id)).eq('user_id',user.id).select().single();
                if(r.error)throw r.error; result=r.data;
              }
            }else{
              if(remote?.deleted_at || (remote && newerThan(remote.updated_at,op.baseUpdatedAt))){ hadConflict=true; status=c('stale_change'); continue; }
              const r=await client.from(table).upsert({...op.payload,id:String(op.id),user_id:user.id,vehicle_id:op.vehicleId},{onConflict:'id'}).select().single();
              if(r.error)throw r.error; result=r.data;
            }
          }
          if(result)updateLocalVersion(op,result);
        }catch(e){ keep.push(op); status=c('pending_sync'); }
      }
      outbox=keep; persistOutbox(); persistFleet();
      if(hadConflict)setTimeout(()=>schedulePull(),0);
      return hasPendingForUser();
    }finally{ flushing=false; }
  }

  function queueVehicle(rec=currentRec()){
    if(!user||!rec)return;
    queueOp({type:'vehicle',action:'upsert',id:rec.id,baseUpdatedAt:rec.updatedAt||null,payload:vehiclePayload(rec)});
  }
  function queueFuel(x,vid=vehicleId){ if(user&&x)queueOp({type:'fuel',action:'upsert',id:String(x.id),vehicleId:vid,baseUpdatedAt:x.updatedAt||null,payload:fuelPayload(x,vid)}); }
  function queueMaint(x,vid=vehicleId){ if(user&&x)queueOp({type:'maint',action:'upsert',id:String(x.id),vehicleId:vid,baseUpdatedAt:x.updatedAt||null,payload:maintPayload(x,vid)}); }

  async function pushVehicle(){ if(!client||!user||!vehicleId)return; const rec=currentRec(); if(!rec)return; queueVehicle(rec); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }
  async function pushFuel(x,vid=vehicleId){ if(!client||!user||!x)return; queueFuel(x,vid); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }
  async function pushMaint(x,vid=vehicleId){ if(!client||!user||!x)return; queueMaint(x,vid); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }

  async function insertVehicle(rec){
    if(!client||!user||!rec)return;
    queueOp({type:'vehicle',action:'upsert',id:rec.id,baseUpdatedAt:rec.updatedAt||null,payload:vehiclePayload(rec)});
    await flushOutbox();
  }

  async function mergeMissing(table, rows, mapper){
    if(!rows?.length) return;
    const {data,error}=await client.from(table).select('id').eq('vehicle_id',vehicleId).eq('user_id',user.id);
    if(error) throw error;
    const ids=new Set((data||[]).map(r=>String(r.id)));
    const missing=rows.filter(r=>!ids.has(String(r.id))).map(r=>mapper(r,vehicleId));
    if(missing.length){ const {error:e}=await client.from(table).insert(missing); if(e) throw e; }
  }

  async function fetchCloudVehicles(includeArchived=false){
    let q=client.from('ruta_vehicles').select('*').eq('user_id',user.id).order('created_at',{ascending:true});
    if(!includeArchived)q=q.is('archived_at',null);
    const {data,error}=await q;
    if(error) throw error;
    return data || [];
  }

  function stateFromVehicleRow(v){
    const d=blankVehicleState();
    d.settings.odometer=Number(v.odometer||0); d.settings.currency=v.currency||'₱'; d.settings.language=v.language||'fil'; d.settings.theme=v.theme||'dark';
    return d;
  }

  async function reconcileVehicles(){
    let allRows=await fetchCloudVehicles(true);
    let activeRows=allRows.filter(v=>!v.archived_at);
    const archivedIds=new Set(allRows.filter(v=>v.archived_at).map(v=>v.id));
    for(const id of archivedIds)delete fleet.vehicles[id];

    let locals=vehicleList();
    if(activeRows.length && locals.length===1 && !allRows.some(v=>v.id===locals[0].id)){
      const old=locals[0], target=activeRows[0];
      const mapped={...cloudMeta(target),data:normalizeState(old.data)};
      delete fleet.vehicles[old.id]; fleet.vehicles[target.id]=mapped;
      fleet.activeVehicleId=target.id; vehicleId=target.id; state=mapped.data; persistFleet();
      locals=vehicleList();
    }

    const allIds=new Set(allRows.map(v=>v.id));
    let inserted=false;
    for(const rec of locals){
      if(!allIds.has(rec.id)){ await insertVehicle(rec); inserted=true; }
    }
    if(inserted){
      allRows=await fetchCloudVehicles(true); activeRows=allRows.filter(v=>!v.archived_at);
    }

    const activeIds=new Set(activeRows.map(v=>v.id));
    for(const row of activeRows){
      const meta=cloudMeta(row), existing=fleet.vehicles[row.id];
      if(existing)Object.assign(existing,meta,{data:existing.data||stateFromVehicleRow(row)});
      else fleet.vehicles[row.id]={...meta,data:stateFromVehicleRow(row)};
    }
    for(const row of allRows){ if(row.archived_at)delete fleet.vehicles[row.id]; }

    if(!fleet.vehicles[vehicleId]){
      const next=Object.keys(fleet.vehicles).find(id=>activeIds.has(id)) || Object.keys(fleet.vehicles)[0];
      if(next){ vehicleId=next; fleet.activeVehicleId=next; state=normalizeState(fleet.vehicles[next].data); }
    }
    persistFleet();
  }

  async function pull(mergeFirst=false){
    if(!client||!user||!vehicleId||busy) return;
    if(await flushOutbox()){ status=c('pending_sync'); return; }
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
      if(hasPendingForUser()){ status=c('pending_sync'); return; }

      const legacyTrips=Array.isArray(state.trips)?state.trips:[];
      state.settings.odometer=Number(v.data.odometer||0); state.settings.currency=v.data.currency||'₱'; state.settings.language=v.data.language||'fil'; state.settings.theme=v.data.theme||'dark';
      state.fuel=(f.data||[]).map(x=>({id:x.id,date:x.date,station:x.station,odometer:Number(x.odometer||0),liters:Number(x.liters||0),pricePerLiter:Number(x.price_per_liter||0),total:Number(x.total||0),lat:x.lat,lng:x.lng,updatedAt:x.updated_at||null}));
      state.maintenance=(m.data||[]).map(x=>({id:x.id,name:x.name,intervalKm:Number(x.interval_km||5000),lastOdo:Number(x.last_odo||0),source:x.source||'custom',sourceNote:x.source_note||'',templateKey:x.template_key||'',updatedAt:x.updated_at||null}));
      state.trips=legacyTrips;

      const rec=currentRec(); if(rec){ Object.assign(rec,cloudMeta(v.data),{data:normalizeState(state)}); }
      persistFleet();
      if(window.applyTheme) applyTheme(); document.documentElement.lang=state.settings.language==='en'?'en':'fil'; if(window.render) render();
      status=c('synced');
    }catch(e){ status=e.message||String(e); }
    finally{
      busy=false;
      if(hasPendingForUser())setTimeout(async()=>{const pending=await flushOutbox();if(!pending)schedulePull();},0);
    }
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
      .ruta-about-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 14px}.ruta-about-logo{font:700 28px 'JetBrains Mono',monospace;letter-spacing:1px}.ruta-about-logo span{color:var(--amber)}.ruta-version{font:700 12px 'JetBrains Mono',monospace;color:var(--teal);border:1px solid var(--panel-border-light);padding:4px 7px;border-radius:4px}.ruta-info-card,.ruta-support-method{background:var(--bg);border:1px solid var(--panel-border-light);border-radius:6px;padding:13px 14px;margin-bottom:10px}.ruta-info-card h4{font-size:13px;margin:0 0 7px}.ruta-info-card p{font-size:12px;line-height:1.55;color:var(--muted);margin:0}.ruta-credit{font-weight:800;font-size:14px}.ruta-credit-sub{font-size:12px;color:var(--teal);margin-top:3px}.ruta-support-title{font-weight:800;font-size:14px}.ruta-support-value{font:600 12px 'JetBrains Mono',monospace;margin-top:5px}.ruta-support-note{font-size:12px;color:var(--muted);line-height:1.45;margin-top:6px}.ruta-support-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.ruta-support-actions .done-btn{flex:0 0 auto}
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
    fleetPanel(); cloudPanel(); aboutPanel(); supportPanel();
  }

  function settingsActions(sheet){
    if(!sheet)return null;
    const rows=[...sheet.children].filter(el=>el.classList?.contains('form-actions'));
    return rows[rows.length-1]||null;
  }

  function fleetPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaFleetPanel'))return;
    const actions=settingsActions(sheet);
    const rec=currentRec();
    const box=document.createElement('div'); box.id='rutaFleetPanel'; box.className='field';
    const detail=[rec?.year,rec?.make,rec?.model,rec?.trim].filter(Boolean).join(' ');
    box.innerHTML=`<label>${c('vehicles')}</label><div style="font-size:13px;font-weight:700;margin-bottom:3px">${esc(vehicleDisplayName(rec))}</div>${detail?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(detail)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary" onclick="rutaManageVehicles()">${c('manage')}</button><button class="btn btn-secondary" onclick="rutaOpenAddVehicle()">${c('add_vehicle')}</button></div><button class="geo-btn" style="margin-top:10px" onclick="rutaShowMaintenancePlan()">${c('plan')}</button>`;
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

  function cloudPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaCloudPanel'))return;
    const actions=settingsActions(sheet);
    const box=document.createElement('div'); box.id='rutaCloudPanel'; box.className='field';
    if(user){
      const pending=hasPendingForUser()?` • ${esc(c('pending_sync'))}`:'';
      box.innerHTML=`<label>${c('cloud_title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${c('connected')} ${esc(user.email||'')}${pending}${status?` • ${esc(status)}`:''}</div><div class="form-actions"><button class="btn btn-secondary" onclick="rutaCloudSyncNow()">${c('sync')}</button><button class="btn btn-secondary" onclick="rutaCloudSignOut()">${c('signout')}</button></div>`;
    }else{
      const disabled=client?'':' disabled';
      const info=status||(!client?c('sync_loading'):'');
      box.innerHTML=`<label>${c('cloud_title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${c('cloud_desc')}</div><input id="ruta_sync_email" type="email" autocomplete="email" placeholder="${c('email')}" style="margin-bottom:8px"><input id="ruta_sync_password" type="password" autocomplete="current-password" placeholder="${c('password')}"><label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--muted);cursor:pointer"><input id="ruta_sync_show_password" type="checkbox" onchange="rutaToggleCloudPassword(this.checked)" style="width:auto;margin:0"><span>${c('show_password')}</span></label>${info?`<div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(info)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary"${disabled} onclick="rutaCloudSignIn()">${c('signin')}</button><button class="btn btn-secondary"${disabled} onclick="rutaCloudSignUp()">${c('signup')}</button></div>`;
    }
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

  function aboutPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaAboutPanel'))return;
    const actions=settingsActions(sheet);
    const box=document.createElement('div'); box.id='rutaAboutPanel'; box.className='field';
    box.innerHTML=`<label>${c('about_title')}</label><div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px">${c('about_desc')}</div><button class="geo-btn" style="margin-bottom:0" onclick="rutaOpenAbout()">${c('about_open')}</button>`;
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

  function supportPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaSupportPanel'))return;
    const actions=settingsActions(sheet);
    const box=document.createElement('div'); box.id='rutaSupportPanel'; box.className='field';
    box.innerHTML=`<label>${c('support_title')}</label><div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px">${c('support_desc')}</div><button class="geo-btn" style="margin-bottom:0" onclick="rutaOpenSupport()">${c('support_open')}</button>`;
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

  function aboutWords(){
    if(lang()==='en') return {
      intro:'RUTA is a local-first vehicle companion for fuel, odometer and maintenance records across cars and motorcycles. It keeps the boring details together so future-you has receipts when present-you forgets.',
      whyTitle:'Why it matters',
      why:'A clean history helps you understand running costs, keep preventive maintenance on schedule, and avoid guessing when something was last serviced. Multi-vehicle profiles keep each car or motorcycle separate, while optional cloud sync lets the same account move between Android and iPhone.',
      localTitle:'Built local-first',
      local:'Your core vehicle data stays usable on the device even when the connection is unreliable. Cloud sync adds cross-device continuity instead of making the app useless without a signal.',
      devTitle:'Developer-ish credits',
      dev:'Ferdinand Degracia — Alleged Developer',
      ai:'AI-Assisted Engineering',
      joke:'Built with stubbornness, caffeine, and an AI that has been told “do not change anything else” often enough to qualify as a project requirement. Any resemblance to conventional software engineering is mostly intentional. No vehicles were emotionally harmed in the making of this app.',
      support:'Support RUTA'
    };
    return {
      intro:'Ang RUTA ay local-first vehicle companion para sa fuel, odometer at maintenance records ng mga kotse at motorsiklo. Pinagsasama nito ang mga boring pero importanteng detalye para may resibo si future-you kapag nakalimot si present-you.',
      whyTitle:'Bakit mahalaga',
      why:'Mas madaling makita ang running costs, preventive maintenance at service history kapag nasa isang lugar ang records. Hiwalay ang bawat sasakyan, at optional ang cloud sync para magamit ang parehong account sa Android at iPhone.',
      localTitle:'Local-first ang design',
      local:'Gumagana pa rin ang core vehicle data sa device kahit mahina o walang internet. Ang cloud sync ay dagdag para sa cross-device continuity, hindi requirement para maging useful ang app.',
      devTitle:'Developer-ish credits',
      dev:'Ferdinand Degracia — Alleged Developer',
      ai:'AI-Assisted Engineering',
      joke:'Ginawa gamit ang tiyaga, kape, at AI na nasabihan ng “huwag mong galawin ang iba” nang sapat na beses para maging official project requirement. Karamihan ng pagkakahawig nito sa normal software engineering ay sinadya. Walang sasakyang nasaktan emotionally habang ginagawa ang app.',
      support:'Support RUTA'
    };
  }

  function isAdminUser(){ return String(user?.email||'').trim().toLowerCase()===ADMIN_EMAIL; }
  function safeHttpUrl(v){
    try{ const u=new URL(String(v||'')); return (u.protocol==='http:'||u.protocol==='https:')?u.href:''; }
    catch(e){ return ''; }
  }
  function openExternal(url){
    const safe=safeHttpUrl(url); if(!safe)return;
    const opened=window.open(safe,'_blank','noopener,noreferrer');
    if(!opened) window.location.href=safe;
  }
  window.rutaOpenSynthIQ=()=>openExternal(SYNTHIQ_URL);

  window.rutaOpenAbout=()=>{
    const a=aboutWords();
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${c('about_title')}</h3><div class="ruta-about-hero"><div class="ruta-about-logo">RUTA<span>.</span></div><div class="ruta-version">v${RUTA_VERSION}</div></div><div class="ruta-info-card"><p>${esc(a.intro)}</p></div><div class="ruta-info-card"><h4>${esc(a.whyTitle)}</h4><p>${esc(a.why)}</p></div><div class="ruta-info-card"><h4>${esc(a.localTitle)}</h4><p>${esc(a.local)}</p></div><div class="ruta-info-card"><h4>${esc(a.devTitle)}</h4><div class="ruta-credit">${esc(a.dev)}</div><div class="ruta-credit-sub">${esc(a.ai)}</div><p style="margin-top:10px">${esc(a.joke)}</p></div><div class="form-actions"><button class="btn btn-secondary" onclick="rutaOpenSynthIQ()">${c('official_site')} ↗</button><button class="btn btn-secondary" onclick="rutaOpenSupport()">${esc(a.support)}</button></div><div class="form-actions"><button class="btn btn-primary" onclick="closeOverlay()">${typeof t==='function'?t('close'):'Close'}</button></div></div></div>`);
  };

  let supportRows=[];
  function cachedSupportRows(){
    try{ const x=JSON.parse(localStorage.getItem(SUPPORT_CACHE_KEY)||'[]'); return Array.isArray(x)?x:[]; }
    catch(e){ return []; }
  }
  async function ensureSupportClient(){
    if(client)return client;
    try{
      const sdk=await loadSupabase();
      client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data}=await client.auth.getSession();
      if(data?.session?.user) user=data.session.user;
      return client;
    }catch(e){ return null; }
  }
  async function fetchSupportRows(){
    const sb=await ensureSupportClient();
    if(!sb){ supportRows=cachedSupportRows(); return supportRows; }
    const {data,error}=await sb.from('ruta_support_methods').select('id,provider,account_name,account_identifier,payment_url,note,is_active,sort_order,updated_at').order('sort_order',{ascending:true}).order('provider',{ascending:true});
    if(error){
      const cached=cachedSupportRows();
      if(cached.length){ supportRows=cached; return supportRows; }
      throw error;
    }
    supportRows=Array.isArray(data)?data:[];
    try{ localStorage.setItem(SUPPORT_CACHE_KEY,JSON.stringify(supportRows.filter(x=>x.is_active))); }catch(e){}
    return supportRows;
  }

  function supportMethodHtml(row){
    const pay=safeHttpUrl(row.payment_url);
    const hidden=isAdminUser()&&!row.is_active?` <span class="ruta-source">Hidden</span>`:'';
    const account=[row.account_name,row.account_identifier].filter(Boolean).map(esc).join(' • ');
    const copyBtn=row.account_identifier?`<button class="done-btn" data-copy="${esc(String(row.account_identifier))}" onclick="rutaCopySupportValue(this.dataset.copy)">${c('copy_value')}</button>`:'';
    const payBtn=pay?`<button class="done-btn" data-url="${esc(pay)}" onclick="rutaOpenPayment(this.dataset.url)">${c('open_payment')} ↗</button>`:'';
    const admin=isAdminUser()?`<button class="done-btn" onclick="rutaOpenSupportForm('${row.id}')">${typeof t==='function'?t('edit'):'Edit'}</button><button class="done-btn ruta-danger" onclick="rutaRemoveSupportMethod('${row.id}')">${c('remove')}</button>`:'';
    return `<div class="ruta-support-method"><div class="ruta-support-title">${esc(row.provider)}${hidden}</div>${account?`<div class="ruta-support-value">${account}</div>`:''}${row.note?`<div class="ruta-support-note">${esc(row.note)}</div>`:''}<div class="ruta-support-actions">${copyBtn}${payBtn}${admin}</div></div>`;
  }

  async function renderSupportPage(){
    const root=document.getElementById('rutaSupportContent'); if(!root)return;
    try{
      const rows=await fetchSupportRows();
      const admin=isAdminUser();
      root.innerHTML=`<div class="ruta-plan-note">${admin?c('support_admin_hint'):c('support_readonly')}</div>${rows.length?rows.map(supportMethodHtml).join(''):`<div class="empty-state" style="padding:24px 10px"><div class="msg">${c('support_empty')}</div></div>`}${admin?`<button class="geo-btn" onclick="rutaOpenSupportForm()">${c('add_support')}</button>`:''}`;
    }catch(e){ root.innerHTML=`<div class="ruta-plan-note">${c('support_error')}</div>`; }
  }

  window.rutaOpenSupport=async()=>{
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${c('support_title')}</h3><div class="ruta-plan-note">${c('support_desc')}</div><div id="rutaSupportContent"><div class="ruta-plan-note">${c('loading_support')}</div></div><div class="form-actions"><button class="btn btn-primary" onclick="closeOverlay()">${typeof t==='function'?t('close'):'Close'}</button></div></div></div>`);
    await renderSupportPage();
  };
  window.rutaOpenPayment=(url)=>openExternal(url);
  window.rutaCopySupportValue=async(value)=>{
    try{ await navigator.clipboard.writeText(String(value)); alert(c('copied')); }
    catch(e){ window.prompt(c('copy_value'),String(value)); }
  };

  window.rutaOpenSupportForm=(id='')=>{
    if(!isAdminUser())return;
    const row=supportRows.find(x=>x.id===id)||{};
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${id?c('edit_support'):c('add_support')}</h3><div class="field"><label>${c('provider')}</label><input id="rs_provider" type="text" value="${esc(row.provider||'')}" placeholder="e.g. GCash"></div><div class="field"><label>${c('account_name')}</label><input id="rs_name" type="text" value="${esc(row.account_name||'')}"></div><div class="field"><label>${c('account_id')}</label><input id="rs_account" type="text" value="${esc(row.account_identifier||'')}"></div><div class="field"><label>${c('payment_link')}</label><input id="rs_url" type="url" value="${esc(row.payment_url||'')}" placeholder="https://"></div><div class="field"><label>${c('note')}</label><input id="rs_note" type="text" value="${esc(row.note||'')}"></div><div class="field"><label>${c('sort_order')}</label><input id="rs_order" type="number" step="1" value="${Number(row.sort_order||0)}"></div><label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:14px"><input id="rs_active" type="checkbox" ${row.is_active===false?'':'checked'} style="width:auto"><span>${c('active_label')}</span></label><div class="form-actions"><button class="btn btn-secondary" onclick="rutaOpenSupport()">${typeof t==='function'?t('cancel'):'Cancel'}</button><button class="btn btn-primary" onclick="rutaSaveSupportMethod('${id}')">${typeof t==='function'?t('save'):'Save'}</button></div></div></div>`);
  };

  window.rutaSaveSupportMethod=async(id='')=>{
    if(!isAdminUser())return;
    const provider=(document.getElementById('rs_provider')?.value||'').trim();
    if(!provider)return;
    const rawUrl=(document.getElementById('rs_url')?.value||'').trim();
    const payload={provider,account_name:(document.getElementById('rs_name')?.value||'').trim()||null,account_identifier:(document.getElementById('rs_account')?.value||'').trim()||null,payment_url:rawUrl||null,note:(document.getElementById('rs_note')?.value||'').trim()||null,is_active:document.getElementById('rs_active')?.checked!==false,sort_order:Number(document.getElementById('rs_order')?.value)||0};
    const sb=await ensureSupportClient(); if(!sb)return;
    const q=id?sb.from('ruta_support_methods').update(payload).eq('id',id):sb.from('ruta_support_methods').insert(payload);
    const {error}=await q;
    if(error){ alert(error.message); return; }
    await rutaOpenSupport();
  };

  window.rutaRemoveSupportMethod=async(id)=>{
    if(!isAdminUser()||!confirm(c('remove_support')))return;
    const sb=await ensureSupportClient(); if(!sb)return;
    const {error}=await sb.from('ruta_support_methods').delete().eq('id',id);
    if(error){ alert(error.message); return; }
    await rutaOpenSupport();
  };

  function panelRefresh(){ if(window.openSettings) openSettings(); setTimeout(injectPanels,0); }
  function creds(){return {email:(document.getElementById('ruta_sync_email')?.value||'').trim(),password:document.getElementById('ruta_sync_password')?.value||''};}
  window.rutaToggleCloudPassword=(show)=>{const input=document.getElementById('ruta_sync_password');if(input)input.type=show?'text':'password';};

  window.rutaCloudSignUp=async()=>{if(!client){status=c('sync_loading');panelRefresh();return;}const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signUp(x);if(error)status=error.message;else if(data.session){user=data.user;initializedUserId=null;await ready(true);status=c('synced');}else status=c('check');panelRefresh();};
  window.rutaCloudSignIn=async()=>{if(!client){status=c('sync_loading');panelRefresh();return;}const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signInWithPassword(x);if(error)status=error.message;else{user=data.user;initializedUserId=null;await ready(true);status=c('synced');}panelRefresh();};
  window.rutaCloudSignOut=async()=>{if(!client)return;if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();user=null;initializedUserId=null;status='';panelRefresh();};
  window.rutaCloudSyncNow=async()=>{if(user){await flushOutbox();await reconcileVehicles();await pull(false);if(!hasPendingForUser())status=c('synced');}panelRefresh();};

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
    const rec={id,name,vehicleType:type,year,make,model,trim,engine:'',transmission:'',planSource:'',updatedAt:null,data};
    fleet.vehicles[id]=rec; persistFleet();
    if(client&&user){ try{await insertVehicle(rec);}catch(e){status=c('pending_sync');} }
    await window.rutaSelectVehicle(id);
    if(addPlan){ closeOverlay(); await window.rutaShowMaintenancePlan(); } else { closeOverlay(); renderVehicleBar(); }
  };

  window.rutaRemoveVehicle=async(id)=>{
    const rows=vehicleList(); if(rows.length<=1){alert(c('last_vehicle'));return;} if(!confirm(c('remove_vehicle')))return;
    const rec=fleet.vehicles[id];
    if(user&&rec)queueOp({type:'vehicle',action:'archive',id,baseUpdatedAt:rec.updatedAt||null,deletedAt:nowIso()});
    delete fleet.vehicles[id];
    if(vehicleId===id){const next=Object.keys(fleet.vehicles)[0];vehicleId=next;fleet.activeVehicleId=next;state=normalizeState(fleet.vehicles[next].data);}
    persistFleet(); if(window.applyTheme)applyTheme(); if(window.render)render(); renderVehicleBar();
    let pending=false;
    if(client&&user){pending=await flushOutbox();if(!pending){try{await reconcileVehicles();await pull(false);}catch(e){pending=true;}}}
    status=pending?c('pending_sync'):c('vehicle_removed'); window.rutaManageVehicles();
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
    const vid=vehicleId, item=state.fuel.find(x=>String(x.id)===String(id));
    state.fuel=state.fuel.filter(x=>String(x.id)!==String(id)); await saveData();
    if(user&&item)queueOp({type:'fuel',action:'delete',id:String(id),vehicleId:vid,baseUpdatedAt:item.updatedAt||null,deletedAt:nowIso()});
    const pending=client&&user?await flushOutbox():false;
    if(window.render)render(); status=pending?c('pending_sync'):c('fuel_removed');
  };

  window.rutaRemoveMaint=async(id)=>{
    if(!confirm(c('remove_maint')))return;
    const vid=vehicleId, item=state.maintenance.find(x=>String(x.id)===String(id));
    state.maintenance=state.maintenance.filter(x=>String(x.id)!==String(id)); await saveData();
    if(user&&item)queueOp({type:'maint',action:'delete',id:String(id),vehicleId:vid,baseUpdatedAt:item.updatedAt||null,deletedAt:nowIso()});
    const pending=client&&user?await flushOutbox():false;
    if(window.render)render(); status=pending?c('pending_sync'):c('maint_removed');
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
      ensureFleet(); loadOutbox(); injectStyles(); wrapFunctions(); if(window.render)render();
      const lib=await loadSupabase();
      client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const visibleCloud=document.getElementById('rutaCloudPanel'); if(visibleCloud){visibleCloud.remove();cloudPanel();}
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
