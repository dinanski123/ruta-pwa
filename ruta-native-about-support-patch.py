from pathlib import Path
import json

p = Path('cloud-sync.js')
s = p.read_text()

old = "  const ABOUT_URL = 'https://daybook-ferdz.vercel.app/#about';\n"
new = "  const RUTA_VERSION = '1.2.0';\n  const SYNTHIQ_URL = 'https://synthiq-media-browser.vercel.app/';\n  const ADMIN_EMAIL = 'ferdz.degracia@gmail.com';\n  const SUPPORT_CACHE_KEY = 'ruta-support-methods-v1';\n"
if old not in s:
    raise SystemExit('ABOUT_URL marker not found')
s = s.replace(old, new, 1)

old_en = "      about_title:'About', about_desc:'RUTA and Daybook share one canonical About page so the profile, credits and contact details stay the same.', about_open:'Open About',\n"
new_en = "      about_title:'About RUTA', about_desc:'About the app, why it exists, version and credits.', about_open:'Open About',\n      support_title:'Support RUTA', support_desc:'Optional donations help with hosting, testing devices, coffee and the occasional bug hunt.', support_open:'Open Support',\n      support_empty:'No donation methods are published yet.', support_admin_hint:'Admin mode: you can add, edit or remove e-wallet details.', support_readonly:'Donation details are read-only. Admin editing appears only when the authorized account is signed in.',\n      add_support:'+ Add e-wallet', edit_support:'Edit e-wallet', provider:'Provider / e-wallet', account_name:'Account name', account_id:'Account number / ID', payment_link:'Payment link (optional)', note:'Note (optional)', active_label:'Publish this method', sort_order:'Display order',\n      support_saved:'Support method saved.', support_removed:'Support method removed.', remove_support:'Remove this e-wallet method?', open_payment:'Open payment link', copy_value:'Copy', copied:'Copied', loading_support:'Loading support options…', support_error:'Support information is unavailable right now.', official_site:'Official SynthIQ site',\n"
if old_en not in s:
    raise SystemExit('EN about copy marker not found')
s = s.replace(old_en, new_en, 1)

old_fil = "      about_title:'About', about_desc:'Iisang canonical About page ang ginagamit ng RUTA at Daybook para pareho lagi ang profile, credits at contact details.', about_open:'Buksan ang About',\n"
new_fil = "      about_title:'About RUTA', about_desc:'Tungkol sa app, bakit ito mahalaga, version at credits.', about_open:'Buksan ang About',\n      support_title:'Support RUTA', support_desc:'Optional donations para sa hosting, testing devices, kape at paminsan-minsang bug hunt.', support_open:'Buksan ang Support',\n      support_empty:'Wala pang published na donation method.', support_admin_hint:'Admin mode: puwede kang magdagdag, mag-edit o mag-alis ng e-wallet details.', support_readonly:'Read-only ang donation details. Lalabas lang ang admin editing kapag naka-sign in ang authorized account.',\n      add_support:'+ Magdagdag ng e-wallet', edit_support:'I-edit ang e-wallet', provider:'Provider / e-wallet', account_name:'Pangalan ng account', account_id:'Account number / ID', payment_link:'Payment link (opsyonal)', note:'Note (opsyonal)', active_label:'I-publish ang method na ito', sort_order:'Display order',\n      support_saved:'Na-save ang support method.', support_removed:'Inalis ang support method.', remove_support:'Alisin ang e-wallet method na ito?', open_payment:'Buksan ang payment link', copy_value:'Kopyahin', copied:'Nakopya', loading_support:'Kinukuha ang support options…', support_error:'Hindi available ang support information ngayon.', official_site:'Official SynthIQ site',\n"
if old_fil not in s:
    raise SystemExit('FIL about copy marker not found')
s = s.replace(old_fil, new_fil, 1)

old_inject = "  function injectPanels(){\n    fleetPanel(); cloudPanel(); aboutPanel();\n  }\n"
new_inject = "  function injectPanels(){\n    fleetPanel(); cloudPanel(); aboutPanel(); supportPanel();\n  }\n"
if old_inject not in s:
    raise SystemExit('injectPanels marker not found')
s = s.replace(old_inject, new_inject, 1)

old_block = '''  function aboutPanel(){
    const sheet=document.querySelector('#overlayRoot .form-sheet');
    if(!sheet||sheet.querySelector('#rutaAboutPanel'))return;
    const actions=settingsActions(sheet);
    const box=document.createElement('div'); box.id='rutaAboutPanel'; box.className='field';
    box.innerHTML=`<label>${c('about_title')}</label><div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px">${c('about_desc')}</div><button class="geo-btn" style="margin-bottom:0" onclick="rutaOpenAbout()">${c('about_open')} ↗</button>`;
    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);
  }

  window.rutaOpenAbout=()=>{
    const opened=window.open(ABOUT_URL,'_blank','noopener,noreferrer');
    if(!opened) window.location.href=ABOUT_URL;
  };
'''

new_block = r'''  function aboutPanel(){
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
    const copyBtn=row.account_identifier?`<button class="done-btn" onclick='rutaCopySupportValue(${JSON.stringify(String(row.account_identifier))})'>${c('copy_value')}</button>`:'';
    const payBtn=pay?`<button class="done-btn" onclick='rutaOpenPayment(${JSON.stringify(pay)})'>${c('open_payment')} ↗</button>`:'';
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
'''

if old_block not in s:
    raise SystemExit('old About block not found')
s = s.replace(old_block, new_block, 1)

style_marker = "      .pms-item>div:last-child{flex-wrap:wrap;justify-content:flex-end}\n"
style_add = """      .pms-item>div:last-child{flex-wrap:wrap;justify-content:flex-end}\n      .ruta-about-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 14px}.ruta-about-logo{font:700 28px 'JetBrains Mono',monospace;letter-spacing:1px}.ruta-about-logo span{color:var(--amber)}.ruta-version{font:700 12px 'JetBrains Mono',monospace;color:var(--teal);border:1px solid var(--panel-border-light);padding:4px 7px;border-radius:4px}.ruta-info-card,.ruta-support-method{background:var(--bg);border:1px solid var(--panel-border-light);border-radius:6px;padding:13px 14px;margin-bottom:10px}.ruta-info-card h4{font-size:13px;margin:0 0 7px}.ruta-info-card p{font-size:12px;line-height:1.55;color:var(--muted);margin:0}.ruta-credit{font-weight:800;font-size:14px}.ruta-credit-sub{font-size:12px;color:var(--teal);margin-top:3px}.ruta-support-title{font-weight:800;font-size:14px}.ruta-support-value{font:600 12px 'JetBrains Mono',monospace;margin-top:5px}.ruta-support-note{font-size:12px;color:var(--muted);line-height:1.45;margin-top:6px}.ruta-support-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.ruta-support-actions .done-btn{flex:0 0 auto}\n"""
if style_marker not in s:
    raise SystemExit('style marker not found')
s = s.replace(style_marker, style_add, 1)

p.write_text(s)

idx = Path('index.html')
h = idx.read_text()
old_idx = "navigator.serviceWorker.register('service-worker.js?v=11-shared-about')"
new_idx = "navigator.serviceWorker.register('service-worker.js?v=12-native-about-support')"
if old_idx not in h:
    raise SystemExit('index SW marker not found')
idx.write_text(h.replace(old_idx,new_idx,1))

swp=Path('service-worker.js')
sw=swp.read_text()
old_cache="const CACHE_NAME = 'ruta-cache-v11-shared-about';"
new_cache="const CACHE_NAME = 'ruta-cache-v12-native-about-support';"
if old_cache not in sw:
    raise SystemExit('SW cache marker not found')
swp.write_text(sw.replace(old_cache,new_cache,1))

pkgp=Path('package.json')
pkg=json.loads(pkgp.read_text())
pkg['version']='1.2.0'
pkgp.write_text(json.dumps(pkg,indent=2,ensure_ascii=False)+'\n')

wf=Path('.github/workflows/android-apk.yml')
w=wf.read_text()
w=w.replace('# Shared About release build','# Native About and Support release build',1)
w=w.replace('RUTA_VERSION_NAME: 1.0.${{ github.run_number }}','RUTA_VERSION_NAME: 1.2.0',1)
wf.write_text(w)
