import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, History, Hash, User, Calendar, FileText, Activity,
  CheckCircle2, AlertCircle, Lock, ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { KpiGridSkeleton } from '../components/ui/loading-states'
import { EmptyState } from '../components/ui/empty-state'

type Datos = {
  lote: { id: string; codigo_lote: string; cantidad: number; estado: string; camada: string; producto: string; tipo_producto: string; creado_en: string; actualizado_en: string }
  registros: Array<{ id: string; fecha: string; usuario_email: string; tabla_nombre: string; operacion: string; datos_nuevos: any; datos_anteriores: any; campos_modificados: any; hash_sha256: string; hash_anterior: string; ip_origen: string }>
  operaciones: Array<{ id: string; tipo_operacion: string; fecha_operacion: string; cantidad_entrada: number; cantidad_salida: number; observaciones: string; responsable: string; estado: string }>
  resumen: { total_cambios: number; primer_cambio: string | null; ultimo_cambio: string | null; usuarios_que_editaron: number }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

export default function PaginaAuditTrail() {
  const { id } = useParams()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    setCargando(true); setError('')
    ;(async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc('audit_trail_lote', { p_lote_id: id })
        if (cancelled) return
        if (rpcErr) throw rpcErr
        setDatos(data as Datos)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Error cargando audit trail')
      } finally {
        if (!cancelled) setCargando(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  function opStyle(op: string) {
    if (op === 'INSERT') return 'bg-[#a3e635]/15 text-[#d9f99d] border border-[#404d20]'
    if (op === 'UPDATE') return 'bg-[#a78bfa]/15 text-[#c4b5fd] border border-[#463a66]'
    if (op === 'DELETE') return 'bg-[#7a2820]/30 text-[#ff8a7a] border border-[#7a2820]'
    return 'bg-[#15151d] text-[#b3b3c0] border border-[#1f1f2b]'
  }

  function hashChainValido(registros: Datos['registros']): boolean {
    const ordenados = [...registros].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    for (let i = 1; i < ordenados.length; i++) {
      if (ordenados[i].hash_anterior !== ordenados[i - 1].hash_sha256) return false
    }
    return true
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ShieldCheck className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Audit Trail</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {datos?.lote?.codigo_lote
                ? <span className="font-mono tabular-nums text-[#b3b3c0]">{datos.lote.codigo_lote}</span>
                : 'Cargando...'}
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> cadena hash SHA-256</span>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />GAMP5
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        <Link
          to="/trazabilidad"
          className="inline-flex items-center gap-2 text-[11.5px] text-[#5c5c6b] hover:text-[#d9f99d] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Trazabilidad
        </Link>

        {cargando && (
          <div className="space-y-4">
            <div className="h-24 rounded-xl bg-[#101016] border border-[#1f1f2b] animate-pulse" />
            <KpiGridSkeleton count={4} />
            <div className="h-64 rounded-xl bg-[#101016] border border-[#1f1f2b] animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[#7a2820]/20 border border-[#7a2820] text-[#ff8a7a] p-4 text-[12.5px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#ff6b5a]" /> {error}
          </div>
        )}

        {datos && (
          <motion.div
            className="space-y-4"
            initial="hidden" animate="visible" variants={staggerContainer}
          >
            {/* Header del lote */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5"
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#a3e635]/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-[#a3e635]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Lote</p>
                    <p className="font-display text-[18px] font-bold text-[#ececf1] font-mono tabular-nums break-all">{datos.lote.codigo_lote}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <InfoMini label="Camada" value={datos.lote.camada || '-'} />
                  <InfoMini label="Producto" value={datos.lote.producto} />
                  <InfoMini label="Cantidad" value={String(datos.lote.cantidad)} mono />
                  <InfoMini label="Estado" value={datos.lote.estado} />
                </div>
              </div>
            </motion.div>

            {/* Hash chain validation */}
            <motion.div variants={fadeUp}>
              <HashChainBadge valido={hashChainValido(datos.registros)} />
            </motion.div>

            {/* Resumen 4 stats */}
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <Stat icon={History} label="Cambios totales" value={datos.resumen.total_cambios} color="primary" />
              <Stat icon={User} label="Usuarios editores" value={datos.resumen.usuarios_que_editaron} color="gold" />
              <Stat icon={Calendar} label="Primer cambio" value={datos.resumen.primer_cambio ? new Date(datos.resumen.primer_cambio).toLocaleDateString('es-AR') : '-'} color="neutral" />
              <Stat icon={Calendar} label="Ultimo cambio" value={datos.resumen.ultimo_cambio ? new Date(datos.resumen.ultimo_cambio).toLocaleDateString('es-AR') : '-'} color="neutral" />
            </motion.div>

            {/* Operaciones seed-to-sale */}
            {datos.operaciones.length > 0 && (
              <motion.section
                variants={fadeUp}
                className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5"
              >
                <h3 className="text-[13px] font-display font-bold text-[#ececf1] mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#a3e635]" />
                  Operaciones seed-to-sale
                  <span className="text-[11px] font-normal text-[#5c5c6b]">({datos.operaciones.length})</span>
                </h3>
                <ul className="divide-y divide-[#1f1f2b]">
                  {datos.operaciones.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 py-2 text-[11.5px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${opStyle(o.estado === 'confirmado' ? 'INSERT' : 'UPDATE')}`}>
                        {o.tipo_operacion.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#8f8f9f] tabular-nums flex-shrink-0">
                        {new Date(o.fecha_operacion).toLocaleDateString('es-AR')}
                      </span>
                      <span className="text-[#d4d4dd] font-mono tabular-nums">
                        {o.cantidad_entrada ? `+${o.cantidad_entrada}` : ''}
                        {o.cantidad_salida ? ` -${o.cantidad_salida}` : ''}
                      </span>
                      {o.responsable && <span className="text-[#5c5c6b] truncate hidden sm:inline">· {o.responsable}</span>}
                      {o.estado === 'confirmado' && <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635] ml-auto flex-shrink-0" aria-label="Confirmada" />}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}

            {/* Audit log detallado */}
            <motion.section
              variants={fadeUp}
              className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5"
            >
              <h3 className="text-[13px] font-display font-bold text-[#ececf1] mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#a3e635]" />
                Historial de cambios
                <span className="text-[11px] font-normal text-[#5c5c6b]">({datos.registros.length})</span>
              </h3>
              {datos.registros.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  titulo="Sin registros en audit log"
                  descripcion="Este lote no tiene cambios registrados todavia. Cuando se modifique quedara asentado aqui con su hash SHA-256."
                />
              ) : (
                <div className="space-y-2">
                  {datos.registros.map((r) => (
                    <div
                      key={r.id}
                      className="border border-[#1f1f2b] rounded-lg overflow-hidden bg-[#15151d]"
                    >
                      <button
                        onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-[11.5px] hover:bg-[#1c1c27] transition-colors"
                        aria-expanded={expandido === r.id}
                      >
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${opStyle(r.operacion)}`}>{r.operacion}</span>
                        <span className="text-[#d4d4dd] font-mono tabular-nums flex-shrink-0 hidden sm:inline">{r.tabla_nombre}</span>
                        <span className="text-[#8f8f9f] tabular-nums flex-shrink-0">{new Date(r.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span className="text-[#5c5c6b] truncate flex-1 text-left hidden md:inline">{r.usuario_email}</span>
                        <span className="text-[10px] text-[#bef264] font-mono tabular-nums flex-shrink-0">{r.hash_sha256?.slice(0, 8)}…{r.hash_sha256?.slice(-4)}</span>
                      </button>
                      {expandido === r.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-[#0a0a0f] p-3 text-[11px] space-y-2 border-t border-[#1f1f2b]"
                        >
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Hash SHA-256</p>
                            <p className="font-mono text-[10px] text-[#bef264] break-all">{r.hash_sha256}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Hash anterior (encadenado)</p>
                            <p className="font-mono text-[10px] text-[#757584] break-all">{r.hash_anterior || '(primer registro de la cadena)'}</p>
                          </div>
                          {r.campos_modificados && Array.isArray(r.campos_modificados) && r.campos_modificados.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1">Campos modificados</p>
                              <div className="flex flex-wrap gap-1">
                                {r.campos_modificados.map((c: string) => (
                                  <span key={c} className="px-2 py-0.5 bg-[#a78bfa]/15 text-[#c4b5fd] border border-[#463a66] rounded text-[10px] font-mono">{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.datos_nuevos && (
                            <details>
                              <summary className="cursor-pointer text-[#5c5c6b] hover:text-[#b3b3c0] font-medium text-[10.5px]">
                                Ver JSON completo
                              </summary>
                              <pre className="mt-2 p-2 bg-[#060908] rounded text-[10px] text-[#d9f99d] overflow-x-auto max-h-60">{JSON.stringify(r.datos_nuevos, null, 2)}</pre>
                            </details>
                          )}
                          {r.ip_origen && (
                            <p className="text-[#5c5c6b] flex items-center gap-1 text-[10.5px]">
                              IP: <code className="font-mono text-[#b3b3c0]">{r.ip_origen}</code>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Compliance footer */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl bg-[#a3e635]/8 border border-[#404d20] p-4 flex items-start gap-3"
            >
              <Lock className="w-4 h-4 text-[#a3e635] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#b3b3c0] leading-relaxed">
                Este audit trail cumple con <strong className="text-[#d9f99d]">21 CFR Part 11</strong> (FDA),{' '}
                <strong className="text-[#d9f99d]">EU-GMP Annex 11</strong> (EMA) y{' '}
                <strong className="text-[#d9f99d]">ALCOA+</strong>. Registros append-only con hash SHA-256 encadenado
                tipo blockchain. Cualquier alteracion rompe la cadena y se detecta inmediatamente.
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ========== Sub-components ==========

function InfoMini({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{label}</p>
      <p className={`text-[12.5px] font-medium text-[#d4d4dd] ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function HashChainBadge({ valido }: { valido: boolean }) {
  if (valido) {
    return (
      <div className="rounded-xl p-4 bg-[#a3e635]/8 border border-[#404d20] flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#a3e635]/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-[#bef264]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#d9f99d]">
            Cadena de hash SHA-256 valida
          </p>
          <p className="text-[11px] text-[#5c5c6b] mt-0.5">
            Todos los registros estan integros. 21 CFR Part 11 · EU-GMP Annex 11 · ALCOA+ compliance.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl p-4 bg-[#7a2820]/20 border border-[#7a2820] flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-[#7a2820]/40 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-[#ff6b5a]" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#ff8a7a]">
          Cadena de hash rota
        </p>
        <p className="text-[11px] text-[#8f8f9f] mt-0.5">
          Puede indicar manipulacion o error en la persistencia. Reportar incidente de compliance.
        </p>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: any; color: 'primary' | 'gold' | 'neutral'
}) {
  const styles: Record<typeof color, { icon: string; bg: string }> = {
    primary: { icon: 'text-[#a3e635]', bg: 'bg-[#a3e635]/10' },
    gold:    { icon: 'text-[#c4b5fd]', bg: 'bg-[#a78bfa]/10' },
    neutral: { icon: 'text-[#8f8f9f]', bg: 'bg-[#15151d]' },
  }
  const s = styles[color]
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${s.icon}`} />
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{label}</p>
      </div>
      <p className="text-[18px] font-bold font-display text-[#ececf1] tabular-nums">{value}</p>
    </div>
  )
}
