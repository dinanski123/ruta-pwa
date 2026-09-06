from pathlib import Path

ABOUT_URL = 'https://daybook-ferdz.vercel.app/#about'

# cloud-sync.js
p = Path('cloud-sync.js')
s = p.read_text()

marker = "  const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';\n"
if marker not in s:
    raise SystemExit('VPIC marker not found')
s = s.replace(marker, marker + f"  const ABOUT_URL = '{ABOUT_URL}';\n", 1)

old = "      cloud_title:'Cloud sync', cloud_desc:'Use the same account on Android and iPhone to keep RUTA data in sync.',\n"
new = old + "      about_title:'About', about_desc:'RUTA and Daybook share one canonical About page so the profile, credits and contact details stay the same.', about_open:'Open About',\n"
if old not in s:
    raise SystemExit('English copy marker not found')
s = s.replace(old, new, 1)

old = "      cloud_title:'Cloud sync', cloud_desc:'Gamitin ang parehong account sa Android at iPhone para mag-sync ang RUTA data.',\n"
new = old + "      about_title:'About', about_desc:'Iisang canonical About page ang ginagamit ng RUTA at Daybook para pareho lagi ang profile, credits at contact details.', about_open:'Buksan ang About',\n"
if old not in s:
    raise SystemExit('Filipino copy marker not found')
s = s.replace(old, new, 1)

old = "  function injectPanels(){\n    fleetPanel(); cloudPanel();\n  }"
new = "  function injectPanels(){\n    fleetPanel(); cloudPanel(); aboutPanel();\n  }"
if old not in s:
    raise SystemExit('injectPanels marker not found')
s = s.replace(old, new, 1)

cloud_end = "    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);\n  }\n\n  function panelRefresh()"
about = "    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);\n  }\n\n  function aboutPanel(){\n    const sheet=document.querySelector('#overlayRoot .form-sheet');\n    if(!sheet||sheet.querySelector('#rutaAboutPanel'))return;\n    const actions=settingsActions(sheet);\n    const box=document.createElement('div'); box.id='rutaAboutPanel'; box.className='field';\n    box.innerHTML=`<label>${c('about_title')}</label><div style=\"font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px\">${c('about_desc')}</div><button class=\"geo-btn\" style=\"margin-bottom:0\" onclick=\"rutaOpenAbout()\">${c('about_open')} ↗</button>`;\n    if(actions)sheet.insertBefore(box,actions); else sheet.appendChild(box);\n  }\n\n  window.rutaOpenAbout=()=>{\n    const opened=window.open(ABOUT_URL,'_blank','noopener,noreferrer');\n    if(!opened) window.location.href=ABOUT_URL;\n  };\n\n  function panelRefresh()"
if cloud_end not in s:
    raise SystemExit('cloud panel end marker not found')
s = s.replace(cloud_end, about, 1)

p.write_text(s)

# index.html cache-bust registration
p = Path('index.html')
s = p.read_text()
old = "navigator.serviceWorker.register('service-worker.js?v=10-tablet-responsive')"
new = "navigator.serviceWorker.register('service-worker.js?v=11-shared-about')"
if old not in s:
    raise SystemExit('index service-worker marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# service-worker.js cache name
p = Path('service-worker.js')
s = p.read_text()
old = "const CACHE_NAME = 'ruta-cache-v10-tablet-responsive';"
new = "const CACHE_NAME = 'ruta-cache-v11-shared-about';"
if old not in s:
    raise SystemExit('service worker cache marker not found')
s = s.replace(old, new, 1)
p.write_text(s)
