(() => {
  const SUPABASE_URL = 'https://sfaeomnpyhenszrkgguh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fVzhqEUloMaYijWLniImmQ_rtSXnyDr';
  let client = null;
  let user = null;
  let vehicleId = null;
  let channel = null;
  let pullTimer = null;
  let busy = false;
  let status = '';

  const copy = {
    en: {
      title:'Cloud sync', desc:'Use the same account on Android and iPhone to keep RUTA data in sync.',
      email:'Email', password:'Password', signin:'Sign in', signup:'Create account', signout:'Sign out', sync:'Sync now',
      connected:'Connected as', synced:'Synced', check:'Check your email to confirm your account, then sign in.',
      invalid:'Enter a valid email and a password with at least 6 characters.'
    },
    fil: {
      title:'Cloud sync', desc:'Gamitin ang parehong account sa Android at iPhone para mag-sync ang RUTA data.',
      email:'Email', password:'Password', signin:'Mag-sign in', signup:'Gumawa ng account', signout:'Mag-sign out', sync:'I-sync ngayon',
      connected:'Nakakonekta bilang', synced:'Naka-sync', check:'I-check ang email mo para kumpirmahin ang account, pagkatapos ay mag-sign in.',
      invalid:'Maglagay ng valid na email at password na may hindi bababa sa 6 na character.'
    }
  };

  function c(k){ const lang = window.state?.settings?.language === 'en' ? 'en' : 'fil'; return copy[lang][k]; }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function localSave(){ try { localStorage.setItem('ruta-vehicle-data', JSON.stringify(window.state)); } catch(e){} }

  async function loadSupabase(){
    if(window.supabase) return window.supabase;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return window.supabase;
  }

  function vehiclePayload(){
    return {
      odometer:Number(state.settings.odometer||0), currency:state.settings.currency||'₱',
      language:state.settings.language||'fil', theme:state.settings.theme||'dark'
    };
  }
  function fuelPayload(x){
    return {id:String(x.id),user_id:user.id,vehicle_id:vehicleId,date:x.date,station:x.station||'',odometer:Number(x.odometer||0),liters:Number(x.liters||0),price_per_liter:Number(x.pricePerLiter||0),total:Number(x.total||0),lat:x.lat??null,lng:x.lng??null};
  }
  function tripPayload(x){
    return {id:String(x.id),user_id:user.id,vehicle_id:vehicleId,date:x.date,start_odo:Number(x.startOdo||0),end_odo:Number(x.endOdo||0),distance:Number(x.distance||0),purpose:x.purpose||'',note:x.note||''};
  }
  function maintPayload(x){
    return {id:String(x.id),user_id:user.id,vehicle_id:vehicleId,name:x.name||'Maintenance item',interval_km:Number(x.intervalKm||5000),last_odo:Number(x.lastOdo||0)};
  }

  async function pushVehicle(){ if(!client||!user||!vehicleId||busy)return; await client.from('ruta_vehicles').update(vehiclePayload()).eq('id',vehicleId).eq('user_id',user.id); }
  async function pushFuel(x){ if(!client||!user||!vehicleId||busy||!x)return; await client.from('ruta_fuel_entries').upsert(fuelPayload(x),{onConflict:'id'}); }
  async function pushTrip(x){ if(!client||!user||!vehicleId||busy||!x)return; await client.from('ruta_trips').upsert(tripPayload(x),{onConflict:'id'}); }
  async function pushMaint(x){ if(!client||!user||!vehicleId||busy||!x)return; await client.from('ruta_maintenance_items').upsert(maintPayload(x),{onConflict:'id'}); }

  async function mergeMissing(table, rows, mapper){
    if(!rows?.length) return;
    const {data,error}=await client.from(table).select('id').eq('vehicle_id',vehicleId).eq('user_id',user.id);
    if(error) throw error;
    const ids=new Set((data||[]).map(r=>String(r.id)));
    const missing=rows.filter(r=>!ids.has(String(r.id))).map(mapper);
    if(missing.length){ const {error:e}=await client.from(table).insert(missing); if(e) throw e; }
  }

  async function pull(){
    if(!client||!user||!vehicleId||busy) return;
    busy=true;
    try{
      const [v,f,tr,m]=await Promise.all([
        client.from('ruta_vehicles').select('*').eq('id',vehicleId).eq('user_id',user.id).single(),
        client.from('ruta_fuel_entries').select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id).is('deleted_at',null),
        client.from('ruta_trips').select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id).is('deleted_at',null),
        client.from('ruta_maintenance_items').select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id).is('deleted_at',null)
      ]);
      if(v.error) throw v.error; if(f.error) throw f.error; if(tr.error) throw tr.error; if(m.error) throw m.error;
      state.settings.odometer=Number(v.data.odometer||0); state.settings.currency=v.data.currency||'₱'; state.settings.language=v.data.language||'fil'; state.settings.theme=v.data.theme||'dark';
      state.fuel=(f.data||[]).map(x=>({id:x.id,date:x.date,station:x.station,odometer:Number(x.odometer||0),liters:Number(x.liters||0),pricePerLiter:Number(x.price_per_liter||0),total:Number(x.total||0),lat:x.lat,lng:x.lng}));
      state.trips=(tr.data||[]).map(x=>({id:x.id,date:x.date,startOdo:Number(x.start_odo||0),endOdo:Number(x.end_odo||0),distance:Number(x.distance||0),purpose:x.purpose,note:x.note}));
      state.maintenance=(m.data||[]).map(x=>({id:x.id,name:x.name,intervalKm:Number(x.interval_km||5000),lastOdo:Number(x.last_odo||0)}));
      localSave(); if(window.applyTheme) applyTheme(); document.documentElement.lang=state.settings.language==='en'?'en':'fil'; if(window.render) render();
      status=c('synced');
    }catch(e){ status=e.message||String(e); }
    finally{ busy=false; }
  }

  function schedulePull(){ clearTimeout(pullTimer); pullTimer=setTimeout(pull,350); }
  async function realtime(){
    if(!client||!user)return;
    if(channel) await client.removeChannel(channel);
    channel=client.channel('ruta-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_vehicles',filter:`user_id=eq.${user.id}`},schedulePull)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_fuel_entries',filter:`user_id=eq.${user.id}`},schedulePull)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_trips',filter:`user_id=eq.${user.id}`},schedulePull)
      .on('postgres_changes',{event:'*',schema:'public',table:'ruta_maintenance_items',filter:`user_id=eq.${user.id}`},schedulePull)
      .subscribe();
  }

  async function ready(firstMerge){
    if(!client||!user)return;
    try{
      let {data,error}=await client.from('ruta_vehicles').select('*').eq('user_id',user.id).order('created_at',{ascending:true}).limit(1);
      if(error) throw error;
      let v=data?.[0];
      if(!v){
        const ins=await client.from('ruta_vehicles').insert({user_id:user.id,name:'My vehicle',...vehiclePayload()}).select('*').single();
        if(ins.error) throw ins.error; v=ins.data;
      }
      vehicleId=v.id;
      if(firstMerge){
        if(Number(state.settings.odometer||0)>Number(v.odometer||0)) await client.from('ruta_vehicles').update({odometer:Number(state.settings.odometer||0)}).eq('id',vehicleId).eq('user_id',user.id);
        await mergeMissing('ruta_fuel_entries',state.fuel,fuelPayload);
        await mergeMissing('ruta_trips',state.trips,tripPayload);
        await mergeMissing('ruta_maintenance_items',state.maintenance,maintPayload);
      }
      await pull(); await realtime();
    }catch(e){ status=e.message||String(e); }
  }

  function panel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaCloudPanel'))return;
    const actions=sheet.querySelector('.form-actions');
    const box=document.createElement('div'); box.id='rutaCloudPanel'; box.className='field';
    if(user){
      box.innerHTML=`<label>${c('title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${c('connected')} ${esc(user.email||'')}${status?` • ${esc(status)}`:''}</div><div class="form-actions"><button class="btn btn-secondary" onclick="rutaCloudSyncNow()">${c('sync')}</button><button class="btn btn-secondary" onclick="rutaCloudSignOut()">${c('signout')}</button></div>`;
    }else{
      box.innerHTML=`<label>${c('title')}</label><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${c('desc')}</div><input id="ruta_sync_email" type="email" autocomplete="email" placeholder="${c('email')}" style="margin-bottom:8px"><input id="ruta_sync_password" type="password" autocomplete="current-password" placeholder="${c('password')}">${status?`<div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(status)}</div>`:''}<div class="form-actions"><button class="btn btn-secondary" onclick="rutaCloudSignIn()">${c('signin')}</button><button class="btn btn-secondary" onclick="rutaCloudSignUp()">${c('signup')}</button></div>`;
    }
    sheet.insertBefore(box,actions);
  }
  function creds(){return {email:(document.getElementById('ruta_sync_email')?.value||'').trim(),password:document.getElementById('ruta_sync_password')?.value||''};}
  window.rutaCloudSignUp=async()=>{const x=creds();if(!x.email||x.password.length<6){status=c('invalid');panelRefresh();return;}const {data,error}=await client.auth.signUp(x);if(error)status=error.message;else if(data.session){user=data.user;await ready(true);status=c('synced');}else status=c('check');panelRefresh();};
  window.rutaCloudSignIn=async()=>{const x=creds();const {data,error}=await client.auth.signInWithPassword(x);if(error)status=error.message;else{user=data.user;await ready(true);status=c('synced');}panelRefresh();};
  window.rutaCloudSignOut=async()=>{if(channel){await client.removeChannel(channel);channel=null;}await client.auth.signOut();user=null;vehicleId=null;status='';panelRefresh();};
  window.rutaCloudSyncNow=async()=>{await ready(false);status=c('synced');panelRefresh();};
  function panelRefresh(){ if(window.openSettings) openSettings(); setTimeout(panel,0); }

  function wrapFunctions(){
    if(window.__rutaCloudWrapped)return; window.__rutaCloudWrapped=true;
    const os=window.openSettings; if(os) window.openSettings=function(...a){const r=os.apply(this,a);setTimeout(panel,0);return r;};
    const wrap=(name,after)=>{const old=window[name];if(!old)return;window[name]=async function(...a){const r=await old.apply(this,a);try{await after(...a);}catch(e){status=e.message||String(e);}return r;};};
    wrap('setLanguage',pushVehicle); wrap('setCurrency',pushVehicle); wrap('setTheme',pushVehicle); wrap('saveStartingOdo',pushVehicle);
    wrap('saveFuelForm',async()=>{await pushFuel(state.fuel[state.fuel.length-1]);await pushVehicle();});
    wrap('saveTripForm',async()=>{await pushTrip(state.trips[state.trips.length-1]);await pushVehicle();});
    wrap('saveMaintForm',async()=>{await pushMaint(state.maintenance[state.maintenance.length-1]);});
    wrap('saveEditMaintForm',async id=>{await pushMaint(state.maintenance.find(x=>x.id===id));});
    wrap('markDone',async id=>{await pushMaint(state.maintenance.find(x=>x.id===id));});
  }

  async function init(){
    try{
      while(!window.state) await new Promise(r=>setTimeout(r,30));
      const lib=await loadSupabase();
      client=lib.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      wrapFunctions();
      const {data}=await client.auth.getSession(); user=data.session?.user||null;
      client.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;if(user)ready(true);});
      if(user) await ready(true);
      window.addEventListener('focus',()=>{if(user)schedulePull();});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)schedulePull();});
    }catch(e){ status=e.message||String(e); }
  }
  init();
})();
