import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Publicado em https://fernandoslealpt.github.io/ucl-fantasy-copilot/
export default defineConfig({
  base: '/ucl-fantasy-copilot/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fantasy Copilot',
        short_name: 'Copilot',
        description: 'O teu copiloto para o Champions League Fantasy',
        lang: 'pt-PT',
        theme_color: '#14532d',
        background_color: '#f3f6f1',
        display: 'standalone',
        start_url: '/ucl-fantasy-copilot/',
        scope: '/ucl-fantasy-copilot/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*-cyrillic*', '**/*-greek*', '**/*-vietnamese*'],
        runtimeCaching: [
          {
            // Dados: tenta sempre a rede (frescura!), usa a cache só sem rede.
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*\/data\/latest\/.*\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'dados', networkTimeoutSeconds: 8, expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
