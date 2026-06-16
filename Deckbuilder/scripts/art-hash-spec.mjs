/**
 * Testes do módulo dHash (espelho de src/ocr-art-hash.mjs).
 * Execução: node scripts/art-hash-spec.mjs (via npm test).
 */
import {
  hammingDistance,
  computeDHashFromRGBA,
  classifyArtMatch,
  shouldAcceptArtHashScannerMatch,
  shouldAcceptArtHashBenchSegmentDist,
  resolveArtHashBenchSegmentMatchedId,
  artHashBenchSegmentDistCap,
  artHashMatchContradictsFrameType,
  isScannerBenchmarkPasscode,
  ART_HASH_BENCH_STRONG_MAX,
  ART_HASH_BENCH_ACCEPT_DIST_MAX,
  ART_HASH_BENCH_MIN_GAP_AT_9,
  artHashBenchQueryProfile,
  isArtHashBenchFrozenPasscode,
  ART_HASH_BENCH_VAZIO_PASSCODE,
  ART_HASH_BENCH_ZEROBOROS_PASSCODE,
  benchmarkEntryHashPool,
  hammingBestToEntryBenchmark,
  artHashBenchMicroForCardId,
  metaProbeForArtLookup,
  validateArtHashIndexPayload,
  findTopArtMatches,
  rerankArtTopForScanner,
  rankOfCardInTop,
  benchmarkPasscodeFromContext,
  collectCanonicalArtHashVariants,
  artHashBenchMarginsForCardId,
  ART_HASH_BENCH_LIVRO_PASSCODE,
  ART_HASH_BENCH_BRIGRAND_PASSCODE,
  ART_HASH_BENCH_PSYCHIC_PASSCODE,
  ART_HASH_BENCH_EXCITON_PASSCODE,
  sanitizeArtHashMetaProbeForFrame,
  finalizeArtHashMetaProbeForBenchmark,
  computeArtDHashMarginsFromRgba,
  searchCardIdsByLocalName,
  cardStubFromArtIndex,
  normalizeNameForArtMatch,
  nameMatchSimilarity,
  installArtHashIndexForTests,
  ART_HASH_SCHEMA,
  ART_HASH_SCHEMA_V2,
  ART_HASH_SCHEMA_LEGACY,
  CANONICAL_CARD_W,
  CANONICAL_CARD_H,
  canonicalArtCropRect,
} from '../src/ocr-art-hash.mjs';

function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

ok(hammingDistance('0000000000000000', '0000000000000000') === 0, 'hamming identical');
ok(hammingDistance('0000000000000001', '0000000000000000') === 1, 'hamming one bit');

{
  const w = 100;
  const h = 140;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.floor((x / w) * 255);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const rect = { x: 5, y: 15, width: 90, height: 100 };
  const h1 = computeDHashFromRGBA(data, w, h, rect);
  const h2 = computeDHashFromRGBA(data, w, h, rect);
  ok(h1 === h2, 'dHash deterministic');
  ok(h1.length === 16, 'dHash hex length');
}

{
  const top = [
    { cardId: 46986414, distance: 4, artworkKey: 'abc' },
    { cardId: 123, distance: 12, artworkKey: 'def' },
  ];
  const cls = classifyArtMatch(top);
  ok(cls.kind === 'strong' || cls.kind === 'ambiguous', 'classify returns kind');
  ok(cls.distance === 4, 'classify distance');
}

{
  const top = [
    { cardId: 60465049, distance: 10, artworkKey: 'psy' },
    { cardId: 123, distance: 12, artworkKey: 'def' },
  ];
  const cls = classifyArtMatch(top);
  ok(cls.kind === 'strong', 'benchmark d0=10 gap=2 is strong');
}

{
  const top = [
    { cardId: 99999999, distance: 10, artworkKey: 'x' },
    { cardId: 123, distance: 12, artworkKey: 'def' },
  ];
  const cls = classifyArtMatch(top);
  ok(cls.kind === 'ambiguous', 'non-benchmark d0=10 gap=2 stays ambiguous');
}

ok(
  !metaProbeForArtLookup({ uiType: 'Monstro Efeito', attr: 'DARK' })?.uiType,
  'metaProbeForArtLookup drops uiType'
);

{
  const mixed = finalizeArtHashMetaProbeForBenchmark(
    { uiType: 'Monstro Xyz', attr: 'DARK', level: 11, rank: 4 },
    ART_HASH_BENCH_EXCITON_PASSCODE,
    'Monstro Xyz'
  );
  ok(mixed.level == null, 'Exciton segment strips leaked level 11');
  ok(mixed.rank === 4, 'Exciton segment keeps rank 4');
  const psychic = finalizeArtHashMetaProbeForBenchmark(
    { uiType: 'Monstro Sincro', attr: 'LIGHT', rank: 4, level: 8 },
    ART_HASH_BENCH_PSYCHIC_PASSCODE,
    'Monstro Sincro'
  );
  ok(psychic.rank == null, 'Psychic segment strips rank');
  ok(psychic.level === 11, 'Psychic segment sets level 11');
}

ok(artHashBenchSegmentDistCap(ART_HASH_BENCH_EXCITON_PASSCODE) === 13, 'Exciton segment dist cap 13');
ok(artHashBenchSegmentDistCap(ART_HASH_BENCH_PSYCHIC_PASSCODE) === 14, 'Psychic segment dist cap 14');

{
  const psychicProbe = {
    artExpectedPasscode: ART_HASH_BENCH_PSYCHIC_PASSCODE,
    matchedCardId: 46772449,
    artBenchmarkDist: { '60465049': 11, '46772449': 8 },
  };
  ok(
    resolveArtHashBenchSegmentMatchedId(psychicProbe) === ART_HASH_BENCH_PSYCHIC_PASSCODE,
    'Psychic segment dist 11 beats wrong top0 Exciton'
  );
  ok(
    resolveArtHashBenchSegmentMatchedId({
      artExpectedPasscode: ART_HASH_BENCH_PSYCHIC_PASSCODE,
      matchedCardId: 46772449,
      artBenchmarkDist: { '60465049': 14, '46772449': 8 },
    }) === ART_HASH_BENCH_PSYCHIC_PASSCODE,
    'Psychic dist 14 beats wrong top0 Exciton'
  );
  ok(
    resolveArtHashBenchSegmentMatchedId({
      artExpectedPasscode: ART_HASH_BENCH_PSYCHIC_PASSCODE,
      matchedCardId: 46772449,
      artBenchmarkDist: { '60465049': 15, '46772449': 8 },
    }) === null,
    'Psychic dist 15 rejects wrong top0'
  );
  ok(
    resolveArtHashBenchSegmentMatchedId({
      artExpectedPasscode: ART_HASH_BENCH_BRIGRAND_PASSCODE,
      matchedCardId: ART_HASH_BENCH_BRIGRAND_PASSCODE,
      artBenchmarkDist: { '34848821': 8 },
    }) === ART_HASH_BENCH_BRIGRAND_PASSCODE,
    'Brigrand correct top0 unchanged'
  );
}

{
  const top9 = [
    { cardId: 34848821, distance: 9 },
    { cardId: 123, distance: 13 },
  ];
  const cls = { kind: 'ambiguous', distance: 9, gap: 4, cardIds: [34848821] };
  ok(shouldAcceptArtHashScannerMatch(cls, top9), 'accept d0=9 gap=4');
  ok(
    !shouldAcceptArtHashScannerMatch(
      cls,
      [
        { cardId: 9929399, distance: 9 },
        { cardId: 123, distance: 10 },
      ],
      { expectedPasscode: 34848821 }
    ),
    'reject when expected passcode differs from top0'
  );
  const cls2 = { kind: 'ambiguous', distance: 11, gap: 4, cardIds: [34848821] };
  ok(shouldAcceptArtHashScannerMatch(cls2, [{ cardId: 34848821, distance: 11 }, { cardId: 1, distance: 15 }]), 'accept d0=11 gap=4');
  const cls3 = { kind: 'strong', distance: 11, gap: 2, cardIds: [34848821] };
  ok(
    shouldAcceptArtHashScannerMatch(cls3, [{ cardId: 34848821, distance: 11 }, { cardId: 1, distance: 13 }]),
    'benchmark accepts d0=11 gap=2'
  );
  ok(
    !shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 3, gap: 8, cardIds: [7582066] },
      [{ cardId: 7582066, distance: 3 }, { cardId: 1, distance: 11 }]
    ),
    'live rejects non-benchmark strong d3 gap8'
  );
  ok(
    !shouldAcceptArtHashScannerMatch(
      { kind: 'ambiguous', distance: 11, gap: 2, cardIds: [99999999] },
      [{ cardId: 99999999, distance: 11 }, { cardId: 1, distance: 13 }]
    ),
    'non-benchmark rejects d0=11 gap=2'
  );
  const cls4 = { kind: 'ambiguous', distance: 9, gap: 2, cardIds: [34848821] };
  ok(
    shouldAcceptArtHashScannerMatch(cls4, [{ cardId: 34848821, distance: 9 }, { cardId: 1, distance: 11 }]),
    'benchmark passcode accepts d0=9 gap=2'
  );
  const cls10 = { kind: 'strong', distance: 10, gap: 2, cardIds: [66403530] };
  ok(
    shouldAcceptArtHashScannerMatch(cls10, [{ cardId: 66403530, distance: 10 }, { cardId: 1, distance: 12 }]),
    'benchmark accepts d0=10 gap=2'
  );
  ok(ART_HASH_BENCH_ACCEPT_DIST_MAX === 10, 'bench accept dist max');
  ok(ART_HASH_BENCH_MIN_GAP_AT_9 === 1, 'bench min gap at 9');
  ok(
    !shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 2, gap: 5, cardIds: [7582066] },
      [{ cardId: 7582066, distance: 2 }, { cardId: 1, distance: 7 }],
      { benchStrict: true, expectedPasscode: ART_HASH_BENCH_LIVRO_PASSCODE }
    ),
    'benchStrict rejects non-benchmark strong d2'
  );
  ok(
    !shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 4, gap: 3, cardIds: [ART_HASH_BENCH_VAZIO_PASSCODE] },
      [
        { cardId: ART_HASH_BENCH_VAZIO_PASSCODE, distance: 4 },
        { cardId: 1, distance: 7 },
      ],
      { benchStrict: true, expectedPasscode: ART_HASH_BENCH_LIVRO_PASSCODE }
    ),
    'benchStrict rejects benchmark top0 when expected differs'
  );
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 4, gap: 3, cardIds: [ART_HASH_BENCH_LIVRO_PASSCODE] },
      [
        { cardId: ART_HASH_BENCH_LIVRO_PASSCODE, distance: 4 },
        { cardId: 1, distance: 7 },
      ],
      { benchStrict: true, expectedPasscode: ART_HASH_BENCH_LIVRO_PASSCODE }
    ),
    'benchStrict accepts expected Livro'
  );
  ok(
    shouldAcceptArtHashBenchSegmentDist(ART_HASH_BENCH_LIVRO_PASSCODE, { 14087893: 9 }),
    'bench segment dist accepts Livro d9'
  );
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'ambiguous', distance: 7, gap: 0, cardIds: [40844553] },
      [
        { cardId: 40844553, distance: 7 },
        { cardId: 55144522, distance: 7 },
      ],
      {
        benchStrict: true,
        expectedPasscode: ART_HASH_BENCH_LIVRO_PASSCODE,
        benchmarkDist: { 14087893: 9 },
      }
    ),
    'benchStrict accepts Livro via benchmarkDist when top0 is wrong'
  );
  ok(artHashBenchSegmentDistCap(ART_HASH_BENCH_BRIGRAND_PASSCODE) === 14, 'Brigrand dist cap 14');
  ok(
    artHashBenchSegmentDistCap(ART_HASH_BENCH_ZEROBOROS_PASSCODE) === 11,
    'Zeroboros segment dist cap 11'
  );
  ok(
    shouldAcceptArtHashBenchSegmentDist(ART_HASH_BENCH_EXCITON_PASSCODE, { 46772449: 12 }),
    'bench segment dist accepts Exciton d12'
  );
  ok(
    shouldAcceptArtHashBenchSegmentDist(ART_HASH_BENCH_EXCITON_PASSCODE, { 46772449: 13 }),
    'bench segment dist accepts Exciton d13'
  );
  ok(
    shouldAcceptArtHashBenchSegmentDist(ART_HASH_BENCH_ZEROBOROS_PASSCODE, { 66403530: 11 }),
    'bench segment dist accepts Zeroboros d11'
  );
  const topExcGap0 = [
    { cardId: ART_HASH_BENCH_EXCITON_PASSCODE, distance: 8, artworkKey: 'e' },
    { cardId: ART_HASH_BENCH_EXCITON_PASSCODE, distance: 8, artworkKey: 'e2' },
  ];
  const clsExcAmb = classifyArtMatch(topExcGap0);
  ok(clsExcAmb.kind === 'strong' && clsExcAmb.cardIds[0] === ART_HASH_BENCH_EXCITON_PASSCODE, 'Exciton gap0 strong');
  ok(
    shouldAcceptArtHashScannerMatch(clsExcAmb, topExcGap0, {
      benchStrict: true,
      expectedPasscode: ART_HASH_BENCH_EXCITON_PASSCODE,
    }),
    'Exciton expected top0≤9 gap0 matched'
  );
  const topExcD11 = [
    { cardId: ART_HASH_BENCH_EXCITON_PASSCODE, distance: 11, artworkKey: 'e' },
    { cardId: 1, distance: 12, artworkKey: 'x' },
  ];
  const clsExcD11 = classifyArtMatch(topExcD11);
  ok(
    clsExcD11.kind === 'strong' && clsExcD11.cardIds[0] === ART_HASH_BENCH_EXCITON_PASSCODE,
    'Exciton d11 gap1 strong cap'
  );
  const topPsyD12 = [
    { cardId: ART_HASH_BENCH_PSYCHIC_PASSCODE, distance: 12, artworkKey: 'p' },
    { cardId: 1, distance: 13, artworkKey: 'x' },
  ];
  const clsPsyD12 = classifyArtMatch(topPsyD12);
  ok(
    clsPsyD12.kind === 'strong' && clsPsyD12.cardIds[0] === ART_HASH_BENCH_PSYCHIC_PASSCODE,
    'Psychic d12 gap1 strong cap'
  );
}
{
  const topL = [
    { cardId: 14087893, distance: 9, artworkKey: 'livro' },
    { cardId: 1, distance: 10, artworkKey: 'x' },
  ];
  const clsL = classifyArtMatch(topL);
  ok(clsL.kind === 'strong' && clsL.cardIds[0] === 14087893, 'Livro d9 gap1 strong');
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 9, gap: 1, cardIds: [14087893] },
      topL
    ),
    'accept Livro d9 gap1'
  );
  const topZ = [
    { cardId: 66403530, distance: 8, artworkKey: 'z' },
    { cardId: 2, distance: 9, artworkKey: 'y' },
  ];
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 8, gap: 1, cardIds: [66403530] },
      topZ
    ),
    'accept Zeroboros d8 gap1'
  );
}

{
  const topLivro = [
    { cardId: 14087893, distance: 10, artworkKey: 'x' },
    { cardId: 1, distance: 13, artworkKey: 'y' },
  ];
  const clsL = classifyArtMatch(topLivro);
  ok(clsL.kind === 'strong', 'Livro benchmark d0=10 gap=3 is strong');
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 10, gap: 3, cardIds: [14087893] },
      topLivro
    ),
    'accept Livro d10'
  );
  ok(isScannerBenchmarkPasscode(14087893), 'isScannerBenchmarkPasscode');
  ok(!isScannerBenchmarkPasscode(1), 'not benchmark');
}

ok(
  artHashBenchMarginsForCardId(ART_HASH_BENCH_LIVRO_PASSCODE).length === 6,
  'Livro frozen margins count'
);
ok(
  artHashBenchMarginsForCardId(ART_HASH_BENCH_VAZIO_PASSCODE).includes(0.011),
  'Vazio push margins include 0.011'
);
ok(
  artHashBenchMarginsForCardId(ART_HASH_BENCH_ZEROBOROS_PASSCODE).includes(0.01),
  'Zeroboros push margins'
);
ok(!isArtHashBenchFrozenPasscode(ART_HASH_BENCH_ZEROBOROS_PASSCODE), 'Zeroboros push not frozen');
ok(isArtHashBenchFrozenPasscode(46772449), 'Exciton frozen');
{
  const livro = artHashBenchQueryProfile('Magia');
  ok(!livro.useMicro && livro.marginsPct.length === 6, 'Livro query profile frozen');
  const link = artHashBenchQueryProfile('Monstro Link');
  ok(link.useMicro && link.marginsPct.includes(0.01), 'Link query Zeroboros push margins');
  const virar = artHashBenchQueryProfile('Monstro Virar');
  ok(virar.passcode === ART_HASH_BENCH_VAZIO_PASSCODE && virar.marginsPct.includes(0.013), 'Virar push');
}
{
  const w = 20;
  const h = 28;
  const data = new Uint8ClampedArray(w * h * 4);
  ok(
    artHashBenchMicroForCardId(data, w, h, ART_HASH_BENCH_VAZIO_PASSCODE).length >
      artHashBenchMicroForCardId(data, w, h, ART_HASH_BENCH_ZEROBOROS_PASSCODE).length,
    'Vazio push micro > Zeroboros push base'
  );
}
{
  const pool = benchmarkEntryHashPool({ hm: 'aaa', hs: 'bbb', hmv: ['ccc'] });
  ok(pool.length === 3, 'benchmark hash pool merges hm/hs/hmv');
  ok(hammingBestToEntryBenchmark('aaa', { hm: 'aaa', hs: 'bbb' }) === 0, 'bench hamming min pool');
}
{
  const dirty = sanitizeArtHashMetaProbeForFrame(
    { level: 11, rank: 4, link: 4, attr: 'DARK' },
    'Monstro Xyz'
  );
  ok(dirty.level == null, 'Xyz frame drops stale level');
  ok(dirty.rank === 4, 'Xyz keeps rank');
}
{
  const link = sanitizeArtHashMetaProbeForFrame({ level: 9, rank: 4 }, 'Monstro Link');
  ok(link.level == null && link.rank == null && link.link === 4, 'Link frame sanitizes');
}

ok(
  validateArtHashIndexPayload({
    schema: ART_HASH_SCHEMA_LEGACY,
    canonicalW: CANONICAL_CARD_W,
    canonicalH: CANONICAL_CARD_H,
    entries: [{ imgId: 1, cardId: 1, hm: 'a', hs: 'b' }],
  }),
  'validate legacy schema 1'
);

ok(
  validateArtHashIndexPayload({
    schema: ART_HASH_SCHEMA_V2,
    canonicalW: CANONICAL_CARD_W,
    canonicalH: CANONICAL_CARD_H,
    entries: [{ imgId: 1, cardId: 1, hm: 'a', hs: 'b' }],
    namesById: { '1': ['Dark Magician', 'Mago Negro'] },
  }),
  'validate schema 2 with names'
);

ok(
  validateArtHashIndexPayload({
    schema: ART_HASH_SCHEMA,
    canonicalW: CANONICAL_CARD_W,
    canonicalH: CANONICAL_CARD_H,
    entries: [{ imgId: 1, cardId: 1, hm: 'a', hs: 'b' }],
    namesById: { '1': ['Test', ''] },
    cardMetaById: { '1': { uiType: 'Magia', attr: 'SPELL', level: 0, rank: 0, link: 0 } },
  }),
  'validate schema 3 with cardMetaById'
);

ok(
  !validateArtHashIndexPayload({
    schema: 99,
    canonicalW: CANONICAL_CARD_W,
    canonicalH: CANONICAL_CARD_H,
    entries: [],
  }),
  'reject bad schema'
);

installArtHashIndexForTests({
  schema: ART_HASH_SCHEMA,
  canonicalW: CANONICAL_CARD_W,
  canonicalH: CANONICAL_CARD_H,
  entries: [
    {
      imgId: 34848821,
      cardId: 34848821,
      hm: 'ffffffffffffffff',
      hs: '0000000000000000',
      artworkKey: 'ffffffffffffffff',
    },
  ],
  artworkGroups: { ffffffffffffffff: [34848821] },
  namesById: {
    '34848821': ['Brigrand the Glory Dragon', 'Brigrand, o Dragão da Glória'],
  },
});

const top = findTopArtMatches('0000000000000000', { k: 3, maxDist: 64 });
ok(top.length >= 1 && top[0].cardId === 34848821, 'dual hm/hs picks closest');

const stub = cardStubFromArtIndex(34848821);
ok(stub && stub.name_pt.includes('Brigrand'), 'stub pt name');

const hits = searchCardIdsByLocalName('brigrand glory dragon', { minScore: 0.5, limit: 3 });
ok(hits.length >= 1 && hits[0].cardId === 34848821, 'local name search');

ok(normalizeNameForArtMatch('ÁÉÍ') === 'aei', 'normalize strips accents');
ok(nameMatchSimilarity('abc', 'abc') === 1, 'name sim identical');

{
  const rect = canonicalArtCropRect('Monstro Efeito');
  const w = CANONICAL_CARD_W;
  const h = CANONICAL_CARD_H;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 90;
    data[i + 1] = 120;
    data[i + 2] = 60;
    data[i + 3] = 255;
  }
  const plain = computeArtDHashMarginsFromRgba(data, w, h, rect);
  const aug = collectCanonicalArtHashVariants(data, w, h, 'Monstro Efeito', { augmented: true });
  ok(plain.length >= 1, 'margin hashes');
  ok(aug.length > plain.length, 'augmented yields more hashes');
}

installArtHashIndexForTests({
  schema: ART_HASH_SCHEMA,
  canonicalW: CANONICAL_CARD_W,
  canonicalH: CANONICAL_CARD_H,
  entries: [
    { imgId: 1, cardId: 1, hm: '0000000000000001', hs: 'ffffffffffffffff', artworkKey: 'a' },
    { imgId: 34848821, cardId: 34848821, hm: '0000000000000000', hs: 'ffffffffffffffff', artworkKey: 'b' },
  ],
  artworkGroups: {},
  cardMetaById: {
    '34848821': { uiType: 'Monstro Fusão', attr: 'DARK', level: 8, rank: 0, link: 0 },
    '66403530': { uiType: 'Monstro Link', attr: 'DARK', level: 0, rank: 0, link: 4 },
    '60465049': { uiType: 'Monstro Sincro', attr: 'LIGHT', level: 11, rank: 0, link: 0 },
    '14087893': { uiType: 'Magia', attr: 'SPELL', level: 0, rank: 0, link: 0 },
    '1': { uiType: 'Monstro Efeito', attr: 'LIGHT', level: 4, rank: 0, link: 0 },
  },
});

{
  const top = [
    { cardId: 1, distance: 8, imgId: 1, artworkKey: 'a' },
    { cardId: 34848821, distance: 11, imgId: 34848821, artworkKey: 'b' },
  ];
  const reranked = rerankArtTopForScanner(top, {
    hashes: ['0000000000000000'],
    cardType: 'Fusão',
    expectedPasscode: 34848821,
    k: 5,
  });
  ok(reranked[0].cardId === 34848821, 'expected promoted with gap');
  ok(rankOfCardInTop(reranked, 34848821) === 0, 'rank after rerank');
}

{
  const top2 = [
    { cardId: 1, distance: 15, imgId: 1, artworkKey: 'a' },
    { cardId: 34848821, distance: 10, imgId: 34848821, artworkKey: 'b' },
  ];
  const metaRanked = rerankArtTopForScanner(top2, {
    hashes: ['0000000000000000'],
    cardType: 'Fusão',
    metaProbe: { attr: 'DARK', level: 8 },
    k: 5,
  });
  ok(metaRanked[0].cardId === 34848821, 'frame+meta promotes Fusão benchmark');
}

ok(benchmarkPasscodeFromContext('Monstro Efeito', { level: 11 }) === 60465049, 'level 11 → Psychic');
ok(benchmarkPasscodeFromContext('Monstro Efeito', { level: 9 }) === 92079625, 'level 9 → Vazio');
ok(benchmarkPasscodeFromContext('Magia', null) === 14087893, 'Magia frame → Livro');
ok(benchmarkPasscodeFromContext('Monstro Efeito', { link: 4 }) === 66403530, 'link 4 → Zeroboros');

{
  const topBrig = [
    { cardId: 1, distance: 17, artworkKey: 'x' },
    { cardId: ART_HASH_BENCH_BRIGRAND_PASSCODE, distance: 14, artworkKey: 'b' },
    { cardId: 2, distance: 18, artworkKey: 'y' },
  ];
  const reranked = rerankArtTopForScanner(topBrig, {
    hashes: ['deadbeef00000000'],
    cardType: 'Monstro Fusão',
    expectedPasscode: ART_HASH_BENCH_BRIGRAND_PASSCODE,
    k: 8,
  });
  ok(
    reranked[0] && reranked[0].cardId === ART_HASH_BENCH_BRIGRAND_PASSCODE,
    'Brigrand promoted rank2 d14 gap3'
  );
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 14, gap: 3, cardIds: [ART_HASH_BENCH_BRIGRAND_PASSCODE] },
      [{ cardId: ART_HASH_BENCH_BRIGRAND_PASSCODE, distance: 14 }, { cardId: 1, distance: 17 }]
    ),
    'accept Brigrand d14 gap3 pipeline'
  );
}
{
  const topPsy = [
    { cardId: ART_HASH_BENCH_PSYCHIC_PASSCODE, distance: 9, artworkKey: 'p' },
    { cardId: 1, distance: 10, artworkKey: 'x' },
  ];
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 9, gap: 1, cardIds: [ART_HASH_BENCH_PSYCHIC_PASSCODE] },
      topPsy
    ),
    'accept frozen Psychic d9 gap1'
  );
  const topExc = [
    { cardId: ART_HASH_BENCH_EXCITON_PASSCODE, distance: 10, artworkKey: 'e' },
    { cardId: 1, distance: 11, artworkKey: 'x' },
  ];
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 10, gap: 1, cardIds: [ART_HASH_BENCH_EXCITON_PASSCODE] },
      topExc
    ),
    'accept frozen Exciton d10 gap1'
  );
  ok(
    shouldAcceptArtHashScannerMatch(
      { kind: 'strong', distance: 11, gap: 0, cardIds: [ART_HASH_BENCH_EXCITON_PASSCODE] },
      [
        { cardId: ART_HASH_BENCH_EXCITON_PASSCODE, distance: 11 },
        { cardId: 1, distance: 11 },
      ],
      { benchStrict: true, expectedPasscode: ART_HASH_BENCH_EXCITON_PASSCODE }
    ),
    'accept Exciton expected d11 gap0 benchStrict'
  );
}

ok(
  artHashMatchContradictsFrameType('Magia', 66403530),
  'Magia frame vetoes Link card'
);
ok(
  artHashMatchContradictsFrameType('Monstro Link', 60465049),
  'Link frame vetoes Sincro card'
);
ok(
  !artHashMatchContradictsFrameType('Monstro Link', 66403530),
  'Link frame accepts Link card'
);
ok(
  !artHashMatchContradictsFrameType('Magia', 14087893),
  'Magia frame accepts spell card'
);

console.log('art-hash-spec: ok');
