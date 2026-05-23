# Wiki Lust Goddess

Calculadora web para estimar custos e progresso no jogo *Lust Goddess*: **Alma**, **Créditos**, **Reinício**, **Super Soro** e **presentes** de relacionamento.

Documentação: **[doc/README.md](./doc/README.md)** · [English](./doc/en/README.md)

## Funcionalidades

| Aba | Descrição |
|-----|-----------|
| **Custo** | Modo objetivo (quanto falta até R/L desejado) e orçamento (até onde chega com X Alma); tabelas de referência; guia de reinícios |
| **Fortalecimento** | Custos de Super Soro por raridade e faixa de nível |
| **Presentes** | RP por inventário; tabela de presentes favoritos por mercenária |

Recursos gerais: tema claro/escuro, pt-BR/en, copiar resultado, persistência no `localStorage`.

## Início rápido

```bash
npm install
npm run dev
```

Abra o endereço do terminal (geralmente `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

Artefatos em `dist/` — publique em qualquer hospedagem estática. Detalhes em [doc/deploy.md](./doc/deploy.md).

## Estrutura do código

```
src/
├── main.js           # Aba Custo e preferências globais
├── calc.js           # Cálculos Alma/Créditos
├── gameData.js       # Tabelas por raridade
├── refTablesUi.js    # Tabelas de referência
├── serum.js / serumUi.js
├── giftData.js / giftsCalc.js / giftsUi.js
├── i18n.js + locales/
└── styles/           # tokens, layout, components
```

Referência detalhada: [doc/modulos.md](./doc/modulos.md)

## Ícones

```bash
npm run icons:process
```

Gera PNGs transparentes em `public/icons/`. Raridades: SVG da [LYSSA Wiki](https://lyssa.wiki.gg/wiki/Mercenaries).

## Contribuir

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) — convenções, como atualizar dados do jogo e adicionar idiomas.

## Legado

`legacy/calculadora_alma_creditos_lust_goddess.html` — versão anterior em um único arquivo HTML.
