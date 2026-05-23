# Guia de contribuição

Obrigado por ajudar a melhorar a calculadora. Este projeto é front-end estático (Vite + JavaScript modular).

## Configuração

```bash
npm install
npm run dev
```

## O que documentar ao mudar código

- **Dados do jogo** — atualize `src/gameData.js`, `serum.js` ou `giftData.js` e descreva a fonte no PR. Ver [doc/dados-jogo.md](./doc/dados-jogo.md) ([EN](./doc/en/game-data.md)).
- **Novas chaves de texto** — adicione em `pt-BR.json` **e** `en.json`. Ver [doc/i18n.md](./doc/i18n.md).
- **Comportamento de cálculo** — explique a regra em [doc/calculos.md](./doc/calculos.md) se não for óbvia.

## Estilo de código

- Nomes em português para funções e variáveis de domínio (`calcular_resultado`, `obterRaridade`).
- Módulos pequenos: dados separados da UI.
- Evite dependências extras sem necessidade clara.
- Comentários apenas onde a regra de negócio não é evidente no código.

## Commits e PRs

- Mensagens claras no imperativo (“Adiciona filtro por tier em presentes”).
- Inclua passos de teste manual (aba afetada, idioma, tema).
- Não inclua `node_modules/`, `dist/` ou segredos.

## Testes

Não há suíte automatizada hoje. Valide manualmente:

1. Aba e fluxo alterados.
2. Troca pt-BR ↔ en.
3. Tema claro e escuro.
4. Recarregar página (persistência `localStorage`).
5. `npm run build` sem erros.

## Reportar dados incorretos

Abra uma issue com: raridade, modo (objetivo/orçamento), valores de entrada, resultado esperado vs obtido e link para fonte na wiki, se houver.
