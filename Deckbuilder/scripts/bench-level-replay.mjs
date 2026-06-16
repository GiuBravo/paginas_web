/**
 * Sanity replay probeLevelRankStrip (sintético + link snap).
 * Validação real: coleta ZIP + analyze-ocr-diagnostics.mjs
 */
import { probeLevelRankStrip } from '../src/ocr-card-features.mjs';

let ok = 0;
let total = 0;

function check(label, cond) {
  total++;
  if (cond) ok++;
  console.log(`${cond ? 'OK' : 'FAIL'} ${label}`);
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 160;
    data[i + 1] = 119;
    data[i + 2] = 75;
    data[i + 3] = 255;
  }
  for (let arrow = 0; arrow < 5; arrow++) {
    const x = 30 + arrow * 24;
    for (let y = 4; y < 14; y++) {
      const i = (y * w + x) * 4;
      data[i] = 215;
      data[i + 1] = 72;
      data[i + 2] = 58;
    }
  }
  const lr = probeLevelRankStrip(data, w, h, 'Monstro Link');
  check('Zeroboros link 5 peaks → 4', lr.kind === 'link' && lr.value === 4);
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 165;
    data[i + 1] = 118;
    data[i + 2] = 76;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 4; star++) {
    const x = 20 + star * 28;
    for (let y = 8; y < 32; y++) {
      const i = (y * w + x) * 4;
      data[i] = 45;
      data[i + 1] = 42;
      data[i + 2] = 40;
    }
  }
  const lr = probeLevelRankStrip(data, w, h, 'Monstro Xyz');
  check('Exciton rank model 4', lr.kind === 'rank' && lr.value === 4);
}

console.log(`\nReplay: ${ok}/${total}`);
process.exit(ok === total ? 0 : 1);
