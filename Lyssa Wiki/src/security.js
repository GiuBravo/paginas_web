/**
 * Utilitários de segurança: escape de HTML, URLs de assets, validação de entrada
 * e leitura segura do localStorage (mitiga XSS e injeção de payloads).
 */
import { raridades } from './gameData.js';
import {
  MERCENARIAS_PRESENTES,
  TIERS_PRESENTE,
  VARIANTES_PRESENTE,
} from './giftData.js';

const NOMES_MERC = new Set(MERCENARIAS_PRESENTES.map((m) => m.name));
const RARIDADES = new Set(raridades);
const APP_ABAS = new Set(['cost', 'fortalecimento', 'gifts']);
const MODOS_CALC = new Set(['goal', 'budget']);
const TEMAS = new Set(['claro', 'escuro']);
const IDIOMAS = new Set(['pt-BR', 'en']);

const MAX_BUSCA = 120;
const MAX_STORAGE_STRING = 64;
const MAX_STORAGE_JSON = 512_000;
const MAX_PONTOS_INVENTARIO = 999_999;
const MAX_PONTOS_MERC = 35_100;

/** Escapa texto para inserção em HTML (conteúdo ou atributos). */
export function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Alias semântico para atributos HTML. */
export const escapeAttr = escapeHtml;

/**
 * Permite apenas URLs relativas do app ou do mesmo origin (http/https).
 * Bloqueia javascript:, data:, vbscript: e path traversal.
 */
export function sanitizeAssetUrl(url) {
  if (typeof url !== 'string') return '';
  const bruto = url.trim();
  if (!bruto) return '';

  const lower = bruto.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    bruto.startsWith('//')
  ) {
    return '';
  }

  if (/^https?:\/\//i.test(bruto)) {
    try {
      const parsed = new URL(bruto);
      if (typeof window !== 'undefined' && parsed.origin !== window.location.origin) {
        return '';
      }
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return '';
    }
  }

  const normalizado = bruto.replace(/\\/g, '/');
  if (normalizado.split('/').includes('..')) return '';

  if (
    normalizado.startsWith('/') ||
    normalizado.startsWith('./') ||
    normalizado.startsWith('../')
  ) {
    return bruto;
  }

  return '';
}

/** Remove caracteres de controle e limita tamanho (busca, etc.). */
export function sanitizeSearchQuery(valor, maxLen = MAX_BUSCA) {
  return String(valor ?? '')
    .replace(/[\0-\x1f\x7f]/g, '')
    .slice(0, maxLen);
}

/** Inteiro finito dentro de [min, max] ou fallback. */
export function clampInt(valor, min, max, fallback = min) {
  const n = Number.parseInt(String(valor), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Valor deve estar na lista permitida. */
export function assertEnum(valor, permitidos, fallback) {
  const set = permitidos instanceof Set ? permitidos : new Set(permitidos);
  return set.has(valor) ? valor : fallback;
}

export function assertRaridade(valor, fallback = 'legendary') {
  return assertEnum(valor, RARIDADES, fallback);
}

export function assertAppAba(valor, fallback = 'cost') {
  return assertEnum(valor, APP_ABAS, fallback);
}

export function assertModoCalculadora(valor, fallback = 'goal') {
  return assertEnum(valor, MODOS_CALC, fallback);
}

export function assertTema(valor, fallback = 'claro') {
  return assertEnum(valor, TEMAS, fallback);
}

export function assertIdioma(valor, fallback = 'pt-BR') {
  return assertEnum(valor, IDIOMAS, fallback);
}

export function assertTierPresente(valor) {
  return TIERS_PRESENTE.includes(valor) ? valor : null;
}

export function assertVariantePresente(valor) {
  return VARIANTES_PRESENTE.includes(String(valor)) ? String(valor) : null;
}

export function assertNomeMerc(valor) {
  return NOMES_MERC.has(valor) ? valor : null;
}

/**
 * Lê string do localStorage com limite de tamanho e whitelist opcional.
 */
export function readStorageString(key, { allowed, maxLen = MAX_STORAGE_STRING } = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    if (raw.length > maxLen) return null;
    if (allowed) {
      const set = allowed instanceof Set ? allowed : new Set(allowed);
      return set.has(raw) ? raw : null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Parse JSON do localStorage com limite de tamanho; retorna null se inválido.
 */
export function readStorageJson(key, maxBytes = MAX_STORAGE_JSON) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    if (raw.length > maxBytes) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Sanitiza HTML de traduções: apenas tags inline sem atributos. */
const TAGS_I18N_HTML = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'SPAN']);

export function sanitizeTranslationHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const frag = document.createDocumentFragment();

  function appendSanitized(origem, destino) {
    origem.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        destino.appendChild(document.createTextNode(node.textContent));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName;
      if (!TAGS_I18N_HTML.has(tag)) return;

      const el = document.createElement(tag.toLowerCase());
      if (tag === 'BR') {
        destino.appendChild(el);
        return;
      }
      appendSanitized(node, el);
      destino.appendChild(el);
    });
  }

  appendSanitized(doc.body, frag);
  const wrap = document.createElement('div');
  wrap.appendChild(frag);
  return wrap.innerHTML;
}

/** Valida inventário de presentes após JSON.parse. */
export function sanitizeInventarioPresentes(bruto) {
  const base = { t1: { 1: 0, 2: 0, 3: 0 }, t2: { 1: 0, 2: 0, 3: 0 }, t3: { 1: 0, 2: 0, 3: 0 } };
  if (!bruto || typeof bruto !== 'object') return null;

  const out = structuredClone(base);
  for (const tier of TIERS_PRESENTE) {
    const bloco = bruto[tier];
    if (!bloco || typeof bloco !== 'object') continue;
    for (const v of VARIANTES_PRESENTE) {
      const qtd = Number(bloco[v]);
      if (Number.isFinite(qtd) && qtd >= 0 && qtd <= MAX_PONTOS_INVENTARIO) {
        out[tier][v] = Math.floor(qtd);
      }
    }
  }
  return out;
}

/** Valida mapa nome → pontos após JSON.parse. */
export function sanitizePontosPorMerc(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
  const out = {};
  for (const [chave, valor] of Object.entries(bruto)) {
    if (!assertNomeMerc(chave)) continue;
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0 || n > MAX_PONTOS_MERC) continue;
    out[chave] = Math.floor(n / 2) * 2;
  }
  return out;
}

/** Cabeçalhos HTTP recomendados para hospedagem estática. */
export function securityResponseHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}
