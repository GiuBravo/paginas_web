# Documentation — Lust Goddess Wiki

Web calculator for *Lust Goddess*: Soul/Credits/Restart costs, Super Serum, and relationship gifts.

> Portuguese documentation: [../README.md](../README.md)

## Index

| Document | Contents |
|----------|----------|
| [architecture.md](./architecture.md) | Overview, data flow, and project layers |
| [modules.md](./modules.md) | Reference for each `src/` module |
| [calculations.md](./calculations.md) | Calculation rules (goal, budget, gifts) |
| [game-data.md](./game-data.md) | Data sources and how to update tables |
| [i18n.md](./i18n.md) | Internationalization (pt-BR / en) |
| [deploy.md](./deploy.md) | Build, preview, and static hosting |

## Quick start

```bash
npm install
npm run dev      # development (Vite)
npm run build    # production → dist/
npm run preview  # serve dist/ locally
```

## Repository layout

```
├── index.html          # HTML shell (three main tabs)
├── public/             # Static assets (icons, favicon)
├── src/
│   ├── main.js         # Cost tab orchestration
│   ├── calc.js         # Soul/Credits calculation engine
│   ├── gameData.js     # Tables per rarity
│   ├── i18n.js         # Translations
│   ├── locales/        # pt-BR and en JSON
│   ├── styles/         # tokens, layout, components
│   └── …               # Gifts, Super Serum, UI helpers
├── doc/                # Documentation (PT + en/)
├── legacy/             # Previous single-file HTML version
└── scripts/            # Utilities (e.g. icon processing)
```

## Application tabs

1. **Cost** — Soul, Credits, and Restart calculator (Goal and Budget modes), restart guide, reference tables.
2. **Fortification** — Super Serum costs by rarity and level band.
3. **Gifts** — RP calculator from inventory and favorite-gifts table per mercenary.

## Code conventions

- **Code language:** Portuguese function and variable names (`calcular_resultado`, `obterRaridade`), aligned with game domain terms.
- **ES modules:** native `import`/`export`; entry via `<script type="module">` in `index.html`.
- **No UI framework:** imperative DOM + CSS custom properties for theming.
- **Persistence:** `localStorage` for theme, locale, active tab, and form fields.

## Credits

Data derived from community *Lust Goddess* wikis and tools (LYSSA Wiki, lustgoddesswiki). Rarity icons from [LYSSA Wiki — Mercenaries](https://lyssa.wiki.gg/wiki/Mercenaries).
