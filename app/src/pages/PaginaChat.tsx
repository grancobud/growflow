// PaginaChat — chat con la IA local (Ollama via webhook n8n) con contexto del cultivo.

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Trash2 } from 'lucide-react'

const WEBHOOK_URL = import.meta.env.VITE_CHAT_WEBHOOK_URL || ''

interface Mensaje { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  '¿Cómo vienen las plantas?',
  '¿Cuándo regué por última vez?',
  '¿Cuántos días de flora le quedan?',
  '¿Qué cosechas registré?',
]

export default function PaginaChat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pensando])

  const enviar = async (contenido?: string) => {
    const msg = (contenido ?? texto).trim()
    if (!msg || pensando) return
    const nuevos: Mensaje[] = [...mensajes, { role: 'user', content: msg }]
    setMensajes(nuevos)
    setTexto('')
    setPensando(true)
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nuevos }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMensajes(m => [...m, { role: 'assistant', content: data.reply || 'Sin respuesta.' }])
    } catch (err) {
      setMensajes(m => [...m, { role: 'assistant', content: `Error hablando con la IA local: ${(err as Error).message}. ¿Está n8n corriendo?` }])
    } finally {
      setPensando(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] text-[#d4d4dd] font-sans overflow-hidden">
      <div className="bg-[#0a0a0f]/95 border-b border-[#1f1f2b] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Chat del Cultivo</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              IA local (Ollama) con los datos de tus plantas
            </div>
          </div>
          <div className="flex-1" />
          {mensajes.length > 0 && (
            <button onClick={() => setMensajes([])}
              className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors"
              title="Limpiar conversación">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {!WEBHOOK_URL && (
            <div className="py-14 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#463a66]/30 border border-[#463a66] flex items-center justify-center mb-3">
                <Bot className="w-5 h-5 text-[#c4b5fd]" />
              </div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Chat no disponible en esta instancia</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b] max-w-sm mx-auto">
                El chat usa un modelo de IA local (Ollama). Funciona cuando corres GrowFlow self-hosted con la variable VITE_CHAT_WEBHOOK_URL configurada.
              </div>
            </div>
          )}
          {WEBHOOK_URL && mensajes.length === 0 && (
            <div className="py-14 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#a3e635]/10 border border-[#404d20] flex items-center justify-center mb-3">
                <Bot className="w-5 h-5 text-[#bef264]" />
              </div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Preguntale a tu cultivo</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Lee plantas, eventos y cosechas en tiempo real. Todo local.</div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGERENCIAS.map(s => (
                  <button key={s} onClick={() => enviar(s)}
                    className="px-3 py-1.5 rounded-full border border-[#2a2a3a] bg-[#101016] hover:border-[#404d20] hover:bg-[#15151d] transition-colors text-[11.5px] text-[#a6a6b5] hover:text-[#d9f99d]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#a3e635]/12 border border-[#404d20] text-[#ececf1] rounded-br-md'
                  : 'bg-[#101016] border border-[#1f1f2b] text-[#d4d4dd] rounded-bl-md'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {pensando && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[#101016] border border-[#1f1f2b] flex items-center gap-2 text-[12px] text-[#8f8f9f]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#bef264]" />
                Pensando...
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>
      </div>

      {WEBHOOK_URL && (
      <div className="border-t border-[#1f1f2b] bg-[#0a0a0f] flex-shrink-0 px-3 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escribí tu pregunta... (Enter para enviar)"
            rows={1}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#15151d] border border-[#2a2a3a] text-[13px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors resize-none"
          />
          <button onClick={() => enviar()} disabled={pensando || !texto.trim()}
            className="p-2.5 rounded-xl border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[#d9f99d] disabled:opacity-40 flex-shrink-0"
            aria-label="Enviar">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
