// Las fechas se arman con componentes LOCALES (`new Date(2026, 8, 8, 22, 30)`)
// para que los tests den lo mismo en cualquier huso: lo que se prueba es que se
// lea con el mismo reloj con que se armó.

import { describe, it, expect } from 'vitest'
import { fechaLocal, hoyLocal } from '../fechaLocal'

describe('fechaLocal', () => {
  it('a las 22 h sigue siendo el mismo dia', () => {
    // El caso real del 08/09/2026: tres entregas cargadas a esta hora quedaron
    // con fecha 09/09, porque en UTC ya era el dia siguiente.
    expect(fechaLocal(new Date(2026, 8, 8, 22, 30))).toBe('2026-09-08')
  })

  it('un minuto antes de medianoche tambien', () => {
    expect(fechaLocal(new Date(2026, 8, 8, 23, 59))).toBe('2026-09-08')
  })

  it('a medianoche ya es el dia siguiente', () => {
    expect(fechaLocal(new Date(2026, 8, 9, 0, 0))).toBe('2026-09-09')
  })

  it('completa con ceros mes y dia', () => {
    expect(fechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('lee igual lo que se armo con T00:00:00 y setDate', () => {
    // El patron de sumarDias, cupos y vencimientos: se arma en local y se tiene
    // que leer en local. Con toISOString daba bien en Argentina por casualidad.
    const d = new Date('2026-12-31T00:00:00')
    d.setDate(d.getDate() + 1)
    expect(fechaLocal(d)).toBe('2027-01-01')
  })

  it('hoyLocal es la fecha local de ahora', () => {
    const antes = fechaLocal(new Date())
    const hoy = hoyLocal()
    // Si justo cambia el dia entre las dos lineas, vale cualquiera de las dos.
    expect([antes, fechaLocal(new Date())]).toContain(hoy)
    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
