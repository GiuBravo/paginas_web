/**
 * Offline benchmark da Fase J (passcode 8 dígitos) nas 6 fotos de docs/benchmark-photos/.
 *
 * Espelha o runtime: os 8 dígitos ficam na METADE ESQUERDA da faixa inferior
 * (x frac 0..0.442 = PASSCODE_DIGITS_IN_STRIP). «1ª Edição» fica à direita; o set code
 * está abaixo da arte (fora desta faixa). A calibração antiga procurava na metade
 * direita (errado) → 0/6.
 *
 * Engine: tesseract.js (mesmo do runtime), whitelist 0-9, várias variantes de
 * binarização + PSM, candidatos unidos via extractYuGiOhPasscodeCandidates (como o
 * sidecar acumula entre frames). Gate Fase J: >= 2/6 (fecho >= 4/6).
 *
 * Requer eng.traineddata em .tess-lang/ (gzip ou raw). Ver docs/SCANNER_BENCHMARK.md.
 *
 * Uso: node scripts/bench-passcode-offline.mjs [--debug]
 */
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, '..', 'docs', 'benchmark-photos');
const DEBUG_DIR = join(PHOTOS_DIR, '_passcode-debug');
const CARD_ASPECT = 59 / 86;
const DEBUG = process.argv.includes('--debug');

const EXPECTED = {
  '01-brigrand.jpeg': '34848821',
  '02-livro-da-lua.jpeg': '14087893',
  '03-vazio-helsombraneco.jpeg': '92079625',
  '04-zeroboros.jpeg': '66403530',
  '05-exciton.jpeg': '46772449',
  '06-psychic-end-punisher.jpeg': '60465049',
};

const STRIP = { x: 1.5 / 59, y: 80.2 / 86, w: 26 / 59, h: 3.2 / 86 };
const DIGITS_W_FRAC = 11.5 / 26;

/**
 * Rects medidos à mão (frame 900-wide, RGB cru) da faixa dos 8 dígitos por foto-fixture.
 * As fotos contêm cartas vizinhas e sombras → deteção automática não é fiável e não é
 * representativa do runtime (que usa warp do vídeo). Aqui isolamos a leitura dos dígitos.
 * [left, top, width, height]
 */
const FIXED_DIGIT_RECTS = {
  '01-brigrand.jpeg': [114, 1213, 104, 28],
  '02-livro-da-lua.jpeg': [151, 1211, 98, 28],
  '03-vazio-helsombraneco.jpeg': [100, 1197, 110, 28],
  '04-zeroboros.jpeg': [133, 1258, 108, 28],
  '05-exciton.jpeg': [118, 1168, 104, 28],
  '06-psychic-end-punisher.jpeg': [131, 1267, 110, 28],
};

function widestRun(arr, need) {
  let bestS = -1, bestE = -1, bestLen = 0, s = -1;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= need) { if (s < 0) s = i; }
    else if (s >= 0) { if (i - s > bestLen) { bestLen = i - s; bestS = s; bestE = i - 1; } s = -1; }
  }
  if (s >= 0 && arr.length - s > bestLen) { bestS = s; bestE = arr.length - 1; }
  return bestS < 0 ? null : { start: bestS, end: bestE };
}

function detectCard(rgb, w, h) {
  const sz = Math.floor(Math.min(w, h) * 0.08);
  const corner = (cx, cy) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = cy; y < cy + sz; y++)
      for (let x = cx; x < cx + sz; x++) { const i = (y * w + x) * 3; r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2]; n++; }
    return [r / n, g / n, b / n];
  };
  const corners = [corner(0, h - sz), corner(w - sz, h - sz)];
  const wood = [0, 1, 2].map((k) => corners.reduce((a, c) => a + c[k], 0) / corners.length);
  const colMask = new Float32Array(w);
  const rowMask = new Float32Array(h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const dr = rgb[i] - wood[0], dg = rgb[i + 1] - wood[1], db = rgb[i + 2] - wood[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) > 52) { colMask[x] += 1; rowMask[y] += 1; }
    }
  const colRun = widestRun(colMask, h * 0.30);
  const rowRun = widestRun(rowMask, w * 0.30);
  if (!colRun || !rowRun) return null;
  const left = colRun.start, cw = colRun.end - colRun.start + 1, top = rowRun.start;
  return { x: left, y: top, w: cw, h: Math.round(cw / CARD_ASPECT), wood };
}

/** Otsu sobre luminância (port otsuThresholdFromLum). */
function otsuFromLum(lum) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) hist[Math.max(0, Math.min(255, Math.round(lum[i])))]++;
  const total = lum.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thr = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; thr = i; }
  }
  return thr;
}

/** Binariza darkOnLight (port binarizePasscodeCrop). Devolve Uint8 1ch (0/255). */
function binarizeDarkOnLight(rgb, w, h) {
  const n = w * h;
  const lum = new Float32Array(n);
  let sum = 0;
  for (let p = 0, i = 0; p < n; p++, i += 3) {
    const L = 0.299 * rgb[i] + 0.587 * rgb[i + 1] + 0.114 * rgb[i + 2];
    lum[p] = L; sum += L;
  }
  const otsu = otsuFromLum(lum);
  const mean = sum / n;
  const thresh = Math.max(40, Math.min(220, Math.round(otsu * 0.92 + mean * 0.08 - 6)));
  const out = Buffer.alloc(n);
  for (let p = 0; p < n; p++) out[p] = lum[p] < thresh ? 0 : 255;
  return out;
}

// --- candidatos (port de scoreYuGiOhPasscodeCandidate / extractYuGiOhPasscodeCandidates) ---
function scoreCand(eight, runLen = 8) {
  if (!/^\d{8}$/.test(eight)) return -1;
  if (/^(\d)\1{7}$/.test(eight)) return -1;
  let score = 40 + new Set(eight.split('')).size * 5;
  if (runLen === 8) score += 18; else if (runLen === 9) score += 8; else if (runLen === 10) score += 4; else if (runLen > 10) score -= 22;
  if (/1{4,}/.test(eight)) score -= 28;
  if (/1{3,}/.test(eight)) score -= 18;
  if (eight.startsWith('07') && /1{2,}/.test(eight.slice(2))) score -= 24;
  if (eight.startsWith('00') && new Set(eight.split('')).size < 4) score -= 8;
  return score;
}
function extractCandidates(raw) {
  if (!raw) return [];
  const ranked = [], seen = new Set();
  const add = (s, runLen = 8, bonus = 0) => {
    if (!s || s.length !== 8 || !/^\d{8}$/.test(s) || seen.has(s)) return;
    seen.add(s);
    const sc = scoreCand(s, runLen) + bonus;
    if (sc >= 0) ranked.push({ id: s, score: sc });
  };
  const digits = String(raw).replace(/\D/g, '');
  for (const c of String(raw).match(/\d{8}/g) || []) add(c, 8, 12);
  if (digits.length === 8) add(digits, 8, 14);
  if (digits.length > 8 && digits.length <= 11) add(digits.slice(0, 8), digits.length, -4);
  if (digits.length > 8) {
    const sb = digits.length > 14 ? -18 : digits.length > 11 ? -10 : 0;
    for (let i = 0; i <= digits.length - 8; i++) add(digits.slice(i, i + 8), digits.length, sb);
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 5).map((r) => r.id);
}

/** Remove pixels isolados (port despecklePasscodeBinary). bin: 0=tinta,255=fundo. */
function despeckle(bin, w, h) {
  const out = Buffer.from(bin);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const dark = bin[p] < 128;
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (bin[(y + dy) * w + (x + dx)] < 128) nb++;
      }
      out[p] = dark ? (nb >= 2 ? 0 : 255) : nb <= 5 ? 255 : 0;
    }
  return out;
}

mkdirSync(DEBUG_DIR, { recursive: true });
const files = readdirSync(PHOTOS_DIR).filter((f) => /^0[1-6]-/.test(f) && /\.jpe?g$/i.test(f)).sort();

const LANG_PATH = join(__dirname, '..', '.tess-lang');
const gzip = existsSync(join(LANG_PATH, 'eng.traineddata.gz')) && !existsSync(join(LANG_PATH, 'eng.traineddata'));
if (!existsSync(join(LANG_PATH, 'eng.traineddata')) && !existsSync(join(LANG_PATH, 'eng.traineddata.gz'))) {
  console.error('Falta eng.traineddata em .tess-lang/. Ver docs/SCANNER_BENCHMARK.md (Fase J offline).');
  process.exit(2);
}
const { createWorker } = await import('tesseract.js');
const worker = await createWorker({ langPath: LANG_PATH, gzip });
await worker.loadLanguage('eng');
await worker.initialize('eng');

let hits = 0;
const rows = [];
for (const file of files) {
  const path = join(PHOTOS_DIR, file);
  const expected = EXPECTED[file];
  const base = sharp(path).rotate().resize({ width: 900, withoutEnlargement: true });
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const rgb = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let left, top, width, height;
  if (FIXED_DIGIT_RECTS[file]) {
    [left, top, width, height] = FIXED_DIGIT_RECTS[file];
  } else {
    const card = detectCard(rgb, info.width, info.height);
    if (!card) { console.log(`${file}: no card`); rows.push({ file, expected, read: '(no card)', ok: false }); continue; }
    const sx = Math.round(card.x + card.w * STRIP.x);
    const sy = Math.round(card.y + card.h * STRIP.y);
    const sw = Math.round(card.w * STRIP.w * DIGITS_W_FRAC);
    const sh = Math.round(card.h * STRIP.h);
    left = Math.max(0, Math.min(info.width - 9, sx)); top = Math.max(0, Math.min(info.height - 7, sy));
    width = Math.max(8, Math.min(info.width - left, sw)); height = Math.max(6, Math.min(info.height - top, sh));
  }
  if (DEBUG) console.error(`  ${file} strip=[${left},${top},${width},${height}] img=${info.width}x${info.height}`);

  // recorta directamente do RGB cru (evita ambiguidade extract+resize do sharp)
  const sub = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const si = ((top + y) * info.width + (left + x)) * 3;
      const di = (y * width + x) * 3;
      sub[di] = rgb[si]; sub[di + 1] = rgb[si + 1]; sub[di + 2] = rgb[si + 2];
    }
  const UP = 6;
  const cw = width * UP, ch = height * UP;
  const cropRaw = await sharp(sub, { raw: { width, height, channels: 3 } })
    .resize({ width: cw, height: ch, kernel: 'cubic' }).raw().toBuffer();
  const cropArr = new Uint8Array(cropRaw.buffer, cropRaw.byteOffset, cropRaw.byteLength);
  let bin = binarizeDarkOnLight(cropArr, cw, ch);
  bin = despeckle(bin, cw, ch);

  // binarização adaptativa (mean-C) — melhor para fundo foil irregular (Brigrand)
  const adaptive = (() => {
    const n = cw * ch;
    const lum = new Float32Array(n);
    for (let p = 0, i = 0; p < n; p++, i += 3) lum[p] = 0.299 * cropArr[i] + 0.587 * cropArr[i + 1] + 0.114 * cropArr[i + 2];
    // box blur (integral image) janela ~ altura do glifo
    const ii = new Float64Array((cw + 1) * (ch + 1));
    for (let y = 0; y < ch; y++) { let rs = 0; for (let x = 0; x < cw; x++) { rs += lum[y * cw + x]; ii[(y + 1) * (cw + 1) + (x + 1)] = ii[y * (cw + 1) + (x + 1)] + rs; } }
    const r = Math.max(6, Math.round(ch * 0.5));
    const out = Buffer.alloc(n);
    const C = 8;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(cw - 1, x + r), y1 = Math.min(ch - 1, y + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s = ii[(y1 + 1) * (cw + 1) + (x1 + 1)] - ii[(y0) * (cw + 1) + (x1 + 1)] - ii[(y1 + 1) * (cw + 1) + (x0)] + ii[(y0) * (cw + 1) + (x0)];
      const mean = s / area;
      out[y * cw + x] = lum[y * cw + x] < mean - C ? 0 : 255;
    }
    return out;
  })();

  let raw, cands, conf = 0;
  {
    // trim de linhas de borda quase-cheias (topo/fundo) no binário
    const rowBlack = new Float32Array(ch);
    for (let y = 0; y < ch; y++) { let c = 0; for (let x = 0; x < cw; x++) if (bin[y * cw + x] < 128) c++; rowBlack[y] = c / cw; }
    let ty = 0, by = ch - 1;
    while (ty < ch && rowBlack[ty] > 0.55) ty++;
    while (by > ty && rowBlack[by] > 0.55) by--;
    const th2 = by - ty + 1;
    const trimmed = Buffer.alloc(cw * th2);
    for (let y = 0; y < th2; y++) bin.copy(trimmed, y * cw, (ty + y) * cw, (ty + y + 1) * cw);

    const PAD = 30;
    const variants = [];
    // V1: grayscale + sharpen (sem normalize)
    variants.push(await sharp(sub, { raw: { width, height, channels: 3 } })
      .resize({ width: cw, height: ch, kernel: 'cubic' }).grayscale().sharpen()
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());
    // V2: grayscale + linear contraste
    variants.push(await sharp(sub, { raw: { width, height, channels: 3 } })
      .resize({ width: cw, height: ch, kernel: 'cubic' }).grayscale().linear(1.6, -40).sharpen()
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());
    // V3: binarizado trimmed
    variants.push(await sharp(trimmed, { raw: { width: cw, height: th2, channels: 1 } })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());
    // V4: binarizado trimmed dilatado (engrossa dígitos finos como "1")
    variants.push(await sharp(trimmed, { raw: { width: cw, height: th2, channels: 1 } })
      .median(3)
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());
    // V5: grayscale threshold duro
    variants.push(await sharp(sub, { raw: { width, height, channels: 3 } })
      .resize({ width: cw, height: ch, kernel: 'cubic' }).grayscale().threshold(110)
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());
    // V6: binarização adaptativa mean-C (foil irregular)
    variants.push(await sharp(adaptive, { raw: { width: cw, height: ch, channels: 1 } })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 255, g: 255, b: 255 } })
      .withMetadata({ density: 300 }).png().toBuffer());

    const all = new Set();
    let bestRaw = '', bestConf = 0;
    for (let psm of ['7', '6', '8', '13']) {
      await worker.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: psm });
      for (const v of variants) {
        const { data: ocr } = await worker.recognize(v);
        const r = String(ocr.text || '').replace(/\s+/g, '');
        for (const c of extractCandidates(r)) all.add(c);
        if ((ocr.confidence || 0) > bestConf) { bestConf = ocr.confidence || 0; bestRaw = r; }
      }
    }
    raw = bestRaw;
    conf = Math.round(bestConf);
    cands = [...all];
    if (DEBUG) await sharp(variants[2]).toFile(join(DEBUG_DIR, file.replace(/\.jpe?g$/i, '-gray.png')));
  }
  const ok = cands.includes(expected) || raw === expected;
  if (ok) hits++;
  rows.push({ file, expected, read: raw, cands: cands.join(','), conf, ok });
  console.log(`${file} (${expected}): raw="${raw}" ${conf ? 'conf=' + conf + ' ' : ''}cands=[${cands.join(',')}] ${ok ? 'OK' : 'x'}`);

  if (DEBUG) {
    await sharp(bin, { raw: { width: cw, height: ch, channels: 1 } }).png().toFile(join(DEBUG_DIR, file.replace(/\.jpe?g$/i, '-bin.png')));
  }
}
await worker.terminate();
const PASS = hits >= 2;
console.log(`\nFase J offline: ${hits}/${files.length} candidatos correctos (gate >=2/6 ${PASS ? 'PASSOU' : 'FALHOU'}; fecho >=4/6)`);
process.exit(PASS ? 0 : 1);
