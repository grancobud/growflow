// PaginaPlantas — gestion de plantas y geneticas del cultivo personal.
// Lista con cards, alta de genetica/planta, registro rapido de eventos y cambio de fase.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Leaf, Plus, X, Droplets, Scissors, FlaskConical, StickyNote,
  Dna, Loader2, ChevronDown, ChevronUp, Flower2, Trash2, Search,
} from 'lucide-react'
import {
  cultivoService, generarCodigoPlanta, FASES, TIPOS_GENETICA, SUSTRATOS,
  type ResumenPlanta, type Genetica, type Evento, type FasePlanta, type TipoEvento,
} from '../lib/cultivo'
import { registroService, type Paciente } from '../lib/registro'
import DetallePlanta from '../components/DetallePlanta'

const COLOR_FASE: Record<FasePlanta, { text: string; bg: string; border: string }> = {
  Germinacion: { text: '#d9f99d', bg: 'rgba(163,230,53,0.10)', border: '#404d20' },
  Plantula:    { text: '#d9f99d', bg: 'rgba(163,230,53,0.10)', border: '#404d20' },
  Vegetativo:  { text: '#bef264', bg: 'rgba(163,230,53,0.14)', border: '#404d20' },
  Floracion:   { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66' },
  Secado:      { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  Curado:      { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  Cosechada:   { text: '#8f8f9f', bg: 'rgba(180,180,200,0.06)', border: '#2a2a3a' },
  Muerta:      { text: '#ff8a7a', bg: 'rgba(122,40,32,0.15)', border: '#7a2820' },
}

// Chip de tipo de genética (Auto/Fem/…) — color + abreviatura.
const COLOR_TIPO: Record<string, { label: string; text: string; bg: string; border: string }> = {
  Automatica:  { label: 'AUTO', text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: '#5a4a20' },
  Feminizada:  { label: 'FEM',  text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66' },
  Regular:     { label: 'REG',  text: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: '#1e3a4a' },
  Esqueje:     { label: 'ESQ',  text: '#bef264', bg: 'rgba(163,230,53,0.12)', border: '#404d20' },
  Desconocido: { label: '¿?',   text: '#8f8f9f', bg: 'rgba(180,180,200,0.06)', border: '#2a2a3a' },
}
function ChipTipo({ tipo }: { tipo?: string | null }) {
  if (!tipo) return null
  const c = COLOR_TIPO[tipo] ?? COLOR_TIPO.Desconocido
  return (
    <span className="text-[9.5px] font-semibold tracking-wide rounded px-1.5 py-0.5 border" title={tipo}
      style={{ color: c.text, background: c.bg, borderColor: c.border }}>{c.label}</span>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'
const selectFiltro = 'px-2.5 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11.5px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60 cursor-pointer max-w-[170px]'

// "Tarea pendiente" derivable de los datos reales: el riego. Una planta en fase
// de crecimiento tiene riego pendiente si pasaron RIEGO_PENDIENTE_DIAS+ del último
// riego registrado (o si nunca se registró uno).
const RIEGO_PENDIENTE_DIAS = 3
const FASES_VIVAS: FasePlanta[] = ['Germinacion', 'Plantula', 'Vegetativo', 'Floracion']
function diasSinRiego(ultimoRiego: string | null): number | null {
  if (!ultimoRiego) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const r = new Date(ultimoRiego + 'T00:00:00')
  return Math.round((hoy.getTime() - r.getTime()) / 86400000)
}
function tieneRiegoPendiente(p: ResumenPlanta): boolean {
  if (!FASES_VIVAS.includes(p.fase)) return false
  const d = diasSinRiego(p.ultimo_riego)
  return d === null || d >= RIEGO_PENDIENTE_DIAS
}

export default function PaginaPlantas() {
  const [plantas, setPlantas] = useState<ResumenPlanta[]>([])
  const [geneticas, setGeneticas] = useState<Genetica[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [verInactivas, setVerInactivas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [modalPlanta, setModalPlanta] = useState(false)
  const [modalGenetica, setModalGenetica] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [eventosPlanta, setEventosPlanta] = useState<Record<string, Evento[]>>({})
  const [detalle, setDetalle] = useState<ResumenPlanta | null>(null)
  // --- filtros ---
  const [busqueda, setBusqueda] = useState('')
  const [fGenetica, setFGenetica] = useState('')
  const [fFase, setFFase] = useState<FasePlanta | ''>('')
  const [fUbicacion, setFUbicacion] = useState('')
  const [fPaciente, setFPaciente] = useState('')
  const [soloRiego, setSoloRiego] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [resumen, gens, pacs] = await Promise.all([
        cultivoService.getResumenPlantas(!verInactivas),
        cultivoService.getGeneticas(),
        registroService.getPacientes().catch(() => []),
      ])
      setPlantas(resumen)
      setGeneticas(gens)
      setPacientes(pacs)
    } catch (err) {
      toast.error(`Error cargando plantas: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [verInactivas])

  useEffect(() => { cargar() }, [cargar])

  const toggleEventos = async (plantaId: string) => {
    if (expandida === plantaId) { setExpandida(null); return }
    setExpandida(plantaId)
    if (!eventosPlanta[plantaId]) {
      try {
        const evs = await cultivoService.getEventos(plantaId, 15)
        setEventosPlanta(prev => ({ ...prev, [plantaId]: evs }))
      } catch { /* la card muestra vacio */ }
    }
  }

  const registrarEvento = async (plantaId: string, tipo: TipoEvento, detalle?: string) => {
    try {
      await cultivoService.crearEvento({ planta_id: plantaId, tipo, detalle: detalle ?? null })
      toast.success(`${tipo} registrado`)
      setEventosPlanta(prev => { const { [plantaId]: _, ...rest } = prev; return rest })
      cargar()
    } catch (err) {
      toast.error(`No se pudo registrar: ${(err as Error).message}`)
    }
  }

  const registrarCosecha = async (plantaId: string, pesoSeco: number, valoracion?: number) => {
    try {
      await cultivoService.crearCosecha({
        planta_id: plantaId,
        fecha: new Date().toISOString().slice(0, 10),
        peso_seco_g: pesoSeco,
        valoracion: valoracion || null,
      })
      // Pasa la planta a fase Cosechada
      await cultivoService.crearEvento({ planta_id: plantaId, tipo: 'CambioFase', detalle: 'Cosechada' })
      toast.success(`Cosecha registrada: ${pesoSeco} g`)
      cargar()
    } catch (err) {
      toast.error(`No se pudo registrar la cosecha: ${(err as Error).message}`)
    }
  }

  const eliminarPlanta = async (p: ResumenPlanta) => {
    if (!window.confirm(`¿Borrar "${p.nombre}" y todos sus eventos? No se puede deshacer.`)) return
    try {
      await cultivoService.eliminarPlanta(p.id)
      toast.success(`"${p.nombre}" borrada`)
      setExpandida(null)
      cargar()
    } catch (err) {
      toast.error(`No se pudo borrar: ${(err as Error).message}`)
    }
  }

  const eliminarEvento = async (plantaId: string, eventoId: string) => {
    try {
      await cultivoService.eliminarEvento(eventoId)
      toast.success('Evento borrado')
      const evs = await cultivoService.getEventos(plantaId, 15)
      setEventosPlanta(prev => ({ ...prev, [plantaId]: evs }))
      cargar()
    } catch (err) {
      toast.error(`No se pudo borrar: ${(err as Error).message}`)
    }
  }

  const cambiarFase = async (plantaId: string, fase: FasePlanta) => {
    try {
      await cultivoService.crearEvento({ planta_id: plantaId, tipo: 'CambioFase', detalle: fase })
      toast.success(`Fase: ${fase}`)
      cargar()
    } catch (err) {
      toast.error(`No se pudo cambiar fase: ${(err as Error).message}`)
    }
  }

  // Opciones de filtro derivadas de las plantas cargadas
  const geneticasUnicas = useMemo(
    () => Array.from(new Set(plantas.map(p => p.genetica).filter((g): g is string => !!g))).sort((a, b) => a.localeCompare(b, 'es')),
    [plantas])
  const ubicacionesUnicas = useMemo(
    () => Array.from(new Set(plantas.map(p => p.ubicacion).filter((u): u is string => !!u))).sort((a, b) => a.localeCompare(b, 'es')),
    [plantas])
  const pacientesUnicos = useMemo(() => {
    const m = new Map<string, string>()
    plantas.forEach(p => { if (p.paciente_id) m.set(p.paciente_id, p.paciente_nombre ?? 'Paciente') })
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [plantas])
  const fasesPresentes = useMemo(() => FASES.filter(f => plantas.some(p => p.fase === f)), [plantas])

  const q = busqueda.trim().toLowerCase()
  const plantasFiltradas = useMemo(() => plantas.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q) || (p.genetica ?? '').toLowerCase().includes(q)) &&
    (!fGenetica || p.genetica === fGenetica) &&
    (!fFase || p.fase === fFase) &&
    (!fUbicacion || p.ubicacion === fUbicacion) &&
    (!fPaciente || p.paciente_id === fPaciente) &&
    (!soloRiego || tieneRiegoPendiente(p))
  ).sort((a, b) => {
    // Agrupar por variedad (genética) y, dentro, por número de planta.
    const ga = a.genetica ?? '￿', gb = b.genetica ?? '￿'
    const g = ga.localeCompare(gb, 'es')
    if (g !== 0) return g
    return a.nombre.localeCompare(b.nombre, 'es', { numeric: true })
  }), [plantas, q, fGenetica, fFase, fUbicacion, fPaciente, soloRiego])
  const riegoPendienteCount = useMemo(() => plantas.filter(tieneRiegoPendiente).length, [plantas])
  const hayFiltros = !!(q || fGenetica || fFase || fUbicacion || fPaciente || soloRiego)
  const limpiarFiltros = () => { setBusqueda(''); setFGenetica(''); setFFase(''); setFUbicacion(''); setFPaciente(''); setSoloRiego(false) }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Plantas</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {hayFiltros ? `${plantasFiltradas.length} de ${plantas.length}` : `${plantas.length} ${verInactivas ? 'en total' : 'activas'}`} · {geneticas.length} genéticas
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={() => setVerInactivas(v => !v)} className={btnSutil}>
            {verInactivas ? 'Solo activas' : 'Ver todas'}
          </button>
          <button onClick={() => setModalGenetica(true)} className={btnSutil}>
            <Dna className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Genética</span>
          </button>
          <button onClick={() => setModalPlanta(true)} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> Planta
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-20">
        {!cargando && plantas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b]" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre / código / genética"
                className="pl-8 pr-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 w-[210px]" />
            </div>
            <select value={fGenetica} onChange={e => setFGenetica(e.target.value)} className={selectFiltro} title="Filtrar por genética">
              <option value="">Toda genética</option>
              {geneticasUnicas.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={fFase} onChange={e => setFFase(e.target.value as FasePlanta | '')} className={selectFiltro} title="Filtrar por fase">
              <option value="">Toda fase</option>
              {fasesPresentes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {ubicacionesUnicas.length > 0 && (
              <select value={fUbicacion} onChange={e => setFUbicacion(e.target.value)} className={selectFiltro} title="Filtrar por ubicación">
                <option value="">Toda ubicación</option>
                {ubicacionesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            {pacientesUnicos.length > 0 && (
              <select value={fPaciente} onChange={e => setFPaciente(e.target.value)} className={selectFiltro} title="Filtrar por paciente asignado">
                <option value="">Todo paciente</option>
                {pacientesUnicos.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
            )}
            <button onClick={() => setSoloRiego(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11.5px] font-medium transition-colors ${soloRiego ? 'border-[#5a4a20] bg-[#f59e0b]/12 text-[#f59e0b]' : 'border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5] hover:text-[#ececf1] hover:border-[#404d20]'}`}
              title="Plantas que necesitan riego: 3+ días sin regar (o sin registro)">
              <Droplets className="w-3.5 h-3.5" /> Riego pendiente{riegoPendienteCount > 0 ? ` (${riegoPendienteCount})` : ''}
            </button>
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="inline-flex items-center gap-1 px-2 py-2 rounded-lg text-[11px] text-[#5c5c6b] hover:text-[#ff8a7a] transition-colors" title="Limpiar filtros">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        )}
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[140px] animate-pulse" />
            ))}
          </div>
        ) : plantas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
              <Leaf className="w-5 h-5 text-[#5c5c6b]" />
            </div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin plantas cargadas</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Arrancá creando una genética y después la planta.</div>
          </div>
        ) : plantasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
              <Leaf className="w-5 h-5 text-[#5c5c6b]" />
            </div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin resultados</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Ninguna planta coincide con los filtros.</div>
            <button onClick={limpiarFiltros} className={`${btnSutil} mt-3`}><X className="w-3.5 h-3.5" /> Limpiar filtros</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {plantasFiltradas.map(p => {
              const cf = COLOR_FASE[p.fase]
              const abierta = expandida === p.id
              const riegoPend = tieneRiegoPendiente(p)
              return (
                <div key={p.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setDetalle(p)}
                          className="font-display font-semibold text-[14px] text-[#ececf1] truncate hover:text-[#bef264] transition-colors text-left"
                          title="Ver línea de tiempo">{p.nombre}</button>
                        <p className="text-[11px] text-[#757584] truncate mt-0.5">
                          {p.genetica ?? 'Sin genética'}{p.banco ? ` · ${p.banco}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <ChipTipo tipo={p.tipo} />
                          {p.codigo && <span className="font-mono text-[9.5px] text-[#5c5c6b] bg-[#15151d] border border-[#20202c] rounded px-1.5 py-0.5">{p.codigo}</span>}
                          {p.paciente_nombre && <span className="text-[9.5px] text-[#a78bfa] inline-flex items-center gap-0.5">· {p.paciente_nombre}</span>}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium flex-shrink-0"
                        style={{ color: cf.text, background: cf.bg, borderColor: cf.border }}>
                        {p.fase}
                      </span>
                      <button onClick={() => eliminarPlanta(p)}
                        className="p-1 -mr-1 text-[#46464f] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded transition-colors flex-shrink-0"
                        title="Borrar planta">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#8f8f9f] tabular-nums">
                      {p.dias_de_vida != null && <span>Día {p.dias_de_vida}</span>}
                      {p.sustrato && <span>{p.sustrato}</span>}
                      {p.maceta && <span>{p.maceta}</span>}
                      {p.ultimo_riego && <span className="inline-flex items-center gap-1"><Droplets className="w-3 h-3 text-[#38bdf8]" />{new Date(p.ultimo_riego + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>}
                      {riegoPend && <span className="inline-flex items-center gap-1 text-[#f59e0b]" title="Riego pendiente: 3+ días sin regar o sin registro"><Droplets className="w-3 h-3" /> Riego pendiente</span>}
                    </div>

                    {/* Acciones rapidas */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button onClick={() => registrarEvento(p.id, 'Riego')} className={btnSutil} title="Registrar riego">
                        <Droplets className="w-3.5 h-3.5 text-[#38bdf8]" /> Riego
                      </button>
                      <button onClick={() => registrarEvento(p.id, 'Fertilizacion')} className={btnSutil} title="Registrar fertilización">
                        <FlaskConical className="w-3.5 h-3.5 text-[#bef264]" /> Ferti
                      </button>
                      <button onClick={() => registrarEvento(p.id, 'Poda')} className={btnSutil} title="Registrar poda">
                        <Scissors className="w-3.5 h-3.5 text-[#c4b5fd]" /> Poda
                      </button>
                      <NotaRapida onGuardar={(txt) => registrarEvento(p.id, 'Nota', txt)} />
                      <CosechaRapida onGuardar={(peso, val) => registrarCosecha(p.id, peso, val)} />
                      <select
                        value={p.fase}
                        onChange={e => cambiarFase(p.id, e.target.value as FasePlanta)}
                        className="px-2 py-1.5 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60 cursor-pointer"
                        title="Cambiar fase">
                        {FASES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Historial expandible */}
                  <button onClick={() => toggleEventos(p.id)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 border-t border-[#1f1f2b] text-[10.5px] text-[#5c5c6b] hover:text-[#a6a6b5] hover:bg-[#15151d] transition-colors">
                    {abierta ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {abierta ? 'Ocultar historial' : `Historial (${p.total_eventos})`}
                  </button>
                  {abierta && (
                    <div className="border-t border-[#1f1f2b] max-h-52 overflow-y-auto">
                      {!eventosPlanta[p.id] ? (
                        <div className="py-4 text-center"><Loader2 className="w-4 h-4 text-[#bef264] animate-spin mx-auto" /></div>
                      ) : eventosPlanta[p.id].length === 0 ? (
                        <p className="py-4 text-center text-[11px] text-[#5c5c6b]">Sin eventos</p>
                      ) : (
                        <ul className="divide-y divide-[#1f1f2b]">
                          {eventosPlanta[p.id].map(e => (
                            <li key={e.id} className="group flex items-center gap-2.5 px-4 py-2">
                              <span className="text-[12px] text-[#5c5c6b] tabular-nums font-mono flex-shrink-0">
                                {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                              </span>
                              <span className="text-[11.5px] font-medium text-[#d4d4dd] flex-shrink-0">{e.tipo}</span>
                              {e.detalle && <span className="text-[11px] text-[#757584] truncate">{e.detalle}</span>}
                              <button onClick={() => eliminarEvento(p.id, e.id)}
                                className="ml-auto p-1 text-[#46464f] opacity-0 group-hover:opacity-100 hover:text-[#ff8a7a] rounded transition-all flex-shrink-0"
                                title="Borrar evento">
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalGenetica && (
        <ModalGenetica onCerrar={() => setModalGenetica(false)} onCreada={() => { setModalGenetica(false); cargar() }} />
      )}
      {modalPlanta && (
        <ModalPlanta geneticas={geneticas} pacientes={pacientes} onCerrar={() => setModalPlanta(false)}
          onCreada={() => { setModalPlanta(false); cargar() }}
          onNuevaGenetica={() => { setModalPlanta(false); setModalGenetica(true) }} />
      )}
      {detalle && (
        <DetallePlanta planta={detalle} onCerrar={() => setDetalle(null)} onCambio={cargar} />
      )}
    </div>
  )
}

function NotaRapida({ onGuardar }: { onGuardar: (txt: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className={btnSutil} title="Agregar nota">
        <StickyNote className="w-3.5 h-3.5 text-[#f59e0b]" /> Nota
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5 w-full">
      <input autoFocus value={texto} onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && texto.trim()) { onGuardar(texto.trim()); setTexto(''); setAbierto(false) }
          if (e.key === 'Escape') { setTexto(''); setAbierto(false) }
        }}
        placeholder="Escribí la nota y Enter..." className={inputCls} />
      <button onClick={() => { setTexto(''); setAbierto(false) }} className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a]">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function CosechaRapida({ onGuardar }: { onGuardar: (pesoSeco: number, valoracion?: number) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [peso, setPeso] = useState('')
  const [val, setVal] = useState(0)
  const guardar = () => {
    const p = parseFloat(peso.replace(',', '.'))
    if (!p || p <= 0) { toast.error('Cargá el peso seco (g)'); return }
    onGuardar(p, val || undefined); setPeso(''); setVal(0); setAbierto(false)
  }
  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className={`${btnSutil} border-[#404d20] text-[#d9f99d]`} title="Registrar cosecha (peso seco)">
        <Scissors className="w-3.5 h-3.5 text-[#bef264]" /> Cosecha
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1.5 w-full">
      <input autoFocus type="number" inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') { setPeso(''); setAbierto(false) } }}
        placeholder="Peso seco (g)" className={inputCls} />
      <select value={val} onChange={e => setVal(Number(e.target.value))} className={inputCls} title="Valoración" style={{ width: 70 }}>
        <option value={0}>★</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={guardar} className="p-1.5 text-[#bef264] hover:text-[#d9f99d]" title="Guardar cosecha"><Scissors className="w-3.5 h-3.5" /></button>
      <button onClick={() => { setPeso(''); setAbierto(false) }} className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a]"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />
      <div className="relative w-full max-w-md rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalGenetica({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: () => void }) {
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', banco: '', tipo: 'Feminizada', thc: '', flora: '', notas: '' })

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      await cultivoService.crearGenetica({
        nombre: form.nombre.trim(),
        banco: form.banco.trim() || null,
        tipo: form.tipo as Genetica['tipo'],
        thc_estimado: form.thc ? parseFloat(form.thc) : null,
        tiempo_flora_dias: form.flora ? parseInt(form.flora) : null,
        notas: form.notas.trim() || null,
      })
      toast.success(`Genética "${form.nombre}" creada`)
      onCreada()
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nueva genética" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input autoFocus className={inputCls} placeholder="Gorilla Glue #4" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Banco</label>
            <input className={inputCls} placeholder="Dinafem" value={form.banco}
              onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Tipo</label>
            <select className={inputCls} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS_GENETICA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>THC estimado %</label>
            <input className={inputCls} type="number" step="0.1" placeholder="22" value={form.thc}
              onChange={e => setForm(f => ({ ...f, thc: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>{form.tipo === 'Automatica' ? 'Días totales' : 'Días de flora'}</label>
            <input className={inputCls} type="number" placeholder={form.tipo === 'Automatica' ? '75' : '63'} value={form.flora}
              onChange={e => setForm(f => ({ ...f, flora: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <textarea className={inputCls} rows={2} placeholder="Resistente a hongos, estira en flora..." value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        </div>
        <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Dna className="w-3.5 h-3.5" />}
          Crear genética
        </button>
      </div>
    </Modal>
  )
}

function ModalPlanta({ geneticas, pacientes, onCerrar, onCreada, onNuevaGenetica }: {
  geneticas: Genetica[]
  pacientes: Paciente[]
  onCerrar: () => void
  onCreada: () => void
  onNuevaGenetica: () => void
}) {
  const [guardando, setGuardando] = useState(false)
  const hoy = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    genetica_id: geneticas[0]?.id ?? '', paciente_id: '', apodo: '', fecha: hoy,
    fase: 'Germinacion', sustrato: '', maceta: '', ubicacion: '', cantidad: '1',
  })

  const guardar = async () => {
    const n = Math.max(1, Math.min(50, parseInt(form.cantidad) || 1))
    setGuardando(true)
    const nombreGen = geneticas.find(g => g.id === form.genetica_id)?.nombre ?? null
    try {
      for (let i = 0; i < n; i++) {
        await cultivoService.crearPlanta({
          codigo: generarCodigoPlanta(nombreGen),
          genetica_id: form.genetica_id || null,
          paciente_id: form.paciente_id || null,
          apodo: form.apodo.trim() ? (n > 1 ? `${form.apodo.trim()} #${i + 1}` : form.apodo.trim()) : null,
          fecha_germinacion: form.fecha || null,
          fase: form.fase as FasePlanta,
          sustrato: form.sustrato.trim() || null,
          maceta: form.maceta.trim() || null,
          ubicacion: form.ubicacion.trim() || null,
        })
      }
      toast.success(n > 1 ? `${n} plantas creadas` : 'Planta creada')
      onCreada()
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nueva planta" onCerrar={onCerrar}>
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Genética</label>
          <div className="flex gap-2">
            <select className={inputCls} value={form.genetica_id} onChange={e => setForm(f => ({ ...f, genetica_id: e.target.value }))}>
              <option value="">Sin genética</option>
              {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}{g.banco ? ` (${g.banco})` : ''}</option>)}
            </select>
            <button onClick={onNuevaGenetica} className={`${btnSutil} flex-shrink-0`} title="Crear genética nueva">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Apodo</label>
            <input className={inputCls} placeholder="La gorda" value={form.apodo}
              onChange={e => setForm(f => ({ ...f, apodo: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Cantidad</label>
            <input className={inputCls} type="number" min="1" max="50" value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha germinación</label>
            <input className={inputCls} type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Fase</label>
            <select className={inputCls} value={form.fase} onChange={e => setForm(f => ({ ...f, fase: e.target.value }))}>
              {FASES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sustrato</label>
            <select className={inputCls} value={form.sustrato}
              onChange={e => setForm(f => ({ ...f, sustrato: e.target.value }))}>
              <option value="">Sin definir</option>
              {SUSTRATOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Maceta</label>
            <input className={inputCls} placeholder="20L tela" value={form.maceta}
              onChange={e => setForm(f => ({ ...f, maceta: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Ubicación</label>
          <input className={inputCls} placeholder="Indoor carpa 120x120" value={form.ubicacion}
            onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls}>Paciente asignado</label>
          <select className={inputCls} value={form.paciente_id} onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}>
            <option value="">Sin asignar</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}{p.reprocann_nro ? ` (${p.reprocann_nro})` : ''}</option>)}
          </select>
          <p className="mt-1 text-[10px] text-[#5c5c6b]">Se genera un código QR único por planta para su historia clínica.</p>
        </div>
        <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flower2 className="w-3.5 h-3.5" />}
          Crear {parseInt(form.cantidad) > 1 ? `${form.cantidad} plantas` : 'planta'}
        </button>
      </div>
    </Modal>
  )
}
