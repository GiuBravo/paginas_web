/**
 * Gera índice local de dHash das artes + nomes EN/PT (scanner híbrido).
 *
 * Uso: npm run build:art-hash-index
 * Saída: public/data/art-hash-index.json (servir no deploy; não commitar se preferir lazy download)
 *
 * Requer rede para API YGOProDeck + CDN de imagens.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  ART_HASH_SCHEMA,
  CANONICAL_CARD_H,
  CANONICAL_CARD_W,
  collectCanonicalArtHashVariants,
  SCANNER_BENCHMARK_PASSCODES,
} from '../src/ocr-art-hash.mjs';
import { metaFromApiCard } from '../src/ocr-card-features.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'art-hash-index.json');
const CARDINFO_NUM = 5000;
const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const NAMES_BATCH = 80;

/**
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (_) {
    return null;
  }
}

/**
 * @param {Buffer} buf
 * @returns {Promise<Uint8ClampedArray|null>}
 */
async function canonicalRgbaFromImage(buf) {
  try {
    const { data, info } = await sharp(buf)
      .resize(CANONICAL_CARD_W, CANONICAL_CARD_H, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  } catch (_) {
    return null;
  }
}

const BENCHMARK_SET = new Set(SCANNER_BENCHMARK_PASSCODES);

/**
 * @param {Uint8ClampedArray} rgba
 * @param {string} cardType
 * @param {boolean} augmented
 * @returns {string[]}
 */
function hashVariantsForType(rgba, cardType, deepAugmented, cardId) {
  return collectCanonicalArtHashVariants(rgba, CANONICAL_CARD_W, CANONICAL_CARD_H, cardType, {
    deepAugmented,
    cardId,
  });
}

/**
 * @param {number} offset
 * @returns {Promise<{ rows: object[], total: number }>}
 */
async function fetchCardinfoPage(offset) {
  const url = `${API_BASE}?num=${CARDINFO_NUM}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`cardinfo HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) return { rows: [], total: 0 };
  const total = j.meta && typeof j.meta.total_rows === 'number' ? j.meta.total_rows : 0;
  return { rows: j.data || [], total };
}

/**
 * Preenche nomes PT em `namesById[id][1]`.
 * @param {Record<string, [string, string]>} namesById
 * @returns {Promise<void>}
 */
async function fillPortugueseNames(namesById) {
  const ids = Object.keys(namesById)
    .map((k) => Number(k))
    .filter((id) => id > 0);
  console.log(`A carregar nomes PT (${ids.length} cartas)…`);
  let done = 0;
  for (let i = 0; i < ids.length; i += NAMES_BATCH) {
    const chunk = ids.slice(i, i + NAMES_BATCH);
    const url = `${API_BASE}?id=${chunk.join(',')}&language=pt`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = await res.json();
      const rows = j.data || [];
      for (let ri = 0; ri < rows.length; ri++) {
        const card = rows[ri];
        const key = String(card.id);
        if (!namesById[key]) continue;
        const pt = String(card.name || '').trim();
        if (pt) namesById[key][1] = pt;
      }
    } catch (_) {
      /* lote opcional */
    }
    done += chunk.length;
    if (done % 800 === 0 || done >= ids.length) {
      console.log(`  nomes PT: ${done}/${ids.length}`);
    }
  }
}

async function main() {
  console.log('A carregar catálogo cardinfo…');
  const entries = [];
  /** @type {Record<string, [string, string]>} */
  const namesById = {};
  /** @type {Record<string, ReturnType<typeof metaFromApiCard>>} */
  const cardMetaById = {};
  const seenImg = new Set();
  let offset = 0;
  let totalRows = 0;
  let page = 0;

  while (true) {
    const { rows, total } = await fetchCardinfoPage(offset);
    if (!totalRows && total) totalRows = total;
    if (!rows.length) break;
    page++;
    console.log(`  página ${page} offset=${offset} (+${rows.length})`);

    for (let ci = 0; ci < rows.length; ci++) {
      const card = rows[ci];
      const cardId = card.id;
      const enName = String(card.name || '').trim();
      if (enName && !namesById[String(cardId)]) {
        namesById[String(cardId)] = [enName, ''];
      }
      if (!cardMetaById[String(cardId)]) {
        cardMetaById[String(cardId)] = metaFromApiCard(card);
      }
      const images = card.card_images || [];
      for (let ii = 0; ii < images.length; ii++) {
        const img = images[ii];
        const imgId = Number(img.id != null ? img.id : cardId);
        if (seenImg.has(imgId)) continue;
        seenImg.add(imgId);
        const url =
          img.image_url_cropped ||
          `https://images.ygoprodeck.com/images/cards_cropped/${imgId}.jpg`;
        const buf = await fetchImageBuffer(url);
        if (!buf) continue;
        const rgba = await canonicalRgbaFromImage(buf);
        if (!rgba) continue;
        const meta = cardMetaById[String(cardId)] || metaFromApiCard(card);
        const uiType = meta.uiType || 'Monstro Efeito';
        const deepAugmented = BENCHMARK_SET.has(cardId);
        const hmVar = hashVariantsForType(rgba, uiType, deepAugmented, cardId);
        const hsVar = hashVariantsForType(rgba, 'Magia', deepAugmented, cardId);
        const hm = hmVar[0];
        const hs = hsVar[0];
        if (!hm) continue;
        const hmv = hmVar.filter((h) => h !== hm);
        const hsv = hsVar.filter((h) => h !== hs);
        entries.push({
          imgId,
          cardId,
          hm,
          hs,
          ...(hmv.length ? { hmv } : {}),
          ...(hsv.length ? { hsv } : {}),
          artworkKey: hm,
        });
      }
    }

    offset += CARDINFO_NUM;
    if (totalRows > 0 && offset >= totalRows) break;
    if (rows.length < CARDINFO_NUM) break;
    if (offset > 250000) break;
  }

  await fillPortugueseNames(namesById);

  const artworkGroups = {};
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const key = e.artworkKey;
    if (!artworkGroups[key]) artworkGroups[key] = [];
    if (!artworkGroups[key].includes(e.cardId)) artworkGroups[key].push(e.cardId);
  }

  const payload = {
    schema: ART_HASH_SCHEMA,
    canonicalW: CANONICAL_CARD_W,
    canonicalH: CANONICAL_CARD_H,
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    nameCount: Object.keys(namesById).length,
    entries,
    artworkGroups,
    namesById,
    cardMetaById,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload));
  console.log(`\nÍndice escrito: ${OUT_FILE}`);
  console.log(
    `Entradas: ${entries.length}, nomes: ${Object.keys(namesById).length}, grupos de arte: ${Object.keys(artworkGroups).length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
