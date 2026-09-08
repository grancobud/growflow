// Genera los iconos PNG de la PWA a partir de la marca de GrowFlow.
//
// Por que un script y no PNGs sueltos commiteados a mano: cuando cambie el color
// o el trazo de la marca, esto se vuelve a correr y los cuatro archivos quedan
// consistentes entre si. Un PNG suelto se desincroniza y nadie se entera.
//
//   node scripts/generar-iconos.mjs
//
// Rasteriza con el chromium que ya trae Playwright (no agrega dependencias).

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.dirname(fileURLToPath(import.meta.url))
const salida = path.join(raiz, '..', 'public')

// Marca, tomada de components/layout/Sidebar.tsx para que el icono del telefono
// y el logo de adentro de la app sean el mismo objeto.
const FONDO = '#0a0a0f'   // bg del sidebar
const HOJA = '#bef264'    // text-[#bef264] del <Leaf>
const HALO = '#a3e635'    // el bg-[#a3e635]/15 del contenedor

// Trazo de `Leaf` de lucide-react v1.8.0 (viewBox 24x24, stroke, sin fill).
// Copiado de node_modules/lucide-react/dist/esm/icons/leaf.js
const HOJA_PATHS = [
  'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
  'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
]

/**
 * @param {number} lado    tamano final en px
 * @param {number} escala  fraccion del lado que ocupa la hoja (safe zone)
 * @param {number} radio   radio de esquina en px (0 = cuadrado a sangre)
 */
function construirSVG({ lado, escala, radio }) {
  const cajaHoja = lado * escala
  const margen = (lado - cajaHoja) / 2
  // lucide dibuja en 24x24 con stroke-width 2. Al escalar el trazo se agranda
  // proporcionalmente, que es lo que queremos: mantiene el peso visual.
  const k = cajaHoja / 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${HALO}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${HALO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${lado}" height="${lado}" rx="${radio}" fill="${FONDO}"/>
  <circle cx="${lado / 2}" cy="${lado / 2}" r="${lado * 0.34}" fill="url(#halo)"/>
  <g transform="translate(${margen} ${margen}) scale(${k})"
     fill="none" stroke="${HOJA}" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
    ${HOJA_PATHS.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>`
}

// escala 0.52 en los `any`: deja aire alrededor, que es como se ven los iconos
// de las apps del sistema. En `maskable` baja a 0.40 porque Android recorta
// hasta un circulo del 80% del lado y todo lo de afuera se puede perder.
const ICONOS = [
  { archivo: 'pwa-192.png',         lado: 192, escala: 0.52, radioPct: 0.22 },
  { archivo: 'pwa-512.png',         lado: 512, escala: 0.52, radioPct: 0.22 },
  { archivo: 'maskable-512.png',    lado: 512, escala: 0.40, radioPct: 0 },
  // iOS ignora la transparencia y aplica su propio redondeo: va a sangre.
  { archivo: 'apple-touch-icon.png', lado: 180, escala: 0.52, radioPct: 0 },
]

const navegador = await chromium.launch()
const pagina = await navegador.newPage()
await mkdir(salida, { recursive: true })

for (const { archivo, lado, escala, radioPct } of ICONOS) {
  const svg = construirSVG({ lado, escala, radio: lado * radioPct })
  await pagina.setViewportSize({ width: lado, height: lado })
  await pagina.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>${svg}`,
  )
  await pagina.locator('svg').screenshot({
    path: path.join(salida, archivo),
    omitBackground: true,
  })
  console.log(`  ${archivo.padEnd(22)} ${lado}x${lado}`)
}

await navegador.close()
console.log('\nIconos generados en public/')
