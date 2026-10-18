# HYPR Platform Case: build on the receipts

You are given 60 days of synthetic retail receipt data from 150 stores, delivered the way real data arrives: by two sources, with gaps, duplicates, free-text products and a partially wrong store master. Build an application on top of it. We will run your app, read your code, and compare your numbers with a hidden ground truth.

## Files

| File | What it is |
| --- | --- |
| `receipt_lines_part1.csv.gz`, `receipt_lines_part2.csv.gz` | 500k line items in two files with the same header (load both and concatenate; the split is arbitrary), two sources (`fonte` A and B), 2026-08-01 to 2026-09-29. Columns: `fonte, chave_nfce, numero_item, data_emissao, cnpj_emitente, endereco_loja, cidade, uf, descricao_produto, ean, quantidade, valor_unitario, desconto, valor_total, tipo_operacao, forma_pagamento` |
| `stores.csv` | Store master as it exists today. Known to contain errors |
| `products_reference.csv` | Product catalog, EAN to canonical description. Known to be incomplete |

No PII. All names, CNPJs and addresses are invented.

## What to build

An application (web app, API plus UI, or notebook-driven dashboard, your choice) that a HYPR client could use to answer:

1. **Daily net demand per product per store**: quantity and revenue, after returns, in Brazilian business dates.
2. **Share by chain and by city**, over any date range.
3. **Anomalies**: days or stores where the numbers should not be trusted or should be looked at, with the reason.
4. **Data quality**: what is wrong with the input and how much of the output it affects.

Plus one file we score automatically: `demand_daily.csv`, one row per date × store × product, columns exactly:

```
date,cnpj,endereco,ean,qty_net,revenue_net
```

- `date` in `YYYY-MM-DD`, Brazil time (America/Sao_Paulo)
- `cnpj` and `endereco` exactly as they appear in the receipt files
- `ean` is the canonical EAN from `products_reference.csv`. Leave it blank when you could not map the product to the reference. Do not invent EANs and do not force a product into the nearest match.
- `qty_net` and `revenue_net` are net of returns.

## Rules

- 5 calendar days. Expect 12 to 20 hours of work; scope down and say so rather than pad.
- Any language, any framework, any tool including AI assistants. We will ask you to walk through every design decision and every line that matters, live, for 90 minutes. You own all of it.
- Deliver a repository (or zip) with a README that lets us run it in under 15 minutes on a laptop, plus `demand_daily.csv` and a one-page `FINDINGS.md`: what you found in the data, what you did about it, what you could not fix and how much it matters.
- Do not include material from current or former employers.

## What we look at

- Whether your numbers match the hidden truth (we publish the metrics, not the truth).
- Whether you found what is wrong with the data, and whether the app tells its user about it.
- Whether the thing you built would survive a second data drop with new problems.
- Whether you can defend it.
