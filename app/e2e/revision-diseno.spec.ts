// LA REVISIÓN DE DISEÑO, HECHA POR LA MÁQUINA.
//
// Portada de la instalación de Aguará el 02/09/2026. Los chequeos —`chequeos.ts`—
// son los MISMOS archivo por archivo: lo que se mide no depende de la
// instalación. Lo que cambia es esta lista, porque las pantallas son otras: acá
// están Instalación y la Calculadora de nutrientes, que Aguará no tiene, y su
// O.N.G. es una sola ruta con quince solapas en vez de un splat con veintiuna.
//
// Lo que se puede medir de una interfaz sin que nadie la mire: si algo se sale
// del ancho del teléfono, si un botón es más chico que un dedo, si una imagen no
// tiene alt, si un botón de sólo ícono no tiene nombre, y si el texto se lee.
// Son las reglas del ruleset de Vercel (`vercel-labs/web-interface-guidelines`)
// que NO son cuestión de gusto: tienen un umbral y se contesta con un número.
//
// POR QUÉ CONTRA EL DEV SERVER Y NO CONTRA EL SITIO PUBLICADO
//
// Porque el dev local corre en modo demo y AUTO-LOGUEA. El sitio publicado tiene
// una demo pública, pero entrar ahí es escribir una contraseña, y una
// contraseña no va en un archivo del repo. Acá no hace falta ninguna.
//
//   npm run revision:diseno
//
// con `growflow-dev` levantado (puerto 5173, ver .claude/launch.json).
//
// LO QUE ESTO **NO** HACE: decir si algo es lindo. Para eso están las capturas
// que deja en `e2e/capturas/`, que las mira una persona o un modelo. La máquina
// contesta lo que tiene umbral; el resto sigue siendo criterio.

import { test, expect, type Page } from '@playwright/test'
import {
  ANCHO_TELEFONO, MINIMO_TACTIL, irA, revisarTodo, erroresPropios,
  desborde, areaTactil, sinNombre, sinAlt, contraste,
} from './chequeos'

/** Las pantallas del menú, con el nombre que tienen para quien las usa. */
const PANTALLAS = [
  { ruta: '/', nombre: 'panel' },
  { ruta: '/cultivo', nombre: 'cultivo' },
  { ruta: '/instalacion', nombre: 'instalacion' },
  { ruta: '/ong', nombre: 'ong' },
  { ruta: '/econometria', nombre: 'econometria' },
  { ruta: '/cosecha', nombre: 'cosecha' },
  { ruta: '/stats', nombre: 'estadisticas' },
  { ruta: '/ambiente', nombre: 'ambiente' },
  { ruta: '/calendario', nombre: 'calendario' },
  { ruta: '/tablas', nombre: 'tablas' },
  { ruta: '/manual', nombre: 'manual' },
  { ruta: '/nutrientes', nombre: 'nutrientes' },
]

/**
 * LAS VISTAS QUE SON UNA URL PROPIA.
 *
 * Cultivo e Instalación agrupan varias pantallas bajo un solo ítem de menú, y
 * cada una es una URL. La ruta contenedora cae en la primera, así que sin esto
 * la revisión veía una de cuatro y una de cuatro.
 */
const RUTAS_PROFUNDAS = [
  { ruta: '/plantas', nombre: 'cultivo-plantas' },
  { ruta: '/geneticas', nombre: 'cultivo-geneticas' },
  { ruta: '/linea-tiempo', nombre: 'cultivo-linea-tiempo' },
  { ruta: '/sala', nombre: 'cultivo-sala' },
  { ruta: '/hardware-diy', nombre: 'instalacion-hardware' },
  { ruta: '/riego', nombre: 'instalacion-riego' },
  { ruta: '/tablero', nombre: 'instalacion-tablero' },
  { ruta: '/insumos-faltantes', nombre: 'instalacion-insumos' },
  { ruta: '/stock', nombre: 'econometria-stock' },
  // `/registro` es O.N.G. abierto en Pacientes: la misma pantalla, otra solapa.
  { ruta: '/registro', nombre: 'ong-pacientes' },
]

/**
 * LAS QUINCE SOLAPAS DE O.N.G., QUE ACÁ NO SON UNA URL.
 *
 * En la instalación de Aguará cada pestaña de O.N.G. es una ruta (`/ong/actas`)
 * y se llega navegando. Acá la solapa vive en un `useState` y la única forma de
 * llegar es tocándola. Es la diferencia más grande entre las dos revisiones, y
 * la razón por la que este archivo no se puede compartir aunque los chequeos sí.
 *
 * Va sólo lo que NO abre por defecto —Estado abre solo, y Pacientes ya se cubre
 * por `/registro`—, y ese detalle es lo que hace que el test sirva: como se
 * entra siempre por Estado, tocar otra solapa TIENE que cambiar lo que se ve. Si
 * no cambia nada, o la solapa dejó de existir o dejó de funcionar. Sin esa
 * comparación, una entrada que apunta a un botón que ya no está no falla:
 * revisa la pantalla anterior y da verde.
 */
const PESTANAS_ONG = [
  'Coherencia', 'Cupo REPROCANN', 'Autodispensación', 'Dispensas', 'Seguimiento',
  'Declaraciones', 'Documentos', 'Libros', 'Actas', 'Asociados',
  'La entidad', 'Autoridades', 'Predios',
]

/** El texto visible, para poder decir si un click cambió algo. */
const textoVisible = (page: Page) => page.evaluate(() => document.body.innerText || '')

test.describe('Revisión de diseño a 375px', () => {
  test.use({ viewport: { width: ANCHO_TELEFONO, height: 812 } })

  for (const { ruta, nombre } of PANTALLAS) {
    test(`${nombre} — no se sale del ancho del teléfono`, async ({ page }) => {
      await irA(page, ruta)
      expect(await desborde(page)).toEqual([])
    })

    test(`${nombre} — los controles se pueden tocar con el dedo`, async ({ page }) => {
      await irA(page, ruta)
      const chicos = await areaTactil(page)
      expect(chicos, `Controles por debajo de ${MINIMO_TACTIL}px:\n${chicos.join('\n')}`).toEqual([])
    })

    test(`${nombre} — todo lo que se toca tiene nombre`, async ({ page }) => {
      await irA(page, ruta)
      const mudos = await sinNombre(page)
      expect(mudos, mudos.join('\n')).toEqual([])
    })

    test(`${nombre} — las imágenes tienen alt`, async ({ page }) => {
      await irA(page, ruta)
      const faltantes = await sinAlt(page)
      expect(faltantes, faltantes.join('\n')).toEqual([])
    })

    test(`${nombre} — el texto se lee (contraste WCAG AA)`, async ({ page }) => {
      await irA(page, ruta)
      const flojos = await contraste(page)
      expect(flojos, `Texto por debajo del umbral WCAG AA en ${ruta}:\n${flojos.join('\n')}`).toEqual([])
    })

    test(`${nombre} — no tira errores a la consola`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))
      await irA(page, ruta)
      const propios = erroresPropios(errores)
      expect(propios, `Errores de consola en ${ruta}:\n${propios.join('\n')}`).toEqual([])
    })

    test(`${nombre} — captura para revisar a ojo`, async ({ page }) => {
      await irA(page, ruta)
      await page.screenshot({ path: `e2e/capturas/${nombre}-375.png`, fullPage: true })
    })
  }

  for (const { ruta, nombre } of RUTAS_PROFUNDAS) {
    test(`${nombre} — revisión completa`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))

      await irA(page, ruta)
      await page.screenshot({ path: `e2e/capturas/${nombre}-375.png`, fullPage: true })

      const problemas = [
        ...await revisarTodo(page),
        ...erroresPropios(errores).map(e => `Error de consola: ${e}`),
      ]
      expect(problemas, `${ruta}\n${problemas.join('\n')}`).toEqual([])
    })
  }

  for (const solapa of PESTANAS_ONG) {
    const nombre = `ong-${solapa.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    test(`${nombre} — revisión completa`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))

      await irA(page, '/ong')
      const antes = await textoVisible(page)
      await page.getByRole('button', { name: solapa, exact: true }).first().click()
      await page.waitForTimeout(1500)

      expect(await textoVisible(page),
        `Tocar «${solapa}» en O.N.G. no cambió nada: o la solapa dejó de existir o dejó de funcionar`)
        .not.toBe(antes)

      await page.screenshot({ path: `e2e/capturas/${nombre}-375.png`, fullPage: true })
      const problemas = [
        ...await revisarTodo(page),
        ...erroresPropios(errores).map(e => `Error de consola: ${e}`),
      ]
      expect(problemas, `O.N.G. › ${solapa}\n${problemas.join('\n')}`).toEqual([])
    })
  }

  test('el HTML trae los metadatos de la instalación', async ({ page }) => {
    await irA(page, '/')
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc, 'Falta <meta name="description">').toBeTruthy()
    const tema = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(tema, 'Falta <meta name="theme-color">').toBeTruthy()
  })
})
