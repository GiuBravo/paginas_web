/**
 * Especificações em Node para a função espelho de `cardDisplayedNameFingerprint`.
 *
 * Deve permanecer idêntica à implementação em `src/main.js` sob o mesmo nome.
 */

/**
 * Falha imediata se a condição for falsa.
 *
 * @param {boolean} cond Expressão que deve ser verdadeira.
 * @param {string} [msg='assert failed'] Mensagem personalizada da exceção (padrão: `'assert failed'`).
 * @returns {void}
 */
function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

/**
 * Gera uma “impressão digital” estável dos campos de nome da carta para invalidação de cache.
 *
 * @param {object|null|undefined} card Objeto carta da API ou valor ausente.
 * @returns {string} Três segmentos separados por `\0`: `name`, `name_en`, `name_pt`; string vazia se inválido.
 */
function cardDisplayedNameFingerprint(card) {
  // Objeto ausente ou tipo incorreto → fingerprint vazio.
  if (!card || typeof card !== 'object') return '';
  try {
    // Nullish coalescing garante undefined → '' sem falhar em propriedades ausentes.
    return `${String(card.name ?? '')}\0${String(card.name_en ?? '')}\0${String(card.name_pt ?? '')}`;
  } catch (_) {
    // Qualquer getter estranho ou Proxy defeituoso → fallback seguro.
    return '';
  }
}

// Carta nula deve produzir string vazia (sem separadores).
ok(cardDisplayedNameFingerprint(null) === '', 'null');
// Objeto vazio ainda gera três campos vazios delimitados por dois separadores `\0`.
ok(cardDisplayedNameFingerprint({}).split('\0').length === 3, 'três campos');

const sep = '\0';
const fp = cardDisplayedNameFingerprint({ name: 'A', name_en: '', name_pt: 'B' });
ok(fp === ['A', '', 'B'].join(sep), 'campos mistos');

console.log('card-text-cache-spec: OK');
