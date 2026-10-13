// La pantalla y la base tienen que decir lo mismo.
//
// Los permisos viven en dos lugares escritos por separado: `PERMISOS_ROL` decide
// QUÉ SE VE y las funciones `puede_*()` de Postgres deciden QUÉ SE DEVUELVE. El
// 12/10/2026 se compararon a mano y no coincidían: el administrativo tenía la
// historia clínica en la pantalla y cero filas en la base (se veía roto), y el
// auditor no tenía el padrón en ningún lado aunque el rol es «ve todo lo que no
// es dato de salud». Esta prueba hace esa comparación en cada PR.
//
// ⚠ LO QUE NO VE: lee las MIGRACIONES, no la base. Un cambio hecho a mano en
// Supabase sin migración pasa igual. Por eso al aplicar se verifica también con
// roles prestados dentro de una transacción que se revierte (pozo 6).
//
// Spec: openspec/specs/acceso/permisos-por-rol

import { describe, it, expect } from 'vitest'
import { PERMISOS_ROL } from '../../hooks/useAuth'
import { PERMISO_DE_TAB } from '../pestanasOng'
import { puedeVerClinicoRol } from '../useDirectorMedico'
import type { RolUsuario } from '../../types'

// Mismo mecanismo que el resto de los tests que leen fuentes: `import.meta.glob`
// con `?raw`, así el build (que también tipa los tests) no necesita tipos de Node.
const MIGRACIONES = import.meta.glob('../../../../supabase/migrations/*.sql',
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Todas las migraciones en orden: la última definición de una función es la vigente. */
const sql = Object.keys(MIGRACIONES).sort().map(k => MIGRACIONES[k]).join('\n')

/** El cuerpo de la ÚLTIMA definición de `public.<nombre>()`. */
function cuerpo(nombre: string): string {
  const re = new RegExp(`create or replace function public\\.${nombre}\\(\\)[\\s\\S]*?as\\s+(\\$\\w*\\$)([\\s\\S]*?)\\1`, 'gi')
  let ultimo: string | null = null
  for (const m of sql.matchAll(re)) ultimo = m[2]
  if (ultimo == null) throw new Error(`no se encontró public.${nombre}() en las migraciones`)
  return ultimo
}

/** Los roles que deja pasar una función, siguiendo las llamadas a otras `puede_*()`. */
function rolesDe(nombre: string): Set<string> {
  const c = cuerpo(nombre)
  const roles = new Set([...c.matchAll(/'([a-z_]+)'/g)].map(m => m[1]))
  for (const [, otra] of c.matchAll(/public\.((?:puede|es)_\w+)\(\)/g)) for (const r of rolesDe(otra)) roles.add(r)
  return roles
}

const ROLES = Object.keys(PERMISOS_ROL) as RolUsuario[]
const conPermiso = (p: string) => new Set(ROLES.filter(r => PERMISOS_ROL[r].includes(p)))
const orden = (s: Set<string>) => [...s].sort()

// La matriz de la spec, escrita a mano A PROPÓSITO: si alguien cambia un permiso,
// esta lista obliga a cambiar también la spec en el mismo PR.
const CLINICO = ['administrador', 'administrador_sistema', 'administrativo', 'director_medico']
const PADRON = ['administrador', 'administrador_sistema', 'administrativo', 'auditor', 'director_medico']
const RECURSOS = ['administrador', 'administrador_sistema', 'administrativo', 'auditor', 'mostrador']
const BORRAN = ['administrador', 'administrador_sistema']

describe('permisos por rol: lo que dice la spec', () => {
  it('historia clínica', () => {
    expect(orden(conPermiso('ver_clinico'))).toEqual(CLINICO)
    expect(orden(conPermiso('editar_clinico'))).toEqual(CLINICO)
  })

  it('padrón: pestaña Pacientes y nómina', () => {
    expect(orden(conPermiso('ver_padron'))).toEqual(PADRON)
    expect(PERMISO_DE_TAB.pacientes).toBe('ver_padron')
    expect(PERMISO_DE_TAB.nomina).toBe('ver_padron')
  })

  // Había una tercera lista, escrita a mano en useDirectorMedico, que escondía la
  // historia de la ficha al administrador del sistema y al administrativo.
  it('la historia de la ficha usa la misma regla', () => {
    expect(ROLES.filter(r => puedeVerClinicoRol(r)).sort()).toEqual(CLINICO)
    expect(puedeVerClinicoRol(undefined)).toBe(false)
    expect(puedeVerClinicoRol('rol_que_no_existe')).toBe(false)
  })

  it('el auditor mira y no modifica', () => {
    expect(PERMISOS_ROL.auditor).toContain('ver_padron')
    expect(PERMISOS_ROL.auditor).not.toContain('editar_clinico')
    expect(PERMISOS_ROL.auditor).not.toContain('ver_clinico')
  })

  it('recursos', () => {
    expect(orden(conPermiso('ver_plata'))).toEqual(RECURSOS)
  })

  it('borrar pacientes: solo administradores', () => {
    expect(orden(conPermiso('gestionar_usuarios'))).toEqual(BORRAN)
  })
})

describe('permisos por rol: la pantalla coincide con la base', () => {
  it('lo clínico', () => {
    expect(orden(rolesDe('puede_ver_clinico'))).toEqual(orden(conPermiso('ver_clinico')))
  })

  it('quien ve la pestaña Pacientes recibe filas de la vista del padrón', () => {
    const base = rolesDe('puede_leer_padron')
    for (const r of conPermiso('ver_padron')) expect(base.has(r), `${r} ve la pestaña y la base le devuelve cero`).toBe(true)
  })

  it('el auditor lee el padrón SOLO por la vista: la escritura sigue sin él', () => {
    expect(rolesDe('puede_leer_padron').has('auditor')).toBe(true)
    expect(rolesDe('puede_ver_padron').has('auditor')).toBe(false)
  })

  it('quien edita lo clínico puede escribir el padrón', () => {
    const escriben = rolesDe('puede_ver_padron')
    for (const r of conPermiso('editar_clinico')) expect(escriben.has(r), `${r} ve el botón y la base lo rechaza`).toBe(true)
  })

  it('recursos', () => {
    expect(orden(rolesDe('puede_ver_plata'))).toEqual(orden(conPermiso('ver_plata')))
  })

  it('borrar', () => {
    expect(orden(rolesDe('es_admin'))).toEqual(orden(conPermiso('gestionar_usuarios')))
  })
})
