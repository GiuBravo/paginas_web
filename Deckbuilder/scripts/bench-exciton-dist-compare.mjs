/**
 * Compara distâncias dHash do segmento Exciton (seq 51–62) entre dois ZIPs de coleta.
 * Uso:
 *   node scripts/bench-exciton-dist-compare.mjs logs/ocr_diagnostics_1781051277605.zip logs/ocr_diagnostics_1781055185769.zip
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';

const EXCITON = 46772449;
const SEQ_START = 51;
const SEQ_END = 62;

function loadSession(path) {
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const jsonName = Object.keys(files).find((n) => n === 'diagnostics.json' || n.endsWith('/diagnostics.json'));
  if (!jsonName) throw new Error(`${path}: ZIP sem diagnostics.json`);
  const payload = JSON.parse(Buffer.from(files[jsonName]).toString('utf8'));
  return payload.session?.samples || [];
}

function excitonRows(samples) {
  const rows = [];
  for (const s of samples) {
    if (s.seq < SEQ_START || s.seq > SEQ_END) continue;
    const ap = s.artProbe || {};
    const bd = ap.artBenchmarkDist && ap.artBenchmarkDist[String(EXCITON)];
    const top0 = ap.topCandidates && ap.topCandidates[0];
    rows.push({
      seq: s.seq,
      minDist: typeof bd === 'number' ? bd : null,
      top0Id: top0 ? top0.cardId : null,
      top0Dist: top0 ? top0.distance : null,
      matched: ap.matchedCardId === EXCITON || s.outcome?.matchedCardId === EXCITON,
      rank: ap.artExpectedRank,
    });
  }
  return rows.sort((a, b) => a.seq - b.seq);
}

function summarize(label, rows) {
  const withDist = rows.filter((r) => r.minDist != null);
  const matched = rows.filter((r) => r.matched).length;
  const top0Ok = rows.filter((r) => r.top0Id === EXCITON).length;
  const le9 = rows.filter((r) => r.top0Id === EXCITON && r.top0Dist != null && r.top0Dist <= 9).length;
  const dists = withDist.map((r) => r.minDist);
  const avg = dists.length ? (dists.reduce((a, b) => a + b, 0) / dists.length).toFixed(1) : '—';
  const min = dists.length ? Math.min(...dists) : '—';
  const max = dists.length ? Math.max(...dists) : '—';
  console.log(`\n=== ${label} ===`);
  console.log(`  amostras: ${rows.length}/12 · matched: ${matched}/12 · top0 Exciton: ${top0Ok}/12 · top0≤9: ${le9}/12`);
  console.log(`  minDist Exciton: min=${min} avg=${avg} max=${max}`);
  return { rows, matched, top0Ok, le9, min, max, avg };
}

const pathA = process.argv[2];
const pathB = process.argv[3];
if (!pathA || !pathB) {
  console.error('Uso: node scripts/bench-exciton-dist-compare.mjs <zip-baseline-C> <zip-referencia-G>');
  process.exit(1);
}

const sumA = summarize(pathA, excitonRows(loadSession(pathA)));
const sumB = summarize(pathB, excitonRows(loadSession(pathB)));

console.log('\n=== Diff por seq (minDist A vs B) ===');
for (let i = 0; i < sumA.rows.length; i++) {
  const a = sumA.rows[i];
  const b = sumB.rows.find((r) => r.seq === a.seq);
  if (!b) continue;
  const da = a.minDist != null ? a.minDist : '—';
  const db = b.minDist != null ? b.minDist : '—';
  const delta =
    typeof da === 'number' && typeof db === 'number' ? (db - da > 0 ? '+' : '') + (db - da) : '';
  console.log(
    `  #${String(a.seq).padStart(3, '0')}  A=${da}  B=${db}  Δ${delta || '—'}  matched A=${a.matched ? 'Y' : 'n'} B=${b.matched ? 'Y' : 'n'}`
  );
}
