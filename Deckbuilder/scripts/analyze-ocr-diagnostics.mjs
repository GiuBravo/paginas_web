/**
 * Resume métricas de coleta OCR (JSON ou ZIP descompactado).
 * Uso:
 *   node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_123.json
 *   node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_123.zip
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import {
  SCANNER_BENCHMARK_PASSCODES,
  buildExtendedDiagMetrics,
  formatDiagnosticsReportText,
} from '../src/ocr-diag-analyze.mjs';

export { SCANNER_BENCHMARK_PASSCODES };

function loadPayload(path) {
  if (path.toLowerCase().endsWith('.zip')) {
    const buf = readFileSync(path);
    const files = unzipSync(new Uint8Array(buf));
    const jsonName = Object.keys(files).find((n) => n === 'diagnostics.json' || n.endsWith('/diagnostics.json'));
    if (!jsonName) throw new Error('ZIP sem diagnostics.json');
    return JSON.parse(Buffer.from(files[jsonName]).toString('utf8'));
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function analyzeDiagnostics(path) {
  const payload = loadPayload(path);
  return buildExtendedDiagMetrics(payload.session?.samples || [], payload.analysisSummary, {
    inputPath: path,
    schemaVersion: payload.session?.schemaVersion,
  });
}

function printReport(metrics) {
  console.log(formatDiagnosticsReportText(metrics));
}

const input = process.argv[2];
if (input && process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    printReport(analyzeDiagnostics(input));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
