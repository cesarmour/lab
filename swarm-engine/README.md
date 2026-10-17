# Swarm, by HYPR · motor

Múltiplos agentes sobre o BigQuery. Um orquestrador cria investigadores sob demanda (quantos o caso pedir), cada um roda SQL real dentro de um orçamento e só nas tabelas que recebeu, devolve a conclusão; o orquestrador cruza, abre novas rodadas de teste, e um auditor que nunca viu o raciocínio refaz os pilares por outro caminho. Saída: hipóteses ranqueadas com % de confiança, ação, e o log completo do caso.

## Rodar

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/service-account.json   # leitura no BigQuery + dry run
export BQ_PROJECT=hypr-prod

python swarm.py "Por que as vendas de protetor solar caíram 18% em junho?" \
  --brand "marca" --period 2026-05-01:2026-06-30 --playbook queda-de-venda
```

Saída em `cases/<id>/`: `events.jsonl` (cada hipótese, consulta, resultado, beco sem saída, achado, com bytes e tempo), `case.json` (resultado, auditoria, métricas) e `case.md`.

## Como funciona

- `swarm.py`: orquestrador (`spawn_investigators` → `finish`), investigador (`get_schema`, `bq_query`, `discard`, `conclude`), auditor (`bq_query`, `verdict`). Investigadores rodam em paralelo (threads). Se o auditor devolve, o orquestrador recebe as ressalvas e pode criar novos investigadores.
- `run_query`: dry run antes de rodar, bloqueia tabela fora do escopo do agente, bloqueia consulta acima do orçamento em bytes, registra linhas, bytes e tempo.
- `config.yaml`: projeto, tabelas que o orquestrador pode distribuir, orçamentos por papel, contexto dos dados.
- `prompts/*.md`: um por papel. `playbooks/*.md`: hipóteses de partida por tipo de caso (versionados no git; cada caso grava qual rodou).

## Permissões mínimas no GCP

Service account com `roles/bigquery.jobUser` no projeto e `roles/bigquery.dataViewer` nos datasets listados em `config.yaml`. Nada de escrita.
