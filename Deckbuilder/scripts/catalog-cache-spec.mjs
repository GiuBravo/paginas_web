/**
 * Especificações em Node para o ingest de metadados agregados do catálogo cardinfo.
 *
 * A função `ingestCardinfoRowsIntoAggSets` aqui deve espelhar a mesma lógica da função
 * homônima em `src/main.js`. Qualquer divergência indica regressão na persistência/cache.
 */

/**
 * Falha imediata se a condição for falsa — útil para asserts em script de teste.
 *
 * @param {boolean} cond Expressão que deve ser verdadeira.
 * @param {string} [msg='assert failed'] Mensagem de erro se `cond` for falsa (padrão: texto genérico).
 * @returns {void}
 */
function ok(cond, msg) {
  // Sem mensagem customizada, usa string fixa para facilitar grep em falhas.
  if (!cond) throw new Error(msg || 'assert failed');
}

/**
 * Agrega códigos de set, tipos de monstro, raças e raridades a partir de linhas cardinfo.
 * Mantém o mesmo comportamento que `ingestCardinfoRowsIntoAggSets` em `main.js`.
 *
 * @param {Array<object>} rows Linhas de cartas (formato API cardinfo).
 * @param {Set<string>} codes Acumula `set_code` normalizado em maiúsculas (trim).
 * @param {Set<string>} monsterTypes Acumula `type` de não-magia/armadilha/skill.
 * @param {Set<string>} monsterRaces Acumula `race` de monstros.
 * @param {Set<string>} spellRaces Acumula subtipo (`race`) de magias.
 * @param {Set<string>} trapRaces Acumula subtipo (`race`) de armadilhas.
 * @param {Set<string>} rarities Acumula `set_rarity` das entradas em `card_sets`.
 * @returns {void}
 */
function ingestCardinfoRowsIntoAggSets(
  rows,
  codes,
  monsterTypes,
  monsterRaces,
  spellRaces,
  trapRaces,
  rarities
) {
  // Percorre cada carta da lista sintética ou real.
  for (let i = 0; i < rows.length; i++) {
    const card = rows[i];
    const t = String(card.type || '').trim();
    // Ramifica por tipo de carta para popular conjuntos corretos.
    if (t === 'Spell Card') {
      // Magias: só spellRaces recebe race.
      if (card.race) spellRaces.add(String(card.race).trim());
    } else if (t === 'Trap Card') {
      // Armadilhas: só trapRaces.
      if (card.race) trapRaces.add(String(card.race).trim());
    } else if (t && t !== 'Skill Card') {
      // Monstros e outros tipos não filtrados acima (exceto Skill Card).
      monsterTypes.add(t);
      if (card.race) monsterRaces.add(String(card.race).trim());
    }
    const sets = card.card_sets;
    // Sem expansões listadas — nada a agregar de código/raridade.
    if (!sets || !sets.length) continue;
    for (let s = 0; s < sets.length; s++) {
      const cd = sets[s];
      const c = String(cd.set_code || '')
        .trim()
        .toUpperCase();
      // Código não vazio entra no Set de códigos.
      if (c) codes.add(c);
      const rar = String(cd.set_rarity || '').trim();
      if (rar) rarities.add(rar);
    }
  }
}

/**
 * Valida forma persistida dos agregados (schema, total_rows, TTL).
 *
 * @param {object} o Objeto desserializado do armazenamento.
 * @param {number} liveTotalRows Valor atual esperado de total de linhas no catálogo ao vivo.
 * @param {number} nowMs Timestamp atual em milissegundos (para checar idade máxima).
 * @returns {boolean} true se o payload é aceitável para uso.
 */
function validatePersistShape(o, liveTotalRows, nowMs) {
  const CARDINFO_AGG_SCHEMA = 3;
  const CARDINFO_CATALOG_NUM = 5000;
  const CARDINFO_AGG_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  // Versão do formato deve coincidir.
  if (o.schema !== CARDINFO_AGG_SCHEMA) return false;
  // Identificador de fatia do catálogo (constante de projeto).
  if (o.catalogNum !== CARDINFO_CATALOG_NUM) return false;
  // Total desatualizado invalida cache.
  if (o.totalRows !== liveTotalRows) return false;
  // Cache expirado por TTL.
  if (typeof o.builtAt !== 'number' || nowMs - o.builtAt > CARDINFO_AGG_MAX_AGE_MS) return false;
  // Todas as coleções devem ser arrays ao hidratar.
  return (
    Array.isArray(o.codes) &&
    Array.isArray(o.monsterTypes) &&
    Array.isArray(o.monsterRaces) &&
    Array.isArray(o.spellRaces) &&
    Array.isArray(o.trapRaces) &&
    Array.isArray(o.rarities)
  );
}

/**
 * Converte arrays persistidos de volta para Sets mutáveis em memória.
 *
 * @param {object} o Payload validado com arrays de strings.
 * @returns {{ codes: Set<string>, monsterTypes: Set<string>, monsterRaces: Set<string>, spellRaces: Set<string>, trapRaces: Set<string>, rarities: Set<string> }}
 */
function hydrateFromPayload(o) {
  return {
    codes: new Set(o.codes),
    monsterTypes: new Set(o.monsterTypes),
    monsterRaces: new Set(o.monsterRaces),
    spellRaces: new Set(o.spellRaces),
    trapRaces: new Set(o.trapRaces),
    rarities: new Set(o.rarities),
  };
}

/**
 * Executa cenários de teste cobrindo ingest e validação de persistência.
 *
 * @returns {void}
 */
function runCatalogCacheSpecs() {
  const codes = new Set();
  const monsterTypes = new Set();
  const monsterRaces = new Set();
  const spellRaces = new Set();
  const trapRaces = new Set();
  const rarities = new Set();
  ingestCardinfoRowsIntoAggSets(
    [
      {
        type: 'Effect Monster',
        race: 'Spellcaster',
        card_sets: [{ set_code: ' lob-en001 ', set_rarity: ' Ultra Rare ' }],
      },
      { type: 'Spell Card', race: 'Normal', card_sets: [] },
      { type: 'Trap Card', race: 'Counter', card_sets: [{ set_code: 'mrd-E', set_rarity: '' }] },
      { type: 'Skill Card', race: '', card_sets: [{ set_code: 'skip', set_rarity: 'Common' }] },
    ],
    codes,
    monsterTypes,
    monsterRaces,
    spellRaces,
    trapRaces,
    rarities
  );
  ok(monsterTypes.has('Effect Monster'), 'monsterTypes');
  ok(monsterRaces.has('Spellcaster'), 'monsterRaces');
  ok(spellRaces.has('Normal'), 'spellRaces');
  ok(trapRaces.has('Counter'), 'trapRaces');
  ok(codes.has('LOB-EN001'), 'set code upper/trim');
  ok(codes.has('MRD-E'), 'set code 2');
  ok(rarities.has('Ultra Rare'), 'rarity trim');
  ok(codes.has('SKIP'), 'Skill Card não entra em tipos/monstro mas `card_sets` agrega igual');
  ok(rarities.has('Common'), 'rarity na linha Skill');

  const now = Date.now();
  const payload = {
    schema: 3,
    catalogNum: 5000,
    totalRows: 9900,
    builtAt: now,
    codes: ['A'],
    monsterTypes: ['B'],
    monsterRaces: [],
    spellRaces: [],
    trapRaces: [],
    rarities: [],
  };
  ok(validatePersistShape(payload, 9900, now), 'persist shape accepts fresh');
  ok(!validatePersistShape(payload, 9901, now), 'total_rows mismatch rejects');
  const agg = hydrateFromPayload(JSON.parse(JSON.stringify(payload)));
  ok(agg.codes.has('A') && agg.monsterTypes.has('B'), 'hydrate Sets');
}

runCatalogCacheSpecs();
console.log('catalog-cache-spec: OK');
