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

export const raridade_padrao = 'legendary';

/** @deprecated use obter_reinicio_maximo(raridade) */
export const reinicio_maximo_com_dados = obter_reinicio_maximo(raridade_padrao);

/** Custos lendários (compatível com planilha original). */
export const lista_custos_alma_por_faixa = obter_tabelas_raridade(raridade_padrao).custosAlmaPorFaixa;
export const lista_custos_creditos_por_faixa =
  obter_tabelas_raridade(raridade_padrao).custosCreditosPorFaixa;

export const lista_niveis_minimos_proximo_reinicio =
  obter_tabelas_raridade(raridade_padrao).niveisMaximosPorReinicio;

export const lista_niveis_maximos_por_reinicio = lista_niveis_minimos_proximo_reinicio;

export function obter_nivel_minimo_para_proximo_reinicio(reinicio, raridade = raridade_padrao) {
  return obter_nivel_minimo_proximo_reinicio(raridade, reinicio);
}

function calcular_custo_acumulado_ate_nivel(nivel, raridade) {
  const { custosAlmaPorFaixa, custosCreditosPorFaixa } = obter_tabelas_raridade(raridade);
  if (nivel < 2) return [0, 0];
  const indice = nivel - 2;
  if (indice >= custosAlmaPorFaixa.length) throw new Error('INVALID_RANGE');
  const total_alma = custosAlmaPorFaixa.slice(0, indice + 1).reduce((s, v) => s + v, 0);
  const total_creditos = custosCreditosPorFaixa.slice(0, indice + 1).reduce((s, v) => s + v, 0);
  return [total_alma, total_creditos];
}

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

/** Simula gasto de MP e créditos a partir do ponto atual (estilo wiki). */
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
  let ciclo = { R, gasto: 0, creditos: 0 };
  let total_creditos = 0;

  while (true) {
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
