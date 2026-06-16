/**
 * Atualiza só as 6 cartas do benchmark no índice (margens + augmentação foil/luz).
 * Uso: node scripts/patch-benchmark-index-hashes.mjs
 * Depois: npm run dev e nova coleta.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  CANONICAL_CARD_H,
  CANONICAL_CARD_W,
  collectCanonicalArtHashVariants,
  ART_HASH_BENCH_PUSH_PATCH_PASSCODES,
  isArtHashBenchFrozenPasscode,
  SCANNER_BENCHMARK_PASSCODES,
} from '../src/ocr-art-hash.mjs';
import { metaFromApiCard } from '../src/ocr-card-features.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(__dirname, '..', 'public', 'data', 'art-hash-index.json');
const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

async function rgbaFromUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { data } = await sharp(buf)
      .resize(CANONICAL_CARD_W, CANONICAL_CARD_H, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  } catch {
    return null;
  }
}

/**
 * URLs de arte (cropped + full) — impressões EN/PT no mesmo pipeline.
 * @param {object} card
 * @param {object} img
 * @returns {string[]}
 */
function benchmarkImageUrls(card, img) {
  const cardId = Number(card.id);
  const imgId = Number(img?.id != null ? img.id : cardId);
  const urls = [
    img?.image_url_cropped,
    `https://images.ygoprodeck.com/images/cards_cropped/${imgId}.jpg`,
    img?.image_url,
    `https://images.ygoprodeck.com/images/cards/${imgId}.jpg`,
  ];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * @param {string[]} urls
 * @param {string} cardType
 * @param {number} cardId
 * @returns {Promise<string[]>}
 */
async function mergeHashVariantsFromUrls(urls, cardType, cardId) {
  const seen = new Set();
  const merged = [];
  for (let ui = 0; ui < urls.length; ui++) {
    const rgba = await rgbaFromUrl(urls[ui]);
    if (!rgba) continue;
    const batch = collectCanonicalArtHashVariants(rgba, CANONICAL_CARD_W, CANONICAL_CARD_H, cardType, {
      deepAugmented: true,
      cardId,
    });
    for (let hi = 0; hi < batch.length; hi++) {
      const h = batch[hi];
      if (h && !seen.has(h)) {
        seen.add(h);
        merged.push(h);
      }
    }
  }
  return merged;
}

async function main() {
  const payload = JSON.parse(readFileSync(INDEX, 'utf8'));
  let patched = 0;
  for (const cardId of SCANNER_BENCHMARK_PASSCODES) {
    if (isArtHashBenchFrozenPasscode(cardId)) {
      console.log('skip patch (frozen)', cardId);
      continue;
    }
    if (!ART_HASH_BENCH_PUSH_PATCH_PASSCODES.includes(cardId)) {
      console.log('skip patch (push frozen)', cardId);
      continue;
    }
    const res = await fetch(`${API}?id=${cardId}`);
    if (!res.ok) throw new Error(`cardinfo ${cardId}`);
    const rows = (await res.json()).data || [];
    const card = rows[0];
    if (!card) continue;
    const img = (card.card_images || [])[0];
    const urls = benchmarkImageUrls(card, img);
    const meta = metaFromApiCard(card);
    const uiType = meta.uiType || 'Monstro Efeito';
    if (meta.uiType === 'Monstro Xyz' && card.rank != null) {
      meta.rank = Number(card.rank);
    }
    const hmVar = await mergeHashVariantsFromUrls(urls, uiType, cardId);
    const hsVar = await mergeHashVariantsFromUrls(urls, 'Magia', cardId);
    const hm = hmVar[0];
    const hs = hsVar[0];
    if (!hm) {
      console.warn('skip hashes', cardId);
      continue;
    }
    const hmv = hmVar.filter((h) => h !== hm);
    const hsv = hsVar.filter((h) => h !== hs);
    const enName = String(card.name || '').trim();
    const key = String(cardId);
    if (!payload.namesById) payload.namesById = {};
    if (!payload.namesById[key]) payload.namesById[key] = [enName, ''];
    else if (enName) payload.namesById[key][0] = enName;
    for (let i = 0; i < payload.entries.length; i++) {
      const e = payload.entries[i];
      if (e.cardId !== cardId) continue;
      e.hm = hm;
      e.hs = hs;
      e.artworkKey = hm;
      if (hmv.length) e.hmv = hmv;
      else delete e.hmv;
      if (hsv.length) e.hsv = hsv;
      else delete e.hsv;
      patched++;
      console.log(cardId, 'urls', urls.length, 'hmv', hmv.length, 'hsv', hsv.length);
    }
    if (!payload.cardMetaById) payload.cardMetaById = {};
    payload.cardMetaById[key] = meta;
  }
  payload.generatedAt = new Date().toISOString();
  writeFileSync(INDEX, JSON.stringify(payload));
  console.log(`\nPatched ${patched} entries in ${INDEX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
