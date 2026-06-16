/**
 * Compara métricas de dois ZIPs/JSON de diagnóstico OCR (benchmark v1.1).
 * Uso:
 *   node scripts/bench-compare.mjs logs/ocr_diagnostics_A.zip logs/ocr_diagnostics_B.zip
 *   node scripts/bench-compare.mjs baseline.json candidate.zip --label-a oficial --label-b candidato
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { unzipSync } from 'fflate';
import {
  analyzeDiagSamples,
  buildExtendedDiagMetrics,
  countPhaseJCardsPass,
  formatBenchZipCompareLines,
  shouldPromoteOfficialBaseline,
} from '../src/ocr-diag-analyze.mjs';

function parseArgs(argv) {
  const positional = [];
  let labelA = '';
  let labelB = '';
  let officialJson = '';
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--label-a') labelA = argv[++i] || '';
    else if (arg === '--label-b') labelB = argv[++i] || '';
    else if (arg === '--official-json') officialJson = argv[++i] || '';
    else if (!arg.startsWith('--')) positional.push(arg);
  }
  return { a: positional[0], b: positional[1], labelA, labelB, officialJson };
}

function loadSamples(path) {
  if (path.toLowerCase().endsWith('.zip')) {
    const files = unzipSync(new Uint8Array(readFileSync(path)));
    const jsonName = Object.keys(files).find((n) => n === 'diagnostics.json');
    if (!jsonName) throw new Error(`Sem diagnostics.json em ${path}`);
    const payload = JSON.parse(Buffer.from(files[jsonName]).toString('utf8'));
    return payload.session?.samples || [];
  }
  const payload = JSON.parse(readFileSync(path, 'utf8'));
  return payload.session?.samples || payload.samples || [];
}

function stampFromPath(path) {
  const name = basename(path);
  const m = name.match(/^ocr_diagnostics_(.+)\.(zip|json)$/i);
  return m ? m[1] : name.replace(/\.(zip|json)$/i, '');
}

const { a, b, labelA, labelB, officialJson } = parseArgs(process.argv);
if (!a || !b) {
  console.error(
    'Uso: node scripts/bench-compare.mjs <zip|json A> <zip|json B> [--label-a texto] [--label-b texto] [--official-json path]'
  );
  process.exit(1);
}

const samplesA = loadSamples(a);
const samplesB = loadSamples(b);
const metricsA = analyzeDiagSamples(samplesA);
const metricsB = analyzeDiagSamples(samplesB);
const extA = buildExtendedDiagMetrics(samplesA, null, { inputPath: a });
const extB = buildExtendedDiagMetrics(samplesB, null, { inputPath: b });

const la = labelA || stampFromPath(a);
const lb = labelB || stampFromPath(b);
const lines = formatBenchZipCompareLines(metricsA, metricsB, { labelA: la, labelB: lb });
lines.push(`J (≥1 candidato certo): ${countPhaseJCardsPass(extA.passcodeBenchmark)}/6 → ${countPhaseJCardsPass(extB.passcodeBenchmark)}/6`);
console.log(lines.join('\n'));

if (officialJson) {
  const official = JSON.parse(readFileSync(officialJson, 'utf8'));
  const gate = shouldPromoteOfficialBaseline(metricsB, official);
  console.log(`\nPromoção vs ${basename(officialJson)}: ${gate.promote ? 'SIM' : 'NÃO'} (${gate.reason})`);
}

process.exit(0);
