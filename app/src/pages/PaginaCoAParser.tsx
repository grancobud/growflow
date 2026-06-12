import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Upload, Loader2, Copy, Check, FlaskConical, AlertCircle, Database, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../components/ui/empty-state'
import { supabase } from '../lib/supabase'

type Cannabinoide = 'thc' | 'cbd' | 'thca' | 'cbda' | 'cbg' | 'cbn' | 'cbc'
type Terpeno = 'myrcene' | 'limonene' | 'pinene' | 'linalool' | 'caryophyllene' | 'humulene' | 'terpinolene' | 'ocimene'

type ParseResult = {
  cannabinoides: Partial<Record<Cannabinoide, string>>
  terpenos: Partial<Record<Terpeno, string>>
  controles: { pesticidas?: string; metales?: string; microbiologia?: string; micotoxinas?: string; solventes?: string }
  meta: { laboratorio?: string; fecha?: string; lote?: string; metodo?: string }
  texto_raw: string
}

const EMPTY: ParseResult = { cannabinoides: {}, terpenos: {}, controles: {}, meta: {}, texto_raw: '' }

const PATRONES = {
  cannabinoides: [
    { key: 'thc' as Cannabinoide, rx: /\b(?:d9-?|delta-?9-?)?\s*thc\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'cbd' as Cannabinoide, rx: /\bcbd\b(?!\w)\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'thca' as Cannabinoide, rx: /\bthca\b\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'cbda' as Cannabinoide, rx: /\bcbda\b\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'cbg' as Cannabinoide, rx: /\bcbg\b(?!\w)\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'cbn' as Cannabinoide, rx: /\bcbn\b(?!\w)\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
    { key: 'cbc' as Cannabinoide, rx: /\bcbc\b(?!\w)\s*[:=]?\s*(\d+[.,]\d+)\s*%?/i },
  ],
  terpenos: [
    { key: 'myrcene' as Terpeno, rx: /\b(?:β|beta)?-?myrcene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'limonene' as Terpeno, rx: /\b(?:d|r)?-?limonene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'pinene' as Terpeno, rx: /\b(?:α|alpha|β|beta)?-?pinene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'linalool' as Terpeno, rx: /\blinalool\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'caryophyllene' as Terpeno, rx: /\b(?:β|beta)?-?caryophyllene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'humulene' as Terpeno, rx: /\b(?:α|alpha)?-?humulene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'terpinolene' as Terpeno, rx: /\bterpinolene\s*[:=]?\s*(\d+[.,]\d+)/i },
    { key: 'ocimene' as Terpeno, rx: /\bocimene\s*[:=]?\s*(\d+[.,]\d+)/i },
  ],
  controles: [
    { key: 'pesticidas', rx: /pesticid(?:a|e)s?\s*[:=]?\s*(pass|fail|aprobado|rechazado|not\s+detected|nd|<?\s*\d+)/i },
    { key: 'metales', rx: /metales\s+pesados\s*[:=]?\s*(pass|fail|aprobado|rechazado|nd|<?\s*\d+)/i },
    { key: 'microbiologia', rx: /microbiolog(?:i|í)a\s*[:=]?\s*(pass|fail|aprobado|rechazado|nd|<?\s*\d+)/i },
    { key: 'micotoxinas', rx: /(?:micotoxinas|mycotoxins?)\s*[:=]?\s*(pass|fail|aprobado|rechazado|nd|<?\s*\d+)/i },
    { key: 'solventes', rx: /(?:solventes\s+residuales|residual\s+solvents?)\s*[:=]?\s*(pass|fail|aprobado|rechazado|nd|<?\s*\d+)/i },
  ],
  meta: [
    { key: 'laboratorio', rx: /(?:laboratorio|lab\.?|emitido\s+por)\s*[:=]?\s*([A-Z][A-Za-z\s&\-\.]+?)(?:\n|Fecha|Date|$)/i },
    { key: 'fecha', rx: /(?:fecha\s+(?:de\s+)?(?:analisis|emision|informe)|analysis\s+date|issue\s+date|date\s+issued)\s*[:=]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})/i },
    { key: 'lote', rx: /(?:lote|lot|batch)\s*(?:n°|nro|no\.?|#)?\s*[:=]?\s*([A-Z0-9\-\.]+)/i },
    { key: 'metodo', rx: /m(?:e|é)todo\s*[:=]?\s*(HPLC|GC-MS|LC-MS|[A-Z][A-Za-z\-\s]+)/i },
  ],
}

async function extraerTextoPDF(file: File): Promise<string> {
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  // @ts-ignore
  const workerSrc = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc.default
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  let texto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((it: any) => it.str).join(' ')
    texto += pageText + '\n\n'
  }
  return texto
}

function parsear(texto: string): ParseResult {
  const r: ParseResult = { cannabinoides: {}, terpenos: {}, controles: {}, meta: {}, texto_raw: texto }
  for (const p of PATRONES.cannabinoides) { const m = texto.match(p.rx); if (m) r.cannabinoides[p.key] = m[1].replace(',', '.') }
  for (const p of PATRONES.terpenos) { const m = texto.match(p.rx); if (m) r.terpenos[p.key] = m[1].replace(',', '.') }
  for (const p of PATRONES.controles) { const m = texto.match(p.rx); if (m) (r.controles as any)[p.key] = m[1] }
  for (const p of PATRONES.meta) { const m = texto.match(p.rx); if (m) (r.meta as any)[p.key] = m[1].trim() }
  return r
}

type LoteMini = { id: string; codigo_lote: string; camada_asignada: string | null }

export default function PaginaCoAParser() {
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState<ParseResult>(EMPTY)
  const [copiado, setCopiado] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [lotes, setLotes] = useState<LoteMini[]>([])
  const [loteId, setLoteId] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    supabase.from('lotes')
      .select('id, codigo_lote, camada_asignada')
      .in('tipo_lote', ['flor_trimmeada', 'flor_fraccionada', 'flor'])
      .order('creado_en', { ascending: false })
      .limit(200)
      .then(({ data }) => setLotes((data as LoteMini[]) || []))
  }, [])

  async function guardarEnBD() {
    if (!loteId) { toast.error('Selecciona primero el lote'); return }
    setGuardando(true)
    const { error } = await supabase.from('resultados_laboratorio').insert({
      lote_id: loteId,
      laboratorio: resultado.meta.laboratorio || 'Sin especificar',
      fecha_analisis: resultado.meta.fecha || new Date().toISOString().slice(0, 10),
      metodo: resultado.meta.metodo || null,
      cannabinoides: resultado.cannabinoides,
      terpenos: resultado.terpenos,
      controles: resultado.controles,
      archivo_fuente: fileName,
      datos_extra: { parser_version: 'v1', metadatos_originales: resultado.meta },
    })
    setGuardando(false)
    if (error) { toast.error(`Error guardando: ${error.message}`); return }
    toast.success('CoA guardado en resultados_laboratorio')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) { toast.error('Solo archivos PDF'); return }
    setFileName(f.name)
    setProcesando(true)
    try {
      const texto = await extraerTextoPDF(f)
      const r = parsear(texto)
      setResultado(r)
      const encontrados = Object.keys(r.cannabinoides).length + Object.keys(r.terpenos).length
      if (encontrados === 0) toast.warning('No se detectaron cannabinoides/terpenos. Revisa el formato del PDF.')
      else toast.success(`${Object.keys(r.cannabinoides).length} cannabinoides + ${Object.keys(r.terpenos).length} terpenos extraidos`)
    } catch (err: any) {
      toast.error('Error leyendo PDF: ' + (err?.message || String(err)))
    } finally { setProcesando(false) }
  }

  const copiarJSON = () => {
    const { texto_raw: _ignored, ...clean } = resultado
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const hayData = Object.keys(resultado.cannabinoides).length > 0 || Object.keys(resultado.terpenos).length > 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <FlaskConical className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">CoA Parser</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Parser PDF laboratorio
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>cannabinoides · terpenos · controles</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Upload drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
          className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#a3e635]/10 border border-[#404d20] flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Certificado de analisis</h3>
              <p className="text-[10.5px] text-[#757584]">PDF emitido por laboratorio acreditado</p>
            </div>
          </div>

          <label
            htmlFor="coa-file"
            className="flex flex-col items-center justify-center gap-2 px-6 py-10 border-2 border-dashed border-[#1f1f2b] hover:border-[#404d20] rounded-xl cursor-pointer hover:bg-[#a3e635]/05 transition-colors"
          >
            {procesando ? (
              <>
                <Loader2 className="w-7 h-7 text-[#a3e635] animate-spin" />
                <p className="text-[12px] text-[#d4d4dd] font-semibold">Procesando {fileName}...</p>
                <p className="text-[10.5px] text-[#5c5c6b]">Extrayendo texto + parseando</p>
              </>
            ) : (
              <>
                <Upload className="w-7 h-7 text-[#404d20]" strokeWidth={1.5} />
                <p className="text-[12px] text-[#d4d4dd] font-semibold">Click para subir PDF</p>
                <p className="text-[10.5px] text-[#5c5c6b]">o arrastra aqui</p>
                {fileName && <p className="text-[10.5px] text-[#bef264] mt-1">Ultimo: {fileName}</p>}
              </>
            )}
            <input
              ref={inputRef}
              id="coa-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFile}
              className="hidden"
              disabled={procesando}
            />
          </label>
        </motion.div>

        {/* Empty state */}
        {!hayData && !procesando && !fileName && (
          <EmptyState
            icon={FileText}
            titulo="Sin CoA cargado"
            descripcion="Sube el PDF del laboratorio (HPLC / GC-MS). Detecta THC, CBD, CBG, CBN y terpenos principales. Compatible con la mayoria de labs acreditados."
          />
        )}

        {/* Resultados */}
        {hayData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Meta */}
            {Object.keys(resultado.meta).length > 0 && (
              <SeccionDark titulo="Metadatos del informe" items={resultado.meta} tone="neutral" />
            )}

            {/* Cannabinoides */}
            <SeccionDark titulo="Cannabinoides (%)" items={resultado.cannabinoides} tone="primary" />

            {/* Terpenos */}
            {Object.keys(resultado.terpenos).length > 0 && (
              <SeccionDark titulo="Terpenos principales" items={resultado.terpenos} tone="gold" />
            )}

            {/* Controles */}
            {Object.keys(resultado.controles).length > 0 && (
              <SeccionDark titulo="Controles de seguridad" items={resultado.controles} tone="neutral" />
            )}

            {/* Guardar + copiar */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 space-y-3">
              <div>
                <p className="font-display font-semibold text-[13px] text-[#ececf1]">Guardar en resultados_laboratorio</p>
                <p className="text-[10.5px] text-[#757584] mt-0.5">Asocia el CoA a un lote para la traza publica y auditoria.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <select
                    value={loteId}
                    onChange={e => setLoteId(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] font-mono tabular-nums outline-none cursor-pointer transition-colors"
                    aria-label="Seleccionar lote"
                  >
                    <option value="">— Seleccionar lote —</option>
                    {lotes.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.codigo_lote}{l.camada_asignada ? ` · ${l.camada_asignada}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b] pointer-events-none" />
                </div>
                <button
                  onClick={guardarEnBD}
                  disabled={!loteId || guardando}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
                >
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" strokeWidth={1.8} />}
                  Guardar CoA
                </button>
                <button
                  onClick={copiarJSON}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#a6a6b5] rounded-lg text-[12px] font-semibold transition-colors"
                  title="Copiar JSON"
                >
                  {copiado ? <Check className="w-4 h-4 text-[#bef264]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {lotes.length === 0 && (
                <p className="text-[10.5px] text-[#c4b5fd]">
                  No hay lotes tipo flor cargados. Crea un lote primero en /stock.
                </p>
              )}
            </div>

            {/* Advertencia heuristica */}
            <div className="flex items-start gap-3 rounded-xl bg-[#a78bfa]/08 border border-[#463a66] p-3">
              <AlertCircle className="w-4 h-4 text-[#c4b5fd] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <p className="text-[11px] text-[#a6a6b5]">
                El parser es heuristico (regex sobre texto PDF). Verificar contra el informe original antes de firmar. Si el PDF es imagen escaneada, el parser devuelve vacio — usar OCR aparte.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponente Seccion dark ───────────────────────────────────────────────

type Tone = 'primary' | 'gold' | 'neutral'

const TONE_STYLES: Record<Tone, { item_bg: string; item_border: string; item_color: string }> = {
  primary: { item_bg: 'rgba(63,176,116,0.08)', item_border: '#404d20', item_color: '#d9f99d' },
  gold:    { item_bg: 'rgba(196,154,44,0.08)',  item_border: '#463a66', item_color: '#c4b5fd' },
  neutral: { item_bg: 'rgba(180,200,190,0.04)', item_border: '#1f1f2b', item_color: '#a6a6b5' },
}

function SeccionDark({ titulo, items, tone }: { titulo: string; items: Record<string, any>; tone: Tone }) {
  const s = TONE_STYLES[tone]
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
      <h4 className="font-display font-semibold text-[13px] text-[#ececf1] mb-3">{titulo}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(items).map(([k, v]) => (
          <div key={k} className="rounded-lg p-2.5 border"
            style={{ background: s.item_bg, borderColor: s.item_border }}>
            <p className="text-[9px] uppercase tracking-[0.14em] font-medium opacity-70" style={{ color: s.item_color }}>{k}</p>
            <p className="text-[13px] font-mono font-bold tabular-nums mt-0.5" style={{ color: s.item_color }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
