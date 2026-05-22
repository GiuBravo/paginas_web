/**
 * Descarrega o pacote de modelos inglês do eSearch-OCR para public/ocr-models/.
 * Uso: node scripts/vendor-ocr-models.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const zipPath = path.join(root, 'public', 'ocr-models', 'en.zip');
const onnxPath = path.join(root, 'public', 'ocr-models', 'en', 'en', 'en_PP-OCRv3_rec_infer.onnx');
const url = 'https://github.com/xushengfeng/eSearch-OCR/releases/download/4.0.0/en.zip';

if (fs.existsSync(onnxPath)) {
  console.log('OCR models OK:', onnxPath);
  process.exit(0);
}

fs.mkdirSync(path.dirname(zipPath), { recursive: true });
console.log('Downloading', url);
execSync(`curl -L -k -o "${zipPath}" "${url}"`, { stdio: 'inherit', cwd: root });
console.log('Extracting…');
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${path.join(root, 'public', 'ocr-models', 'en')}' -Force"`,
  { stdio: 'inherit', cwd: root }
);
console.log('Done.');
