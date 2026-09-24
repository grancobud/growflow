// Las claves de `?nueva=` tienen que existir de los DOS lados.
//
// EL CASO QUE LO ORIGINÓ, dos veces.
//
// 27/08: «Crear un lote» mandaba `nueva=1` y `Catalogo.tsx` esperaba `lote`. La
// tarjeta abría el portal, mostraba la guía y abajo no había ningún formulario.
// Sin error en consola y sin nada roto: la forma más cara de fallar, porque la
// persona cree que el problema es suyo.
//
// 31/08: al revés. `PaginaPlantas` esperaba `nueva=planta` desde siempre y
// NINGUNA ruta se lo mandaba —lo mandaba el paso 2 del flujo de cosecha, que se
// retiró el 29/08—. La acción decía «da de alta las plantas» y dejaba en la
// lista. Lo mismo `AsociadosYCoherencia`, con su hook `1` y una ruta sin
// parámetro. Una capacidad que existe y no se puede alcanzar no se le nota a
// nadie, y por eso puede quedar años así.
//
// Por eso se chequean las dos direcciones:
//   - toda clave que espera una pantalla la manda alguna ruta;
//   - toda clave que manda una ruta la espera alguna pantalla.
//
// ⚠ Es un chequeo de CONJUNTOS, no de pares. No puede saber que la ruta
// `/ong/pacientes?nueva=tope` cae en la pantalla que espera `tope`: para eso
// haría falta resolver ruta → componente, que es justo lo que ningún archivo
// declara. Lo que sí garantiza es que ninguna de las dos puntas quede sola, que
// es como se rompieron las tres veces.

import { describe, it, expect } from 'vitest'

const FUENTES = Object.entries(
  import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
) as [string, string][]

// El glob resuelve relativo a ESTE directorio, asi que los propios tests
// llegan como './x.test.ts' y no contienen '__tests__'. Se filtran por nombre.
const esTest = (ruta: string) => /\.test\.tsx?$/.test(ruta)

/** Las claves que ALGUNA pantalla espera, con dónde las espera. */
function clavesEsperadas(): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const [ruta, src] of FUENTES) {
    if (esTest(ruta) || ruta.includes('useAbrirAlLlegar')) continue
    // `useAbrirAlLlegar(fn, 'clave', ...)`. Sin segundo argumento la clave es
    // `1`, que es el default del hook.
    for (const m1 of src.matchAll(/useAbrirAlLlegar\(\s*([A-Za-z0-9_.]+)\s*(?:,\s*'([^']*)')?/g)) {
      const clave = m1[2] ?? '1'
      m.set(clave, [...(m.get(clave) ?? []), ruta.replace(/^\.\.\/\.\.\//, '')])
    }
  }
  return m
}

/** Las claves que ALGUNA ruta manda, con dónde se mandan. */
function clavesMandadas(): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const [ruta, src] of FUENTES) {
    if (esTest(ruta)) continue
    for (const m1 of src.matchAll(/[?&]nueva=([^'"&`\s]+)/g)) {
      m.set(m1[1], [...(m.get(m1[1]) ?? []), ruta.replace(/^\.\.\/\.\.\//, '')])
    }
  }
  return m
}

describe('las claves de ?nueva=', () => {
  it('el detector encuentra las que hay', () => {
    // Si el regex deja de matchear, los dos casos de abajo pasan en verde sin
    // haber mirado nada. Es la misma lección que el test de los modales.
    expect(clavesEsperadas().size).toBeGreaterThan(5)
    expect(clavesMandadas().size).toBeGreaterThan(5)
  })

  it('toda clave que una pantalla espera la manda alguna ruta', () => {
    // Si no, es una capacidad escrita y muerta: el formulario nunca se abre solo
    // y la acción que prometía abrirlo deja en la lista.
    const mandadas = new Set(clavesMandadas().keys())
    const huerfanas = [...clavesEsperadas()]
      .filter(([clave]) => !mandadas.has(clave))
      .map(([clave, donde]) => `${clave} (esperada en ${donde.join(', ')})`)
    expect(huerfanas).toEqual([])
  })

  it('toda clave que una ruta manda la espera alguna pantalla', () => {
    // Si no, la persona llega con el parámetro colgando en la URL y sin nada
    // abierto. Es el bug del lote del 27/08.
    const esperadas = new Set(clavesEsperadas().keys())
    const alVacio = [...clavesMandadas()]
      .filter(([clave]) => !esperadas.has(clave))
      .map(([clave, donde]) => `${clave} (mandada desde ${donde.join(', ')})`)
    expect(alVacio).toEqual([])
  })
})
