#!/usr/bin/env python3
"""Gera a versão do front do Swarm para swarm.hyprgrid.ai (Worker `swarm`, conta HYPR) a partir de swarm/ (lab).
Uso: python3 make_web.py /home/claude/hypr-swarm/web"""
import re, shutil, sys, pathlib
SRC = pathlib.Path(__file__).parent / 'swarm'; OUT = pathlib.Path(sys.argv[1])
HOST = 'https://swarm.hyprgrid.ai'
if OUT.exists(): shutil.rmtree(OUT)
shutil.copytree(SRC, OUT)
shutil.copy(pathlib.Path(__file__).parent / 'hypr-wordmark-white.svg', OUT / 'hypr-wordmark-white.svg')
REPL = [
    ('https://lab.softwarehaus.workers.dev/hypr-agents/swarm/app/', HOST + '/app/'),
    ('/hypr-agents/hypr-wordmark-white.svg', '/hypr-wordmark-white.svg'),
    ('/hypr-agents/swarm/', '/'),
    (r'/^(\/hypr-agents\/|https:\/\/lab\.softwarehaus\.workers\.dev\/hypr-agents\/)/', r'/^(\/|https:\/\/swarm\.hyprgrid\.ai\/)/'),
    (r'/^\/hypr-agents\//', r'/^\//'),
    ('/hypr-agents/', '/'),
]
for p in OUT.rglob('*'):
    if p.suffix in ('.html', '.js'):
        t = p.read_text()
        for a, b in REPL: t = t.replace(a, b)
        p.write_text(t)
(OUT / 'wrangler.jsonc').write_text('{\n  "name": "swarm",\n  "compatibility_date": "2026-10-01",\n  "assets": { "directory": "./", "html_handling": "auto-trailing-slash", "not_found_handling": "404-page" },\n  "routes": [{ "pattern": "swarm.hyprgrid.ai", "custom_domain": true }]\n}\n')
(OUT / 'README.md').write_text('# Swarm · front (swarm.hyprgrid.ai)\n\nGerado por `lab/hypr-agents/make_web.py` a partir do front no repo lab; não edite aqui. Publicar: `npx wrangler deploy` nesta pasta (conta HYPR, Worker `swarm`, domínio swarm.hyprgrid.ai).\n')
left = [str(p) for p in OUT.rglob('*') if p.suffix in ('.html', '.js') and 'hypr-agents' in p.read_text()]
print('ok', OUT, 'restos:', left)
