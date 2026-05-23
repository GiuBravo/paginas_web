import { formatNumber, t } from './i18n.js';
import {
  creditos_cumulativo,
  mp_cumulativo,
  niveis_destaque_reinicio,
  obter_tabelas_raridade,
  raridades,
} from './gameData.js';
import { criarImgIcone } from './icons.js';

const COLUNAS_RARIDADE = raridades;

function celulaValor(valor, comIconeCreditos) {
  if (valor == null) return '<td class="ref-table__na">—</td>';
  const icone = comIconeCreditos
    ? '<img src="/icons/creditos.png?v=7" alt="" class="game-icon game-icon--xs" width="14" height="14" /> '
    : '<img src="/icons/alma.png?v=7" alt="" class="game-icon game-icon--xs" width="14" height="14" /> ';
  return `<td class="ref-table__valor">${icone}${formatNumber(valor)}</td>`;
}

function montarTabela(dadosPorRaridade, rotulos, comIconeCreditos, destaqueNivel) {
  const cabecalho = [
    `<th scope="col">${t('ref.colLevel')}</th>`,
    ...COLUNAS_RARIDADE.map(
      (r) => `<th scope="col">${t(`serum.rarity.${r}`)}</th>`,
    ),
  ].join('');

  const corpo = rotulos
    .map((rotulo, indice) => {
      if (indice < 2) return '';
      const destaque = destaqueNivel(indice) ? ' ref-table__row--reboot' : '';
      const celulas = COLUNAS_RARIDADE.map((r) => {
        const arr = dadosPorRaridade[r] ?? [];
        return celulaValor(arr[indice] ?? null, comIconeCreditos);
      }).join('');
      return `<tr class="${destaque}"><th scope="row">${rotulo}</th>${celulas}</tr>`;
    })
    .join('');

  return `<table class="ref-table"><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function rotulos_cumulativos() {
  const rows = [null, null];
  for (let n = 2; n <= 31; n++) {
    rows.push(t('ref.levelCum', { from: 1, to: n }));
  }
  return rows;
}

function rotulos_por_nivel() {
  const rows = [null, null];
  for (let n = 1; n < 31; n++) {
    rows.push(t('ref.levelPer', { from: n, to: n + 1 }));
  }
  rows.push(null);
  return rows;
}

function renderPainel(tipo, modo) {
  const cumulativo = modo === 'cum';
  const rotulos = cumulativo ? rotulos_cumulativos() : rotulos_por_nivel();
  const destaque = (i) => niveis_destaque_reinicio.includes(i);

  if (tipo === 'mp') {
    if (cumulativo) {
      return montarTabela(mp_cumulativo, rotulos, false, destaque);
    }
    const por = {};
    raridades.forEach((r) => {
      por[r] = obter_tabelas_raridade(r).mpPor;
    });
    return montarTabela(por, rotulos, false, destaque);
  }

  if (cumulativo) {
    return montarTabela(creditos_cumulativo, rotulos, true, destaque);
  }
  const por = {};
  raridades.forEach((r) => {
    por[r] = obter_tabelas_raridade(r).crPor;
  });
  return montarTabela(por, rotulos, true, destaque);
}

export function renderizarTabelasReferencia() {
  const wrap = document.getElementById('ref_panel');
  if (!wrap) return;

  const tipo = wrap.dataset.refType || 'mp';
  const modo = wrap.dataset.refMode || 'cum';
  wrap.innerHTML = renderPainel(tipo, modo);
}

export function initTabelasReferencia() {
  const tipoTabs = document.getElementById('ref_type_tabs');
  const modoTabs = document.getElementById('ref_mode_tabs');
  const panel = document.getElementById('ref_panel');
  if (!panel) return;

  const setTipo = (tipo) => {
    panel.dataset.refType = tipo;
    tipoTabs?.querySelectorAll('[data-ref-type]').forEach((btn) => {
      const ativo = btn.dataset.refType === tipo;
      btn.classList.toggle('ref-tabs__btn--ativo', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    renderizarTabelasReferencia();
  };

  const setModo = (modo) => {
    panel.dataset.refMode = modo;
    modoTabs?.querySelectorAll('[data-ref-mode]').forEach((btn) => {
      const ativo = btn.dataset.refMode === modo;
      btn.classList.toggle('ref-tabs__btn--ativo', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    renderizarTabelasReferencia();
  };

  tipoTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ref-type]');
    if (btn) setTipo(btn.dataset.refType);
  });

  modoTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ref-mode]');
    if (btn) setModo(btn.dataset.refMode);
  });

  renderizarTabelasReferencia();
}

export function injetarIconesTituloRef() {
  const mpBtn = document.querySelector('[data-ref-type="mp"]');
  const crBtn = document.querySelector('[data-ref-type="cr"]');
  if (mpBtn && !mpBtn.querySelector('img')) {
    mpBtn.prepend(criarImgIcone('alma', 16, 'game-icon game-icon--xs'));
  }
  if (crBtn && !crBtn.querySelector('img')) {
    crBtn.prepend(criarImgIcone('creditos', 16, 'game-icon game-icon--xs'));
  }
}
