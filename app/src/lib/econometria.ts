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

// ---------------------------------------------------------------------------
// Modelo de costos real: el inventario dividido en lo que se amortiza y lo que
// se gasta. Antes el costo/g daba $0 porque no se usaba nada del Stock, y el
// "CAPEX" salia del catalogo de Instalaciones, que es un presupuesto de cosas
// que NO estan compradas. Aca solo cuenta lo que hay instalado.
// ---------------------------------------------------------------------------

export type ClaseCosto = 'capex' | 'consumible' | 'recurrente'

/** Insumo del Stock, con lo justo para costear. */
export interface InsumoCosto {
  id: string
  nombre: string
  categoria: string | null
  precio: number | null
  clase_costo: ClaseCosto | null
}

/** Meses de vida util por categoria; define cuanto pesa el equipo por mes. */
export type VidaUtil = Record<string, number>

export const VIDA_UTIL_DEFECTO: VidaUtil = {
  Iluminacion: 48, Climatizacion: 72, Riego: 60, Medicion: 36,
  Herramienta: 36, CO2: 60, Otro: 60, Sustrato: 12, Fertilizante: 12, Sanidad: 12,
}
const VIDA_UTIL_FALLBACK = 60

/** Si el insumo no tiene clase asignada se deduce de la categoria. */
export function claseDe(i: InsumoCosto): ClaseCosto {
  if (i.clase_costo) return i.clase_costo
  const c = i.categoria ?? ''
  if (['Fertilizante', 'Sustrato', 'Sanidad'].includes(c)) return 'consumible'
  if (/recarga/i.test(i.nombre)) return 'consumible'
  return 'capex'
}

/** Una pieza de equipo con lo que aporta al mes. */
export interface ItemAmortizado {
  id: string
  nombre: string
  valor: number
  porMes: number
}

export interface LineaAmortizacion {
  categoria: string
  valor: number        // lo invertido
  meses: number        // vida util
  porMes: number       // cuanto pesa por mes
  items: number
  detalle: ItemAmortizado[]   // para poder rastrear de donde sale el numero
}

/** Reparte el equipo instalado a lo largo de su vida util. */
export function amortizacion(insumos: InsumoCosto[], vida: VidaUtil): LineaAmortizacion[] {
  const porCat = new Map<string, InsumoCosto[]>()
  for (const i of insumos) {
    if (claseDe(i) !== 'capex' || !i.precio) continue
    const cat = i.categoria ?? 'Otro'
    porCat.set(cat, [...(porCat.get(cat) ?? []), i])
  }
  return [...porCat.entries()]
    .map(([categoria, lista]) => {
      const meses = vida[categoria] ?? VIDA_UTIL_FALLBACK
      const valor = lista.reduce((s, i) => s + Number(i.precio), 0)
      return {
        categoria, valor, meses,
        porMes: meses > 0 ? valor / meses : 0,
        items: lista.length,
        detalle: lista
          .map(i => ({
            id: i.id, nombre: i.nombre, valor: Number(i.precio),
            porMes: meses > 0 ? Number(i.precio) / meses : 0,
          }))
          .sort((a, b) => b.valor - a.valor),
      }
    })
    .sort((a, b) => b.porMes - a.porMes)
}

/** Consumibles del Stock con su equivalente mensual, para mostrar el detalle. */
export function detalleConsumibles(insumos: InsumoCosto[], mesesCiclo: number): ItemAmortizado[] {
  return insumos
    .filter(i => claseDe(i) === 'consumible' && i.precio)
    .map(i => ({
      id: i.id, nombre: i.nombre, valor: Number(i.precio),
      porMes: mesesCiclo > 0 ? Number(i.precio) / mesesCiclo : Number(i.precio),
    }))
    .sort((a, b) => b.valor - a.valor)
}

/** Consumibles del Stock, prorrateados al mes segun la duracion del ciclo. */
export function consumiblesPorMes(insumos: InsumoCosto[], mesesCiclo: number): number {
  const total = insumos
    .filter(i => claseDe(i) === 'consumible' && i.precio)
    .reduce((s, i) => s + Number(i.precio), 0)
  return mesesCiclo > 0 ? total / mesesCiclo : total
}

export interface ResumenEconomico {
  amortizacionMes: number
  fijosMes: number
  variablesMes: number
  consumiblesMes: number
  totalMes: number
  totalCiclo: number
  capexInvertido: number
  gramos: number
  costoPorGramo: number | null
  costoPorCiclo: number
  lineas: LineaAmortizacion[]
  consumibles: ItemAmortizado[]
  costosFijos: Costo[]
  costosVariables: Costo[]
  mesesCiclo: number
  // --- escenario "si compro lo que falta" ---
  /** Total pendiente de la lista de Insumos faltantes (no comprados). */
  faltantes: number
  /** El ciclo sumandole lo que todavia falta comprar. */
  totalCicloConFaltantes: number
  costoPorGramoConFaltantes: number | null
}

/**
 * Junta todo: equipo amortizado + gastos fijos + variables + consumibles,
 * y lo divide por los gramos realmente cosechados.
 */
export function resumenEconomico(opts: {
  insumos: InsumoCosto[]
  costos: Costo[]
  vida: VidaUtil
  mesesCiclo: number
  gramosCosechados: number
  /**
   * Total pendiente de la lista de Insumos faltantes. Se mantiene APARTE del
   * costo real: son cosas que todavía no se compraron, así que meterlas en el
   * costo del ciclo mezclaría lo que gastaste con lo que pensás gastar. Se
   * expone como un segundo número para poder ver las dos cosas.
   */
  faltantes?: number
}): ResumenEconomico {
  const { insumos, costos, vida, mesesCiclo, gramosCosechados, faltantes = 0 } = opts
  const lineas = amortizacion(insumos, vida)
  const amortizacionMes = lineas.reduce((s, l) => s + l.porMes, 0)
  const fijosMes = costos.filter(c => c.tipo === 'fijo')
    .reduce((s, c) => s + mensualEquivalente(c, mesesCiclo), 0)
  const variablesMes = costos.filter(c => c.tipo === 'variable')
    .reduce((s, c) => s + mensualEquivalente(c, mesesCiclo), 0)
  const consumiblesMes = consumiblesPorMes(insumos, mesesCiclo)

  const totalMes = amortizacionMes + fijosMes + variablesMes + consumiblesMes
  const totalCiclo = totalMes * mesesCiclo
  const capexInvertido = insumos
    .filter(i => claseDe(i) === 'capex' && i.precio)
    .reduce((s, i) => s + Number(i.precio), 0)

  const totalCicloConFaltantes = totalCiclo + faltantes

  return {
    amortizacionMes, fijosMes, variablesMes, consumiblesMes,
    totalMes, totalCiclo, capexInvertido,
    gramos: gramosCosechados,
    costoPorGramo: gramosCosechados > 0 ? totalCiclo / gramosCosechados : null,
    costoPorCiclo: totalCiclo,
    faltantes,
    totalCicloConFaltantes,
    costoPorGramoConFaltantes: gramosCosechados > 0 ? totalCicloConFaltantes / gramosCosechados : null,
    lineas,
    consumibles: detalleConsumibles(insumos, mesesCiclo),
    costosFijos: costos.filter(c => c.tipo === 'fijo'),
    costosVariables: costos.filter(c => c.tipo === 'variable'),
    mesesCiclo,
  }
}

/** Gramos necesarios en el ciclo para que el costo/g baje del objetivo. */
export function gramosParaCosto(totalCiclo: number, objetivoPorGramo: number): number {
  return objetivoPorGramo > 0 ? totalCiclo / objetivoPorGramo : 0
}

export const configService = {
  async get<T>(clave: string, porDefecto: T): Promise<T> {
    const { data, error } = await supabase
      .from('econometria_config').select('valor').eq('clave', clave).maybeSingle()
    if (error) throw error
    return ((data as { valor: T } | null)?.valor) ?? porDefecto
  },
  async set(clave: string, valor: unknown): Promise<void> {
    const { error } = await supabase.from('econometria_config')
      .upsert({ clave, valor, actualizado_en: new Date().toISOString() })
    if (error) throw error
  },
}
