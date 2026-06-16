/**
 * Replay Fase G: re-sonda level/rank com hint benchmark (corrige cardTypeHint errado no ZIP).
 * Requer imagens `images/sample_NNN_art.jpg` no ZIP (crop carta — aproximação limitada).
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { probeLevelRankStrip } from '../src/ocr-card-features.mjs';

const BENCH_SEGMENTS = [
  { seqStart: 0, seqEnd: 12, passcode: 34848821, hint: 'Monstro Fusão' },
  { seqStart: 13, seqEnd: 25, passcode: 14087893, hint: 'Magia' },
  { seqStart: 26, seqEnd: 37, passcode: 92079625, hint: 'Monstro Virar' },
  { seqStart: 38, seqEnd: 50, passcode: 66403530, hint: 'Monstro Link' },
  { seqStart: 51, seqEnd: 62, passcode: 46772449, hint: 'Monstro Xyz' },
  { seqStart: 63, seqEnd: 74, passcode: 60465049, hint: 'Monstro Sincro' },
];

const BENCH_LEVEL = {
  34848821: { kind: 'level', value: 8 },
  14087893: { kind: 'spell', value: null },
  92079625: { kind: 'level', value: 9 },
  66403530: { kind: 'link', value: 4 },
  46772449: { kind: 'rank', value: 4 },
  60465049: { kind: 'level', value: 11 },
};

function segForSeq(seq) {
  for (const seg of BENCH_SEGMENTS) {
    if (seq >= seg.seqStart && seq <= seg.seqEnd) return seg;
  }
  return null;
}

function matches(lr, exp) {
  if (!lr || !exp) return false;
  if (lr.kind !== exp.kind) return false;
  if (exp.value == null) return lr.value == null || lr.value === 0;
  return lr.value === exp.value;
}

/** Recorte faixa nível — `levelRankRectMm` / carta 59×86 mm (ocr-card-track.mjs). */
async function levelStripFromArtJpeg(buf) {
  const meta = await sharp(buf).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < 16 || h < 16) return null;
  const x0 = Math.floor(w * (3.8 / 59));
  const y0 = Math.floor(h * (10.1 / 86));
  const rw = Math.max(16, Math.floor(w * (53 / 59)));
  const rh = Math.max(6, Math.floor(h * (2.5 / 86)));
  const raw = await sharp(buf).extract({ left: x0, top: y0, width: rw, height: rh }).resize(160, 40).raw().toBuffer();
  const data = new Uint8ClampedArray(raw.length);
  for (let i = 0, j = 0; i < raw.length; i += 3, j += 4) {
    data[j] = raw[i];
    data[j + 1] = raw[i + 1];
    data[j + 2] = raw[i + 2];
    data[j + 3] = 255;
  }
  return { data, w: 160, h: 40 };
}

const path = process.argv[2] || 'logs/ocr_diagnostics_1781043162168.zip';

function loadZipOrJson(path) {
  if (path.toLowerCase().endsWith('.json')) {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return { json, files: null, path };
  }
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const json = JSON.parse(Buffer.from(files['diagnostics.json']).toString('utf8'));
  return { json, files, path };
}

const { json, files, path: inputPath } = loadZipOrJson(path);
const samples = json.session?.samples || [];

const perCard = {};
for (const seg of BENCH_SEGMENTS) {
  perCard[seg.passcode] = { n: 0, before: 0, after: 0, hintWrong: 0 };
}

for (const s of samples) {
  const seg = segForSeq(s.seq);
  if (!seg) continue;
  const slot = perCard[seg.passcode];
  slot.n++;
  const stored = s.featureMiraProbe?.liveProbe?.levelRank;
  const exp = BENCH_LEVEL[seg.passcode];
  if (matches(stored, exp)) slot.before++;
  const hintStored = s.featureMiraProbe?.cardTypeHint;
  if (hintStored !== seg.hint) slot.hintWrong++;

  const artKey = `images/sample_${String(s.seq).padStart(3, '0')}_art.jpg`;
  const artBuf = files ? files[artKey] : null;
  if (!artBuf) continue;
  const strip = await levelStripFromArtJpeg(artBuf);
  if (!strip) continue;
  const lr = probeLevelRankStrip(strip.data, strip.w, strip.h, seg.hint);
  if (matches(lr, exp)) slot.after++;
}

console.log(`\n=== Replay Fase G (hint benchmark + art crop) — ${inputPath} ===`);
let cardsG = 0;
for (const seg of BENCH_SEGMENTS) {
  const slot = perCard[seg.passcode];
  const pctB = slot.n ? Math.round((slot.before / slot.n) * 100) : 0;
  const pctA = slot.n ? Math.round((slot.after / slot.n) * 100) : 0;
  const ok = pctA >= 50;
  if (ok) cardsG++;
  const exp = BENCH_LEVEL[seg.passcode];
  const label = exp.value != null ? `${exp.kind}=${exp.value}` : exp.kind;
  console.log(
    `  ${seg.passcode} (${label}): stored ${slot.before}/${slot.n} (${pctB}%) → replay ${slot.after}/${slot.n} (${pctA}%) · hint errado ${slot.hintWrong}/${slot.n}`
  );
}
console.log(`  Cartas ≥50% (replay): ${cardsG}/6`);
