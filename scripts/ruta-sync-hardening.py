from pathlib import Path

p = Path('cloud-sync.js')
s = p.read_text()


def once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)


def section(start, end, new, label):
    global s
    i = s.find(start)
    if i < 0:
        raise SystemExit(f'{label}: start not found')
    j = s.find(end, i)
    if j < 0:
        raise SystemExit(f'{label}: end not found')
    s = s[:i] + new + s[j:]


once("  const FLEET_KEY = 'ruta-fleet-v2';\n", "  const FLEET_KEY = 'ruta-fleet-v2';\n  const OUTBOX_KEY = 'ruta-sync-outbox-v1';\n", 'outbox constant')
once("  let pendingPlan = null;\n", "  let pendingPlan = null;\n  let outbox = [];\n  let flushing = false;\n", 'outbox state')

once("      invalid:'Enter a valid email and a password with at least 6 characters.',\n", "      invalid:'Enter a valid email and a password with at least 6 characters.',\n      sync_loading:'Connecting to cloud…', pending_sync:'Offline changes saved — waiting to sync.', stale_change:'A newer cloud change was kept; a stale local edit was skipped.',\n", 'English sync copy')
once("      invalid:'Maglagay ng valid na email at password na may hindi bababa sa 6 na character.',\n", "      invalid:'Maglagay ng valid na email at password na may hindi bababa sa 6 na character.',\n      sync_loading:'Kumokonekta sa cloud…', pending_sync:'Naka-save ang offline changes — naghihintay mag-sync.', stale_change:'Mas bagong cloud change ang pinanatili; nilaktawan ang lumang local edit.',\n", 'Filipino sync copy')

cloud_block = r'''  function cloudMeta(v){
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
    const rec=fleet?.vehicles?.[op.vehicleId]; if(!rec?.data)return;
    const arr=op.type==='fuel'?rec.data.fuel:rec.data.maintenance;
    const item=Array.isArray(arr)?arr.find(x=>String(x.id)===String(op.id)):null;
    if(item)item.updatedAt=row.updated_at||item.updatedAt||null;
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

  async function pushVehicle(){ if(!client||!user||!vehicleId||busy)return; const rec=currentRec(); if(!rec)return; queueVehicle(rec); if(await flushOutbox())status=c('pending_sync'); }
  async function pushFuel(x,vid=vehicleId){ if(!client||!user||busy||!x)return; queueFuel(x,vid); if(await flushOutbox())status=c('pending_sync'); }
  async function pushMaint(x,vid=vehicleId){ if(!client||!user||busy||!x)return; queueMaint(x,vid); if(await flushOutbox())status=c('pending_sync'); }

  async function insertVehicle(rec){
    if(!client||!user||!rec)return;
    queueOp({type:'vehicle',action:'upsert',id:rec.id,baseUpdatedAt:rec.updatedAt||null,payload:vehiclePayload(rec)});
    await flushOutbox();
  }

'''
section('  function cloudMeta(v){', '  async function mergeMissing', cloud_block, 'cloud/outbox block')

once("    const missing=rows.filter(r=>!ids.has(String(r.id))).map(mapper);\n", "    const missing=rows.filter(r=>!ids.has(String(r.id))).map(r=>mapper(r,vehicleId));\n", 'mergeMissing vehicle binding')

reconcile_block = r'''  async function fetchCloudVehicles(includeArchived=false){
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

'''
section('  async function fetchCloudVehicles(){', '  async function pull(', reconcile_block, 'vehicle reconciliation')

once("  async function pull(mergeFirst=false){\n    if(!client||!user||!vehicleId||busy) return;\n    busy=true;\n", "  async function pull(mergeFirst=false){\n    if(!client||!user||!vehicleId||busy) return;\n    if(await flushOutbox()){ status=c('pending_sync'); return; }\n    busy=true;\n", 'pull outbox guard')
once("      state.fuel=(f.data||[]).map(x=>({id:x.id,date:x.date,station:x.station,odometer:Number(x.odometer||0),liters:Number(x.liters||0),pricePerLiter:Number(x.price_per_liter||0),total:Number(x.total||0),lat:x.lat,lng:x.lng}));\n", "      state.fuel=(f.data||[]).map(x=>({id:x.id,date:x.date,station:x.station,odometer:Number(x.odometer||0),liters:Number(x.liters||0),pricePerLiter:Number(x.price_per_liter||0),total:Number(x.total||0),lat:x.lat,lng:x.lng,updatedAt:x.updated_at||null}));\n", 'fuel version mapping')
once("      state.maintenance=(m.data||[]).map(x=>({id:x.id,name:x.name,intervalKm:Number(x.interval_km||5000),lastOdo:Number(x.last_odo||0),source:x.source||'custom',sourceNote:x.source_note||'',templateKey:x.template_key||''}));\n", "      state.maintenance=(m.data||[]).map(x=>({id:x.id,name:x.name,intervalKm:Number(x.interval_km||5000),lastOdo:Number(x.last_odo||0),source:x.source||'custom',sourceNote:x.source_note||'',templateKey:x.template_key||'',updatedAt:x.updated_at||null}));\n", 'maintenance version mapping')

panels = r'''  function injectPanels(){
    fleetPanel(); cloudPanel();
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
      box.innerHTML=`<label>${c('cloud_title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${c('cloud_desc')}</div><input id="ruta_sync_email" type="email" autocomplete="email" placeholder="${c('email')}" style="margin-bottom:8px"><input id="ruta_sync_password" type="password" autocomplete="current-password" placeholder="${c('password')}">${info?`<div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(info)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary"${disabled} onclick="rutaCloudSignIn()">${c('signin')}</button><button class="btn btn-secondary"${disabled} onclick="rutaCloudSignUp()">${c('signup')}</button></div>`;
    }
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

'''
section('  function injectPanels(){', '  function panelRefresh()', panels, 'settings panels')

auth_old = "  window.rutaCloudSignUp=async()=>{const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signUp(x);if(error)status=error.message;else if(data.session){user=data.user;initializedUserId=null;await ready(true);status=c('synced');}else status=c('check');panelRefresh();};\n  window.rutaCloudSignIn=async()=>{const x=creds();const {data,error}=await client.auth.signInWithPassword(x);if(error)status=error.message;else{user=data.user;initializedUserId=null;await ready(true);status=c('synced');}panelRefresh();};\n  window.rutaCloudSignOut=async()=>{if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();user=null;initializedUserId=null;status='';panelRefresh();};\n  window.rutaCloudSyncNow=async()=>{if(user){await reconcileVehicles();await pull(false);status=c('synced');}panelRefresh();};\n"
auth_new = "  window.rutaCloudSignUp=async()=>{if(!client){status=c('sync_loading');panelRefresh();return;}const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signUp(x);if(error)status=error.message;else if(data.session){user=data.user;initializedUserId=null;await ready(true);status=c('synced');}else status=c('check');panelRefresh();};\n  window.rutaCloudSignIn=async()=>{if(!client){status=c('sync_loading');panelRefresh();return;}const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signInWithPassword(x);if(error)status=error.message;else{user=data.user;initializedUserId=null;await ready(true);status=c('synced');}panelRefresh();};\n  window.rutaCloudSignOut=async()=>{if(!client)return;if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();user=null;initializedUserId=null;status='';panelRefresh();};\n  window.rutaCloudSyncNow=async()=>{if(user){await flushOutbox();await reconcileVehicles();await pull(false);if(!hasPendingForUser())status=c('synced');}panelRefresh();};\n"
once(auth_old, auth_new, 'auth handlers')

vehicle_block = r'''  window.rutaSaveVehicle=async()=>{
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

'''
section('  window.rutaSaveVehicle=async()=>{', '  async function exactTemplate', vehicle_block, 'vehicle save/remove')

removal_block = r'''  window.rutaRemoveFuel=async(id)=>{
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

'''
section('  window.rutaRemoveFuel=async(id)=>{', '  function wrapFunctions(){', removal_block, 'fuel/maintenance removals')

once("      ensureFleet(); injectStyles(); wrapFunctions(); if(window.render)render();\n", "      ensureFleet(); loadOutbox(); injectStyles(); wrapFunctions(); if(window.render)render();\n", 'load outbox at init')
once("      client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});\n", "      client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});\n      const visibleCloud=document.getElementById('rutaCloudPanel'); if(visibleCloud){visibleCloud.remove();cloudPanel();}\n", 'refresh auth UI after client')

p.write_text(s)

sw = Path('service-worker.js')
x = sw.read_text()
if 'ruta-cache-v6-public-templates' not in x:
    raise SystemExit('service worker v6 marker missing')
sw.write_text(x.replace('ruta-cache-v6-public-templates', 'ruta-cache-v7-sync-hardening', 1))

idx = Path('index.html')
x = idx.read_text()
if 'service-worker.js?v=6-public-templates' not in x:
    raise SystemExit('index SW v6 marker missing')
idx.write_text(x.replace('service-worker.js?v=6-public-templates', 'service-worker.js?v=7-sync-hardening', 1))
