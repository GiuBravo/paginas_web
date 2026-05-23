/** Vite — SPA estática; base relativa para GitHub Pages e subpastas. */
import { defineConfig } from 'vite';
import { securityResponseHeaders } from './src/security.js';

const headersSeguranca = securityResponseHeaders();

export default defineConfig({
  base: './',
  server: { headers: headersSeguranca },
  preview: { headers: headersSeguranca },
});
