/**
 * Deteção leve de carta (contornos / projeções) + suavização temporal + regiões TCG.
 * Sem YOLO — pensado para browser mobile com fallback às miras CSS fixas.
 */

/** Proporção largura/altura carta Yu-Gi-Oh! (59×86 mm). */
export const TCG_ASPECT = 59 / 86;

/** Canvas canónico retificado (warp OCR). */
export const CANONICAL_CARD_W = 590;
export const CANONICAL_CARD_H = 860;

/** Caixa de ilustração oficial Konami (52,5×52,5 mm, carta 59×86 mm). */
export const TCG_ART_PICTURE_MM = Object.freeze({
  top: 11.5,
  side: (59 - 52.5) / 2,
  size: 52.5,
  cardW: 59,
  cardH: 86,
});

/** Margem interna do dHash (moldura prateada / foil) — igual no índice, scanner e mira. */
export const ART_HASH_INSET = 0.08;

/** 8 dígitos passcode + «1ª Edição» — canto inferior esquerdo (PT moderno). */
const _passcodeMm = { x: 1.5, y: 80.2, w: 11.5, h: 3 };
const _passcodeDigitsMm = { x: 1.5, y: 80.2, w: 11.5, h: 3.0 };

/** Layout físico (mm) — carta 59×86. */
export const TCG_LAYOUT_MM = Object.freeze({
  cardW: 59,
  cardH: 86,
  /** Texto do nome — até o início do círculo de atributo. */
  name: { x: 3.5, y: 3.3, h: 6.8 },
  /** Círculo de atributo / ícone magia-armadilha (canto superior direito). */
  attribute: { size: 6.2, right: 2.8, top: 4 },
  /** Faixa das estrelas (x/w fixos; y/h derivados do vão nome→arte). */
  // Estrelas podem estender sob o atributo; inclui a zona direita.
  levelRank: { x: 3.8, w: 53.0 },
  /** 8 dígitos passcode (canto inf. esquerdo) — não confundir com set code (CH01-PTxxx). */
  passcode: _passcodeMm,
  /** 8 dígitos matte — OCR Fase D (PT: x=1.5, antes de «1ª Edição»). */
  passcodeDigits: _passcodeDigitsMm,
  /** Mira laranja + preview DOM — só 8 dígitos (−1 mm margem edição; w=10.5 ≈ 18% carta). */
  passcodeVisualMira: { x: 1.5, y: 80.2, w: 10.5, h: 3.0 },
  /** Faixa inferior esquerda para projeção de tinta (passcode + edição; set code está abaixo da arte). */
  passcodeStrip: { x: 1.5, y: 80.2, w: 26, h: 3.2 },
});

/**
 * Largura do nome até encostar ao atributo (mm).
 * @param {typeof TCG_LAYOUT_MM} layout
 * @returns {number}
 */
export function nameWidthMmToAttribute(layout = TCG_LAYOUT_MM) {
  const attrLeft = layout.cardW - layout.attribute.right - layout.attribute.size;
  return Math.max(8, attrLeft - layout.name.x);
}

/**
 * Faixa nível/rank centrada no espaço entre o fim do nome e o topo da arte.
 * @param {typeof TCG_LAYOUT_MM} layout
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function levelRankRectMm(layout = TCG_LAYOUT_MM) {
  // Estrelas / setas Link ficam no vão nome→picture box (~1,4 mm), não na arte.
  // Estender até o inset do hash incluía foil da ilustração e inflava a contagem (ex. Fusão 12/8).
  const pictureTop = TCG_ART_PICTURE_MM.top;
  const nameBottom = layout.name.y + layout.name.h;
  const starBottom = pictureTop + 1.45;
  return {
    x: layout.levelRank.x,
    y: nameBottom,
    w: layout.levelRank.w,
    h: Math.max(0.9, starBottom - nameBottom),
  };
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} r
 * @param {number} cardW
 * @param {number} cardH
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function normRectFromMm(r, cardW, cardH) {
  return { x: r.x / cardW, y: r.y / cardH, w: r.w / cardW, h: r.h / cardH };
}

/**
 * @param {{ size: number, right: number, top: number }} a
 * @param {number} cardW
 * @param {number} cardH
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function normAttributeFromMm(a, cardW, cardH) {
  const w = a.size;
  const h = a.size;
  const x = cardW - a.right - w;
  return { x: x / cardW, y: a.top / cardH, w: w / cardW, h: h / cardH };
}

const { cardW: LAY_W, cardH: LAY_H } = TCG_LAYOUT_MM;

const _nameMm = {
  ...TCG_LAYOUT_MM.name,
  w: nameWidthMmToAttribute(TCG_LAYOUT_MM),
};

/** Frações dos 8 dígitos dentro de {@link TCG_LAYOUT_MM.passcodeStrip} (PT: dígitos à esquerda). */
export const PASSCODE_DIGITS_IN_STRIP = Object.freeze({
  x: (TCG_LAYOUT_MM.passcodeDigits.x - TCG_LAYOUT_MM.passcodeStrip.x) / TCG_LAYOUT_MM.passcodeStrip.w,
  y: (TCG_LAYOUT_MM.passcodeDigits.y - TCG_LAYOUT_MM.passcodeStrip.y) / TCG_LAYOUT_MM.passcodeStrip.h,
  w: TCG_LAYOUT_MM.passcodeDigits.w / TCG_LAYOUT_MM.passcodeStrip.w,
  h: TCG_LAYOUT_MM.passcodeDigits.h / TCG_LAYOUT_MM.passcodeStrip.h,
});

/**
 * ROI normalizada dos 8 dígitos Konami a partir da faixa inferior.
 * @param {{ x: number, y: number, w: number, h: number }} stripNorm
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function passcodeDigitsNormFromStripNorm(stripNorm) {
  const f = PASSCODE_DIGITS_IN_STRIP;
  return {
    x: stripNorm.x + stripNorm.w * f.x,
    y: stripNorm.y + stripNorm.h * f.y,
    w: stripNorm.w * f.w,
    h: stripNorm.h * f.h,
  };
}

const _passcodeStripNorm = normRectFromMm(TCG_LAYOUT_MM.passcodeStrip, LAY_W, LAY_H);

/** Regiões normalizadas na carta (0–1), alinhadas com o scanner CSS. */
export const TCG_REGIONS = Object.freeze({
  name: normRectFromMm(_nameMm, LAY_W, LAY_H),
  nameHandFree: normRectFromMm(
    { x: 3, y: 3.1, w: nameWidthMmToAttribute(TCG_LAYOUT_MM) + 0.5, h: 7.2 },
    LAY_W,
    LAY_H
  ),
  /**
   * @deprecated ROI errado — apontava ao passcode (8 dígitos), não ao set code.
   * Set code PT (CH01-PTxxx) fica abaixo da arte, à direita; região futura TBD.
   */
  passcodeSetCode: normRectFromMm(TCG_LAYOUT_MM.passcode, LAY_W, LAY_H),
  /** @deprecated Alias legado de passcode; preferir passcodeDigits. */
  passcode: normRectFromMm(TCG_LAYOUT_MM.passcode, LAY_W, LAY_H),
  passcodeStrip: _passcodeStripNorm,
  /** 8 dígitos matte (OCR Fase D). */
  passcodeDigits: passcodeDigitsNormFromStripNorm(_passcodeStripNorm),
  /** Mira laranja + preview (#scanner-passcode-visual) — 8 dígitos sem «1ª Edição». */
  passcodeVisualMira: normRectFromMm(TCG_LAYOUT_MM.passcodeVisualMira, LAY_W, LAY_H),
  /** @deprecated Use passcodeDigitsFromStripRect — mantido para compat. */
  passcodeDigitsLegacy: normRectFromMm(TCG_LAYOUT_MM.passcodeDigits, LAY_W, LAY_H),
  typeFrame: { x: 0, y: 0, w: 1, h: 1 },
  attribute: normAttributeFromMm(TCG_LAYOUT_MM.attribute, LAY_W, LAY_H),
  levelRank: normRectFromMm(levelRankRectMm(TCG_LAYOUT_MM), LAY_W, LAY_H),
});

/**
 * 8 dígitos matte a partir da faixa inferior esquerda (passcode + edição).
 * @param {{ x: number, y: number, width: number, height: number }} stripPx
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function passcodeDigitsFromStripRect(stripPx) {
  if (!stripPx || stripPx.width < 8) return null;
  const f = PASSCODE_DIGITS_IN_STRIP;
  return {
    x: stripPx.x + stripPx.width * f.x,
    y: stripPx.y + stripPx.height * f.y,
    width: Math.max(8, stripPx.width * f.w),
    height: Math.max(3, stripPx.height * f.h),
  };
}

/**
 * Caixa de arte oficial em coordenadas 0–1 (quadrada em mm).
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function tcgArtPictureBoxNorm() {
  const { top, side, size, cardW, cardH } = TCG_ART_PICTURE_MM;
  return {
    x: side / cardW,
    y: top / cardH,
    w: size / cardW,
    h: size / cardH,
  };
}

/**
 * ROI fixa do dHash + mira roxa (caixa oficial com {@link ART_HASH_INSET}).
 * Igual para todas as cartas — como a faixa do nome.
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function artHashRegionNorm() {
  const box = tcgArtPictureBoxNorm();
  const m = ART_HASH_INSET;
  return {
    x: box.x + box.w * m,
    y: box.y + box.h * m,
    w: box.w * (1 - 2 * m),
    h: box.h * (1 - 2 * m),
  };
}

const DETECT_MAX_W = 280;
const SMOOTH_ALPHA = 0.48;
const HISTORY_MAX = 8;
const LOCK_DEFAULT_MS = 1800;
/** Confiança mínima para expor tracking / warp (mesa + mira fixa). */
export const CARD_TRACK_MIN_CONF = 0.2;

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
/**
 * Carta na mesa: blob de luminância com aspecto TCG (fallback quando Sobel falha).
 * @param {Float32Array} gray
 * @param {number} w
 * @param {number} h
 * @returns {{ x: number, y: number, w: number, h: number, score: number }|null}
 */
function findCardRectFromLuma(gray, w, h) {
  const margin = Math.floor(Math.min(w, h) * 0.04);
  const x0 = margin;
  const x1 = w - margin;
  const y0 = margin;
  const y1 = h - margin;
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += gray[y * w + x];
      count++;
    }
  }
  if (!count) return null;
  const mean = sum / count;
  let varSum = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = gray[y * w + x] - mean;
      varSum += d * d;
    }
  }
  const std = Math.sqrt(varSum / count) || 1;

  const tryPolarity = (brightBlob) => {
    const thresh = brightBlob ? mean + std * 0.28 : mean - std * 0.32;
    const rowSum = new Float32Array(h);
    const colSum = new Float32Array(w);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const L = gray[y * w + x];
        const on = brightBlob ? L > thresh : L < thresh;
        if (on) {
          rowSum[y] += 1;
          colSum[x] += 1;
        }
      }
    }
    const rowNeed = (x1 - x0) * 0.24;
    const colNeed = (y1 - y0) * 0.2;
    const rowActive = (y) => rowSum[y] >= rowNeed;
    const colActive = (x) => colSum[x] >= colNeed;
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
    if (rw < w * 0.1 || rh < h * 0.14) return null;
    const aspect = rw / rh;
    if (aspect < 0.46 || aspect > 0.88) return null;
    const areaRatio = (rw * rh) / (w * h);
    if (areaRatio < 0.055 || areaRatio > 0.94) return null;
    const aspectErr = Math.abs(aspect - TCG_ASPECT);
    const score = (1 - Math.min(0.55, aspectErr * 2.2)) * Math.min(1, areaRatio * 5) * 18;
    return { x: left, y: top, w: rw, h: rh, score };
  };

  const a = tryPolarity(true);
  const b = tryPolarity(false);
  if (!a) return b;
  if (!b) return a;
  return a.score >= b.score ? a : b;
}

function findCardRectFromEdges(edges, w, h) {
  const margin = Math.floor(Math.min(w, h) * 0.04);
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
  thresh = (thresh / Math.max(1, count)) * 1.22;

  const rowActive = (y) => rowSum[y] > thresh * (x1 - x0) * 0.18;
  const colActive = (x) => colSum[x] > thresh * (y1 - y0) * 0.15;

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
  if (rw < w * 0.1 || rh < h * 0.14) return null;

  const aspect = rw / rh;
  if (aspect < 0.46 || aspect > 0.88) return null;

  const areaRatio = (rw * rh) / (w * h);
  if (areaRatio < 0.055 || areaRatio > 0.94) return null;

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
 * ROI da arte para dHash (fixa; o parâmetro tipo é ignorado).
 * @param {string} [_cardType]
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function artRegionForCardType(_cardType) {
  return artHashRegionNorm();
}

/**
 * Encolhe rect em pixels (margem central — reduz foil nas bordas da arte).
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {number} [marginPct=0.08]
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function shrinkArtRect(rect, marginPct = 0.08) {
  if (!rect || rect.width < 4 || rect.height < 4) return rect;
  const mx = rect.width * marginPct;
  const my = rect.height * marginPct;
  return {
    x: rect.x + mx,
    y: rect.y + my,
    width: Math.max(4, rect.width - mx * 2),
    height: Math.max(4, rect.height - my * 2),
  };
}

/**
 * Regiões nome / ID / moldura / arte em pixels no canvas canónico.
 * @param {boolean} [handFree]
 * @param {string} [cardType] Tipo UI para escolher ROI da arte.
 * @returns {{ name: object, passcode: object, type: object, art: object }}
 */
export function regionsOnCanonicalCard(handFree = false, _cardType) {
  const nameR = handFree ? TCG_REGIONS.nameHandFree : TCG_REGIONS.name;
  const artPx = regionNormToPixels(artHashRegionNorm(), CANONICAL_CARD_W, CANONICAL_CARD_H);
  const passcodeStrip = regionNormToPixels(TCG_REGIONS.passcodeStrip, CANONICAL_CARD_W, CANONICAL_CARD_H);
  const passcodeDigits = passcodeDigitsFromStripRect(passcodeStrip);
  const passcodeVisual = regionNormToPixels(TCG_REGIONS.passcodeVisualMira, CANONICAL_CARD_W, CANONICAL_CARD_H);
  return {
    name: regionNormToPixels(nameR, CANONICAL_CARD_W, CANONICAL_CARD_H),
    passcodeSetCode: regionNormToPixels(TCG_REGIONS.passcodeSetCode, CANONICAL_CARD_W, CANONICAL_CARD_H),
    passcodeVisual,
    passcodeDigits,
    passcodeStrip,
    type: regionNormToPixels(TCG_REGIONS.typeFrame, CANONICAL_CARD_W, CANONICAL_CARD_H),
    art: artPx,
    attribute: regionNormToPixels(TCG_REGIONS.attribute, CANONICAL_CARD_W, CANONICAL_CARD_H),
    levelRank: regionNormToPixels(TCG_REGIONS.levelRank, CANONICAL_CARD_W, CANONICAL_CARD_H),
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
export function tcgRegionsOnVideo(card, handFree, vW, vH, cardTypeHint) {
  const nameR = handFree ? TCG_REGIONS.nameHandFree : TCG_REGIONS.name;
  const artNorm = artHashRegionNorm();
  const passcodeStrip = regionOnCardToVideoCrop(card, TCG_REGIONS.passcodeStrip, vW, vH);
  const passcodeDigits = passcodeDigitsFromStripRect(passcodeStrip);
  const passcodeVisual = regionOnCardToVideoCrop(card, TCG_REGIONS.passcodeVisualMira, vW, vH);
  return {
    name: regionOnCardToVideoCrop(card, nameR, vW, vH),
    passcodeSetCode: regionOnCardToVideoCrop(card, TCG_REGIONS.passcodeSetCode, vW, vH),
    passcodeVisual,
    passcodeDigits,
    passcodeStrip,
    type: regionOnCardToVideoCrop(card, TCG_REGIONS.typeFrame, vW, vH),
    art: regionOnCardToVideoCrop(card, artNorm, vW, vH),
    attribute: regionOnCardToVideoCrop(card, TCG_REGIONS.attribute, vW, vH),
    levelRank: regionOnCardToVideoCrop(card, TCG_REGIONS.levelRank, vW, vH),
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
  if (!card || card.conf < CARD_TRACK_MIN_CONF) return null;
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  return {
    card,
    regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH, opts.cardType),
    raw: { cached: true, locked: isCardTrackLocked() },
  };
}

/**
 * Deteção num sub-rect do vídeo (hint da moldura azul / centro do quadro).
 * @param {HTMLVideoElement} video
 * @param {{ x: number, y: number, width?: number, height?: number, w?: number, h?: number }} roi
 * @param {{ handFree?: boolean }} [opts]
 * @returns {ReturnType<typeof detectCardFromVideo>}
 */
export function detectCardFromVideoRoi(video, roi, opts = {}) {
  if (!video || !roi) return detectCardFromVideo(video, opts);
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  const rw = roi.width != null ? roi.width : roi.w;
  const rh = roi.height != null ? roi.height : roi.h;
  if (!rw || !rh || rw < 24 || rh < 32) return detectCardFromVideo(video, opts);

  const pad = 0.14;
  const hx = Math.max(0, roi.x - rw * pad);
  const hy = Math.max(0, roi.y - rh * pad);
  const hw = Math.min(vW - hx, rw * (1 + 2 * pad));
  const hh = Math.min(vH - hy, rh * (1 + 2 * pad));

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
    return detectCardFromVideo(video, opts);
  }

  const sx = dw / vW;
  const sy = dh / vH;
  const rx = Math.max(0, Math.floor(hx * sx));
  const ry = Math.max(0, Math.floor(hy * sy));
  const rrw = Math.max(32, Math.min(dw - rx, Math.ceil(hw * sx)));
  const rrh = Math.max(40, Math.min(dh - ry, Math.ceil(hh * sy)));

  let img;
  try {
    img = ctx.getImageData(rx, ry, rrw, rrh);
  } catch {
    return detectCardFromVideo(video, opts);
  }
  const gray = grayscaleFromRgba(img.data, rrw, rrh);
  const edges = sobelMagnitude(gray, rrw, rrh);
  let found = findCardRectFromEdges(edges, rrw, rrh);
  if (!found || found.score < 2.5) {
    const luma = findCardRectFromLuma(gray, rrw, rrh);
    if (luma && (!found || luma.score > found.score)) found = luma;
  }
  if (!found || found.score < 2.5) return detectCardFromVideo(video, opts);

  const scaleX = vW / dw;
  const scaleY = vH / dh;
  const inVideo = rectToVideoSpace(
    {
      x: found.x + rx,
      y: found.y + ry,
      w: found.w,
      h: found.h,
      score: found.score,
    },
    scaleX,
    scaleY
  );
  if (inVideo.conf < 0.16) return detectCardFromVideo(video, opts);
  const card = smoothRect(inVideo);
  pushRectHistory(card);
  return {
    card,
    regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH, opts.cardType),
    raw: { score: found.score, roiHint: true },
  };
}

/**
 * @param {Float32Array} gray
 * @param {number} dw
 * @param {number} dh
 * @returns {{ x: number, y: number, w: number, h: number, score: number }|null}
 */
function detectCardRectInGrayFrame(gray, dw, dh) {
  const edges = sobelMagnitude(gray, dw, dh);
  let found = findCardRectFromEdges(edges, dw, dh);
  if (!found || found.score < 2.5) {
    const luma = findCardRectFromLuma(gray, dw, dh);
    if (luma && (!found || luma.score > found.score)) found = luma;
  }
  return found && found.score >= 2.5 ? found : null;
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
      regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH, opts.cardType),
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
  let found = detectCardRectInGrayFrame(gray, dw, dh);
  if (!found) {
    const cx0 = Math.floor(dw * 0.08);
    const cy0 = Math.floor(dh * 0.06);
    const cw = Math.max(48, Math.floor(dw * 0.84));
    const ch = Math.max(64, Math.floor(dh * 0.88));
    try {
      const sub = ctx.getImageData(cx0, cy0, cw, ch);
      const g2 = grayscaleFromRgba(sub.data, cw, ch);
      const inner = detectCardRectInGrayFrame(g2, cw, ch);
      if (inner) {
        found = { x: inner.x + cx0, y: inner.y + cy0, w: inner.w, h: inner.h, score: inner.score };
      }
    } catch {
      /* ignore */
    }
  }
  if (!found) return null;

  const scaleX = vW / dw;
  const scaleY = vH / dh;
  const inVideo = rectToVideoSpace(found, scaleX, scaleY);
  if (inVideo.conf < 0.16) return null;

  const card = smoothRect(inVideo);
  pushRectHistory(card);

  return {
    card,
    regions: tcgRegionsOnVideo(card, !!opts.handFree, vW, vH, opts.cardType),
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
/**
 * Escala um recorte do vídeo para o canvas canónico (sem perspectiva).
 * Aceita `{ x, y, width, height }` ou `{ x, y, w, h }`.
 * @param {HTMLVideoElement} video
 * @param {{ x: number, y: number, width?: number, height?: number, w?: number, h?: number }} crop
 * @param {number} [outW]
 * @param {number} [outH]
 * @param {HTMLCanvasElement} [reuse]
 * @returns {HTMLCanvasElement|null}
 */
export function scaleVideoCropToCanonicalCanvas(
  video,
  crop,
  outW = CANONICAL_CARD_W,
  outH = CANONICAL_CARD_H,
  reuse
) {
  if (!video || !crop) return null;
  const w = crop.w != null ? crop.w : crop.width;
  const h = crop.h != null ? crop.h : crop.height;
  if (w == null || h == null || w < 8 || h < 8) return null;
  return warpCardToCanonicalCanvas(video, { x: crop.x, y: crop.y, w, h }, outW, outH, reuse);
}

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
 * @param {{ padX?: number, padY?: number, trimLeftFrac?: number, trimRightFrac?: number, minRowFill?: number }} [opts]
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
  const lum = new Float32Array(rw * rh);
  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const p = py * rw + px;
      const i = p * 4;
      lum[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    }
  }
  const inkModes = opts.inkModes && opts.inkModes.length ? opts.inkModes : ['dark'];
  const buildInkMask = (mode) => {
    const mask = new Uint8Array(rw * rh);
    let sum = 0;
    for (let p = 0; p < rw * rh; p++) {
      const L = lum[p];
      const v =
        mode === 'light' ? (L > 168 ? 1 : 0) : mode === 'mid' ? (L > 92 && L < 152 ? 1 : 0) : L < 118 ? 1 : 0;
      mask[p] = v;
      sum += v;
    }
    return { mask, sum };
  };
  const findBandForMask = (dark, darkSum) => {
    if (darkSum < rw * rh * minRowFill * 0.35) return null;

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
    if (bestY0 < 0) return null;

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
    if (cx0 < 0) return null;

    const trimLeftFrac = opts.trimLeftFrac != null ? opts.trimLeftFrac : 0;
    if (trimLeftFrac > 0) {
      const bandW0 = cx1 - cx0 + 1;
      const skip = Math.floor(bandW0 * trimLeftFrac);
      cx0 = Math.min(cx1, cx0 + skip);
    }

    const bandW = cx1 - cx0 + 1;
    const useW =
      trimRightFrac > 0 ? Math.max(8, Math.floor(bandW * (1 - trimRightFrac))) : bandW;
    const outX = x0 + cx0;
    const outY = y0 + bestY0;
    const outW = Math.max(8, useW);
    const outH = Math.max(4, bestY1 - bestY0 + 1);
    return {
      rect: {
        x: Math.max(0, outX),
        y: Math.max(0, outY),
        width: Math.min(w - outX, outW),
        height: Math.min(h - outY, outH),
      },
      score: bestScore,
    };
  };

  let bestBand = null;
  for (let mi = 0; mi < inkModes.length; mi++) {
    const { mask, sum } = buildInkMask(inkModes[mi]);
    const hit = findBandForMask(mask, sum);
    if (!hit) continue;
    if (!bestBand || hit.score > bestBand.score) bestBand = hit;
  }
  return bestBand ? bestBand.rect : seed;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} seed
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function refinePasscodeOnCanonical(canvas, seed) {
  return refineTextBandOnCanonical(canvas, seed, {
    padX: 0.05,
    padY: 0.55,
    trimRightFrac: 0.28,
    minRowFill: 0.045,
    inkModes: ['dark', 'light'],
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

/**
 * Ajusta a faixa nível/rank no warp canónico (estrelas foil — evita ROI demasiado baixo).
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} seed
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function refineLevelRankOnCanonical(canvas, seed) {
  if (!canvas || !seed || seed.width < 8 || seed.height < 3) return seed;
  const w = canvas.width;
  const h = canvas.height;
  const padY = Math.max(2, Math.floor(seed.height * 0.55));
  const padX = Math.max(1, Math.floor(seed.width * 0.02));
  const x0 = Math.max(0, Math.floor(seed.x) - padX);
  const y0 = Math.max(0, Math.floor(seed.y) - padY);
  const x1 = Math.min(w, Math.ceil(seed.x + seed.width) + padX);
  const y1 = Math.min(h, Math.ceil(seed.y + seed.height) + padY);
  const rw = x1 - x0;
  const rh = y1 - y0;
  if (rw < 8 || rh < 4) return seed;
  const ctx = canvas.getContext('2d');
  if (!ctx) return seed;
  let img;
  try {
    img = ctx.getImageData(x0, y0, rw, rh);
  } catch (_) {
    return seed;
  }
  const data = img.data;
  const rowScore = new Float32Array(rh);
  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const i = (py * rw + px) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const warmStar =
        (r > 88 && r > g + 4 && r > b + 6 && g < 190 && b < 180) ||
        (lum > 98 && lum < 198 && r > g + 8 && r > b + 12);
      const darkStar = lum < 98 && Math.max(r, g, b) - Math.min(r, g, b) < 58;
      if (warmStar || darkStar) rowScore[py] += 1;
    }
  }
  const rowNeed = Math.max(2, rw * 0.028);
  let bestY0 = -1;
  let bestY1 = -1;
  let bestScore = 0;
  for (let y = 0; y < rh; y++) {
    if (rowScore[y] < rowNeed) continue;
    let y2 = y;
    let sum = rowScore[y];
    while (y2 + 1 < rh && rowScore[y2 + 1] >= rowNeed * 0.45) {
      y2++;
      sum += rowScore[y2];
    }
    const score = sum * (y2 - y + 1);
    if (score > bestScore) {
      bestScore = score;
      bestY0 = y;
      bestY1 = y2;
    }
    y = y2;
  }
  if (bestY0 < 0 || bestScore < rw * 0.12) return seed;
  const outY = y0 + bestY0;
  const outH = Math.max(seed.height, bestY1 - bestY0 + 1);
  return {
    x: Math.max(0, seed.x),
    y: Math.max(0, outY),
    width: Math.min(w - seed.x, seed.width),
    height: Math.min(h - outY, outH),
  };
}

/**
 * Deteta a extensão real da carta dentro do warp canónico.
 *
 * O warp (`warpCardToCanonicalCanvas`) é um simples stretch da bounding-box detetada, que
 * costuma ser mais alta que a carta (sombra/mesa em cima e baixo). A carta fica então inset
 * no canónico 590×860 com margem de madeira, e os crops de layout que assumem a carta a
 * preencher 0..1 (nome no topo, passcode no fundo) caem na madeira. Esta função encontra a
 * transição madeira→borda por energia de gradiente por linha/coluna e devolve o rect da carta
 * em píxeis canónicos — ou `null` se não houver margem relevante / confiança suficiente
 * (nesse caso o chamador mantém o comportamento atual).
 *
 * @param {HTMLCanvasElement} canvas Warp canónico 590×860.
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function detectCardExtentOnCanonical(canvas) {
  if (!canvas) return null;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 32 || h < 32) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  let img;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const d = img.data;
  const lum = new Float32Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    lum[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }
  const rowE = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    const base = y * w;
    for (let x = 1; x < w; x++) s += Math.abs(lum[base + x] - lum[base + x - 1]);
    rowE[y] = s / (w - 1);
  }
  const colE = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 1; y < h; y++) s += Math.abs(lum[y * w + x] - lum[(y - 1) * w + x]);
    colE[x] = s / (h - 1);
  }
  const median = (arr, a, b) => {
    const sub = Array.prototype.slice.call(arr, a, b).sort((m, n) => m - n);
    return sub.length ? sub[Math.floor(sub.length / 2)] : 0;
  };
  const refRow = median(rowE, Math.floor(h * 0.4), Math.floor(h * 0.6));
  const refCol = median(colE, Math.floor(w * 0.4), Math.floor(w * 0.6));
  if (refRow <= 0 || refCol <= 0) return null;
  const thRow = refRow * 0.5;
  const thCol = refCol * 0.5;
  // Transição madeira→carta: primeira linha/coluna que cruza o limiar (com confirmação no vizinho).
  let top = 0;
  for (let y = 0; y <= Math.floor(h * 0.25); y++) {
    if (rowE[y] >= thRow && rowE[Math.min(h - 1, y + 1)] >= thRow * 0.7) { top = y; break; }
  }
  let bottom = h - 1;
  for (let y = h - 1; y >= Math.floor(h * 0.75); y--) {
    if (rowE[y] >= thRow && rowE[Math.max(0, y - 1)] >= thRow * 0.7) { bottom = y; break; }
  }
  let left = 0;
  for (let x = 0; x <= Math.floor(w * 0.25); x++) {
    if (colE[x] >= thCol && colE[Math.min(w - 1, x + 1)] >= thCol * 0.7) { left = x; break; }
  }
  let right = w - 1;
  for (let x = w - 1; x >= Math.floor(w * 0.75); x--) {
    if (colE[x] >= thCol && colE[Math.max(0, x - 1)] >= thCol * 0.7) { right = x; break; }
  }
  const ew = right - left + 1;
  const eh = bottom - top + 1;
  if (eh < h * 0.6 || ew < w * 0.6) return null; // carta tem de ocupar a maioria do frame
  // Sem margem relevante (carta já preenche): identidade → mantém comportamento atual.
  if (top <= h * 0.012 && bottom >= h * 0.988 && left <= w * 0.012 && right >= w * 0.988) return null;
  return { x: left, y: top, width: ew, height: eh };
}
