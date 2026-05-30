/**
 * Deteção leve de carta (contornos / projeções) + suavização temporal + regiões TCG.
 * Sem YOLO — pensado para browser mobile com fallback às miras CSS fixas.
 */

/** Proporção largura/altura carta Yu-Gi-Oh! (59×86 mm). */
export const TCG_ASPECT = 59 / 86;

/** Canvas canónico retificado (warp OCR). */
export const CANONICAL_CARD_W = 590;
export const CANONICAL_CARD_H = 860;

/** Regiões normalizadas na carta (0–1), alinhadas com o scanner CSS. */
export const TCG_REGIONS = Object.freeze({
  name: { x: 0.04, y: 0.042, w: 0.78, h: 0.066 },
  nameHandFree: { x: 0.035, y: 0.038, w: 0.82, h: 0.075 },
  passcode: { x: 0.025, y: 0.934, w: 0.19, h: 0.034 },
  typeFrame: { x: 0, y: 0, w: 1, h: 1 },
});

const DETECT_MAX_W = 200;
const SMOOTH_ALPHA = 0.42;
const HISTORY_MAX = 8;
const LOCK_DEFAULT_MS = 1800;

/** @type {{ x: number, y: number, w: number, h: number, conf: number }|null} */
let smoothedRect = null;
/** @type {Array<{ cx: number, cy: number, w: number, h: number }>} */
const rectHistory = [];
let lockUntil = 0;
/** @type {{ x: number, y: number, w: number, h: number, conf: number }|null} */
let lockedRect = null;

let detectCanvas = null;
let detectCtx = null;

/**
 * @returns {void}
 */
export function resetCardTrackState() {
  smoothedRect = null;
  rectHistory.length = 0;
  lockUntil = 0;
  lockedRect = null;
}

/**
 * @param {boolean} on
 * @param {number} [durationMs]
 * @returns {void}
 */
export function setCardTrackLock(on, durationMs = LOCK_DEFAULT_MS) {
  if (on && smoothedRect) {
    lockedRect = { ...smoothedRect };
    lockUntil = Date.now() + durationMs;
  } else {
    lockUntil = 0;
    lockedRect = null;
  }
}

/** @returns {boolean} */
export function isCardTrackLocked() {
  return Date.now() < lockUntil && !!lockedRect;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, w: number, h: number }}
 */
function ensureDetectCanvas(canvas) {
  if (!detectCanvas) {
    detectCanvas = canvas || document.createElement('canvas');
    detectCtx = detectCanvas.getContext('2d', { willReadFrequently: true });
  }
  return { ctx: detectCtx, w: detectCanvas.width, h: detectCanvas.height };
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {Float32Array}
 */
function grayscaleFromRgba(data, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return g;
}

/**
 * @param {Float32Array} gray
 * @param {number} w
 * @param {number} h
 * @returns {Float32Array}
 */
function sobelMagnitude(gray, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] +
        gray[i - w + 1] -
        2 * gray[i - 1] +
        2 * gray[i + 1] -
        gray[i + w - 1] +
        gray[i + w + 1];
      const gy =
        -gray[i - w - 1] -
        2 * gray[i - w] -
        gray[i - w + 1] +
        gray[i + w - 1] +
        2 * gray[i + w] +
        gray[i + w + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/**
 * @param {Float32Array} edges
 * @param {number} w
 * @param {number} h
 * @returns {{ x: number, y: number, w: number, h: number, score: number }|null}
 */
function findCardRectFromEdges(edges, w, h) {
  const margin = Math.floor(Math.min(w, h) * 0.06);
  const x0 = margin;
  const x1 = w - margin;
  const y0 = margin;
  const y1 = h - margin;

  const rowSum = new Float32Array(h);
  const colSum = new Float32Array(w);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = edges[y * w + x];
      rowSum[y] += v;
      colSum[x] += v;
    }
  }

  let thresh = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      thresh += edges[y * w + x];
      count++;
    }
  }
  thresh = (thresh / Math.max(1, count)) * 1.35;

  const rowActive = (y) => rowSum[y] > thresh * (x1 - x0) * 0.22;
  const colActive = (x) => colSum[x] > thresh * (y1 - y0) * 0.18;

  let top = -1;
  let bottom = -1;
  for (let y = y0; y < y1; y++) {
    if (rowActive(y)) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  let left = -1;
  let right = -1;
  for (let x = x0; x < x1; x++) {
    if (colActive(x)) {
      if (left < 0) left = x;
      right = x;
    }
  }
  if (top < 0 || bottom < 0 || left < 0 || right < 0) return null;

  const rw = right - left + 1;
  const rh = bottom - top + 1;
  if (rw < w * 0.12 || rh < h * 0.18) return null;

  const aspect = rw / rh;
  if (aspect < 0.52 || aspect > 0.82) return null;

  const areaRatio = (rw * rh) / (w * h);
  if (areaRatio < 0.08 || areaRatio > 0.92) return null;

  let edgeScore = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      edgeScore += edges[y * w + x];
    }
  }
  edgeScore /= rw * rh;
  const aspectErr = Math.abs(aspect - TCG_ASPECT);
  const score = edgeScore * (1 - Math.min(0.5, aspectErr * 2)) * Math.min(1, areaRatio * 4);

  return { x: left, y: top, w: rw, h: rh, score };
}

/**
 * @param {{ x: number, y: number, w: number, h: number, score: number }} rect
 * @param {number} scaleX
 * @param {number} scaleY
 * @returns {{ x: number, y: number, w: number, h: number, conf: number }}
 */
function rectToVideoSpace(rect, scaleX, scaleY) {
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    w: rect.w * scaleX,
    h: rect.h * scaleY,
    conf: Math.min(1, rect.score / 28),
  };
}

/**
 * @param {{ x: number, y: number, w: number, h: number, conf: number }} next
 * @returns {{ x: number, y: number, w: number, h: number, conf: number }}
 */
function smoothRect(next) {
  if (!smoothedRect) {
    smoothedRect = { ...next };
    return smoothedRect;
  }
  const a = SMOOTH_ALPHA;
  smoothedRect = {
    x: smoothedRect.x * (1 - a) + next.x * a,
    y: smoothedRect.y * (1 - a) + next.y * a,
    w: smoothedRect.w * (1 - a) + next.w * a,
    h: smoothedRect.h * (1 - a) + next.h * a,
    conf: smoothedRect.conf * (1 - a) + next.conf * a,
  };
  return smoothedRect;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} r
 * @returns {void}
 */
function pushRectHistory(r) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  rectHistory.push({ cx, cy, w: r.w, h: r.h });
  if (rectHistory.length > HISTORY_MAX) rectHistory.shift();
}

/**
 * Variância máxima do centro/canto nos últimos frames (px vídeo).
 * @returns {number}
 */
export function getCardTrackPositionJitter() {
  if (rectHistory.length < 3) return 999;
  let maxJ = 0;
  const last = rectHistory[rectHistory.length - 1];
  for (let i = 0; i < rectHistory.length - 1; i++) {
    const o = rectHistory[i];
    const dx = last.cx - o.cx;
    const dy = last.cy - o.cy;
    const j = Math.sqrt(dx * dx + dy * dy);
    if (j > maxJ) maxJ = j;
  }
  return maxJ;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} regionNorm
 * @param {number} cardW
 * @param {number} cardH
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function regionNormToPixels(regionNorm, cardW, cardH) {
  return {
    x: regionNorm.x * cardW,
    y: regionNorm.y * cardH,
    width: regionNorm.w * cardW,
    height: regionNorm.h * cardH,
  };
}

/**
 * Regiões nome / ID / moldura em pixels no canvas canónico.
 * @param {boolean} [handFree]
 * @returns {{ name: object, passcode: object, type: object }}
 */
export function regionsOnCanonicalCard(handFree = false) {
  const nameR = handFree ? TCG_REGIONS.nameHandFree : TCG_REGIONS.name;
  return {
    name: regionNormToPixels(nameR, CANONICAL_CARD_W, CANONICAL_CARD_H),
    passcode: regionNormToPixels(TCG_REGIONS.passcode, CANONICAL_CARD_W, CANONICAL_CARD_H),
    type: regionNormToPixels(TCG_REGIONS.typeFrame, CANONICAL_CARD_W, CANONICAL_CARD_H),
  };
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} card
 * @param {{ x: number, y: number, w: number, h: number }} region
 * @param {number} vW
 * @param {number} vH
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function regionOnCardToVideoCrop(card, region, vW, vH) {
  const x = card.x + card.w * region.x;
  const y = card.y + card.h * region.y;
  const width = card.w * region.w;
  const height = card.h * region.h;
  return {
    x: Math.max(0, Math.min(vW - 2, x)),
    y: Math.max(0, Math.min(vH - 2, y)),
    width: Math.max(2, Math.min(vW - x, width)),
    height: Math.max(2, Math.min(vH - y, height)),
  };
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} card
 * @param {boolean} handFree
 * @param {number} vW
 * @param {number} vH
 * @returns {{ name: object, passcode: object, type: object }}
 */
export function tcgRegionsOnVideo(card, handFree, vW, vH) {
  const nameR = handFree ? TCG_REGIONS.nameHandFree : TCG_REGIONS.name;
  return {
    name: regionOnCardToVideoCrop(card, nameR, vW, vH),
    passcode: regionOnCardToVideoCrop(card, TCG_REGIONS.passcode, vW, vH),
    type: regionOnCardToVideoCrop(card, TCG_REGIONS.typeFrame, vW, vH),
  };
}

/**
 * Estado suavizado sem nova deteção (entre frames throttled).
 * @param {HTMLVideoElement} video
 * @param {{ handFree?: boolean }} [opts]
 * @returns {{ card: object, regions: object, raw: object }|null}
 */
export function getTrackedCardState(video, opts = {}) {
  if (!video || video.videoWidth < 32) return null;
  const card = isCardTrackLocked() && lockedRect ? lockedRect : smoothedRect;
  if (!card || card.conf < 0.28) return null;
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  return {
    card,
    regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH),
    raw: { cached: true, locked: isCardTrackLocked() },
  };
}

/**
 * Deteta carta no frame de vídeo (coordenadas do vídeo nativo).
 * @param {HTMLVideoElement} video
 * @param {{ handFree?: boolean }} [opts]
 * @returns {{ card: { x: number, y: number, w: number, h: number, conf: number }, regions: ReturnType<typeof tcgRegionsOnVideo>, raw: object }|null}
 */
export function detectCardFromVideo(video, opts = {}) {
  if (!video || video.videoWidth < 32 || video.videoHeight < 32) return null;

  if (isCardTrackLocked() && lockedRect) {
    const card = lockedRect;
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    return {
      card,
      regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH),
      raw: { locked: true },
    };
  }

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const scale = DETECT_MAX_W / vW;
  const dw = DETECT_MAX_W;
  const dh = Math.max(32, Math.round(vH * scale));

  const { ctx } = ensureDetectCanvas();
  if (detectCanvas.width !== dw || detectCanvas.height !== dh) {
    detectCanvas.width = dw;
    detectCanvas.height = dh;
  }
  try {
    ctx.drawImage(video, 0, 0, dw, dh);
  } catch {
    return null;
  }

  const img = ctx.getImageData(0, 0, dw, dh);
  const gray = grayscaleFromRgba(img.data, dw, dh);
  const edges = sobelMagnitude(gray, dw, dh);
  const found = findCardRectFromEdges(edges, dw, dh);
  if (!found || found.score < 4) return null;

  const scaleX = vW / dw;
  const scaleY = vH / dh;
  const inVideo = rectToVideoSpace(found, scaleX, scaleY);
  if (inVideo.conf < 0.22) return null;

  const card = smoothRect(inVideo);
  pushRectHistory(card);

  return {
    card,
    regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH),
    raw: { score: found.score, aspect: found.w / found.h },
  };
}

/**
 * Dica de movimento para alinhar a carta ao centro do quadro.
 * @param {{ x: number, y: number, w: number, h: number }} card
 * @param {number} vW
 * @param {number} vH
 * @returns {'none'|'find_card'|'move_closer'|'move_back'|'shift_left'|'shift_right'|'shift_up'|'shift_down'|'hold_steady'}
 */
export function getCardTrackDirectionHint(card, vW, vH) {
  if (!card) return 'find_card';
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  const fill = (card.w * card.h) / (vW * vH);
  const offX = (cx - vW / 2) / vW;
  const offY = (cy - vH / 2) / vH;

  if (fill < 0.14) return 'move_closer';
  if (fill > 0.78) return 'move_back';
  if (Math.abs(offX) > 0.14) return offX < 0 ? 'shift_right' : 'shift_left';
  if (Math.abs(offY) > 0.12) return offY < 0 ? 'shift_down' : 'shift_up';
  if (getCardTrackPositionJitter() > Math.max(12, card.w * 0.04)) return 'hold_steady';
  return 'none';
}

/**
 * Converte rect vídeo → estilo % no contentor da câmara (object-fit cover).
 * @param {HTMLVideoElement} video
 * @param {{ x: number, y: number, w: number, h: number }} card
 * @returns {{ leftPct: number, topPct: number, widthPct: number, heightPct: number, rotateDeg: number }|null}
 */
export function cardRectVideoToOverlayPercent(video, card) {
  const vRect = video.getBoundingClientRect();
  if (!vRect.width || !vRect.height) return null;
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const s = vW / vH > vRect.width / vRect.height ? vH / vRect.height : vW / vRect.width;
  const xO = (vW - vRect.width * s) / 2;
  const yO = (vH - vRect.height * s) / 2;

  const left = vRect.left + (card.x - xO) / s;
  const top = vRect.top + (card.y - yO) / s;
  const width = card.w / s;
  const height = card.h / s;

  const slot = video.parentElement;
  if (!slot) return null;
  const sRect = slot.getBoundingClientRect();
  if (!sRect.width || !sRect.height) return null;

  return {
    leftPct: ((left - sRect.left) / sRect.width) * 100,
    topPct: ((top - sRect.top) / sRect.height) * 100,
    widthPct: (width / sRect.width) * 100,
    heightPct: (height / sRect.height) * 100,
    rotateDeg: 0,
  };
}

/**
 * Canvas canónico da carta retificada (eixo-alinhado) para OCR opcional.
 * @param {HTMLVideoElement} video
 * @param {{ x: number, y: number, w: number, h: number }} card
 * @param {number} [outW]
 * @param {number} [outH]
 * @param {HTMLCanvasElement} [reuse]
 * @returns {HTMLCanvasElement|null}
 */
export function warpCardToCanonicalCanvas(
  video,
  card,
  outW = CANONICAL_CARD_W,
  outH = CANONICAL_CARD_H,
  reuse
) {
  if (!video || !card || card.w < 8 || card.h < 8) return null;
  const canvas = reuse || document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(video, card.x, card.y, card.w, card.h, 0, 0, outW, outH);
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Refina faixa de texto (nome ou passcode) na carta canónica via projeção de pixels escuros.
 * Compensa curvatura/inclinação sem YOLO — procura a banda horizontal de tinta dentro de uma zona semente.
 *
 * @param {HTMLCanvasElement} canvas Carta retificada 590×860.
 * @param {{ x: number, y: number, width: number, height: number }} seed Região TCG aproximada.
 * @param {{ padX?: number, padY?: number, trimRightFrac?: number, minRowFill?: number }} [opts]
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function refineTextBandOnCanonical(canvas, seed, opts = {}) {
  if (!canvas || !seed || seed.width < 4 || seed.height < 2) return seed;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return seed;

  const padX = opts.padX != null ? opts.padX : 0.12;
  const padY = opts.padY != null ? opts.padY : 0.35;
  const trimRightFrac = opts.trimRightFrac != null ? opts.trimRightFrac : 0;
  const minRowFill = opts.minRowFill != null ? opts.minRowFill : 0.07;

  const x0 = Math.max(0, Math.floor(seed.x - seed.width * padX));
  const y0 = Math.max(0, Math.floor(seed.y - seed.height * padY));
  const x1 = Math.min(w, Math.ceil(seed.x + seed.width * (1 + padX)));
  const y1 = Math.min(h, Math.ceil(seed.y + seed.height * (1 + padY)));
  const rw = x1 - x0;
  const rh = y1 - y0;
  if (rw < 8 || rh < 4) return seed;

  let img;
  try {
    img = ctx.getImageData(x0, y0, rw, rh);
  } catch {
    return seed;
  }
  const d = img.data;
  const dark = new Uint8Array(rw * rh);
  let darkSum = 0;
  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const p = py * rw + px;
      const i = p * 4;
      const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const v = L < 118 ? 1 : 0;
      dark[p] = v;
      darkSum += v;
    }
  }
  if (darkSum < rw * rh * minRowFill * 0.35) return seed;

  const rowCount = new Uint16Array(rh);
  for (let py = 0; py < rh; py++) {
    let c = 0;
    for (let px = 0; px < rw; px++) c += dark[py * rw + px];
    rowCount[py] = c;
  }
  const rowNeed = Math.max(2, Math.floor(rw * minRowFill));
  let bestY0 = -1;
  let bestY1 = -1;
  let bestScore = 0;
  for (let y = 0; y < rh; y++) {
    if (rowCount[y] < rowNeed) continue;
    let y2 = y;
    let sum = rowCount[y];
    while (y2 + 1 < rh && rowCount[y2 + 1] >= rowNeed * 0.55) {
      y2++;
      sum += rowCount[y2];
    }
    const score = sum * (y2 - y + 1);
    if (score > bestScore) {
      bestScore = score;
      bestY0 = y;
      bestY1 = y2;
    }
    y = y2;
  }
  if (bestY0 < 0) return seed;

  const colCount = new Uint16Array(rw);
  for (let py = bestY0; py <= bestY1; py++) {
    for (let px = 0; px < rw; px++) {
      if (dark[py * rw + px]) colCount[px]++;
    }
  }
  const colNeed = Math.max(1, Math.floor((bestY1 - bestY0 + 1) * 0.35));
  let cx0 = -1;
  let cx1 = -1;
  for (let px = 0; px < rw; px++) {
    if (colCount[px] >= colNeed) {
      if (cx0 < 0) cx0 = px;
      cx1 = px;
    }
  }
  if (cx0 < 0) return seed;

  const bandW = cx1 - cx0 + 1;
  const useW =
    trimRightFrac > 0 ? Math.max(8, Math.floor(bandW * (1 - trimRightFrac))) : bandW;
  const outX = x0 + cx0;
  const outY = y0 + bestY0;
  const outW = Math.max(8, useW);
  const outH = Math.max(4, bestY1 - bestY0 + 1);

  return {
    x: Math.max(0, outX),
    y: Math.max(0, outY),
    width: Math.min(w - outX, outW),
    height: Math.min(h - outY, outH),
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} seed
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function refinePasscodeOnCanonical(canvas, seed) {
  return refineTextBandOnCanonical(canvas, seed, {
    padX: 0.1,
    padY: 0.55,
    trimRightFrac: 0.4,
    minRowFill: 0.045,
  });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} seed
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function refineNameOnCanonical(canvas, seed) {
  return refineTextBandOnCanonical(canvas, seed, {
    padX: 0.04,
    padY: 0.45,
    trimRightFrac: 0.22,
    minRowFill: 0.05,
  });
}
