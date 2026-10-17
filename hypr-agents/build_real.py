#!/usr/bin/env python3
"""Gera a página de um caso REAL do Swarm (rodado no BigQuery) a partir de case.json.
Uso: python3 build_real.py <pasta com case.json> <pasta de saída>"""
import json, sys, html, pathlib

src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
C = json.loads((src / "case.json").read_text())
e = html.escape
def n(x): return f"{x:,.0f}".replace(",", ".")
def gb(b): return f"{b/1e9:.1f} GB" if b >= 1e9 else f"{b/1e6:.0f} MB"
def pct(c): return f"{round(100*c)}%"

inv = C["investigators"]; orq = C["orchestrator"]; aud = C["audit"]; m = C["metrics"]

def agent_card(a, idx):
    qs = "".join(
        f'<details><summary><span class="qn">consulta {q["n"]}</span> {e(q["why"])} <span class="meta">{q.get("rows","")} linhas · {gb(q.get("bytes",0))} · {q.get("seconds",0)} s</span></summary>'
        f'<pre>{e(q["sql"])}</pre><p class="rs">{e(q.get("result_summary",""))}</p></details>'
        for q in a["queries"] if q.get("bytes"))
    dis = "".join(f'<li><b>{e(d["what"])}</b> {e(d["evidence"])}</li>' for d in a.get("discarded", []))
    nums = "".join(f'<li><span>{e(x["label"])}</span><b>{e(x["value"])}</b></li>' for x in a.get("numbers", [])[:6])
    return f'''<article class="agent"><header><div><div class="nm">Investigador {idx} <span class="role">{e(a["role"])}</span></div><p class="hyp">Hipótese: {e(a["hypothesis"])}</p></div><div class="conf"><div class="v">{pct(a["confidence"])}</div><div class="l">confiança</div></div></header>
<p class="find">{e(a["finding"])}</p>
<ul class="nums">{nums}</ul>
{"<h4>Descartado com dado</h4><ul class='dis'>"+dis+"</ul>" if dis else ""}
<h4>Consultas rodadas no BigQuery</h4>{qs}
<p class="cav"><b>Ressalvas do investigador:</b> {e(a.get("caveats",""))}</p></article>'''

hyps = "".join(
    f'<div class="hyp-row"><div class="rank">{h["rank"]}</div><div><p class="st">{e(h["statement"])}</p><p class="ev">{e(h["evidence"])}</p>{("<p class='an'>Auditor: "+e(h["audit_note"])+"</p>") if h.get("audit_note") else ""}</div><div class="conf"><div class="v">{pct(h["confidence"])}</div><div class="l">confiança</div><div class="w">{e(h.get("weight",""))}</div></div></div>'
    for h in orq["hypotheses"])
checks = "".join(f'<li class="{"ok" if c["reproduced"] else "no"}">{e(c["claim"])} <span>{e(c["found"])}</span></li>' for c in aud["checks"])
aud_qs = "".join(
    f'<details><summary><span class="qn">consulta {q["n"]}</span> {e(q["why"])} <span class="meta">{q.get("rows","")} linhas · {gb(q.get("bytes",0))} · {q.get("seconds",0)} s</span></summary><pre>{e(q["sql"])}</pre><p class="rs">{e(q.get("result_summary",""))}</p></details>'
    for q in aud.get("queries", []) if q.get("bytes"))
orq_log = "".join(f'<li><span class="t">{e(str(x["t"]))}</span>{e(x["text"])}</li>' for x in orq["log"])
agents_html = "".join(agent_card(a, i + 1) for i, a in enumerate(inv))

page = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1C262F">
<title>{e(C["title_plain"])} · Swarm, by HYPR</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--midnight:#1C262F;--cloud:#FAFAFA;--off:#FCFEFE;--mist:#E5EBF2;--steel:#78909C;--slate:#536872;--cyan:#3397B9;--deep:#246C84;--soft:#C5EAF6;--good:#018376;--good-bg:#E6F3EA;--bad:#B41048;--bad-bg:#FBE4EA;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--shadow:0 8px 28px rgba(28,38,47,.06),0 1px 2px rgba(28,38,47,.04)}}
*{{box-sizing:border-box}}html,body{{margin:0;background:var(--cloud);color:var(--midnight);font-family:Urbanist,system-ui,sans-serif;font-size:17px;line-height:1.5;-webkit-font-smoothing:antialiased}}
.mono{{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel)}}
.cover{{background:var(--midnight);color:var(--off);padding:0 24px}}.cover .in{{max-width:1120px;margin:0 auto;padding:40px 0 48px}}
.cover .top{{display:flex;justify-content:space-between;align-items:center;margin-bottom:44px}}.cover nav{{display:flex;gap:8px;flex-wrap:wrap}}
.cover nav a{{border:1px solid rgba(252,254,254,.3);border-radius:999px;padding:6px 14px;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(252,254,254,.7);text-decoration:none}}.cover nav a.on{{background:var(--off);color:var(--midnight);border-color:var(--off)}}
.cover .wm{{height:17px;width:auto;display:block}}
.cover h1{{font-weight:300;font-size:clamp(32px,4.6vw,56px);line-height:1.08;letter-spacing:-.015em;margin:0;max-width:22ch}}.cover h1 em{{font-style:normal;color:var(--cyan)}}
.cover .lede{{color:rgba(252,254,254,.72);font-size:18px;max-width:62ch;margin:18px 0 0;font-weight:300}}.cover .lede b{{color:var(--off);font-weight:600}}
.kpis{{display:flex;gap:40px;flex-wrap:wrap;margin-top:36px}}.kpi .v{{font-weight:300;font-size:36px;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}}.kpi .l{{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(252,254,254,.55);margin-top:6px}}
.page{{max-width:1120px;margin:0 auto;padding:40px 24px 96px}}
section{{padding:36px 0;border-top:1px solid var(--mist)}}section:first-child{{border-top:0;padding-top:0}}
h2{{margin:0 0 18px;font-size:28px;font-weight:300;letter-spacing:-.01em}}h2 em{{font-style:normal;color:var(--cyan)}}
.card{{background:var(--off);border:1px solid var(--mist);border-radius:20px;padding:22px 24px;box-shadow:var(--shadow)}}
.hyp-row{{display:grid;grid-template-columns:44px 1fr 120px;gap:18px;padding:18px 0;border-top:1px solid var(--mist)}}.hyp-row:first-child{{border-top:0;padding-top:0}}
.rank{{font-weight:300;font-size:34px;line-height:1;color:var(--cyan)}}.st{{margin:0;font-size:18px;font-weight:600}}.ev{{margin:6px 0 0;color:var(--slate);font-size:15.5px}}.an{{margin:6px 0 0;color:var(--deep);font-size:14.5px}}
.conf{{text-align:right}}.conf .v{{font-weight:300;font-size:30px;line-height:1;color:var(--good);font-variant-numeric:tabular-nums}}.conf .l{{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel);margin-top:4px}}.conf .w{{font-size:13px;color:var(--slate);margin-top:6px}}
.action{{background:var(--midnight);color:var(--off);border-radius:20px;padding:24px 28px;margin-top:18px}}.action .mono{{color:rgba(252,254,254,.55)}}.action p{{margin:8px 0 0;font-size:19px;font-weight:300;max-width:60ch}}
.audit ul{{list-style:none;padding:0;margin:0}}.audit li{{padding:10px 0 10px 28px;border-top:1px solid var(--mist);position:relative;color:var(--slate)}}.audit li:first-child{{border-top:0}}.audit li::before{{position:absolute;left:0;top:10px;font-family:var(--mono)}}.audit li.ok::before{{content:"✓";color:var(--good)}}.audit li.no::before{{content:"✕";color:var(--bad)}}.audit li span{{display:block;color:var(--midnight);font-size:15px}}
.verdict{{display:inline-block;padding:3px 12px;border-radius:999px;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px}}.verdict.ok{{background:var(--good-bg);color:var(--good)}}.verdict.no{{background:var(--bad-bg);color:var(--bad)}}
.agent{{margin-top:16px}}.agent header{{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}}.agent .nm{{font-size:18px;font-weight:600}}.agent .role{{font-weight:400;color:var(--steel);font-size:15px;margin-left:8px}}.agent .hyp{{margin:4px 0 0;color:var(--steel);font-size:14.5px;font-style:italic}}
.find{{margin:14px 0 0;color:var(--slate);font-size:15.5px}}
.nums{{list-style:none;padding:0;margin:14px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}}.nums li{{display:flex;flex-direction:column;border-top:1px solid var(--mist);padding:8px 0;font-size:14px}}.nums li span{{color:var(--steel);font-family:var(--mono);font-size:10.5px;letter-spacing:.04em}}.nums li b{{font-weight:600;color:var(--midnight)}}
h4{{margin:18px 0 6px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--steel);font-weight:500}}
.dis{{margin:0;padding-left:18px;color:var(--slate);font-size:14.5px}}.dis b{{color:var(--bad);font-weight:600}}
details{{border-top:1px solid var(--mist);padding:8px 0}}summary{{cursor:pointer;font-size:14.5px;color:var(--slate)}}summary .qn{{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan);margin-right:8px}}summary .meta{{font-family:var(--mono);font-size:10.5px;color:var(--steel);margin-left:8px}}
pre{{margin:10px 0;padding:12px 14px;background:var(--cloud);border:1px solid var(--mist);border-radius:8px;font-family:var(--mono);font-size:11px;line-height:1.5;color:var(--slate);white-space:pre-wrap;word-break:break-word}}.rs{{margin:0 0 6px;font-size:14px;color:var(--midnight)}}
.cav{{margin:16px 0 0;font-size:13.5px;color:var(--steel)}}.cav b{{color:var(--slate);font-weight:600}}
.log{{list-style:none;padding:0;margin:0}}.log li{{display:grid;grid-template-columns:56px 1fr;gap:12px;padding:8px 0;border-top:1px solid var(--mist);font-size:15px;color:var(--slate)}}.log li:first-child{{border-top:0}}.log .t{{font-family:var(--mono);font-size:11px;color:var(--steel)}}
.foot{{margin-top:28px;color:var(--steel);font-size:13px;max-width:76ch}}
@media (max-width:820px){{.hyp-row{{grid-template-columns:36px 1fr}}.conf{{text-align:left;grid-column:2}}.nums{{grid-template-columns:1fr}}.agent header{{flex-direction:column}}}}
</style></head><body>
<section class="cover"><div class="in">
<div class="top"><nav><a href="/hypr-agents/">queda de venda</a><a href="/hypr-agents/cases/canibalizacao/">canibalização</a><a href="/hypr-agents/cases/ruptura/">ruptura</a><a href="/hypr-agents/cases/elasticidade/">elasticidade</a><a class="on" href="/hypr-agents/cases/monster/">caso real</a></nav><img class="wm" src="/hypr-agents/hypr-wordmark-white.svg" alt="HYPR"></div>
<h1>{C["title_html"]}</h1>
<p class="lede">{C["lede"]}</p>
<div class="kpis"><div class="kpi"><div class="v">{m["agents"]}</div><div class="l">agentes</div></div><div class="kpi"><div class="v">{m["queries"]}</div><div class="l">consultas reais</div></div><div class="kpi"><div class="v">{gb(m["bytes"])}</div><div class="l">lidos no BigQuery</div></div><div class="kpi"><div class="v">{m["minutes"]} min</div><div class="l">tempo total</div></div><div class="kpi"><div class="v">{n(m["tokens"]/1000)} mil</div><div class="l">tokens</div></div></div>
</div></section>
<div class="page">
<section><h2>Hipóteses <em>ranqueadas</em></h2><div class="card">{hyps}</div>
<div class="action"><div class="mono">ação</div><p>{e(orq["action"])}</p></div></section>
<section class="audit"><h2>Auditoria independente</h2><div class="card"><span class="verdict {"ok" if aud["approved"] else "no"}">{"aprovado" if aud["approved"] else "devolvido"}</span><ul>{checks}</ul>{("<p class='cav'><b>Ressalva:</b> "+e(aud["caveats"])+"</p>") if aud.get("caveats") else ""}<h4>Consultas do auditor</h4>{aud_qs}</div></section>
<section><h2>Orquestrador</h2><div class="card"><ul class="log">{orq_log}</ul></div></section>
<section><h2>Investigadores</h2>{agents_html}</section>
<p class="foot">{e(C["foot"])}</p>
</div></body></html>'''
(out / "index.html").write_text(page)
print("ok", out / "index.html")
