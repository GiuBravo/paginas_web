# Module reference

## `src/main.js`

**Role:** entry point; orchestrates the **Cost** tab and global preferences.

| Responsibility | Detail |
|----------------|--------|
| Light/dark theme | `localStorage` key `tema_armazenado` |
| App tabs | `cost`, `fortalecimento`, `gifts` |
| Calculator modes | `goal` / `budget` |
| Debounced calculation | 300 ms on `input`/`change` |
| Restart guide | R/L segments from current → desired (or simulation) |
| Clipboard | Formatted text via `i18n.texto_copia_*` |

Initializes: icon selects, reference tables, Super Serum panel (lazy), gifts panel (lazy).

---

## `src/calc.js`

**Role:** Soul + Credits cost engine. See [calculations.md](./calculations.md) and inline JSDoc in the source file.

| Export | Description |
|--------|-------------|
| `calcular_resultado` | Difference between desired and current point |
| `simular_progresso_alma` | Step-by-step simulation with MP/CR budget |
| `calcular_custo_total_desde_inicio` | Accumulated cost up to (restart, level) |
| `validar_entrada` / `validar_simulacao` | Error codes (`INVALID_RANGE`, `CURRENT_AFTER_DESIRED`) |
| `raridade_padrao` | `'legendary'` |

Re-exports utilities from `gameData.js` used by the UI.

---

## `src/gameData.js`

**Role:** source of truth for costs per rarity.

| Data | Use |
|------|-----|
| `mp_cumulativo` / `creditos_cumulativo` | Costs from level 1→n per rarity |
| `regras_reinicio_por_raridade` | Minimum level to restart |
| `reinicio_maximo_por_raridade` | Restart cap |
| `obter_tabelas_raridade` | Derives `mpPor`, `crPor`, per-level bands |
| `obter_linhas_planilha_nivel` | Rows for reference tables (cum/per) |

---

## `src/i18n.js`

**Role:** internationalization and dynamic copy.

- `t(key, vars)` — `{name}` interpolation.
- `applyTranslations()` — walks `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-aria]`.
- `preencher_opcoes_reinicio` — translated restart labels.
- `mensagem_erro`, `texto_copia_resultado`, `texto_copia_simulacao` — business messages.

See [i18n.md](./i18n.md).

---

## `src/refTablesUi.js`

**Role:** reference tables on the Cost tab (cumulative vs per level, rarity tabs).

- `initTabelasReferencia()` — tab listeners.
- `renderizarTabelasReferencia(raridade)` — spreadsheet HTML.
- `sincronizarAbasRaridadeRef(raridade)` — active tab highlight.

---

## `src/serum.js` / `src/serumUi.js`

| File | Contents |
|------|----------|
| `serum.js` | `tabela_super_soro` — costs per boost and level band |
| `serumUi.js` | Rarity tabs + table render on Fortification tab |

Data source: lustgoddesswiki (see [game-data.md](./game-data.md)).

---

## `src/giftData.js` / `src/giftsCalc.js` / `src/giftsUi.js`

| File | Contents |
|------|----------|
| `giftData.js` | Mercenary list, T1–T3 preferences, RP goals, image paths |
| `giftsCalc.js` | Inventory, point sanitization, `enriquecerLinha` |
| `giftsUi.js` | Full Gifts tab DOM (calc + favorites + filters) |

Persistence: `presentes_estado_v1` in `localStorage`.

---

## `src/icons.js`

Versioned URLs (`?v=8`) for cache busting. `obterIconeAlma(raridade)` maps Soul icon to rarity SVG. `sincronizarIconesAlma` updates `[data-icon-alma]` in the DOM.

---

## `src/selectComIcone.js`

Replaces native `<select>` visuals with a custom icon dropdown (restart, rarity, level). Keeps the hidden `<select>` for accessibility and the real value.

---

## `src/styles/`

| File | Scope |
|------|-------|
| `tokens.css` | Design tokens and dark theme |
| `layout.css` | Page structure and responsive grids |
| `components.css` | All visual components (~2200 lines) |

---

## `vite.config.js`

`defineConfig({ base: './' })` — deploy under a subdirectory or open `index.html` locally.

---

## `scripts/remove_icon_backgrounds.py`

Removes background from game icon PNGs; output in `public/icons/`. Run via `npm run icons:process`.
