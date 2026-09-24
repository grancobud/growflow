import { describe, it, expect } from 'vitest'
import { deudaPorSocio } from '../ong'
import type { Dispensa } from '../ong'

const d = (p: Partial<Dispensa>): Dispensa => ({
  id: crypto.randomUUID(), fecha: '2026-08-01', gramos: 0, ...p,
} as Dispensa)

/**
 * El caso testigo es real: PAC-049 retiró 350 g en seis veces sin pagar y el
 * 07/09 pagó $750.000 sin llevarse nada. Ese ciclo estaba en los datos y el
 * sistema lo leía como dos errores distintos.
 */
describe('deudaPorSocio', () => {
  it('el saldo es NULL, no cero, cuando nadie declaró lo acordado', () => {
    // Es la distinción que sostiene toda la pantalla: un cero se leería como
    // «no debe nada», que es la conclusión opuesta a la verdadera. Debe, y
    // todavía no sabemos cuánto.
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 350, paciente_id: 'vilas' }),
    ])
    expect(v.saldo).toBeNull()
    expect(v.gramos).toBe(350)
    expect(v.gramosSinDeclarar).toBe(350)
  })

  it('con lo acordado declarado, el saldo es la resta', () => {
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 15, aporte_esperado: 200000, paciente_id: 'vilas' }),
      d({ tipo_movimiento: 'cobro_de_deuda', gramos: 0, aporte: 50000, paciente_id: 'vilas' }),
    ])
    expect(v.esperado).toBe(200000)
    expect(v.pagado).toBe(50000)
    expect(v.saldo).toBe(150000)
    expect(v.gramosSinDeclarar).toBe(0)
  })

  it('lo que ya pagó en el momento se descuenta de lo acordado', () => {
    // Pagó la mitad al llevárselo: debe la otra mitad, no el total.
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 10, aporte_esperado: 150000, aporte: 60000, paciente_id: 'x' }),
    ])
    expect(v.saldo).toBe(90000)
  })

  it('mezcla declarado y sin declarar sin ensuciar ninguno de los dos', () => {
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 5, aporte_esperado: 75000, paciente_id: 'x' }),
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 20, paciente_id: 'x' }),
    ])
    expect(v.gramos).toBe(25)
    expect(v.gramosSinDeclarar).toBe(20)
    expect(v.saldo).toBe(75000)   // los 20 g sin declarar NO suman pesos
  })

  it('haber pagado de más no deja saldo negativo por entrega', () => {
    // Un aporte mayor a lo acordado en UNA entrega es un pago adelantado de
    // otra cosa, no un credito que borre lo que debe.
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 5, aporte_esperado: 50000, aporte: 80000, paciente_id: 'x' }),
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 5, aporte_esperado: 50000, paciente_id: 'x' }),
    ])
    expect(v.esperado).toBe(50000)
  })

  it('suma los retiros a cuenta y recuerda el último', () => {
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 100, paciente_id: 'vilas', fecha: '2026-08-01' }),
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 250, paciente_id: 'vilas', fecha: '2026-09-02' }),
    ])
    expect(v.retiros).toBe(2)
    expect(v.gramos).toBe(350)
    expect(v.ultimo).toBe('2026-09-02')
  })

  it('cuenta aparte lo que ya pagó a cuenta', () => {
    const [v] = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 350, paciente_id: 'vilas' }),
      d({ tipo_movimiento: 'cobro_de_deuda', gramos: 0, aporte: 750000, paciente_id: 'vilas' }),
    ])
    expect(v.gramos).toBe(350)
    expect(v.pagado).toBe(750000)
  })

  it('la retribución en especie NO es deuda', () => {
    // 566 g de los 1.534 sin cobrar son de Hugo y Cristian. Si entraran acá,
    // el sistema les reclamaría plata a las dos personas que abren la sede.
    expect(deudaPorSocio([
      d({ tipo_movimiento: 'retribucion_en_especie', gramos: 306.5, paciente_id: 'hugo' }),
    ])).toEqual([])
  })

  it('una entrega pagada tampoco deja deuda', () => {
    expect(deudaPorSocio([
      d({ tipo_movimiento: 'entrega', gramos: 10, aporte: 150000, paciente_id: 'x' }),
    ])).toEqual([])
  })

  it('el consumo interno y la merma no tienen a quién cobrarle', () => {
    expect(deudaPorSocio([
      d({ tipo_movimiento: 'consumo_interno', gramos: 60 }),
      d({ tipo_movimiento: 'merma', gramos: 6 }),
    ])).toEqual([])
  })

  it('quien sólo pagó y nunca retiró a cuenta no aparece como deudor', () => {
    expect(deudaPorSocio([
      d({ tipo_movimiento: 'cobro_de_deuda', gramos: 0, aporte: 180000, paciente_id: 'y' }),
    ])).toEqual([])
  })

  it('ordena por gramos, de mayor a menor', () => {
    const r = deudaPorSocio([
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 5, paciente_id: 'chico' }),
      d({ tipo_movimiento: 'entrega_a_cuenta', gramos: 350, paciente_id: 'vilas' }),
    ])
    expect(r.map(v => v.paciente_id)).toEqual(['vilas', 'chico'])
  })

  it('un movimiento sin clasificar no cuenta como deuda', () => {
    // 55 filas quedaron en null a propósito. Contarlas acá inventaría deuda a
    // partir de lo que justamente no se sabe.
    expect(deudaPorSocio([
      d({ tipo_movimiento: null, gramos: 20, paciente_id: 'z' }),
    ])).toEqual([])
  })
})
