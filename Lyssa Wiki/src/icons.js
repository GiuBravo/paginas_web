const ICON_CACHE = '8';

export const ICONS = {
  reinicio: `/icons/reinicio.png?v=${ICON_CACHE}`,
  alma: `/icons/alma.png?v=${ICON_CACHE}`,
  creditos: `/icons/creditos.png?v=${ICON_CACHE}`,
  serum: `/icons/serum.png?v=${ICON_CACHE}`,
};

/** Ícones de raridade (LYSSA Wiki — lyssa.wiki.gg/wiki/Mercenaries). */
export const ICONES_RARIDADE = {
  common: `/icons/rarity-common.svg?v=${ICON_CACHE}`,
  rare: `/icons/rarity-rare.svg?v=${ICON_CACHE}`,
  epic: `/icons/rarity-epic.svg?v=${ICON_CACHE}`,
  legendary: `/icons/rarity-legendary.svg?v=${ICON_CACHE}`,
};

export function obterIconeRaridade(raridade) {
  return ICONES_RARIDADE[raridade] ?? null;
}

/** Ícone de Alma (MP) conforme a raridade da mercenária. */
export function obterIconeAlma(raridade = 'legendary') {
  return obterIconeRaridade(raridade) ?? ICONS.alma;
}

export function sincronizarIconesAlma(raridade, root = document) {
  const src = obterIconeAlma(raridade);
  if (!root) return;
  root.querySelectorAll('[data-icon-alma]').forEach((img) => {
    img.src = src;
  });
}

export function criarImgIcone(tipo, tamanho = 20, classe = 'game-icon') {
  const img = document.createElement('img');
  const src = ICONS[tipo] ?? obterIconeRaridade(tipo);
  img.src = src;
  img.alt = '';
  img.width = tamanho;
  img.height = tamanho;
  img.className = classe;
  img.setAttribute('aria-hidden', 'true');
  return img;
}

export function criarImgPorSrc(src, tamanho = 20, classe = 'game-icon') {
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.width = tamanho;
  img.height = tamanho;
  img.className = classe;
  img.setAttribute('aria-hidden', 'true');
  return img;
}
