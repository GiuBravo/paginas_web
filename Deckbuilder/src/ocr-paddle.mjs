/**
 * Motor OCR Paddle (eSearch-OCR + onnxruntime-web) para faixa do nome — só reconhecimento (rec).
 * Modelos em `/ocr-models/en/en/` (release eSearch-OCR 4.0.0).
 */
const ESEARCH_OCR_CDN = 'https://cdn.jsdelivr.net/npm/esearch-ocr@8.5.0/dist/esearch-ocr.js';
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.mjs';
const ORT_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

const REC_MODEL_URL = '/ocr-models/en/en/en_PP-OCRv3_rec_infer.onnx';
const REC_DICT_URL = '/ocr-models/en/en/en_dict.txt';

/** @type {null|{ rec: (boxes: unknown) => Promise<{ text: string, mean: number }[]> }>} */
let paddleRecEngine = null;
/** @type {Promise<object>|null} */
let ocrLibPromise = null;
/** @type {Promise<void>|null} */
let paddleInitPromise = null;
let paddleInitError = null;

/**
 * @returns {Promise<object>}
 */
async function loadOcrLib() {
  if (!ocrLibPromise) {
    ocrLibPromise = import(/* @vite-ignore */ ESEARCH_OCR_CDN);
  }
  return ocrLibPromise;
}

/**
 * @returns {Promise<object>}
 */
async function loadOrt() {
  const ort = await import(/* @vite-ignore */ ORT_CDN);
  if (ort.env && ort.env.wasm) {
    ort.env.wasm.wasmPaths = ORT_WASM_BASE;
    ort.env.wasm.numThreads = 1;
  }
  return ort;
}

/**
 * @param {string} url
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchArrayBuffer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.arrayBuffer();
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.text();
}

/**
 * Inicializa rec ONNX (inglês) uma vez por sessão.
 * @returns {Promise<boolean>} `true` se pronto.
 */
export async function initPaddleOcrRec() {
  if (paddleRecEngine) return true;
  if (paddleInitError) return false;
  if (!paddleInitPromise) {
    paddleInitPromise = (async () => {
      const [ocr, ort] = await Promise.all([loadOcrLib(), loadOrt()]);
      const [recBuf, decodeDic] = await Promise.all([
        fetchArrayBuffer(REC_MODEL_URL),
        fetchText(REC_DICT_URL),
      ]);
      paddleRecEngine = await ocr.initRec({
        ort,
        input: recBuf,
        decodeDic,
        optimize: { space: false },
      });
    })().catch((err) => {
      paddleInitError = err;
      paddleInitPromise = null;
      throw err;
    });
  }
  try {
    await paddleInitPromise;
    return true;
  } catch {
    return false;
  }
}

export function isPaddleOcrReady() {
  return !!paddleRecEngine;
}

export function getPaddleOcrInitError() {
  return paddleInitError;
}

/**
 * Nova sessão do scanner: permite novo `init` se o motor ainda não existe.
 * @returns {void}
 */
export function syncPaddleOcrSessionStart() {
  if (paddleRecEngine) return;
  paddleInitError = null;
  paddleInitPromise = null;
}

/**
 * Reconhece texto num canvas (faixa do nome já pré-processada).
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ text: string, confidence: number, allText?: string }|null>}
 */
export async function paddleRecognizeCanvas(canvas) {
  if (!paddleRecEngine) {
    const ok = await initPaddleOcrRec();
    if (!ok) return null;
  }
  const ocr = await loadOcrLib();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const boxes = ocr.warpDet(img);
  const lines = await paddleRecEngine.rec(boxes);
  if (!lines || !lines.length) return null;
  let best = lines[0];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].mean > best.mean) best = lines[i];
  }
  const text = String(best.text || '').trim();
  const confidence = typeof best.mean === 'number' ? Math.min(100, Math.max(0, best.mean * 100)) : 0;
  if (!text) return null;
  const allText = lines
    .map((l) => String(l.text || '').trim())
    .filter(Boolean)
    .join(' ');
  return { text, confidence, allText };
}

/**
 * Reconhece passcode (dígitos matte de baixa confiança). O `rec` normal descarta linhas com
 * mean < 0.5 — os dígitos borrados na warp ficam tipicamente a 0.15–0.45 e nunca aparecem.
 * Usa `rawRec` e aplica um limiar baixo (0.12) só para o passcode.
 * @param {HTMLCanvasElement} canvas
 * @param {{ minMean?: number }} [opts]
 * @returns {Promise<{ text: string, confidence: number, allText: string }|null>}
 */
export async function paddleRecognizePasscodeCanvas(canvas, opts = {}) {
  if (!paddleRecEngine) {
    const ok = await initPaddleOcrRec();
    if (!ok) return null;
  }
  const ocr = await loadOcrLib();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const boxes = ocr.warpDet(img);
  const minMean = typeof opts.minMean === 'number' ? opts.minMean : 0.12;
  const rawLines = await paddleRecEngine.rawRec(boxes, { topK: 2, threshold: 1e-5 });
  if (!rawLines || !rawLines.length) return null;
  const parsed = [];
  for (const line of rawLines) {
    const chars = line.text || [];
    if (!chars.length) continue;
    const picked = chars.map((b) =>
      b[0] && b[0].t === '' && b[1] && b[1].t === ' ' && b[1].mean > 1e-3 ? b[1] : b[0]
    );
    const text = picked
      .map((b) => (b && b.t != null ? String(b.t) : ''))
      .join('')
      .trim();
    const mean =
      picked.reduce((s, b) => s + (b && typeof b.mean === 'number' ? b.mean : 0), 0) / picked.length;
    if (text && mean >= minMean) parsed.push({ text, mean });
  }
  if (!parsed.length) return null;
  parsed.sort((a, b) => b.mean - a.mean);
  const best = parsed[0];
  const allText = parsed
    .map((p) => p.text)
    .filter(Boolean)
    .join(' ');
  const confidence = Math.min(100, Math.max(0, best.mean * 100));
  return { text: best.text, confidence, allText };
}

/**
 * Dispositivo provavelmente fraco ou mobile — preferir menos inferência pesada.
 * @returns {boolean}
 */
export function ocrPreferLightweightDevice() {
  try {
    const dm = navigator.deviceMemory;
    if (typeof dm === 'number' && dm > 0 && dm < 4) return true;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    return coarse && narrow;
  } catch {
    return false;
  }
}
