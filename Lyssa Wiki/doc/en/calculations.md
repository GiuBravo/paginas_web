# Calculation rules

## Progress coordinates

A mercenary’s progress is a pair **(R, L)**:

- **R** — restart number (0 … rarity maximum).
- **L** — level within the current restart (1 … effective max level).

Lexicographic order: (R₁, L₁) &lt; (R₂, L₂) if R₁ &lt; R₂, or R₁ = R₂ and L₁ &lt; L₂.

## Accumulated cost (Goal mode)

For each restart `r` from `0` to `R-1`, add the cost to go from level 1 to the **minimum level required** to restart that cycle (`niveisMaximosPorReinicio[r]`).

On the current restart `R`, add the cost from level 1 to `L` (if `L > 1`).

Per-level costs come from cumulative tables in `gameData.js`, converted to **per-level** cost (`mpPor[n]`, `crPor[n]` = difference between cumulative[n] and cumulative[n-1]).

**Result:**

```
alma_restante = total(desired) - total(current)
creditos_restantes = same
```

### Validation

| Code | Condition |
|------|-----------|
| `INVALID_RANGE` | R or L outside rarity limits |
| `CURRENT_AFTER_DESIRED` | Current point strictly after desired |

## Budget simulation (Budget mode)

Input: `pontos` (MP/Soul), optional `creditos`, start point (R₀, L₀).

Loop:

1. If at restart `R` level `L` reached the minimum to restart and `R < maxR`, record a row, increment `R`, set `L = 1`.
2. Otherwise try to level up: cost `mpPor[L+1]` and `crPor[L+1]`.
3. Stop if MP insufficient, CR insufficient (when provided), or no next level.

Each row stores: restart, level, spend in cycle, MP leftover, credits spent in cycle.

## Max restarts by rarity

| Rarity | Max restarts |
|--------|----------------|
| common | 4 |
| rare | 4 |
| epic | 5 |
| legendary | 7 |

## Gifts (RP)

- **9 gift types:** 3 shapes × 3 tiers (Rare, Epic, Legendary).
- Each mercenary has a preferred shape per tier (`giftData.MERCENARIAS_PRESENTES`).
- Points: favorite +12/+24/+60; other shape +10/+20/+50.
- Relationship cap: **35,100 RP** (`META_PRESENTES.pontosObjetivo`).
- Player current points: multiples of 2, capped at goal (`sanitizarPontos`).

`enriquecerLinha` sums inventory with preferences and computes `requiredPoints = max(0, meta - currentPoints - bestPoints)`.

## Super Serum

Static table in `serum.js`: rows are boost bands (+0→+1 … +3→+4); columns are mercenary level bands. `null` means invalid combo in the UI (cell "—").
