"""Renderiza case.json + eventos em Markdown (Swarm, by HYPR)."""
def render(final, events):
    r = final["result"]; m = final["metrics"]; au = final["audit"]
    L = [f"# {final['question']}", "", f"Marca: {final['brand']} · Período: {final['period']} · Caso: {final['case']}", "",
         f"**{m['seconds']}s · {m['queries']} consultas · {m['bytes']/1e9:.2f} GB lidos · {m['tokens']['input']+m['tokens']['output']:,} tokens · {len([a for a in final['agents']])} investigadores**", "",
         "## Hipóteses", ""]
    for h in sorted(r.get("hypotheses", []), key=lambda x: x.get("rank", 99)):
        conf = f"{round(100*h.get('confidence',0))}%"
        L.append(f"{h.get('rank','')}. **{h.get('statement','')}** · peso {h.get('weight','')} · confiança {conf}")
        if h.get("evidence"): L.append(f"   - {h['evidence']}")
        if h.get("audit_note"): L.append(f"   - auditor: {h['audit_note']}")
    if r.get("discarded"):
        L += ["", "## Descartado com dado", ""] + [f"- {d}" for d in r["discarded"]]
    L += ["", "## Ação", "", r.get("action", ""), "", "## Auditoria", "",
          ("Aprovado" if au.get("approved") else "Devolvido") + (f". {au.get('caveats')}" if au.get("caveats") else "")]
    for c in au.get("checks", []):
        L.append(f"- {'✓' if c.get('reproduced') else '✕'} {c.get('claim','')}: {c.get('found','')}")
    L += ["", "## Investigadores", ""]
    for aid, a in final["agents"].items():
        c = a.get("conclusion", {})
        L.append(f"- **{aid} · {a['role']}** · {a['hypothesis']}\n  - {c.get('finding','')} (confiança {round(100*c.get('confidence',0))}%)")
    L += ["", "## Linha do tempo", ""]
    for e in events:
        if e["kind"] in ("hyp", "dead", "find", "deny", "error") or (e["kind"] == "note" and e["agent"] == "orquestrador"):
            L.append(f"- {e['t']}s · {e['agent']} · {e['kind']} · {e['text']}")
    return "\n".join(L)
