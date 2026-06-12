import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, ArrowLeft, FileText, Download, ChevronDown, Shield, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Archivo {
  name: string
  size: number
  updated_at: string
}

const FAQ = [
  { q: '¿Que es GAMP5?', a: 'Good Automated Manufacturing Practice 5. Estandar internacional para la validacion de sistemas computarizados en industrias reguladas como farma y alimentos. CannTrace esta validado en Categoria 5 (software a medida).' },
  { q: '¿Como funciona el CoA publico?', a: 'Cada lote genera un Certificate of Analysis accesible via QR en /traza/:codigo. Sin autenticacion. Muestra cannabinoides, controles de seguridad, historia seed-to-sale y hash SHA-256 del audit log para verificar integridad.' },
  { q: '¿Que es ALCOA+?', a: 'Atributable, Legible, Contemporaneo, Original, Exacto, mas Completo, Consistente, Perdurable, Disponible. Principios de integridad de datos exigidos por FDA y EMA para registros electronicos.' },
  { q: '¿El sistema cumple con ANMAT?', a: 'Si. Cumple Disposicion 4159/2023 y Resolucion 1780/2025 del Ministerio de Salud argentino. Genera reportes semestrales REPROCANN automaticamente.' },
  { q: '¿Como funciona el audit log SHA-256?', a: 'Tabla append-only con triggers en 11 tablas criticas. Cada registro incluye el hash del anterior (blockchain-style), garantizando que cualquier modificacion rompe la cadena y es detectable.' },
  { q: '¿Multi-tenancy funciona?', a: 'Si. Tabla organizaciones + tenant_id en 11 tablas principales. Row Level Security en Postgres asegura aislamiento total entre productores.' },
  { q: '¿Puedo exportar los datos?', a: 'Si. Export Excel profesional (exceljs), OpenTHC CRE v2018, y CSV por modulo. Los PDFs de validacion estan en el bucket Supabase.' },
  { q: '¿Cuanto tarda la implementacion?', a: 'Depende del volumen y complejidad operativa. Implementacion base: 2-4 semanas. Validacion GAMP5 completa: 6-8 semanas.' },
  { q: '¿Que trae de diferencial vs otros ERPs?', a: 'Trazabilidad inversa sale-to-seed nativa, audit log criptografico, validacion GAMP5 lista, CoA publico con QR, y multi-tenancy real desde el dia 1.' },
  { q: '¿Quien es OA Consultora?', a: 'Equipo especializado en validacion de sistemas para industrias reguladas, con foco en cannabis medicinal. Desarrollamos CannTrace junto a FIS S.A.S. como cliente ancla.' },
]

export default function PaginaDocs() {
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0)

  useEffect(() => {
    supabase.storage
      .from('canntrace-archivos')
      .list('gamp5', { limit: 20, sortBy: { column: 'name', order: 'asc' } })
      .then(({ data }) => {
        if (data) setArchivos(data.filter((a: any) => a.name && !a.name.endsWith('/')).map((a: any) => ({ name: a.name, size: a.metadata?.size ?? 0, updated_at: a.updated_at ?? '' })))
        setCargando(false)
      })
      .catch(() => setCargando(false))
  }, [])

  const verDocumento = async (nombre: string) => {
    const { data } = await supabase.storage
      .from('canntrace-archivos')
      .createSignedUrl(`gamp5/${nombre}`, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const fmtSize = (b: number) => {
    if (b < 1024) return b + ' B'
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
    return (b / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-primary-100 dark:bg-surface-950">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md border-b border-surface-200/60 dark:border-surface-800/60">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-surface-900 dark:text-white">CannTrace</div>
          </Link>
          <Link to="/" className="text-sm text-surface-600 dark:text-surface-300 hover:text-primary-700 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Documentacion publica
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight">
            Documentacion y FAQ
          </h1>
          <p className="mt-3 text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
            Materiales de validacion GAMP5, SOPs, protocolos y preguntas frecuentes.
          </p>
        </div>

        {/* Documentos */}
        <section className="mb-16">
          <h2 className="font-semibold text-xl text-surface-900 dark:text-white mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-700" />
            Documentos de validacion GAMP5
          </h2>
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            {cargando ? (
              <div className="p-8 text-center text-surface-500">Cargando documentos...</div>
            ) : archivos.length === 0 ? (
              <div className="p-8 text-center text-surface-500">
                Los documentos se cargan en Supabase Storage. Contactanos para acceso.
              </div>
            ) : (
              <ul className="divide-y divide-surface-200 dark:divide-surface-800">
                {archivos.map((a) => (
                  <li key={a.name} className="flex items-center justify-between gap-3 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-surface-900 dark:text-white truncate">{a.name}</div>
                        <div className="text-xs text-surface-500">{fmtSize(a.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => verDocumento(a.name)}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" /> Ver
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-3 text-xs text-surface-500">
            Los enlaces son firmados y expiran en 5 minutos por seguridad.
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-semibold text-xl text-surface-900 dark:text-white mb-5">
            Preguntas frecuentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden"
              >
                <button
                  onClick={() => setFaqAbierta(faqAbierta === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                  aria-expanded={faqAbierta === i}
                >
                  <span className="font-medium text-surface-900 dark:text-white">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-surface-500 flex-shrink-0 transition-transform ${faqAbierta === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {faqAbierta === i && (
                  <div className="px-4 pb-4 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Link
            to="/traza/CL7"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-medium shadow-lg shadow-primary-700/20 transition-all"
          >
            <FileText className="w-4 h-4" />
            Ver CoA publico de ejemplo
          </Link>
        </div>
      </main>
    </div>
  )
}
