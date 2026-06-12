import { useEffect, useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Activity, Waves, Loader2, Grid3x3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AreaChart, BarChart } from '@tremor/react'

const EASE = [0.22, 1, 0.36, 1] as const

// Tabs pesados lazy-loaded (bundle base ~80KB, tabs cargan a demanda)
const SankeyTab = lazy(() => import('./metricas/SankeyTab'))
const HeatmapTab = lazy(() => import('./metricas/HeatmapTab'))
const TimelineTab = lazy(() => import('./metricas/TimelineTab'))

const TabLoader = () => (
  <div className="text-center py-16">
    <Loader2 className="w-10 h-10 animate-spin text-[#a3e635] mx-auto" />
  </div>
)

type PorCamada = {
  camada: string; sistema: string
  esquejes: number; plantas: number; madres: number; flor: number; trim: number; fracc: number
  kg_verde: number; kg_seco: number; kg_trim: number; kg_fracc: number
  primera_fecha: string; ultima_fecha: string; total_lotes: number; total_unidades: number
  merma_secado_pct: number; merma_trim_pct: number; gramos_por_planta: number; dias_ciclo: number
}
type Metricas = {
  por_camada: PorCamada[]
  global: {
    total_camadas: number; total_lotes: number; total_kg_verde: number; total_kg_seco: number
    total_kg_trim: number; total_kg_fracc: number; merma_promedio_secado: number; merma_promedio_trim: number
  }
}
type SankeyData = { camada: string; nodes: any[]; links: any[]; raw: any }
type TimelineItem = { codigo_lote: string; fecha: string; etapa: string; producto: string; cantidad: number; sistema: string | null; peso: string | null; etapa_orden: number }

const CAMADAS = ['C7', 'C9', 'C11', 'C12', 'C15', 'C16']
const TABS = [
  { id: 'kpis', label: 'KPIs', icon: BarChart3 },
  { id: 'sankey', label: 'Flujo de masa', icon: Waves },
  { id: 'timeline', label: 'Timeline', icon: Activity },
  { id: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
] as const
type Tab = typeof TABS[number]['id']

export default function PaginaMetricas() {
  const [tab, setTab] = useState<Tab>('kpis')
  const [camadaSel, setCamadaSel] = useState<string>('C7')
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [sankey, setSankey] = useState<SankeyData | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    supabase.rpc('metricas_trazabilidad').then(({ data }) => setMetricas(data as Metricas))
  }, [])

  useEffect(() => {
    setCargando(true)
    Promise.all([
      supabase.rpc('sankey_camada', { p_camada: camadaSel }),
      supabase.rpc('timeline_camada', { p_camada: camadaSel }),
    ]).then(([s, t]) => {
      setSankey(s.data as SankeyData)
      setTimeline((t.data || []) as TimelineItem[])
      setCargando(false)
    })
  }, [camadaSel])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans pb-20">

      {/* TopBar inline */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <BarChart3 className="w-4 h-4 text-[#a3e635] shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Métricas</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">Análisis visual y comparativo por camada</div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      {/* Segmented tab control */}
      <div className="sticky top-[49px] sm:top-[53px] z-30 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#101016] border border-[#1f1f2b] rounded-lg p-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  tab === t.id
                    ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]'
                    : 'text-[#8f8f9f] hover:text-[#d4d4dd] border border-transparent'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {tab !== 'kpis' && tab !== 'heatmap' && (
            <div className="flex items-center gap-1.5 ml-2 flex-wrap">
              <span className="text-[10px] uppercase text-[#5c5c6b] font-semibold tracking-wide">Camada:</span>
              {CAMADAS.map(c => (
                <button key={c} onClick={() => setCamadaSel(c)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold font-mono tabular-nums transition-all ${
                    camadaSel === c
                      ? 'bg-[#a78bfa]/20 border border-[#463a66] text-[#c4b5fd]'
                      : 'bg-[#101016] border border-[#1f1f2b] text-[#8f8f9f] hover:text-[#d4d4dd] hover:border-[#2a2a3a]'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ct-dash-wrap p-4 sm:p-6 space-y-4">

        {/* TAB KPIs */}
        {tab === 'kpis' && metricas && (
          <>
            {/* KPIs globales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total camadas" valor={metricas.global.total_camadas} sub={`${metricas.global.total_lotes} lotes`} tone="primary" />
              <KpiCard label="Total kg verde" valor={metricas.global.total_kg_verde} sub="producido en cosecha" tone="gold" />
              <KpiCard label="Total kg trimmeado" valor={metricas.global.total_kg_trim} sub="pronto para frac." tone="primary" />
              <KpiCard label="Merma secado prom." valor={`${metricas.global.merma_promedio_secado || 0}%`} sub={`trim: ${metricas.global.merma_promedio_trim || 0}%`} tone="warn" />
            </div>

            {/* Comparador camadas — Tremor BarChart con paleta CannTrace */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.05 }}
              className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-[13px] font-display font-semibold text-[#ececf1]">Comparador por camada</p>
                <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-[#a3e635]/10 border border-[#404d20] text-[#d9f99d] tabular-nums">{metricas.por_camada.length} camadas</span>
              </div>
              <BarChart
                data={metricas.por_camada.map(c => ({
                  camada: c.camada,
                  'Esquejes': c.esquejes,
                  'Plantas': c.plantas,
                  'Flor trim.': c.trim,
                  'Fraccionado': c.fracc,
                }))}
                index="camada"
                categories={['Esquejes', 'Plantas', 'Flor trim.', 'Fraccionado']}
                colors={['#bef264', '#a3e635', '#c4b5fd', '#a78bfa']}
                yAxisWidth={42}
                showAnimation
                animationDuration={900}
                className="h-64 mt-4"
              />
            </motion.div>

            {/* Detalle por camada — cards con border-left coloreado por sistema */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.1 }}
              className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
              <p className="text-[13px] font-display font-semibold text-[#ececf1] mb-3">Detalle por camada</p>
              <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3"
                initial="hidden" animate="visible"
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}>
                {metricas.por_camada.map(c => {
                  const isRDWC = c.sistema === 'RDWC'
                  const borderLeft = isRDWC ? 'border-l-[3px] border-l-[#a3e635]' : 'border-l-[3px] border-l-[#a78bfa]'
                  const sistemaBg = isRDWC
                    ? 'bg-[#a3e635]/10 border border-[#404d20] text-[#d9f99d]'
                    : 'bg-[#a78bfa]/10 border border-[#463a66] text-[#c4b5fd]'
                  return (
                    <motion.div key={c.camada}
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }}
                      className={`${borderLeft} border border-[#1f1f2b] hover:border-[#404d20] rounded-xl p-4 bg-[#0a0a0f] transition-colors`}>
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${sistemaBg}`}>{c.sistema}</span>
                          <span className="text-[15px] font-display font-bold text-[#ececf1] tabular-nums">Camada {c.camada}</span>
                        </div>
                        <div className="text-[11px] text-[#5c5c6b] font-mono tabular-nums shrink-0">
                          {c.dias_ciclo}d · {c.total_lotes} lotes
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <MiniStat label="Esq" val={c.esquejes} />
                        <MiniStat label="Planta" val={c.plantas} />
                        <MiniStat label="Trim" val={`${c.kg_trim}kg`} />
                        <MiniStat label="g/pl" val={c.gramos_por_planta} />
                      </div>
                      <div className="space-y-2.5">
                        <SmoothMermaBar
                          label="Merma secado" pct={c.merma_secado_pct}
                          left={`${c.kg_verde}kg`} right={`${c.kg_seco}kg`}
                          warn={c.merma_secado_pct > 70} danger={c.merma_secado_pct > 80}
                        />
                        <SmoothMermaBar
                          label="Merma trimming" pct={c.merma_trim_pct}
                          left={`${c.kg_seco}kg`} right={`${c.kg_trim}kg`}
                          warn={c.merma_trim_pct > 30} danger={c.merma_trim_pct > 50}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </motion.div>

            {/* Area chart mermas */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.15 }}
              className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
              <p className="text-[13px] font-display font-semibold text-[#ececf1] mb-3">Mermas por camada (%)</p>
              <AreaChart
                data={metricas.por_camada.map(c => ({
                  camada: c.camada,
                  'Merma secado %': c.merma_secado_pct,
                  'Merma trim %': c.merma_trim_pct,
                }))}
                index="camada"
                categories={['Merma secado %', 'Merma trim %']}
                colors={['#c4b5fd', '#ff8a7a']}
                showGridLines
                showAnimation
                animationDuration={900}
                curveType="natural"
                className="h-56 mt-2"
              />
            </motion.div>
          </>
        )}

        {/* TAB SANKEY */}
        {tab === 'sankey' && (
          <Suspense fallback={<TabLoader />}>
            {cargando ? <TabLoader /> : sankey && <SankeyTab sankey={sankey} camadaSel={camadaSel} />}
          </Suspense>
        )}

        {/* TAB HEATMAP */}
        {tab === 'heatmap' && metricas && (
          <Suspense fallback={<TabLoader />}>
            <HeatmapTab metricas={metricas} />
          </Suspense>
        )}

        {/* TAB TIMELINE */}
        {tab === 'timeline' && (
          <Suspense fallback={<TabLoader />}>
            {cargando ? <TabLoader /> :
             timeline.length === 0
               ? <p className="text-center py-12 text-[#5c5c6b]">Sin eventos para {camadaSel}</p>
               : <TimelineTab timeline={timeline} />}
          </Suspense>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, valor, sub, tone }: { label: string; valor: any; sub: string; tone: 'primary' | 'gold' | 'warn' }) {
  const accent = tone === 'gold' ? 'border-l-[#a78bfa]' : tone === 'warn' ? 'border-l-[#c4b5fd]' : 'border-l-[#a3e635]'
  const valColor = tone === 'gold' ? 'text-[#c4b5fd]' : tone === 'warn' ? 'text-[#c4b5fd]' : 'text-[#d9f99d]'
  return (
    <div className={`bg-[#101016] border border-[#1f1f2b] border-l-[3px] ${accent} rounded-xl p-4`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-[#5c5c6b] mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold font-mono tabular-nums ${valColor}`}>{valor}</p>
      <p className="text-[11px] text-[#8f8f9f] mt-1">{sub}</p>
    </div>
  )
}

function MiniStat({ label, val }: { label: string; val: any }) {
  return (
    <div className="bg-[#15151d] border border-[#1f1f2b] rounded-lg p-2">
      <p className="text-[9px] uppercase text-[#5c5c6b] font-semibold tracking-wide">{label}</p>
      <p className="text-[12px] font-bold font-mono tabular-nums text-[#d4d4dd]">{val}</p>
    </div>
  )
}

// Barra de merma custom con gradient suave + animación de fill (reemplaza Tremor ProgressBar rígido)
function SmoothMermaBar({ label, pct, left, right, warn, danger }: { label: string; pct: number; left: string; right: string; warn?: boolean; danger?: boolean }) {
  const fill = danger
    ? 'linear-gradient(90deg, #ff6b5a 0%, #ff8a7a 100%)'
    : warn
      ? 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)'
      : 'linear-gradient(90deg, #a3e635 0%, #bef264 100%)'
  const txt = danger ? '#ff8a7a' : warn ? '#c4b5fd' : '#d9f99d'
  const clamped = Math.max(0, Math.min(100, pct || 0))
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[#8f8f9f]">
          {label}: <span className="font-mono tabular-nums" style={{ color: txt }}>{pct}%</span>
        </span>
        <span className="text-[10.5px] text-[#5c5c6b] font-mono tabular-nums">{left} → {right}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1c1c27] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1.0, ease: EASE, delay: 0.15 }}
          className="h-full rounded-full"
          style={{ background: fill, boxShadow: `0 0 8px ${txt}33` }}
        />
      </div>
    </div>
  )
}
