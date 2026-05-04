# DeckBuilder GiuBravo

Aplicação web para montar decks de Yu-Gi-Oh! com dados da API [YGOPRODeck](https://ygoprodeck.com/api-guide/). Repositório com `index.html`, `src/style.css`, `src/main.js` e build Vite; o ficheiro `Deckbuilder_cursor.html` é o monólito gerado (`npm run build:monolith`).

## Ordem sugerida de leitura da documentação

1. **[docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md)** — visão geral, estrutura de pastas, fluxo no browser, segurança, testes e scripts.
2. **[docs/MAIN_JS.md](docs/MAIN_JS.md)** — mapa operacional do `src/main.js` (subsistemas, arranque, globais expostos ao HTML).
3. **[docs/INDEX_HTML.md](docs/INDEX_HTML.md)** — markup, CSP, regiões da UI, catálogo regenerável de `id`.
4. **[docs/STYLE_CSS.md](docs/STYLE_CSS.md)** — temas, breakpoints, classes que o JavaScript altera.
5. **[docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md)** — comentários, JSDoc, nomeação e convenções.

## Comandos rápidos

| Comando | Descrição |
|--------|------------|
| `npm install` | Instala dependências de desenvolvimento (Vite, Prettier). |
| `npm run dev` | Servidor de desenvolvimento Vite. |
| `npm run build` | Build de produção para `dist/`. |
| `npm run test` | Verificação sintática do `main.js`, specs Node e builds silenciosos (ver `docs/DOCUMENTACAO.md`). |
| `npm run format` | Prettier em HTML, JS, CSS e `vite.config.js`. |
| `npm run doc:refresh-index-ids` | Atualiza o catálogo de `id` no comentário inicial de `index.html`. |
