/**
 * Select customizado com ícones (reinício, raridade, nível).
 * Mantém o <select> nativo para valor e acessibilidade.
 */
import { criarImgIcone, criarImgPorSrc, ICONS, obterIconeRaridade } from './icons.js';
import { sanitizeAssetUrl } from './security.js';

const instancias = new Map();

function vincularHoverLateral(item, lista) {
  item.addEventListener('mouseenter', () => {
    lista.querySelectorAll('.select-com-icone__opcao--hover').forEach((el) => {
      el.classList.remove('select-com-icone__opcao--hover');
    });
    item.classList.add('select-com-icone__opcao--hover');
  });
  item.addEventListener('mouseleave', () => {
    item.classList.remove('select-com-icone__opcao--hover');
  });
}

function resolverSrcIcone(opcao, tipoIcone, resolverIcone) {
  if (resolverIcone) return resolverIcone(opcao.value);
  if (tipoIcone && ICONS[tipoIcone]) return ICONS[tipoIcone];
  return null;
}

function aplicarIconeNoTrigger(triggerIcon, src) {
  if (!triggerIcon) return;
  const seguro = sanitizeAssetUrl(src);
  if (seguro) {
    triggerIcon.src = seguro;
    triggerIcon.hidden = false;
  } else {
    triggerIcon.hidden = true;
  }
}

function selecionarOpcao(selectEl, lista, item, opcao, triggerText, triggerIcon, tipoIcone, resolverIcone, fechar) {
  selectEl.value = opcao.value;
  lista.querySelectorAll('[role="option"]').forEach((el) => {
    el.removeAttribute('aria-selected');
  });
  item.setAttribute('aria-selected', 'true');
  triggerText.textContent = opcao.textContent;
  aplicarIconeNoTrigger(triggerIcon, resolverSrcIcone(opcao, tipoIcone, resolverIcone));
  fechar();
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * @param {HTMLSelectElement} selectEl
 * @param {{ tipoIcone?: keyof ICONS | null, resolverIcone?: (value: string) => string | null, colunas?: number }} config
 */
export function inicializarSelectComIcone(selectEl, config = {}) {
  const { tipoIcone = null, resolverIcone = null, colunas = 1 } = config;
  const usaIcone = Boolean(tipoIcone && ICONS[tipoIcone]) || Boolean(resolverIcone);

  if (!selectEl || instancias.has(selectEl)) {
    return instancias.get(selectEl);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'select-com-icone';
  if (colunas > 1) wrapper.classList.add('select-com-icone--colunas');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = `${selectEl.id}_trigger`;
  trigger.className = 'select-com-icone__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const triggerText = document.createElement('span');
  triggerText.className = 'select-com-icone__trigger-text';

  let triggerIcon = null;
  if (usaIcone) {
    triggerIcon = document.createElement('img');
    triggerIcon.alt = '';
    triggerIcon.width = 20;
    triggerIcon.height = 20;
    triggerIcon.className = 'game-icon select-com-icone__trigger-icon';
    triggerIcon.setAttribute('aria-hidden', 'true');
    trigger.append(triggerIcon, triggerText);
  } else {
    trigger.classList.add('select-com-icone__trigger--sem-icone');
    trigger.append(triggerText);
  }

  const lista = document.createElement('ul');
  lista.className = 'select-com-icone__lista';
  if (colunas > 1) {
    lista.classList.add('select-com-icone__lista--grid');
    lista.style.setProperty('--select-colunas', String(colunas));
  }
  lista.setAttribute('role', 'listbox');
  lista.hidden = true;

  selectEl.classList.add('select-com-icone__nativo');
  selectEl.setAttribute('aria-hidden', 'true');
  selectEl.tabIndex = -1;

  const parent = selectEl.parentNode;
  parent.insertBefore(wrapper, selectEl);
  wrapper.append(selectEl, trigger, lista);

  const label = document.querySelector(`label[for="${selectEl.id}"]`);
  if (label) label.setAttribute('for', trigger.id);

  function fechar() {
    lista.hidden = true;
    lista.setAttribute('hidden', '');
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('select-com-icone--aberto');
  }

  function abrir() {
    lista.hidden = false;
    lista.removeAttribute('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('select-com-icone--aberto');
    lista.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function atualizarTrigger() {
    const opcao = selectEl.options[selectEl.selectedIndex];
    triggerText.textContent = opcao?.textContent ?? '';
    if (triggerIcon && opcao) {
      aplicarIconeNoTrigger(
        triggerIcon,
        resolverSrcIcone(opcao, tipoIcone, resolverIcone),
      );
    }
  }

  function sincronizarOpcoes() {
    lista.innerHTML = '';
    Array.from(selectEl.options).forEach((opcao) => {
      const item = document.createElement('li');
      item.className = 'select-com-icone__opcao';
      if (colunas > 1) item.classList.add('select-com-icone__opcao--compacto');
      item.setAttribute('role', 'option');
      item.dataset.value = opcao.value;
      if (opcao.selected) item.setAttribute('aria-selected', 'true');

      const src = resolverSrcIcone(opcao, tipoIcone, resolverIcone);
      if (src) {
        item.append(criarImgPorSrc(src, 18, 'game-icon game-icon--sm select-com-icone__opcao-icon'));
        const texto = document.createElement('span');
        texto.textContent = opcao.textContent;
        item.append(texto);
      } else {
        item.textContent = opcao.textContent;
      }

      vincularHoverLateral(item, lista);
      item.addEventListener('click', () => {
        selecionarOpcao(
          selectEl,
          lista,
          item,
          opcao,
          triggerText,
          triggerIcon,
          tipoIcone,
          resolverIcone,
          fechar,
        );
      });
      lista.appendChild(item);
    });
    atualizarTrigger();
  }

  trigger.addEventListener('click', () => {
    if (lista.hidden) abrir();
    else fechar();
  });

  document.addEventListener('click', (evento) => {
    if (!wrapper.contains(evento.target)) fechar();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fechar();
  });

  const api = { sincronizarOpcoes, atualizarTrigger, abrir, fechar };
  instancias.set(selectEl, api);
  sincronizarOpcoes();
  return api;
}

export function sincronizarTodosSelectsComIcone() {
  instancias.forEach((api) => api.sincronizarOpcoes());
}

export function preencher_opcoes_nivel(selectEl, min = 1, max = 31) {
  if (!selectEl) return;
  const valorAtual = selectEl.value;
  selectEl.innerHTML = '';
  for (let n = min; n <= max; n++) {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = String(n);
    selectEl.appendChild(opt);
  }
  if (valorAtual !== '') selectEl.value = valorAtual;
}

export function preencher_opcoes_raridade(selectEl) {
  if (!selectEl) return;
  const valorAtual = selectEl.value || 'legendary';
  selectEl.innerHTML = '';
  ['common', 'rare', 'epic', 'legendary'].forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.setAttribute('data-i18n', `serum.rarity.${id}`);
    selectEl.appendChild(opt);
  });
  selectEl.value = valorAtual;
}

export function initSelectsReinicio(ids) {
  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (select) inicializarSelectComIcone(select, { tipoIcone: 'reinicio', colunas: 1 });
  });
}

export function initSelectRaridade(id = 'raridade') {
  const select = document.getElementById(id);
  if (!select) return;
  preencher_opcoes_raridade(select);
  inicializarSelectComIcone(select, {
    resolverIcone: (valor) => obterIconeRaridade(valor),
    colunas: 1,
  });
}

export function initSelectsNivel(ids, min = 1, max = 31) {
  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    preencher_opcoes_nivel(select, min, max);
    inicializarSelectComIcone(select, { tipoIcone: null, colunas: 3 });
  });
}
