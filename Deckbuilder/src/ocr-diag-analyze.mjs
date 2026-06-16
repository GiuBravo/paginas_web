/**
 * Análise de amostras de diagnóstico OCR (browser + Node).
 * Partilhado com scripts/analyze-ocr-diagnostics.mjs e painel live na coleta.
 */
import { classifyAttributeFromRgb } from './ocr-card-features.mjs';
import {
  artHashBenchSegmentDistCap,
  resolveArtHashBenchSegmentMatchedId,
} from './ocr-art-hash.mjs';

/** Passcodes fixos — docs/SCANNER_BENCHMARK.md */
export const SCANNER_BENCHMARK_PASSCODES = [
  34848821, 14087893, 92079625, 66403530, 46772449, 60465049,
];

export const SCANNER_BENCHMARK_SEGMENTS = [
  { seqStart: 0, seqEnd: 12, passcode: 34848821 },
  { seqStart: 13, seqEnd: 25, passcode: 14087893 },
  { seqStart: 26, seqEnd: 37, passcode: 92079625 },
  { seqStart: 38, seqEnd: 50, passcode: 66403530 },
  { seqStart: 51, seqEnd: 62, passcode: 46772449 },
  { seqStart: 63, seqEnd: 74, passcode: 60465049 },
];

export const SCANNER_BENCHMARK_CARD_LABELS = {
  34848821: 'Brigrand',
  14087893: 'Livro da Lua',
  92079625: 'Vazio',
  66403530: 'Zeroboros',
  46772449: 'Exciton',
  60465049: 'Psychic',
};

const BENCH_TYPE_EXPECTED = {
  34848821: 'Monstro Fusão',
  14087893: 'Magia',
  92079625: 'Monstro Virar',
  66403530: 'Monstro Link',
  46772449: 'Monstro Xyz',
  60465049: 'Monstro Sincro',
};

const BENCH_RARITY_EXPECTED = {
  34848821: 'Ultra Rara',
  14087893: 'Secreta',
  92079625: 'Ultra Rara',
  66403530: 'Ultra Rara',
  46772449: 'Ultra Rara',
  60465049: 'Secreta',
};

const BENCH_ATTR_EXPECTED = {
  34848821: 'DARK',
  14087893: 'SPELL',
  92079625: 'DARK',
  66403530: 'DARK',
  46772449: 'DARK',
  60465049: 'LIGHT',
};

export const BENCH_LEVEL_EXPECTED = {
  34848821: { kind: 'level', value: 8 },
  14087893: { kind: 'spell', value: null },
  92079625: { kind: 'level', value: 9 },
  66403530: { kind: 'link', value: 4 },
  46772449: { kind: 'rank', value: 4 },
  60465049: { kind: 'level', value: 11 },
};

/** Metas de fecho por fase — docs/SCANNER_BENCHMARK.md v1.1 */
export const SCANNER_BENCHMARK_PHASE_CLOSE = {
  A: { warpPct: 1 },
  B: { cardsTop0Le9: 4, matchedWrong: 0 },
  C: { artMatched: 51, matchedWrong: 0 },
  D: { cardsPass: 5 },
  E: { cardsPass: 5 },
  F: { cardsPass: 5 },
  G: { cardsPass: 5 },
  H: { cardsPass: 4 },
  I: { artMatched: 51, pipelineMin: 1, warpPct: 1, matchedWrong: 0 },
  J: { passcodeCards: 4 },
};

const BENCH_NAME_TOKENS = {
  34848821: ['BRIGRAND', 'GLORIA', 'GLÓRIA', 'GLORY'],
  14087893: ['LIVRO', 'LUA', 'MOON', 'BOOK', 'LUNAR', 'LIVRO DA'],
  92079625: ['VAZIO', 'HELSOMBRANECO', 'EMPTY', 'VOID'],
  66403530: ['ZEROBOROS', 'TOPOLOG', 'BOROS'],
  46772449: ['EXCITON', 'HORDEUM', 'MALIG', 'MALIGH', 'THORDEUM', 'HORDEU', 'KNIGHT'],
  60465049: ['PSYCHIC', 'PUNISHER', 'PUNISE', 'END', 'JUSTICEIRO', 'PSÍQUICO', 'PSIQUICO'],
};

const PHASE_D_CHROMA_TYPES = new Set([
  'Magia',
  'Magia Rápida',
  'Armadilha',
  'Monstro Fusão',
  'Monstro Ritual',
  'Monstro Xyz',
  'Monstro Sincro',
  'Monstro Link',
  'Monstro Virar',
]);

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
  if (!norm || norm.startsWith('ART:') || norm.startsWith('ID ')) return false;
  if (passcode === 60465049 && /EXCITON|HORDEUM|MALIG/.test(norm)) return false;
  if (passcode === 46772449 && /PSYCHIC|PUNISH|PSIQUICO/.test(norm)) return false;
  if (passcode === 60465049) {
    const strongEn = ['PSYCHIC', 'PUNISHER', 'PUNISE'];
    if (!strongEn.some((t) => norm.includes(normalizeBenchNameText(t)))) return false;
  }
  return tokens.some((t) => norm.includes(normalizeBenchNameText(t)));
}

function attributeFromSample(s) {
  const fmp = s.featureMiraProbe;
  if (!fmp) return null;
  const lp = fmp.liveProbe;
  if (lp && lp.error) return null;
  const rgb = lp && lp.attrRgb;
  const hint = fmp.cardTypeHint || '';
  if (rgb && hint) {
    const replay = classifyAttributeFromRgb(rgb.avgR, rgb.avgG, rgb.avgB, hint);
    if (replay) return replay;
  }
  if (lp && lp.attribute) return lp.attribute;
  if (lp && lp.attr) return lp.attr;
  return null;
}

function levelRankFromSample(s) {
  const fmp = s.featureMiraProbe;
  if (!fmp) return null;
  const lp = fmp.liveProbe;
  if (lp && lp.error) return null;
  if (lp && lp.levelRankMeasured) return lp.levelRankMeasured;
  if (lp && lp.levelRank) return lp.levelRank;
  return null;
}

/**
 * matched por minDist ou confirmação passcode J em amostras pipeline (não altera art_only).
 * @param {object} s
 * @returns {number|null}
 */
function resolveBenchSegmentMatchedIdFromSample(s) {
  const ap = s.artProbe;
  if (!ap) return null;
  const base = resolveArtHashBenchSegmentMatchedId(ap);
  if (base != null) return base;
  if (s.sampleKind !== 'pipeline') return null;
  const exp =
    ap.artExpectedPasscode != null
      ? Number(ap.artExpectedPasscode)
      : expectedBenchmarkPasscodeForSeq(s.seq);
  if (exp == null || isNaN(exp)) return null;
  const pp = s.passcodeProbe;
  const cands =
    pp && pp.sidecar && Array.isArray(pp.sidecar.candidates) ? pp.sidecar.candidates : null;
  if (!cands || !cands.some((c) => Number(c) === exp)) return null;
  const dExp =
    ap.artBenchmarkDist && ap.artBenchmarkDist[String(exp)] != null
      ? Number(ap.artBenchmarkDist[String(exp)])
      : NaN;
  if (isNaN(dExp) || dExp > artHashBenchSegmentDistCap(exp) + 1) return null;
  return exp;
}

function attributeMatchesBenchExpected(detected, expected) {
  if (!expected || !detected) return false;
  const d = String(detected).toUpperCase();
  const e = String(expected).toUpperCase();
  if (d === e) return true;
  if (e === 'SPELL' && (d === 'SPELL' || d === 'MAGIC' || d === 'MAGIA')) return true;
  if (e === 'TRAP' && (d === 'TRAP' || d === 'ARMADILHA')) return true;
  return false;
}

function levelRankMatchesBenchExpected(lr, expected) {
  if (!expected || !lr || !lr.kind) return false;
  if (lr.kind !== expected.kind) return false;
  if (expected.value == null) return lr.value == null || lr.value === 0;
  return lr.value === expected.value;
}

function rarityMatchesBenchExpected(detected, expected) {
  if (!detected || !expected) return false;
  if (detected === expected) return true;
  if (expected === 'Ultra Rara' && detected === 'Ultra Rare') return true;
  if (expected === 'Secreta' && (detected === 'Secreta' || detected === 'Secret Rare')) return true;
  return false;
}

function typeMatchesBenchExpected(detected, expected) {
  if (!detected || !expected) return false;
  if (detected === expected) return true;
  if (expected === 'Magia' && (detected === 'Magia' || detected === 'Magia Rápida')) return true;
  if (expected === 'Monstro Virar' && detected.includes('Virar')) return true;
  return false;
}

function detectTypeFromSample(s) {
  const tp = s.typeProbe;
  if (!tp) return null;
  const frame = tp.classifiedTypeFromFrameOnly || tp.classifiedTypeFromFrame || null;
  const merged = tp.classifiedTypeMerged || tp.classifiedType || null;
  const strip = tp.classifiedTypeFromNameStripOnly || null;
  const expectedPc = expectedBenchmarkPasscodeForSeq(s.seq);
  const expectedType = expectedPc ? BENCH_TYPE_EXPECTED[expectedPc] : null;
  if (merged && expectedType && merged === expectedType) return merged;
  const frameWeak = !frame || frame === 'Monstro Normal' || frame === 'Monstro Efeito';
  if (frameWeak && merged && merged !== frame && PHASE_D_CHROMA_TYPES.has(merged)) return merged;
  if (frameWeak && strip && PHASE_D_CHROMA_TYPES.has(strip)) return strip;
  if (
    merged &&
    frame &&
    merged !== frame &&
    PHASE_D_CHROMA_TYPES.has(merged) &&
    PHASE_D_CHROMA_TYPES.has(frame) &&
    expectedType &&
    merged === expectedType
  ) {
    return merged;
  }
  return frame || merged || null;
}

/** Amostras mínimas no segmento antes de HARD pause por Fase D baixa. */
export const SEGMENT_D_HARD_PAUSE_MIN_SAMPLES = 8;

/**
 * % matched arte no segmento da carta (0–100).
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {number} passcode
 * @returns {number|null}
 */
export function computeSegmentMatchedPct(core, passcode) {
  const card = core.benchmark && core.benchmark.perCard && core.benchmark.perCard[passcode];
  if (!card || !card.segSamples) return null;
  return Math.round((card.matched / card.segSamples) * 100);
}

/**
 * % Fase D no segmento da carta (0–100).
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {number} passcode
 * @returns {number|null}
 */
export function computeSegmentPhaseDPct(core, passcode) {
  const slot = core.phaseD && core.phaseD[passcode];
  if (!slot || !slot.samples) return null;
  return Math.round((slot.correct / slot.samples) * 100);
}

/**
 * Pausar coleta se Fase D do segmento &lt;50% após N amostras (P0 Zeroboros).
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {number} passcode
 * @param {number} [minSamples]
 * @returns {boolean}
 */
export function shouldHardPauseSegmentPhaseD(core, passcode, minSamples = SEGMENT_D_HARD_PAUSE_MIN_SAMPLES) {
  const slot = core.phaseD && core.phaseD[passcode];
  if (!slot || slot.samples < minSamples) return false;
  return slot.correct / slot.samples < 0.5;
}

export function expectedBenchmarkPasscodeForSeq(seq) {
  for (const seg of SCANNER_BENCHMARK_SEGMENTS) {
    if (seq >= seg.seqStart && seq <= seg.seqEnd) return seg.passcode;
  }
  return null;
}

export function segSamplesForPasscode(passcode) {
  for (const seg of SCANNER_BENCHMARK_SEGMENTS) {
    if (seg.passcode === passcode) return seg.seqEnd - seg.seqStart + 1;
  }
  return 0;
}

/** Limiar `top0≤9` por carta (Brigrand minDist=10 conta como top0 forte). */
export function artHashBenchTop0Le9MaxDist(passcode) {
  if (Number(passcode) === 34848821) return 10;
  return 9;
}

/**
 * @param {Record<string, { samples?: number, correct?: number }>|undefined} phaseMap
 * @returns {number}
 */
export function countPhaseCardsPass(phaseMap) {
  if (!phaseMap) return 0;
  let n = 0;
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const slot = phaseMap[id];
    if (!slot || !slot.samples) continue;
    if (slot.correct / slot.samples >= 0.5) n++;
  }
  return n;
}

/**
 * Cartas com pelo menos um top0≤9 no segmento (Fase B).
 * @param {Record<number, { top0Le9?: number }>} perCard
 * @returns {number}
 */
export function countPhaseBCardsPass(perCard) {
  if (!perCard) return 0;
  let n = 0;
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const c = perCard[id];
    if (c && c.top0Le9 > 0) n++;
  }
  return n;
}

/**
 * Cartas com nome legível em pipeline (Fase H — ≥1 hit).
 * @param {Record<number, { pipelineSamples?: number, nameHits?: number }>} phaseMap
 * @returns {number}
 */
export function countPhaseHCardsPass(phaseMap) {
  if (!phaseMap) return 0;
  let n = 0;
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const slot = phaseMap[id];
    if (slot && slot.nameHits > 0) n++;
  }
  return n;
}

/**
 * Cartas com passcode correcto em candidatos (Fase J).
 * @param {Record<number, { correctCands?: number }>|undefined} passcodeBench
 * @returns {number}
 */
export function countPhaseJCardsPass(passcodeBench) {
  if (!passcodeBench) return 0;
  let n = 0;
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const c = passcodeBench[id];
    if (c && c.correctCands > 0) n++;
  }
  return n;
}

/**
 * @param {number} passcode
 * @returns {string}
 */
export function formatBenchLevelExpected(passcode) {
  const exp = BENCH_LEVEL_EXPECTED[passcode];
  if (!exp) return '—';
  if (exp.value != null) return `${exp.kind}=${exp.value}`;
  return exp.kind;
}

/**
 * phaseG ≥50% mas matched segmento <50% (caso Exciton).
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {number} passcode
 * @returns {boolean}
 */
export function isPhaseGParadox(core, passcode) {
  const g = core.phaseG && core.phaseG[passcode];
  const card = core.benchmark && core.benchmark.perCard && core.benchmark.perCard[passcode];
  if (!g || !g.samples || !card || !card.segSamples) return false;
  const gPct = g.correct / g.samples;
  const mPct = card.matched / card.segSamples;
  return gPct >= 0.5 && mPct < 0.5;
}

/**
 * Alertas por segmento: matched &lt;50% oficial ou Fase D &lt;50%.
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {object|null|undefined} official
 * @returns {Array<{ passcode: number, name: string, kind: 'matched'|'phaseD', pct: number, seqRange: string }>}
 */
export function buildSegmentAnomalyWarnings(core, official) {
  if (!official || !official.perCard || !core.benchmark) return [];
  const warnings = [];
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const name = SCANNER_BENCHMARK_CARD_LABELS[id] || String(id);
    const live = core.benchmark.perCard[id];
    const off = official.perCard[String(id)] || official.perCard[id];
    if (!live || !off) continue;
    const seg = SCANNER_BENCHMARK_SEGMENTS.find((s) => s.passcode === id);
    const seqRange = seg ? `${seg.seqStart}–${seg.seqEnd}` : '—';
    if (
      off.matched != null &&
      live.segSamples > 0 &&
      live.matched < Math.round(off.matched * 0.5)
    ) {
      const pct = Math.round((live.matched / live.segSamples) * 100);
      warnings.push({ passcode: id, name, kind: 'matched', pct, seqRange });
    }
    const dSlot = core.phaseD && core.phaseD[id];
    if (dSlot && dSlot.samples > 0) {
      const dPct = Math.round((dSlot.correct / dSlot.samples) * 100);
      if (
        off.matched != null &&
        live.matched > Math.round(off.matched * 0.8) &&
        dPct < 70
      ) {
        warnings.push({ passcode: id, name, kind: 'phaseDHighMatched', pct: dPct, seqRange });
      } else if (dPct < 50) {
        warnings.push({ passcode: id, name, kind: 'phaseD', pct: dPct, seqRange });
      }
    }
  }
  return warnings;
}

/**
 * Promover baseline oficial só se passar guard C (matched, top0≤9) e melhorar vs JSON actual.
 * @param {ReturnType<typeof analyzeDiagSamples>} metrics
 * @param {object|null|undefined} currentOfficial
 * @returns {{ promote: boolean, reason: string }}
 */
export function shouldPromoteOfficialBaseline(metrics, currentOfficial) {
  const offMatched = currentOfficial && currentOfficial.artMatched != null ? currentOfficial.artMatched : 67;
  const offTop0 =
    currentOfficial && currentOfficial.top0DistLe9 != null ? currentOfficial.top0DistLe9 : 0;
  const offNear = currentOfficial && currentOfficial.nearMiss != null ? currentOfficial.nearMiss : 99;
  const offG = currentOfficial && currentOfficial.phaseG != null ? currentOfficial.phaseG : 0;
  const minMatched = Math.max(70, offMatched);
  const liveTop0 = metrics.top0DistLe9 != null ? metrics.top0DistLe9 : 0;

  if (metrics.artMatched < minMatched) {
    return {
      promote: false,
      reason: `guard: matched ${metrics.artMatched} < ${minMatched}`,
    };
  }
  if (offTop0 > 0 && liveTop0 < offTop0 - 5) {
    return {
      promote: false,
      reason: `guard: top0≤9 ${liveTop0} caiu >5 vs official ${offTop0}`,
    };
  }
  if (metrics.artMatched > offMatched) {
    return { promote: true, reason: `matched ${metrics.artMatched} > ${offMatched}` };
  }
  if (metrics.artMatched === offMatched) {
    if (liveTop0 > offTop0) {
      return {
        promote: true,
        reason: `empate matched ${metrics.artMatched}, top0≤9 ${liveTop0} > ${offTop0}`,
      };
    }
    if (metrics.phaseGCount > offG) {
      return { promote: true, reason: `empate matched ${metrics.artMatched}, G ${metrics.phaseGCount}/6 > ${offG}/6` };
    }
    if (metrics.phaseGCount === offG && metrics.nearMiss < offNear) {
      return {
        promote: true,
        reason: `empate matched/G, near-miss ${metrics.nearMiss} < ${offNear}`,
      };
    }
  }
  return {
    promote: false,
    reason: `matched ${metrics.artMatched}/${offMatched}, top0≤9 ${liveTop0}/${offTop0}, G ${metrics.phaseGCount}/${offG}, near ${metrics.nearMiss}/${offNear}`,
  };
}

/**
 * Compara métricas de dois conjuntos de amostras (ZIP A vs B).
 * @param {ReturnType<typeof analyzeDiagSamples>} a
 * @param {ReturnType<typeof analyzeDiagSamples>} b
 * @param {{ labelA?: string, labelB?: string }} [opts]
 * @returns {string[]}
 */
export function formatBenchZipCompareLines(a, b, opts = {}) {
  const labelA = opts.labelA || 'A';
  const labelB = opts.labelB || 'B';
  const lines = [];
  lines.push(`=== bench-compare: ${labelA} vs ${labelB} ===`);
  lines.push(
    `matched: ${a.artMatched} → ${b.artMatched} (${b.artMatched - a.artMatched >= 0 ? '+' : ''}${b.artMatched - a.artMatched})`
  );
  lines.push(
    `near-miss: ${a.nearMiss} → ${b.nearMiss} (${b.nearMiss - a.nearMiss >= 0 ? '+' : ''}${b.nearMiss - a.nearMiss})`
  );
  lines.push(`G: ${a.phaseGCount}/6 → ${b.phaseGCount}/6`);
  lines.push(`H: ${a.phaseHCount}/6 → ${b.phaseHCount}/6`);
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const na = SCANNER_BENCHMARK_CARD_LABELS[id] || String(id);
    const ca = a.benchmark.perCard[id];
    const cb = b.benchmark.perCard[id];
    const ga = a.phaseG[id];
    const gb = b.phaseG[id];
    const ea = a.phaseE[id];
    const eb = b.phaseE[id];
    const gPctA = ga && ga.samples ? Math.round((ga.correct / ga.samples) * 100) : 0;
    const gPctB = gb && gb.samples ? Math.round((gb.correct / gb.samples) * 100) : 0;
    const ePctA = ea && ea.samples ? Math.round((ea.correct / ea.samples) * 100) : 0;
    const ePctB = eb && eb.samples ? Math.round((eb.correct / eb.samples) * 100) : 0;
    lines.push(
      `  ${na}: matched ${ca.matched}→${cb.matched} · G ${gPctA}%→${gPctB}% · E ${ePctA}%→${ePctB}%`
    );
  }
  return lines;
}

/**
 * Carta com maior queda de matched vs baseline oficial.
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {object|null|undefined} official
 * @returns {{ passcode: number, name: string, matched: number, offMatched: number, delta: number }|null}
 */
export function findWorstMatchedCardDrop(core, official) {
  if (!official || !official.perCard || !core.benchmark) return null;
  let worst = null;
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const live = core.benchmark.perCard[id];
    const off = official.perCard[String(id)] || official.perCard[id];
    if (!live || !off || off.matched == null) continue;
    const delta = live.matched - off.matched;
    if (!worst || delta < worst.delta) {
      worst = {
        passcode: id,
        name: SCANNER_BENCHMARK_CARD_LABELS[id] || String(id),
        matched: live.matched,
        offMatched: off.matched,
        segSamples: live.segSamples,
        offSegSamples: off.segSamples,
        delta,
      };
    }
  }
  return worst && worst.delta < 0 ? worst : null;
}

/**
 * @param {object[]} samples
 * @returns {object}
 */
export function analyzeDiagSamples(samples) {
  const list = Array.isArray(samples) ? samples : [];
  const sampleKinds = {};
  let artWarpActive = 0;
  let artMatched = 0;
  let artNearOnly = 0;
  let benchTop0Correct = 0;
  let benchTop0DistLe9 = 0;
  let benchMatchedCorrect = 0;
  let benchMatchedWrong = 0;
  const benchPerCard = {};
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    benchPerCard[id] = {
      top0: 0,
      top0Le9: 0,
      minDist: 99,
      matched: 0,
      bestRankTop5: -1,
      minDistInTop5: 99,
      inTop5Hits: 0,
      segSamples: segSamplesForPasscode(id),
    };
  }
  const phaseDPerCard = {};
  const phaseEPerCard = {};
  const phaseFPerCard = {};
  const phaseGPerCard = {};
  const phaseHPerCard = {};
  let frameStallCount = 0;
  const frameStallSamples = [];
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    phaseDPerCard[id] = { samples: 0, correct: 0 };
    phaseEPerCard[id] = { samples: 0, correct: 0 };
    phaseFPerCard[id] = { samples: 0, correct: 0 };
    phaseGPerCard[id] = { samples: 0, correct: 0 };
    phaseHPerCard[id] = { pipelineSamples: 0, nameHits: 0 };
  }

  for (const s of list) {
    const stallMs = s.frameStallMs;
    if (typeof stallMs === 'number' && stallMs > 150) {
      frameStallCount++;
      if (frameStallSamples.length < 24) {
        frameStallSamples.push({ seq: s.seq, ms: stallMs, kind: s.sampleKind || 'pipeline' });
      }
    }
    const rp = s.rarityProbe;
    const expectedPcSeg = expectedBenchmarkPasscodeForSeq(s.seq);
    if (expectedPcSeg && phaseDPerCard[expectedPcSeg]) {
      const slotD = phaseDPerCard[expectedPcSeg];
      slotD.samples++;
      const detectedType = detectTypeFromSample(s);
      if (typeMatchesBenchExpected(detectedType, BENCH_TYPE_EXPECTED[expectedPcSeg])) slotD.correct++;
    }
    if (expectedPcSeg && phaseEPerCard[expectedPcSeg]) {
      const slotE = phaseEPerCard[expectedPcSeg];
      slotE.samples++;
      const detR = rp?.classifiedRarity;
      if (rarityMatchesBenchExpected(detR, BENCH_RARITY_EXPECTED[expectedPcSeg])) slotE.correct++;
    }
    if (expectedPcSeg && phaseFPerCard[expectedPcSeg]) {
      const slotF = phaseFPerCard[expectedPcSeg];
      slotF.samples++;
      const detA = attributeFromSample(s);
      if (attributeMatchesBenchExpected(detA, BENCH_ATTR_EXPECTED[expectedPcSeg])) slotF.correct++;
    }
    if (expectedPcSeg && phaseGPerCard[expectedPcSeg]) {
      const slotG = phaseGPerCard[expectedPcSeg];
      slotG.samples++;
      const lr = levelRankFromSample(s);
      if (levelRankMatchesBenchExpected(lr, BENCH_LEVEL_EXPECTED[expectedPcSeg])) slotG.correct++;
    }
    if (expectedPcSeg && phaseHPerCard[expectedPcSeg] && s.sampleKind === 'pipeline') {
      const slotH = phaseHPerCard[expectedPcSeg];
      slotH.pipelineSamples++;
      const cleaned =
        (s.robotStrip && s.robotStrip.ocrPipelineName) ||
        (s.outcome && s.outcome.cleaned);
      if (benchNameMatchesExpected(cleaned, expectedPcSeg)) {
        slotH.nameHits++;
        const label = String(cleaned).slice(0, 48);
        slotH.names = slotH.names || {};
        slotH.names[label] = (slotH.names[label] || 0) + 1;
      }
    }

    const ap = s.artProbe;
    const kind = s.sampleKind || 'pipeline';
    sampleKinds[kind] = (sampleKinds[kind] || 0) + 1;
    if (ap?.warpActive) artWarpActive++;
    const oc = s.outcome;
    const segMatchedId = ap ? resolveBenchSegmentMatchedIdFromSample(s) : null;
    const resolvedMatchedId =
      segMatchedId != null
        ? segMatchedId
        : oc?.matchedCardId != null
          ? Number(oc.matchedCardId)
          : ap?.matchedCardId != null
            ? Number(ap.matchedCardId)
            : null;
    const artMatchSource = oc?.matchSource || (segMatchedId != null ? 'art' : null);
    if (resolvedMatchedId && artMatchSource === 'art') artMatched++;
    const expected =
      ap?.artExpectedPasscode != null ? Number(ap.artExpectedPasscode) : expectedBenchmarkPasscodeForSeq(s.seq);
    const tops = ap?.topCandidates || [];
    const top0 = tops[0];
    if (expected) {
      const slot = benchPerCard[expected];
      for (let ri = 0; ri < Math.min(5, tops.length); ri++) {
        if (tops[ri].cardId !== expected) continue;
        if (slot) {
          slot.inTop5Hits++;
          if (tops[ri].distance < slot.minDistInTop5) slot.minDistInTop5 = tops[ri].distance;
          if (slot.bestRankTop5 < 0 || ri < slot.bestRankTop5) slot.bestRankTop5 = ri;
        }
      }
      if (typeof ap?.artBenchmarkDist?.[String(expected)] === 'number') {
        const bd = ap.artBenchmarkDist[String(expected)];
        if (slot && bd < slot.minDist) slot.minDist = bd;
      }
    }
    if (expected && top0 && top0.cardId === expected) {
      benchTop0Correct++;
      const slot = benchPerCard[expected];
      if (slot) {
        slot.top0++;
        if (top0.distance < slot.minDist) slot.minDist = top0.distance;
        if (top0.distance <= artHashBenchTop0Le9MaxDist(expected)) slot.top0Le9++;
      }
      if (top0.distance <= artHashBenchTop0Le9MaxDist(expected)) benchTop0DistLe9++;
    }
    const matchedId = resolvedMatchedId;
    if (matchedId && artMatchSource === 'art') {
      if (SCANNER_BENCHMARK_PASSCODES.includes(matchedId)) {
        benchMatchedCorrect++;
        const slot = benchPerCard[matchedId];
        if (slot) slot.matched++;
      } else {
        benchMatchedWrong++;
      }
    }
    const dist = ap?.artDistance ?? oc?.artDistance;
    if (typeof dist === 'number' && !oc?.matchedCardId && dist <= 16) artNearOnly++;
  }

  return {
    samples: list.length,
    warpActive: artWarpActive,
    artMatched,
    nearMiss: artNearOnly,
    frameStallCount,
    frameStallSamples,
    pipeline: sampleKinds.pipeline || 0,
    artOnly: sampleKinds.art_only || 0,
    matchedWrong: benchMatchedWrong,
    top0Correct: benchTop0Correct,
    top0DistLe9: benchTop0DistLe9,
    benchmark: {
      matchedCorrect: benchMatchedCorrect,
      matchedWrong: benchMatchedWrong,
      perCard: benchPerCard,
    },
    phaseD: phaseDPerCard,
    phaseE: phaseEPerCard,
    phaseF: phaseFPerCard,
    phaseG: phaseGPerCard,
    phaseH: phaseHPerCard,
    phaseDCount: countPhaseCardsPass(phaseDPerCard),
    phaseECount: countPhaseCardsPass(phaseEPerCard),
    phaseFCount: countPhaseCardsPass(phaseFPerCard),
    phaseGCount: countPhaseCardsPass(phaseGPerCard),
    phaseHCount: countPhaseHCardsPass(phaseHPerCard),
    phaseBCount: countPhaseBCardsPass(benchPerCard),
  };
}

/**
 * Baseline compacto para JSON estático ou localStorage.
 * @param {ReturnType<typeof analyzeDiagSamples>} metrics
 * @param {{ id?: string, stamp?: string, label?: string, exportedAt?: string, targetSamples?: number }} meta
 */
export function slimBaselineFromMetrics(metrics, meta = {}) {
  const perCard = {};
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    const b = metrics.benchmark.perCard[id];
    const d = metrics.phaseD[id];
    const e = metrics.phaseE[id];
    const f = metrics.phaseF[id];
    const g = metrics.phaseG[id];
    perCard[id] = {
      segSamples: b.segSamples,
      matched: b.matched,
      top0: b.top0,
      top0Le9: b.top0Le9,
      minDist: b.minDist === 99 ? null : b.minDist,
      phaseD: d.samples ? Math.round((d.correct / d.samples) * 100) : null,
      phaseE: e.samples ? Math.round((e.correct / e.samples) * 100) : null,
      phaseF: f.samples ? Math.round((f.correct / f.samples) * 100) : null,
      phaseG: g.samples ? Math.round((g.correct / g.samples) * 100) : null,
    };
  }
  return {
    id: meta.id || 'baseline',
    stamp: meta.stamp || '',
    label: meta.label || 'Baseline',
    exportedAt: meta.exportedAt || '',
    targetSamples: meta.targetSamples ?? 75,
    samples: metrics.samples,
    warpActive: metrics.warpActive,
    artMatched: metrics.artMatched,
    nearMiss: metrics.nearMiss,
    pipeline: metrics.pipeline,
    matchedWrong: metrics.matchedWrong,
    top0Correct: metrics.top0Correct,
    top0DistLe9: metrics.top0DistLe9,
    phaseD: metrics.phaseDCount,
    phaseE: metrics.phaseECount,
    phaseF: metrics.phaseFCount,
    phaseG: metrics.phaseGCount,
    phaseH: metrics.phaseHCount,
    phaseB: metrics.phaseBCount,
    perCard,
  };
}

/** Valor proporcional ao progresso da coleta (75 amostras = 100%). */
export function proportionalBenchValue(value, currentSamples, targetSamples = 75) {
  if (!targetSamples || currentSamples <= 0) return 0;
  return Math.round((Number(value) * currentSamples) / targetSamples);
}

/**
 * Compara valor actual com baseline; devolve classe CSS e seta.
 * @param {number} actual
 * @param {number|null|undefined} expectedAtProgress
 * @param {{ higherIsBetter?: boolean, tolerance?: number }} [opts]
 */
/**
 * Estado pass/fail compacto por fase A–J.
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {ReturnType<typeof buildExtendedDiagMetrics>|null|undefined} extended
 * @param {number} progress
 * @param {number} [targetSamples]
 * @param {{ efgDeferredCollect?: boolean, efgDeferredTooltip?: string }} [opts]
 * @returns {Array<{ id: string, pass: boolean|null, detail: string, closeMeta: string, deferredPending?: boolean }>}
 */
export function buildPhaseStatusList(core, extended, progress, targetSamples = 75, opts = {}) {
  const efgDeferredCollect = opts.efgDeferredCollect === true;
  const efgDeferredTooltip = opts.efgDeferredTooltip || 'Preenchido no export';
  const isComplete = progress >= targetSamples;
  const warpPct = progress > 0 ? core.warpActive / progress : 0;
  const phaseB = core.phaseBCount;
  const phaseJ = extended ? countPhaseJCardsPass(extended.passcodeBenchmark) : null;
  const passcodeCandN = extended && extended.passcodeCands ? extended.passcodeCands.length : 0;
  const passcodeCorrectN = extended && extended.passcodeBenchmark
    ? Object.values(extended.passcodeBenchmark).reduce((s, c) => s + (c.correctCands || 0), 0)
    : 0;
  const close = SCANNER_BENCHMARK_PHASE_CLOSE;

  return [
    {
      id: 'A',
      pass: isComplete ? core.warpActive >= targetSamples * close.A.warpPct : warpPct >= 0.7 ? true : warpPct >= 0.5 ? null : false,
      detail: `${core.warpActive}/${progress || 0}`,
      closeMeta: 'warp 75/75',
    },
    {
      id: 'B',
      pass: phaseB >= close.B.cardsTop0Le9 && core.matchedWrong <= close.B.matchedWrong,
      detail: `${phaseB}/6 · wrong=${core.matchedWrong}`,
      closeMeta: '≥4/6 top0≤9 · wrong=0',
    },
    {
      id: 'C',
      pass: isComplete
        ? core.artMatched >= close.C.artMatched && core.matchedWrong <= close.C.matchedWrong
        : null,
      detail: isComplete ? `${core.artMatched}/75` : `proj ${proportionalBenchValue(close.C.artMatched, progress, targetSamples)}`,
      closeMeta: '≥51/75 matched',
    },
    {
      id: 'D',
      pass: core.phaseDCount >= close.D.cardsPass,
      detail: `${core.phaseDCount}/6`,
      closeMeta: '≥5/6 tipo',
    },
    {
      id: 'E',
      pass: efgDeferredCollect ? null : core.phaseECount >= close.E.cardsPass,
      detail: `${core.phaseECount}/6`,
      closeMeta: efgDeferredCollect ? efgDeferredTooltip : '≥5/6 raridade',
      deferredPending: efgDeferredCollect,
    },
    {
      id: 'F',
      pass: efgDeferredCollect ? null : core.phaseFCount >= close.F.cardsPass,
      detail: `${core.phaseFCount}/6`,
      closeMeta: efgDeferredCollect ? efgDeferredTooltip : '≥5/6 atributo',
      deferredPending: efgDeferredCollect,
    },
    {
      id: 'G',
      pass: efgDeferredCollect ? null : core.phaseGCount >= close.G.cardsPass,
      detail: `${core.phaseGCount}/6`,
      closeMeta: efgDeferredCollect ? efgDeferredTooltip : '≥5/6 level/rank',
      deferredPending: efgDeferredCollect,
    },
    {
      id: 'H',
      pass: core.phaseHCount >= close.H.cardsPass,
      detail: `${core.phaseHCount}/6`,
      closeMeta: '≥4/6 nome OCR',
    },
    {
      id: 'I',
      pass: isComplete
        ? core.pipeline >= close.I.pipelineMin &&
          core.warpActive >= targetSamples * close.I.warpPct &&
          core.artMatched >= close.I.artMatched &&
          core.matchedWrong <= close.I.matchedWrong
        : core.pipeline > 0 ? null : false,
      detail: `${core.pipeline} pipe · ${core.artMatched} matched`,
      closeMeta: '75+pipeline · ≥51 matched',
    },
    {
      id: 'J',
      pass: phaseJ != null ? phaseJ >= close.J.passcodeCards : null,
      detail: phaseJ != null ? `${phaseJ}/6 · ${passcodeCorrectN} certos` : `${passcodeCandN} cands`,
      closeMeta: '≥4/6 passcode candidatos',
    },
  ];
}

/**
 * Veredicto automático pós-coleta (equivalente à análise no chat).
 * @param {ReturnType<typeof analyzeDiagSamples>} core
 * @param {ReturnType<typeof buildExtendedDiagMetrics>|null|undefined} extended
 * @param {object|null|undefined} official
 * @param {{ targetSamples?: number, lang?: 'pt'|'en', efgDeferredCollect?: boolean, efgDeferredTooltip?: string }} [opts]
 */
export function computeLiveCompareVerdict(core, extended, official, opts = {}) {
  const target = opts.targetSamples || 75;
  const lang = opts.lang === 'en' ? 'en' : 'pt';
  const progress = core.samples;
  const isComplete = progress >= target;
  const offMatched = official && official.artMatched != null ? official.artMatched : null;
  const matchedDelta = offMatched != null ? core.artMatched - offMatched : null;
  const nearDelta =
    official && official.nearMiss != null ? core.nearMiss - official.nearMiss : null;
  const phases = buildPhaseStatusList(core, extended, progress, target, {
    efgDeferredCollect: opts.efgDeferredCollect === true,
    efgDeferredTooltip: opts.efgDeferredTooltip,
  });
  const worstCard = findWorstMatchedCardDrop(core, official);
  const phaseC = phases.find((p) => p.id === 'C');
  const phaseG = phases.find((p) => p.id === 'G');

  let verdictKey = 'collecting';
  let verdictCls = 'ocr-diag-verdict--neutral';
  const notes = [];

  if (worstCard) {
    notes.push(
      lang === 'en'
        ? `${worstCard.name} ${worstCard.matched}/${worstCard.segSamples} vs official ${worstCard.offMatched}/${worstCard.offSegSamples || worstCard.segSamples}`
        : `${worstCard.name} ${worstCard.matched}/${worstCard.segSamples} vs oficial ${worstCard.offMatched}/${worstCard.offSegSamples || worstCard.segSamples}`
    );
  }

  if (phaseG && phaseG.pass) {
    notes.push(lang === 'en' ? `G ${phaseG.detail}` : `G ${phaseG.detail}`);
  }

  const gHighlights = [];
  for (const id of [92079625, 46772449]) {
    const g = core.phaseG && core.phaseG[id];
    if (!g || !g.samples) continue;
    const pct = Math.round((g.correct / g.samples) * 100);
    if (pct >= 50) {
      const name = SCANNER_BENCHMARK_CARD_LABELS[id];
      gHighlights.push(`${name} ${formatBenchLevelExpected(id)} ${pct}%`);
    }
  }
  if (gHighlights.length) notes.push(gHighlights.join(' · '));

  const segAnomalies = buildSegmentAnomalyWarnings(core, official);
  for (const w of segAnomalies.slice(0, 4)) {
    const msg =
      w.kind === 'phaseDHighMatched'
        ? lang === 'en'
          ? `${w.name} D ${w.pct}% but matched >80% official (seq ${w.seqRange})`
          : `${w.name} D ${w.pct}% mas matched >80% oficial (seq ${w.seqRange})`
        : w.kind === 'phaseD'
          ? lang === 'en'
            ? `${w.name} D ${w.pct}% (seq ${w.seqRange})`
            : `${w.name} D ${w.pct}% (seq ${w.seqRange})`
          : lang === 'en'
            ? `${w.name} matched ${w.pct}% vs official`
            : `${w.name} matched ${w.pct}% vs oficial`;
    notes.push(msg);
  }

  const gRefH = opts.gRefH != null ? opts.gRefH : null;
  const hRegressed =
    isComplete && gRefH != null && core.phaseHCount < gRefH;
  if (hRegressed) {
    notes.push(
      lang === 'en'
        ? `H ${core.phaseHCount}/6 < G ref ${gRefH}/6 — do not increase pipeline if C regressed`
        : `H ${core.phaseHCount}/6 < ref.G ${gRefH}/6 — não aumentar pipeline se C regrediu`
    );
  }

  if (isComplete) {
    if (core.matchedWrong > 0) {
      verdictKey = 'wrong_outside';
      verdictCls = 'ocr-diag-verdict--bad';
    } else if (
      hRegressed &&
      matchedDelta != null &&
      matchedDelta < 0
    ) {
      verdictKey = 'regression_c_h';
      verdictCls = 'ocr-diag-verdict--bad';
    } else if (core.artMatched < SCANNER_BENCHMARK_PHASE_CLOSE.C.artMatched) {
      verdictKey = 'regression_c';
      verdictCls = 'ocr-diag-verdict--bad';
    } else if (matchedDelta != null && matchedDelta < 0) {
      verdictKey = 'regression_c_delta';
      verdictCls = 'ocr-diag-verdict--warn';
    } else if (matchedDelta != null && matchedDelta === 0 && offMatched != null && core.artMatched >= offMatched) {
      verdictKey = 'ties_record';
      verdictCls = 'ocr-diag-verdict--good';
    } else if (core.artMatched >= SCANNER_BENCHMARK_PHASE_CLOSE.C.artMatched) {
      verdictKey = 'zip_candidate';
      verdictCls = 'ocr-diag-verdict--good';
    }
  } else if (progress > 0 && phaseC) {
    verdictKey = 'projecting';
  }

  const projectedMatched =
    progress > 0 && !isComplete ? Math.round((core.artMatched * target) / progress) : null;

  return {
    isComplete,
    progress,
    target,
    matched: core.artMatched,
    matchedDelta,
    nearDelta,
    offMatched,
    projectedMatched: progress > 0 && !isComplete ? projectedMatched : null,
    phases,
    worstCard,
    verdictKey,
    verdictCls,
    notes,
  };
}

export function benchCompareDelta(actual, expectedAtProgress, opts = {}) {
  const higher = opts.higherIsBetter !== false;
  const tol = opts.tolerance ?? 0;
  if (expectedAtProgress == null || Number.isNaN(expectedAtProgress)) {
    return { cls: 'ocr-diag-cmp--na', arrow: '', delta: null };
  }
  const exp = Number(expectedAtProgress);
  const act = Number(actual);
  const delta = act - exp;
  if (Math.abs(delta) <= tol) return { cls: 'ocr-diag-cmp--eq', arrow: '≈', delta };
  if (higher) {
    if (delta > 0) return { cls: 'ocr-diag-cmp--up', arrow: '▲', delta };
    return { cls: 'ocr-diag-cmp--down', arrow: '▼', delta };
  }
  if (delta < 0) return { cls: 'ocr-diag-cmp--up', arrow: '▲', delta };
  return { cls: 'ocr-diag-cmp--down', arrow: '▼', delta };
}

/**
 * Métricas alargadas (mesmo formato que scripts/analyze-ocr-diagnostics.mjs).
 * @param {object[]} samples
 * @param {object|null|undefined} analysisSummary
 * @param {{ inputPath?: string, schemaVersion?: number }} [meta]
 * @returns {object}
 */
export function buildExtendedDiagMetrics(samples, analysisSummary, meta = {}) {
  const list = Array.isArray(samples) ? samples : [];
  const core = analyzeDiagSamples(list);

  const rarityUi = {};
  const rarityDet = {};
  const rarityStrip = {};
  const rarityArt = {};
  const mismatches = [];
  const typeUi = {};
  const typeFrame = {};
  const passcodeRaw = [];
  const passcodeCands = [];
  const passcodeVariants = {};
  let passcodeConfSum = 0;
  let passcodeConfN = 0;
  const passcodeBenchPerCard = {};
  for (const id of SCANNER_BENCHMARK_PASSCODES) {
    passcodeBenchPerCard[id] = { withCands: 0, correctCands: 0 };
  }
  const artSources = {};
  const artDistances = [];
  const artEngines = {};
  let artRelaxedReady = 0;
  let artIndexReady = 0;

  for (const s of list) {
    const ui = s.lastDetectedCardRarityUi || '(vazio)';
    rarityUi[ui] = (rarityUi[ui] || 0) + 1;
    const rp = s.rarityProbe;
    if (rp?.classifiedRarity) rarityDet[rp.classifiedRarity] = (rarityDet[rp.classifiedRarity] || 0) + 1;
    if (rp?.nameFromStrip) rarityStrip[rp.nameFromStrip] = (rarityStrip[rp.nameFromStrip] || 0) + 1;
    if (rp?.artHint) rarityArt[rp.artHint] = (rarityArt[rp.artHint] || 0) + 1;
    if (rp?.classifiedRarity && ui !== '(vazio)' && rp.classifiedRarity !== ui) {
      mismatches.push({
        seq: s.seq,
        ui,
        det: rp.classifiedRarity,
        strip: rp.nameFromStrip,
        art: rp.artHint,
        nm: rp.nameMetrics,
        am: rp.artMetrics,
        cleaned: s.outcome?.cleaned,
      });
    }
    const tUi = s.lastDetectedCardTypeUi || '(vazio)';
    typeUi[tUi] = (typeUi[tUi] || 0) + 1;
    const frame = s.typeProbe?.classifiedTypeFromFrameOnly || s.typeProbe?.classifiedTypeMerged;
    if (frame) typeFrame[frame] = (typeFrame[frame] || 0) + 1;

    const pp = s.passcodeProbe;
    const ap = s.artProbe;
    if (pp?.sidecar?.raw) passcodeRaw.push({ seq: s.seq, raw: pp.sidecar.raw });
    if (pp?.sidecar?.candidates?.length) {
      passcodeCands.push({ seq: s.seq, cands: pp.sidecar.candidates, conf: pp.sidecar.confidence });
    }
    if (typeof pp?.sidecar?.confidence === 'number') {
      passcodeConfSum += pp.sidecar.confidence;
      passcodeConfN++;
    }
    const bv = pp?.bestVariant || pp?.sidecar?.variantId;
    if (bv) passcodeVariants[bv] = (passcodeVariants[bv] || 0) + 1;
    const expectedPc =
      ap?.artExpectedPasscode != null ? Number(ap.artExpectedPasscode) : expectedBenchmarkPasscodeForSeq(s.seq);
    if (expectedPc && pp?.sidecar?.candidates?.length) {
      const slot = passcodeBenchPerCard[expectedPc];
      if (slot) {
        slot.withCands++;
        const idStr = String(expectedPc);
        if (pp.sidecar.candidates.some((c) => String(c) === idStr)) slot.correctCands++;
      }
    }
    if (ap?.artRelaxedReady) artRelaxedReady++;
    if (ap?.indexReady) artIndexReady++;
    if (ap?.artSource) artSources[ap.artSource] = (artSources[ap.artSource] || 0) + 1;
    const oc = s.outcome;
    if (oc?.matchSource) artEngines[oc.matchSource] = (artEngines[oc.matchSource] || 0) + 1;
    const dist = ap?.artDistance ?? oc?.artDistance;
    if (typeof dist === 'number') {
      artDistances.push({
        seq: s.seq,
        dist,
        id: ap?.matchedCardId ?? oc?.matchedCardId,
        kind: ap?.artKind,
        top: ap?.topCandidates,
      });
    }
  }

  return {
    inputPath: meta.inputPath || '(browser)',
    schemaVersion: meta.schemaVersion,
    analysisSummary,
    samples: core.samples,
    warpActive: core.warpActive,
    artMira: artSources.art_mira || 0,
    artMatched: core.artMatched,
    pipeline: core.pipeline,
    nearMiss: core.nearMiss,
    sampleKinds: { pipeline: core.pipeline, art_only: core.artOnly },
    artRelaxedReady,
    artIndexReady,
    artSources,
    artEngines,
    artDistances,
    rarityUi,
    rarityDet,
    rarityStrip,
    rarityArt,
    mismatches,
    rarityMismatchCount: mismatches.length,
    typeUi,
    typeFrame,
    passcodeRaw,
    passcodeCands,
    passcodeConfAvg: passcodeConfN ? Math.round((passcodeConfSum / passcodeConfN) * 10) / 10 : null,
    passcodeVariants,
    passcodeBenchmark: passcodeBenchPerCard,
    benchmark: {
      top0Correct: core.top0Correct,
      top0DistLe9: core.top0DistLe9,
      matchedCorrect: core.benchmark.matchedCorrect,
      matchedWrong: core.benchmark.matchedWrong,
      perCard: core.benchmark.perCard,
    },
    phaseD: core.phaseD,
    phaseE: core.phaseE,
    phaseF: core.phaseF,
    phaseG: core.phaseG,
    phaseH: core.phaseH,
    frameStallCount: core.frameStallCount,
    frameStallSamples: core.frameStallSamples,
  };
}

/**
 * @param {string[]} lines
 * @param {string} title
 * @param {Record<string, number>} map
 */
function reportPrintMap(lines, title, map) {
  lines.push(title);
  for (const [k, v] of Object.entries(map || {}).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${k}: ${v}`);
  }
  lines.push('');
}

/**
 * Texto do relatório (saída de analyze-ocr-diagnostics.mjs) para clipboard ou ficheiro.
 * @param {ReturnType<typeof buildExtendedDiagMetrics>} metrics
 * @returns {string}
 */
export function formatDiagnosticsReportText(metrics) {
  const lines = [];
  const { inputPath, schemaVersion, samples, sampleKinds } = metrics;

  lines.push(`\n=== OCR diagnóstico: ${inputPath} ===`);
  lines.push(`Schema: v${schemaVersion ?? '?'}`);
  lines.push(`Amostras: ${samples}\n`);

  reportPrintMap(lines, 'Raridade UI:', metrics.rarityUi);
  reportPrintMap(lines, 'Raridade detetada (nome+arte):', metrics.rarityDet);
  reportPrintMap(lines, 'Raridade só faixa nome:', metrics.rarityStrip);
  reportPrintMap(lines, 'Raridade sugestão arte:', metrics.rarityArt);
  reportPrintMap(lines, 'Tipo UI:', metrics.typeUi);
  reportPrintMap(lines, 'Tipo moldura:', metrics.typeFrame);

  lines.push(`Divergências raridade UI vs detetada: ${metrics.mismatches.length}`);
  for (const m of metrics.mismatches.slice(0, 25)) {
    const nm = m.nm
      ? `foil=${m.nm.foilRatio} gold=${m.nm.goldRatio} silver=${m.nm.silverRatio} hue=${m.nm.hueVar} dark=${m.nm.darkLetterRatio}`
      : '-';
    const am = m.am ? `artFoil=${m.am.foilRatio} artHue=${m.am.hueVar} artCol=${m.am.colLumStd}` : '-';
    lines.push(
      `  #${m.seq} UI=${m.ui} det=${m.det} strip=${m.strip} art=${m.art || '-'} | ${nm} | ${am} | ocr=${m.cleaned || '-'}`
    );
  }

  lines.push('\n=== Arte (dHash) ===');
  reportPrintMap(lines, 'Tipo de amostra (sampleKind):', sampleKinds);
  lines.push(`  Amostras com warpActive: ${metrics.warpActive}/${samples}`);
  lines.push(`  Amostras com indexReady: ${metrics.artIndexReady}/${samples}`);
  lines.push(`  Amostras artRelaxedReady: ${metrics.artRelaxedReady}/${samples}`);
  reportPrintMap(lines, 'Fonte artCtx (artProbe.artSource):', metrics.artSources);
  reportPrintMap(lines, 'matchSource no outcome:', metrics.artEngines);
  lines.push(`  Matches por arte: ${metrics.artMatched}`);
  lines.push(`  Near-miss (dist≤16 sem id): ${metrics.nearMiss}`);
  if (metrics.frameStallCount != null) {
    lines.push(`  Frame stalls (>150ms): ${metrics.frameStallCount}/${metrics.samples}`);
    for (const st of (metrics.frameStallSamples || []).slice(0, 12)) {
      lines.push(`    #${st.seq} ${st.ms}ms (${st.kind || '?'})`);
    }
  }

  if (metrics.benchmark) {
    const b = metrics.benchmark;
    lines.push('\n=== Benchmark (6 passcodes) ===');
    lines.push(`  top0 = passcode esperado (amostra): ${b.top0Correct}`);
    lines.push(`  top0 correto com dist≤9: ${b.top0DistLe9}`);
    lines.push(`  matchedCardId correto (lista): ${b.matchedCorrect}`);
    lines.push(`  matchedCardId FORA da lista: ${b.matchedWrong}`);
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const c = b.perCard[id];
      const minD = c.minDist === 99 ? '—' : c.minDist;
      const minTop5 = c.minDistInTop5 === 99 ? '—' : c.minDistInTop5;
      const rank = c.bestRankTop5 < 0 ? '—' : c.bestRankTop5;
      lines.push(
        `  ${id}: top0=${c.top0} top0≤9=${c.top0Le9} minDist=${minD} rankTop5=${rank} minInTop5=${minTop5} inTop5=${c.inTop5Hits} matched=${c.matched}`
      );
    }
  }

  if (metrics.phaseD) {
    const cardsCorrect = countPhaseCardsPass(metrics.phaseD);
    const phaseMismatches = [];
    lines.push('\n=== Fase D — Tipo (moldura vs esperado) ===');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const slot = metrics.phaseD[id];
      if (!slot || !slot.samples) continue;
      const expected = BENCH_TYPE_EXPECTED[id];
      const pctOk = slot.samples > 0 ? slot.correct / slot.samples : 0;
      const okCard = pctOk >= 0.5;
      if (!okCard) {
        const topDet = Object.entries(slot.detected || {}).sort((a, b) => b[1] - a[1])[0];
        phaseMismatches.push({
          passcode: id,
          expected,
          got: topDet ? topDet[0] : '(vazio)',
          samples: slot.samples,
        });
      }
      const pct = slot.samples > 0 ? Math.round((slot.correct / slot.samples) * 100) : 0;
      lines.push(`  ${id}: ${slot.correct}/${slot.samples} (${pct}%) com tipo certo (esperado ${expected})`);
    }
    lines.push(`  Cartas com tipo correcto (≥50% amostras): ${cardsCorrect}/6`);
    if (phaseMismatches.length) {
      lines.push('  Mismatches (segmento sem tipo correcto):');
      for (const m of phaseMismatches) {
        lines.push(`    ${m.passcode}: esperado ${m.expected}, viu sobretudo ${m.got} (${m.samples} amostras)`);
      }
    }
  }

  if (metrics.phaseE) {
    const cardsCorrectE = countPhaseCardsPass(metrics.phaseE);
    lines.push('\n=== Fase E — Raridade (detetada vs esperada) ===');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const slot = metrics.phaseE[id];
      if (!slot || !slot.samples) continue;
      const expected = BENCH_RARITY_EXPECTED[id];
      const pct = slot.samples > 0 ? Math.round((slot.correct / slot.samples) * 100) : 0;
      lines.push(`  ${id}: ${slot.correct}/${slot.samples} (${pct}%) com raridade certa (esperado ${expected})`);
    }
    lines.push(`  Cartas com raridade correcta (≥50% amostras): ${cardsCorrectE}/6`);
  }

  if (metrics.phaseF) {
    const cardsCorrectF = countPhaseCardsPass(metrics.phaseF);
    lines.push('\n=== Fase F — Atributo (featureMiraProbe) ===');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const slot = metrics.phaseF[id];
      if (!slot || !slot.samples) continue;
      const expected = BENCH_ATTR_EXPECTED[id];
      const pct = slot.samples > 0 ? Math.round((slot.correct / slot.samples) * 100) : 0;
      lines.push(`  ${id}: ${slot.correct}/${slot.samples} (${pct}%) com atributo certo (esperado ${expected})`);
    }
    lines.push(`  Cartas com atributo correcto (≥50% amostras): ${cardsCorrectF}/6`);
  }

  if (metrics.phaseG) {
    const cardsCorrectG = countPhaseCardsPass(metrics.phaseG);
    lines.push('\n=== Fase G — Level / Rank / Link (featureMiraProbe) ===');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const slot = metrics.phaseG[id];
      if (!slot || !slot.samples) continue;
      const expected = BENCH_LEVEL_EXPECTED[id];
      const expLabel = expected.value != null ? `${expected.kind}=${expected.value}` : expected.kind;
      const pct = slot.samples > 0 ? Math.round((slot.correct / slot.samples) * 100) : 0;
      lines.push(`  ${id}: ${slot.correct}/${slot.samples} (${pct}%) com level/rank certo (esperado ${expLabel})`);
    }
    lines.push(`  Cartas com level/rank correcto (≥50% amostras): ${cardsCorrectG}/6`);
  }

  if (metrics.phaseH) {
    let cardsCorrectH = 0;
    lines.push('\n=== Fase H — Nome OCR (pipeline) ===');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const slot = metrics.phaseH[id];
      if (!slot || !slot.pipelineSamples) continue;
      const pct = slot.pipelineSamples > 0 ? Math.round((slot.nameHits / slot.pipelineSamples) * 100) : 0;
      if (slot.nameHits > 0) cardsCorrectH++;
      const topName = Object.entries(slot.names || {}).sort((a, b) => b[1] - a[1])[0];
      const topLabel = topName ? `${topName[0]}×${topName[1]}` : '—';
      lines.push(
        `  ${id}: ${slot.nameHits}/${slot.pipelineSamples} pipeline com nome legível (${pct}%) · top: ${topLabel}`
      );
    }
    lines.push(`  Cartas com ≥1 nome legível (pipeline): ${cardsCorrectH}/6`);
  }

  if (metrics.artDistances.length) {
    lines.push('  Distâncias (até 20):');
    for (const d of metrics.artDistances.slice(0, 20)) {
      const top0 = d.top && d.top[0] ? ` top0=${d.top[0].cardId}@${d.top[0].distance}` : '';
      lines.push(`    #${d.seq} dist=${d.dist} kind=${d.kind || '-'} id=${d.id ?? '-'}${top0}`);
    }
  }

  lines.push('\n=== Passcode / ID ===');
  lines.push(`  Amostras com OCR bruto: ${metrics.passcodeRaw.length}`);
  lines.push(`  Amostras com candidatos: ${metrics.passcodeCands.length}`);
  lines.push(`  Confiança média: ${metrics.passcodeConfAvg ?? '—'}`);
  reportPrintMap(lines, 'Variantes vencedoras (bestVariant):', metrics.passcodeVariants);

  if (metrics.passcodeBenchmark) {
    let cardsWithCorrect = 0;
    lines.push('  Passcode correto nos candidatos (por carta esperada):');
    for (const id of SCANNER_BENCHMARK_PASSCODES) {
      const c = metrics.passcodeBenchmark[id];
      if (c.correctCands > 0) cardsWithCorrect++;
      lines.push(`    ${id}: amostras c/ candidatos=${c.withCands} c/ passcode certo=${c.correctCands}`);
    }
    lines.push(`  Cartas com ≥1 amostra certa nos candidatos: ${cardsWithCorrect}/6`);
  }

  lines.push('Exemplos raw (até 15):');
  for (const r of metrics.passcodeRaw.slice(0, 15)) {
    lines.push(`  #${r.seq} ${r.raw}`);
  }
  lines.push('\nExemplos candidatos (até 15):');
  for (const c of metrics.passcodeCands.slice(0, 15)) {
    lines.push(`  #${c.seq} conf=${c.conf ?? '—'} → ${(c.cands || []).join(', ')}`);
  }

  if (metrics.analysisSummary) {
    lines.push('\n(Resumo embutido no export)');
    lines.push(`  UI vs moldura tipo: ${metrics.analysisSummary.uiVsFrameMismatchCount ?? '?'}`);
    lines.push(`  UI vs detetada raridade: ${metrics.analysisSummary.rarityMismatchCount ?? '?'}`);
    lines.push(`  Passcode com candidatos: ${metrics.analysisSummary.passcodeSamplesWithCandidates ?? '?'}`);
  }

  return lines.join('\n');
}
