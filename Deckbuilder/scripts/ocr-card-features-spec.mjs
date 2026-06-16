import {
  classifyAttributeFromRgb,
  probeLevelRankStrip,
} from '../src/ocr-card-features.mjs';

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

ok(
  classifyAttributeFromRgb(155.8, 138.6, 111.5, 'Monstro Sincro') === 'LIGHT',
  'Sincro washed LIGHT not DARK'
);
ok(
  classifyAttributeFromRgb(157.3, 137.5, 114.6, 'Monstro Xyz') === 'DARK',
  'Xyz DARK unchanged'
);
ok(
  classifyAttributeFromRgb(168.3, 128.7, 134.6, 'Monstro Fusão') === 'DARK',
  'Fusão DARK unchanged'
);
ok(classifyAttributeFromRgb(152.1, 141.4, 121.7, 'Monstro Sincro') === 'LIGHT', 'Sincro cream LIGHT');

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 168;
    data[i + 1] = 132;
    data[i + 2] = 82;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 11; star++) {
    const x = 8 + star * 13;
    for (let y = 6; y < 34; y++) {
      const i = (y * w + x) * 4;
      data[i] = 210;
      data[i + 1] = 70;
      data[i + 2] = 55;
    }
  }
  const lr = probeLevelRankStrip(data, w, h, 'Monstro Sincro');
  ok(lr.kind === 'level', 'Sincro prefers level not rank');
  ok(lr.value != null && lr.value >= 1, 'Sincro level detected');
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
  ok(lr.kind === 'rank', 'Xyz rank kind');
  ok(lr.value === 4, 'Xyz rank 4 snap from 3 wash');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 192;
    data[i + 1] = 146;
    data[i + 2] = 92;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 3; star++) {
    const x = 24 + star * 42;
    for (let y = 8; y < 32; y++) {
      const i = (y * w + x) * 4;
      data[i] = 45;
      data[i + 1] = 42;
      data[i + 2] = 40;
    }
  }
  const lr = probeLevelRankStrip(data, w, h, 'Monstro Xyz');
  ok(lr.kind === 'rank', 'warm gold Xyz rank kind');
  ok(lr.value === 4, 'warm gold Xyz rank 2-3 snap to 4');
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
  ok(lr.kind === 'link' && lr.value === 4, 'Link wash 5 peaks snap to 4');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 168;
    data[i + 1] = 118;
    data[i + 2] = 168;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 8; star++) {
    const x = 6 + star * 18;
    for (let y = 6; y < 34; y++) {
      const i = (y * w + x) * 4;
      data[i] = 205;
      data[i + 1] = 88;
      data[i + 2] = 62;
    }
  }
  const lr = probeLevelRankStrip(data, w, h, 'Monstro Fusão');
  ok(lr.kind === 'level' && lr.value === 8, 'Fusão foil wash level 8 snap');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 168;
    data[i + 1] = 122;
    data[i + 2] = 78;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 3; star++) {
    const x = 14 + star * 16;
    for (let y = 8; y < 32; y++) {
      const i = (y * w + x) * 4;
      data[i] = 208;
      data[i + 1] = 78;
      data[i + 2] = 58;
    }
  }
  const lrVir = probeLevelRankStrip(data, w, h, 'Monstro Virar');
  ok(lrVir.kind === 'level' && lrVir.value === 9, 'Virar foil sparse 3 peaks snap to 9');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 168;
    data[i + 1] = 132;
    data[i + 2] = 82;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 12; star++) {
    const x = 4 + star * 12;
    for (let y = 6; y < 34; y++) {
      const i = (y * w + x) * 4;
      data[i] = 210;
      data[i + 1] = 70;
      data[i + 2] = 55;
    }
  }
  const lrSync = probeLevelRankStrip(data, w, h, 'Monstro Sincro');
  ok(lrSync.kind === 'level' && lrSync.value === 11, 'Sincro wash 12 peaks snap to 11');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 175;
    data[i + 1] = 128;
    data[i + 2] = 88;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 8; star++) {
    const x = 5 + star * 18;
    for (let y = 8; y < 30; y++) {
      const i = (y * w + x) * 4;
      data[i] = 198;
      data[i + 1] = 92;
      data[i + 2] = 58;
    }
  }
  const lrFus8 = probeLevelRankStrip(data, w, h, 'Monstro Fusão');
  ok(lrFus8.kind === 'level' && lrFus8.value === 8, 'Fusão foil sparse 8 stars warm snap');
}

{
  const w = 160;
  const h = 40;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 168;
    data[i + 1] = 122;
    data[i + 2] = 78;
    data[i + 3] = 255;
  }
  for (let star = 0; star < 10; star++) {
    const x = 4 + star * 15;
    for (let y = 6; y < 34; y++) {
      const i = (y * w + x) * 4;
      data[i] = 205;
      data[i + 1] = 88;
      data[i + 2] = 62;
    }
  }
  const lrFus8Over = probeLevelRankStrip(data, w, h, 'Monstro Fusão');
  ok(lrFus8Over.kind === 'level' && lrFus8Over.value === 8, 'Fusão foil 10 peaks overcount snap to 8');
}

console.log('ocr-card-features-spec: ok');
