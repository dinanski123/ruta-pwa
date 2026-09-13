  // RUTA v1.3.2 unified fuel/save repair.
  // This code is injected inside cloud-sync.js's existing closure so it uses the
  // same Supabase client, authenticated user, outbox and reconciliation engine.

  function v132FuelText(key){
    const en={
      price:'Price per liter', total:'Total purchase', liters:'Calculated liters', add:'Add fuel log', edit:'Edit fuel log', editBtn:'Edit',
      invalid:'Enter a valid odometer, price per liter, and total purchase greater than zero.',
      empty:'No fuel entries yet. Add odometer, price per liter, and total purchase.'
    };
    const fil={
      price:'Presyo kada litro', total:'Kabuuang binayaran', liters:'Kalkuladong litro', add:'Magdagdag ng fuel log', edit:'I-edit ang fuel log', editBtn:'I-edit',
      invalid:'Maglagay ng valid na odometer, presyo kada litro, at kabuuang binayaran na higit sa zero.',
      empty:'Wala pang fuel entry. Idagdag ang odometer, presyo kada litro, at kabuuang binayaran.'
    };
    return (lang()==='en'?en:fil)[key]||en[key]||key;
  }

  function v132FuelLiters(x){
    const stored=Number(x?.liters||0), total=Number(x?.total||0), price=Number(x?.pricePerLiter||0);
    return stored>0 ? stored : (total>0&&price>0 ? total/price : 0);
  }

  fuelPayload=function(x,vid=vehicleId){
    return {id:String(x.id),user_id:user.id,vehicle_id:vid,date:x.date||todayStr(),station:x.station||'',odometer:Number(x.odometer||0),liters:v132FuelLiters(x),price_per_liter:Number(x.pricePerLiter||0),total:Number(x.total||0),lat:x.lat??null,lng:x.lng??null,deleted_at:null};
  };

  // First sign-in no longer only inserts missing rows. If a local row was based
  // on the same cloud version, its offline edit is pushed; a newer cloud row or
  // cloud tombstone wins instead.
  mergeMissing=async function(table,rows,mapper){
    if(!rows?.length)return;
    const {data,error}=await client.from(table).select('*').eq('vehicle_id',vehicleId).eq('user_id',user.id);
    if(error)throw error;
    const remoteById=new Map((data||[]).map(row=>[String(row.id),row]));
    for(const local of rows){
      const id=String(local.id), remote=remoteById.get(id), payload=mapper(local,vehicleId);
      if(remote?.deleted_at)continue;
      if(!remote){
        const {error:e}=await client.from(table).insert(payload); if(e)throw e;
        continue;
      }
      if(!local.updatedAt || newerThan(remote.updated_at,local.updatedAt))continue;
      const {error:e}=await client.from(table).update(payload).eq('id',id).eq('vehicle_id',vehicleId).eq('user_id',user.id);
      if(e)throw e;
    }
  };

  function v132MigrateLegacyFuelQueues(){
    if(!user)return;
    try{
      const rows=JSON.parse(localStorage.getItem('ruta-v131-fuel-upserts')||'[]');
      const keep=[];
      for(const row of Array.isArray(rows)?rows:[]){
        if(row?.userId && row.userId!==user.id){keep.push(row);continue;}
        if(row?.entry&&row?.vehicleId)queueFuel(row.entry,row.vehicleId); else keep.push(row);
      }
      if(keep.length)localStorage.setItem('ruta-v131-fuel-upserts',JSON.stringify(keep)); else localStorage.removeItem('ruta-v131-fuel-upserts');
    }catch(e){}
    try{
      const rows=JSON.parse(localStorage.getItem('ruta-v13-sync-queue')||'[]');
      const keep=[];
      for(const row of Array.isArray(rows)?rows:[]){
        if(row?.type==='fuel-upsert'&&row.entry&&row.vehicleId)queueFuel(row.entry,row.vehicleId);
        else if(row?.type==='fuel-delete'&&row.vehicleId)queueOp({type:'fuel',action:'delete',id:String(row.id),vehicleId:row.vehicleId,baseUpdatedAt:row.baseUpdatedAt||null,deletedAt:row.deletedAt||row.queuedAt||nowIso()});
        else keep.push(row);
      }
      if(keep.length)localStorage.setItem('ruta-v13-sync-queue',JSON.stringify(keep)); else localStorage.removeItem('ruta-v13-sync-queue');
    }catch(e){}
  }

  const v132BaseReady=ready;
  ready=async function(firstMerge){
    v132MigrateLegacyFuelQueues();
    return v132BaseReady(firstMerge);
  };

  // Reconcile vehicle odometer with actual active fuel history after every pull.
  const v132BasePull=pull;
  pull=async function(mergeFirst=false){
    const result=await v132BasePull(mergeFirst);
    if(!client||!user||!vehicleId||busy)return result;
    const maxFuel=(state?.fuel||[]).reduce((max,row)=>Math.max(max,Number(row.odometer||0)),0);
    const current=Number(state?.settings?.odometer||0), effective=Math.max(current,maxFuel);
    if(effective>current){
      state.settings.odometer=effective;
      const rec=currentRec(); if(rec?.data)rec.data.settings.odometer=effective;
      persistFleet();
      const {data,error}=await client.from('ruta_vehicles').update({odometer:effective}).eq('id',vehicleId).eq('user_id',user.id).select('updated_at,odometer').single();
      if(!error&&rec){rec.updatedAt=data?.updated_at||rec.updatedAt||null;persistFleet();}
      if(window.render)render();
    }
    return result;
  };

  function v132MonthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
  computeFuelStats=function(){
    const rows=[...(state?.fuel||[])].sort((a,b)=>Number(a.odometer||0)-Number(b.odometer||0)||String(a.date||'').localeCompare(String(b.date||'')));
    const samples=[];
    for(let i=1;i<rows.length;i++){
      const distance=Number(rows[i].odometer||0)-Number(rows[i-1].odometer||0),liters=v132FuelLiters(rows[i]);
      if(distance>0&&liters>0)samples.push(distance/liters);
    }
    const last5=samples.slice(-5),avgKml=last5.length?last5.reduce((a,b)=>a+b,0)/last5.length:null,mk=v132MonthKey();
    const monthSpend=(state?.fuel||[]).filter(x=>String(x.date||'').slice(0,7)===mk).reduce((sum,x)=>sum+Number(x.total||0),0);
    return {avgKml,monthSpend};
  };

  function v132EntryKml(entry){
    const rows=[...(state?.fuel||[])].sort((a,b)=>Number(a.odometer||0)-Number(b.odometer||0)||String(a.date||'').localeCompare(String(b.date||'')));
    const i=rows.findIndex(x=>String(x.id)===String(entry.id)); if(i<1)return null;
    const distance=Number(rows[i].odometer||0)-Number(rows[i-1].odometer||0),liters=v132FuelLiters(rows[i]);
    return distance>0&&liters>0?distance/liters:null;
  }

  renderFuel=function(){
    const rows=[...(state?.fuel||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.odometer||0)-Number(a.odometer||0));
    const cards=rows.map(entry=>{
      const liters=v132FuelLiters(entry),kml=v132EntryKml(entry),id=esc(entry.id);
      return `<div class="list-card"><div class="top-row"><div class="title">${esc(fmtKm(entry.odometer))}</div><div class="amount">${esc(fmtMoney(entry.total))}</div></div><div class="meta"><span>${esc(entry.date||'')}</span><span>${esc(fmtMoney(entry.pricePerLiter))}/L</span>${liters>0?`<span>${liters.toFixed(2)} L</span>`:''}</div>${kml?`<div class="kml-badge">${kml.toFixed(1)} km/L</div>`:''}<div class="ruta-card-actions" style="gap:8px"><button class="done-btn" onclick="rutaEditFuel('${id}')">${v132FuelText('editBtn')}</button><button class="done-btn ruta-danger" onclick="rutaRemoveFuel('${id}')">${c('remove')}</button></div></div>`;
    }).join('');
    return `<div class="section-title">${t('fuel_log')} <button class="btn-add" onclick="openFuelForm()">${t('add')}</button></div>${cards||`<div class="empty-state"><div class="big">⛽</div><div class="msg">${v132FuelText('empty')}</div></div>`}`;
  };

  openFuelForm=function(id=''){
    const item=id?(state?.fuel||[]).find(x=>String(x.id)===String(id)):null;
    openOverlay(`<div class="form-overlay" onclick="if(event.target===this) closeOverlay()"><div class="form-sheet"><h3>${item?v132FuelText('edit'):v132FuelText('add')}</h3><div class="field"><label>${c('current_odo')}</label><input id="ruta_fuel_odo" type="number" min="0" step="1" inputmode="decimal" value="${item?Number(item.odometer||0):(Number(currentOdo())||'')}"></div><div class="field"><label>${v132FuelText('price')}</label><input id="ruta_fuel_price" type="number" min="0" step="0.01" inputmode="decimal" value="${item?Number(item.pricePerLiter||0):''}"></div><div class="field"><label>${v132FuelText('total')}</label><input id="ruta_fuel_total" type="number" min="0" step="0.01" inputmode="decimal" value="${item?Number(item.total||0):''}"></div><div id="ruta_fuel_liters" class="ruta-plan-note"></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeOverlay()">${t('cancel')}</button><button class="btn btn-primary" onclick="rutaSaveFuelSimple('${esc(id)}')">${t('save')}</button></div></div></div>`);
    const refresh=()=>{const price=Number(document.getElementById('ruta_fuel_price')?.value||0),total=Number(document.getElementById('ruta_fuel_total')?.value||0),el=document.getElementById('ruta_fuel_liters');if(el)el.textContent=price>0&&total>0?`${v132FuelText('liters')}: ${(total/price).toFixed(2)} L`:'';};
    document.getElementById('ruta_fuel_price')?.addEventListener('input',refresh);document.getElementById('ruta_fuel_total')?.addEventListener('input',refresh);refresh();
  };
  window.rutaEditFuel=id=>openFuelForm(id);

  window.rutaSaveFuelSimple=async(id='')=>{
    const odo=Number(document.getElementById('ruta_fuel_odo')?.value),price=Number(document.getElementById('ruta_fuel_price')?.value),total=Number(document.getElementById('ruta_fuel_total')?.value);
    if(!Number.isFinite(odo)||odo<0||!Number.isFinite(price)||price<=0||!Number.isFinite(total)||total<=0){alert(v132FuelText('invalid'));return;}
    let entry=(state.fuel||[]).find(x=>String(x.id)===String(id));
    if(entry){entry.odometer=odo;entry.pricePerLiter=price;entry.total=total;entry.liters=total/price;}
    else{entry={id:uid(),date:todayStr(),station:'',odometer:odo,liters:total/price,pricePerLiter:price,total,lat:null,lng:null,updatedAt:null};state.fuel.push(entry);}
    if(odo>Number(currentOdo()||0))state.settings.odometer=odo;
    await saveData();closeOverlay();if(window.render)render();
    if(client&&user){await pushFuel(entry);await pushVehicle();if(!hasPendingForUser())status=c('synced');}
  };

  // About version follows the unified runtime version without introducing another engine.
  const v132OpenAbout=window.rutaOpenAbout;
  window.rutaOpenAbout=(...args)=>{
    const result=v132OpenAbout?.(...args);
    setTimeout(()=>{const badge=document.querySelector('.ruta-version');if(badge)badge.textContent='v1.3.2';},0);
    return result;
  };
