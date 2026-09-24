// Lo que se puede borrar, se tiene que poder corregir.
//
// El 23/08/2026 Gastón cargó un gasto de $40.000 en el Libro Diario de Caja sin
// el comprobante, y no había forma de agregárselo: la fila tenía el tacho de
// borrar y nada más. La única salida era borrarlo y cargarlo de nuevo, y con eso
// se pierde el asiento original y cualquier cosa que ya colgara de él.
//
// El guardado ya sabía actualizar —si el asiento trae `id` hace update— así que
// lo único que faltaba era el botón. Eso es lo que hace peligroso este bug: no
// se ve en ningún test, no rompe nada, y sólo aparece cuando alguien necesita
// corregir algo que ya cargó.
//
// ⚠ LO QUE ESTE TEST NO PUEDE VER. Mira el TEXTO del archivo y empareja por
// archivo, no por entidad: si una pantalla deja editar una cosa y borrar otra
// —como Ambiente, que corrige lecturas pero no permite renombrar la sala— pasa
// igual. Para eso no alcanza con leer el archivo: hay que abrir la pantalla.

import { describe, it, expect } from 'vitest'

// Mismo mecanismo que el resto de los tests que leen fuentes: `import.meta.glob`
// de Vite y no `node:fs`, que en este tsconfig no tiene tipos.
const FUENTES = Object.entries(
  import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }),
).map(([ruta, src]) => [ruta.replace('../../', ''), src as string] as const)
/**
 * Lo que se borra sin poder editarse, con el motivo de por qué está bien.
 *
 * Una excepción sin motivo es un bug con permiso. Si algo entra acá, que sea
 * porque corregirlo no tiene sentido, no porque falte hacerlo.
 */
const SIN_EDITAR: Record<string, string> = {
  'components/PinLock.tsx':
    'El botón borra un dígito del PIN que se está tipeando. No hay ninguna ficha que corregir.',
  'components/ong/portal/Reservas.tsx':
    'Una reserva la hace la persona desde el portal: la asociación se la entrega o la cancela, ' +
    'y para eso están Ver QR y Ver recibo. Cambiarle los datos por atrás sería pisar lo que ' +
    'la persona pidió.',
}

/** Alguna forma de corregir lo cargado: el lápiz, o un botón que lo diga. */
const dejaCorregir = (src: string) =>
  /Pencil|aria-label="Editar|title="Editar|title="Corregir|>\s*Editar\b/.test(src)

const borraAlgo = (src: string) => /aria-label="Borrar/.test(src)

describe('lo que se borra se puede corregir', () => {
  const archivos = FUENTES.map(([f]) => f)

  it('encuentra los componentes, no está mirando una carpeta vacía', () => {
    // Sin esto, un error en la ruta haría pasar el test recorriendo cero
    // archivos, que es la forma más silenciosa de que esta red no exista.
    expect(archivos.length).toBeGreaterThan(20)
    expect(archivos).toContain('components/ong/LibroDeCaja.tsx')
  })

  it('ninguna pantalla deja borrar algo sin ofrecer corregirlo', () => {
    const mancos = FUENTES
      .filter(([f, src]) => !SIN_EDITAR[f] && borraAlgo(src) && !dejaCorregir(src))
      .map(([f]) => f)
    expect(mancos).toEqual([])
  })

  it('cada excepción declara su motivo, y no sobra ninguna', () => {
    // Una excepción que ya no hace falta es ruido que tapa el próximo caso.
    for (const [f, motivo] of Object.entries(SIN_EDITAR)) {
      expect(motivo.length, `${f} sin motivo`).toBeGreaterThan(40)
      const src = FUENTES.find(([r]) => r === f)?.[1]
      expect(src, `${f} ya no existe: sacar la excepción`).toBeTruthy()
      expect(borraAlgo(src ?? ''), `${f} ya no borra nada: sacar la excepción`).toBe(true)
    }
  })

  it('el Libro de Caja deja corregir un asiento, que es el que lo destapó', () => {
    const src = FUENTES.find(([f]) => f === 'components/ong/LibroDeCaja.tsx')?.[1] ?? ''
    expect(src).toContain('aria-label="Editar asiento"')
    expect(src).toContain('aria-label="Borrar asiento"')
  })
})
