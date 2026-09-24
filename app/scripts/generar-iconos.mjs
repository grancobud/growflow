// Genera los iconos de la app instalable a partir del emblema de GrowFlow.
//
// Por que un script y no PNGs sueltos: si la asociacion cambia el logo, se
// reemplaza public/logo-panacea.png, se corre esto, y todos los iconos quedan
// consistentes entre si. Un PNG suelto se desincroniza y nadie se entera.
//
//   node scripts/generar-iconos.mjs
//
// Rasteriza con el chromium que ya trae Playwright (no agrega dependencias).
// Portado de la instalacion de Gaston (commit bbc0ba2), que dibuja una hoja:
// aca va el emblema de GrowFlow, igual que en la Marca de adentro de la app.

import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.dirname(fileURLToPath(import.meta.url))
const publico = path.join(raiz, '..', 'public')

// El emblema: 256x256, ya recortado al circulo y con fondo transparente.
const emblema = `data:image/svg+xml;base64,${(await readFile(path.join(publico, 'logo-growflow.svg'))).toString('base64')}`

const FONDO = '#0a0a0f'   // el mismo fondo de la app, asi no se ve un recuadro

/**
 * @param {number} lado     tamano final en px
 * @param {number} escala   fraccion del lado que ocupa el emblema
 * @param {number} radioPct radio de esquina como fraccion del lado (0 = a sangre)
 */
function html({ lado, escala, radioPct }) {
  const e = Math.round(lado * escala)
  return `<style>html,body{margin:0;padding:0;background:transparent}</style>
<div style="width:${lado}px;height:${lado}px;background:${FONDO};border-radius:${lado * radioPct}px;
            display:flex;align-items:center;justify-content:center">
  <img src="${emblema}" style="width:${e}px;height:${e}px;display:block">
</div>`
}

// `any`: el emblema grande, con un poco de aire, en un cuadrado redondeado.
// `maskable`: a sangre y con el emblema al 60%, porque Android recorta hasta un
// circulo del 80% del lado y lo de afuera se puede perder.
// iOS ignora la transparencia y aplica su propio redondeo: a sangre.
// El favicon va chico: lo que importa ahi es que se reconozca en la pestaña.
const ICONOS = [
  { archivo: 'pwa-192.png',          lado: 192, escala: 1.00, radioPct: 0.22 },
  { archivo: 'pwa-512.png',          lado: 512, escala: 1.00, radioPct: 0.22 },
  { archivo: 'maskable-512.png',     lado: 512, escala: 0.72, radioPct: 0 },
  { archivo: 'apple-touch-icon.png', lado: 180, escala: 0.92, radioPct: 0 },
  { archivo: 'favicon-48.png',       lado: 48,  escala: 1.00, radioPct: 0.22 },
]

const navegador = await chromium.launch()
const pagina = await navegador.newPage()

for (const { archivo, lado, escala, radioPct } of ICONOS) {
  await pagina.setViewportSize({ width: lado, height: lado })
  await pagina.setContent(html({ lado, escala, radioPct }))
  await pagina.locator('img').evaluate((img) => img.decode())
  await pagina.locator('div').screenshot({ path: path.join(publico, archivo), omitBackground: true })
  console.log(`  ${archivo.padEnd(22)} ${lado}x${lado}`)
}

await navegador.close()
console.log('\nIconos generados en public/')
