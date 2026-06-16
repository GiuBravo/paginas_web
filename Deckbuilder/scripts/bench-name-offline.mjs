/**
 * Offline benchmark da Fase H (nome PT + EN) nas 6 fotos de docs/benchmark-photos/.
 *
 * Espelha o runtime: o nome fica na faixa superior esquerda (TCG_LAYOUT_MM.name:
 * x=3.5, y=3.3, h=6.8 mm; largura até ao círculo de atributo). Os rects são medidos
 * à mão na frame 900-wide (como os de passcode) porque a deteção automática não é
 * fiável nas fotos com cartas vizinhas/sombras nem representa o warp do runtime.
 *
 * Engine: tesseract.js (mesmo do runtime), texto livre, várias variantes de
 * pré-processamento + PSM. Validação por tokens (benchNameMatchesExpected espelhado de
 * src/ocr-diag-analyze.mjs). Gate Fase H: >= 3/6 (fecho >= 4/6).
 *
 * Requer eng.traineddata em .tess-lang/ (ver docs/SCANNER_BENCHMARK.md, Fase J/H offline).
 *
 * Uso: node scripts/bench-name-offline.mjs [--debug]
 */
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, '..', 'docs', 'benchmark-photos');
const DEBUG_DIR = join(PHOTOS_DIR, '_name-debug');
const DEBUG = process.argv.includes('--debug');

const EXPECTED_PASSCODE = {
  '01-brigrand.jpeg': 34848821,
  '02-livro-da-lua.jpeg': 14087893,
  '03-vazio-helsombraneco.jpeg': 92079625,
  '04-zeroboros.jpeg': 66403530,
  '05-exciton.jpeg': 46772449,
  '06-psychic-end-punisher.jpeg': 60465049,
};

// rects [left, top, width, height] da faixa do NOME (frame 900-wide, rotacionada),
// medidos à mão nos overlays de grelha (ver _name-debug/*-grid.png).
const FIXED_NAME_RECTS = {
  '01-brigrand.jpeg': [95, 296, 470, 54],
  '02-livro-da-lua.jpeg': [130, 290, 345, 46],
  '03-vazio-helsombraneco.jpeg': [120, 188, 590, 60],
  '04-zeroboros.jpeg': [130, 286, 585, 54],
  '05-exciton.jpeg': [130, 198, 575, 54],
  '06-psychic-end-punisher.jpeg': [128, 230, 605, 60],
};

// --- validação por tokens (espelho de src/ocr-diag-analyze.mjs) ---
const BENCH_NAME_TOKENS = {
  34848821: ['BRIGRAND', 'GLORIA', 'GLORY'],
  14087893: ['LIVRO', 'LUA', 'MOON', 'BOOK', 'LUNAR'],
  92079625: ['VAZIO', 'HELSOMBRANECO', 'EMPTY', 'VOID'],
  66403530: ['ZEROBOROS', 'TOPOLOG', 'BOROS'],
  46772449: ['EXCITON', 'HORDEUM', 'MALIG', 'MALIGH', 'THORDEUM', 'HORDEU', 'KNIGHT'],
  60465049: ['PSYCHIC', 'PUNISHER', 'PUNISE', 'END', 'JUSTICEIRO', 'PSIQUICO'],
};

function normalizeBenchNameText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function benchNameMatchesExpected(cleaned, passcode) {
  const tokens = BENCH_NAME_TOKENS[passcode];
  if (!tokens || !cleaned) return false;
  const norm = normalizeBenchNameText(cleaned);
  if (!norm) return false;
  if (passcode === 60465049) {
    const strongEn = ['PSYCHIC', 'PUNISHER', 'PUNISE'];
    if (!strongEn.some((t) => norm.includes(normalizeBenchNameText(t)))) return false;
  }
  return tokens.some((t) => norm.includes(normalizeBenchNameText(t)));
}

/** Binarização adaptativa mean-C (dark-on-light) sobre 1ch. Realça texto embossado de baixo contraste. */
function adaptiveThreshold(gray, w, h, radiusFrac = 0.6, C = 10) {
  const n = w * h;
  const ii = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let rs = 0; for (let x = 0; x < w; x++) { rs += gray[y * w + x]; ii[(y + 1) * (w + 1) + (x + 1)] = ii[y * (w + 1) + (x + 1)] + rs; } }
  const r = Math.max(8, Math.round(h * radiusFrac));
  const out = Buffer.alloc(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w - 1, x + r), y1 = Math.min(h - 1, y + r);
    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
    const s = ii[(y1 + 1) * (w + 1) + (x1 + 1)] - ii[y0 * (w + 1) + (x1 + 1)] - ii[(y1 + 1) * (w + 1) + x0] + ii[y0 * (w + 1) + x0];
    out[y * w + x] = gray[y * w + x] < s / area - C ? 0 : 255;
  }
  return out;
}

mkdirSync(DEBUG_DIR, { recursive: true });
const files = readdirSync(PHOTOS_DIR).filter((f) => /^0[1-6]-/.test(f) && /\.jpe?g$/i.test(f)).sort();

const LANG_PATH = join(__dirname, '..', '.tess-lang');
const gzip = existsSync(join(LANG_PATH, 'eng.traineddata.gz')) && !existsSync(join(LANG_PATH, 'eng.traineddata'));
if (!existsSync(join(LANG_PATH, 'eng.traineddata')) && !existsSync(join(LANG_PATH, 'eng.traineddata.gz'))) {
  console.error('Falta eng.traineddata em .tess-lang/. Ver docs/SCANNER_BENCHMARK.md (offline).');
  process.exit(2);
}
const { createWorker } = await import('tesseract.js');
const worker = await createWorker({ langPath: LANG_PATH, gzip });
await worker.loadLanguage('eng');
await worker.initialize('eng');

let hits = 0;
for (const file of files) {
  const path = join(PHOTOS_DIR, file);
  const passcode = EXPECTED_PASSCODE[file];
  const base = sharp(path).rotate().resize({ width: 900, withoutEnlargement: true });
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const rgb = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  const [nrl, nrt, nrw, nrh] = FIXED_NAME_RECTS[file];
  const left = Math.max(0, Math.min(info.width - 9, nrl));
  const top = Math.max(0, Math.min(info.height - 7, nrt));
  const width = Math.max(8, Math.min(info.width - left, nrw));
  const height = Math.max(6, Math.min(info.height - top, nrh));
  if (DEBUG) console.error(`  ${file} name=[${left},${top},${width},${height}]`);

  const sub = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const si = ((top + y) * info.width + (left + x)) * 3;
      const di = (y * width + x) * 3;
      sub[di] = rgb[si]; sub[di + 1] = rgb[si + 1]; sub[di + 2] = rgb[si + 2];
    }
  const UP = 4;
  const cw = width * UP, ch = height * UP;
  const PAD = 26;
  const pad = (buf, ch1) => sharp(buf, ch1 ? { raw: { width: cw, height: ch, channels: 1 } } : undefined)
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
    .withMetadata({ density: 300 }).png().toBuffer();

  // grayscale upscaled (luminância) + CLAHE p/ realçar embossado de baixo contraste
  const grayBuf = await sharp(sub, { raw: { width, height, channels: 3 } })
    .resize({ width: cw, height: ch, kernel: 'cubic' }).grayscale().raw().toBuffer();
  const gray = new Uint8Array(grayBuf.buffer, grayBuf.byteOffset, grayBuf.byteLength);
  const claheBuf = await sharp(grayBuf, { raw: { width: cw, height: ch, channels: 1 } })
    .clahe({ width: Math.max(8, Math.round(cw / 8)), height: Math.max(8, Math.round(ch / 2)), maxSlope: 3 })
    .raw().toBuffer();
  const claheArr = new Uint8Array(claheBuf.buffer, claheBuf.byteOffset, claheBuf.byteLength);

  const variants = [];
  // V0: CLAHE + sharpen (texto realçado, mantém tons)
  variants.push(await pad(await sharp(claheBuf, { raw: { width: cw, height: ch, channels: 1 } }).sharpen().png().toBuffer(), false));
  // V1: CLAHE + threshold adaptativo (dark-on-light)
  variants.push(await pad(adaptiveThreshold(claheArr, cw, ch, 0.6, 10), true));
  // V2: threshold adaptativo na luminância crua (texto mais escuro que fundo)
  variants.push(await pad(adaptiveThreshold(gray, cw, ch, 0.7, 8), true));
  // V3: threshold adaptativo invertido (texto mais claro que fundo — foil prateado)
  const inv = adaptiveThreshold(gray, cw, ch, 0.7, 8);
  for (let i = 0; i < inv.length; i++) inv[i] = 255 - inv[i];
  variants.push(await pad(inv, true));
  // V4: normalize + sharpen (linha clara)
  variants.push(await pad(await sharp(sub, { raw: { width, height, channels: 3 } })
    .resize({ width: cw, height: ch, kernel: 'cubic' }).grayscale().normalize().sharpen().png().toBuffer(), false));

  let bestRaw = '', bestConf = 0, ok = false, okRaw = '';
  const WL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÉÊÍÓÔÕÚÇàáâãäéêíóôõúç,.\'- ';
  for (const psm of ['7', '6', '11', '13']) {
    await worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: WL });
    for (const v of variants) {
      const { data: ocr } = await worker.recognize(v);
      const r = String(ocr.text || '').replace(/\s+/g, ' ').trim();
      if (!ok && benchNameMatchesExpected(r, passcode)) { ok = true; okRaw = r; }
      if ((ocr.confidence || 0) > bestConf) { bestConf = ocr.confidence || 0; bestRaw = r; }
    }
  }
  if (ok) hits++;
  console.log(`${file} (${passcode}): "${ok ? okRaw : bestRaw}" conf=${Math.round(bestConf)} ${ok ? 'OK' : 'x'}`);
  if (DEBUG) {
    await sharp(variants[0]).toFile(join(DEBUG_DIR, file.replace(/\.jpe?g$/i, '-name.png')));
    await sharp(variants[1]).toFile(join(DEBUG_DIR, file.replace(/\.jpe?g$/i, '-bin.png')));
  }
}
await worker.terminate();
const PASS = hits >= 3;
console.log(`\nFase H offline: ${hits}/${files.length} nomes reconhecidos (gate >=3/6 ${PASS ? 'PASSOU' : 'FALHOU'}; fecho >=4/6 ${hits >= 4 ? 'PASSOU' : 'FALHOU'})`);
process.exit(PASS ? 0 : 1);
