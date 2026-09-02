// LOS CHEQUEOS, SEPARADOS DE LAS PANTALLAS DONDE SE APLICAN.
//
// Vivían adentro de `revision-diseno.spec.ts`, escritos una vez por cada una de
// las diez rutas. Al extender la revisión a las pestañas y a los modales eso ya
// no alcanzaba: el mismo chequeo tiene que poder correr sobre una pantalla
// recién cargada, sobre una solapa que alguien tocó y sobre un formulario que
// se acaba de abrir. Copiarlo tres veces es garantizar que las tres copias se
// separen.
//
// Cada función devuelve una LISTA DE PROBLEMAS, no un booleano ni un throw: así
// quien la llama decide si los reporta uno por uno —como hacen las diez rutas—
// o todos juntos, que es lo que conviene cuando llegar a la pantalla cuesta un
// click y no se quiere pagar ese click cinco veces.
//
// Lista vacía = está bien.

import type { Page } from '@playwright/test'

/** El ancho al que se usa la app de verdad: parado en el mostrador. */
export const ANCHO_TELEFONO = 375

/**
 * El mínimo táctil.
 *
 * El ruleset pide 44 y acepta 40 «donde el layout lo permita». Acá se mide
 * contra 40 a propósito: 44 es el objetivo del diseño —y por eso `lib/ui.ts`
 * usa `min-h-[44px]`— pero un test que falla por cuatro píxeles en un control
 * legítimamente compacto es un test que se apaga. Se falla en lo indefendible.
 */
export const MINIMO_TACTIL = 40

/**
 * Cuánto se espera a que la pantalla exista.
 *
 * Con 600ms el chequeo de contraste daba verde en las diez pantallas, y era
 * mentira: medido a mano con 3 segundos aparecían los chips de estado
 * («Próximo», «En regla»), que a los 600ms todavía no existían. O sea que el
 * test no encontraba nada porque no había nada que mirar.
 *
 * Un test que corre antes de que la pantalla exista pasa siempre, y eso es peor
 * que no tenerlo: da por revisado lo que nunca se miró.
 */
export const ESPERA_DATOS = 2500

export async function irA(page: Page, ruta: string) {
  await page.goto(ruta, { waitUntil: 'networkidle' })
  await page.waitForTimeout(ESPERA_DATOS)
}

/**
 * EL DESBORDE HORIZONTAL ES EL PEOR DEFECTO DE UNA APP DE TELÉFONO:
 * aparece una barra de scroll lateral, el contenido se corre y toda la pantalla
 * queda torcida. Casi siempre es UN elemento que no achica, así que se informa
 * quién se sale y no sólo que algo se sale.
 */
export async function desborde(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const d = document.documentElement
    if (d.scrollWidth <= d.clientWidth) return []
    const culpables: string[] = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const r = el.getBoundingClientRect()
      if (r.right > d.clientWidth + 1 && r.width > 0) {
        culpables.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 60)} → ${Math.round(r.right)}px`)
      }
    }
    return [`Se sale del ancho: ${d.scrollWidth}px contra ${d.clientWidth}px. Culpables: ${culpables.slice(0, 5).join(' · ')}`]
  })
}

/** Controles más chicos que un dedo. */
export async function areaTactil(page: Page, minimo = MINIMO_TACTIL): Promise<string[]> {
  return page.evaluate((min) => {
    const malos: string[] = []
    const controles = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')
    for (const el of Array.from(controles)) {
      const r = el.getBoundingClientRect()
      // Lo que no se ve no se toca: un menú cerrado no es un defecto.
      if (r.width === 0 || r.height === 0) continue
      if (getComputedStyle(el).visibility === 'hidden') continue

      // UN CHECKBOX NO SE TOCA POR EL CUADRADITO, SE TOCA POR LA ETIQUETA.
      //
      // Este chequeo marcaba las dos casillas de /sumate —«Leí y acepto los
      // términos»— porque el <input> mide 16×16. Pero las dos viven adentro de
      // un <label> que las envuelve, así que el área que responde al dedo es el
      // renglón entero, de 44px para arriba. El ruleset pide exactamente eso:
      // que la etiqueta y el control compartan UN hit target, sin zonas muertas.
      // Estaba bien y el que erraba era el test.
      const tipo = el.getAttribute('type')
      let caja = { width: r.width, height: r.height }
      if (tipo === 'checkbox' || tipo === 'radio') {
        const etiqueta = el.closest('label')
          ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null)
        if (etiqueta) {
          const re = etiqueta.getBoundingClientRect()
          caja = { width: re.width, height: re.height }
        }
      }

      // EL ÁREA TOCABLE PUEDE SER MÁS GRANDE QUE LO QUE SE VE.
      //
      // `after:absolute after:-inset-4 after:content-['']` agranda el área que
      // responde al dedo sin mover un píxel del dibujo: es el idioma que el
      // propio código ya usa para el «Gestionar» del panel, que mide 12×12 y se
      // toca en 44×44. Medir sólo la caja del elemento acusa de chico a algo que
      // en el teléfono se toca perfecto — y ese es exactamente el tipo de
      // hallazgo falso que hace que alguien apague el chequeo.
      const ps = getComputedStyle(el, '::after')
      if (ps.position === 'absolute' && ps.content && ps.content !== 'none') {
        const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0)
        const extra = (a: string, b: string) => Math.max(0, -px(a)) + Math.max(0, -px(b))
        caja = {
          width: caja.width + extra(ps.left, ps.right),
          height: caja.height + extra(ps.top, ps.bottom),
        }
      }

      // UN ENLACE ADENTRO DE UNA ORACIÓN ESTÁ EXENTO, Y NO ES UNA CONCESIÓN:
      // lo dice WCAG 2.5.8, que exceptúa el target «inline» — el que está en una
      // oración, o cuyo tamaño lo impone el interlineado del texto de alrededor.
      //
      // Son los veintidós enlaces a rutas del manual y los enlaces sueltos
      // dentro de un párrafo de ayuda. Un chip de 44px de alto en medio de un
      // párrafo abre un boquete entre renglones y empeora el texto, que es lo
      // que la persona vino a leer. No hay forma de agrandarlo sin romper
      // aquello de lo que forma parte, y por eso la norma lo exceptúa.
      //
      // LAS TRES CONDICIONES, y las tres hacen falta:
      //
      //   1. el elemento fluye con el texto (`display` inline*)
      //   2. su contenedor es un bloque de texto y no una fila de controles.
      //      Sin esto, dos botones adentro de un `flex` se eximirían entre
      //      ellos: cada uno vería «texto alrededor» que es el del otro botón.
      //   3. hay texto que no es el suyo en ese mismo bloque
      //
      // La 3 se mide comparando el largo del texto del padre contra el propio, y
      // no buscando nodos de texto sueltos: el parser del manual envuelve cada
      // tramo en elementos, así que un `<p>` lleno de palabras puede no tener un
      // solo nodo de texto directo. Esa primera versión no eximía nada.
      const dPadre = el.parentElement ? getComputedStyle(el.parentElement).display : ''
      const enLinea = /^inline/.test(getComputedStyle(el).display)
        && /^(block|inline|inline-block|list-item|table-cell|flow-root)$/.test(dPadre)
        && ((el.parentElement?.textContent ?? '').trim().length
            - (el.textContent ?? '').trim().length) > 1
      if (enLinea) continue

      if (caja.height < min || caja.width < min) {
        const t = (el.textContent || '').trim().slice(0, 25)
        malos.push(`Área táctil: ${el.tagName.toLowerCase()} "${t}" → ${Math.round(caja.width)}×${Math.round(caja.height)} (mín ${min})`)
      }
    }
    return malos
  }, minimo)
}

/**
 * Un botón de sólo ícono no tiene texto, así que su nombre TIENE que venir de
 * aria-label o de un title. Sin eso, quien usa lector de pantalla escucha
 * «botón» y nada más.
 */
export async function sinNombre(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const malos: string[] = []
    for (const el of Array.from(document.querySelectorAll('button, a[href], [role="button"]'))) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const tieneTexto = (el.textContent || '').trim().length > 0
      const tieneEtiqueta = el.hasAttribute('aria-label')
        || el.hasAttribute('aria-labelledby')
        || el.hasAttribute('title')
      if (!tieneTexto && !tieneEtiqueta) {
        malos.push(`Sin nombre accesible: ${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 50)}`)
      }
    }
    return malos
  })
}

/**
 * `alt=""` cuenta como correcto: es la forma de DECIR que es decorativa. Lo que
 * falla es no tener el atributo, que deja al lector leyendo la URL.
 */
export async function sinAlt(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter(i => !i.hasAttribute('alt'))
      .map(i => `Imagen sin alt: ${i.getAttribute('src')?.slice(0, 60) ?? '(sin src)'}`))
}

/**
 * EL CONTRASTE, MEDIDO SOBRE LO QUE EL NAVEGADOR DIBUJA DE VERDAD.
 *
 * Calcularlo a mano sobre la paleta lleva a conclusiones falsas en las dos
 * direcciones. Pasó el 01/09/2026: `#7d7d8e` sobre `#1f1f2b` da 4.03 y parecía
 * un problema grande, pero esos doce casos son `hover:bg-[#1f1f2b]` combinado
 * con `hover:text-[#ececf1]` — cuando el fondo se aclara el texto se aclara
 * también, así que ese par NO EXISTE en pantalla.
 *
 * La única forma honesta de saberlo es preguntarle al navegador qué color quedó
 * sobre qué color, con los estados que efectivamente se dan.
 */
export async function contraste(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    /**
     * UN COLOR CUALQUIERA → [r, g, b, alfa], DEJÁNDOSELO AL NAVEGADOR.
     *
     * La primera versión sacaba los números con una expresión regular y asumía
     * que venían en ese orden. Anduvo mientras `getComputedStyle` devolvía
     * `rgb()`, y dejó de andar sin avisar: Tailwind 4 compila `text-[#a3e635]/70`
     * a **`oklab(0.849315 -0.13006 0.161475 / 0.7)`**, y leerle los tres primeros
     * números como si fueran rojo, verde y azul da un color que no existe. El
     * chip «ideal 22–28 °C» de Ambiente salía a 1.11:1 —texto invisible— cuando
     * en la pantalla se ve perfecto.
     *
     * Es el mismo error que el traspaso del 01/09 anotó al revés: medir sobre la
     * paleta en vez de sobre lo que el navegador dibuja. Acá el que inventaba la
     * paleta era el parser.
     *
     * El canvas no interpreta nada: se le pasa el color tal como vino, se pinta
     * un píxel con `copy` —que reemplaza en vez de mezclar, así el alfa queda
     * intacto— y se lee lo que quedó. Sirve para `rgb`, `oklab`, `color-mix`,
     * `lab`, y para lo que Tailwind emita el año que viene.
     */
    const lienzo = document.createElement('canvas')
    lienzo.width = lienzo.height = 1
    const ctx = lienzo.getContext('2d', { willReadFrequently: true })!
    ctx.globalCompositeOperation = 'copy'
    const leer = (c: string): [number, number, number, number] | null => {
      if (!c || c === 'transparent') return null
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      // fillStyle rechaza lo que no entiende y se queda con el valor anterior:
      // si quedó en negro sin que le hayan pedido negro, el color no era válido.
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const luminancia = (rgb: number[]) => {
      const [r, g, b] = rgb.slice(0, 3).map(v => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /**
     * EL FONDO REAL, COMPONIENDO LAS CAPAS SEMITRANSPARENTES.
     *
     * Acá estaba el error de la primera versión: se quedaba con la primera capa
     * que no fuera 100% transparente. Pero el sistema está lleno de
     * `bg-[#38bdf8]/15` —un celeste al 15% sobre la tarjeta oscura—, y tomarlo
     * como si fuera celeste sólido daba el chip «Próximo» a 1.00:1, o sea texto
     * celeste sobre fondo celeste. Eso no se ve en la pantalla porque NO ES LO
     * QUE PASA: lo que se ve es celeste sobre casi negro.
     *
     * Un chequeo que inventa defectos es peor que no tenerlo, porque el primero
     * que lo lea lo apaga. Así que se compone de verdad, de abajo hacia arriba:
     * `resultado = capa·alfa + fondo·(1-alfa)`.
     */
    const sobre = (capa: [number, number, number, number], base: number[]) =>
      [0, 1, 2].map(i => capa[i] * capa[3] + base[i] * (1 - capa[3]))

    const fondoDe = (el: Element): number[] => {
      const capas: [number, number, number, number][] = []
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = leer(getComputedStyle(n).backgroundColor)
        if (c && c[3] > 0) {
          capas.push(c)
          if (c[3] === 1) break   // opaca: lo de atrás ya no se ve
        }
      }
      let base = [10, 10, 15]     // --color-surface-950, el fondo de la app
      for (const capa of capas.reverse()) base = sobre(capa, base)
      return base
    }

    const malos: string[] = []
    const vistos = new Set<string>()
    for (const el of Array.from(document.querySelectorAll('*'))) {
      // Sólo elementos con texto PROPIO: si no, cada contenedor reporta el texto
      // de sus hijos y el mismo defecto sale cien veces.
      const propio = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent?.trim() ?? '')
        .join('')
      if (!propio) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue

      const texto = leer(cs.color)
      if (!texto) continue
      const fondo = fondoDe(el)
      // UN TEXTO SEMITRANSPARENTE NO SE LEE CONTRA SÍ MISMO. `text-[#a3e635]/70`
      // deja pasar el fondo, y lo que el ojo recibe es la mezcla: componerlo es
      // lo mismo que ya se hacía con las capas de fondo, del otro lado.
      const lTexto = luminancia(texto[3] < 1 ? sobre(texto, fondo) : texto)
      const lFondo = luminancia(fondo)
      const hi = Math.max(lTexto, lFondo), lo = Math.min(lTexto, lFondo)
      const ratio = (hi + 0.05) / (lo + 0.05)

      // WCAG baja el umbral a 3:1 para texto grande, que define como 24px, o
      // 18.66px si es negrita. No es una concesión: una letra más gorda se
      // distingue con menos contraste.
      const px = parseFloat(cs.fontSize)
      const negrita = parseInt(cs.fontWeight, 10) >= 700
      const umbral = (px >= 24 || (px >= 18.66 && negrita)) ? 3 : 4.5
      if (ratio >= umbral) continue

      const clave = `${cs.color}|${umbral}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      // El fondo va en hexadecimal y no como luminancia: lo que hace falta para
      // arreglarlo es saber CONTRA QUÉ COLOR se está midiendo, y «0.0078» no se
      // puede buscar en el código.
      const hex = (v: number[]) => '#' + v.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('')
      malos.push(`Contraste ${ratio.toFixed(2)} (mín ${umbral}) — ${hex(texto)} sobre ${hex(fondo)}, ${px}px — «${propio.slice(0, 40)}»`)
    }
    return malos
  })
}

/**
 * EL CONTRATO DE UN DIÁLOGO, CON UN MODAL ABIERTO EN PANTALLA.
 *
 * Los 37 modales de la app son `div`s a mano: no hay un `<dialog>` que traiga
 * esto de arriba. Hasta el 02/09/2026 ninguno se anunciaba como diálogo y el
 * foco se quedaba en el `<body>` al abrirlos —medido acá—, así que quien navega
 * con teclado abría un formulario al que no llegaba, y un lector de pantalla
 * veía aparecer un pedazo de página sin ningún aviso.
 *
 * Lo resuelve `lib/useDialogo.ts` en un solo lugar. Esto es lo que impide que se
 * pierda de nuevo: un modal nuevo que se olvide del `ref` falla acá.
 *
 * Se corre SÓLO con un modal abierto. Sin nada abierto no hay nada que revisar.
 */
export async function dialogo(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const malos: string[] = []
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }
    const dialogos = Array.from(document.querySelectorAll('[role="dialog"]')).filter(visible)
    if (dialogos.length === 0) {
      return ['El modal abierto no se anuncia como diálogo: falta role="dialog" (¿se olvidó el ref de useDialogo?)']
    }
    // El que está arriba de todo es el que la persona está usando. Si hay dos
    // -un formulario que abrió una confirmación- se revisa ese.
    const d = dialogos[dialogos.length - 1]

    if (d.getAttribute('aria-modal') !== 'true') {
      malos.push('Al diálogo le falta aria-modal="true", que es lo que deja inerte todo lo de atrás')
    }

    // EL NOMBRE, RESUELTO COMO LO RESUELVE UN LECTOR DE PANTALLA. Un
    // `aria-labelledby` que apunta a un id que no existe no es un nombre: es
    // peor que nada, porque parece que está puesto.
    const porId = d.getAttribute('aria-labelledby')
    const etiqueta = porId
      ? (document.getElementById(porId)?.textContent ?? '').trim()
      : (d.getAttribute('aria-label') ?? '').trim()
    if (!etiqueta) {
      malos.push(`El diálogo no tiene nombre accesible: se anuncia como «diálogo» y nada más (aria-labelledby=${porId ?? 'ninguno'})`)
    }

    if (!d.contains(document.activeElement)) {
      const a = document.activeElement
      malos.push(`El foco quedó fuera del diálogo, en ${a?.tagName.toLowerCase() ?? 'null'}: con teclado no se llega al formulario`)
    }
    return malos
  })
}

/**
 * ¿EL FOCO SE PUEDE ESCAPAR DEL DIÁLOGO TABULANDO?
 *
 * Se mide tabulando de verdad, no leyendo atributos: la trampa de foco es
 * comportamiento, y lo único que prueba que funciona es que el foco no se vaya.
 * Se dan más vueltas que controles tiene un formulario largo.
 */
export async function focoAtrapado(page: Page, vueltas = 30): Promise<string[]> {
  const fuera: string[] = []
  for (let i = 0; i < vueltas; i++) {
    await page.keyboard.press('Tab')
    const donde = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll('[role="dialog"]'))
        .filter(el => el.getBoundingClientRect().width > 0)
        .pop()
      if (!d) return 'sin-dialogo'
      const a = document.activeElement
      return d.contains(a) ? null : `${a?.tagName.toLowerCase()} "${(a?.textContent ?? '').trim().slice(0, 20)}"`
    })
    if (donde) fuera.push(`Tab ${i + 1} se fue a ${donde}`)
  }
  return fuera.length
    ? [`El foco se escapa del diálogo: ${fuera.length}/${vueltas} tabulaciones caen afuera (${fuera[0]})`]
    : []
}

/**
 * Lo que NO es culpa de la app: en modo demo no hay backend, y el navegador
 * reporta como error de consola cada request que no llega.
 */
export const erroresPropios = (errores: string[]) =>
  errores.filter(e => !/favicon|net::ERR|Failed to load resource|supabase|401|403/i.test(e))

/**
 * Los cinco chequeos que se pueden correr sobre un estado cualquiera de la
 * pantalla, juntos.
 *
 * Para las diez rutas principales cada uno es un test aparte, que es más claro
 * cuando falla. Para una solapa o un modal se corren todos de una: llegar hasta
 * ahí cuesta una navegación y un click, y pagarlo cinco veces multiplicaría por
 * cinco lo que tarda la revisión sin decir nada que no diga esto.
 */
export async function revisarTodo(page: Page): Promise<string[]> {
  return [
    ...await desborde(page),
    ...await areaTactil(page),
    ...await sinNombre(page),
    ...await sinAlt(page),
    ...await contraste(page),
  ]
}
