// Plata que uno se debe a si mismo no es deuda.
//
// El caso salio de Panacea: la planilla de la que se migro no tenia el concepto
// de cultivo propio, asi que un año entero de produccion propia entro como
// ordenes de compra a si mismos — 46 ordenes, $26.376.500, el 81% de todo el
// saldo. La pantalla mostraba $32.442.000 de deuda cuando con terceros eran
// unos $6,2M.
//
// El error caro de este cruce es al REVES del que parece: sacar de mas esconde
// una deuda real. Por eso compara el nombre completo y nunca por parecido.

import { describe, it, expect } from 'vitest'
import { separarProduccionPropia, balanceMateria, loteEsComprado, loteSumaAlIngreso } from '../ong'
import type { LoteIngreso } from '../ong'

const f = (proveedor: string, saldo = 0) => ({ proveedor, saldo })

describe('separarProduccionPropia', () => {
  it('saca la fila de la propia entidad y deja el resto', () => {
    const r = separarProduccionPropia(
      [f('Coop. Panacea', 26226500), f('Proyecto Norte', 3910000), f('Graciela', 500)],
      'Coop. Panacea')
    expect(r.propia.map(x => x.proveedor)).toEqual(['Coop. Panacea'])
    expect(r.terceros.map(x => x.proveedor)).toEqual(['Proyecto Norte', 'Graciela'])
  })

  it('sin nombre declarado no separa nada', () => {
    // Es el caso de Chaco y el de cualquier entidad que no cargue su produccion
    // como orden. Sin valor, la pantalla tiene que verse igual que antes.
    for (const v of [null, undefined, '', '   ']) {
      const r = separarProduccionPropia([f('Coop. Panacea'), f('Graciela')], v)
      expect(r.propia).toEqual([])
      expect(r.terceros).toHaveLength(2)
    }
  })

  it('no le importan las mayusculas ni los espacios de mas', () => {
    // Mismo criterio que agrupa v_saldo_proveedores: el nombre ES la clave y
    // se compara como lo compara una persona.
    const r = separarProduccionPropia([f('  COOP.   PANACEA ')], 'Coop. Panacea')
    expect(r.propia).toHaveLength(1)
    expect(r.terceros).toEqual([])
  })

  it('NO saca a un tercero que se llame parecido', () => {
    // El error caro: si «Panacea Insumos» saliera del saldo, una deuda real
    // desapareceria de la pantalla y nadie la reclamaria.
    const r = separarProduccionPropia(
      [f('Coop. Panacea', 100), f('Panacea Insumos', 900), f('Panacea', 50)], 'Coop. Panacea')
    expect(r.propia.map(x => x.proveedor)).toEqual(['Coop. Panacea'])
    expect(r.terceros.map(x => x.proveedor)).toEqual(['Panacea Insumos', 'Panacea'])
  })

  it('si el nombre declarado no existe en los datos, no rompe', () => {
    const r = separarProduccionPropia([f('Graciela')], 'Coop. Panacea')
    expect(r.propia).toEqual([])
    expect(r.terceros).toHaveLength(1)
  })

  it('sirve para cualquier fila que nombre un proveedor, no solo saldos', () => {
    // Se usa tipada en generico para poder pasarle tambien lotes.
    const lotes = [{ proveedor: 'Coop. Panacea', gramos_totales: 4722 },
                   { proveedor: 'Lisa Culti A', gramos_totales: 810 }]
    const r = separarProduccionPropia(lotes, 'Coop. Panacea')
    expect(r.propia[0].gramos_totales).toBe(4722)
    expect(r.terceros[0].gramos_totales).toBe(810)
  })
})

// El balance con produccion propia sin cosecha.
//
// El caso real: Panacea tiene 8.836 g ingresados y 8.567 dispensados, y 4.722 de
// esos ingresos son produccion propia mal marcada como compra. Marcarlos
// `propio` deja el stock en -4.453 g; `propio_sin_cosecha` lo deja como esta.
describe('balanceMateria con propio_sin_cosecha', () => {
  const disp = (gramos: number) => ({ id: 'd', fecha: '2026-08-01', gramos, unidad: 'g' })
  const lote = (gramos: number, origen: string) =>
    ({ codigo: 'L', gramos_totales: gramos, unidad: 'g', origen })

  it('suma al ingreso, igual que lo comprado', () => {
    const b = balanceMateria(0, [disp(8567)] as never,
      [lote(4114, 'comprado'), lote(4722, 'propio_sin_cosecha')] as never)
    expect(b.ingresado).toBe(8836)
    expect(b.stock).toBe(269)
    expect(b.inconsistente).toBe(false)
  })

  it('marcarlos `propio` es lo que rompe el balance', () => {
    // Este test documenta POR QUE hizo falta el cuarto origen. Si algun dia
    // alguien decide que `propio` alcanzaba, esto le muestra el numero.
    const b = balanceMateria(0, [disp(8567)] as never,
      [lote(4114, 'comprado'), lote(4722, 'propio')] as never)
    expect(b.ingresado).toBe(4114)
    expect(b.stock).toBe(-4453)
    expect(b.inconsistente).toBe(true)
  })
})

describe('loteEsComprado', () => {
  const lote = (o: Partial<LoteIngreso>) => ({ gramos_totales: 0, ...o }) as LoteIngreso

  // Con `origen` cargado manda `origen`. El fallback por `cosecha_id` es sólo
  // para las filas anteriores a la migración.
  it('lo propio sin cosecha registrada NO es comprado', () => {
    expect(loteEsComprado(lote({ origen: 'propio_sin_cosecha' }))).toBe(false)
  })

  it('sigue diciendo que sí de lo comprado y que no de lo propio', () => {
    expect(loteEsComprado(lote({ origen: 'comprado' }))).toBe(true)
    expect(loteEsComprado(lote({ origen: 'propio', cosecha_id: 'c1' }))).toBe(false)
  })

  it('sin origen decide la cosecha, como antes', () => {
    expect(loteEsComprado(lote({ cosecha_id: 'c1' }))).toBe(false)
    expect(loteEsComprado(lote({}))).toBe(true)
  })

  // El balance de materia cuelga de `loteSumaAlIngreso`, no de `loteEsComprado`.
  // Es lo que hace que arreglar la segunda no mueva el stock de nadie.
  it('lo propio sin cosecha sigue sumando al ingreso', () => {
    expect(loteSumaAlIngreso(lote({ origen: 'propio_sin_cosecha' }))).toBe(true)
    expect(loteSumaAlIngreso(lote({ origen: 'propio', cosecha_id: 'c1' }))).toBe(false)
  })
})
