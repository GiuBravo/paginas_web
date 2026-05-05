# Guia de `src/style.css`

Folha **única** de estilos do DeckBuilder GiuBravo (~6000 linhas), herdada do HTML monolítico original. Não há pré-processador: tudo é CSS puro interpretado pelo navegador.

## Relação com outros ficheiros

| Ficheiro | Papel |
|----------|--------|
| `index.html` | Estrutura e `id`/`class`; catálogo de `id` no comentário de topo (`npm run doc:refresh-index-ids`). |
| `src/main.js` | Adiciona/remove classes (`help-enabled`, `has-monster-type`, modos lista/grelha, colunas, etc.). |
| `yugioh_deckbuilder.html` | Cópia gerada com CSS inline (`npm run build:monolith`). |

## Estrutura geral (espelha o comentário de topo do CSS)

1. **`:root`** — tokens (`--bg-dark`, `--panel-bg`, `--accent`, …) para o tema escuro por defeito.
2. **`.theme-white`** — sobrescritas agressivas (`!important`) para tema claro; blocos numerados (fundo, filtros, tooltip, inputs, …).
3. **`html.theme-*`** — variantes (OLED, Kaiba, Yugi, Joey, Exodia, Egito, …): variáveis e, nalguns temas, cores de colunas ou botões.
4. **Tipografia** — `@font-face` Matrix Book; `body` usa Matrix + Bitter (Google Fonts no HTML).
5. **`#card-tooltip`** — posição fixa, z-index alto; variantes para modal (`.tt-in-modal`) e mobile fullscreen.
6. **`.app-container`** — grelha `300px | 1fr | 450px`; no HTML o mesmo nó tem **`id="app-layout"`** e classe `app-container`. Modificadores:
   - `.deck-col-hidden` / `.deck-col-wide` — terceira coluna (deck) oculta ou partilha espaço com o centro.
   - `.filters-col-hidden` — primeira coluna (filtros) colapsada.
   - `.empty-queue`, `.pdf-preview-hidden` — estados de UI.
7. **Colunas** — `.col`, `#col-results`, `#col-preview`, `.sidebar-content`, `.filter-group`, toolbars (`.view-controls`, deck, export).
8. **Componentes** — chips, `datalist` custom, modais (`.deck-name-modal`, `.tooltip-details-modal`, `.card-sets-panel`), menu export, lista/grelha de sugestões, fila do deck, animações (`@keyframes`, `.card-surface-enter`, `.layout-sfc-pulse-*`).
9. **Media queries** — o breakpoint mais usado é **`900px`** (mobile; há um bloco grande perto do **fim** do ficheiro e regras pontuais antes) vs **`901px`** (desktop). Também **`860px`**, **`1280px`**, e `(hover: hover)` / `(hover: none)` para toque vs rato.

## Classes que o JavaScript costuma alternar

- **`html`**: `help-enabled`, `has-monster-type`, classes de tema (`theme-white`, `theme-yugi`, …).
- **`.app-container` / `#app-layout`**: `deck-col-hidden`, `deck-col-wide`, `filters-col-hidden`, `empty-queue`, `pdf-preview-hidden`, `layout-sfc-pulse-*` (temporárias, animação).
- **`.results-view`**: `list-mode`, `grid-mode` (+ variantes `list_cropped` / `grid_cropped` conforme JS).
- **`.suggestion-item`**, **`.queue-item`**: estados hover, drag, temas de fila.

Ao alterar o JS, verificar se o CSS ainda cobre a combinação de classes (especialmente `html.theme-*` com `!important`).

## Temas

- **Default**: só `:root` (escuro).
- **Claro**: classe `.theme-white` no elemento `html` (muitas regras com `!important` para vencer estilos inline antigos).
- **Coloridos**: `html` com classe `.theme-kaiba`, `.theme-yugi`, etc. — normalmente só redefinem variáveis; alguns têm regras extra para colunas ou botões.

## Boas práticas ao editar

1. Preferir **variáveis** (`var(--accent)`) a cores literais repetidas.
2. Evitar **aumentar `!important`** sem necessidade; no tema claro já existe bastante.
3. **Mobile**: o bloco largo `@media (max-width: 900px)` no ficheiro reescreve grelha e tooltip — testar sempre após mudanças no layout desktop.
4. **Formatação**: `npm run format` (Prettier inclui `src/style.css`).
5. Atualizar o **comentário de índice** no topo de `style.css` se mover secções grandes (intervalos de linhas).

## Leitura recomendada

- `docs/DOCUMENTACAO.md` — visão geral e testes.
- `docs/MAIN_JS.md` — classes e fluxos que o JS aplica ao DOM.
- `docs/INDEX_HTML.md` — mapa do markup e IDs.
- `docs/CODING_STANDARDS.md` — convenções do repositório.
