import { describe, it, expect } from 'vitest'
import { CONSENTIMIENTOS, VERSION_CONSENTIMIENTOS } from '../legajo'

// UN SOLO ACEPTAR, CUATRO DECLARACIONES GUARDADAS.
//
// Lo pidió Cristian (Panacea) el 31/08/2026: que las declaraciones se lean «de
// corrido y con un solo clic acepten los cuatro puntos». El formulario ahora
// tiene una casilla en vez de cuatro.
//
// Lo que este test protege es lo que NO se colapsó: por debajo se siguen
// guardando los cuatro `consent_*` por separado, más la versión. La aceptación
// es una; lo aceptado son cuatro declaraciones juradas distintas, y el día que
// haya que invocar la de uso personal —la de la Ley 23.737, que es la que
// protege a la asociación si alguien revende— tiene que poder mostrarse sola,
// con su texto y su fecha.
//
// Si alguien «simplifica» esto a un `acepto: true`, se pierde exactamente eso.
describe('los términos que se aceptan de una', () => {
  it('siguen siendo cuatro declaraciones con campo propio', () => {
    expect(CONSENTIMIENTOS).toHaveLength(4)
    expect(CONSENTIMIENTOS.map(c => c.campo).sort()).toEqual([
      'consent_jurisdiccion', 'consent_responsabilidad',
      'consent_uso_personal', 'consent_veracidad',
    ])
  })

  // Cada campo tiene que existir tal cual en `ong_solicitudes`, o el insert
  // falla en producción y en el demo pasa igual: el demo no tiene constraints.
  it('cada campo se llama como la columna', () => {
    for (const c of CONSENTIMIENTOS) expect(c.campo).toMatch(/^consent_[a-z_]+$/)
  })

  // La de la 23.737 es la que más importa y la que más tienta sacar por larga.
  it('la de uso personal nombra la ley y prohíbe la cesión', () => {
    const c = CONSENTIMIENTOS.find(x => x.campo === 'consent_uso_personal')!
    expect(c.texto).toContain('23.737')
    expect(c.texto).toMatch(/cesión|ceder/i)
  })

  // El texto va VISIBLE en la pantalla, no detrás de un «ver términos». Lo que
  // sostiene el valor de una declaración jurada no es que la persona la haya
  // leído —nadie puede probarlo— sino que haya tenido la oportunidad real de
  // hacerlo. Por eso los textos tienen que ser cortos: un bloque de 6.000
  // caracteres no se lee ni scrolleado.
  it('los textos entran en un bloque que se puede recorrer', () => {
    const total = CONSENTIMIENTOS.reduce((n, c) => n + c.texto.length, 0)
    expect(total).toBeLessThan(2500)
    for (const c of CONSENTIMIENTOS) expect(c.titulo.length).toBeGreaterThan(5)
  })

  // Si el texto cambia y la versión no, dos textos distintos quedan guardados
  // con el mismo nombre y ya no se sabe qué aceptó cada persona.
  it('hay una versión, y tiene forma de versión', () => {
    expect(VERSION_CONSENTIMIENTOS).toMatch(/^\d{4}-\d{2}$/)
  })
})
