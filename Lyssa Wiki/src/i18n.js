import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import { nivel_maximo_com_dados, obter_reinicio_maximo, raridade_padrao } from './calc.js';
import { obter_nivel_maximo_efetivo } from './gameData.js';

const LOCALES = {
  'pt-BR': ptBR,
  en,
};

const STORAGE_KEY = 'idioma_armazenado';
const SUPPORTED = ['pt-BR', 'en'];

let locale = 'pt-BR';
let onLocaleChange = null;

function detectDefaultLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || 'pt-BR').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'pt-BR';
}

function interpolate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

export function getLocale() {
  return locale;
}

export function t(key, vars) {
  const dict = LOCALES[locale] || LOCALES['pt-BR'];
  const raw = dict[key] ?? LOCALES['pt-BR'][key] ?? key;
  return interpolate(raw, vars);
}

export function formatNumber(numero) {
  return numero.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR');
}

export function setOnLocaleChange(callback) {
  onLocaleChange = callback;
}

export function setLocale(next) {
  if (!SUPPORTED.includes(next)) return;
  locale = next;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === 'en' ? 'en' : 'pt-BR';
  document.title = t('meta.title');
  applyTranslations();
  if (onLocaleChange) onLocaleChange(locale);
}

export function initLocale() {
  locale = detectDefaultLocale();
  document.documentElement.lang = locale === 'en' ? 'en' : 'pt-BR';
  document.title = t('meta.title');
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });

  const temaBtn = document.getElementById('botao_tema');
  const iconeTema = document.getElementById('icone_tema');
  if (temaBtn) {
    const escuro = document.documentElement.classList.contains('tema_escuro');
    temaBtn.setAttribute(
      'aria-label',
      escuro ? t('btn.themeLight') : t('btn.themeDark'),
    );
    if (iconeTema) {
      iconeTema.src = escuro ? '/icons/sun.svg' : '/icons/moon.svg';
    }
  }

  const langPt = document.getElementById('lang_pt');
  const langEn = document.getElementById('lang_en');
  if (langPt) langPt.setAttribute('aria-label', t('lang.pt'));
  if (langEn) langEn.setAttribute('aria-label', t('lang.en'));
  document.querySelector('.lang-switcher')?.setAttribute('aria-label', t('aria.language'));
}

export function preencher_opcoes_reinicio(selectIds, raridade = raridade_padrao) {
  const maxR = obter_reinicio_maximo(raridade);
  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = '';
    for (let n = 0; n <= maxR; n++) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = t('restart.option', { n });
      select.appendChild(opt);
    }
    if (valorAtual !== '' && parseInt(valorAtual, 10) <= maxR) {
      select.value = valorAtual;
    } else if (valorAtual !== '') {
      select.value = String(maxR);
    }
  });
}

export function eh_ponto_inicial(reinicio, nivel) {
  return reinicio === 0 && nivel === 1;
}

export function texto_copia_resultado(resultado) {
  const fmt = formatNumber;
  if (eh_ponto_inicial(resultado.reinicio_atual, resultado.level_atual)) {
    return t('copy.lineTotal', {
      alma: fmt(resultado.alma_restante),
      creditos: fmt(resultado.creditos_restantes),
      credits: fmt(resultado.creditos_restantes),
    });
  }
  return [
    t('copy.lineDesired', {
      restart: resultado.reinicio_desejado,
      nivel: resultado.level_desejado,
      level: resultado.level_desejado,
      alma: fmt(resultado.total_alma_desejado),
      creditos: fmt(resultado.total_creditos_desejado),
      credits: fmt(resultado.total_creditos_desejado),
    }),
    t('copy.lineCurrent', {
      restart: resultado.reinicio_atual,
      nivel: resultado.level_atual,
      level: resultado.level_atual,
      alma: fmt(resultado.total_alma_atual),
      creditos: fmt(resultado.total_creditos_atual),
      credits: fmt(resultado.total_creditos_atual),
    }),
    t('copy.lineRemaining', {
      alma: fmt(resultado.alma_restante),
      creditos: fmt(resultado.creditos_restantes),
      credits: fmt(resultado.creditos_restantes),
    }),
  ].join('\n');
}

export function mensagem_erro(code, raridade = raridade_padrao) {
  const maxR = obter_reinicio_maximo(raridade);
  const maxL = obter_nivel_maximo_efetivo(raridade);
  if (code === 'INVALID_RANGE') {
    return t('error.invalidRange', { max: maxL, maxR });
  }
  if (code === 'CURRENT_AFTER_DESIRED') {
    return t('error.currentAfterDesired');
  }
  return t('error.invalidRange', { max: maxL, maxR });
}

export function texto_copia_simulacao(resultado) {
  const fmt = formatNumber;
  const linhas = [
    t('copy.budgetHeadline', {
      r0: resultado.reinicio_inicial,
      l0: resultado.nivel_inicial,
      r1: resultado.reinicio_final,
      l1: resultado.nivel_final,
      left: fmt(resultado.alma_sobra),
      credits: fmt(resultado.creditos_total),
    }),
    ...resultado.linhas.map((row) =>
      t('copy.budgetRow', {
        restart: row.reinicio,
        level: row.nivel,
        spend: fmt(row.gasto),
        left: fmt(row.sobra),
        credits: fmt(row.creditos),
      }),
    ),
  ];
  return linhas.join('\n');
}
