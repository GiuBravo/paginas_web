/**
 * @fileoverview Extrai CSS e JS embutidos de `yugioh_deckbuilder.html` para ficheiros em árvore.
 *
 * Operação inversa aproximada de `scripts/build-monolith.mjs`: lê o monólito, recorta o primeiro
 * bloco `<style>...</style>` e o primeiro `<script>...</script>` principal, grava `src/style.css` e
 * `src/main.js`, e reescreve `index.html` com `<link>` e `<script type="module">` apontando para eles.
 * Útil quando só existe o HTML monolítico e se pretende voltar a desenvolver com Vite.
 *
 * Execução: `node scripts/extract-deckbuilder.mjs` na raiz do repositório.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'yugioh_deckbuilder.html');
const OUT_HTML = path.join(ROOT, 'index.html');
const OUT_CSS = path.join(ROOT, 'src', 'style.css');
const OUT_JS = path.join(ROOT, 'src', 'main.js');

/**
 * Garante que o diretório existe antes de escrever ficheiros.
 *
 * @param {string} dir Caminho do diretório.
 * @returns {void}
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Regista erro no stderr e termina o processo com código 1.
 *
 * @param {string} msg Mensagem humana.
 * @returns {never}
 */
function fail(msg) {
  console.error(`[extract] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(INPUT)) {
  fail(`Arquivo não encontrado: ${INPUT}`);
}

const input = fs.readFileSync(INPUT, 'utf8');

const styleOpen = input.indexOf('<style>');
const styleClose = input.indexOf('</style>');
if (styleOpen < 0 || styleClose < 0 || styleClose <= styleOpen) {
  fail('Não encontrei bloco <style>...</style> no HTML.');
}

const scriptOpen = input.indexOf('<script>', styleClose);
const scriptClose = input.indexOf('</script>', scriptOpen);
if (scriptOpen < 0 || scriptClose < 0 || scriptClose <= scriptOpen) {
  fail('Não encontrei bloco <script>...</script> principal no HTML.');
}

const css = input.slice(styleOpen + '<style>'.length, styleClose).trimStart();
const js = input.slice(scriptOpen + '<script>'.length, scriptClose).trimStart();

// Substitui o <style>...</style> por um link para CSS local.
let html = input.slice(0, styleOpen);
html += '    <link rel="stylesheet" href="/src/style.css">';
html += input.slice(styleClose + '</style>'.length, scriptOpen);
// Substitui o <script>...</script> por import module.
html += '    <script type="module" src="/src/main.js"></script>\n';
html += input.slice(scriptClose + '</script>'.length);

// Garante que o output tenha <head> válido (inserção pode quebrar indentação)
ensureDir(path.dirname(OUT_CSS));
ensureDir(path.dirname(OUT_JS));

fs.writeFileSync(OUT_CSS, css, 'utf8');
fs.writeFileSync(OUT_JS, js, 'utf8');
fs.writeFileSync(OUT_HTML, html, 'utf8');

console.log('[extract] OK');
console.log(`[extract] index.html: ${path.relative(ROOT, OUT_HTML)}`);
console.log(`[extract] CSS: ${path.relative(ROOT, OUT_CSS)}`);
console.log(`[extract] JS: ${path.relative(ROOT, OUT_JS)}`);

