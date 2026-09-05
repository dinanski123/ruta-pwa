from pathlib import Path

p = Path('cloud-sync.js')
s = p.read_text()

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)

rep(
"""      source:'Source', no_items:'No new maintenance items to add.', vehicle_removed:'Vehicle removed', fuel_removed:'Fuel entry removed', maint_removed:'Maintenance item removed',
      active:'Active', custom_vehicle:'My vehicle', archived_trips:'Trip Log has been removed from the app; old cloud trip rows are preserved as historical data.'""",
"""      market:'Market', philippines:'Philippines', united_states:'United States', canada:'Canada', other_market:'Other', vin_optional:'VIN (optional)',
      provider_unconfigured:'Live OEM lookup is ready but needs CarScan credentials in Supabase.', provider_signin:'Sign in to Cloud sync to use live OEM lookup.', provider_unsupported:'Live OEM lookup currently covers cars; motorcycles keep the verified-template/general fallback.',
      oem_reference:'US-market OEM reference — verify against your local owner’s manual.', recurring_only:'Only recurring OEM items can be added to the Maintenance tracker; one-off/irregular items remain visible in this matrix.',
      due_at:'due at', manufacturer_badge:'Manufacturer plan', oem_reference_badge:'OEM reference', baseline_badge:'RUTA baseline',
      source:'Source', no_items:'No new maintenance items to add.', vehicle_removed:'Vehicle removed', fuel_removed:'Fuel entry removed', maint_removed:'Maintenance item removed',
      active:'Active', custom_vehicle:'My vehicle', archived_trips:'Trip Log has been removed from the app; old cloud trip rows are preserved as historical data.'""",
'English provider strings')

rep(
"""      source:'Source', no_items:'Walang bagong maintenance item na kailangang idagdag.', vehicle_removed:'Inalis ang sasakyan', fuel_removed:'Inalis ang fuel entry', maint_removed:'Inalis ang maintenance item',
      active:'Aktibo', custom_vehicle:'Sasakyan ko', archived_trips:'Inalis na ang Trip Log sa app; pinapanatili ang lumang cloud trip rows bilang historical data.'""",
"""      market:'Market', philippines:'Pilipinas', united_states:'United States', canada:'Canada', other_market:'Iba pa', vin_optional:'VIN (opsyonal)',
      provider_unconfigured:'Handa na ang live OEM lookup pero kailangan pang i-configure ang CarScan credentials sa Supabase.', provider_signin:'Mag-sign in sa Cloud sync para magamit ang live OEM lookup.', provider_unsupported:'Kotse muna ang sakop ng live OEM lookup; verified-template/general fallback muna ang motorsiklo.',
      oem_reference:'US-market OEM reference — i-verify sa local owner’s manual mo.', recurring_only:'Recurring OEM items lang ang puwedeng idagdag sa Maintenance tracker; mananatili sa matrix ang one-off/irregular items.',
      due_at:'due sa', manufacturer_badge:'Manufacturer plan', oem_reference_badge:'OEM reference', baseline_badge:'RUTA baseline',
      source:'Source', no_items:'Walang bagong maintenance item na kailangang idagdag.', vehicle_removed:'Inalis ang sasakyan', fuel_removed:'Inalis ang fuel entry', maint_removed:'Inalis ang maintenance item',
      active:'Aktibo', custom_vehicle:'Sasakyan ko', archived_trips:'Inalis na ang Trip Log sa app; pinapanatili ang lumang cloud trip rows bilang historical data.'""",
'Filipino provider strings')

rep(
"""          [id]:{id,name:'My vehicle',vehicleType:'car',year:null,make:'',model:'',trim:'',engine:'',transmission:'',planSource:'',data:normalizeState(state)}""",
"""          [id]:{id,name:'My vehicle',vehicleType:'car',market:'PH',vin:'',year:null,make:'',model:'',trim:'',engine:'',transmission:'',planSource:'',data:normalizeState(state)}""",
'default vehicle metadata')

rep(
"""      vehicleType:v.vehicle_type || 'car',
      year:v.year ?? null,
      make:v.make || '', model:v.model || '', trim:v.trim || '', engine:v.engine || '', transmission:v.transmission || '',""",
"""      vehicleType:v.vehicle_type || 'car',
      market:v.market || 'PH', vin:v.vin || '',
      year:v.year ?? null,
      make:v.make || '', model:v.model || '', trim:v.trim || '', engine:v.engine || '', transmission:v.transmission || '',""",
'cloud vehicle metadata')

rep(
"""      name:rec?.name || 'My vehicle', vehicle_type:rec?.vehicleType || 'car', year:rec?.year || null,
      make:rec?.make || null, model:rec?.model || null, trim:rec?.trim || null, engine:rec?.engine || null,""",
"""      name:rec?.name || 'My vehicle', vehicle_type:rec?.vehicleType || 'car', market:rec?.market || 'PH', vin:rec?.vin || null, year:rec?.year || null,
      make:rec?.make || null, model:rec?.model || null, trim:rec?.trim || null, engine:rec?.engine || null,""",
'vehicle cloud payload')

rep(
"""<div class=\"field-row\"><div class=\"field\"><label>${c('year')}</label>""",
"""<div class=\"field\"><label>${c('market')}</label><select id=\"rv_market\"><option value=\"PH\">${c('philippines')}</option><option value=\"US\">${c('united_states')}</option><option value=\"CA\">${c('canada')}</option><option value=\"OTHER\">${c('other_market')}</option></select></div><div class=\"field-row\"><div class=\"field\"><label>${c('year')}</label>""",
'vehicle market field')

rep(
"""<div class=\"field\"><label>${c('model')}</label><input id=\"rv_model\" type=\"text\" list=\"rv_models\" autocomplete=\"off\"><datalist id=\"rv_models\"></datalist></div><div class=\"field\"><label>${c('trim')}</label>""",
"""<div class=\"field\"><label>${c('model')}</label><input id=\"rv_model\" type=\"text\" list=\"rv_models\" autocomplete=\"off\"><datalist id=\"rv_models\"></datalist></div><div class=\"field\"><label>${c('vin_optional')}</label><input id=\"rv_vin\" type=\"text\" maxlength=\"17\" autocapitalize=\"characters\" autocomplete=\"off\"></div><div class=\"field\"><label>${c('trim')}</label>""",
'vehicle VIN field')

rep(
"""    const make=(document.getElementById('rv_make')?.value||'').trim(); const model=(document.getElementById('rv_model')?.value||'').trim(); const trim=(document.getElementById('rv_trim')?.value||'').trim();
    const odo=Math.max(0,Number(document.getElementById('rv_odo')?.value)||0); let name=(document.getElementById('rv_name')?.value||'').trim();""",
"""    const market=(document.getElementById('rv_market')?.value||'PH'); const vin=(document.getElementById('rv_vin')?.value||'').trim().toUpperCase();
    const make=(document.getElementById('rv_make')?.value||'').trim(); const model=(document.getElementById('rv_model')?.value||'').trim(); const trim=(document.getElementById('rv_trim')?.value||'').trim();
    const odo=Math.max(0,Number(document.getElementById('rv_odo')?.value)||0); let name=(document.getElementById('rv_name')?.value||'').trim();""",
'save vehicle market/VIN')

rep(
"""    const rec={id,name,vehicleType:type,year,make,model,trim,engine:'',transmission:'',planSource:'',data};""",
"""    const rec={id,name,vehicleType:type,market,vin,year,make,model,trim,engine:'',transmission:'',planSource:'',data};""",
'new vehicle record metadata')

marker = "  function generalPlan(rec){\n"
provider = r"""  async function providerPlan(rec){
    if(!rec?.year||!rec?.make||!rec?.model)return null;
    if(rec.vehicleType==='motorcycle')return {status:'unsupported'};
    if(!client||!user)return {status:'signin'};
    try{
      const {data,error}=await client.functions.invoke('ruta-oem-maintenance',{body:{vehicleType:rec.vehicleType||'car',market:rec.market||'PH',vin:rec.vin||'',year:rec.year,make:rec.make,model:rec.model}});
      if(error)return {status:'error'};
      if(data?.status==='ok'&&Array.isArray(data.items)&&data.items.length){
        const matrix=data.items.map(x=>({key:x.key||'',name:x.name||'Maintenance item',dueKm:Number(x.dueKm||0),intervalKm:Number(x.intervalKm||0),isCycle:Boolean(x.isCycle)}));
        const recurring=new Map();
        for(const x of matrix){if(x.isCycle&&x.intervalKm>0&&!recurring.has(x.key||x.name))recurring.set(x.key||x.name,{key:x.key||x.name,name:x.name,intervalKm:x.intervalKm});}
        return {status:'ok',plan:{kind:data.marketExact?'manufacturer':'oem_reference',label:data.sourceLabel||'OEM maintenance data',sourceUrl:data.sourceUrl||'',items:[...recurring.values()],matrix}};
      }
      return {status:data?.status||'no_data'};
    }catch(e){return {status:'error'};}
  }

"""
if s.count(marker) != 1:
    raise SystemExit('generalPlan marker not unique')
s = s.replace(marker, provider + marker, 1)

rep(
"""    return {kind:'general',label:c('general_plan'),items:(rec?.vehicleType==='motorcycle'?moto:car).map(x=>({...x,name:planNames[lang()][x.key]}))};""",
"""    const items=(rec?.vehicleType==='motorcycle'?moto:car).map(x=>({...x,name:planNames[lang()][x.key]}));
    return {kind:'general',label:c('general_plan'),items,matrix:items};""",
'general plan matrix')

rep(
"""      return {kind:'manufacturer',label:exact.source_label||c('exact_plan'),sourceUrl:exact.source_url||'',items};
    }
    return generalPlan(rec);""",
"""      return {kind:'manufacturer',label:exact.source_label||c('exact_plan'),sourceUrl:exact.source_url||'',items,matrix:items};
    }
    const provider=await providerPlan(rec);
    if(provider?.plan)return provider.plan;
    const fallback=generalPlan(rec);
    if(provider?.status==='unconfigured')fallback.providerNote=c('provider_unconfigured');
    else if(provider?.status==='signin')fallback.providerNote=c('provider_signin');
    else if(provider?.status==='unsupported')fallback.providerNote=c('provider_unsupported');
    return fallback;""",
'suggested provider plan')

old_show = """    const rec=currentRec(); if(!rec)return; const plan=await suggestedPlan(rec); pendingPlan={vehicleId,plan};
    const existingKeys=new Set(state.maintenance.map(x=>x.templateKey).filter(Boolean));
    const items=plan.items.filter(x=>!existingKeys.has(x.key));
    const message=plan.kind==='manufacturer'?c('exact_plan'):c('no_exact');
    openOverlay(`<div class=\"form-overlay\" onclick=\"if(event.target===this) closeOverlay()\"><div class=\"form-sheet\"><h3>${c('plan_title')}</h3><div class=\"ruta-plan-note\">${esc(message)}</div><div class=\"ruta-plan-note\"><strong>${c('source')}:</strong> ${esc(plan.label)}</div>${items.map(x=>`<div class=\"ruta-vehicle-card\"><div class=\"title\">${esc(x.name)}</div><div class=\"sub\">${typeof t==='function'?t('every'):'Every'} ${Number(x.intervalKm).toLocaleString('en-PH')} km</div></div>`).join('')||`<div class=\"ruta-plan-note\">${c('no_items')}</div>`}<div class=\"form-actions\"><button class=\"btn btn-secondary\" onclick=\"closeOverlay()\">${typeof t==='function'?t('cancel'):'Cancel'}</button><button class=\"btn btn-primary\" ${items.length?'':'disabled'} onclick=\"rutaApplyMaintenancePlan()\">${c('apply_plan')}</button></div></div></div>`);"""
new_show = """    const rec=currentRec(); if(!rec)return; const plan=await suggestedPlan(rec); pendingPlan={vehicleId,plan};
    const existingKeys=new Set(state.maintenance.map(x=>x.templateKey).filter(Boolean));
    const items=(plan.items||[]).filter(x=>!existingKeys.has(x.key));
    const matrix=Array.isArray(plan.matrix)&&plan.matrix.length?plan.matrix:(plan.items||[]);
    const message=plan.kind==='manufacturer'?c('exact_plan'):plan.kind==='oem_reference'?c('oem_reference'):c('no_exact');
    const matrixHtml=matrix.map(x=>{const bits=[];if(Number(x.dueKm||0)>0)bits.push(`${c('due_at')} ${Number(x.dueKm).toLocaleString('en-PH')} km`);if(Number(x.intervalKm||0)>0)bits.push(`${typeof t==='function'?t('every'):'Every'} ${Number(x.intervalKm).toLocaleString('en-PH')} km`);return `<div class=\"ruta-vehicle-card\"><div class=\"title\">${esc(x.name)}</div><div class=\"sub\">${bits.join(' • ')}</div></div>`;}).join('');
    openOverlay(`<div class=\"form-overlay\" onclick=\"if(event.target===this) closeOverlay()\"><div class=\"form-sheet\"><h3>${c('plan_title')}</h3><div class=\"ruta-plan-note\">${esc(message)}</div>${plan.providerNote?`<div class=\"ruta-plan-note\">${esc(plan.providerNote)}</div>`:''}<div class=\"ruta-plan-note\"><strong>${c('source')}:</strong> ${esc(plan.label)}</div>${plan.kind!=='general'?`<div class=\"ruta-plan-note\">${esc(c('recurring_only'))}</div>`:''}${matrixHtml||`<div class=\"ruta-plan-note\">${c('no_items')}</div>`}<div class=\"form-actions\"><button class=\"btn btn-secondary\" onclick=\"closeOverlay()\">${typeof t==='function'?t('cancel'):'Cancel'}</button><button class=\"btn btn-primary\" ${items.length?'':'disabled'} onclick=\"rutaApplyMaintenancePlan()\">${c('apply_plan')}</button></div></div></div>`);"""
rep(old_show, new_show, 'maintenance plan matrix view')

rep(
"""source:plan.kind==='manufacturer'?'manufacturer':'general'""",
"""source:plan.kind==='manufacturer'?'manufacturer':plan.kind==='oem_reference'?'oem_reference':'general'""",
'applied plan source')

rep(
"""badge.textContent=item.source==='manufacturer'?'Manufacturer plan':'RUTA baseline';""",
"""badge.textContent=item.source==='manufacturer'?c('manufacturer_badge'):item.source==='oem_reference'?c('oem_reference_badge'):c('baseline_badge');""",
'maintenance source badge')

p.write_text(s)

ip = Path('index.html')
html = ip.read_text()
old = "navigator.serviceWorker.register('service-worker.js?v=4-fleet')"
if html.count(old) != 1:
    raise SystemExit(f'index SW registration: expected 1, got {html.count(old)}')
ip.write_text(html.replace(old, "navigator.serviceWorker.register('service-worker.js?v=5-oem-provider')", 1))

sp = Path('service-worker.js')
sw = sp.read_text()
old_cache = "const CACHE_NAME = 'ruta-cache-v3-cloud-sync';"
if sw.count(old_cache) != 1:
    raise SystemExit(f'SW cache marker: expected 1, got {sw.count(old_cache)}')
sp.write_text(sw.replace(old_cache, "const CACHE_NAME = 'ruta-cache-v5-oem-provider';", 1))
