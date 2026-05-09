/**
 * @fileoverview Atualiza `index.html` com o total de linhas calculado (inclui docs).
 *
 * Isto permite que o valor apareça mesmo ao abrir `index.html` diretamente (file://),
 * onde o browser não consegue "calcular" lendo ficheiros do disco.
 *
 * Uso:
 * - `node scripts/write-loc-into-index.mjs` (só imprime o total)
 * - `node scripts/write-loc-into-index.mjs --write` (grava em index.html)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countProjectLinesWithDocs } from './loc.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const idxPath = path.join(root, 'index.html');

const { totalLines } = countProjectLinesWithDocs(root);
const n = Number.isFinite(Number(totalLines)) ? Math.round(Number(totalLines)) : 0;

if (!process.argv.includes('--write')) {
  process.stdout.write(String(n));
  process.stdout.write('\n');
  process.exit(0);
}

const html = fs.readFileSync(idxPath, 'utf8');
const re = /(<strong\b[^>]*\bid\s*=\s*["']credits-loc-value["'][^>]*>)([\s\S]*?)(<\/strong>)/i;
if (!re.test(html)) {
  console.error('Não encontrei <strong id="credits-loc-value">…</strong> em index.html.');
  process.exit(1);
}

const next = html.replace(re, `$1${n}$3`);
fs.writeFileSync(idxPath, next, 'utf8');
console.error(`LOC (inclui docs) escrito em index.html: ${n}`);

