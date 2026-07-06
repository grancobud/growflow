// Capa de datos de Econometria › Instalaciones e Insumos (capex del grow).
// Catalogo de equipos/insumos de instalacion por sistema, proveedores reusables
// y presupuestos versionados. Separado del stock operativo (lib/stock).

import { supabase } from './supabase'

// Sistemas del grow = sub-secciones de la pestaña. Texto libre en DB, esta lista
// alimenta selects y el agrupado. Si agregas uno, sumalo aca.
export const SISTEMAS = [
  'Riego', 'CO2', 'Iluminacion', 'Ventilacion', 'Climatizacion',
  'Automatizacion', 'Estructura', 'Medicion', 'Electrico', 'Seguridad', 'Otro',
] as const
export type Sistema = typeof SISTEMAS[number]

export const UNIDADES_INST = ['u', 'm', 'kg', 'L', 'rollo', 'caja', 'par', 'kit'] as const

export interface ProveedorInstalacion {
  id: string
  nombre: string
  contacto: string | null
  url: string | null
  zona: string | null
  notas: string | null
  creado_en: string
}

export interface ItemInstalacion {
  id: string
  nombre: string
  sistema: string
  marca: string | null
  modelo: string | null
  proveedor_id: string | null
  precio: number | null
  unidad: string | null
  specs: string | null
  url: string | null
  notas: string | null
  creado_en: string
  actualizado_en: string
}

export interface Presupuesto {
  id: string
  nombre: string
  notas: string | null
  creado_en: string
  actualizado_en: string
}

export interface PresupuestoItem {
  id: string
  presupuesto_id: string
  item_id: string | null
  nombre: string
  sistema: string
  proveedor: string | null
  precio_unit: number
  cantidad: number
  notas: string | null
  creado_en: string
}

// Total de una linea de presupuesto (precio unitario * cantidad).
export function totalLinea(l: Pick<PresupuestoItem, 'precio_unit' | 'cantidad'>): number {
  return Number(l.precio_unit || 0) * Number(l.cantidad ?? 1)
}

// Suma total de un conjunto de lineas.
export function totalPresupuesto(lineas: PresupuestoItem[]): number {
  return lineas.reduce((s, l) => s + totalLinea(l), 0)
}

// Agrupa lineas por sistema y devuelve [{ sistema, lineas, total }] ordenado
// segun SISTEMAS (los desconocidos van al final).
export function porSistema<T extends { sistema: string }>(items: T[]): { sistema: string; items: T[] }[] {
  const orden = new Map(SISTEMAS.map((s, i) => [s as string, i]))
  const grupos = new Map<string, T[]>()
  for (const it of items) {
    const k = it.sistema || 'Otro'
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(it)
  }
  return [...grupos.entries()]
    .sort((a, b) => (orden.get(a[0]) ?? 999) - (orden.get(b[0]) ?? 999))
    .map(([sistema, items]) => ({ sistema, items }))
}

// Total por sistema de un set de lineas de presupuesto.
export function totalesPorSistema(lineas: PresupuestoItem[]): { sistema: string; total: number }[] {
  return porSistema(lineas).map(g => ({ sistema: g.sistema, total: totalPresupuesto(g.items) }))
}

export const instalacionesService = {
  // --- proveedores ---
  async getProveedores(): Promise<ProveedorInstalacion[]> {
    const { data, error } = await supabase.from('proveedores_instalacion').select('*').order('nombre')
    if (error) throw error
    return (data ?? []) as ProveedorInstalacion[]
  },
  async crearProveedor(p: Partial<ProveedorInstalacion>): Promise<ProveedorInstalacion> {
    const { data, error } = await supabase.from('proveedores_instalacion').insert(p).select().single()
    if (error) throw error
    return data as ProveedorInstalacion
  },
  async actualizarProveedor(id: string, p: Partial<ProveedorInstalacion>): Promise<void> {
    const { error } = await supabase.from('proveedores_instalacion').update(p).eq('id', id)
    if (error) throw error
  },
  async eliminarProveedor(id: string): Promise<void> {
    const { error } = await supabase.from('proveedores_instalacion').delete().eq('id', id)
    if (error) throw error
  },

  // --- items del catalogo ---
  async getItems(): Promise<ItemInstalacion[]> {
    const { data, error } = await supabase.from('instalaciones_items').select('*').order('nombre')
    if (error) throw error
    return (data ?? []) as ItemInstalacion[]
  },
  async crearItem(i: Partial<ItemInstalacion>): Promise<ItemInstalacion> {
    const { data, error } = await supabase.from('instalaciones_items').insert(i).select().single()
    if (error) throw error
    return data as ItemInstalacion
  },
  async actualizarItem(id: string, i: Partial<ItemInstalacion>): Promise<void> {
    const { error } = await supabase.from('instalaciones_items')
      .update({ ...i, actualizado_en: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
  async eliminarItem(id: string): Promise<void> {
    const { error } = await supabase.from('instalaciones_items').delete().eq('id', id)
    if (error) throw error
  },

  // --- presupuestos ---
  async getPresupuestos(): Promise<Presupuesto[]> {
    const { data, error } = await supabase.from('presupuestos_instalacion').select('*').order('creado_en', { ascending: false })
    if (error) throw error
    return (data ?? []) as Presupuesto[]
  },
  async crearPresupuesto(p: Partial<Presupuesto>): Promise<Presupuesto> {
    const { data, error } = await supabase.from('presupuestos_instalacion').insert(p).select().single()
    if (error) throw error
    return data as Presupuesto
  },
  async actualizarPresupuesto(id: string, p: Partial<Presupuesto>): Promise<void> {
    const { error } = await supabase.from('presupuestos_instalacion')
      .update({ ...p, actualizado_en: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
  async eliminarPresupuesto(id: string): Promise<void> {
    const { error } = await supabase.from('presupuestos_instalacion').delete().eq('id', id)
    if (error) throw error
  },

  // --- lineas de presupuesto ---
  async getLineas(presupuestoId: string): Promise<PresupuestoItem[]> {
    const { data, error } = await supabase.from('presupuesto_instalacion_items')
      .select('*').eq('presupuesto_id', presupuestoId).order('creado_en')
    if (error) throw error
    return (data ?? []) as PresupuestoItem[]
  },
  async agregarLinea(l: Partial<PresupuestoItem>): Promise<PresupuestoItem> {
    const { data, error } = await supabase.from('presupuesto_instalacion_items').insert(l).select().single()
    if (error) throw error
    return data as PresupuestoItem
  },
  async actualizarLinea(id: string, l: Partial<PresupuestoItem>): Promise<void> {
    const { error } = await supabase.from('presupuesto_instalacion_items').update(l).eq('id', id)
    if (error) throw error
  },
  async eliminarLinea(id: string): Promise<void> {
    const { error } = await supabase.from('presupuesto_instalacion_items').delete().eq('id', id)
    if (error) throw error
  },
}
