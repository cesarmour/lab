#!/usr/bin/env python3
"""Gera as páginas de demo a partir de template.html + scenarios/*.js.
Uso: python3 build.py  (na pasta hypr-agents)"""
import re, json, pathlib

ROOT = pathlib.Path(__file__).parent
CASES = [  # (slug, rótulo no seletor, pasta de saída relativa à raiz)
    ('protetor', 'queda de venda', ''),
    ('canibalizacao', 'canibalização', 'cases/canibalizacao'),
    ('ruptura', 'ruptura', 'cases/ruptura'),
    ('elasticidade', 'elasticidade', 'cases/elasticidade'),
]

def meta(js, key):
    m = re.search(r"\n\s*%s:'((?:[^'\\]|\\.)*)'" % key, js)
    return m.group(1).replace("\\'", "'") if m else ''

tpl = (ROOT / 'template.html').read_text()
for slug, label, out in CASES:
    js = (ROOT / 'scenarios' / f'{slug}.js').read_text()
    nav = "".join(
        f'<a href="/hypr-agents/{o + "/" if o else ""}"{" class=\"on\"" if s == slug else ""}>{l}</a>'
        for s, l, o in CASES) + '<a href="/hypr-agents/cases/monster/">caso real</a>'
    page = (tpl.replace('{{SCENARIO}}', js)
            .replace('{{NAV}}', nav)
            .replace('{{PAGETITLE}}', meta(js, 'pageTitle'))
            .replace('{{TITLE}}', meta(js, 'title'))
            .replace('{{LEDE}}', meta(js, 'lede'))
            .replace('{{C4}}', meta(js, 'c4'))
            .replace('{{C7}}', meta(js, 'c7'))
            .replace('{{C8}}', meta(js, 'c8'))
            .replace('{{C10}}', meta(js, 'c10'))
            .replace('{{FOOT}}', meta(js, 'foot'))
            .replace('{{LASTAG}}', re.search(r'lastAg:(\d+)', js).group(1)))
    assert '{{' not in page, [m for m in re.findall(r'\{\{\w+\}\}', page)]
    dest = ROOT / out / 'index.html' if out else ROOT / 'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page)
    print('ok', dest.relative_to(ROOT))
