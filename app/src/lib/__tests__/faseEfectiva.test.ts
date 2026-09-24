// La fase derivada de las automaticas. Ver el bloque grande en lib/cultivo.ts.
//
// Los numeros salen de la base de Panacea al 31/08/2026: 60 plantas Avocado
// Punch Auto, tipo `Automatica`, germinadas el 01/08/2026, TODAS marcadas en
// Vegetativo. Con el sistema contando solo la fase guardada, el cupo de la
// Res. 1780 declaraba CERO en floracion el dia 30 de un ciclo de 8 a 10 semanas.

import { describe, it, expect } from 'vitest'
import {
  faseEfectiva, faseFueDerivada, conFaseEfectiva, diaDeFloraDe, DIA_FLORA_AUTOMATICA,
  type DatosDeFase,
} from '../cultivo'

const auto = (dias: number | null, fase: DatosDeFase['fase'] = 'Vegetativo'): DatosDeFase =>
  ({ tipo: 'Automatica', fase, dias_de_vida: dias })

describe('faseEfectiva', () => {
  it('el caso real: 60 automaticas de dia 30 en Vegetativo cuentan en floracion', () => {
    expect(faseEfectiva(auto(30))).toBe('Floracion')
  })

  it('el dia del umbral ya cuenta, el anterior no', () => {
    expect(faseEfectiva(auto(DIA_FLORA_AUTOMATICA))).toBe('Floracion')
    expect(faseEfectiva(auto(DIA_FLORA_AUTOMATICA - 1))).toBe('Vegetativo')
  })

  it('el default son las 4 semanas que fijo la asociacion', () => {
    expect(DIA_FLORA_AUTOMATICA).toBe(28)
  })

  // Un "super auto" hace seis semanas o mas de vege. El default no se toca para
  // acomodarlo: se le carga el vege a ESA variedad.
  it('el vege de la genetica manda sobre el default', () => {
    const superAuto = { ...auto(30), tiempo_vege_dias: 42 }
    expect(faseEfectiva(superAuto)).toBe('Vegetativo')
    expect(faseEfectiva({ ...superAuto, dias_de_vida: 42 })).toBe('Floracion')
  })

  it('un vege en cero o negativo no anula el default', () => {
    expect(faseEfectiva({ ...auto(30), tiempo_vege_dias: 0 })).toBe('Floracion')
    expect(diaDeFloraDe({ ...auto(30), tiempo_vege_dias: 0 })).toBe(DIA_FLORA_AUTOMATICA)
  })

  it('deriva desde cualquier fase anterior a la floracion', () => {
    expect(faseEfectiva(auto(40, 'Germinacion'))).toBe('Floracion')
    expect(faseEfectiva(auto(40, 'Plantula'))).toBe('Floracion')
  })

  // Lo que sigue es lo que hace que la derivacion sea segura: nunca contradice
  // algo que una persona marco sobre un hecho que ya paso.
  it('NO pisa lo que ya se cosecho, seco, curo o murio', () => {
    for (const f of ['Secado', 'Curado', 'Cosechada', 'Muerta'] as const) {
      expect(faseEfectiva(auto(200, f))).toBe(f)
    }
  })

  it('no toca las que no son automaticas', () => {
    expect(faseEfectiva({ tipo: 'Feminizada', fase: 'Vegetativo', dias_de_vida: 200 })).toBe('Vegetativo')
    expect(faseEfectiva({ tipo: 'Regular', fase: 'Vegetativo', dias_de_vida: 200 })).toBe('Vegetativo')
  })

  // Un dato que falta no habilita a inventar el que sigue: sin genetica cargada
  // no se sabe si es automatica, y sin fecha de germinacion no hay edad.
  it('sin tipo o sin edad no deriva nada', () => {
    expect(faseEfectiva({ tipo: null, fase: 'Vegetativo', dias_de_vida: 200 })).toBe('Vegetativo')
    expect(faseEfectiva({ tipo: 'Desconocido', fase: 'Vegetativo', dias_de_vida: 200 })).toBe('Vegetativo')
    expect(faseEfectiva(auto(null))).toBe('Vegetativo')
  })
})

describe('conFaseEfectiva', () => {
  it('deja ver lo guardado cuando derivo, y se puede preguntar', () => {
    const p = conFaseEfectiva({ tipo: 'Automatica', fase: 'Vegetativo', dias_de_vida: 30 })
    expect(p.fase).toBe('Floracion')
    expect(p.fase_guardada).toBe('Vegetativo')
    expect(faseFueDerivada(p)).toBe(true)
  })

  it('cuando no deriva devuelve la MISMA fila, sin marca de derivada', () => {
    const orig = { tipo: 'Feminizada' as const, fase: 'Vegetativo' as const, dias_de_vida: 200 }
    const p = conFaseEfectiva(orig)
    expect(p).toBe(orig)
    expect(faseFueDerivada(p)).toBe(false)
  })
})
