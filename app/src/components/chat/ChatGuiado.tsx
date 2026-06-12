// Chat guiado deterministico (sin IA) para registros CUMCS.
// Alcance prueba: Planta Madre (CM-RE-0101 / 0102 / 0201).
// Flujo: selector de variante -> 1 pregunta por turno -> preview se enverdece -> confirmar.
// Persistencia: draft en localStorage por codigo (sin tocar pending_inserts).

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, CheckCircle2, Loader2, ArrowLeft, Droplet, Sprout, ClipboardList } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CAMPOS_CUMCS, type CampoChat } from '../../lib/camposChatCumcs'
import { REGLAS_CUMCS } from '../../lib/cumcsPrompts'
import { operacionesService } from '../../lib/servicios'
import { supabase } from '../../lib/supabase'
import { cargarSugerencias as cargarSugerenciasLib, formatearIdLote, existeEnSugerencias, type Sugerencias } from '../../lib/sugerenciasCumcs'
import { toast } from 'sonner'

interface VarianteOpcion {
  codigo: string
  label: string
  sublabel: string
  icon: LucideIcon
  tipoOperacion?: string
  defaults?: Record<string, string>
}

const VARIANTES_PM: VarianteOpcion[] = [
  { codigo: 'CM-RE-0101', label: 'Planta Madre — Hidro', sublabel: 'RDWC · Cond. ambientales', icon: Droplet, tipoOperacion: 'planta_madre', defaults: { sistema: 'RDWC' } },
  { codigo: 'CM-RE-0102', label: 'Planta Madre — Coco', sublabel: 'COCO · Cond. ambientales', icon: Sprout, tipoOperacion: 'planta_madre', defaults: { sistema: 'COCO', variedad: 'Pete Hope' } },
  { codigo: 'CM-RE-0201', label: 'Trazabilidad Plantas Madres', sublabel: 'Catalogo maestro PM', icon: ClipboardList, tipoOperacion: 'planta_madre' },
]

type Bubble =
  | { rol: 'bot'; texto: string }
  | { rol: 'user'; texto: string }
  | { rol: 'sistema'; texto: string }

type Estado = 'eligiendo' | 'preguntando' | 'confirmando' | 'guardando' | 'guardado'

const STORAGE_KEY = (cod: string) => `canntrace.chatguiado.draft.${cod}`

export default function ChatGuiado() {
  const [variante, setVariante] = useState<VarianteOpcion | null>(null)
  const [estado, setEstado] = useState<Estado>('eligiendo')
  const [campos, setCampos] = useState<CampoChat[]>([])
  const [idxActual, setIdxActual] = useState(0)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [input, setInput] = useState('')
  const [responsable, setResponsable] = useState('')
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  // Sugerencias por campo (formato consistente con BD existente)
  const [sugerencias, setSugerencias] = useState<Sugerencias>({})
  // Estado: esperando confirmacion sobre lote nuevo
  const [esperandoConfirmLote, setEsperandoConfirmLote] = useState<{ campo: CampoChat; valor: string } | null>(null)
  // Lotes marcados como "nuevo" en esta sesion (para no preguntar dos veces)
  const [lotesNuevos, setLotesNuevos] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ===== Helpers =====
  const campoActual = campos[idxActual]
  const totalCampos = campos.length
  const completados = Object.keys(valores).filter(k => valores[k]?.trim()).length

  function pushBot(texto: string) { setBubbles(b => [...b, { rol: 'bot', texto }]) }
  function pushUser(texto: string) { setBubbles(b => [...b, { rol: 'user', texto }]) }
  function pushSistema(texto: string) { setBubbles(b => [...b, { rol: 'sistema', texto }]) }

  // formatearIdLote viene de '../../lib/sugerenciasCumcs' (fuente unica)

  // ===== Validacion por tipo =====
  function validar(campo: CampoChat, raw: string): { ok: boolean; mensaje?: string; valor?: string } {
    const v = raw.trim()
    if (!v) {
      if (campo.requerido) return { ok: false, mensaje: `"${campo.label}" es obligatorio. Tipea un valor.` }
      return { ok: true, valor: '' }
    }
    if (campo.tipo === 'number') {
      // Solo numeros (acepta decimales con . o ,). Sin simbolos ni palabras.
      const norm = v.replace(',', '.')
      if (!/^-?\d+(\.\d+)?$/.test(norm)) {
        return { ok: false, mensaje: `Solo numeros (ej: 70 o 5.92). Sin letras ni simbolos.` }
      }
      return { ok: true, valor: norm }
    }
    if (campo.tipo === 'date') {
      // ISO YYYY-MM-DD o DD/MM/YYYY o "hoy"
      if (v.toLowerCase() === 'hoy') return { ok: true, valor: new Date().toISOString().slice(0, 10) }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: true, valor: v }
      const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
      if (m) return { ok: true, valor: `${m[3]}-${m[2]}-${m[1]}` }
      return { ok: false, mensaje: `Formato fecha: 2026-04-24 o 24/04/2026 (o tipea "hoy").` }
    }
    if (campo.tipo === 'select' && campo.opciones) {
      const match = campo.opciones.find(o => o.toLowerCase() === v.toLowerCase())
      if (match) return { ok: true, valor: match }
      const partial = campo.opciones.find(o => o.toLowerCase().startsWith(v.toLowerCase()))
      if (partial) return { ok: true, valor: partial }
      return { ok: false, mensaje: `Opciones validas: ${campo.opciones.join(', ')}.` }
    }
    // ID LOTE: auto-formato (espacios/minusculas -> puntos/MAYUSCULAS pegado)
    if (campo.key === 'id_lote' || campo.label === 'ID LOTE') {
      return { ok: true, valor: formatearIdLote(v) }
    }
    // Texto: si hay defaultValue y el input matchea como prefijo (ej "pete" -> "Pete Hope"), autocompletar
    if (campo.defaultValue) {
      const def = campo.defaultValue
      if (v.toLowerCase() === def.toLowerCase()) return { ok: true, valor: def }
      if (def.toLowerCase().startsWith(v.toLowerCase()) && v.length >= 3) {
        return { ok: true, valor: def }
      }
    }
    return { ok: true, valor: v }
  }

  // ===== Cargar sugerencias de la BD (delega en lib compartida) =====
  async function cargarSugerenciasParaCodigo(codigo: string) {
    setSugerencias(await cargarSugerenciasLib(codigo))
  }

  // ===== Iniciar variante =====
  function iniciarVariante(v: VarianteOpcion) {
    const lista = CAMPOS_CUMCS[v.codigo] ?? []
    if (lista.length === 0) {
      toast.error(`Sin campos definidos para ${v.codigo}`)
      return
    }
    // Restaurar draft si existe
    const drafted = localStorage.getItem(STORAGE_KEY(v.codigo))
    const initialValues: Record<string, string> = drafted ? safeParse(drafted) : { ...(v.defaults ?? {}) }

    setVariante(v)
    setCampos(lista)
    void cargarSugerenciasParaCodigo(v.codigo)
    setValores(initialValues)
    setIdxActual(0)
    setEstado('preguntando')
    setBubbles([
      { rol: 'sistema', texto: `Iniciando ${v.label} (${v.codigo}). ${lista.length} campos. Tipea "atras" para volver, "saltar" para campos opcionales.` },
    ])
    // Avanzar al primer campo no completado
    setTimeout(() => avanzarHasta(lista, initialValues, 0), 100)
  }

  function avanzarHasta(lista: CampoChat[], vals: Record<string, string>, desde: number) {
    let i = desde
    while (i < lista.length && vals[lista[i].key]?.trim()) i++
    setIdxActual(i)
    if (i < lista.length) {
      pushBot(formularPregunta(lista[i]))
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      pushBot('✅ Todos los campos completados. Revisa y confirma a la derecha.')
      setEstado('confirmando')
    }
  }

  function formularPregunta(c: CampoChat): string {
    // Mismo formato que el system prompt del Agente IA: "Label? (ej: valor)"
    let q = `${c.label}?`
    // Hint principal: ejemplo del placeholder o opciones
    if (c.tipo === 'select' && c.opciones) {
      q += ` (${c.opciones.join(' o ')})`
    } else if (c.placeholder) {
      q += ` (ej: ${c.placeholder})`
    } else if (c.defaultValue) {
      q += ` (ej: ${c.defaultValue})`
    } else if (c.tipo === 'date') {
      q += ` (ej: hoy, 2026-04-24 o 24/04/2026)`
    } else if (c.tipo === 'number') {
      q += ` (ej: 70)`
    }
    // Hints auxiliares
    const hints: string[] = []
    if (c.defaultValue && !q.includes(c.defaultValue)) hints.push(`Enter = ${c.defaultValue}`)
    if (!c.requerido) hints.push('"saltar" si no aplica')
    if (hints.length) q += ` [${hints.join(', ')}]`
    return q
  }

  // ===== Submit respuesta =====
  function manejarSubmit(e?: FormEvent) {
    e?.preventDefault()
    // Si estamos esperando confirmacion sobre lote nuevo, manejar primero
    if (esperandoConfirmLote) {
      const raw = input.trim().toLowerCase()
      pushUser(input.trim())
      setInput('')
      const esSi = ['si', 'sí', 'yes', 's', 'y', 'nuevo', 'es nuevo', 'dale'].includes(raw)
      const esNo = ['no', 'n', 'cambiar', 'corregir'].includes(raw)
      const { campo, valor } = esperandoConfirmLote
      if (esSi) {
        setLotesNuevos(prev => new Set(prev).add(valor))
        pushBot(`Anotado, "${valor}" queda marcado como lote nuevo. Sigamos.`)
        setEsperandoConfirmLote(null)
        aplicarValor(campo, valor, false)
      } else if (esNo) {
        pushBot(`Dale, repetí ${campo.label}? (ej: 25.PM6, 25.Tr1.Ka.PM4.C7)`)
        setEsperandoConfirmLote(null)
      } else {
        pushBot(`Decime "si" si es un lote nuevo, o "no" si querés volver a tipearlo.`)
      }
      return
    }
    if (estado !== 'preguntando' || !campoActual) return
    const raw = input.trim()
    if (!raw) {
      // Enter vacio: si hay default, usar; si no, repreguntar
      if (campoActual.defaultValue) {
        aplicarValor(campoActual, campoActual.defaultValue, true)
      } else if (!campoActual.requerido) {
        aplicarValor(campoActual, '', true)
      } else {
        pushBot(`⚠️ "${campoActual.label}" es obligatorio. Tipea un valor.`)
      }
      return
    }
    if (raw.toLowerCase() === 'atras' || raw.toLowerCase() === '/atras') {
      retroceder()
      setInput('')
      return
    }
    if (raw.toLowerCase() === 'saltar' || raw.toLowerCase() === '/saltar') {
      if (campoActual.requerido) {
        pushBot(`⚠️ "${campoActual.label}" es obligatorio, no se puede saltar.`)
        setInput('')
        return
      }
      pushUser('(saltado)')
      aplicarValor(campoActual, '', false)
      return
    }
    pushUser(raw)
    const res = validar(campoActual, raw)
    if (!res.ok) {
      pushBot(`⚠️ ${res.mensaje} Probemos de nuevo: ${formularPregunta(campoActual)}`)
      setInput('')
      return
    }
    const valorFinal = res.valor ?? raw
    // Para ID LOTE / id_planta_madre / codigo_id: si no existe en sugerencias normalizadas, preguntar
    if (['id_lote', 'id_planta_madre', 'codigo_id'].includes(campoActual.key) && valorFinal) {
      const yaExiste = existeEnSugerencias(sugerencias, campoActual.key, valorFinal)
        || existeEnSugerencias(sugerencias, 'id_lote', valorFinal)
      if (!yaExiste && !lotesNuevos.has(valorFinal)) {
        setInput('')
        pushBot(`"${valorFinal}" no aparece en la base. ¿Es un lote nuevo? (si/no)`)
        setEsperandoConfirmLote({ campo: campoActual, valor: valorFinal })
        return
      }
    }
    aplicarValor(campoActual, valorFinal, false)
  }

  function aplicarValor(c: CampoChat, valor: string, mostrarUser: boolean) {
    if (mostrarUser) pushUser(valor || '(vacio)')
    const next = { ...valores, [c.key]: valor }
    setValores(next)
    setInput('')
    if (variante) localStorage.setItem(STORAGE_KEY(variante.codigo), JSON.stringify(next))
    avanzarHasta(campos, next, idxActual + 1)
  }

  function retroceder() {
    if (idxActual === 0) {
      pushBot('Ya estas en el primer campo.')
      return
    }
    const nuevoIdx = idxActual - 1
    const c = campos[nuevoIdx]
    pushSistema(`◀ Volviste a "${c.label}"`)
    setIdxActual(nuevoIdx)
    pushBot(formularPregunta(c))
  }

  // ===== Reset / Cambiar variante =====
  function volverAlSelector() {
    setEstado('eligiendo')
    setVariante(null)
    setBubbles([])
    setValores({})
    setCampos([])
    setIdxActual(0)
    setInput('')
  }

  // ===== Confirmar y guardar =====
  async function confirmarYGuardar() {
    if (!variante) return
    if (!responsable.trim()) {
      toast.error('Tipea el responsable antes de guardar')
      return
    }
    setEstado('guardando')
    try {
      const datos: any = {
        tipo_operacion: variante.tipoOperacion,
        responsable: responsable.trim(),
        fecha_operacion: valores.fecha || new Date().toISOString().slice(0, 10),
        json_estructurado: { via: 'chat_guiado', codigo: variante.codigo },
        datos_extra: { registro_cumcs: variante.codigo, ...valores },
      }
      // Mapeo a columnas top-level si existen
      if (valores.humedad) datos.humedad_porcentaje = parseFloat(valores.humedad)
      if (valores.temperatura) datos.temperatura_c = parseFloat(valores.temperatura)
      if (valores.observaciones) datos.observaciones = valores.observaciones

      const op = await operacionesService.crearOperacion(datos)
      await operacionesService.confirmarOperacion(op.id)
      // Si el ID LOTE quedo marcado como nuevo, crear el row en `lotes` para que la proxima
      // vez aparezca en sugerencias y no se vuelva a preguntar "es nuevo?"
      const idLote = valores.id_lote || valores.id_planta_madre || valores.codigo_id
      if (idLote && lotesNuevos.has(idLote)) {
        try {
          await supabase.from('lotes').insert({
            codigo_lote: idLote,
            estado: 'activo',
            datos_extra: { creado_via: 'chat_guiado', cumcs: variante.codigo, sistema: valores.sistema },
          })
        } catch { /* si falla (duplicado u otro), seguimos — la operacion ya esta confirmada */ }
      }
      localStorage.removeItem(STORAGE_KEY(variante.codigo))
      toast.success(`Guardado ${variante.codigo} (${op.id.slice(0, 8)}...)`)
      setEstado('guardado')
      pushSistema(`✅ Guardado en Supabase. Operacion ${op.id.slice(0, 8)}...`)
    } catch (e: any) {
      toast.error('Error al guardar: ' + e.message)
      setEstado('confirmando')
    }
  }

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [bubbles])

  const progreso = totalCampos > 0 ? Math.round((completados / totalCampos) * 100) : 0

  // ===== UI =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full">
      {/* === COLUMNA CHAT === */}
      <div className="flex flex-col bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden h-[calc(100vh-220px)] shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-primary-50 dark:bg-primary-950/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900 dark:text-white">Chat guiado rapido</p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400">Sin IA · respuestas paso a paso</p>
            </div>
          </div>
          {variante && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { if (variante) { localStorage.removeItem(STORAGE_KEY(variante.codigo)); iniciarVariante(variante) } }}
                className="flex items-center gap-1 text-[11px] text-primary-700 dark:text-primary-300 hover:underline font-medium"
                title="Borrar lo cargado y empezar el mismo registro de cero"
              >
                <Sparkles className="w-3 h-3" /> Nuevo
              </button>
              <button onClick={volverAlSelector} className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-primary-700 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Selector de variante */}
        {estado === 'eligiendo' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-surface-500 dark:text-surface-400">¿Que registro de Planta Madre vas a cargar?</p>
            {VARIANTES_PM.map(v => {
              const Icon = v.icon
              const tieneDraft = !!localStorage.getItem(STORAGE_KEY(v.codigo))
              return (
                <button
                  key={v.codigo}
                  onClick={() => iniciarVariante(v)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl hover:border-primary-400 dark:hover:border-primary-700 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{v.label}</p>
                    <p className="text-[11px] text-surface-500 dark:text-surface-400">{v.sublabel} · {v.codigo}</p>
                  </div>
                  {tieneDraft && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-md">
                      DRAFT
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Chat activo */}
        {estado !== 'eligiendo' && (
          <>
            {/* Progreso */}
            <div className="px-4 py-2 border-b border-surface-200 dark:border-surface-800 bg-white/60 dark:bg-surface-950/60">
              <div className="flex items-center justify-between text-[10px] text-surface-500 mb-1">
                <span>{variante?.codigo} · {variante?.label}</span>
                <span className="font-mono tabular-nums">{completados}/{totalCampos} · {progreso}%</span>
              </div>
              <div className="h-1 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progreso}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                />
              </div>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              <AnimatePresence initial={false}>
                {bubbles.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${b.rol === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {b.rol === 'sistema' ? (
                      <span className="text-[10px] text-surface-400 italic mx-auto">{b.texto}</span>
                    ) : (
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        b.rol === 'bot'
                          ? 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-100 rounded-tl-sm'
                          : 'bg-primary-700 text-white rounded-tr-sm'
                      }`}>
                        {b.texto}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            {estado === 'preguntando' && (
              <form onSubmit={manejarSubmit} className="border-t border-surface-200 dark:border-surface-800 p-3 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Respondé "${campoActual?.label || ''}" (Enter)`}
                  className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  autoFocus
                />
                <button type="submit" className="px-3 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {(estado === 'confirmando' || estado === 'guardando' || estado === 'guardado') && (
              <div className="border-t border-surface-200 dark:border-surface-800 p-3 space-y-2">
                {estado !== 'guardado' && (
                  <input
                    type="text"
                    value={responsable}
                    onChange={e => setResponsable(e.target.value)}
                    placeholder="Responsable (obligatorio para guardar)"
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                )}
                <div className="flex gap-2">
                  {estado === 'guardado' ? (
                    <button onClick={volverAlSelector} className="flex-1 px-3 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800">
                      Cargar otro
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEstado('preguntando'); setIdxActual(0); avanzarHasta(campos, valores, 0) }}
                        disabled={estado === 'guardando'}
                        className="px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-600 rounded-lg text-sm hover:bg-surface-50 disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={confirmarYGuardar}
                        disabled={estado === 'guardando'}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-700 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50"
                      >
                        {estado === 'guardando' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {estado === 'guardando' ? 'Guardando...' : 'Confirmar y guardar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* === COLUMNA PREVIEW === */}
      <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden h-[calc(100vh-220px)] flex flex-col shadow-sm">
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-white/60 dark:bg-surface-950/60">
          <p className="text-sm font-bold text-surface-900 dark:text-white">Preview del registro</p>
          <p className="text-[10px] text-surface-400 font-mono">{variante?.codigo || '—'}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!variante && (
            <div className="text-center py-12 text-surface-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Elegi un registro a la izquierda</p>
            </div>
          )}
          {variante && (() => { const reglas = REGLAS_CUMCS[variante.codigo]; return campos.map((c, i) => {
            const val = valores[c.key]
            const ok = !!val?.trim()
            const conf = ok ? calcularConfianza(c, val, reglas?.rangos?.[c.key]) : null
            const confColor = !conf ? '' : conf.confianza >= 80 ? 'text-emerald-500' : conf.confianza >= 50 ? 'text-amber-500' : 'text-red-500'
            const esLoteNuevo = (c.key === 'id_lote' || c.label === 'ID LOTE') && val && lotesNuevos.has(val)
            const esActual = i === idxActual && estado === 'preguntando'
            const editable = ok && estado !== 'guardando' && estado !== 'guardado'
            const enEdicion = editandoCampo === c.key
            const guardarEdit = () => {
              const res = validar(c, valorEdit)
              if (!res.ok) { setEditError(res.mensaje ?? 'Valor invalido'); return }
              const next = { ...valores, [c.key]: res.valor ?? '' }
              setValores(next)
              if (variante) localStorage.setItem(STORAGE_KEY(variante.codigo), JSON.stringify(next))
              setEditandoCampo(null)
              setEditError(null)
            }
            return (
              <div
                key={c.key}
                onClick={() => { if (editable && !enEdicion) { setEditandoCampo(c.key); setValorEdit(val); setEditError(null) } }}
                className={`flex items-start gap-3 py-2 px-2 rounded-lg transition-all ${
                  esActual ? 'bg-primary-50 dark:bg-primary-950/30 ring-1 ring-primary-300 dark:ring-primary-700' : ''
                } ${editable && !enEdicion ? 'cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800/50' : ''}`}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
                  ) : esActual ? (
                    <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-surface-300 dark:border-surface-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-tight truncate">
                      {c.label}{c.requerido && ' *'}
                      {esLoteNuevo && <span className="ml-1 text-[9px] font-mono px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">NUEVO</span>}
                    </p>
                    {ok && conf && !enEdicion && (
                      <span className={`text-[10px] font-mono tabular-nums ${confColor}`} title={conf.razon}>{conf.confianza}%</span>
                    )}
                  </div>
                  {enEdicion ? (
                    <div className="mt-0.5 flex flex-col gap-1">
                      <input
                        type={c.tipo === 'date' ? 'date' : c.tipo === 'number' ? 'number' : 'text'}
                        value={valorEdit}
                        onChange={e => setValorEdit(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') guardarEdit()
                          if (e.key === 'Escape') { setEditandoCampo(null); setEditError(null) }
                        }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-white dark:bg-surface-950 border border-primary-400 dark:border-primary-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                      {sugerencias[c.key]?.length ? (
                        <div className="max-h-40 overflow-y-auto bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded shadow-sm">
                          <div className="sticky top-0 bg-surface-100 dark:bg-surface-900 px-2 py-1 text-[9px] font-mono text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
                            BD ({sugerencias[c.key].length}) · clickea o tipea
                          </div>
                          {sugerencias[c.key]
                            .filter(s => !valorEdit || s.toLowerCase().includes(valorEdit.toLowerCase()))
                            .slice(0, 20)
                            .map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setValorEdit(s) }}
                                className="block w-full text-left px-2 py-1.5 text-xs hover:bg-primary-50 dark:hover:bg-primary-950/40 text-surface-700 dark:text-surface-300 truncate border-b border-surface-100 dark:border-surface-900 last:border-0"
                              >
                                {s}
                              </button>
                            ))}
                          {valorEdit && !sugerencias[c.key].some(s => s.toLowerCase() === valorEdit.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); guardarEdit() }}
                              className="block w-full text-left px-2 py-1.5 text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 truncate"
                            >
                              ＋ Nuevo: "{valorEdit}"
                            </button>
                          )}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 text-[10px]">
                        <button onClick={e => { e.stopPropagation(); guardarEdit() }} className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">guardar</button>
                        <button onClick={e => { e.stopPropagation(); setEditandoCampo(null); setEditError(null) }} className="text-surface-500 hover:underline">cancelar</button>
                        <span className="text-surface-400">Enter / Esc</span>
                        {editError && <span className="text-red-500">⚠ {editError}</span>}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm font-medium tabular-nums truncate ${ok ? 'text-surface-900 dark:text-white' : 'text-surface-400 italic'}`}>
                      {val || '—'}
                    </p>
                  )}
                </div>
              </div>
            )
          })})()}
        </div>
      </div>
    </div>
  )
}

function safeParse(s: string): Record<string, string> {
  try { return JSON.parse(s) } catch { return {} }
}

interface RangoCampo { rangoMin?: number; rangoMax?: number; unidad?: string }

/** Confianza 0-100 + razon basada en tipo, rango y default. Mismo criterio que ChatAgent. */
function calcularConfianza(c: CampoChat, valor: string, rango?: RangoCampo): { confianza: number; razon: string } {
  const v = (valor ?? '').trim()
  if (!v) return { confianza: 0, razon: 'Sin valor' }
  if (c.tipo === 'date') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { confianza: 100, razon: 'Fecha ISO valida' }
    return { confianza: 60, razon: 'Formato fecha no estandar' }
  }
  if (c.tipo === 'number') {
    const n = parseFloat(v.replace(',', '.'))
    if (isNaN(n)) return { confianza: 20, razon: 'No parece numero' }
    if (rango && (rango.rangoMin !== undefined || rango.rangoMax !== undefined)) {
      const dentro = (rango.rangoMin === undefined || n >= rango.rangoMin) && (rango.rangoMax === undefined || n <= rango.rangoMax)
      if (dentro) return { confianza: 95, razon: `Dentro de rango (${rango.rangoMin ?? '-'}–${rango.rangoMax ?? '-'}${rango.unidad ? ' ' + rango.unidad : ''})` }
      return { confianza: 50, razon: `Fuera de rango típico (${rango.rangoMin ?? '-'}–${rango.rangoMax ?? '-'}${rango.unidad ? ' ' + rango.unidad : ''})` }
    }
    return { confianza: 80, razon: 'Numero valido sin rango definido' }
  }
  if (c.tipo === 'select' && c.opciones) {
    if (c.opciones.some(o => o.toLowerCase() === v.toLowerCase())) return { confianza: 100, razon: 'Match exacto en opciones' }
    return { confianza: 40, razon: 'No matchea opciones' }
  }
  if (c.defaultValue) {
    if (v.toLowerCase() === c.defaultValue.toLowerCase()) return { confianza: 100, razon: 'Match con default' }
    return { confianza: 75, razon: 'Texto distinto del default sugerido' }
  }
  return { confianza: 80, razon: 'Texto libre' }
}
