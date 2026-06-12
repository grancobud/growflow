// Alertas pasivas: silos sin actividad reciente. Calcula en cliente.

import { supabase } from './supabase'

export type PassiveSeverity = 'info' | 'warn'

export interface PassiveAlert {
  id: string
  severity: PassiveSeverity
  title: string
  detail: string
  ctaLabel: string
  ctaPath: string
}

interface MaxFechaResult {
  table: string
  fechaCol: string
  lastDate: Date | null
}

async function getMaxFecha(table: string, fechaCol: string): Promise<MaxFechaResult> {
  const { data, error } = await supabase
    .from(table)
    .select(fechaCol)
    .order(fechaCol, { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return { table, fechaCol, lastDate: null }
  const v = (data as unknown as Record<string, unknown>)[fechaCol]
  return { table, fechaCol, lastDate: v ? new Date(String(v)) : null }
}

function diasDesde(d: Date | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

export async function getPassiveAlerts(): Promise<PassiveAlert[]> {
  const checks = await Promise.all([
    getMaxFecha('registros_agua', 'fecha'),
    getMaxFecha('registros_fertilizantes', 'fecha'),
    getMaxFecha('registros_fitosanitarios', 'fecha'),
    getMaxFecha('registros_condiciones_ambientales', 'fecha'),
    getMaxFecha('registros_cosecha', 'fecha'),
    getMaxFecha('registros_calidad', 'fecha'),
  ])

  const alerts: PassiveAlert[] = []
  const ruleMap: Array<{ key: string; table: string; warnDays: number; tituloSing: string; cta: string; path: string }> = [
    { key: 'agua', table: 'registros_agua', warnDays: 3, tituloSing: 'Riego sin registros', cta: 'Cargar riego', path: '/registros' },
    { key: 'fert', table: 'registros_fertilizantes', warnDays: 7, tituloSing: 'Fertilización sin registros', cta: 'Cargar fertilización', path: '/registros' },
    { key: 'fito', table: 'registros_fitosanitarios', warnDays: 14, tituloSing: 'Sanidad sin registros', cta: 'Cargar sanidad', path: '/registros' },
    { key: 'amb', table: 'registros_condiciones_ambientales', warnDays: 2, tituloSing: 'Ambiente sin registros', cta: 'Cargar ambiente', path: '/registros' },
    { key: 'cos', table: 'registros_cosecha', warnDays: 30, tituloSing: 'Sin actividad de cosecha', cta: 'Ver cosecha', path: '/registros' },
    { key: 'cal', table: 'registros_calidad', warnDays: 14, tituloSing: 'Calidad sin registros', cta: 'Cargar calidad', path: '/metricas' },
  ]

  for (const r of ruleMap) {
    const c = checks.find(x => x.table === r.table)
    if (!c) continue
    const d = diasDesde(c.lastDate)
    if (d == null) {
      alerts.push({
        id: `${r.key}-empty`,
        severity: 'warn',
        title: r.tituloSing,
        detail: 'No hay registros cargados todavía',
        ctaLabel: r.cta,
        ctaPath: r.path,
      })
    } else if (d > r.warnDays) {
      alerts.push({
        id: `${r.key}-stale`,
        severity: d > r.warnDays * 2 ? 'warn' : 'info',
        title: r.tituloSing,
        detail: `Hace ${d} días sin nuevos registros (umbral: ${r.warnDays}d)`,
        ctaLabel: r.cta,
        ctaPath: r.path,
      })
    }
  }

  return alerts
}
