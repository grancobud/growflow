// De un modal siempre se tiene que poder salir.
//
// EL CASO QUE LO ORIGINÓ
//
// En el celular un modal ocupa casi todo el alto (`max-h-[92vh]`, pegado abajo).
// Lo único que queda tocable del fondo es una franja de arriba, que en un
// teléfono cae justo debajo de la barra de estado. Si el modal además no tiene
// una X, no hay ninguna forma de salir: quedás encerrado y ni el botón atrás
// ayuda, porque abrir un modal no cambia el historial.
//
// Le pasó al visor de documentos, que era el único sin botón de cerrar. En una
// pantalla de escritorio no se nota nunca: el modal es una caja chica en el
// medio y hay fondo de sobra para tocar.
//
// Lo que se exige acá es que cada modal tenga las DOS salidas: una visible
// —X, «Cerrar» o «Cancelar»— y la del botón atrás del teléfono.
//
// ⚠ LA PRIMERA VERSIÓN DE ESTE ARCHIVO PASÓ EN VERDE TAPANDO SIETE MODALES.
// Buscaba `fixed inset-0 z-[` —con corchete, por los `z-[60]` y `z-[70]`— y no
// veía ninguno de los `z-50`, que son la mitad de la app. De ahí el primer caso
// de abajo: si el detector deja de encontrar lo que hay, el archivo entero
// pasaría sin haber mirado nada.

import { describe, it, expect } from 'vitest'

const FUENTES = Object.entries(
  import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }),
) as [string, string][]

/** El overlay a pantalla completa: con corchete (`z-[70]`) o sin él (`z-50`). */
const RE_OVERLAY = /fixed inset-0 z-/g

/** Los archivos que dibujan al menos un modal a pantalla completa. */
function archivosConModal(): { ruta: string; src: string; modales: number }[] {
  return FUENTES
    .map(([ruta, src]) => ({
      ruta: ruta.replace(/^\.\.\/\.\.\//, ''),
      src,
      modales: (src.match(RE_OVERLAY) ?? []).length,
    }))
    .filter(x => x.modales > 0)
}

/**
 * La excepción se declara en el archivo, no se esconde acá.
 *
 * Hay casos legítimos: la pantalla de bloqueo, donde poder salir es exactamente
 * lo que NO se quiere, y los primitivos de shadcn/Radix, que traen el suyo. Se
 * marcan con `modal-exceptuado:` y el motivo, en el encabezado del archivo. Una
 * lista de excepciones adentro del test se olvida de por qué estaba cada
 * nombre; escrita al lado del código, la lee quien lo toca.
 */
const exceptuado = (src: string) => src.includes('modal-exceptuado:')

/** Bloques de función top-level de un archivo, con su cuerpo. */
function funciones(src: string): { nombre: string; cuerpo: string }[] {
  const out: { nombre: string; cuerpo: string[] }[] = []
  let actual: { nombre: string; cuerpo: string[] } | null = null
  for (const linea of src.split(/\r?\n/)) {
    const m = linea.match(/^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)/)
    if (m) { if (actual) out.push(actual); actual = { nombre: m[1], cuerpo: [] } }
    if (actual) actual.cuerpo.push(linea)
  }
  if (actual) out.push(actual)
  return out.map(b => ({ nombre: b.nombre, cuerpo: b.cuerpo.join('\n') }))
}

describe('salir de un modal', () => {
  it('el detector encuentra los modales que hay', () => {
    // Si las clases del contenedor cambian, el regex deja de encontrar nada y
    // este archivo entero pasaría en verde sin haber mirado un solo modal.
    // El piso está puesto cerca de la cantidad real a propósito: que bajar de
    // golpe cante, en vez de pasar por estar «arriba de diez».
    //
    // Bajó de 31 a 28 el 31/08/2026 y el guardia cantó, que es para lo que
    // está. No se aflojó por comodidad: se borraron 107 archivos del CannTrace
    // original que ningún camino alcanzaba, y tres de ellos dibujaban un modal.
    // Se verificó que el JS del bundle publicado quedó IDÉNTICO byte a byte.
    expect(archivosConModal().length).toBeGreaterThan(25)
  })

  /**
   * El bloque de cada modal: del overlay al siguiente overlay, o al fin de la
   * función que lo contiene. Delimitarlo por sangría cortaba de más y daba
   * cinco falsos positivos.
   */
  function modales(): { sitio: string; bloque: string }[] {
    const out: { sitio: string; bloque: string }[] = []
    for (const [ruta, src] of FUENTES) {
      if (exceptuado(src)) continue
      const lineas = src.split(/\r?\n/)
      const overlays: number[] = []
      const arranques: number[] = []
      lineas.forEach((l, i) => {
        if (/fixed inset-0 z-/.test(l)) overlays.push(i)
        if (/^(?:export\s+)?(?:default\s+)?function\s+[A-Z]/.test(l)) arranques.push(i)
      })
      overlays.forEach((i, k) => {
        const hasta = Math.min(
          arranques.find(f => f > i) ?? lineas.length,
          overlays[k + 1] ?? lineas.length,
        )
        out.push({
          sitio: `${ruta.replace(/^\.\.\/\.\.\//, '')}:${i + 1}`,
          bloque: lineas.slice(i, hasta).join('\n'),
        })
      })
    }
    return out
  }

  it('cada modal tiene la X arriba', () => {
    // Se mira MODAL POR MODAL, no archivo por archivo. Con el archivo entero
    // alcanzaba con que UNO de los tres modales tuviera su X para que los otros
    // dos pasaran de arriba.
    //
    // Se exige el `aria-label="Cerrar"`, no el icono suelto: un <X/> sin
    // etiqueta lo lee un lector de pantalla como «botón» a secas, y desde acá
    // no se distingue de un icono decorativo.
    const sinX = modales().filter(m => !/aria-label="Cerrar/.test(m.bloque)).map(m => m.sitio)
    expect(sinX).toEqual([])
  })

  it('cada modal tiene su botón al pie', () => {
    // Las DOS salidas, no una. La X de la esquina es chica y en un teléfono
    // queda arriba de todo, lejos del pulgar y a veces debajo de la barra de
    // estado; el botón del pie es el que se ve y se alcanza. Tocar el fondo no
    // cuenta: casi no hay fondo, y no se ve que sea tocable.
    //
    // `{pie}` cuenta como pie: es el armazon compartido (`MarcoDialogo` en
    // `useConfirm.tsx`), que recibe el suyo por prop y por eso no lo tiene
    // escrito adentro. Eso NO afloja la regla: la prop es obligatoria, asi que
    // TypeScript no deja llamarlo sin pie, y el test de abajo revisa que cada
    // pie que se le pasa tenga de verdad una salida.
    const RE_PIE = /Cerrar<\/|Cancelar<\/|>\s*Cerrar\s*<|>\s*Cancelar\s*<|'Cancelar'|"Cancelar"|\{cancelLabel|\{pie\}/
    const sinPie = modales().filter(m => !RE_PIE.test(m.bloque)).map(m => m.sitio)
    expect(sinPie).toEqual([])
  })

  it('el pie que se delega por prop trae la salida', () => {
    // La contracara de haber aceptado `{pie}` arriba. Sin esto, un armazón
    // compartido sería la forma de esquivar la regla: el modal pasa porque
    // delega, y el que delega nunca se mira.
    //
    // Se buscan las LLAMADAS a `<MarcoDialogo`, no cualquier prop que se llame `pie`.
    // La primera versión partía por `pie={` a secas y marcaba diez sitios que no
    // son modales: los pies de tabla de Estadísticas y de Nueva reserva. Un test
    // que marca de más se termina desactivando, que es peor que no tenerlo.
    const usos: { sitio: string; bloque: string }[] = []
    for (const [ruta, src] of FUENTES) {
      const lineas = src.split(/\r?\n/)
      lineas.forEach((l, i) => {
        if (/<MarcoDialogo\b/.test(l)) {
          usos.push({
            sitio: `${ruta.replace(/^\.\.\/\.\.\//, '')}:${i + 1}`,
            // Hasta el cierre del elemento: alcanza para abarcar su `pie`.
            bloque: lineas.slice(i, i + 40).join('\n'),
          })
        }
      })
    }
    // Si el armazón se renombra, esto dejaría de mirar nada y pasaría en verde.
    expect(usos.length).toBeGreaterThan(0)
    expect(usos.filter(u => !/Cancelar|Cerrar/.test(u.bloque)).map(u => u.sitio)).toEqual([])
  })

  it('en todos, el botón atrás del teléfono cierra el modal', () => {
    // Es el primer reflejo de cualquiera en un teléfono, y sin esto te saca de
    // la pantalla entera o no hace nada. Lo resuelve useDialogo, que
    // empuja una entrada al historial mientras el modal está abierto.
    const sinAtras = archivosConModal()
      .filter(x => !exceptuado(x.src) && !x.src.includes('useDialogo'))
      .map(x => x.ruta)
    expect(sinAtras).toEqual([])
  })

  it('el hook se llama una vez por modal, al menos', () => {
    // Un archivo con tres modales y una sola llamada deja dos sin cubrir. No es
    // exacto —un componente puede delegar su marco en otro— pero atrapa el caso
    // de agregar un modal al lado de otro y olvidarse.
    const cortos = archivosConModal()
      .filter(x => !exceptuado(x.src))
      .filter(x => (x.src.match(/useDialogo\(/g) ?? []).length < x.modales)
      .map(x => `${x.ruta} (${x.modales} modales)`)
    expect(cortos).toEqual([])
  })

  it('ningún modal empuja DOS entradas al historial', () => {
    // El caso: un componente llama al hook y además delega su marco en otro que
    // ya lo llama —ModalItem dentro de ModalShell, NuevaReserva dentro de
    // Marco—. Cada uno empuja su entrada, así que hay que apretar atrás DOS
    // veces para cerrar UN modal. Parece que el botón no anda.
    //
    // Se detecta por la función de cierre: si el padre le pasa al hijo la MISMA
    // que le dio al hook, están cerrando el mismo modal. Un modal anidado de
    // verdad pasa otra cosa (`() => setEdit(null)`) y no cuenta.
    const conHook = new Set<string>()
    for (const [, src] of FUENTES)
      for (const f of funciones(src))
        if (f.cuerpo.includes('useDialogo(')) conHook.add(f.nombre)

    const dobles: string[] = []
    for (const [ruta, src] of FUENTES) {
      for (const f of funciones(src)) {
        const m = f.cuerpo.match(/useDialogo\((\w+)\)/)
        if (!m) continue
        const cerrar = m[1]           // onCerrar / onClose
        for (const hijo of conHook) {
          if (hijo === f.nombre) continue
          // `(?!\w)` para que <ModalShell> no cuente como un uso de <Modal>.
          const usa = new RegExp(`<${hijo}(?!\\w)[\\s\\S]{0,400}?on(?:Cerrar|Close)=\\{${cerrar}\\}`)
          if (usa.test(f.cuerpo))
            dobles.push(`${ruta.replace(/^\.\.\/\.\.\//, '')}: ${f.nombre} -> <${hijo}>`)
        }
      }
    }
    expect(dobles).toEqual([])
  })
})
