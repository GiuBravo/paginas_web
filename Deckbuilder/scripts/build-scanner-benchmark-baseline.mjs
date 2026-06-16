/**
 * Gera public/data/scanner-benchmark-official.json a partir de um diagnostics.json.
 * Só promove se matched >67 ou empate + G/near-miss melhor (vs JSON actual).
 *
 * Uso:
 *   node scripts/build-scanner-benchmark-baseline.mjs logs/.../diagnostics.json --official
 *   node scripts/build-scanner-benchmark-baseline.mjs logs/.../diagnostics.json --official --force
 *
 * Validar: correr analyze 3× consecutivos antes de promover ZIP.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { analyzeDiagSamples, slimBaselineFromMetrics, shouldPromoteOfficialBaseline } from '../src/ocr-diag-analyze.mjs';

function parseArgs(argv) {
  let input = '';
  let official = false;
  let force = false;
  let stamp = '';
  let label = '';
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--official') official = true;
    else if (a === '--force') force = true;
    else if (a === '--stamp') stamp = argv[++i] || '';
    else if (a === '--label') label = argv[++i] || '';
    else if (!a.startsWith('--')) input = a;
  }
  return { input, official, force, stamp, label };
}

const OFFICIAL_JSON = 'public/data/scanner-benchmark-official.json';

const { input, official, force, stamp, label } = parseArgs(process.argv);
if (!input) {
  console.error(
    'Uso: node scripts/build-scanner-benchmark-baseline.mjs <diagnostics.json> [--official] [--force] [--stamp ID] [--label texto]'
  );
  process.exit(1);
}

const payload = JSON.parse(readFileSync(input, 'utf8'));
const samples = payload.session?.samples || [];
const metrics = analyzeDiagSamples(samples);
const baseline = slimBaselineFromMetrics(metrics, {
  id: official ? 'official' : 'session',
  stamp: stamp || (official ? String(Date.now()) : ''),
  label: label || (official ? 'Oficial v1.1' : 'Sessão'),
  exportedAt: payload.exportedAt || payload.session?.startedAt || new Date().toISOString(),
  targetSamples: 75,
});

if (official) {
  baseline.benchmark = {
    note: `ZIP ${baseline.stamp} — matched ${baseline.artMatched}/75 near-miss ${baseline.nearMiss} G ${baseline.phaseG}/6.`,
  };
  let currentOfficial = null;
  if (existsSync(OFFICIAL_JSON)) {
    try {
      currentOfficial = JSON.parse(readFileSync(OFFICIAL_JSON, 'utf8'));
    } catch (_) {}
  }
  const gate = shouldPromoteOfficialBaseline(metrics, currentOfficial);
  if (!force && !gate.promote) {
    console.error(`Não promove: ${gate.reason}`);
    console.error('Use --force para gravar mesmo assim.');
    process.exit(2);
  }
  writeFileSync(OFFICIAL_JSON, JSON.stringify(baseline, null, 2));
  writeFileSync('dist/data/scanner-benchmark-official.json', JSON.stringify(baseline, null, 2));
  console.log(`Escrito ${OFFICIAL_JSON} (${gate.promote ? gate.reason : 'forçado'})`);
} else {
  const out = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : 'scanner-benchmark-baseline.json';
  writeFileSync(out, JSON.stringify(baseline, null, 2));
  console.log(`Escrito ${out}`);
}

console.log(
  `samples=${baseline.samples} matched=${baseline.artMatched} near=${baseline.nearMiss} warp=${baseline.warpActive} phaseG=${baseline.phaseG}/6 phaseH=${baseline.phaseH}/6`
);
