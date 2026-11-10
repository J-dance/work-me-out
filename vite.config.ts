import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      // files in /public to include in the precache (in addition to the build output)
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'WorkMeOut',
        short_name: 'WorkMeOut',
        description: 'A simple, no fuss app for working out',
        theme_color: '#1f2041',
        background_color: '#1f2041',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // cache everything the app needs so it loads offline
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // The exercise list is downloaded when the service worker installs, so the app works offline
        // straight away. Keep the URL in sync with exercisesUrl in src/Components/ExerciseProvider.tsx;
        // it's pinned to a commit, so the revision only changes if that commit does.
        additionalManifestEntries: [
          { url: 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@79ca7b4/dist/exercises.json', revision: '79ca7b4' },
        ],
        // Exercise images are cached the first time they're viewed (or when a workout using them is saved).
        // They're also pinned to that commit and never change, so serve from cache once we have them.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net' && /\.(jpe?g|png|webp|gif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              // keep in sync with EXERCISE_IMAGES_CACHE in src/utils.ts (workouts pre-fill this cache)
              cacheName: 'exercise-images',
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
    tailwindcss(),
  ],
})
