import { describe, it, expect } from 'vitest'
import { arranquesQueFaltan, PAGINA } from '../ong'

// EL PAGINADO DE `traerTodo`, QUE PASÓ A PEDIR LAS PÁGINAS EN PARALELO.
//
// Antes era un `for` que pedía, esperaba, y recién ahí pedía la siguiente: sin
// saber el total, la única señal de que terminó es que una página venga corta.
// Eso costaba un viaje entero por cada página en las tres tablas grandes —caja
// 1.746, documentos 1.554, dispensas 1.253—, y dispensas promedia 970 ms.
//
// Ahora la primera página trae el total y el resto se pide de una. LO QUE ESTOS
// TESTS FIJAN es la aritmética de bordes, que es donde esto se rompe: una
// página de más pide datos que no existen, y una de menos PIERDE FILAS EN
// SILENCIO — que es peor, porque la pantalla muestra un número más chico y
// nada falla.

describe('arranquesQueFaltan', () => {
  it('con menos de una página no falta ninguna', () => {
    expect(arranquesQueFaltan(0)).toEqual([])
    expect(arranquesQueFaltan(1)).toEqual([])
    expect(arranquesQueFaltan(999)).toEqual([])
  })

  it('con EXACTAMENTE una página tampoco: la primera ya las trajo todas', () => {
    // El recorrido viejo pedía una página más para descubrir que estaba vacía.
    expect(arranquesQueFaltan(1000)).toEqual([])
  })

  it('1.001 filas piden una segunda página', () => {
    expect(arranquesQueFaltan(1001)).toEqual([1000])
  })

  it('las tres tablas grandes de Panacea piden una sola más', () => {
    expect(arranquesQueFaltan(1746)).toEqual([1000])  // ong_caja
    expect(arranquesQueFaltan(1554)).toEqual([1000])  // ong_documentos
    expect(arranquesQueFaltan(1253)).toEqual([1000])  // ong_dispensas
  })

  it('con dos páginas justas siguen siendo una más, no dos', () => {
    expect(arranquesQueFaltan(2000)).toEqual([1000])
  })

  it('y con una fila más de dos páginas, dos', () => {
    expect(arranquesQueFaltan(2001)).toEqual([1000, 2000])
  })

  it('los arranques no se pisan ni dejan huecos', () => {
    // Cada arranque tiene que caer justo donde termina el anterior: un hueco
    // pierde filas y un solapamiento las duplica.
    const total = 4321
    const arranques = [0, ...arranquesQueFaltan(total)]
    for (let i = 1; i < arranques.length; i++) {
      expect(arranques[i] - arranques[i - 1]).toBe(PAGINA)
    }
    // Y la última página tiene que alcanzar a cubrir el total.
    expect(arranques[arranques.length - 1] + PAGINA).toBeGreaterThanOrEqual(total)
  })

  it('cubren el total para cualquier tamaño, sin pedir de más', () => {
    for (const total of [1, 999, 1000, 1001, 1999, 2000, 2001, 5000, 5001]) {
      const arranques = [0, ...arranquesQueFaltan(total)]
      const cubierto = arranques.length * PAGINA
      expect(cubierto).toBeGreaterThanOrEqual(total)
      // Ni una página entera de más: eso sería un viaje al pedo.
      expect(cubierto - PAGINA).toBeLessThan(total)
    }
  })
})
