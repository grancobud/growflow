// ============================================================================
// CannTrace Personal - capa de datos del cultivo
// Esquema simplificado: geneticas, plantas, eventos, cosechas
// ============================================================================

import { supabase } from './supabase'

export type TipoGenetica = 'Feminizada' | 'Automatica' | 'Regular' | 'Esqueje' | 'Desconocido'
export type FasePlanta =
  | 'Germinacion' | 'Plantula' | 'Vegetativo' | 'Floracion'
  | 'Secado' | 'Curado' | 'Cosechada' | 'Muerta'
export type TipoEvento =
  | 'Riego' | 'Fertilizacion' | 'Poda' | 'Trasplante' | 'CambioFase'
  | 'Entrenamiento' | 'Problema' | 'Foto' | 'Nota'

export const FASES: FasePlanta[] = [
  'Germinacion', 'Plantula', 'Vegetativo', 'Floracion',
  'Secado', 'Curado', 'Cosechada', 'Muerta',
]
export const TIPOS_EVENTO: TipoEvento[] = [
  'Riego', 'Fertilizacion', 'Poda', 'Trasplante', 'CambioFase',
  'Entrenamiento', 'Problema', 'Foto', 'Nota',
]
export const TIPOS_GENETICA: TipoGenetica[] = [
  'Feminizada', 'Automatica', 'Regular', 'Esqueje', 'Desconocido',
]
export const SUSTRATOS = [
  'Coco 100%',
  'Coco 100% Reutilizado',
  'Coco Mix',
  'Coco Mix Reutilizado',
  'Coco + Sustrato',
  'Coco + Sustrato Reutilizado',
  'Dwc',
] as const

export interface Genetica {
  id: string
  nombre: string
  banco: string | null
  tipo: TipoGenetica
  thc_estimado: number | null
  cbd_estimado: number | null
  tiempo_flora_dias: number | null
  notas: string | null
  creado_en: string
}

export interface Planta {
  id: string
  genetica_id: string | null
  madre_id: string | null
  apodo: string | null
  fecha_germinacion: string | null
  fase: FasePlanta
  sustrato: string | null
  maceta: string | null
  ubicacion: string | null
  activa: boolean
  notas: string | null
  creado_en: string
  actualizado_en: string
  geneticas?: Pick<Genetica, 'nombre' | 'banco' | 'tipo'> | null
}

export interface Evento {
  id: string
  planta_id: string | null
  tipo: TipoEvento
  fecha: string
  detalle: string | null
  foto_url: string | null
  mensaje_original: string | null
  creado_en: string
}

export interface ResumenPlanta {
  id: string
  nombre: string
  genetica: string | null
  banco: string | null
  tipo: TipoGenetica | null
  fase: FasePlanta
  fecha_germinacion: string | null
  dias_de_vida: number | null
  sustrato: string | null
  maceta: string | null
  ubicacion: string | null
  activa: boolean
  ultimo_riego: string | null
  total_eventos: number
}

export interface Cosecha {
  id: string
  planta_id: string | null
  fecha: string
  peso_humedo_g: number | null
  peso_seco_g: number | null
  notas_curado: string | null
  notas_sabor: string | null
  valoracion: number | null
  creado_en: string
}

function lanzar(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export const cultivoService = {
  // --- geneticas ---
  async getGeneticas(): Promise<Genetica[]> {
    const { data, error } = await supabase.from('geneticas').select('*').order('nombre')
    lanzar(error)
    return (data ?? []) as Genetica[]
  },

  async crearGenetica(g: Partial<Genetica> & { nombre: string }): Promise<Genetica> {
    const { data, error } = await supabase.from('geneticas').insert(g).select().single()
    lanzar(error)
    return data as Genetica
  },

  // --- plantas ---
  async getResumenPlantas(soloActivas = true): Promise<ResumenPlanta[]> {
    let q = supabase.from('resumen_plantas').select('*')
    if (soloActivas) q = q.eq('activa', true)
    const { data, error } = await q.order('fase').order('nombre')
    lanzar(error)
    return (data ?? []) as ResumenPlanta[]
  },

  async getPlanta(id: string): Promise<Planta> {
    const { data, error } = await supabase
      .from('plantas')
      .select('*, geneticas:genetica_id (nombre, banco, tipo)')
      .eq('id', id)
      .single()
    lanzar(error)
    return data as Planta
  },

  async crearPlanta(p: Partial<Planta>): Promise<Planta> {
    const { data, error } = await supabase.from('plantas').insert(p).select().single()
    lanzar(error)
    return data as Planta
  },

  async actualizarPlanta(id: string, p: Partial<Planta>): Promise<void> {
    const { error } = await supabase.from('plantas').update(p).eq('id', id)
    lanzar(error)
  },

  // --- eventos ---
  async getEventos(plantaId?: string, limit = 50): Promise<Evento[]> {
    let q = supabase.from('eventos').select('*')
    if (plantaId) q = q.eq('planta_id', plantaId)
    const { data, error } = await q.order('fecha', { ascending: false }).order('creado_en', { ascending: false }).limit(limit)
    lanzar(error)
    return (data ?? []) as Evento[]
  },

  async crearEvento(e: Partial<Evento>): Promise<Evento> {
    const { data, error } = await supabase.from('eventos').insert(e).select().single()
    lanzar(error)
    return data as Evento
  },

  async eliminarPlanta(id: string): Promise<void> {
    // Los eventos asociados caen en cascada (FK on delete cascade)
    const { error } = await supabase.from('plantas').delete().eq('id', id)
    lanzar(error)
  },

  async eliminarEvento(id: string): Promise<void> {
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    lanzar(error)
  },

  async eliminarGenetica(id: string): Promise<void> {
    // Las plantas que la usaban quedan con genetica null (FK on delete set null)
    const { error } = await supabase.from('geneticas').delete().eq('id', id)
    lanzar(error)
  },

  // --- cosechas ---
  async getCosechas(): Promise<Cosecha[]> {
    const { data, error } = await supabase.from('cosechas').select('*').order('fecha', { ascending: false })
    lanzar(error)
    return (data ?? []) as Cosecha[]
  },

  async crearCosecha(c: Partial<Cosecha>): Promise<Cosecha> {
    const { data, error } = await supabase.from('cosechas').insert(c).select().single()
    lanzar(error)
    return data as Cosecha
  },
}
