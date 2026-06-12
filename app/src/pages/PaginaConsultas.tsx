// PaginaConsultas — pagina de CONSULTAS (no de monitoreo).
// Dos modos:
//   1) Consulta IA: input estilo chat con sugerencias + cascada via Edge Function `agent-cumcs`.
//   2) Por sector: grid de cards alineadas a los grupos CUMCS G01-G10 con consultas predefinidas.

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, LayoutGrid, Send, Loader2, X, ChevronRight,
  Thermometer, Boxes, FlaskConical, Droplets, Bug, Scissors,
  Wrench, Users, ShieldCheck, FileText, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invokeAgent, type AgentChatMessage } from '../lib/agentCumcs'
import { toast } from 'sonner'
import PresenciaAvatars from '../components/PresenciaAvatars'

const EASE = [0.22, 1, 0.36, 1] as const

// ─── Sugerencias de prompts para Consulta IA ────────────────────────────────
const SUGERENCIAS_PROMPT = [
  '¿Cuántos lotes activos hay actualmente?',
  '¿Cuál fue la última cosecha registrada?',
  'Mostrame todas las alertas críticas de esta semana',
  '¿Qué camadas están en floración?',
  '¿Cuántos kilos de flor seca tenemos en depósito?',
  'Listame las últimas 5 aplicaciones de fitosanitarios',
] as const

// ─── Sectores (alineados a grupos CUMCS G01-G10) ────────────────────────────
interface Consulta {
  titulo: string
  descripcion: string
  // run() devuelve filas crudas para mostrar en tabla.
  run: () => Promise<{ rows: any[]; cols: string[] } | { error: string }>
}

interface Sector {
  id: string
  grupo: string
  nombre: string
  descripcion: string
  icon: typeof Thermometer
  tone: string // tailwind-like class hue
  consultas: Consulta[]
}

async function consultaTabla(
  table: string,
  cols: string,
  ordenarPor?: string,
  limit = 50,
  filtros?: (q: any) => any,
): Promise<{ rows: any[]; cols: string[] } | { error: string }> {
  let q = supabase.from(table).select(cols)
  if (filtros) q = filtros(q)
  if (ordenarPor) q = q.order(ordenarPor, { ascending: false, nullsFirst: false })
  q = q.limit(limit)
  const { data, error } = await q
  if (error) return { error: error.message }
  const colList = data && data.length > 0 ? Object.keys(data[0]) : cols.split(',').map(s => s.trim())
  return { rows: data || [], cols: colList }
}

const SECTORES: Sector[] = [
  {
    id: 'produccion-ambiental',
    grupo: 'G01',
    nombre: 'Producción · Ambientales',
    descripcion: 'Temperatura, humedad, VPD, CO₂, pH y EC en sala',
    icon: Thermometer,
    tone: 'emerald',
    consultas: [
      {
        titulo: 'Últimas mediciones ambientales',
        descripcion: 'Las 50 mediciones más recientes (todas las salas)',
        run: () => consultaTabla(
          'registros_condiciones_ambientales',
          'fecha,sistema,etapa,temperatura,humedad,vpd_kpa,co2_ppm,ph_inicial,ec',
          'fecha', 50,
        ),
      },
      {
        titulo: 'Mediciones de los últimos 7 días',
        descripcion: 'Tendencia de la última semana',
        run: () => {
          const desde = new Date(Date.now() - 7 * 86400000).toISOString()
          return consultaTabla(
            'registros_condiciones_ambientales',
            'fecha,sistema,etapa,temperatura,humedad,vpd_kpa,co2_ppm',
            'fecha', 200,
            (q) => q.gte('fecha', desde),
          )
        },
      },
    ],
  },
  {
    id: 'trazabilidad',
    grupo: 'G02',
    nombre: 'Trazabilidad',
    descripcion: 'Códigos PM, clonación, vegetativa, floración, cosecha',
    icon: Boxes,
    tone: 'emerald',
    consultas: [
      {
        titulo: 'Cadenas (códigos de trazabilidad)',
        descripcion: 'Últimos 50 registros de trazabilidad PM',
        run: () => consultaTabla(
          'registros_trazabilidad',
          'fecha,camada,sistema,tipo,cod_generico,cod_traza_cosecha,cod_traza_secado,cod_comercial',
          'fecha', 50,
        ),
      },
      {
        titulo: 'Lotes activos',
        descripcion: 'Catálogo de lotes con estado activo',
        run: () => consultaTabla(
          'lotes', 'codigo_lote,estado,cantidad,creado_en,producto_id,instalacion_id',
          'creado_en', 100,
          (q) => q.eq('estado', 'activo').eq('eliminado', false),
        ),
      },
    ],
  },
  {
    id: 'fertilizantes',
    grupo: 'G03',
    nombre: 'Fertilizantes',
    descripcion: 'Aplicaciones, EC, gasto de solución nutritiva',
    icon: FlaskConical,
    tone: 'emerald',
    consultas: [
      {
        titulo: 'Últimas aplicaciones',
        descripcion: 'Las 50 aplicaciones de fertilizantes más recientes',
        run: () => consultaTabla(
          'registros_fertilizantes',
          'fecha,tipo,producto,cantidad,unidad,ec,etapa,sistema,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'agua',
    grupo: 'G04',
    nombre: 'Agua y riego',
    descripcion: 'Sanitización del sistema y análisis de agua',
    icon: Droplets,
    tone: 'sky',
    consultas: [
      {
        titulo: 'Últimos análisis y sanitizaciones',
        descripcion: 'Los 50 registros más recientes de agua',
        run: () => consultaTabla(
          'registros_agua',
          'fecha,tipo,parametro,valor,unidad,observaciones,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'fitosanitarios',
    grupo: 'G05',
    nombre: 'Fitosanitarios',
    descripcion: 'Plagas, monitoreo, aplicaciones y LMR',
    icon: Bug,
    tone: 'amber',
    consultas: [
      {
        titulo: 'Últimas aplicaciones',
        descripcion: 'Las 50 aplicaciones de fitosanitarios más recientes',
        run: () => consultaTabla(
          'registros_fitosanitarios',
          'fecha,tipo,producto,plaga,dosis,sistema,etapa,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'cosecha',
    grupo: 'G06',
    nombre: 'Cosecha y postcosecha',
    descripcion: 'Certificados, recepción de secado, trimming',
    icon: Scissors,
    tone: 'orange',
    consultas: [
      {
        titulo: 'Últimas cosechas',
        descripcion: 'Las 50 cosechas más recientes',
        run: () => consultaTabla(
          'registros_cosecha',
          'fecha,tipo,camada,sistema,cod_traza_cosecha,peso_fresco_kg,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'mantenimiento',
    grupo: 'G07',
    nombre: 'Mantenimiento',
    descripcion: 'Balanza, generador, AC, deshumidificadores',
    icon: Wrench,
    tone: 'violet',
    consultas: [
      {
        titulo: 'Últimos mantenimientos',
        descripcion: 'Los 50 registros más recientes',
        run: () => consultaTabla(
          'registros_mantenimiento',
          'fecha,tipo,equipo,accion,observaciones,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'personal',
    grupo: 'G08',
    nombre: 'Personal',
    descripcion: 'Capacitaciones, EPI, accidentes y limpieza',
    icon: Users,
    tone: 'violet',
    consultas: [
      {
        titulo: 'Últimos registros de personal',
        descripcion: 'Los 50 registros más recientes',
        run: () => consultaTabla(
          'registros_personal',
          'fecha,tipo,persona,accion,observaciones,responsable',
          'fecha', 50,
        ),
      },
    ],
  },
  {
    id: 'calidad',
    grupo: 'G09',
    nombre: 'Calidad',
    descripcion: 'Contramuestras, análisis de laboratorio, no conformidades',
    icon: ShieldCheck,
    tone: 'indigo',
    consultas: [
      {
        titulo: 'Últimos resultados de calidad',
        descripcion: 'Los 50 registros más recientes',
        run: () => consultaTabla(
          'registros_calidad',
          'fecha,tipo,resultado,numero_certificado,responsable',
          'fecha', 50,
        ),
      },
      {
        titulo: 'Resultados de laboratorio',
        descripcion: 'Análisis externos vinculados a lote',
        run: () => consultaTabla(
          'resultados_laboratorio',
          'creado_en,lote_id,thc,cbd,resultado_general,laboratorio',
          'creado_en', 50,
        ),
      },
    ],
  },
  {
    id: 'documentacion',
    grupo: 'G10',
    nombre: 'Documentación',
    descripcion: 'SOPs, control de cambios, auditorías',
    icon: FileText,
    tone: 'indigo',
    consultas: [
      {
        titulo: 'Últimos documentos',
        descripcion: 'Los 50 registros documentales más recientes',
        run: () => consultaTabla(
          'registros_documentales',
          'fecha,tipo,titulo,version,observaciones,responsable',
          'fecha', 50,
        ),
      },
      {
        titulo: 'SOPs vigentes',
        descripcion: 'Procedimientos GMP/GACP',
        run: () => consultaTabla(
          'sops', 'codigo,titulo,version,vigente_desde,estado', 'vigente_desde', 100,
        ),
      },
    ],
  },
] as const

// ─── Helpers UI ─────────────────────────────────────────────────────────────
function formatearFecha(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function celdaValor(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  // Detectar fechas ISO
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return formatearFecha(v)
  return String(v)
}

// ─── Modo IA ────────────────────────────────────────────────────────────────
interface TurnoChat {
  role: 'user' | 'assistant'
  content: string
  modelo?: string
  pendiente?: boolean
}

function ModoConsultaIA() {
  const [pregunta, setPregunta] = useState('')
  const [historial, setHistorial] = useState<TurnoChat[]>([])
  const [enviando, setEnviando] = useState(false)

  const messagesAgent = useMemo<AgentChatMessage[]>(
    () => historial
      .filter(t => !t.pendiente)
      .map(t => ({ role: t.role, content: t.content })),
    [historial],
  )

  async function enviar(texto: string) {
    const msg = texto.trim()
    if (!msg || enviando) return
    setPregunta('')
    setHistorial(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '', pendiente: true }])
    setEnviando(true)
    const res = await invokeAgent(msg, messagesAgent)
    setEnviando(false)
    setHistorial(prev => {
      const sin = prev.filter(t => !t.pendiente)
      if (res.ok) {
        return [...sin, { role: 'assistant', content: res.data.respuesta, modelo: res.data.modelo_usado }]
      }
      const detalle = res.detalle ? ` · ${res.detalle}` : ''
      return [...sin, { role: 'assistant', content: `Hubo un problema: ${res.error}${detalle}` }]
    })
    if (!res.ok) toast.error('No pude consultar a la IA', { description: res.error })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center gap-3">
        <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <Sparkles className="w-4 h-4 text-primary-700 dark:text-primary-300" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-surface-900 dark:text-white text-[15px]">Consulta en lenguaje natural</h2>
          <p className="text-[12px] text-surface-500 dark:text-surface-400 mt-0.5">
            Preguntale a la IA por datos puntuales, conteos, últimos registros o resúmenes.
          </p>
        </div>
      </div>

      {/* Sugerencias */}
      {historial.length === 0 && (
        <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800">
          <p className="text-[11px] uppercase tracking-widest text-surface-500 mb-2 font-medium">Sugerencias</p>
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS_PROMPT.map(s => (
              <button
                key={s}
                onClick={() => enviar(s)}
                disabled={enviando}
                className="px-3 py-1.5 rounded-full border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 hover:border-primary-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-[12px] text-surface-700 dark:text-surface-200 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="px-5 py-4 max-h-[480px] overflow-y-auto space-y-3 border-b border-surface-200 dark:border-surface-800">
          {historial.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  t.role === 'user'
                    ? 'bg-primary-700 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-100'
                }`}
              >
                {t.pendiente ? (
                  <span className="inline-flex items-center gap-2 text-surface-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> pensando…
                  </span>
                ) : (
                  t.content
                )}
                {t.modelo && (
                  <div className="mt-1.5 text-[10px] uppercase tracking-widest opacity-60 font-mono">{t.modelo}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); void enviar(pregunta) }}
        className="px-5 py-4 flex items-center gap-2"
      >
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Preguntá lo que necesitas saber…"
          disabled={enviando}
          className="flex-1 px-4 py-2.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl text-[13px] text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:border-primary-700/60 focus:ring-2 focus:ring-primary-700/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={enviando || !pregunta.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-[12.5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Consultar
        </button>
      </form>
    </motion.div>
  )
}

// ─── Modo Sectores ──────────────────────────────────────────────────────────
const TONE_CLASSES: Record<string, { icon: string; bg: string; border: string }> = {
  emerald: { icon: 'text-primary-700 dark:text-primary-300', bg: 'bg-primary-100 dark:bg-primary-900/30', border: 'hover:border-primary-700/50 dark:hover:border-primary-700' },
  amber:   { icon: 'text-accent-500',                         bg: 'bg-accent-500/10',                     border: 'hover:border-accent-500/50' },
  orange:  { icon: 'text-orange-600 dark:text-orange-300',    bg: 'bg-orange-100 dark:bg-orange-900/30',  border: 'hover:border-orange-500/50' },
  sky:     { icon: 'text-sky-600 dark:text-sky-300',          bg: 'bg-sky-100 dark:bg-sky-900/30',        border: 'hover:border-sky-500/50' },
  violet:  { icon: 'text-violet-600 dark:text-violet-300',    bg: 'bg-violet-100 dark:bg-violet-900/30',  border: 'hover:border-violet-500/50' },
  indigo:  { icon: 'text-indigo-600 dark:text-indigo-300',    bg: 'bg-indigo-100 dark:bg-indigo-900/30',  border: 'hover:border-indigo-500/50' },
}

function ModoSectores() {
  const [sectorAbierto, setSectorAbierto] = useState<Sector | null>(null)
  const [consultaActiva, setConsultaActiva] = useState<Consulta | null>(null)
  const [resultados, setResultados] = useState<{ rows: any[]; cols: string[] } | null>(null)
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function ejecutar(consulta: Consulta) {
    setConsultaActiva(consulta)
    setResultados(null)
    setErrorConsulta(null)
    setCargando(true)
    try {
      const r = await consulta.run()
      if ('error' in r) {
        setErrorConsulta(r.error)
        toast.error('Consulta falló', { description: r.error })
      } else {
        setResultados(r)
      }
    } finally {
      setCargando(false)
    }
  }

  function cerrarDrawer() {
    setSectorAbierto(null)
    setConsultaActiva(null)
    setResultados(null)
    setErrorConsulta(null)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {SECTORES.map(s => {
          const tone = TONE_CLASSES[s.tone] || TONE_CLASSES.emerald
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => setSectorAbierto(s)}
              className={`group rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${tone.border}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`inline-flex w-10 h-10 items-center justify-center rounded-xl ${tone.bg}`}>
                  <Icon className={`w-5 h-5 ${tone.icon}`} />
                </span>
                <span className="text-[10px] font-mono tabular-nums text-surface-400 uppercase tracking-widest">{s.grupo}</span>
              </div>
              <h3 className="font-display font-semibold text-[14px] text-surface-900 dark:text-white">{s.nombre}</h3>
              <p className="mt-1 text-[12px] text-surface-500 dark:text-surface-400 leading-relaxed">{s.descripcion}</p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-surface-500 dark:text-surface-400">
                <span>{s.consultas.length} consulta{s.consultas.length === 1 ? '' : 's'}</span>
                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          )
        })}
      </motion.div>

      {/* Drawer del sector */}
      <AnimatePresence>
        {sectorAbierto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={cerrarDrawer}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-800 w-full max-w-4xl h-full overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-surface-50 dark:bg-surface-950/40">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary-700 dark:text-primary-300 font-semibold">{sectorAbierto.grupo}</div>
                  <h3 className="font-display font-bold text-[16px] text-surface-900 dark:text-white truncate">{sectorAbierto.nombre}</h3>
                  <p className="text-[12px] text-surface-500 mt-0.5">{sectorAbierto.descripcion}</p>
                </div>
                <button
                  onClick={cerrarDrawer}
                  className="p-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Consultas predefinidas */}
              <div className="px-5 py-3 border-b border-surface-200 dark:border-surface-800 flex flex-wrap gap-2">
                {sectorAbierto.consultas.map(c => (
                  <button
                    key={c.titulo}
                    onClick={() => void ejecutar(c)}
                    className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
                      consultaActiva?.titulo === c.titulo
                        ? 'border-primary-700 bg-primary-700 text-white'
                        : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200 hover:border-primary-700/50'
                    }`}
                    title={c.descripcion}
                  >
                    {c.titulo}
                  </button>
                ))}
              </div>

              {/* Resultados */}
              <div className="flex-1 overflow-auto">
                {!consultaActiva && (
                  <div className="text-center py-16 text-surface-500">
                    <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-[13px]">Elegí una consulta para ver resultados</p>
                  </div>
                )}
                {cargando && (
                  <div className="text-center py-16 text-surface-500">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary-700" />
                    <p className="text-[13px]">Consultando…</p>
                  </div>
                )}
                {!cargando && errorConsulta && (
                  <div className="m-5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-300" />
                    <span className="text-[12.5px] text-red-700 dark:text-red-200">{errorConsulta}</span>
                  </div>
                )}
                {!cargando && resultados && resultados.rows.length === 0 && (
                  <div className="text-center py-16 text-surface-500">
                    <p className="text-[13px]">Sin resultados.</p>
                  </div>
                )}
                {!cargando && resultados && resultados.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-surface-50 dark:bg-surface-950/80 backdrop-blur z-10">
                        <tr className="border-b border-surface-200 dark:border-surface-800">
                          {resultados.cols.map(c => (
                            <th key={c} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-primary-700 dark:text-primary-300 font-semibold whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.rows.map((r, i) => (
                          <tr key={i} className="border-b border-surface-100 dark:border-surface-800/60 hover:bg-surface-50 dark:hover:bg-surface-800/40">
                            {resultados.cols.map(c => (
                              <td key={c} className="px-3 py-1.5 text-surface-700 dark:text-surface-200 font-mono tabular-nums whitespace-nowrap max-w-[260px] truncate" title={celdaValor(r[c])}>
                                {celdaValor(r[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {resultados && resultados.rows.length > 0 && (
                <div className="px-5 py-2.5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/40 text-[11px] text-surface-500 font-mono tabular-nums">
                  {resultados.rows.length} fila{resultados.rows.length === 1 ? '' : 's'}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function PaginaConsultas() {
  const [modo, setModo] = useState<'ia' | 'sector'>('ia')

  return (
    <div className="flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-white">
      {/* TopBar */}
      <div className="sticky top-0 z-30 bg-surface-50/95 dark:bg-surface-950/95 backdrop-blur border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[16px] sm:text-[18px] text-surface-900 dark:text-white">Consultas</h1>
            <p className="mt-0.5 text-[11.5px] text-surface-500">Preguntale a la IA o explorá por sector</p>
          </div>
          <div className="flex-1" />
          <PresenciaAvatars pageKey="consultas" />
        </div>

        {/* Segmented control de modos */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
            <button
              onClick={() => setModo('ia')}
              className={`relative inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                modo === 'ia'
                  ? 'bg-white dark:bg-surface-800 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Consulta IA
            </button>
            <button
              onClick={() => setModo('sector')}
              className={`relative inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                modo === 'sector'
                  ? 'bg-white dark:bg-surface-800 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Por sector
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 pb-20">
        <AnimatePresence mode="wait">
          {modo === 'ia' && <div key="ia"><ModoConsultaIA /></div>}
          {modo === 'sector' && <div key="sector"><ModoSectores /></div>}
        </AnimatePresence>
      </div>
    </div>
  )
}
