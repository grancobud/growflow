// snapshotService — acceso a `trazabilidad_snapshot` y RPCs de recálculo.
// Triggers de BD (lotes / registros_trazabilidad) mantienen los snapshots al día,
// pero también exponemos recálculo manual para edición admin / debugging.

import { supabase } from './supabase'

export type TrazabilidadSnapshot = {
  id: string
  camada: string
  codigo_pm: string | null
  codigo_cl: string | null
  codigo_vg_first: string | null
  codigo_vg_last: string | null
  codigo_fl_first: string | null
  codigo_fl_last: string | null
  codigo_cds_first: string | null
  codigo_cds_last: string | null
  codigo_alm: string | null
  codigo_dep_first: string | null
  codigo_dep_last: string | null
  anio: string | null
  pm_codigo: string | null
  cl_codigo: string | null
  linea: string | null
  sistema: string | null
  sala: string | null
  sub_grupo: string | null
  yield_kg: number | null
  gramos_trim: number | null
  gramos_alm_capado: number | null
  bolsas_calculadas: number | null
  cuadros_secado: number | null
  plantas_madre: number | null
  plantas_esqueje: number | null
  plantas_vege: number | null
  plantas_flora: number | null
  plantas_cosechadas: number | null
  fecha_pm_ingreso: string | null
  fecha_esqueje_inicio: string | null
  fecha_esqueje_fin: string | null
  fecha_vege_inicio: string | null
  fecha_vege_fin: string | null
  fecha_flora_inicio: string | null
  fecha_flora_fin: string | null
  fecha_cosecha: string | null
  fecha_secado_inicio: string | null
  fecha_secado_fin: string | null
  fecha_trim: string | null
  fecha_cuarentena: string | null
  fecha_frac: string | null
  fecha_dep: string | null
  estado: string
  stage_actual: string | null
  total_dias_efectivos: number | null
  fuente: Record<string, any>
  notas: string | null
  editado_por: string | null
  ultima_recalculacion: string
  created_at: string
  updated_at: string
}

function normCamada(c: string | number): string {
  const s = String(c).trim()
  return s.startsWith('C') || s.startsWith('c') ? s.toUpperCase() : `C${s}`
}

export async function getSnapshot(camada: string | number): Promise<TrazabilidadSnapshot | null> {
  const c = normCamada(camada)
  const { data, error } = await supabase
    .from('trazabilidad_snapshot')
    .select('*')
    .eq('camada', c)
    .maybeSingle()
  if (error) {
    console.warn('getSnapshot error', c, error.message)
    return null
  }
  return data as TrazabilidadSnapshot | null
}

export async function getAllSnapshots(): Promise<TrazabilidadSnapshot[]> {
  const { data, error } = await supabase
    .from('trazabilidad_snapshot')
    .select('*')
    .order('camada', { ascending: true })
  if (error) {
    console.warn('getAllSnapshots error', error.message)
    return []
  }
  return (data || []) as TrazabilidadSnapshot[]
}

export async function recalcularSnapshot(camada: string | number): Promise<TrazabilidadSnapshot | null> {
  const c = normCamada(camada)
  const { data, error } = await supabase.rpc('recalcular_snapshot_camada', { p_camada: c })
  if (error) {
    console.error('recalcularSnapshot error', c, error.message)
    throw error
  }
  return (data as TrazabilidadSnapshot) || null
}

export async function recalcularTodos(): Promise<Array<{ camada: string; ok: boolean; error: string | null }>> {
  const { data, error } = await supabase.rpc('recalcular_todos_snapshots')
  if (error) {
    console.error('recalcularTodos error', error.message)
    throw error
  }
  return (data as any[]) || []
}

export async function updateSnapshotManual(
  camada: string | number,
  patch: Partial<Pick<TrazabilidadSnapshot, 'yield_kg' | 'gramos_trim' | 'gramos_alm_capado' | 'bolsas_calculadas' | 'notas' | 'fuente'>>,
): Promise<TrazabilidadSnapshot | null> {
  const c = normCamada(camada)
  const { data, error } = await supabase
    .from('trazabilidad_snapshot')
    .update(patch)
    .eq('camada', c)
    .select('*')
    .maybeSingle()
  if (error) {
    console.error('updateSnapshotManual error', c, error.message)
    throw error
  }
  return data as TrazabilidadSnapshot | null
}
