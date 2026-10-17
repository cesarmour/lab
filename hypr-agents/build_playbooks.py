#!/usr/bin/env python3
"""Gera /hypr-agents/swarm/playbooks/ a partir dos .md do motor (hypr-swarm/playbooks).
Uso: python3 build_playbooks.py <pasta playbooks do hypr-swarm>"""
import sys, re, html, pathlib
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(__file__).parent / 'swarm' / 'playbooks'; OUT.mkdir(parents=True, exist_ok=True)
e = html.escape

ICON = {
 'Diagnóstico':'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M7.5 11.5l2-2.5 1.5 2 2.5-3.5"/></svg>',
 'Crescimento':'<svg viewBox="0 0 24 24"><path d="M12 21V11"/><path d="M12 15c0-3 2.5-5.5 6-5.5 0 3-2.5 5.5-6 5.5z"/><path d="M12 12c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/><path d="M5 21h14"/></svg>',
 'Preço e mídia':'<svg viewBox="0 0 24 24"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-7 7-9-9z"/><circle cx="8" cy="8" r="1.3"/><path d="M13 18l3-3"/></svg>',
 'Comprador':'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M19 4l1.5 1.5L23 3"/></svg>'}
PICON = {
 'queda-de-venda':'<svg viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8"/><path d="M21 12v5h-5"/></svg>',
 'movimento-concorrente':'<svg viewBox="0 0 24 24"><path d="M4 7h13"/><path d="M14 4l3 3-3 3"/><path d="M20 17H7"/><path d="M10 14l-3 3 3 3"/></svg>',
 'ruptura':'<svg viewBox="0 0 24 24"><path d="M3 9h18"/><path d="M3 15h18"/><path d="M4 9V5h16v4"/><rect x="5" y="10" width="4" height="5"/><rect x="15" y="10" width="4" height="5"/><path d="M11 10h2M11 15h2" stroke-dasharray="1 2"/><path d="M4 15v4h16v-4"/></svg>',
 'sazonalidade-e-calendario':'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><path d="M6 16c1.5-2 3-2 4.5 0s3 2 4.5 0 2-1.5 3 0"/></svg>',
 'lancamento-expansao':'<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><path d="M12 7v6M9 10h6"/></svg>',
 'performance-por-rede':'<svg viewBox="0 0 24 24"><path d="M3 10l1.5-5h15L21 10"/><path d="M3 10c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5"/><path d="M5 12.5V20h14v-7.5"/><path d="M10 20v-5h4v5"/></svg>',
 'mix-de-portfolio':'<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/><path d="M3 20h18"/></svg>',
 'canibalizacao':'<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/><path d="M12 7.5v9" stroke-dasharray="1.5 2"/></svg>',
 'elasticidade':'<svg viewBox="0 0 24 24"><path d="M4 19c3-9 8-12 16-12"/><path d="M4 19h16"/><path d="M4 19V5"/><circle cx="13" cy="10.5" r="1.3"/><path d="M16 6h4v4"/></svg>',
 'avaliacao-de-campanha':'<svg viewBox="0 0 24 24"><path d="M3 11v2a2 2 0 0 0 2 2h2l7 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M17 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a8 8 0 0 1 0 11"/></svg>',
 'cesta-e-ocasiao':'<svg viewBox="0 0 24 24"><path d="M3 10h18l-2 10H5z"/><path d="M8 10l3-6M16 10l-3-6"/><path d="M9 14v3M12 14v3M15 14v3"/></svg>',
 'fidelidade-e-churn':'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 1-.3 2-.7 2.9"/><path d="M21 15a4 4 0 0 1-6.5 3.5"/><path d="M14 18.5h1.5v-1.5M21 15l-1.5 1.5"/></svg>'}
COLOR = {'Diagnóstico':'#3397B9','Crescimento':'#018376','Preço e mídia':'#B48A1E','Comprador':'#7A5AA6'}
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
        chips = ''.join(f'<span class="chip"><i></i>{e(x.strip())}</span>' for x in iqs.split('·'))
        hy = ''.join(f'<li><span class="k">{i+1}</span><div>{e(h)}</div></li>' for i, h in enumerate(hyps))
        body += f'''<article class="pb" id="{slug}" style="--c:{COLOR[cat]}"><header><div class="ic pic">{PICON[slug]}</div><div class="hd"><h3>{e(title)}</h3><p class="q">{e(q)}</p><div class="chips">{chips}</div></div><div class="cnt"><div class="v">{len(hyps)}</div><div class="l">hipóteses</div></div></header>
<ol class="hyps">{hy}</ol>
<div class="flow"><div class="st"><span>resultado</span><p>{e(res)}</p></div><div class="arrow">→</div><div class="st act"><span>ação no bidIQ</span><p>{e(act)}</p></div></div>
<p class="file"><a class="btn" href="/hypr-agents/swarm/app/?playbook={slug}">Abrir caso com este playbook</a><span>playbooks/{slug}.md</span></p></article>'''
    cards.append(f'<section id="cat-{len(cards)}"><div class="cat" style="--c:{COLOR[cat]}"><div class="ic big">{ICON[cat]}</div><div><h2>{e(cat)}</h2><p>{e(sub)}</p></div><div class="num">{len(items)}</div></div>{body}</section>')

nav = ''.join(f'<a class="tile" href="#cat-{i}" style="--c:{COLOR[cat]}"><div class="ic">{ICON[cat]}</div><div class="tn">{e(cat)}</div><div class="ts">{e(sub)}</div><ul>' + ''.join(f'<li><span class="li-ic">{PICON[s]}</span>{e(parse(s)[0])}</li>' for s, _ in items) + '</ul></a>' for i, (cat, sub, items) in enumerate(CATS))

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
.cover nav{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:32px}}
.tile{{display:block;text-decoration:none;color:var(--off);background:rgba(252,254,254,.05);border:1px solid rgba(252,254,254,.14);border-radius:16px;padding:16px 16px 14px;border-top:3px solid var(--c)}}.tile:hover{{background:rgba(252,254,254,.09)}}
.tile .ic{{width:40px;height:40px;color:var(--c);border-radius:10px;background:rgba(252,254,254,.06);padding:8px}}.tile .ic svg{{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}}
.tile .tn{{font-size:18px;font-weight:600;margin-top:10px}}.tile .ts{{font-size:13px;color:rgba(252,254,254,.6)}}
.tile ul{{list-style:none;margin:12px 0 0;padding:0;font-size:13.5px;color:rgba(252,254,254,.85)}}.tile li{{padding:5px 0;border-top:1px solid rgba(252,254,254,.1);display:flex;align-items:center;gap:8px}}.li-ic{{width:16px;height:16px;color:var(--c);flex:none}}.li-ic svg{{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}}
.page{{max-width:1080px;margin:0 auto;padding:16px 24px 96px}}
section{{padding:36px 0;border-top:1px solid var(--mist)}}section:first-child{{border-top:0}}
.cat{{display:grid;grid-template-columns:44px 1fr auto;gap:16px;align-items:center;margin-bottom:12px}}.cat h2{{margin:0;font-size:28px;font-weight:300;letter-spacing:-.01em}}.cat p{{margin:2px 0 0;color:var(--steel)}}
.cat .num{{font-weight:300;font-size:40px;line-height:1;color:var(--c)}}
.ic{{width:26px;height:26px;color:var(--c);flex:none}}.ic.big{{width:44px;height:44px}}.ic svg{{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}}
.ic.pic{{width:44px;height:44px;border-radius:12px;background:color-mix(in srgb, var(--c) 12%, white);display:flex;align-items:center;justify-content:center;padding:9px}}
.pb{{background:var(--off);border:1px solid var(--mist);border-left:4px solid var(--c);border-radius:20px;padding:22px 24px;box-shadow:var(--shadow);margin-top:16px}}
.pb header{{display:grid;grid-template-columns:44px 1fr auto;gap:16px;align-items:start}}.pb h3{{margin:0;font-size:21px;font-weight:600}}.pb .q{{margin:4px 0 0;color:var(--slate);font-size:15.5px}}
.chips{{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}}.chip{{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;color:var(--slate);background:var(--cloud);border:1px solid var(--mist);border-radius:999px;padding:3px 10px}}.chip i{{width:7px;height:7px;border-radius:50%;background:var(--c);display:inline-block}}
.cnt{{text-align:right}}.cnt .v{{font-weight:300;font-size:34px;line-height:1;color:var(--c)}}.cnt .l{{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel)}}
.hyps{{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}}.hyps li{{display:grid;grid-template-columns:26px 1fr;gap:10px;font-size:14.5px;color:var(--slate);padding:8px 0;border-top:1px solid var(--mist)}}.hyps .k{{width:24px;height:24px;border-radius:50%;background:var(--cloud);border:1px solid var(--mist);color:var(--c);font-family:var(--mono);font-size:11px;display:flex;align-items:center;justify-content:center}}
.flow{{display:grid;grid-template-columns:1fr 28px 1fr;gap:12px;align-items:stretch;margin-top:18px}}.flow .st{{background:var(--cloud);border:1px solid var(--mist);border-radius:14px;padding:14px 16px}}.flow .st span{{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel)}}.flow .st p{{margin:6px 0 0;font-size:14.5px;color:var(--slate)}}.flow .act{{background:var(--midnight);border-color:var(--midnight)}}.flow .act span{{color:rgba(252,254,254,.55)}}.flow .act p{{color:var(--off)}}.flow .arrow{{align-self:center;text-align:center;color:var(--c);font-size:22px}}
.btn{{display:inline-block;background:var(--midnight);color:var(--off);text-decoration:none;font-weight:600;font-size:14px;padding:9px 16px;border-radius:999px;margin-right:12px}}
h4{{margin:16px 0 6px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel);font-weight:500}}
.file{{margin:18px 0 0;font-size:13px;color:var(--steel);display:flex;align-items:center;flex-wrap:wrap;gap:8px}}.file span{{font-family:var(--mono);font-size:11px}}
.foot{{margin-top:28px;color:var(--steel);font-size:13px;max-width:70ch}}
@media (max-width:900px){{.cover nav{{grid-template-columns:1fr 1fr}}}}
@media (max-width:640px){{.cover nav{{grid-template-columns:1fr}}.hyps{{grid-template-columns:1fr}}.flow{{grid-template-columns:1fr}}.flow .arrow{{transform:rotate(90deg)}}.pb header{{grid-template-columns:44px 1fr}}.cnt{{display:none}}}}
</style><script src="/hypr-agents/swarm/track.js" defer></script></head><body>
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
