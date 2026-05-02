# Documentação do projeto DeckBuilder (GiuBravo)

Este documento descreve a arquitetura, os artefatos e os fluxos principais do repositório. O código-fonte deve ser comentado em **português do Brasil**, conforme `docs/CODING_STANDARDS.md`.

## Visão geral

O DeckBuilder é uma aplicação web para montar decks de Yu-Gi-Oh!, usando dados públicos da API **YGOPRODeck** (`db.ygoprodeck.com`, imagens em `images.ygoprodeck.com`). O projeto foi separado do HTML monolítico original (`Deckbuilder_cursor.html` como backup conceitual): a fonte de verdade para desenvolvimento é `index.html`, `src/style.css` e `src/main.js`. O monólito pode ser regenerado com `npm run build:monolith`.

## Estrutura de diretórios


| Caminho                            | Função                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `index.html`                       | Markup, CSP meta, CDNs (jsPDF, JSZip, Tesseract, Font Awesome, fontes), inclusão de `/src/style.css` e `/src/main.js`.   |
| `src/style.css`                    | Estilos extraídos do HTML legado.                                                                                        |
| `src/main.js`                      | Toda a lógica cliente (~23 mil linhas, script global para compatibilidade com handlers `onclick` inline no HTML).        |
| `vite.config.js`                   | Configuração Vite; proxy de desenvolvimento para imagens same-origin (`/__ygo_images__/` → CDN YGOPRODeck).              |
| `scripts/build-monolith.mjs`       | Concatena HTML + CSS + JS num único `Deckbuilder_cursor.html`.                                                           |
| `scripts/catalog-cache-spec.mjs`   | Teste em Node do espelho da ingestão de agregados do catálogo (alinhado a `ingestCardinfoRowsIntoAggSets` em `main.js`). |
| `scripts/card-text-cache-spec.mjs` | Teste em Node do espelho de `cardDisplayedNameFingerprint`.                                                              |
| `docs/CODING_STANDARDS.md`         | Padrões de nomeação e estrutura.                                                                                         |
| `docs/DOCUMENTACAO.md`             | Este arquivo.                                                                                                            |


## Stack e scripts npm

- **Runtime dev/build**: Vite 7 (`npm run dev`, `npm run build`, `npm run preview`).
- **Formatação**: Prettier (`npm run format`).
- **Testes rápidos**: `npm run test` — validação sintática de `src/main.js`, specs dos scripts acima e builds silenciosos.

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

Para localizar símbolos, use busca por nome no editor; comentários de bloco `/** … */` já marcam vários pontos importantes no arquivo.

### Progresso da documentação inline em `main.js`

O arquivo está sendo documentado **em ordem**, do início ao fim. Metadados do projeto (API, ambiente, autor, data da última revisão do cabeçalho) ficam no `@fileoverview` no topo de `src/main.js`. Após cada sessão de edição, vale atualizar `@lastupdated` nesse cabeçalho se o conjunto de mudanças for significativo.

## Segurança

- **Content-Security-Policy** e **Permissions-Policy** estão declaradas em `index.html`. Ao adicionar origens novas (scripts, fonts, `connect-src`), atualize o meta CSP.
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