// Cómo viene la tarea entera, no sólo el paso en el que estás.
//
// Gastón pidió que al cerrar el formulario se vea «el paso siguiente y un
// resumen», en vez de caer en la lista de la pantalla. El paso siguiente ya
// estaba —la barra lo tiene como botón—; el resumen no: la barra mostraba la
// nota del paso ACTUAL y nada del resto, así que para saber si algo quedó
// colgado había que recorrer los pasos de a uno.

import { describe, it, expect } from 'vitest'
import { resumenDeFlujo, flujoDe } from '../flujosOng'
import type { DatosFlujo } from '../flujosOng'

/** Los datos que miran los pasos que se pueden verificar, todos en cero. */
const VACIO: DatosFlujo = {
  pacientesActivos: [], asociadosSinActa: 0, traslados: [], dispensas: [],
  documentos: [], cuotasEmitidas: [], periodo: '2026-08', mes: '2026-08',
  erroresDeCoherencia: 0, faltanteDeMateria: 0, hayEntidadConCuit: false,
  autoridades: 0, predios: 0, librosRubricados: 0, ddjj: [], semestre: '2026-S2',
}

describe('resumenDeFlujo', () => {
  it('devuelve una línea por cada paso del flujo', () => {
    const flujo = flujoDe('sumar')!
    const r = resumenDeFlujo(flujo, VACIO, 1)
    expect(r).toHaveLength(flujo.pasos.length)
    expect(r.map(l => l.titulo)).toEqual(flujo.pasos.map(p => p.titulo))
  })

  it('marca hecho lo que quedó atrás', () => {
    const flujo = flujoDe('sumar')!
    const r = resumenDeFlujo(flujo, VACIO, 3)
    expect(r[0].hecho).toBe(true)
    expect(r[1].hecho).toBe(true)
  })

  it('no marca hecho el paso en el que estás parado', () => {
    const flujo = flujoDe('sumar')!
    const r = resumenDeFlujo(flujo, VACIO, 1)
    expect(r[0].hecho).toBe(false)
  })

  it('señala en cuál estás parado', () => {
    const flujo = flujoDe('sumar')!
    const r = resumenDeFlujo(flujo, VACIO, 2)
    expect(r.map(l => l.aca)).toEqual([false, true, false])
  })

  it('marca hecho lo que el sistema puede verificar, aunque no hayas llegado', () => {
    // Si todos los pacientes tienen su tope, el paso 2 está hecho aunque estés
    // parado en el 1: pedirle a alguien que vaya a hacer algo que ya está hecho
    // es la forma más rápida de que deje de creerle a la guía.
    const flujo = flujoDe('sumar')!
    const datos: DatosFlujo = { ...VACIO, pacientesActivos: [{ tope_mensual_g: 5 }] }
    const r = resumenDeFlujo(flujo, datos, 1)
    expect(r[1].hecho).toBe(true)
  })

  it('NO da por hecho un paso que quedó atrás si el sistema ve que falta', () => {
    // El bug que se vio en producción el 23/08/2026: estando parado en el paso
    // 3, el paso 2 salía TILDADO EN VERDE y justo debajo, en naranja, decía
    // «1121 entregas sin recibo emitido». Las dos cosas no pueden ser.
    //
    // Haber pasado por un paso no es haberlo hecho: se puede avanzar con «después
    // lo hago», que es un botón que existe a propósito. Cuando el sistema PUEDE
    // mirar, lo que manda es lo que ve, no por dónde anduviste.
    const flujo = flujoDe('sumar')!
    const datos: DatosFlujo = {
      ...VACIO,
      pacientesActivos: [{ tope_mensual_g: null }],
    }
    const r = resumenDeFlujo(flujo, datos, 3)
    expect(r[1].hecho).toBe(false)
    expect(r[1].nota).toMatch(/sin tope/)
  })

  it('trae la nota del paso, que es lo que dice cuánto falta', () => {
    const flujo = flujoDe('sumar')!
    const datos: DatosFlujo = {
      ...VACIO,
      pacientesActivos: [{ tope_mensual_g: null }, { tope_mensual_g: null }],
    }
    const r = resumenDeFlujo(flujo, datos, 1)
    expect(r[1].nota).toMatch(/2 pacientes sin tope/)
    expect(r[1].hecho).toBe(false)
  })

  it('el recibo se cuenta sólo sobre lo que lleva recibo', () => {
    // El recibo es por reembolso de costos: donde no hubo aporte no documenta
    // nada, y el consumo interno y la merma ni siquiera tienen a quién
    // emitírselo. Contándolos, el paso pedía recibos que no existen y no se
    // tildaba nunca, ni con los 846 reales ya emitidos.
    const flujo = flujoDe('entregar')!
    const datos: DatosFlujo = {
      ...VACIO,
      dispensas: [
        { gramos: 10, aporte: 5000, modalidad: 'Paciente', recibo_numero: 1 },
        { gramos: 10, aporte: 0, modalidad: 'Paciente', recibo_numero: null },
        { gramos: 10, aporte: 0, modalidad: 'Consumo interno', recibo_numero: null },
        { gramos: 10, aporte: 0, modalidad: 'Merma', recibo_numero: null },
      ],
    }
    const r = resumenDeFlujo(flujo, datos, 1)
    expect(r[1].hecho).toBe(true)
    expect(r[1].nota).toMatch(/todas las entregas tienen su recibo/)
  })

  it('cuenta el recibo que falta de verdad', () => {
    const flujo = flujoDe('entregar')!
    const datos: DatosFlujo = {
      ...VACIO,
      dispensas: [
        { gramos: 10, aporte: 5000, modalidad: 'Paciente', recibo_numero: null },
        { gramos: 10, aporte: 8000, modalidad: 'Paciente', recibo_numero: 7 },
      ],
    }
    const r = resumenDeFlujo(flujo, datos, 1)
    expect(r[1].hecho).toBe(false)
    expect(r[1].nota).toMatch(/1 entrega sin recibo emitido/)
  })

  it('deja la nota en null donde el sistema no puede saber', () => {
    // «Cuál comprobante corresponde a cuál compra» no se puede verificar, y la
    // barra NO inventa un tilde: prefiere no decir nada.
    const flujo = flujoDe('entregar')!
    const r = resumenDeFlujo(flujo, VACIO, 1)
    expect(r[0].nota).toBeNull()
  })
})
