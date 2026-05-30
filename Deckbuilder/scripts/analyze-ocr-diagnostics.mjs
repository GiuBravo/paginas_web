/**
 * Resume métricas de coleta OCR (JSON ou ZIP descompactado).
 * Uso:
 *   node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_123.json
 *   node scripts/analyze-ocr-diagnostics.mjs logs/ocr_diagnostics_123.zip
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';

const input = process.argv[2];
if (!input) {
  console.error('Uso: node scripts/analyze-ocr-diagnostics.mjs <ficheiro.json|.zip>');
  process.exit(1);
}

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

const payload = loadPayload(input);
const samples = payload.session?.samples || [];
console.log(`\n=== OCR diagnóstico: ${input} ===`);
console.log(`Schema: v${payload.session?.schemaVersion ?? '?'}`);
console.log(`Amostras: ${samples.length}\n`);

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

for (const s of samples) {
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
  const frame =
    s.typeProbe?.classifiedTypeMerged ||
    s.typeProbe?.classifiedTypeFromFrameOnly;
  if (frame) typeFrame[frame] = (typeFrame[frame] || 0) + 1;

  const pp = s.passcodeProbe;
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
}

const printMap = (title, map) => {
  console.log(title);
  for (const [k, v] of Object.entries(map).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('');
};

printMap('Raridade UI:', rarityUi);
printMap('Raridade detetada (nome+arte):', rarityDet);
printMap('Raridade só faixa nome:', rarityStrip);
printMap('Raridade sugestão arte:', rarityArt);
printMap('Tipo UI:', typeUi);
printMap('Tipo moldura:', typeFrame);

console.log(`Divergências raridade UI vs detetada: ${mismatches.length}`);
for (const m of mismatches.slice(0, 25)) {
  const nm = m.nm
    ? `foil=${m.nm.foilRatio} gold=${m.nm.goldRatio} silver=${m.nm.silverRatio} hue=${m.nm.hueVar} dark=${m.nm.darkLetterRatio}`
    : '-';
  const am = m.am ? `artFoil=${m.am.foilRatio} artHue=${m.am.hueVar} artCol=${m.am.colLumStd}` : '-';
  console.log(
    `  #${m.seq} UI=${m.ui} det=${m.det} strip=${m.strip} art=${m.art || '-'} | ${nm} | ${am} | ocr=${m.cleaned || '-'}`
  );
}

console.log('\n=== Passcode / ID ===');
console.log(`  Amostras com OCR bruto: ${passcodeRaw.length}`);
console.log(`  Amostras com candidatos: ${passcodeCands.length}`);
console.log(
  `  Confiança média: ${passcodeConfN ? Math.round((passcodeConfSum / passcodeConfN) * 10) / 10 : '—'}`
);
printMap('Variantes vencedoras (bestVariant):', passcodeVariants);
console.log('Exemplos raw (até 15):');
for (const r of passcodeRaw.slice(0, 15)) {
  console.log(`  #${r.seq} ${r.raw}`);
}
console.log('\nExemplos candidatos (até 15):');
for (const c of passcodeCands.slice(0, 15)) {
  console.log(`  #${c.seq} conf=${c.conf ?? '—'} → ${(c.cands || []).join(', ')}`);
}

if (payload.analysisSummary) {
  console.log('\n(Resumo embutido no export)');
  console.log(`  UI vs moldura tipo: ${payload.analysisSummary.uiVsFrameMismatchCount ?? '?'}`);
  console.log(`  UI vs detetada raridade: ${payload.analysisSummary.rarityMismatchCount ?? '?'}`);
  console.log(`  Passcode com candidatos: ${payload.analysisSummary.passcodeSamplesWithCandidates ?? '?'}`);
}
