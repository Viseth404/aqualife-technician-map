// Vite build settings: React + Tailwind CSS v4 + PWA (installable app).
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: "Add to Home Screen", opens full screen, loads instantly after the first visit.
    VitePWA({
      registerType: 'prompt', // show "New version available" instead of reloading by itself
      injectRegister: false, // registered in src/components/PwaPrompts.jsx
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo-icon.png', 'login-logo.jpg'],
      manifest: {
        name: 'Aqualife – Technician Map',
        short_name: 'Aqualife',
        description: 'Service zones, technicians, and delivery prices for Aqualife in Phnom Penh.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0077C8',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Save the app itself on the phone.
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,json}'],
        // Original/unused image files are never saved on phones.
        globIgnores: ['**/icon.png', '**/icon-256.png', '**/464181173_*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // the main app file is ~1.2 MB
        cleanupOutdatedCaches: true,
        // Opening any page offline shows the app; never for the server function.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
        // Data (Supabase, address search, routing) is NOT cached – always live.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Map pictures you've already looked at (OpenStreetMap allows caching viewed tiles).
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // "@/..." means "src/..." (used by shadcn/ui components).
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // Maps + drawing + geometry libraries make one big file; that's OK for an admin tool.
  build: { chunkSizeWarningLimit: 1500 },
});
