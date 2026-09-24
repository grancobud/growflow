import { describe, it, expect } from 'vitest'
import { TABS, GRUPOS, PERMISO_DE_TAB, TABS_DE_PLATA, puedeVerTab, type Tab } from '../pestanasOng'
import { PERMISOS_ROL } from '../../hooks/useAuth'

const con = (rol: keyof typeof PERMISOS_ROL) =>
  (p: string) => PERMISOS_ROL[rol].includes(p)

const veCon = (rol: keyof typeof PERMISOS_ROL): Tab[] =>
  TABS.map(t => t.id).filter(t => puedeVerTab(t, con(rol)))

// Cada pestaña pide un permiso, y ese permiso tiene que EXISTIR.
//
// Un typo acá no rompe nada visible: la pestaña simplemente no se le muestra a
// nadie, para siempre, sin error. Es la misma familia que la pestaña sin grupo,
// que queda inalcanzable en silencio.
describe('PERMISO_DE_TAB', () => {
  const todos = new Set(Object.values(PERMISOS_ROL).flat())

  it('cada pestaña pide un permiso que algún rol tiene', () => {
    for (const { id } of TABS) expect(todos).toContain(PERMISO_DE_TAB[id])
  })

  it('cubre todas las pestañas, sin sobrar ninguna', () => {
    expect(Object.keys(PERMISO_DE_TAB).sort()).toEqual(TABS.map(t => t.id).sort())
  })

  // `TABS_DE_PLATA` y el mapa son dos listas sobre lo mismo. Si divergen, una
  // pantalla de plata se muestra a quien no la puede leer — o al revés.
  it('coincide con TABS_DE_PLATA', () => {
    const porElMapa = TABS.map(t => t.id).filter(t => PERMISO_DE_TAB[t] === 'ver_plata')
    expect(porElMapa.sort()).toEqual([...TABS_DE_PLATA].sort())
  })

  it('el administrador ve todas', () => {
    expect(veCon('administrador')).toHaveLength(TABS.length)
  })
})

// Lo que cada rol ve DE VERDAD en la O.N.G.
//
// Se afirma sobre la lista resuelta y no sobre el mapa: es la única forma de
// que el test hable de lo que la persona ve en pantalla.
describe('qué pestañas ve cada rol', () => {
  it('el director de cultivo ve TRES, no dieciséis', () => {
    expect(veCon('director_cultivo').sort()).toEqual(['cupo', 'declaraciones', 'predios'])
  })

  // Traslados y DDJJ viven en Declaraciones. Sin esa pestaña el rol no puede
  // hacer lo único que lo distingue del cultivador.
  it('y entre esas tres está Declaraciones, que es para lo que existe', () => {
    expect(veCon('director_cultivo')).toContain('declaraciones')
  })

  // Antes del 31/08/2026 el auditor veía Pacientes y Seguimiento, y la base le
  // devolvía cero filas: una pantalla vacía se lee como rota, no como
  // prohibida. No pierde ningún dato — no tenía ninguno.
  it('el auditor ya no ve Pacientes ni Seguimiento vacías', () => {
    expect(veCon('auditor')).not.toContain('pacientes')
    expect(veCon('auditor')).not.toContain('seguimiento')
    expect(veCon('auditor')).toContain('movimientos')
  })

  it('el administrativo sí ve Pacientes: desde hoy tiene el padrón', () => {
    expect(veCon('administrativo')).toContain('pacientes')
  })

  it('el director médico no ve ninguna de plata', () => {
    for (const t of TABS_DE_PLATA) expect(veCon('director_medico')).not.toContain(t)
  })

  it('el cultivador no entra a la O.N.G. en absoluto', () => {
    expect(veCon('cultivador')).toHaveLength(0)
  })
})

// Una pestaña que no está en ningún grupo queda INALCANZABLE: la segunda fila
// sólo muestra las del grupo elegido. No da error y no se ve.
describe('grupos', () => {
  it('toda pestaña visible está en algún grupo', () => {
    const enGrupos = new Set(GRUPOS.flatMap(g => g.tabs))
    for (const { id } of TABS) expect(enGrupos.has(id)).toBe(true)
  })
})
