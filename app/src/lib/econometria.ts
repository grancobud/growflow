// Capa de datos de Econometria: costos fijos y variables del grow.
// El valor de los insumos sale del inventario (lib/stock), aca van el resto
// de los costos del cultivo clasificados en fijos vs variables.

import { supabase } from './supabase'

export type TipoCosto = 'fijo' | 'variable'

export type Periodicidad = 'unico' | 'mensual' | 'bimestral' | 'por_ciclo' | 'anual'

export const PERIODICIDADES: { valor: Periodicidad; label: string }[] = [
  { valor: 'unico', label: 'Único' },
  { valor: 'mensual', label: 'Mensual' },
  { valor: 'bimestral', label: 'Bimestral' },
  { valor: 'por_ciclo', label: 'Por ciclo' },
  { valor: 'anual', label: 'Anual' },
]

export const labelPeriodicidad = (p: Periodicidad) =>
  PERIODICIDADES.find(x => x.valor === p)?.label ?? p

// Categorias sugeridas (texto libre igual, esto es solo para el datalist).
export const CATEGORIAS_COSTO_FIJO = [
  'Alquiler', 'Luz (abono)', 'Internet', 'Amortización equipos', 'Seguro', 'Otro',
]
export const CATEGORIAS_COSTO_VARIABLE = [
  'Nutrientes', 'Sustrato', 'Luz (consumo)', 'Agua', 'Semillas/Clones',
  'Sanidad', 'Mano de obra', 'Otro',
]

export interface Costo {
  id: string
  nombre: string
  tipo: TipoCosto
  categoria: string | null
  monto: number
  periodicidad: Periodicidad
  cantidad: number | null
  notas: string | null
  creado_en: string
  actualizado_en: string
}

// Total de la fila (monto * cantidad).
export function totalCosto(c: Costo): number {
  return Number(c.monto || 0) * Number(c.cantidad ?? 1)
}

// Equivalente mensual de un costo segun su periodicidad.
// `mesesCiclo` = duracion estimada de un ciclo en meses (para 'por_ciclo').
// Los costos 'unico' no aportan al mensual (son inversion inicial, no recurrente).
export function mensualEquivalente(c: Costo, mesesCiclo: number): number {
  const total = totalCosto(c)
  switch (c.periodicidad) {
    case 'mensual': return total
    case 'bimestral': return total / 2
    case 'anual': return total / 12
    case 'por_ciclo': return mesesCiclo > 0 ? total / mesesCiclo : total
    case 'unico': return 0
    default: return total
  }
}

export const econometriaService = {
  async getCostos(): Promise<Costo[]> {
    const { data, error } = await supabase.from('costos').select('*').order('tipo').order('nombre')
    if (error) throw error
    return (data ?? []) as Costo[]
  },
  async crearCosto(c: Partial<Costo>): Promise<Costo> {
    const { data, error } = await supabase.from('costos').insert(c).select().single()
    if (error) throw error
    return data as Costo
  },
  async actualizarCosto(id: string, c: Partial<Costo>): Promise<void> {
    const { error } = await supabase.from('costos')
      .update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
  async eliminarCosto(id: string): Promise<void> {
    const { error } = await supabase.from('costos').delete().eq('id', id)
    if (error) throw error
  },
}
