// El aviso del paso 1 del Panel: tiene que distinguir «falta la de este turno»
// de «no se carga nada hace dias». El 16/09/2026 la ultima lectura era del 11/09
// y el Panel decia «falta la lectura de la tarde», que suena a un olvido del
// turno y tapa un hueco de cinco dias.

import { describe, it, expect } from 'vitest'
import { diasSinLectura, tituloFaltaLectura, type Lectura } from '../ambiente'

// Fechas armadas en hora LOCAL, asi el test da igual en cualquier huso.
const lectura = (d: Date) => ({ medido_en: d.toISOString() }) as Lectura

describe('diasSinLectura', () => {
  it('una lectura de hoy da 0', () => {
    expect(diasSinLectura(lectura(new Date(2026, 8, 16, 9, 0)), new Date(2026, 8, 16, 22, 0))).toBe(0)
  })

  it('cuenta dias de calendario, no horas: anoche a las 23 y hoy a las 8 es 1', () => {
    expect(diasSinLectura(lectura(new Date(2026, 8, 15, 23, 0)), new Date(2026, 8, 16, 8, 0))).toBe(1)
  })

  it('el caso real: ultima el 11/09, hoy 16/09', () => {
    expect(diasSinLectura(lectura(new Date(2026, 8, 11, 11, 29)), new Date(2026, 8, 16, 22, 35))).toBe(5)
  })

  it('sin lecturas devuelve null', () => {
    expect(diasSinLectura(null)).toBeNull()
  })
})

describe('tituloFaltaLectura', () => {
  it('mismo dia: habla del turno', () => {
    expect(tituloFaltaLectura(0, 'tarde')).toContain('falta la lectura de la tarde')
  })
  it('ayer', () => {
    expect(tituloFaltaLectura(1, 'mañana')).toContain('sin lecturas desde ayer')
  })
  it('varios dias: dice cuantos, no el turno', () => {
    const t = tituloFaltaLectura(5, 'tarde')
    expect(t).toContain('hace 5 días')
    expect(t).not.toContain('tarde')
  })
  it('nunca se cargo ninguna', () => {
    expect(tituloFaltaLectura(null, 'tarde')).toContain('todavía no se cargó ninguna')
  })
})
