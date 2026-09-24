// El denominador del costo por gramo.
//
// EL CASO REAL, medido el 01/09/2026. La pantalla mostraba **$56.146 por
// gramo**: los $5.614.614 que cuesta el ciclo divididos por 100 g «secos
// cosechados en 15 cosechas». Y ese número no se queda en Econometría — de ahí
// sale el margen de CADA entrega en la O.N.G.
//
// Dos errores encimados, y los dos de la misma familia:
//
//  1. El material propio de Panacea casi nunca pasa por una cosecha: de 5.628 g
//     propios, sólo 100 tienen cosecha registrada. El resto entra como lote
//     `propio_sin_cosecha`, concepto que el sistema inventó el 20/08 para esto.
//     `balanceMateria` ya lo usaba; Econometría no se había enterado.
//  2. Mezclaba un año de historia con el ciclo en curso, después de un corte que
//     justamente dice que lo viejo es historia.

import { describe, it, expect } from 'vitest'
import { materialDelCiclo } from '../econometria'

const CORTE = '2026-08-29'

/** Los cuatro lotes del Consolidado Definitivo de Migración. */
const LOTES_DEL_CORTE = [
  { origen: 'propio_sin_cosecha', unidad: 'g', gramos_totales: 233, fecha_elaboracion: '2026-08-29' },
  { origen: 'propio_sin_cosecha', unidad: 'g', gramos_totales: 221, fecha_elaboracion: '2026-08-29' },
  { origen: 'propio_sin_cosecha', unidad: 'g', gramos_totales: 177, fecha_elaboracion: '2026-08-29' },
  { origen: 'propio_sin_cosecha', unidad: 'g', gramos_totales: 164, fecha_elaboracion: '2026-08-29' },
]

describe('materialDelCiclo', () => {
  it('el caso real: 795 g del corte, no los 100 g de cosechas viejas', () => {
    const r = materialDelCiclo(
      [{ fecha: '2026-08-27', peso_seco_g: 100 }],
      LOTES_DEL_CORTE,
      CORTE,
    )
    expect(r.gramos).toBe(795)
    expect(r.deLotesPropios).toBe(795)
    expect(r.deCosechas).toBe(0)
    // Lo viejo no se esconde: se dice cuánto quedó afuera.
    expect(r.antesDelCorte).toBe(100)
  })

  it('LO COMPRADO NO ENTRA', () => {
    // El costo por gramo reparte lo que cuesta CULTIVAR entre lo que el cultivo
    // dio. Un lote comprado trae su propio `costo_por_gramo`, y meterlo en el
    // denominador abarataría el cultivo propio con material que se pagó aparte.
    // Es la quinta aparición de la misma confusión (ver §7.11 del traspaso).
    const r = materialDelCiclo([], [
      ...LOTES_DEL_CORTE,
      { origen: 'comprado', unidad: 'g', gramos_totales: 4214, fecha_elaboracion: '2026-08-29' },
    ], CORTE)
    expect(r.gramos).toBe(795)
  })

  it('un lote `propio` con su cosecha detrás tampoco entra dos veces', () => {
    // Ese material ya lo cuenta su cosecha. Sumar el lote además sería contarlo
    // dos veces y abaratar el gramo a la mitad.
    const r = materialDelCiclo(
      [{ fecha: '2026-08-30', peso_seco_g: 500 }],
      [{ origen: 'propio', unidad: 'g', gramos_totales: 500, fecha_elaboracion: '2026-08-30' }],
      CORTE,
    )
    expect(r.gramos).toBe(500)
  })

  it('las cosechas del ciclo se suman a los lotes propios', () => {
    const r = materialDelCiclo(
      [{ fecha: '2026-09-15', peso_seco_g: 500 }],
      LOTES_DEL_CORTE,
      CORTE,
    )
    expect(r.gramos).toBe(1295)
    expect(r.deCosechas).toBe(500)
    expect(r.deLotesPropios).toBe(795)
  })

  it('el aceite no entra: se cuenta en unidades, no en gramos', () => {
    // Sumar frascos a gramos da un número que no significa nada. Es el mismo
    // criterio que ya usa `balanceMateria`.
    const r = materialDelCiclo([], [
      { origen: 'propio_sin_cosecha', unidad: 'u', gramos_totales: 1, fecha_elaboracion: '2026-08-29' },
      ...LOTES_DEL_CORTE,
    ], CORTE)
    expect(r.gramos).toBe(795)
  })

  it('sin corte cargado se cuenta todo, que es como estaba antes', () => {
    // Una instalación que nunca cortó no puede quedarse sin denominador por
    // haber agregado la función.
    const r = materialDelCiclo(
      [{ fecha: '2026-01-01', peso_seco_g: 100 }],
      LOTES_DEL_CORTE,
      '',
    )
    expect(r.gramos).toBe(895)
    expect(r.antesDelCorte).toBe(0)
  })

  it('sin nada devuelve cero y no rompe', () => {
    expect(materialDelCiclo([], [], CORTE))
      .toEqual({ gramos: 0, deCosechas: 0, deLotesPropios: 0, antesDelCorte: 0 })
  })

  it('un lote sin fecha queda del lado viejo, no del nuevo', () => {
    // Ante la duda, afuera: meterlo en el ciclo nuevo abarataría el gramo con
    // material que no se sabe cuándo entró.
    const r = materialDelCiclo([], [
      { origen: 'propio_sin_cosecha', unidad: 'g', gramos_totales: 300, fecha_elaboracion: null },
    ], CORTE)
    expect(r.gramos).toBe(0)
    expect(r.antesDelCorte).toBe(300)
  })
})
