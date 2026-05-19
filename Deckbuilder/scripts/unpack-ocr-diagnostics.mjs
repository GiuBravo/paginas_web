/**
 * Extrai ocr_diagnostics_*.zip para uma pasta (análise local / agente).
 * Uso: node scripts/unpack-ocr-diagnostics.mjs logs/ocr_diagnostics_123.zip
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync } from 'fflate';

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Uso: node scripts/unpack-ocr-diagnostics.mjs <ficheiro.zip>');
  process.exit(1);
}

const buf = readFileSync(zipPath);
const files = unzipSync(new Uint8Array(buf));
const outDir = zipPath.replace(/\.zip$/i, '_unpacked');

for (const [name, data] of Object.entries(files)) {
  const target = join(outDir, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
}

console.log(`Extraído: ${outDir} (${Object.keys(files).length} ficheiros)`);
