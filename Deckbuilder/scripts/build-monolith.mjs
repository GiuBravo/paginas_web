/**
 * Script de build: gera `Deckbuilder_cursor.html` no diretório raiz do projeto.
 *
 * Lê `index.html`, `src/style.css` e `src/main.js`, substitui o `<link>` do CSS e o
 * `<script src="main.js">` por blocos inline `<style>` e `<script>`, escapando `</style>`
 * e `</script>` no conteúdo para não quebrar o HTML.
 *
 * Execução: `npm run build:monolith`
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const outPath = path.join(root, 'Deckbuilder_cursor.html');

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
const js = sanitizeInlineScript(fs.readFileSync(jsPath, 'utf8'));

// Marcadores aceitos para o `<link>` do stylesheet Vite/local.
const styleMarkers = ['<link rel="stylesheet" href="/src/style.css" />'];
// Variante legada caso o index use caminho relativo sem barra inicial.
const legacyStyle = '<link rel="stylesheet" href="src/style.css" />';
// Inclui o marcador legado na lista de tentativas se existir no HTML.
if (html.includes(legacyStyle)) styleMarkers.push(legacyStyle);

// Indica se algum marcador de estilo foi substituído com sucesso.
let replacedStyle = false;
// Itera marcadores até encontrar um presente no HTML.
for (const m of styleMarkers) {
  // Só substitui se a string exata existir (evita replace falso positivo).
  if (html.includes(m)) {
    // Injeta CSS completo dentro de <style>.
    html = html.replace(m, `<style>\n${css}\n    </style>`);
    replacedStyle = true;
    // Um marcador suficiente — interrompe o laço.
    break;
  }
}
// Falha explicitamente se nenhum link de CSS foi encontrado.
if (!replacedStyle)
  throw new Error('Could not find <link … href="/src/style.css" /> in index.html');

// Marcadores para o script principal (Vite usa `/src/`, clone local pode usar `./src/`).
const scriptMarkers = [
  '<script src="/src/main.js"></script>',
  '<script src="./src/main.js"></script>',
];
let replacedScript = false;
// Mesma estratégia: primeiro marcador que existir ganha.
for (const m of scriptMarkers) {
  if (html.includes(m)) {
    html = html.replace(m, `<script>\n${js}\n    </script>`);
    replacedScript = true;
    break;
  }
}
if (!replacedScript) throw new Error('Could not find <script src="/src/main.js"> in index.html');

// Comentário de aviso no topo do arquivo gerado (rastreabilidade da geração).
const banner =
  '<!-- Monólito gerado automaticamente por `npm run build:monolith`. Fonte de verdade: index.html + src/style.css + src/main.js. -->\n';
// Prefixa o banner ao documento final.
html = banner + html;

// Escreve UTF-8 — mesmo encoding esperado pelos navegadores para este projeto.
fs.writeFileSync(outPath, html, 'utf8');
// Tamanho aproximado em KiB para feedback no terminal (arquivo pode ser grande).
const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`Wrote ${path.relative(root, outPath)} (${kb} KiB)`);
