# lab

Base de publicação do Claude no Cloudflare Pages. Projeto Pages único apontando para a raiz deste repo, sem build.

Convenção: cada trabalho é uma pasta na raiz com seu próprio `index.html` e assets, publicado em `https://lab.pages.dev/<pasta>/`. Nada de build step, frameworks ou dependências: HTML, CSS, JS e imagens estáticas. `_headers` marca tudo como noindex.

Para publicar: commit na `main`. O Pages faz o deploy sozinho.
