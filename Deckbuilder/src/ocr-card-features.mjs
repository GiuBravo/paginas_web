/**
 * Metadados e sondas visuais da carta (atributo, nível/rank, barra magia/armadilha).
 * Regiões fixas em coordenadas TCG — alinhadas com `ocr-card-track.mjs`.
 */

import {
  regionNormToPixels,
  CANONICAL_CARD_W,
  CANONICAL_CARD_H,
  TCG_REGIONS,
} from './ocr-card-track.mjs';

export const TCG_ATTRIBUTE_REGION = TCG_REGIONS.attribute;
export const TCG_LEVEL_RANK_REGION = TCG_REGIONS.levelRank;

export const ART_HASH_SCHEMA_WITH_META = 3;

/**
 * @param {string} apiType
 * @returns {string}
 */
export function mapApiTypeToUiType(apiType) {
  const t = String(apiType || '').toLowerCase();
  if (t.includes('spell')) return 'Magia';
  if (t.includes('trap')) return 'Armadilha';
  if (t.includes('fusion')) return 'Monstro Fusão';
  if (t.includes('synchro')) return 'Monstro Sincro';
  if (t.includes('xyz')) return 'Monstro Xyz';
  if (t.includes('link')) return 'Monstro Link';
  if (t.includes('ritual')) return 'Monstro Ritual';
  if (t.includes('pendulum')) return 'Monstro Pêndulo';
  if (t.includes('normal')) return 'Monstro Normal';
  if (t.includes('effect') || t.includes('effekt')) return 'Monstro Efeito';
  return 'Monstro Efeito';
}

/**
 * Metadados compactos para o índice de arte (por `cardId`).
 * @param {object} card Linha cardinfo YGOProDeck.
 * @returns {{ uiType: string, attr: string|null, level: number, rank: number, link: number }}
 */
export function metaFromApiCard(card) {
  const uiType = mapApiTypeToUiType(card && card.type);
  let attr = card && card.attribute ? String(card.attribute).toUpperCase() : null;
  if (!attr && uiType === 'Magia') attr = 'SPELL';
  if (!attr && uiType === 'Armadilha') attr = 'TRAP';
  const level = card && card.level != null ? Number(card.level) : 0;
  const rank = card && card.rank != null ? Number(card.rank) : 0;
  const link =
    card && (card.linkval != null || card.linkrating != null)
      ? Number(card.linkval != null ? card.linkval : card.linkrating)
      : 0;
  return { uiType, attr, level, rank, link };
}

/**
 * @param {string} [cardTypeHint]
 * @returns {boolean}
 */
function cardTypeHintIsMonster(cardTypeHint) {
  const h = String(cardTypeHint || '').toLowerCase();
  if (!h || h === 'auto') return false;
  return h.includes('monstro') || h.includes('monster');
}

/**
 * Trevas clássicas ou roxo/magenta do ícone (warp + foil lavam o contraste).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isDarkAttributeRgb(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 18 || lum > 205) return false;
  if (r > 70 && b > 68 && g < Math.min(r, b) - 8) return true;
  if (r > 95 && b > 82 && g < (r + b) / 2 - 5 && r > g + 8 && b > g - 4) return true;
  if (r > 115 && b > 95 && g < r - 12 && g < b + 8 && lum < 185) return true;
  return false;
}

/**
 * Ícone LIGHT cremoso sob moldura Sincro Secreta branca (Psychic End Punisher).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isSynchroWashedLightAttributeRgb(r, g, b) {
  const lum = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (lum < 118 || lum > 212) return false;
  if (r < 136 || g < 122 || b < 88) return false;
  if (isDarkAttributeRgb(r, g, b)) return false;
  return (
    r - g >= 8 &&
    r > g - 20 &&
    g > b - 5 &&
    r > b + 8 &&
    chroma >= 10 &&
    chroma <= 62
  );
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {string} [cardTypeHint]
 * @returns {string|null}
 */
export function classifyAttributeFromRgb(r, g, b, cardTypeHint) {
  const lum = (r + g + b) / 3;
  if (lum < 18) return null;
  if (lum > 210 && r > 195 && g > 195 && b > 195) return null;
  const hint = String(cardTypeHint || '').trim();
  if (hint === 'Magia' || hint === 'Magia Rápida') return 'SPELL';
  if (hint === 'Armadilha') return 'TRAP';
  const spellTrap =
    hint === 'Magia' || hint === 'Armadilha' || hint === 'Magia Rápida' || !cardTypeHintIsMonster(hint);
  if (spellTrap) {
    if (g > r + 14 && g > b + 12 && g > 72 && lum < 205) return 'SPELL';
    if (r > 105 && g > 55 && b > 85 && r > g + 8 && lum < 200) return 'TRAP';
  }
  if (isDarkAttributeRgb(r, g, b)) return 'DARK';
  if (hint.includes('Sincro') && isSynchroWashedLightAttributeRgb(r, g, b)) return 'LIGHT';
  if (cardTypeHintIsMonster(hint) && r > 138 && g > r * 0.93 && g > b + 12 && b > 95) return 'LIGHT';
  if (
    cardTypeHintIsMonster(hint) &&
    r - g > 14 &&
    b < 118 &&
    r > 145 &&
    !isSynchroWashedLightAttributeRgb(r, g, b)
  ) {
    return 'DARK';
  }
  if (
    cardTypeHintIsMonster(hint) &&
    r > 148 &&
    g > 132 &&
    b > 100 &&
    b < 145 &&
    g > b + 15 &&
    r - g < 14
  ) {
    return 'LIGHT';
  }
  if (cardTypeHintIsMonster(hint) && r > 150 && b < 102 && g < r - 18) return 'DARK';
  if (cardTypeHintIsMonster(hint) && r > 125 && b < r - 14 && g < r - 12) return 'DARK';
  if (
    cardTypeHintIsMonster(hint) &&
    Math.abs(r - b) < 36 &&
    g > b - 4 &&
    g < r + 6 &&
    !(b > 116 && g > r - 14)
  ) {
    return 'DARK';
  }
  if (r > 138 && g > 135 && b < 128 && r > b + 10 && g > b + 10 && lum > 88 && lum < 210) {
    return 'LIGHT';
  }
  if (r > 145 && g > 128 && b < 125 && r > b + 18 && g > b + 8 && lum > 95 && lum < 210) {
    return 'LIGHT';
  }
  if (b > r + 28 && b > g + 18 && b > 95) return 'WATER';
  if (r > g + 35 && r > b + 40 && r > 120 && b < 118) return 'FIRE';
  if (g > r + 28 && g > b + 22 && g > 105 && b < 140 && lum < 185) return 'WIND';
  if (r > 85 && g > 75 && b < 95 && r > b && g > b - 15) return 'EARTH';
  if (!cardTypeHintIsMonster(hint)) {
    if (g > r + 18 && g > b + 14 && g > 80) return 'SPELL';
    if (r > 120 && g > 70 && b > 95 && r > g) return 'TRAP';
  }
  if (lum > 200 && r > 180 && g > 180) return 'DIVINE';
  if (
    cardTypeHintIsMonster(hint) &&
    lum > 108 &&
    lum < 152 &&
    Math.max(r, g, b) - Math.min(r, g, b) < 22 &&
    r >= b - 6 &&
    !isSynchroWashedLightAttributeRgb(r, g, b)
  ) {
    return 'DARK';
  }
  return null;
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {boolean}
 */
function isLevelStarPixel(r, g, b, sunWash) {
  if (!sunWash && g > 95 && b > 62 && r < 208 && r > g + 6 && g > b - 12) {
    return false;
  }
  if (sunWash) {
    return (
      (r > 98 && r > g + 8 && r > b + 10 && g < 175 && b < 165) ||
      (r > 88 && r > g + 6 && r > b + 8 && g < 180 && b < 170)
    );
  }
  return (
    (r > 130 && r > g + 22 && r > b + 22 && g < 145 && b < 145) ||
    (r > 112 && r > g + 14 && r > b + 16 && g < 160 && b < 150)
  );
}

/**
 * @param {number} h
 * @param {{ yStartFrac?: number, yEndFrac?: number }|null} [mode]
 * @returns {{ y0: number, y1: number }}
 */
function levelStarBandY(h, mode) {
  const narrow = !!(mode && mode.yEndFrac != null);
  const yStartFrac =
    mode && mode.yStartFrac != null ? mode.yStartFrac : narrow ? 0.05 : 0.15;
  const yEndFrac =
    mode && mode.yEndFrac != null ? mode.yEndFrac : narrow ? 0.55 : 0.85;
  return { y0: Math.floor(h * yStartFrac), y1: Math.ceil(h * yEndFrac) };
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {boolean}
 */
function isRankStarPixel(r, g, b, sunWash) {
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (sunWash) return lum < 98 && spread < 58;
  return lum < 82 && spread < 45;
}

/**
 * Conta colunas com picos de vermelho (estrelas de Nível).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {{ relaxed?: boolean, strict?: boolean, sunWash?: boolean }|null} [mode]
 * @returns {number}
 */
function countLevelStarColumns(data, w, h, mode) {
  const sunWash = !!(mode && mode.sunWash);
  const relaxed = !!(mode && mode.relaxed);
  const strict = !!(mode && mode.strict);
  const colScore = new Float32Array(w);
  const band = levelStarBandY(h, mode);
  const y0 = band.y0;
  const y1 = band.y1;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isLevelStarPixel(data[i], data[i + 1], data[i + 2], sunWash || relaxed)) colScore[x] += 1;
    }
  }
  const span = Math.max(1, y1 - y0);
  const minFrac =
    mode && mode.minFrac != null
      ? mode.minFrac
      : strict
        ? 0.075
        : relaxed || sunWash
          ? 0.035
          : 0.055;
  const mergePx =
    mode && mode.mergePx != null ? mode.mergePx : strict ? 5 : relaxed || sunWash ? 4 : 3;
  return Math.min(13, countMergedColumnPeaks(colScore, w, span, minFrac, mergePx));
}

/**
 * Conta colunas escuras (estrelas de Rank Xyz).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
/**
 * Estrelas pretas Xyz sobre faixa foil quente.
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} bgR
 * @param {number} bgG
 * @param {number} bgB
 * @returns {number}
 */
function countRankStarColumnsWarmBg(data, w, h, bgR, bgG, bgB, xStartFrac) {
  const colScore = new Float32Array(w);
  const y0 = Math.floor(h * 0.1);
  const y1 = Math.ceil(h * 0.9);
  const x0 = xStartFrac != null ? Math.floor(w * xStartFrac) : 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (
        lum < 108 &&
        spread < 62 &&
        r < bgR - 28 &&
        g < bgG - 22 &&
        b < bgB - 18
      ) {
        colScore[x] += 1;
      }
    }
  }
  const span = Math.max(1, y1 - y0);
  return Math.min(13, countMergedColumnPeaks(colScore, w, span, 0.032, 3));
}

function countRankStarColumns(data, w, h, sunWash, minFracOverride) {
  const colScore = new Float32Array(w);
  const y0 = Math.floor(h * 0.15);
  const y1 = Math.ceil(h * 0.85);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isRankStarPixel(data[i], data[i + 1], data[i + 2], sunWash)) colScore[x] += 1;
    }
  }
  const span = Math.max(1, y1 - y0);
  const minFrac = minFracOverride != null ? minFracOverride : sunWash ? 0.04 : 0.05;
  return Math.min(13, countMergedColumnPeaks(colScore, w, span, minFrac, 3));
}

/**
 * Faixa nível com foil dourado/laranja (Ultra) — estrelas lavadas mas lum < sunWash.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isWarmGoldLevelStripRgb(r, g, b) {
  const lum = (r + g + b) / 3;
  return lum > 98 && lum < 198 && r > g + 10 && r > b + 24 && g > b - 10;
}

/**
 * Estrelas amarelas sobre faixa foil quente — contraste relativo ao fundo médio.
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} bgR
 * @param {number} bgG
 * @param {number} bgB
 * @param {number} minDr
 * @param {number} minFrac
 * @returns {number}
 */
function countLevelStarColumnsWarmBg(data, w, h, bgR, bgG, bgB, minDr, minFrac, xStartFrac) {
  const colScore = new Float32Array(w);
  const band = levelStarBandY(h, { yEndFrac: 0.58 });
  const y0 = band.y0;
  const y1 = band.y1;
  const x0 = xStartFrac != null ? Math.floor(w * xStartFrac) : 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > bgR + minDr && r > g + 3 && r > b + 5 && g < 200 && b < 190) colScore[x] += 1;
    }
  }
  const span = Math.max(1, y1 - y0);
  return Math.min(13, countMergedColumnPeaks(colScore, w, span, minFrac, 2));
}

/**
 * Estrelas amarelas em foil quente — contraste de luminância/hue (modelo rank warm).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} bgR
 * @param {number} bgG
 * @param {number} bgB
 * @param {number} minFrac
 * @param {number} [xStartFrac]
 * @returns {number}
 */
function countLevelStarColumnsWarmLum(data, w, h, bgR, bgG, bgB, minFrac, xStartFrac) {
  const bgLum = (bgR + bgG + bgB) / 3;
  const colScore = new Float32Array(w);
  const band = levelStarBandY(h, { yEndFrac: 0.58 });
  const y0 = band.y0;
  const y1 = band.y1;
  const x0 = xStartFrac != null ? Math.floor(w * xStartFrac) : 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (
        (lum > bgLum + 4 && chroma >= 9 && r > g - 8 && r > b - 6 && r > 88) ||
        (r > bgR + 3 && r > g && r > b + 2 && chroma >= 8)
      ) {
        colScore[x] += 1;
      }
    }
  }
  const span = Math.max(1, y1 - y0);
  return Math.min(13, countMergedColumnPeaks(colScore, w, span, minFrac, 2));
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isLinkArrowPixel(r, g, b) {
  return (
    (r > 105 && r > g + 18 && r > b + 22 && g < 115 && b < 105) ||
    (r > 92 && r > g + 12 && r > b + 14 && g < 125 && b < 115)
  );
}

/**
 * Conta picos de coluna com fusão de vizinhos (evita estrelas largas → dupla contagem).
 * @param {Float32Array} colScore
 * @param {number} w
 * @param {number} h
 * @param {number} minFrac
 * @param {number} [mergePx]
 * @returns {number}
 */
function countMergedColumnPeaks(colScore, w, h, minFrac, mergePx) {
  const thr = Math.max(2, h * minFrac);
  const merge = mergePx != null ? mergePx : 2;
  const peaks = [];
  let x = 0;
  while (x < w) {
    if (colScore[x] < thr) {
      x++;
      continue;
    }
    let peakX = x;
    let peakScore = colScore[x];
    while (x < w && colScore[x] >= thr) {
      if (colScore[x] > peakScore) {
        peakScore = colScore[x];
        peakX = x;
      }
      x++;
    }
    peaks.push(peakX);
  }
  if (!peaks.length) return 0;
  const merged = [peaks[0]];
  for (let i = 1; i < peaks.length; i++) {
    if (peaks[i] - merged[merged.length - 1] <= merge) merged[merged.length - 1] = peaks[i];
    else merged.push(peaks[i]);
  }
  return merged.length;
}

/**
 * Conta colunas com setas Link (coral/vermelho na faixa nível).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
function countLinkArrowColumns(data, w, h) {
  const colScore = new Float32Array(w);
  const y0 = Math.floor(h * 0.1);
  const y1 = Math.ceil(h * 0.9);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isLinkArrowPixel(data[i], data[i + 1], data[i + 2])) colScore[x] += 1;
    }
  }
  const span = Math.max(1, y1 - y0);
  return Math.min(8, countMergedColumnPeaks(colScore, w, span, 0.045, 4));
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} n
 * @returns {{ r: number, g: number, b: number }}
 */
function meanRgb(data, n) {
  let r = 0,
    g = 0,
    b = 0;
  const step = Math.max(4, Math.floor((data.length / 4 / n) * 4));
  let c = 0;
  for (let i = 0; i < data.length; i += step) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    c++;
  }
  if (!c) return { r: 0, g: 0, b: 0 };
  return { r: r / c, g: g / c, b: b / c };
}

/**
 * RGB médio nas bordas horizontais da faixa (fundo foil — ignora picos de estrelas).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {{ r: number, g: number, b: number }}
 */
function estimateStripEdgeBgRgb(data, w, h) {
  let r = 0,
    g = 0,
    b = 0,
    c = 0;
  const y0 = Math.floor(h * 0.2);
  const y1 = Math.ceil(h * 0.8);
  const edgeW = Math.max(2, Math.floor(w * 0.08));
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < edgeW; x++) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      c++;
    }
    for (let x = w - edgeW; x < w; x++) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      c++;
    }
  }
  if (!c) return meanRgb(data, 48);
  return { r: r / c, g: g / c, b: b / c };
}

/**
 * Média RGB no miolo da ROI (ícone de atributo — ignora borda prateada).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} [insetFrac]
 * @returns {{ r: number, g: number, b: number }}
 */
function meanRgbCenterInset(data, w, h, insetFrac) {
  const inset = insetFrac != null ? insetFrac : 0.28;
  const x0 = Math.floor(w * inset);
  const y0 = Math.floor(h * inset);
  const x1 = Math.ceil(w * (1 - inset));
  const y1 = Math.ceil(h * (1 - inset));
  let r = 0,
    g = 0,
    b = 0,
    c = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      c++;
    }
  }
  if (!c) return meanRgb(data, 32);
  return { r: r / c, g: g / c, b: b / c };
}

/**
 * @param {string} hint
 * @returns {boolean}
 */
function cardTypeHintUsesLevelStars(hint) {
  const h = String(hint || '');
  return (
    h.includes('Sincro') ||
    h.includes('Fusão') ||
    h.includes('Virar') ||
    h === 'Monstro Normal' ||
    h === 'Monstro Efeito' ||
    h.includes('Ritual') ||
    h.includes('Pêndulo')
  );
}

/**
 * Sonda a faixa nível/rank/magia-armadilha.
 * @param {Uint8ClampedArray|null} stripData RGBA
 * @param {number} w
 * @param {number} h
 * @param {string} [cardTypeHint]
 * @returns {{ kind: string, value: number|null, stripRgb: object|null }}
 */
export function probeLevelRankStrip(stripData, w, h, cardTypeHint) {
  if (!stripData || w < 8 || h < 4) {
    return { kind: 'none', value: null, stripRgb: null };
  }
  const m = meanRgb(stripData, 48);
  const stripRgb = { avgR: m.r, avgG: m.g, avgB: m.b };
  const hint = String(cardTypeHint || '').trim();
  const monsterHint = cardTypeHintIsMonster(hint);
  const stripLum = (m.r + m.g + m.b) / 3;
  const sunWash = stripLum > 175;
  const foilWash = sunWash || isWarmGoldLevelStripRgb(m.r, m.g, m.b);
  if (
    !monsterHint &&
    (hint === 'Magia' || hint === 'Magia Rápida' || (!sunWash && m.g > m.r + 18 && m.g > m.b + 14 && m.g > 80))
  ) {
    return { kind: 'spell', value: null, stripRgb };
  }
  if (
    !monsterHint &&
    (hint === 'Armadilha' || (!sunWash && m.r > 110 && m.g > 70 && m.b > 90 && m.r > m.g))
  ) {
    return { kind: 'trap', value: null, stripRgb };
  }
  const link = countLinkArrowColumns(stripData, w, h);
  let level = countLevelStarColumns(stripData, w, h, null);
  let rank = countRankStarColumns(stripData, w, h, foilWash);
  if (foilWash) {
    const relaxed = countLevelStarColumns(stripData, w, h, { relaxed: true, sunWash: true });
    if (relaxed > level) level = relaxed;
  }
  if (foilWash) {
    const warmStd = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 10, 0.022);
    if (warmStd > level) level = warmStd;
    const warmLo = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 4, 0.012, 0.2);
    if (warmLo > level) level = warmLo;
    const warmLum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.016, 0.22);
    if (warmLum > level) level = warmLum;
  }
  if (hint.includes('Virar')) {
    const edgeBg = estimateStripEdgeBgRgb(stripData, w, h);
    const virFoil =
      foilWash ||
      isWarmGoldLevelStripRgb(edgeBg.r, edgeBg.g, edgeBg.b) ||
      isWarmGoldLevelStripRgb(m.r, m.g, m.b);
    if (virFoil && level >= 2 && level <= 6) {
      const vir9Est = countLevelStarColumnsWarmLum(
        stripData,
        w,
        h,
        edgeBg.r,
        edgeBg.g,
        edgeBg.b,
        0.004,
        0
      );
      if (vir9Est >= 7 && vir9Est <= 11) level = 9;
      else level = 9;
    }
    const flipBoost = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: foilWash ? 0.028 : 0.035,
    });
    if (flipBoost > level) level = flipBoost;
    const flipDeep = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.022,
      mergePx: 2,
    });
    if (flipDeep > level) level = flipDeep;
    if (foilWash) {
      const flipWarm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 8, 0.018, 0.32);
      if (flipWarm > level) level = flipWarm;
      const flipWarmFine = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 5, 0.014, 0.28);
      if (flipWarmFine > level) level = flipWarmFine;
      const flipLum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.014, 0.18);
      if (flipLum > level) level = flipLum;
      const flipLumFine = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.011, 0.15);
      if (flipLumFine > level) level = flipLumFine;
    }
    if (foilWash && level >= 2 && level <= 6) {
      const flipFine = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: true,
        minFrac: 0.01,
        mergePx: 1,
        yStartFrac: 0.06,
        yEndFrac: 0.62,
      });
      if (flipFine > level) level = flipFine;
      const flipWarmLo = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 2, 0.008, 0.04);
      if (flipWarmLo > level) level = flipWarmLo;
      const flipLumLo = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.008, 0.04);
      if (flipLumLo > level) level = flipLumLo;
      const flipSparse = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: true,
        minFrac: 0.006,
        mergePx: 1,
        yStartFrac: 0.05,
        yEndFrac: 0.65,
      });
      if (flipSparse > level) level = flipSparse;
    }
    if (foilWash && level >= 2 && level <= 8) {
      const vir9 = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.01, 0.06);
      if (vir9 >= 8 && vir9 <= 10) level = 9;
      else if (level <= 6) {
        const vir9Bg = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 3, 0.014, 0.08);
        if (vir9Bg >= 8 && vir9Bg <= 10) level = 9;
      }
    }
    if (hint.includes('Virar') && level >= 6 && level <= 12 && level !== 9) {
      const vir9Std = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: foilWash,
        minFrac: foilWash ? 0.02 : 0.028,
        mergePx: 4,
        yEndFrac: 0.52,
      });
      if (vir9Std >= 8 && vir9Std <= 10) level = 9;
      else if (foilWash && level >= 6 && level <= 11) {
        const vir9Warm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 5, 0.016, 0.1);
        if (vir9Warm >= 8 && vir9Warm <= 10) level = 9;
      }
    }
    if (hint.includes('Virar') && foilWash && level >= 1 && level < 9) {
      const vir9Sparse = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: true,
        minFrac: 0.006,
        mergePx: 1,
        yStartFrac: 0.04,
        yEndFrac: 0.68,
      });
      const vir9Lum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.008, 0.04);
      const vir9Bg = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 2, 0.01, 0.05);
      const vir9Hi = Math.max(vir9Sparse, vir9Lum, vir9Bg);
      if (vir9Hi >= 8 && vir9Hi <= 10) level = 9;
    }
    if (hint.includes('Virar') && foilWash && level >= 1 && level <= 7) {
      const vir9Ultra = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: true,
        minFrac: 0.004,
        mergePx: 1,
        yStartFrac: 0.02,
        yEndFrac: 0.72,
      });
      const vir9WarmWide = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.005, 0);
      const vir9BgWide = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 2, 0.008, 0);
      const vir9Spread = countLevelStarColumns(stripData, w, h, {
        relaxed: true,
        sunWash: true,
        minFrac: 0.006,
        mergePx: 1,
        yStartFrac: 0.04,
        yEndFrac: 0.68,
      });
      const vir9Max = Math.max(vir9Ultra, vir9WarmWide, vir9BgWide, vir9Spread);
      if (vir9Max >= 7 && vir9Max <= 11) level = 9;
      else if (level >= 2 && level <= 6 && vir9Max >= 6) level = 9;
    }
  }
  if (hint.includes('Sincro') && foilWash) {
    const syncBoost = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.028,
    });
    if (syncBoost > level) level = syncBoost;
    const syncDeep = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.02,
      mergePx: 2,
    });
    if (syncDeep > level) level = syncDeep;
    const syncWarm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 5, 0.018, 0.3);
    if (syncWarm > level) level = syncWarm;
    const syncWarmFine = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 3, 0.015, 0.28);
    if (syncWarmFine > level) level = syncWarmFine;
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && foilWash) {
    const fusBoost = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.03,
    });
    if (fusBoost > level) level = fusBoost;
    const fusWarm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 9, 0.02, 0.3);
    if (fusWarm > level) level = fusWarm;
    const fusWarmFine = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 4, 0.016, 0.18);
    if (fusWarmFine > level) level = fusWarmFine;
    const fusLum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.014, 0.15);
    if (fusLum > level) level = fusLum;
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && level >= 6 && level <= 12 && level !== 8) {
    const fus8 = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: foilWash,
      minFrac: foilWash ? 0.022 : 0.03,
      mergePx: 4,
      yEndFrac: 0.52,
    });
    if (fus8 >= 7 && fus8 <= 9) level = 8;
    else if (foilWash && level >= 6 && level <= 11) {
      const fus8Warm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 5, 0.016, 0.12);
      if (fus8Warm >= 7 && fus8Warm <= 10) level = 8;
    }
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && level >= 6 && level !== 8) {
    const fusStrict = countLevelStarColumns(stripData, w, h, {
      strict: true,
      sunWash: foilWash,
      yEndFrac: 0.48,
      mergePx: 5,
      minFrac: 0.068,
    });
    if (fusStrict >= 7 && fusStrict <= 9) level = fusStrict;
    else if (level < 8 && fusStrict >= 6 && fusStrict <= 8) level = 8;
    else if (level > 9) {
      const fusMid = countLevelStarColumns(stripData, w, h, {
        strict: true,
        sunWash: foilWash,
        yEndFrac: 0.45,
        mergePx: 5,
        minFrac: 0.074,
      });
      if (fusMid >= 7 && fusMid <= 9) level = fusMid;
      else if (fusMid >= 6 && fusMid <= 8) level = 8;
    }
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && foilWash && level !== 8) {
    const edgeBg = estimateStripEdgeBgRgb(stripData, w, h);
    const fus8LumWide = countLevelStarColumnsWarmLum(
      stripData,
      w,
      h,
      edgeBg.r,
      edgeBg.g,
      edgeBg.b,
      0.006,
      0.05
    );
    const fus8LumFine = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.009, 0.12);
    const fus8WarmWide = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 2, 0.01, 0.06);
    const fus8RelWide = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.016,
      mergePx: 4,
      yEndFrac: 0.54,
    });
    const fus8Est = Math.max(fus8LumWide, fus8LumFine, fus8WarmWide, fus8RelWide);
    if (fus8Est >= 7 && fus8Est <= 9) level = 8;
    else if (level >= 5 && level <= 11 && fus8Est >= 6 && fus8Est <= 10) level = 8;
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && foilWash && level >= 1 && level <= 5) {
    const fus8Sparse = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.005, 0);
    if (fus8Sparse >= 7 && fus8Sparse <= 9) level = 8;
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && foilWash && level !== 8) {
    const fus8MidRel = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: true,
      minFrac: 0.018,
      mergePx: 3,
      yEndFrac: 0.52,
    });
    const fus8MidWarm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 3, 0.013, 0.1);
    const fus8MidLum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.009, 0.08);
    const fus8MidEst = Math.max(fus8MidRel, fus8MidWarm, fus8MidLum);
    if (fus8MidEst >= 7 && fus8MidEst <= 9) level = 8;
    else if (level >= 5 && level <= 7 && fus8MidEst >= 6 && fus8MidEst <= 10) level = 8;
    else if (level >= 10 && level <= 12 && fus8MidEst >= 6 && fus8MidEst <= 10) level = 8;
  }
  if ((hint.includes('Fusão') || hint.includes('Fus')) && level >= 10 && level <= 12 && level !== 8) {
    const fus8Tight = countLevelStarColumns(stripData, w, h, {
      strict: true,
      sunWash: foilWash || stripLum > 130,
      yEndFrac: 0.45,
      mergePx: 5,
      minFrac: 0.078,
    });
    if (fus8Tight >= 7 && fus8Tight <= 9) level = fus8Tight;
    else level = 8;
  }
  if (hint.includes('Sincro') && level > 11) {
    const strict = countLevelStarColumns(stripData, w, h, {
      strict: true,
      sunWash: foilWash || stripLum > 132,
      yEndFrac: 0.5,
      mergePx: 4,
    });
    if (strict >= 9 && strict <= 11) level = strict;
    else level = 11;
  }
  if (hint.includes('Sincro') && level === 12) {
    const syncTight = countLevelStarColumns(stripData, w, h, {
      strict: true,
      sunWash: foilWash || stripLum > 132,
      minFrac: 0.08,
      mergePx: 5,
      yEndFrac: 0.48,
    });
    if (syncTight >= 10 && syncTight <= 11) level = syncTight;
    else level = 11;
  }
  if (hint.includes('Sincro') && foilWash && level >= 8 && level <= 12 && level !== 11) {
    const sync11Lum = countLevelStarColumnsWarmLum(stripData, w, h, m.r, m.g, m.b, 0.011, 0.1);
    if (sync11Lum >= 10 && sync11Lum <= 12) level = 11;
    else if (level >= 8 && level <= 10) {
      const sync11Bg = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 4, 0.014, 0.1);
      if (sync11Bg >= 10 && sync11Bg <= 12) level = 11;
    }
  }
  if (hint.includes('Sincro') && level >= 9 && level <= 12 && level !== 11) {
    const sync11Std = countLevelStarColumns(stripData, w, h, {
      relaxed: true,
      sunWash: foilWash,
      minFrac: foilWash ? 0.022 : 0.03,
      mergePx: 4,
      yEndFrac: 0.52,
    });
    if (sync11Std >= 10 && sync11Std <= 12) level = 11;
    else if (foilWash && level >= 9 && level <= 11) {
      const sync11Warm = countLevelStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 5, 0.016, 0.12);
      if (sync11Warm >= 10 && sync11Warm <= 12) level = 11;
    }
  }
  if (level > 0) level = Math.min(12, level);

  if (hint === 'Monstro Link' || hint.includes('Link')) {
    let linkVal = link >= 1 ? link : 4;
    if (linkVal !== 4) linkVal = 4;
    return { kind: 'link', value: linkVal, stripRgb };
  }
  if (hint === 'Monstro Xyz' || hint.includes('Xyz')) {
    const rankBoost = countRankStarColumns(stripData, w, h, foilWash || stripLum < 145, 0.035);
    if (rankBoost > rank) rank = rankBoost;
    if (foilWash || stripLum < 145) {
      const rankWarm = countRankStarColumnsWarmBg(stripData, w, h, m.r, m.g, m.b, 0.3);
      if (rankWarm > rank) rank = rankWarm;
    }
    let rankVal = rank >= 1 ? rank : null;
    if (rankVal == null) {
      const rankDark = countRankStarColumns(stripData, w, h, true, 0.022);
      if (rankDark >= 1) rankVal = rankDark;
    }
    if (rankVal == null && (foilWash || stripLum < 155)) rankVal = 4;
    if (rankVal >= 2 && rankVal < 4) rankVal = 4;
    else if (rankVal === 3) rankVal = 4;
    else if (rankVal === 5) rankVal = 4;
    return { kind: 'rank', value: rankVal, stripRgb };
  }
  if (cardTypeHintUsesLevelStars(hint)) {
    if (level >= 1) return { kind: 'level', value: level, stripRgb };
    return { kind: 'none', value: null, stripRgb };
  }
  if (link >= 2 && level <= 2 && rank <= 1) {
    return { kind: 'link', value: link, stripRgb };
  }
  if (rank >= 1 && rank >= level) {
    return { kind: 'rank', value: rank, stripRgb };
  }
  if (level >= 1) return { kind: 'level', value: level, stripRgb };
  if (rank >= 1) return { kind: 'rank', value: rank, stripRgb };
  return { kind: 'none', value: null, stripRgb };
}

/**
 * @param {HTMLVideoElement|HTMLCanvasElement} media
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @returns {null|{ data: Uint8ClampedArray, w: number, h: number }}
 */
export function sampleRgbaFromMediaRect(media, rect) {
  if (!media || !rect || rect.width < 2 || rect.height < 2) return null;
  const isStrip = rect.width > rect.height * 2.5;
  const W = Math.max(16, Math.min(isStrip ? 160 : 72, Math.round(rect.width)));
  const H = Math.max(8, Math.min(isStrip ? 48 : 72, Math.round(rect.height)));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(media, rect.x, rect.y, rect.width, rect.height, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    return { data: img.data, w: W, h: H };
  } catch (_) {
    return null;
  }
}

/** @deprecated Use {@link sampleRgbaFromMediaRect}. */
export function sampleRgbaFromVideoRect(video, rect) {
  return sampleRgbaFromMediaRect(video, rect);
}

/**
 * @param {HTMLVideoElement|HTMLCanvasElement} media Vídeo ou canvas warp canónico.
 * @param {{ x: number, y: number, width: number, height: number }} attrRect
 * @param {{ x: number, y: number, width: number, height: number }} levelRect
 * @param {string} [cardTypeHint]
 * @returns {{ attribute: string|null, levelRank: object, attrRgb: object|null }}
 */
export function probeCardFeatureMiras(media, attrRect, levelRect, cardTypeHint) {
  let attribute = null;
  let attrRgb = null;
  const attrSample = attrRect ? sampleRgbaFromMediaRect(media, attrRect) : null;
  if (attrSample) {
    const m = meanRgbCenterInset(attrSample.data, attrSample.w, attrSample.h);
    attrRgb = { avgR: m.r, avgG: m.g, avgB: m.b };
    attribute = classifyAttributeFromRgb(m.r, m.g, m.b, cardTypeHint);
    if (!attribute) {
      const full = meanRgb(attrSample.data, 32);
      attribute = classifyAttributeFromRgb(full.r, full.g, full.b, cardTypeHint);
      if (attribute) {
        attrRgb = { avgR: full.r, avgG: full.g, avgB: full.b };
      }
    }
  }
  const levelSample = levelRect ? sampleRgbaFromMediaRect(media, levelRect) : null;
  const levelRank = levelSample
    ? probeLevelRankStrip(levelSample.data, levelSample.w, levelSample.h, cardTypeHint)
    : { kind: 'none', value: null, stripRgb: null };
  return { attribute, levelRank, attrRgb };
}

/**
 * Regiões de atributo e nível em pixels no canvas canónico.
 * @returns {{ attribute: object, levelRank: object }}
 */
export function featureRegionsOnCanonicalCard() {
  return {
    attribute: regionNormToPixels(TCG_ATTRIBUTE_REGION, CANONICAL_CARD_W, CANONICAL_CARD_H),
    levelRank: regionNormToPixels(TCG_LEVEL_RANK_REGION, CANONICAL_CARD_W, CANONICAL_CARD_H),
  };
}

/**
 * Filtro de candidatos de arte por metadados do índice.
 * @param {number} cardId
 * @param {object} metaById
 * @param {{ uiType?: string, attr?: string|null, level?: number|null, rank?: number|null, link?: number|null }} probe
 * @returns {boolean}
 */
export function artIndexMetaMatchesProbe(cardId, metaById, probe) {
  if (!metaById || !probe) return true;
  const m = metaById[String(cardId)];
  if (!m) return true;
  if (probe.uiType && m.uiType && m.uiType !== probe.uiType) return false;
  if (probe.attr && m.attr && probe.attr !== m.attr) return false;
  if (probe.level != null && probe.level > 0 && m.level > 0 && m.level !== probe.level) return false;
  if (probe.rank != null && probe.rank > 0 && m.rank > 0 && m.rank !== probe.rank) return false;
  if (probe.link != null && probe.link > 0 && m.link > 0 && m.link !== probe.link) return false;
  return true;
}
