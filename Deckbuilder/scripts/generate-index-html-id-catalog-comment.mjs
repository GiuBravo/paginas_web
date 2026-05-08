/**
 * @fileoverview Gera o comentário HTML com catálogo alfabético `id` → descrição PT-BR em `index.html`.
 *
 * Uso:
 * - `node scripts/generate-index-html-id-catalog-comment.mjs` — imprime o bloco no stdout (UTF-8).
 * - `node scripts/generate-index-html-id-catalog-comment.mjs --write` — substitui o catálogo dentro
 *   do comentário inicial de `index.html` (após a linha «Mapa de secções…»). Rode após adicionar/remover `id`.
 *
 * @see npm script `doc:refresh-index-ids` em `package.json`; mapa humano em `docs/INDEX_HTML.md`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const re = /\bid="([^"]+)"/g;
const ids = new Set();
let m;
while ((m = re.exec(html))) ids.add(m[1]);

/** Chaves de filtro (segmento após filter-) → rótulo curto PT */
const FILTER_KEY_PT = {
  type: 'tipo de carta',
  desc: 'descrição/efeito',
  archetype: 'arquétipo',
  subtype: 'subtipo',
  race: 'raça',
  attribute: 'atributo',
  level: 'nível',
  atk: 'ATK',
  def: 'DEF',
  linkval: 'valor Link',
  linkmarker: 'marcador Link',
  scale: 'escala Pêndulo',
  era: 'era',
  'date-region': 'região de data',
  banlist: 'banlist (filtro busca)',
  staple: 'staple',
  haseffect: 'tem descrição',
  price: 'preço TCGPlayer',
  cardset: 'nome da expansão',
  setcode: 'código da expansão',
  rarity: 'raridade',
  fname: 'nome (multi)',
};

const EXACT = {
  'app-layout': 'Raiz do layout em 3 colunas; classes alternam deck/filtros visíveis.',
  'col-filters': 'Coluna esquerda: filtros e ferramentas da coluna.',
  'col-results': 'Coluna central: busca, toolbar e lista/grelha de resultados.',
  'col-preview': 'Coluna direita: deck, estatísticas, import/export, PDF.',
  'card-tooltip': 'Tooltip flutuante da carta (hover).',
  'toast-container': 'Contentor de toasts.',
  'results-view': 'Lista ou grelha de cartas sugeridas pela busca.',
  'deck-items': 'Zonas principal/extra/side: filas de cartas (queue-item).',
  'deck-stats-bar': 'Barra de totais (monstros/magias/armadilhas/extra/preço/MD/G).',
  'deck-queue-pane': 'Painel scrollável da fila do deck.',
  'search-input': 'Campo principal de busca por nome (fname).',
  'search-qty': 'Quantidade a adicionar ao deck por clique.',
  'page-jump': 'Input ir para página N.',
  'page-total': 'Texto “/ total” da paginação.',
  'sort-by': 'Critério de ordenação dos resultados.',
  'theme-selector': 'Tema claro/escuro.',
  'select-api-card-lang': 'Idioma dos dados de carta na API.',
  'print-scale': 'Escala percentual do PDF (readonly + ajuste por código).',
  'file-deck-import': 'Input ficheiro importação deck (ZIP/CSV/YDK).',
  'saved-decks-select': 'Deck guardado a carregar.',
  'deck-banlist-select': 'Formato de banlist para validação do deck.',
  'deck-sort-by': 'Critério de ordenação das pilhas do deck.',
  'btn-deck-validate-toggle': 'Alterna validação do deck ligada/desligada.',
  'btn-deck-validate-toggle-icon': 'Ícone (validação ligada = clipboard / desligada = ban).',
  'btn-deck-validate-toggle-label': 'Texto do botão de validação (stack label + ícone).',
  'btn-deck-save': 'Guardar deck atual nos guardados.',
  'btn-deck-rename': 'Renomear deck guardado selecionado.',
  'btn-deck-delete-saved': 'Apagar deck guardado selecionado.',
  'btn-deck-order': 'Ordenar deck pelo critério selecionado.',
  'deck-order-icon': 'Ícone do critério de ordenação do deck.',
  'btn-open-scanner': 'Abre fluxo OCR / câmara.',
  'btn-open-calibrator': 'Abre calibrador OCR.',
  'btn-open-export-menu': 'Abre menu de exportações.',
  'btn-reset-filters': 'Chama resetFilters() — limpa filtros e chips.',
  'btn-toggle-fullscreen': 'Fullscreen da app.',
  'btn-toggle-filters-column': 'Mostra/oculta coluna de filtros.',
  'btn-toggle-deck-column': 'Ciclo largura coluna deck (normal/wide/oculto).',
  'btn-toggle-results-view': 'Alterna lista/grelha dos resultados.',
  'btn-toggle-queue-view': 'Alterna vista da fila do deck.',
  'btn-toggle-pdf-preview': 'Mostra/oculta pré-visualização PDF.',
  'btn-toggle-tooltip': 'Modo tooltip compacto/expandido.',
  'btn-help-toggle': 'Modo ajuda (rótulos guia).',
  'btn-help-mouse': 'Abre modal ajuda rato/teclado.',
  'btn-credits': 'Abre modal de créditos.',
  'btn-order': 'Inverte ordenação ou embaralha se critério = aleatório.',
  'order-icon': 'Ícone seta ordenação.',
  'btn-random-filter-card': 'Carta aleatória respeitando filtros atuais.',
  'btn-deck-random-main': 'Abre modal de amostra aleatória do main.',
  'btn-random-main-toggle-view': 'Alterna modo de vista no modal aleatório.',
  'label-random-main-toggle-view': 'Label acessível para o toggle de vista.',
  'icon-random-main-toggle-view': 'Ícone do toggle de vista (modal aleatório).',
  'random-main-reroll': 'Nova amostra aleatória.',
  'random-main-close': 'Fecha modal aleatório.',
  'random-main-cards': 'Grelha/lista de cartas no modal aleatório.',
  'random-main-empty': 'Mensagem quando não há cartas no modal.',
  'result-info-row': 'Célula esquerda do rodapé de resultados (contagem «N–M de T»).',
  'result-info': 'Texto “N resultados” / estado.',
  'result-db-version-wrap': 'Contentor da versão da API/cardinfo.',
  'result-db-version-label': 'Label da versão DB.',
  'result-db-version': 'Valor da versão DB exibida.',
  'preview-frame': 'iframe da pré-visualização PDF (blob URL).',
  'import-overlay': 'Overlay genérico de importação (ficheiro).',
  'import-overlay-label': 'Título do overlay de import.',
  'deck-import-overlay': 'Overlay de progresso importação deck.',
  'deck-import-overlay-label': 'Título overlay import deck.',
  'deck-import-overlay-sub': 'Subtexto (passo atual).',
  'deck-import-overlay-bar': 'Barra de progresso import deck.',
  'global-export-overlay': 'Overlay de progresso exportação global.',
  'global-export-overlay-label': 'Título export global.',
  'global-export-overlay-sub': 'Subtexto export global.',
  'global-export-progress-bar': 'Barra de progresso export global.',
  'export-menu-overlay': 'Backdrop do menu export.',
  'export-menu-panel': 'Painel do menu export.',
  'export-menu-close': 'Fechar menu export.',
  'export-menu-title-text': 'Título do menu export.',
  'export-menu-step-root': 'Passo raiz do assistente export.',
  'export-menu-step-formats': 'Passo formatos export.',
  'export-menu-back-wrap': 'Área botão voltar no menu export.',
  'export-menu-back': 'Voltar um passo no menu export.',
  'card-sets-panel': 'Painel lateral impressões/expansões da carta.',
  'card-sets-panel-backdrop': 'Backdrop do painel de sets.',
  'card-sets-panel-body': 'Corpo HTML listagem de sets.',
  'card-sets-panel-close': 'Fechar painel de sets.',
  'card-sets-panel-title': 'Título do painel de sets.',
  'deck-validity-tooltip': 'Tooltip flutuante regras validação deck.',
  'deck-validity-tooltip-body': 'Corpo HTML do tooltip de validação.',
  'deck-validity-flag': 'Indicador visual válido/inválido.',
  'deck-validity-text': 'Texto curto estado validação.',
  'deck-stat-tooltip': 'Tooltip totais por categoria na barra stats.',
  'deck-stat-tooltip-body': 'Corpo do tooltip de stats.',
  'deck-stat-total': 'Número total de cartas no deck.',
  'deck-stat-monsters': 'Contagem monstros.',
  'deck-stat-spells': 'Contagem magias.',
  'deck-stat-traps': 'Contagem armadilhas.',
  'deck-stat-extra': 'Contagem extra deck.',
  'deck-stat-price': 'Soma preço estimado.',
  'deck-stat-md-wrap': 'Área estatísticas Master Duel (gems).',
  'deck-stat-md-ur': 'Contagem UR MD.',
  'deck-stat-md-ur-gems': 'Gemas UR MD.',
  'deck-stat-md-sr': 'Contagem SR MD.',
  'deck-stat-md-sr-gems': 'Gemas SR MD.',
  'deck-stat-md-r': 'Contagem R MD.',
  'deck-stat-md-r-gems': 'Gemas R MD.',
  'deck-stat-md-n': 'Contagem N MD.',
  'deck-stat-md-n-gems': 'Gemas N MD.',
  'deck-stat-genesys-wrap': 'Área pontos Genesys.',
  'deck-stat-genesys': 'Valor pontos Genesys.',
  'date-start': 'Data inicial filtro lançamento.',
  'date-end': 'Data final filtro lançamento.',
  'date-period-group': 'Grupo inputs de período (mostrado conforme filtro era).',
  'group-subtype': 'Grupo subtipo (visível após tipo monstro).',
  'group-race': 'Grupo raça (visível após tipo monstro).',
  'monster-extras': 'Grupo atributo/nível/link/escala (monstro).',
  'banlist-only-container': 'Checkbox “só banlist”.',
  'enable-banlist-only': 'Input checkbox banlist-only.',
  'filter-haseffect-group': 'Grupo filtro “tem descrição”.',
  'manual-card-type': 'Select tipo manual OCR (AUTO, …).',
  'manual-rarity': 'Select raridade manual OCR.',
  'ocr-container': 'Fullscreen scanner/OCR.',
  'ocr-video': 'Elemento vídeo câmara.',
  'preview-canvas': 'Canvas pré-visualização recorte OCR.',
  'vision-label': 'Texto de estado visão/OCR.',
  'scanner-visual': 'Moldura visual região de scan.',
  'ocr-log': 'Consola de log OCR.',
  'btn-close-ocr': 'Fechar scanner OCR.',
  'ocr-canvas-internal': 'Canvas interno processamento (oculto).',
  'progress-bar': 'Barra de progresso genérica (import/export).',
  'tooltip-img': 'Imagem no tooltip.',
  'tooltip-name': 'Nome no tooltip.',
  'tooltip-beta-name-row': 'Linha nome beta (EN).',
  'tooltip-archetype-row': 'Linha arquétipo no tooltip.',
  'tooltip-info-rows': 'Linhas ATK/DEF/tipo no tooltip.',
  'tooltip-text': 'Texto de efeito no tooltip.',
  'tooltip-details-modal': 'Modal detalhe expandido do tooltip.',
  'tooltip-details-modal-backdrop': 'Backdrop modal detalhe.',
  'tooltip-details-modal-title': 'Título modal detalhe.',
  'tooltip-details-modal-close': 'Fechar modal detalhe.',
  'tooltip-details-modal-body': 'Corpo: recebe nó #card-tooltip reparentado.',
  'deck-name-modal': 'Modal pedir nome deck.',
  'deck-name-modal-backdrop': 'Backdrop modal nome.',
  'deck-name-modal-title': 'Título modal nome.',
  'deck-name-modal-input': 'Input texto nome.',
  'deck-name-modal-cancel': 'Cancelar modal nome.',
  'deck-name-modal-ok': 'Confirmar modal nome.',
  'deck-swap-modal': 'Modal escolher pilha para troca.',
  'deck-swap-modal-backdrop': 'Backdrop swap.',
  'deck-swap-modal-title': 'Título swap.',
  'deck-swap-modal-list': 'Lista botões pilhas.',
  'deck-swap-modal-cancel': 'Cancelar swap.',
  'random-main-modal': 'Modal amostra aleatória main.',
  'random-main-modal-backdrop': 'Backdrop modal aleatório.',
  'random-main-modal-title': 'Título modal aleatório.',
  'help-mouse-modal': 'Modal ajuda rato/teclado.',
  'help-mouse-modal-backdrop': 'Backdrop ajuda rato.',
  'help-mouse-modal-title': 'Título ajuda rato.',
  'help-mouse-modal-close': 'Fechar ajuda rato.',
  'help-mouse-modal-body': 'Corpo texto ajuda rato.',
  'credits-modal': 'Modal créditos.',
  'credits-modal-backdrop': 'Backdrop créditos.',
  'credits-modal-title': 'Título créditos.',
  'credits-modal-close': 'Fechar créditos.',
  'cardsets-datalist': 'Datalist nomes de expansões (cardset).',
  'datalist-rarities': 'Datalist raridades.',
  'datalist-setcodes': 'Datalist códigos set.',
  'datalist-date-region': 'Datalist região de data (OCG/TCG/…).',
};

function filterSegment(id) {
  const mm = id.match(/^filter-(.+)-(input|add|add-chip|chips|clear|clear-chips|op)$/);
  if (!mm) return null;
  return mm[1];
}

function describe(id) {
  if (EXACT[id]) return EXACT[id];

  if (id.startsWith('datalist-filter-')) {
    const k = id.slice('datalist-filter-'.length);
    const pt = FILTER_KEY_PT[k] || k;
    return `Datalist de sugestões: ${pt}.`;
  }
  if (id === 'datalist-date-region') return EXACT[id];
  if (id.startsWith('datalist-')) return `Datalist: ${id.replace('datalist-', '')}.`;

  if (id.startsWith('filter-')) {
    const seg = filterSegment(id);
    if (seg) {
      const pt = FILTER_KEY_PT[seg] || seg;
      if (id.endsWith('-input')) return `Campo do filtro: ${pt}.`;
      if (id.endsWith('-add')) return `Botão adicionar chip: ${pt}.`;
      if (id.endsWith('-add-chip')) return `Botão adicionar chip: ${pt}.`;
      if (id.endsWith('-chips')) return `Chips selecionados: ${pt}.`;
      if (id.endsWith('-clear')) return `Limpar chips: ${pt}.`;
      if (id.endsWith('-clear-chips')) return `Limpar chips: ${pt}.`;
      if (id.endsWith('-op')) return `Operador comparativo (nível/ATK/DEF): ${pt}.`;
    }
    if (id === 'filter-atk' || id === 'filter-def') return `Valor numérico ${id.includes('atk') ? 'ATK' : 'DEF'}.`;
    if (id === 'filter-price-min' || id === 'filter-price-max') return `Limite ${id.endsWith('min') ? 'mín' : 'máx'} preço TCGPlayer.`;
    if (id === 'filter-desc') return 'Campo texto descrição/efeito (busca fuzzy).';
  }

  if (id.startsWith('btn-')) return `Botão de ação: ${id.slice(4).replace(/-/g, ' ')}.`;
  if (id.startsWith('icon-')) return `Ícone decorativo/estado: ${id.slice(5).replace(/-/g, ' ')}.`;
  if (id.startsWith('label-')) return `Label acessível associado a um botão: ${id.slice(6).replace(/-/g, ' ')}.`;

  return `Elemento com id «${id}» (ver uso em src/main.js / getEl).`;
}

const sorted = [...ids].sort((a, b) => a.localeCompare(b));
const lines = sorted.map((id) => `  • ${id} — ${describe(id)}`);

const block = [
  '',
  '  ── Catálogo de ids (gerado: consulte scripts/generate-index-html-id-catalog-comment.mjs) ──',
  `  Total: ${sorted.length} ids. Ordem alfabética; descrições em PT-BR para navegação humana.`,
  '',
  ...lines,
  '',
  '  Fim do catálogo de ids.',
].join('\n');

if (process.argv.includes('--write')) {
  const idxPath = path.join(root, 'index.html');
  let file = fs.readFileSync(idxPath, 'utf8');
  const reMerge =
    /(  Mapa de secções e IDs notáveis: docs\/INDEX_HTML\.md)(?:\n  ── Catálogo de ids[\s\S]*?\n  Fim do catálogo de ids\.)?\n-->/;
  if (!reMerge.test(file)) {
    console.error('Não encontrei o âncora do comentário em index.html (Mapa de secções… / -->).');
    process.exit(1);
  }
  file = file.replace(reMerge, `$1${block}\n-->`);
  fs.writeFileSync(idxPath, file, 'utf8');
  console.error(`Catálogo de ${sorted.length} ids escrito em index.html.`);
} else {
  process.stdout.write(block);
}
