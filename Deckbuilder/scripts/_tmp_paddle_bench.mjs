import sharp from 'sharp';
import { join } from 'node:path';

const LANG = join('.tess-lang');
const DIR = 'logs/_zipdbg';

function despeckle(bin, w, h) {
  const out = Buffer.from(bin);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const dark = bin[p] < 128;
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (bin[(y + dy) * w + (x + dx)] < 128) nb++;
        }
      out[p] = dark ? (nb >= 2 ? 0 : 255) : nb <= 5 ? 255 : 0;
    }
  return out;
}

function adaptive(lum, cw, ch) {
  const n = cw * ch;
  const ii = new Float64Array((cw + 1) * (ch + 1));
  for (let y = 0; y < ch; y++) {
    let rs = 0;
    for (let x = 0; x < cw; x++) {
      rs += lum[y * cw + x];
      ii[(y + 1) * (cw + 1) + (x + 1)] = ii[y * (cw + 1) + (x + 1)] + rs;
    }
  }
  const r = Math.max(6, Math.round(ch * 0.5));
  const C = 8;
  const out = Buffer.alloc(n);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const x0 = Math.max(0, x - r),
        y0 = Math.max(0, y - r),
        x1 = Math.min(cw - 1, x + r),
        y1 = Math.min(ch - 1, y + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s =
        ii[(y1 + 1) * (cw + 1) + (x1 + 1)] -
        ii[y0 * (cw + 1) + (x1 + 1)] -
        ii[(y1 + 1) * (cw + 1) + x0] +
        ii[y0 * (cw + 1) + x0];
      const mean = s / area;
      out[y * cw + x] = lum[y * cw + x] < mean - C ? 0 : 255;
    }
  return out;
}

const files = {
  'sample_011_passcode_paddle.jpg': '34848821',
  'sample_012_passcode_paddle.jpg': '34848821',
  'sample_013_passcode_paddle.jpg': '14087893',
};

const { createWorker } = await import('tesseract.js');
const worker = await createWorker({ langPath: LANG, gzip: true });
await worker.loadLanguage('eng');
await worker.initialize('eng');

for (const [f, exp] of Object.entries(files)) {
  const { data, info } = await sharp(join(DIR, f)).grayscale().raw().toBuffer({ resolveWithObject: true });
  const cw = info.width,
    ch = info.height,
    n = cw * ch;
  const lum = new Float32Array(n);
  for (let p = 0; p < n; p++) lum[p] = data[p];
  const variants = [
    ['adaptive', despeckle(adaptive(lum, cw, ch), cw, ch)],
    ['invert_adapt', despeckle(adaptive(lum.map((v) => 255 - v), cw, ch), cw, ch)],
    ['thresh110', await sharp(data, { raw: { width: cw, height: ch, channels: 1 } }).threshold(110).raw().toBuffer()],
  ];
  for (const [name, bin] of variants) {
    const png = await sharp(bin, { raw: { width: cw, height: ch, channels: 1 } }).png().toBuffer();
    for (const psm of ['7', '6', '8']) {
      await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: psm });
      const { data: ocr } = await worker.recognize(png);
      const raw = (ocr.text || '').replace(/\s+/g, '');
      if (raw) console.log(f, name, 'psm', psm, 'raw', raw, raw.includes(exp) ? 'OK' : 'FAIL');
    }
  }
}
await worker.terminate();
