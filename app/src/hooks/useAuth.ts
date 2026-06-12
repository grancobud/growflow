import { useState, useEffect, useCallback } from 'react'
import { authService } from '../lib/servicios'
import type { PerfilUsuario, RolUsuario } from '../types'

// Mapa de permisos por rol
const PERMISOS_ROL: Record<RolUsuario, string[]> = {
  administrador: [
    'crear_operacion', 'confirmar_operacion', 'anular_operacion',
    'ver_stock', 'ver_historial', 'ver_trazabilidad',
    'ver_auditoria', 'ver_configuracion', 'editar_configuracion',
    'cargar_registros_cumcs', 'exportar_datos',
    'gestionar_usuarios', 'ver_checklist', 'ver_gamp5',
  ],
  supervisor: [
    'crear_operacion', 'confirmar_operacion',
    'ver_stock', 'ver_historial', 'ver_trazabilidad',
    'ver_configuracion', 'cargar_registros_cumcs', 'exportar_datos',
    'ver_checklist', 'ver_gamp5',
  ],
  operador: [
    'crear_operacion',
    'ver_stock', 'ver_historial',
    'cargar_registros_cumcs',
    'ver_checklist',
  ],
  auditor: [
    'ver_stock', 'ver_historial', 'ver_trazabilidad',
    'ver_auditoria', 'exportar_datos',
    'ver_checklist', 'ver_gamp5',
  ],
}

// Ruta default por rol despues del login
export const RUTA_DEFAULT_ROL: Record<RolUsuario, string> = {
  administrador: '/',
  supervisor: '/',
  operador: '/operacion',
  auditor: '/historial',
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
