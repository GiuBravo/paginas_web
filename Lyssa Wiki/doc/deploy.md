# Deploy e build

## Scripts npm

| Comando | Ação |
|---------|------|
| `npm install` | Instala Vite (única devDependency) |
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Gera `dist/` otimizado para produção |
| `npm run preview` | Serve `dist/` localmente para teste |
| `npm run icons:process` | Processa PNGs de ícones (Python) |

## Saída do build

Após `npm run build`:

```
dist/
├── index.html
├── assets/          # JS e CSS com hash no nome
├── icons/
├── favicon.svg
└── …                # tudo de public/
```

`base: './'` garante que links relativos funcionem ao abrir `index.html` diretamente ou em subpastas (ex.: `https://usuario.github.io/repo/`).

## Hospedagem estática

Qualquer host de arquivos estáticos serve:

- **GitHub Pages** — publique o conteúdo de `dist/` na branch `gh-pages` ou via Actions.
- **Netlify / Vercel** — build command: `npm run build`, publish directory: `dist`.
- **Servidor próprio** — copie `dist/` para o document root.

Não é necessário Node em produção.

## Assets externos

Imagens de mercenárias e presentes referenciam caminhos `/relationship/images/…`. Em deploy isolado, esses caminhos precisam existir no mesmo host ou ser ajustados. Os ícones em `public/icons/` são empacotados com o build.

## Variáveis de ambiente

O projeto não usa `.env` em runtime. Arquivos `.env` estão no `.gitignore` por precaução.

## Segurança (CSP e cabeçalhos)

O projeto inclui proteções contra XSS e injeção de payloads:

- **`src/security.js`** — escape de HTML, sanitização de URLs, validação de `localStorage` e buscas.
- **`index.html`** — meta tags CSP, `nosniff` e política de referrer.
- **`public/_headers`** — cabeçalhos para Netlify (e hosts compatíveis) em produção.
- **`vite.config.js`** — mesmos cabeçalhos em `npm run dev` e `npm run preview`.

Em servidores próprios (nginx, Apache), replique os cabeçalhos de `public/_headers` ou use `securityResponseHeaders()` em `src/security.js` como referência.

## Checklist pré-publicação

- [ ] `npm run build` sem erros
- [ ] `npm run preview` — testar as três abas
- [ ] Tema claro/escuro e troca de idioma
- [ ] Modos Objetivo e Orçamento com valores conhecidos
- [ ] Links de ícones e imagens de presentes carregam no ambiente alvo

## Versão legada

Para comparar comportamento antigo, abra `legacy/calculadora_alma_creditos_lust_goddess.html` (não passa pelo Vite).
