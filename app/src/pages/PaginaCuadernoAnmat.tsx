// Cuaderno de Campo — vista consolidada de actividades por camada
// para cumplir con exigencia ANMAT (Res 1780/2025).
//
// Reusa data existente (operaciones + registros_*) y la muestra en formato
// "diario de cultivo" cronologico, filtrable por camada + rango fechas.
// Exportable a Excel para presentar ante auditor/inspeccion.

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Filter, Download, FileText, Printer, Leaf, Droplet, Scissors,
  Bug, FlaskConical, Wrench, RefreshCcw, AlertCircle, BookOpen,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtimeRefetch } from '../hooks/useRealtimeInvalidation'

const CAMADAS_VALIDAS = ['C7', 'C9', 'C11', 'C12', 'C15', 'C16'] as const
type Camada = typeof CAMADAS_VALIDAS[number]

interface EntradaCuaderno {
  id: string
  fecha: string
  origen: string  // 'operaciones' | 'registros_condiciones_ambientales' | etc
  categoria: 'Ambiental' | 'Fertilizacion' | 'Fitosanitario' | 'Cosecha' | 'Trazabilidad' | 'Mantenimiento' | 'Operacion'
  tipo: string
  responsable: string | null
  descripcion: string  // texto resumen legible
  camada: string | null
  sistema: string | null
  observaciones: string | null
  raw: Record<string, unknown>
}

const CAT_ICONS: Record<EntradaCuaderno['categoria'], typeof Calendar> = {
  Ambiental: Leaf,
  Fertilizacion: FlaskConical,
  Fitosanitario: Bug,
  Cosecha: Scissors,
  Trazabilidad: FileText,
  Mantenimiento: Wrench,
  Operacion: Droplet,
}
const CAT_COLORES: Record<EntradaCuaderno['categoria'], string> = {
  Ambiental: 'bg-sky-500/10 text-sky-300 border-sky-900/50',
  Fertilizacion: 'bg-amber-500/10 text-amber-300 border-amber-900/50',
  Fitosanitario: 'bg-red-500/10 text-red-300 border-red-900/50',
  Cosecha: 'bg-orange-500/10 text-orange-300 border-orange-900/50',
  Trazabilidad: 'bg-[#a3e635]/10 text-[#bef264] border-[#404d20]',
  Mantenimiento: 'bg-violet-500/10 text-violet-300 border-violet-900/50',
  Operacion: 'bg-[#a3e635]/8 text-[#bef264] border-[#2a2a3a]',
}

export default function PaginaCuadernoAnmat() {
  const hoy = new Date().toISOString().slice(0, 10)
  const haceUnMes = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [camada, setCamada] = useState<Camada | ''>('')
  const [desde, setDesde] = useState(haceUnMes)
  const [hasta, setHasta] = useState(hoy)
  const [categoria, setCategoria] = useState<string>('')
  const [entradas, setEntradas] = useState<EntradaCuaderno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const resultados: EntradaCuaderno[] = []

      // Helper para push con filtro de camada cuando la tabla la soporta
      const pushTabla = async (
        tabla: string,
        fechaCol: string,
        hasCamada: boolean,
        categoriaEtiq: EntradaCuaderno['categoria'],
        descriptor: (row: Record<string, unknown>) => string,
      ) => {
        let q = supabase.from(tabla).select('*').gte(fechaCol, desde).lte(fechaCol, hasta).limit(500)
        if (camada && hasCamada) q = q.eq('camada', camada)
        const { data, error } = await q
        if (error) throw new Error(`${tabla}: ${error.message}`)
        for (const r of (data ?? []) as Array<Record<string, unknown>>) {
          resultados.push({
            id: `${tabla}-${String(r.id)}`,
            fecha: String(r[fechaCol] ?? ''),
            origen: tabla,
            categoria: categoriaEtiq,
            tipo: String(r.tipo ?? tabla.replace('registros_', '')),
            responsable: (r.responsable as string) ?? null,
            descripcion: descriptor(r),
            camada: (r.camada as string) ?? null,
            sistema: (r.sistema as string) ?? null,
            observaciones: (r.observaciones as string) ?? null,
            raw: r,
          })
        }
      }

      await Promise.all([
        pushTabla('registros_condiciones_ambientales', 'fecha', true, 'Ambiental',
          r => `T°: ${r.temperatura ?? '—'} | Hum: ${r.humedad ?? '—'}% | pH: ${r.ph_corregido ?? r.ph_inicial ?? '—'} | EC: ${r.ec ?? '—'}`),
        pushTabla('registros_fertilizantes', 'fecha', false, 'Fertilizacion',
          r => `${r.producto ?? 'producto s/n'} — ${r.cantidad_producto ?? '?'}g en ${r.litros_agua ?? '?'}L (${r.destino ?? 'destino s/n'})`),
        pushTabla('registros_fitosanitarios', 'fecha', false, 'Fitosanitario',
          r => `Plaga: ${r.plaga_detectada ?? '—'} | Producto: ${r.producto_aplicado ?? '—'} | Dosis: ${r.dosis ?? '—'}`),
        pushTabla('registros_cosecha', 'fecha', true, 'Cosecha',
          r => `${r.plantas_cosechadas ?? '?'} plantas | Fresco: ${r.peso_fresco ?? '?'} kg | Seco: ${r.peso_seco ?? '?'} kg`),
        pushTabla('registros_trazabilidad', 'fecha', true, 'Trazabilidad',
          r => `Traza: ${r.cod_traza_cosecha ?? r.cod_traza_secado ?? r.cod_comercial ?? '—'}`),
        pushTabla('registros_mantenimiento', 'fecha_mantenimiento', false, 'Mantenimiento',
          r => String(r.tipo ?? 'mantenimiento')),
        // Operaciones principales (ademas de los registros CUMCS)
        (async () => {
          let q = supabase.from('operaciones').select('*').gte('fecha_operacion', desde).lte('fecha_operacion', hasta).limit(300)
          if (camada) q = q.or(`datos_extra->>camada.eq.${camada}`)
          const { data, error } = await q
          if (error) throw new Error(`operaciones: ${error.message}`)
          for (const r of (data ?? []) as Array<Record<string, unknown>>) {
            const dx = (r.datos_extra as Record<string, unknown>) ?? {}
            resultados.push({
              id: `operaciones-${String(r.id)}`,
              fecha: String(r.fecha_operacion ?? r.creado_en ?? ''),
              origen: 'operaciones',
              categoria: 'Operacion',
              tipo: String(r.tipo_operacion ?? 'operacion'),
              responsable: (r.responsable as string) ?? null,
              descripcion: String(r.tipo_operacion ?? 'operacion') + (dx.registro_cumcs ? ` (${dx.registro_cumcs})` : ''),
              camada: (dx.camada as string) ?? null,
              sistema: (dx.sistema as string) ?? null,
              observaciones: (r.observaciones as string) ?? null,
              raw: r,
            })
          }
        })(),
      ])

      // Ordenar por fecha DESC
      resultados.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
      setEntradas(resultados)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEntradas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [camada, desde, hasta])
  useRealtimeRefetch(
    ['registros_condiciones_ambientales', 'registros_fertilizantes', 'registros_fitosanitarios', 'registros_cosecha', 'registros_trazabilidad', 'registros_mantenimiento', 'operaciones'],
    cargar,
    { debounceMs: 800 },
  )

  const filtradas = useMemo(() => {
    return categoria ? entradas.filter(e => e.categoria === categoria) : entradas
  }, [entradas, categoria])

  // Agrupar por dia (para vista tipo diario)
  const porDia = useMemo(() => {
    const map = new Map<string, EntradaCuaderno[]>()
    for (const e of filtradas) {
      const d = (e.fecha || '').slice(0, 10) || 'Sin fecha'
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(e)
    }
    return Array.from(map.entries())
  }, [filtradas])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b] print:hidden">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <BookOpen className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Cuaderno de Campo</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">ANMAT Res 1780/2025 · {filtradas.length} actividad{filtradas.length === 1 ? '' : 'es'} {camada ? `de ${camada}` : ''}</div>
          </div>
          <div className="flex-1" />
        </div>

        {/* Filtros */}
        <div className="px-3 sm:px-6 pb-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Camada</label>
              <select
                value={camada}
                onChange={e => setCamada(e.target.value as Camada | '')}
                className="px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] rounded-lg text-xs text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30"
              >
                <option value="">Todas</option>
                {CAMADAS_VALIDAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] rounded-lg text-xs text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] rounded-lg text-xs text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] rounded-lg text-xs text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30"
              >
                <option value="">Todas</option>
                {(Object.keys(CAT_ICONS) as Array<keyof typeof CAT_ICONS>).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => void cargar()}
              disabled={cargando}
              className="p-2 bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] rounded-lg transition-colors disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-[#5c5c6b] ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportarCSV(filtradas, { camada, desde, hasta })}
              disabled={filtradas.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] rounded-lg text-xs text-[#b3b3c0] transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Excel/</span>CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635] hover:bg-[#bef264] text-[#0a0a0f] rounded-lg text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-3 print:p-0">
        {/* Encabezado institucional (visible en print) */}
        <div className="hidden print:block bg-white border border-surface-300 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Cuaderno de Campo — CannTrace</h1>
              <p className="text-xs text-surface-600">ANMAT Res 1780/2025 · Trazabilidad Cannabis Medicinal</p>
            </div>
            <div className="text-right text-xs text-surface-600">
              <p>Generado: {new Date().toLocaleString('es-AR')}</p>
              <p>Periodo: {desde} al {hasta}</p>
              <p>Camada: {camada || 'Todas'}</p>
              <p>Total actividades: {filtradas.length}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#7a2820]/20 border border-[#7a2820]/50 rounded-xl text-xs text-[#ff8a7a] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {cargando && entradas.length === 0 && (
          <div className="flex items-center justify-center py-16 text-[#5c5c6b] gap-2">
            <RefreshCcw className="w-4 h-4 animate-spin" /> Cargando cuaderno...
          </div>
        )}

        {!cargando && filtradas.length === 0 && (
          <div className="text-center py-16 text-[#5c5c6b]">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay actividades en el rango seleccionado.</p>
          </div>
        )}

        {/* Vista dia por dia */}
        {porDia.map(([dia, actividades]) => (
          <motion.div
            key={dia}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#101016] border border-[#1f1f2b] rounded-xl overflow-hidden print:break-inside-avoid"
          >
            <div className="px-4 py-2.5 border-b border-[#1f1f2b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#a3e635]" />
                <h3 className="text-sm font-semibold text-[#ececf1]">
                  {formatearDia(dia)}
                </h3>
              </div>
              <span className="text-[10px] text-[#5c5c6b] tabular-nums">{actividades.length} actividad{actividades.length === 1 ? '' : 'es'}</span>
            </div>
            <div className="divide-y divide-[#1f1f2b]/50">
              {actividades.map(a => {
                const Icon = CAT_ICONS[a.categoria]
                return (
                  <div key={a.id} className="px-4 py-2.5 flex items-start gap-3 text-[12px]">
                    <div className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 flex-shrink-0 ${CAT_COLORES[a.categoria]}`}>
                      <Icon className="w-3 h-3" strokeWidth={2} />
                      <span className="hidden sm:inline">{a.categoria}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#ececf1]">{a.tipo}</span>
                        {a.camada && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#15151d] border border-[#2a2a3a] rounded">{a.camada}</span>}
                        {a.sistema && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#15151d] border border-[#2a2a3a] rounded">{a.sistema}</span>}
                      </div>
                      <p className="text-[#b3b3c0] text-[11px]">{a.descripcion}</p>
                      {a.observaciones && <p className="text-[10px] text-[#5c5c6b] italic">{a.observaciones}</p>}
                    </div>
                    <div className="text-right text-[10px] text-[#5c5c6b] flex-shrink-0 space-y-0.5">
                      {a.responsable && <p className="font-medium text-[#8f8f9f]">{a.responsable}</p>}
                      <p className="font-mono">{a.fecha.length > 10 ? a.fecha.slice(11, 16) : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ==================== helpers ====================
function formatearDia(iso: string): string {
  if (!iso || iso === 'Sin fecha') return 'Sin fecha'
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return iso }
}

function exportarCSV(
  filas: EntradaCuaderno[],
  filtros: { camada: string; desde: string; hasta: string },
) {
  if (filas.length === 0) return
  const header = 'Fecha,Categoria,Tipo,Camada,Sistema,Descripcion,Responsable,Observaciones,Origen'
  const rows = filas.map(f => [
    f.fecha, f.categoria, f.tipo,
    f.camada ?? '', f.sistema ?? '',
    f.descripcion, f.responsable ?? '',
    f.observaciones ?? '', f.origen,
  ].map(v => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cuaderno-campo-${filtros.camada || 'todas'}-${filtros.desde}_a_${filtros.hasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
