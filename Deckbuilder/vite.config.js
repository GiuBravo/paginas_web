/**
 * Configuração do Vite para o DeckBuilder.
 *
 * Em desenvolvimento (`npx vite . --port 5173` ou `npm run dev`), define um proxy
 * same-origin sob o prefixo `/__ygo_images__/`, que encaminha para o CDN oficial
 * `images.ygoprodeck.com`. Assim o app pode fazer HEAD/requisições como mesma origem
 * antes de usar URLs diretas nas exportações ou previews.
 *
 * @see https://vite.dev/config/server-options.html#server-proxy
 */
import { defineConfig } from 'vite';

/**
 * Objeto de configuração exportado como default do módulo ES.
 * Não recebe parâmetros — o Vite invoca `defineConfig` com este literal.
 *
 * @returns {import('vite').UserConfig} Configuração do servidor de desenvolvimento e build.
 */
export default defineConfig({
  // Opções que afetam sobretudo `vite dev` e o servidor de pré-visualização.
  server: {
    // Mapa de caminhos prefixados → alvo HTTP do proxy.
    proxy: {
      // Prefixo artificial na mesma origem do dev server.
      '/__ygo_images__': {
        // CDN público das imagens de cartas YGOPRODeck (HTTPS).
        target: 'https://images.ygoprodeck.com',
        // Envia header Host do alvo (evita alguns hosts que rejeitam Host do localhost).
        changeOrigin: true,
        // Valida certificado TLS do alvo (mantém true em ambientes normais).
        secure: true,
        /**
         * Remove o prefixo `/__ygo_images__` antes de encaminhar ao CDN.
         *
         * @param {string} path Caminho da URL já com prefixo do proxy (ex.: `/__ygo_images__/images/cards/123.jpg`).
         * @returns {string} Caminho sem o prefixo, apto ao CDN (ex.: `/images/cards/123.jpg`).
         */
        rewrite: (path) => path.replace(/^\/__ygo_images__/, ''),
      },
    },
  },
});
