/**
 * Avalia classifyAttributeFromRgb + probeLevelRankStrip contra attrRgb/stripRgb
 * gravados em diagnostics_slim.json (proxy offline).
 */
import { readFileSync } from 'node:fs';
import {
  classifyAttributeFromRgb,
  probeLevelRankStrip,
} from '../src/ocr-card-features.mjs';

const BENCH_ATTR = {
  34848821: 'DARK',
  14087893: 'SPELL',
  92079625: 'DARK',
  66403530: 'DARK',
  46772449: 'DARK',
  60465049: 'LIGHT',
};
const BENCH_LR = {
  34848821: { kind: 'level', value: 8 },
  14087893: { kind: 'spell', value: null },
  92079625: { kind: 'level', value: 9 },
  66403530: { kind: 'link', value: 4 },
  46772449: { kind: 'rank', value: 4 },
  60465049: { kind: 'level', value: 11 },
};
const SEGMENTS = [
  [0, 12, 34848821],
  [13, 25, 14087893],
  [26, 37, 92079625],
  [38, 50, 66403530],
  [51, 62, 46772449],
  [63, 74, 60465049],
];

const path = process.argv[2] || 'logs/ocr_diagnostics_1780883760699_unpacked/diagnostics_slim.json';
const d = JSON.parse(readFileSync(path, 'utf8'));
const samples = d.session.samples;

function lrMatch(got, exp) {
  if (!got || !exp) return false;
  if (got.kind !== exp.kind) return false;
  if (exp.value == null) return got.value == null || got.value === 0;
  return got.value === exp.value;
}

let fCards = 0;
let gCards = 0;
for (const [a, b, pc] of SEGMENTS) {
  const seg = samples.filter((s) => s.seq >= a && s.seq <= b);
  let fOk = 0;
  let gOk = 0;
  for (const s of seg) {
    const lp = s.featureMiraProbe?.liveProbe;
    const hint = s.featureMiraProbe?.cardTypeHint || '';
    const rgb = lp?.attrRgb;
    if (rgb) {
      const attr = classifyAttributeFromRgb(rgb.avgR, rgb.avgG, rgb.avgB, hint);
      if (attr === BENCH_ATTR[pc]) fOk++;
    }
    const lr = lp?.levelRank;
    if (lrMatch(lr, BENCH_LR[pc])) gOk++;
  }
  const fPct = Math.round((100 * fOk) / seg.length);
  const gPct = Math.round((100 * gOk) / seg.length);
  if (fPct >= 50) fCards++;
  if (gPct >= 50) gCards++;
  console.log(
    `${pc}: F ${fOk}/${seg.length} (${fPct}%) G ${gOk}/${seg.length} (${gPct}%) hint=${seg[0]?.featureMiraProbe?.cardTypeHint}`
  );
}
console.log(`Fase F cartas ≥50%: ${fCards}/6`);
console.log(`Fase G cartas ≥50%: ${gCards}/6`);
