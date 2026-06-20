// PaginaCalendarioCultivo — vista mensual estilo iCloud. Agrega todos los eventos
// del cultivo (riegos, fertilizaciones, podas, cosechas, mantenimientos) +
// recordatorios propios con repeticion. Filtros por tipo (color).

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventInput, DatesSetArg, EventClickArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { CalendarDays, Plus, X, Loader2, Trash2, Pencil } from 'lucide-react'
import {
  calendarioService, COLOR_CAL, TIPOS_CAL, REPETICIONES,
  type EventoCal, type TipoCal, type Recordatorio, type Repeticion,
} from '../lib/calendario'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const CAL_CSS = `
.gf-cal { --fc-border-color:#191921; --fc-page-bg-color:#0a0a0f; --fc-neutral-bg-color:#0e0e14; --fc-today-bg-color:rgba(167,139,250,0.07); overflow-x:hidden; }
/* Forzar 7 columnas que ocupen 100% exacto (mata la columna fantasma / desborde a la derecha) */
.gf-cal .fc-scrollgrid { table-layout:fixed !important; }
.gf-cal .fc-scrollgrid, .gf-cal .fc-scrollgrid > table, .gf-cal .fc-col-header, .gf-cal .fc-daygrid-body, .gf-cal .fc-scrollgrid-sync-table { width:100% !important; }
.gf-cal .fc-daygrid-day-frame { overflow:hidden; }
.gf-cal .fc { color:#cfcfda; font-family:inherit; }
.gf-cal .fc .fc-toolbar.fc-header-toolbar { margin-bottom:12px; }
.gf-cal .fc .fc-toolbar-title { font-size:15px; font-weight:500; color:#ececf1; text-transform:capitalize; letter-spacing:0.2px; }
.gf-cal .fc .fc-col-header-cell-cushion { color:#6b6b7a; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.7px; text-decoration:none; padding:6px 4px; }
.gf-cal .fc .fc-daygrid-day-number { color:#c4c4d0; font-size:11.5px; text-decoration:none; padding:5px 7px; }
.gf-cal .fc .fc-day-today .fc-daygrid-day-number { color:#c9b8e8; font-weight:600; }
/* Dias de otros meses: atenuados y diferenciados para que no se mezclen con el mes actual */
.gf-cal .fc .fc-day-other { background:#08080c; }
.gf-cal .fc .fc-day-other .fc-daygrid-day-number { color:#3a3a46; }
.gf-cal .fc .fc-day-other .fc-daygrid-day-events { opacity:.4; }
.gf-cal .fc .fc-button { background:transparent; border:1px solid #26262f; color:#a6a6b5; font-size:12px; text-transform:none; box-shadow:none; padding:4px 10px; border-radius:8px; }
.gf-cal .fc .fc-button:hover { background:#15151d; border-color:#33333f; color:#ececf1; }
.gf-cal .fc .fc-button-primary:not(:disabled).fc-button-active, .gf-cal .fc .fc-button-primary:not(:disabled):active { background:#1c1c27; color:#d9f99d; border-color:#404d20; }
.gf-cal .fc .fc-button:focus { box-shadow:none; }
.gf-cal .fc .fc-button:disabled { opacity:.4; }
.gf-cal .fc-theme-standard td, .gf-cal .fc-theme-standard th { border-color:#191921; }
.gf-cal .fc-daygrid-event { border:none; border-radius:6px; padding:2px 7px; margin:1px 3px; font-size:11px; font-weight:500; letter-spacing:0.1px; cursor:pointer; transition:filter .12s ease; }
.gf-cal .fc-daygrid-event:hover { filter:brightness(1.35); }
.gf-cal .fc .fc-daygrid-day-frame { min-height:66px; }
.gf-cal .fc .fc-more-link { color:#7a7a88; font-size:10.5px; font-weight:500; }
.gf-cal .fc .fc-daygrid-day.fc-day-today { background:rgba(167,139,250,0.06); }
`

export default function PaginaCalendarioCultivo() {
  const [eventos, setEventos] = useState<EventoCal[]>([])
  const [cargando, setCargando] = useState(true)
  const [rango, setRango] = useState<{ desde: string; hasta: string }>({ desde: hoyISO(), hasta: hoyISO() })
  const [ocultos, setOcultos] = useState<Set<TipoCal>>(new Set())
  const [modal, setModal] = useState(false)
  const [editRec, setEditRec] = useState<Recordatorio | null>(null)
  const [fechaPre, setFechaPre] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<EventoCal | null>(null)
  const recsRef = useRef<Recordatorio[]>([])

  const cargar = useCallback(async (desde: string, hasta: string) => {
    setCargando(true)
    try {
      const [evs, recs] = await Promise.all([
        calendarioService.cargarEventos(desde, hasta),
        calendarioService.getRecordatorios(),
      ])
      recsRef.current = recs
      setEventos(evs)
    } catch (err) { toast.error(`Error cargando calendario: ${(err as Error).message}`) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { if (rango.desde !== rango.hasta) cargar(rango.desde, rango.hasta) }, [rango, cargar])

  const onDatesSet = (arg: DatesSetArg) => {
    const desde = arg.startStr.slice(0, 10)
    const hasta = arg.endStr.slice(0, 10)
    setRango(prev => (prev.desde === desde && prev.hasta === hasta ? prev : { desde, hasta }))
  }

  const eventosFC: EventInput[] = useMemo(() => eventos
    .filter(e => !ocultos.has(e.tipo))
    .map(e => ({
      id: e.id, title: e.titulo, start: e.fecha, allDay: true,
      backgroundColor: e.color + '22', borderColor: e.color + '40', textColor: e.color,
      extendedProps: { ev: e },
    })), [eventos, ocultos])

  const toggleTipo = (t: TipoCal) => setOcultos(prev => {
    const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n
  })

  const onEventClick = (arg: EventClickArg) => {
    setDetalle(arg.event.extendedProps.ev as EventoCal)
  }

  const borrarDetalle = async () => {
    if (!detalle) return
    if (!window.confirm(`¿Borrar "${detalle.titulo}" del ${detalle.fecha}?${detalle.fuente === 'recordatorio' ? ' (se borra el recordatorio y todas sus repeticiones)' : ''}`)) return
    try {
      await calendarioService.eliminarEvento(detalle.fuente, detalle.id)
      toast.success('Borrado')
      setDetalle(null); recargar()
    } catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  const editarDetalle = () => {
    if (!detalle || detalle.fuente !== 'recordatorio') return
    const id = detalle.id.split(':')[1]
    const rec = recsRef.current.find(r => r.id === id)
    if (rec) { setDetalle(null); setEditRec(rec); setFechaPre(null); setModal(true) }
  }

  const onDateClick = (arg: DateClickArg) => { setEditRec(null); setFechaPre(arg.dateStr.slice(0, 10)); setModal(true) }

  const recargar = () => cargar(rango.desde, rango.hasta)
  const conteo = (t: TipoCal) => eventos.filter(e => e.tipo === t).length

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <style>{CAL_CSS}</style>
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 px-3 sm:px-6 py-3">
          <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#bef264]" /> Calendario
          </h1>
          <span className="text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{eventos.length} eventos este mes</span>
          <div className="flex-1" />
          <button onClick={() => { setEditRec(null); setFechaPre(hoyISO()); setModal(true) }} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Recordatorio</span>
          </button>
        </div>
        {/* Leyenda / filtros */}
        <div className="flex flex-wrap gap-1.5 px-3 sm:px-6 pb-2.5">
          {TIPOS_CAL.map(t => {
            const off = ocultos.has(t)
            return (
              <button key={t} onClick={() => toggleTipo(t)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] border transition-colors ${off ? 'border-[#1f1f2b] bg-transparent text-[#5c5c6b]' : 'border-[#2a2a3a] bg-[#101016] text-[#a6a6b5] hover:text-[#ececf1]'}`}
                title={off ? 'Mostrar' : 'Ocultar'}>
                <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: off ? '#2a2a3a' : COLOR_CAL[t] }} />
                {t} {conteo(t) > 0 && <span className="text-[#5c5c6b]">({conteo(t)})</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-24 gf-cal relative">
        {cargando && <div className="absolute right-8 top-6 z-10"><Loader2 className="w-4 h-4 animate-spin text-[#bef264]" /></div>}
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          firstDay={1}
          height="auto"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          events={eventosFC}
          datesSet={onDatesSet}
          eventClick={onEventClick}
          dateClick={onDateClick}
          dayMaxEvents={3}
          fixedWeekCount={false}
        />
        <p className="mt-3 text-[10.5px] text-[#5c5c6b]">Tocá un día para agregar un recordatorio. Los riegos, podas, cosechas y mantenimientos aparecen solos desde lo que cargás en la app.</p>
      </div>

      {modal && <ModalRecordatorio rec={editRec} fechaPre={fechaPre} onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); recargar() }} />}

      {detalle && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetalle(null)}>
          <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-[4px] flex-shrink-0" style={{ background: detalle.color }} />
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[14px] text-[#ececf1] truncate">{detalle.titulo}</div>
                <div className="text-[11px] text-[#5c5c6b] capitalize">{detalle.tipo} · {new Date(detalle.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
              </div>
              <button onClick={() => setDetalle(null)} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {detalle.detalle && <p className="text-[12.5px] text-[#d4d4dd] leading-relaxed">{detalle.detalle}</p>}
              <p className="text-[10.5px] text-[#5c5c6b]">Origen: {({ evento: 'Evento de planta', riego: 'Riego / escorrentía', aplicacion: 'Aplicación', cosecha: 'Cosecha', mantenimiento: 'Mantenimiento (Stock)', recordatorio: 'Recordatorio propio' })[detalle.fuente]}</p>
            </div>
            <div className="px-4 py-3 border-t border-[#1f1f2b] flex justify-between gap-2">
              <button onClick={borrarDetalle} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#5a2a26] bg-[#ff8a7a]/10 hover:bg-[#ff8a7a]/20 transition-colors text-[11px] text-[#ff8a7a]"><Trash2 className="w-3.5 h-3.5" /> Borrar</button>
              {detalle.fuente === 'recordatorio'
                ? <button onClick={editarDetalle} className={btnPrimario}><Pencil className="w-3.5 h-3.5" /> Editar</button>
                : <button onClick={() => setDetalle(null)} className={btnSutil}>Cerrar</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalRecordatorio({ rec, fechaPre, onCerrar, onGuardado }: { rec: Recordatorio | null; fechaPre: string | null; onCerrar: () => void; onGuardado: () => void }) {
  const [f, setF] = useState<Partial<Recordatorio>>(rec ?? { tipo: 'Recordatorio', fecha: fechaPre ?? hoyISO(), repeticion: 'ninguna' })
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Recordatorio, v: any) => setF(prev => ({ ...prev, [k]: v }))

  const guardar = async () => {
    if (!f.titulo?.trim()) { toast.error('Poné un título'); return }
    setGuardando(true)
    try {
      const payload: Partial<Recordatorio> = {
        titulo: f.titulo, tipo: f.tipo, fecha: f.fecha || hoyISO(), hora: f.hora || null,
        repeticion: f.repeticion || 'ninguna',
        intervalo: f.repeticion === 'cada_n_dias' ? Number(f.intervalo) || 1 : null,
        hasta: f.hasta || null, notas: f.notas || null,
      }
      if (rec) await calendarioService.actualizarRecordatorio(rec.id, payload)
      else await calendarioService.crearRecordatorio(payload)
      toast.success(rec ? 'Recordatorio actualizado' : 'Recordatorio creado'); onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  const borrar = async () => {
    if (!rec || !window.confirm('¿Borrar este recordatorio (y todas sus repeticiones)?')) return
    try { await calendarioService.eliminarRecordatorio(rec.id); toast.success('Recordatorio borrado'); onGuardado() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1]">{rec ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className={labelCls}>Título *</label><input className={inputCls} value={f.titulo ?? ''} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Regar carpa, Cambiar solución, Revisar pH" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo (color)</label>
              <select className={inputCls} value={f.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS_CAL.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Fecha</label><input type="date" className={inputCls} value={f.fecha ?? hoyISO()} onChange={e => set('fecha', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Repetición</label>
              <select className={inputCls} value={f.repeticion} onChange={e => set('repeticion', e.target.value as Repeticion)}>
                {REPETICIONES.map(r => <option key={r.valor} value={r.valor}>{r.label}</option>)}
              </select>
            </div>
            {f.repeticion === 'cada_n_dias' ? (
              <div><label className={labelCls}>Cada cuántos días</label><input type="number" min={1} className={inputCls} value={f.intervalo ?? ''} onChange={e => set('intervalo', e.target.value === '' ? null : Number(e.target.value))} placeholder="Ej: 2" /></div>
            ) : <div><label className={labelCls}>Hora (opcional)</label><input type="time" className={inputCls} value={f.hora ?? ''} onChange={e => set('hora', e.target.value || null)} /></div>}
          </div>
          {f.repeticion !== 'ninguna' && (
            <div><label className={labelCls}>Repetir hasta (opcional)</label><input type="date" className={inputCls} value={f.hasta ?? ''} onChange={e => set('hasta', e.target.value || null)} /></div>
          )}
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls + ' resize-none'} value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} /></div>
        </div>
        <div className="sticky bottom-0 bg-[#0d0d12] border-t border-[#1f1f2b] px-4 py-3 flex justify-between gap-2">
          <div>{rec && <button onClick={borrar} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#5a2a26] bg-[#ff8a7a]/10 hover:bg-[#ff8a7a]/20 transition-colors text-[11px] text-[#ff8a7a]"><Trash2 className="w-3.5 h-3.5" /> Borrar</button>}</div>
          <div className="flex gap-2">
            <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} className={btnPrimario}>{guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{rec ? 'Guardar' : 'Crear'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
