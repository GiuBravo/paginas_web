/**
 * @fileoverview Contagem simples de linhas do projeto (inclui docs).
 *
 * Nota: isto é uma métrica aproximada (conta linhas físicas). A intenção é dar um
 * número consistente para exibir no modal de créditos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {string} s
 * @returns {number}
 */
function countLines(s) {
  if (!s) return 0;
  // Mantém compatível com \n e \r\n. Se o arquivo não termina em \n, ainda conta a última linha.
  return String(s).split(/\r?\n/).length;
}

/**
 * @param {string} root
 * @param {string} relDir
 * @param {(relPath: string) => boolean} includeFile
 * @returns {string[]}
 */
/**
 * Conta linhas em ficheiros de código e documentação.
 *
 * Escopo: soma SOMENTE os arquivos abaixo (conforme pedido), ignorando qualquer outro
 * ficheiro (incluindo monolítico gerado, `old/`, etc.).
 *
 * - `index.html`
 * - `src/main.js`
 * - `src/style.css`
 * - `docs/CODING_STANDARDS.md`
 * - `docs/DOCUMENTACAO.md`
 * - `docs/INDEX_HTML.md`
 * - `docs/MAIN_JS.md`
 * - `docs/STYLE_CSS.md`
 *
 * @param {string} root Diretório raiz do projeto.
 * @returns {{ totalLines: number, files: string[] }}
 */
export function countProjectLinesWithDocs(root) {
  const r = root || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  /** @type {string[]} */
  const files = [
    'index.html',
    'src/main.js',
    'src/style.css',
    'docs/CODING_STANDARDS.md',
    'docs/DOCUMENTACAO.md',
    'docs/INDEX_HTML.md',
    'docs/MAIN_JS.md',
    'docs/STYLE_CSS.md',
  ];

  let totalLines = 0;
  for (const rel of files) {
    const abs = path.join(r, rel);
    try {
      const txt = fs.readFileSync(abs, 'utf8');
      totalLines += countLines(txt);
    } catch {
      // Se algum ficheiro falhar leitura, ignora para não quebrar o build.
    }
  }
  return { totalLines, files };
}

