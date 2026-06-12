import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FlaskConical, Clock, TrendingDown, ShieldAlert, FileWarning,
  RefreshCw, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import AlertasOperativas from '../components/alertas/AlertasOperativas'
import { useRealtimeRefetch } from '../hooks/useRealtimeInvalidation'

type Alertas = {
  resumen: { total_alertas: number; actualizado: string }
  lotes_cuarentena_larga: Array<{ id: string; codigo_lote: string; camada: string; dias: number; fecha_cuarentena: string }>
  lotes_sin_analisis_lab: Array<{ id: string; codigo_lote: string; camada: string; dias_sin_analisis: number; tipo_producto: string }>
  mermas_anomalas: Array<{ codigo_lote: string; camada: string; verde: number; seco: number; merma_pct: number }>
  lotes_vencimiento_proximo: Array<{ id: string; codigo_lote: string; camada: string; fecha_vencimiento: string; dias_para_vencer: number }>
  no_conformidades_abiertas: Array<{ id: string; fecha: string; descripcion_hallazgo: string; codigo_lote: string | null }>
  eventos_adversos_sin_anmat: Array<{ id: string; fecha_evento: string; tipo: string; severidad: string; descripcion: string; codigo_lote: string | null }>
}

type Severidad = 'critica' | 'alta' | 'media'
type Categoria = {
  key: keyof Alertas
  label: string
  desc: string
  severidad: Severidad
  icon: any
}

const CATEGORIAS: Categoria[] = [
  { key: 'eventos_adversos_sin_anmat', label: 'Eventos adversos sin reportar', desc: 'Deben notificarse a ANMAT dentro de 15 dias', severidad: 'critica', icon: ShieldAlert },
  { key: 'no_conformidades_abiertas', label: 'No conformidades abiertas', desc: 'NC sin acciones correctivas cerradas', severidad: 'critica', icon: FileWarning },
  { key: 'lotes_cuarentena_larga', label: 'Cuarentena prolongada', desc: 'Lotes con >14 dias en espera de resultado', severidad: 'alta', icon: Clock },
  { key: 'lotes_vencimiento_proximo', label: 'Vencimiento proximo', desc: 'Lotes que vencen en los proximos 30 dias', severidad: 'alta', icon: Clock },
  { key: 'lotes_sin_analisis_lab', label: 'Flor sin analisis de laboratorio', desc: 'Requieren cromatografia antes de liberacion', severidad: 'media', icon: FlaskConical },
  { key: 'mermas_anomalas', label: 'Mermas anomalas', desc: 'Ratio fresco-seco o seco-trim >80% (investigar)', severidad: 'media', icon: TrendingDown },
]

// Dark-palette severity styles
const SEV_STYLES: Record<Severidad, {
  card: string; pill: string; pillText: string
  iconBg: string; iconText: string
  rowText: string; rowAccent: string
}> = {
  critica: {
    card: 'border-[#7a2820] bg-[#7a2820]/10',
    pill: 'bg-[#7a2820]/30 border border-[#7a2820]',
    pillText: 'text-[#ff8a7a]',
    iconBg: 'bg-[#7a2820]/30',
    iconText: 'text-[#ff6b5a]',
    rowText: 'text-[#ececf1]',
    rowAccent: 'text-[#ff8a7a]',
  },
  alta: {
    card: 'border-[#463a66] bg-[#463a66]/10',
    pill: 'bg-[#463a66]/30 border border-[#463a66]',
    pillText: 'text-[#c4b5fd]',
    iconBg: 'bg-[#463a66]/30',
    iconText: 'text-[#c4b5fd]',
    rowText: 'text-[#ececf1]',
    rowAccent: 'text-[#c4b5fd]',
  },
  media: {
    card: 'border-[#1f1f2b] bg-[#101016]',
    pill: 'bg-[#1f1f2b] border border-[#2a2a3a]',
    pillText: 'text-[#a6a6b5]',
    iconBg: 'bg-[#1c1c27]',
    iconText: 'text-[#bef264]',
    rowText: 'text-[#d4d4dd]',
    rowAccent: 'text-[#d9f99d]',
  },
}

const EASE = [0.22, 1, 0.36, 1] as const
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } } }

export default function PaginaAlertas() {
  const [alertas, setAlertas] = useState<Alertas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)

  useEffect(() => { cargar() }, [])

  // Realtime: refetch RPC alertas_trazabilidad cuando cambian lotes u operaciones
  useRealtimeRefetch(['lotes', 'operaciones', 'eventos_adversos'], () => cargar(), { debounceMs: 500 })

  async function cargar() {
    if (alertas) setSincronizando(true)
    else setCargando(true)
    const { data } = await supabase.rpc('alertas_trazabilidad')
    if (data) setAlertas(data as Alertas)
    setCargando(false)
    setSincronizando(false)
  }

  const totalPorSev = (sev: Severidad) => {
    if (!alertas) return 0
    return CATEGORIAS.filter((c) => c.severidad === sev)
      .reduce((acc, c) => acc + ((alertas as any)[c.key]?.length || 0), 0)
  }

  const criticas = totalPorSev('critica')
  const altas = totalPorSev('alta')
  const medias = totalPorSev('media')

  const subtitulo = alertas
    ? criticas > 0
      ? `${criticas} critica${criticas > 1 ? 's' : ''} · ${altas + medias} warnings`
      : altas > 0
        ? `${altas} alta${altas > 1 ? 's' : ''} · ${medias} medias`
        : medias > 0
          ? `${medias} media${medias > 1 ? 's' : ''}`
          : 'Todo en orden'
    : 'Cargando...'

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      {/* TopBar inline */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <AlertTriangle className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">
              Alertas operativas
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b] tabular-nums">
              {subtitulo}
            </div>
          </div>
          <div className="flex-1" />
          {alertas && (
            <span className="hidden sm:inline text-[10.5px] text-[#5c5c6b] tabular-nums">
              {new Date(alertas.resumen.actualizado).toLocaleTimeString('es-AR')}
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
            ONLINE
          </span>
          <button
            onClick={cargar}
            disabled={sincronizando || cargando}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">

        {/* Alertas operativas (umbrales auto-generados P2.5) — SIEMPRE arriba */}
        <AlertasOperativas />

        {/* Severity badges row */}
        {alertas && (
          <div className="flex items-center gap-3 flex-wrap">
            <SevBadge sev="critica" count={criticas} />
            <SevBadge sev="alta"    count={altas} />
            <SevBadge sev="media"   count={medias} />
          </div>
        )}

        {/* Loading skeletons */}
        {cargando ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-[#101016] border border-[#1f1f2b] animate-pulse" />
            ))}
          </div>

        /* Empty state */
        ) : alertas && alertas.resumen.total_alertas === 0 ? (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-10 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1c1c27] border border-[#404d20] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#bef264]" />
            </div>
            <div>
              <p className="font-display font-semibold text-[#ececf1] text-[15px]">Todo en orden</p>
              <p className="text-[11.5px] text-[#8f8f9f] mt-1 max-w-xs">
                Todos los lotes estan en regla, los analisis estan al dia y no hay eventos pendientes de reportar.
              </p>
            </div>
            <button
              onClick={cargar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d]"
            >
              <RefreshCw className="w-3 h-3" /> Verificar de nuevo
            </button>
          </div>

        /* Alert cards */
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {alertas && CATEGORIAS.map((cat) => {
              const items = (alertas as any)[cat.key] || []
              if (items.length === 0) return null
              return <CategoriaCard key={cat.key} cat={cat} items={items} />
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function SevBadge({ sev, count }: { sev: Severidad; count: number }) {
  const label = sev === 'critica' ? 'Criticas' : sev === 'alta' ? 'Altas' : 'Medias'
  const dotCls = sev === 'critica' ? 'bg-[#ff6b5a]' : sev === 'alta' ? 'bg-[#c4b5fd]' : 'bg-[#bef264]'
  const textCls = count > 0 ? 'text-[#ececf1] font-semibold' : 'text-[#5c5c6b]'
  return (
    <div className="flex items-center gap-1.5 text-[11.5px]">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
      <span className={textCls}>{count}</span>
      <span className="text-[#8f8f9f]">{label}</span>
    </div>
  )
}

function CategoriaCard({ cat, items }: { cat: Categoria; items: any[] }) {
  const s = SEV_STYLES[cat.severidad]
  const sevLabel = cat.severidad === 'critica' ? 'Critica' : cat.severidad === 'alta' ? 'Alta' : 'Media'
  const [expandido, setExpandido] = useState(false)
  const visibles = expandido ? items : items.slice(0, 8)

  return (
    <motion.div
      variants={fadeUp}
      className={`rounded-xl border overflow-hidden ${s.card}`}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
          <cat.icon className={`w-5 h-5 ${s.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[#ececf1] text-[13px]">{cat.label}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${s.pill} ${s.pillText}`}>
              {sevLabel}
            </span>
          </div>
          <p className="text-[11.5px] text-[#8f8f9f] mt-0.5">{cat.desc}</p>
        </div>
        <span className={`flex-shrink-0 text-[11.5px] font-bold px-2.5 py-1 rounded-full ${s.pill} ${s.pillText}`}>
          {items.length}
        </span>
      </div>

      {/* Items list */}
      <ul className="divide-y divide-[#1f1f2b] border-t border-[#1f1f2b] bg-[#0a0a0f]/40">
        {visibles.map((item: any, i: number) => (
          <li key={i} className="flex items-center flex-wrap gap-x-3 gap-y-0.5 py-2 px-4 text-[11.5px]">
            {item.codigo_lote && (
              <span className="font-mono font-bold text-[#ececf1]">{item.codigo_lote}</span>
            )}
            {item.camada && (
              <span className="text-[#8f8f9f]">C{item.camada.replace('C', '')}</span>
            )}
            {item.dias !== undefined && (
              <span className={`font-medium ${s.rowAccent}`}>{item.dias}d en cuarentena</span>
            )}
            {item.dias_sin_analisis !== undefined && (
              <span className={`font-medium ${s.rowAccent}`}>{item.dias_sin_analisis}d sin lab</span>
            )}
            {item.dias_para_vencer !== undefined && (
              <span className={`font-medium ${s.rowAccent}`}>Vence en {item.dias_para_vencer}d</span>
            )}
            {item.merma_pct !== undefined && (
              <span className="font-medium text-[#ff8a7a]">Merma {item.merma_pct}%</span>
            )}
            {item.severidad && (
              <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded-sm ${
                item.severidad === 'critica' || item.severidad === 'grave'
                  ? 'bg-[#7a2820]/30 text-[#ff8a7a]'
                  : 'bg-[#463a66]/30 text-[#c4b5fd]'
              }`}>
                {item.severidad}
              </span>
            )}
            {item.descripcion && (
              <span className="text-[#8f8f9f] truncate flex-1">{item.descripcion}</span>
            )}
            {item.descripcion_hallazgo && (
              <span className="text-[#8f8f9f] truncate flex-1">{item.descripcion_hallazgo}</span>
            )}
            {item.tipo && (
              <span className="text-[#5c5c6b] text-[10px] italic">{item.tipo.replace(/_/g, ' ')}</span>
            )}
          </li>
        ))}

        {items.length > 8 && (
          <li className="py-1">
            <button
              onClick={() => setExpandido(v => !v)}
              className="w-full text-center text-[11.5px] font-semibold text-[#d9f99d] hover:bg-[#a3e635]/10 py-2 rounded-md transition-colors"
            >
              {expandido
                ? 'Mostrar solo 8'
                : `+ Ver ${items.length - 8} mas (${items.length} en total)`}
            </button>
          </li>
        )}
      </ul>
    </motion.div>
  )
}
