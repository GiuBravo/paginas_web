/**
 * Descarrega eng.traineddata.gz para .tess-lang/ (offline) e public/ocr-models/tess/ (runtime browser).
 * Evita o CDN tessdata.projectnaptha.com (bloqueado sob interceção TLS corporativa).
 *
 * Uso: npm run vendor:tess-lang
 */
import { mkdirSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, '.tess-lang');
const PUBLIC_DIR = join(ROOT, 'public', 'ocr-models', 'tess');
const OUT = join(OUT_DIR, 'eng.traineddata.gz');
const PUBLIC_OUT = join(PUBLIC_DIR, 'eng.traineddata.gz');
const URL = 'https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PUBLIC_DIR, { recursive: true });

function okSize(p) {
  return existsSync(p) && statSync(p).size > 1_000_000;
}

if (!okSize(OUT)) {
  console.log('A descarregar', URL);
  const r = spawnSync('curl', ['-k', '-L', '-s', '-o', OUT, URL], { stdio: 'inherit' });
  if (r.status !== 0 || !okSize(OUT)) {
    console.error('Falha no download. Descarregue manualmente para', OUT);
    console.error('  curl -k -L -o ".tess-lang/eng.traineddata.gz"', URL);
    process.exit(1);
  }
  console.log('OK:', OUT, statSync(OUT).size, 'bytes');
} else {
  console.log('eng.traineddata.gz já presente:', OUT, statSync(OUT).size, 'bytes');
}

if (!okSize(PUBLIC_OUT) || statSync(PUBLIC_OUT).mtimeMs < statSync(OUT).mtimeMs) {
  copyFileSync(OUT, PUBLIC_OUT);
  console.log('Copiado para runtime:', PUBLIC_OUT);
} else {
  console.log('Runtime já atualizado:', PUBLIC_OUT);
}
