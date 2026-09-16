import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Deux points d'entrée strictement séparés :
 * - Desktop / dev (`VITE_WEB_READONLY` absent) : `index.html` → `src/main.jsx`
 *   → application complète d'édition.
 * - Web déployé (`VITE_WEB_READONLY=true`) : `web.html` → `src/web.jsx` →
 *   tableau de bord en lecture seule. Le fichier est renommé en `index.html`
 *   après le build (étape du workflow + commande locale) pour que GitHub
 *   Pages le serve à la racine.
 * Les deux bundles ne partagent aucun code d'interface.
 *
 * La PWA (manifeste + service worker) n'est activée qu'en mode web :
 * le desktop Electron n'en a pas besoin.
 */
const isWebReadOnly = process.env.VITE_WEB_READONLY === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(isWebReadOnly
      ? [
          VitePWA({
            // Chemins RELATIFS : GitHub Pages sert l'app depuis /CA-Calculator/.
            injectRegister: 'script',
            filename: 'sw.js',
            manifestFilename: 'manifest.webmanifest',
            strategies: 'generateSW',
            registerType: 'autoUpdate',
            includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
            manifest: {
              name: 'CA Calculator — Tableau de bord',
              short_name: 'CA Calculator',
              description:
                "Tableau de bord du chiffre d'affaires en portage salarial (lecture seule).",
              start_url: './index.html',
              scope: './',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#1a1a2e',
              theme_color: '#1a1a2e',
              lang: 'fr',
              icons: [
                {
                  src: './pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: './pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
                {
                  src: './pwa-maskable-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            workbox: {
              // Firestore reste en réseau d'abord (données temps réel) ;
              // le cache IndexedDB de Firestore prend déjà le relais hors-ligne.
              runtimeCaching: [
                {
                  urlPattern: ({ url }) =>
                    url.hostname === 'firestore.googleapis.com' ||
                    url.hostname.endsWith('.googleapis.com') ||
                    url.hostname.endsWith('.gstatic.com') ||
                    url.hostname === 'apis.google.com' ||
                    url.hostname.endsWith('.firebaseio.com'),
                  handler: 'NetworkOnly',
                },
              ],
            },
          }),
        ]
      : []),
  ],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: isWebReadOnly ? { input: { index: 'web.html' } } : undefined,
  },
  server: {
    port: 5173,
  },
});

