// ============================================================================
// Asistencia de growers + bitacora de actividades por jornada - capa de datos.
// ============================================================================

import { supabase } from './supabase'

export type RolGrower = 'Cultivador' | 'Responsable' | 'Encargado' | 'Voluntario'
export type TipoActividad =
  | 'Riego' | 'Fumigacion' | 'Poda' | 'Trasplante' | 'Cosecha'
  | 'Mantenimiento' | 'Limpieza' | 'Reunion' | 'Otro'

export const ROLES_GROWER: RolGrower[] = ['Cultivador', 'Responsable', 'Encargado', 'Voluntario']
export const TIPOS_ACTIVIDAD: TipoActividad[] = [
  'Riego', 'Fumigacion', 'Poda', 'Trasplante', 'Cosecha',
  'Mantenimiento', 'Limpieza', 'Reunion', 'Otro',
]

export interface Cultivador {
  id: string
  nombre: string
  rol: RolGrower
  telefono: string | null
  activo: boolean
  creado_en: string
}

export interface Jornada {
  id: string
  fecha: string
  responsable: string | null
  clima: string | null
  resumen: string | null
  notas: string | null
  creado_en: string
}

export interface Asistencia {
  id: string
  jornada_id: string | null
  cultivador_id: string | null
  presente: boolean
  hora_entrada: string | null
  hora_salida: string | null
  notas: string | null
  creado_en: string
}

export interface Actividad {
  id: string
  jornada_id: string | null
  hora: string | null
  tipo: TipoActividad
  descripcion: string | null
  cultivador_id: string | null
  creado_en: string
}

function lanzar(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export const asistenciaService = {
  // --- cultivadores (roster) ---
  async getCultivadores(soloActivos = false): Promise<Cultivador[]> {
    let q = supabase.from('cultivadores').select('*')
    if (soloActivos) q = q.eq('activo', true)
    const { data, error } = await q.order('nombre')
    lanzar(error)
    return ((data ?? []) as Cultivador[]).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  },
  async crearCultivador(c: Partial<Cultivador> & { nombre: string }): Promise<Cultivador> {
    const { data, error } = await supabase.from('cultivadores').insert(c).select().single()
    lanzar(error)
    return data as Cultivador
  },
  async actualizarCultivador(id: string, c: Partial<Cultivador>): Promise<void> {
    const { error } = await supabase.from('cultivadores').update(c).eq('id', id)
    lanzar(error)
  },
  async eliminarCultivador(id: string): Promise<void> {
    const { error } = await supabase.from('cultivadores').delete().eq('id', id)
    lanzar(error)
  },

  // --- jornadas ---
  async getJornadas(limit = 60): Promise<Jornada[]> {
    const { data, error } = await supabase.from('jornadas').select('*')
      .order('fecha', { ascending: false }).order('creado_en', { ascending: false }).limit(limit)
    lanzar(error)
    return (data ?? []) as Jornada[]
  },
  async crearJornada(j: Partial<Jornada>): Promise<Jornada> {
    const { data, error } = await supabase.from('jornadas').insert(j).select().single()
    lanzar(error)
    return data as Jornada
  },
  async actualizarJornada(id: string, j: Partial<Jornada>): Promise<void> {
    const { error } = await supabase.from('jornadas').update(j).eq('id', id)
    lanzar(error)
  },
  async eliminarJornada(id: string): Promise<void> {
    const { error } = await supabase.from('jornadas').delete().eq('id', id)
    lanzar(error)
  },

  // Devuelve la jornada de hoy; si no existe la crea (+ asistencia inicial de los growers activos).
  async getJornadaHoy(): Promise<Jornada> {
    const hoy = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase.from('jornadas').select('*').eq('fecha', hoy).limit(1)
    lanzar(error)
    const existente = (data ?? []) as Jornada[]
    if (existente.length) return existente[0]
    const nueva = await this.crearJornada({ fecha: hoy })
    // sembrar asistencia (ausentes por defecto) para cada grower activo
    const growers = await this.getCultivadores(true)
    for (const g of growers) {
      await this.setAsistencia(nueva.id, g.id, { presente: false })
    }
    return nueva
  },

  // --- asistencias ---
  async getAsistencias(jornadaId: string): Promise<Asistencia[]> {
    const { data, error } = await supabase.from('asistencias').select('*').eq('jornada_id', jornadaId)
    lanzar(error)
    return (data ?? []) as Asistencia[]
  },
  // Crea o actualiza la asistencia de un grower en una jornada.
  async setAsistencia(jornadaId: string, cultivadorId: string, campos: Partial<Asistencia>): Promise<void> {
    const existentes = await this.getAsistencias(jornadaId)
    const previa = existentes.find(a => a.cultivador_id === cultivadorId)
    if (previa) {
      const { error } = await supabase.from('asistencias').update(campos).eq('id', previa.id)
      lanzar(error)
    } else {
      const { error } = await supabase.from('asistencias')
        .insert({ jornada_id: jornadaId, cultivador_id: cultivadorId, ...campos })
      lanzar(error)
    }
  },

  // --- actividades (bitacora) ---
  async getActividades(jornadaId: string): Promise<Actividad[]> {
    const { data, error } = await supabase.from('actividades').select('*')
      .eq('jornada_id', jornadaId).order('hora', { ascending: true }).order('creado_en', { ascending: true })
    lanzar(error)
    return (data ?? []) as Actividad[]
  },
  async crearActividad(a: Partial<Actividad>): Promise<Actividad> {
    const { data, error } = await supabase.from('actividades').insert(a).select().single()
    lanzar(error)
    return data as Actividad
  },
  async eliminarActividad(id: string): Promise<void> {
    const { error } = await supabase.from('actividades').delete().eq('id', id)
    lanzar(error)
  },
}
