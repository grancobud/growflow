// PaginaConocimiento — base de conocimiento (RAG). Subís PDFs (manuales, guías) y
// el chat los usa como fuente de razonamiento. Vectorizado en el Worker; el chat
// recupera solo lo relevante (pocos tokens).

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { BookOpen, UploadCloud, FileText, Trash2, Loader2, Brain } from 'lucide-react'
import { kbList, kbSubirPDF, kbBorrar, KB_DISPONIBLE, type DocKB } from '../lib/kb'

export default function PaginaConocimiento() {
  const [docs, setDocs] = useState<DocKB[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [progreso, setProgreso] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    try { setDocs(await kbList()) }
    catch (err) { toast.error(`No se pudo cargar: ${(err as Error).message}`) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { if (KB_DISPONIBLE) { recargar() } else { setCargando(false) } }, [recargar])

  const subir = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error(`${file.name}: solo PDF`); continue }
      setSubiendo(file.name); setProgreso(0)
      try {
        const n = await kbSubirPDF(file, setProgreso)
        toast.success(`"${file.name}" cargado (${n} fragmentos)`)
      } catch (err) { toast.error(`${file.name}: ${(err as Error).message}`) }
    }
    setSubiendo(null); setProgreso(0)
    if (inputRef.current) inputRef.current.value = ''
    recargar()
  }

  const borrar = async (fuente: string) => {
    if (!window.confirm(`¿Borrar "${fuente}" de la base de conocimiento?`)) return
    try { await kbBorrar(fuente); toast.success('Borrado'); recargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  const totalChunks = docs.reduce((a, d) => a + d.chunks, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 px-3 sm:px-6 py-3">
          <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#bef264]" /> Base de conocimiento
          </h1>
          <span className="text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{docs.length} documentos · {totalChunks} fragmentos</span>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-5 pb-24 max-w-3xl mx-auto space-y-5">
        {!KB_DISPONIBLE ? (
          <div className="py-16 text-center text-[12px] text-[#5c5c6b]">
            La base de conocimiento no está configurada (falta <code className="text-[#a6a6b5]">VITE_KB_URL</code>).
          </div>
        ) : (
          <>
            {/* Dropzone */}
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (!subiendo) subir(e.dataTransfer.files) }}
              className={`block rounded-xl border border-dashed ${subiendo ? 'border-[#404d20] bg-[#a3e635]/5' : 'border-[#2a2a3a] bg-[#101016] hover:border-[#404d20] hover:bg-[#15151d]'} transition-colors cursor-pointer p-8 text-center`}
            >
              <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden"
                disabled={!!subiendo} onChange={e => subir(e.target.files)} />
              {subiendo ? (
                <div className="space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#bef264] mx-auto" />
                  <div className="text-[12.5px] text-[#d4d4dd]">Procesando <b>{subiendo}</b>…</div>
                  <div className="mx-auto max-w-xs h-1.5 rounded-full bg-[#1c1c27] overflow-hidden">
                    <div className="h-full bg-[#bef264] transition-all" style={{ width: `${Math.round(progreso * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-[#5c5c6b] mx-auto" />
                  <div className="text-[13px] font-medium text-[#ececf1]">Arrastrá PDFs o tocá para subir</div>
                  <div className="text-[11px] text-[#5c5c6b]">Manuales, guías de riego/fertilización, etc. El chat los va a usar como fuente.</div>
                </div>
              )}
            </label>

            {/* Lista */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f2b]">
                <BookOpen className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Documentos cargados</h3>
              </div>
              {cargando ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#bef264]" /></div>
              ) : docs.length === 0 ? (
                <div className="py-10 text-center text-[12px] text-[#5c5c6b]">Todavía no subiste documentos.</div>
              ) : (
                <ul className="divide-y divide-[#1f1f2b]/60">
                  {docs.map(d => (
                    <li key={d.fuente} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="w-4 h-4 text-[#757584] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-[#ececf1] truncate">{d.fuente}</div>
                        <div className="text-[10.5px] text-[#5c5c6b]">{d.chunks} fragmentos</div>
                      </div>
                      <button onClick={() => borrar(d.fuente)} title="Borrar"
                        className="p-1.5 rounded-lg text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[10.5px] text-[#5c5c6b]">
              Los documentos se vectorizan y el chat recupera solo los fragmentos relevantes a cada pregunta (no gasta tokens de más).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
