// Un papel que se emite y no queda archivado no existió.
//
// La app genera nueve documentos distintos —recibos, actas, guías de tránsito,
// mandatos, informes— y todos terminan en papel o en PDF. Pero generarlos es
// una cosa y CONSERVARLOS es otra: el visor sólo ofrece el botón «Emitir»
// cuando la pantalla que lo abre le pasa `onEmitido`, y ese prop es opcional.
//
// Cuando falta no hay error ni aviso: el documento se ve, se imprime, se firma
// y se entrega igual. Simplemente no queda constancia de que existió. Se
// descubre seis meses después, cuando alguien lo pide y no está.
//
// Fue exactamente lo que pasó: de nueve visores, sólo tres archivaban, y los
// seis mudos incluían los tres del circuito de entrega — el recibo de la
// dispensa, el del portal y el de la reserva al entregar. O sea, el papel que
// más se emite era el único que nunca se guardaba.
//
// Se leen las fuentes con import.meta.glob y no con fs: es lo que ya usa Vite,
// no necesita @types/node, y typechea.

import { describe, it, expect } from 'vitest'

/** Cada lugar del código que abre el visor, con los props que le pasa. */
function invocaciones(): { archivo: string; props: string }[] {
  const fuentes = Object.entries(
    import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }),
  ) as [string, string][]

  const todas: { archivo: string; props: string }[] = []
  for (const [ruta, src] of fuentes) {
    let desde = src.indexOf('<VisorDocumento')
    while (desde !== -1) {
      todas.push({ archivo: ruta, props: props(src, desde) })
      desde = src.indexOf('<VisorDocumento', desde + 1)
    }
  }
  return todas
}

/**
 * Los props de UNA invocación: del `<VisorDocumento` a su `/>`.
 *
 * Se cuentan las llaves porque hay props que traen JSX adentro —`extra={<button
 * …/>}`— y ese `/>` no cierra la invocación. Cortar en el primero deja props
 * afuera; no cortar la deja abierta hasta el final del archivo y se lee lo del
 * componente de al lado. Eso ya pasó: la primera versión de este test daba por
 * archivado el visor de Documentos.tsx porque se comía un `onEmitido` que era
 * de otro componente, doscientas líneas más abajo.
 */
function props(src: string, desde: number): string {
  let profundidad = 0
  for (let i = desde; i < src.length; i++) {
    const c = src[i]
    if (c === '{') profundidad++
    else if (c === '}') profundidad--
    else if (c === '/' && src[i + 1] === '>' && profundidad === 0) {
      return src.slice(desde, i)
    }
  }
  return src.slice(desde)
}

describe('documentos emitidos', () => {
  it('hay visores que revisar (si el regex deja de matchear, el test no prueba nada)', () => {
    expect(invocaciones().length).toBeGreaterThan(5)
  })

  it('todo documento que se abre se puede archivar, o declara que ya lo está', () => {
    // Sin `onEmitido` el botón «Emitir» no se dibuja y el papel no tiene forma
    // de quedar guardado. La única excepción legítima es el visor que REABRE
    // algo del archivo, y esa se declara con `yaArchivado` — porque si no,
    // «falta cablearlo» y «no debe archivarse» se escriben igual: los dos son
    // la ausencia del prop.
    const mudos = invocaciones()
      .filter(i => !/\bonEmitido\b/.test(i.props) && !/\byaArchivado\b/.test(i.props))
      .map(i => i.archivo)
    expect(mudos).toEqual([])
  })

  it('todo documento declara qué clase de papel es', () => {
    // Sin `archivo` se guarda como «Otro» y sin dueño: entra a la lista y no se
    // lo puede encontrar por paciente ni por número, que es justamente para lo
    // que se archiva. Al que sale del archivo no se le pide: ya tiene su clase.
    const sinClase = invocaciones()
      .filter(i => !/\barchivo=\{/.test(i.props) && !/\byaArchivado\b/.test(i.props))
      .map(i => i.archivo)
    expect(sinClase).toEqual([])
  })

  it('ninguna clase de papel viene vacía', () => {
    const vacias: string[] = []
    for (const i of invocaciones()) {
      const m = i.props.match(/subtipo:\s*(?:'([^']*)'|([a-zA-Z]))/)
      // Puede ser una expresión (un ternario que elige entre dos clases); ahí
      // sólo se comprueba que exista algo, no cuál.
      if (m && m[1] !== undefined && m[1].trim() === '') vacias.push(i.archivo)
    }
    expect(vacias).toEqual([])
  })
})
