// Capa de datos del Calendario. Agrega en un solo lugar todos los eventos del
// cultivo (eventos de planta, riegos, aplicaciones, cosechas, mantenimientos) +
// los recordatorios propios con repeticion (que se expanden a ocurrencias).

import { supabase } from './supabase'

export type TipoCal =
  | 'Riego' | 'Fertilizacion' | 'Poda' | 'Trasplante' | 'Fumigacion'
  | 'Cosecha' | 'Mantenimiento' | 'CambioFase' | 'Recordatorio' | 'Otro'

export const COLOR_CAL: Record<TipoCal, string> = {
  Riego: '#60a5fa',
  Fertilizacion: '#a3e635',
  Poda: '#a78bfa',
  Trasplante: '#38bdf8',
  Fumigacion: '#ff8a7a',
  Cosecha: '#fbbf24',
  Mantenimiento: '#f59e0b',
  CambioFase: '#c4b5fd',
  Recordatorio: '#2dd4bf',
  Otro: '#8f8f9f',
}

export const TIPOS_CAL: TipoCal[] = [
  'Riego', 'Fertilizacion', 'Poda', 'Trasplante', 'Fumigacion',
  'Cosecha', 'Mantenimiento', 'Recordatorio', 'Otro',
]

export type Repeticion = 'ninguna' | 'diaria' | 'cada_n_dias' | 'semanal' | 'mensual'
export const REPETICIONES: { valor: Repeticion; label: string }[] = [
  { valor: 'ninguna', label: 'No se repite' },
  { valor: 'diaria', label: 'Todos los días' },
  { valor: 'cada_n_dias', label: 'Cada N días' },
  { valor: 'semanal', label: 'Cada semana' },
  { valor: 'mensual', label: 'Cada mes' },
]

export interface Recordatorio {
  id: string
  titulo: string
  tipo: TipoCal
  fecha: string
  hora: string | null
  repeticion: Repeticion
  intervalo: number | null
  hasta: string | null
  planta_id: string | null
  notas: string | null
  hecho: boolean
  creado_en: string
}

// Evento normalizado que consume el calendario (FullCalendar).
export interface EventoCal {
  id: string
  titulo: string
  fecha: string          // YYYY-MM-DD
  tipo: TipoCal
  color: string
  fuente: 'evento' | 'riego' | 'aplicacion' | 'cosecha' | 'mantenimiento' | 'recordatorio'
  detalle?: string
  editable: boolean      // solo los recordatorios se editan/borran desde el calendario
}

// ----- helpers de fechas (YYYY-MM-DD) -----
const dISO = (d: Date) => d.toISOString().slice(0, 10)
const parse = (s: string) => new Date(s + 'T00:00:00')
function addDays(s: string, n: number) { const d = parse(s); d.setDate(d.getDate() + n); return dISO(d) }
function addMonths(s: string, n: number) { const d = parse(s); d.setMonth(d.getMonth() + n); return dISO(d) }

// Expande un recordatorio recurrente a las fechas dentro de [desde, hasta].
function expandir(r: Recordatorio, desde: string, hasta: string): string[] {
  const tope = r.hasta && r.hasta < hasta ? r.hasta : hasta
  if (r.repeticion === 'ninguna') return (r.fecha >= desde && r.fecha <= hasta) ? [r.fecha] : []
  const out: string[] = []
  let cur = r.fecha
  // adelantar hasta la ventana sin loop infinito
  let guard = 0
  const step = () => {
    if (r.repeticion === 'diaria') cur = addDays(cur, 1)
    else if (r.repeticion === 'cada_n_dias') cur = addDays(cur, Math.max(1, r.intervalo || 1))
    else if (r.repeticion === 'semanal') cur = addDays(cur, 7)
    else if (r.repeticion === 'mensual') cur = addMonths(cur, 1)
  }
  while (cur < desde && guard++ < 2000) step()
  while (cur <= tope && guard++ < 2000) { if (cur >= desde) out.push(cur); step() }
  return out
}

export const calendarioService = {
  // Carga y normaliza TODO lo del rango. Las recurrencias se expanden.
  async cargarEventos(desde: string, hasta: string): Promise<EventoCal[]> {
    const [eventos, riegos, aplic, cosechas, mantes, recs, plantas] = await Promise.all([
      supabase.from('eventos').select('id,tipo,fecha,detalle,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('riegos').select('id,fecha,ppm,ph,escurrio,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('aplicaciones').select('id,fecha,categoria,producto,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('cosechas').select('id,fecha,peso_seco_g,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('mantenimientos').select('id,equipo,tipo,fecha_realizado,proximo,insumo_id'),
      supabase.from('recordatorios').select('*'),
      supabase.from('plantas').select('id,apodo,genetica_id'),
    ])
    const out: EventoCal[] = []
    const nombrePlanta = (id: string | null) => {
      if (!id) return ''
      const p = (plantas.data ?? []).find((x: any) => x.id === id)
      return p?.apodo ? `${p.apodo}` : ''
    }
    const mapTipoEvento = (t: string): TipoCal => {
      if (t === 'Riego') return 'Riego'
      if (t === 'Fertilizacion') return 'Fertilizacion'
      if (t === 'Poda') return 'Poda'
      if (t === 'Trasplante') return 'Trasplante'
      if (t === 'CambioFase') return 'CambioFase'
      return 'Otro'
    }

    for (const e of (eventos.data ?? []) as any[]) {
      const tipo = mapTipoEvento(e.tipo)
      out.push({ id: `ev:${e.id}`, titulo: `${e.tipo}${nombrePlanta(e.planta_id) ? ' ' + nombrePlanta(e.planta_id) : ''}`, fecha: e.fecha, tipo, color: COLOR_CAL[tipo], fuente: 'evento', detalle: e.detalle, editable: false })
    }
    for (const r of (riegos.data ?? []) as any[]) {
      const d = [r.ppm ? `${r.ppm}ppm` : '', r.ph ? `pH${r.ph}` : '', r.escurrio ? 'escurrió' : ''].filter(Boolean).join(' · ')
      out.push({ id: `ri:${r.id}`, titulo: `Riego ${nombrePlanta(r.planta_id)}`.trim(), fecha: r.fecha, tipo: 'Riego', color: COLOR_CAL.Riego, fuente: 'riego', detalle: d, editable: false })
    }
    for (const a of (aplic.data ?? []) as any[]) {
      out.push({ id: `ap:${a.id}`, titulo: `${a.categoria} ${nombrePlanta(a.planta_id)}`.trim(), fecha: a.fecha, tipo: 'Fumigacion', color: COLOR_CAL.Fumigacion, fuente: 'aplicacion', detalle: a.producto, editable: false })
    }
    for (const c of (cosechas.data ?? []) as any[]) {
      out.push({ id: `co:${c.id}`, titulo: `Cosecha ${nombrePlanta(c.planta_id)}`.trim(), fecha: c.fecha, tipo: 'Cosecha', color: COLOR_CAL.Cosecha, fuente: 'cosecha', detalle: c.peso_seco_g ? `${c.peso_seco_g}g seco` : undefined, editable: false })
    }
    for (const m of (mantes.data ?? []) as any[]) {
      const nombre = m.equipo || 'Equipo'
      const prox = m.proximo || null
      if (prox && prox >= desde && prox <= hasta) {
        out.push({ id: `ma:${m.id}:p`, titulo: `${m.tipo}: ${nombre}`, fecha: prox, tipo: 'Mantenimiento', color: COLOR_CAL.Mantenimiento, fuente: 'mantenimiento', detalle: 'próximo mantenimiento', editable: false })
      }
      if (m.fecha_realizado && m.fecha_realizado >= desde && m.fecha_realizado <= hasta) {
        out.push({ id: `ma:${m.id}:r`, titulo: `${m.tipo}: ${nombre}`, fecha: m.fecha_realizado, tipo: 'Mantenimiento', color: COLOR_CAL.Mantenimiento, fuente: 'mantenimiento', detalle: 'realizado', editable: false })
      }
    }
    for (const r of (recs.data ?? []) as Recordatorio[]) {
      const fechas = expandir(r, desde, hasta)
      const tipo = (r.tipo as TipoCal) || 'Recordatorio'
      for (const f of fechas) {
        out.push({ id: `re:${r.id}:${f}`, titulo: r.titulo, fecha: f, tipo, color: COLOR_CAL[tipo] || COLOR_CAL.Recordatorio, fuente: 'recordatorio', detalle: r.notas ?? undefined, editable: true })
      }
    }
    return out
  },

  async getRecordatorios(): Promise<Recordatorio[]> {
    const { data, error } = await supabase.from('recordatorios').select('*').order('fecha')
    if (error) throw error
    return (data ?? []) as Recordatorio[]
  },
  async crearRecordatorio(r: Partial<Recordatorio>): Promise<Recordatorio> {
    const { data, error } = await supabase.from('recordatorios').insert(r).select().single()
    if (error) throw error
    return data as Recordatorio
  },
  async actualizarRecordatorio(id: string, r: Partial<Recordatorio>): Promise<void> {
    const { error } = await supabase.from('recordatorios').update(r).eq('id', id)
    if (error) throw error
  },
  async eliminarRecordatorio(id: string): Promise<void> {
    const { error } = await supabase.from('recordatorios').delete().eq('id', id)
    if (error) throw error
  },
}
