import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Deux points d'entrée strictement séparés :
 * - Desktop / dev (`VITE_WEB_READONLY` absent) : `index.html` → `src/main.jsx`
 *   → application complète d'édition.
 * - Web déployé (`VITE_WEB_READONLY=true`) : `web.html` → `src/web.jsx` →
 *   tableau de bord en lecture seule. Le fichier est renommé en `index.html`
 *   après le build (étape du workflow + commande locale) pour que GitHub
 *   Pages le serve à la racine.
 * Les deux bundles ne partagent aucun code d'interface.
 */
const isWebReadOnly = process.env.VITE_WEB_READONLY === 'true';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: isWebReadOnly ? { input: { index: 'web.html' } } : undefined,
  },
  server: {
    port: 5173,
  },
});
