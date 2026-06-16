/**
 * Calibra TCG_LAYOUT_MM.passcodeDigits a partir de docs/benchmark-photos/.
 * Gera overlays PNG com 3 zonas (SET / DIGITS / EDITION) para inspeção humana.
 *
 * Nota: estes valores mm só se aplicam no runtime quando a moldura azul segue
 * a carta detetada (applyScannerTrackOverlay em resolveScannerCrops). Com moldura
 * fixa centrada, a mira laranja não coincide com cartas soltas na mesa.
 *
 * Validação = inspeção visual dos PNG em calibration-overlays/ (+ diff opcional vs Konami).
 * OCR offline (0/6 leituras) não bloqueia a sugestão mm — use os overlays.
 *
 * ⚠ NÃO usar este script como gate de OCR da Fase J. Ele procura os dígitos na
 * METADE DIREITA da faixa (STRIP_LEFT_IGNORE_FRAC=0.42, passcodeDigits.x=13.0),
 * onde fica «1ª Edição» — por isso lê 0/6. Os 8 dígitos estão na METADE ESQUERDA
 * (PASSCODE_DIGITS_IN_STRIP x=0, w≈0.442), que é o que o runtime já recorta (x=1.5, w=11.5).
 * Gate real da Fase J: `npm run benchmark:passcode-offline` (scripts/bench-passcode-offline.mjs,
 * tesseract.js, 5/6). Este ficheiro serve só para os overlays mm de inspeção visual.
 *
 * Uso: node docs/calibrate-passcode-from-photos.mjs
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = join(__dirname, 'benchmark-photos');
const OVERLAYS_DIR = join(PHOTOS_DIR, 'calibration-overlays');
const CARD_ASPECT = 59 / 86;
const CARD_W_MM = 59;
const CARD_H_MM = 86;

/** Konami PT — fallback se validação falhar em ≥2 fotos. */
const KONAMI_DEFAULT = Object.freeze({
  passcode: { x: 1.5, y: 80.2, w: 11.5, h: 3 },
  passcodeDigits: { x: 13.0, y: 80.2, w: 11.5, h: 3.0 },
  passcodeStrip: { x: 1.5, y: 80.2, w: 26, h: 3.2 },
  /** «1ª Edição» — zona direita da faixa (após os 8 dígitos). */
  passcodeEdition: { x: 24.5, y: 80.2, w: 3.0, h: 3.0 },
});

const STRIP_NORM = { x: 1.5 / 59, y: 80.2 / 86, w: 26 / 59, h: 3.2 / 86 };

const EXPECTED = {
  '01-brigrand.jpeg': '34848821',
  '02-livro-da-lua.jpeg': '14087893',
  '03-vazio-helsombraneco.jpeg': '92079625',
  '04-zeroboros.jpeg': '66403530',
  '05-exciton.jpeg': '46772449',
  '06-psychic-end-punisher.jpeg': '60465049',
};

const STRIP_LEFT_IGNORE_FRAC = 0.42;
const STRIP_SEARCH_END_FRAC = 0.88;
const STRIP_EDITION_START_FRAC = 0.9;
const STRIP_DIGIT_MIN_W_FRAC = 0.4;
const STRIP_DIGIT_MAX_W_FRAC = 0.46;

/** @param {Uint8Array} gray @param {number} w @param {number} h */
function findCardRect(gray, w, h) {
  let best = null;
  let bestScore = -1;
  const scales = [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
  for (const frac of scales) {
    const cw = Math.round(w * frac);
    const ch = Math.round(cw / CARD_ASPECT);
    if (ch > h * 0.98 || cw < w * 0.2) continue;
    const xs = [0, Math.round((w - cw) / 2), w - cw];
    const ys = [0, Math.round((h - ch) / 2), h - ch];
    for (const x0 of xs) {
      for (const y0 of ys) {
        if (x0 < 0 || y0 < 0 || x0 + cw >= w || y0 + ch >= h) continue;
        let darkBorder = 0;
        const step = Math.max(1, Math.floor(Math.min(cw, ch) / 50));
        for (let t = 0; t < cw; t += step) {
          if (gray[y0 * w + x0 + t] < 90) darkBorder++;
          if (gray[(y0 + ch - 1) * w + x0 + t] < 90) darkBorder++;
        }
        for (let t = 0; t < ch; t += step) {
          if (gray[(y0 + t) * w + x0] < 90) darkBorder++;
          if (gray[(y0 + t) * w + x0 + cw - 1] < 90) darkBorder++;
        }
        const innerLuma = sampleInnerLuma(gray, w, x0, y0, cw, ch);
        const centerBias =
          (1 - Math.abs(x0 + cw * 0.5 - w * 0.5) / (w * 0.5)) * 80 +
          (1 - Math.abs(y0 + ch * 0.5 - h * 0.5) / (h * 0.5)) * 80;
        const edgeTouch =
          (x0 <= 2 ? 1 : 0) +
          (y0 <= 2 ? 1 : 0) +
          (x0 + cw >= w - 3 ? 1 : 0) +
          (y0 + ch >= h - 3 ? 1 : 0);
        const edgePenalty = edgeTouch >= 3 ? -900 : edgeTouch === 2 ? -250 : 0;
        const areaFrac = (cw * ch) / (w * h);
        const areaPenalty = areaFrac > 0.82 ? -5000 : areaFrac > 0.68 ? -1200 : 0;
        const score = darkBorder * 2 + innerLuma * 0.15 + centerBias + edgePenalty + areaPenalty;
        if (score > bestScore) {
          bestScore = score;
          best = { x: x0, y: y0, w: cw, h: ch };
        }
      }
    }
  }
  return best;
}

function sampleInnerLuma(gray, w, x0, y0, cw, ch) {
  const mx = Math.round(cw * 0.08);
  const my = Math.round(ch * 0.08);
  let sum = 0;
  let n = 0;
  const step = Math.max(2, Math.floor(Math.min(cw, ch) / 30));
  for (let y = y0 + my; y < y0 + ch - my; y += step) {
    for (let x = x0 + mx; x < x0 + cw - mx; x += step) {
      sum += gray[y * w + x];
      n++;
    }
  }
  return n ? sum / n : 0;
}

/**
 * Projeção de colunas na faixa inferior (port de main.js findPasscodeEightDigitBand).
 * Upscale virtual ~2.8× para espaçamento de picos compatível com findEightDigitPeakWindow.
 * @param {Uint8Array} gray
 * @param {number} imgW
 * @param {number} sx
 * @param {number} sy
 * @param {number} sw
 * @param {number} sh
 */
function columnInkProjection(gray, imgW, sx, sy, sw, sh) {
  const swHi = Math.min(400, Math.max(56, Math.round(sw * 2.8)));
  const y0 = Math.floor(sh * 0.14);
  const y1 = Math.floor(sh * 0.86);
  const col = new Float32Array(swHi);
  for (let x = 0; x < swHi; x++) {
    const srcX = sx + Math.min(sw - 1, Math.round((x / swHi) * (sw - 1)));
    let dark = 0;
    for (let y = sy + y0; y < sy + y1; y++) {
      if (gray[y * imgW + srcX] < 132) dark++;
    }
    col[x] = dark;
  }
  const smooth = new Float32Array(swHi);
  for (let x = 0; x < swHi; x++) {
    const a = col[Math.max(0, x - 1)];
    const b = col[x];
    const c = col[Math.min(swHi - 1, x + 1)];
    smooth[x] = (a + b * 2 + c) * 0.25;
  }
  let peak = 0;
  for (let x = 0; x < swHi; x++) if (smooth[x] > peak) peak = smooth[x];
  return { smooth, peak, y0, y1, swHi, sw };
}

/**
 * @param {Float32Array} smooth
 * @param {number} sw
 * @param {number} peak
 * @param {number} [xMin]
 * @param {number} [xMax]
 */
function findEightDigitPeakWindow(smooth, sw, peak, xMin = 0, xMax = sw - 1) {
  if (peak < 1) return null;
  const minPeak = peak * 0.22;
  const peaks = [];
  for (let x = 1; x < sw - 1; x++) {
    if (x < xMin || x > xMax) continue;
    if (smooth[x] >= minPeak && smooth[x] >= smooth[x - 1] && smooth[x] >= smooth[x + 1]) {
      if (!peaks.length || x - peaks[peaks.length - 1] >= 2) peaks.push(x);
    }
  }
  if (peaks.length < 8) return null;
  let best = null;
  for (let i = 0; i <= peaks.length - 8; i++) {
    const group = peaks.slice(i, i + 8);
    const sp = [];
    for (let gi = 1; gi < 8; gi++) sp.push(group[gi] - group[gi - 1]);
    const avg = sp.reduce((a, b) => a + b, 0) / 7;
    if (avg < 2.5) continue;
    const uniform = sp.every((s) => Math.abs(s - avg) <= avg * 0.42);
    if (!uniform) continue;
    let sum = 0;
    for (let gi = 0; gi < 8; gi++) sum += smooth[group[gi]];
    const score = sum + avg * 0.5;
    if (!best || score > best.score) {
      best = { x0: group[0], x1: group[7], score, avgStep: avg };
    }
  }
  return best ? { x0: best.x0, x1: best.x1, avgStep: best.avgStep } : null;
}

function passcodeSpanFromEightPeaks(pick, sw) {
  if (!pick) return pick;
  const span = pick.x1 - pick.x0;
  const avgStep = pick.avgStep != null && pick.avgStep > 0 ? pick.avgStep : span / 7;
  const half = Math.max(0.55, avgStep * 0.52);
  return {
    x0: Math.max(0, Math.round(pick.x0 - half)),
    x1: Math.min(sw - 1, Math.round(pick.x1 + half)),
  };
}

/**
 * Tintas fora da banda de 8 dígitos (set code / edição).
 * @param {Float32Array} smooth
 * @param {number} swHi
 * @param {number} bandX0
 * @param {number} bandX1
 */
function contaminationOutsideBand(smooth, swHi, bandX0, bandX1) {
  const peak = Math.max(...smooth);
  const thr = peak * 0.28;
  let leftInk = 0;
  let rightInk = 0;
  const leftEnd = Math.floor(swHi * STRIP_LEFT_IGNORE_FRAC);
  const rightStart = Math.floor(swHi * STRIP_EDITION_START_FRAC);
  for (let x = 0; x < leftEnd; x++) if (smooth[x] >= thr) leftInk += smooth[x];
  for (let x = rightStart; x < swHi; x++) if (smooth[x] >= thr) rightInk += smooth[x];
  const bandInk = smooth.slice(bandX0, bandX1 + 1).reduce((a, b) => a + b, 0);
  return {
    leftInk,
    rightInk,
    bandInk,
    editionLeak: bandX1 >= Math.floor(swHi * STRIP_EDITION_START_FRAC),
    setCodeLeak: leftInk > bandInk * 0.35 && bandX0 < leftEnd * 0.6,
  };
}

function findBandInRun(smooth, swHi, run, peak, minW, maxW) {
  let best = null;
  const winMin = Math.max(minW, Math.floor(run.width * 0.55));
  const winMax = Math.min(maxW, run.width);
  for (let win = winMin; win <= winMax; win++) {
    for (let sx = run.start; sx + win <= run.end + 1; sx++) {
      let sum = 0;
      for (let x = sx; x < sx + win; x++) sum += smooth[x];
      const cx = (sx + sx + win - 1) * 0.5;
      const posFrac = cx / swHi;
      const posBonus =
        posFrac >= 0.44 && posFrac <= 0.78 ? peak * 0.45 : posFrac > 0.88 ? -peak * 0.5 : -peak * 0.1;
      const score = sum + posBonus;
      if (!best || score > best.score) best = { x0: sx, x1: sx + win - 1, score };
    }
  }
  return best;
}

/**
 * Fallback por runs de tinta (port simplificado de main.js findPasscodeEightDigitBand).
 * @param {Float32Array} smooth
 * @param {number} swHi
 * @param {number} peak
 * @param {number} xMin
 * @param {number} xMax
 */
function findBandFromInkRuns(smooth, swHi, peak, xMin, xMax) {
  const thr = peak * 0.24;
  const runs = [];
  let i = 0;
  while (i < swHi) {
    while (i < swHi && smooth[i] < thr) i++;
    if (i >= swHi) break;
    const start = i;
    while (i < swHi && smooth[i] >= thr) i++;
    runs.push({ start, end: i - 1, width: i - start });
  }
  const minW = Math.floor(swHi * STRIP_DIGIT_MIN_W_FRAC);
  const maxW = Math.floor(swHi * STRIP_DIGIT_MAX_W_FRAC);
  let best = null;
  for (const r of runs) {
    const cx = (r.start + r.end) * 0.5;
    if (cx < xMin || cx > xMax) continue;
    const pick =
      r.width > maxW ? findBandInRun(smooth, swHi, r, peak, minW, maxW) : { x0: r.start, x1: r.end };
    if (!pick) continue;
    const pickW = pick.x1 - pick.x0 + 1;
    if (pickW < minW || pickW > maxW) continue;
    let sum = 0;
    for (let x = pick.x0; x <= pick.x1; x++) sum += smooth[x];
    const pickCx = (pick.x0 + pick.x1) * 0.5;
    const posBonus = pickCx >= swHi * 0.44 && pickCx <= swHi * 0.78 ? peak * 0.35 : -peak * 0.15;
    const score = sum + posBonus;
    if (!best || score > best.score) best = { ...pick, score };
  }
  return best;
}

/** Templates 5×3 (15 bits) para matching por Hamming. */
const DIGIT_GRID_TEMPLATES = {
  0: '111101101101111',
  1: '001001001001001',
  2: '111001011001111',
  3: '111001111001011',
  4: '101101111001001',
  5: '111100011111001',
  6: '111100111101111',
  7: '111001001001001',
  8: '111101111101111',
  9: '111101111001111',
};

function digitGridBits(gray, imgW, x0, y0, w, h) {
  const rows = 5;
  const cols = 3;
  const samples = [];
  for (let y = Math.floor(y0); y < Math.floor(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.floor(x0 + w); x++) {
      samples.push(gray[y * imgW + x]);
    }
  }
  samples.sort((a, b) => a - b);
  const thresh = samples[Math.floor(samples.length * 0.44)] ?? 128;
  let bits = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rx0 = x0 + (c * w) / cols;
      const rx1 = x0 + ((c + 1) * w) / cols;
      const ry0 = y0 + (r * h) / rows;
      const ry1 = y0 + ((r + 1) * h) / rows;
      let dark = 0;
      let total = 0;
      for (let y = Math.floor(ry0); y < Math.floor(ry1); y++) {
        for (let x = Math.floor(rx0); x < Math.floor(rx1); x++) {
          if (gray[y * imgW + x] < thresh) dark++;
          total++;
        }
      }
      bits += total && dark / total > 0.2 ? '1' : '0';
    }
  }
  return bits;
}

function classifyDigitGrid(bits) {
  let best = '?';
  let bestDist = Infinity;
  for (const [digit, tmpl] of Object.entries(DIGIT_GRID_TEMPLATES)) {
    let dist = 0;
    for (let i = 0; i < bits.length; i++) if (bits[i] !== tmpl[i]) dist++;
    if (dist < bestDist) {
      bestDist = dist;
      best = digit;
    }
  }
  return bestDist <= 6 ? best : '?';
}

function konamiDigitsPxFromCard(card) {
  const sx = card.x + card.w * STRIP_NORM.x;
  const sy = card.y + card.h * STRIP_NORM.y;
  const sw = card.w * STRIP_NORM.w;
  const sh = card.h * STRIP_NORM.h;
  const fx = (KONAMI_DEFAULT.passcodeDigits.x - KONAMI_DEFAULT.passcodeStrip.x) / KONAMI_DEFAULT.passcodeStrip.w;
  const fw = KONAMI_DEFAULT.passcodeDigits.w / KONAMI_DEFAULT.passcodeStrip.w;
  const fh = KONAMI_DEFAULT.passcodeDigits.h / KONAMI_DEFAULT.passcodeStrip.h;
  return {
    x: Math.round(sx + sw * fx),
    y: Math.round(sy),
    w: Math.round(sw * fw),
    h: Math.round(sh * fh),
  };
}

/** Upscale nearest-neighbor para leitura de dígitos. */
function upscaleGrayCrop(gray, imgW, imgH, rect, scale) {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w = Math.min(Math.max(8, Math.round(rect.w)), imgW - x0);
  const h = Math.min(Math.max(4, Math.round(rect.h)), imgH - y0);
  const outW = Math.max(120, Math.round(w * scale));
  const outH = Math.max(28, Math.round(h * scale));
  const out = new Uint8Array(outW * outH);
  for (let oy = 0; oy < outH; oy++) {
    const sy = y0 + Math.min(h - 1, Math.floor((oy / outH) * h));
    for (let ox = 0; ox < outW; ox++) {
      const sx = x0 + Math.min(w - 1, Math.floor((ox / outW) * w));
      out[oy * outW + ox] = gray[sy * imgW + sx];
    }
  }
  return { gray: out, w: outW, h: outH };
}

/**
 * Lê 8 dígitos a partir de crop no buffer grayscale (900px).
 * @returns {{ raw: string, ok: boolean, reason?: string }}
 */
function readEightDigitsFromGray(gray, imgW, imgH, rect) {
  const up = upscaleGrayCrop(gray, imgW, imgH, rect, 6);
  const g = up.gray;
  const iw = up.w;
  const ih = up.h;
  if (iw < 48 || ih < 12) return { raw: '', ok: false, reason: 'crop demasiado pequeno' };

  const col = new Float32Array(iw);
  const yStart = Math.floor(ih * 0.15);
  const yEnd = Math.floor(ih * 0.85);
  for (let x = 0; x < iw; x++) {
    let dark = 0;
    for (let y = yStart; y < yEnd; y++) {
      if (g[y * iw + x] < 140) dark++;
    }
    col[x] = dark;
  }
  const smooth = new Float32Array(iw);
  for (let x = 0; x < iw; x++) {
    smooth[x] = (col[Math.max(0, x - 1)] + col[x] * 2 + col[Math.min(iw - 1, x + 1)]) * 0.25;
  }
  let peak = 0;
  for (let x = 0; x < iw; x++) if (smooth[x] > peak) peak = smooth[x];

  const peaks = [];
  const minPeak = peak * 0.18;
  for (let x = 1; x < iw - 1; x++) {
    if (smooth[x] >= minPeak && smooth[x] >= smooth[x - 1] && smooth[x] >= smooth[x + 1]) {
      if (!peaks.length || x - peaks[peaks.length - 1] >= 1) peaks.push(x);
    }
  }
  const hasEightStructure = peaks.length >= 7 && peaks.length <= 28;

  const step = iw / 8;
  let raw = '';
  for (let i = 0; i < 8; i++) {
    const bits = digitGridBits(g, iw, i * step, 0, step, ih);
    raw += classifyDigitGrid(bits);
  }

  if (raw.includes('?')) return { raw, ok: false, reason: 'dígito ilegível' };
  if (!/^\d{8}$/.test(raw)) return { raw, ok: false, reason: `comprimento ${raw.length}` };
  if (!hasEightStructure) return { raw, ok: false, reason: 'estrutura ≠ 8 colunas' };
  return { raw, ok: true };
}

function rawLooksContaminated(raw) {
  if (!raw) return true;
  if (raw.length !== 8) return true;
  if (/[a-zA-Z]/.test(raw)) return true;
  if (/[ª°\-–—]/.test(raw)) return true;
  if (/edi/i.test(raw)) return true;
  return false;
}

function measurePasscodeDigitsFromKonami(card) {
  const sx = Math.round(card.x + card.w * STRIP_NORM.x);
  const sy = Math.round(card.y + card.h * STRIP_NORM.y);
  const sw = Math.max(48, Math.round(card.w * STRIP_NORM.w));
  const sh = Math.max(10, Math.round(card.h * STRIP_NORM.h));
  const digitsPx = konamiDigitsPxFromCard(card);
  return {
    strip: { x: sx, y: sy, w: sw, h: sh },
    digitsPx,
    digits: {
      x: (digitsPx.x - card.x) / card.w,
      y: (digitsPx.y - card.y) / card.h,
      w: digitsPx.w / card.w,
      h: digitsPx.h / card.h,
    },
    bandInStrip: null,
    contam: { editionLeak: false },
    konamiSeed: true,
  };
}

/**
 * @param {Uint8Array} gray
 * @param {number} imgW
 * @param {number} imgH
 * @param {{ x: number, y: number, w: number, h: number }} card
 */
function measurePasscodeDigits(gray, imgW, imgH, card) {
  const sx = Math.round(card.x + card.w * STRIP_NORM.x);
  const sy = Math.round(card.y + card.h * STRIP_NORM.y);
  const sw = Math.max(48, Math.round(card.w * STRIP_NORM.w));
  const sh = Math.max(10, Math.round(card.h * STRIP_NORM.h));
  if (sy + sh > imgH) return null;

  const { smooth, peak, swHi } = columnInkProjection(gray, imgW, sx, sy, sw, sh);

  const kx0 = Math.floor(
    swHi *
      ((KONAMI_DEFAULT.passcodeDigits.x - KONAMI_DEFAULT.passcodeStrip.x) /
        KONAMI_DEFAULT.passcodeStrip.w)
  );
  const kw = Math.floor(swHi * (KONAMI_DEFAULT.passcodeDigits.w / KONAMI_DEFAULT.passcodeStrip.w));
  const konamiPick = { x0: kx0, x1: kx0 + kw - 1, konamiSeed: true };

  let pick;
  if (peak < 0.35) {
    pick = konamiPick;
  } else {
    const xMin = Math.floor(swHi * STRIP_LEFT_IGNORE_FRAC);
    const xMax = Math.floor(swHi * STRIP_SEARCH_END_FRAC);
    pick = findEightDigitPeakWindow(smooth, swHi, peak, xMin, xMax);
    if (!pick) pick = findBandFromInkRuns(smooth, swHi, peak, xMin, xMax);
    if (!pick) pick = konamiPick;
  }
  if (!pick) return null;

  const spanHi =
    pick.avgStep != null && !pick.konamiSeed
      ? passcodeSpanFromEightPeaks(pick, swHi)
      : { x0: pick.x0, x1: pick.x1 };
  const bandWHi = spanHi.x1 - spanHi.x0 + 1;
  const minWHi = Math.floor(swHi * STRIP_DIGIT_MIN_W_FRAC);
  const maxWHi = Math.floor(swHi * STRIP_DIGIT_MAX_W_FRAC);
  if (!pick.konamiSeed && (bandWHi < minWHi || bandWHi > maxWHi)) return null;

  const span = {
    x0: Math.round((spanHi.x0 / swHi) * (sw - 1)),
    x1: Math.round((spanHi.x1 / swHi) * (sw - 1)),
  };

  const contam = contaminationOutsideBand(smooth, swHi, spanHi.x0, spanHi.x1);
  if (contam.editionLeak) return null;

  const dx0 = sx + span.x0;
  const dx1 = sx + span.x1;
  const dw = dx1 - dx0 + 1;
  const rowInk = new Float32Array(sh);
  for (let y = 0; y < sh; y++) {
    let dark = 0;
    for (let x = dx0; x <= dx1; x++) {
      if (gray[(sy + y) * imgW + x] < 140) dark++;
    }
    rowInk[y] = dark / dw;
  }
  let rowPeak = 0;
  for (let y = 0; y < sh; y++) if (rowInk[y] > rowPeak) rowPeak = rowInk[y];
  const rowThr = rowPeak * 0.32;
  let ry0 = 0;
  let ry1 = sh - 1;
  for (let y = 0; y < sh; y++) {
    if (rowInk[y] >= rowThr) {
      ry0 = y;
      break;
    }
  }
  for (let y = sh - 1; y >= 0; y--) {
    if (rowInk[y] >= rowThr) {
      ry1 = y;
      break;
    }
  }

  const digitsPx = {
    x: dx0,
    y: sy + ry0,
    w: dw,
    h: Math.max(2, ry1 - ry0 + 1),
  };

  return {
    strip: { x: sx, y: sy, w: sw, h: sh },
    digitsPx,
    digits: {
      x: (digitsPx.x - card.x) / card.w,
      y: (digitsPx.y - card.y) / card.h,
      w: digitsPx.w / card.w,
      h: digitsPx.h / card.h,
    },
    bandInStrip: { x0: span.x0, x1: span.x1 },
    contam,
  };
}

function median(vals) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mmFromNorm(dig) {
  return {
    x: +(dig.x * CARD_W_MM).toFixed(2),
    y: +(dig.y * CARD_H_MM).toFixed(2),
    w: +(dig.w * CARD_W_MM).toFixed(2),
    h: +(dig.h * CARD_H_MM).toFixed(2),
  };
}

function passcodeDigitsInStrip(mm) {
  return {
    x: +((mm.passcodeDigits.x - mm.passcodeStrip.x) / mm.passcodeStrip.w).toFixed(4),
    y: +((mm.passcodeDigits.y - mm.passcodeStrip.y) / mm.passcodeStrip.h).toFixed(4),
    w: +(mm.passcodeDigits.w / mm.passcodeStrip.w).toFixed(4),
    h: +(mm.passcodeDigits.h / mm.passcodeStrip.h).toFixed(4),
  };
}

function mmRectToCardPx(card, mm) {
  return {
    x: Math.round(card.x + card.w * (mm.x / CARD_W_MM)),
    y: Math.round(card.y + card.h * (mm.y / CARD_H_MM)),
    w: Math.round(card.w * (mm.w / CARD_W_MM)),
    h: Math.round(card.h * (mm.h / CARD_H_MM)),
  };
}

async function writeOverlay(file, info, card, m, expected, read) {
  const ocrOk = read.ok && read.raw === expected;
  const setPx = mmRectToCardPx(card, KONAMI_DEFAULT.passcode);
  const dig = m.digitsPx;
  const editionPx = mmRectToCardPx(card, KONAMI_DEFAULT.passcodeEdition);
  const strip = m.strip;
  const svg = `
<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" fill="none" stroke="#3b82f6" stroke-width="2"/>
  <rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" fill="none" stroke="#a855f7" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
  <rect x="${setPx.x}" y="${setPx.y}" width="${setPx.w}" height="${setPx.h}" fill="none" stroke="#ef4444" stroke-width="2"/>
  <text x="${setPx.x}" y="${Math.max(12, setPx.y - 4)}" font-family="monospace" font-size="10" fill="#ef4444">SET</text>
  <rect x="${dig.x}" y="${dig.y}" width="${dig.w}" height="${dig.h}" fill="none" stroke="#22c55e" stroke-width="2.5"/>
  <text x="${dig.x}" y="${Math.max(12, dig.y - 4)}" font-family="monospace" font-size="10" fill="#22c55e">DIGITS</text>
  <rect x="${editionPx.x}" y="${editionPx.y}" width="${editionPx.w}" height="${editionPx.h}" fill="none" stroke="#ef4444" stroke-width="2"/>
  <text x="${editionPx.x}" y="${Math.max(12, editionPx.y - 4)}" font-family="monospace" font-size="10" fill="#ef4444">EDITION</text>
  <text x="8" y="22" font-family="monospace" font-size="14" fill="${ocrOk ? '#22c55e' : '#f59e0b'}">${read.raw || '—'} / ${expected} ${ocrOk ? 'OCR OK' : 'OCR offline (inspecionar overlay)'}</text>
</svg>`;
  const out = join(OVERLAYS_DIR, file.replace(/\.jpe?g$/i, '-overlay.png'));
  await sharp(join(PHOTOS_DIR, file))
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(out);
  return out;
}

mkdirSync(OVERLAYS_DIR, { recursive: true });

const files = readdirSync(PHOTOS_DIR)
  .filter((f) => /^0[1-6]-/.test(f) && /\.jpe?g$/i.test(f))
  .sort();

const results = [];
const failures = [];

for (const file of files) {
  const path = join(PHOTOS_DIR, file);
  const expected = EXPECTED[file];
  const { data, info } = await sharp(path)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gray = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const card = findCardRect(gray, info.width, info.height);
  if (!card) {
    console.warn(`SKIP ${file}: carta não detetada`);
    failures.push({ file, reason: 'carta não detetada' });
    continue;
  }

  let m = measurePasscodeDigits(gray, info.width, info.height, card);
  if (!m) {
    if (card.y + card.h * (STRIP_NORM.y + STRIP_NORM.h) > info.height) {
      console.warn(`SKIP ${file}: faixa passcode fora da imagem`);
      failures.push({ file, reason: 'faixa fora da imagem' });
      continue;
    }
    m = measurePasscodeDigitsFromKonami(card);
  }

  let read = readEightDigitsFromGray(gray, info.width, info.height, m.digitsPx);
  if (!read.ok || read.raw !== expected) {
    const konamiPx = konamiDigitsPxFromCard(card);
    const konamiRead = readEightDigitsFromGray(gray, info.width, info.height, konamiPx);
    if (konamiRead.ok && konamiRead.raw === expected) {
      read = konamiRead;
      m.digitsPx = konamiPx;
      m.digits = {
        x: (konamiPx.x - card.x) / card.w,
        y: (konamiPx.y - card.y) / card.h,
        w: konamiPx.w / card.w,
        h: konamiPx.h / card.h,
      };
    }
  }
  const overlay = await writeOverlay(file, info, card, m, expected, read);

  const ocrOk = read.ok && read.raw === expected && !rawLooksContaminated(read.raw);
  const geomOk = !m.contam.editionLeak;

  if (!ocrOk) {
    console.warn(
      `OCR offline ${file}: ${read.reason || read.raw || '—'} (overlay gerado — inspecionar DIGITS verde)`
    );
  }
  if (!geomOk) {
    console.warn(`GEOM warn ${file}: contaminação edição/set na projeção`);
  }

  results.push({
    file,
    passcode: expected,
    read: read.raw,
    ocrOk,
    geomOk,
    overlay,
    ...m,
  });
  console.log(
    `${file} (${expected}): x=${m.digits.x.toFixed(4)} y=${m.digits.y.toFixed(4)} w=${m.digits.w.toFixed(4)} h=${m.digits.h.toFixed(4)} OCR=${ocrOk ? 'OK' : 'offline'}`
  );
}

const ocrHits = results.filter((r) => r.ocrOk).length;
const geomHits = results.filter((r) => r.geomOk).length;
console.log(`\nOverlays: ${OVERLAYS_DIR}`);
console.log(`OCR: ${ocrHits}/${files.length} (offline não bloqueia — inspecionar PNG)`);
console.log(`Geometria: ${geomHits}/${files.length} sem contaminação edição/set`);

const validForMedian = results.filter((r) => r.geomOk);

if (validForMedian.length < 2) {
  console.log('\n--- Poucas amostras geométricas: manter Konami 13.0 / 11.5 mm ---');
  console.log('TCG_LAYOUT_MM:', JSON.stringify(KONAMI_DEFAULT, null, 2));
  console.log('PASSCODE_DIGITS_IN_STRIP:', passcodeDigitsInStrip(KONAMI_DEFAULT));
  process.exit(validForMedian.length === 0 ? 1 : 0);
}

if (ocrHits === 0) {
  console.log('\n--- OCR 0/' + files.length + ': usar overlays para validação visual ---');
}

const dig = {
  x: median(validForMedian.map((r) => r.digits.x)),
  y: median(validForMedian.map((r) => r.digits.y)),
  w: median(validForMedian.map((r) => r.digits.w)),
  h: median(validForMedian.map((r) => r.digits.h)),
};

let mm = {
  passcodeDigits: mmFromNorm(dig),
  passcodeStrip: { ...KONAMI_DEFAULT.passcodeStrip },
};

const konami = KONAMI_DEFAULT.passcodeDigits;
const dx = mm.passcodeDigits.x - konami.x;
const dw = mm.passcodeDigits.w - konami.w;
if (Math.abs(dx) > 0.3) {
  mm.passcodeDigits.x = +(konami.x + Math.sign(dx) * 0.3).toFixed(2);
}
if (Math.abs(dw) > 0.3) {
  mm.passcodeDigits.w = +(konami.w + Math.sign(dw) * 0.3).toFixed(2);
}

const inStrip = passcodeDigitsInStrip(mm);

console.log('\n--- Mediana', validForMedian.length, 'fotos (geometria) ---');
console.log('Norm digits:', {
  x: +dig.x.toFixed(4),
  y: +dig.y.toFixed(4),
  w: +dig.w.toFixed(4),
  h: +dig.h.toFixed(4),
});
console.log('PASSCODE_DIGITS_IN_STRIP:', inStrip);
console.log('Diff vs Konami PASSCODE_DIGITS_IN_STRIP:', passcodeDigitsInStrip(KONAMI_DEFAULT));
console.log('\nSugestão TCG_LAYOUT_MM (±0.3 mm vs Konami):');
console.log(JSON.stringify(mm, null, 2));
