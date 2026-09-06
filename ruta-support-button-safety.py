from pathlib import Path
p=Path('cloud-sync.js')
s=p.read_text()
old="""    const copyBtn=row.account_identifier?`<button class=\"done-btn\" onclick='rutaCopySupportValue(${JSON.stringify(String(row.account_identifier))})'>${c('copy_value')}</button>`:'';\n    const payBtn=pay?`<button class=\"done-btn\" onclick='rutaOpenPayment(${JSON.stringify(pay)})'>${c('open_payment')} ↗</button>`:'';\n"""
new="""    const copyBtn=row.account_identifier?`<button class=\"done-btn\" data-copy=\"${esc(String(row.account_identifier))}\" onclick=\"rutaCopySupportValue(this.dataset.copy)\">${c('copy_value')}</button>`:'';\n    const payBtn=pay?`<button class=\"done-btn\" data-url=\"${esc(pay)}\" onclick=\"rutaOpenPayment(this.dataset.url)\">${c('open_payment')} ↗</button>`:'';\n"""
if old not in s:
    raise SystemExit('support button marker not found')
p.write_text(s.replace(old,new,1))
