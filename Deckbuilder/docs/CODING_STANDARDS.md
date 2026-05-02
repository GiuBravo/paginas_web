## Objetivo

Padronizar nomes, estrutura e estilo **sem perder funcionalidade**, mantendo o código legível e fácil de manter.

## Comentários e idioma

- Comentários e documentação em código devem estar em **português do Brasil**.
- Em cada **função** (declaração ou expressão nomeada relevante), usar bloco JSDoc com:
  - descrição do que faz e efeitos colaterais importantes (DOM, rede, persistência);
  - `**@param`** para **todos** os parâmetros, incluindo valor **padrão** na descrição quando existir (mesmo que o parâmetro não seja usado no corpo — documentar como «reservado» ou «ignorado» se for o caso);
  - `**@returns`** quando o retorno não for óbvio pelo nome.
- **Variáveis** de módulo e estado global: comentário de linha ou bloco explicando papel e invariantes.
- **Estruturas condicionais e de repetição** (`if`, `else`, `switch`, `for`, `while`, `do`): comentário curto quando a condição ou o objetivo do loop não for imediato só pelos nomes envolvidos.

Para visão geral do repositório, ver também `docs/DOCUMENTACAO.md`.

## Naming (variáveis, funções, constantes)

- **Funções/variáveis**: `camelCase`
  - Funções devem ser verbos: `loadDeck()`, `saveDeck()`, `renderQueue()`
  - Booleanos devem parecer perguntas: `isReady`, `hasCache`, `canExport`
- **Classes**: `PascalCase`
- **Constantes**: `CONSTANT_CASE`
- **Evitar**:
  - Nomes gigantes (priorizar clareza e contexto)
  - Abreviações obscuras (`cfg`, `tmp`, `res2`, `md`), exceto siglas amplamente conhecidas no domínio (**API**, **URL**, **ID**)

### Regras práticas de tamanho

- Preferir até **2–4 palavras** por identificador quando possível.
- Se o nome está ficando longo, normalmente é sinal de:
  - função fazendo mais de uma coisa (extrair)
  - objeto sem tipo/forma clara (criar estrutura)

## Estrutura de arquivos

- `**index.html`**: só markup e imports; evitar lógica.
- `**src/style.css**`: CSS; evitar `style="..."` novo (legado ok).
- `**src/main.js**`: script global (compatibilidade). Refactors futuros podem migrar handlers inline para `addEventListener`.
- `**tools/**`: scripts de manutenção (extração, validação, etc.).

## Formatação

- **Prettier** é a fonte de verdade (`npm run format`).
- Manter **2 espaços** de indentação (via `.editorconfig`).

## Performance/otimização (sem mudar comportamento)

Prioridade para mudanças com baixo risco:

- reduzir re-render/desenho repetido no DOM (batch com `DocumentFragment`)
- evitar leituras repetidas de DOM em loops (cache de refs)
- debouncing/throttling onde já existe polling/typing
- evitar conversões redundantes (`String(...)`, `Number(...)`) em hot paths