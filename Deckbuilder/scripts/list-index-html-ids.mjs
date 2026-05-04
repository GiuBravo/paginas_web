/**
 * @fileoverview Lista todos os atributos `id` presentes em `index.html` (apoio à documentação).
 *
 * Imprime no stdout a contagem e, em seguida, um `id` por linha em ordem alfabética.
 * Não altera ficheiros. Para regenerar o catálogo comentado dentro do HTML, use
 * `npm run doc:refresh-index-ids` (`scripts/generate-index-html-id-catalog-comment.mjs --write`).
 *
 * Execução: `node scripts/list-index-html-ids.mjs` na raiz do repositório.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const re = /\bid="([^"]+)"/g;
const ids = new Set();
let m;
while ((m = re.exec(html))) ids.add(m[1]);
console.log('count', ids.size);
for (const id of [...ids].sort()) console.log(id);
