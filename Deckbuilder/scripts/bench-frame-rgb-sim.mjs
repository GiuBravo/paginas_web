/**
 * Simula deteção Fase D/E nas amostras RGB do ZIP baseline (sem browser).
 * Uso: node scripts/bench-frame-rgb-sim.mjs logs/ocr_diagnostics_<STAMP>.zip
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { analyzeDiagnostics } from './analyze-ocr-diagnostics.mjs';

const path = process.argv[2] || 'logs/ocr_diagnostics_1780865342363.zip';

function loadSamples(p) {
  const buf = readFileSync(p);
  const files = unzipSync(new Uint8Array(buf));
  const jsonName = Object.keys(files).find((n) => n === 'diagnostics.json' || n.endsWith('/diagnostics.json'));
  return JSON.parse(Buffer.from(files[jsonName]).toString('utf8')).session?.samples || [];
}

/** Copia mínima das heurísticas novas (manter alinhado com src/main.js). */
function isEffectOrangeBrownFrameRgbCore(r, g, b) {
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (lum < 88 || lum > 168) return false;
  return r > g + 10 && r > b + 22 && g > b + 4 && r > 118 && spread < 82 && spread > 18;
}

function isBrownNeutralFrameRgbCore(r, g, b) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  if (lum > 132 && spread < 44 && r > 112 && g > 112 && b > 112) return false;
  return spread < 48 && r > 98 && g > 82 && b > 68 && r > b && lum > 92 && lum < 145;
}

function isFusionPurpleFrameRgbCoreRaw(r, g, b) {
  const lum0 = (r + g + b) / 3;
  const spread0 = Math.max(r, g, b) - Math.min(r, g, b);
  if (
    lum0 > 102 &&
    spread0 < 66 &&
    r > 92 &&
    g > 92 &&
    b > 92 &&
    Math.abs(r - g) < 50 &&
    Math.abs(g - b) < 44 &&
    b - r < 64
  ) {
    return false;
  }
  if (b > 148 && r > 90 && g > 95 && b > r + 12 && g >= r - 12 && Math.abs(r - g) < 42 && b - g < 82) {
    return true;
  }
  if (r > 150 && g < 105 && b > 115) return true;
  if (r > 100 && b > 85 && g < 138 && r > g + 5 && b > g + 5 && Math.abs(r - b) < 48) return true;
  return (
    r > 108 &&
    b > 88 &&
    g < 118 &&
    r > g + 8 &&
    b > g + 8 &&
    r - b >= 12 &&
    r - b <= 42
  );
}

function frameRgbMatchesSynchroSilverInline(r, g, b) {
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (isBrownNeutralFrameRgbCore(r, g, b)) return false;
  if (r > g + 10 && r > b + 22 && g > b + 4 && r > 118 && lum > 88 && lum < 168 && spread < 72 && spread > 18) {
    return false;
  }
  return (
    lum > 108 &&
    spread < 62 &&
    r > 98 &&
    g > 98 &&
    b > 98 &&
    Math.abs(r - g) < 44 &&
    Math.abs(g - b) < 40 &&
    b - r < 58
  );
}

function isLinkFrameRgbCore(r, g, b) {
  if (isFusionPurpleFrameRgbCoreRaw(r, g, b)) return false;
  const lum = (r + g + b) / 3;
  if (lum > 165) return b > r + 18 && b > g + 10 && b > 95 && r < 105;
  if (b <= r + 12 || b <= g + 8) return false;
  return b > 95 && lum < 128 && b > r + 28 && b > g + 12;
}

function sideRgbLooksSynchro(r, g, b) {
  return frameRgbMatchesSynchroSilverInline(r, g, b);
}

function sideRgbLooksSpellGreen(r, g, b) {
  const lum = (r + g + b) / 3;
  if (!(g > r + 10 && g > b + 8 && g > 62 && lum > 55 && lum < 200)) return false;
  if (isFusionPurpleFrameRgbCoreRaw(r, g, b)) return false;
  return true;
}

function sideRgbLooksSpellWashedLowLight(r, g, b) {
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (lum < 148 || spread > 32) return false;
  if (isEffectOrangeBrownFrameRgbCore(r, g, b)) return false;
  if (isFusionPurpleFrameRgbCoreRaw(r, g, b)) return false;
  if (isLinkFrameRgbCore(r, g, b)) return false;
  if (frameRgbMatchesSynchroSilverInline(r, g, b)) return false;
  return g >= r - 6 && g >= b - 10 && g > 100;
}

function isXyzWashedFrameRgb(r, g, b) {
  const lum = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (lum < 72 || lum > 132) return false;
  if (isEffectOrangeBrownFrameRgbCore(r, g, b)) return false;
  if (isFusionPurpleFrameRgbCoreRaw(r, g, b)) return false;
  if (isLinkFrameRgbCore(r, g, b)) return false;
  if (sideRgbLooksSynchro(r, g, b)) return false;
  return spread < 45 && r < 172 && g < 138 && b < 125;
}

function hasSpellWashedLowLightSides(reg) {
  if (!reg?.left || !reg?.right) return false;
  const lSpell =
    sideRgbLooksSpellWashedLowLight(reg.left.avgR, reg.left.avgG, reg.left.avgB) ||
    sideRgbLooksSpellGreen(reg.left.avgR, reg.left.avgG, reg.left.avgB);
  const rSpell =
    sideRgbLooksSpellWashedLowLight(reg.right.avgR, reg.right.avgG, reg.right.avgB) ||
    sideRgbLooksSpellGreen(reg.right.avgR, reg.right.avgG, reg.right.avgB);
  if (lSpell && rSpell) return true;
  const lBrown =
    isEffectOrangeBrownFrameRgbCore(reg.left.avgR, reg.left.avgG, reg.left.avgB) ||
    isBrownNeutralFrameRgbCore(reg.left.avgR, reg.left.avgG, reg.left.avgB);
  const rBrown =
    isEffectOrangeBrownFrameRgbCore(reg.right.avgR, reg.right.avgG, reg.right.avgB) ||
    isBrownNeutralFrameRgbCore(reg.right.avgR, reg.right.avgG, reg.right.avgB);
  return (lSpell && rBrown) || (rSpell && lBrown);
}

function isSpellTealFrameTopRgb(r, g, b) {
  const lum = (r + g + b) / 3;
  if (lum < 70 || lum > 200) return false;
  if (isLinkFrameRgbCore(r, g, b)) return false;
  if (isFusionPurpleFrameRgbCoreRaw(r, g, b)) return false;
  return g > r + 35 && b > r + 45 && g > 95 && b > 100 && r < 130;
}

function classifyFrameFromRegions(reg) {
  if (!reg?.left || !reg?.right) return null;
  if (
    reg.top &&
    isLinkFrameRgbCore(reg.top.avgR, reg.top.avgG, reg.top.avgB) &&
    !sideRgbLooksSpellGreen(reg.top.avgR, reg.top.avgG, reg.top.avgB)
  ) {
    return 'Monstro Link';
  }
  if (reg.top && isSpellTealFrameTopRgb(reg.top.avgR, reg.top.avgG, reg.top.avgB)) {
    return 'Magia';
  }
  if (
    reg.top &&
    isFusionPurpleFrameRgbCoreRaw(reg.top.avgR, reg.top.avgG, reg.top.avgB) &&
    !isLinkFrameRgbCore(reg.top.avgR, reg.top.avgG, reg.top.avgB)
  ) {
    return 'Monstro Fusão';
  }
  if (
    reg.top &&
    sideRgbLooksSynchro(reg.top.avgR, reg.top.avgG, reg.top.avgB) &&
    !isLinkFrameRgbCore(reg.top.avgR, reg.top.avgG, reg.top.avgB)
  ) {
    return 'Monstro Sincro';
  }
  if (reg.top && isXyzWashedFrameRgb(reg.top.avgR, reg.top.avgG, reg.top.avgB)) {
    return 'Monstro Xyz';
  }
  if (hasSpellWashedLowLightSides(reg)) return 'Magia';
  return null;
}

const samples = loadSamples(path);
const segs = [
  [0, 12, 34848821, 'Monstro Fusão'],
  [13, 25, 14087893, 'Magia'],
  [26, 37, 92079625, 'Monstro Virar'],
  [38, 50, 66403530, 'Monstro Link'],
  [51, 62, 46772449, 'Monstro Xyz'],
  [63, 74, 60465049, 'Monstro Sincro'],
];

console.log('Sim frame regions (novo) no baseline', path);
for (const [a, b, id, exp] of segs) {
  const ss = samples.filter((s) => s.seq >= a && s.seq <= b);
  let ok = 0;
  for (const s of ss) {
    const reg = s.typeProbe?.frameColor?.regions;
    const det = classifyFrameFromRegions(reg);
    if (det === exp || (exp === 'Magia' && det === 'Magia') || (exp === 'Monstro Virar' && det?.includes('Virar'))) {
      ok++;
    }
  }
  console.log(`  ${id}: ${ok}/${ss.length} (${Math.round((ok / ss.length) * 100)}%) esperado ${exp}`);
}

console.log('\nAnalyze actual (stored probes — pré-fix no ZIP):');
analyzeDiagnostics(path);
