/**
 * Renderização da aba Fortalecimento — tabela Super Soro por raridade.
 */
import { formatNumber, t } from './i18n.js';
import { criarImgIcone } from './icons.js';
import { raridades_super_soro, tabela_super_soro } from './serum.js';

const ICONE_SERUM = '/icons/serum.png?v=7';

const COLUNAS_FAIXA = [
  'serum.colBoost',
  'serum.colLv1_5',
  'serum.colLv6_10',
  'serum.colLv11_15',
  'serum.colLv16_20',
  'serum.colLv21_26',
  'serum.colLv27_31',
];

function renderizarTabela(raridade) {
  const linhas = tabela_super_soro[raridade] ?? [];
  const thead = COLUNAS_FAIXA.map((chave, indice) => {
    const classe = indice === 0 ? ' class="serum-table__th-boost"' : '';
    return `<th scope="col"${classe}>${t(chave)}</th>`;
  }).join('');

  const tbody = linhas
    .map((linha) => {
      const [rotulo, ...custos] = linha;
      const celulas = custos
        .map((valor) => {
          if (valor == null) {
            return '<td class="serum-table__na">—</td>';
          }
          return `<td class="serum-table__valor"><img src="${ICONE_SERUM}" alt="" class="game-icon game-icon--xs" width="16" height="16" /> ${formatNumber(valor)}</td>`;
        })
        .join('');
      return `<tr><th scope="row">${rotulo}</th>${celulas}</tr>`;
    })
    .join('');

  return `<table class="serum-table"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

export function injetarIconeTituloSerum() {
  const titulo = document.getElementById('serum_guide_titulo');
  if (!titulo || titulo.querySelector('img')) return;
  titulo.insertBefore(criarImgIcone('serum', 22, 'game-icon'), titulo.firstChild);
}

export function renderizarPainelSuperSoro(raridadeAtiva = 'legendary') {
  const tabs = document.getElementById('serum_tabs');
  const painel = document.getElementById('serum_panel');
  if (!tabs || !painel) return;

  tabs.innerHTML = '';
  raridades_super_soro.forEach((raridade) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'serum-tabs__btn';
    btn.dataset.rarity = raridade;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', raridade === raridadeAtiva ? 'true' : 'false');
    btn.id = `serum_tab_${raridade}`;
    btn.appendChild(criarImgIcone(raridade, 18, 'game-icon game-icon--xs'));
    btn.appendChild(document.createTextNode(t(`serum.rarity.${raridade}`)));
    if (raridade === raridadeAtiva) btn.classList.add('serum-tabs__btn--ativo');
    tabs.appendChild(btn);
  });

  painel.innerHTML = renderizarTabela(raridadeAtiva);
  painel.dataset.rarity = raridadeAtiva;
}

export function initPainelSuperSoro() {
  const tabs = document.getElementById('serum_tabs');
  if (!tabs) return;

  injetarIconeTituloSerum();
  renderizarPainelSuperSoro(tabs.dataset.activeRarity || 'legendary');

  tabs.addEventListener('click', (evento) => {
    const btn = evento.target.closest('[data-rarity]');
    if (!btn) return;
    const raridade = btn.dataset.rarity;
    tabs.dataset.activeRarity = raridade;
    tabs.querySelectorAll('.serum-tabs__btn').forEach((node) => {
      const ativo = node.dataset.rarity === raridade;
      node.classList.toggle('serum-tabs__btn--ativo', ativo);
      node.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    const painel = document.getElementById('serum_panel');
    if (painel) {
      painel.innerHTML = renderizarTabela(raridade);
      painel.dataset.rarity = raridade;
    }
  });
}
