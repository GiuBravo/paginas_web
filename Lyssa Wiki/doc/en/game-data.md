# Game data

## Where data lives

| Area | File | Typical source |
|------|------|----------------|
| Soul / Credits / Restart | `src/gameData.js` | LYSSA wiki / spreadsheet, cumulative values |
| Super Serum | `src/serum.js` | [lustgoddesswiki — level calculator](https://lustgoddesswiki.online/tools/level-calculator) |
| Favorite gifts | `src/giftData.js` | Lust Goddess Wiki / community data |
| Rarity icons | `public/icons/rarity-*.svg` | [LYSSA Wiki — Mercenaries](https://lyssa.wiki.gg/wiki/Mercenaries) |
| Soul/Credits/Restart PNGs | `public/icons/*.png` | Game assets (background removed) |

## Updating level/restart costs

1. Verify values on the wiki or updated official spreadsheet.
2. Edit `mp_cumulativo` and `creditos_cumulativo` in `gameData.js` (arrays per rarity; indices 0–1 are `null`, index 2 = cost through level 2, etc.).
3. Adjust `regras_reinicio_por_raridade` and `reinicio_maximo_por_raridade` if game limits change.
4. Run `npm run dev` and validate:
   - Goal mode with known cases;
   - reference tables (Cumulative / Per level tabs);
   - Budget mode with test MP.

`obter_tabelas_raridade()` automatically derives per-level costs from cumulatives — **do not duplicate** `mpPor` arrays manually unless necessary.

## Updating Super Serum

Edit `tabela_super_soro` in `src/serum.js`. Keep the format:

```js
['+0 → +1', costLv1_5, costLv6_10, …, null],
```

`null` = not applicable (rendered as "—").

## Updating mercenaries / gifts

In `giftData.js`:

- `MERCENARIAS_PRESENTES` — `t1`, `t2`, `t3` are variants `'1'|'2'|'3'` (sphere, pyramid, wing).
- Image paths: `caminhoIconeMerc`, `caminhoPresente`, `caminhoOutfit` (assets under `/relationship/images/`).

After adding a mercenary, check sorting and search on the Gifts tab.

## Processing icon PNGs

```bash
npm run icons:process
```

Runs `scripts/remove_icon_backgrounds.py` (requires Python). Writes transparent PNGs to `public/icons/`.

UI mapping:

| File | Meaning |
|------|---------|
| `reinicio.png` | Restart (star) |
| `creditos.png` | Credits (coin) |
| `rarity-*.svg` | Soul (MP) by rarity |
| `serum.png` | Super Serum |

## Cache versioning

`icons.js` defines `ICON_CACHE` (e.g. `'8'`). Bump it when assets change to force browser reload.

## Disclaimer

Numbers may change with game patches. This tool is **unofficial**; always verify in the game client before spending valuable resources.
