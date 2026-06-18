// PaginaPanel — dashboard del cultivo personal.
// Esquema simplificado: plantas, eventos, cosechas.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Leaf, Droplets, Flower2, Scale, ArrowRight, Sprout,
  Activity, FileText, Dna, BellRing, Wrench, CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { cultivoService, type ResumenPlanta, type Evento, type FasePlanta } from '../lib/cultivo'
import { stockService, proximoEfectivo, diasParaProximo, type Mantenimiento, type Insumo } from '../lib/stock'

const EASE = [0.22, 1, 0.36, 1] as const
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } } }

const COLOR_FASE: Record<FasePlanta, { text: string; bg: string; border: string }> = {
  Germinacion: { text: '#d9f99d', bg: 'rgba(163,230,53,0.10)', border: '#404d20' },
  Plantula:    { text: '#d9f99d', bg: 'rgba(163,230,53,0.10)', border: '#404d20' },
  Vegetativo:  { text: '#bef264', bg: 'rgba(163,230,53,0.14)', border: '#404d20' },
  Floracion:   { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66' },
  Secado:      { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  Curado:      { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  Cosechada:   { text: '#8f8f9f', bg: 'rgba(180,180,200,0.06)', border: '#2a2a3a' },
  Muerta:      { text: '#ff8a7a', bg: 'rgba(122,40,32,0.15)', border: '#7a2820' },
}

const ICONO_EVENTO: Record<string, string> = {
  Riego: '💧', Fertilizacion: '🧪', Poda: '✂️', Trasplante: '🪴',
  CambioFase: '🔄', Entrenamiento: '🪢', Problema: '⚠️', Foto: '📷', Nota: '📝',
}

export default function PaginaPanel() {
  const [plantas, setPlantas] = useState<ResumenPlanta[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [pesoSecoTotal, setPesoSecoTotal] = useState(0)
  const [mantes, setMantes] = useState<Mantenimiento[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [cargando, setCargando] = useState(true)

  async function cargar() {
    try {
      const [resumen, ultimosEventos, cosechas, man, ins] = await Promise.all([
        cultivoService.getResumenPlantas(true),
        cultivoService.getEventos(undefined, 10),
        cultivoService.getCosechas(),
        stockService.getMantenimientos().catch(() => []),
        stockService.getInsumos().catch(() => []),
      ])
      setPlantas(resumen)
      setEventos(ultimosEventos)
      setPesoSecoTotal(cosechas.reduce((acc, c) => acc + (c.peso_seco_g ?? 0), 0))
      setMantes(man)
      setInsumos(ins)
    } catch (err) {
      console.error('Error cargando panel:', err)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  // Alarmas de mantenimiento: vencidas, para hoy o mañana (diasParaProximo <= 1).
  const alarmas = mantes
    .map(m => ({ m, dias: diasParaProximo(m) }))
    .filter(x => x.dias !== null && (x.dias as number) <= 1)
    .sort((a, b) => (a.dias as number) - (b.dias as number))

  const hechoHoy = async (m: Mantenimiento) => {
    try {
      const proximo = m.frecuencia_dias ? new Date(Date.now() + m.frecuencia_dias * 86400000).toISOString().slice(0, 10) : null
      await stockService.actualizarMantenimiento(m.id, { fecha_realizado: new Date().toISOString().slice(0, 10), proximo })
      toast.success('Registrado como hecho hoy'); cargar()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const enFlora = plantas.filter(p => p.fase === 'Floracion').length
  const riegosHoy = eventos.filter(e => e.tipo === 'Riego' && e.fecha === hoy).length
  const sinRiegoDias = (p: ResumenPlanta) =>
    p.ultimo_riego ? Math.floor((Date.now() - new Date(p.ultimo_riego).getTime()) / 86400000) : null

  const tarjetas = [
    { label: 'Plantas activas', valor: plantas.length, icono: Leaf, hint: 'en el cultivo', color: '#d9f99d', bg: 'rgba(163,230,53,0.10)', border: '#404d20' },
    { label: 'En floración', valor: enFlora, icono: Flower2, hint: 'camino a cosecha', color: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66' },
    { label: 'Riegos hoy', valor: riegosHoy, icono: Droplets, hint: 'registrados', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: '#1d3a5a' },
    { label: 'Cosechado', valor: pesoSecoTotal, icono: Scale, hint: 'gramos secos', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  ]

  const nombrePlanta = (id: string | null) =>
    plantas.find(p => p.id === id)?.nombre ?? 'General'

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Mi Cultivo</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Resumen de plantas y actividad
            </div>
          </div>
          <div className="flex-1" />
          <Link to="/plantas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d]">
            <Sprout className="w-3.5 h-3.5" /> Plantas
          </Link>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Alarmas de mantenimiento (se ven apenas entrás a la app) */}
        {alarmas.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
            className="rounded-xl border border-[#5a4a20] bg-gradient-to-br from-[#f59e0b]/12 to-[#ff8a7a]/[0.08] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#5a4a20]/60 bg-[#f59e0b]/[0.08]">
              <span className="relative flex h-4 w-4 items-center justify-center flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fbbf24]/40" />
                <BellRing className="w-4 h-4 text-[#fbbf24] relative" />
              </span>
              <h3 className="font-display font-bold text-[13px] text-[#fbbf24]">
                {alarmas.length} alarma{alarmas.length === 1 ? '' : 's'} de mantenimiento
              </h3>
              <span className="hidden sm:inline text-[10.5px] text-[#a6a6b5]">— para hoy, mañana o vencidas</span>
              <Link to="/stock" className="ml-auto text-[11px] text-[#fbbf24] hover:text-[#fde68a] font-medium flex items-center gap-1 flex-shrink-0">
                Ver todo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y divide-[#5a4a20]/30">
              {alarmas.map(({ m, dias }) => {
                const d = dias as number
                const vinc = m.insumo_id ? insumos.find(i => i.id === m.insumo_id) : null
                const titulo = vinc?.nombre || m.equipo || 'Equipo'
                const cuando = d < 0 ? { txt: `Vencido hace ${Math.abs(d)}d`, col: '#ff8a7a' } : d === 0 ? { txt: 'Hoy', col: '#fb923c' } : { txt: 'Mañana', col: '#fbbf24' }
                return (
                  <li key={m.id} className="flex items-center gap-2.5 px-4 py-2">
                    <Wrench className="w-3.5 h-3.5 text-[#a78bfa] flex-shrink-0" />
                    <span className="font-medium text-[12.5px] text-[#ececf1] truncate">{titulo}</span>
                    <span className="hidden sm:inline text-[10.5px] text-[#a6a6b5] truncate">· {m.tipo} · próx {proximoEfectivo(m) ? new Date(proximoEfectivo(m)! + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}</span>
                    <span className="ml-auto text-[11px] font-semibold flex-shrink-0" style={{ color: cuando.col }}>{cuando.txt}</span>
                    <button onClick={() => hechoHoy(m)} className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#404d20] bg-[#a3e635]/10 hover:bg-[#a3e635]/20 text-[10.5px] font-medium text-[#d9f99d] transition-colors" title="Marcar como hecho hoy">
                      <CheckCircle2 className="w-3 h-3" /> Hecho
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}

        {/* KPI cards */}
        {cargando ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 animate-pulse h-[100px]" />
            ))}
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" initial="hidden" animate="visible" variants={stagger}>
            {tarjetas.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}
                className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 hover:border-[#404d20] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{stat.label}</p>
                    <p className="font-display font-bold tracking-tight text-[24px] sm:text-[28px] text-[#ececf1] mt-1.5 leading-none tabular-nums">
                      {stat.valor.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[10.5px] text-[#757584] mt-1.5">{stat.hint}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ background: stat.bg, borderColor: stat.border, color: stat.color }}>
                    <stat.icono className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 sm:gap-5">
          {/* Plantas activas */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-3 border-b border-[#1f1f2b] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Leaf className="w-3.5 h-3.5 text-[#bef264] flex-shrink-0" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1] truncate">Plantas activas</h3>
              </div>
              <Link to="/plantas" className="text-[11px] text-[#d9f99d] hover:text-[#bef264] font-medium flex items-center gap-1 flex-shrink-0">
                <span className="hidden sm:inline">Gestionar</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {cargando ? (
              <div className="px-4 sm:px-5 py-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[#15151d] border border-[#1f1f2b] rounded-md animate-pulse" />
                ))}
              </div>
            ) : plantas.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-9 h-9 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-2">
                  <Sprout className="w-4 h-4 text-[#5c5c6b]" />
                </div>
                <div className="font-display font-semibold text-[#d4d4dd] text-[13px]">Sin plantas todavía</div>
                <div className="mt-1 text-[11px] text-[#5c5c6b] max-w-xs mx-auto">Cargá tu primera genética y planta, o mandale un mensaje al bot de Telegram.</div>
                <Link to="/plantas" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d]">
                  <Dna className="w-3 h-3" /> Agregar planta
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#1f1f2b]">
                {plantas.map((p) => {
                  const cf = COLOR_FASE[p.fase]
                  const dias = sinRiegoDias(p)
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-[#15151d] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[#ececf1] truncate leading-tight">{p.nombre}</p>
                        <p className="text-[10.5px] text-[#757584] truncate mt-0.5">
                          {p.genetica ?? 'Sin genética'}{p.banco ? ` · ${p.banco}` : ''}
                          {p.dias_de_vida != null ? ` · día ${p.dias_de_vida}` : ''}
                        </p>
                      </div>
                      {dias != null && dias >= 2 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#38bdf8] tabular-nums flex-shrink-0" title={`Último riego hace ${dias} días`}>
                          <Droplets className="w-3 h-3" /> {dias}d
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium flex-shrink-0"
                        style={{ color: cf.text, background: cf.bg, borderColor: cf.border }}>
                        {p.fase}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>

          {/* Ultimos eventos */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
            className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#bef264] flex-shrink-0" />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1] truncate">Última actividad</h3>
            </div>
            {cargando ? (
              <div className="px-4 sm:px-5 py-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-[#15151d] border border-[#1f1f2b] rounded-md animate-pulse" />
                ))}
              </div>
            ) : eventos.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-9 h-9 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4 text-[#5c5c6b]" />
                </div>
                <div className="font-display font-semibold text-[#d4d4dd] text-[13px]">Sin actividad</div>
                <div className="mt-1 text-[11px] text-[#5c5c6b]">Los riegos, podas y notas aparecen acá.</div>
              </div>
            ) : (
              <ul className="divide-y divide-[#1f1f2b]">
                {eventos.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-[#15151d] transition-colors">
                    <span className="text-[16px] flex-shrink-0 leading-none" aria-hidden="true">
                      {ICONO_EVENTO[e.tipo] ?? '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#ececf1] truncate leading-tight">
                        {e.tipo} · <span className="text-[#a6a6b5]">{nombrePlanta(e.planta_id)}</span>
                      </p>
                      {e.detalle && (
                        <p className="text-[10.5px] text-[#757584] truncate mt-0.5">{e.detalle}</p>
                      )}
                    </div>
                    <span className="text-[10.5px] text-[#5c5c6b] tabular-nums font-mono flex-shrink-0">
                      {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
