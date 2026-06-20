// Base de conocimiento (RAG). Extrae el texto del PDF en el navegador (pdf.js) y
// lo manda al Worker growflow-ai (/kb/*), que lo chunkea, vectoriza (Workers AI) y
// guarda en Supabase (pgvector). El chat después recupera solo lo relevante.

import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

const KB = import.meta.env.VITE_KB_URL || ''
export const KB_DISPONIBLE = !!KB

export interface DocKB { fuente: string; chunks: number; creado_en?: string }

async function pdfATexto(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let texto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    texto += content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ') + '\n'
  }
  return texto
}

export async function kbList(): Promise<DocKB[]> {
  if (!KB) return []
  const r = await fetch(`${KB}/list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).documentos || []
}

export async function kbBorrar(fuente: string): Promise<void> {
  const r = await fetch(`${KB}/delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fuente }),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
}

// Sube un PDF: extrae texto, lo parte en segmentos y los manda a ingest.
// onProgreso recibe 0..1.
export async function kbSubirPDF(file: File, onProgreso?: (p: number) => void): Promise<number> {
  if (!KB) throw new Error('Base de conocimiento no configurada (VITE_KB_URL)')
  const fuente = file.name.replace(/\.pdf$/i, '')
  const texto = await pdfATexto(file)
  if (texto.trim().length < 50) throw new Error('El PDF no tiene texto legible (¿es un escaneo? necesitaría OCR)')
  const SEG = 30000
  const segmentos: string[] = []
  for (let i = 0; i < texto.length; i += SEG) segmentos.push(texto.slice(i, i + SEG))
  let chunks = 0
  for (let i = 0; i < segmentos.length; i++) {
    const r = await fetch(`${KB}/ingest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fuente, text: segmentos[i] }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status} subiendo "${fuente}"`)
    chunks += (await r.json()).chunks || 0
    onProgreso?.((i + 1) / segmentos.length)
  }
  return chunks
}
