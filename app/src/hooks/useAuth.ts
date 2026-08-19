import { useState, useEffect, useCallback } from 'react'
import { authService } from '../lib/servicios'
import type { PerfilUsuario, RolUsuario } from '../types'

// Permisos por rol.
//
// Esto decide QUE SE VE en la app. Quien puede leer cada dato lo decide el RLS
// de Postgres, que es la barrera de verdad: aca se ocultan las secciones para
// que nadie entre a una pantalla que le va a devolver vacio y parezca rota.
//
// Los permisos son por area, no por pantalla: una pantalla nueva del area de
// cultivo no obliga a tocar este mapa.
const PERMISOS_ROL: Record<RolUsuario, string[]> = {
  administrador: [
    'ver_panel', 'ver_cultivo', 'editar_cultivo', 'ver_ambiente',
    'ver_ong', 'ver_clinico', 'editar_clinico',
    'ver_plata', 'editar_plata',
    'ver_tablas', 'gestionar_usuarios',
  ],
  // Trabaja la sala. No ve fichas clinicas ni cuanto cuesta producir.
  cultivador: ['ver_panel', 'ver_cultivo', 'editar_cultivo', 'ver_ambiente'],
  // Pacientes, seguimiento e informes. Mira el cultivo pero no lo toca.
  director_medico: ['ver_panel', 'ver_cultivo', 'ver_ambiente', 'ver_ong', 'ver_clinico', 'editar_clinico'],
  // Cuotas, caja, documentos y costos. Ve a los pacientes por nombre, sin ficha.
  administrativo: ['ver_panel', 'ver_cultivo', 'ver_ambiente', 'ver_ong', 'ver_plata', 'editar_plata'],
  // Entra a mirar: ve todo lo que no es dato de salud, y no modifica nada.
  auditor: ['ver_panel', 'ver_cultivo', 'ver_ambiente', 'ver_ong', 'ver_plata'],

  // La cuenta publica de muestra: Panel, Ambiente, O.N.G. y Manual.
  //
  // El objetivo es mostrar COMO se usa el sistema, no que datos tiene: entra y
  // ve las pantallas reales, vacias. Ni una planta, ni un costo, ni el nombre de
  // un paciente. Eso lo corta el RLS, no este mapa.
  demo: ['ver_panel', 'ver_ambiente', 'ver_ong'],

  // Roles viejos, conservados para filas existentes.
  operador: ['ver_panel', 'ver_cultivo', 'editar_cultivo', 'ver_ambiente'],
  supervisor: ['ver_panel', 'ver_cultivo', 'ver_ambiente', 'ver_ong', 'ver_plata'],
}

// A donde cae cada uno despues de entrar: a lo que vino a hacer.
export const RUTA_DEFAULT_ROL: Record<RolUsuario, string> = {
  administrador: '/',
  cultivador: '/plantas',
  director_medico: '/ong',
  administrativo: '/econometria',
  auditor: '/',
  demo: '/',
  operador: '/plantas',
  supervisor: '/',
}

export function useAuth() {
  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)

  const cargarPerfil = useCallback(async () => {
    try {
      const session = await authService.getSession()
      if (session) {
        const perfil = await authService.getPerfil()
        setUsuario(perfil)
        setAutenticado(true)
      } else {
        setUsuario(null)
        setAutenticado(false)
      }
    } catch {
      setUsuario(null)
      setAutenticado(false)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarPerfil()

    const { data: { subscription } } = authService.onAuthChange((_event, session) => {
      if (session) {
        cargarPerfil()
      } else {
        setUsuario(null)
        setAutenticado(false)
        setCargando(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [cargarPerfil])

  const login = async (email: string, password: string) => {
    await authService.login(email, password)
    await cargarPerfil()
  }

  const logout = async () => {
    await authService.logout()
    setUsuario(null)
    setAutenticado(false)
  }

  const tienePermiso = useCallback((accion: string): boolean => {
    if (!usuario?.rol) return false
    return PERMISOS_ROL[usuario.rol]?.includes(accion) ?? false
  }, [usuario?.rol])

  const esRol = useCallback((...roles: RolUsuario[]): boolean => {
    if (!usuario?.rol) return false
    return roles.includes(usuario.rol)
  }, [usuario?.rol])

  return { usuario, cargando, autenticado, login, logout, tienePermiso, esRol }
}
