// El padrón contra el tope de la 1780, y a quién conviene desvincular.
//
// El 23/08/2026 el padrón estaba en 198 vinculados contra un tope de 150, y de
// esos 198 había 89 que NUNCA habían retirado nada. La salida no es borrar
// fichas —una entrega que apunta a una ficha borrada es el agujero que marca un
// control— sino desvincular a quien no viene, que deja la ficha y el historial
// enteros y se deshace con un flag.
//
// Lo que se prueba acá es el criterio, que es la parte que tiene que ser
// defendible ante un control: se sugiere al que nunca retiró, y NUNCA al que
// acaba de entrar, al que tiene REPROCANN vigente, o al que vino hace poco.

import { describe, it, expect } from 'vitest'
import { estadoDelPadron } from '../ong'
import type { Paciente } from '../registro'
import type { Dispensa } from '../ong'

const HOY = new Date('2026-08-23')

/** Un paciente vinculado con lo mínimo, para que cada test diga sólo lo suyo. */
function pac(id: string, extra: Partial<Paciente> = {}): Paciente {
  return {
    id,
    nombre_completo: `Paciente ${id}`,
    dni: null, fecha_nacimiento: null, telefono: null, email: null,
    localidad: null, provincia: null, domicilio: null, foto_url: null,
    reprocann_nro: null, reprocann_estado: null as never,
    reprocann_emision: null, reprocann_vencimiento: null,
    modalidad: null, credencial_url: null,
    patologia: null, medico_tratante: null, matricula_medico: null,
    plantas_habilitadas: null, m2_habilitados: null, tope_mensual_g: null,
    socio: true,
    // Alta vieja por defecto: los recién llegados son la excepción y cada test
    // que la necesite la pide.
    fecha_alta: '2024-01-01',
    activo: true, notas: null, creado_en: '2024-01-01T00:00:00Z',
    ...extra,
  }
}

function entrega(pacienteId: string, fecha: string): Dispensa {
  return { id: `d-${pacienteId}-${fecha}`, paciente_id: pacienteId, fecha, gramos: 10 }
}

describe('estadoDelPadron', () => {
  it('cuenta sólo a los vinculados, no a las fichas', () => {
    const r = estadoDelPadron(
      [pac('a'), pac('b'), pac('c', { activo: false })], [], 150, HOY)
    expect(r.vinculados).toBe(2)
  })

  it('dice cuántas altas entran antes de tocar el tope', () => {
    const r = estadoDelPadron([pac('a'), pac('b')], [], 5, HOY)
    expect(r.margen).toBe(3)
    expect(r.excedente).toBe(0)
  })

  it('dice cuántos sobran cuando el padrón ya pasó el tope', () => {
    const r = estadoDelPadron([pac('a'), pac('b'), pac('c')], [], 2, HOY)
    expect(r.excedente).toBe(1)
    expect(r.margen).toBe(0)
  })

  it('sugiere al que nunca retiró', () => {
    const r = estadoDelPadron(
      [pac('viene'), pac('nunca')], [entrega('viene', '2026-08-01')], 1, HOY)
    expect(r.candidatos.map(c => c.id)).toEqual(['nunca'])
  })

  it('NO sugiere al que se dio de alta hace poco, aunque no haya retirado nunca', () => {
    // Todavía no llegó a venir: sacarlo es echar al que recién se sumó.
    const reciente = pac('nuevo', { fecha_alta: '2026-07-15' })
    const r = estadoDelPadron([reciente], [], 0, HOY)
    expect(r.candidatos).toHaveLength(0)
  })

  it('NO sugiere al que tiene REPROCANN vigente', () => {
    const conPermiso = pac('amparado', { reprocann_vencimiento: '2027-01-01' })
    const r = estadoDelPadron([conPermiso], [], 0, HOY)
    expect(r.candidatos).toHaveLength(0)
  })

  it('NO sugiere al que retiró hace poco', () => {
    const r = estadoDelPadron(
      [pac('activo')], [entrega('activo', '2026-07-20')], 0, HOY)
    expect(r.candidatos).toHaveLength(0)
  })

  it('sugiere al que retiró hace mucho, después del que no retiró nunca', () => {
    const r = estadoDelPadron(
      [pac('viejo'), pac('nunca')], [entrega('viejo', '2025-01-10')], 0, HOY)
    expect(r.candidatos.map(c => c.id)).toEqual(['nunca', 'viejo'])
  })

  it('ordena a los que nunca retiraron por antigüedad del alta, primero el más viejo', () => {
    const r = estadoDelPadron(
      [pac('nuevo', { fecha_alta: '2025-06-01' }),
       pac('viejo', { fecha_alta: '2024-02-01' })], [], 0, HOY)
    expect(r.candidatos.map(c => c.id)).toEqual(['viejo', 'nuevo'])
  })

  it('cada candidato explica por qué se lo sugiere', () => {
    const r = estadoDelPadron([pac('nunca')], [], 0, HOY)
    expect(r.candidatos[0].motivo).toMatch(/nunca/i)
    expect(r.candidatos[0].entregas).toBe(0)
  })

  it('no sugiere a nadie cuando el padrón entra holgado en el tope', () => {
    // El que nunca vino sigue estando: mientras haya lugar, no hay nada que
    // resolver y la app no tiene por qué proponer sacar a nadie.
    const r = estadoDelPadron([pac('nunca')], [], 150, HOY)
    expect(r.candidatos).toHaveLength(0)
  })
})
