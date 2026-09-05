/* ---------- MAIN RENDER ---------- */
function render(){
  document.getElementById('odoChip').textContent = fmtKm(currentOdo());

  const main = document.getElementById('main');
  if(activeTab==='home') main.innerHTML = renderHome();
  else if(activeTab==='fuel') main.innerHTML = renderFuel();
  else if(activeTab==='trips') main.innerHTML = renderTrips();
  else if(activeTab==='pms') main.innerHTML = renderPms();
  else if(activeTab==='nearby') main.innerHTML = renderNearby();

  document.getElementById('tabbar').innerHTML = TABS.map(tb=>`
    <button class="tab-btn ${activeTab===tb.id?'active':''}" onclick="switchTab('${tb.id}')">
      ${ICONS[tb.icon]}
      <span>${t(tb.key)}</span>
    </button>
  `).join('');
}

(async function init(){
  state = await loadData();
  applyTheme();
  render();
})();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(e=>console.log('SW registration failed', e));
  });
}
