// El asiento de caja que nace con la entrega.
//
// Esto decide sobre PLATA, y la mitad de las reglas son sobre no hacer nada: no
// duplicar, no pisar el concepto de lo que vino de la planilla, no tocar un
// egreso, no dejar colgado un ingreso que ya nadie declara. Un test que sólo
// probara el caso feliz —«se crea el asiento»— dejaría pasar exactamente los
// errores caros.
//
// El pago partido tiene su propio bloque porque es de donde salió todo esto:
// 84 grupos de asientos en la caja de Panacea son el desglose por medio de una
// entrega que además quedó cargada como un total «Mixto», y esa plata está
// contada dos veces.

import { describe, it, expect } from 'vitest'
import {
  asientoDeEntrega, cobrosDeEntrega, resumirAcciones, CONCEPTO_REEMBOLSO,
  type Dispensa, type AsientoCaja, type AccionAsiento,
} from '../ong'

const entrega = (extra: Partial<Dispensa> = {}): Dispensa => ({
  id: 'D1', fecha: '2026-08-30', gramos: 30, aporte: 15000,
  ...extra,
} as Dispensa)

const asiento = (extra: Partial<AsientoCaja> = {}): AsientoCaja => ({
  id: 'A1', fecha: '2026-08-30', tipo: 'ingreso',
  concepto: CONCEPTO_REEMBOLSO, detalle: '30 g', monto: 15000,
  medio: null, dispensa_id: 'D1',
  ...extra,
})

const creados = (as: AccionAsiento[]) => as.filter(a => a.hacer === 'crear')
const borrados = (as: AccionAsiento[]) => as.filter(a => a.hacer === 'borrar')

describe('cobrosDeEntrega', () => {
  it('sin desglose es una sola línea con el medio de la entrega', () => {
    expect(cobrosDeEntrega(entrega({ medio_pago: 'Efectivo' })))
      .toEqual([{ medio: 'Efectivo', monto: 15000 }])
  })

  it('con desglose es una línea por medio', () => {
    const c = cobrosDeEntrega(entrega({
      medio_pago: 'Mixto', aporte: 90000,
      aporte_desglose: { Efectivo: 75000, Transferencia: 15000 },
    }))
    expect(c).toEqual([
      { medio: 'Efectivo', monto: 75000 },
      { medio: 'Transferencia', monto: 15000 },
    ])
  })

  it('descarta los medios en cero: no son una línea del libro', () => {
    expect(cobrosDeEntrega(entrega({
      aporte: 75000, aporte_desglose: { Efectivo: 75000, Transferencia: 0 },
    }))).toEqual([{ medio: 'Efectivo', monto: 75000 }])
  })

  it('un desglose vacío cae al comportamiento de siempre', () => {
    expect(cobrosDeEntrega(entrega({ medio_pago: 'Efectivo', aporte_desglose: {} })))
      .toEqual([{ medio: 'Efectivo', monto: 15000 }])
  })

  it('sin aporte no hay nada que cobrar', () => {
    expect(cobrosDeEntrega(entrega({ aporte: 0 }))).toEqual([])
    expect(cobrosDeEntrega(entrega({ aporte: -5000 }))).toEqual([])
  })
})

describe('asientoDeEntrega', () => {
  it('crea el ingreso cuando la entrega tiene aporte y todavía no hay asiento', () => {
    const a = asientoDeEntrega(entrega(), [])
    expect(a).toHaveLength(1)
    if (a[0].hacer !== 'crear') throw new Error('debía crear')
    expect(a[0].asiento.monto).toBe(15000)
    expect(a[0].asiento.tipo).toBe('ingreso')
    expect(a[0].asiento.dispensa_id).toBe('D1')
  })

  it('mete el lote en el detalle, que es lo que ata el peso al material', () => {
    const a = asientoDeEntrega(entrega({ lote_codigo: 'AVO-2026-01' }), [])
    if (a[0].hacer !== 'crear') throw new Error('debía crear')
    expect(a[0].asiento.detalle).toBe('30 g · lote AVO-2026-01')
  })

  it('NO crea un segundo asiento: corrige el que ya está', () => {
    const a = asientoDeEntrega(entrega({ aporte: 20000 }), [asiento()])
    expect(a).toHaveLength(1)
    if (a[0].hacer !== 'actualizar') throw new Error('debía actualizar')
    expect(a[0].id).toBe('A1')
    expect(a[0].asiento.monto).toBe(20000)
  })

  it('conserva el concepto del asiento que vino de la planilla vieja', () => {
    const a = asientoDeEntrega(entrega({ aporte: 20000 }), [asiento({ concepto: 'Dispensa a PAC-053' })])
    if (a[0].hacer !== 'actualizar') throw new Error('debía actualizar')
    expect(a[0].asiento.concepto).toBe('Dispensa a PAC-053')
  })

  it('no escribe nada si el asiento ya dice exactamente lo mismo', () => {
    expect(asientoDeEntrega(entrega(), [asiento()])).toEqual([])
  })

  it('sigue el cambio de fecha y de medio de pago', () => {
    const a = asientoDeEntrega(
      entrega({ fecha: '2026-09-01', medio_pago: 'Transferencia' }), [asiento()])
    if (a[0].hacer !== 'actualizar') throw new Error('debía actualizar')
    expect(a[0].asiento.fecha).toBe('2026-09-01')
    expect(a[0].asiento.medio).toBe('Transferencia')
  })

  it('borra el ingreso si el aporte se vacía: sin entrega que lo declare, no hay ingreso', () => {
    expect(asientoDeEntrega(entrega({ aporte: null }), [asiento()]))
      .toEqual([{ hacer: 'borrar', id: 'A1', monto: 15000 }])
  })

  it('no hace nada cuando no hay aporte ni asiento', () => {
    expect(asientoDeEntrega(entrega({ aporte: 0 }), [])).toEqual([])
  })

  it('NUNCA toca un egreso: la devolución es un movimiento propio', () => {
    const devolucion = asiento({ id: 'A9', tipo: 'egreso', concepto: 'Devolución de aporte' })
    expect(asientoDeEntrega(entrega({ aporte: 0 }), [devolucion])).toEqual([])
    expect(creados(asientoDeEntrega(entrega(), [devolucion]))).toHaveLength(1)
  })

  it('ignora los asientos de OTRA entrega', () => {
    expect(creados(asientoDeEntrega(entrega(), [asiento({ id: 'A8', dispensa_id: 'D2' })])))
      .toHaveLength(1)
  })

  it('limpia el sobrante: dos ingresos donde ahora va uno solo', () => {
    // Es el caso de Panacea al revés: si una entrega quedó con dos asientos y
    // ahora declara un pago simple, el que sobra se va en vez de quedar contado.
    const a = asientoDeEntrega(entrega({ aporte: 15000, medio_pago: null }),
      [asiento(), asiento({ id: 'A2', monto: 5000, medio: 'Efectivo' })])
    expect(borrados(a)).toHaveLength(1)
    expect(a.find(x => x.hacer === 'borrar')).toMatchObject({ id: 'A2' })
  })
})

describe('asientoDeEntrega · pago partido', () => {
  const mixta = entrega({
    aporte: 90000, medio_pago: 'Mixto',
    aporte_desglose: { Efectivo: 75000, Transferencia: 15000 },
  })

  it('escribe UN asiento por medio, y no un total sin discriminar', () => {
    const a = asientoDeEntrega(mixta, [])
    expect(a).toHaveLength(2)
    const c = creados(a).map(x => x.hacer === 'crear' ? x.asiento : null)
    expect(c.map(x => x?.medio)).toEqual(['Efectivo', 'Transferencia'])
    expect(c.map(x => x?.monto)).toEqual([75000, 15000])
    // La suma es el aporte: la caja no puede quedar contando de más ni de menos.
    expect(c.reduce((t, x) => t + (x?.monto ?? 0), 0)).toBe(90000)
  })

  it('empareja POR MEDIO y no por posición', () => {
    // El desglose invertido no tiene que dar vuelta los importes.
    const previos = [
      asiento({ id: 'AE', medio: 'Efectivo', monto: 75000 }),
      asiento({ id: 'AT', medio: 'Transferencia', monto: 15000 }),
    ]
    const otroOrden = entrega({
      aporte: 90000, medio_pago: 'Mixto',
      aporte_desglose: { Transferencia: 15000, Efectivo: 75000 },
    })
    expect(asientoDeEntrega(otroOrden, previos)).toEqual([])
  })

  it('corrige sólo el medio que cambió', () => {
    const previos = [
      asiento({ id: 'AE', medio: 'Efectivo', monto: 75000 }),
      asiento({ id: 'AT', medio: 'Transferencia', monto: 15000 }),
    ]
    const subioElEfectivo = entrega({
      aporte: 95000, medio_pago: 'Mixto',
      aporte_desglose: { Efectivo: 80000, Transferencia: 15000 },
    })
    const a = asientoDeEntrega(subioElEfectivo, previos)
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ hacer: 'actualizar', id: 'AE' })
  })

  it('pasar de partido a un solo medio deja UNA fila y borra la que sobra', () => {
    const previos = [
      asiento({ id: 'AE', medio: 'Efectivo', monto: 75000 }),
      asiento({ id: 'AT', medio: 'Transferencia', monto: 15000 }),
    ]
    const a = asientoDeEntrega(
      entrega({ aporte: 90000, medio_pago: 'Efectivo', aporte_desglose: null }), previos)
    expect(borrados(a)).toHaveLength(1)
    expect(a.filter(x => x.hacer === 'crear')).toHaveLength(0)
  })

  it('pasar de un medio a partido no duplica: recicla el asiento que ya estaba', () => {
    // Es exactamente el error que hay en la base: el total «Mixto» quedó ADEMÁS
    // del desglose, y esa plata está contada dos veces.
    const a = asientoDeEntrega(mixta, [asiento({ id: 'AM', medio: 'Mixto', monto: 90000 })])
    expect(creados(a)).toHaveLength(1)
    expect(a.some(x => x.hacer === 'actualizar' && x.id === 'AM')).toBe(true)
    expect(borrados(a)).toHaveLength(0)
  })
})

describe('resumirAcciones', () => {
  it('dice cuánto entró cuando se crean asientos', () => {
    expect(resumirAcciones(asientoDeEntrega(entrega(), [])))
      .toEqual({ verbo: 'creo', monto: 15000 })
  })

  it('suma los dos medios de un pago partido', () => {
    const mixta = entrega({
      aporte: 90000, medio_pago: 'Mixto',
      aporte_desglose: { Efectivo: 75000, Transferencia: 15000 },
    })
    expect(resumirAcciones(asientoDeEntrega(mixta, []))).toEqual({ verbo: 'creo', monto: 90000 })
  })

  it('dice cuánto salió cuando se borra', () => {
    expect(resumirAcciones(asientoDeEntrega(entrega({ aporte: 0 }), [asiento()])))
      .toEqual({ verbo: 'borro', monto: 15000 })
  })

  it('sin cambios no dice nada', () => {
    expect(resumirAcciones([])).toEqual({ verbo: 'nada', monto: 0 })
  })
})
