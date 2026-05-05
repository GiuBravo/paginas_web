# Documentação do projeto DeckBuilder (GiuBravo)

Este documento descreve a arquitetura, os artefatos e os fluxos principais do repositório. O código-fonte deve ser comentado em **português do Brasil**, conforme `docs/CODING_STANDARDS.md`.

**Ordem sugerida de leitura** (igual ao `README.md` na raiz): `DOCUMENTACAO.md` → `MAIN_JS.md` → `INDEX_HTML.md` → `STYLE_CSS.md` → `CODING_STANDARDS.md`.

## Visão geral

O DeckBuilder é uma aplicação web para montar decks de Yu-Gi-Oh!, usando dados públicos da API **YGOPRODeck** (`db.ygoprodeck.com`, imagens em `images.ygoprodeck.com`). O projeto foi separado do HTML monolítico original (`yugioh_deckbuilder.html` como backup conceitual): a fonte de verdade para desenvolvimento é `index.html`, `src/style.css` e `src/main.js`. O monólito pode ser regenerado com `npm run build:monolith`.

## Estrutura de diretórios

### Documentação (ordem de leitura)

| Caminho | Função |
|--------|--------|
| `README.md` (raiz) | Entrada do repositório: ordem dos guias em `docs/`, comandos `npm` essenciais. |
| `docs/DOCUMENTACAO.md` | Este ficheiro — arquitetura, fluxos, testes, segurança. |
| `docs/MAIN_JS.md` | Mapa operacional do `src/main.js`: arranque, subsistemas, globais no `window`. |
| `docs/INDEX_HTML.md` | Mapa do markup, CSP, regiões da UI; o `index.html` inclui catálogo de **todos** os `id` (`npm run doc:refresh-index-ids`). |
| `docs/STYLE_CSS.md` | Guia de `src/style.css`: temas, breakpoints, classes ligadas ao JS. |
| `docs/CODING_STANDARDS.md` | Comentários, JSDoc, nomeação, estrutura de ficheiros. |

### Código, build e scripts Node

| Caminho | Função |
|--------|--------|
| `index.html` | Markup, CSP meta, CDNs (jsPDF, JSZip, Tesseract, Font Awesome, fontes), inclusão de `/src/style.css` e `/src/main.js`. Comentário de topo + marcadores de secção. |
| `src/style.css` | Estilos da app; índice no topo do ficheiro. |
| `src/main.js` | Lógica cliente monolítica (script global, `onclick` no HTML). |
| `vite.config.js` | Vite 7; proxy dev `/__ygo_images__/` → CDN YGOPRODeck. |
| `scripts/build-monolith.mjs` | Gera `yugioh_deckbuilder.html` (HTML + CSS + JS inline). |
| `scripts/catalog-cache-spec.mjs` | Spec Node alinhada a `ingestCardinfoRowsIntoAggSets` (`main.js`). |
| `scripts/card-text-cache-spec.mjs` | Spec Node alinhada a `cardDisplayedNameFingerprint` (`main.js`). |
| `scripts/generate-index-html-id-catalog-comment.mjs` | Gera o bloco do catálogo de `id` no topo do `index.html`; uso: `npm run doc:refresh-index-ids` com `--write`. |
| `scripts/list-index-html-ids.mjs` | Lista `id` do `index.html` (apoio; não altera ficheiros por defeito). |

### Artefactos gerados (não editar como fonte principal)

| Caminho | Origem |
|--------|--------|
| `dist/` | `npm run build` — saída Vite; pode apagar-se e voltar a gerar. |
| `yugioh_deckbuilder.html` | `npm run build:monolith` — monólito para distribuição legada. |

## `index.html` (resumo)

O documento carrega primeiro as **políticas** (CSP, Permissions-Policy), depois **CDNs** (jsPDF, JSZip, Tesseract, Font Awesome, fontes), o **CSS** da app e, no final do fluxo principal, **`/src/main.js`**. Vários **modais e tooltips** vivem no início do `<body>` **fora** de `#app-layout` para empilhamento (`z-index`) e ARIA previsíveis.

O layout em três colunas está sob **`#app-layout`**: `#col-filters`, `#col-results` (inclui `#results-view`), `#col-preview` (deck, import/export). A UI **OCR** (`#ocr-container`, …) está **depois** da tag `<script src="/src/main.js">` por legado; o código continua a usar os mesmos IDs.

Para uma descrição por blocos, IDs de painéis e lembretes de manutenção, ver **`docs/INDEX_HTML.md`**.

## Stack e scripts npm

- **Runtime dev/build**: Vite 7 (`npm run dev`, `npm run build`, `npm run preview`).
- **Formatação**: Prettier (`npm run format`).
- **Documentação HTML**: `npm run doc:refresh-index-ids` — atualiza o catálogo de `id` no comentário inicial de `index.html`.

### Conteúdo de `npm run test` (por ordem)

1. `node --check src/main.js` — verificação **sintática** do JavaScript (não executa a app).
2. `node scripts/catalog-cache-spec.mjs` — regressão da lógica de agregados do catálogo.
3. `node scripts/card-text-cache-spec.mjs` — regressão da fingerprint de nome exibido.
4. `npm run build --silent` — build Vite de produção.
5. `npm run build:monolith --silent` — geração do HTML monolítico.

### Pasta `scripts/` (Node, npm)

| Script | Papel |
|--------|--------|
| `build-monolith.mjs` | Empacota `index.html` + `src/style.css` + `src/main.js` → `yugioh_deckbuilder.html`. |
| `catalog-cache-spec.mjs` | Teste automatizado; manter alinhado a `ingestCardinfoRowsIntoAggSets` se essa função mudar. |
| `card-text-cache-spec.mjs` | Teste automatizado; manter alinhado a `cardDisplayedNameFingerprint`. |
| `generate-index-html-id-catalog-comment.mjs` | Doc: substitui o comentário do catálogo de `id` com `--write`. |
| `list-index-html-ids.mjs` | Listagem de `id` para revisão manual ou scripts. |
| `check-simple-tags.mjs` | (Manual) Verifica aninhamento simples (`div`, `span`, `main`, etc.) em `index.html` — rede de segurança leve, não substitui validador HTML completo. |
| `extract-deckbuilder.mjs` | (Manual) Operação inversa aproximada do monólito: extrai `<style>` e `<script>` de `yugioh_deckbuilder.html` para `src/style.css` / `src/main.js` e reescreve `index.html` com `<link>` / `<script>`. Útil se só existir o monólito legado. |

### Pasta `tools/` (legado / compatibilidade)

A pasta `tools/` foi mantida apenas para **não quebrar comandos antigos**. Os ficheiros ali são “shims” que chamam os scripts equivalentes em `scripts/`.

- Preferir: `node scripts/check-simple-tags.mjs`, `node scripts/extract-deckbuilder.mjs`.
- Continua a funcionar: `node tools/check-simple-tags.mjs`, `node tools/extract-deckbuilder.mjs`.

## Fluxo de execução no navegador

1. O documento carrega bibliotecas externas e depois `src/main.js` como script global.
2. `main.js` registra listeners de segurança (violações CSP), inicializa caches de URL do CDN, estado do deck (`cardQueue`, `cardQueueSide`), filtros e UI.
3. Buscas e metadados conversam com a API YGOPRODeck (com limites de taxa e abort onde implementado).
4. Em desenvolvimento com Vite, requisições a `/__ygo_images__/…` são proxied para o CDN, permitindo HEAD/check same-origin onde necessário.

## Subsistemas em `src/main.js` (mapa lógico)

O arquivo é único por decisão de compatibilidade com o HTML legado. Conceptualmente agrupa-se assim:

- **URLs e CDN**: funções `ygo*IconUrl`, `ygoCdnCard*JpgByImgId`, caches com limite (`Map` + clear ao estourar tamanho).
- **DOM helpers**: `getEl`, `getVal`, `setVal`, `setText`, `setHtml`, checks de formulário.
- **Ordenação e texto**: collators `Intl`, fingerprints de nome para invalidação de cache, `compareCardsBySortCriterion` e derivados.
- **Deck**: filas principal/extra/side, limites (`DECK_LIMIT_`*), ordenação, drag-and-drop (`YGO_DND_`*), scroll pendente para pilhas.
- **Validação**: banlist, tooltips de validação e estatísticas, mensagens ARIA.
- **Filtros e i18n**: `STRINGS`, idioma de UI vs idioma da API, reconstrução de selects e datalists.
- **Persistência**: cookies/localStorage/IndexedDB nos trechos dedicados (saved decks, caches de catálogo).
- **Exportação**: PDF (jsPDF), ZIP, canvas para imagens.
- **URL compartilhável**: parâmetros `flt_`* para filtros.

Para localizar símbolos, use busca por nome no editor; comentários de bloco `/** … */` já marcam vários pontos importantes no arquivo. **Mapa operacional** (arranque, subsistemas, `window.*`): `docs/MAIN_JS.md`.

### Progresso da documentação inline em `main.js`

O arquivo está sendo documentado **em ordem**, do início ao fim. Metadados do projeto (API, ambiente, autor, data da última revisão do cabeçalho) ficam no `@fileoverview` no topo de `src/main.js`. Após cada sessão de edição, vale atualizar `@lastupdated` nesse cabeçalho se o conjunto de mudanças for significativo.

O **`index.html`** tem comentário de documentação no topo e marcadores de secção no markup; o mapa estrutural vive em **`docs/INDEX_HTML.md`** (atualizar quando o HTML ganhar modais ou IDs novos relevantes).

O **`src/style.css`** tem índice e marcadores de secção no topo do ficheiro; o guia temático está em **`docs/STYLE_CSS.md`** (atualizar o índice de linhas no CSS se reorganizar blocos grandes).

## Segurança

- **Content-Security-Policy** e **Permissions-Policy** estão declaradas em `index.html`. Ao adicionar origens novas (scripts, fonts, `connect-src`), atualize o meta CSP e, se for relevante para quem edita markup, **uma linha em `docs/INDEX_HTML.md`** (tabela do `<head>` ou notas).
- O código tenta mitigar riscos comuns em cliente (por exemplo sanitização de segmentos para URLs de atributo, parsing JSON seguro em trechos específicos).

## Manutenção da documentação no código

Recomenda-se, para cada nova função ou alteração relevante:

1. Bloco JSDoc em PT-BR com descrição.
2. `@param {Tipo} nome` para **cada** parâmetro; se houver valor padrão, documentar assim: *«padrão: `x`»* na descrição do parâmetro.
3. `@returns` quando o retorno não for óbvio.
4. Comentários breves em `if`/`for`/`while` quando a condição ou o índice não forem autoexplicativos.

O arquivo `src/main.js` é grande; idealmente a documentação detalhada avança **módulo a módulo** (por exemplo ao refatorar ou corrigir bugs numa área).

## Referências externas

- [YGOPRODeck API](https://ygoprodeck.com/api-guide/) — parâmetros `fname`, `name`, `language`, paginação, etc.
- Imagens e ícones em `images.ygoprodeck.com`.