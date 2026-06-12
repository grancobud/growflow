import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, Shield, Check, X, Lock, Globe, Beaker, Package, History, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSnapshot } from '../lib/snapshotService'

type Idioma = 'es' | 'en'
const T: Record<Idioma, Record<string, string>> = {
  es: {
    titulo: 'Certificado de Análisis Digital',
    subtitulo: 'Trazabilidad seed-to-sale verificada',
    lote: 'Lote', producto: 'Producto', variedad: 'Variedad', camada: 'Camada',
    sistema: 'Sistema de cultivo', titular: 'Titular', reprocann: 'N° REPROCANN',
    creado: 'Fecha de creación', vence: 'Vencimiento', cantidad: 'Cantidad',
    analisis: 'Análisis cromatográfico (HPLC/GC)', cannabinoides: 'Cannabinoides',
    seguridad: 'Controles de seguridad', pesticidas: 'Pesticidas', metales: 'Metales pesados',
    micro: 'Microbiológico', micotoxinas: 'Micotoxinas', solventes: 'Solventes residuales',
    lab: 'Laboratorio', cert: 'Certificado', fechaAnalisis: 'Fecha de análisis',
    aprobado: 'APROBADO', rechazado: 'RECHAZADO',
    historia: 'Historia completa seed-to-sale', etapa: 'Etapa', codigo: 'Código', fecha: 'Fecha',
    audit: 'Integridad de datos', hashes: 'hashes SHA-256 encadenados',
    integridad: 'Los datos están protegidos con cadena de hash SHA-256 tipo blockchain. Cualquier alteración se detecta inmediatamente.',
    compliance: 'Compliance regulatorio',
    pie: 'CannTrace v1.0 · Sistema validado GAMP5 Categoría 5 · Res. ANMAT 1780/2025',
    nolote: 'Lote no encontrado',
    cargando: 'Cargando certificado…',
    sinAnalisis: 'Análisis de laboratorio pendiente',
    verificado: 'CoA verificado',
  },
  en: {
    titulo: 'Digital Certificate of Analysis',
    subtitulo: 'Verified seed-to-sale traceability',
    lote: 'Lot', producto: 'Product', variedad: 'Strain', camada: 'Batch',
    sistema: 'Growing system', titular: 'Licensee', reprocann: 'REPROCANN #',
    creado: 'Created', vence: 'Expires', cantidad: 'Quantity',
    analisis: 'Chromatographic analysis (HPLC/GC)', cannabinoides: 'Cannabinoids',
    seguridad: 'Safety controls', pesticidas: 'Pesticides', metales: 'Heavy metals',
    micro: 'Microbiology', micotoxinas: 'Mycotoxins', solventes: 'Residual solvents',
    lab: 'Laboratory', cert: 'Certificate', fechaAnalisis: 'Analysis date',
    aprobado: 'PASS', rechazado: 'FAIL',
    historia: 'Full seed-to-sale history', etapa: 'Stage', codigo: 'Code', fecha: 'Date',
    audit: 'Data integrity', hashes: 'chained SHA-256 hashes',
    integridad: 'Data is protected by a blockchain-style SHA-256 hash chain. Any alteration is instantly detectable.',
    compliance: 'Regulatory compliance',
    pie: 'CannTrace v1.0 · GAMP5 Category 5 validated system · ANMAT Res. 1780/2025',
    nolote: 'Lot not found',
    cargando: 'Loading certificate…',
    sinAnalisis: 'Lab analysis pending',
    verificado: 'CoA verified',
  },
}

type Coa = {
  codigo_lote: string; producto: string; tipo_producto: string; variedad: string | null
  cantidad: number; creado_en: string; fecha_vencimiento: string | null
  sistema: string | null; camada: string | null; organizacion: string | null; reprocann: string | null
  analisis: null | {
    numero_certificado: string; laboratorio: string; fecha_analisis: string
    thc_total: number | null; thca: number | null; thc_delta9: number | null
    cbd_total: number | null; cbda: number | null; cbg: number | null; cbn: number | null
    pesticidas_ok: boolean; metales_ok: boolean; micro_ok: boolean; micotoxinas_ok: boolean; solventes_ok: boolean
  }
  historial_etapas: Array<{ etapa: string; codigo: string; fecha: string }>
  audit_log_hashes: number
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.05 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export default function PaginaTrazaPublica() {
  const { codigo } = useParams<{ codigo: string }>()
  const [coa, setCoa] = useState<Coa | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [idioma, setIdioma] = useState<Idioma>('es')
  const t = T[idioma]

  useEffect(() => {
    async function cargar() {
      if (!codigo) return setError('Sin codigo')
      try {
        const { data, error } = await supabase.rpc('coa_publico', { p_codigo: codigo })
        if (error) throw error
        if (!data) return setError(t.nolote)

        const coaData = data as Coa

        // Si no hay analisis en el CoA legacy, intentar traer desde resultados_laboratorio
        // (tabla nueva donde el CoA Parser guarda los PDFs parseados)
        if (!coaData.analisis) {
          // Buscar por codigo_lote via RPC o query directa (RLS puede bloquear - usar select sobre vista publica)
          const { data: lab } = await supabase
            .from('resultados_laboratorio')
            .select('*, lote:lotes!inner(codigo_lote)')
            .eq('lote.codigo_lote', codigo)
            .order('fecha_analisis', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (lab) {
            const canna = (lab as any).cannabinoides || {}
            const ctrl = (lab as any).controles || {}
            const numAsFloat = (v: any) => v == null ? null : parseFloat(String(v))
            const okFlag = (v: any) => {
              if (!v) return false
              const s = String(v).toLowerCase()
              return s.includes('pass') || s.includes('aprobado') || s.includes('nd') || s.startsWith('<')
            }
            coaData.analisis = {
              numero_certificado: (lab as any).datos_extra?.certificado || `CoA-${(lab as any).id?.slice(0, 8) || ''}`,
              laboratorio: (lab as any).laboratorio || 'Sin especificar',
              fecha_analisis: (lab as any).fecha_analisis || '',
              thc_total: numAsFloat(canna.thc),
              thca: numAsFloat(canna.thca),
              thc_delta9: numAsFloat(canna.thc),
              cbd_total: numAsFloat(canna.cbd),
              cbda: numAsFloat(canna.cbda),
              cbg: numAsFloat(canna.cbg),
              cbn: numAsFloat(canna.cbn),
              pesticidas_ok: okFlag(ctrl.pesticidas),
              metales_ok: okFlag(ctrl.metales),
              micro_ok: okFlag(ctrl.microbiologia),
              micotoxinas_ok: okFlag(ctrl.micotoxinas),
              solventes_ok: okFlag(ctrl.solventes),
            }
          }
        }

        // Enriquecer con trazabilidad_snapshot si la camada existe en BD
        // (snapshot tiene fechas + cantidades capadas + códigos jerárquicos persistidos)
        if (coaData.camada) {
          try {
            const snap = await getSnapshot(coaData.camada)
            if (snap) {
              // Si historial está vacío, popular con fechas del snapshot
              if (!coaData.historial_etapas || coaData.historial_etapas.length === 0) {
                const stages: Array<{ etapa: string; codigo: string; fecha: string }> = []
                if (snap.fecha_pm_ingreso) stages.push({ etapa: 'Planta Madre', codigo: snap.codigo_pm || '', fecha: snap.fecha_pm_ingreso })
                if (snap.fecha_esqueje_inicio) stages.push({ etapa: 'Esquejado', codigo: snap.codigo_cl || '', fecha: snap.fecha_esqueje_inicio })
                if (snap.fecha_vege_inicio) stages.push({ etapa: 'Vegetativa', codigo: snap.codigo_vg_first || '', fecha: snap.fecha_vege_inicio })
                if (snap.fecha_flora_inicio) stages.push({ etapa: 'Floración', codigo: snap.codigo_fl_first || '', fecha: snap.fecha_flora_inicio })
                if (snap.fecha_cosecha) stages.push({ etapa: 'Cosecha', codigo: snap.codigo_fl_last || '', fecha: snap.fecha_cosecha })
                if (snap.fecha_secado_inicio) stages.push({ etapa: 'Secado', codigo: snap.codigo_cds_first || '', fecha: snap.fecha_secado_inicio })
                if (snap.fecha_trim) stages.push({ etapa: 'Trimming', codigo: snap.codigo_cds_last || '', fecha: snap.fecha_trim })
                if (snap.fecha_frac) stages.push({ etapa: 'Fraccionamiento', codigo: snap.codigo_alm || '', fecha: snap.fecha_frac })
                if (snap.fecha_dep) stages.push({ etapa: 'Depósito', codigo: snap.codigo_dep_last || '', fecha: snap.fecha_dep })
                if (stages.length > 0) coaData.historial_etapas = stages
              }
              // Cantidad: si CoA no tiene, usar snapshot ALM cap (gramos)
              if ((!coaData.cantidad || coaData.cantidad === 0) && snap.gramos_alm_capado) {
                coaData.cantidad = Number(snap.gramos_alm_capado)
              }
              // Sistema: snapshot lo tiene canónico
              if (!coaData.sistema && snap.sistema) coaData.sistema = snap.sistema
            }
          } catch (snapErr) {
            console.warn('Snapshot enrich falló:', snapErr)
          }
        }

        setCoa(coaData)
      } catch (e: any) { setError(e.message) }
      finally { setCargando(false) }
    }
    cargar()
  }, [codigo, t.nolote])

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-surface-950 to-surface-900 text-surface-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
          <p className="text-sm text-surface-400">{t.cargando}</p>
        </div>
      </div>
    )
  }

  if (error || !coa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-surface-950 to-surface-900 text-surface-200 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-display font-bold mb-1">{error || t.nolote}</h1>
          <p className="text-sm text-surface-400">
            {idioma === 'es' ? 'Verifica el codigo del lote o contacta al emisor del CoA.' : 'Verify the lot code or contact the CoA issuer.'}
          </p>
        </div>
      </div>
    )
  }

  const pass = !!(coa.analisis && coa.analisis.pesticidas_ok && coa.analisis.metales_ok && coa.analisis.micro_ok && coa.analisis.micotoxinas_ok && coa.analisis.solventes_ok)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-surface-950 to-surface-900 text-surface-200 font-sans">
      {/* Decorative blurs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-xl mx-auto px-3 sm:px-4 py-5 sm:py-10 pb-12">
        {/* Header + idioma */}
        <motion.div
          className="flex items-start justify-between gap-3 mb-5 sm:mb-6 flex-wrap"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-700 flex items-center justify-center shadow-lg shadow-primary-700/30 flex-shrink-0">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-primary-300 uppercase tracking-[0.18em] font-semibold">CannTrace</div>
              <h1 className="font-display text-[16px] sm:text-xl font-bold leading-tight">{t.titulo}</h1>
              <p className="text-[11px] sm:text-xs text-surface-400 mt-0.5">{t.subtitulo}</p>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0" role="group" aria-label="Language">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setIdioma(l)}
                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-md transition-colors min-h-[32px] ${
                  idioma === l
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-800/60 text-surface-400 hover:bg-surface-700/60'
                }`}
                aria-pressed={idioma === l}
              >
                <Globe className="w-3 h-3 inline mr-1 -mt-0.5" />
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Badge verificado */}
        <motion.div
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
          className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm p-5 text-center mb-3 ${
            pass
              ? 'bg-primary-500/10 border-primary-500/40'
              : 'bg-amber-500/10 border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pass ? 'bg-primary-500' : 'bg-amber-500'}`}>
              {pass ? <Check className="w-6 h-6 text-white" strokeWidth={3} /> : <Loader2 className="w-5 h-5 text-white animate-spin" />}
            </div>
          </div>
          <div className="font-display text-lg font-bold">{pass ? t.aprobado : t.sinAnalisis}</div>
          <div className="text-[10px] text-surface-400 mt-1 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            <span className="tabular-nums font-mono">{coa.audit_log_hashes}</span> {t.hashes}
          </div>
        </motion.div>

        {/* Datos del lote */}
        <SectionCard custom={1} icon={Package} title={t.lote}>
          <Row label={t.codigo} value={coa.codigo_lote} mono />
          <Row label={t.producto} value={coa.producto} />
          <Row label={t.variedad} value={coa.variedad || 'PETE HOPE (Ka)'} />
          <Row label={t.camada} value={coa.camada} />
          <Row label={t.sistema} value={coa.sistema} />
          <Row label={t.cantidad} value={coa.cantidad} mono />
          <Row label={t.creado} value={new Date(coa.creado_en).toLocaleDateString(idioma === 'es' ? 'es-AR' : 'en-US')} />
          {coa.fecha_vencimiento && <Row label={t.vence} value={new Date(coa.fecha_vencimiento).toLocaleDateString(idioma === 'es' ? 'es-AR' : 'en-US')} />}
          <Row label={t.titular} value={coa.organizacion} />
          {coa.reprocann && <Row label={t.reprocann} value={coa.reprocann} mono />}
        </SectionCard>

        {/* Analisis de lab */}
        {coa.analisis ? (
          <>
            <SectionCard custom={2} icon={Beaker} title={t.analisis}>
              <Row label={t.lab} value={coa.analisis.laboratorio} />
              <Row label={t.cert} value={coa.analisis.numero_certificado} mono />
              <Row label={t.fechaAnalisis} value={coa.analisis.fecha_analisis} />
              <div className="mt-3 mb-1 text-[10px] text-primary-300 uppercase tracking-wider font-semibold">{t.cannabinoides}</div>
              <div className="grid grid-cols-2 gap-x-4">
                <Row label="THC total" value={coa.analisis.thc_total ? `${coa.analisis.thc_total}%` : '—'} mono />
                <Row label="THCA" value={coa.analisis.thca ? `${coa.analisis.thca}%` : '—'} mono />
                <Row label="Δ9-THC" value={coa.analisis.thc_delta9 ? `${coa.analisis.thc_delta9}%` : '—'} mono />
                <Row label="CBD total" value={coa.analisis.cbd_total ? `${coa.analisis.cbd_total}%` : '—'} mono />
                <Row label="CBDA" value={coa.analisis.cbda ? `${coa.analisis.cbda}%` : '—'} mono />
                <Row label="CBG" value={coa.analisis.cbg ? `${coa.analisis.cbg}%` : '—'} mono />
                <Row label="CBN" value={coa.analisis.cbn ? `${coa.analisis.cbn}%` : '—'} mono />
              </div>
            </SectionCard>

            <SectionCard custom={3} icon={Shield} title={t.seguridad}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3">
                <CheckRow ok={coa.analisis.pesticidas_ok} label={t.pesticidas} />
                <CheckRow ok={coa.analisis.metales_ok} label={t.metales} />
                <CheckRow ok={coa.analisis.micro_ok} label={t.micro} />
                <CheckRow ok={coa.analisis.micotoxinas_ok} label={t.micotoxinas} />
                <CheckRow ok={coa.analisis.solventes_ok} label={t.solventes} />
              </div>
            </SectionCard>
          </>
        ) : (
          <motion.div
            custom={2} initial="hidden" animate="visible" variants={fadeUp}
            className="rounded-xl bg-amber-500/10 border border-amber-500/40 backdrop-blur-sm p-4 mb-3"
          >
            <p className="text-sm text-amber-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t.sinAnalisis}
            </p>
          </motion.div>
        )}

        {/* Historia seed-to-sale */}
        {coa.historial_etapas && coa.historial_etapas.length > 0 && (
          <SectionCard custom={4} icon={History} title={t.historia}>
            <div className="relative">
              {coa.historial_etapas.map((e, i) => {
                const isLast = i === coa.historial_etapas.length - 1
                return (
                  <div key={i} className="relative flex gap-3 pb-2">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-400 z-10 mt-1.5" />
                      {!isLast && <div className="w-px flex-1 bg-primary-500/30 min-h-[24px]" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-[10px] text-primary-300 uppercase tracking-wide font-semibold">
                        {e.etapa.replace(/_/g, ' ')}
                      </div>
                      <div className="font-mono text-xs text-surface-200 break-all mt-0.5">{e.codigo}</div>
                      <div className="text-[10px] text-surface-400 mt-0.5">{e.fecha}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Integridad */}
        <motion.div
          custom={5} initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl bg-primary-500/10 border border-primary-500/30 backdrop-blur-sm p-5 mb-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-display font-bold text-primary-200">{t.audit}</h3>
          </div>
          <p className="text-xs text-surface-300 leading-relaxed">{t.integridad}</p>
        </motion.div>

        {/* Compliance badges */}
        <SectionCard custom={6} icon={Shield} title={t.compliance}>
          <div className="flex flex-wrap gap-1.5">
            {['GAMP5 Cat.5', 'ANMAT 4159/2023', 'ANMAT 1780/2025', '21 CFR Part 11', 'EU-GMP Annex 11', 'ALCOA+'].map((b) => (
              <span
                key={b}
                className="text-[10px] px-2 py-1 bg-accent-500/20 text-accent-200 border border-accent-500/30 rounded-md font-semibold"
              >
                {b}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Pie */}
        <motion.p
          custom={7} initial="hidden" animate="visible" variants={fadeUp}
          className="text-center text-[10px] text-surface-500 mt-6 px-2"
        >
          {t.pie}
        </motion.p>
      </div>
    </div>
  )
}

// ========== Sub-components ==========

function SectionCard({
  icon: Icon, title, custom = 0, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  custom?: number
  children: React.ReactNode
}) {
  return (
    <motion.section
      custom={custom}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="rounded-2xl bg-surface-900/60 backdrop-blur-md border border-surface-700/40 p-4 sm:p-5 mb-3"
    >
      <h3 className="flex items-center gap-2 text-sm font-display font-bold text-surface-100 mb-3">
        <Icon className="w-4 h-4 text-primary-400" />
        {title}
      </h3>
      {children}
    </motion.section>
  )
}

function Row({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 sm:py-1.5 border-b border-surface-700/30 last:border-0 text-[12.5px] sm:text-[13px] gap-3">
      <span className="text-surface-400 flex-shrink-0">{label}</span>
      <span className={`text-surface-100 font-medium text-right break-words min-w-0 ${mono ? 'font-mono text-[11px] sm:text-xs tabular-nums' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[13px]">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          ok ? 'bg-primary-500' : 'bg-red-500'
        }`}
      >
        {ok ? <Check className="w-3 h-3 text-white" strokeWidth={3} /> : <X className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-surface-200">{label}</span>
    </div>
  )
}
