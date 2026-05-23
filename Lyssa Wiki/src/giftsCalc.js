import {
  INVENTARIO_PADRAO,
  META_PRESENTES,
  PONTOS_FAVORITO,
  PONTOS_NORMAL,
} from './giftData.js';

export function paraNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Interpreta texto com máscara local (ex.: 35.100) e devolve pontos válidos (par, 0–meta). */
export function sanitizarPontos(valor) {
  if (valor === '' || valor == null) return '';
  const digitos = String(valor).replace(/\D/g, '');
  if (!digitos) return '';
  let n = Number(digitos);
  if (!Number.isFinite(n) || n < 0) return '';
  n = Math.min(n, META_PRESENTES.pontosObjetivo);
  return String(Math.floor(n / 2) * 2);
}

function contagemFavorita(inventario, tier, variante) {
  return paraNumero(inventario[tier]?.[variante]);
}

function contagemNaoFavorita(inventario, tier, favorita) {
  const tierInv = inventario[tier] || {};
  return Object.entries(tierInv).reduce((soma, [variante, qtd]) => {
    if (variante === String(favorita)) return soma;
    return soma + paraNumero(qtd);
  }, 0);
}

export function calcularMelhoresPontos(merc, inventario) {
  return (
    contagemFavorita(inventario, 't1', merc.t1) * PONTOS_FAVORITO.t1 +
    contagemFavorita(inventario, 't2', merc.t2) * PONTOS_FAVORITO.t2 +
    contagemFavorita(inventario, 't3', merc.t3) * PONTOS_FAVORITO.t3
  );
}

export function calcularPontosNecessarios(pontosAtuais, rpInventario = 0) {
  return Math.max(
    META_PRESENTES.pontosObjetivo - paraNumero(pontosAtuais) - paraNumero(rpInventario),
    0,
  );
}

export function calcularTotalPontos(merc, inventario) {
  const favT1 = contagemFavorita(inventario, 't1', merc.t1) * PONTOS_FAVORITO.t1;
  const favT2 = contagemFavorita(inventario, 't2', merc.t2) * PONTOS_FAVORITO.t2;
  const favT3 = contagemFavorita(inventario, 't3', merc.t3) * PONTOS_FAVORITO.t3;

  const normT1 = contagemNaoFavorita(inventario, 't1', merc.t1) * PONTOS_NORMAL.t1;
  const normT2 = contagemNaoFavorita(inventario, 't2', merc.t2) * PONTOS_NORMAL.t2;
  const normT3 = contagemNaoFavorita(inventario, 't3', merc.t3) * PONTOS_NORMAL.t3;

  return favT1 + favT2 + favT3 + normT1 + normT2 + normT3;
}

export function totalPresentesInventario(inventario) {
  return Object.values(inventario).reduce(
    (total, tier) => total + Object.values(tier).reduce((s, q) => s + paraNumero(q), 0),
    0,
  );
}

export function clonarInventario(origem = INVENTARIO_PADRAO()) {
  return {
    t1: { ...origem.t1 },
    t2: { ...origem.t2 },
    t3: { ...origem.t3 },
  };
}

export function enriquecerLinha(merc, pontosAtuais, inventario) {
  const pontos = paraNumero(pontosAtuais);
  const bestPoints = calcularMelhoresPontos(merc, inventario);
  const totalPoints = calcularTotalPontos(merc, inventario);
  return {
    ...merc,
    currentPoints: pontos,
    bestPoints,
    totalPoints,
    requiredPoints: calcularPontosNecessarios(pontos, totalPoints),
  };
}
