// ChatAgent — UI del agent multi-step (P2.3).
// Layout: chat a la izquierda, preview del draft a la derecha (side-by-side).
// Primero muestra grid de tarjetas para elegir tipo de registro CUMCS (filtro previo).
// Al confirmar un draft dentro del chat, el registro ya esta en la tabla destino
// (via confirmInsert tool). Realtime suscripcion refresca la UI sin F5.

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, User, Sparkles, Loader2, CheckCircle2, Send, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { invokeAgent, type AgentChatMessage } from '../../lib/agentCumcs'
import { supabase } from '../../lib/supabase'
import { METAS, type MetaFormulario, type VarianteCumcs } from '../../lib/cumcsVariantes'
import { buildSystemPrompt } from '../../lib/cumcsPrompts'
import { CAMPOS_CUMCS, type CampoChat } from '../../lib/camposChatCumcs'
import { REGLAS_CUMCS } from '../../lib/cumcsPrompts'
import { cargarSugerencias as cargarSugerenciasLib, formatearIdLote as formatearIdLoteLib, type Sugerencias } from '../../lib/sugerenciasCumcs'

interface DraftPreview {
  id: string
  tabla_destino: string
  codigo_cumcs: string
  payload: Record<string, unknown>
  preview_text: string
  expira_en: string
  confirmado_en: string | null
  cancelado_en: string | null
}

export default function ChatAgent() {
  const [filtroCumcs, setFiltroCumcs] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [sugerencias, setSugerencias] = useState<Sugerencias>({})

  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [history, setHistory] = useState<AgentChatMessage[]>([])
  const [meta, setMeta] = useState<{ modelo: string; provider: string; steps: number; latency_ms: number; tool_calls: Array<{ name: string; args: Record<string, unknown>; result_summary: string }> } | null>(null)

  const [draftActivo, setDraftActivo] = useState<DraftPreview | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  // Realtime: suscribirse a pending_inserts del usuario para refrescar el preview en vivo
  useEffect(() => {
    const ch = supabase
      .channel('chat-agent-drafts')
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'pending_inserts' }, (payload: { new?: DraftPreview; eventType: string }) => {
        const row = payload.new
        if (!row) return
        // Solo mostrar el ultimo draft no confirmado/no cancelado
        if (!row.confirmado_en && !row.cancelado_en) {
          setDraftActivo(row)
        } else if (row.confirmado_en && draftActivo?.id === row.id) {
          setDraftActivo(null)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendMessage(texto: string) {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    const userMsg: AgentChatMessage = { role: 'user', content: texto }
    const nuevaHist = [...history, userMsg]
    setHistory(nuevaHist)
    setInput('')

    const res = await invokeAgent(texto, history, filtroCumcs ?? undefined, systemPrompt ?? undefined)
    setEnviando(false)

    if (!res.ok) {
      toast.error(res.error, { description: res.detalle })
      setHistory([...nuevaHist, { role: 'assistant', content: `Error: ${res.error}` }])
      return
    }

    // Actualizar history con el server's version (incluye tool turns)
    setHistory(res.data.messages)
    setMeta({
      modelo: res.data.modelo_usado,
      provider: res.data.provider,
      steps: res.data.steps,
      latency_ms: res.data.latency_ms,
      tool_calls: res.data.tool_calls_ejecutadas,
    })

    if (res.data.draft_id && res.data.preview && res.data.tabla_destino) {
      setDraftActivo({
        id: res.data.draft_id,
        tabla_destino: res.data.tabla_destino,
        codigo_cumcs: filtroCumcs ?? '',
        payload: res.data.preview,
        preview_text: '',
        expira_en: '',
        confirmado_en: null,
        cancelado_en: null,
      })
    }
  }

  async function confirmarDraft() {
    if (!draftActivo) return
    await sendMessage(`Confirmo, guardalo.`)
  }

  async function cancelarDraft() {
    if (!draftActivo) return
    await supabase.from('pending_inserts').update({ cancelado_en: new Date().toISOString() }).eq('id', draftActivo.id)
    setDraftActivo(null)
    toast.success('Draft cancelado')
  }

  function reiniciar() {
    setHistory([])
    setMeta(null)
    setDraftActivo(null)
    setInput('')
    setFiltroCumcs(null)
    setSystemPrompt(null)
  }

  function elegirVariante(meta: MetaFormulario, v: VarianteCumcs) {
    // Cambio de variante: limpiar history (cada variante = sesion limpia)
    setHistory([])
    setMeta(null)
    setDraftActivo(null)
    setOverrides({})
    setEditKey(null)
    setFiltroCumcs(v.codigo)
    const prompt = buildSystemPrompt(meta, v)
    setSystemPrompt(prompt)
    // Cargar sugerencias en paralelo (lotes existentes, variedades, etc)
    void cargarSugerencias(v.codigo)
    // Auto-arranque: enviamos "iniciar" para que el agente se presente y preguntar el 1er campo.
    setTimeout(() => { void sendMessageWithPrompt('iniciar', prompt, v.codigo) }, 150)
  }

  async function cargarSugerencias(codigo: string) {
    setSugerencias(await cargarSugerenciasLib(codigo))
  }

  // Variante de sendMessage que recibe prompt+filtro explicitos (porque setState es async)
  async function sendMessageWithPrompt(texto: string, promptOverride: string, filtroOverride: string) {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    const userMsg: AgentChatMessage = { role: 'user', content: texto }
    const nuevaHist = [userMsg]
    setHistory(nuevaHist)
    setInput('')
    const res = await invokeAgent(texto, [], filtroOverride, promptOverride)
    setEnviando(false)
    if (!res.ok) {
      toast.error(res.error, { description: res.detalle })
      setHistory([...nuevaHist, { role: 'assistant', content: `Error: ${res.error}` }])
      return
    }
    setHistory(res.data.messages)
    setMeta({
      modelo: res.data.modelo_usado,
      provider: res.data.provider,
      steps: res.data.steps,
      latency_ms: res.data.latency_ms,
      tool_calls: res.data.tool_calls_ejecutadas,
    })
  }

  // ========== RENDER ==========

  // Filtro previo: lista vertical de metas (estilo Chat rapido)
  if (!filtroCumcs) {
    // Tarjetas planas por variante (alcance prueba: solo PM).
    const variantesAcceso: { meta: MetaFormulario; v: VarianteCumcs }[] = []
    Object.values(METAS).forEach(m => m.variantes.forEach(v => variantesAcceso.push({ meta: m, v })))

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full">
        {/* Columna selector */}
        <div className="flex flex-col bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden h-[calc(100vh-220px)] shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-primary-50 dark:bg-primary-950/30">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900 dark:text-white">Agente IA <span className="text-[9px] font-mono px-1.5 py-0.5 bg-primary-700 text-white rounded ml-1">BETA</span></p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400">Lee tu BD, pregunta lo que falta, valida y confirma</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-surface-500 dark:text-surface-400">¿Que registro vas a cargar?</p>
            {variantesAcceso.map(({ meta, v }) => {
              const Icon = v.icon ?? meta.icon ?? Bot
              return (
                <button
                  key={v.codigo}
                  onClick={() => elegirVariante(meta, v)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl hover:border-primary-400 dark:hover:border-primary-700 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{meta.label} — {v.label}</p>
                    <p className="text-[11px] text-surface-500 dark:text-surface-400">{v.nombre} · {v.codigo}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna preview vacia (placeholder) */}
        <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden h-[calc(100vh-220px)] flex flex-col shadow-sm">
          <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-white/60 dark:bg-surface-950/60">
            <p className="text-sm font-bold text-surface-900 dark:text-white">Preview del registro</p>
            <p className="text-[10px] text-surface-400 font-mono">—</p>
          </div>
          <div className="flex-1 flex items-center justify-center text-surface-400">
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Elegi un registro a la izquierda</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Chat + preview
  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 p-3">
      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-200 dark:border-surface-800 bg-primary-50 dark:bg-primary-950/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-semibold text-surface-900 dark:text-white">Agente IA</span>
            {filtroCumcs && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 rounded-full">
                {filtroCumcs}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Nuevo chat: limpia mensajes/overrides pero mantiene el codigo CM-RE actual y reenvia "iniciar"
                if (!filtroCumcs || !systemPrompt) return
                setHistory([]); setMeta(null); setDraftActivo(null); setOverrides({}); setEditKey(null)
                setTimeout(() => { void sendMessageWithPrompt('iniciar', systemPrompt, filtroCumcs) }, 100)
              }}
              className="text-xs text-primary-700 dark:text-primary-300 hover:underline flex items-center gap-1 font-medium"
              title="Empezar el mismo registro de cero"
            >
              <Sparkles className="w-3 h-3" /> Nuevo
            </button>
            <button onClick={reiniciar} className="text-xs text-surface-500 hover:text-red-600 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reiniciar
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {history.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Bot className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-700" />
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Decile al agente con que querés arrancar.
                {filtroCumcs && <><br />Ya estas en <span className="font-mono">{filtroCumcs}</span>.</>}
              </p>
              {filtroCumcs && (
                <div className="mt-3 flex flex-col gap-1.5 max-w-xs mx-auto">
                  {['arranquemos desde cero', 'seguimos donde quedamos ayer', 'que fechas me faltan?'].map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[11px] text-primary-700 dark:text-primary-400 hover:underline italic">
                      "{q}"
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {history.filter(m => m.role === 'user' || m.role === 'assistant').map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-surface-200 dark:bg-surface-800'}`}>
                {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-surface-600 dark:text-surface-300" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-tl-sm'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))}

          {enviando && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-surface-600" />
              </div>
              <div className="bg-surface-50 dark:bg-surface-800 rounded-xl px-3 py-2 text-xs text-surface-500">
                Pensando...
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Meta (modelo, latencia, steps) */}
        {meta && (
          <div className="px-3 py-1 border-t border-surface-100 dark:border-surface-900 bg-surface-50/50 dark:bg-surface-950/30 text-[10px] text-surface-400 font-mono flex items-center gap-3">
            <span>{meta.steps} steps</span>
            <span>{meta.latency_ms}ms</span>
            <span className="truncate flex-1">{meta.provider} · {meta.modelo}</span>
            <span>{meta.tool_calls.length} tool calls</span>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-surface-200 dark:border-surface-800 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Escribi tu mensaje..."
            disabled={enviando}
            className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || enviando}
            className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </div>

      {/* Preview draft + campos en vivo */}
      <div className="w-full lg:w-[380px] bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="px-4 py-2.5 border-b border-surface-200 dark:border-surface-800 bg-primary-50 dark:bg-primary-950/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-surface-900 dark:text-white">Preview</span>
          {filtroCumcs && (
            <span className="text-[10px] font-mono text-surface-500 dark:text-surface-400">{filtroCumcs}</span>
          )}
        </div>
        {/* Lista de campos en vivo (deriva de CAMPOS_CUMCS + history + overrides) */}
        {filtroCumcs && CAMPOS_CUMCS[filtroCumcs] && !draftActivo && (() => {
          const campos = CAMPOS_CUMCS[filtroCumcs]
          const reglas = REGLAS_CUMCS[filtroCumcs]
          const valoresAuto = extraerValoresDelChat(campos, history, reglas)
          // Overrides manuales pisan los valores derivados del chat
          const valores: Record<string, ValorNormalizado> = { ...valoresAuto }
          for (const [k, v] of Object.entries(overrides)) {
            const c = campos.find(c => c.key === k)
            if (c) valores[k] = normalizarValor(c, v, reglas?.rangos?.[k])
          }
          const total = campos.length
          const completados = Object.values(valores).filter(v => v.valor?.trim()).length
          // Indice del proximo campo (primero sin completar)
          let idxActual = -1
          for (let i = 0; i < campos.length; i++) {
            if (!valores[campos[i].key]?.valor?.trim()) { idxActual = i; break }
          }
          return (
            <>
              <div className="px-4 py-1.5 border-b border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-950/40">
                <div className="flex items-center justify-between text-[10px] text-surface-500 dark:text-surface-400 mb-1">
                  <span>Progreso</span>
                  <span className="font-mono tabular-nums">{completados}/{total}</span>
                </div>
                <div className="h-1 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completados / total) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {campos.map((c, i) => {
                  const r = valores[c.key]
                  const ok = !!r?.valor?.trim()
                  const esActual = i === idxActual
                  const confColor = !r ? '' : r.confianza >= 80 ? 'text-emerald-500' : r.confianza >= 50 ? 'text-amber-500' : 'text-red-500'
                  const enEdit = editKey === c.key
                  const editable = ok && !enEdit
                  return (
                    <div
                      key={c.key}
                      onClick={() => { if (editable) { setEditKey(c.key); setEditVal(r.valor) } }}
                      className={`flex items-start gap-2 py-1.5 px-2 rounded-lg transition-all ${
                        esActual ? 'bg-primary-50 dark:bg-primary-950/30 ring-1 ring-primary-300 dark:ring-primary-700' : ''
                      } ${editable ? 'cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800/50' : ''}`}
                    >
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                        ) : esActual ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-surface-300 dark:border-surface-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="text-[10px] text-surface-500 dark:text-surface-400 leading-tight truncate">{c.label}{c.requerido && ' *'}</p>
                          {ok && !enEdit && (
                            <span className={`text-[9px] font-mono tabular-nums ${confColor}`} title={r?.razon}>{r?.confianza}%</span>
                          )}
                        </div>
                        {enEdit ? (
                          <div className="mt-0.5 flex flex-col gap-1">
                            <input
                              type={c.tipo === 'date' ? 'date' : c.tipo === 'number' ? 'number' : 'text'}
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = (c.key === 'id_lote' || c.label === 'ID LOTE') ? formatearIdLoteAgent(editVal) : editVal
                                  setOverrides(o => ({ ...o, [c.key]: val }))
                                  setEditKey(null)
                                }
                                if (e.key === 'Escape') setEditKey(null)
                              }}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              className="w-full px-2 py-1 bg-white dark:bg-surface-950 border border-primary-400 dark:border-primary-700 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            />
                            {sugerencias[c.key]?.length ? (
                              <div className="max-h-36 overflow-y-auto bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded shadow-sm">
                                <div className="sticky top-0 bg-surface-100 dark:bg-surface-900 px-2 py-1 text-[9px] font-mono text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
                                  BD ({sugerencias[c.key].length}) · clickea o tipea
                                </div>
                                {sugerencias[c.key]
                                  .filter(s => !editVal || s.toLowerCase().includes(editVal.toLowerCase()))
                                  .slice(0, 18)
                                  .map(s => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={e => { e.stopPropagation(); setEditVal(s) }}
                                      className="block w-full text-left px-2 py-1.5 text-[11px] hover:bg-primary-50 dark:hover:bg-primary-950/40 text-surface-700 dark:text-surface-300 truncate border-b border-surface-100 dark:border-surface-900 last:border-0"
                                    >
                                      {s}
                                    </button>
                                  ))}
                                {editVal && !sugerencias[c.key].some(s => s.toLowerCase() === editVal.toLowerCase()) && (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation()
                                      const val = (c.key === 'id_lote' || c.label === 'ID LOTE') ? formatearIdLoteAgent(editVal) : editVal
                                      setOverrides(o => ({ ...o, [c.key]: val })); setEditKey(null)
                                    }}
                                    className="block w-full text-left px-2 py-1.5 text-[11px] bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 truncate"
                                  >
                                    ＋ Nuevo: "{editVal}"
                                  </button>
                                )}
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2 text-[9px]">
                              <button onClick={e => { e.stopPropagation(); setOverrides(o => ({ ...o, [c.key]: editVal })); setEditKey(null) }} className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">guardar</button>
                              <button onClick={e => { e.stopPropagation(); setEditKey(null) }} className="text-surface-500 hover:underline">cancelar</button>
                              <span className="text-surface-400">Enter / Esc</span>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-xs font-medium tabular-nums truncate ${ok ? 'text-surface-900 dark:text-white' : 'text-surface-400 italic'}`}>
                            {r?.valor || '—'}
                          </p>
                        )}
                        {ok && r && r.original !== r.valor && !enEdit && (
                          <p className="text-[9px] text-surface-400 italic">tipeaste "{r.original}" → autocompletado</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}
        <AnimatePresence mode="wait">
          {!draftActivo && !filtroCumcs ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="space-y-2 text-surface-400 dark:text-surface-600">
                <CheckCircle2 className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-[11px]">Cuando la IA proponga guardar algo, el preview del registro aparece acá.</p>
              </div>
            </motion.div>
          ) : !draftActivo ? null : (
            <motion.div key={draftActivo.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-mono text-primary-600 dark:text-primary-400">{draftActivo.codigo_cumcs}</p>
                <p className="text-[10px] text-surface-400 dark:text-surface-500">→ {draftActivo.tabla_destino}</p>
              </div>
              <div className="space-y-1.5">
                {Object.entries(draftActivo.payload)
                  .filter(([k]) => !['creado_por', 'datos_extra', 'tipo'].includes(k))
                  .map(([k, v]) => (
                    <motion.div
                      key={k}
                      initial={{ backgroundColor: 'rgba(34,197,94,0.2)' }}
                      animate={{ backgroundColor: 'rgba(34,197,94,0)' }}
                      transition={{ duration: 1 }}
                      className="flex justify-between items-start gap-2 py-1 border-b border-surface-100 dark:border-surface-800"
                    >
                      <span className="text-[11px] font-medium text-surface-600 dark:text-surface-400">{k}</span>
                      <span className="text-[11px] text-surface-900 dark:text-white font-mono text-right max-w-[60%] truncate">
                        {String(v ?? '')}
                      </span>
                    </motion.div>
                  ))}
              </div>
              <div className="pt-2 space-y-2">
                <button
                  onClick={confirmarDraft}
                  disabled={enviando}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar y guardar
                </button>
                <button
                  onClick={cancelarDraft}
                  disabled={enviando}
                  className="w-full px-3 py-1.5 text-xs text-surface-500 hover:text-red-600 border border-surface-200 dark:border-surface-700 rounded-lg"
                >
                  Cancelar draft
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface ValorNormalizado {
  valor: string         // el valor final (autocompletado si aplica)
  original: string      // lo que tipeo el operador
  confianza: number     // 0-100
  razon: string         // explicacion de por que esa confianza (tooltip)
}

/**
 * Extrae los valores ya respondidos del chat history + los normaliza
 * (autocompletar "hoy"->fecha, "pete"->"Pete Hope") + asigna confianza.
 */
function extraerValoresDelChat(
  campos: CampoChat[],
  history: Array<{ role: string; content: string }>,
  reglas?: { rangos?: Record<string, { rangoMin?: number; rangoMax?: number; unidad?: string }> },
): Record<string, ValorNormalizado> {
  const valores: Record<string, ValorNormalizado> = {}
  const ordenados = [...campos].sort((a, b) => b.label.length - a.label.length)

  for (let i = 0; i < history.length - 1; i++) {
    const cur = history[i]
    const next = history[i + 1]
    if (cur.role !== 'assistant' || next.role !== 'user') continue
    const userTxt = next.content.trim()
    if (!userTxt || userTxt.toLowerCase() === 'iniciar') continue
    for (const c of ordenados) {
      const labelLower = c.label.toLowerCase()
      const botLower = cur.content.toLowerCase()
      if (botLower.includes(labelLower) && !valores[c.key]) {
        valores[c.key] = normalizarValor(c, userTxt, reglas?.rangos?.[c.key])
        break
      }
    }
  }
  return valores
}

// formatearIdLoteAgent ahora delega en lib (single source of truth)
const formatearIdLoteAgent = formatearIdLoteLib

function normalizarValor(
  c: CampoChat,
  raw: string,
  rango?: { rangoMin?: number; rangoMax?: number; unidad?: string },
): ValorNormalizado {
  const original = raw.trim()
  const v = original

  // ID LOTE: auto-formato
  if (c.key === 'id_lote' || c.label === 'ID LOTE') {
    const formateado = formatearIdLoteAgent(v)
    if (formateado !== v) return { valor: formateado, original, confianza: 95, razon: `Auto-formato a "${formateado}"` }
    return { valor: v, original, confianza: 90, razon: 'Formato ID LOTE' }
  }

  // Fecha
  if (c.tipo === 'date') {
    if (v.toLowerCase() === 'hoy') {
      return { valor: new Date().toISOString().slice(0, 10), original, confianza: 100, razon: 'Hoy normalizado a fecha ISO' }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { valor: v, original, confianza: 100, razon: 'Formato ISO valido' }
    const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
    if (m) return { valor: `${m[3]}-${m[2]}-${m[1]}`, original, confianza: 95, razon: 'Convertido DD/MM/YYYY a ISO' }
    return { valor: v, original, confianza: 30, razon: 'Formato fecha no reconocido' }
  }

  // Numero
  if (c.tipo === 'number') {
    const norm = v.replace(',', '.')
    if (!/^-?\d+(\.\d+)?$/.test(norm)) {
      return { valor: v, original, confianza: 20, razon: 'No parece numero — revisar' }
    }
    const n = parseFloat(norm)
    if (rango && (rango.rangoMin !== undefined || rango.rangoMax !== undefined)) {
      const dentro = (rango.rangoMin === undefined || n >= rango.rangoMin) && (rango.rangoMax === undefined || n <= rango.rangoMax)
      if (dentro) return { valor: norm, original, confianza: 95, razon: `Dentro de rango (${rango.rangoMin ?? '-'}–${rango.rangoMax ?? '-'}${rango.unidad ? ' ' + rango.unidad : ''})` }
      return { valor: norm, original, confianza: 50, razon: `Fuera de rango típico (${rango.rangoMin ?? '-'}–${rango.rangoMax ?? '-'}${rango.unidad ? ' ' + rango.unidad : ''})` }
    }
    return { valor: norm, original, confianza: 80, razon: 'Numero valido sin rango definido' }
  }

  // Select
  if (c.tipo === 'select' && c.opciones) {
    const match = c.opciones.find(o => o.toLowerCase() === v.toLowerCase())
    if (match) return { valor: match, original, confianza: 100, razon: `Match exacto en opciones: ${c.opciones.join(' | ')}` }
    // Match parcial (startswith)
    const partial = c.opciones.find(o => o.toLowerCase().startsWith(v.toLowerCase()))
    if (partial) return { valor: partial, original, confianza: 70, razon: `Match parcial → "${partial}"` }
    return { valor: v, original, confianza: 30, razon: `No matchea opciones (${c.opciones.join('|')})` }
  }

  // Text con default value (ej Variedad → Pete Hope)
  if (c.defaultValue) {
    if (v.toLowerCase() === c.defaultValue.toLowerCase()) {
      return { valor: c.defaultValue, original, confianza: 100, razon: 'Match exacto del default' }
    }
    // Match parcial: "pete" → "Pete Hope" si default empieza con lo tipeado
    if (c.defaultValue.toLowerCase().startsWith(v.toLowerCase()) && v.length >= 3) {
      return { valor: c.defaultValue, original, confianza: 90, razon: `Autocompletado al default "${c.defaultValue}"` }
    }
    return { valor: v, original, confianza: 75, razon: 'Texto distinto del default sugerido' }
  }

  // Text generico
  return { valor: v, original, confianza: 80, razon: 'Texto libre aceptado' }
}
