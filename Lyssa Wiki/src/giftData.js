/** Dados de relacionamento — presentes favoritos por mercenário (fonte: Lust Goddess Wiki). */

export const META_PRESENTES = {
  pontosObjetivo: 35100,
  nivelMaximo: 20,
};

export const PONTOS_FAVORITO = { t1: 12, t2: 24, t3: 60 };
export const PONTOS_NORMAL = { t1: 10, t2: 20, t3: 50 };

export const TIERS_PRESENTE = ['t1', 't2', 't3'];
export const VARIANTES_PRESENTE = ['1', '2', '3'];

/** @type {{ name: string, t1: string, t2: string, t3: string }[]} */
export const MERCENARIAS_PRESENTES = [
  { name: 'Alisha', t1: '1', t2: '1', t3: '1' },
  { name: 'Arachne', t1: '2', t2: '2', t3: '3' },
  { name: 'Asha', t1: '1', t2: '2', t3: '3' },
  { name: 'Bea', t1: '1', t2: '1', t3: '2' },
  { name: 'Belle', t1: '3', t2: '3', t3: '3' },
  { name: 'Blanche', t1: '2', t2: '1', t3: '2' },
  { name: 'Bonita', t1: '3', t2: '1', t3: '3' },
  { name: 'Britney', t1: '3', t2: '1', t3: '2' },
  { name: 'Casey', t1: '2', t2: '2', t3: '2' },
  { name: 'Charlotte', t1: '3', t2: '1', t3: '1' },
  { name: 'Esther', t1: '1', t2: '2', t3: '2' },
  { name: 'Grace', t1: '2', t2: '2', t3: '1' },
  { name: 'Harper', t1: '1', t2: '3', t3: '1' },
  { name: 'Hilda', t1: '3', t2: '3', t3: '2' },
  { name: 'Irma', t1: '2', t2: '2', t3: '3' },
  { name: 'Kiana', t1: '2', t2: '3', t3: '2' },
  { name: 'Kirsten', t1: '3', t2: '3', t3: '2' },
  { name: 'Kitty', t1: '1', t2: '3', t3: '3' },
  { name: 'Lilith', t1: '3', t2: '1', t3: '3' },
  { name: 'Lola', t1: '2', t2: '2', t3: '2' },
  { name: 'Lorraine', t1: '3', t2: '2', t3: '2' },
  { name: 'Lucretia', t1: '2', t2: '2', t3: '3' },
  { name: 'Mitsuki', t1: '3', t2: '2', t3: '1' },
  { name: 'Morana', t1: '2', t2: '3', t3: '3' },
  { name: 'Naomi', t1: '3', t2: '3', t3: '3' },
  { name: 'Nicole', t1: '2', t2: '3', t3: '1' },
  { name: 'Nonna', t1: '1', t2: '1', t3: '2' },
  { name: 'Nymeria', t1: '1', t2: '2', t3: '2' },
  { name: 'O-Rinn', t1: '1', t2: '3', t3: '2' },
  { name: 'Omega', t1: '3', t2: '3', t3: '1' },
  { name: 'Pixie', t1: '2', t2: '2', t3: '2' },
  { name: 'Ravenna', t1: '1', t2: '1', t3: '2' },
  { name: 'Regina', t1: '2', t2: '1', t3: '1' },
  { name: 'River', t1: '2', t2: '2', t3: '2' },
  { name: 'Rose', t1: '1', t2: '2', t3: '1' },
  { name: 'Selina', t1: '1', t2: '2', t3: '3' },
  { name: 'Shelby', t1: '3', t2: '3', t3: '1' },
  { name: 'Sixtine', t1: '3', t2: '1', t3: '1' },
  { name: 'Thora', t1: '1', t2: '1', t3: '1' },
  { name: 'Tsintah', t1: '2', t2: '3', t3: '1' },
  { name: 'Vespina', t1: '1', t2: '2', t3: '1' },
  { name: 'Victoria', t1: '2', t2: '1', t3: '3' },
  { name: 'Vivienne', t1: '2', t2: '1', t3: '3' },
  { name: 'Wendy', t1: '1', t2: '1', t3: '3' },
  { name: 'Zelia', t1: '3', t2: '3', t3: '3' },
  { name: 'Zoe & Chloe', t1: '1', t2: '3', t3: '3' },
];

export const INVENTARIO_PADRAO = () => ({
  t1: { 1: 0, 2: 0, 3: 0 },
  t2: { 1: 0, 2: 0, 3: 0 },
  t3: { 1: 0, 2: 0, 3: 0 },
});

export function nomeArquivoMerc(nome) {
  return nome.replace(/[\\/:*?"<>|]/g, '_');
}

export function caminhoIconeMerc(nome) {
  return `/relationship/images/mercs/${nomeArquivoMerc(nome)}.png`;
}

export function caminhoPresente(tier, variante) {
  const mapa = { t1: 'T1', t2: 'T2', t3: 'T3' };
  return `/relationship/images/gifts/${mapa[tier]}-${variante}.png`;
}

export function caminhoOutfit(nome) {
  return `/relationship/images/outfits/${nomeArquivoMerc(nome)}.png`;
}

export function caminhoOutfitDesc(nome) {
  return `/relationship/images/outfits-desc/${nomeArquivoMerc(nome)}.png`;
}
