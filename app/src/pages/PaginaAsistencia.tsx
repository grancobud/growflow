// PaginaAsistencia — asistencia diaria de los growers + bitácora de actividades.
// Lista de jornadas, detalle con panel de asistencia y timeline de actividades,
// y administración del roster de cultivadores.

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ClipboardCheck, Plus, X, Loader2, Trash2, Users, CalendarDays,
  CheckCircle2, Circle, ListChecks, UserCog,
} from 'lucide-react'
import {
  asistenciaService, ROLES_GROWER, TIPOS_ACTIVIDAD,
  type Cultivador, type Jornada, type Asistencia, type Actividad, type TipoActividad,
} from '../lib/asistencia'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

const COLOR_ACTIVIDAD: Record<string, string> = {
  Riego: '#38bdf8', Fumigacion: '#f59e0b', Poda: '#c4b5fd', Trasplante: '#bef264',
  Cosecha: '#a78bfa', Mantenimiento: '#8f8f9f', Limpieza: '#38bdf8', Reunion: '#f59e0b', Otro: '#5c5c6b',
}
const fmtFechaLarga = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const fmtFechaCorta = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export default function PaginaAsistencia() {
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [growers, setGrowers] = useState<Cultivador[]>([])
  const [cargando, setCargando] = useState(true)
  const [jornadaSel, setJornadaSel] = useState<Jornada | null>(null)
  const [modalRoster, setModalRoster] = useState(false)
  const [contadores, setContadores] = useState<Record<string, { presentes: number; actividades: number }>>({})

  const cargar = useCallback(async () => {
    try {
      const [js, gs] = await Promise.all([asistenciaService.getJornadas(), asistenciaService.getCultivadores()])
      setJornadas(js)
      setGrowers(gs)
      // contadores por jornada
      const conts: Record<string, { presentes: number; actividades: number }> = {}
      await Promise.all(js.map(async j => {
        const [asis, acts] = await Promise.all([asistenciaService.getAsistencias(j.id), asistenciaService.getActividades(j.id)])
        conts[j.id] = { presentes: asis.filter(a => a.presente).length, actividades: acts.length }
      }))
      setContadores(conts)
    } catch (err) {
      toast.error(`Error cargando asistencia: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirHoy = async () => {
    try {
      const j = await asistenciaService.getJornadaHoy()
      await cargar()
      setJornadaSel(j)
    } catch (err) {
      toast.error(`No se pudo abrir la jornada: ${(err as Error).message}`)
    }
  }

  const borrarJornada = async (j: Jornada) => {
    if (!window.confirm(`¿Borrar la jornada del ${fmtFechaCorta(j.fecha)} con su asistencia y bitácora?`)) return
    try { await asistenciaService.eliminarJornada(j.id); toast.success('Jornada borrada'); cargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Asistencia</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{jornadas.length} jornada{jornadas.length === 1 ? '' : 's'} · {growers.length} growers</div>
          </div>
          <div className="flex-1" />
          <button onClick={() => setModalRoster(true)} className={btnSutil}><UserCog className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Growers</span></button>
          <button onClick={abrirHoy} className={btnPrimario}><CalendarDays className="w-3.5 h-3.5" /> Jornada de hoy</button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-20">
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[96px] animate-pulse" />)}
          </div>
        ) : jornadas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><ClipboardCheck className="w-5 h-5 text-[#5c5c6b]" /></div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin jornadas registradas</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Tocá "Jornada de hoy" para arrancar la bitácora del día.</div>
            {growers.length === 0 && <button onClick={() => setModalRoster(true)} className={`${btnSutil} mt-3`}><Users className="w-3.5 h-3.5" /> Cargar growers primero</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {jornadas.map(j => {
              const c = contadores[j.id] ?? { presentes: 0, actividades: 0 }
              return (
                <div key={j.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <button onClick={() => setJornadaSel(j)} className="min-w-0 flex-1 text-left">
                        <div className="font-display font-semibold text-[13.5px] text-[#ececf1] capitalize hover:text-[#bef264] transition-colors">{fmtFechaLarga(j.fecha)}</div>
                        {j.responsable && <p className="text-[11px] text-[#757584] truncate mt-0.5">Resp.: {j.responsable}</p>}
                      </button>
                      <button onClick={() => borrarJornada(j)} className="p-1 text-[#46464f] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded transition-colors flex-shrink-0" title="Borrar jornada"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-[#8f8f9f]">
                      <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#bef264]" />{c.presentes} presente{c.presentes === 1 ? '' : 's'}</span>
                      <span className="inline-flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-[#c4b5fd]" />{c.actividades} actividad{c.actividades === 1 ? '' : 'es'}</span>
                    </div>
                    {j.resumen && <p className="mt-2 text-[11px] text-[#a6a6b5] line-clamp-2">{j.resumen}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {jornadaSel && (
        <DetalleJornada jornada={jornadaSel} growers={growers.filter(g => g.activo)}
          onCerrar={() => setJornadaSel(null)} onCambio={cargar} />
      )}
      {modalRoster && (
        <ModalRoster growers={growers} onCerrar={() => setModalRoster(false)} onCambio={cargar} />
      )}
    </div>
  )
}

function ModalContenedor({ titulo, ancho = 'max-w-2xl', onCerrar, children }: { titulo: string; ancho?: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} max-h-[90vh] overflow-y-auto rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl`}>
        <div className="sticky top-0 bg-[#101016] flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b] z-10">
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1] capitalize">{titulo}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function DetalleJornada({ jornada, growers, onCerrar, onCambio }: {
  jornada: Jornada; growers: Cultivador[]; onCerrar: () => void; onCambio: () => void
}) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [cargando, setCargando] = useState(true)
  const [resp, setResp] = useState(jornada.responsable ?? '')
  const [clima, setClima] = useState(jornada.clima ?? '')
  const [resumen, setResumen] = useState(jornada.resumen ?? '')

  const cargar = useCallback(async () => {
    try {
      const [asis, acts] = await Promise.all([
        asistenciaService.getAsistencias(jornada.id),
        asistenciaService.getActividades(jornada.id),
      ])
      setAsistencias(asis)
      setActividades(acts)
    } finally { setCargando(false) }
  }, [jornada.id])

  useEffect(() => { cargar() }, [cargar])

  const asisDe = (cultivadorId: string) => asistencias.find(a => a.cultivador_id === cultivadorId)

  const togglePresente = async (g: Cultivador) => {
    const previa = asisDe(g.id)
    const ahoraPresente = !(previa?.presente ?? false)
    const horaActual = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    try {
      await asistenciaService.setAsistencia(jornada.id, g.id, {
        presente: ahoraPresente,
        hora_entrada: ahoraPresente ? (previa?.hora_entrada ?? horaActual) : previa?.hora_entrada ?? null,
      })
      await cargar(); onCambio()
    } catch (err) { toast.error(`No se pudo marcar: ${(err as Error).message}`) }
  }

  const setHora = async (g: Cultivador, campo: 'hora_entrada' | 'hora_salida', valor: string) => {
    try { await asistenciaService.setAsistencia(jornada.id, g.id, { [campo]: valor || null }); await cargar() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const guardarCabecera = async () => {
    try {
      await asistenciaService.actualizarJornada(jornada.id, {
        responsable: resp.trim() || null, clima: clima.trim() || null, resumen: resumen.trim() || null,
      })
      toast.success('Jornada guardada'); onCambio()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const agregarActividad = async (a: { hora: string; tipo: TipoActividad; descripcion: string; cultivador_id: string }) => {
    try {
      await asistenciaService.crearActividad({
        jornada_id: jornada.id, hora: a.hora || null, tipo: a.tipo,
        descripcion: a.descripcion.trim() || null, cultivador_id: a.cultivador_id || null,
      })
      toast.success('Actividad registrada'); await cargar(); onCambio()
    } catch (err) { toast.error(`No se pudo registrar: ${(err as Error).message}`) }
  }

  const borrarActividad = async (id: string) => {
    try { await asistenciaService.eliminarActividad(id); await cargar(); onCambio() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const nombreGrower = (id: string | null) => id ? (growers.find(g => g.id === id)?.nombre ?? '—') : null
  const presentes = asistencias.filter(a => a.presente).length

  return (
    <ModalContenedor titulo={fmtFechaLarga(jornada.fecha)} onCerrar={onCerrar}>
      {/* Cabecera editable */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className={labelCls}>Responsable del día</label><input className={inputCls} value={resp} onChange={e => setResp(e.target.value)} onBlur={guardarCabecera} placeholder="Nombre" /></div>
        <div><label className={labelCls}>Clima</label><input className={inputCls} value={clima} onChange={e => setClima(e.target.value)} onBlur={guardarCabecera} placeholder="Soleado 24°C" /></div>
        <div className="col-span-2"><label className={labelCls}>Resumen del día</label><textarea className={inputCls} rows={2} value={resumen} onChange={e => setResumen(e.target.value)} onBlur={guardarCabecera} placeholder="Qué se hizo en general..." /></div>
      </div>

      {cargando ? (
        <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-[#bef264] animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* Asistencia */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#bef264]" />
              <h3 className="font-display font-semibold text-[12.5px] text-[#ececf1]">Asistencia</h3>
              <span className="text-[11px] text-[#5c5c6b]">{presentes}/{growers.length} presentes</span>
            </div>
            {growers.length === 0 ? (
              <p className="text-[11.5px] text-[#5c5c6b] py-2">No hay growers activos. Cargá el roster desde "Growers".</p>
            ) : (
              <ul className="space-y-1.5">
                {growers.map(g => {
                  const a = asisDe(g.id)
                  const presente = a?.presente ?? false
                  return (
                    <li key={g.id} className="flex items-center gap-2 rounded-lg border border-[#1f1f2b] bg-[#0d0d13] px-3 py-2">
                      <button onClick={() => togglePresente(g)} className="flex-shrink-0" title={presente ? 'Marcar ausente' : 'Marcar presente'}>
                        {presente ? <CheckCircle2 className="w-5 h-5 text-[#bef264]" /> : <Circle className="w-5 h-5 text-[#46464f]" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-[#ececf1] truncate">{g.nombre}</div>
                        <div className="text-[10px] text-[#5c5c6b]">{g.rol}</div>
                      </div>
                      {presente && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input type="time" value={a?.hora_entrada ?? ''} onChange={e => setHora(g, 'hora_entrada', e.target.value)} className="px-1.5 py-1 rounded bg-[#15151d] border border-[#2a2a3a] text-[11px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60" title="Entrada" />
                          <span className="text-[#46464f]">→</span>
                          <input type="time" value={a?.hora_salida ?? ''} onChange={e => setHora(g, 'hora_salida', e.target.value)} className="px-1.5 py-1 rounded bg-[#15151d] border border-[#2a2a3a] text-[11px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60" title="Salida" />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Bitacora */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-4 h-4 text-[#c4b5fd]" />
              <h3 className="font-display font-semibold text-[12.5px] text-[#ececf1]">Bitácora de actividades</h3>
            </div>
            <FormActividad growers={growers} onAgregar={agregarActividad} />
            {actividades.length === 0 ? (
              <p className="text-[11.5px] text-[#5c5c6b] py-3 text-center">Sin actividades cargadas todavía.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {actividades.map(act => (
                  <li key={act.id} className="group flex items-start gap-2.5 rounded-lg border border-[#1f1f2b] bg-[#0d0d13] px-3 py-2">
                    <span className="text-[11px] text-[#5c5c6b] tabular-nums font-mono mt-0.5 w-10 flex-shrink-0">{act.hora ?? '--:--'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0" style={{ color: COLOR_ACTIVIDAD[act.tipo], background: `${COLOR_ACTIVIDAD[act.tipo]}1a` }}>{act.tipo}</span>
                    <div className="min-w-0 flex-1">
                      {act.descripcion && <span className="text-[12px] text-[#d4d4dd]">{act.descripcion}</span>}
                      {act.cultivador_id && <span className="text-[10.5px] text-[#5c5c6b] ml-1.5">· {nombreGrower(act.cultivador_id)}</span>}
                    </div>
                    <button onClick={() => borrarActividad(act.id)} className="p-0.5 text-[#46464f] opacity-0 group-hover:opacity-100 hover:text-[#ff8a7a] rounded transition-all flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </ModalContenedor>
  )
}

function FormActividad({ growers, onAgregar }: {
  growers: Cultivador[]; onAgregar: (a: { hora: string; tipo: TipoActividad; descripcion: string; cultivador_id: string }) => void
}) {
  const horaAhora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const [hora, setHora] = useState(horaAhora)
  const [tipo, setTipo] = useState<TipoActividad>('Riego')
  const [desc, setDesc] = useState('')
  const [grower, setGrower] = useState('')

  const enviar = () => {
    if (!desc.trim()) { toast.error('Escribí qué se hizo'); return }
    onAgregar({ hora, tipo, descripcion: desc, cultivador_id: grower })
    setDesc('')
  }

  return (
    <div className="rounded-lg border border-[#2a2a3a] bg-[#0d0d13] p-3 space-y-2">
      <div className="flex gap-2">
        <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="px-2 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11.5px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60 w-[90px]" />
        <select value={tipo} onChange={e => setTipo(e.target.value as TipoActividad)} className={inputCls}>{TIPOS_ACTIVIDAD.map(t => <option key={t} value={t}>{t}</option>)}</select>
        <select value={grower} onChange={e => setGrower(e.target.value)} className={inputCls}>
          <option value="">¿Quién?</option>
          {growers.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <input value={desc} onChange={e => setDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar() }} placeholder="Descripción de la actividad..." className={inputCls} />
        <button onClick={enviar} className={`${btnPrimario} flex-shrink-0`}><Plus className="w-3.5 h-3.5" /> Agregar</button>
      </div>
    </div>
  )
}

function ModalRoster({ growers, onCerrar, onCambio }: { growers: Cultivador[]; onCerrar: () => void; onCambio: () => void }) {
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('Cultivador')
  const [tel, setTel] = useState('')
  const [guardando, setGuardando] = useState(false)

  const agregar = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      await asistenciaService.crearCultivador({ nombre: nombre.trim(), rol: rol as Cultivador['rol'], telefono: tel.trim() || null })
      toast.success('Grower agregado'); setNombre(''); setTel(''); onCambio()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  const toggleActivo = async (g: Cultivador) => {
    try { await asistenciaService.actualizarCultivador(g.id, { activo: !g.activo }); onCambio() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const borrar = async (g: Cultivador) => {
    if (!window.confirm(`¿Borrar a "${g.nombre}" del roster?`)) return
    try { await asistenciaService.eliminarCultivador(g.id); toast.success('Grower borrado'); onCambio() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  return (
    <ModalContenedor titulo="Roster de growers" ancho="max-w-lg" onCerrar={onCerrar}>
      <div className="rounded-lg border border-[#2a2a3a] bg-[#0d0d13] p-3 space-y-2 mb-4">
        <div className="flex gap-2">
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del grower" className={inputCls} />
          <select value={rol} onChange={e => setRol(e.target.value)} className={inputCls}>{ROLES_GROWER.map(r => <option key={r} value={r}>{r}</option>)}</select>
        </div>
        <div className="flex gap-2">
          <input value={tel} onChange={e => setTel(e.target.value)} placeholder="Teléfono (opcional)" className={inputCls} />
          <button onClick={agregar} disabled={guardando} className={`${btnPrimario} flex-shrink-0`}>{guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Agregar</button>
        </div>
      </div>

      {growers.length === 0 ? (
        <p className="text-[11.5px] text-[#5c5c6b] py-3 text-center">Todavía no hay growers. Agregá el primero arriba.</p>
      ) : (
        <ul className="space-y-1.5">
          {growers.map(g => (
            <li key={g.id} className="flex items-center gap-2 rounded-lg border border-[#1f1f2b] bg-[#0d0d13] px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-[#ececf1] truncate">{g.nombre}</div>
                <div className="text-[10px] text-[#5c5c6b]">{g.rol}{g.telefono ? ` · ${g.telefono}` : ''}</div>
              </div>
              <button onClick={() => toggleActivo(g)} className={`px-2 py-1 rounded text-[10px] font-medium ${g.activo ? 'text-[#bef264] bg-[#a3e635]/10' : 'text-[#5c5c6b] bg-[#15151d]'}`} title="Activar/desactivar">
                {g.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => borrar(g)} className="p-1 text-[#46464f] hover:text-[#ff8a7a] rounded transition-colors" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </ModalContenedor>
  )
}
