/**
 * Calculation engine: accumulated Soul/Credits cost and MP budget simulation.
 * Consumed by main.js; game tables in gameData.js.
 *
 * @module calc
 */

import {
  nivel_maximo_com_dados,
  obter_nivel_maximo_efetivo,
  obter_nivel_minimo_proximo_reinicio,
  obter_reinicio_maximo,
  obter_tabelas_raridade,
} from './gameData.js';

export {
  nivel_maximo_com_dados,
  obter_reinicio_maximo,
} from './gameData.js';

/** Default rarity when none is selected (legendary mercenary tables). */
export const raridade_padrao = 'legendary';

/** @deprecated Prefer {@link obter_reinicio_maximo} with a rarity argument. */
export const reinicio_maximo_com_dados = obter_reinicio_maximo(raridade_padrao);

/** Per-level Soul costs for legendary — kept for compatibility with the original spreadsheet. */
export const lista_custos_alma_por_faixa = obter_tabelas_raridade(raridade_padrao).custosAlmaPorFaixa;
export const lista_custos_creditos_por_faixa =
  obter_tabelas_raridade(raridade_padrao).custosCreditosPorFaixa;

export const lista_niveis_minimos_proximo_reinicio =
  obter_tabelas_raridade(raridade_padrao).niveisMaximosPorReinicio;

export const lista_niveis_maximos_por_reinicio = lista_niveis_minimos_proximo_reinicio;

/**
 * Minimum level on restart `reinicio` required before the next restart is allowed.
 * @param {number} reinicio - Current restart index (0-based).
 * @param {string} [raridade] - Mercenary rarity key.
 * @returns {number}
 */
export function obter_nivel_minimo_para_proximo_reinicio(reinicio, raridade = raridade_padrao) {
  return obter_nivel_minimo_proximo_reinicio(raridade, reinicio);
}

/**
 * Total Soul and Credits spent to reach `nivel` within a single restart cycle,
 * counting only level-ups from 2 → nivel (level 1 costs nothing).
 *
 * @param {number} nivel - Target level (1 … max).
 * @param {string} raridade
 * @returns {[number, number]} `[totalAlma, totalCreditos]`
 * @throws {Error} `INVALID_RANGE` if nivel exceeds table length.
 * @private
 */
function calcular_custo_acumulado_ate_nivel(nivel, raridade) {
  const { custosAlmaPorFaixa, custosCreditosPorFaixa } = obter_tabelas_raridade(raridade);
  if (nivel < 2) return [0, 0];
  const indice = nivel - 2;
  if (indice >= custosAlmaPorFaixa.length) throw new Error('INVALID_RANGE');
  const total_alma = custosAlmaPorFaixa.slice(0, indice + 1).reduce((s, v) => s + v, 0);
  const total_creditos = custosCreditosPorFaixa.slice(0, indice + 1).reduce((s, v) => s + v, 0);
  return [total_alma, total_creditos];
}

/**
 * Total Soul and Credits from account start (R0 L1) up to `(reinicio, nivel)`.
 *
 * Completed restarts `0 … reinicio-1` are charged up to each cycle’s restart threshold
 * (`niveisMaximosPorReinicio[r]`). The current restart adds cost through `nivel`.
 *
 * @param {number} reinicio
 * @param {number} nivel
 * @param {string} [raridade]
 * @returns {[number, number]} `[totalAlma, totalCreditos]`
 */
export function calcular_custo_total_desde_inicio(reinicio, nivel, raridade = raridade_padrao) {
  const { niveisMaximosPorReinicio } = obter_tabelas_raridade(raridade);
  let total_alma = 0;
  let total_creditos = 0;

  for (let r = 0; r < reinicio; r++) {
    const limite = niveisMaximosPorReinicio[r] ?? nivel_maximo_com_dados;
    const [alma, creditos] = calcular_custo_acumulado_ate_nivel(limite, raridade);
    total_alma += alma;
    total_creditos += creditos;
  }

  if (nivel > 1) {
    const [alma, creditos] = calcular_custo_acumulado_ate_nivel(nivel, raridade);
    total_alma += alma;
    total_creditos += creditos;
  }

  return [total_alma, total_creditos];
}

/**
 * Validates Goal-mode inputs before calculating the delta.
 *
 * @returns {null | 'INVALID_RANGE' | 'CURRENT_AFTER_DESIRED'}
 *   - `INVALID_RANGE` — R/L outside rarity caps.
 *   - `CURRENT_AFTER_DESIRED` — current progress is past the desired point.
 */
export function validar_entrada(
  reinicio_desejado,
  level_desejado,
  reinicio_atual,
  level_atual,
  raridade = raridade_padrao,
) {
  const maxR = obter_reinicio_maximo(raridade);
  const maxL = obter_nivel_maximo_efetivo(raridade);

  if (
    reinicio_desejado < 0 ||
    reinicio_desejado > maxR ||
    level_desejado < 1 ||
    level_desejado > maxL ||
    reinicio_atual < 0 ||
    reinicio_atual > maxR ||
    level_atual < 1 ||
    level_atual > maxL
  ) {
    return 'INVALID_RANGE';
  }

  if (
    reinicio_desejado < reinicio_atual ||
    (reinicio_desejado === reinicio_atual && level_desejado < level_atual)
  ) {
    return 'CURRENT_AFTER_DESIRED';
  }

  return null;
}

/**
 * Goal mode: remaining Soul and Credits between current and desired (R, L).
 *
 * @returns {{ ok: true, raridade: string, reinicio_desejado: number, level_desejado: number,
 *   reinicio_atual: number, level_atual: number, total_alma_desejado: number,
 *   total_creditos_desejado: number, total_alma_atual: number, total_creditos_atual: number,
 *   alma_restante: number, creditos_restantes: number }
 *   | { ok: false, code: string }}
 */
export function calcular_resultado(
  reinicio_desejado,
  level_desejado,
  reinicio_atual,
  level_atual,
  raridade = raridade_padrao,
) {
  const erro = validar_entrada(
    reinicio_desejado,
    level_desejado,
    reinicio_atual,
    level_atual,
    raridade,
  );
  if (erro) return { ok: false, code: erro };

  const [total_alma_desejado, total_creditos_desejado] = calcular_custo_total_desde_inicio(
    reinicio_desejado,
    level_desejado,
    raridade,
  );
  const [total_alma_atual, total_creditos_atual] = calcular_custo_total_desde_inicio(
    reinicio_atual,
    level_atual,
    raridade,
  );

  return {
    ok: true,
    raridade,
    reinicio_desejado,
    level_desejado,
    reinicio_atual,
    level_atual,
    total_alma_desejado,
    total_creditos_desejado,
    total_alma_atual,
    total_creditos_atual,
    alma_restante: total_alma_desejado - total_alma_atual,
    creditos_restantes: total_creditos_desejado - total_creditos_atual,
  };
}

/**
 * Validates the starting point for budget simulation.
 * @returns {null | 'INVALID_RANGE'}
 */
export function validar_simulacao(reinicio, nivel, raridade = raridade_padrao) {
  const maxR = obter_reinicio_maximo(raridade);
  const maxL = obter_nivel_maximo_efetivo(raridade);
  if (
    reinicio < 0 ||
    reinicio > maxR ||
    nivel < 1 ||
    nivel > maxL
  ) {
    return 'INVALID_RANGE';
  }
  return null;
}

/**
 * Budget mode: simulates spending MP (Soul) level by level from `(reinicio_inicial, nivel_inicial)`.
 *
 * When `creditos` is provided (non-null, non-empty), spending stops if Credits run out as well.
 * On reaching the restart threshold, records a row and advances to the next restart at L1.
 *
 * @param {number|string} pontos - Available MP.
 * @param {string} raridade
 * @param {number} reinicio_inicial
 * @param {number} nivel_inicial
 * @param {number|string|null} [creditos] - Optional credit cap; omit to ignore credits.
 * @returns {{ ok: true, raridade: string, reinicio_inicial: number, nivel_inicial: number,
 *   pontos_iniciais: number, creditos_iniciais: number|null, limitar_creditos: boolean,
 *   reinicio_final: number, nivel_final: number, alma_sobra: number,
 *   creditos_sobra: number|null, creditos_total: number,
 *   linhas: Array<{ reinicio: number, nivel: number, gasto: number, sobra: number, creditos: number }> }
 *   | { ok: false, code: string }}
 */
export function simular_progresso_alma(
  pontos,
  raridade,
  reinicio_inicial,
  nivel_inicial,
  creditos = null,
) {
  const erro = validar_simulacao(reinicio_inicial, nivel_inicial, raridade);
  if (erro) return { ok: false, code: erro };

  const pontosNum = Math.max(0, Number(pontos) || 0);
  const limitarCreditos = creditos !== null && creditos !== '';
  const creditosNum = limitarCreditos ? Math.max(0, Number(creditos) || 0) : null;
  const { mpPor, crPor } = obter_tabelas_raridade(raridade);
  const regras = obter_tabelas_raridade(raridade).niveisMaximosPorReinicio;
  const maxR = obter_reinicio_maximo(raridade);

  let R = reinicio_inicial;
  let L = nivel_inicial;
  let MP = pontosNum;
  let CR = creditosNum;
  const linhas = [];
  /** Spend accumulated since last row or restart transition. */
  let ciclo = { R, gasto: 0, creditos: 0 };
  let total_creditos = 0;

  while (true) {
    /* Restart gate: at minimum level for this R → record and bump restart. */
    if (R < maxR) {
      const nivel_necessario = regras[R];
      if (L >= nivel_necessario) {
        linhas.push({
          reinicio: R,
          nivel: L,
          gasto: ciclo.gasto,
          sobra: MP,
          creditos: ciclo.creditos,
        });
        R += 1;
        L = 1;
        ciclo = { R, gasto: 0, creditos: 0 };
        continue;
      }
    }

    const custoMp = mpPor[L + 1];
    const custoCr = crPor[L + 1];
    if (!custoMp || MP < custoMp || !custoCr || (limitarCreditos && CR < custoCr)) break;

    MP -= custoMp;
    if (limitarCreditos) CR -= custoCr;
    ciclo.gasto += custoMp;
    ciclo.creditos += custoCr;
    total_creditos += custoCr;
    L += 1;
  }

  /* Final position (may be mid-cycle without enough MP for the next level). */
  linhas.push({
    reinicio: R,
    nivel: L,
    gasto: ciclo.gasto,
    sobra: MP,
    creditos: ciclo.creditos,
  });

  return {
    ok: true,
    raridade,
    reinicio_inicial,
    nivel_inicial,
    pontos_iniciais: pontosNum,
    creditos_iniciais: creditosNum,
    limitar_creditos: limitarCreditos,
    reinicio_final: R,
    nivel_final: L,
    alma_sobra: MP,
    creditos_sobra: limitarCreditos ? CR : null,
    creditos_total: total_creditos,
    linhas,
  };
}
