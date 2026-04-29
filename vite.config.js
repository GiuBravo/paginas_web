/**
 * Proxy same-origin para o CDN images.ygoprodeck.com em `npx vite . --port 5173`.
 * Deckbuilder faz HEAD em `/__ygo_images__/...` antes de usar o proxy nos exports.
 */
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/__ygo_images__': {
                target: 'https://images.ygoprodeck.com',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/__ygo_images__/, '')
            }
        }
    }
});
