from pathlib import Path

cloud = Path('cloud-sync.js')
s = cloud.read_text()

def once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)

once(
"      email:'Email', password:'Password', signin:'Sign in', signup:'Create account', signout:'Sign out', sync:'Sync now',\n",
"      email:'Email', password:'Password', show_password:'Show password', signin:'Sign in', signup:'Create account', signout:'Sign out', sync:'Sync now',\n",
'English show password copy'
)

once(
"      email:'Email', password:'Password', signin:'Mag-sign in', signup:'Gumawa ng account', signout:'Mag-sign out', sync:'I-sync ngayon',\n",
"      email:'Email', password:'Password', show_password:'Ipakita ang password', signin:'Mag-sign in', signup:'Gumawa ng account', signout:'Mag-sign out', sync:'I-sync ngayon',\n",
'Filipino show password copy'
)

old_html = """      box.innerHTML=`<label>${c('cloud_title')}</label><div style=\"font-size:12px;color:var(--muted);margin-bottom:10px\">${c('cloud_desc')}</div><input id=\"ruta_sync_email\" type=\"email\" autocomplete=\"email\" placeholder=\"${c('email')}\" style=\"margin-bottom:8px\"><input id=\"ruta_sync_password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"${c('password')}\">${info?`<div style=\"font-size:12px;color:var(--muted);margin-top:8px\">${esc(info)}</div>`:''}<div class=\"form-actions\"><button class=\"btn btn-secondary\"${disabled} onclick=\"rutaCloudSignIn()\">${c('signin')}</button><button class=\"btn btn-secondary\"${disabled} onclick=\"rutaCloudSignUp()\">${c('signup')}</button></div>`;"""
new_html = """      box.innerHTML=`<label>${c('cloud_title')}</label><div style=\"font-size:12px;color:var(--muted);margin-bottom:10px\">${c('cloud_desc')}</div><input id=\"ruta_sync_email\" type=\"email\" autocomplete=\"email\" placeholder=\"${c('email')}\" style=\"margin-bottom:8px\"><input id=\"ruta_sync_password\" type=\"password\" autocomplete=\"current-password\" placeholder=\"${c('password')}\"><label style=\"display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--muted);cursor:pointer\"><input id=\"ruta_sync_show_password\" type=\"checkbox\" onchange=\"rutaToggleCloudPassword(this.checked)\" style=\"width:auto;margin:0\"><span>${c('show_password')}</span></label>${info?`<div style=\"font-size:12px;color:var(--muted);margin-top:8px\">${esc(info)}</div>`:''}<div class=\"form-actions\"><button class=\"btn btn-secondary\"${disabled} onclick=\"rutaCloudSignIn()\">${c('signin')}</button><button class=\"btn btn-secondary\"${disabled} onclick=\"rutaCloudSignUp()\">${c('signup')}</button></div>`;"""
once(old_html, new_html, 'cloud login password field')

once(
"  function creds(){return {email:(document.getElementById('ruta_sync_email')?.value||'').trim(),password:document.getElementById('ruta_sync_password')?.value||''};}\n",
"  function creds(){return {email:(document.getElementById('ruta_sync_email')?.value||'').trim(),password:document.getElementById('ruta_sync_password')?.value||''};}\n  window.rutaToggleCloudPassword=(show)=>{const input=document.getElementById('ruta_sync_password');if(input)input.type=show?'text':'password';};\n",
'password toggle handler'
)

cloud.write_text(s)

index = Path('index.html')
i = index.read_text()
old = "service-worker.js?v=8-sync-hardening"
new = "service-worker.js?v=9-password-toggle"
if i.count(old) != 1:
    raise SystemExit(f'index service-worker version: expected 1 match, got {i.count(old)}')
index.write_text(i.replace(old, new, 1))
