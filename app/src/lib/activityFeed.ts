// Cross-sector activity feed: lee `creado_en` de las 12 tablas en paralelo
// y devuelve un stream unificado ordenado desc.

import { supabase } from './supabase'
import {
  SECTORES, SECTOR_KEYS, type ActivityEvent, type SectorKey,
} from './awareness'

interface FetchOptions {
  // Cuantos por tabla pedir (default 10)
  perTable?: number
  // Filtrar a los ultimos N ms (default null = sin filtro)
  sinceMs?: number | null
  // Sectores activos (default todos)
  sectors?: SectorKey[]
}

// Selecciona campos minimos de cada tabla para construir el evento.
function selectFor(sector: SectorKey): string {
  const def = SECTORES[sector]
  const cols = new Set<string>(['id', def.fechaCol, def.createdCol])
  if (def.refField) cols.add(def.refField)
  // Para operaciones agregamos campo extra estandar
  if (sector === 'operaciones') cols.add('codigo_traza')
  if (sector === 'alertas') {
    cols.add('severidad')
    cols.add('camada')
  }
  if (sector === 'cosecha') cols.add('camada')
  if (sector === 'ambiente' || sector === 'trazabilidad') cols.add('camada')
  return Array.from(cols).join(', ')
}

export async function fetchActivityFeed(opts: FetchOptions = {}): Promise<ActivityEvent[]> {
  const perTable = opts.perTable ?? 10
  const sectors = opts.sectors ?? SECTOR_KEYS
  const sinceIso = opts.sinceMs != null
    ? new Date(Date.now() - opts.sinceMs).toISOString()
    : null

  const promises = sectors.map(async (sector): Promise<ActivityEvent[]> => {
    const def = SECTORES[sector]
    let q = supabase
      .from(def.table)
      .select(selectFor(sector))
      .order(def.createdCol, { ascending: false })
      .limit(perTable)

    if (sinceIso) q = q.gte(def.createdCol, sinceIso)

    const { data, error } = await q
    if (error || !data) return []

    return (data as unknown as Array<Record<string, unknown>>).map((row): ActivityEvent => {
      const id = String(row.id ?? '')
      const fecha = String(row[def.fechaCol] ?? row[def.createdCol] ?? '')
      const creadoEn = String(row[def.createdCol] ?? '')
      const ref = def.refField ? String(row[def.refField] ?? '') : ''
      return { id, sector, table: def.table, fecha, creadoEn, ref, raw: row }
    })
  })

  const all = (await Promise.all(promises)).flat()
  all.sort((a, b) => (b.creadoEn || '').localeCompare(a.creadoEn || ''))
  return all
}

// Conteo por sector en las ultimas N horas (para badges sidebar)
export async function fetchSectorActivityCounts(
  hours = 24,
  sectors: SectorKey[] = SECTOR_KEYS,
): Promise<Record<SectorKey, number>> {
  const sinceIso = new Date(Date.now() - hours * 3600 * 1000).toISOString()

  const entries = await Promise.all(
    sectors.map(async (sector): Promise<[SectorKey, number]> => {
      const def = SECTORES[sector]
      const { count, error } = await supabase
        .from(def.table)
        .select('id', { count: 'exact', head: true })
        .gte(def.createdCol, sinceIso)
      if (error) return [sector, 0]
      return [sector, count ?? 0]
    }),
  )

  const out = {} as Record<SectorKey, number>
  for (const k of SECTOR_KEYS) out[k] = 0
  for (const [k, v] of entries) out[k] = v
  return out
}

// Eventos para el rango visible del calendario
export async function fetchCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date,
  sectors: SectorKey[] = SECTOR_KEYS,
): Promise<ActivityEvent[]> {
  const startIso = rangeStart.toISOString().slice(0, 10) // YYYY-MM-DD
  const endIso = rangeEnd.toISOString().slice(0, 10)

  const promises = sectors.map(async (sector): Promise<ActivityEvent[]> => {
    const def = SECTORES[sector]
    const isTimestamp = def.fechaCol.startsWith('fecha_operacion')
      || def.table === 'alertas_operativas'
    const startVal = isTimestamp ? rangeStart.toISOString() : startIso
    const endVal = isTimestamp ? rangeEnd.toISOString() : endIso

    const { data, error } = await supabase
      .from(def.table)
      .select(selectFor(sector))
      .gte(def.fechaCol, startVal)
      .lte(def.fechaCol, endVal)
      .order(def.fechaCol, { ascending: true })
      .limit(500)

    if (error || !data) return []
    return (data as unknown as Array<Record<string, unknown>>).map((row): ActivityEvent => {
      const id = String(row.id ?? '')
      const fecha = String(row[def.fechaCol] ?? '')
      const creadoEn = String(row[def.createdCol] ?? fecha)
      const ref = def.refField ? String(row[def.refField] ?? '') : ''
      return { id, sector, table: def.table, fecha, creadoEn, ref, raw: row }
    })
  })

  return (await Promise.all(promises)).flat()
}
