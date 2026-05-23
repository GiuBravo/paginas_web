import {
  MERCENARIAS_PRESENTES,
  PONTOS_FAVORITO,
  PONTOS_NORMAL,
  TIERS_PRESENTE,
  VARIANTES_PRESENTE,
  caminhoIconeMerc,
  caminhoOutfit,
  caminhoOutfitDesc,
  caminhoPresente,
  INVENTARIO_PADRAO,
} from './giftData.js';
import {
  clonarInventario,
  enriquecerLinha,
  paraNumero,
  sanitizarPontos,
  totalPresentesInventario,
} from './giftsCalc.js';
import { formatNumber, t } from './i18n.js';

const STORAGE = 'presentes_estado_v1';

let subAbaAtiva = 'calc';
let inventario = clonarInventario();
/** @type {Record<string, number>} */
let pontosPorMerc = {};
let buscaCalc = '';
let ordenacaoCalc = { chave: 'name', dir: 'asc' };
let buscaFav = '';
let filtrosPresente = { t1: [], t2: [], t3: [] };
let ordenacaoFav = { chave: 'name', dir: 1 };

function el(id) {
  return document.getElementById(id);
}

function salvarEstado() {
  localStorage.setItem(
    STORAGE,
    JSON.stringify({ inventario, pontosPorMerc, subAbaAtiva }),
  );
}

function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return;
    const dados = JSON.parse(raw);
    if (dados.inventario) inventario = clonarInventario(dados.inventario);
    if (dados.pontosPorMerc) pontosPorMerc = dados.pontosPorMerc;
    if (dados.subAbaAtiva === 'fav' || dados.subAbaAtiva === 'calc') {
      subAbaAtiva = dados.subAbaAtiva;
    }
  } catch {
    /* ignore */
  }
}

function obterPontosMerc(nome) {
  return paraNumero(pontosPorMerc[nome] ?? 0);
}

function definirSubAba(aba) {
  subAbaAtiva = aba === 'fav' ? 'fav' : 'calc';
  el('gifts_panel_calc')?.toggleAttribute('hidden', subAbaAtiva !== 'calc');
  el('gifts_panel_fav')?.toggleAttribute('hidden', subAbaAtiva !== 'fav');
  el('gifts_tab_calc')?.classList.toggle('gifts-tabs__btn--ativo', subAbaAtiva === 'calc');
  el('gifts_tab_fav')?.classList.toggle('gifts-tabs__btn--ativo', subAbaAtiva === 'fav');
  el('gifts_tab_calc')?.setAttribute('aria-selected', subAbaAtiva === 'calc' ? 'true' : 'false');
  el('gifts_tab_fav')?.setAttribute('aria-selected', subAbaAtiva === 'fav' ? 'true' : 'false');
  const intro = el('gifts_intro_text');
  if (intro) {
    const chave = subAbaAtiva === 'calc' ? 'gifts.introCalc' : 'gifts.introFav';
    intro.setAttribute('data-i18n', chave);
    intro.textContent = t(chave);
  }
  salvarEstado();
  if (subAbaAtiva === 'calc') renderizarCalculadora();
  else renderizarFavoritos();
}

const ROTULOS_TIER = { t1: 'gifts.tier1', t2: 'gifts.tier2', t3: 'gifts.tier3' };
const CHAVES_FORMA = { 1: 'gifts.shape1', 2: 'gifts.shape2', 3: 'gifts.shape3' };

function sincronizarInputInventario(tier, variant) {
  const input = el('gifts_inventario_grid')?.querySelector(
    `.gifts-stock-cell__input[data-tier="${tier}"][data-variant="${variant}"]`,
  );
  if (input) input.value = inventario[tier][variant] || '';
}

function adicionarPresente(tier, variant, quantidade = 1) {
  if (!tier || !variant) return;
  inventario[tier][variant] = paraNumero(inventario[tier][variant]) + quantidade;
  sincronizarInputInventario(tier, variant);
  atualizarContadorPresentes();
  atualizarLinhasCalculadora();
  salvarEstado();
}

function htmlBotaoPresente(tier, variant, tamanho = 40) {
  const rotulo = `${t(ROTULOS_TIER[tier])} — ${t(CHAVES_FORMA[variant])}`;
  return `<button type="button" class="gifts-gift-add" data-gift-add data-tier="${tier}" data-variant="${variant}" title="${t('gifts.addGiftClick', { label: rotulo })}" aria-label="${t('gifts.addGiftClick', { label: rotulo })}">
        <img src="${caminhoPresente(tier, variant)}" alt="" width="${tamanho}" height="${tamanho}" loading="lazy" />
      </button>`;
}

function htmlPreferenciasMerc(merc) {
  return TIERS_PRESENTE.map((tier) => {
    const v = merc[tier];
    return `<div class="gifts-pref-item gifts-pref-item--${tier}">
        ${htmlBotaoPresente(tier, v, 34)}
        <span class="gifts-pref-item__rp gifts-rp-fav">+${PONTOS_FAVORITO[tier]}</span>
      </div>`;
  }).join('');
}

function renderizarInputsInventario() {
  const grid = el('gifts_inventario_grid');
  if (!grid) return;

  grid.innerHTML = TIERS_PRESENTE.map((tier) => {
    const celulas = VARIANTES_PRESENTE.map((v) => {
      const qtd = inventario[tier][v] ?? 0;
      return `<div class="gifts-stock-cell">
          ${htmlBotaoPresente(tier, v, 40)}
          <input type="number" min="0" step="1" class="gifts-stock-cell__input" data-tier="${tier}" data-variant="${v}" value="${qtd || ''}" inputmode="numeric" aria-label="${t(ROTULOS_TIER[tier])} ${t(CHAVES_FORMA[v])}" />
          <span class="gifts-stock-cell__rp"><span class="gifts-rp-fav">+${PONTOS_FAVORITO[tier]}</span><span class="gifts-rp-norm"> / +${PONTOS_NORMAL[tier]}</span></span>
        </div>`;
    }).join('');
    return `<div class="gifts-stock-row gifts-stock-row--${tier}">
        <span class="gifts-stock-row__tier">${t(ROTULOS_TIER[tier])}</span>
        <div class="gifts-stock-row__cells">${celulas}</div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.gifts-stock-cell__input').forEach((input) => {
    input.addEventListener('input', onInventarioInput);
    input.addEventListener('change', onInventarioInput);
  });

  atualizarContadorPresentes();
}

function onInventarioInput(evento) {
  const input = evento.target;
  const tier = input.dataset.tier;
  const variant = input.dataset.variant;
  inventario[tier][variant] = paraNumero(input.value);
  input.value = inventario[tier][variant] || '';
  atualizarContadorPresentes();
  atualizarLinhasCalculadora();
  salvarEstado();
}

function atualizarContadorPresentes() {
  const node = el('gifts_total_presentes');
  if (node) node.textContent = formatNumber(totalPresentesInventario(inventario));
}

function ordenarLinhasCalc(linhas) {
  const mult = ordenacaoCalc.dir === 'asc' ? 1 : -1;
  const chave = ordenacaoCalc.chave;

  return [...linhas].sort((a, b) => {
    if (chave === 'currentPoints') {
      const diff = (a.currentPoints - b.currentPoints) * mult;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    }
    if (chave === 'name') {
      return a.name.localeCompare(b.name) * mult;
    }
    return (a[chave] - b[chave]) * mult;
  });
}

function linhasCalculadoraFiltradas() {
  const termo = buscaCalc.trim().toLowerCase();
  return MERCENARIAS_PRESENTES.filter(
    (m) => !termo || m.name.toLowerCase().includes(termo),
  ).map((m) => enriquecerLinha(m, obterPontosMerc(m.name), inventario));
}

function valorPontosExibicao(pontos, nome) {
  if (pontosPorMerc[nome] == null) return '';
  return formatNumber(paraNumero(pontos));
}

function htmlLinhaCalculadora(row) {
  const pts = valorPontosExibicao(row.currentPoints, row.name);
  const faltam = row.requiredPoints;
  const classeFaltam = faltam === 0 ? 'gifts-rp-done' : 'gifts-rp-faltam';
  return `<tr data-name="${row.name}">
      <td class="gifts-table__icon">
        <img src="${caminhoIconeMerc(row.name)}" alt="${row.name}" width="40" height="40" loading="lazy" />
      </td>
      <td class="gifts-table__name">${row.name}</td>
      <td class="gifts-table__pref"><div class="gifts-pref-row">${htmlPreferenciasMerc(row)}</div></td>
      <td class="gifts-table__points">
        <div class="number-stepper gifts-points-stepper">
          <button type="button" class="number-stepper__btn" data-step="down" aria-label="-">▼</button>
          <input type="text" class="gifts-points-input" inputmode="numeric" autocomplete="off" data-name="${row.name}" value="${pts}" placeholder="0" size="7" />
          <button type="button" class="number-stepper__btn" data-step="up" aria-label="+">▲</button>
        </div>
      </td>
      <td class="gifts-table__num gifts-table__num--highlight" data-col="best" title="${t('gifts.colBestHint')}">${formatNumber(row.bestPoints)}</td>
      <td class="gifts-table__num" data-col="total" title="${t('gifts.colTotalHint')}">${formatNumber(row.totalPoints)}</td>
      <td class="gifts-table__num ${classeFaltam}" data-col="required">${formatNumber(faltam)}</td>
    </tr>`;
}

function bindPontosInput(input) {
  input.addEventListener('input', () => {
    const nome = input.dataset.name;
    const limpo = sanitizarPontos(input.value);
    if (limpo === '') {
      delete pontosPorMerc[nome];
      input.value = '';
    } else {
      const n = paraNumero(limpo);
      pontosPorMerc[nome] = n;
      input.value = formatNumber(n);
    }
    atualizarLinhaCalculadora(nome);
    salvarEstado();
  });

  input.addEventListener('blur', () => {
    const limpo = sanitizarPontos(input.value);
    if (limpo === '') {
      input.value = '';
      return;
    }
    input.value = formatNumber(paraNumero(limpo));
  });
}

function bindStepperPontos(container) {
  container.querySelectorAll('.gifts-points-stepper').forEach((stepper) => {
    const input = stepper.querySelector('.gifts-points-input');
    stepper.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.step === 'up' ? 1 : -1;
        const nome = input.dataset.name;
        const atual = obterPontosMerc(nome);
        const prox = Math.max(0, Math.floor((atual + dir * 2) / 2) * 2);
        if (prox === 0) {
          delete pontosPorMerc[nome];
          input.value = '';
        } else {
          pontosPorMerc[nome] = prox;
          input.value = formatNumber(prox);
        }
        atualizarLinhaCalculadora(nome);
        salvarEstado();
      });
    });
    bindPontosInput(input);
  });
}

function atualizarLinhaCalculadora(nome) {
  const merc = MERCENARIAS_PRESENTES.find((m) => m.name === nome);
  const tr = el('gifts_calc_body')?.querySelector(`tr[data-name="${CSS.escape(nome)}"]`);
  if (!merc || !tr) return;

  const row = enriquecerLinha(merc, obterPontosMerc(nome), inventario);
  const colBest = tr.querySelector('[data-col="best"]');
  const colTotal = tr.querySelector('[data-col="total"]');
  const colReq = tr.querySelector('[data-col="required"]');
  if (colBest) colBest.textContent = formatNumber(row.bestPoints);
  if (colTotal) colTotal.textContent = formatNumber(row.totalPoints);
  if (colReq) {
    colReq.textContent = formatNumber(row.requiredPoints);
    colReq.classList.toggle('gifts-rp-done', row.requiredPoints === 0);
    colReq.classList.toggle('gifts-rp-faltam', row.requiredPoints > 0);
  }
}

function atualizarLinhasCalculadora() {
  MERCENARIAS_PRESENTES.forEach((m) => atualizarLinhaCalculadora(m.name));
}

function renderizarCalculadora() {
  const tbody = el('gifts_calc_body');
  if (!tbody) return;

  const linhas = ordenarLinhasCalc(linhasCalculadoraFiltradas());
  tbody.innerHTML = linhas.map(htmlLinhaCalculadora).join('');
  bindStepperPontos(tbody);
  atualizarCabecalhosOrdenacao();
}

function atualizarCabecalhosOrdenacao() {
  document.querySelectorAll('#gifts_calc_table th[data-sort]').forEach((th) => {
    const ativo = th.dataset.sort === ordenacaoCalc.chave;
    th.classList.toggle('gifts-th--sorted', ativo);
    th.dataset.dir = ativo ? ordenacaoCalc.dir : '';
  });
}

function onSortCalc(evento) {
  const chave = evento.currentTarget.dataset.sort;
  if (ordenacaoCalc.chave === chave) {
    ordenacaoCalc.dir = ordenacaoCalc.dir === 'asc' ? 'desc' : 'asc';
  } else {
    ordenacaoCalc.chave = chave;
    ordenacaoCalc.dir = chave === 'name' ? 'asc' : 'desc';
  }
  renderizarCalculadora();
}

function resetarPresentesInventario() {
  inventario = clonarInventario(INVENTARIO_PADRAO());
  renderizarInputsInventario();
  atualizarLinhasCalculadora();
  salvarEstado();
}

function resetarPontosMercenarias() {
  pontosPorMerc = {};
  renderizarCalculadora();
  salvarEstado();
}

function linhasFavoritosFiltradas() {
  const termo = buscaFav.trim().toLowerCase();
  return MERCENARIAS_PRESENTES.filter((m) => {
    if (termo && !m.name.toLowerCase().includes(termo)) return false;
    if (filtrosPresente.t1.length && !filtrosPresente.t1.includes(m.t1)) return false;
    if (filtrosPresente.t2.length && !filtrosPresente.t2.includes(m.t2)) return false;
    if (filtrosPresente.t3.length && !filtrosPresente.t3.includes(m.t3)) return false;
    return true;
  }).sort((a, b) => {
    const chave = ordenacaoFav.chave;
    const va = a[chave] ?? a.name;
    const vb = b[chave] ?? b.name;
    const cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
    return cmp * ordenacaoFav.dir;
  });
}

function htmlLinhaFavorito(row) {
  return `<tr>
      <td class="gifts-table__icon">
        <img src="${caminhoIconeMerc(row.name)}" alt="${row.name}" width="40" height="40" loading="lazy" />
      </td>
      <td class="gifts-table__name">${row.name}</td>
      <td class="gifts-table__outfit">
        <img src="${caminhoOutfit(row.name)}" alt="" width="48" height="48" loading="lazy" data-outfit-name="${row.name}" />
      </td>
      <td class="gifts-table__gift">${htmlBotaoPresente('t1', row.t1, 36)}</td>
      <td class="gifts-table__gift">${htmlBotaoPresente('t2', row.t2, 36)}</td>
      <td class="gifts-table__gift">${htmlBotaoPresente('t3', row.t3, 36)}</td>
    </tr>`;
}

function bindOutfitTooltips() {
  const tooltip = el('gifts_outfit_tooltip');
  if (!tooltip) return;

  document.querySelectorAll('[data-outfit-name]').forEach((img) => {
    img.addEventListener('mouseenter', () => {
      const nome = img.dataset.outfitName;
      tooltip.innerHTML = `<img src="${caminhoOutfitDesc(nome)}" alt="" loading="lazy" />`;
      tooltip.hidden = false;
    });
    img.addEventListener('mousemove', (e) => {
      tooltip.style.left = `${e.clientX + 16}px`;
      tooltip.style.top = `${e.clientY - 8}px`;
    });
    img.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });
}

function renderizarFavoritos() {
  const tbody = el('gifts_fav_body');
  const contador = el('gifts_fav_total');
  if (!tbody) return;

  const linhas = linhasFavoritosFiltradas();
  tbody.innerHTML = linhas.map(htmlLinhaFavorito).join('');
  if (contador) contador.textContent = t('gifts.fav.total', { n: linhas.length });
  bindOutfitTooltips();
  sincronizarFiltrosUi();
}

function sincronizarFiltrosUi() {
  ['t1', 't2', 't3'].forEach((tier) => {
    document.querySelectorAll(`#gifts_filtro_${tier} [data-gift]`).forEach((img) => {
      img.classList.toggle('gifts-filter-gift--ativo', filtrosPresente[tier].includes(img.dataset.gift));
    });
  });
}

function toggleFiltroPresente(tier, valor) {
  const lista = filtrosPresente[tier];
  if (lista.includes(valor)) {
    filtrosPresente[tier] = lista.filter((v) => v !== valor);
  } else {
    lista.push(valor);
  }
  renderizarFavoritos();
}

function resetarFiltrosFavoritos() {
  filtrosPresente = { t1: [], t2: [], t3: [] };
  buscaFav = '';
  const busca = el('gifts_fav_search');
  if (busca) busca.value = '';
  renderizarFavoritos();
}

function togglePainelFiltros() {
  const painel = el('gifts_filtro_panel');
  const layout = el('gifts_fav_layout');
  if (!painel || !layout) return;
  painel.classList.toggle('gifts-data-panel--aberto');
  layout.classList.toggle('gifts-fav-layout--filtros-aberto', painel.classList.contains('gifts-data-panel--aberto'));
}

function renderizarFiltrosPresente() {
  ['t1', 't2', 't3'].forEach((tier) => {
    const container = el(`gifts_filtro_${tier}`);
    if (!container) return;
    container.innerHTML = VARIANTES_PRESENTE.map(
      (v) =>
        `<button type="button" class="gifts-filter-gift" data-gift="${v}" aria-label="${tier}-${v}">
          <img src="${caminhoPresente(tier, v)}" alt="" width="32" height="32" loading="lazy" />
        </button>`,
    ).join('');
    container.querySelectorAll('[data-gift]').forEach((btn) => {
      btn.addEventListener('click', () => toggleFiltroPresente(tier, btn.dataset.gift));
    });
  });
}

export function renderizarPainelPresentes() {
  renderizarInputsInventario();
  renderizarCalculadora();
  renderizarFavoritos();
}

export function initPainelPresentes() {
  carregarEstado();
  renderizarFiltrosPresente();
  definirSubAba(subAbaAtiva);

  el('gifts_tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gifts-tab]');
    if (btn) definirSubAba(btn.dataset.giftsTab);
  });

  el('app_panel_gifts')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gift-add]');
    if (!btn) return;
    adicionarPresente(btn.dataset.tier, btn.dataset.variant);
    btn.classList.add('gifts-gift-add--pulse');
    window.setTimeout(() => btn.classList.remove('gifts-gift-add--pulse'), 280);
  });

  el('gifts_calc_search')?.addEventListener('input', (e) => {
    buscaCalc = e.target.value;
    renderizarCalculadora();
  });

  el('gifts_fav_search')?.addEventListener('input', (e) => {
    buscaFav = e.target.value;
    renderizarFavoritos();
  });

  document.querySelectorAll('#gifts_calc_table th[data-sort]').forEach((th) => {
    th.addEventListener('click', onSortCalc);
  });

  document.querySelectorAll('#gifts_fav_table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const chave = th.dataset.sort;
      if (ordenacaoFav.chave === chave) ordenacaoFav.dir *= -1;
      else {
        ordenacaoFav.chave = chave;
        ordenacaoFav.dir = 1;
      }
      renderizarFavoritos();
    });
  });

  el('gifts_toggle_filtros')?.addEventListener('click', togglePainelFiltros);
  el('gifts_fechar_filtros')?.addEventListener('click', togglePainelFiltros);

  el('gifts_reset_inventario')?.addEventListener('click', () => {
    if (window.confirm(t('gifts.confirmResetGifts'))) resetarPresentesInventario();
  });

  el('gifts_reset_pontos')?.addEventListener('click', () => {
    if (window.confirm(t('gifts.confirmResetPoints'))) resetarPontosMercenarias();
  });

  el('gifts_reset_filtros')?.addEventListener('click', resetarFiltrosFavoritos);
}
