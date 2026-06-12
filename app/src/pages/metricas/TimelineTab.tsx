// TimelineTab — cronología de eventos por camada con tema dark CannTrace.
// Reemplaza react-chrono por una timeline custom (más liviana, dark coherente, animada).

import { motion } from 'framer-motion'
import { Sprout, Leaf, Flower2, Scissors, Package, FlaskConical, Activity } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

const ETAPA: Record<string, { label: string; icono: any; color: string; bg: string; border: string }> = {
  planta_madre:     { label: 'Planta madre',     icono: Sprout,       color: '#d9f99d', bg: 'rgba(63,176,116,0.10)',  border: '#404d20' },
  esqueje:          { label: 'Esqueje / Clon',   icono: Sprout,       color: '#bef264', bg: 'rgba(63,176,116,0.10)',  border: '#404d20' },
  planta:           { label: 'Vegetativa',       icono: Leaf,         color: '#a3e635', bg: 'rgba(63,176,116,0.08)',  border: '#404d20' },
  flor:             { label: 'Floración / Cosecha', icono: Flower2,   color: '#c4b5fd', bg: 'rgba(196,154,44,0.10)',  border: '#463a66' },
  flor_trimmeada:   { label: 'Trimming',         icono: Scissors,     color: '#a78bfa', bg: 'rgba(196,154,44,0.10)',  border: '#463a66' },
  flor_fraccionada: { label: 'Almacenamiento',   icono: Package,      color: '#d9f99d', bg: 'rgba(63,176,116,0.10)',  border: '#404d20' },
  cuarentena:       { label: 'Cuarentena lab',   icono: FlaskConical, color: '#a6a6b5', bg: 'rgba(180,200,190,0.05)', border: '#1f1f2b' },
}
const FALLBACK = { label: 'Evento', icono: Activity, color: '#a6a6b5', bg: 'rgba(180,200,190,0.05)', border: '#1f1f2b' }

const fmtDate = (d: string) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TimelineTab({ timeline }: { timeline: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#1f1f2b] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-[#bef264] flex-shrink-0" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1] truncate">Cronología de eventos</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium tabular-nums">
          {timeline.length} {timeline.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      <div className="p-4 sm:p-6">
        <ol className="relative">
          {/* Línea vertical conectora */}
          <span
            aria-hidden
            className="absolute left-[18px] sm:left-[22px] top-2 bottom-2 w-px"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, #404d20 8%, #404d20 92%, transparent 100%)',
            }}
          />

          {timeline.map((t, i) => {
            const e = ETAPA[t.etapa] || FALLBACK
            const Icono = e.icono
            return (
              <motion.li
                key={`${t.codigo_lote}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: i * 0.04 }}
                className="relative pl-12 sm:pl-14 pb-5 last:pb-0"
              >
                <div
                  className="absolute left-0 top-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border z-10"
                  style={{ background: e.bg, borderColor: e.border, color: e.color, boxShadow: `0 0 14px ${e.color}22` }}
                >
                  <Icono className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.8} />
                </div>

                <div className="rounded-xl bg-[#15151d] border border-[#1f1f2b] hover:border-[#404d20] transition-colors px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h4 className="font-display font-semibold text-[12.5px] sm:text-[13px]" style={{ color: e.color }}>
                      {e.label}
                    </h4>
                    <time className="font-mono tabular-nums text-[10.5px] text-[#8f8f9f]">{fmtDate(t.fecha)}</time>
                  </div>
                  <div className="mt-1 text-[11px] text-[#a6a6b5] flex items-center gap-1.5 flex-wrap">
                    <code className="font-mono text-[#d4d4dd]">{t.codigo_lote}</code>
                    {t.producto && (<><span className="text-[#30303e]">·</span><span>{t.producto}</span></>)}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 sm:gap-3 flex-wrap text-[10.5px] text-[#8f8f9f]">
                    {t.cantidad != null && (
                      <span>
                        Cantidad: <span className="font-mono tabular-nums text-[#d4d4dd]">{Number(t.cantidad).toLocaleString('es-AR')}</span>
                      </span>
                    )}
                    {t.sistema && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded border text-[9.5px] uppercase tracking-wider font-medium"
                        style={
                          t.sistema === 'RDWC'
                            ? { background: 'rgba(63,176,116,0.10)', borderColor: '#404d20', color: '#d9f99d' }
                            : { background: 'rgba(196,154,44,0.10)', borderColor: '#463a66', color: '#c4b5fd' }
                        }
                      >
                        {t.sistema}
                      </span>
                    )}
                    {t.peso && (
                      <span>
                        Peso: <span className="font-mono tabular-nums text-[#c4b5fd]">{t.peso}</span><span className="text-[#5c5c6b]"> kg</span>
                      </span>
                    )}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </motion.div>
  )
}
