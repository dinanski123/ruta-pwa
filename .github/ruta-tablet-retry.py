from pathlib import Path

p = Path('.github/ruta-tablet-patch.py')
s = p.read_text()
start = s.index('render_old =')
end = s.index('\n\nold_sw =', start)
replacement = '''render_old = "  const main = document.getElementById('main');\\n"
render_new = "  const main = document.getElementById('main');\\n  main.dataset.view = activeTab;\\n"
if s.count(render_old) != 1:
    raise SystemExit(f'render marker expected once, found {s.count(render_old)}')
s = s.replace(render_old, render_new, 1)'''
p.write_text(s[:start] + replacement + s[end:])
