/**
 * Atualiza docs/SCANNER_BENCHMARK.md com métricas de um ZIP/JSON de diagnóstico OCR.
 * Uso:
 *   node scripts/benchmark-update.mjs logs/ocr_diagnostics_XXX.zip --phase D --official --notes "6 cartas mesa"
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { analyzeDiagnostics } from './analyze-ocr-diagnostics.mjs';
import { shouldPromoteOfficialBaseline } from '../src/ocr-diag-analyze.mjs';

const BENCHMARK_DOC = 'docs/SCANNER_BENCHMARK.md';
const OFFICIAL_JSON = 'public/data/scanner-benchmark-official.json';

function parseArgs(argv) {
  const positional = [];
  let phase = '';
  let notes = '';
  let official = false;
  let checkPromote = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--official') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        official = next;
        i++;
      } else {
        official = 'v1.1';
      }
    } else if (arg === '--check-promote') {
      checkPromote = true;
    } else if (arg === '--phase') {
      phase = argv[++i] ?? '';
    } else if (arg === '--notes') {
      notes = argv[++i] ?? '';
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    } else {
      console.error(`Flag desconhecida: ${arg}`);
      process.exit(1);
    }
  }

  return { input: positional[0], phase, notes, official, checkPromote };
}

/** Data e hora locais (iluminação dia/noite). Ex.: `2026-06-02 14:55` */
function localSessionDateTime() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function zipStamp(inputPath) {
  const name = basename(inputPath);
  const match = name.match(/^ocr_diagnostics_(.+)\.(zip|json)$/i);
  if (match) return match[1];
  return name.replace(/\.(zip|json)$/i, '');
}

function zipFileName(inputPath) {
  const name = basename(inputPath);
  if (name.toLowerCase().endsWith('.zip')) return name;
  const stamp = zipStamp(inputPath);
  return `ocr_diagnostics_${stamp}.zip`;
}

/**
 * Conta cartas com ≥50% acertos num mapa fase D/E.
 * @param {Record<string, { samples?: number, correct?: number }>|undefined} phaseMap
 * @returns {number}
 */
function countPhaseCardsPass(phaseMap) {
  if (!phaseMap) return 0;
  let n = 0;
  for (const slot of Object.values(phaseMap)) {
    if (!slot || !slot.samples) continue;
    if (slot.correct / slot.samples >= 0.5) n++;
  }
  return n;
}

/**
 * Resumo compacto para notas do histórico (v1.1).
 * @param {ReturnType<typeof analyzeDiagnostics>} metrics
 * @returns {string}
 */
function buildAutoNotes(metrics) {
  const parts = [];
  parts.push(`matched ${metrics.artMatched}/${metrics.samples}`);
  parts.push(`pipeline ${metrics.pipeline}`);
  if (metrics.phaseD) {
    parts.push(`D ${countPhaseCardsPass(metrics.phaseD)}/6`);
  }
  if (metrics.phaseE) {
    parts.push(`E ${countPhaseCardsPass(metrics.phaseE)}/6`);
  }
  if (metrics.phaseF) {
    parts.push(`F ${countPhaseCardsPass(metrics.phaseF)}/6`);
  }
  if (metrics.phaseG) {
    parts.push(`G ${countPhaseCardsPass(metrics.phaseG)}/6`);
  }
  const br = metrics.benchmark?.perCard?.[34848821];
  if (br) {
    parts.push(`Brigrand top0=${br.top0} matched=${br.matched}`);
  }
  return parts.join(', ');
}

function formatHistoryRow({ date, stamp, phase, metrics, notes }) {
  const n = metrics.samples;
  const warp = `${metrics.warpActive}/${n}`;
  const artMira = `${metrics.artMira}/${n}`;
  const noteText = notes || buildAutoNotes(metrics);
  return `| ${date} | ${stamp} | ${phase || '—'} | ${warp} | ${artMira} | ${metrics.artMatched} | ${metrics.pipeline} | ${metrics.nearMiss} | ${noteText} |`;
}

function historyHasStamp(content, stamp) {
  const histStart = content.indexOf('## Histórico de sessões');
  if (histStart === -1) return false;
  const section = content.slice(histStart);
  const rowPattern = new RegExp(`\\|\\s[^|\\n]+\\s\\|\\s${stamp}\\s\\|`);
  return rowPattern.test(section);
}

function insertHistoryRow(content, row, stamp) {
  if (historyHasStamp(content, stamp)) {
    return { content, skipped: true };
  }
  const marker = '| | | | | | | | | |';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    throw new Error('Não encontrei linha placeholder em "Histórico de sessões"');
  }
  return { content: content.slice(0, idx) + row + '\n' + content.slice(idx), skipped: false };
}

const OFFICIAL_ZIP_PATTERNS = [
  {
    pattern: /\*\*ZIP oficial do benchmark v1\.1:\*\*[^\n]*/,
    replacement: (zipName, date) =>
      `**ZIP oficial do benchmark v1.1:** \`${zipName}\` (${date}).`,
  },
  {
    pattern: /\*\*ZIP oficial do benchmark v1 \(cartas desta tabela\):\*\*[^\n]*/,
    replacement: (zipName, date) =>
      `**ZIP oficial do benchmark v1 (cartas desta tabela):** \`${zipName}\` (${date}).`,
  },
];

function updateOfficialZip(content, zipName, date) {
  for (const { pattern, replacement } of OFFICIAL_ZIP_PATTERNS) {
    if (pattern.test(content)) {
      return content.replace(pattern, replacement(zipName, date));
    }
  }
  throw new Error('Não encontrei secção "ZIP oficial do benchmark v1/v1.1"');
}

const { input, phase, notes, official, checkPromote } = parseArgs(process.argv);

if (!input) {
  console.error(
    'Uso: node scripts/benchmark-update.mjs <ficheiro.json|.zip> [--phase <texto>] [--notes <texto>] [--official [v1.1]]'
  );
  process.exit(1);
}

let metrics;
try {
  metrics = analyzeDiagnostics(input);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}

const date = localSessionDateTime();
const stamp = zipStamp(input);
const zipName = zipFileName(input);
const row = formatHistoryRow({ date, stamp, phase, metrics, notes });

let doc = readFileSync(BENCHMARK_DOC, 'utf8');
const inserted = insertHistoryRow(doc, row, stamp);
doc = inserted.content;

if (official) {
  doc = updateOfficialZip(doc, zipName, date);
}

writeFileSync(BENCHMARK_DOC, doc, 'utf8');

console.log(`Atualizado ${BENCHMARK_DOC}`);
if (inserted.skipped) {
  console.log(`  Histórico: entrada ${stamp} já existe — linha não duplicada.`);
}
console.log(`  Data: ${date}`);
console.log(`  ZIP: ${stamp}`);
console.log(`  warpActive: ${metrics.warpActive}/${metrics.samples}`);
console.log(`  art_mira: ${metrics.artMira}/${metrics.samples}`);
console.log(`  Matches arte: ${metrics.artMatched}`);
console.log(`  pipeline: ${metrics.pipeline}`);
console.log(`  Near-miss: ${metrics.nearMiss}`);
console.log(`  sampleKinds: ${JSON.stringify(metrics.sampleKinds)}`);
if (metrics.benchmark) {
  console.log(
    `  Benchmark top0≤9: ${metrics.benchmark.top0DistLe9} | matched OK: ${metrics.benchmark.matchedCorrect} | matched wrong: ${metrics.benchmark.matchedWrong}`
  );
  for (const [id, c] of Object.entries(metrics.benchmark.perCard)) {
    const minD = c.minDist === 99 ? '—' : c.minDist;
    const rank = c.bestRankTop5 < 0 ? '—' : c.bestRankTop5;
    console.log(`    ${id}: minDist=${minD} rankTop5=${rank} top0=${c.top0} matched=${c.matched}`);
  }
}
if (metrics.phaseD) {
  console.log(`  Fase D (≥50% por carta): ${countPhaseCardsPass(metrics.phaseD)}/6`);
}
if (metrics.phaseE) {
  console.log(`  Fase E (≥50% por carta): ${countPhaseCardsPass(metrics.phaseE)}/6`);
}
if (metrics.phaseF) {
  console.log(`  Fase F (≥50% por carta): ${countPhaseCardsPass(metrics.phaseF)}/6`);
}
if (metrics.phaseG) {
  console.log(`  Fase G (≥50% por carta): ${countPhaseCardsPass(metrics.phaseG)}/6`);
}
if (checkPromote || official) {
  let currentOfficial = null;
  if (existsSync(OFFICIAL_JSON)) {
    try {
      currentOfficial = JSON.parse(readFileSync(OFFICIAL_JSON, 'utf8'));
    } catch (_) {}
  }
  const gate = shouldPromoteOfficialBaseline(metrics, currentOfficial);
  console.log(`  Promoção baseline: ${gate.promote ? 'SIM' : 'NÃO'} (${gate.reason})`);
  if (checkPromote && !gate.promote) process.exit(2);
}
if (official) {
  console.log(`  ZIP oficial (${official}): ${zipName} (${date})`);
}
