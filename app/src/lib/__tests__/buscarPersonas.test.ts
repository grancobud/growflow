import { describe, it, expect } from 'vitest'
import {
  filtrarPersonas, ordenarPorApellido, nombreParaMostrar, nombresRepetidos, normalizar,
} from '../buscarPersonas'

/**
 * Los nombres son los del padrón real de Panacea al 09/09/2026, con los dos
 * criterios de carga mezclados: hay «Juan Pablo Duarte» (nombre primero) y hay
 * «Alvarez Walter Ariel» (apellido primero). Es justamente por esa mezcla que
 * el buscador compara palabra contra palabra en cualquier orden.
 */
const p = (nombre: string, extra: Record<string, unknown> = {}) => ({
  id: nombre, nombre_completo: nombre,
  apellido: nombre.split(' ').slice(-1)[0],
  nombres: nombre.split(' ').slice(0, -1).join(' ') || null,
  ...extra,
})

const PADRON = [
  p('Juan cruz Díaz Rokiteniec'),
  p('Juan Pablo Duarte'),
  p('Alvarez Walter Ariel'),
  p('Marcelo Benitez'),
  p('Ana Flor Peralta'),
  p('Martin Andrés Peralta'),
]

describe('filtrarPersonas', () => {
  it('encuentra escribiendo dos palabras sueltas del nombre', () => {
    // El pedido textual: «que yo ponga Juan cruz nomás y saque todos los Juan cruz».
    const r = filtrarPersonas(PADRON, 'juan cruz')
    expect(r.map(x => x.nombre_completo)).toEqual(['Juan cruz Díaz Rokiteniec'])
  })

  it('no importa el ORDEN en que se escriben las palabras', () => {
    // Quien busca no sabe si lo cargaron «Nombre Apellido» o al revés.
    expect(filtrarPersonas(PADRON, 'duarte juan')).toHaveLength(1)
    expect(filtrarPersonas(PADRON, 'juan duarte')).toHaveLength(1)
  })

  it('ignora acentos y mayúsculas', () => {
    expect(filtrarPersonas(PADRON, 'DIAZ')).toHaveLength(1)
    expect(filtrarPersonas(PADRON, 'andres')).toHaveLength(1)
  })

  it('cada palabra ACHICA la búsqueda, no la agranda', () => {
    // Con «alguna» en vez de «todas», seguir tecleando devolvería más, que es
    // lo contrario de lo que uno espera.
    expect(filtrarPersonas(PADRON, 'peralta')).toHaveLength(2)
    expect(filtrarPersonas(PADRON, 'peralta martin')).toHaveLength(1)
  })

  it('busca por PREFIJO de palabra, no por subcadena', () => {
    // «ana» no puede devolver a Juana ni a Santana: quien busca a Ana no
    // reconoce esa lista como respuesta a lo que preguntó.
    const conJuana = [...PADRON, p('Juana Robles')]
    expect(filtrarPersonas(conJuana, 'ana').map(x => x.nombre_completo)).toEqual(['Ana Flor Peralta'])
  })

  it('encuentra por código y por DNI, que es lo que a veces se tiene a mano', () => {
    const lista = [p('Marcelo Benitez', { codigo: 'PAC-024', dni: '30123456' })]
    expect(filtrarPersonas(lista, 'PAC-024')).toHaveLength(1)
    expect(filtrarPersonas(lista, '3012')).toHaveLength(1)
  })

  it('sin nada escrito devuelve todo', () => {
    expect(filtrarPersonas(PADRON, '')).toHaveLength(PADRON.length)
    expect(filtrarPersonas(PADRON, '   ')).toHaveLength(PADRON.length)
  })

  it('lo que no existe devuelve vacío y no rompe', () => {
    expect(filtrarPersonas(PADRON, 'zzzz')).toEqual([])
  })
})

describe('nombreParaMostrar', () => {
  it('el apellido va PRIMERO', () => {
    expect(nombreParaMostrar({ nombre_completo: 'Juan Pablo Duarte', apellido: 'Duarte', nombres: 'Juan Pablo' }))
      .toBe('Duarte, Juan Pablo')
  })

  it('sin apellido separado cae al nombre completo tal cual', () => {
    // Mostrar «, » con la mitad vacía sería peor que no reordenar.
    expect(nombreParaMostrar({ nombre_completo: 'Arielmartinez' })).toBe('Arielmartinez')
    expect(nombreParaMostrar({ nombre_completo: 'X', apellido: '  ' })).toBe('X')
  })

  it('con apellido y sin nombres no deja la coma colgada', () => {
    expect(nombreParaMostrar({ nombre_completo: 'Duarte', apellido: 'Duarte', nombres: null }))
      .toBe('Duarte')
  })
})

describe('ordenarPorApellido', () => {
  it('ordena por apellido, no por nombre', () => {
    const r = ordenarPorApellido(PADRON).map(x => nombreParaMostrar(x))
    expect(r[0]).toBe('Ariel, Alvarez Walter')
    expect(r[1]).toBe('Benitez, Marcelo')
    expect(r[2]).toBe('Duarte, Juan Pablo')
  })

  it('a igual apellido, ordena por el nombre', () => {
    const r = ordenarPorApellido([p('Martin Andrés Peralta'), p('Ana Flor Peralta')])
      .map(x => nombreParaMostrar(x))
    expect(r).toEqual(['Peralta, Ana Flor', 'Peralta, Martin Andrés'])
  })

  it('no muta la lista que recibe', () => {
    const original = [...PADRON]
    ordenarPorApellido(PADRON)
    expect(PADRON).toEqual(original)
  })
})

describe('nombresRepetidos', () => {
  it('detecta a dos personas con el mismo nombre', () => {
    // Pasó de verdad: hubo tres «Rocio Gimenez» activas al mismo tiempo. Sin
    // esto la lista ofrece dos renglones idénticos y elegir es adivinar.
    const r = nombresRepetidos([p('Rocio Gimenez'), p('Rocio Gimenez'), p('Marcelo Benitez')])
    expect(r.has(normalizar('Rocio Gimenez'))).toBe(true)
    expect(r.has(normalizar('Marcelo Benitez'))).toBe(false)
  })

  it('las diferencias de acento y mayúscula NO son dos personas distintas', () => {
    expect(nombresRepetidos([p('Rocío Gimenez'), p('rocio gimenez')]).size).toBe(1)
  })
})
