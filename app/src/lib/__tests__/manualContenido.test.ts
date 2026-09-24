import { describe, it, expect } from 'vitest'
import manualMd from '../../contenido/manual.md?raw'
import { parsearMarkdown } from '../markdown'
import { seccionesDe, agruparCapitulos, partirTitulo } from '../indiceManual'

// EL MANUAL ES CONTENIDO, Y EL CONTENIDO TAMBIÉN SE ROMPE.
//
// No se revisa cómo está escrito —eso es criterio— sino las dos formas en que
// el markdown puede quedar bien en el archivo y mal en la pantalla. Las dos
// pasaron de verdad, el 03/09/2026, el mismo día que se escribieron.

describe('el markdown del manual se dibuja como está escrito', () => {
  it('ninguna lista vive adentro de una cita', () => {
    // El parser aplana la lista que está dentro de un `>`: los guiones salen
    // pegados en el mismo párrafo y la cita queda un bloque macizo, que es
    // justo lo contrario de para qué se usa una cita. La lista va AFUERA.
    const dentro = manualMd.split('\n')
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => /^>\s*[-*]\s|^>\s*\d+\.\s/.test(l))
      .map(({ l, n }) => `línea ${n}: ${l.slice(0, 60)}`)
    expect(dentro).toEqual([])
  })

  it('todos los capítulos entran en algún grupo del índice', () => {
    // `agruparCapitulos` tiene una cola «Además» para que un capítulo nuevo no
    // desaparezca del índice. Es una red, no el lugar donde se vive: si algo
    // cae ahí, es que se sumó un capítulo y nadie lo ubicó.
    const secciones = seccionesDe(parsearMarkdown(manualMd))
    const sueltos = agruparCapitulos(secciones)
      .filter(g => g.nombre === 'Además')
      .flatMap(g => g.secciones.map(s => s.capitulo.titulo))
    expect(sueltos).toEqual([])
  })

  it('cada capítulo trae su número, que es con lo que se lo nombra', () => {
    const secciones = seccionesDe(parsearMarkdown(manualMd))
    const sinNumero = secciones
      .filter(s => !s.capitulo.numero)
      .map(s => s.capitulo.titulo)
    expect(sinNumero).toEqual([])
  })
})

describe('partirTitulo', () => {
  it('separa el número del título', () => {
    expect(partirTitulo('00a · Abrir la sede: los cuatro pasos del Panel'))
      .toEqual({ numero: '00a', titulo: 'Abrir la sede: los cuatro pasos del Panel' })
  })

  it('y el «b» de un capítulo intercalado también es número', () => {
    expect(partirTitulo('07b · El circuito completo').numero).toBe('07b')
  })

  it('NO parte un título que usa el punto medio adentro', () => {
    // «Cosecha y lotes · lo que rinde» no tiene número: partirlo dejaría
    // «Cosecha y lotes» de número y el índice mostraría un renglón absurdo.
    expect(partirTitulo('Cosecha y lotes · lo que rinde'))
      .toEqual({ numero: '', titulo: 'Cosecha y lotes · lo que rinde' })
  })

  it('un título sin separador queda entero', () => {
    expect(partirTitulo('Sin número')).toEqual({ numero: '', titulo: 'Sin número' })
  })
})
