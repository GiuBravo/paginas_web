/**
 * Gera versão monolítica: um HTML com CSS e JS inline.
 * Copia assets estáticos (icons/, relationship/) para a pasta de saída.
 *
 * Uso: node scripts/build-monolith.mjs
 * Saída: dist-monolith/index.html + assets relativos
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'dist-monolith');
const LEGACY = path.join(ROOT, 'legacy');
const PUBLIC = path.join(ROOT, 'public');

const OUT_HTML = 'wiki_lust_goddess_monolith.html';

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.name === '_headers') continue;
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function inlineAssets(html, assetsDir) {
  let out = html;

  out = out.replace(
    /<link[^>]+rel="stylesheet"[^>]+href="(\.\/assets\/[^"]+)"[^>]*>/g,
    (_, href) => {
      const css = fs.readFileSync(path.join(assetsDir, href.replace('./assets/', 'assets/')), 'utf8');
      return `<style>\n${css}\n</style>`;
    },
  );

  out = out.replace(
    /<script[^>]+src="(\.\/assets\/[^"]+)"[^>]*><\/script>/g,
    (_, href) => {
      const js = fs.readFileSync(path.join(assetsDir, href.replace('./assets/', 'assets/')), 'utf8');
      return `<script type="module">\n${js}\n</script>`;
    },
  );

  out = out.replace(
    /content="default-src 'self'; script-src 'self'; style-src 'self';/,
    "content=\"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );

  out = out.replace(
    /<!--\s*Lógica em src\/main\.js[\s\S]*?Ver doc\/README\.md\s*-->/,
    '<!-- Versão monolítica gerada por npm run build:monolith -->',
  );

  return out;
}

console.log('Building modular dist…');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

const distHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const monolithHtml = inlineAssets(distHtml, DIST);

rmDir(OUT);
fs.mkdirSync(OUT, { recursive: true });

fs.writeFileSync(path.join(OUT, 'index.html'), monolithHtml, 'utf8');
fs.writeFileSync(path.join(OUT, OUT_HTML), monolithHtml, 'utf8');

copyDir(PUBLIC, OUT);

fs.mkdirSync(LEGACY, { recursive: true });
fs.writeFileSync(path.join(LEGACY, OUT_HTML), monolithHtml, 'utf8');

const sizeKb = (Buffer.byteLength(monolithHtml, 'utf8') / 1024).toFixed(1);
console.log(`\nMonolith ready (${sizeKb} KB HTML):`);
console.log(`  ${path.join(OUT, 'index.html')}`);
console.log(`  ${path.join(OUT, OUT_HTML)}`);
console.log(`  ${path.join(LEGACY, OUT_HTML)}`);
