export const nivel_maximo_com_dados = 31;

export const raridades = ['common', 'rare', 'epic', 'legendary'];

/** Custo cumulativo de MP (1 → nível n). Índices 0–1 são null. */
export const mp_cumulativo = {
  common: [
    null, null, 25, 75, 150, 250, 400, 600, 850, 1150, 1500, 1950, 2550, 3300, 4200, 5300,
    6700, 8700, 11400, 14900, 19400, 25400, 32900, 42400, 54400, 69400, 87400,
  ],
  rare: [
    null, null, 25, 75, 150, 250, 380, 540, 730, 950, 1200, 1530, 1950, 2450, 3050, 3800,
    4750, 6150, 8050, 10450, 13450, 17150, 21650, 27150, 34150, 43150, 55150, 67300, 79650,
    92200, 105000, 118100,
  ],
  epic: [
    null, null, 15, 45, 90, 150, 230, 330, 450, 590, 750, 950, 1200, 1520, 1920, 2420, 3070,
    3970, 5070, 6420, 8220, 10520, 13520, 17520, 22520, 28820, 36820, 45020, 53420, 62070,
    71020, 80320,
  ],
  legendary: [
    null, null, 5, 15, 30, 50, 90, 150, 230, 330, 450, 600, 800, 1050, 1370, 1770, 2270,
    2970, 3820, 4820, 6120, 7820, 10020, 12920, 16620, 21420, 27420, 33570, 39870, 46320,
    52970, 59870,
  ],
};

/** Custo cumulativo de créditos (1 → nível n). */
export const creditos_cumulativo = {
  common: [
    null, null, 50, 130, 250, 450, 750, 1250, 2250, 3750, 5750, 8750, 12750, 18750, 26750,
    36750, 49750, 65750, 84750, 106750, 131750, 159750, 191750, 227750, 267750, 312750, 362750,
  ],
  rare: [
    null, null, 100, 400, 1000, 1900, 3300, 5300, 8800, 12800, 17800, 23800, 31800, 41800,
    53800, 67800, 83800, 102800, 124800, 149800, 177800, 209800, 245800, 285800, 330800,
    380800, 435800, 492800, 552800, 615800, 681800, 751800,
  ],
  epic: [
    null, null, 300, 900, 1800, 3200, 5100, 7600, 11600, 16600, 22600, 29600, 38600, 49600,
    62600, 78600, 97600, 119600, 145600, 175600, 209600, 247600, 289600, 336600, 386600,
    446600, 511600, 578600, 648600, 721600, 798600, 880600,
  ],
  legendary: [
    null, null, 600, 1500, 2900, 4800, 7300, 10800, 16300, 23300, 32300, 43300, 57300, 74300,
    94300, 118300, 146300, 178300, 214300, 254300, 298300, 346300, 398300, 455300, 517300,
    585300, 660300, 740300, 826300, 919300, 1020300, 1130300,
  ],
};

/** Nível mínimo no reinício R para poder reiniciar. */
export const regras_reinicio_por_raridade = {
  common: [11, 16, 21, 26],
  rare: [11, 16, 21, 26],
  epic: [6, 11, 16, 21, 26],
  legendary: [6, 11, 16, 21, 26, 31, 31],
};

export const reinicio_maximo_por_raridade = {
  common: 4,
  rare: 4,
  epic: 5,
  legendary: 7,
};

export function obter_reinicio_maximo(raridade) {
  return reinicio_maximo_por_raridade[raridade] ?? reinicio_maximo_por_raridade.legendary;
}

export function obter_niveis_minimos_guia(raridade) {
  const regras = regras_reinicio_por_raridade[raridade] ?? regras_reinicio_por_raridade.legendary;
  const maxR = obter_reinicio_maximo(raridade);
  const niveis = [];
  for (let r = 0; r <= maxR; r++) {
    if (r < regras.length) niveis.push(regras[r]);
    else niveis.push(nivel_maximo_com_dados);
  }
  return niveis;
}

export function obter_nivel_minimo_proximo_reinicio(raridade, reinicio) {
  const niveis = obter_niveis_minimos_guia(raridade);
  return niveis[reinicio] ?? nivel_maximo_com_dados;
}

function derivar_por_nivel(cumulativo) {
  const por = [null, null];
  if (!cumulativo || cumulativo.length < 3) return por;
  por[2] = cumulativo[2];
  for (let i = 3; i < cumulativo.length; i++) {
    por[i] = cumulativo[i] - cumulativo[i - 1];
  }
  return por;
}

const cache_por_nivel = new Map();

export function obter_tabelas_raridade(raridade) {
  if (cache_por_nivel.has(raridade)) return cache_por_nivel.get(raridade);
  const mpCum = mp_cumulativo[raridade];
  const crCum = creditos_cumulativo[raridade];
  const mpPor = derivar_por_nivel(mpCum);
  const crPor = derivar_por_nivel(crCum);
  const tabelas = {
    mpCum,
    crCum,
    mpPor,
    crPor,
    custosAlmaPorFaixa: mpPor.slice(2),
    custosCreditosPorFaixa: crPor.slice(2),
    niveisMaximosPorReinicio: obter_niveis_minimos_guia(raridade),
    reinicioMaximo: obter_reinicio_maximo(raridade),
  };
  cache_por_nivel.set(raridade, tabelas);
  return tabelas;
}

/** Linhas de reinício destacadas nas tabelas (nível alvo). */
export const niveis_destaque_reinicio = [6, 11, 16, 21, 26, 31];

/** Último nível com dados de custo para a raridade (Common para em 26). */
export function obter_nivel_maximo_efetivo(raridade) {
  const arr = mp_cumulativo[raridade] ?? mp_cumulativo.legendary;
  for (let i = arr.length - 1; i >= 2; i--) {
    if (arr[i] != null) return i;
  }
  return 2;
}
