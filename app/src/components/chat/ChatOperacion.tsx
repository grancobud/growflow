import { useState, useRef, useEffect } from 'react'
import {
  Bot, User, CheckCircle2, Loader2, RotateCcw, ChevronLeft, Sparkles,
  Package, Sprout, Droplet, Leaf, X, Scissors, TreePine, Axe, Flower2, Bug,
  Wheat, Sun, Microscope, Ruler, Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TipoOperacion } from '../../types'
import { ETIQUETAS_OPERACION } from '../../types'
import { operacionesService } from '../../lib/servicios'
import { AREAS_OPERACION, OPERACION_A_CUMCS } from '../../lib/cumcsJerarquia'
import { camposParaCodigo, type CampoChat } from '../../lib/camposChatCumcs'
import { supabase } from '../../lib/supabase'
import { insertarRegistroCumcs, getTablaParaCumcs } from '../../lib/cumcsRouter'
import { generarProximaPregunta } from '../../lib/aiGuidedChat'
import InputLibreAI from './InputLibreAI'
import type { OperacionExtraida } from '../../lib/aiExtract'

const ICONOS_LUCIDE: Record<TipoOperacion, LucideIcon> = {
  ingreso_insumos: Package, planta_madre: Sprout, fertilizacion: Droplet,
  utilizacion_insumos: Leaf, baja_stock: X, esquejado: Scissors,
  vegetativa: TreePine, poda: Axe, floracion: Flower2, control_plagas: Bug,
  cosecha: Wheat, secado: Sun, trimming: Scissors, cuarentena: Microscope,
  fraccionamiento: Ruler, almacenamiento: Warehouse,
}

type Paso = 'tipo' | 'campo' | 'responsable' | 'observaciones' | 'confirmar' | 'listo'

interface Msg {
  id: string
  de: 'bot' | 'usuario'
  texto: string
  ts: Date
  botones?: { texto: string; valor: string }[]
}

export default function ChatOperacion() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [paso, setPaso] = useState<Paso>('tipo')
  const [input, setInput] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Tipo + drill-down area > subgrupo > tipo
  const [tipo, setTipo] = useState<TipoOperacion | null>(null)
  const [areaSel, setAreaSel] = useState<string | null>(null)
  const [subgrupoSel, setSubgrupoSel] = useState<string | null>(null)

  // Flow conversacional del formulario CUMCS
  const [campos, setCampos] = useState<CampoChat[]>([])
  const [campoIdx, setCampoIdx] = useState(0)
  const [formCampos, setFormCampos] = useState<Record<string, string>>({})
  const [responsable, setResponsable] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // AI-asistido: texto libre → extraccion estructurada
  const [modoAI, setModoAI] = useState(false)
  const [metaAI, setMetaAI] = useState<{ modelo: string; prompt: string } | null>(null)

  // Chat guiado con preguntas generadas por IA (en lugar de hardcoded).
  // Default true para que se use por defecto; fallback silencioso si la IA falla.
  const [iaGuiadaActiva, setIaGuiadaActiva] = useState(true)
  const [modeloIAGuiada, setModeloIAGuiada] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inicializado = useRef(false)

  // Catalogos (para sugerir lotes si el campo es id_lote)
  const [lotes, setLotes] = useState<any[]>([])

  useEffect(() => {
    // Query liviana solo para el autocomplete - 200 lotes mas recientes.
    // El fetch completo con joins (stockService.getLotes) era el cuello de botella.
    ;(async () => {
      try {
        const { data } = await supabase.from('lotes')
          .select('id, codigo_lote, estado')
          .eq('eliminado', false)
          .order('creado_en', { ascending: false })
          .limit(200)
        setLotes(data || [])
      } catch { /* ok */ }
    })()
  }, [])

  useEffect(() => {
    if (inicializado.current) return
    inicializado.current = true
    // Si el usuario vino desde /escaner con codigos escaneados, mostrarlos al inicio del chat
    try {
      const raw = sessionStorage.getItem('canntrace_codigos_escaneados')
      if (raw) {
        const data = JSON.parse(raw)
        const edad = Date.now() - (data.fecha || 0)
        // Vencen a los 5 minutos para no reutilizar accidentalmente
        if (edad < 5 * 60 * 1000 && Array.isArray(data.codigos) && data.codigos.length > 0) {
          sessionStorage.removeItem('canntrace_codigos_escaneados')
          addBot(`Recibi ${data.codigos.length} codigo${data.codigos.length === 1 ? '' : 's'} del escaner (modo ${data.modo}):`)
          addUsr(data.codigos.map((c: string) => `• ${c}`).join('\n'))
          addBot('Ahora elegi el area donde usarlos.')
          return
        }
      }
    } catch { /* ignore */ }
    addBot('Hola. Por que area empezamos?')
  }, [])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function addBot(texto: string, botones?: Msg['botones']) {
    setMsgs(p => [...p, { id: `b${Date.now()}${Math.random()}`, de: 'bot', texto, ts: new Date(), botones }])
  }
  function addUsr(texto: string) {
    setMsgs(p => [...p, { id: `u${Date.now()}${Math.random()}`, de: 'usuario', texto, ts: new Date() }])
  }

  // ============ FLOW: Eleccion area > subgrupo > tipo ============
  function selArea(id: string) {
    const a = AREAS_OPERACION.find(x => x.id === id)
    if (!a) return
    setAreaSel(id)
    setSubgrupoSel(null)
    addUsr(a.nombre)
    addBot(`Bien. Que tipo de ${a.nombre.toLowerCase()}?`)
  }

  function selSubgrupo(nombre: string) {
    setSubgrupoSel(nombre)
    addUsr(nombre)
    const a = AREAS_OPERACION.find(x => x.id === areaSel)
    const sg = a?.subgrupos.find(s => s.nombre === nombre)
    if (sg && sg.tipos.length === 1) {
      selTipo(sg.tipos[0] as TipoOperacion)
    } else {
      addBot(`Cual operacion de ${nombre.toLowerCase()}?`)
    }
  }

  function selTipo(t: TipoOperacion) {
    setTipo(t)
    addUsr(ETIQUETAS_OPERACION[t])
    const cumcs = OPERACION_A_CUMCS[t]
    const lista = cumcs ? camposParaCodigo(cumcs.codigo) : camposParaCodigo('generico')
    setCampos(lista)
    setCampoIdx(0)
    // Pre-cargar defaults
    const defaults: Record<string, string> = {}
    for (const c of lista) if (c.defaultValue) defaults[c.key] = c.defaultValue
    setFormCampos(defaults)
    if (cumcs) {
      addBot(`Vamos a cargar ${ETIQUETAS_OPERACION[t]} con el formato ${cumcs.codigo} (${cumcs.nombre}). Son ${lista.length} campos, te voy preguntando uno por uno.`)
    } else {
      addBot(`Vamos a cargar ${ETIQUETAS_OPERACION[t]} con campos basicos.`)
    }
    setTimeout(() => { void iniciarCampo(lista, 0) }, 400)
  }

  // ============ FLOW: Iteracion campo por campo ============
  // Genera el texto final de la pregunta: intenta IA si esta activa, fallback hardcoded.
  async function resolvePreguntaTexto(codigoCumcs: string | null, c: CampoChat): Promise<string> {
    let texto = c.pregunta
    // Si IA guiada activa Y tenemos codigo CUMCS, intentar generar pregunta natural.
    if (iaGuiadaActiva && codigoCumcs) {
      try {
        const ctx: Record<string, string | number | null | undefined> = {
          codigo_cumcs: codigoCumcs,
          tipo_operacion: tipo ? ETIQUETAS_OPERACION[tipo] : undefined,
          // Pasar todos los campos ya respondidos como contexto al LLM
          ...formCampos,
        }
        const res = await generarProximaPregunta(codigoCumcs, c, ctx, 2500)
        if (res?.pregunta) {
          texto = res.pregunta
          setModeloIAGuiada(res.modelo_usado)
        }
      } catch {
        // Fallback silencioso a pregunta hardcoded
      }
    }
    return texto
  }

  async function iniciarCampo(lista: CampoChat[], idx: number) {
    if (idx >= lista.length) {
      pedirResponsable()
      return
    }
    setPaso('campo')
    const c = lista[idx]
    const codigoCumcs = tipo ? OPERACION_A_CUMCS[tipo]?.codigo ?? null : null
    let texto = await resolvePreguntaTexto(codigoCumcs, c)
    // Sufijos utiles (solo si el texto viene del schema, no los agregamos cuando viene de IA natural)
    const fromAI = iaGuiadaActiva && codigoCumcs && modeloIAGuiada !== null
    if (!fromAI) {
      if (c.placeholder && !['select', 'date', 'time'].includes(c.tipo)) texto += ` (ej: ${c.placeholder})`
      if (!c.requerido && !['select'].includes(c.tipo)) texto += ' — podes escribir "saltar" para omitir'
    }

    // Botones segun tipo
    if (c.tipo === 'select' && c.opciones) {
      const botones = c.opciones.map(o => ({ texto: o, valor: o }))
      addBot(texto, botones)
    } else if (c.key === 'id_lote' && lotes.length > 0) {
      // Sugerir lotes activos
      const activos = lotes.filter(l => ['activo', 'procesado'].includes(l.estado)).slice(0, 6)
      const botones = activos.map(l => ({ texto: l.codigo_lote, valor: l.codigo_lote }))
      addBot(texto, botones.length > 0 ? botones : undefined)
    } else {
      addBot(texto)
    }
  }

  function guardarCampo(valor: string) {
    const c = campos[campoIdx]
    if (!c) return
    // Validar tipo
    if (c.tipo === 'number') {
      if (valor.toLowerCase() === 'saltar' && !c.requerido) {
        addUsr('(saltar)')
        avanzarCampo()
        return
      }
      const n = parseFloat(valor)
      if (isNaN(n)) {
        addUsr(valor)
        addBot('Necesito un numero. Intenta de nuevo.')
        return
      }
    }
    if (valor.toLowerCase() === 'saltar' && !c.requerido) {
      addUsr('(saltar)')
      avanzarCampo()
      return
    }
    setFormCampos(prev => ({ ...prev, [c.key]: valor }))
    addUsr(valor)
    avanzarCampo()
  }

  function avanzarCampo() {
    const nuevoIdx = campoIdx + 1
    setCampoIdx(nuevoIdx)
    setTimeout(() => { void iniciarCampo(campos, nuevoIdx) }, 250)
  }

  function pedirResponsable() {
    setPaso('responsable')
    addBot('Quien es el responsable de esta operacion?')
  }

  function pedirObservaciones() {
    setPaso('observaciones')
    addBot('Alguna observacion general? (escribi algo o "no")')
  }

  function mostrarResumen() {
    setPaso('confirmar')
    const cumcs = tipo ? OPERACION_A_CUMCS[tipo] : null
    let r = `Resumen:\n\n${ETIQUETAS_OPERACION[tipo!]}`
    if (cumcs) r += ` (${cumcs.codigo})`
    r += '\n'
    for (const c of campos) {
      const v = formCampos[c.key]
      if (v) r += `\n• ${c.label}: ${v}`
    }
    r += `\n• Responsable: ${responsable || '(sin especificar)'}`
    if (observaciones) r += `\n• Observaciones: ${observaciones}`
    r += '\n\nConfirmas?'
    addBot(r)
  }

  // ============ GUARDAR ============
  const num = (k: string): number | undefined => {
    const v = formCampos[k]
    if (!v) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  async function guardar() {
    if (!tipo) return
    addUsr('Confirmo')
    setGuardando(true)
    setPaso('listo')
    try {
      // Resolver lote_origen_id
      let loteId: string | undefined
      if (formCampos.id_lote) {
        const { data: lote } = await supabase.from('lotes').select('id').eq('codigo_lote', formCampos.id_lote).maybeSingle()
        loteId = lote?.id || undefined
      }
      const cumcs = OPERACION_A_CUMCS[tipo]
      const datos: any = {
        tipo_operacion: tipo,
        lote_origen_id: loteId,
        cantidad_entrada: num('plantas_cosechadas') ?? num('cantidad_recibida') ?? num('cantidad') ?? num('cantidad_esquejes') ?? num('entrada') ?? num('cantidad_bolsas'),
        cantidad_salida: num('salida'),
        peso_fresco_kg: num('peso_fresco') ?? num('kg_humedo'),
        peso_seco_kg: num('peso_seco'),
        peso_neto_g: num('peso_neto_g') ?? num('peso'),
        temperatura_c: num('temperatura'),
        humedad_porcentaje: num('humedad'),
        responsable: responsable || undefined,
        observaciones: observaciones || undefined,
        notas_sanitarias: formCampos.cond_sanitaria || formCampos.obs_sanitarias || formCampos.cond_recepcion || undefined,
        texto_original: `Chat: ${ETIQUETAS_OPERACION[tipo]}${cumcs ? ` - ${cumcs.codigo}` : ''}`,
        json_estructurado: { via: 'chat_cumcs', tipo, cumcs: cumcs?.codigo },
        datos_extra: {
          registro_cumcs: cumcs?.codigo || null,
          grupo: cumcs?.grupo || null,
          ...formCampos,
          ...(metaAI ? {
            via_ai: true,
            modelo_ia: metaAI.modelo,
            prompt_original: metaAI.prompt,
            prompt_version: 'v1.1.0-2026-04-19',
          } : {
            via_ai: false,
            via: 'chat_guiado_paso_a_paso',
          }),
        },
      }
      const op = await operacionesService.crearOperacion(datos)
      await operacionesService.confirmarOperacion(op.id)

      // Dual-write: si el CUMCS tiene tabla especifica mapeada (G01/G02/G03/G06),
      // insertar tambien ahi con campos tipados. `operaciones` queda como journal central.
      let registroTabla: string | null = null
      let registroId: string | null = null
      let registroError: string | undefined
      if (cumcs?.codigo) {
        try {
          const res = await insertarRegistroCumcs(cumcs.codigo, formCampos, {
            operacion_id: op.id,
            via_ai: !!metaAI,
            modelo_ia: metaAI?.modelo,
            prompt_original: metaAI?.prompt,
            prompt_version: 'v1.1.0-2026-04-19',
            lote_id: loteId,
          })
          registroTabla = res.tabla
          registroId = res.id
        } catch (e: any) {
          // No bloquear si falla el dual-write — la operacion central ya se guardo.
          registroError = e?.message ?? String(e)
          console.error('[cumcsRouter] dual-write fallo:', registroError)
        }
      }

      // Mensaje de confirmacion con metadata de trazabilidad:
      // - codigo CUMCS + nombre operacion
      // - ID operacion central + ID registro CUMCS especifico (si aplica)
      // - tablas destino (operaciones + tabla CUMCS si se escribio)
      // - via: chat guiado (sin IA) o IA con modelo usado
      const viaMsg = metaAI
        ? `🤖 IA · ${metaAI.modelo}`
        : '📝 Chat guiado (sin IA)'
      const tablaDestinoMsg = registroTabla
        ? `operaciones + ${registroTabla}`
        : (cumcs?.codigo && getTablaParaCumcs(cumcs.codigo))
          ? `operaciones (dual-write fallo: ${registroError ?? 'ver consola'})`
          : 'operaciones'
      addBot(
        `✓ Listo! ${ETIQUETAS_OPERACION[tipo]} registrada` +
        (cumcs?.codigo ? ` — ${cumcs.codigo}` : '') +
        `\n\n**ID operacion**: \`${op.id}\`` +
        (registroId ? `\n**ID registro**: \`${registroId}\`` : '') +
        `\n**Tabla(s)**: ${tablaDestinoMsg}` +
        `\n**Via**: ${viaMsg}` +
        (metaAI?.prompt ? `\n**Prompt**: "${metaAI.prompt}"` : '')
      )
    } catch (err: any) {
      addBot(`Error al guardar: ${err.message}`)
      setPaso('confirmar')
    } finally {
      setGuardando(false)
    }
  }

  function reiniciar() {
    setMsgs([])
    setPaso('tipo')
    setTipo(null); setAreaSel(null); setSubgrupoSel(null)
    setCampos([]); setCampoIdx(0); setFormCampos({})
    setResponsable(''); setObservaciones('')
    setModoAI(false); setMetaAI(null)
    setTimeout(() => addBot('Hola. Por que area empezamos?'), 100)
  }

  // ============ FLOW AI-asistido: aplica extraccion de IA al estado del chat ============
  function aplicarExtraccionAI(data: OperacionExtraida, meta: { modelo: string; prompt: string }) {
    if (!data.tipo_operacion) return
    setMetaAI(meta)
    setModoAI(false)

    // Selecciona el tipo y prepara la lista de campos CUMCS
    const t = data.tipo_operacion as TipoOperacion
    setTipo(t)
    const cumcs = OPERACION_A_CUMCS[t]
    const lista = cumcs ? camposParaCodigo(cumcs.codigo) : camposParaCodigo('generico')
    setCampos(lista)

    // Mapea los campos extraidos a los slots CUMCS mas comunes
    const nuevos: Record<string, string> = {}
    for (const c of lista) if (c.defaultValue) nuevos[c.key] = c.defaultValue

    const cantidadStr = data.cantidad != null ? String(data.cantidad) : ''
    if (cantidadStr) {
      // Los CUMCS usan distintos nombres de campo para "cantidad"
      const keysCantidad = ['cantidad', 'cantidad_esquejes', 'plantas_cosechadas', 'cantidad_recibida', 'cantidad_bolsas', 'entrada']
      for (const k of keysCantidad) if (lista.some(c => c.key === k)) { nuevos[k] = cantidadStr; break }
    }
    if (data.camada) nuevos.camada = data.camada
    if (data.sistema) nuevos.sistema = data.sistema
    if (data.fecha) {
      const keysFecha = ['fecha', 'fecha_ingreso', 'fecha_operacion', 'fecha_cosecha']
      for (const k of keysFecha) if (lista.some(c => c.key === k)) { nuevos[k] = data.fecha; break }
    }
    if (data.id_lote) nuevos.id_lote = data.id_lote

    setFormCampos(nuevos)
    setCampoIdx(lista.length) // skip al final
    if (data.observaciones) setObservaciones(data.observaciones)

    // Mensajeria en el chat para que el usuario vea el flujo
    addUsr(`🤖 IA: "${meta.prompt}"`)
    const campoEti = ETIQUETAS_OPERACION[t as keyof typeof ETIQUETAS_OPERACION] || t
    const resumen = [
      `${campoEti}${cumcs ? ` (${cumcs.codigo})` : ''}`,
      data.cantidad != null ? `cantidad ${data.cantidad}` : null,
      data.camada ? `camada ${data.camada}` : null,
      data.sistema ? `sistema ${data.sistema}` : null,
      data.fecha ? `fecha ${data.fecha}` : null,
    ].filter(Boolean).join(' · ')
    addBot(`IA extrajo: ${resumen}. Quien es el responsable?`)
    setPaso('responsable')
  }

  function handleEnviar() {
    if (!input.trim()) return
    const v = input.trim()
    setInput('')
    if (paso === 'campo') {
      guardarCampo(v)
    } else if (paso === 'responsable') {
      setResponsable(v)
      addUsr(v)
      setTimeout(() => pedirObservaciones(), 250)
    } else if (paso === 'observaciones') {
      const val = v.toLowerCase() === 'no' ? '' : v
      setObservaciones(val)
      addUsr(v)
      setTimeout(() => mostrarResumen(), 250)
    }
  }

  // Boton contextual click (botones del ultimo msg del bot)
  function handleBotonClick(valor: string) {
    if (paso === 'campo') guardarCampo(valor)
  }

  const ultimoBotConBotones = [...msgs].reverse().find(m => m.de === 'bot' && m.botones && m.botones.length > 0)
  const campoActual = paso === 'campo' ? campos[campoIdx] : null

  // Placeholder del input segun paso
  let inputPlaceholder = 'Escribi tu respuesta...'
  if (paso === 'campo' && campoActual) {
    if (campoActual.tipo === 'number') inputPlaceholder = `Numero (ej: ${campoActual.placeholder || '10'})...`
    else if (campoActual.tipo === 'date') inputPlaceholder = 'YYYY-MM-DD (ej: 2025-07-03)...'
    else if (campoActual.tipo === 'time') inputPlaceholder = 'HH:MM (ej: 14:30)...'
    else inputPlaceholder = campoActual.placeholder || campoActual.label + '...'
  } else if (paso === 'responsable') inputPlaceholder = 'Nombre del responsable...'
  else if (paso === 'observaciones') inputPlaceholder = 'Observacion o "no" para omitir...'

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.de === 'usuario' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.de === 'usuario' ? 'bg-primary-600' : 'bg-surface-200'}`}>
              {m.de === 'usuario' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-surface-500" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.de === 'usuario' ? 'bg-primary-600 text-white rounded-tr-md' : 'bg-white text-surface-700 border border-surface-200 rounded-tl-md shadow-sm'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{m.texto}</p>
              <p className="text-[10px] mt-1 opacity-50">{m.ts.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}

        {/* Progreso de campos */}
        {paso === 'campo' && campos.length > 0 && (
          <div className="flex items-center gap-2 pl-11 text-[10px] text-surface-400">
            <div className="flex-1 h-1 bg-surface-100 rounded-full overflow-hidden">
              <div className="h-1 bg-primary-500 rounded-full transition-all" style={{ width: `${Math.round(((campoIdx + 1) / campos.length) * 100)}%` }} />
            </div>
            <span>{campoIdx + 1} / {campos.length}</span>
          </div>
        )}

        {/* Paso 1: Area */}
        {paso === 'tipo' && !areaSel && !modoAI && (
          <div className="space-y-3 pl-11">
            <div className="flex flex-wrap gap-2">
              {AREAS_OPERACION.map(a => (
                <button key={a.id} onClick={() => selArea(a.id)}
                  className="px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm font-medium text-surface-700 hover:border-primary-400 hover:bg-primary-50 transition-all">
                  {a.nombre}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <span className="flex-1 border-t border-surface-200" />
              <span>o</span>
              <span className="flex-1 border-t border-surface-200" />
            </div>
            <button onClick={() => setModoAI(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white rounded-lg text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4" /> Decilo en una frase (IA)
            </button>
          </div>
        )}

        {/* Modo AI: input libre + preview editable */}
        {paso === 'tipo' && modoAI && (
          <div className="pl-11">
            <InputLibreAI
              onConfirmar={aplicarExtraccionAI}
              onCancelar={() => setModoAI(false)}
            />
          </div>
        )}

        {/* Paso 2: Subgrupos */}
        {paso === 'tipo' && areaSel && !subgrupoSel && (
          <div className="pl-11 space-y-2">
            <div className="flex flex-wrap gap-2">
              {AREAS_OPERACION.find(a => a.id === areaSel)?.subgrupos.map(sg => (
                <button key={sg.nombre} onClick={() => selSubgrupo(sg.nombre)}
                  className="px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 hover:border-primary-400 hover:bg-primary-50 transition-all">
                  {sg.nombre}
                </button>
              ))}
            </div>
            <button onClick={() => { setAreaSel(null); addBot('Por que area empezamos?') }}
              className="flex items-center gap-1 text-[11px] text-surface-400 hover:text-surface-600 mt-1">
              <ChevronLeft className="w-3 h-3" /> Cambiar area
            </button>
          </div>
        )}

        {/* Paso 3: Tipos del subgrupo */}
        {paso === 'tipo' && areaSel && subgrupoSel && (
          <div className="pl-11 space-y-2">
            <div className="flex flex-wrap gap-2">
              {AREAS_OPERACION.find(a => a.id === areaSel)?.subgrupos.find(s => s.nombre === subgrupoSel)?.tipos.map(t => {
                const Icon = ICONOS_LUCIDE[t as TipoOperacion]
                return (
                  <button key={t} onClick={() => selTipo(t as TipoOperacion)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-lg text-xs hover:border-primary-400 hover:bg-primary-50 transition-all">
                    <Icon className="w-3.5 h-3.5 text-surface-500" strokeWidth={1.75} />
                    <span className="text-surface-700">{ETIQUETAS_OPERACION[t as TipoOperacion]}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => { setSubgrupoSel(null); addBot(`Que tipo de ${AREAS_OPERACION.find(a => a.id === areaSel)?.nombre.toLowerCase()}?`) }}
              className="flex items-center gap-1 text-[11px] text-surface-400 hover:text-surface-600 mt-1">
              <ChevronLeft className="w-3 h-3" /> Cambiar subgrupo
            </button>
          </div>
        )}

        {/* Botones contextuales del campo actual (select u opciones de lote) */}
        {paso === 'campo' && ultimoBotConBotones && (
          <div className="flex flex-wrap gap-2 pl-11">
            {ultimoBotConBotones.botones!.map((btn, idx) => (
              <button key={idx} onClick={() => handleBotonClick(btn.valor)}
                className="px-3 py-2 bg-white border border-surface-200 rounded-xl text-sm hover:border-primary-400 hover:bg-primary-50 transition-all text-surface-700">
                {btn.texto}
              </button>
            ))}
            {campoActual && !campoActual.requerido && (
              <button onClick={() => { addUsr('(saltar)'); avanzarCampo() }}
                className="px-3 py-2 bg-surface-50 border border-dashed border-surface-300 rounded-xl text-xs text-surface-500 hover:bg-surface-100 transition-all">
                Saltar este campo
              </button>
            )}
          </div>
        )}
        {paso === 'campo' && !ultimoBotConBotones && campoActual && !campoActual.requerido && (
          <div className="pl-11">
            <button onClick={() => { addUsr('(saltar)'); avanzarCampo() }}
              className="px-3 py-1.5 bg-surface-50 border border-dashed border-surface-300 rounded-xl text-xs text-surface-500 hover:bg-surface-100 transition-all">
                Saltar este campo
            </button>
          </div>
        )}

        {/* Confirmar */}
        {paso === 'confirmar' && (
          <div className="flex gap-3 justify-center py-2">
            <button onClick={guardar} disabled={guardando}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-600/25">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {guardando ? 'Guardando...' : 'Confirmar y Guardar'}
            </button>
            <button onClick={reiniciar} disabled={guardando}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-surface-600 rounded-xl text-sm font-medium hover:bg-surface-100 border border-surface-300">
              <RotateCcw className="w-4 h-4" /> Empezar de nuevo
            </button>
          </div>
        )}

        {paso === 'listo' && !guardando && (
          <div className="flex justify-center py-2">
            <button onClick={reiniciar}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">
              <RotateCcw className="w-4 h-4" /> Registrar otra operacion
            </button>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input de texto */}
      {['campo', 'responsable', 'observaciones'].includes(paso) && (
        <div className="border-t border-surface-200 bg-white p-4">
          {/* Toggle: chat guiado con IA generando preguntas naturales */}
          {paso === 'campo' && (
            <div className="flex items-center justify-between mb-2 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={iaGuiadaActiva}
                  onChange={e => setIaGuiadaActiva(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary-600"
                />
                <Sparkles className="w-3 h-3 text-primary-600" />
                <span className="text-surface-600">Preguntas con IA</span>
                {iaGuiadaActiva && modeloIAGuiada && (
                  <span className="text-surface-400 font-mono truncate max-w-[240px]">
                    ({modeloIAGuiada})
                  </span>
                )}
              </label>
              {iaGuiadaActiva && (
                <span className="text-surface-400">
                  Si la IA tarda o falla, uso la pregunta basica.
                </span>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type={campoActual?.tipo === 'date' ? 'date' : campoActual?.tipo === 'time' ? 'time' : campoActual?.tipo === 'number' ? 'number' : 'text'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEnviar()}
              placeholder={inputPlaceholder}
              className="flex-1 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <button onClick={handleEnviar} disabled={!input.trim()}
              className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 text-sm font-medium">
              Enviar
            </button>
          </div>
          {campoActual?.defaultValue && !input && (
            <button onClick={() => setInput(campoActual.defaultValue!)}
              className="text-[10px] text-surface-400 hover:text-primary-600 mt-2">
              Usar default: <span className="font-medium">{campoActual.defaultValue}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
