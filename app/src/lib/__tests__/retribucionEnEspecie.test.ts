import { describe, it, expect } from 'vitest'
import { retribucionEnEspecie } from '../ong'
import type { Dispensa } from '../ong'

/**
 * Los números son los de producción al 08/09/2026: 112 movimientos, 566 g,
 * 111 de ellos con costo declarado, $4.368.000 al costo.
 */
const d = (p: Partial<Dispensa>): Dispensa => ({
  id: crypto.randomUUID(), fecha: '2026-08-01', gramos: 0, ...p,
} as Dispensa)

const LOTES = [
  { codigo: 'A-GC29826', costo_por_gramo: 12000 },
  { codigo: 'A-RN29826', costo_por_gramo: 7500 },
  { codigo: 'SIN-COSTO', costo_por_gramo: null },
]

describe('retribucionEnEspecie', () => {
  it('valúa al costo del lote, no a la tarifa', () => {
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 5, lote_codigo: 'A-GC29826', paciente_id: 'hugo' }),
    ], LOTES)
    expect(r.costo).toBe(60000)   // 5 x 12.000, el costo. A tarifa de 15.000 daría 75.000.
    expect(r.gramos).toBe(5)
    expect(r.movimientos).toBe(1)
  })

  it('sólo cuenta la retribución, no las otras entregas de la misma persona', () => {
    // Hugo tiene 11 entregas que SÍ pagó, por $815.000. La marca en su ficha no
    // convierte todo lo suyo en retribución: sólo lo que salió sin plata.
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 5, lote_codigo: 'A-RN29826', paciente_id: 'hugo' }),
      d({ tipo_movimiento: 'entrega', gramos: 10, aporte: 150000, lote_codigo: 'A-RN29826', paciente_id: 'hugo' }),
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 20, lote_codigo: 'A-RN29826', paciente_id: 'otro' }),
    ], LOTES)
    expect(r.movimientos).toBe(1)
    expect(r.gramos).toBe(5)
    expect(r.costo).toBe(37500)
  })

  it('un lote sin costo no vale cero: se informa aparte', () => {
    // Mismo criterio que `fueraDeBalance`. Un total que esconde lo que no pudo
    // medir se lee como si estuviera completo.
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 5, lote_codigo: 'A-GC29826', paciente_id: 'h' }),
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 2, lote_codigo: 'SIN-COSTO', paciente_id: 'h' }),
    ], LOTES)
    expect(r.gramos).toBe(7)
    expect(r.gramosSinCosto).toBe(2)
    expect(r.costo).toBe(60000)
  })

  it('un lote que no existe tampoco vale cero', () => {
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 3, lote_codigo: 'FANTASMA', paciente_id: 'h' }),
    ], LOTES)
    expect(r.gramosSinCosto).toBe(3)
    expect(r.costo).toBe(0)
  })

  it('cruza el código del lote igual que el resto: normalizado', () => {
    // `ong_dispensas` engancha al lote por texto, no por id.
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 1, lote_codigo: ' a-gc29826 ', paciente_id: 'h' }),
    ], LOTES)
    expect(r.costo).toBe(12000)
  })

  it('reparte por persona, de mayor a menor', () => {
    const r = retribucionEnEspecie([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 2, lote_codigo: 'A-RN29826', paciente_id: 'cristian' }),
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 10, lote_codigo: 'A-GC29826', paciente_id: 'hugo' }),
    ], LOTES)
    expect(r.porPersona.map(p => p.paciente_id)).toEqual(['hugo', 'cristian'])
    expect(r.porPersona[0].costo).toBe(120000)
  })

  it('sin retribuciones da cero y no rompe', () => {
    const r = retribucionEnEspecie([], [])
    expect(r).toEqual({ movimientos: 0, gramos: 0, costo: 0, gramosSinCosto: 0, porPersona: [] })
  })
})
