// Capa de datos del Calendario. Agrega en un solo lugar todos los eventos del
// cultivo (eventos de planta, riegos, aplicaciones, cosechas, mantenimientos) +
// los recordatorios propios con repeticion (que se expanden a ocurrencias).

import { supabase } from './supabase'

export type TipoCal =
  | 'Riego' | 'Fertilizacion' | 'Poda' | 'Trasplante' | 'Fumigacion'
  | 'Germinacion' | 'Cosecha' | 'Mantenimiento' | 'CambioFase' | 'Recordatorio' | 'Otro'

// Paleta suave/delicada: tonos pastel que se ven bien sobre fondo oscuro.
export const COLOR_CAL: Record<TipoCal, string> = {
  Riego: '#8fb8e6',          // azul empolvado
  Fertilizacion: '#a8cf8e',  // verde salvia
  Poda: '#bcaee0',           // lavanda
  Trasplante: '#8ed0c6',     // verde agua
  Fumigacion: '#e6a99b',     // terracota suave
  Germinacion: '#9ad6a0',    // verde brote
  Cosecha: '#e3c486',        // dorado trigo
  Mantenimiento: '#d2bfa0', // arena
  CambioFase: '#c9b8e8',     // lila
  Recordatorio: '#8fcabd',   // menta
  Otro: '#b7b3c2',           // gris lavanda
}

export const TIPOS_CAL: TipoCal[] = [
  'Riego', 'Fertilizacion', 'Poda', 'Trasplante', 'Fumigacion',
  'Germinacion', 'Cosecha', 'Mantenimiento', 'Recordatorio', 'Otro',
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
  fuente: 'evento' | 'riego' | 'aplicacion' | 'cosecha' | 'mantenimiento' | 'recordatorio' | 'planta'
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
    const [eventos, riegos, aplic, cosechas, mantes, recs, plantas, geneticas] = await Promise.all([
      supabase.from('eventos').select('id,tipo,fecha,detalle,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('riegos').select('id,fecha,ppm,ph,escurrio,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('aplicaciones').select('id,fecha,categoria,producto,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('cosechas').select('id,fecha,peso_seco_g,planta_id').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('mantenimientos').select('id,equipo,tipo,fecha_realizado,proximo,insumo_id'),
      supabase.from('recordatorios').select('*'),
      supabase.from('plantas').select('id,apodo,genetica_id,fecha_germinacion,fecha_cosecha,activa'),
      supabase.from('geneticas').select('id,nombre,tiempo_vege_dias,tiempo_flora_dias,inicio_flora'),
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

    // Germinacion y cosecha (estimada) por variedad. La cosecha se calcula desde
    // la genetica: inicio_flora + flora, o si no germinacion + vege + flora.
    const genById = new Map((geneticas.data ?? []).map((g: any) => [g.id, g]))
    // Agrupa por (tipo, fecha, variedad) para no llenar el calendario con una
    // entrada por planta: muestra "Germinación · Trululu ×4".
    const agrup = new Map<string, { tipo: 'Germinacion' | 'Cosecha'; fecha: string; variedad: string; n: number; estimada: boolean }>()
    const sumar = (tipo: 'Germinacion' | 'Cosecha', fecha: string | null, variedad: string, estimada: boolean) => {
      if (!fecha || fecha < desde || fecha > hasta) return
      const k = `${tipo}|${fecha}|${variedad}`
      const cur = agrup.get(k)
      if (cur) cur.n++
      else agrup.set(k, { tipo, fecha, variedad, n: 1, estimada })
    }
    for (const p of (plantas.data ?? []) as any[]) {
      if (p.activa === false) continue
      const g: any = p.genetica_id ? genById.get(p.genetica_id) : null
      const variedad = g?.nombre || 'Sin variedad'
      // Germinacion (fecha real de la planta)
      sumar('Germinacion', p.fecha_germinacion ?? null, variedad, false)
      // Cosecha: usa la fecha cargada si existe; si no, la estima desde la genetica
      let cosecha: string | null = p.fecha_cosecha ?? null
      let estimada = false
      if (!cosecha && g) {
        const flora = Number(g.tiempo_flora_dias) || 0
        if (g.inicio_flora && flora) { cosecha = addDays(g.inicio_flora, flora); estimada = true }
        else if (p.fecha_germinacion && flora) {
          const vege = Number(g.tiempo_vege_dias) || 0
          cosecha = addDays(p.fecha_germinacion, vege + flora); estimada = true
        }
      }
      sumar('Cosecha', cosecha, variedad, estimada)
    }
    for (const [k, v] of agrup) {
      const base = v.tipo === 'Germinacion' ? 'Germinación' : 'Cosecha'
      const titulo = `${base} · ${v.variedad}${v.n > 1 ? ` ×${v.n}` : ''}`
      const detalle = v.tipo === 'Cosecha' && v.estimada
        ? `Estimada (vege + flora desde germinación o inicio de flora). ${v.n} planta${v.n > 1 ? 's' : ''}.`
        : `${v.n} planta${v.n > 1 ? 's' : ''}.`
      out.push({ id: `pl:${k}`, titulo, fecha: v.fecha, tipo: v.tipo, color: COLOR_CAL[v.tipo], fuente: 'planta', detalle, editable: false })
    }
    return out
  },

  // Borra un evento del calendario desde su tabla de origen. El id del EventoCal
  // viene con prefijo (ev:/ri:/ap:/co:/ma:/re:) + uuid; aca se extrae el uuid real.
  async eliminarEvento(fuente: EventoCal['fuente'], idCal: string): Promise<void> {
    const partes = idCal.split(':')
    const id = partes[1]
    const tabla: Record<string, string> = {
      evento: 'eventos', riego: 'riegos', aplicacion: 'aplicaciones',
      cosecha: 'cosechas', mantenimiento: 'mantenimientos', recordatorio: 'recordatorios',
    }
    const t = tabla[fuente]
    if (!t || !id) throw new Error('No se puede borrar este evento')
    const { error } = await supabase.from(t).delete().eq('id', id)
    if (error) throw error
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
