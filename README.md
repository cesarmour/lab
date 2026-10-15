# lab

Base de publicação do Claude no Cloudflare Pages. Worker único (`lab`) servindo a raiz deste repo como assets estáticos via `wrangler.jsonc`, sem build.

Convenção: cada trabalho é uma pasta na raiz com seu próprio `index.html` e assets, publicado em `https://lab.cesarmour.workers.dev/<pasta>/`. Nada de build step, frameworks ou dependências: HTML, CSS, JS e imagens estáticas. `_headers` marca tudo como noindex.

Para publicar: commit na `main`. O Cloudflare roda `npx wrangler deploy` sozinho.
