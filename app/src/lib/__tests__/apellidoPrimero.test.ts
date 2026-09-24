// El apellido va primero, y a las personas se las busca escribiendo.
//
// Son las dos reglas que pidió Cristian el 09/09/2026: «tengo que scrollear
// hasta encontrar el nombre» y «siempre primero el apellido, en todos lados».
//
// Este test existe porque las dos son fáciles de romper sin darse cuenta: la
// próxima pantalla que liste pacientes va a escribir `p.nombre_completo` y un
// `<select>`, que es lo que uno escribe por reflejo, y nada avisaría.
//
// ⚠ LO QUE ESTE TEST NO PUEDE VER: mira el TEXTO de los archivos. Una pantalla
// que muestre el nombre desde una variable intermedia pasa igual. Para eso hay
// que abrir la pantalla.

import { describe, it, expect } from 'vitest'

const FUENTES = Object.entries(
  import.meta.glob('../../**/*.tsx', { query: '?raw', import: 'default', eager: true }),
).map(([ruta, src]) => [ruta.replace('../../', ''), src as string] as const)

/**
 * Un `<select>` que lista pacientes: es lo que se reemplazó por el buscador.
 *
 * Se busca el `.map` sobre una lista de personas dentro de un select, que es la
 * forma en que estaba escrito en las cinco pantallas.
 */
const listaDePersonasEnSelect = (src: string) =>
  /<select[\s\S]{0,400}?\{\s*(pacientes|padron)\.map\s*\(/.test(src)

/**
 * Muestra el nombre crudo en el JSX, en vez de pasarlo por `nombreParaMostrar`.
 *
 * Sólo cuenta dentro de llaves de JSX —`{p.nombre_completo}`— porque en el
 * código normal el campo se usa para comparar y guardar, y ahí está bien.
 *
 * El `(?<!=)` saca los ATRIBUTOS: `value={form.nombre_completo}` es el input
 * donde se EDITA el nombre, y ahí tiene que estar el texto tal cual se guarda;
 * `nombreUsuario={usuario?.nombre_completo}` es una cuenta del sistema, que no
 * tiene apellido separado. Los dos son usos legítimos y sin esto se marcaban.
 */
const muestraNombreCrudo = (src: string) =>
  /(?<!=)\{\s*[a-zA-Z_$][\w$]*(\?)?\.nombre_completo\s*(\?\?[^}]*)?\}/.test(src)

/**
 * Las pantallas que muestran personas que NO son pacientes.
 *
 * `perfiles_usuario` no tiene apellido separado: son las cuentas del sistema, y
 * ahí el nombre es el que la persona escribió al invitarla.
 */
const NO_SON_PACIENTES = new Set([
  'components/ong/Usuarios.tsx',
  'components/ong/ImportarFormulario.tsx',
])

describe('a las personas se las busca, no se las scrollea', () => {
  it('encuentra los componentes, no está mirando una carpeta vacía', () => {
    expect(FUENTES.length).toBeGreaterThan(20)
    expect(FUENTES.map(([f]) => f)).toContain('components/ong/Dispensas.tsx')
  })

  it('ninguna pantalla lista pacientes dentro de un <select>', () => {
    // Con 151 fichas, un desplegable obliga a scrollear hasta encontrar a la
    // persona. Para eso está `SelectorPersona`.
    const conSelect = FUENTES
      .filter(([f, src]) => !NO_SON_PACIENTES.has(f) && listaDePersonasEnSelect(src))
      .map(([f]) => f)
    expect(conSelect).toEqual([])
  })
})

describe('el apellido va primero', () => {
  it('ninguna pantalla de pacientes muestra el nombre crudo en el JSX', () => {
    const crudas = FUENTES
      .filter(([f, src]) =>
        !NO_SON_PACIENTES.has(f)
        && /pacientes|padron|paciente\b/.test(src)
        && muestraNombreCrudo(src))
      .map(([f]) => f)
    expect(crudas).toEqual([])
  })
})
