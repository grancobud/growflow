// ============================================================================
// Registro de pacientes REPROCANN - capa de datos
// Fichero de pacientes vinculados a la asociacion civil + PDF de credencial.
// ============================================================================

import { supabase } from './supabase'

export type EstadoReprocann = 'Vigente' | 'En tramite' | 'Vencido' | 'Rechazado'
export type Modalidad = 'Cultivo propio' | 'Cultivo solidario' | 'Tercero/ONG'

export const ESTADOS_REPROCANN: EstadoReprocann[] = ['Vigente', 'En tramite', 'Vencido', 'Rechazado']
export const MODALIDADES: Modalidad[] = ['Cultivo propio', 'Cultivo solidario', 'Tercero/ONG']

export interface Paciente {
  id: string
  nombre_completo: string
  dni: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  email: string | null
  localidad: string | null
  provincia: string | null
  domicilio: string | null
  foto_url: string | null
  reprocann_nro: string | null
  reprocann_estado: EstadoReprocann
  reprocann_emision: string | null
  reprocann_vencimiento: string | null
  modalidad: Modalidad | null
  credencial_url: string | null
  patologia: string | null
  medico_tratante: string | null
  matricula_medico: string | null
  plantas_habilitadas: number | null
  m2_habilitados: number | null
  socio: boolean
  fecha_alta: string | null
  activo: boolean
  notas: string | null
  creado_en: string
}

function lanzar(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

async function subirA(bucket: string, file: File, prefijo: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const nombre = `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(nombre, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(nombre)
  return data.publicUrl
}

// Dias hasta el vencimiento de la credencial (negativo = vencida, null = sin fecha).
export function diasParaVencer(p: Pick<Paciente, 'reprocann_vencimiento'>): number | null {
  if (!p.reprocann_vencimiento) return null
  const venc = new Date(p.reprocann_vencimiento + 'T00:00:00')
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((venc.getTime() - hoy.getTime()) / 86400000)
}

export const registroService = {
  async getPacientes(soloActivos = false): Promise<Paciente[]> {
    let q = supabase.from('pacientes').select('*')
    if (soloActivos) q = q.eq('activo', true)
    const { data, error } = await q.order('nombre_completo')
    lanzar(error)
    return ((data ?? []) as Paciente[]).sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo, 'es', { numeric: true }))
  },

  async getPaciente(id: string): Promise<Paciente> {
    const { data, error } = await supabase.from('pacientes').select('*').eq('id', id).single()
    lanzar(error)
    return data as Paciente
  },

  async crearPaciente(p: Partial<Paciente> & { nombre_completo: string }): Promise<Paciente> {
    const { data, error } = await supabase.from('pacientes').insert(p).select().single()
    lanzar(error)
    return data as Paciente
  },

  async actualizarPaciente(id: string, p: Partial<Paciente>): Promise<void> {
    const { error } = await supabase.from('pacientes').update(p).eq('id', id)
    lanzar(error)
  },

  async eliminarPaciente(id: string): Promise<void> {
    const { error } = await supabase.from('pacientes').delete().eq('id', id)
    lanzar(error)
  },

  subirCredencial(file: File): Promise<string> {
    return subirA('documentos', file, 'credencial')
  },

  subirFotoPaciente(file: File): Promise<string> {
    return subirA('fotos', file, 'paciente')
  },
}
