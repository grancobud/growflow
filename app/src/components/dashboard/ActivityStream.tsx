// ActivityStream — feed cross-sector con realtime + filtros locales.
// Dark theme, paleta CannTrace.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Filter } from 'lucide-react'
import { fetchActivityFeed } from '../../lib/activityFeed'
import {
  SECTORES, SECTOR_KEYS, TABLE_TO_SECTOR,
  type ActivityEvent, type SectorKey,
} from '../../lib/awareness'
import { supabase } from '../../lib/supabase'

const EASE = [0.22, 1, 0.36, 1] as const
const STORAGE_KEY = 'canntrace.activity.disabledSectors'

function loadDisabled(): Set<SectorKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr.filter((k): k is SectorKey => SECTOR_KEYS.includes(k as SectorKey)))
  } catch {
    return new Set()
  }
}

function saveDisabled(s: Set<SectorKey>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s))) } catch { /* noop */ }
}

export default function ActivityStream() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState<Set<SectorKey>>(() => loadDisabled())
  const [showFilters, setShowFilters] = useState(false)
  const seenIds = useRef<Set<string>>(new Set())

  // Carga inicial
  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      const data = await fetchActivityFeed({ perTable: 10 })
      if (cancel) return
      const trimmed = data.slice(0, 50)
      seenIds.current = new Set(trimmed.map(e => `${e.table}:${e.id}`))
      setEvents(trimmed)
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [])

  // Realtime — INSERT en cualquier tabla
  useEffect(() => {
    const tables = SECTOR_KEYS.map(k => SECTORES[k].table)
    let channel = supabase.channel('activity-stream')
    for (const t of tables) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: t },
        (payload: { new: Record<string, unknown>; table: string }) => {
          const sector = TABLE_TO_SECTOR[payload.table]
          if (!sector) return
          const def = SECTORES[sector]
          const row = payload.new
          const id = String(row.id ?? '')
          const key = `${payload.table}:${id}`
          if (seenIds.current.has(key)) return
          seenIds.current.add(key)
          const ev: ActivityEvent = {
            id, sector, table: payload.table,
            fecha: String(row[def.fechaCol] ?? row[def.createdCol] ?? ''),
            creadoEn: String(row[def.createdCol] ?? new Date().toISOString()),
            ref: def.refField ? String(row[def.refField] ?? '') : '',
            raw: row,
          }
          setEvents(prev => [ev, ...prev].slice(0, 50))
        },
      )
    }
    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(
    () => events.filter(e => !disabled.has(e.sector)),
    [events, disabled],
  )

  function toggleSector(s: SectorKey) {
    setDisabled(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      saveDisabled(next)
      return next
    })
  }

  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Actividad reciente</h3>
          <span className="text-[10.5px] text-[#5c5c6b] tabular-nums">{filtered.length}</span>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`p-1.5 rounded-md border transition-colors ${
            disabled.size > 0
              ? 'border-[#404d20] bg-[#a3e635]/10 text-[#d9f99d]'
              : 'border-[#1f1f2b] text-[#8f8f9f] hover:text-[#ececf1] hover:bg-[#15151d]'
          }`}
          title="Filtrar sectores"
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="border-b border-[#1f1f2b] overflow-hidden"
          >
            <div className="p-3 flex flex-wrap gap-1.5">
              {SECTOR_KEYS.map(k => {
                const def = SECTORES[k]
                const off = disabled.has(k)
                return (
                  <button
                    key={k}
                    onClick={() => toggleSector(k)}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10.5px] font-medium border transition-colors ${
                      off
                        ? 'bg-transparent border-[#1f1f2b] text-[#5c5c6b]'
                        : 'bg-[#15151d] border-[#2b2b3a] text-[#d4d4dd]'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: off ? '#30303e' : def.color }}
                    />
                    {def.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#bef264] mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[11.5px] text-[#5c5c6b]">
            Sin actividad reciente en los sectores seleccionados.
          </div>
        ) : (
          <ul className="divide-y divide-[#1f1f2b]">
            <AnimatePresence initial={false}>
              {filtered.map(ev => {
                const def = SECTORES[ev.sector]
                const Icon = def.icon
                const ts = ev.creadoEn ? new Date(ev.creadoEn) : null
                const rel = ts && !isNaN(ts.getTime())
                  ? formatDistanceToNow(ts, { addSuffix: true, locale: es })
                  : ''
                return (
                  <motion.li
                    key={`${ev.table}:${ev.id}`}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <button
                      onClick={() => navigate(def.path)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#15151d] transition-colors flex items-start gap-2.5"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                        style={{
                          background: `${def.color}1a`,
                          borderColor: `${def.color}40`,
                          color: def.color,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#ececf1] leading-tight truncate">
                          {def.label}
                        </p>
                        <p className="text-[10.5px] text-[#757584] mt-0.5 truncate font-mono">
                          {ev.ref || '—'}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#5c5c6b] flex-shrink-0 mt-0.5 tabular-nums whitespace-nowrap">
                        {rel}
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
