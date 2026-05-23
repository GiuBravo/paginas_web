import {
  calcular_resultado,
  nivel_maximo_com_dados,
  obter_nivel_minimo_para_proximo_reinicio,
  raridade_padrao,
  simular_progresso_alma,
} from './calc.js';
import {
  obter_nivel_maximo_efetivo,
  obter_niveis_minimos_guia,
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
  injetarIconesTituloRef,
  renderizarTabelasReferencia,
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
  reinicioOrcamento: 'reinicio_orcamento_armazenado',
  levelOrcamento: 'level_orcamento_armazenado',
};

const CAMPOS_OBJETIVO = ['reinicio_desejado', 'reinicio_atual', 'level_desejado', 'level_atual'];
const CAMPOS_ORCAMENTO = ['pontos_alma', 'reinicio_orcamento', 'level_orcamento'];

let temaSelecionado = 'claro';
let modoCalculadora = 'goal';
let appAbaAtiva = 'cost';
let textoUltimoResultado = '';
let temporizadorCalculo = null;

const el = {
  raiz: document.getElementById('raiz_html'),
  raridade: document.getElementById('raridade'),
  reinicioDesejado: document.getElementById('reinicio_desejado'),
  levelDesejado: document.getElementById('level_desejado'),
  reinicioAtual: document.getElementById('reinicio_atual'),
  levelAtual: document.getElementById('level_atual'),
  pontosAlma: document.getElementById('pontos_alma'),
  reinicioOrcamento: document.getElementById('reinicio_orcamento'),
  levelOrcamento: document.getElementById('level_orcamento'),
  panelObjetivo: document.getElementById('panel_modo_objetivo'),
  panelOrcamento: document.getElementById('panel_modo_orcamento'),
  resultadoObjetivo: document.getElementById('resultado_conteudo'),
  resultadoOrcamento: document.getElementById('resultado_modo_orcamento'),
  orcamentoHeadline: document.getElementById('orcamento_headline'),
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
};

function obterRaridade() {
  return el.raridade?.value || raridade_padrao;
}

function detectarTemaInicial() {
  const salvo = localStorage.getItem(STORAGE.tema);
  if (salvo === 'escuro' || salvo === 'claro') return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function detectarModoInicial() {
  const salvo = localStorage.getItem(STORAGE.modo);
  return salvo === 'budget' ? 'budget' : 'goal';
}

function detectarAppInicial() {
  const salvo = localStorage.getItem(STORAGE.app);
  return salvo === 'gifts' ? 'gifts' : 'cost';
}

function aplicarAppUi() {
  const cost = appAbaAtiva === 'cost';
  document.getElementById('app_panel_cost')?.toggleAttribute('hidden', !cost);
  document.getElementById('app_panel_gifts')?.toggleAttribute('hidden', cost);
  document.getElementById('app_tab_cost')?.classList.toggle('app-tabs__btn--ativo', cost);
  document.getElementById('app_tab_gifts')?.classList.toggle('app-tabs__btn--ativo', !cost);
  document.getElementById('app_tab_cost')?.setAttribute('aria-selected', cost ? 'true' : 'false');
  document.getElementById('app_tab_gifts')?.setAttribute('aria-selected', cost ? 'false' : 'true');
  localStorage.setItem(STORAGE.app, appAbaAtiva);
  if (!cost) renderizarPainelPresentes();
}

function definirApp(aba) {
  appAbaAtiva = aba === 'gifts' ? 'gifts' : 'cost';
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
  executarCalculo();
}

function definirModo(modo) {
  modoCalculadora = modo === 'budget' ? 'budget' : 'goal';
  aplicarModoUi();
}

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
  const raridade = obterRaridade();
  const niveis = obter_niveis_minimos_guia(raridade);
  el.guiaBody.innerHTML = '';
  niveis.forEach((min, r) => {
    const tr = document.createElement('tr');
    tr.dataset.restart = String(r);
    const reinicioLabel = t('restart.option', { n: r });
    tr.innerHTML = `<td class="td-reinicio"><img src="/icons/reinicio.png?v=7" alt="" class="game-icon game-icon--sm" width="16" height="16" /><span>${reinicioLabel}</span></td><td class="td-nivel">${min}</td>`;
    el.guiaBody.appendChild(tr);
  });
  atualizarDestaquesGuia();
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

function atualizarDestaquesGuia() {
  const raridade = obterRaridade();
  let rDestaque;
  let rAtual;
  if (modoCalculadora === 'goal') {
    rDestaque = parseInt(el.reinicioDesejado.value, 10);
    rAtual = parseInt(el.reinicioAtual.value, 10);
  } else {
    rDestaque = null;
    rAtual = parseInt(el.reinicioOrcamento.value, 10);
  }
  document.querySelectorAll('#restart_guide_body [data-restart]').forEach((row) => {
    const r = parseInt(row.dataset.restart, 10);
    row.classList.remove('guide-row--desired', 'guide-row--current', 'guide-row--both');
    const isDesired = modoCalculadora === 'goal' && r === rDestaque;
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
  atualizarDestaquesGuia();
}

function salvarConfiguracao() {
  localStorage.setItem(STORAGE.raridade, obterRaridade());
  localStorage.setItem(STORAGE.reinicioDesejado, el.reinicioDesejado.value);
  localStorage.setItem(STORAGE.levelDesejado, el.levelDesejado.value);
  localStorage.setItem(STORAGE.reinicioAtual, el.reinicioAtual.value);
  localStorage.setItem(STORAGE.levelAtual, el.levelAtual.value);
  if (el.pontosAlma) localStorage.setItem(STORAGE.pontosAlma, el.pontosAlma.value);
  if (el.reinicioOrcamento) {
    localStorage.setItem(STORAGE.reinicioOrcamento, el.reinicioOrcamento.value);
  }
  if (el.levelOrcamento) localStorage.setItem(STORAGE.levelOrcamento, el.levelOrcamento.value);
}

function carregarConfiguracao() {
  if (el.raridade) {
    el.raridade.value = localStorage.getItem(STORAGE.raridade) ?? raridade_padrao;
  }
  el.reinicioDesejado.value = localStorage.getItem(STORAGE.reinicioDesejado) ?? '4';
  el.levelDesejado.value = localStorage.getItem(STORAGE.levelDesejado) ?? '21';
  el.reinicioAtual.value = localStorage.getItem(STORAGE.reinicioAtual) ?? '0';
  el.levelAtual.value = localStorage.getItem(STORAGE.levelAtual) ?? '1';
  if (el.pontosAlma) {
    el.pontosAlma.value = localStorage.getItem(STORAGE.pontosAlma) ?? '2270';
  }
  if (el.reinicioOrcamento) {
    el.reinicioOrcamento.value = localStorage.getItem(STORAGE.reinicioOrcamento) ?? '0';
  }
  if (el.levelOrcamento) {
    el.levelOrcamento.value = localStorage.getItem(STORAGE.levelOrcamento) ?? '1';
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
  el.botaoCopiar.disabled = true;
  textoUltimoResultado = '';

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

function mostrarSucessoOrcamento(resultado) {
  limparEstadoErro();
  el.resultadoVazio.hidden = true;
  el.resultadoObjetivo.hidden = true;
  el.resultadoOrcamento.hidden = false;

  if (el.orcamentoHeadline) {
    el.orcamentoHeadline.innerHTML = t('budget.headline', {
      r0: resultado.reinicio_inicial,
      l0: resultado.nivel_inicial,
      r1: resultado.reinicio_final,
      l1: resultado.nivel_final,
      left: formatNumber(resultado.alma_sobra),
      credits: formatNumber(resultado.creditos_total),
    });
  }

  if (el.orcamentoBody) {
    el.orcamentoBody.innerHTML = resultado.linhas
      .map(
        (row) => `
      <tr>
        <td><strong>R${row.reinicio}</strong></td>
        <td>L${row.nivel}</td>
        <td>${formatNumber(row.gasto)}</td>
        <td>${formatNumber(row.sobra)}</td>
        <td><img src="/icons/creditos.png?v=7" alt="" class="game-icon game-icon--xs" width="14" height="14" /> ${formatNumber(row.creditos)}</td>
      </tr>`,
      )
      .join('');
  }

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
  const resultado = simular_progresso_alma(
    el.pontosAlma?.value ?? 0,
    raridade,
    parseInt(el.reinicioOrcamento.value, 10),
    parseInt(el.levelOrcamento.value, 10),
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
      el.resultadoVazio.textContent = t('results.emptyBudget');
      el.resultadoVazio.hidden = false;
      el.resultadoObjetivo.hidden = true;
      el.resultadoOrcamento.hidden = true;
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
  localStorage.removeItem(STORAGE.reinicioOrcamento);
  localStorage.removeItem(STORAGE.levelOrcamento);
  carregarConfiguracao();
  atualizarOpcoesReinicio();
  atualizarUiReinicio();
  executarCalculo();
}

function onRaridadeAlterada() {
  atualizarOpcoesReinicio();
  renderizarGuiaReinicios();
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

function onLocaleChanged() {
  atualizarOpcoesReinicio();
  atualizarTextosRaridade();
  renderizarGuiaReinicios();
  const raridadeSerum =
    document.getElementById('serum_tabs')?.dataset.activeRarity || 'legendary';
  renderizarPainelSuperSoro(raridadeSerum);
  renderizarTabelasReferencia();
  injetarIconesTituloRef();
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

  renderizarGuiaReinicios();
  initPainelSuperSoro();
  initTabelasReferencia();
  initPainelPresentes();
  injetarIconesTituloRef();
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
