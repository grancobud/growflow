import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download, Database, ChevronDown } from 'lucide-react'
// exceljs (~930KB) lazy-loaded
async function loadExcelJS() {
  return (await import('exceljs')).default
}
import { supabase } from '../lib/supabase'

type Fila = { [k: string]: any }
type Preview = { hoja: string; columnas: string[]; filas: Fila[]; total: number }

const TABLAS = [
  { id: 'lotes', label: 'Lotes', columnas: ['codigo_lote','cantidad','estado','datos_extra','producto_id','instalacion_id'] },
  { id: 'operaciones', label: 'Operaciones', columnas: ['tipo_operacion','fecha_operacion','cantidad_entrada','cantidad_salida','lote_origen_id','lote_destino_id'] },
  { id: 'resultados_laboratorio', label: 'Resultados lab', columnas: ['lote_id','laboratorio_nombre','numero_certificado','fecha_analisis','thc_total','cbd_total','resultado_general'] },
  { id: 'eventos_adversos', label: 'Eventos adversos', columnas: ['fecha_evento','tipo','severidad','descripcion','accion_correctiva'] },
  { id: 'registros_agua', label: 'Registros agua (G04)', columnas: ['fecha','lote_id','ph','ec','observaciones'] },
] as const

export default function PaginaImportador() {
  const [tabla, setTabla] = useState<string>('lotes')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [msg, setMsg] = useState('')
  const [resultado, setResultado] = useState<{ ok: number; err: number; errores: string[] } | null>(null)

  async function leerArchivo(f: File) {
    setArchivo(f); setPreview(null); setResultado(null); setMsg('')
    setProcesando(true)
    try {
      const buf = await f.arrayBuffer()
      const ExcelJS = await loadExcelJS()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      if (!ws) throw new Error('Sin hojas')
      const columnas: string[] = []
      ws.getRow(1).eachCell(c => columnas.push(String(c.value || '').trim()))
      const filas: Fila[] = []
      ws.eachRow((row, num) => {
        if (num === 1) return
        const obj: Fila = {}
        row.eachCell((c, col) => { obj[columnas[col - 1]] = c.value })
        if (Object.keys(obj).length > 0) filas.push(obj)
      })
      setPreview({ hoja: ws.name, columnas, filas: filas.slice(0, 20), total: filas.length })
    } catch (e: any) {
      setMsg('Error leyendo: ' + e.message)
    } finally { setProcesando(false) }
  }

  async function importar() {
    if (!archivo || !preview) return
    setProcesando(true); setResultado(null)
    try {
      const buf = await archivo.arrayBuffer()
      const ExcelJS = await loadExcelJS()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      const cols: string[] = []
      ws.getRow(1).eachCell(c => cols.push(String(c.value || '').trim()))
      const rows: Fila[] = []
      ws.eachRow((row, num) => {
        if (num === 1) return
        const obj: Fila = {}
        row.eachCell((c, col) => { obj[cols[col - 1]] = c.value instanceof Date ? c.value.toISOString().slice(0, 10) : c.value })
        if (Object.keys(obj).length > 0) rows.push(obj)
      })
      let ok = 0, err = 0; const errores: string[] = []
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100)
        const { error, count } = await (supabase.from(tabla).insert(chunk) as any).select('id', { count: 'exact' })
        if (error) { err += chunk.length; errores.push(`Fila ${i+1}-${i+chunk.length}: ${error.message}`) }
        else ok += (count || chunk.length)
      }
      setResultado({ ok, err, errores: errores.slice(0, 10) })
      setMsg(err === 0 ? `Importadas ${ok} filas correctamente` : `${ok} ok, ${err} con error`)
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally { setProcesando(false) }
  }

  async function descargarPlantilla() {
    const ExcelJS = await loadExcelJS()
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(tabla)
    const t = TABLAS.find(x => x.id === tabla)
    if (!t) return
    ws.columns = t.columnas.map(c => ({ header: c, key: c, width: 20 }))
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url; a.download = `plantilla_${tabla}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const tSel = TABLAS.find(x => x.id === tabla)!

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <FileSpreadsheet className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Importador de Datos</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Carga masiva desde Excel
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>.xlsx</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">

        {/* Config */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Destino</p>
              <div className="relative">
                <select
                  value={tabla}
                  onChange={e => { setTabla(e.target.value); setPreview(null); setArchivo(null) }}
                  className="appearance-none pl-3 pr-8 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] outline-none cursor-pointer transition-colors"
                >
                  {TABLAS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b] pointer-events-none" />
              </div>
            </div>

            <button
              onClick={descargarPlantilla}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#a6a6b5] transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Plantilla</span>
            </button>

            <label className="ml-auto cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] rounded-lg text-[12px] font-medium text-[#d9f99d] transition-colors">
              {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.8} />}
              Subir Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" disabled={procesando}
                onChange={e => e.target.files?.[0] && leerArchivo(e.target.files[0])} />
            </label>
          </div>

          <div className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
            <p className="text-[10px] text-[#5c5c6b]">
              <span className="text-[#8f8f9f] font-medium">Columnas esperadas:</span>{' '}
              <span className="font-mono text-[#bef264]">{tSel.columnas.join(', ')}</span>
            </p>
          </div>
        </div>

        {/* Mensaje estado */}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-[12px] border ${
            msg.startsWith('Error')
              ? 'bg-[#7a2820]/20 border-[#7a2820]/40 text-[#ff8a7a]'
              : 'bg-[#a3e635]/10 border-[#404d20] text-[#d9f99d]'
          }`}>
            {msg.startsWith('Error') ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            {msg}
          </div>
        )}

        {/* Drop zone si no hay preview */}
        {!preview && !procesando && (
          <label className="flex flex-col items-center justify-center gap-3 px-6 py-12 rounded-xl border-2 border-dashed border-[#1f1f2b] hover:border-[#404d20] bg-[#101016] cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-[#404d20]" strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#d4d4dd]">Click o arrastra el archivo Excel</p>
              <p className="text-[11px] text-[#5c5c6b] mt-0.5">.xlsx · .xls</p>
            </div>
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={procesando}
              onChange={e => e.target.files?.[0] && leerArchivo(e.target.files[0])} />
          </label>
        )}

        {procesando && !preview && (
          <div className="flex items-center justify-center gap-2 py-10 text-[#5c5c6b]">
            <Loader2 className="w-5 h-5 animate-spin text-[#a3e635]" />
            <span className="text-[12px]">Leyendo archivo…</span>
          </div>
        )}

        {/* Preview tabla */}
        {preview && (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
                  <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">
                    {preview.hoja} · <span className="tabular-nums">{preview.total}</span> filas
                  </h3>
                </div>
                <p className="text-[10.5px] text-[#5c5c6b] mt-0.5">{archivo?.name}</p>
              </div>
              <button
                onClick={importar}
                disabled={procesando}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              >
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" strokeWidth={1.8} />}
                Importar {preview.total} filas
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#1f1f2b]">
                    {preview.columnas.map(c => (
                      <th key={c} className="px-3 py-2 text-left font-mono text-[#bef264] text-[10px] whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.filas.map((f, i) => (
                    <tr key={i} className="border-b border-[#1f1f2b] last:border-0 hover:bg-[#15151d] transition-colors">
                      {preview.columnas.map(c => (
                        <td key={c} className="px-3 py-2 text-[#a6a6b5] font-mono whitespace-nowrap truncate max-w-[180px]">
                          {String(f[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.total > 20 && (
                <p className="px-3 py-2 text-[10.5px] text-[#5c5c6b] border-t border-[#1f1f2b]">
                  …y {preview.total - 20} filas mas
                </p>
              )}
            </div>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className={`rounded-xl border p-4 ${
            resultado.err === 0
              ? 'bg-[#a3e635]/08 border-[#404d20]'
              : 'bg-[#a78bfa]/08 border-[#463a66]'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {resultado.err === 0
                ? <CheckCircle2 className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
                : <AlertCircle className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />}
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Resultado de importacion</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#a3e635]/10 border border-[#404d20] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#bef264] font-medium">Filas OK</p>
                <p className="font-display font-bold text-[22px] tabular-nums text-[#d9f99d]">{resultado.ok}</p>
              </div>
              <div className="rounded-lg bg-[#7a2820]/15 border border-[#7a2820]/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#ff8a7a] font-medium">Errores</p>
                <p className="font-display font-bold text-[22px] tabular-nums text-[#ff6b5a]">{resultado.err}</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] text-[#8f8f9f] font-semibold">Errores (primeros 10):</p>
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-[11px] text-[#ff8a7a] font-mono">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
