/**
 * Simula classificação Ultra Brigrand (gold alto, foil moderado) nos nameMetrics do ZIP.
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';

const BENCH_SEGMENTS = [
  { seqStart: 0, seqEnd: 12, passcode: 34848821 },
  { seqStart: 13, seqEnd: 25, passcode: 14087893 },
  { seqStart: 26, seqEnd: 37, passcode: 92079625 },
  { seqStart: 38, seqEnd: 50, passcode: 66403530 },
  { seqStart: 51, seqEnd: 62, passcode: 46772449 },
  { seqStart: 63, seqEnd: 74, passcode: 60465049 },
];

const BENCH_RARITY = {
  34848821: 'Ultra Rara',
  14087893: 'Secreta',
  92079625: 'Ultra Rara',
  66403530: 'Ultra Rara',
  46772449: 'Ultra Rara',
  60465049: 'Secreta',
};

function expectedPasscode(seq) {
  for (const seg of BENCH_SEGMENTS) {
    if (seq >= seg.seqStart && seq <= seg.seqEnd) return seg.passcode;
  }
  return null;
}

function isFusionPurplePlate(r, g, b) {
  const lum = (r + g + b) / 3;
  return lum > 55 && lum < 195 && r > 95 && b > 95 && g < r - 4 && g < b + 8;
}

function replayUltraGold(m) {
  if (!m) return false;
  if (
    isFusionPurplePlate(m.plateR, m.plateG, m.plateB) &&
    m.goldRatio > 0.82 &&
    m.silverRatio < 0.12 &&
    m.foilRatio >= 0.26 &&
    m.hueVar < 0.12
  ) {
    return true;
  }
  if (m.foilRatio < 0.36) {
    return m.goldRatio > 0.82 && m.silverRatio < 0.12 && m.hueVar < 0.12;
  }
  return false;
}

function loadPayload(path) {
  if (path.toLowerCase().endsWith('.zip')) {
    const files = unzipSync(new Uint8Array(readFileSync(path)));
    const jsonName = Object.keys(files).find((n) => n === 'diagnostics.json');
    return JSON.parse(Buffer.from(files[jsonName]).toString('utf8'));
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const path = process.argv[2] || 'logs/ocr_diagnostics_1781043162168.zip';
const payload = loadPayload(path);
const samples = payload.session?.samples || [];
const perCard = {};

for (const s of samples) {
  const pc = expectedPasscode(s.seq);
  if (!pc) continue;
  if (!perCard[pc]) perCard[pc] = { n: 0, before: 0, after: 0 };
  perCard[pc].n++;
  const det = s.rarityProbe?.classifiedRarity;
  const want = BENCH_RARITY[pc];
  if (det === want) perCard[pc].before++;
  const nm = s.rarityProbe?.nameMetrics;
  let replay = det;
  if (pc === 34848821 && replayUltraGold(nm)) replay = 'Ultra Rara';
  if (replay === want) perCard[pc].after++;
}

console.log(`\n=== Replay raridade Brigrand (gold alto) — ${path} ===`);
for (const [pc, slot] of Object.entries(perCard)) {
  const pctB = Math.round((slot.before / slot.n) * 100);
  const pctA = Math.round((slot.after / slot.n) * 100);
  console.log(`  ${pc}: antes ${slot.before}/${slot.n} (${pctB}%) → depois ${slot.after}/${slot.n} (${pctA}%)`);
}
