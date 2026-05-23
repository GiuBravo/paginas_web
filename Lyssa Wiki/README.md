# Calculadora de Custo — Lust Goddess

Calculadora web para estimar o custo restante de **Alma** e **Créditos** entre o progresso atual e o objetivo no jogo *Lust Goddess*.

## Funcionalidades

- **Dois estilos de calculadora:** objetivo (quanto falta até R/L desejado) e orçamento (simula até onde chega com X pontos de Alma)
- **Raridade:** Comum, Rara, Épica e Lendária (custos e reinícios máximos do jogo)
- Tabelas de referência (Alma/Créditos, acumulado ou por nível) e Super Soro com ícones
- Cálculo automático ao alterar campos
- Tema claro/escuro (respeita preferência do sistema na primeira visita)
- Idiomas: português (pt-BR) e inglês (en)
- Copiar resultado para a área de transferência
- Valores salvos no navegador (modo, raridade, tema e idioma preservados no reset)

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (geralmente `http://localhost:5173`).

## Build para produção

```bash
npm run build
npm run preview
```

Os arquivos estáticos ficam em `dist/`. Publique essa pasta em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, etc.).

## Estrutura

- `src/gameData.js` — tabelas por raridade (wiki/planilha)
- `src/calc.js` — cálculo objetivo e simulação de orçamento
- `src/refTablesUi.js` — tabelas de referência
- `src/serum.js` / `src/serumUi.js` — Super Soro
- `src/i18n.js` — traduções e formatação de números
- `src/locales/` — textos pt-BR e en
- `src/main.js` — interface e persistência
- `legacy/` — versão anterior em um único HTML

## Ícones do jogo (fundo transparente)

Os PNGs em `public/icons/` são gerados a partir dos assets originais, com remoção do fundo:

```bash
npm run icons:process
```

Mapeamento: estrela = reinício, moeda = créditos, cartas = alma. `serum.png` (lustgoddesswiki). Raridades: `rarity-*.svg` de [LYSSA Wiki — Mercenaries](https://lyssa.wiki.gg/wiki/Mercenaries).

## Adicionar idioma

1. Crie `src/locales/xx.json` com as mesmas chaves de `pt-BR.json`
2. Importe o arquivo em `src/i18n.js` e registre em `LOCALES`
3. Adicione o botão no seletor de idioma em `index.html` e `main.js`
