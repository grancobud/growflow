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

export type Genotipo = 'Indica' | 'Sativa' | 'Hibrida' | 'Ruderalis'
export type Altura = 'Baja' | 'Media' | 'Alta'
export type Dificultad = 'Facil' | 'Media' | 'Dificil'
export type Ambiente = 'Indoor' | 'Outdoor' | 'Invernadero' | 'Mixto'

export const GENOTIPOS: Genotipo[] = ['Indica', 'Sativa', 'Hibrida', 'Ruderalis']
export const ALTURAS: Altura[] = ['Baja', 'Media', 'Alta']
export const DIFICULTADES: Dificultad[] = ['Facil', 'Media', 'Dificil']
export const AMBIENTES: Ambiente[] = ['Indoor', 'Outdoor', 'Invernadero', 'Mixto']

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
  // ficha ampliada (todos opcionales)
  genotipo?: Genotipo | null
  indica_pct?: number | null
  sativa_pct?: number | null
  linaje?: string | null
  tiempo_vege_dias?: number | null
  altura?: Altura | null
  rendimiento_g?: string | null
  dificultad?: Dificultad | null
  terpenos?: string | null
  efectos?: string | null
  usos_medicinales?: string | null
  ambiente?: Ambiente | null
  resistencia?: string | null
  stretch?: string | null
  foto_url?: string | null
  color?: string | null
  inicio_flora?: string | null   // fecha de paso a 12/12 del cultivo actual (para estimar cosecha de fem)
}

export interface Planta {
  id: string
  codigo: string | null
  genetica_id: string | null
  madre_id: string | null
  paciente_id: string | null
  apodo: string | null
  fecha_germinacion: string | null
  fecha_cosecha: string | null
  fecha_envasado: string | null
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

// Genera un codigo de trazabilidad unico y legible para una planta.
// Formato: <ABBR>-<5 base36>, ej "GG-7F3A9". ABBR sale del nombre de la genetica.
export function generarCodigoPlanta(nombreGenetica?: string | null): string {
  const abbr = (nombreGenetica ?? '')
    .normalize('NFD').replace(/[^a-zA-Z]/g, '')
    .slice(0, 3).toUpperCase() || 'GF'
  let sufijo = ''
  for (let i = 0; i < 5; i++) sufijo += '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 34)]
  return `${abbr}-${sufijo}`
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
  codigo: string | null
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
  paciente_id: string | null
  paciente_nombre: string | null
  ultimo_riego: string | null
  total_eventos: number
}

// Item unificado de la linea de tiempo (historia clinica) de una planta.
export interface ItemHistoria {
  id: string
  tipo: string
  fecha: string
  detalle: string | null
  foto_url: string | null
  esCosecha?: boolean
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

  async getGenetica(id: string): Promise<Genetica> {
    const { data, error } = await supabase.from('geneticas').select('*').eq('id', id).single()
    lanzar(error)
    return data as Genetica
  },

  async crearGenetica(g: Partial<Genetica> & { nombre: string }): Promise<Genetica> {
    const { data, error } = await supabase.from('geneticas').insert(g).select().single()
    lanzar(error)
    return data as Genetica
  },

  async actualizarGenetica(id: string, g: Partial<Genetica>): Promise<void> {
    const { error } = await supabase.from('geneticas').update(g).eq('id', id)
    lanzar(error)
  },

  async subirFotoGenetica(file: File): Promise<string> {
    return this.subirFoto(file)
  },

  // --- plantas ---
  async getResumenPlantas(soloActivas = true): Promise<ResumenPlanta[]> {
    let q = supabase.from('resumen_plantas').select('*')
    if (soloActivas) q = q.eq('activa', true)
    const { data, error } = await q
    lanzar(error)
    // Orden natural: #2 antes que #10 (el order de SQL es alfabetico puro)
    return ((data ?? []) as ResumenPlanta[]).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
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
    const conCodigo = p.codigo ? p : { ...p, codigo: generarCodigoPlanta(null) }
    const { data, error } = await supabase.from('plantas').insert(conCodigo).select().single()
    lanzar(error)
    return data as Planta
  },

  async getPlantaPorCodigo(codigo: string): Promise<Planta | null> {
    const { data, error } = await supabase
      .from('plantas')
      .select('*, geneticas:genetica_id (nombre, banco, tipo)')
      .eq('codigo', codigo)
      .maybeSingle()
    lanzar(error)
    return (data as Planta) ?? null
  },

  async getPlantasDePaciente(pacienteId: string): Promise<ResumenPlanta[]> {
    const { data, error } = await supabase.from('resumen_plantas').select('*').eq('paciente_id', pacienteId)
    lanzar(error)
    return ((data ?? []) as ResumenPlanta[]).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  },

  // Linea de tiempo unificada: eventos + aplicaciones + cosechas (mas reciente primero).
  async getLineaTiempo(plantaId: string): Promise<ItemHistoria[]> {
    const [evs, cosechas, aplic] = await Promise.all([
      this.getEventos(plantaId, 300),
      this.getCosechas(),
      supabase.from('aplicaciones').select('id,fecha,categoria,producto,dosis,notas').eq('planta_id', plantaId),
    ])
    const cos = (cosechas as Cosecha[]).filter(c => c.planta_id === plantaId)
    const lista: ItemHistoria[] = [
      ...evs.map(e => ({ id: e.id, tipo: e.tipo, fecha: e.fecha, detalle: e.detalle, foto_url: e.foto_url })),
      ...(((aplic as any).data ?? []) as any[]).map(a => ({
        id: a.id, tipo: 'Aplicacion', fecha: a.fecha, foto_url: null,
        detalle: [a.categoria, a.producto, a.dosis, a.notas].filter(Boolean).join(' · '),
      })),
      ...cos.map(c => ({
        id: c.id, tipo: 'Cosecha', fecha: c.fecha, esCosecha: true, foto_url: null,
        detalle: [c.peso_seco_g ? `${c.peso_seco_g}g secos` : null, c.peso_humedo_g ? `${c.peso_humedo_g}g húmedos` : null,
          c.valoracion ? `★ ${c.valoracion}/10` : null, c.notas_sabor, c.notas_curado].filter(Boolean).join(' · ') || 'Cosecha',
      })),
    ]
    lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
    return lista
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

  // --- fotos ---
  async subirFoto(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(nombre, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg',
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
    return data.publicUrl
  },

  // --- estadisticas ---
  async getEstadisticasCosecha(): Promise<EstadisticaGenetica[]> {
    const { data, error } = await supabase
      .from('cosechas')
      .select('peso_seco_g, peso_humedo_g, valoracion, plantas:planta_id (genetica_id, geneticas:genetica_id (nombre))')
    lanzar(error)
    const acc: Record<string, EstadisticaGenetica> = {}
    for (const c of (data ?? []) as any[]) {
      const nombre = c.plantas?.geneticas?.nombre ?? 'Sin genética'
      const e = acc[nombre] ?? (acc[nombre] = { genetica: nombre, cosechas: 0, peso_seco_g: 0, peso_humedo_g: 0, valoraciones: [] })
      e.cosechas++
      e.peso_seco_g += c.peso_seco_g ?? 0
      e.peso_humedo_g += c.peso_humedo_g ?? 0
      if (c.valoracion != null) e.valoraciones.push(c.valoracion)
    }
    return Object.values(acc).sort((a, b) => b.peso_seco_g - a.peso_seco_g)
  },
}

export interface EstadisticaGenetica {
  genetica: string
  cosechas: number
  peso_seco_g: number
  peso_humedo_g: number
  valoraciones: number[]
}
