/**
 * Descarrega para `assets/icons/races/` e `assets/icons/types/` os PNG/JPG do CDN YGOPRODeck
 * (espelho opcional para uso offline; a app lê estes ícones direto do CDN). Atributos são SVG em
 * `assets/icons/attributes/` (Fandom) — não são descarregados aqui.
 *
 * Uso: `npm run vendor:ygo-deck-icons`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_RACES = path.join(ROOT, 'assets', 'icons', 'races');
const OUT_TYPES = path.join(ROOT, 'assets', 'icons', 'types');
const CDN = 'https://images.ygoprodeck.com';

const CARDINFO = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

async function fetchCardPage(num, offset) {
  const u = `${CARDINFO}?num=${num}&offset=${offset}`;
  const res = await fetch(u, {
    headers: { Accept: 'application/json', 'User-Agent': 'deckbuilder-vendor-deck-icons' },
  });
  if (!res.ok) throw new Error(`cardinfo ${res.status} offset=${offset}`);
  return await res.json();
}

async function downloadFile(url, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { Accept: '*/*', 'User-Agent': 'deckbuilder-vendor-deck-icons' },
  });
  if (!res.ok) throw new Error(String(res.status));
  fs.writeFileSync(destAbs, Buffer.from(await res.arrayBuffer()));
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<void>} worker
 */
async function poolMap(items, concurrency, worker) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await worker(items[idx]);
      }
    })
  );
}

async function main() {
  fs.mkdirSync(OUT_RACES, { recursive: true });
  fs.mkdirSync(OUT_TYPES, { recursive: true });

  const races = new Set();
  const types = new Set();

  const NUM = 5000;
  let offset = 0;
  for (;;) {
    const json = await fetchCardPage(NUM, offset);
    const chunk = Array.isArray(json.data) ? json.data : [];
    if (!chunk.length) break;
    for (const card of chunk) {
      const c = /** @type {Record<string, unknown>} */ (card);
      if (c.race != null && String(c.race).trim()) races.add(String(c.race));
      if (c.type != null && String(c.type).trim()) types.add(String(c.type));
    }
    offset += NUM;
    console.warn(
      `[vendor-ygo-deck-icons] offset ${offset - NUM} … +${chunk.length} (races ${races.size}, types ${types.size})`
    );
    if (chunk.length < NUM) break;
  }

  /** @type {{ url: string, dest: string }[]} */
  const tasks = [];

  for (const race of races) {
    if (!String(race).trim()) continue;
    const enc = encodeURIComponent(race);
    tasks.push({
      url: `${CDN}/images/cards/icons/race/${enc}.png`,
      dest: path.join(OUT_RACES, `${enc}.png`),
    });
  }
  for (const t of types) {
    if (!String(t).trim()) continue;
    const enc = encodeURIComponent(t);
    tasks.push({
      url: `${CDN}/images/cards/icons/${enc}.jpg`,
      dest: path.join(OUT_TYPES, `${enc}.jpg`),
    });
  }

  console.warn(`[vendor-ygo-deck-icons] A descarregar ${tasks.length} ficheiros…`);
  let ok = 0;
  let fail = 0;
  await poolMap(tasks, 12, async (task) => {
    try {
      if (fs.existsSync(task.dest) && fs.statSync(task.dest).size > 80) return;
      await downloadFile(task.url, task.dest);
      ok++;
    } catch {
      fail++;
      try {
        if (fs.existsSync(task.dest) && fs.statSync(task.dest).size < 80) fs.unlinkSync(task.dest);
      } catch {
        /* */
      }
    }
  });
  console.warn(`[vendor-ygo-deck-icons] Concluído (novos ~${ok}, falhas ${fail}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
