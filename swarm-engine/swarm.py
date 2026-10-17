#!/usr/bin/env python3
"""Swarm, by HYPR: motor de múltiplos agentes sobre o BigQuery.

Um orquestrador recebe uma pergunta, decide quais investigadores criar
(quantos o caso pedir), cada investigador roda consultas reais no BigQuery
dentro de um orçamento, devolve só a conclusão; o orquestrador cruza,
pede testes extras, e um auditor independente refaz a conta sem ver o
raciocínio. Saída: hipóteses ranqueadas com % de confiança.

Uso:
  python swarm.py "Por que as vendas de protetor solar caíram 18% em junho?" \
      --brand "marca" --period 2026-05-01:2026-06-30 [--playbook queda-de-venda]

Variáveis: ANTHROPIC_API_KEY, GOOGLE_APPLICATION_CREDENTIALS, BQ_PROJECT.
"""
import argparse, json, os, re, sys, time, threading, uuid, datetime as dt
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import yaml
from anthropic import Anthropic
from google.cloud import bigquery

ROOT = Path(__file__).parent
CFG = yaml.safe_load((ROOT / "config.yaml").read_text())
MODEL = CFG.get("model", "claude-sonnet-5-5")
def _clients():
    missing = [v for v in ("ANTHROPIC_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS") if not os.environ.get(v)]
    if missing:
        sys.exit(f"faltam variáveis de ambiente: {', '.join(missing)} (veja README.md)")
    return Anthropic(), bigquery.Client(project=os.environ.get("BQ_PROJECT", CFG.get("project")))
client, bq = (None, None) if "--help" in sys.argv or "-h" in sys.argv else _clients()

# ---------------------------------------------------------------- caso / log
class Case:
    def __init__(self, question, brand, period, playbook):
        self.id = dt.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
        self.dir = ROOT / "cases" / self.id
        self.dir.mkdir(parents=True)
        self.question, self.brand, self.period, self.playbook = question, brand, period, playbook
        self.t0 = time.time()
        self.lock = threading.Lock()
        self.events = []
        self.tokens = {"input": 0, "output": 0}
        self.queries = 0
        self.bytes = 0
        self.agents = {}  # id -> {role, hypothesis, status, conclusion}

    def log(self, agent, kind, text, **extra):
        ev = {"t": round(time.time() - self.t0, 1), "agent": agent, "kind": kind, "text": text, **extra}
        with self.lock:
            self.events.append(ev)
            with open(self.dir / "events.jsonl", "a") as f:
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
        stamp = f"{ev['t']:6.1f} min" if False else f"{ev['t']:6.1f}s"
        print(f"{stamp}  {agent:<16} {kind:<6} {text[:160]}", flush=True)

    def account(self, usage):
        with self.lock:
            self.tokens["input"] += usage.input_tokens
            self.tokens["output"] += usage.output_tokens

# ---------------------------------------------------------------- bigquery governado
def _tables_in(sql):
    return set(t.strip("`") for t in re.findall(r"`([\w\-\.]+)`", sql))

def run_query(case, agent, sql, allowed, max_bytes, max_rows=200):
    """Dry-run, checa tabelas permitidas e orçamento, roda, devolve linhas."""
    used = _tables_in(sql)
    bad = [t for t in used if not any(t == a or t.startswith(a.rstrip("*")) for a in allowed)]
    if bad:
        case.log(agent, "deny", f"tabela fora do escopo deste agente: {bad}")
        return {"error": f"tabelas não permitidas para este agente: {bad}. Permitidas: {allowed}"}
    job_cfg = bigquery.QueryJobConfig(dry_run=True, use_query_cache=True)
    try:
        est = bq.query(sql, job_config=job_cfg).total_bytes_processed
    except Exception as e:
        case.log(agent, "error", f"SQL inválida: {str(e)[:200]}")
        return {"error": str(e)[:600]}
    if est > max_bytes:
        case.log(agent, "deny", f"consulta leria {est/1e9:.2f} GB, acima do limite de {max_bytes/1e9:.2f} GB")
        return {"error": f"consulta leria {est/1e9:.2f} GB; limite deste agente é {max_bytes/1e9:.2f} GB. Reduza o período ou as colunas."}
    case.log(agent, "sql", sql.strip().replace("\n", " ")[:400], bytes_est=est)
    t = time.time()
    job = bq.query(sql, job_config=bigquery.QueryJobConfig(maximum_bytes_billed=max_bytes))
    rows = [dict(r) for r in job.result(max_results=max_rows)]
    took = time.time() - t
    with case.lock:
        case.queries += 1
        case.bytes += job.total_bytes_processed or 0
    case.log(agent, "res", f"{job.total_rows} linhas · {(job.total_bytes_processed or 0)/1e6:,.0f} MB · {took:.1f}s",
             rows=job.total_rows, bytes=job.total_bytes_processed, secs=round(took, 2))
    def conv(v):
        if isinstance(v, (dt.date, dt.datetime)): return v.isoformat()
        if hasattr(v, "__float__") and not isinstance(v, (int, float)): return float(v)
        return v
    return {"rows": [{k: conv(v) for k, v in r.items()} for r in rows], "total_rows": job.total_rows,
            "bytes_processed": job.total_bytes_processed, "seconds": round(took, 2)}

def schema_of(table):
    try:
        t = bq.get_table(table)
        return {"table": table, "rows": t.num_rows, "fields": [{"name": f.name, "type": f.field_type, "desc": f.description or ""} for f in t.schema]}
    except Exception as e:
        return {"error": str(e)[:300]}

# ---------------------------------------------------------------- loop genérico de agente
def agent_loop(case, agent_id, system, user, tools, handlers, max_turns=24):
    """Roda um agente com tool use até ele chamar a ferramenta final (handlers devolvem ('final', x))."""
    msgs = [{"role": "user", "content": user}]
    for _ in range(max_turns):
        resp = client.messages.create(model=MODEL, max_tokens=4000, system=system, tools=tools, messages=msgs)
        case.account(resp.usage)
        msgs.append({"role": "assistant", "content": resp.content})
        results, final = [], None
        for block in resp.content:
            if block.type == "text" and block.text.strip():
                case.log(agent_id, "note", block.text.strip())
            if block.type == "tool_use":
                out = handlers[block.name](block.input)
                if isinstance(out, tuple) and out[0] == "final":
                    final = out[1]; out = {"ok": True}
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(out, ensure_ascii=False)[:60000]})
        if final is not None:
            return final
        if resp.stop_reason == "end_turn" and not results:
            msgs.append({"role": "user", "content": "Continue. Quando terminar, chame a ferramenta final."})
            continue
        msgs.append({"role": "user", "content": results})
    return {"error": "limite de turnos"}

# ---------------------------------------------------------------- investigador
INV_TOOLS = [
    {"name": "get_schema", "description": "Esquema e tamanho de uma tabela permitida.", "input_schema": {"type": "object", "properties": {"table": {"type": "string"}}, "required": ["table"]}},
    {"name": "bq_query", "description": "Roda SQL (BigQuery Standard SQL) nas tabelas permitidas, dentro do orçamento. Use nomes completos entre crases.", "input_schema": {"type": "object", "properties": {"sql": {"type": "string"}, "why": {"type": "string", "description": "o que esta consulta testa"}}, "required": ["sql", "why"]}},
    {"name": "discard", "description": "Registra um beco sem saída: hipótese ou corte descartado com dado.", "input_schema": {"type": "object", "properties": {"what": {"type": "string"}, "evidence": {"type": "string"}}, "required": ["what", "evidence"]}},
    {"name": "conclude", "description": "Encerra com a conclusão. Só números que vieram de consultas rodadas aqui.", "input_schema": {"type": "object", "properties": {
        "finding": {"type": "string"}, "numbers": {"type": "array", "items": {"type": "object", "properties": {"label": {"type": "string"}, "value": {"type": "string"}, "from_query": {"type": "string"}}}},
        "confidence": {"type": "number", "description": "0 a 1"}, "caveats": {"type": "string"}}, "required": ["finding", "numbers", "confidence"]}},
]

def run_investigator(case, spec):
    aid = spec["id"]
    allowed = spec["tables"]
    budget = int(spec.get("max_gb", CFG["budgets"]["investigator_gb"]) * 1e9)
    case.agents[aid] = {"role": spec["role"], "hypothesis": spec["hypothesis"], "status": "ativo"}
    case.log(aid, "hyp", f"Hipótese: {spec['hypothesis']}")
    system = (ROOT / "prompts" / "investigator.md").read_text().format(
        role=spec["role"], hypothesis=spec["hypothesis"], tables="\n".join(allowed),
        brand=case.brand, period=case.period, question=case.question, budget_gb=budget / 1e9,
        context=CFG.get("data_context", ""))
    handlers = {
        "get_schema": lambda i: schema_of(i["table"]) if any(i["table"].startswith(a.rstrip("*")) for a in allowed) else {"error": "tabela fora do escopo"},
        "bq_query": lambda i: run_query(case, aid, i["sql"], allowed, budget),
        "discard": lambda i: (case.log(aid, "dead", f"{i['what']}: {i['evidence']}") or {"ok": True}),
        "conclude": lambda i: ("final", i),
    }
    out = agent_loop(case, aid, system, "Investigue a sua hipótese. Comece pelo esquema das tabelas.", INV_TOOLS, handlers)
    case.log(aid, "find", out.get("finding", str(out)), confidence=out.get("confidence"))
    case.agents[aid].update(status="ok", conclusion=out)
    return out

# ---------------------------------------------------------------- orquestrador
ORQ_TOOLS = [
    {"name": "spawn_investigators", "description": "Cria N investigadores em paralelo, um por hipótese. Cada um só enxerga as tabelas que você listar.", "input_schema": {"type": "object", "properties": {"investigators": {"type": "array", "items": {"type": "object", "properties": {
        "role": {"type": "string", "description": "nome curto do papel, ex. 'preço e promoção'"},
        "hypothesis": {"type": "string"},
        "tables": {"type": "array", "items": {"type": "string"}, "description": "nomes completos project.dataset.table (prefixo com * permitido)"},
        "max_gb": {"type": "number"}}, "required": ["role", "hypothesis", "tables"]}}}, "required": ["investigators"]}},
    {"name": "finish", "description": "Encerra com as hipóteses ranqueadas. Só use números que vieram das conclusões dos investigadores.", "input_schema": {"type": "object", "properties": {
        "hypotheses": {"type": "array", "items": {"type": "object", "properties": {"rank": {"type": "integer"}, "statement": {"type": "string"}, "weight": {"type": "string"}, "confidence": {"type": "number"}, "evidence": {"type": "string"}}}},
        "discarded": {"type": "array", "items": {"type": "string"}}, "action": {"type": "string"}, "summary": {"type": "string"}}, "required": ["hypotheses", "action", "summary"]}},
]

def run_orchestrator(case, feedback=None):
    aid = "orquestrador"
    pb = ""
    if case.playbook:
        p = ROOT / "playbooks" / f"{case.playbook}.md"
        pb = p.read_text() if p.exists() else ""
    system = (ROOT / "prompts" / "orchestrator.md").read_text().format(
        tables="\n".join(CFG["tables"]), context=CFG.get("data_context", ""), playbook=pb or "(sem playbook; monte as hipóteses do zero)",
        max_investigators=CFG["budgets"]["max_investigators"])
    user = f"Pergunta: {case.question}\nMarca: {case.brand}\nPeríodo: {case.period}"
    if feedback:
        user += f"\n\nO AUDITOR DEVOLVEU O CASO. Ressalvas:\n{feedback}\nTrate as ressalvas (pode criar investigadores novos) e chame finish de novo."
    counter = {"n": len([a for a in case.agents if a.startswith("inv")])}

    def spawn(i):
        specs = i["investigators"][: CFG["budgets"]["max_investigators"]]
        for s in specs:
            counter["n"] += 1; s["id"] = f"inv{counter['n']}"
        case.log(aid, "note", f"Criando {len(specs)} investigadores: " + "; ".join(s["role"] for s in specs))
        with ThreadPoolExecutor(max_workers=len(specs)) as ex:
            outs = list(ex.map(lambda s: run_investigator(case, s), specs))
        return {"conclusions": [{"id": s["id"], "role": s["role"], "hypothesis": s["hypothesis"], **o} for s, o in zip(specs, outs)]}

    handlers = {"spawn_investigators": spawn, "finish": lambda i: ("final", i)}
    out = agent_loop(case, aid, system, user, ORQ_TOOLS, handlers)
    case.log(aid, "find", out.get("summary", str(out)))
    return out

# ---------------------------------------------------------------- auditor
AUD_TOOLS = [INV_TOOLS[0], INV_TOOLS[1],
    {"name": "verdict", "description": "Veredito final da auditoria.", "input_schema": {"type": "object", "properties": {
        "approved": {"type": "boolean"}, "checks": {"type": "array", "items": {"type": "object", "properties": {"claim": {"type": "string"}, "reproduced": {"type": "boolean"}, "found": {"type": "string"}}}},
        "caveats": {"type": "string"}, "confidence_adjustments": {"type": "array", "items": {"type": "object", "properties": {"rank": {"type": "integer"}, "confidence": {"type": "number"}, "reason": {"type": "string"}}}}}, "required": ["approved", "checks"]}}]

def run_auditor(case, result):
    aid = "auditor"
    budget = int(CFG["budgets"]["auditor_gb"] * 1e9)
    system = (ROOT / "prompts" / "auditor.md").read_text().format(tables="\n".join(CFG["tables"]), context=CFG.get("data_context", ""))
    # o auditor recebe só hipóteses e números, nunca o log dos investigadores
    user = "Pergunta: %s\nMarca: %s\nPeríodo: %s\n\nRESULTADO A AUDITAR:\n%s" % (case.question, case.brand, case.period, json.dumps(result, ensure_ascii=False, indent=1))
    case.log(aid, "hyp", "Recebeu só as hipóteses e os números. Vai refazer os pilares por conta própria")
    handlers = {"get_schema": lambda i: schema_of(i["table"]),
                "bq_query": lambda i: run_query(case, aid, i["sql"], CFG["tables"], budget),
                "verdict": lambda i: ("final", i)}
    out = agent_loop(case, aid, system, user, AUD_TOOLS, handlers)
    case.log(aid, "find", ("Aprovado" if out.get("approved") else "Devolvido") + (f". Ressalvas: {out.get('caveats')}" if out.get("caveats") else ""))
    return out

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question"); ap.add_argument("--brand", required=True); ap.add_argument("--period", required=True, help="AAAA-MM-DD:AAAA-MM-DD")
    ap.add_argument("--playbook", default=None); ap.add_argument("--max-audit-rounds", type=int, default=1)
    a = ap.parse_args()
    case = Case(a.question, a.brand, a.period, a.playbook)
    print(f"caso {case.id} · {case.dir}")
    result = run_orchestrator(case)
    feedback = None
    for r in range(a.max_audit_rounds + 1):
        audit = run_auditor(case, result)
        if audit.get("approved") or r == a.max_audit_rounds:
            break
        feedback = audit.get("caveats") or json.dumps(audit.get("checks"), ensure_ascii=False)
        result = run_orchestrator(case, feedback=feedback)
    for adj in audit.get("confidence_adjustments") or []:
        for h in result["hypotheses"]:
            if h.get("rank") == adj.get("rank"): h["confidence"] = adj["confidence"]; h["audit_note"] = adj.get("reason")
    final = {"case": case.id, "question": case.question, "brand": case.brand, "period": case.period, "playbook": case.playbook,
             "result": result, "audit": audit, "agents": case.agents,
             "metrics": {"seconds": round(time.time() - case.t0, 1), "queries": case.queries, "bytes": case.bytes, "tokens": case.tokens}}
    (case.dir / "case.json").write_text(json.dumps(final, ensure_ascii=False, indent=1))
    from report import render
    (case.dir / "case.md").write_text(render(final, case.events))
    print(f"\n{(case.dir / 'case.md').read_text()}")
    print(f"\n→ {case.dir}")

if __name__ == "__main__":
    main()
