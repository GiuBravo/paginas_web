/**
 * Testes de PAUSA HARD / Fase D (ocr-diag-analyze.mjs).
 * Execução: node scripts/ocr-diag-analyze-spec.mjs (via npm test).
 */
import {
  analyzeDiagSamples,
  computeSegmentMatchedPct,
  computeSegmentPhaseDPct,
  shouldHardPauseSegmentPhaseD,
  SEGMENT_D_HARD_PAUSE_MIN_SAMPLES,
  expectedBenchmarkPasscodeForSeq,
  countPhaseHCardsPass,
} from '../src/ocr-diag-analyze.mjs';

function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
}

ok(SEGMENT_D_HARD_PAUSE_MIN_SAMPLES === 8, 'hard pause min samples = 8');

function artOnlySample(seq, typeMerged, matchedId) {
  const passcode = expectedBenchmarkPasscodeForSeq(seq);
  return {
    seq,
    sampleKind: 'art_only',
    typeProbe: {
      classifiedTypeFromFrameOnly: typeMerged,
      classifiedTypeMerged: typeMerged,
    },
    artProbe: {
      artExpectedPasscode: passcode,
      matchedCardId: matchedId,
      topCandidates: matchedId ? [{ cardId: matchedId, distance: 8 }] : [],
      artBenchmarkDist: matchedId ? { [String(passcode)]: 8 } : {},
    },
    outcome: matchedId
      ? { matchSource: 'art', matchedCardId: matchedId, cleaned: `art:${matchedId}` }
      : {},
  };
}

{
  const brigrand = 34848821;
  const wrong = [];
  for (let seq = 0; seq < 8; seq++) {
    wrong.push(artOnlySample(seq, 'Monstro Xyz', brigrand));
  }
  const coreWrong = analyzeDiagSamples(wrong);
  ok(computeSegmentPhaseDPct(coreWrong, brigrand) === 0, 'stale Xyz probe → D 0%');
  ok(shouldHardPauseSegmentPhaseD(coreWrong, brigrand), 'hard pause when D 0% after 8 samples');
  ok(computeSegmentMatchedPct(coreWrong, brigrand) === 62, 'matched ~62% with correct art (8/13)');
}

{
  const brigrand = 34848821;
  const good = [];
  for (let seq = 0; seq < 8; seq++) {
    good.push(artOnlySample(seq, 'Monstro Fusão', brigrand));
  }
  const coreGood = analyzeDiagSamples(good);
  ok(computeSegmentPhaseDPct(coreGood, brigrand) === 100, 'benchmark hint type → D 100%');
  ok(!shouldHardPauseSegmentPhaseD(coreGood, brigrand), 'no hard pause when D 100%');
}

{
  const psychic = 60465049;
  const pipelineHit = (seq, name) => ({
    seq,
    sampleKind: 'pipeline',
    outcome: { cleaned: name, ocrEngine: 'tesseract' },
    robotStrip: { ocrPipelineName: name },
    artProbe: { artExpectedPasscode: expectedBenchmarkPasscodeForSeq(seq) },
  });
  ok(
    analyzeDiagSamples([pipelineHit(73, 'Psychic End Punisher')]).phaseHCount === 1,
    'Psychic EN name counts phase H'
  );
  ok(
    analyzeDiagSamples([pipelineHit(73, 'IPSYEC END PUNM')]).phaseHCount === 0,
    'Psychic garbled without PSYCHIC/PUNISHER does not pass H'
  );
  ok(
    analyzeDiagSamples([pipelineHit(73, 'Hordeum Maligno Cavaleiro Exciton')]).phaseHCount === 0,
    'Exciton name on Psychic segment rejected'
  );
  const phaseMap = analyzeDiagSamples([
    pipelineHit(11, 'Brigrand O Dragao Da Gloria'),
    pipelineHit(12, 'art:34848821'),
    pipelineHit(73, 'Psychic End Punisher'),
  ]).phaseH;
  ok(countPhaseHCardsPass(phaseMap) === 2, 'phase H cards pass counts distinct passcodes');
}

console.log('ocr-diag-analyze-spec: ok');
