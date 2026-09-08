import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    chunkSizeWarningLimit: 600,  // eleva el warning a 600KB (exceljs/bwip-js pesan mucho pero son lazy)
    rollupOptions: {
      output: {
        // Manual chunks para las libs mas pesadas — las separa en chunks dedicados
        // que se cachean aparte y se lazy-cargan solo cuando se usan.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // ExcelJS (~930KB): usado solo en export CoA/Trazabilidad/Importador
          if (id.includes('/exceljs/')) return 'exceljs'
          // bwip-js (~913KB): usado solo en EtiquetasQR (GS1 barcodes)
          if (id.includes('/bwip-js/')) return 'bwip-js'
          // PDF libs: pdf-lib + related usado en CoA Parser + cuaderno
          if (id.includes('/pdfjs-dist/') || id.includes('/pdf-lib/')) return 'pdf-libs'
          // ReactFlow (arbol visual): ~300KB
          if (id.includes('/reactflow/') || id.includes('@reactflow/')) return 'reactflow'
          // BPMN-js: usado solo en /procesos
          if (id.includes('/bpmn-js/') || id.includes('/diagram-js/')) return 'bpmn'
          // Nivo charts (sankey, heatmap): lazy en PaginaMetricas
          if (id.includes('/@nivo/')) return 'nivo'
          // FullCalendar: usado solo en /calendario
          if (id.includes('/@fullcalendar/') || id.includes('/fullcalendar-')) return 'fullcalendar'
          // Framer motion: usado en toda la app, dejarlo en vendor chunk
          if (id.includes('/framer-motion/')) return 'motion'
          // React core aislado (react + react-dom + scheduler). Otras libs `react-*`
          // se quedan en el bundle general para no inflar este chunk.
          if (id.match(/node_modules\/(react|react-dom|scheduler)\//)) return 'react-core'
          // Libs de utilidad que suelen verse agrupadas si son amplias
          if (id.includes('/lucide-react/')) return 'lucide'
          if (id.includes('/date-fns/')) return 'date-fns'
          // Supabase client
          if (id.includes('/@supabase/')) return 'supabase'
          // TanStack (query, table, virtual)
          if (id.includes('/@tanstack/')) return 'tanstack'
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' y no 'autoUpdate': con autoUpdate el SW nuevo se activa solo y
      // recarga la pagina abajo de los pies del usuario, que en medio de una
      // carga de datos es peor que quedarse una version atras. Con 'prompt' se
      // dispara onNeedRefresh (src/lib/pwa.ts), que muestra el toast
      // "Nueva version disponible / Recargar" y deja la decision del lado del
      // que esta usando la app.
      registerType: 'prompt',
      strategies: 'generateSW',
      workbox: {
        // false a proposito: en modo prompt el SW nuevo tiene que ESPERAR en
        // waiting hasta que el usuario toca "Recargar". Con skipWaiting: true se
        // activaria de una y el prompt no serviria de nada.
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // El bug que llevo a apagar el SW (selfDestroying) era quedar clavado en
        // una version vieja. La causa de raiz es que /sw.js se cachee: si el
        // navegador no vuelve a bajarlo, nunca se entera de que hay algo nuevo.
        // Eso ya esta resuelto en public/_headers con no-cache sobre /sw.js,
        // /index.html y /manifest.webmanifest. Con eso, precachear el shell es
        // seguro: workbox le pone hash de revision a cada archivo y reemplaza
        // el viejo al activar.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sw-killer/, /^\/docs\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Los chunks pesados NO van al precache: son lazy a proposito
        // (ver manualChunks arriba) y precachearlos obligaria a bajar ~4MB en la
        // primera visita para features que capaz no se abren nunca. Igual quedan
        // cacheados al vuelo por la regla de /assets/ de aca abajo, la primera
        // vez que se usan.
        globIgnores: [
          // vendor pesados, ya son lazy por manualChunks
          '**/{exceljs,bwip-js,pdf-libs,bpmn,nivo,fullcalendar,reactflow}-*.js',
          // el worker de pdf.js pesa 1.1MB el solo y unicamente se carga cuando
          // se parsea un PDF: era el 30% del precache.
          '**/pdf.worker*.js',
          // chunks de ruta: bajan al navegar a esa pagina. Precachear las ~25
          // paginas en el arranque es hacerle pagar al celular, con datos, por
          // pantallas que capaz no abre nunca. La regla de /assets/ las cachea
          // sola la primera vez que se entra, y de ahi en mas andan offline.
          '**/Pagina*-*.js',
          // no son parte de la app: sw-killer es la pagina de emergencia para
          // limpiar caches a mano, y og-image solo lo lee un crawler.
          'sw-killer.html',
          'og-image.svg',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'growflow-assets' },
          },
          {
            // Antes esto apuntaba a sqdqvhjlmdweuuncwlfb.supabase.co, un proyecto
            // que ya no existe: la regla no matcheaba nada. Y como este repo se
            // clona a growflow-aguara y growflow-chaco, que tienen CADA UNO su
            // propia base, hardcodear un host la rompe en las otras dos.
            // Matchea por sufijo para que valga en las tres instalaciones.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: { cacheName: 'growflow-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: 'GrowFlow',
        short_name: 'GrowFlow',
        description: 'Diario de cultivo personal',
        lang: 'es',
        theme_color: '#a3e635',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        // Android pide PNG de 192 y 512 para ofrecer la instalacion; con un SVG
        // suelto no alcanza. El 'maskable' es el que el launcher recorta a la
        // forma del sistema (circulo, squircle, etc): va a sangre y con la hoja
        // adentro del 80% central. Se generan con scripts/generar-iconos.mjs.
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
