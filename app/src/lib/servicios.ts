// ============================================================================
// GrowFlow - Servicio de autenticacion
//
// Aca vivian tambien stock, operaciones, catalogo, trazabilidad y auditoria del
// sistema anterior. Ninguna pantalla los importaba y consultaban diez tablas que
// la base de GrowFlow no tiene (lotes, productos, operaciones, individuos...):
// se sacaron el 25/09/2026. El stock de hoy vive en lib/stock.ts y
// lib/stockDeLotes.ts.
// ============================================================================

import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import type { PerfilUsuario } from '../types'

// ============================================================================
// AUTH
// ============================================================================

/**
 * Estado del deduplicador de `getPerfil`. Ver el comentario de ese metodo.
 * Vive en el modulo y no en un componente: el punto es que sea UNO solo para
 * toda la app, sin importar cuantos componentes pidan el perfil.
 */
let perfilEnVuelo: Promise<PerfilUsuario | null> | null = null
let perfilCache: { perfil: PerfilUsuario | null; t: number } | null = null
const PERFIL_TTL_MS = 5000

/** Tira la cache del perfil. Se llama en cada cambio de sesion. */
function olvidarPerfil() {
  perfilCache = null
  perfilEnVuelo = null
}

export const authService = {
  async login(email: string, password: string) {
    olvidarPerfil()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    // Deja la marca de que entro, que es lo que mira la pantalla de Usuarios
    // cuando alguien dice «invite a fulano y no se si le llego».
    //
    // Va DESPUES del login y sin await sobre el resultado: si la marca falla, la
    // persona ya entro y no tiene por que enterarse. Es una funcion y no un
    // update porque una policy de UPDATE sobre la fila propia dejaria cambiar
    // tambien el `rol`. Ver la migracion `marcar_el_ultimo_acceso`.
    supabase.rpc('marcar_acceso').then(() => {}, () => {})
    return data
  },

  async logout() {
    olvidarPerfil()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  /**
   * El perfil de quien esta usando la app, sin pedirlo veinte veces.
   *
   * MEDIDO EN PRODUCCION EL 29/08/2026: al abrir la app salian 140 llamadas a
   * la base para 34 consultas distintas. Las dos peores eran estas —
   * `auth/v1/user` 23 veces y `perfiles_usuario` 21— porque `useAuth` guarda su
   * estado en un `useState` LOCAL: cada componente que lo usa hace su propia
   * consulta, y ademas cada uno se suscribe a `onAuthChange`, asi que un solo
   * evento de sesion dispara una recarga POR SUSCRIPCION.
   *
   * Se arregla aca y no en `useAuth` a proposito: mover el hook a un contexto
   * es el arreglo de fondo, pero toca la estructura de los componentes y hoy
   * no es el dia. Esto no cambia ninguna firma.
   *
   * DOS MECANISMOS, y el primero es el que mas saca:
   *
   * 1. Las llamadas simultaneas comparten UNA promesa. Si cuatro componentes
   *    montan a la vez y los cuatro piden el perfil, sale una sola consulta y
   *    los cuatro esperan la misma.
   * 2. Una cache de cinco segundos, que cubre la rafaga del arranque sin
   *    quedarse con un perfil viejo. Es corta a proposito: los permisos salen
   *    de aca, y un permiso desactualizado es peor que una consulta de mas.
   *
   * SE INVALIDA SIEMPRE que la sesion cambia —login, logout y cualquier evento
   * de `onAuthChange`—, para que no quede el perfil de quien acaba de salir.
   */
  async getPerfil(): Promise<PerfilUsuario | null> {
    if (perfilEnVuelo) return perfilEnVuelo
    if (perfilCache && Date.now() - perfilCache.t < PERFIL_TTL_MS) return perfilCache.perfil

    perfilEnVuelo = (async () => {
      // ⚠️ `getSession`, NO `getUser`. Los dos devuelven el usuario, pero
      // `getUser` PEGA A LA RED —`/auth/v1/user`— y `getSession` lee el token
      // que ya está en el navegador.
      //
      // No es sólo una consulta de menos. Un `getUser` puede hacer que
      // `onAuthStateChange` emita, y ese evento tira la caché del perfil, que
      // hace pedir el perfil de nuevo, que llama a `getUser` otra vez. Medido
      // en producción el 04/09/2026: `perfiles_usuario` salía a los 1.585 ms,
      // 2.989, 5.590 y 7.567, sin que nadie tocara nada. Era eso.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return null

      const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) return null
      return data as PerfilUsuario
    })()

    try {
      const perfil = await perfilEnVuelo
      perfilCache = { perfil, t: Date.now() }
      return perfil
    } finally {
      perfilEnVuelo = null
    }
  },

  onAuthChange(callback: (event: string, session: Session | null) => void) {
    // Cualquier cambio de sesion tira la cache antes de avisarle a nadie.
    return supabase.auth.onAuthStateChange((event, session) => {
      olvidarPerfil()
      callback(event, session)
    })
  }
}
