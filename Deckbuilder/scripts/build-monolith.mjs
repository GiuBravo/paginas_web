/**
 * @fileoverview Gera o HTML monolítico `yugioh_deckbuilder.html` a partir do projeto em árvore.
 *
 * Script de build: gera `yugioh_deckbuilder.html` no diretório raiz do projeto.
 *
 * Lê `index.html`, `src/style.css` e `src/main.js`, substitui o `<link>` do CSS e o
 * `<script src="main.js">` por blocos inline `<style>` e `<script>`, escapando `</style>`
 * e `</script>` no conteúdo para não quebrar o HTML.
 *
 * @see npm script `build:monolith` em `package.json`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { countProjectLinesWithDocs } from './loc.mjs';

// Diretório deste arquivo (`scripts/`), para resolver caminhos relativos ao projeto.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Raiz do repositório (pai de `scripts/`).
const root = path.join(__dirname, '..');

/**
 * Escapa sequências que fechariam uma tag `<style>` dentro do CSS inline.
 *
 * @param {string} css Texto CSS bruto (pode ser string vazia).
 * @returns {string} CSS com `</style` substituído por `<\\/style` (case insensitive).
 */
function sanitizeInlineStyle(css) {
  // Se css for undefined/null, String(...) vira texto seguro para replace.
  return String(css || '').replace(/<\/style/gi, '<\\/style');
}

/**
 * Escapa sequências que fechariam uma tag `</script>` dentro do JS inline.
 *
 * @param {string} js Texto JavaScript bruto (pode ser string vazia).
 * @returns {string} JS com `</script` substituído por `<\\/script` (case insensitive).
 */
function sanitizeInlineScript(js) {
  return String(js || '').replace(/<\/script/gi, '<\\/script');
}

// Caminhos absolutos dos insumos e do produto.
const indexPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'src', 'style.css');
const jsPath = path.join(root, 'src', 'main.js');
const outPath = path.join(root, 'yugioh_deckbuilder.html');

// Garante que nenhum arquivo obrigatório está ausente antes de ler.
for (const p of [indexPath, cssPath, jsPath]) {
  // existsSync evita exceções pouco claras em readFileSync.
  if (!fs.existsSync(p)) throw new Error(`Missing required file: ${p}`);
}

// HTML original (ainda com link e script externos).
const rawHtml = fs.readFileSync(indexPath, 'utf8');
// Validação mínima: espera-se começar com markup (DOCTYPE ou tag).
if (!/^\s*</.test(rawHtml)) throw new Error('index.html does not start with <!DOCTYPE/html');
// Cópia mutável para aplicar substituições.
let html = rawHtml;
// Conteúdos sanitizados para injeção inline.
const css = sanitizeInlineStyle(fs.readFileSync(cssPath, 'utf8'));
let js = fs.readFileSync(jsPath, 'utf8');
// Para o monólito, precisamos de um valor real (não há substituição do Vite `define`).
try {
  const { totalLines } = countProjectLinesWithDocs(root);
  js = `window.__LOC_WITH_DOCS__=${Number(totalLines || 0)};\n` + js;
} catch {
  js = 'window.__LOC_WITH_DOCS__=0;\n' + js;
}
js = sanitizeInlineScript(js);

// Substitui o `<link rel="stylesheet" href="/src/style.css">` por `<style>…</style>`.
// Intencionalmente tolerante a:
// - `>` vs `/>`
// - ordem/quantidade de atributos
// - aspas simples ou duplas
// - espaços e quebras de linha
const styleHrefRe = /href\s*=\s*(['"])(\/?src\/style\.css)\1/i;
const styleTagRe =
  /<link\b(?=[^>]*\brel\s*=\s*(['"])stylesheet\1)(?=[^>]*\bhref\s*=\s*(['"])(\/?src\/style\.css)\2)[^>]*\/?>/i;
if (!styleTagRe.test(html) || !styleHrefRe.test(html)) {
  throw new Error('Could not find stylesheet link to /src/style.css in index.html');
}
html = html.replace(styleTagRe, `<style>\n${css}\n    </style>`);

// Marcadores para o script principal (Vite usa `/src/`, clone local pode usar `./src/`).
// Também tolera `type="module"` e outros atributos no `<script …>`.
const scriptTagRe =
  /<script\b(?=[^>]*\bsrc\s*=\s*(['"])\.?(\/src\/main\.js)\1)[^>]*>\s*<\/script>/i;
if (!scriptTagRe.test(html)) {
  throw new Error('Could not find script tag with src="/src/main.js" in index.html');
}
html = html.replace(
  scriptTagRe,
  `<script>\nwindow.__DECKBUILDER_MONOLITH__=true;\n${js}\n    </script>`
);

// Comentário de aviso no topo do arquivo gerado (rastreabilidade da geração).
const banner =
  '<!-- Monólito gerado automaticamente por `npm run build:monolith`. Fonte de verdade: index.html + src/style.css + src/main.js. -->\n';
// Prefixa o banner ao documento final.
html = banner + html;

/**
 * Monólito sem pasta `assets/`: substitui `src` de ícones locais por URLs remotas estáveis.
 *
 * @param {string} docHtml HTML completo do monólito.
 * @returns {string}
 */
function rewriteMonolithLocalIconSrc(docHtml) {
  const pairs = [
    [
      'assets/icons/master-duel/CraftPoints_UR_MD.png',
      'https://ms.yugipedia.com//c/c3/CraftPoints_UR_MD.png',
    ],
    [
      'assets/icons/master-duel/CraftPoints_SR_MD.png',
      'https://ms.yugipedia.com//f/fb/CraftPoints_SR_MD.png',
    ],
    [
      'assets/icons/master-duel/CraftPoints_R_MD.png',
      'https://ms.yugipedia.com//3/3e/CraftPoints_R_MD.png',
    ],
    [
      'assets/icons/master-duel/CraftPoints_N_MD.png',
      'https://ms.yugipedia.com//3/3b/CraftPoints_N_MD.png',
    ],
    [
      'assets/icons/master-duel/Gem-Master_Duel.png',
      'https://ms.yugipedia.com//5/5d/Gem-Master_Duel.png',
    ],
  ];
  let out = docHtml;
  for (const [loc, remote] of pairs) {
    out = out.split(loc).join(remote);
  }
  return out;
}

html = rewriteMonolithLocalIconSrc(html);

// Escreve UTF-8 — mesmo encoding esperado pelos navegadores para este projeto.
fs.writeFileSync(outPath, html, 'utf8');
// Tamanho aproximado em KiB para feedback no terminal (arquivo pode ser grande).
const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`Wrote ${path.relative(root, outPath)} (${kb} KiB)`);
