import { formatNumber, t } from './i18n.js';
import {
  obter_linhas_planilha_nivel,
  obter_reinicio_maximo,
  raridades,
} from './gameData.js';
import { obterIconeAlma, obterIconeRaridade } from './icons.js';

function celulaValor(valor, tipo, raridade) {
  if (valor == null) return '<td class="ref-table__na">—</td>';
  const icone =
    tipo === 'cr'
      ? '<img src="/icons/creditos.png?v=7" alt="" class="game-icon game-icon--xs" width="14" height="14" /> '
      : `<img src="${obterIconeAlma(raridade)}" alt="" class="game-icon game-icon--xs" width="14" height="14" /> `;
  return `<td class="ref-table__valor">${icone}${formatNumber(valor)}</td>`;
}

function rotuloLinha(linha, modo) {
  if (linha.tipo === 'totalizador') {
    return t('ref.rowTotalR', { restart: linha.rotulo.restart });
  }
  if (modo === 'per') {
    return t('ref.levelPer', { from: linha.rotulo.from, to: linha.rotulo.to });
  }
  return t('ref.levelCum', { from: linha.rotulo.from, to: linha.rotulo.to });
}

function classeLinha(linha) {
  if (linha.tipo === 'totalizador') return 'ref-table__row--totalizador';
  if (linha.destaque) return 'ref-table__row--reboot';
  return '';
}

function montarTabelaPlanilha(raridade, modo) {
  const { linhas, maxR } = obter_linhas_planilha_nivel(raridade, modo);

  const pares = [];
  for (let r = 0; r <= maxR; r++) {
    pares.push(
      `<th scope="col">${t('ref.colRestartMp', { restart: r })}</th>`,
      `<th scope="col">${t('ref.colRestartCr')}</th>`,
    );
  }

  const cabecalho = [
    `<th scope="col">${t('ref.colLevel')}</th>`,
    ...pares,
    `<th scope="col">${t('ref.colTotalMp')}</th>`,
    `<th scope="col">${t('ref.colTotalCr')}</th>`,
  ].join('');

  const corpo = linhas
    .map((linha) => {
      const classe = classeLinha(linha);
      const celulas = linha.cells
        .flatMap((c) => [celulaValor(c.mp, 'mp', raridade), celulaValor(c.cr, 'cr', raridade)])
        .join('');
      const totais = [
        celulaValor(linha.totalAlma, 'mp', raridade),
        celulaValor(linha.totalCreditos, 'cr', raridade),
      ].join('');
      return `<tr class="${classe}"><th scope="row">${rotuloLinha(linha, modo)}</th>${celulas}${totais}</tr>`;
    })
    .join('');

  return `<table class="ref-table ref-table--planilha"><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

export function renderizarTabelasReferencia(raridade = 'legendary') {
  const wrap = document.getElementById('ref_panel');
  if (!wrap) return;

  const modo = wrap.dataset.refMode || 'per';
  wrap.innerHTML = montarTabelaPlanilha(raridade, modo);

  const subtitulo = document.getElementById('ref_guide_subtitulo');
  if (subtitulo) {
    subtitulo.textContent = t('ref.sheetTitle', {
      rarity: t(`serum.rarity.${raridade}`),
    });
  }
}

function obterRaridadeAtivaRef() {
  const tabs = document.getElementById('ref_rarity_tabs');
  if (tabs?.dataset.activeRarity) return tabs.dataset.activeRarity;
  return document.getElementById('raridade')?.value || 'legendary';
}

export function sincronizarAbasRaridadeRef(raridade) {
  const tabs = document.getElementById('ref_rarity_tabs');
  if (!tabs) return;
  tabs.dataset.activeRarity = raridade;
  tabs.querySelectorAll('[data-ref-rarity]').forEach((btn) => {
    const ativo = btn.dataset.refRarity === raridade;
    btn.classList.toggle('ref-rarity-tabs__btn--ativo', ativo);
    btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
  });
}

export function initAbasRaridadeReferencia(raridadeInicial = 'legendary') {
  const tabs = document.getElementById('ref_rarity_tabs');
  if (!tabs) return;

  tabs.innerHTML = '';
  raridades.forEach((raridade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ref-rarity-tabs__btn';
    btn.dataset.refRarity = raridade;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', raridade === raridadeInicial ? 'true' : 'false');
    btn.id = `ref_rarity_tab_${raridade}`;
    const icone = obterIconeRaridade(raridade);
    if (icone) {
      const img = document.createElement('img');
      img.src = icone;
      img.alt = '';
      img.width = 18;
      img.height = 18;
      img.className = 'game-icon game-icon--xs';
      img.setAttribute('aria-hidden', 'true');
      btn.appendChild(img);
    }
    btn.appendChild(document.createTextNode(t(`serum.rarity.${raridade}`)));
    if (raridade === raridadeInicial) btn.classList.add('ref-rarity-tabs__btn--ativo');
    tabs.appendChild(btn);
  });

  tabs.dataset.activeRarity = raridadeInicial;

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ref-rarity]');
    if (!btn) return;
    const raridade = btn.dataset.refRarity;
    const select = document.getElementById('raridade');
    if (select && select.value !== raridade) {
      select.value = raridade;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      sincronizarAbasRaridadeRef(raridade);
      renderizarTabelasReferencia(raridade);
    }
  });
}

export function initTabelasReferencia() {
  const modoTabs = document.getElementById('ref_mode_tabs');
  const panel = document.getElementById('ref_panel');
  if (!panel) return;

  const raridadeInicial =
    document.getElementById('raridade')?.value ||
    document.getElementById('ref_rarity_tabs')?.dataset.activeRarity ||
    'legendary';

  initAbasRaridadeReferencia(raridadeInicial);

  const setModo = (modo) => {
    panel.dataset.refMode = modo;
    modoTabs?.querySelectorAll('[data-ref-mode]').forEach((btn) => {
      const ativo = btn.dataset.refMode === modo;
      btn.classList.toggle('ref-tabs__btn--ativo', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    renderizarTabelasReferencia(obterRaridadeAtivaRef());
  };

  modoTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ref-mode]');
    if (btn) setModo(btn.dataset.refMode);
  });

  panel.dataset.refMode = panel.dataset.refMode || 'per';
  renderizarTabelasReferencia(raridadeInicial);
}

/** @deprecated mantido para compatibilidade com main.js */
export function injetarIconesTituloRef() {}
