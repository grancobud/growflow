import { describe, it, expect } from 'vitest'
import { tieneImporte, DONDE_SE_ARREGLA } from '../ong'

// Plata escrita en la nota de un paciente.
//
// `notas` la ve TODO el que ve el padrón, incluido el director médico, que
// tiene la caja, los comprobantes y el aporte de las entregas cerrados. Un
// importe escrito ahí se saltea ese límite sin que nadie se entere: una
// restricción que se puede rodear por el costado no es una restricción.
//
// El caso real fueron dos fichas con el historial económico completo de los dos
// socios de mayor volumen —«$5.844.880 aportados», «$6.160.320 que la
// asociación absorbió»—, escritas ahí porque no había otro lugar donde
// ponerlas. Hoy lo hay: `aporte_acordado_g` y `notas_economicas`.
describe('tieneImporte', () => {
  it('encuentra la plata escrita en una nota', () => {
    expect(tieneImporte('Aporta $3.971 por gramo')).toBe(true)
    expect(tieneImporte('$5.844.880 aportados entre 2025 y 2026')).toBe(true)
    expect(tieneImporte('cuesta $ 8156 el gramo')).toBe(true)
  })

  // El precio de no tener falsos positivos. Un cruce que grita siempre es un
  // cruce que se aprende a ignorar, así que se pide el signo pegado al número.
  it('no marca fechas, gramos ni cantidades', () => {
    expect(tieneImporte('DESVINCULADO el 2026-08-24: sin número de REPROCANN')).toBe(false)
    expect(tieneImporte('69 entregas, 1.472 g entre 02/09/2025 y 08/07/2026')).toBe(false)
    expect(tieneImporte('FICHA DUPLICADA, desactivada el 24/08/2026')).toBe(false)
    expect(tieneImporte('V')).toBe(false)
  })

  // Deja pasar el importe escrito en letras. Es una limitación conocida y
  // elegida: perseguirla traería más ruido que hallazgos.
  it('no persigue los importes en letras', () => {
    expect(tieneImporte('aporta tres millones por mes')).toBe(false)
  })

  it('aguanta el texto vacío y el nulo', () => {
    expect(tieneImporte(null)).toBe(false)
    expect(tieneImporte(undefined)).toBe(false)
    expect(tieneImporte('')).toBe(false)
  })

  // La nota neutra que quedó en las dos fichas después de mover el análisis.
  // Dice que el acuerdo existe, sin decir de cuánto: quien no ve plata tiene
  // que poder saber que hay un acuerdo.
  it('la nota que reemplazó al análisis no vuelve a marcar', () => {
    expect(tieneImporte(
      'ACUERDO DE APORTE ESPECIAL registrado el 24/08/2026 (nivel_tarifa = acuerdo). ' +
      'El detalle economico esta en el legajo economico.')).toBe(false)
  })
})

// Un cruce sin ruta es un cruce que dice que algo está mal y no dice dónde.
describe('nota_con_importe', () => {
  it('sabe a qué pantalla mandar', () => {
    expect(DONDE_SE_ARREGLA.nota_con_importe).toBeDefined()
    expect(DONDE_SE_ARREGLA.nota_con_importe.ruta).toBe('/ong/pacientes')
  })
})
