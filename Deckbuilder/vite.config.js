/**
 * @fileoverview Configuração do Vite para o DeckBuilder GiuBravo.
 *
 * Em desenvolvimento (`npx vite . --port 5173` ou `npm run dev`), define um proxy
 * same-origin sob o prefixo `/__ygo_images__/`, que encaminha para o CDN oficial
 * `images.ygoprodeck.com`. Assim o app pode fazer HEAD/requisições como mesma origem
 * antes de usar URLs diretas nas exportações ou previews.
 *
 * Pasta `assets/` na raiz (logos, `icons/` com `ui/`, `attributes/`, `races/`, `types/`, `master-duel/`): servida em
 * `/assets/…` em dev e fundida para `dist/assets/` no build (sem apagar hashed chunks do Vite).
 *
 * @see https://vite.dev/config/server-options.html#server-proxy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_PROJECT_DIR = path.join(__dirname, 'assets');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

function mimeFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  return MIME_BY_EXT[e] || 'application/octet-stream';
}

/**
 * @param {string} assetsRoot Diretório absoluto permitido dos assets do projeto.
 * @param {string} urlRaw Path relativo vindo da URL (`/something/file.png`).
 * @returns {string|null} Caminho absoluto ao ficheiro ou null se inválido.
 */
function resolvedAssetPath(assetsRoot, urlRaw) {
  const tail = decodeURIComponent(String(urlRaw || '').split(/[?#]/)[0] || '');
  const posixish = tail.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!posixish || posixish.includes('..')) return null;
  const merged = path.join(assetsRoot, ...posixish.split('/'));
  const resolvedAssets = path.resolve(assetsRoot);
  const resolvedFile = path.resolve(merged);
  if (resolvedFile !== resolvedAssets && !resolvedFile.startsWith(resolvedAssets + path.sep)) return null;
  return resolvedFile;
}

function copyAssetsIntoDistMerge(srcRoot, destRoot) {
  if (!fs.existsSync(srcRoot)) return;
  for (const ent of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    const s = path.join(srcRoot, ent.name);
    const d = path.join(destRoot, ent.name);
    if (ent.isDirectory()) copyAssetsIntoDistMerge(s, d);
    else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

function deckbuilderProjectAssets() {
  return {
    name: 'deckbuilder-project-root-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rel = String(req.url || '').replace(/^\/assets/, '') || '';
        const fileAbs = resolvedAssetPath(ASSETS_PROJECT_DIR, rel);
        if (!fileAbs) return next();
        try {
          if (!fs.existsSync(fileAbs)) return next();
          const st = fs.statSync(fileAbs);
          if (!st.isFile()) return next();
          const ctype = mimeFromExt(path.extname(fileAbs));
          res.setHeader('Content-Type', ctype);
          res.setHeader('Cache-Control', 'public, max-age=0');
          if (req.method === 'HEAD') {
            res.statusCode = 200;
            res.end();
            return;
          }
          fs.createReadStream(fileAbs).pipe(res);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      const outBase = path.join(__dirname, 'dist', 'assets');
      copyAssetsIntoDistMerge(ASSETS_PROJECT_DIR, outBase);
    },
  };
}

/**
 * Objeto de configuração exportado como default do módulo ES.
 * Não recebe parâmetros — o Vite invoca `defineConfig` com este literal.
 *
 * @returns {import('vite').UserConfig} Configuração do servidor de desenvolvimento e build.
 */
export default defineConfig({
  plugins: [deckbuilderProjectAssets()],
  server: {
    proxy: {
      '/__ygo_images__': {
        target: 'https://images.ygoprodeck.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/__ygo_images__/, ''),
      },
    },
  },
});
