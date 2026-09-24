// LA REVISIÓN DE DISEÑO, HECHA POR LA MÁQUINA.
//
// Lo que se puede medir de una interfaz sin que nadie la mire: si algo se sale
// del ancho del teléfono, si un botón es más chico que un dedo, si una imagen no
// tiene alt, si un botón de sólo ícono no tiene nombre. Son las cuatro reglas
// del ruleset de Vercel (`vercel-labs/web-interface-guidelines`) que NO son
// cuestión de gusto: tienen un umbral y se contesta con un número.
//
// POR QUÉ CONTRA EL DEV SERVER Y NO CONTRA EL SITIO PUBLICADO
//
// Porque el dev local corre en modo demo y AUTO-LOGUEA. Contra
// growflow-panacea.pages.dev sólo se llega al login y a /sumate: las pantallas
// que importan están detrás de una sesión, y automatizar eso significaría poner
// una contraseña en un archivo. Acá no hace falta ninguna: el modo demo entra
// solo y con datos de mentira.
//
//   npm run revision:diseno
//
// con `panacea-dev` levantado (puerto 5199, ver .claude/launch.json).
//
// QUÉ SE MIRA (02/09/2026: dejó de ser sólo la carga inicial)
//
// Hasta el 01/09 esto cubría diez rutas, tal como se ven al abrirlas. Era el
// límite escrito en el propio archivo, y escondía casi toda la app: las
// veintiuna solapas de O.N.G. —cada una una pantalla distinta, todas detrás de
// `/ong/*`—, las cuatro de Cultivo, y los formularios, que es donde la gente
// escribe y donde un control chico o un texto que no se lee cuesta de verdad.
//
//   1. PANTALLAS        las diez de siempre, un test por chequeo
//   2. RUTAS_PROFUNDAS  las solapas que son una URL: /ong/* y las de Cultivo
//   3. PESTANAS         las solapas que NO son una URL, tocándolas
//   4. APERTURAS        los formularios, abriéndolos
//
// De 2 en adelante los cinco chequeos van juntos en un solo test. Llegar hasta
// ahí cuesta una navegación y a veces un click; pagarlo cinco veces multiplica
// por cinco lo que tarda todo sin decir nada que no diga un test que los corre
// juntos y los reporta juntos.
//
// LO QUE ESTO **NO** HACE: decir si algo es lindo. Para eso están las capturas
// que deja en `e2e/capturas/`, que las mira una persona o un modelo. La máquina
// contesta lo que tiene umbral; el resto sigue siendo criterio.

import { test, expect, type Page } from '@playwright/test'
import {
  ANCHO_TELEFONO, MINIMO_TACTIL, irA, revisarTodo, erroresPropios,
  desborde, areaTactil, sinNombre, sinAlt, contraste, dialogo, focoAtrapado,
} from './chequeos'

/**
 * Las diez pantallas, con el nombre que tienen para quien las usa.
 *
 * Salen de `App.tsx`. Acá va sólo la ruta contenedora de cada grupo; sus
 * solapas están más abajo, en RUTAS_PROFUNDAS.
 */
const PANTALLAS = [
  { ruta: '/', nombre: 'panel' },
  // `/agronomico` es la ruta contenedora del módulo: cae en la primera sección
  // que el rol pueda ver. `/cultivo` se conserva porque está en links viejos.
  { ruta: '/agronomico', nombre: 'agronomico' },
  { ruta: '/cultivo', nombre: 'cultivo' },
  { ruta: '/ong', nombre: 'ong' },
  { ruta: '/econometria', nombre: 'econometria' },
  { ruta: '/stats', nombre: 'estadisticas' },
  { ruta: '/tablas', nombre: 'tablas' },
  { ruta: '/manual', nombre: 'manual' },
  { ruta: '/sumate', nombre: 'sumate' },
]

/**
 * LAS SOLAPAS QUE SON UNA URL.
 *
 * O.N.G. tiene veintiuna pestañas y cada una es una pantalla entera y distinta
 * —Pacientes no se parece en nada a Actas—, pero todas viven bajo el splat
 * `/ong/*`, así que la revisión veía UNA sola: la que abre por defecto. Lo mismo
 * las cuatro de Cultivo.
 *
 * Se llega por navegación directa y no tocando la pestaña, por dos razones. Es
 * como llega alguien desde el panel o desde una acción del catálogo, que es
 * justo el camino donde se escondieron los bugs de `?nueva=` del 27/08 —la SPA
 * no remonta el componente al cambiar de solapa, así que una ruta rota parece
 * andar—. Y no depende del texto de la pestaña: si mañana «Cupo REPROCANN» se
 * llama distinto, esto sigue midiendo la pantalla.
 *
 * El orden es el de `lib/pestanasOng.ts`, para poder compararlos de un vistazo.
 */
const RUTAS_PROFUNDAS = [
  // Cultivo
  { ruta: '/plantas', nombre: 'cultivo-plantas' },
  { ruta: '/geneticas', nombre: 'cultivo-geneticas' },
  { ruta: '/linea-tiempo', nombre: 'cultivo-linea-tiempo' },
  { ruta: '/sala', nombre: 'cultivo-sala' },
  { ruta: '/plan', nombre: 'cultivo-plan' },
  // Cosecha y Ambiente pasaron a ser secciones del módulo agronómico el
  // 02/09/2026: siguen teniendo su URL, pero ya no son un ítem de menú.
  { ruta: '/cosecha', nombre: 'agronomico-cosecha' },
  { ruta: '/ambiente', nombre: 'agronomico-ambiente' },
  // O.N.G. · Panel
  { ruta: '/ong/coherencia', nombre: 'ong-coherencia' },
  { ruta: '/ong/usuarios', nombre: 'ong-usuarios' },
  // O.N.G. · Institucional
  { ruta: '/ong/entidad', nombre: 'ong-entidad' },
  { ruta: '/ong/autoridades', nombre: 'ong-autoridades' },
  { ruta: '/ong/predios', nombre: 'ong-predios' },
  { ruta: '/ong/libros', nombre: 'ong-libros' },
  { ruta: '/ong/actas', nombre: 'ong-actas' },
  // O.N.G. · Personas
  { ruta: '/ong/solicitudes', nombre: 'ong-solicitudes' },
  { ruta: '/ong/visitas', nombre: 'ong-visitas' },
  { ruta: '/ong/pacientes', nombre: 'ong-pacientes' },
  { ruta: '/ong/asociados', nombre: 'ong-asociados' },
  { ruta: '/ong/cupo', nombre: 'ong-cupo' },
  { ruta: '/ong/seguimiento', nombre: 'ong-seguimiento' },
  // O.N.G. · Operación
  { ruta: '/ong/portal', nombre: 'ong-portal-reservas' },
  // El portal abre en Reservas si nadie le pide otra cosa; el catálogo es la
  // otra mitad de la pantalla y se pide por query, que es como llega la acción
  // «Crear un lote» del catálogo de acciones.
  { ruta: '/ong/portal?vista=catalogo', nombre: 'ong-portal-catalogo' },
  { ruta: '/ong/dispensas', nombre: 'ong-dispensas' },
  { ruta: '/ong/proveedores', nombre: 'ong-proveedores' },
  { ruta: '/ong/movimientos', nombre: 'ong-movimientos' },
  { ruta: '/ong/economia', nombre: 'ong-economia' },
  // O.N.G. · Papeles
  { ruta: '/ong/declaraciones', nombre: 'ong-declaraciones' },
  { ruta: '/ong/nomina', nombre: 'ong-nomina' },
  { ruta: '/ong/documentos', nombre: 'ong-documentos' },
]

/**
 * LAS SOLAPAS QUE NO SON UNA URL, Y HAY QUE TOCARLAS.
 *
 * Econometría, Cosecha y Ambiente guardan la solapa activa en un `useState`, así
 * que la única forma de llegar es haciendo el click.
 *
 * Va sólo lo que NO abre por defecto, y ese detalle es el que hace que el test
 * sirva: como se entra siempre por la solapa inicial, tocar otra TIENE que
 * cambiar lo que se ve. Si no cambia nada, o la solapa dejó de existir o dejó de
 * funcionar, y en los dos casos esto lo dice. Sin esa comparación, una entrada
 * que apunta a un botón que ya no está no falla: revisa la pantalla anterior y
 * da verde, que es exactamente la forma de fallar que ya costó caro acá.
 */
const PESTANAS = [
  { ruta: '/econometria', boton: 'Costos', nombre: 'econometria-costos' },
  { ruta: '/econometria', boton: 'Inventario', nombre: 'econometria-inventario' },
  { ruta: '/econometria', boton: 'Mantenimiento', nombre: 'econometria-mantenimiento' },
  { ruta: '/econometria', boton: 'Instalaciones', nombre: 'econometria-instalaciones' },
  { ruta: '/cosecha', boton: 'Rendimiento', nombre: 'cosecha-rendimiento' },
  { ruta: '/cosecha', boton: 'Stock', nombre: 'cosecha-stock' },
  { ruta: '/ambiente', boton: 'Análisis', nombre: 'ambiente-analisis' },
  { ruta: '/ambiente', boton: 'Salas', nombre: 'ambiente-salas' },
]

/**
 * LOS FORMULARIOS.
 *
 * Es donde la gente ESCRIBE, y donde un control de 32 píxeles o un texto de
 * ayuda que no se lee cuesta de verdad: no es lo mismo no poder leer un rótulo
 * que no poder cargar una entrega.
 *
 * Cada entrada declara una `senal`: un texto que TIENE que aparecer después del
 * click. Es lo que distingue «abrí el formulario y lo revisé» de «hice click en
 * cualquier cosa y revisé la pantalla que ya estaba». No alcanza con buscar un
 * `[role="dialog"]` aunque desde el 02/09 los 37 lo tengan: eso diría que se
 * abrió ALGO, no que se abrió lo que este test viene a mirar. El texto del
 * título es la seña más estable que hay, y cuando alguien lo cambia este test lo
 * dice en vez de pasar de largo.
 *
 * Además del vistazo de siempre, con el modal abierto se revisa el contrato de
 * diálogo —`dialogo()` y `focoAtrapado()`— y que Escape lo cierre devolviendo el
 * foco.
 *
 * OJO CON LO QUE SE PONE ACÁ: sólo botones que ABREN algo. `Fila` en Tablas
 * inserta una fila y `Registrar riego` en Plantas escribe un riego —los dos se
 * probaron y los dos MUTAN—, así que no van: un test que carga datos cada vez
 * que corre es un test que ensucia lo que mide. Y nunca un botón de borrar.
 */
const APERTURAS = [
  // El menú lateral: en el teléfono es la única forma de navegar, y hasta hoy
  // no lo miraba nadie porque arranca cerrado.
  { ruta: '/', boton: 'Abrir menu completo', senal: 'Cerrar', nombre: 'menu-lateral' },
  // El control de caja y stock: es donde alguien escribe lo que contó, así que
  // es de los formularios que más importa que se lean y se toquen bien —se
  // completa de parado, con la plata en la mano.
  { ruta: '/', boton: 'Controlar la caja', senal: 'Controlar caja y stock', nombre: 'form-arqueo' },

  // El indice del manual en el telefono. Hasta el 03/09/2026 no existia: eran
  // quince capitulos y solo scroll.
  { ruta: '/manual', boton: 'Contenido', senal: 'Contenido del manual', nombre: 'indice-manual' },

  // Cultivo
  { ruta: '/plantas', boton: 'Planta', senal: 'Nueva planta', nombre: 'form-planta' },
  { ruta: '/geneticas', boton: 'Genética', senal: 'Nueva genética', nombre: 'form-genetica' },
  { ruta: '/geneticas', boton: 'Ver la ficha de Amnesia Haze', senal: 'Ficha: Amnesia Haze', nombre: 'ficha-genetica' },
  { ruta: '/sala', boton: 'Crear grupo', senal: 'Nuevo grupo de cultivo', nombre: 'form-grupo' },
  { ruta: '/sala', boton: 'Crear el área', senal: 'Nueva área', nombre: 'form-area' },

  // O.N.G. · Institucional
  { ruta: '/ong/autoridades', boton: 'Agregar', senal: 'Nueva autoridad', nombre: 'form-autoridad' },
  { ruta: '/ong/predios', boton: 'Agregar', senal: 'Nuevo predio', nombre: 'form-predio' },
  { ruta: '/ong/libros', boton: 'Agregar', senal: 'Nuevo libro', nombre: 'form-libro' },
  { ruta: '/ong/actas', boton: 'Comisión Directiva', senal: 'Nueva acta', nombre: 'form-acta' },
  // El legajo institucional vive DEBAJO de la ficha de la entidad: es el
  // formulario donde entra el estatuto en PDF (03/09/2026).
  { ruta: '/ong/entidad', boton: 'Cargar', senal: 'Cargar papel institucional', nombre: 'form-legajo' },

  // O.N.G. · Personas
  { ruta: '/ong/visitas', boton: 'Visita', senal: 'Nueva visita', nombre: 'form-visita', exacto: true },
  { ruta: '/ong/pacientes', boton: 'Paciente', senal: 'Sumar un paciente', nombre: 'form-paciente', exacto: true },
  { ruta: '/ong/pacientes', boton: 'Ver ficha', senal: 'Carlos Ruiz · PAC-003', nombre: 'ficha-paciente' },
  // El carnet que la persona muestra en la sede. Se revisa acá porque es la
  // única superficie que se IMPRIME: lo que en pantalla se lee flojo, en papel
  // no se lee, y el estado del REPROCANN va con color.
  { ruta: '/ong/pacientes', boton: 'Carnet', senal: 'Carnet de socio', nombre: 'carnet-socio', exacto: true },
  { ruta: '/ong/asociados', boton: 'Agregar', senal: 'Nueva categoría', nombre: 'form-categoria-socio' },
  { ruta: '/ong/seguimiento', boton: 'Cargar', senal: 'Seguimiento ·', nombre: 'form-seguimiento' },

  // O.N.G. · Operación
  { ruta: '/ong/portal?vista=catalogo', boton: 'Lote', senal: 'Nuevo lote', nombre: 'form-lote', exacto: true },
  { ruta: '/ong/dispensas', boton: 'Registrar', senal: 'Entregarle a un paciente', nombre: 'form-dispensa' },
  { ruta: '/ong/economia', boton: 'Asiento', senal: 'Anotar un gasto o un pago', nombre: 'form-asiento' },
  // El movimiento interno crea los DOS asientos pareados de una: es la pantalla
  // que arregló las extracciones banco→caja que no se anotaban.
  { ruta: '/ong/economia', boton: 'Movimiento interno', senal: 'Sale de', nombre: 'form-movimiento-interno' },

  // O.N.G. · Papeles
  { ruta: '/ong/declaraciones', boton: 'Registrar traslado', senal: 'Mover material a otro lado', nombre: 'form-traslado' },
  { ruta: '/ong/documentos', boton: 'Emitir documento', senal: 'Nuevo documento emitido', nombre: 'form-documento' },
]

/** El texto visible, para poder decir si un click cambió algo. */
const textoVisible = (page: Page) => page.evaluate(() => document.body.innerText || '')

test.describe('Revisión de diseño a 375px', () => {
  test.use({ viewport: { width: ANCHO_TELEFONO, height: 812 } })

  // ─────────────────────────────────────────────────────────────────────────
  // 1. LAS DIEZ PANTALLAS, un test por chequeo.
  // ─────────────────────────────────────────────────────────────────────────
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
      // HEREDADO DE LOS SMOKES DE CANNTRACE, que se borraron el 01/09/2026 por
      // apuntar a otro producto. De todo lo que probaban, este chequeo y el de
      // los metadatos son lo único que no dependía de ESE sitio, así que la idea
      // se queda aunque el archivo se haya ido.
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

  // ─────────────────────────────────────────────────────────────────────────
  // 2. LAS SOLAPAS QUE SON UNA URL.
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LAS SOLAPAS QUE HAY QUE TOCAR.
  // ─────────────────────────────────────────────────────────────────────────
  for (const { ruta, boton, nombre } of PESTANAS) {
    test(`${nombre} — revisión completa`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))

      await irA(page, ruta)
      const antes = await textoVisible(page)
      await page.getByRole('button', { name: boton, exact: true }).first().click()
      await page.waitForTimeout(1200)

      // Ninguna de estas solapas abre por defecto, así que tocarla tiene que
      // cambiar lo que se ve. Si no cambió, el test estaba revisando la solapa
      // anterior y dando verde.
      //
      // La excepción es la pantalla VACÍA: sin una sola fila cargada, todas las
      // solapas muestran el mismo estado vacío, así que tocar una no cambia
      // nada y el test no puede distinguir «la solapa se rompió» de «todavía no
      // hay nada que mostrar». Ahí se saltea con motivo en vez de fallar: un
      // rojo que no señala un defecto se aprende a ignorar, y se lleva puesto
      // al resto de la suite.
      const despues = await textoVisible(page)
      if (despues === antes && /Todavía no hay|Sin .* cargad/i.test(despues)) {
        test.skip(true, `${nombre}: no hay datos cargados, la solapa «${boton}» muestra el mismo estado vacío`)
      }

      expect(despues,
        `Tocar «${boton}» en ${ruta} no cambió nada: o la solapa dejó de existir o dejó de funcionar`)
        .not.toBe(antes)

      await page.screenshot({ path: `e2e/capturas/${nombre}-375.png`, fullPage: true })
      const problemas = [
        ...await revisarTodo(page),
        ...erroresPropios(errores).map(e => `Error de consola: ${e}`),
      ]
      expect(problemas, `${ruta} › ${boton}\n${problemas.join('\n')}`).toEqual([])
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. LOS FORMULARIOS.
  // ─────────────────────────────────────────────────────────────────────────
  for (const { ruta, boton, senal, nombre, exacto } of APERTURAS) {
    test(`${nombre} — revisión completa`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', e => errores.push(`pageerror: ${e.message}`))

      await irA(page, ruta)
      // SE ABRE CON EL TECLADO -foco en el boton y Enter-, y no con un click.
      //
      // No es una preferencia: en WebKit un click NO deja el foco en el boton
      // -asi se comporta Safari, y este proyecto corre `mobile-safari`-, asi que
      // para cuando el modal se monta el foco ya esta en el `<body>` y no hay
      // nada que devolver al cerrar. Medido: con click el foco vuelve a BODY,
      // con Enter vuelve al boton.
      //
      // Y el teclado es justamente para quien existe la devolucion del foco. Un
      // dedo no la necesita; alguien que tabula, si: sin ella cerrar el
      // formulario que abrio en la fila cuarenta lo devuelve al principio de la
      // pagina.
      const abridor = page.getByRole('button', { name: boton, exact: !!exacto }).first()

      // SE SALTEA SI EL ABRIDOR NO EXISTE, y lo dice.
      //
      // Esta instalacion arranca con la demo VACIA, y hay formularios que solo
      // se abren desde una fila que todavia no existe: la ficha de una
      // genetica, el carnet de un socio, el grupo de un lote. Sin fila no hay
      // boton.
      //
      // Se saltea con motivo en vez de fallar —un rojo permanente se aprende a
      // ignorar y se lleva puesto al resto de la suite— pero NO se borra de la
      // lista: el dia que la instalacion tenga datos cargados, estos vuelven a
      // medirse solos. Un skip visible es cobertura pendiente; un test borrado
      // es cobertura perdida y nadie se entera.
      if (await abridor.count() === 0) {
        test.skip(true, `${nombre}: no hay datos cargados, el abridor "${boton}" no existe en ${ruta}`)
      }

      await abridor.focus()
      const nombreDelAbridor = await abridor.evaluate(el => {
        ;(el as HTMLElement).dataset.abridor = '1'
        return el.tagName
      })
      await abridor.press('Enter')
      await page.waitForTimeout(1200)

      // Sin esto, un botón que dejó de abrir el formulario da verde: se
      // revisaría la pantalla de atrás, que ya estaba revisada.
      await expect(page.getByText(senal, { exact: false }).first(),
        `Tocar «${boton}» en ${ruta} no abrió «${senal}»`).toBeVisible()

      await page.screenshot({ path: `e2e/capturas/${nombre}-375.png`, fullPage: true })
      const problemas = [
        ...await revisarTodo(page),
        // Un modal no es solo una caja que aparece: tiene que anunciarse, tiene
        // que recibir el foco y no tiene que dejarlo escapar. Ver `dialogo()`.
        ...await dialogo(page),
        ...await focoAtrapado(page),
        ...erroresPropios(errores).map(e => `Error de consola: ${e}`),
      ]
      expect(problemas, `${ruta} › ${boton}\n${problemas.join('\n')}`).toEqual([])

      // Y SE TIENE QUE PODER CERRAR CON ESCAPE, con el foco volviendo a donde
      // estaba. Va al final y no al principio porque cierra lo que se reviso.
      //
      // Que la senal desaparezca no alcanza como prueba: una pantalla que se
      // rompe entera tambien la hace desaparecer. Por eso se exige ademas que
      // el foco haya vuelto a un elemento y no al `<body>` pelado, que es donde
      // queda cuando nadie se ocupo de devolverlo.
      await page.keyboard.press('Escape')
      await page.waitForTimeout(700)
      await expect(page.getByText(senal, { exact: false }).first(),
        `Escape no cerro «${senal}» en ${ruta}`).toBeHidden()
      const focoVolvio = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-abridor') === '1')
      expect(focoVolvio,
        `Al cerrar con Escape el foco no volvio al ${nombreDelAbridor} que lo abrio: ` +
        'quien navega con teclado vuelve al principio de la pagina')
        .toBe(true)
    })
  }

  test('el HTML trae los metadatos de Panacea', async ({ page }) => {
    await irA(page, '/')
    // La marca vive en cuatro lugares (ver la skill): index.html, el manifest de
    // vite.config, Marca.tsx y el encabezado. Este chequeo agarra el primero, que
    // es el que nadie mira porque no se ve en pantalla — y es el que quedó con
    // «Mi Cultivo» las dos veces que pasó.
    await expect(page).toHaveTitle(/GrowFlow/i)
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc, 'Falta <meta name="description">').toBeTruthy()
    const tema = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(tema, 'Falta <meta name="theme-color">').toBeTruthy()
  })
})
