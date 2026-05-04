# Mapa operacional do `src/main.js`

Ficheiro **único**, carregado como script global (`<script src="/src/main.js">` sem `type="module"`), para manter compatibilidade com `onclick="…"` e outras referências no `index.html`. Este documento complementa o resumo em `docs/DOCUMENTACAO.md` com **pontos de entrada** e **âncoras de busca**; a documentação fina está nos blocos JSDoc no próprio código.

## Arranque e ciclo de vida

| Momento | O quê |
|--------|--------|
| Parse do script | IIFE `observeCspViolations` regista `securitypolicyviolation` no `window`. |
| Constantes globais do CDN | `ygoRaceIconUrl`, `ygoMonsterTypeIconUrl`, `ygoAttribCardJpgUrl`, `ygoCdnCard*JpgByImgId`, caches com limite. |
| `window.onload` | Atribuído no ficheiro (~linha 20455 no estado atual do repo); inicializa UI, filtros, listeners e estado do deck. |

Qualquer alteração na ordem de elementos no DOM ou em IDs críticos deve ser cruzada com `docs/INDEX_HTML.md` e com `getEl('…')` / seletores no `main.js`.

## Helpers e infraestrutura (início do ficheiro)

| Área | Símbolos (busca no editor) |
|------|----------------------------|
| DOM por `id` | `getEl`, `getVal`, `setVal`, `setText`, `setHtml`, `isChecked`, `setChecked`, `numVal`, `int10`, `floatNum` |
| Ordenação / texto | `getSortCollator`, `getCardTextSortLocale`, `compareCardsBySortCriterion` (e funções relacionadas), `cardDisplayedNameFingerprint`, `cardSortName` |
| URLs YGO / CDN | Prefixo `ygo` + `IconUrl` / `JpgByImgId` / caches `__ygo*` |

## Subsistemas (âncoras lógicas)

Use esta tabela para saber **onde começar** ao corrigir um bug ou acrescentar uma funcionalidade.

| Subsistema | Responsabilidade | Palavras-chave / prefixos |
|------------|------------------|---------------------------|
| Busca e API | Pedidos à YGOPRODeck, paginação, abort, limites | `fetch`, `cardinfo`, paginação, `performSearch`, resultados em `#results-view` |
| Filtros e chips | Estado dos filtros, reconstrução de UI, URL `flt_*` | `filterChipState`, `multiTextFilters`, `resetFilters`, `STRINGS`, i18n |
| Deck e filas | Principal / extra / side, limites, vistas | `cardQueue`, `DECK_LIMIT_`, `changeQueueView`, `clearQueue`, `removeItem` |
| Drag-and-drop | Reordenar e mover pilhas no deck | `YGO_DND_`, `insertDeckEntriesAtStackBoundary`, `moveStackInQueue` |
| Validação | Banlist, tooltips de validade e estatísticas | `validateCurrentDeck`, `deckValidity`, `banlistMaxCopiesForCard` |
| Tooltips e modais | Tooltip de carta, detalhes, painéis | `openTooltipDetailsModal`, `openCardSetsPanel`, `#card-tooltip` |
| Persistência | Decks guardados, caches locais | `localStorage`, cookies, IndexedDB (trechos dedicados no ficheiro) |
| Exportação | PDF, ZIP, canvas | `jsPDF`, `JSZip`, `downloadPDF`, `currentPdf` |
| OCR | Vídeo, canvas, Tesseract, depuração | `OCRCalibrator`, `copyLogs`, `exportOcrDebug`, `takeScreenshot`, `forceAddToQueue` |

## Globais expostos no `window` (amostra)

Muitas funções são apenas **declarações de topo** (ficam globais no script clássico). Outras são atribuídas explicitamente. Exemplos da segunda categoria (útil para depuração e para o HTML):

- `window.onload` — arranque.
- `window.openRandomMainModal`, `window.openCardSetsPanel`, `window.closeCardSetsPanel`, `window.openTooltipDetailsModal`, `window.closeTooltipDetailsModal`.
- `window.changePage`, `window.jumpToPage`, `window.removeItem`, `window.removeOneDeckCopy`, `window.changeQueueView`, `window.clearQueue`.
- `window.downloadPDF`, `window.importDeckFile`, `window.resetFilters`.
- Estado partilhado: `window.filterChipState`, `window.multiTextFilters`, `window.selectedCardsetNames`, `window.selectedSetCodes`, `window.selectedRarities`.
- OCR / depuração: `window.copyLogs`, `window.exportOcrDebug`, `window.takeScreenshot`, `window.forceAddToQueue`, `window.testCalibrator`.

Para a lista completa de handlers no markup, procure `onclick="` em `index.html` e cruze com o nome da função no `main.js`.

## Testes alinhados ao `main.js`

- `scripts/catalog-cache-spec.mjs` — espelha a lógica de `ingestCardinfoRowsIntoAggSets`.
- `scripts/card-text-cache-spec.mjs` — espelha `cardDisplayedNameFingerprint`.

Detalhe da pipeline `npm run test` em `docs/DOCUMENTACAO.md`.

## Manutenção deste mapa

- Após **refactors grandes** (mover blocos, renomear funções centrais), atualize secções afetadas aqui e, se aplicável, o `@fileoverview` em `src/main.js`.
- Números de linha são **indicativos**; use busca por nome de símbolo como fonte de verdade.

## Leitura cruzada

- `docs/DOCUMENTACAO.md` — arquitetura e segurança.
- `docs/INDEX_HTML.md` — IDs e ordem do `<body>`.
- `docs/CODING_STANDARDS.md` — JSDoc e português do Brasil.
