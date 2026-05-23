# Referência de módulos

## `src/main.js`

**Papel:** ponto de entrada; orquestra a aba **Custo** e preferências globais.

| Responsabilidade | Detalhe |
|------------------|---------|
| Tema claro/escuro | `localStorage` chave `tema_armazenado` |
| Abas do app | `cost`, `fortalecimento`, `gifts` |
| Modos calculadora | `goal` (objetivo) / `budget` (orçamento) |
| Cálculo com debounce | 300 ms em `input`/`change` |
| Guia de reinícios | Segmentos R/L atual → desejado (ou simulação) |
| Clipboard | Texto formatado via `i18n.texto_copia_*` |

Inicializa: selects com ícone, tabelas de referência, painel Super Soro (lazy), painel presentes (lazy).

---

## `src/calc.js`

**Papel:** motor de custo Alma + Créditos.

| Export | Descrição |
|--------|-----------|
| `calcular_resultado` | Diferença entre ponto desejado e atual |
| `simular_progresso_alma` | Simulação passo a passo com orçamento de MP/CR |
| `calcular_custo_total_desde_inicio` | Soma acumulada até (reinício, nível) |
| `validar_entrada` / `validar_simulacao` | Códigos de erro (`INVALID_RANGE`, `CURRENT_AFTER_DESIRED`) |
| `raridade_padrao` | `'legendary'` |

Reexporta utilitários de `gameData.js` usados pela UI.

---

## `src/gameData.js`

**Papel:** fonte da verdade para custos por raridade.

| Dado | Uso |
|------|-----|
| `mp_cumulativo` / `creditos_cumulativo` | Custos 1→n por raridade |
| `regras_reinicio_por_raridade` | Nível mínimo para reiniciar |
| `reinicio_maximo_por_raridade` | Teto de reinícios |
| `obter_tabelas_raridade` | Deriva `mpPor`, `crPor`, faixas por nível |
| `obter_linhas_planilha_nivel` | Linhas para tabelas de referência (cum/per) |

---

## `src/i18n.js`

**Papel:** internacionalização e textos dinâmicos.

- `t(key, vars)` — interpolação `{nome}`.
- `applyTranslations()` — percorre `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-aria]`.
- `preencher_opcoes_reinicio` — labels de reinício traduzidos.
- `mensagem_erro`, `texto_copia_resultado`, `texto_copia_simulacao` — mensagens de negócio.

Ver [i18n.md](./i18n.md).

---

## `src/refTablesUi.js`

**Papel:** tabelas de referência na aba Custo (acumulado vs por nível, abas de raridade).

- `initTabelasReferencia()` — listeners das abas.
- `renderizarTabelasReferencia(raridade)` — HTML da planilha.
- `sincronizarAbasRaridadeRef(raridade)` — destaque da aba ativa.

---

## `src/serum.js` / `src/serumUi.js`

| Arquivo | Conteúdo |
|---------|----------|
| `serum.js` | `tabela_super_soro` — custos por boost e faixa de nível |
| `serumUi.js` | Abas de raridade + render da tabela na aba Fortalecimento |

Fonte dos dados: lustgoddesswiki (ver [dados-jogo.md](./dados-jogo.md)).

---

## `src/giftData.js` / `src/giftsCalc.js` / `src/giftsUi.js`

| Arquivo | Conteúdo |
|---------|----------|
| `giftData.js` | Lista de mercenárias, preferências T1–T3, metas RP, caminhos de imagem |
| `giftsCalc.js` | Inventário, sanitização de pontos, `enriquecerLinha` |
| `giftsUi.js` | DOM completo da aba Presentes (calc + favoritos + filtros) |

Persistência: `presentes_estado_v1` no `localStorage`.

---

## `src/icons.js`

URLs versionadas (`?v=8`) para cache bust. `obterIconeAlma(raridade)` mapeia ícone de Alma ao SVG da raridade. `sincronizarIconesAlma` atualiza `[data-icon-alma]` no DOM.

---

## `src/selectComIcone.js`

Substitui visualmente `<select>` nativos por dropdown customizado com ícones (reinício, raridade, nível). Mantém o `<select>` oculto para acessibilidade e valor real.

---

## `src/styles/`

| Arquivo | Escopo |
|---------|--------|
| `tokens.css` | Design tokens e tema escuro |
| `layout.css` | Estrutura da página e grids responsivos |
| `components.css` | Todos os componentes visuais (~2200 linhas) |

---

## `vite.config.js`

`defineConfig({ base: './' })` — deploy em subdiretório ou arquivo local.

---

## `scripts/remove_icon_backgrounds.py`

Remove fundo dos PNGs de ícones do jogo; saída em `public/icons/`. Invocado por `npm run icons:process`.
