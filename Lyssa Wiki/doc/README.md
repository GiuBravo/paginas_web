# Documentação — Wiki Lust Goddess

Calculadora web para *Lust Goddess*: custo de Alma/Créditos/Reinício, Super Soro e presentes de relacionamento.

**English:** [en/README.md](./en/README.md)

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [arquitetura.md](./arquitetura.md) | Visão geral, fluxo de dados e camadas do projeto |
| [modulos.md](./modulos.md) | Referência de cada módulo em `src/` |
| [calculos.md](./calculos.md) | Regras de cálculo (objetivo, orçamento, presentes) |
| [dados-jogo.md](./dados-jogo.md) | Fontes das tabelas e como atualizá-las |
| [i18n.md](./i18n.md) | Internacionalização (pt-BR / en) |
| [deploy.md](./deploy.md) | Build, preview e publicação estática |

## Início rápido

```bash
npm install
npm run dev      # desenvolvimento (Vite)
npm run build    # produção → pasta dist/
npm run preview  # servir dist/ localmente
```

## Estrutura do repositório

```
├── index.html          # Shell HTML (três abas principais)
├── public/             # Assets estáticos (ícones, favicon)
├── src/
│   ├── main.js         # Orquestração da aba Custo
│   ├── calc.js         # Motor de cálculo Alma/Créditos
│   ├── gameData.js     # Tabelas por raridade
│   ├── i18n.js         # Traduções
│   ├── locales/        # JSON pt-BR e en
│   ├── styles/         # tokens, layout, components
│   └── …               # Presentes, Super Soro, UI auxiliar
├── doc/                # Esta documentação
├── legacy/             # Versão monolítica anterior (HTML único)
└── scripts/            # Utilitários (ex.: processamento de ícones)
```

## Abas da aplicação

1. **Custo** — Calculadora de Alma, Créditos e Reinício (modos Objetivo e Orçamento), guia de reinícios e tabelas de referência.
2. **Fortalecimento** — Tabela de custos do Super Soro por raridade e faixa de nível.
3. **Presentes** — Calculadora de RP por inventário e tabela de presentes favoritos por mercenária.

## Convenções de código

- **Idioma do código:** nomes de funções e variáveis em português (`calcular_resultado`, `obterRaridade`), alinhado ao domínio do jogo.
- **Módulos ES:** `import`/`export` nativos; entrada em `index.html` via `<script type="module">`.
- **Sem framework UI:** DOM imperativo + CSS custom properties para tema.
- **Persistência:** `localStorage` para tema, idioma, aba ativa e campos do formulário.

## Licença e créditos

Dados derivados de wikis e ferramentas da comunidade *Lust Goddess* (LYSSA Wiki, lustgoddesswiki). Ícones de raridade conforme [LYSSA Wiki — Mercenaries](https://lyssa.wiki.gg/wiki/Mercenaries).
