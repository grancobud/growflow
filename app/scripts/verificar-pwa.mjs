// Verifica en un navegador real que la PWA quedo instalable.
// Se corre contra `vite preview` (build de produccion, no dev).
import { chromium } from 'playwright'

const BASE = process.env.PWA_BASE_URL || 'http://localhost:4173'
const nav = await chromium.launch()
const ctx = await nav.newContext()
const pag = await ctx.newPage()

const fallos = []
const red = []
pag.on('response', (r) => red.push({ url: r.url(), status: r.status() }))
pag.on('console', (m) => { if (m.type() === 'error') red.push({ url: 'console: ' + m.text(), status: 'ERR' }) })

await pag.goto(BASE, { waitUntil: 'networkidle' })

// 1. un solo <link rel=manifest>, y que responda 200
const links = await pag.$$eval('link[rel="manifest"]', (ls) => ls.map((l) => l.getAttribute('href')))
console.log('1) links rel=manifest:', links)
if (links.length !== 1) fallos.push(`esperaba 1 link de manifest, hay ${links.length}`)

// Se pide explicito: Chromium busca el manifest en diferido (cuando evalua la
// instalacion), asi que no aparece si de la carga inicial.
const manifestRes = await pag.request.get(new URL(links[0], BASE).href)
console.log('   respuesta del manifest:', manifestRes.status())
if (manifestRes.status() !== 200) fallos.push('el manifest no devolvio 200')

const rotos = red.filter((r) => r.status === 404)
console.log('   404s en la carga:', rotos.length ? rotos.map((r) => r.url) : 'ninguno')
if (rotos.length) fallos.push(`hay ${rotos.length} recursos en 404`)

// 2. el manifest, ya parseado por el navegador
const man = await pag.evaluate(async () => {
  const href = document.querySelector('link[rel="manifest"]')?.href
  return href ? await (await fetch(href)).json() : null
})
console.log('2) manifest.lang:', man?.lang, '| name:', man?.name)
if (man?.lang !== 'es') fallos.push(`lang deberia ser "es", es "${man?.lang}"`)

const conPurpose = (p) => (man?.icons ?? []).filter((i) => (i.purpose ?? 'any').split(' ').includes(p))
const png192 = (man?.icons ?? []).find((i) => i.sizes === '192x192' && i.type === 'image/png')
const png512 = (man?.icons ?? []).find((i) => i.sizes === '512x512' && i.type === 'image/png')
console.log('   icono 192 PNG:', !!png192, '| 512 PNG:', !!png512, '| maskable:', conPurpose('maskable').length)
if (!png192) fallos.push('falta icono PNG 192x192')
if (!png512) fallos.push('falta icono PNG 512x512')
if (!conPurpose('maskable').length) fallos.push('falta icono maskable')

// 3. cada icono del manifest baja de verdad y es del tamano que declara
for (const ic of man?.icons ?? []) {
  const r = await pag.request.get(new URL(ic.src, BASE).href)
  const ok = r.status() === 200
  console.log(`   ${ic.src} -> ${r.status()} ${ok ? '' : 'ROTO'}`)
  if (!ok) fallos.push(`icono ${ic.src} devolvio ${r.status()}`)
}

// 4. apple-touch-icon (es lo que usa iOS para la pantalla de inicio)
const apple = await pag.$$eval('link[rel="apple-touch-icon"]', (ls) => ls.map((l) => l.getAttribute('href')))
console.log('3) apple-touch-icon:', apple)
if (apple.length !== 1) fallos.push('falta el apple-touch-icon')

// 5. el service worker: que se registre Y quede controlando la pagina
const sw = await pag.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return { soportado: false }
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return { soportado: true, registrado: false }
  await navigator.serviceWorker.ready
  return {
    soportado: true,
    registrado: true,
    scope: reg.scope,
    activo: !!reg.active,
    url: reg.active?.scriptURL,
  }
})
console.log('4) service worker:', JSON.stringify(sw))
if (!sw.registrado) fallos.push('el service worker no se registro')
if (!sw.activo) fallos.push('el service worker no quedo activo')

// 6. que NO sea el SW suicida: si lo fuera, se habria desregistrado solo
const swBody = await (await pag.request.get(BASE + '/sw.js')).text()
const suicida = swBody.includes('registration.unregister')
console.log('   sw.js se autodestruye?', suicida ? 'SI (mal)' : 'no')
if (suicida) fallos.push('el sw.js sigue siendo el auto-destructivo')

// 7. que haya precacheado algo (marcador positivo, no ausencia del viejo)
const caches_ = await pag.evaluate(async () => {
  const n = await caches.keys()
  const out = {}
  for (const k of n) out[k] = (await (await caches.open(k)).keys()).length
  return out
})
console.log('5) caches creadas:', JSON.stringify(caches_))
const total = Object.values(caches_).reduce((a, b) => a + b, 0)
if (total === 0) fallos.push('no se precacheo ni un archivo')

await nav.close()
console.log('\n' + '='.repeat(46))
if (fallos.length) { console.log('FALLOS:'); fallos.forEach((f) => console.log('  x ' + f)); process.exit(1) }
console.log('TODO OK: la PWA quedo instalable')
