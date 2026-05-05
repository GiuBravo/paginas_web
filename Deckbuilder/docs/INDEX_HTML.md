# Mapa do `index.html`

Este ficheiro é o **HTML de trabalho** do DeckBuilder GiuBravo: inclui CSP, bibliotecas em CDN, `src/style.css`, `src/main.js` e todo o markup da UI. O monólito `yugioh_deckbuilder.html` é uma cópia empacotada (`npm run build:monolith`); ao alterar origens ou scripts, mantenha **CSP** e **comentários de topo** alinhados. A lógica que consome estes IDs e `onclick` está mapeada em **`docs/MAIN_JS.md`**.

No topo do `index.html` existe um **comentário longo** (logo após `<!doctype html>`) com: visão geral do documento e um **catálogo alfabético de todos os `id`** (uma linha por `id`, com descrição em PT-BR). Esse catálogo é **regenerável** para não divergir do markup:

```bash
npm run doc:refresh-index-ids
```

Os números de linha abaixo referem-se ao estado do repositório quando este mapa foi escrito; após edições, use busca por `id="…"` no editor ou regenere o catálogo.

## Catálogo de `id` no próprio HTML

- **Onde:** primeiro comentário `<!-- … -->` do ficheiro (antes de `<html>`).
- **Conteúdo:** lista ordenada de todos os `id` presentes no documento (inclui `button`, `input`, `datalist`, `div`, etc.) com descrição curta.
- **Manutenção:** após acrescentar ou remover atributos `id`, execute `npm run doc:refresh-index-ids` e confirme o diff (o script `scripts/generate-index-html-id-catalog-comment.mjs` também pode ser afinado para descrições mais específicas).

## `<head>` (aprox. linhas 303–340, após o comentário de topo)

| Tópico | Notas |
|--------|--------|
| **Idioma** | `<html lang="pt-br">`. |
| **Ícone** | `favicon` inline (data URL SVG). |
| **Segurança** | `X-Content-Type-Options`, `referrer`, `Permissions-Policy` (câmara `self` para OCR). |
| **CSP** | `Content-Security-Policy` em meta: ao acrescentar CDN ou API, atualizar `connect-src`, `script-src`, etc. |
| **Scripts globais** | jsPDF (`jspdf.umd.min.js`), JSZip, Tesseract.js (Unpkg). Sem SRI intencional (comentário no HTML sobre variantes gzip). |
| **Estilo externo** | Font Awesome + Google Fonts (Bitter). |
| **App** | `<link rel="stylesheet" href="/src/style.css" />` — o build monolítico substitui por `<style>` inline. |

## Corpo: overlays e diálogos (antes de `#app-layout`, ~342–711)

Elementos **fixos ou modais** que o `main.js` assume no `document` (muitos com `getEl('…')`):

| ID / região | Função resumida |
|-------------|-----------------|
| `#card-tooltip` | Tooltip da carta; pode ser movido para `#tooltip-details-modal-body`. |
| `#deck-validity-tooltip` | Tooltip de regras / validação do deck. |
| `#deck-stat-tooltip` | Tooltip dos totais na barra de estatísticas. |
| `#card-sets-panel` | Painel lateral de impressões (`openCardSetsPanel`). |
| `#toast-container` | Toasts. |
| `#deck-name-modal` | Nome do deck (guardar / renomear). |
| `#deck-swap-modal` | Escolha de pilha ao trocar carta. |
| `#random-main-modal` | Amostra aleatória do main deck. |
| `#help-mouse-modal` | Ajuda rato/teclado. |
| `#credits-modal` | Créditos e media. |
| `#tooltip-details-modal` | Vista expandida do tooltip. |

## `#app-layout` (~713 em diante)

Classes em `#app-layout` (ex.: `empty-queue`, `deck-col-hidden`, `filters-col-hidden`) são **chaves de estado visual** alternadas pelo `main.js`.

### `#col-filters` (~714–1818)

- Coluna de **filtros de busca**: inputs `filter-*`, botões “Adicionar”, chips, `datalist`s, datas, banlist, exportações acessíveis pela mesma coluna conforme layout.
- Comentário de secção no HTML: `<!-- === Filtros: … === -->` (~736).

### `#col-results` (~1820–2330)

- Área de **busca** (`#search-input`, `#btn-open-scanner`, etc.).
- **`#results-view`** — lista ou grelha de sugestões.
- Paginação e toggles de vista.

### `#col-preview` (~2332–3116)

- **Deck**: `#deck-items`, validação (`#deck-banlist-select`, `#btn-deck-validate-toggle`), decks guardados, ordenação, vistas da fila.
- **Importação / exportação**: barras e overlays (ex.: `#import-overlay`, `#global-export-overlay`).

## Script e OCR (fim do `body`)

| Ordem | Conteúdo |
|-------|-----------|
| 1 | `<script src="/src/main.js"></script>` (~2834) — **não** é `type="module"` (compatível com `onclick="…"` no HTML). |
| 2 | `#ocr-container` (~2836–3081) — vídeo `#ocr-video`, `#preview-canvas`, `#ocr-log`, `#btn-close-ocr`, `#ocr-canvas-internal`, etc. O bloco aparece **depois** do script no ficheiro legado; o código assume que estes IDs existem. |

## Convenções úteis

- **`data-i18n`**, **`data-i18n-title`**, **`data-i18n-aria`**, **`data-i18n-placeholder`**: chaves de tradução aplicadas pelo pipeline i18n em `main.js`.
- **`onclick="…"`** em vários botões: funções expostas em `window` (ex.: `resetFilters()`, `changePage(1)`).
- **Comentários `<!-- === … === -->`**: marcam grandes secções; ao inserir blocos grandes, prefira manter um marcador para leitura humana.

## Manutenção

1. Novo recurso de rede ou CDN → **CSP** no `<head>` + entrada neste mapa se for estrutural.
2. Novo modal ou painel → documentar ID aqui e, se for crítico, referência em `docs/DOCUMENTACAO.md`.
3. Novo ou removido **`id` no HTML** → `npm run doc:refresh-index-ids` e rever o comentário de topo; opcionalmente afinar descrições em `scripts/generate-index-html-id-catalog-comment.mjs` (`EXACT` / heurísticas).
4. Após mudanças grandes no markup, vale atualizar os intervalos de linhas deste ficheiro numa passagem rápida (`rg -n 'id="…"' index.html`).

## Leitura cruzada

- `docs/DOCUMENTACAO.md` — visão geral, testes, artefactos gerados.
- `docs/MAIN_JS.md` — consumo de IDs, `onclick` e arranque do script.
- `docs/STYLE_CSS.md` — classes e temas ligados ao markup.
