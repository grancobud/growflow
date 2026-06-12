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
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: null, // NO cachear index.html para evitar app bloqueada en version vieja
        globPatterns: ['**/*.{css,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'canntrace-assets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://sqdqvhjlmdweuuncwlfb.supabase.co',
            handler: 'NetworkFirst',
            options: { cacheName: 'canntrace-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: 'GrowFlow',
        short_name: 'GrowFlow',
        description: 'Diario de cultivo personal',
        theme_color: '#a3e635',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
