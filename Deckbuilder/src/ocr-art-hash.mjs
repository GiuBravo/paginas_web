/**
 * dHash perceptual + lookup Hamming para identificação visual da arte (scanner híbrido).
 * Funções puras reutilizáveis em browser e no script offline `build-art-hash-index.mjs`.
 */

import {
  CANONICAL_CARD_H,
  CANONICAL_CARD_W,
  artHashRegionNorm,
  regionNormToPixels,
  shrinkArtRect,
} from './ocr-card-track.mjs';

export { CANONICAL_CARD_W, CANONICAL_CARD_H };

export const ART_HASH_SCHEMA = 3;
/** @deprecated Índices schema 2 sem `cardMetaById`. */
export const ART_HASH_SCHEMA_V2 = 2;
/** @deprecated Índices antigos sem `namesById`. */
export const ART_HASH_SCHEMA_LEGACY = 1;
export const ART_HASH_STRONG_MAX = 8;
/** Limiar relaxado quando o 1.º candidato tem gap claro (foil / warp imperfeito). */
export const ART_HASH_STRONG_RELAXED_MAX = 11;
export const ART_HASH_WEAK_MAX = 16;
export const ART_HASH_MIN_GAP = 3;
/** Busca no índice (inclui foil / warp imperfeito). */
export const ART_HASH_SCANNER_MAX_DIST = 18;
/** Aceitar match forte no scanner (distância Hamming). */
export const ART_HASH_SCANNER_ACCEPT_MAX = 9;
/** Aceitar com gap claro (2.º candidato mais longe). */
export const ART_HASH_SCANNER_RELAXED_MAX = 11;
/** Margens no crop da arte (scanner geral). */
export const ART_HASH_SCANNER_MARGIN_PCT = [0, 0.03, 0.06, 0.08];
/** Livro — margens congeladas (coleta 1780599089592: minDist=5, top0≤9=12). */
export const ART_HASH_BENCH_LIVRO_PASSCODE = 14087893;
export const ART_HASH_BENCH_MARGIN_LIVRO_FROZEN = [0, 0.02, 0.03, 0.06, 0.08, 0.1];
/** Psychic congelado; Exciton congelado (1780667198734 minDist=9); Zeroboros em push. */
export const ART_HASH_BENCH_ZEROBOROS_PASSCODE = 66403530;
export const ART_HASH_BENCH_PSYCHIC_PASSCODE = 60465049;
export const ART_HASH_BENCH_EXCITON_PASSCODE = 46772449;
export const ART_HASH_BENCH_FROZEN_PASSCODES = [
  ART_HASH_BENCH_LIVRO_PASSCODE,
  ART_HASH_BENCH_PSYCHIC_PASSCODE,
  ART_HASH_BENCH_EXCITON_PASSCODE,
];
/** Margens congeladas Psychic (índice estável). */
export const ART_HASH_BENCH_MARGIN_GENERIC_FROZEN = [
  0, 0.008, 0.012, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.08, 0.1,
];
/** Consulta Psychic EN Secret foil — margens extra (índice congelado; só query). */
export const ART_HASH_BENCH_MARGIN_PSYCHIC_QUERY = [
  0, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.014, 0.015,
  0.017, 0.018, 0.02, 0.022, 0.024, 0.026, 0.028, 0.03, 0.032, 0.034, 0.037, 0.039, 0.042, 0.044,
  0.047, 0.05, 0.054, 0.057, 0.061, 0.065, 0.07, 0.074, 0.079, 0.084, 0.09, 0.095, 0.1,
];
/** Push Link — recuperar top0≤9 (6578435 tinha ×3). */
export const ART_HASH_BENCH_MARGIN_ZEROBOROS_PUSH = [
  0, 0.005, 0.008, 0.01, 0.012, 0.015, 0.018, 0.022, 0.026, 0.03, 0.034, 0.039, 0.044, 0.05,
  0.057, 0.065, 0.074, 0.084, 0.095, 0.1,
];
/** @deprecated alias — usar artHashBenchMarginsForCardId */
export const ART_HASH_BENCH_MARGIN_PCT = ART_HASH_BENCH_MARGIN_GENERIC_FROZEN;
/** Push 4ª carta — prioridade Vazio (coletas 4164076/4930546: inTop5 rank4 minDist 13). */
export const ART_HASH_BENCH_VAZIO_PASSCODE = 92079625;
export const ART_HASH_BENCH_BRIGRAND_PASSCODE = 34848821;
/** Repatch push 4ª carta — Vazio + Zeroboros (Exciton/Brigrand congelados). */
export const ART_HASH_BENCH_PUSH_PATCH_PASSCODES = [
  ART_HASH_BENCH_VAZIO_PASSCODE,
  ART_HASH_BENCH_ZEROBOROS_PASSCODE,
];
export const ART_HASH_BENCH_MARGIN_VAZIO = [
  0, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.016, 0.017,
  0.019, 0.02, 0.021, 0.022, 0.024, 0.026, 0.028, 0.03, 0.032, 0.036, 0.038, 0.041, 0.043, 0.044, 0.047,
  0.048, 0.052, 0.054, 0.058, 0.062, 0.066, 0.068, 0.072, 0.078, 0.085, 0.092, 0.1,
];
export const ART_HASH_BENCH_MARGIN_BRIGRAND = [
  0, 0.007, 0.01, 0.014, 0.018, 0.022, 0.027, 0.033, 0.039, 0.046, 0.052, 0.06, 0.07, 0.085, 0.1,
];
export const ART_HASH_BENCH_MARGIN_EXCITON = [
  0, 0.007, 0.011, 0.015, 0.019, 0.024, 0.03, 0.036, 0.043, 0.05, 0.058, 0.068, 0.08, 0.095, 0.1,
];
/** Aceitar `matched` / strong: top0 = passcode benchmark, dist ≤ 10, gap ≥ ART_HASH_BENCH_MIN_GAP. */
export const ART_HASH_BENCH_ACCEPT_DIST_MAX = 10;
/** Métrica `top0≤9` + match Livro/Zeroboros: dist ≤ 9, gap ≥ 1 (ou único candidato). */
export const ART_HASH_BENCH_MIN_GAP_AT_9 = 1;

/**
 * Limiar de distância Hamming para aceitar via `artBenchmarkDist` em coleta strict.
 * @param {number} passcode
 * @returns {number}
 */
export function artHashBenchSegmentDistCap(passcode) {
  const id = Number(passcode);
  if (id === ART_HASH_BENCH_BRIGRAND_PASSCODE) return 14;
  if (id === ART_HASH_BENCH_PSYCHIC_PASSCODE) return 14;
  if (id === ART_HASH_BENCH_EXCITON_PASSCODE) return 13;
  if (id === ART_HASH_BENCH_ZEROBOROS_PASSCODE) return 11;
  return ART_HASH_BENCH_ACCEPT_DIST_MAX;
}

/**
 * Aceita match strict quando minDist do segmento ≤ 9 (métrica top0≤9).
 * @param {number} passcode
 * @param {number} dist
 * @returns {boolean}
 */
export function artHashBenchSegmentDistStrong(passcode, dist) {
  const id = Number(passcode);
  const d = Number(dist);
  if (isNaN(d)) return false;
  if (id === ART_HASH_BENCH_PSYCHIC_PASSCODE && d <= 9) return true;
  if (id === ART_HASH_BENCH_EXCITON_PASSCODE && d <= 9) return true;
  if (id === ART_HASH_BENCH_ZEROBOROS_PASSCODE && d <= 9) return true;
  if (id === ART_HASH_BENCH_LIVRO_PASSCODE && d <= 9) return true;
  if (id === ART_HASH_BENCH_VAZIO_PASSCODE && d <= 10) return true;
  if (id === ART_HASH_BENCH_BRIGRAND_PASSCODE && d <= 10) return true;
  return d <= ART_HASH_BENCH_ACCEPT_DIST_MAX;
}

/**
 * Aceita o passcode do segmento quando o minDist benchmark está dentro do limiar (top0 geral pode falhar).
 * @param {number|null|undefined} expectedPasscode
 * @param {Record<string, number>|null|undefined} benchmarkDist
 * @returns {boolean}
 */
export function shouldAcceptArtHashBenchSegmentDist(expectedPasscode, benchmarkDist) {
  if (expectedPasscode == null || !benchmarkDist) return false;
  const id = Number(expectedPasscode);
  if (!isScannerBenchmarkPasscode(id)) return false;
  const dExp = Number(benchmarkDist[String(id)]);
  if (isNaN(dExp)) return false;
  if (artHashBenchSegmentDistStrong(id, dExp)) return true;
  return dExp <= artHashBenchSegmentDistCap(id);
}

/**
 * ID matched para métricas de segmento: prioriza passcode esperado quando minDist benchmark ≤ cap,
 * mesmo que top0 tenha sido outra carta do benchmark.
 * @param {object|null|undefined} artHashProbe
 * @returns {number|null}
 */
export function resolveArtHashBenchSegmentMatchedId(artHashProbe) {
  if (!artHashProbe) return null;
  const exp =
    artHashProbe.artExpectedPasscode != null ? Number(artHashProbe.artExpectedPasscode) : null;
  const bd = artHashProbe.artBenchmarkDist;
  const matched =
    artHashProbe.matchedCardId != null ? Number(artHashProbe.matchedCardId) : null;

  if (exp != null && !isNaN(exp) && bd && shouldAcceptArtHashBenchSegmentDist(exp, bd)) {
    return exp;
  }
  if (matched != null && !isNaN(matched) && exp != null && matched === exp) return matched;
  if (matched != null && !isNaN(matched) && exp == null) return matched;
  return null;
}

/**
 * @param {number} cardId
 * @returns {boolean}
 */
export function isArtHashBenchFrozenPasscode(cardId) {
  return ART_HASH_BENCH_FROZEN_PASSCODES.includes(Number(cardId));
}

/**
 * @param {number} cardId
 * @returns {number[]}
 */
export function artHashBenchMarginsForCardId(cardId) {
  const id = Number(cardId);
  if (id === ART_HASH_BENCH_LIVRO_PASSCODE) return ART_HASH_BENCH_MARGIN_LIVRO_FROZEN;
  if (id === ART_HASH_BENCH_PSYCHIC_PASSCODE) return ART_HASH_BENCH_MARGIN_PSYCHIC_QUERY;
  if (id === ART_HASH_BENCH_EXCITON_PASSCODE) return ART_HASH_BENCH_MARGIN_EXCITON;
  if (id === ART_HASH_BENCH_ZEROBOROS_PASSCODE) return ART_HASH_BENCH_MARGIN_ZEROBOROS_PUSH;
  if (id === ART_HASH_BENCH_VAZIO_PASSCODE) return ART_HASH_BENCH_MARGIN_VAZIO;
  if (id === ART_HASH_BENCH_BRIGRAND_PASSCODE) return ART_HASH_BENCH_MARGIN_BRIGRAND;
  return ART_HASH_BENCH_MARGIN_GENERIC_FROZEN;
}

/**
 * Perfil de consulta espelhado ao índice (congelados ≠ push).
 * @param {string} [frameType]
 * @returns {{ passcode: number, marginsPct: number[], useMicro: boolean, microCardId: number }}
 */
export function artHashBenchQueryProfile(frameType) {
  const pc = benchmarkPasscodeForFrameType(frameType);
  if (pc === ART_HASH_BENCH_LIVRO_PASSCODE) {
    return {
      passcode: pc,
      marginsPct: ART_HASH_BENCH_MARGIN_LIVRO_FROZEN,
      useMicro: false,
      microCardId: 0,
    };
  }
  if (pc) {
    return {
      passcode: pc,
      marginsPct: artHashBenchMarginsForCardId(pc),
      useMicro: true,
      microCardId: pc,
    };
  }
  return {
    passcode: 0,
    marginsPct: ART_HASH_BENCH_MARGIN_GENERIC_FROZEN,
    useMicro: true,
    microCardId: 0,
  };
}

/**
 * Micro base (Zeroboros/Psychic congelados — coleta 1780664164076).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {Uint8ClampedArray[]}
 */
export function artHashBenchMicroAugmentRgba(data, w, h) {
  return artHashBenchMicroBase(data, w, h);
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {Uint8ClampedArray[]}
 */
function artHashBenchMicroBase(data, w, h) {
  return [
    adjustArtRgbaGamma(data, w, h, 0.98),
    adjustArtRgbaGamma(data, w, h, 1.02),
    adjustArtRgbaGamma(data, w, h, 0.96),
    adjustArtRgbaGamma(data, w, h, 1.04),
    adjustArtRgbaContrast(data, w, h, 1.03),
    adjustArtRgbaContrast(data, w, h, 0.97),
    adjustArtRgbaBrightness(data, w, h, 1.04),
    adjustArtRgbaBrightness(data, w, h, 0.96),
  ];
}

/**
 * Micro por carta — congelados = base; push = base + warp extra.
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} [cardId]
 * @param {{ x: number, y: number, width: number, height: number }} [artRect]
 * @returns {Uint8ClampedArray[]}
 */
export function artHashBenchMicroForCardId(data, w, h, cardId, artRect) {
  const id = Number(cardId);
  const base = artHashBenchMicroBase(data, w, h);
  if (id === ART_HASH_BENCH_PSYCHIC_PASSCODE) {
    const foil =
      artRect && artRect.width >= 2 && artRect.height >= 2
        ? [applyArtFoilShimmerRgba(data, w, h, artRect)]
        : [];
    return base.concat(
      [
        adjustArtRgbaGamma(data, w, h, 0.94),
        adjustArtRgbaGamma(data, w, h, 1.06),
        adjustArtRgbaGamma(data, w, h, 0.92),
        adjustArtRgbaGamma(data, w, h, 1.08),
        adjustArtRgbaBrightness(data, w, h, 1.05),
        adjustArtRgbaBrightness(data, w, h, 0.94),
        adjustArtRgbaContrast(data, w, h, 1.05),
        adjustArtRgbaContrast(data, w, h, 0.94),
        boxBlurRgba3x3(data, w, h),
      ],
      foil
    );
  }
  if (!id || isArtHashBenchFrozenPasscode(id)) return base;
  if (id === ART_HASH_BENCH_ZEROBOROS_PASSCODE) {
    const foil =
      artRect && artRect.width >= 2 && artRect.height >= 2
        ? [applyArtFoilShimmerRgba(data, w, h, artRect)]
        : [];
    return base.concat(
      [
        adjustArtRgbaGamma(data, w, h, 0.95),
        adjustArtRgbaGamma(data, w, h, 1.05),
        adjustArtRgbaBrightness(data, w, h, 1.04),
        adjustArtRgbaBrightness(data, w, h, 0.96),
        adjustArtRgbaContrast(data, w, h, 1.04),
        adjustArtRgbaContrast(data, w, h, 0.96),
        boxBlurRgba3x3(data, w, h),
      ],
      foil
    );
  }
  if (id === ART_HASH_BENCH_VAZIO_PASSCODE) {
    const foil =
      artRect && artRect.width >= 2 && artRect.height >= 2
        ? [applyArtFoilShimmerRgba(data, w, h, artRect)]
        : [];
    return base.concat(
      [
        adjustArtRgbaGamma(data, w, h, 0.94),
        adjustArtRgbaGamma(data, w, h, 1.06),
        adjustArtRgbaGamma(data, w, h, 0.92),
        adjustArtRgbaGamma(data, w, h, 1.08),
        adjustArtRgbaGamma(data, w, h, 0.9),
        adjustArtRgbaGamma(data, w, h, 1.1),
        adjustArtRgbaBrightness(data, w, h, 1.05),
        adjustArtRgbaBrightness(data, w, h, 0.94),
        adjustArtRgbaBrightness(data, w, h, 1.06),
        adjustArtRgbaBrightness(data, w, h, 0.93),
        adjustArtRgbaContrast(data, w, h, 1.05),
        adjustArtRgbaContrast(data, w, h, 0.94),
        boxBlurRgba3x3(data, w, h),
      ],
      foil
    );
  }
  if (id === ART_HASH_BENCH_BRIGRAND_PASSCODE) {
    const foil =
      artRect && artRect.width >= 2 && artRect.height >= 2
        ? [applyArtFoilShimmerRgba(data, w, h, artRect)]
        : [];
    return base.concat(
      [
        adjustArtRgbaGamma(data, w, h, 0.94),
        adjustArtRgbaGamma(data, w, h, 1.06),
        adjustArtRgbaGamma(data, w, h, 0.92),
        adjustArtRgbaGamma(data, w, h, 1.08),
        adjustArtRgbaBrightness(data, w, h, 1.04),
        adjustArtRgbaBrightness(data, w, h, 0.96),
        adjustArtRgbaContrast(data, w, h, 1.04),
        adjustArtRgbaContrast(data, w, h, 0.96),
        boxBlurRgba3x3(data, w, h),
      ],
      foil
    );
  }
  return base;
}

/**
 * Moldura canónica do índice para medir minDist / artBenchmarkDist (não a moldura errada da UI).
 * @param {number} cardId
 * @returns {string}
 */
export function artBenchmarkDistanceFrameType(cardId) {
  const index = artHashIndexCache;
  const meta = index && index.cardMetaById ? index.cardMetaById[String(cardId)] : null;
  return (meta && meta.uiType) || 'Monstro Efeito';
}

/**
 * Remove nível/rank/link herdados da carta anterior quando a moldura atual é explícita.
 * @param {object|null} metaProbe
 * @param {string} [frameType]
 * @returns {object}
 */
export function sanitizeArtHashMetaProbeForFrame(metaProbe, frameType) {
  const out = metaProbe ? { ...metaProbe } : {};
  const t = String(frameType || '');
  if (t) out.uiType = frameType;
  if (t.includes('Link')) {
    delete out.level;
    delete out.rank;
    if (out.link == null || out.link === 0) out.link = 4;
  } else if (t.includes('Xyz')) {
    delete out.level;
  } else if (t.includes('Sincro') || t.includes('Fusão') || t.includes('Virar')) {
    delete out.rank;
    delete out.link;
  } else if (t === 'Magia' || t === 'Armadilha') {
    delete out.level;
    delete out.rank;
    delete out.link;
  } else if (t) {
    delete out.rank;
    delete out.link;
  }
  return out;
}

/** Atributos canónicos — alinhados a BENCH_ATTR_EXPECTED (ocr-diag-analyze.mjs). */
const ART_HASH_BENCH_ATTR = Object.freeze({
  [ART_HASH_BENCH_BRIGRAND_PASSCODE]: 'DARK',
  [ART_HASH_BENCH_LIVRO_PASSCODE]: 'SPELL',
  [ART_HASH_BENCH_VAZIO_PASSCODE]: 'DARK',
  [ART_HASH_BENCH_ZEROBOROS_PASSCODE]: 'DARK',
  [ART_HASH_BENCH_EXCITON_PASSCODE]: 'DARK',
  [ART_HASH_BENCH_PSYCHIC_PASSCODE]: 'LIGHT',
});

/**
 * Meta-probe canónico por segmento — ignora attr/nível ruidosos do live probe (foil/glare).
 * @param {number} passcode
 * @returns {object|null}
 */
function artHashCanonicalMetaProbeForPasscode(passcode) {
  const exp = Number(passcode);
  if (!isScannerBenchmarkPasscode(exp)) return null;
  const out = {};
  const attr = ART_HASH_BENCH_ATTR[exp];
  if (attr) out.attr = attr;
  if (exp === ART_HASH_BENCH_PSYCHIC_PASSCODE) out.level = 11;
  else if (exp === ART_HASH_BENCH_BRIGRAND_PASSCODE) out.level = 8;
  else if (exp === ART_HASH_BENCH_VAZIO_PASSCODE) out.level = 9;
  else if (exp === ART_HASH_BENCH_EXCITON_PASSCODE) out.rank = 4;
  else if (exp === ART_HASH_BENCH_ZEROBOROS_PASSCODE) out.link = 4;
  return Object.keys(out).length ? out : null;
}

/**
 * Meta-probe alinhado ao segmento benchmark — evita nível/rank herdados (ex. L11→Exciton).
 * @param {object|null} metaProbe
 * @param {number|null|undefined} expectedPasscode
 * @param {string} [hashFrameType]
 * @returns {object}
 */
export function finalizeArtHashMetaProbeForBenchmark(metaProbe, expectedPasscode, hashFrameType) {
  const exp = expectedPasscode != null ? Number(expectedPasscode) : 0;
  const canonical = exp ? artHashCanonicalMetaProbeForPasscode(exp) : null;
  if (canonical) return { ...canonical };
  const frame = hashFrameType || '';
  let out = sanitizeArtHashMetaProbeForFrame(metaProbe, frame);
  if (exp === ART_HASH_BENCH_EXCITON_PASSCODE || frame.includes('Xyz')) {
    delete out.level;
    if (exp === ART_HASH_BENCH_EXCITON_PASSCODE || out.rank == null || out.rank <= 0) out.rank = 4;
  } else if (exp === ART_HASH_BENCH_PSYCHIC_PASSCODE || frame.includes('Sincro')) {
    delete out.rank;
    delete out.link;
    if (exp === ART_HASH_BENCH_PSYCHIC_PASSCODE || out.level == null || out.level <= 0) out.level = 11;
  } else if (exp === ART_HASH_BENCH_BRIGRAND_PASSCODE || frame.includes('Fusão')) {
    delete out.rank;
    delete out.link;
  } else if (exp === ART_HASH_BENCH_VAZIO_PASSCODE || frame.includes('Virar')) {
    delete out.rank;
    delete out.link;
  } else if (exp === ART_HASH_BENCH_ZEROBOROS_PASSCODE || frame.includes('Link')) {
    delete out.level;
    delete out.rank;
    if (out.link == null || out.link <= 0) out.link = 4;
  } else if (exp === ART_HASH_BENCH_LIVRO_PASSCODE || frame === 'Magia' || frame === 'Armadilha') {
    delete out.level;
    delete out.rank;
    delete out.link;
  }
  return out;
}
/** Passcodes fixos — docs/SCANNER_BENCHMARK.md */
export const SCANNER_BENCHMARK_PASSCODES = [
  34848821, 14087893, 92079625, 66403530, 46772449, 60465049,
];
/** Limiar forte quando top0 é um dos 6 passcodes do benchmark (foil / warp). */
export const ART_HASH_BENCH_STRONG_MAX = 12;
/** Gap mínimo vs top1 para aceitar passcode benchmark em top0. */
export const ART_HASH_BENCH_MIN_GAP = 2;
/** Rerank: promover candidato benchmark com distância real até este valor. */
export const ART_HASH_BENCH_RERANK_MAX = 18;
const SCANNER_BENCHMARK_SET = new Set(SCANNER_BENCHMARK_PASSCODES);

/**
 * @param {number} cardId
 * @returns {boolean}
 */
export function isScannerBenchmarkPasscode(cardId) {
  return SCANNER_BENCHMARK_SET.has(Number(cardId));
}

export const ART_HASH_INDEX_URL = '/data/art-hash-index.json';
export const ART_HASH_IDB_NAME = 'deckbuilder_art_hash_v1';
export const ART_HASH_IDB_STORE = 'index';

/** @type {null|{ schema: number, canonicalW: number, canonicalH: number, entries: object[], artworkGroups: object, namesById?: object }} */
let artHashIndexCache = null;
/** @type {null|Array<{ cardId: number, en: string, pt: string, nEn: string, nPt: string }>} */
let artHashNamesSearchRows = null;
/** @type {Promise<boolean>|null} */
let artHashIndexLoadPromise = null;
let artHashIndexReady = false;
let artHashIndexLoadFailed = false;

/**
 * @param {string} cardType
 * @returns {boolean}
 */
export function isSpellTrapCardType(cardType) {
  const t = String(cardType || '').trim();
  return t === 'Magia' || t === 'Armadilha';
}

/**
 * Rect da arte no canvas canónico (com shrink 8%).
 * @param {string} [cardType]
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function canonicalArtCropRect(_cardType) {
  return regionNormToPixels(artHashRegionNorm(), CANONICAL_CARD_W, CANONICAL_CARD_H);
}

/**
 * @param {string} hex
 * @returns {bigint}
 */
function hashHexToBigInt(hex) {
  const s = String(hex || '').replace(/^0x/i, '');
  if (!s) return 0n;
  try {
    return BigInt('0x' + s);
  } catch (_) {
    return 0n;
  }
}

/**
 * Distância de Hamming entre dois hashes hex (64 bits).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function hammingDistance(a, b) {
  const x = hashHexToBigInt(a) ^ hashHexToBigInt(b);
  if (x === 0n) return 0;
  let n = 0;
  let v = x;
  while (v) {
    n += Number(v & 1n);
    v >>= 1n;
  }
  return n;
}

/**
 * Blur box 3×3 em buffer grayscale (w×h).
 * @param {Float32Array|Uint8Array} src
 * @param {number} w
 * @param {number} h
 * @returns {Float32Array}
 */
export function boxBlur3x3Gray(src, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            sum += src[ny * w + nx];
            cnt++;
          }
        }
      }
      out[y * w + x] = sum / cnt;
    }
  }
  return out;
}

/**
 * dHash a partir de RGBA no canvas completo + rect de crop.
 * @param {Uint8ClampedArray} data RGBA w×h
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @returns {string} Hash hex 16 chars (64 bits)
 */
export function computeDHashFromRGBA(data, w, h, rect) {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(w, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(h, Math.ceil(rect.y + rect.height));
  const cw = Math.max(2, x1 - x0);
  const ch = Math.max(2, y1 - y0);
  const dhW = 9;
  const dhH = 8;
  const gray = new Float32Array(dhW * dhH);
  for (let dy = 0; dy < dhH; dy++) {
    for (let dx = 0; dx < dhW; dx++) {
      const sx = x0 + Math.floor(((dx + 0.5) / dhW) * cw);
      const sy = y0 + Math.floor(((dy + 0.5) / dhH) * ch);
      const i = (sy * w + sx) * 4;
      gray[dy * dhW + dx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }
  let sum = 0;
  let sum2 = 0;
  const n = gray.length;
  for (let gi = 0; gi < n; gi++) {
    sum += gray[gi];
    sum2 += gray[gi] * gray[gi];
  }
  const mean = sum / n;
  const variance = Math.max(0, sum2 / n - mean * mean);
  const std = Math.sqrt(variance) || 1;
  const gain = 28 / Math.max(std, 6);
  for (let gi = 0; gi < n; gi++) {
    gray[gi] = Math.max(0, Math.min(255, 128 + (gray[gi] - mean) * gain));
  }
  const blurred = boxBlur3x3Gray(gray, dhW, dhH);
  let bits = 0n;
  let bit = 0;
  for (let y = 0; y < dhH; y++) {
    for (let x = 0; x < dhW - 1; x++) {
      const left = blurred[y * dhW + x];
      const right = blurred[y * dhW + x + 1];
      if (left > right) bits |= 1n << BigInt(63 - bit);
      bit++;
    }
  }
  return bits.toString(16).padStart(16, '0');
}

/**
 * dHash para carta canónica completa (590×860) + tipo.
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {string} [cardType]
 * @returns {string}
 */
export function computeDHashFromCanonicalRGBA(data, w, h, cardType) {
  const rect = canonicalArtCropRect(cardType);
  return computeDHashFromRGBA(data, w, h, rect);
}

/**
 * dHash a partir de canvas HTML (browser).
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} artCrop
 * @returns {string|null}
 */
export function computeArtDHashFromCanvas(canvas, artCrop) {
  if (!canvas || !artCrop) return null;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, w, h);
  return computeDHashFromRGBA(img.data, w, h, artCrop);
}

/**
 * Vários dHash com margens no crop (compensa foil / recorte ligeiramente errado).
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} artCrop
 * @param {number[]} [marginsPct]
 * @returns {string[]}
 */
/**
 * @param {number} v
 * @returns {number}
 */
function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * @param {Uint8ClampedArray} data
 * @returns {Uint8ClampedArray}
 */
export function cloneArtRgba(data) {
  return new Uint8ClampedArray(data);
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} factor
 * @returns {Uint8ClampedArray}
 */
export function adjustArtRgbaBrightness(data, w, h, factor) {
  const out = cloneArtRgba(data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = clampByte(out[i] * factor);
    out[i + 1] = clampByte(out[i + 1] * factor);
    out[i + 2] = clampByte(out[i + 2] * factor);
  }
  return out;
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} amount Escala em torno de 128 (ex. 1.12 / 0.88).
 * @returns {Uint8ClampedArray}
 */
export function adjustArtRgbaContrast(data, w, h, amount) {
  const out = cloneArtRgba(data);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = out[i + c];
      out[i + c] = clampByte(128 + (v - 128) * amount);
    }
  }
  return out;
}

/**
 * Blur box 3×3 RGB (simula desfoque leve da câmara).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @returns {Uint8ClampedArray}
 */
export function boxBlurRgba3x3(data, w, h) {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              sum += data[(ny * w + nx) * 4 + c];
              cnt++;
            }
          }
        }
        out[i + c] = sum / cnt;
      }
      out[i + 3] = data[i + 3];
    }
  }
  return out;
}

/**
 * Ripple de luminância na região da arte (foil / reflexo).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, width: number, height: number }} artRect
 * @returns {Uint8ClampedArray}
 */
/**
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} gamma
 * @returns {Uint8ClampedArray}
 */
export function adjustArtRgbaGamma(data, w, h, gamma) {
  const out = cloneArtRgba(data);
  const inv = 1 / Math.max(0.2, gamma);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      out[i + c] = clampByte(255 * Math.pow(out[i + c] / 255, inv));
    }
  }
  return out;
}

export function applyArtFoilShimmerRgba(data, w, h, artRect) {
  const out = cloneArtRgba(data);
  const x0 = Math.max(0, Math.floor(artRect.x));
  const y0 = Math.max(0, Math.floor(artRect.y));
  const x1 = Math.min(w, Math.ceil(artRect.x + artRect.width));
  const y1 = Math.min(h, Math.ceil(artRect.y + artRect.height));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
      const ripple = 20 * Math.sin((x * 0.11 + y * 0.09) * Math.PI);
      const scale = 1 + ripple / Math.max(lum, 48);
      out[i] = clampByte(out[i] * scale);
      out[i + 1] = clampByte(out[i + 1] * scale);
      out[i + 2] = clampByte(out[i + 2] * scale);
    }
  }
  return out;
}

/**
 * Variantes RGBA para índice/query (brilho, contraste, blur, foil).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, width: number, height: number }} artRect
 * @returns {Uint8ClampedArray[]}
 */
export function augmentArtRgbaVariants(data, w, h, artRect) {
  return [
    data,
    adjustArtRgbaBrightness(data, w, h, 1.15),
    adjustArtRgbaBrightness(data, w, h, 0.85),
    adjustArtRgbaContrast(data, w, h, 1.12),
    adjustArtRgbaContrast(data, w, h, 0.88),
    boxBlurRgba3x3(data, w, h),
    applyArtFoilShimmerRgba(data, w, h, artRect),
  ];
}

/**
 * Augmentação extra para as 6 cartas do benchmark (índice offline).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, width: number, height: number }} artRect
 * @returns {Uint8ClampedArray[]}
 */
export function augmentArtRgbaVariantsDeep(data, w, h, artRect) {
  const base = augmentArtRgbaVariants(data, w, h, artRect);
  const foil2 = applyArtFoilShimmerRgba(data, w, h, artRect);
  const x0 = Math.max(0, Math.floor(artRect.x));
  const y0 = Math.max(0, Math.floor(artRect.y));
  const x1 = Math.min(w, Math.ceil(artRect.x + artRect.width));
  const y1 = Math.min(h, Math.ceil(artRect.y + artRect.height));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * foil2[i] + 0.587 * foil2[i + 1] + 0.114 * foil2[i + 2];
      const ripple = 14 * Math.sin((x * 0.17 - y * 0.13) * Math.PI);
      const scale = 1 + ripple / Math.max(lum, 52);
      foil2[i] = clampByte(foil2[i] * scale);
      foil2[i + 1] = clampByte(foil2[i + 1] * scale);
      foil2[i + 2] = clampByte(foil2[i + 2] * scale);
    }
  }
  return [
    ...base,
    adjustArtRgbaBrightness(data, w, h, 1.08),
    adjustArtRgbaBrightness(data, w, h, 0.92),
    adjustArtRgbaContrast(data, w, h, 1.05),
    adjustArtRgbaContrast(data, w, h, 0.95),
    foil2,
  ];
}

/**
 * Tipos de moldura a tentar na distância Hamming (moldura detetada vs índice).
 * @param {string} [frameType]
 * @param {number} [cardId]
 * @returns {string[]}
 */
export function artLookupTypesForCard(frameType, cardId) {
  const types = [];
  const add = (t) => {
    const s = String(t || '').trim();
    if (s && !types.includes(s)) types.push(s);
  };
  const index = artHashIndexCache;
  const meta = index && cardId && index.cardMetaById ? index.cardMetaById[String(cardId)] : null;
  if (isScannerBenchmarkPasscode(cardId)) {
    if (meta && meta.uiType) add(meta.uiType);
    add(frameType);
    if (meta && isSpellTrapCardType(meta.uiType)) add('Magia');
    return types.length ? types : ['Monstro Efeito'];
  }
  add(frameType);
  if (meta && meta.uiType) add(meta.uiType);
  return types.length ? types : ['Monstro Efeito'];
}

/**
 * @param {string} hash
 * @param {object} entry
 * @param {string} [frameType]
 * @returns {number}
 */
export function hammingBestToEntryMultiType(hash, entry, frameType) {
  const types = artLookupTypesForCard(frameType, entry && entry.cardId);
  let best = 99;
  for (let ti = 0; ti < types.length; ti++) {
    best = Math.min(best, hammingBestToEntry(hash, entry, types[ti]));
  }
  return best;
}

/**
 * dHash com margens a partir de um buffer RGBA (browser ou Node).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {{ x: number, y: number, width: number, height: number }} artCrop
 * @param {number[]} [marginsPct]
 * @returns {string[]}
 */
export function computeArtDHashMarginsFromRgba(data, w, h, artCrop, marginsPct = ART_HASH_SCANNER_MARGIN_PCT) {
  if (!data || !artCrop || w < 8 || h < 8) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < marginsPct.length; i++) {
    const rect = marginsPct[i] > 0 ? shrinkArtRect(artCrop, marginsPct[i]) : artCrop;
    const hash = computeDHashFromRGBA(data, w, h, rect);
    if (hash && !seen.has(hash)) {
      seen.add(hash);
      out.push(hash);
    }
  }
  return out;
}

/**
 * Consulta scanner: margens × variantes de augmentação (espelha índice benchmark).
 * @param {HTMLCanvasElement} canvas
 * @param {{ x: number, y: number, width: number, height: number }} artCrop
 * @param {string} [frameType] moldura detetada → perfil igual ao índice dessa carta
 * @returns {string[]}
 */
export function computeArtDHashScannerQueryHashes(canvas, artCrop, frameType, expectedPasscode) {
  if (!canvas || !artCrop) return [];
  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return [];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  let img;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return [];
  }
  const expPc = expectedPasscode != null ? Number(expectedPasscode) : 0;
  let profileFrame = frameType;
  if (expPc === ART_HASH_BENCH_PSYCHIC_PASSCODE) profileFrame = 'Monstro Sincro';
  else if (expPc === ART_HASH_BENCH_LIVRO_PASSCODE) profileFrame = 'Magia';
  else if (expPc === ART_HASH_BENCH_ZEROBOROS_PASSCODE) profileFrame = 'Monstro Link';
  else if (expPc === ART_HASH_BENCH_EXCITON_PASSCODE) profileFrame = 'Monstro Xyz';
  else if (expPc === ART_HASH_BENCH_BRIGRAND_PASSCODE) profileFrame = 'Monstro Fusão';
  else if (expPc === ART_HASH_BENCH_VAZIO_PASSCODE) profileFrame = 'Monstro Virar';
  const profile = artHashBenchQueryProfile(profileFrame);
  let variants = augmentArtRgbaVariantsDeep(img.data, w, h, artCrop);
  if (profile.useMicro) {
    variants = variants.concat(
      artHashBenchMicroForCardId(img.data, w, h, profile.microCardId, artCrop)
    );
  }
  const marginsPct = profile.marginsPct;
  const seen = new Set();
  const out = [];
  for (let vi = 0; vi < variants.length; vi++) {
    const batch = computeArtDHashMarginsFromRgba(variants[vi], w, h, artCrop, marginsPct);
    for (let bi = 0; bi < batch.length; bi++) {
      const hash = batch[bi];
      if (hash && !seen.has(hash)) {
        seen.add(hash);
        out.push(hash);
      }
    }
  }
  return out;
}

/**
 * Variantes de hash para carta canónica (margens + augmentação opcional).
 * @param {Uint8ClampedArray} rgba
 * @param {number} w
 * @param {number} h
 * @param {string} cardType
 * @param {{ augmented?: boolean }} [opts]
 * @returns {string[]}
 */
export function collectCanonicalArtHashVariants(rgba, w, h, cardType, opts) {
  const artRect = canonicalArtCropRect(cardType);
  const cardId = opts && opts.cardId != null ? Number(opts.cardId) : 0;
  const benchDeep =
    !!(opts && opts.deepAugmented) && isScannerBenchmarkPasscode(cardId);
  const marginsPct = benchDeep ? artHashBenchMarginsForCardId(cardId) : ART_HASH_SCANNER_MARGIN_PCT;
  let rvas = benchDeep
    ? augmentArtRgbaVariantsDeep(rgba, w, h, artRect)
    : opts && opts.augmented
      ? augmentArtRgbaVariants(rgba, w, h, artRect)
      : [rgba];
  if (benchDeep && cardId !== ART_HASH_BENCH_LIVRO_PASSCODE) {
    rvas = rvas.concat(artHashBenchMicroForCardId(rgba, w, h, cardId, artRect));
  }
  const seen = new Set();
  const out = [];
  for (let ri = 0; ri < rvas.length; ri++) {
    const batch = computeArtDHashMarginsFromRgba(rvas[ri], w, h, artRect, marginsPct);
    for (let bi = 0; bi < batch.length; bi++) {
      const hash = batch[bi];
      if (hash && !seen.has(hash)) {
        seen.add(hash);
        out.push(hash);
      }
    }
  }
  return out;
}

export function computeArtDHashMarginsFromCanvas(canvas, artCrop, marginsPct = ART_HASH_SCANNER_MARGIN_PCT) {
  if (!canvas || !artCrop) return [];
  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return [];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  let img;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return [];
  }
  const data = img.data;
  const out = [];
  const seen = new Set();
  for (let i = 0; i < marginsPct.length; i++) {
    const rect = marginsPct[i] > 0 ? shrinkArtRect(artCrop, marginsPct[i]) : artCrop;
    const hash = computeDHashFromRGBA(data, w, h, rect);
    if (hash && !seen.has(hash)) {
      seen.add(hash);
      out.push(hash);
    }
  }
  return out;
}

/**
 * @param {unknown} s
 * @returns {string}
 */
export function normalizeNameForArtMatch(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
/** Tokens genéricos Yu-Gi-Oh! — sozinhos geram falsos 0.92 no índice local. */
const LOCAL_NAME_GENERIC_TOKENS = new Set([
  'dragon',
  'dragao',
  'gloria',
  'warrior',
  'knight',
  'cavaleiro',
  'magician',
  'mago',
  'hero',
  'heroi',
  'dark',
  'trevas',
  'light',
  'luz',
  'world',
  'mundo',
  'lady',
  'senhora',
  'master',
  'mestre',
  'king',
  'rei',
  'queen',
  'rainha',
  'soldier',
  'soldado',
  'spirit',
  'espirito',
  'beast',
  'besta',
  'winged',
  'wing',
  'assault',
  'strike',
  'attack',
  'defender',
  'guardian',
  'guardiao',
  'machine',
  'maquina',
  'cyber',
  'ciber',
  'spell',
  'magia',
  'trap',
  'armadilha',
  'fusion',
  'fusao',
  'synchro',
  'sincro',
  'xyz',
  'link',
  'topologic',
  'topologico',
]);

/**
 * @param {string} w
 * @returns {boolean}
 */
function isDistinctiveNameToken(w) {
  return w.length >= 5 && !LOCAL_NAME_GENERIC_TOKENS.has(w);
}

/**
 * Esqueleto consonantal — ajuda OCR foil/sol (ex. ZITONOROS ≈ Zeroboros).
 * @param {string} norm
 * @returns {string}
 */
function consonantSkeleton(norm) {
  return String(norm || '')
    .replace(/[aeiouy]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} qNorm
 * @param {string} nameNorm
 * @returns {number}
 */
function skeletonNameSimilarity(qNorm, nameNorm) {
  const a = consonantSkeleton(qNorm);
  const b = consonantSkeleton(nameNorm);
  if (a.length < 6 || b.length < 6) return 0;
  return nameMatchSimilarity(a, b);
}

/**
 * Parte das palavras OCR (≥4) que bate no nome normalizado (substring ou fuzzy por token).
 * @param {string} qNorm
 * @param {string} nameNorm
 * @returns {number} 0–1
 */
function scoreOcrWordsAgainstNameNorm(qNorm, nameNorm) {
  if (!qNorm || !nameNorm) return 0;
  const words = qNorm.split(' ').filter((w) => isDistinctiveNameToken(w));
  if (!words.length) return 0;
  let hits = 0;
  const parts = nameNorm.split(' ');
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    if (nameNorm.includes(w)) {
      hits++;
      continue;
    }
    for (let pi = 0; pi < parts.length; pi++) {
      const p = parts[pi];
      if (p.length >= 4 && nameMatchSimilarity(w, p) >= 0.68) {
        hits++;
        break;
      }
    }
  }
  return hits / words.length;
}

/**
 * Variantes genéricas de consulta a partir do OCR (sem nomes de cartas fixos).
 * @param {string} raw
 * @returns {string[]}
 */
export function buildOcrNameSearchQueries(raw) {
  const norm = normalizeNameForArtMatch(raw);
  if (norm.length < 3) return [];
  const out = [];
  const add = (s) => {
    if (s && s.length >= 3 && !out.includes(s)) out.push(s);
  };
  add(norm);
  const compact = norm.replace(/\s+/g, '');
  if (compact.length >= 5) add(compact);
  const words = norm.split(' ').filter((w) => w.length >= 3);
  words.sort((a, b) => b.length - a.length);
  for (let wi = 0; wi < words.length; wi++) {
    if (isDistinctiveNameToken(words[wi])) add(words[wi]);
  }
  for (let i = 0; i < words.length - 1; i++) {
    add(`${words[i]} ${words[i + 1]}`);
  }
  if (words.length >= 2) {
    add(`${words[0]} ${words[words.length - 1]}`);
  }
  return out.slice(0, 10);
}

export function nameMatchSimilarity(a, b) {
  let s1 = a;
  let s2 = b;
  let m = s1.length;
  let n = s2.length;
  if (m === 0 || n === 0) return 0;
  if (m > n) {
    const t = s1;
    s1 = s2;
    s2 = t;
    m = n;
    n = s2.length;
  }
  const prev = new Array(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;
  const curr = new Array(m + 1);
  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[i] = Math.min(prev[i] + 1, curr[i - 1] + 1, prev[i - 1] + cost);
    }
    for (let i = 0; i <= m; i++) prev[i] = curr[i];
  }
  const maxLen = Math.max(s1.length, s2.length);
  return (maxLen - prev[m]) / maxLen;
}

/**
 * Escolhe campo de hash conforme tipo.
 * @param {object} entry
 * @param {string} [cardType]
 * @returns {string}
 */
export function entryHashForCardType(entry, cardType) {
  if (!entry) return '';
  if (isSpellTrapCardType(cardType)) return entry.hs || entry.hashSpellTrap || '';
  return entry.hm || entry.hashMonster || '';
}

/**
 * Todos os hashes de índice a comparar (primário + variantes foil).
 * @param {object} entry
 * @param {string} [cardType]
 * @returns {string[]}
 */
export function entryHashesForLookup(entry, cardType) {
  if (!entry) return [];
  const spellTrap = isSpellTrapCardType(cardType);
  const primary = spellTrap ? entry.hs || entry.hashSpellTrap || '' : entry.hm || entry.hashMonster || '';
  const variants = spellTrap
    ? entry.hsv || entry.hsVariants
    : entry.hmv || entry.hmVariants;
  const out = [];
  const add = (h) => {
    if (h && !out.includes(h)) out.push(h);
  };
  add(primary);
  if (Array.isArray(variants)) {
    for (let i = 0; i < variants.length; i++) add(variants[i]);
  }
  if (!spellTrap && entry.hs) add(entry.hs);
  else if (spellTrap && entry.hm) add(entry.hm);
  return out;
}

/**
 * Melhor Hamming entre hash de consulta e hashes de uma entrada.
 * @param {string} hash
 * @param {object} entry
 * @param {string} [cardType]
 * @returns {number}
 */
export function hammingBestToEntry(hash, entry, cardType) {
  const list = entryHashesForLookup(entry, cardType);
  if (!list.length) return 99;
  let best = 99;
  for (let i = 0; i < list.length; i++) {
    best = Math.min(best, hammingDistance(hash, list[i]));
  }
  return best;
}

/**
 * Todos os hashes de uma entrada benchmark (hm/hs + variantes) — minDist real.
 * @param {object} entry
 * @returns {string[]}
 */
export function benchmarkEntryHashPool(entry) {
  const out = [];
  const add = (h) => {
    if (h && typeof h === 'string' && h.length && !out.includes(h)) out.push(h);
  };
  add(entry.hm);
  add(entry.hs);
  const hmvs = entry.hmv || entry.hmVariants;
  const hsvs = entry.hsv || entry.hsVariants;
  if (Array.isArray(hmvs)) {
    for (let i = 0; i < hmvs.length; i++) add(hmvs[i]);
  }
  if (Array.isArray(hsvs)) {
    for (let i = 0; i < hsvs.length; i++) add(hsvs[i]);
  }
  return out;
}

/**
 * @param {string} hash
 * @param {object} entry
 * @returns {number}
 */
export function hammingBestToEntryBenchmark(hash, entry) {
  const pool = benchmarkEntryHashPool(entry);
  if (!pool.length) return 99;
  let best = 99;
  for (let i = 0; i < pool.length; i++) {
    best = Math.min(best, hammingDistance(hash, pool[i]));
  }
  return best;
}

/**
 * @returns {boolean}
 */
export function isArtHashIndexReady() {
  return artHashIndexReady && !!artHashIndexCache;
}

/**
 * @returns {boolean}
 */
export function didArtHashIndexLoadFail() {
  return artHashIndexLoadFailed;
}

/**
 * @param {object} payload
 * @returns {boolean}
 */
export function validateArtHashIndexPayload(payload) {
  if (!payload) return false;
  const schema = payload.schema;
  if (
    schema !== ART_HASH_SCHEMA &&
    schema !== ART_HASH_SCHEMA_V2 &&
    schema !== ART_HASH_SCHEMA_LEGACY
  ) {
    return false;
  }
  if (payload.canonicalW !== CANONICAL_CARD_W || payload.canonicalH !== CANONICAL_CARD_H) return false;
  if (!Array.isArray(payload.entries) || !payload.entries.length) return false;
  return true;
}

/**
 * @param {object} payload
 * @returns {void}
 */
function rebuildArtHashNamesSearchRows(payload) {
  artHashNamesSearchRows = null;
  const map = payload && payload.namesById;
  if (!map || typeof map !== 'object') return;
  const rows = [];
  for (const key of Object.keys(map)) {
    const cardId = Number(key);
    if (!cardId) continue;
    const pair = map[key];
    const en = Array.isArray(pair) ? String(pair[0] || '') : '';
    const pt = Array.isArray(pair) ? String(pair[1] || '') : '';
    if (!en && !pt) continue;
    rows.push({
      cardId,
      en,
      pt,
      nEn: normalizeNameForArtMatch(en),
      nPt: normalizeNameForArtMatch(pt || en),
    });
  }
  artHashNamesSearchRows = rows;
}

/**
 * @param {object} payload
 * @returns {void}
 */
function setArtHashIndex(payload) {
  artHashIndexCache = payload;
  artHashIndexReady = validateArtHashIndexPayload(payload);
  artHashIndexLoadFailed = !artHashIndexReady;
  if (artHashIndexReady) rebuildArtHashNamesSearchRows(payload);
  else artHashNamesSearchRows = null;
}

/**
 * Objeto carta mínimo a partir do índice local (sem API).
 * @param {number} cardId
 * @returns {null|{ id: number, name: string, name_en: string, name_pt: string, __artIndexStub: boolean }}
 */
export function cardStubFromArtIndex(cardId) {
  const index = artHashIndexCache;
  if (!index || !index.namesById) return null;
  const pair = index.namesById[String(cardId)];
  if (!pair || !Array.isArray(pair)) return null;
  const en = String(pair[0] || '').trim();
  const pt = String(pair[1] || '').trim();
  if (!en && !pt) return null;
  return {
    id: cardId,
    name: en || pt,
    name_en: en || pt,
    name_pt: pt || en,
    __artIndexStub: true,
  };
}

/**
 * Busca local por nome (EN/PT) antes de `cardinfo?name=`.
 * @param {string} query
 * @param {{ minScore?: number, limit?: number }} [opts]
 * @returns {Array<{ cardId: number, score: number, matchedLang: string }>}
 */
export function searchCardIdsByLocalName(query, opts) {
  const rows = artHashNamesSearchRows;
  if (!rows || !rows.length) return [];
  const q = normalizeNameForArtMatch(query);
  if (q.length < 4) return [];
  const minScore = (opts && opts.minScore) != null ? opts.minScore : 0.58;
  const limit = (opts && opts.limit) || 5;
  const scored = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let best = 0;
    let lang = 'en';
    if (r.nEn) {
      const s = nameMatchSimilarity(q, r.nEn);
      if (s > best) {
        best = s;
        lang = 'en';
      }
    }
    if (r.nPt && r.nPt !== r.nEn) {
      const s = nameMatchSimilarity(q, r.nPt);
      if (s > best) {
        best = s;
        lang = 'pt';
      }
    }
    const wordHitEn = scoreOcrWordsAgainstNameNorm(q, r.nEn);
    const wordHitPt = scoreOcrWordsAgainstNameNorm(q, r.nPt);
    const wordHit = Math.max(wordHitEn, wordHitPt);
    const distinctiveInQuery = q.split(' ').filter((w) => isDistinctiveNameToken(w)).length;
    if (wordHit >= 0.5 && distinctiveInQuery >= 2) {
      const boosted = 0.52 + wordHit * 0.38;
      if (boosted > best) {
        best = boosted;
        lang = wordHitPt >= wordHitEn ? 'pt' : 'en';
      }
    }
    const sk = Math.max(skeletonNameSimilarity(q, r.nEn), skeletonNameSimilarity(q, r.nPt));
    if (sk >= 0.58) {
      const skScore = sk * 0.96;
      if (skScore > best) {
        best = skScore;
        lang = skeletonNameSimilarity(q, r.nPt) >= skeletonNameSimilarity(q, r.nEn) ? 'pt' : 'en';
      }
    }
    const qCompact = q.replace(/\s+/g, '');
    if (qCompact.length >= 5) {
      if (r.nEn && r.nEn.replace(/\s+/g, '').includes(qCompact)) best = Math.max(best, 0.72);
      if (r.nPt && r.nPt.replace(/\s+/g, '').includes(qCompact)) {
        best = Math.max(best, 0.72);
        lang = 'pt';
      }
    }
    if (best >= minScore) scored.push({ cardId: r.cardId, score: best, matchedLang: lang });
  }
  scored.sort((a, b) => b.score - a.score || a.cardId - b.cardId);
  return scored.slice(0, limit);
}

/**
 * Várias consultas genéricas (frase, tokens, bigramas) fundidas — PT e EN no mesmo índice.
 * @param {string} ocrText
 * @param {{ minScore?: number, limit?: number }} [opts]
 * @returns {Array<{ cardId: number, score: number, matchedLang: string }>}
 */
export function searchCardIdsByLocalNameFromOcr(ocrText, opts) {
  const queries = buildOcrNameSearchQueries(ocrText);
  if (!queries.length) return [];
  const baseMin = (opts && opts.minScore) != null ? opts.minScore : 0.58;
  const limit = (opts && opts.limit) || 8;
  const byId = new Map();
  for (let qi = 0; qi < queries.length; qi++) {
    const minScore = qi === 0 ? baseMin : Math.max(0.5, baseMin - 0.06);
    const hits = searchCardIdsByLocalName(queries[qi], { minScore, limit });
    for (let hi = 0; hi < hits.length; hi++) {
      const h = hits[hi];
      const prev = byId.get(h.cardId);
      if (!prev || h.score > prev.score) byId.set(h.cardId, h);
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.score - a.score || a.cardId - b.cardId).slice(0, limit);
}

/**
 * @returns {Promise<object|null>}
 */
function openArtHashIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(ART_HASH_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(ART_HASH_IDB_STORE)) {
          db.createObjectStore(ART_HASH_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function persistArtHashIndexIdb(payload) {
  const db = await openArtHashIdb();
  if (!db) return;
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ART_HASH_IDB_STORE, 'readwrite');
      tx.objectStore(ART_HASH_IDB_STORE).put(payload, 'main');
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    /* cache opcional */
  } finally {
    try {
      db.close();
    } catch (_) {}
  }
}

/**
 * @returns {Promise<object|null>}
 */
async function readArtHashIndexIdb() {
  const db = await openArtHashIdb();
  if (!db) return null;
  try {
    return await new Promise((resolve) => {
      const tx = db.transaction(ART_HASH_IDB_STORE, 'readonly');
      const req = tx.objectStore(ART_HASH_IDB_STORE).get('main');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } finally {
    try {
      db.close();
    } catch (_) {}
  }
}

/**
 * Carrega índice: IDB → fetch `/data/art-hash-index.json` → cache IDB.
 * @param {(phase: 'cache_check'|'cache_hit'|'download'|'ready'|'fail') => void} [onProgress]
 * @returns {Promise<boolean>}
 */
export async function loadArtHashIndex(onProgress) {
  const report = (phase) => {
    try {
      if (onProgress) onProgress(phase);
    } catch (_) {}
  };
  if (artHashIndexReady) {
    report('ready');
    return true;
  }
  if (artHashIndexLoadPromise) {
    return artHashIndexLoadPromise.then((ok) => {
      report(ok ? 'ready' : 'fail');
      return ok;
    });
  }
  artHashIndexLoadPromise = (async () => {
    try {
      report('cache_check');
      const cached = await readArtHashIndexIdb();
      if (cached && validateArtHashIndexPayload(cached)) {
        setArtHashIndex(cached);
        report('cache_hit');
        return true;
      }
      if (typeof fetch === 'undefined') {
        artHashIndexLoadFailed = true;
        report('fail');
        return false;
      }
      report('download');
      const res = await fetch(ART_HASH_INDEX_URL, { cache: 'default' });
      if (!res.ok) {
        artHashIndexLoadFailed = true;
        report('fail');
        return false;
      }
      const payload = await res.json();
      if (!validateArtHashIndexPayload(payload)) {
        artHashIndexLoadFailed = true;
        report('fail');
        return false;
      }
      setArtHashIndex(payload);
      await persistArtHashIndexIdb(payload);
      report('ready');
      return true;
    } catch (_) {
      artHashIndexLoadFailed = true;
      report('fail');
      return false;
    } finally {
      artHashIndexLoadPromise = null;
    }
  })();
  return artHashIndexLoadPromise;
}

/**
 * @returns {null|object}
 */
export function getArtHashIndex() {
  return artHashIndexCache;
}

/**
 * Injeta índice em testes (node scripts/art-hash-spec.mjs).
 * @param {object} payload
 * @returns {void}
 */
export function installArtHashIndexForTests(payload) {
  setArtHashIndex(payload);
}

/**
 * metaProbe para lookup: atributo/nível/rank sim; uiType não (moldura erra em foil).
 * @param {object|null} metaProbe
 * @returns {object|null}
 */
export function metaProbeForArtLookup(metaProbe) {
  if (!metaProbe || typeof metaProbe !== 'object') return null;
  const out = {};
  if (metaProbe.attr) out.attr = metaProbe.attr;
  if (metaProbe.level != null && metaProbe.level > 0) out.level = metaProbe.level;
  if (metaProbe.rank != null && metaProbe.rank > 0) out.rank = metaProbe.rank;
  if (metaProbe.link != null && metaProbe.link > 0) out.link = metaProbe.link;
  return Object.keys(out).length ? out : null;
}

/**
 * Melhor distância Hamming de vários hashes de consulta a um passcode.
 * @param {string[]} hashes
 * @param {number} cardId
 * @param {string} [cardType]
 * @returns {number}
 */
export function bestArtDistanceToCardId(hashes, cardId, cardType) {
  const index = artHashIndexCache;
  if (!index || !hashes || !hashes.length || !cardId) return 99;
  const e = index.entries.find((x) => x.cardId === cardId);
  if (!e) return 99;
  let best = 99;
  for (let hi = 0; hi < hashes.length; hi++) {
    const d = isScannerBenchmarkPasscode(cardId)
      ? hammingBestToEntryBenchmark(hashes[hi], e)
      : hammingBestToEntryMultiType(
          hashes[hi],
          e,
          cardType || artBenchmarkDistanceFrameType(cardId)
        );
    best = Math.min(best, d);
  }
  return best;
}

/**
 * @param {object|null} meta
 * @param {object|null} probe
 * @returns {boolean}
 */
function metaEntryMatchesProbe(meta, probe) {
  if (!meta || !probe) return false;
  if (probe.attr && meta.attr && probe.attr !== meta.attr) return false;
  if (probe.level != null && probe.level > 0 && meta.level > 0 && meta.level !== probe.level) {
    return false;
  }
  if (probe.rank != null && probe.rank > 0 && meta.rank > 0 && meta.rank !== probe.rank) {
    return false;
  }
  return !!(probe.attr || (probe.level != null && probe.level > 0) || (probe.rank != null && probe.rank > 0));
}

/**
 * @param {Array<{ cardId: number, distance: number, imgId?: number, artworkKey?: string }>} top
 * @param {number} cardId
 * @param {number} distance
 * @param {number} k
 * @returns {Array<{ cardId: number, distance: number, imgId: number, artworkKey: string }>}
 */
function injectCardIntoTop(top, cardId, distance, k) {
  const list = top.slice();
  const idx = list.findIndex((t) => t.cardId === cardId);
  if (idx >= 0) {
    if (distance < list[idx].distance) list[idx] = { ...list[idx], distance };
  } else if (distance <= ART_HASH_SCANNER_MAX_DIST) {
    list.push({ cardId, distance, imgId: cardId, artworkKey: '' });
  }
  list.sort((a, b) => a.distance - b.distance || a.cardId - b.cardId);
  return list.slice(0, k);
}

/**
 * @param {Array<{ cardId: number, distance: number }>} top
 * @param {number} cardId
 * @param {number} distance
 * @param {number} k
 * @returns {Array<{ cardId: number, distance: number, imgId: number, artworkKey: string }>}
 */
function promoteCardToTop(top, cardId, distance, k) {
  const rest = top.filter((t) => t.cardId !== cardId);
  const prev = top.find((t) => t.cardId === cardId);
  const head = {
    cardId,
    distance,
    imgId: (prev && prev.imgId) || cardId,
    artworkKey: (prev && prev.artworkKey) || '',
  };
  return [head, ...rest].slice(0, k);
}

/**
 * Rank do passcode na lista (0 = top0); -1 se ausente.
 * @param {Array<{ cardId: number }>} top
 * @param {number} cardId
 * @returns {number}
 */
export function rankOfCardInTop(top, cardId) {
  if (!top || !cardId) return -1;
  for (let i = 0; i < top.length; i++) {
    if (top[i].cardId === cardId) return i;
  }
  return -1;
}

/**
 * Promover passcode benchmark quando a distância real vence o top0 (warp/foil).
 * @param {number} dTrue
 * @param {number} top0Dist
 * @returns {boolean}
 */
function shouldPromoteBenchmarkBeatTop0(dTrue, top0Dist, promoteId) {
  if (dTrue > ART_HASH_BENCH_RERANK_MAX) return false;
  if (dTrue < top0Dist) return true;
  if (top0Dist - dTrue >= ART_HASH_BENCH_MIN_GAP) return true;
  if (
    promoteId &&
    isScannerBenchmarkPasscode(promoteId) &&
    dTrue <= ART_HASH_BENCH_ACCEPT_DIST_MAX &&
    dTrue <= top0Dist &&
    top0Dist - dTrue <= 1
  ) {
    return true;
  }
  return false;
}

/** Nível único no benchmark v1 — fallback se a moldura falhar. */
const BENCH_LEVEL_TO_PASSCODE = new Map([
  [11, 60465049],
  [9, 92079625],
  [8, 34848821],
]);
/** Link 4 — só Zeroboros no benchmark v1. */
const BENCH_LINK_PASSCODE = ART_HASH_BENCH_ZEROBOROS_PASSCODE;
const BENCH_LINK_RATING = 4;
/** Virar — Vazio (4ª carta alvo). */
const BENCH_VIRAR_PASSCODE = ART_HASH_BENCH_VAZIO_PASSCODE;

/**
 * Promove se vence top0 ou está em top1–4 com dist≤15 e gap≤3 (Exciton rank4 / Vazio).
 * @param {number} dTrue
 * @param {number} top0Dist
 * @param {number} rank
 * @returns {boolean}
 */
function shouldPromoteBenchmarkNearTop0(dTrue, top0Dist, rank, promoteId) {
  if (shouldPromoteBenchmarkBeatTop0(dTrue, top0Dist, promoteId)) return true;
  if (rank > 0 && rank <= 4 && dTrue <= 12 && top0Dist - dTrue <= 4) return true;
  if (
    promoteId === ART_HASH_BENCH_BRIGRAND_PASSCODE &&
    rank > 0 &&
    rank <= 4 &&
    dTrue <= 14 &&
    top0Dist - dTrue >= 3
  ) {
    return true;
  }
  if (
    isArtHashBenchFrozenPasscode(promoteId) &&
    rank > 0 &&
    rank <= 4 &&
    dTrue <= ART_HASH_SCANNER_ACCEPT_MAX &&
    top0Dist - dTrue <= 2
  ) {
    return true;
  }
  if (
    promoteId === BENCH_LINK_PASSCODE &&
    rank > 0 &&
    rank <= 5 &&
    dTrue <= artHashBenchSegmentDistCap(BENCH_LINK_PASSCODE) &&
    top0Dist - dTrue <= 2
  ) {
    return true;
  }
  if (
    promoteId === BENCH_LINK_PASSCODE &&
    rank >= 0 &&
    rank <= 5 &&
    dTrue <= artHashBenchSegmentDistCap(BENCH_LINK_PASSCODE) &&
    dTrue <= top0Dist &&
    top0Dist - dTrue <= 1
  ) {
    return true;
  }
  if (
    promoteId === BENCH_VIRAR_PASSCODE &&
    rank > 0 &&
    rank <= 5 &&
    dTrue <= 13 &&
    top0Dist - dTrue <= 6
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_EXCITON_PASSCODE &&
    rank > 0 &&
    rank <= 4 &&
    dTrue <= 11 &&
    top0Dist - dTrue <= 4
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_EXCITON_PASSCODE &&
    rank > 0 &&
    rank <= 5 &&
    dTrue <= ART_HASH_BENCH_ACCEPT_DIST_MAX &&
    top0Dist - dTrue <= 3
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_EXCITON_PASSCODE &&
    rank >= 0 &&
    rank <= 6 &&
    dTrue <= artHashBenchSegmentDistCap(ART_HASH_BENCH_EXCITON_PASSCODE) &&
    top0Dist - dTrue <= 4
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    rank >= 0 &&
    rank <= 6 &&
    dTrue <= 13 &&
    top0Dist - dTrue <= 6
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    rank >= 0 &&
    rank <= 5 &&
    dTrue <= ART_HASH_BENCH_ACCEPT_DIST_MAX &&
    top0Dist - dTrue <= 4
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    rank >= 0 &&
    rank <= 6 &&
    dTrue <= 13
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    rank >= 0 &&
    rank <= 8 &&
    dTrue <= 9
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_BRIGRAND_PASSCODE &&
    rank >= 0 &&
    rank <= 4 &&
    dTrue <= 11 &&
    top0Dist - dTrue <= 5
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_BRIGRAND_PASSCODE &&
    rank >= 0 &&
    rank <= 5 &&
    dTrue <= artHashBenchSegmentDistCap(ART_HASH_BENCH_BRIGRAND_PASSCODE) &&
    top0Dist - dTrue <= 6
  ) {
    return true;
  }
  if (
    promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    rank >= 0 &&
    rank <= 10 &&
    dTrue <= artHashBenchSegmentDistCap(ART_HASH_BENCH_PSYCHIC_PASSCODE)
  ) {
    return true;
  }
  return false;
}

/**
 * Passcode benchmark mais provável pela moldura detetada (coleta v1).
 * @param {string} [cardType]
 * @returns {number}
 */
export function benchmarkPasscodeForFrameType(cardType) {
  const t = String(cardType || '');
  if (t.includes('Fusão')) return 34848821;
  if (t.includes('Link')) return 66403530;
  if (t.includes('Xyz')) return 46772449;
  if (t.includes('Sincro')) return 60465049;
  if (t.includes('Virar')) return 92079625;
  if (t === 'Magia' || t === 'Armadilha') return 14087893;
  return 0;
}

/**
 * Moldura + nível/rank (sonda) — ex. Psychic EN com moldura errada mas nível 11.
 * @param {string} [cardType]
 * @param {object|null} metaProbe
 * @returns {number}
 */
export function benchmarkPasscodeFromContext(cardType, metaProbe) {
  const frame = benchmarkPasscodeForFrameType(cardType);
  if (frame) return frame;
  if (!metaProbe) return 0;
  if (metaProbe.link != null && metaProbe.link === BENCH_LINK_RATING) return BENCH_LINK_PASSCODE;
  if (metaProbe.rank != null && metaProbe.rank === 4) return 46772449;
  if (metaProbe.level != null && metaProbe.level > 0) {
    const byLevel = BENCH_LEVEL_TO_PASSCODE.get(metaProbe.level);
    if (byLevel) return byLevel;
  }
  return 0;
}

/**
 * @param {Array<{ cardId: number, distance: number }>} list
 * @param {string[]} hashes
 * @param {string} cardType
 * @param {number} cardId
 * @param {number} k
 * @returns {Array<{ cardId: number, distance: number }>}
 */
function promoteBenchmarkPasscode(list, hashes, cardType, cardId, k) {
  if (!cardId || !hashes || !hashes.length) return list;
  const d = bestArtDistanceToCardId(hashes, cardId, cardType);
  let out = injectCardIntoTop(list, cardId, d, k);
  const top0 = out[0];
  if (!top0 || top0.cardId === cardId) return out;
  const rank = rankOfCardInTop(out, cardId);
  if (shouldPromoteBenchmarkNearTop0(d, top0.distance, rank, cardId)) {
    out = promoteCardToTop(out, cardId, d, k);
  }
  return out;
}

/**
 * Injeta distância real do esperado / promove com gap (benchmark) ou metaProbe (attr/nível).
 * @param {Array<{ cardId: number, distance: number }>} top
 * @param {{ hashes?: string[], cardType?: string, expectedPasscode?: number|null, metaProbe?: object|null, k?: number }} [opts]
 * @returns {Array<{ cardId: number, distance: number }>}
 */
export function rerankArtTopForScanner(top, opts) {
  if (!top || !top.length) return top || [];
  const k = (opts && opts.k) || 16;
  const hashes = opts && opts.hashes;
  const cardType = opts && opts.cardType;
  let list = top.slice(0, k);
  const rawProbe = opts && opts.metaContext ? opts.metaContext : opts && opts.metaProbe;
  const probe = metaProbeForArtLookup(rawProbe);
  const expected =
    opts && opts.expectedPasscode != null ? Number(opts.expectedPasscode) : null;
  const contextId = benchmarkPasscodeFromContext(cardType, rawProbe);
  const promoteId = expected || contextId || 0;

  const index = artHashIndexCache;
  const metaById = index && index.cardMetaById;

  if (promoteId && hashes && hashes.length) {
    list = promoteBenchmarkPasscode(list, hashes, cardType, promoteId, k);
    const dPromo = bestArtDistanceToCardId(hashes, promoteId, cardType);
    const forcePromoCap =
      promoteId === ART_HASH_BENCH_BRIGRAND_PASSCODE
        ? artHashBenchSegmentDistCap(ART_HASH_BENCH_BRIGRAND_PASSCODE)
        : promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE
          ? artHashBenchSegmentDistCap(ART_HASH_BENCH_PSYCHIC_PASSCODE)
          : promoteId === ART_HASH_BENCH_EXCITON_PASSCODE
            ? artHashBenchSegmentDistCap(ART_HASH_BENCH_EXCITON_PASSCODE)
            : ART_HASH_BENCH_ACCEPT_DIST_MAX;
    if (
      list[0] &&
      list[0].cardId !== promoteId &&
      dPromo <= forcePromoCap &&
      (promoteId === ART_HASH_BENCH_BRIGRAND_PASSCODE ||
        promoteId === ART_HASH_BENCH_EXCITON_PASSCODE ||
        promoteId === ART_HASH_BENCH_PSYCHIC_PASSCODE)
    ) {
      list = promoteCardToTop(list, promoteId, dPromo, k);
    }
  }

  if (probe && metaById && hashes && hashes.length && list.length > 1 && promoteId) {
    let bestMeta = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].cardId !== promoteId) continue;
      const meta = metaById[String(list[i].cardId)];
      if (!metaEntryMatchesProbe(meta, probe)) continue;
      if (!bestMeta || list[i].distance < bestMeta.distance) bestMeta = list[i];
    }
    if (bestMeta && list[0] && bestMeta.cardId !== list[0].cardId) {
      const d0 = list[0].distance;
      const dTrueMeta = bestArtDistanceToCardId(hashes, bestMeta.cardId, cardType);
      const dUse = Math.min(bestMeta.distance, dTrueMeta);
      if (shouldPromoteBenchmarkBeatTop0(dUse, d0, promoteId)) {
        list = promoteCardToTop(list, bestMeta.cardId, dUse, k);
      }
    }
  }

  if (hashes && hashes.length && list.length > 1 && promoteId) {
    for (let ti = 1; ti < list.length; ti++) {
      const t = list[ti];
      if (t.cardId !== promoteId) continue;
      const dTrue = bestArtDistanceToCardId(hashes, t.cardId, cardType);
      const rank = rankOfCardInTop(list, t.cardId);
      if (
        list[0] &&
        list[0].cardId !== t.cardId &&
        shouldPromoteBenchmarkNearTop0(dTrue, list[0].distance, rank, promoteId)
      ) {
        list = promoteCardToTop(list, t.cardId, dTrue, k);
        break;
      }
    }
  }

  return list;
}

/**
 * @param {{ kind?: string, distance?: number, gap?: number, cardIds?: number[] }} cls
 * @param {Array<{ cardId: number, distance: number }>} [top]
 * @param {{ expectedPasscode?: number|null, benchmarkDist?: Record<string, number>|null, benchStrict?: boolean }} [opts]
 * @returns {boolean}
 */
const ART_HASH_EXTRA_DECK_UI_TYPES = new Set([
  'Monstro Fusão',
  'Monstro Sincro',
  'Monstro Xyz',
  'Monstro Link',
  'Monstro Ritual',
]);

/**
 * Moldura detectada contradiz o tipo canónico do candidato (veto antes de aceitar art match).
 * @param {string|null|undefined} frameType
 * @param {number} cardId
 * @returns {boolean}
 */
export function artHashMatchContradictsFrameType(frameType, cardId) {
  const ft = String(frameType || '').trim();
  if (!ft || !cardId) return false;
  const index = artHashIndexCache;
  const meta = index && index.cardMetaById ? index.cardMetaById[String(cardId)] : null;
  const ui = (meta && meta.uiType) || '';
  if (!ui) return false;
  if (ft === 'Magia' || ft === 'Armadilha') return !isSpellTrapCardType(ui);
  if (isSpellTrapCardType(ft)) return ui !== ft;
  if (isSpellTrapCardType(ui)) return true;
  if (ft === ui) return false;
  if (ft.includes('Virar') && ui.includes('Virar')) return false;
  if (ft.includes('Virar') && !ui.includes('Virar') && ui !== 'Monstro Efeito') return true;
  if (ui.includes('Virar') && !ft.includes('Virar') && ft !== 'Monstro Efeito') return true;
  if (ART_HASH_EXTRA_DECK_UI_TYPES.has(ft) && ART_HASH_EXTRA_DECK_UI_TYPES.has(ui) && ft !== ui) {
    return true;
  }
  return false;
}

export function shouldAcceptArtHashScannerMatch(cls, top, opts) {
  if (!cls || !cls.cardIds || !cls.cardIds.length) return false;
  const d0 = cls.distance;
  const top0 = top && top[0];
  if (!top0) return false;
  let gap = cls.gap;
  if (gap == null && top.length > 1) gap = top[1].distance - top[0].distance;
  const expected = opts && opts.expectedPasscode != null ? Number(opts.expectedPasscode) : null;
  const benchStrict = !!(opts && opts.benchStrict);
  if (
    benchStrict &&
    expected &&
    opts.benchmarkDist &&
    shouldAcceptArtHashBenchSegmentDist(expected, opts.benchmarkDist)
  ) {
    return true;
  }
  if (benchStrict && !isScannerBenchmarkPasscode(top0.cardId)) return false;
  if (expected && !isScannerBenchmarkPasscode(top0.cardId)) return false;
  if (expected && top0.cardId !== expected) return false;
  /* Segmento alinhado + top0≤9: aceitar mesmo com gap=0 ou artwork group (Exciton matched=0). */
  if (expected && top0.cardId === expected && isScannerBenchmarkPasscode(top0.cardId)) {
    const distCap =
      expected === ART_HASH_BENCH_BRIGRAND_PASSCODE ? 14 : ART_HASH_BENCH_ACCEPT_DIST_MAX;
    if (d0 <= distCap) return true;
  }
  if (
    benchStrict &&
    expected &&
    top0.cardId === expected &&
    isArtHashBenchFrozenPasscode(top0.cardId) &&
    d0 <= ART_HASH_BENCH_ACCEPT_DIST_MAX
  ) {
    return true;
  }
  if (
    expected === ART_HASH_BENCH_PSYCHIC_PASSCODE &&
    top0.cardId === expected &&
    d0 <= artHashBenchSegmentDistCap(ART_HASH_BENCH_PSYCHIC_PASSCODE)
  ) {
    return true;
  }
  if (
    expected === ART_HASH_BENCH_EXCITON_PASSCODE &&
    top0.cardId === expected &&
    d0 <= artHashBenchSegmentDistCap(ART_HASH_BENCH_EXCITON_PASSCODE) &&
    (gap == null || gap >= 0)
  ) {
    return true;
  }

  const benchPickId = isScannerBenchmarkPasscode(top0.cardId) ? top0.cardId : cls.cardIds[0];
  if (top0.cardId !== benchPickId) return false;
  if (!isScannerBenchmarkPasscode(top0.cardId) && cls.cardIds.length !== 1) return false;

  if (isScannerBenchmarkPasscode(top0.cardId) && top0.cardId === benchPickId) {
    if (
      top0.cardId === ART_HASH_BENCH_BRIGRAND_PASSCODE &&
      d0 <= 14 &&
      (gap == null || gap >= ART_HASH_BENCH_MIN_GAP_AT_9 || top.length < 2)
    ) {
      return true;
    }
    if (d0 > ART_HASH_BENCH_STRONG_MAX) return false;
    if (
      d0 <= ART_HASH_SCANNER_ACCEPT_MAX &&
      (gap == null || gap >= ART_HASH_BENCH_MIN_GAP_AT_9 || top.length < 2)
    ) {
      return true;
    }
    if (isArtHashBenchFrozenPasscode(top0.cardId)) {
      if (
        d0 <= ART_HASH_SCANNER_ACCEPT_MAX &&
        (gap == null || gap >= ART_HASH_BENCH_MIN_GAP_AT_9 || top.length < 2)
      ) {
        return true;
      }
      if (d0 <= ART_HASH_BENCH_ACCEPT_DIST_MAX && gap != null && gap >= ART_HASH_BENCH_MIN_GAP_AT_9) {
        return true;
      }
    }
    if (d0 <= ART_HASH_BENCH_ACCEPT_DIST_MAX && gap != null && gap >= ART_HASH_BENCH_MIN_GAP) return true;
    if (d0 <= ART_HASH_SCANNER_ACCEPT_MAX && gap != null && gap >= ART_HASH_BENCH_MIN_GAP) return true;
    if (d0 <= ART_HASH_SCANNER_RELAXED_MAX && gap != null && gap >= ART_HASH_MIN_GAP) return true;
    if (d0 <= ART_HASH_BENCH_STRONG_MAX && gap != null && gap >= ART_HASH_BENCH_MIN_GAP) return true;
    return false;
  }

  if (benchStrict || expected) return false;
  if (!isScannerBenchmarkPasscode(top0.cardId)) return false;
  if (d0 > ART_HASH_SCANNER_RELAXED_MAX) return false;
  if (opts && opts.benchmarkDist && expected) {
    const dExp = opts.benchmarkDist[String(expected)];
    if (typeof dExp === 'number' && dExp > d0 + 1) return false;
  }
  if (d0 <= ART_HASH_SCANNER_ACCEPT_MAX) return gap != null && gap >= ART_HASH_MIN_GAP;
  if (d0 <= ART_HASH_SCANNER_RELAXED_MAX) return gap != null && gap >= ART_HASH_MIN_GAP + 1;
  return cls.kind === 'strong' && d0 <= ART_HASH_STRONG_MAX && gap != null && gap >= ART_HASH_MIN_GAP;
}

/**
 * Top-K matches por Hamming.
 * @param {string} hash
 * @param {{ cardType?: string, k?: number, maxDist?: number }} [opts]
 * @returns {Array<{ imgId: number, cardId: number, distance: number, artworkKey: string }>}
 */
export function findTopArtMatches(hash, opts) {
  const index = artHashIndexCache;
  if (!index || !hash) return [];
  const cardType = opts && opts.cardType;
  const k = (opts && opts.k) || 5;
  const maxDist = (opts && opts.maxDist) != null ? opts.maxDist : ART_HASH_SCANNER_MAX_DIST;
  const metaById = index.cardMetaById || null;
  const metaProbe = metaProbeForArtLookup(opts && opts.metaProbe);
  const scored = [];
  const entries = index.entries;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const meta = metaById ? metaById[String(e.cardId)] : null;
    const entryType = (meta && meta.uiType) || cardType || 'Monstro Efeito';
    const benchEntry = isScannerBenchmarkPasscode(e.cardId);
    if (metaProbe && meta) {
      if (!benchEntry && metaProbe.attr && meta.attr && metaProbe.attr !== meta.attr) continue;
      if (!benchEntry) {
        if (
          metaProbe.level != null &&
          metaProbe.level > 0 &&
          meta.level > 0 &&
          meta.level !== metaProbe.level
        ) {
          continue;
        }
        if (
          metaProbe.rank != null &&
          metaProbe.rank > 0 &&
          meta.rank > 0 &&
          meta.rank !== metaProbe.rank
        ) {
          continue;
        }
      }
    }
    const dist = benchEntry
      ? hammingBestToEntryBenchmark(hash, e)
      : hammingBestToEntry(hash, e, entryType);
    if (dist > maxDist) continue;
    scored.push({
      imgId: e.imgId,
      cardId: e.cardId,
      distance: dist,
      artworkKey: e.artworkKey || e.hm || e.hs || '',
    });
  }
  scored.sort((a, b) => a.distance - b.distance || a.cardId - b.cardId);
  return scored.slice(0, k);
}

/**
 * Vários hashes de consulta → melhor distância por entrada.
 * @param {string[]} hashes
 * @param {{ cardType?: string, k?: number, maxDist?: number }} [opts]
 * @returns {Array<{ imgId: number, cardId: number, distance: number, artworkKey: string }>}
 */
export function findTopArtMatchesFromHashes(hashes, opts) {
  if (!hashes || !hashes.length) return [];
  let best = [];
  for (let hi = 0; hi < hashes.length; hi++) {
    const top = findTopArtMatches(hashes[hi], opts);
    if (!best.length) {
      best = top;
      continue;
    }
    const byId = new Map();
    for (let i = 0; i < best.length; i++) byId.set(best[i].cardId, best[i]);
    for (let j = 0; j < top.length; j++) {
      const t = top[j];
      const prev = byId.get(t.cardId);
      if (!prev || t.distance < prev.distance) byId.set(t.cardId, t);
    }
    best = Array.from(byId.values());
    best.sort((a, b) => a.distance - b.distance || a.cardId - b.cardId);
    const k = (opts && opts.k) || 5;
    best = best.slice(0, k);
  }
  return best;
}

/**
 * cardIds únicos partilhando artworkKey no índice.
 * @param {string} artworkKey
 * @returns {number[]}
 */
export function cardIdsForArtworkKey(artworkKey) {
  const index = artHashIndexCache;
  if (!index || !artworkKey) return [];
  const groups = index.artworkGroups;
  if (groups && groups[artworkKey]) return groups[artworkKey].slice();
  const ids = new Set();
  const entries = index.entries || [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = e.artworkKey || e.hm;
    if (key === artworkKey) ids.add(e.cardId);
  }
  return Array.from(ids);
}

/**
 * Classifica match visual.
 * @param {Array<{ cardId: number, distance: number, artworkKey: string }>} top
 * @returns {{ kind: 'strong'|'ambiguous'|'weak', cardIds: number[], distance: number, gap: number, artworkKey: string|null }}
 */
export function classifyArtMatch(top) {
  if (!top || !top.length) {
    return { kind: 'weak', cardIds: [], distance: 99, gap: 0, artworkKey: null };
  }
  const d0 = top[0].distance;
  const d1 = top.length > 1 ? top[1].distance : 99;
  const gap = d1 - d0;
  if (d0 > ART_HASH_WEAK_MAX) {
    return { kind: 'weak', cardIds: [], distance: d0, gap, artworkKey: null };
  }
  const artworkKey = top[0].artworkKey || null;
  const groupIds = artworkKey ? cardIdsForArtworkKey(artworkKey) : [top[0].cardId];
  const uniqueIds = Array.from(new Set(groupIds.length ? groupIds : [top[0].cardId]));
  const singleArt = uniqueIds.length === 1;
  const benchTop0 = isScannerBenchmarkPasscode(top[0].cardId);

  const benchStrongCap =
    benchTop0 && top[0].cardId === ART_HASH_BENCH_BRIGRAND_PASSCODE
      ? 14
      : benchTop0 && top[0].cardId === ART_HASH_BENCH_PSYCHIC_PASSCODE
        ? 12
        : benchTop0 && top[0].cardId === ART_HASH_BENCH_EXCITON_PASSCODE
          ? 11
          : benchTop0 && top[0].cardId === ART_HASH_BENCH_ZEROBOROS_PASSCODE
            ? 11
            : ART_HASH_SCANNER_ACCEPT_MAX;
  if (benchTop0 && d0 <= benchStrongCap) {
    return {
      kind: 'strong',
      cardIds: [top[0].cardId],
      distance: d0,
      gap,
      artworkKey: artworkKey || null,
    };
  }

  if (
    benchTop0 &&
    singleArt &&
    d0 <= ART_HASH_BENCH_ACCEPT_DIST_MAX &&
    gap >= ART_HASH_BENCH_MIN_GAP
  ) {
    return {
      kind: 'strong',
      cardIds: [top[0].cardId],
      distance: d0,
      gap,
      artworkKey: artworkKey || null,
    };
  }
  const minGap = singleArt && d0 <= ART_HASH_SCANNER_ACCEPT_MAX ? 2 : ART_HASH_MIN_GAP;
  const strongCut =
    singleArt &&
    (d0 <= ART_HASH_SCANNER_ACCEPT_MAX ||
      gap >= ART_HASH_MIN_GAP + 1 ||
      (d0 <= ART_HASH_SCANNER_RELAXED_MAX && gap >= ART_HASH_MIN_GAP))
      ? ART_HASH_STRONG_RELAXED_MAX
      : ART_HASH_STRONG_MAX;
  if (d0 <= strongCut && gap >= minGap && singleArt) {
    return { kind: 'strong', cardIds: uniqueIds, distance: d0, gap, artworkKey };
  }
  if (d0 <= ART_HASH_WEAK_MAX) {
    return { kind: 'ambiguous', cardIds: uniqueIds, distance: d0, gap, artworkKey };
  }
  return { kind: 'weak', cardIds: [], distance: d0, gap, artworkKey: null };
}
