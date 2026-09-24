import { describe, it, expect } from 'vitest'

// `/plantas` EMPIEZA CON `/plan`, y eso rompio la navegacion del modulo
// agronomico el 02/09/2026: al sumar la seccion del plan de cultivo, entrar a
// Plantas mostraba el Plan con la URL diciendo `/plantas`. Una pantalla que no
// es la que pediste y una URL que jura que si.
//
// No es un caso raro: pasa cada vez que una ruta nueva es prefijo de una vieja,
// y con `startsWith` a secas el orden del arreglo decide cual gana. Este test
// fija la regla —comparar por SEGMENTO— para que no vuelva a depender del azar.

/** La misma comparacion que hace `PestanasSeccion`. */
const esLaSeccion = (pathname: string, ruta: string) =>
  pathname === ruta || pathname.startsWith(ruta + '/')

const SECCIONES = ['/sala', '/plan', '/plantas', '/geneticas', '/linea-tiempo', '/cosecha', '/ambiente']
const cual = (pathname: string) => SECCIONES.find(r => esLaSeccion(pathname, r)) ?? null

describe('la seccion se elige por segmento', () => {
  it('/plantas es Plantas, aunque empiece con /plan', () => {
    expect(cual('/plantas')).toBe('/plantas')
  })

  it('/plan es el Plan', () => {
    expect(cual('/plan')).toBe('/plan')
  })

  it('cada seccion se encuentra a si misma', () => {
    for (const r of SECCIONES) expect(cual(r)).toBe(r)
  })

  it('una subruta cae en su seccion', () => {
    expect(cual('/plan/2026')).toBe('/plan')
  })

  it('la ruta contenedora no cae en ninguna, y ahi el componente redirige', () => {
    expect(cual('/agronomico')).toBeNull()
    expect(cual('/cultivo')).toBeNull()
  })

  it('y no se cuelan parecidos', () => {
    expect(cual('/planeta')).toBeNull()
    expect(cual('/salamandra')).toBeNull()
  })
})
