# Deploy and build

## npm scripts

| Command | Action |
|---------|--------|
| `npm install` | Installs Vite (only devDependency) |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Optimized production output in `dist/` |
| `npm run preview` | Serves `dist/` locally for testing |
| `npm run icons:process` | Processes icon PNGs (Python) |

## Build output

After `npm run build`:

```
dist/
├── index.html
├── assets/          # JS and CSS with hashed names
├── icons/
├── favicon.svg
└── …                # everything from public/
```

`base: './'` ensures relative links work when opening `index.html` directly or from a subfolder (e.g. `https://user.github.io/repo/`).

## Static hosting

Any static file host works:

- **GitHub Pages** — publish `dist/` to `gh-pages` or via Actions.
- **Netlify / Vercel** — build command: `npm run build`, publish directory: `dist`.
- **Own server** — copy `dist/` to the document root.

Node is not required in production.

## External assets

Mercenary and gift images use paths `/relationship/images/…`. On a standalone deploy, those paths must exist on the same host or be adjusted. Icons in `public/icons/` are included in the build.

## Environment variables

The project does not use `.env` at runtime. `.env` files are in `.gitignore` as a precaution.

## Pre-release checklist

- [ ] `npm run build` succeeds
- [ ] `npm run preview` — test all three tabs
- [ ] Light/dark theme and locale switch
- [ ] Goal and Budget modes with known values
- [ ] Icon and gift image URLs load in the target environment

## Legacy version

To compare old behavior, open `legacy/calculadora_alma_creditos_lust_goddess.html` (not processed by Vite).
