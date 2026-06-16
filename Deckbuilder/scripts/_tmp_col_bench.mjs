import sharp from 'sharp';
import { join } from 'node:path';

const LANG = join('.tess-lang');
const DIR = 'logs/_zipdbg';

function otsuThreshold(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    max = 0,
    threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) {
      max = between;
      threshold = t;
    }
  }
  return threshold;
}

function binarizeDarkOnLight(rgb, w, h) {
  const n = w * h;
  const hist = new Uint32Array(256);
  const lum = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 3) {
    const L = 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
    lum[p] = L;
    hist[Math.min(255, Math.round(L))]++;
  }
  const mean = lum.reduce((a, b) => a + b, 0) / n;
  const otsu = otsuThreshold(hist, n);
  const thresh = Math.max(56, Math.min(176, Math.round(otsu * 0.86 + mean * 0.14 - 2)));
  const out = Buffer.alloc(n);
  for (let p = 0; p < n; p++) out[p] = lum[p] < thresh ? 0 : 255;
  return out;
}

function columnBounds(bin, w, h) {
  const colDark = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = 0; y < h; y++) if (bin[y * w + x] < 128) c++;
    colDark[x] = c / h;
  }
  const peaks = [];
  for (let x = 1; x < w - 1; x++) {
    if (colDark[x] > 0.08 && colDark[x] >= colDark[x - 1] && colDark[x] >= colDark[x + 1]) peaks.push(x);
  }
  if (peaks.length < 8) return null;
  // pick 8 widest-spaced peaks
  peaks.sort((a, b) => colDark[b] - colDark[a]);
  const chosen = peaks.slice(0, 12).sort((a, b) => a - b);
  const bounds = [];
  const step = Math.floor(chosen.length / 8);
  for (let i = 0; i < 8; i++) {
    const cx = chosen[Math.min(chosen.length - 1, i * step)];
    bounds.push({ x0: Math.max(0, cx - 8), x1: Math.min(w, cx + 8) });
  }
  return bounds;
}

const files = {
  'sample_011_passcode_paddle.jpg': '34848821',
  'sample_013_passcode_paddle.jpg': '14087893',
};

const { createWorker } = await import('tesseract.js');
const worker = await createWorker({ langPath: LANG, gzip: true });
await worker.loadLanguage('eng');
await worker.initialize('eng');
await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '10' });

for (const [f, exp] of Object.entries(files)) {
  const { data, info } = await sharp(join(DIR, f)).raw().toBuffer({ resolveWithObject: true });
  const w = info.width,
    h = info.height;
  const bin = binarizeDarkOnLight(data, w, h);
  const bounds = columnBounds(bin, w, h);
  if (!bounds) {
    console.log(f, 'no bounds');
    continue;
  }
  let digits = '';
  for (let bi = 0; bi < 8; bi++) {
    const b = bounds[bi];
    const cw = b.x1 - b.x0;
    const slice = Buffer.alloc(cw * h);
    for (let y = 0; y < h; y++) bin.copy(slice, y * cw, y * w + b.x0, y * w + b.x1);
    const targetH = Math.max(104, Math.round(h * 3.2));
    const scale = targetH / h;
    const targetW = Math.max(14, Math.round(cw * scale));
    const png = await sharp(slice, { raw: { width: cw, height: h, channels: 1 } })
      .resize({ width: targetW, height: targetH, kernel: 'nearest' })
      .extend({ top: 10, bottom: 10, left: 10, right: 10, background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    const { data: ocr } = await worker.recognize(png);
    const ch = (ocr.text || '').replace(/\D/g, '').slice(0, 1);
    digits += ch || '?';
  }
  console.log(f, 'cols', digits, digits === exp ? 'OK' : 'FAIL');
}
await worker.terminate();
