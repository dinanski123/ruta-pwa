const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M4 11h10"/><path d="M14 8l3 3v6a1.5 1.5 0 0 0 3 0v-5l-3-3"/><path d="M2 21h14"/></svg>`,
  route: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4h-.5"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

/* ---------- TRANSLATIONS ---------- */
const TR = {
  en: {
    tab_home:'Dashboard', tab_fuel:'Fuel', tab_trips:'Trips', tab_pms:'Maintenance', tab_nearby:'Nearby',
    odo_label:'current odometer', avg_kml:'avg km/L', month_spend:'spent this month', upcoming_pms:'Upcoming maintenance', no_pms:'No maintenance items yet.',
    fuel_log:'Fuel log', add:'+ Add', no_fuel:'No fuel entries yet. Log your first fill-up.', trip_log:'Trip log', no_trips:'No trips logged yet. Track your drives here.',
    maint_schedule:'Maintenance schedule', add_item:'+ Item', done:'Done', tagged:'tagged', fuel_watch:'Fuel watch', getting_location:'Getting your location…',
    sorted_by_distance:'📍 Sorted by distance from your current location.', location_denied:'Location access was not allowed. Sorted by most recent visit instead.',
    location_unavailable:"Location isn't available in this preview (works better once installed as a real PWA on your phone). Sorted by most recent visit.",
    retry:'Retry', no_stations:'No tagged stations yet. Log fuel with a station name to see them here.', last_price:'Last price:', last_visit:'Last visit:',
    every:'every', last_done_at:'last done at', status_overdue:(n)=>`${n}km overdue`, status_soon:(n)=>`${n}km left`, status_ok:(n)=>`${n}km left`,
    add_fuel_title:'Add fuel entry', tag_location_btn:'📍 Tag current location', date:'Date', station_name:'Gas station name', station_placeholder:'e.g. Shell EDSA',
    odo_now:'Current odometer (km)', liters:'Liters', price_per_liter:'Price/Liter', cancel:'Cancel', save:'Save', add_trip_title:'Add trip',
    start_odo:'Start odometer', end_odo:'End odometer', purpose:'Purpose', purpose_work:'Work', purpose_personal:'Personal', purpose_errand:'Errand', purpose_other:'Other',
    note_optional:'Note (optional)', note_placeholder:'e.g. airport pick-up', add_maint_title:'Add maintenance item', item_name:'Name', item_name_placeholder:'e.g. Brake fluid change',
    interval_km:'Every how many km', last_done_odo:'Last done at odometer (km)', geo_getting:'Getting location…', geo_tagged:'✓ Location tagged',
    geo_unavailable:"Location not available in this preview — that's fine, go ahead and save", geo_none:'Location not available on this device',
    default_maint:['Oil change','Tire rotation','Air filter replacement','Brake check'], settings:'Settings', language:'Language', currency:'Currency', theme:'Appearance', dark:'Dark', light:'Light', close:'Close',
  },
  fil: {
    tab_home:'Dashboard', tab_fuel:'Gasolina', tab_trips:'Byahe', tab_pms:'PMS', tab_nearby:'Malapit', odo_label:'kasalukuyang odometer', avg_kml:'avg km/L', month_spend:'gastos ngayong buwan',
    upcoming_pms:'Susunod na PMS', no_pms:'Wala pang maintenance items.', fuel_log:'Fuel log', add:'+ Magdagdag', no_fuel:'Wala pang naka-log na pag-gas. Idagdag ang unang fill-up mo.',
    trip_log:'Trip log', no_trips:'Wala pang naka-log na byahe. I-track ang mga trip mo dito.', maint_schedule:'Maintenance schedule', add_item:'+ Item', done:'Tapos na', tagged:'naka-tag',
    fuel_watch:'Fuel watch', getting_location:'Kinukuha ang iyong lokasyon…', sorted_by_distance:'📍 Naka-sort ayon sa distansya mula sa kasalukuyang lokasyon mo.',
    location_denied:'Hindi pinayagan ang location access. Naka-sort na lang ayon sa pinakabagong bisita.', location_unavailable:'Location access hindi available sa preview na ito (mas gagana ito kapag naka-install na bilang PWA sa iyong phone). Naka-sort ayon sa pinakabagong bisita.',
    retry:'Ulitin', no_stations:'Wala pang naka-tag na estasyon. Mag-log ng gasolina na may station name para makita dito.', last_price:'Huling presyo:', last_visit:'Huling bisita:', every:'bawat', last_done_at:'huling gawa sa',
    status_overdue:(n)=>`${n}km overdue`, status_soon:(n)=>`${n}km na lang`, status_ok:(n)=>`${n}km pa`, add_fuel_title:'Magdagdag ng fuel entry', tag_location_btn:'📍 I-tag ang kasalukuyang lokasyon',
    date:'Petsa', station_name:'Pangalan ng gas station', station_placeholder:'hal. Shell EDSA', odo_now:'Odometer ngayon (km)', liters:'Liters', price_per_liter:'Presyo/Liter', cancel:'Kanselahin', save:'I-save',
    add_trip_title:'Magdagdag ng trip', start_odo:'Simulang odometer', end_odo:'Tapos na odometer', purpose:'Layunin', purpose_work:'Trabaho', purpose_personal:'Personal', purpose_errand:'Errand', purpose_other:'Iba pa',
    note_optional:'Note (opsyonal)', note_placeholder:'hal. pick-up sa airport', add_maint_title:'Magdagdag ng maintenance item', item_name:'Pangalan', item_name_placeholder:'hal. Palitan ng brake fluid', interval_km:'Bawat ilang km',
    last_done_odo:'Huling ginawa sa odometer (km)', geo_getting:'Kinukuha ang lokasyon…', geo_tagged:'✓ Na-tag ang lokasyon', geo_unavailable:'Hindi available ang location dito — okay lang, ituloy ang pag-save', geo_none:'Hindi available ang location sa device na ito',
    default_maint:['Palitan ng oli','I-rotate ang gulong','Palitan ng air filter','I-check ang preno'], settings:'Settings', language:'Wika', currency:'Currency', theme:'Itsura', dark:'Dark', light:'Light', close:'Isara',
  }
};
function t(key, ...args){ const dict = TR[state.settings.language] || TR.fil; const val = dict[key]; if(typeof val === 'function') return val(...args); return val !== undefined ? val : key; }

const TABS = [
  {id:'home', key:'tab_home', icon:'home'}, {id:'fuel', key:'tab_fuel', icon:'fuel'}, {id:'trips', key:'tab_trips', icon:'route'}, {id:'pms', key:'tab_pms', icon:'wrench'}, {id:'nearby', key:'tab_nearby', icon:'pin'},
];
let state = null;
let activeTab = 'home';
let geoState = { status:'idle', lat:null, lng:null };

function defaultData(lang){
  const names = TR[lang || 'fil'].default_maint;
  return { settings:{ odometer: 0, currency: '₱', language: lang || 'fil', theme: 'dark' }, fuel: [], trips: [], maintenance: [
    {id:'m1', name:names[0], intervalKm:5000, lastOdo:0}, {id:'m2', name:names[1], intervalKm:10000, lastOdo:0}, {id:'m3', name:names[2], intervalKm:15000, lastOdo:0}, {id:'m4', name:names[3], intervalKm:10000, lastOdo:0},
  ]};
}
async function loadData(){ try{ const raw = localStorage.getItem('ruta-vehicle-data'); if(raw){ const parsed = JSON.parse(raw); if(!parsed.settings.language) parsed.settings.language = 'fil'; if(!parsed.settings.currency) parsed.settings.currency = '₱'; if(!parsed.settings.theme) parsed.settings.theme = 'dark'; return parsed; } return defaultData('fil'); }catch(e){ return defaultData('fil'); } }
async function saveData(){ try{ localStorage.setItem('ruta-vehicle-data', JSON.stringify(state)); }catch(e){ console.error('save failed', e); } }
function applyTheme(){ document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark'); }
function setLanguage(lang){ state.settings.language = lang; saveData(); render(); openSettings(); }
function setCurrency(c){ state.settings.currency = c; saveData(); render(); openSettings(); }
function setTheme(th){ state.settings.theme = th; applyTheme(); saveData(); render(); openSettings(); }
function fmtMoney(n){ return state.settings.currency + Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtKm(n){ return Number(n||0).toLocaleString('en-PH') + ' km'; }
function uid(){ return Math.random().toString(36).slice(2,10); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function currentOdo(){ return state.settings.odometer || 0; }
function computeFuelStats(){
  const sorted = [...state.fuel].sort((a,b)=>a.odometer-b.odometer); const kmls = [];
  for(let i=1;i<sorted.length;i++){ const dist = sorted[i].odometer - sorted[i-1].odometer; if(dist>0 && sorted[i].liters>0) kmls.push(dist/sorted[i].liters); }
  const last5 = kmls.slice(-5); const avgKml = last5.length ? (last5.reduce((a,b)=>a+b,0)/last5.length) : null; const now = new Date();
  const monthSpend = state.fuel.filter(f=>{ const d = new Date(f.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); }).reduce((a,f)=>a+Number(f.total||0),0);
  return {avgKml, monthSpend};
}
function maintenanceStatus(item){ const kmSince = currentOdo() - item.lastOdo; const remaining = item.intervalKm - kmSince; let status = 'ok'; if(remaining<=0) status='overdue'; else if(remaining<=300) status='soon'; return {remaining, status}; }
function haversine(lat1,lon1,lat2,lon2){ const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function tryGeolocation(){
  geoState.status='loading'; render(); if(!navigator.geolocation){ geoState.status='unavailable'; render(); return; }
  const timeout = setTimeout(()=>{ if(geoState.status==='loading'){ geoState.status='unavailable'; render(); } }, 6000);
  navigator.geolocation.getCurrentPosition(pos=>{ clearTimeout(timeout); geoState = {status:'ok', lat:pos.coords.latitude, lng:pos.coords.longitude}; render(); }, err=>{ clearTimeout(timeout); geoState.status = err.code===1 ? 'denied' : 'unavailable'; render(); }, {timeout:5500, maximumAge:60000});
}
function switchTab(id){ activeTab=id; render(); }
function openOverlay(html){ document.getElementById('overlayRoot').innerHTML = html; }
function closeOverlay(){ document.getElementById('overlayRoot').innerHTML = ''; }
