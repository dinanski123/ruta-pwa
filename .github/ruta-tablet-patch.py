from pathlib import Path

p = Path('index.html')
s = p.read_text()

marker = ".toggle-btn.active{background:var(--amber-dim);color:var(--amber);}\n"
if marker not in s:
    raise SystemExit('tablet CSS insertion marker not found')

css = r'''

/* ---------- RESPONSIVE TABLET / LARGE SCREEN ---------- */
@media (min-width: 700px){
  body{display:block;}
  #phone{
    width:100%;
    max-width:none;
    border-left:none;
    border-right:none;
  }
  header{
    padding:calc(22px + env(safe-area-inset-top)) max(32px, env(safe-area-inset-right)) 18px max(32px, env(safe-area-inset-left));
  }
  .brand{font-size:24px;}
  .odo-chip{font-size:14px;padding:8px 12px;}
  .icon-btn{width:40px;height:40px;}
  .icon-btn svg{width:20px;height:20px;}
  main{
    width:100%;
    max-width:1180px;
    margin:0 auto;
    padding:28px max(32px, env(safe-area-inset-right)) calc(112px + env(safe-area-inset-bottom)) max(32px, env(safe-area-inset-left));
  }
  .hero{padding:28px 18px 32px;}
  .hero .num{font-size:64px;}
  .hero .label{font-size:14px;}
  .stat-row{gap:16px;}
  .stat-card{padding:18px;}
  .stat-card .v{font-size:26px;}
  .section-title{font-size:17px;margin-bottom:14px;}
  .list-card,.pms-item,.location-banner{padding:16px 18px;}
  .list-card .title,.pms-item .name{font-size:15px;}
  .list-card .meta,.pms-item .sub{font-size:13px;}
  nav#tabbar{
    max-width:none;
    padding:10px max(18px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
  }
  .tab-btn{min-height:50px;font-size:12px;gap:5px;}
  .tab-btn svg{width:22px;height:22px;}
  .form-overlay{
    align-items:center;
    padding:32px max(32px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(32px, env(safe-area-inset-left));
  }
  .form-sheet{
    max-width:720px;
    border:1px solid var(--panel-border-light);
    border-radius:14px;
    padding:28px;
    max-height:min(88dvh, 920px);
  }
  .form-sheet h3{font-size:20px;margin-bottom:20px;}
  .field{margin-bottom:16px;}
  .field label{font-size:13px;}
  .field input,.field select{font-size:15px;padding:12px 14px;}
  .toggle-btn{font-size:14px;padding:11px 10px;}
  .btn{min-height:46px;font-size:15px;}
  .geo-btn{min-height:44px;font-size:14px;}
  #rutaVehicleBar{
    padding-left:max(32px, calc((100vw - 1180px)/2 + 32px)) !important;
    padding-right:max(32px, calc((100vw - 1180px)/2 + 32px)) !important;
  }
}

@media (min-width: 900px){
  main[data-view="home"]{
    display:grid;
    grid-template-columns:minmax(280px,.8fr) minmax(420px,1.2fr);
    gap:18px 28px;
    align-content:start;
  }
  main[data-view="home"] .hero{
    grid-column:1;
    grid-row:1 / span 5;
    margin:0;
    border:1px solid var(--panel-border-light);
    border-radius:8px;
    background:var(--panel);
    display:flex;
    flex-direction:column;
    justify-content:center;
    min-height:260px;
  }
  main[data-view="home"] .stat-row,
  main[data-view="home"] .section-title,
  main[data-view="home"] .pms-item,
  main[data-view="home"] .empty-state{grid-column:2;}
  main[data-view="home"] .stat-row{margin-bottom:2px;}

  main[data-view="fuel"],
  main[data-view="nearby"]{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px 18px;
    align-content:start;
  }
  main[data-view="fuel"] > .section-title,
  main[data-view="fuel"] > .empty-state,
  main[data-view="nearby"] > .section-title,
  main[data-view="nearby"] > .location-banner,
  main[data-view="nearby"] > .empty-state{
    grid-column:1 / -1;
  }
  main[data-view="fuel"] > .list-card,
  main[data-view="nearby"] > .list-card{margin-bottom:0;}
}

@media (min-width: 1200px){
  main[data-view="fuel"],
  main[data-view="nearby"]{grid-template-columns:repeat(3,minmax(0,1fr));}
}

@media (min-width: 700px) and (max-height: 620px){
  .form-overlay{align-items:flex-start;padding-top:16px;padding-bottom:16px;}
  .form-sheet{max-height:calc(100dvh - 32px);}
}
'''

s = s.replace(marker, marker + css, 1)

render_old = "  const main = document.getElementById('main');\n\n  if(activeTab==='home')"
render_new = "  const main = document.getElementById('main');\n  main.dataset.view = activeTab;\n\n  if(activeTab==='home')"
if render_old not in s:
    raise SystemExit('render marker not found')
s = s.replace(render_old, render_new, 1)

old_sw = "navigator.serviceWorker.register('service-worker.js?v=9-password-toggle')"
new_sw = "navigator.serviceWorker.register('service-worker.js?v=10-tablet-responsive')"
if old_sw not in s:
    raise SystemExit('service worker registration marker not found')
s = s.replace(old_sw, new_sw, 1)

p.write_text(s)

swp = Path('service-worker.js')
sw = swp.read_text()
old_cache = "const CACHE_NAME = 'ruta-cache-v9-password-toggle';"
new_cache = "const CACHE_NAME = 'ruta-cache-v10-tablet-responsive';"
if old_cache not in sw:
    raise SystemExit('service worker cache marker not found')
sw = sw.replace(old_cache, new_cache, 1)
swp.write_text(sw)
