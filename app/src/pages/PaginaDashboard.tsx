// PaginaDashboard — Dashboard BI con jerarquía visual clara y números prominentes.
// Paleta verde+dorado, hero gigante, KPIs grandes, ratios con % central, charts con subtítulo.

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, DonutChart, AreaChart, SparkAreaChart } from '@tremor/react'
import { RefreshCw, BarChart3, Sparkles, Activity, Leaf, Package, Calendar, TrendingUp, Layers, Beaker } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRealtimeRefetch } from '../hooks/useRealtimeInvalidation'

const EASE = [0.22, 1, 0.36, 1] as const
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }

type Periodo = '7d' | '30d' | '90d' | 'ytd' | 'all'

const PERIODOS: { v: Periodo; label: string; subLabel: string }[] = [
  { v: '7d', label: '7d', subLabel: '7 días' },
  { v: '30d', label: '30d', subLabel: '30 días' },
  { v: '90d', label: '90d', subLabel: '90 días' },
  { v: 'ytd', label: 'YTD', subLabel: 'Año actual' },
  { v: 'all', label: 'Todo', subLabel: 'Histórico' },
]

function diasAtras(p: Periodo): Date | null {
  const now = new Date()
  if (p === 'all') return null
  if (p === 'ytd') return new Date(now.getFullYear(), 0, 1)
  const dias = p === '7d' ? 7 : p === '30d' ? 30 : 90
  const d = new Date(now)
  d.setDate(d.getDate() - dias)
  return d
}

export default function PaginaDashboard() {
  const [cargando, setCargando] = useState(true)
  const [lotes, setLotes] = useState<any[]>([])
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [registrosCalidad, setRegistrosCalidad] = useState<any[]>([])
  const [ultimaSinc, setUltimaSinc] = useState<Date | null>(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('30d')

  async function cargar() {
    setSincronizando(true)
    try {
      const [{ data: l }, { data: o }, { data: c }] = await Promise.all([
        supabase.from('lotes').select('*, productos(*), instalaciones(*)').eq('eliminado', false).limit(2000),
        supabase.from('operaciones').select('*').limit(2000),
        supabase.from('registros_calidad').select('*').limit(500),
      ])
      setLotes(l || [])
      setOperaciones(o || [])
      setRegistrosCalidad(c || [])
      setUltimaSinc(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
      setSincronizando(false)
    }
  }

  useEffect(() => { cargar() }, [])
  useRealtimeRefetch(['lotes', 'operaciones'], () => cargar(), { debounceMs: 600 })

  const kpis = useMemo(() => {
    const fraccionada = lotes.filter(l => l.productos?.tipo_producto === 'flor_fraccionada')
    const totalGramosFinal = fraccionada.reduce((a, l) => a + (parseFloat(l.cantidad) || 0), 0)
    const totalKgFinal = totalGramosFinal / 1000

    const cosechas = operaciones.filter(o => o.tipo_operacion === 'cosecha')
    const totalPlantasCosechadas = cosechas.reduce((a, o) => a + (parseFloat(o.cantidad_entrada) || 0), 0)
    const totalKgFresco = cosechas.reduce((a, o) => a + (parseFloat(o.peso_fresco_kg) || 0), 0)

    const trimming = operaciones.filter(o => o.tipo_operacion === 'trimming')
    const totalTrimGramos = trimming.reduce((a, o) => a + (parseFloat(o.peso_neto_g) || 0), 0)

    const secado = operaciones.filter(o => o.tipo_operacion === 'secado')
    const totalKgSeco = secado.reduce((a, o) => a + (parseFloat(o.peso_seco_kg) || 0), 0)

    const ratioFrescoSeco = totalKgFresco > 0 ? Math.round((totalKgSeco / totalKgFresco) * 100) : 0
    const ratioSecoTrim = totalKgSeco > 0 ? Math.round((totalTrimGramos / 1000 / totalKgSeco) * 100) : 0
    const gPorPlanta = totalPlantasCosechadas > 0 ? Math.round(totalTrimGramos / totalPlantasCosechadas) : 0

    const camadas = new Set(lotes.map(l => l.datos_extra?.camada).filter(Boolean))
    const camadasActivas = new Set(lotes.filter(l => l.estado === 'activo').map(l => l.datos_extra?.camada).filter(Boolean))

    const noConformes = registrosCalidad.filter(r => r.tipo === 'no_conforme' && r.resultado === 'pendiente').length
    const reclamos = registrosCalidad.filter(r => r.tipo === 'reclamo_cliente' && r.resultado === 'pendiente').length
    const analisisAprobados = registrosCalidad.filter(r => r.tipo === 'analisis_postcosecha' && r.resultado === 'aprobado').length
    const analisisTotal = registrosCalidad.filter(r => r.tipo === 'analisis_postcosecha').length
    const pctAnalisisOk = analisisTotal > 0 ? Math.round(analisisAprobados / analisisTotal * 100) : 0

    return {
      totalKgFinal, totalGramosFinal, totalKgFresco, totalKgSeco, totalTrimGramos, totalPlantasCosechadas,
      ratioFrescoSeco, ratioSecoTrim, gPorPlanta, camadasActivas: camadasActivas.size, camadasTotales: camadas.size,
      noConformes, reclamos, pctAnalisisOk, analisisTotal,
    }
  }, [lotes, operaciones, registrosCalidad])

  const distribSistema = useMemo(() => {
    const rdwc = lotes.filter(l => l.datos_extra?.sistema === 'RDWC').length
    const coco = lotes.filter(l => l.datos_extra?.sistema === 'COCO').length
    return [{ name: 'RDWC', value: rdwc }, { name: 'COCO', value: coco }]
  }, [lotes])

  const distribTipo = useMemo(() => {
    const conteo: Record<string, number> = {}
    for (const l of lotes) {
      const t = l.productos?.tipo_producto || 'otro'
      conteo[t] = (conteo[t] || 0) + 1
    }
    return Object.entries(conteo).map(([name, value]) => ({ name: name.replace(/_/g, ' '), Lotes: value }))
  }, [lotes])

  const stockSparkline = useMemo(() => {
    const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === '90d' ? 90 : 60
    const hoy = new Date()
    const points: { fecha: string; kg: number }[] = []
    let acum = 0
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy)
      d.setDate(d.getDate() - i)
      const k = d.toISOString().slice(0, 10)
      const gHoy = operaciones
        .filter(o => o.fecha_operacion?.slice(0, 10) === k && o.tipo_operacion === 'trimming')
        .reduce((a, o) => a + (parseFloat(o.peso_neto_g) || 0), 0)
      acum += gHoy / 1000
      points.push({ fecha: k, kg: Math.round(acum * 100) / 100 })
    }
    return points
  }, [operaciones, periodo])

  const opsPorMes = useMemo(() => {
    const map = new Map<string, number>()
    const ahora = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const k = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      map.set(k, 0)
    }
    for (const o of operaciones) {
      if (!o.fecha_operacion) continue
      const d = new Date(o.fecha_operacion)
      const k = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
      if (map.has(k)) map.set(k, map.get(k)! + 1)
    }
    return Array.from(map.entries()).map(([mes, ops]) => ({ Mes: mes, Operaciones: ops }))
  }, [operaciones])

  const cosechaPorCamada = useMemo(() => {
    const map = new Map<string, { plantas: number; gTrim: number }>()
    for (const o of operaciones) {
      const cam = o.datos_extra?.camada
      if (!cam) continue
      const key = String(cam).startsWith('C') ? cam : `C${cam}`
      if (!map.has(key)) map.set(key, { plantas: 0, gTrim: 0 })
      const m = map.get(key)!
      if (o.tipo_operacion === 'cosecha') m.plantas += parseFloat(o.cantidad_entrada) || 0
      if (o.tipo_operacion === 'trimming') m.gTrim += parseFloat(o.peso_neto_g) || 0
    }
    return Array.from(map.entries()).sort().map(([cam, v]) => ({
      Camada: cam, Plantas: v.plantas, 'Trim (g)': Math.round(v.gTrim),
    }))
  }, [operaciones])

  const opsEnPeriodo = useMemo(() => {
    const corte = diasAtras(periodo)
    return corte ? operaciones.filter(o => new Date(o.fecha_operacion) >= corte).length : operaciones.length
  }, [operaciones, periodo])

  const periodoActual = PERIODOS.find(p => p.v === periodo)

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <BarChart3 className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">
              Dashboard BI
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              <span className="text-[#d9f99d] tabular-nums">{opsEnPeriodo}</span> ops · {periodoActual?.subLabel}
              {ultimaSinc && (
                <span className="hidden sm:inline">
                  <span className="text-[#30303e] mx-1.5">│</span>
                  Sinc {ultimaSinc.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
            ONLINE
          </span>
          <button
            onClick={cargar}
            disabled={sincronizando}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{sincronizando ? 'Sinc…' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      <div className="ct-dash-wrap px-3 sm:px-6 py-5 sm:py-7 pb-24 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto">

        {/* Filtros período — segmented control prominente */}
        <Section title="Período de análisis" icon={Calendar}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Seleccionar periodo">
            {PERIODOS.map((p) => {
              const active = periodo === p.v
              return (
                <button
                  key={p.v}
                  onClick={() => setPeriodo(p.v)}
                  aria-pressed={active}
                  className={`px-3.5 sm:px-4 py-2 text-[12.5px] sm:text-[13px] font-medium rounded-lg border transition-all tabular-nums ${
                    active
                      ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d] shadow-[0_0_0_3px_rgba(63,176,116,0.06)]'
                      : 'bg-[#101016] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Hero KPI: Stock final — número GIGANTE */}
        <Section title="Stock final almacenado" icon={Package} subtitle="Total fraccionado disponible">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}>
            <div className="relative rounded-2xl bg-gradient-to-br from-[#101016] via-[#15151d] to-[#101016] border border-[#463a66] p-6 sm:p-8 overflow-hidden">
              {/* Glow dorado decorativo */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#a78bfa]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" aria-hidden />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#a3e635]/8 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" aria-hidden />

              <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-center">
                {/* Número gigante */}
                <div className="lg:col-span-3">
                  {cargando ? (
                    <div className="space-y-3">
                      <div className="h-3 w-32 bg-[#1c1c27] rounded animate-pulse" />
                      <div className="h-20 w-72 bg-[#1c1c27] rounded animate-pulse" />
                      <div className="h-3 w-48 bg-[#1c1c27] rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#463a66] bg-[#a78bfa]/15">
                          <Package className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
                        </div>
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-[#a6a6b5] font-semibold">
                          Stock final
                        </p>
                      </div>
                      <div className="font-display font-bold tabular-nums leading-[0.95] text-[#c4b5fd] drop-shadow-[0_0_30px_rgba(227,185,74,0.15)]">
                        <span className="text-[64px] sm:text-[88px] lg:text-[100px] tracking-tight">
                          {kpis.totalKgFinal.toFixed(2)}
                        </span>
                        <span className="text-[28px] sm:text-[36px] text-[#a78bfa] font-semibold ml-2">kg</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#a6a6b5]">
                        <HeroFact label="gramos totales" value={kpis.totalGramosFinal.toLocaleString('es-AR')} />
                        <HeroFact label="bolsas fraccionadas" value={lotes.filter(l => l.productos?.tipo_producto === 'flor_fraccionada').length} />
                        <HeroFact label="camadas completadas" value={kpis.camadasTotales - kpis.camadasActivas} />
                      </div>
                    </>
                  )}
                </div>

                {/* Sparkline lateral */}
                {stockSparkline.length > 1 && !cargando && (
                  <div className="lg:col-span-2">
                    <p className="text-[10.5px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-2">
                      Evolución kg trim · últ. {stockSparkline.length}d
                    </p>
                    <div className="rounded-xl bg-[#0a0a0f]/40 border border-[#1f1f2b] p-3">
                      <SparkAreaChart
                        data={stockSparkline}
                        index="fecha"
                        categories={['kg']}
                        colors={['amber']}
                        className="h-20 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Section>

        {/* KPIs principales — grandes */}
        <Section title="Producción global" icon={TrendingUp} subtitle="Métricas históricas acumuladas">
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden" animate="visible" variants={stagger}>
            <KpiBig
              label="Plantas cosechadas"
              valor={cargando ? null : kpis.totalPlantasCosechadas.toLocaleString('es-AR')}
              unidad="plantas"
              hint={`distribuidas en ${kpis.camadasTotales} camadas`}
              icono={Leaf} tone="primary"
            />
            <KpiBig
              label="Camadas activas"
              valor={cargando ? null : String(kpis.camadasActivas)}
              unidad={`/ ${kpis.camadasTotales}`}
              hint={`${kpis.camadasTotales - kpis.camadasActivas} ya procesadas`}
              icono={Layers} tone="primary"
            />
            <KpiBig
              label="Rendimiento por planta"
              valor={cargando ? null : String(kpis.gPorPlanta)}
              unidad="g · trim neto"
              hint={`sobre ${kpis.totalPlantasCosechadas.toLocaleString('es-AR')} plantas cosechadas`}
              icono={Activity} tone="gold"
            />
          </motion.div>
        </Section>

        {/* Ratios productivos — % gigante centrado */}
        <Section title="Ratios productivos" icon={Beaker} subtitle="Calidad de proceso vs benchmarks esperados">
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            initial="hidden" animate="visible" variants={stagger}>
            <RatioBig
              titulo="Fresco → Seco"
              detalle={`${kpis.totalKgFresco.toFixed(1)} kg → ${kpis.totalKgSeco.toFixed(1)} kg`}
              pct={kpis.ratioFrescoSeco}
              esperado="22 – 28%"
              ok={kpis.ratioFrescoSeco >= 22 && kpis.ratioFrescoSeco <= 30}
            />
            <RatioBig
              titulo="Seco → Trim"
              detalle={`${kpis.totalKgSeco.toFixed(1)} kg → ${(kpis.totalTrimGramos / 1000).toFixed(2)} kg`}
              pct={kpis.ratioSecoTrim}
              esperado="50 – 65%"
              ok={kpis.ratioSecoTrim >= 50 && kpis.ratioSecoTrim <= 70}
            />
            <RatioBig
              titulo="Calidad analítica"
              detalle={`${kpis.analisisTotal} análisis · ${kpis.noConformes} PNC · ${kpis.reclamos} reclamos`}
              pct={kpis.pctAnalisisOk}
              esperado="≥ 90%"
              ok={kpis.pctAnalisisOk >= 90}
            />
          </motion.div>
        </Section>

        {/* Charts — cuadricula con título grande */}
        <Section title="Análisis temporal" icon={Activity} subtitle="Distribución y evolución">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              titulo="Operaciones por mes"
              subtitulo="Últimos 12 meses · serie temporal"
              icono={Activity}
            >
              <AreaChart
                className="mt-4 h-72"
                data={opsPorMes}
                index="Mes"
                categories={['Operaciones']}
                colors={['#a3e635']}
                showLegend={false}
                showGridLines
                showAnimation
                animationDuration={900}
                curveType="natural"
                valueFormatter={(v) => `${v}`}
              />
            </ChartCard>

            <ChartCard
              titulo="Distribución por sistema"
              subtitulo="Lotes RDWC vs COCO"
              icono={Sparkles}
            >
              <DonutChart
                className="mt-4 h-72"
                data={distribSistema}
                category="value"
                index="name"
                colors={['#a3e635', '#c4b5fd']}
                showAnimation
                animationDuration={900}
                valueFormatter={(v) => `${v.toLocaleString('es-AR')} lotes`}
              />
            </ChartCard>

            <ChartCard
              titulo="Lotes por tipo de producto"
              subtitulo="Inventario actual"
              icono={Package}
            >
              <BarChart
                className="mt-4 h-72"
                data={distribTipo}
                index="name"
                categories={['Lotes']}
                colors={['#bef264']}
                showLegend={false}
                showAnimation
                animationDuration={900}
                yAxisWidth={36}
              />
            </ChartCard>

            <ChartCard
              titulo="Cosecha por camada"
              subtitulo="Plantas vs trim acumulado"
              icono={Leaf}
            >
              <BarChart
                className="mt-4 h-72"
                data={cosechaPorCamada}
                index="Camada"
                categories={['Plantas', 'Trim (g)']}
                colors={['#a3e635', '#c4b5fd']}
                showAnimation
                animationDuration={900}
                yAxisWidth={48}
              />
            </ChartCard>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

type IconCmp = typeof Package
type Tone = 'primary' | 'gold'

const TONE: Record<Tone, { bg: string; border: string; icon: string; valor: string; glow: string }> = {
  primary: { bg: 'rgba(63,176,116,0.10)',  border: '#404d20', icon: '#bef264', valor: '#ececf1', glow: 'rgba(63,176,116,0.10)' },
  gold:    { bg: 'rgba(196,154,44,0.10)',  border: '#463a66', icon: '#c4b5fd', valor: '#c4b5fd', glow: 'rgba(227,185,74,0.10)' },
}

function Section({ title, subtitle, icon: Icono, children }: { title: string; subtitle?: string; icon?: IconCmp; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          {Icono && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#1f1f2b] bg-[#101016]">
              <Icono className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
            </div>
          )}
          <div>
            <h2 className="font-display font-bold text-[14px] sm:text-[15px] text-[#ececf1] tracking-tight leading-tight">{title}</h2>
            {subtitle && <p className="text-[10.5px] sm:text-[11px] text-[#5c5c6b] mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function HeroFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono tabular-nums font-semibold text-[15px] sm:text-[17px] text-[#d4d4dd]">{value}</span>
      <span className="text-[10.5px] sm:text-[11px] text-[#757584]">{label}</span>
    </div>
  )
}

function KpiBig({
  label, valor, unidad, hint, icono: Icono, tone,
}: { label: string; valor: string | null; unidad?: string; hint: string; icono: IconCmp; tone: Tone }) {
  const t = TONE[tone]
  return (
    <motion.div variants={fadeUp}>
      <div className="relative rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-all p-5 sm:p-6 h-full overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-40 group-hover:opacity-60 transition-opacity"
             style={{ background: t.glow }} aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] uppercase tracking-[0.16em] text-[#5c5c6b] font-semibold">{label}</p>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border"
              style={{ background: t.bg, borderColor: t.border, color: t.icon }}>
              <Icono className="w-4 h-4" strokeWidth={1.8} />
            </div>
          </div>
          {valor === null ? (
            <div className="h-12 w-32 bg-[#1c1c27] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display font-bold tracking-tight text-[36px] sm:text-[44px] leading-none tabular-nums" style={{ color: t.valor }}>
                {valor}
              </span>
              {unidad && (
                <span className="text-[14px] sm:text-[16px] font-medium text-[#8f8f9f] tabular-nums">{unidad}</span>
              )}
            </div>
          )}
          <p className="text-[11.5px] text-[#757584] mt-3">{hint}</p>
        </div>
      </div>
    </motion.div>
  )
}

function RatioBig({
  titulo, detalle, pct, esperado, ok,
}: { titulo: string; detalle: string; pct: number; esperado: string; ok: boolean }) {
  const fill = ok ? 'linear-gradient(90deg, #a3e635, #bef264)' : 'linear-gradient(90deg, #a78bfa, #c4b5fd)'
  const text = ok ? '#d9f99d' : '#c4b5fd'
  const border = ok ? '#404d20' : '#463a66'
  const glow = ok ? 'rgba(63,176,116,0.12)' : 'rgba(227,185,74,0.12)'
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <motion.div variants={fadeUp}>
      <div className="relative rounded-xl bg-[#101016] border p-5 sm:p-6 h-full overflow-hidden"
        style={{ borderColor: border }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50"
          style={{ background: glow }} aria-hidden />
        <div className="relative">
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1] mb-3">{titulo}</h3>

          <div className="flex items-end gap-3 mb-3">
            <span className="font-display font-bold text-[44px] sm:text-[52px] leading-none tabular-nums" style={{ color: text }}>
              {pct}
            </span>
            <span className="text-[20px] sm:text-[24px] font-semibold text-[#8f8f9f] mb-1">%</span>
          </div>

          <div className="h-2 rounded-full bg-[#1c1c27] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 1.0, ease: EASE, delay: 0.2 }}
              className="h-full rounded-full"
              style={{ background: fill, boxShadow: `0 0 8px ${text}33` }}
            />
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11.5px] text-[#a6a6b5] tabular-nums">{detalle}</p>
            <p className="text-[10.5px] text-[#5c5c6b]">
              Esperado: <span className="text-[#a6a6b5] tabular-nums font-mono">{esperado}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ChartCard({ titulo, subtitulo, icono: Icono, children }: { titulo: string; subtitulo?: string; icono: IconCmp; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5">
        <div className="flex items-start gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#404d20] bg-[#a3e635]/10 flex-shrink-0 mt-0.5">
            <Icono className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-[14px] sm:text-[15px] text-[#ececf1] tracking-tight">{titulo}</h3>
            {subtitulo && <p className="text-[10.5px] text-[#5c5c6b] mt-0.5">{subtitulo}</p>}
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  )
}
