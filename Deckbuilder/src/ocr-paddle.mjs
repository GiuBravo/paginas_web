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
 * @returns {Promise<{ text: string, confidence: number }|null>}
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
  return { text, confidence };
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
