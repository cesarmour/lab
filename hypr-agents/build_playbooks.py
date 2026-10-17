#!/usr/bin/env python3
"""Gera /hypr-agents/swarm/playbooks/ a partir dos .md do motor (hypr-swarm/playbooks).
Uso: python3 build_playbooks.py <pasta playbooks do hypr-swarm>"""
import sys, re, html, pathlib
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).parent / 'swarm' / 'playbooks'; OUT.mkdir(parents=True, exist_ok=True)
e = html.escape

CATS = [
  ('Diagnóstico', 'Por que aconteceu', [('queda-de-venda','revIQ · geoIQ · adsIQ'),('movimento-concorrente','revIQ · geoIQ'),('ruptura','revIQ · geoIQ · adsIQ'),('sazonalidade-e-calendario','revIQ · geoIQ')]),
  ('Crescimento', 'Onde e como crescer', [('lancamento-expansao','revIQ · geoIQ · bidIQ'),('performance-por-rede','revIQ · geoIQ'),('mix-de-portfolio','revIQ'),('canibalizacao','revIQ · geoIQ · bidIQ · askIQ')]),
  ('Preço e mídia', 'O que compensa', [('elasticidade','revIQ · geoIQ · adsIQ'),('avaliacao-de-campanha','adsIQ · revIQ · geoIQ · bidIQ')]),
  ('Comprador', 'Quem compra e por quê', [('cesta-e-ocasiao','revIQ · bidIQ'),('fidelidade-e-churn','revIQ · bidIQ')]),
]

def parse(slug):
    t = (SRC / f'{slug}.md').read_text()
    title = re.search(r'^# (.+)$', t, re.M).group(1)
    q = re.search(r'Pergunta típica: (.+)', t); q = q.group(1) if q else ''
    hyps = re.findall(r'^- (.+)$', t, re.M)
    res = re.search(r'Resultado esperado: (.+)', t); res = res.group(1) if res else ''
    act = re.search(r'Ação típica: (.+)', t); act = act.group(1) if act else ''
    return title, q, hyps, res, act

cards = []
n = 0
for cat, sub, items in CATS:
    body = ''
    for slug, iqs in items:
        title, q, hyps, res, act = parse(slug); n += 1
        hy = ''.join(f'<li>{e(h)}</li>' for h in hyps)
        body += f'''<article class="pb" id="{slug}"><header><div><h3>{e(title)}</h3><p class="q">{e(q)}</p></div><div class="iq">{e(iqs)}</div></header>
<h4>Hipóteses de partida</h4><ul>{hy}</ul>
<div class="two"><div><h4>Resultado</h4><p>{e(res)}</p></div><div><h4>Ação típica</h4><p>{e(act)}</p></div></div>
<p class="file"><a href="/hypr-agents/swarm/app/?playbook={slug}">Abrir caso com este playbook</a> · <span>playbooks/{slug}.md</span></p></article>'''
    cards.append(f'<section><div class="cat"><h2>{e(cat)}</h2><p>{e(sub)}</p></div>{body}</section>')

nav = ''.join(f'<a href="#{s}">{e(parse(s)[0])}</a>' for _, _, items in CATS for s, _ in items)

page = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1C262F">
<title>Playbooks · Swarm, by HYPR</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--midnight:#1C262F;--cloud:#FAFAFA;--off:#FCFEFE;--mist:#E5EBF2;--steel:#78909C;--slate:#536872;--cyan:#3397B9;--deep:#246C84;--soft:#C5EAF6;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--shadow:0 8px 28px rgba(28,38,47,.06),0 1px 2px rgba(28,38,47,.04)}}
*{{box-sizing:border-box}}html,body{{margin:0;background:var(--cloud);color:var(--midnight);font-family:Urbanist,system-ui,sans-serif;font-size:17px;line-height:1.5;-webkit-font-smoothing:antialiased}}
.cover{{background:var(--midnight);color:var(--off);padding:0 24px}}.cover .in{{max-width:1080px;margin:0 auto;padding:36px 0 44px}}
.cover .top{{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px}}.cover .top a{{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(252,254,254,.7);text-decoration:none;border:1px solid rgba(252,254,254,.3);border-radius:999px;padding:6px 14px;margin-right:8px}}
.cover .wm{{height:17px;width:auto;display:block}}
.cover h1{{font-weight:300;font-size:clamp(34px,5vw,60px);line-height:1.06;letter-spacing:-.015em;margin:0;max-width:20ch}}.cover h1 em{{font-style:normal;color:var(--cyan)}}
.cover .lede{{color:rgba(252,254,254,.72);font-size:18px;max-width:60ch;margin:18px 0 0;font-weight:300}}
.cover nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}}.cover nav a{{font-size:13px;color:rgba(252,254,254,.8);text-decoration:none;border:1px solid rgba(252,254,254,.25);border-radius:999px;padding:5px 12px}}
.page{{max-width:1080px;margin:0 auto;padding:16px 24px 96px}}
section{{padding:36px 0;border-top:1px solid var(--mist)}}section:first-child{{border-top:0}}
.cat{{margin-bottom:12px}}.cat h2{{margin:0;font-size:28px;font-weight:300;letter-spacing:-.01em}}.cat p{{margin:2px 0 0;color:var(--steel)}}
.pb{{background:var(--off);border:1px solid var(--mist);border-radius:20px;padding:22px 24px;box-shadow:var(--shadow);margin-top:16px}}
.pb header{{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}}.pb h3{{margin:0;font-size:20px;font-weight:600}}.pb .q{{margin:4px 0 0;color:var(--slate);font-size:15.5px}}
.iq{{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;color:var(--deep);background:var(--soft);border-radius:999px;padding:4px 12px;white-space:nowrap}}
h4{{margin:16px 0 6px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel);font-weight:500}}
.pb ul{{margin:0;padding-left:18px;color:var(--slate);font-size:15px}}.pb ul li{{margin:3px 0}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}.two p{{margin:0;color:var(--slate);font-size:15px}}
.file{{margin:14px 0 0;font-size:13px;color:var(--steel)}}.file a{{color:var(--cyan)}}.file span{{font-family:var(--mono);font-size:11px}}
.foot{{margin-top:28px;color:var(--steel);font-size:13px;max-width:70ch}}
@media (max-width:760px){{.pb header{{flex-direction:column}}.two{{grid-template-columns:1fr}}}}
</style></head><body>
<section class="cover"><div class="in">
<div class="top"><div><a href="/hypr-agents/swarm/">← conceito</a><a href="/hypr-agents/swarm/app/">abrir caso</a></div><img class="wm" src="/hypr-agents/hypr-wordmark-white.svg" alt="HYPR"></div>
<h1>{n} playbooks, <em>quatro</em> famílias.</h1>
<p class="lede">Um playbook é o ponto de partida de um caso: as hipóteses que o orquestrador distribui aos investigadores, o controle que separa causa de coincidência, o resultado esperado e a ação que sai dele. São arquivos versionados no motor; cada caso grava qual rodou.</p>
<nav>{nav}</nav>
</div></section>
<div class="page">{''.join(cards)}
<p class="foot">Fonte: HYPR-Projects/hypr-swarm, pasta playbooks/. Os IQs indicam as aplicações consultadas pelos investigadores (revIQ transações, geoIQ lugares, bidIQ audiências, adsIQ performance, askIQ pesquisas).</p>
</div></body></html>'''
(OUT / 'index.html').write_text(page)
print('ok', n, 'playbooks')
