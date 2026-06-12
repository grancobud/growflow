import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Leaf, Scissors, Package, Flower2, Sprout,
  ArrowDown, Loader2, AlertCircle, FlaskConical, CheckCircle2, GitBranch,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Traza = {
  codigo_buscado: string; camada: string
  cadena: Array<{ id: string; codigo_lote: string; cantidad: number; fecha: string; sistema: string; tipo_producto: string; producto: string; etapa_orden: number }>
  analisis_asociados: any[]
  error?: string
}

const ICONS: Record<string, any> = {
  planta_madre: Leaf, esqueje: Sprout, planta: Flower2, flor: Flower2,
  flor_trimmeada: Scissors, flor_fraccionada: Package,
}
const COLORS: Record<string, { icon: string; bg: string }> = {
  planta_madre: { icon: 'text-[#c4b5fd]', bg: 'bg-[#a78bfa]/15' },
  esqueje:      { icon: 'text-[#bef264]', bg: 'bg-[#a3e635]/15' },
  planta:       { icon: 'text-[#d9f99d]', bg: 'bg-[#a3e635]/10' },
  flor:         { icon: 'text-[#f9a8d4]', bg: 'bg-pink-900/20' },
  flor_trimmeada:  { icon: 'text-[#c4b5fd]', bg: 'bg-purple-900/20' },
  flor_fraccionada: { icon: 'text-[#93c5fd]', bg: 'bg-sky-900/20' },
}
const defaultColor = { icon: 'text-[#8f8f9f]', bg: 'bg-[#15151d]' }

export default function PaginaTrazInversa() {
  const [q, setQ] = useState('')
  const [cargando, setCargando] = useState(false)
  const [traza, setTraza] = useState<Traza | null>(null)

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim()) return
    setCargando(true); setTraza(null)
    const { data } = await supabase.rpc('trazabilidad_inversa', { p_codigo: q.trim() })
    setTraza(data as Traza)
    setCargando(false)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <GitBranch className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Trazabilidad Inversa</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Del producto final al origen genetico
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> sale-to-seed</span>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />ONLINE
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Search card */}
        <form
          onSubmit={buscar}
          className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5"
        >
          <p className="text-[12.5px] text-[#b3b3c0] mb-3 leading-relaxed">
            Ingresa el codigo de un lote terminado (blister, kg trim, etc) y mostramos la cadena completa hasta la planta madre.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b] pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="25.FIS.BI1.C7.1  ·  ALM-C9-COCO  ·  25.Tr8.Ka.PM4.C11"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0a0a0f] border border-[#1f1f2b] focus:border-[#404d20] rounded-md text-[12.5px] text-[#ececf1] placeholder:text-[#5c5c6b] font-mono outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || !q.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[11.5px] font-medium text-[#d9f99d]"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar cadena
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {traza?.error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl bg-[#7a2820]/20 border border-[#7a2820] text-[#ff8a7a] p-4 text-[12.5px] flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#ff6b5a]" /> {traza.error}
            </motion.div>
          )}

          {!traza && !cargando && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-8 text-center"
            >
              <GitBranch className="w-10 h-10 text-[#2a2a3a] mx-auto mb-3" />
              <p className="text-[12.5px] text-[#5c5c6b]">Ingresa un codigo de lote para ver la cadena inversa</p>
              <p className="text-[11px] text-[#46464f] mt-1">Ej: 25.PM4.CL11.Li2.VG001.SF2</p>
            </motion.div>
          )}

          {traza && !traza.error && (
            <motion.div
              key="res"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
              className="space-y-4"
            >
              {/* Header hit */}
              <div className="rounded-xl bg-[#a3e635]/8 border border-[#404d20] p-5 flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 bg-[#a3e635]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#a3e635]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Cadena encontrada</p>
                  <p className="font-mono font-bold text-[#ececf1] text-[16px] break-all">{traza.codigo_buscado}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Camada</p>
                  <p className="font-bold font-display text-[22px] text-[#c4b5fd] tabular-nums">{traza.camada}</p>
                </div>
              </div>

              {/* Cadena inversa timeline */}
              <section className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5">
                <h3 className="text-[13px] font-display font-bold text-[#ececf1] mb-4 flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-[#a3e635]" />
                  Cadena inversa completa (sale → seed)
                  <span className="text-[11px] font-normal text-[#5c5c6b]">{traza.cadena.length} etapas</span>
                </h3>
                <motion.ol
                  className="space-y-0"
                  initial="hidden" animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {traza.cadena.map((e, i) => {
                    const Icon = ICONS[e.tipo_producto] || Leaf
                    const c = COLORS[e.tipo_producto] || defaultColor
                    const isLast = i === traza.cadena.length - 1
                    return (
                      <motion.li
                        key={e.id + i}
                        variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                      >
                        <div className="flex items-start gap-3 py-2">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
                              <Icon className={`w-4 h-4 ${c.icon}`} />
                            </div>
                            {!isLast && <div className="w-px flex-1 min-h-[24px] bg-[#1f1f2b] mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">
                                {e.tipo_producto.replace(/_/g, ' ')}
                              </span>
                              {e.sistema && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#15151d] border border-[#1f1f2b] rounded text-[#8f8f9f] font-medium">
                                  {e.sistema}
                                </span>
                              )}
                            </div>
                            <Link
                              to={`/audit-trail/${e.id}`}
                              className="font-mono text-[12.5px] text-[#ececf1] hover:text-[#bef264] font-semibold break-all transition-colors"
                            >
                              {e.codigo_lote}
                            </Link>
                            <p className="text-[11px] text-[#5c5c6b] mt-0.5">
                              {e.producto} · <span className="tabular-nums">{e.cantidad}</span> unid · <span className="tabular-nums">{e.fecha}</span>
                            </p>
                          </div>
                        </div>
                      </motion.li>
                    )
                  })}
                </motion.ol>
              </section>

              {/* Analisis asociados */}
              {traza.analisis_asociados?.length > 0 && (
                <section className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5">
                  <h3 className="text-[13px] font-display font-bold text-[#ececf1] mb-3 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-[#a3e635]" />
                    Analisis de laboratorio
                    <span className="text-[11px] font-normal text-[#5c5c6b]">({traza.analisis_asociados.length})</span>
                  </h3>
                  <ul className="divide-y divide-[#1f1f2b]">
                    {traza.analisis_asociados.map((a: any, i: number) => (
                      <li key={i} className="flex items-center gap-3 py-2 text-[11.5px] flex-wrap">
                        <span className="font-mono font-semibold text-[#bef264]">{a.numero_certificado}</span>
                        <span className="text-[#d4d4dd]">{a.laboratorio_nombre}</span>
                        <span className="text-[#5c5c6b] tabular-nums">{a.fecha_analisis}</span>
                        <span className="ml-auto px-2 py-0.5 rounded-md bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] font-semibold text-[10px] uppercase">
                          {a.resultado_general}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
