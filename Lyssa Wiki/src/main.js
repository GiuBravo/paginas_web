/**
 * Ponto de entrada da aplicação.
 * Orquestra a aba Custo (objetivo/orçamento), tema, idioma, abas do app,
 * guia de reinícios, persistência localStorage e delegação a refTablesUi / serumUi / giftsUi.
 */
import {
  calcular_resultado,
  nivel_maximo_com_dados,
  obter_nivel_minimo_para_proximo_reinicio,
  raridade_padrao,
  simular_progresso_alma,
} from './calc.js';
import {
  obter_nivel_maximo_efetivo,
  obter_reinicio_maximo,
} from './gameData.js';
import {
  applyTranslations,
  formatNumber,
  getLocale,
  initLocale,
  mensagem_erro,
  preencher_opcoes_reinicio,
  setLocale,
  setOnLocaleChange,
  t,
  eh_ponto_inicial,
  texto_copia_resultado,
  texto_copia_simulacao,
} from './i18n.js';
import {
  initTabelasReferencia,
  renderizarTabelasReferencia,
  sincronizarAbasRaridadeRef,
} from './refTablesUi.js';
import {
  initSelectRaridade,
  initSelectsNivel,
  initSelectsReinicio,
  preencher_opcoes_nivel,
  preencher_opcoes_raridade,
  sincronizarTodosSelectsComIcone,
} from './selectComIcone.js';
import { initPainelSuperSoro, injetarIconeTituloSerum, renderizarPainelSuperSoro } from './serumUi.js';
import { initPainelPresentes, renderizarPainelPresentes } from './giftsUi.js';
import { ICONS, obterIconeAlma, sincronizarIconesAlma } from './icons.js';
import {
  assertAppAba,
  assertModoCalculadora,
  assertRaridade,
  assertTema,
  clampInt,
  escapeAttr,
  escapeHtml,
  readStorageString,
  sanitizeAssetUrl,
} from './security.js';

/** Chaves localStorage da aba Custo e preferências globais */
const STORAGE = {
  tema: 'tema_armazenado',
  modo: 'modo_calculadora',
  app: 'app_aba_ativa',
  raridade: 'raridade_armazenada',
  reinicioDesejado: 'reinicio_desejado_armazenado',
  levelDesejado: 'level_desejado_armazenado',
  reinicioAtual: 'reinicio_atual_armazenado',
  levelAtual: 'level_atual_armazenado',
  pontosAlma: 'pontos_alma_armazenados',
  pontosCreditos: 'pontos_creditos_armazenados',
  reinicioOrcamento: 'reinicio_orcamento_armazenado',
  levelOrcamento: 'level_orcamento_armazenado',
};

const CAMPOS_OBJETIVO = ['reinicio_desejado', 'reinicio_atual', 'level_desejado', 'level_atual'];
const CAMPOS_ORCAMENTO = ['pontos_alma', 'pontos_creditos', 'reinicio_orcamento', 'level_orcamento'];

let temaSelecionado = 'claro';
let modoCalculadora = 'goal';
let appAbaAtiva = 'cost';
let textoUltimoResultado = '';
let temporizadorCalculo = null;
let ultimoResultadoOrcamento = null;

const el = {
  raiz: document.getElementById('raiz_html'),
  raridade: document.getElementById('raridade'),
  reinicioDesejado: document.getElementById('reinicio_desejado'),
  levelDesejado: document.getElementById('level_desejado'),
  reinicioAtual: document.getElementById('reinicio_atual'),
  levelAtual: document.getElementById('level_atual'),
  pontosAlma: document.getElementById('pontos_alma'),
  pontosCreditos: document.getElementById('pontos_creditos'),
  reinicioOrcamento: document.getElementById('reinicio_orcamento'),
  levelOrcamento: document.getElementById('level_orcamento'),
  panelObjetivo: document.getElementById('panel_modo_objetivo'),
  panelOrcamento: document.getElementById('panel_modo_orcamento'),
  resultadoObjetivo: document.getElementById('resultado_conteudo'),
  resultadoOrcamento: document.getElementById('resultado_modo_orcamento'),
  orcamentoResumo: document.getElementById('orcamento_resumo'),
  orcamentoBody: document.getElementById('orcamento_tabela_body'),
  botaoTema: document.getElementById('botao_tema'),
  botaoCopiar: document.getElementById('botao_copiar'),
  botaoResetar: document.getElementById('botao_resetar'),
  mensagemCopia: document.getElementById('mensagem_copia'),
  mensagemErro: document.getElementById('mensagem_erro'),
  resultadoVazio: document.getElementById('resultado_vazio'),
  labelMaxDesejado: document.getElementById('label_max_desejado'),
  labelMaxAtual: document.getElementById('label_max_atual'),
  badgeDesejado: document.getElementById('badge_reinicio_desejado'),
  badgeAtual: document.getElementById('badge_reinicio_atual'),
  guiaBody: document.getElementById('restart_guide_body'),
  guiaTitulo: document.getElementById('guide_title_text'),
  guiaColNivel: document.getElementById('guide_col_level'),
  guiaLegendaDestino: document.getElementById('guide_legend_dest'),
  guiaLegendaOrigem: document.getElementById('guide_legend_orig'),
};

function obterRaridade() {
  return assertRaridade(el.raridade?.value || raridade_padrao);
}

/* ——— Tema, idioma e abas do app ——— */

function detectarTemaInicial() {
  const salvo = readStorageString(STORAGE.tema, { allowed: ['claro', 'escuro'] });
  if (salvo) return assertTema(salvo);
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function detectarModoInicial() {
  const salvo = readStorageString(STORAGE.modo, { allowed: ['goal', 'budget'] });
  return assertModoCalculadora(salvo ?? 'goal');
}

const APP_ABAS = ['cost', 'fortalecimento', 'gifts'];

function detectarAppInicial() {
  const salvo = readStorageString(STORAGE.app, { allowed: APP_ABAS });
  return assertAppAba(salvo ?? 'cost');
}

function aplicarAppUi() {
  APP_ABAS.forEach((aba) => {
    const ativo = appAbaAtiva === aba;
    document.getElementById(`app_panel_${aba}`)?.toggleAttribute('hidden', !ativo);
    document.getElementById(`app_tab_${aba}`)?.classList.toggle('app-tabs__btn--ativo', ativo);
    document.getElementById(`app_tab_${aba}`)?.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
  localStorage.setItem(STORAGE.app, appAbaAtiva);
  if (appAbaAtiva === 'gifts') renderizarPainelPresentes();
  if (appAbaAtiva === 'fortalecimento') {
    const raridadeSerum =
      document.getElementById('serum_tabs')?.dataset.activeRarity || 'legendary';
    renderizarPainelSuperSoro(raridadeSerum);
  }
}

function definirApp(aba) {
  appAbaAtiva = APP_ABAS.includes(aba) ? aba : 'cost';
  aplicarAppUi();
}

function aplicarTema() {
  if (temaSelecionado === 'escuro') {
    el.raiz.classList.add('tema_escuro');
    el.raiz.classList.remove('tema_claro_forcado');
  } else {
    el.raiz.classList.remove('tema_escuro');
    el.raiz.classList.add('tema_claro_forcado');
  }
  localStorage.setItem(STORAGE.tema, temaSelecionado);
  applyTranslations();
}

function alternarTema() {
  temaSelecionado = temaSelecionado === 'claro' ? 'escuro' : 'claro';
  aplicarTema();
}

function atualizarLangButtons() {
  const locale = getLocale();
  document.getElementById('lang_pt')?.classList.toggle('lang-btn--ativo', locale === 'pt-BR');
  document.getElementById('lang_en')?.classList.toggle('lang-btn--ativo', locale === 'en');
}

function aplicarModoUi() {
  const goal = modoCalculadora === 'goal';
  el.panelObjetivo?.toggleAttribute('hidden', !goal);
  el.panelOrcamento?.toggleAttribute('hidden', goal);
  document.getElementById('mode_tab_goal')?.classList.toggle('mode-switcher__btn--ativo', goal);
  document.getElementById('mode_tab_budget')?.classList.toggle('mode-switcher__btn--ativo', !goal);
  document.getElementById('mode_tab_goal')?.setAttribute('aria-selected', goal ? 'true' : 'false');
  document.getElementById('mode_tab_budget')?.setAttribute('aria-selected', goal ? 'false' : 'true');
  localStorage.setItem(STORAGE.modo, modoCalculadora);
  atualizarGuiaModo();
  renderizarGuiaReinicios();
  executarCalculo();
}

function definirModo(modo) {
  modoCalculadora = modo === 'budget' ? 'budget' : 'goal';
  aplicarModoUi();
}

/* ——— Guia de reinícios e selects dependentes da raridade ——— */

function atualizarOpcoesReinicio() {
  const raridade = obterRaridade();
  preencher_opcoes_reinicio(
    ['reinicio_desejado', 'reinicio_atual', 'reinicio_orcamento'],
    raridade,
  );
  const maxL = obter_nivel_maximo_efetivo(raridade);
  const labelRange = t('field.levelRangeDynamic', { max: maxL }) || `1–${maxL}`;
  ['level_desejado', 'level_atual', 'level_orcamento'].forEach((id) => {
    const sel = document.getElementById(id);
    preencher_opcoes_nivel(sel, 1, maxL);
  });
  if (el.labelMaxDesejado) el.labelMaxDesejado.textContent = labelRange;
  if (el.labelMaxAtual) el.labelMaxAtual.textContent = labelRange;
  document.querySelectorAll('#panel_modo_orcamento .field__max').forEach((node) => {
    node.textContent = labelRange;
  });
  sincronizarTodosSelectsComIcone();
}

function renderizarGuiaReinicios() {
  if (!el.guiaBody) return;
  el.guiaBody.innerHTML = '';

  const segmentos =
    modoCalculadora === 'budget'
      ? obterSegmentosPercursoOrcamento()
      : obterSegmentosPercursoObjetivo();

  segmentos.forEach(({ reinicio, nivelInicio, nivelFim }) => {
    const tr = document.createElement('tr');
    tr.dataset.restart = String(reinicio);
    const reinicioLabel = escapeHtml(t('restart.option', { n: reinicio }));
    const nivelTexto = escapeHtml(formatarNivelPercurso(nivelInicio, nivelFim));
    const iconeReinicio = escapeAttr(sanitizeAssetUrl('/icons/reinicio.png?v=7'));
    tr.innerHTML = `<td class="td-reinicio"><img src="${iconeReinicio}" alt="" class="game-icon game-icon--sm" width="16" height="16" /><span>${reinicioLabel}</span></td><td class="td-nivel td-nivel--percurso">${nivelTexto}</td>`;
    el.guiaBody.appendChild(tr);
  });

  atualizarDestaquesGuia();
}

function formatarNivelPercurso(nivelInicio, nivelFim) {
  if (nivelInicio === nivelFim) return `L${nivelFim}`;
  return `L${nivelInicio} → L${nivelFim}`;
}

function obterSegmentosPercursoObjetivo() {
  const raridade = obterRaridade();
  const reinicioInicial = parseInt(el.reinicioAtual.value, 10);
  const nivelInicial = parseInt(el.levelAtual.value, 10);
  const reinicioFinal = parseInt(el.reinicioDesejado.value, 10);
  const nivelFinal = parseInt(el.levelDesejado.value, 10);

  if (
    reinicioInicial > reinicioFinal ||
    (reinicioInicial === reinicioFinal && nivelInicial > nivelFinal)
  ) {
    return [];
  }

  const segmentos = [];
  for (let r = reinicioInicial; r <= reinicioFinal; r++) {
    const inicio = r === reinicioInicial ? nivelInicial : 1;
    let fim;
    if (r === reinicioFinal) {
      fim = nivelFinal;
    } else {
      const minRestart = obter_nivel_minimo_para_proximo_reinicio(r, raridade);
      fim = Math.max(inicio, minRestart);
    }
    segmentos.push({ reinicio: r, nivelInicio: inicio, nivelFim: fim });
  }
  return segmentos;
}

function obterSegmentosPercursoOrcamento() {
  const resultado = ultimoResultadoOrcamento;
  if (!resultado) {
    const reinicio = parseInt(el.reinicioOrcamento.value, 10);
    const nivel = parseInt(el.levelOrcamento.value, 10);
    return [{ reinicio, nivelInicio: nivel, nivelFim: nivel }];
  }

  const { reinicio_inicial, nivel_inicial, reinicio_final, linhas } = resultado;
  const fimPorReinicio = new Map();
  linhas.forEach((linha) => fimPorReinicio.set(linha.reinicio, linha.nivel));

  const segmentos = [];
  for (let r = reinicio_inicial; r <= reinicio_final; r++) {
    const nivelInicio = r === reinicio_inicial ? nivel_inicial : 1;
    const nivelFim = fimPorReinicio.get(r) ?? nivelInicio;
    segmentos.push({ reinicio: r, nivelInicio, nivelFim });
  }
  return segmentos;
}

function atualizarGuiaModo() {
  const budget = modoCalculadora === 'budget';
  const chaveDestino = budget ? 'guide.legendBudgetEnd' : 'guide.legendDesired';
  const chaveOrigem = budget ? 'guide.legendBudgetStart' : 'guide.legendCurrent';

  if (el.guiaTitulo) {
    el.guiaTitulo.setAttribute('data-i18n', 'guide.titleBudget');
    el.guiaTitulo.textContent = t('guide.titleBudget');
  }
  if (el.guiaColNivel) {
    el.guiaColNivel.setAttribute('data-i18n', 'guide.colBudgetLevel');
    el.guiaColNivel.textContent = t('guide.colBudgetLevel');
  }
  if (el.guiaLegendaDestino) {
    el.guiaLegendaDestino.setAttribute('data-i18n', chaveDestino);
    el.guiaLegendaDestino.textContent = t(chaveDestino);
  }
  if (el.guiaLegendaOrigem) {
    el.guiaLegendaOrigem.setAttribute('data-i18n', chaveOrigem);
    el.guiaLegendaOrigem.textContent = t(chaveOrigem);
  }
}

function atualizarBadgeReinicio(reinicio, badgeEl, raridade) {
  if (!badgeEl) return;
  const textoEl = badgeEl.querySelector('.restart-badge__text');
  if (!textoEl) return;
  const min = obter_nivel_minimo_para_proximo_reinicio(reinicio, raridade);
  const maxR = obter_reinicio_maximo(raridade);
  if (reinicio >= maxR) {
    textoEl.textContent = t('badge.restartMax', { min, max: maxR });
  } else {
    textoEl.textContent = t('badge.restartMin', { min, next: reinicio + 1 });
  }
  badgeEl.hidden = false;
}

function atualizarLegendaGuia() {
  atualizarGuiaModo();
}

function atualizarDestaquesGuia() {
  let rDestaque;
  let rAtual;
  if (modoCalculadora === 'goal') {
    rDestaque = parseInt(el.reinicioDesejado.value, 10);
    rAtual = parseInt(el.reinicioAtual.value, 10);
  } else {
    rAtual = parseInt(el.reinicioOrcamento.value, 10);
    rDestaque =
      ultimoResultadoOrcamento != null ? ultimoResultadoOrcamento.reinicio_final : null;
  }
  document.querySelectorAll('#restart_guide_body [data-restart]').forEach((row) => {
    const r = parseInt(row.dataset.restart, 10);
    row.classList.remove('guide-row--desired', 'guide-row--current', 'guide-row--both');
    const isDesired = rDestaque != null && r === rDestaque;
    const isCurrent = r === rAtual;
    if (isDesired && isCurrent) row.classList.add('guide-row--both');
    else if (isDesired) row.classList.add('guide-row--desired');
    else if (isCurrent) row.classList.add('guide-row--current');
  });
}

function atualizarUiReinicio() {
  const raridade = obterRaridade();
  const rDesejado = parseInt(el.reinicioDesejado.value, 10);
  const rAtual = parseInt(el.reinicioAtual.value, 10);

  const maxL = obter_nivel_maximo_efetivo(raridade);
  const labelRange = t('field.levelRangeDynamic', { max: maxL });
  if (el.labelMaxDesejado) el.labelMaxDesejado.textContent = labelRange;
  if (el.labelMaxAtual) el.labelMaxAtual.textContent = labelRange;

  atualizarBadgeReinicio(rDesejado, el.badgeDesejado, raridade);
  atualizarBadgeReinicio(rAtual, el.badgeAtual, raridade);
  renderizarGuiaReinicios();
}

function salvarConfiguracao() {
  localStorage.setItem(STORAGE.raridade, obterRaridade());
  localStorage.setItem(STORAGE.reinicioDesejado, el.reinicioDesejado.value);
  localStorage.setItem(STORAGE.levelDesejado, el.levelDesejado.value);
  localStorage.setItem(STORAGE.reinicioAtual, el.reinicioAtual.value);
  localStorage.setItem(STORAGE.levelAtual, el.levelAtual.value);
  if (el.pontosAlma) localStorage.setItem(STORAGE.pontosAlma, el.pontosAlma.value);
  if (el.pontosCreditos) localStorage.setItem(STORAGE.pontosCreditos, el.pontosCreditos.value);
  if (el.reinicioOrcamento) {
    localStorage.setItem(STORAGE.reinicioOrcamento, el.reinicioOrcamento.value);
  }
  if (el.levelOrcamento) localStorage.setItem(STORAGE.levelOrcamento, el.levelOrcamento.value);
}

/* ——— Persistência e exibição de resultados ——— */

function lerIntArmazenado(chave, fallback, min, max) {
  const bruto = readStorageString(chave, { maxLen: 16 });
  if (bruto == null || bruto === '') return String(fallback);
  return String(clampInt(bruto, min, max, fallback));
}

function carregarConfiguracao() {
  const raridadeSalva = readStorageString(STORAGE.raridade, { allowed: ['common', 'rare', 'epic', 'legendary'] });
  if (el.raridade) {
    el.raridade.value = assertRaridade(raridadeSalva ?? raridade_padrao);
  }
  el.reinicioDesejado.value = lerIntArmazenado(STORAGE.reinicioDesejado, 4, 0, 99);
  el.levelDesejado.value = lerIntArmazenado(STORAGE.levelDesejado, 21, 1, 99);
  el.reinicioAtual.value = lerIntArmazenado(STORAGE.reinicioAtual, 0, 0, 99);
  el.levelAtual.value = lerIntArmazenado(STORAGE.levelAtual, 1, 1, 99);
  if (el.pontosAlma) {
    el.pontosAlma.value = lerIntArmazenado(STORAGE.pontosAlma, 2270, 0, 999_999_999);
  }
  if (el.pontosCreditos) {
    const creditos = readStorageString(STORAGE.pontosCreditos, { maxLen: 16 });
    el.pontosCreditos.value =
      creditos != null && creditos !== '' ? String(clampInt(creditos, 0, 999_999_999, 0)) : '';
  }
  if (el.reinicioOrcamento) {
    el.reinicioOrcamento.value = lerIntArmazenado(STORAGE.reinicioOrcamento, 0, 0, 99);
  }
  if (el.levelOrcamento) {
    el.levelOrcamento.value = lerIntArmazenado(STORAGE.levelOrcamento, 1, 1, 99);
  }
}

function limparEstadoErro() {
  el.mensagemErro.hidden = true;
  el.mensagemErro.textContent = '';
  [...CAMPOS_OBJETIVO, ...CAMPOS_ORCAMENTO].forEach((id) => {
    document.getElementById(id)?.closest('.field')?.classList.remove('field--invalid');
  });
}

function mostrarErro(code) {
  const raridade = obterRaridade();
  el.mensagemErro.textContent = mensagem_erro(code, raridade);
  el.mensagemErro.hidden = false;
  el.resultadoVazio.hidden = true;
  el.resultadoObjetivo.hidden = true;
  el.resultadoOrcamento.hidden = true;
  if (el.orcamentoResumo) el.orcamentoResumo.hidden = true;
  el.botaoCopiar.disabled = true;
  textoUltimoResultado = '';
  if (modoCalculadora === 'budget') {
    ultimoResultadoOrcamento = null;
    renderizarGuiaReinicios();
  }

  if (code === 'CURRENT_AFTER_DESIRED') {
    el.reinicioAtual.closest('.field')?.classList.add('field--invalid');
    el.levelAtual.closest('.field')?.classList.add('field--invalid');
  } else {
    const campos = modoCalculadora === 'goal' ? CAMPOS_OBJETIVO : CAMPOS_ORCAMENTO;
    campos.forEach((id) => {
      document.getElementById(id)?.closest('.field')?.classList.add('field--invalid');
    });
  }
}

function mostrarSucessoObjetivo(resultado) {
  limparEstadoErro();
  el.resultadoVazio.hidden = true;
  el.resultadoObjetivo.hidden = false;
  el.resultadoOrcamento.hidden = true;

  const map = {
    'alma-desejado': resultado.total_alma_desejado,
    'creditos-desejado': resultado.total_creditos_desejado,
    'alma-atual': resultado.total_alma_atual,
    'creditos-atual': resultado.total_creditos_atual,
    'alma-restante': resultado.alma_restante,
    'creditos-restante': resultado.creditos_restantes,
  };

  Object.entries(map).forEach(([key, valor]) => {
    document.querySelectorAll(`[data-result="${key}"]`).forEach((node) => {
      node.textContent = formatNumber(valor);
    });
  });

  const pontoInicial = eh_ponto_inicial(resultado.reinicio_atual, resultado.level_atual);
  el.resultadoObjetivo.classList.toggle('results-body--inicio', pontoInicial);

  textoUltimoResultado = texto_copia_resultado(resultado);
  el.botaoCopiar.disabled = false;
}

function renderizarResumoOrcamento(resultado) {
  if (!el.orcamentoResumo) return;

  const {
    reinicio_inicial,
    nivel_inicial,
    reinicio_final,
    nivel_final,
    alma_sobra,
    creditos_sobra,
    creditos_total,
    limitar_creditos,
    raridade,
  } = resultado;

  const creditosResumo = limitar_creditos ? creditos_sobra : creditos_total;
  const creditosLabel = limitar_creditos ? t('budget.leftover') : t('budget.totalCredits');
  const iconeAlma = escapeAttr(sanitizeAssetUrl(obterIconeAlma(raridade ?? obterRaridade())));
  const iconeReinicio = escapeAttr(sanitizeAssetUrl(ICONS.reinicio));
  const iconeCreditos = escapeAttr(sanitizeAssetUrl(ICONS.creditos));
  const tituloInicio = escapeAttr(t('restart.option', { n: reinicio_inicial }));

  el.orcamentoResumo.innerHTML = `
    <div class="budget-summary__journey">
      <span class="budget-summary__label">${escapeHtml(t('budget.journey'))}</span>
      <div class="budget-milestones">
        <div class="budget-milestone" title="${tituloInicio}">
          <img src="${iconeReinicio}" alt="" class="game-icon game-icon--xs" width="16" height="16" />
          <span class="budget-milestone__badge">R${reinicio_inicial}</span>
          <span class="budget-milestone__level">L${nivel_inicial}</span>
        </div>
        <span class="budget-summary__arrow" aria-hidden="true">→</span>
        <div class="budget-milestone budget-milestone--final">
          <img src="${iconeReinicio}" alt="" class="game-icon game-icon--xs" width="16" height="16" />
          <span class="budget-milestone__badge">R${reinicio_final}</span>
          <span class="budget-milestone__level">L${nivel_final}</span>
        </div>
      </div>
    </div>
    <div class="budget-summary__totals">
      <span class="currency-chip currency-chip--alma">
        <img src="${iconeAlma}" alt="" class="game-icon" width="22" height="22" data-icon-alma />
        <span class="valor_alma">${escapeHtml(formatNumber(alma_sobra))}</span>
        <span class="currency-label">${escapeHtml(t('budget.leftover'))}</span>
      </span>
      <span class="currency-chip currency-chip--creditos">
        <img src="${iconeCreditos}" alt="" class="game-icon" width="22" height="22" />
        <span class="valor_creditos">${escapeHtml(formatNumber(creditosResumo))}</span>
        <span class="currency-label">${escapeHtml(creditosLabel)}</span>
      </span>
    </div>`;
  el.orcamentoResumo.hidden = false;
}

function renderizarTabelaOrcamento(linhas, raridade = obterRaridade()) {
  if (!el.orcamentoBody) return;

  const iconeAlma = escapeAttr(sanitizeAssetUrl(obterIconeAlma(raridade)));
  const iconeReinicio = escapeAttr(sanitizeAssetUrl(ICONS.reinicio));
  const iconeCreditos = escapeAttr(sanitizeAssetUrl(ICONS.creditos));
  const total = linhas.length;
  el.orcamentoBody.innerHTML = linhas
    .map((row, index) => {
      const step = index + 1;
      const isFinal = index === total - 1;
      const rowClass = isFinal ? 'budget-row budget-row--final' : 'budget-row';

      return `
      <tr class="${rowClass}">
        <td class="budget-td budget-td--step">${step}</td>
        <td class="budget-td budget-td--restart">
          <img src="${iconeReinicio}" alt="" class="game-icon game-icon--xs" width="14" height="14" />
          <strong>R${row.reinicio}</strong>
        </td>
        <td class="budget-td budget-td--level"><span class="budget-level">L${row.nivel}</span></td>
        <td class="budget-td budget-td--num budget-td--alma">
          <span class="budget-cell-value budget-cell-value--alma">
            <img src="${iconeAlma}" alt="" class="game-icon game-icon--xs" width="14" height="14" data-icon-alma />
            <span>${escapeHtml(formatNumber(row.gasto))}</span>
          </span>
        </td>
        <td class="budget-td budget-td--num budget-td--sobra">
          <span class="budget-cell-value budget-cell-value--sobra">
            <img src="${iconeAlma}" alt="" class="game-icon game-icon--xs" width="14" height="14" data-icon-alma />
            <span>${escapeHtml(formatNumber(row.sobra))}</span>
          </span>
        </td>
        <td class="budget-td budget-td--num budget-td--creditos">
          <span class="budget-cell-value budget-cell-value--creditos">
            <img src="${iconeCreditos}" alt="" class="game-icon game-icon--xs" width="14" height="14" />
            <span>${escapeHtml(formatNumber(row.creditos))}</span>
          </span>
        </td>
      </tr>`;
    })
    .join('');
}

function mostrarSucessoOrcamento(resultado) {
  limparEstadoErro();
  el.resultadoVazio.hidden = true;
  el.resultadoObjetivo.hidden = true;
  el.resultadoOrcamento.hidden = false;

  ultimoResultadoOrcamento = resultado;
  renderizarResumoOrcamento(resultado);
  renderizarTabelaOrcamento(resultado.linhas, resultado.raridade);
  renderizarGuiaReinicios();

  textoUltimoResultado = texto_copia_simulacao(resultado);
  el.botaoCopiar.disabled = false;
}

function executarCalculoObjetivo() {
  const raridade = obterRaridade();
  const resultado = calcular_resultado(
    parseInt(el.reinicioDesejado.value, 10),
    parseInt(el.levelDesejado.value, 10),
    parseInt(el.reinicioAtual.value, 10),
    parseInt(el.levelAtual.value, 10),
    raridade,
  );
  if (!resultado.ok) {
    mostrarErro(resultado.code);
    return;
  }
  mostrarSucessoObjetivo(resultado);
}

function executarCalculoOrcamento() {
  const raridade = obterRaridade();
  const creditosRaw = el.pontosCreditos?.value;
  const creditos =
    creditosRaw === '' || creditosRaw == null ? null : creditosRaw;
  const resultado = simular_progresso_alma(
    el.pontosAlma?.value ?? 0,
    raridade,
    parseInt(el.reinicioOrcamento.value, 10),
    parseInt(el.levelOrcamento.value, 10),
    creditos,
  );
  if (!resultado.ok) {
    mostrarErro(resultado.code);
    return;
  }
  mostrarSucessoOrcamento(resultado);
}

function executarCalculo() {
  salvarConfiguracao();
  atualizarUiReinicio();
  el.mensagemCopia.textContent = '';

  if (modoCalculadora === 'budget') {
    if (!el.pontosAlma?.value && el.pontosAlma?.value !== '0') {
      ultimoResultadoOrcamento = null;
      renderizarGuiaReinicios();
      el.resultadoVazio.textContent = t('results.emptyBudget');
      el.resultadoVazio.hidden = false;
      el.resultadoObjetivo.hidden = true;
      el.resultadoOrcamento.hidden = true;
      if (el.orcamentoResumo) el.orcamentoResumo.hidden = true;
      el.botaoCopiar.disabled = true;
      return;
    }
    el.resultadoVazio.textContent = t('results.empty');
    executarCalculoOrcamento();
    return;
  }

  el.resultadoVazio.textContent = t('results.empty');
  executarCalculoObjetivo();
}

function executarCalculoComAtraso() {
  clearTimeout(temporizadorCalculo);
  temporizadorCalculo = setTimeout(executarCalculo, 300);
}

async function copiarResultado() {
  if (!textoUltimoResultado) return;
  try {
    await navigator.clipboard.writeText(textoUltimoResultado);
    el.mensagemCopia.textContent = t('copy.success');
    setTimeout(() => {
      el.mensagemCopia.textContent = '';
    }, 2000);
  } catch {
    el.mensagemCopia.textContent = t('copy.fail');
    alert(`${t('copy.fail')}\n\n${textoUltimoResultado}`);
  }
}

function resetarCalculadora() {
  localStorage.removeItem(STORAGE.reinicioDesejado);
  localStorage.removeItem(STORAGE.levelDesejado);
  localStorage.removeItem(STORAGE.reinicioAtual);
  localStorage.removeItem(STORAGE.levelAtual);
  localStorage.removeItem(STORAGE.pontosAlma);
  localStorage.removeItem(STORAGE.pontosCreditos);
  localStorage.removeItem(STORAGE.reinicioOrcamento);
  localStorage.removeItem(STORAGE.levelOrcamento);
  carregarConfiguracao();
  atualizarOpcoesReinicio();
  atualizarUiReinicio();
  executarCalculo();
}

function atualizarIconesAlmaUi() {
  const raridade = obterRaridade();
  sincronizarIconesAlma(raridade, document.getElementById('app_panel_cost'));
  sincronizarIconesAlma(raridade, document.getElementById('app_tab_cost'));
  sincronizarIconesAlma(raridade, document.querySelector('.app-header'));
}

function onRaridadeAlterada() {
  const raridade = obterRaridade();
  sincronizarAbasRaridadeRef(raridade);
  renderizarTabelasReferencia(raridade);
  atualizarOpcoesReinicio();
  renderizarGuiaReinicios();
  atualizarIconesAlmaUi();
  atualizarUiReinicio();
  executarCalculoComAtraso();
}

function initNumberStepper() {
  document.querySelectorAll('.number-stepper').forEach((wrap) => {
    const input = wrap.querySelector('input[type="number"]');
    wrap.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step === 'up' ? 1 : -1;
        const min = input.min !== '' ? Number(input.min) : 0;
        const val = Math.max(min, (Number(input.value) || 0) + step);
        input.value = String(val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  });
}

function atualizarTextosRaridade() {
  preencher_opcoes_raridade(el.raridade);
  const locale = getLocale();
  Array.from(el.raridade?.options ?? []).forEach((opt) => {
    const chave = opt.getAttribute('data-i18n');
    if (chave) opt.textContent = t(chave);
  });
  sincronizarTodosSelectsComIcone();
}

/* ——— Inicialização e eventos ——— */

function onLocaleChanged() {
  atualizarOpcoesReinicio();
  atualizarTextosRaridade();
  renderizarGuiaReinicios();
  atualizarGuiaModo();
  atualizarIconesAlmaUi();
  const raridadeSerum =
    document.getElementById('serum_tabs')?.dataset.activeRarity || 'legendary';
  renderizarPainelSuperSoro(raridadeSerum);
  sincronizarAbasRaridadeRef(obterRaridade());
  renderizarTabelasReferencia(obterRaridade());
  renderizarPainelPresentes();
  applyTranslations();
  atualizarLangButtons();
  atualizarUiReinicio();
  executarCalculo();
}

function init() {
  initLocale();
  temaSelecionado = detectarTemaInicial();
  modoCalculadora = detectarModoInicial();
  appAbaAtiva = detectarAppInicial();
  aplicarTema();

  initSelectRaridade('raridade');
  atualizarTextosRaridade();
  preencher_opcoes_reinicio(['reinicio_desejado', 'reinicio_atual', 'reinicio_orcamento']);
  initSelectsReinicio(['reinicio_desejado', 'reinicio_atual', 'reinicio_orcamento']);
  initSelectsNivel(
    ['level_desejado', 'level_atual', 'level_orcamento'],
    1,
    nivel_maximo_com_dados,
  );
  sincronizarTodosSelectsComIcone();
  carregarConfiguracao();
  atualizarOpcoesReinicio();
  sincronizarTodosSelectsComIcone();
  atualizarIconesAlmaUi();

  renderizarGuiaReinicios();
  atualizarGuiaModo();
  initPainelSuperSoro();
  initTabelasReferencia();
  initPainelPresentes();
  initNumberStepper();

  applyTranslations();
  atualizarLangButtons();
  atualizarUiReinicio();
  aplicarModoUi();
  aplicarAppUi();

  setOnLocaleChange(onLocaleChanged);

  el.botaoTema.addEventListener('click', alternarTema);
  el.botaoCopiar.addEventListener('click', copiarResultado);
  el.botaoResetar.addEventListener('click', resetarCalculadora);
  el.raridade?.addEventListener('change', onRaridadeAlterada);

  document.getElementById('mode_tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (btn) definirModo(btn.dataset.mode);
  });

  document.getElementById('app_tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-app]');
    if (btn) definirApp(btn.dataset.app);
  });

  document.getElementById('lang_pt')?.addEventListener('click', () => setLocale('pt-BR'));
  document.getElementById('lang_en')?.addEventListener('click', () => setLocale('en'));

  CAMPOS_OBJETIVO.forEach((id) => {
    document.getElementById(id)?.addEventListener('change', executarCalculoComAtraso);
  });

  CAMPOS_ORCAMENTO.forEach((id) => {
    const campo = document.getElementById(id);
    campo?.addEventListener('change', executarCalculoComAtraso);
    campo?.addEventListener('input', executarCalculoComAtraso);
  });
}

init();
