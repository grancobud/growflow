import { describe, it, expect } from 'vitest'
import {
  tipoDeMovimiento, labelMovimiento, TIPOS_MOVIMIENTO,
  MOVIMIENTOS_QUE_GENERAN_DEUDA, MOVIMIENTOS_CON_MATERIAL,
} from '../ong'

/**
 * Los seis hechos que una fila de `ong_dispensas` puede ser.
 *
 * Los números de este archivo son los de producción al 08/09/2026, no
 * inventados: PAC-049 retiró 350 g en seis veces sin pagar y después pagó
 * $750.000 sin llevarse nada. Ese ciclo estaba en los datos y el sistema lo
 * leía como dos errores.
 */
describe('tipoDeMovimiento', () => {
  it('una entrega normal mueve material y plata a la vez', () => {
    expect(tipoDeMovimiento({ gramos: 15, aporte: 200000, paciente_id: 'p' })).toBe('entrega')
  })

  it('plata sin gramos es un cobro de deuda, no un error de carga', () => {
    expect(tipoDeMovimiento({ gramos: 0, aporte: 750000, paciente_id: 'p' })).toBe('cobro_de_deuda')
  })

  it('gramos sin plata, con socio, es un retiro a cuenta', () => {
    expect(tipoDeMovimiento({ gramos: 5, aporte: 0, paciente_id: 'p' })).toBe('entrega_a_cuenta')
  })

  it('lo mismo, pero de quien trabaja, es parte de su pago y NO una deuda', () => {
    // Hugo y Cristian tenian 566 g de los 1.534 sin cobrar: el 37%. Contarlos
    // como deuda le inventaba un numero millonario a las dos personas que
    // sostienen la sede.
    expect(tipoDeMovimiento(
      { gramos: 5, aporte: 0, paciente_id: 'p' },
      { retira_como_retribucion: true },
    )).toBe('retribucion_en_especie')
  })

  it('la marca solo cambia el retiro sin aporte, no una entrega cobrada', () => {
    expect(tipoDeMovimiento(
      { gramos: 5, aporte: 75000, paciente_id: 'p' },
      { retira_como_retribucion: true },
    )).toBe('entrega')
  })

  it('gramos sin plata y SIN socio no se adivina', () => {
    // Consumo interno, merma y ajuste se parecen entre sí y a una entrega a
    // cuenta. Deducir uno escribiría una mentira: null es «todavía no se sabe».
    expect(tipoDeMovimiento({ gramos: 5, aporte: 0 })).toBeNull()
  })

  it('un aporte negativo tampoco se adivina', () => {
    // Hay uno real en la base, de -$60.000. Que caiga en null lo deja a la
    // vista en vez de disfrazarlo de entrega.
    expect(tipoDeMovimiento({ gramos: 5, aporte: -60000, paciente_id: 'p' })).toBeNull()
  })

  it('la fila vacía no es una entrega', () => {
    expect(tipoDeMovimiento({})).toBeNull()
  })
})

describe('labelMovimiento', () => {
  it('nombra los seis tipos', () => {
    for (const t of TIPOS_MOVIMIENTO) {
      expect(labelMovimiento(t)).not.toBe('Sin clasificar')
      expect(labelMovimiento(t).length).toBeGreaterThan(0)
    }
  })

  it('un valor que el front no conoce NO tumba la pantalla', () => {
    // La base se migra por SQL y por la Edge Function `ingesta`, y ninguna de
    // las dos pasa por TypeScript: el día que aparezca un séptimo valor, tiene
    // que salir un texto y no un undefined.
    expect(labelMovimiento('devolucion')).toBe('Sin clasificar')
    expect(labelMovimiento(null)).toBe('Sin clasificar')
    expect(labelMovimiento(undefined)).toBe('Sin clasificar')
  })
})

describe('que cuenta como deuda y que como material', () => {
  it('la retribucion en especie mueve material pero NO genera deuda', () => {
    expect(MOVIMIENTOS_CON_MATERIAL.has('retribucion_en_especie')).toBe(true)
    expect(MOVIMIENTOS_QUE_GENERAN_DEUDA.has('retribucion_en_especie')).toBe(false)
  })

  it('el unico que deja debiendo es la entrega a cuenta', () => {
    expect([...MOVIMIENTOS_QUE_GENERAN_DEUDA]).toEqual(['entrega_a_cuenta'])
  })

  it('el cobro de deuda no mueve material', () => {
    expect(MOVIMIENTOS_CON_MATERIAL.has('cobro_de_deuda')).toBe(false)
  })

  it('consumo interno y retribucion en especie son cosas distintas', () => {
    // CI es lo que consume la organizacion en comun; la retribucion es de una
    // persona y es parte de su pago. Aplanarlas pierde la unica que se puede
    // valuar como gasto.
    expect(TIPOS_MOVIMIENTO).toContain('consumo_interno')
    expect(TIPOS_MOVIMIENTO).toContain('retribucion_en_especie')
  })
})
