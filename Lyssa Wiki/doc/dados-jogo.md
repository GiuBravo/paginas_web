# Dados do jogo

## Onde os dados vivem

| Área | Arquivo | Origem típica |
|------|---------|---------------|
| Alma / Créditos / Reinício | `src/gameData.js` | Planilha/wiki LYSSA, valores cumulativos |
| Super Soro | `src/serum.js` | [lustgoddesswiki — level calculator](https://lustgoddesswiki.online/tools/level-calculator) |
| Presentes favoritos | `src/giftData.js` | Lust Goddess Wiki / dados da comunidade |
| Ícones de raridade | `public/icons/rarity-*.svg` | [LYSSA Wiki — Mercenaries](https://lyssa.wiki.gg/wiki/Mercenaries) |
| Ícones Alma/Créditos/Reinício | `public/icons/*.png` | Assets do jogo (processados sem fundo) |

## Atualizar custos de nível/reinício

1. Confira os valores na wiki ou planilha oficial atualizada.
2. Edite `mp_cumulativo` e `creditos_cumulativo` em `gameData.js` (arrays por raridade; índices 0–1 são `null`, índice 2 = custo até nível 2, etc.).
3. Ajuste `regras_reinicio_por_raridade` e `reinicio_maximo_por_raridade` se o jogo mudar limites.
4. Rode `npm run dev` e valide:
   - modo Objetivo com casos conhecidos;
   - tabelas de referência (abas Acumulado / Por nível);
   - modo Orçamento com MP de teste.

`obter_tabelas_raridade()` deriva automaticamente custos por nível a partir dos cumulativos — **não duplique** arrays `mpPor` manualmente salvo necessidade especial.

## Atualizar Super Soro

Edite `tabela_super_soro` em `src/serum.js`. Mantenha o formato:

```js
['+0 → +1', custoLv1_5, custoLv6_10, …, null],
```

`null` = célula não aplicável (renderizada como "—").

## Atualizar mercenárias / presentes

Em `giftData.js`:

- `MERCENARIAS_PRESENTES` — `t1`, `t2`, `t3` são variantes `'1'|'2'|'3'` (esfera, pirâmide, aspa).
- Caminhos de imagem: `caminhoIconeMerc`, `caminhoPresente`, `caminhoOutfit` (assets em `/relationship/images/`).

Após adicionar mercenária, verifique ordenação e busca na aba Presentes.

## Processar ícones PNG

```bash
npm run icons:process
```

Executa `scripts/remove_icon_backgrounds.py` (requer Python). Gera PNGs com fundo transparente em `public/icons/`.

Mapeamento usado na UI:

| Arquivo | Significado |
|---------|-------------|
| `reinicio.png` | Reinício (estrela) |
| `creditos.png` | Créditos (moeda) |
| `rarity-*.svg` | Alma (MP) por raridade |
| `serum.png` | Super Soro |

## Versionamento de cache

`icons.js` define `ICON_CACHE` (ex.: `'8'`). Ao trocar assets, incremente esse valor para forçar reload nos navegadores.

## Aviso

Os números podem mudar com patches do jogo. Esta ferramenta é **não oficial**; sempre confira no cliente do jogo antes de gastar recursos valiosos.
