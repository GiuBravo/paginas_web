/**
 * Offline: dHash nas artRegionJpeg do ZIP vs passcodes benchmark.
 * node scripts/bench-art-hash-offline.mjs logs/ocr_diagnostics_XXX.zip
 */
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import {
  installArtHashIndexForTests,
  findTopArtMatchesFromHashes,
  computeDHashFromRGBA,
  hammingDistance,
  canonicalArtCropRect,
} from '../src/ocr-art-hash.mjs';
import { CANONICAL_CARD_W, CANONICAL_CARD_H, shrinkArtRect } from '../src/ocr-card-track.mjs';

const BENCH = [34848821, 14087893, 92079625, 66403530, 46772449, 60465049];

function loadSamples(zipPath) {
  const buf = readFileSync(zipPath);
  const files = unzipSync(new Uint8Array(buf));
  const jsonName = Object.keys(files).find((n) => n.endsWith('diagnostics.json'));
  return JSON.parse(Buffer.from(files[jsonName]).toString('utf8')).session.samples;
}

async function hashArtJpeg(dataUrl, marginsPct = [0, 0.04, 0.06]) {
  const b64 = dataUrl.split(',')[1] || '';
  const raw = Buffer.from(b64, 'base64');
  const { data, info } = await sharp(raw)
    .resize(CANONICAL_CARD_W, CANONICAL_CARD_H, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rect = canonicalArtCropRect();
  const rgba = new Uint8ClampedArray(data);
  const hashes = [];
  const seen = new Set();
  for (let i = 0; i < marginsPct.length; i++) {
    const r = marginsPct[i] > 0 ? shrinkArtRect(rect, marginsPct[i]) : rect;
    const h = computeDHashFromRGBA(rgba, info.width, info.height, r);
    if (h && !seen.has(h)) {
      seen.add(h);
      hashes.push(h);
    }
  }
  return hashes;
}

function distToId(hashes, cardId, index) {
  const e = index.entries.find((x) => x.cardId === cardId);
  if (!e) return 99;
  let best = 99;
  for (const h of hashes) {
    if (e.hm) best = Math.min(best, hammingDistance(h, e.hm));
    if (e.hs) best = Math.min(best, hammingDistance(h, e.hs));
  }
  return best;
}

const zipPath = process.argv[2] || 'logs/ocr_diagnostics_1780512126508.zip';
const idx = JSON.parse(readFileSync('public/data/art-hash-index.json', 'utf8'));
installArtHashIndexForTests(idx);
const samples = loadSamples(zipPath);

const chunks = [
  [1, 12, 0],
  [13, 25, 1],
  [26, 37, 2],
  [38, 50, 3],
  [51, 62, 4],
  [63, 75, 5],
];

for (const [a, b, bi] of chunks) {
  const slice = samples.filter((s) => s.seq >= a && s.seq <= b && s.images?.artRegionJpeg);
  const s = slice[Math.floor(slice.length / 2)] || slice[0];
  if (!s) continue;
  const hashes = await hashArtJpeg(s.images.artRegionJpeg);
  const expect = BENCH[bi];
  const frame = s.typeProbe?.classifiedTypeMerged || 'Monstro Efeito';
  const topMeta = findTopArtMatchesFromHashes(hashes, {
    k: 12,
    maxDist: 18,
    metaProbe: { uiType: frame },
    cardType: frame,
  });
  const topNone = findTopArtMatchesFromHashes(hashes, {
    k: 12,
    maxDist: 18,
    metaProbe: null,
    cardType: frame,
  });
  const dExpect = distToId(hashes, expect, idx);
  const rankMeta = topMeta.findIndex((t) => t.cardId === expect);
  const rankNone = topNone.findIndex((t) => t.cardId === expect);
  console.log(
    `card ${expect} frame=${frame} distExpect=${dExpect} rankMeta=${rankMeta} rankNone=${rankNone} top0meta=${topMeta[0]?.cardId}@${topMeta[0]?.distance} top0none=${topNone[0]?.cardId}@${topNone[0]?.distance}`
  );
}
