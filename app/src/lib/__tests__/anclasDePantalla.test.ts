// Un `?ir=` tiene que apuntar a una sección de LA pantalla a la que manda.
//
// Ya existe un test que verifica que el ancla exista en alguna parte del código.
// No alcanza, y se vio: al mudar el Libro Diario de Caja de la pestaña de
// Seguimiento a la de Economía, el paso del flujo siguió diciendo
// `/ong/seguimiento?nueva=1&ir=caja`. El id `caja` seguía existiendo —en otro
// archivo— así que el test viejo pasó en verde con el link roto.
//
// Roto quiere decir: se llega a la pantalla equivocada, no hay nada que traer a
// la vista, y `useIrASeccion` no encuentra el ancla y no hace nada. Sin error,
// sin aviso. La persona queda mirando el seguimiento clínico preguntándose
// dónde está el libro de caja.
//
// Este test resuelve a qué componentes se llega desde cada pestaña de
// PaginaONG y exige que el ancla esté ahí.

import { describe, it, expect } from 'vitest'
import { accionesOng } from '../accionesOng'
import { FLUJOS } from '../flujosOng'

const fuentes = Object.entries(
  import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
) as [string, string][]

const porNombre = new Map(fuentes.map(([ruta, src]) => [ruta.split('/').pop()!.replace(/\.tsx?$/, ''), src]))

const paginaOng = porNombre.get('PaginaONG')!

/**
 * El texto de cada rama `tab === 'x' ? (…)` de PaginaONG.
 *
 * Se corta en la próxima rama y no se intenta parsear JSX: alcanza con saber
 * qué componentes se nombran adentro.
 */
function ramasPorPestana(): Map<string, string> {
  const m = new Map<string, string>()
  const re = /tab === '([a-z]+)' \? \(/g
  let x: RegExpExecArray | null
  const marcas: { tab: string; desde: number }[] = []
  while ((x = re.exec(paginaOng))) marcas.push({ tab: x[1], desde: x.index })
  marcas.forEach((mk, i) => {
    const hasta = i + 1 < marcas.length ? marcas[i + 1].desde : paginaOng.length
    m.set(mk.tab, paginaOng.slice(mk.desde, hasta))
  })
  return m
}

/** Todo el código al que se llega desde una pestaña: su rama y lo que dibuja. */
function alcanceDe(tab: string): string {
  const rama = ramasPorPestana().get(tab)
  if (rama == null) return ''
  let todo = rama
  for (const m of rama.matchAll(/<([A-Z]\w*)/g)) {
    const src = porNombre.get(m[1])
    if (src) todo += src
  }
  return todo
}

/** Los `?ir=` declarados por acciones y flujos, con la pantalla a la que van. */
function anclasPedidas(): { ruta: string; tab: string; id: string }[] {
  const vacio = { entidad: null, pacientes: 0, lotes: [], asociados: [], cuotas: [] }
  const rutas = [
    ...accionesOng(vacio).map(a => a.ruta),
    ...Object.values(FLUJOS).flatMap(f => f.pasos.map(p => p.ruta)),
  ]
  const out: { ruta: string; tab: string; id: string }[] = []
  for (const ruta of rutas) {
    const [camino, query] = ruta.split('?')
    const id = new URLSearchParams(query ?? '').get('ir')
    if (!id) continue
    const partes = camino.split('/').filter(Boolean)   // ['ong', 'economia']
    if (partes[0] !== 'ong' || !partes[1]) continue    // fuera de la O.N.G.: otro árbol
    out.push({ ruta, tab: partes[1], id })
  }
  return out
}

describe('anclas de pantalla', () => {
  it('hay pestañas y anclas que revisar', () => {
    // Si PaginaONG deja de escribirse con este ternario, el parseo devuelve
    // vacío y todo pasaría en verde sin haber mirado nada.
    expect(ramasPorPestana().size).toBeGreaterThan(5)
    expect(anclasPedidas().length).toBeGreaterThan(0)
  })

  it('el ancla vive en la pantalla a la que el link manda', () => {
    const rotas = anclasPedidas()
      .filter(({ tab, id }) => !alcanceDe(tab).includes(`id="${id}"`))
      .map(({ ruta, id }) => `${ruta} → no hay id="${id}" en esa pantalla`)
    expect(rotas).toEqual([])
  })
})
