// Componente para mostrar alertas_operativas (P2.5) — las auto-generadas por
// triggers Postgres al detectar umbrales fuera de rango en condiciones_ambientales
// o cosecha. Suscripcion Realtime para update en vivo.
// Botones: marcar resuelta (con accion) y refresh.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Thermometer, Droplet, FlaskConical,
  Wind, Bug, Scale,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type Severidad = 'critical' | 'warning' | 'info'

interface AlertaOperativa {
  id: string
  tabla_origen: string
  registro_id: string
  codigo_cumcs: string | null
  camada: string | null
  tipo_alerta: string
  severidad: Severidad
  titulo: string
  mensaje: string
  parametro: string | null
  valor_detectado: number | null
  rango_min: number | null
  rango_max: number | null
  resuelta: boolean
  creado_en: string
}

const ICONO_POR_TIPO: Record<string, typeof Thermometer> = {
  temp_alta: Thermometer, temp_baja: Thermometer,
  humedad_alta: Droplet, humedad_baja: Droplet, humedad_producto_alta: Droplet, humedad_producto_baja: Droplet,
  ph_fuera_rango: FlaskConical, ec_alta: FlaskConical,
  co2_bajo: Wind,
  plaga_detectada: Bug, hongo_detectado: Bug,
  rendimiento_bajo: Scale, sanidad_no_conforme: AlertTriangle,
}

const SEV_ESTILO: Record<Severidad, { bg: string; text: string; pill: string; dot: string }> = {
  critical: {
    bg: 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50',
    text: 'text-red-700 dark:text-red-300',
    pill: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  info: {
    bg: 'bg-sky-50/50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800/50',
    text: 'text-sky-700 dark:text-sky-300',
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
}

export default function AlertasOperativas() {
  const [alertas, setAlertas] = useState<AlertaOperativa[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroSev, setFiltroSev] = useState<Severidad | 'todas'>('todas')
  const [mostrarResueltas, setMostrarResueltas] = useState(false)
  const [expandidas, setExpandidas] = useState(false)

  useEffect(() => {
    cargar()
    // Suscripcion Realtime para update en vivo cuando un trigger inserta nueva alerta
    const ch = supabase
      .channel('alertas-operativas-realtime')
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'alertas_operativas' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarResueltas])

  async function cargar() {
    const q = supabase
      .from('alertas_operativas')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(200)
    if (!mostrarResueltas) q.eq('resuelta', false)
    const { data, error } = await q
    if (!error && data) setAlertas(data as AlertaOperativa[])
    setCargando(false)
  }

  async function marcarResuelta(id: string, accion: string = 'Confirmado por operador') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('alertas_operativas')
      .update({
        resuelta: true,
        resuelta_por: user?.id,
        resuelta_en: new Date().toISOString(),
        accion_tomada: accion,
      })
      .eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Alerta marcada como resuelta')
  }

  // Filtrar por severidad
  const filtradas = alertas.filter(a =>
    filtroSev === 'todas' ? true : a.severidad === filtroSev
  )

  const counts = {
    critical: alertas.filter(a => a.severidad === 'critical' && !a.resuelta).length,
    warning: alertas.filter(a => a.severidad === 'warning' && !a.resuelta).length,
    info: alertas.filter(a => a.severidad === 'info' && !a.resuelta).length,
  }

  const visibles = expandidas ? filtradas : filtradas.slice(0, 10)

  if (cargando) {
    return (
      <div className="h-32 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 animate-pulse" />
    )
  }

  if (alertas.length === 0 && !mostrarResueltas) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-display font-semibold text-surface-900 dark:text-white">Alertas operativas: sin activas</h3>
          <p className="text-[11px] text-surface-600 dark:text-surface-400">
            No hay alertas de umbrales fuera de rango. Los triggers revisan cada INSERT/UPDATE en condiciones ambientales y cosecha.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header con counts + filtros */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-display font-bold text-surface-900 dark:text-white">
            Alertas operativas (umbrales)
          </h3>
          <div className="flex items-center gap-2">
            <PillSev sev="critical" count={counts.critical} activo={filtroSev === 'critical'} onClick={() => setFiltroSev(filtroSev === 'critical' ? 'todas' : 'critical')} />
            <PillSev sev="warning" count={counts.warning} activo={filtroSev === 'warning'} onClick={() => setFiltroSev(filtroSev === 'warning' ? 'todas' : 'warning')} />
            <PillSev sev="info" count={counts.info} activo={filtroSev === 'info'} onClick={() => setFiltroSev(filtroSev === 'info' ? 'todas' : 'info')} />
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-surface-600 dark:text-surface-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mostrarResueltas}
            onChange={e => setMostrarResueltas(e.target.checked)}
            className="w-3 h-3 accent-primary-600"
          />
          Mostrar resueltas
        </label>
      </div>

      {/* Lista */}
      <AnimatePresence mode="popLayout">
        {visibles.map(a => {
          const sev = SEV_ESTILO[a.severidad]
          const Icon = ICONO_POR_TIPO[a.tipo_alerta] ?? AlertTriangle
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl border ${sev.bg} ${a.resuelta ? 'opacity-50' : ''} p-3 flex items-start gap-3`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sev.pill}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-surface-900 dark:text-white">{a.titulo}</h4>
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${sev.pill}`}>
                    {a.severidad === 'critical' ? 'Critica' : a.severidad === 'warning' ? 'Warning' : 'Info'}
                  </span>
                  {a.camada && <span className="text-[10px] font-mono text-surface-500">{a.camada}</span>}
                  {a.codigo_cumcs && <span className="text-[10px] font-mono text-surface-500">{a.codigo_cumcs}</span>}
                </div>
                <p className="text-xs text-surface-600 dark:text-surface-400">{a.mensaje}</p>
                <div className="flex items-center gap-3 text-[10px] text-surface-400 dark:text-surface-500 tabular-nums">
                  <span>{new Date(a.creado_en).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  {a.parametro && a.valor_detectado != null && (
                    <span>
                      <b>{a.parametro}</b>: {a.valor_detectado}
                      {a.rango_min != null && a.rango_max != null && ` (rango ${a.rango_min}-${a.rango_max})`}
                      {a.rango_max != null && a.rango_min == null && ` (max ${a.rango_max})`}
                      {a.rango_min != null && a.rango_max == null && ` (min ${a.rango_min})`}
                    </span>
                  )}
                </div>
              </div>
              {!a.resuelta && (
                <button
                  onClick={() => marcarResuelta(a.id)}
                  className="flex-shrink-0 px-2.5 py-1.5 bg-white/80 dark:bg-surface-800/80 hover:bg-white dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  title="Marcar como resuelta"
                >
                  <CheckCircle2 className="w-3 h-3" /> Resolver
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Expandir si hay muchas */}
      {filtradas.length > 10 && (
        <button
          onClick={() => setExpandidas(v => !v)}
          className="w-full text-center text-xs font-semibold text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 py-2 rounded-md transition-colors"
        >
          {expandidas ? `Mostrar solo 10` : `+ Ver ${filtradas.length - 10} mas (${filtradas.length} en total)`}
        </button>
      )}

      {filtradas.length === 0 && filtroSev !== 'todas' && (
        <p className="text-xs text-surface-500 dark:text-surface-400 italic text-center py-4">
          Sin alertas {filtroSev === 'critical' ? 'criticas' : filtroSev === 'warning' ? 'warnings' : 'info'} activas.
        </p>
      )}
    </div>
  )
}

function PillSev({ sev, count, activo, onClick }: { sev: Severidad; count: number; activo: boolean; onClick: () => void }) {
  const s = SEV_ESTILO[sev]
  const label = sev === 'critical' ? 'Criticas' : sev === 'warning' ? 'Warnings' : 'Info'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] transition-all ${
        activo ? `${s.pill} ring-2 ring-offset-1 ring-current dark:ring-offset-surface-900` : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className="font-semibold tabular-nums">{count}</span>
      <span>{label}</span>
    </button>
  )
}
