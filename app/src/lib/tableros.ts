// Capa de datos + cálculos del Tablero eléctrico.
// tableros = cabecera; tableros_circuitos = cada carga/línea.
// Los cálculos (corriente, protección y cable sugeridos) son orientativos:
// dimensionamiento final SIEMPRE lo valida un matriculado (AEA 90364).

import { supabase } from './supabase'

export type TipoCircuito =
  | 'luz' | 'ac' | 'deshumi' | 'ventilacion' | 'extraccion'
  | 'bomba' | 'co2' | 'osmosis' | 'otro'

export const TIPOS_CIRCUITO: { valor: TipoCircuito; label: string; inductiva: boolean }[] = [
  { valor: 'luz', label: 'Iluminación', inductiva: false },
  { valor: 'ac', label: 'Aire acondicionado', inductiva: true },
  { valor: 'deshumi', label: 'Deshumidificador', inductiva: true },
  { valor: 'ventilacion', label: 'Ventilación', inductiva: true },
  { valor: 'extraccion', label: 'Extracción', inductiva: true },
  { valor: 'bomba', label: 'Bomba', inductiva: true },
  { valor: 'co2', label: 'CO₂', inductiva: false },
  { valor: 'osmosis', label: 'Ósmosis', inductiva: true },
  { valor: 'otro', label: 'Otro', inductiva: false },
]

export const TENSION_LINEA = 220 // V, monofásico AR

export interface Tablero {
  id: string
  nombre: string
  ubicacion: string | null
  tension: 'mono' | 'tri'
  acometida_a: number | null
  proteccion_general: string | null
  notas: string | null
  creado_en: string
}

export interface Circuito {
  id: string
  tablero_id: string
  orden: number
  nombre: string
  tipo: TipoCircuito
  potencia_w: number | null
  corriente_a: number | null
  proteccion: string | null
  contactor: string | null
  seccion_cable_mm2: number | null
  sala: string | null
  notas: string | null
  creado_en: string
}

// --- Cálculos orientativos ---------------------------------------------------

// Corriente nominal: usa la cargada, o la estima de la potencia (I = P / V).
export function corrienteNominal(c: Pick<Circuito, 'corriente_a' | 'potencia_w'>): number | null {
  if (c.corriente_a != null) return c.corriente_a
  if (c.potencia_w != null) return c.potencia_w / TENSION_LINEA
  return null
}

// Térmica sugerida: primer valor normalizado >= corriente nominal (con 25% de margen).
const TERMICAS = [6, 10, 16, 20, 25, 32, 40, 50, 63]
export function termicaSugerida(inom: number | null): number | null {
  if (inom == null) return null
  const objetivo = inom * 1.25
  return TERMICAS.find(t => t >= objetivo) ?? null
}

// Sección de cable sugerida (mm²) según corriente nominal — tabla simplificada
// para instalación monofásica embutida en caño. Orientativo.
const CABLES: { hasta: number; mm2: number }[] = [
  { hasta: 15, mm2: 1.5 },
  { hasta: 21, mm2: 2.5 },
  { hasta: 27, mm2: 4 },
  { hasta: 36, mm2: 6 },
  { hasta: 50, mm2: 10 },
  { hasta: 68, mm2: 16 },
]
export function cableSugerido(inom: number | null): number | null {
  if (inom == null) return null
  return CABLES.find(c => inom <= c.hasta)?.mm2 ?? 25
}

// ¿La carga necesita contactor? Inductivas > ~10A (arranque) sí.
export function necesitaContactor(c: Pick<Circuito, 'tipo'> & { inom: number | null }): boolean {
  const info = TIPOS_CIRCUITO.find(t => t.valor === c.tipo)
  if (!info?.inductiva) return false
  return (c.inom ?? 0) >= 3 // motores: contactor casi siempre
}

export interface ResumenTablero {
  potenciaTotalW: number
  corrienteTotalA: number
  acometidaSugeridaA: number | null
  circuitos: number
}

export function resumenTablero(circuitos: Circuito[]): ResumenTablero {
  let potencia = 0
  let corriente = 0
  for (const c of circuitos) {
    if (c.potencia_w != null) potencia += c.potencia_w
    const i = corrienteNominal(c)
    if (i != null) corriente += i
  }
  return {
    potenciaTotalW: potencia,
    corrienteTotalA: corriente,
    acometidaSugeridaA: termicaSugerida(corriente),
    circuitos: circuitos.length,
  }
}

// --- CRUD --------------------------------------------------------------------

export const tablerosService = {
  async listar(): Promise<Tablero[]> {
    const { data, error } = await supabase.from('tableros').select('*').order('creado_en', { ascending: true })
    if (error) throw error
    return (data ?? []) as Tablero[]
  },

  async crear(t: Partial<Tablero>): Promise<Tablero> {
    const { data, error } = await supabase.from('tableros').insert(t).select().single()
    if (error) throw error
    return data as Tablero
  },

  async actualizar(id: string, t: Partial<Tablero>): Promise<void> {
    const { error } = await supabase.from('tableros').update(t).eq('id', id)
    if (error) throw error
  },

  async borrar(id: string): Promise<void> {
    const { error } = await supabase.from('tableros').delete().eq('id', id)
    if (error) throw error
  },

  async circuitos(tableroId: string): Promise<Circuito[]> {
    const { data, error } = await supabase
      .from('tableros_circuitos').select('*').eq('tablero_id', tableroId)
      .order('orden', { ascending: true })
    if (error) throw error
    return (data ?? []) as Circuito[]
  },

  async crearCircuito(c: Partial<Circuito>): Promise<Circuito> {
    const { data, error } = await supabase.from('tableros_circuitos').insert(c).select().single()
    if (error) throw error
    return data as Circuito
  },

  async actualizarCircuito(id: string, c: Partial<Circuito>): Promise<void> {
    const { error } = await supabase.from('tableros_circuitos').update(c).eq('id', id)
    if (error) throw error
  },

  async borrarCircuito(id: string): Promise<void> {
    const { error } = await supabase.from('tableros_circuitos').delete().eq('id', id)
    if (error) throw error
  },
}
