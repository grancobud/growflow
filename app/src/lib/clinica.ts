// Historia clínica del paciente.
//
// Existe aparte de `registro.ts` (que maneja la ficha administrativa del
// paciente: nombre, DNI, REPROCANN, cupo) porque son dos cosas con permisos
// distintos. La ficha administrativa la ven todos los roles reales; esto lo ve
// sólo quien pasa `puede_ver_clinico()`, o sea administrador y director médico.
//
// Y existe aparte de `ong_feedback_clinico` porque son dos voces distintas:
//
//   feedback  → lo reporta EL PACIENTE después de cada entrega. Es evidencia y
//               no se edita ni se borra (RN-07). Sin entrega no hay reporte.
//   evolución → lo escribe EL PROFESIONAL, cuando quiere, haya habido entrega o
//               no. Se puede corregir: un médico que se equivoca tipeando tiene
//               que poder arreglarlo.
//
// Mezclarlas sería cómodo y estaría mal: el informe semestral vale justamente
// porque cruza lo que el paciente dice con lo que el profesional observa. Si
// fueran la misma tabla, no habría nada que cruzar.

import { supabase } from './supabase'

const lanzar = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

/** Los datos de fondo del paciente: lo que no cambia con cada entrega. */
export interface FichaClinica {
  paciente_id: string
  antecedentes?: string | null
  medicacion_concomitante?: string | null
  alergias?: string | null
  contraindicaciones?: string | null
  objetivo_terapeutico?: string | null
  notas_medico?: string | null
  actualizado_en?: string
  actualizado_por?: string | null
}

export type TipoEvolucion =
  | 'evolucion' | 'consulta' | 'ajuste_dosis' | 'alta' | 'suspension' | 'nota'

export const TIPOS_EVOLUCION: { id: TipoEvolucion; label: string; color: string }[] = [
  { id: 'consulta', label: 'Consulta', color: '#38bdf8' },
  { id: 'evolucion', label: 'Evolución', color: '#a3e635' },
  { id: 'ajuste_dosis', label: 'Ajuste de dosis', color: '#facc15' },
  { id: 'suspension', label: 'Suspensión', color: '#ff8a7a' },
  { id: 'alta', label: 'Alta', color: '#bef264' },
  { id: 'nota', label: 'Nota', color: '#a6a6b5' },
]

export const etiquetaEvolucion = (t: string) =>
  TIPOS_EVOLUCION.find(x => x.id === t)?.label ?? t
export const colorEvolucion = (t: string) =>
  TIPOS_EVOLUCION.find(x => x.id === t)?.color ?? '#a6a6b5'

/** Una entrada fechada de la historia. */
export interface Evolucion {
  id: string
  paciente_id: string
  fecha: string
  tipo: TipoEvolucion
  texto: string
  firmado_por?: string | null
  matricula?: string | null
  creado_en?: string
}

export const clinicaService = {
  /**
   * La ficha puede no existir todavía y eso NO es un error: un paciente recién
   * cargado no tiene historia. Devuelve null y la pantalla ofrece crearla.
   */
  async getFicha(pacienteId: string): Promise<FichaClinica | null> {
    const { data, error } = await supabase
      .from('pacientes_clinica').select('*').eq('paciente_id', pacienteId).maybeSingle()
    lanzar(error)
    return (data as FichaClinica) ?? null
  },

  /**
   * Upsert y no insert/update por separado: quien edita la ficha no tiene por qué
   * saber si ya existía. `actualizado_en` se pisa siempre para que se vea cuándo
   * fue la última vez que alguien la miró.
   */
  async guardarFicha(f: FichaClinica & { actualizado_por?: string | null }): Promise<void> {
    const { error } = await supabase.from('pacientes_clinica')
      .upsert({ ...f, actualizado_en: new Date().toISOString() }, { onConflict: 'paciente_id' })
    lanzar(error)
  },

  /** Más nueva primero: la historia se lee desde lo último hacia atrás. */
  async getEvolucion(pacienteId: string): Promise<Evolucion[]> {
    const { data, error } = await supabase
      .from('evolucion_clinica').select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
    lanzar(error)
    return (data ?? []) as Evolucion[]
  },

  async agregarEvolucion(e: Omit<Evolucion, 'id' | 'creado_en'>): Promise<Evolucion> {
    const { data, error } = await supabase
      .from('evolucion_clinica').insert(e).select().single()
    lanzar(error)
    return data as Evolucion
  },

  async editarEvolucion(id: string, e: Partial<Evolucion>): Promise<void> {
    const { error } = await supabase.from('evolucion_clinica').update(e).eq('id', id)
    lanzar(error)
  },

  /** Sólo admin: la policy de delete pide es_admin(). */
  async borrarEvolucion(id: string): Promise<void> {
    const { error } = await supabase.from('evolucion_clinica').delete().eq('id', id)
    lanzar(error)
  },

  /**
   * Cuántos pacientes tienen ficha cargada. Sirve para el panel del médico:
   * "12 de 20 con historia clínica" dice más que un listado.
   */
  async contarConFicha(): Promise<number> {
    const { count, error } = await supabase
      .from('pacientes_clinica').select('paciente_id', { count: 'exact', head: true })
    lanzar(error)
    return count ?? 0
  },
}

/**
 * Una ficha "vacía" no es la que no existe, es la que existe con todo en blanco.
 * Se usa para no mostrar como completa una ficha que alguien abrió y guardó sin
 * escribir nada.
 */
export const fichaVacia = (f: FichaClinica | null): boolean =>
  !f || ![f.antecedentes, f.medicacion_concomitante, f.alergias,
          f.contraindicaciones, f.objetivo_terapeutico, f.notas_medico]
    .some(v => (v ?? '').trim().length > 0)
