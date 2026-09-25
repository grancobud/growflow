// PaginaCalendarioCultivo — vista mensual estilo iCloud. Agrega todos los eventos
// del cultivo (riegos, fertilizaciones, podas, cosechas, mantenimientos) +
// recordatorios propios con repeticion. Filtros por tipo (color).

import { useDialogo } from '../lib/useDialogo'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventInput, DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { CalendarDays, Plus, X, Loader2, Trash2, Pencil } from 'lucide-react'
import {
  calendarioService, COLOR_CAL, TIPOS_CAL, REPETICIONES, LABEL_CAL, ICONO_CAL,
  type EventoCal, type TipoCal, type Recordatorio, type Repeticion, iconoCal } from '../lib/calendario'
import { btnPrimario, btnSutil } from '../lib/ui'
import { hoyLocal } from '../lib/fechaLocal'
import { useAnchoDesde, SM } from '../lib/useAnchoDesde'

// text-[16px] en celular: iOS Safari hace zoom sobre cualquier campo con letra
// menor y deja el formulario descuadrado. En desktop vuelve al tamaño real.
const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#8a8a9c] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#8a8a9c] font-medium mb-1'

const hoyISO = () => hoyLocal()

/**
 * Como se dibuja cada evento adentro de una celda del calendario.
 *
 * Por defecto FullCalendar pone un puntito y el titulo, y con once tipos de
 * paleta pastel el puntito no distingue nada. Va el icono del tipo, que se lee
 * sin consultar la leyenda.
 *
 * El icono no se encoge (`shrink-0`) y el texto se corta con puntos suspensivos:
 * sin eso, un titulo largo empujaba el icono y las filas de una misma semana
 * quedaban con los iconos a distintas alturas.
 */
function renderEvento(arg: EventContentArg) {
  const ev = arg.event.extendedProps.ev as EventoCal | undefined
  const Ic = ev ? iconoCal(ev.tipo) : null
  return (
    <div className="flex items-center gap-1 w-full min-w-0 px-1 py-[2px] leading-none">
      {Ic && <Ic className="w-3 h-3 shrink-0" strokeWidth={2} />}
      <span className="truncate text-[10.5px]">{arg.event.title}</span>
    </div>
  )
}

/**
 * En el TELEFONO, solo el icono. Una celda mide ~48 px: el titulo se cortaba en
 * «C.» o «P.» y no decia nada. El icono del tipo se reconoce solo, y tocando el
 * dia se abre la lista con los titulos completos.
 */
function renderEventoIcono(arg: EventContentArg) {
  const ev = arg.event.extendedProps.ev as EventoCal | undefined
  const Ic = ev ? iconoCal(ev.tipo) : null
  return (
    <span className="flex items-center justify-center w-[18px] h-[18px]" title={arg.event.title}>
      {Ic && <Ic className="w-3 h-3" strokeWidth={2.2} />}
    </span>
  )
}

const CAL_CSS = `
/* Telefono: los eventos de un dia van en fila (iconos), no apilados. */
.gf-cal-angosto .fc-daygrid-day-events { display:flex; flex-wrap:wrap; gap:2px; padding:0 3px 3px; min-height:0 !important; }
.gf-cal-angosto .fc-daygrid-event-harness { margin-top:0 !important; }
.gf-cal-angosto .fc-daygrid-event { margin:0 !important; padding:0 !important; border-radius:5px; }
.gf-cal-angosto .fc-daygrid-day-bottom { flex-basis:100%; font-size:10px; }
.gf-cal { --fc-border-color:#191921; --fc-page-bg-color:#0a0a0f; --fc-neutral-bg-color:#0e0e14; --fc-today-bg-color:rgba(167,139,250,0.07); overflow-x:hidden; }
/* Forzar 7 columnas que ocupen 100% exacto (mata la columna fantasma / desborde a la derecha) */
.gf-cal .fc-scrollgrid { table-layout:fixed !important; }
.gf-cal .fc-scrollgrid, .gf-cal .fc-scrollgrid > table, .gf-cal .fc-col-header, .gf-cal .fc-daygrid-body, .gf-cal .fc-scrollgrid-sync-table { width:100% !important; }
.gf-cal .fc-daygrid-day-frame { overflow:hidden; }
.gf-cal .fc { color:#cfcfda; font-family:inherit; }
.gf-cal .fc .fc-toolbar.fc-header-toolbar { margin-bottom:12px; }
.gf-cal .fc .fc-toolbar-title { font-size:15px; font-weight:500; color:#ececf1; letter-spacing:0.2px; }
/* Solo la primera letra: capitalize entero daba «Septiembre De 2026». */
.gf-cal .fc .fc-toolbar-title::first-letter { text-transform:uppercase; }
.gf-cal .fc .fc-col-header-cell-cushion { color:#8a8a9c; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.7px; text-decoration:none; padding:6px 4px; }
.gf-cal .fc .fc-daygrid-day-number { color:#c4c4d0; font-size:11.5px; text-decoration:none; padding:5px 7px; }
.gf-cal .fc .fc-day-today .fc-daygrid-day-number { color:#c9b8e8; font-weight:600; }
/* Dias de otros meses: atenuados y diferenciados para que no se mezclen con el mes actual */
.gf-cal .fc .fc-day-other { background:#08080c; }
.gf-cal .fc .fc-day-other .fc-daygrid-day-number { color:#8a8a9c; }
.gf-cal .fc .fc-day-other .fc-daygrid-day-events { opacity:.4; }
.gf-cal .fc .fc-button { background:transparent; border:1px solid #26262f; color:#a6a6b5; font-size:12px; text-transform:none; box-shadow:none; padding:4px 10px; border-radius:8px; }
.gf-cal .fc .fc-button:hover { background:#15151d; border-color:#33333f; color:#ececf1; }
.gf-cal .fc .fc-button-primary:not(:disabled).fc-button-active, .gf-cal .fc .fc-button-primary:not(:disabled):active { background:#1c1c27; color:#d9f99d; border-color:#404d20; }
.gf-cal .fc .fc-button:focus { box-shadow:none; }
/* Los botones de FullCalendar vienen en 28-29px de alto. En celular quedan por
   debajo del minimo tactil de 44px que sigue el resto de la app, asi que se
   suben solo en mobile: en desktop 29px con el mouse esta bien. */
@media (max-width: 639px) {
  .gf-cal .fc .fc-button { min-height:44px; min-width:44px; display:inline-flex; align-items:center; justify-content:center; }
}
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
  const anchoPC = useAnchoDesde(SM)
  // El dia abierto en el telefono: la lista de sus eventos con el titulo entero.
  const [dia, setDia] = useState<string | null>(null)
  const refDia = useDialogo(() => setDia(null), !!dia)
  const [rango, setRango] = useState<{ desde: string; hasta: string }>({ desde: hoyISO(), hasta: hoyISO() })
  const [ocultos, setOcultos] = useState<Set<TipoCal>>(new Set())
  const [modal, setModal] = useState(false)
  const [editRec, setEditRec] = useState<Recordatorio | null>(null)
  const [fechaPre, setFechaPre] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<EventoCal | null>(null)
  const refDetalle = useDialogo(() => setDetalle(null), !!detalle)
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
    const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n
  })

  const onEventClick = (arg: EventClickArg) => {
    // En el telefono el icono mide 18 px: tocarlo abre el dia entero, que es
    // un blanco que se puede acertar con el dedo.
    if (!anchoPC) { setDia(arg.event.startStr.slice(0, 10)); return }
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

  const onDateClick = (arg: DateClickArg) => {
    const fecha = arg.dateStr.slice(0, 10)
    if (!anchoPC) { setDia(fecha); return }
    setEditRec(null); setFechaPre(fecha); setModal(true)
  }
  const eventosDelDia = dia ? eventos.filter(e => e.fecha === dia && !ocultos.has(e.tipo)) : []

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
          <span className="text-[10.5px] sm:text-[11px] text-[#8a8a9c]">{eventos.length} eventos este mes</span>
          <div className="flex-1" />
          <button onClick={() => { setEditRec(null); setFechaPre(hoyISO()); setModal(true) }} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Recordatorio</span>
          </button>
        </div>
        {/* Leyenda / filtros */}
        <div className="flex flex-wrap gap-1.5 px-3 sm:px-6 pb-2.5">
          {TIPOS_CAL.map(t => {
            const off = ocultos.has(t)
            const Ic = ICONO_CAL[t]
            return (
              <button key={t} onClick={() => toggleTipo(t)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-full text-[10.5px] leading-none border transition-colors ${off ? 'border-[#1f1f2b] bg-transparent text-[#8a8a9c]' : 'border-[#2a2a3a] bg-[#101016] text-[#a6a6b5] hover:text-[#ececf1]'}`}
                title={off ? `Mostrar ${LABEL_CAL[t]}` : `Ocultar ${LABEL_CAL[t]}`}
                aria-pressed={!off}>
                {/* El icono reemplaza al cuadradito de color: una tijera se
                    entiende sin mirar la leyenda, un punto lavanda no. El color
                    se conserva sobre el propio icono, como refuerzo. */}
                <Ic className="w-3.5 h-3.5 shrink-0" strokeWidth={1.9}
                  style={{ color: off ? '#4a4a5a' : COLOR_CAL[t] }} />
                <span>{LABEL_CAL[t]}</span>
                {conteo(t) > 0 && <span className="text-[#8a8a9c] tabular-nums">({conteo(t)})</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`px-3 sm:px-6 py-4 pb-24 gf-cal relative ${anchoPC ? '' : 'gf-cal-angosto'}`}>
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
          dayMaxEvents={anchoPC ? 3 : 6}
          fixedWeekCount={false}
          eventContent={anchoPC ? renderEvento : renderEventoIcono}
        />
        <p className="mt-3 text-[10.5px] text-[#8a8a9c]">{anchoPC ? 'Tocá un día para agregar un recordatorio.' : 'Tocá un día para ver sus eventos o agregar un recordatorio.'} Los riegos, podas, cosechas y mantenimientos aparecen solos desde lo que cargás en la app.</p>
      </div>

      {modal && <ModalRecordatorio rec={editRec} fechaPre={fechaPre} onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); recargar() }} />}

      {dia && (
        <div ref={refDia} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={() => setDia(null)}>
          <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full rounded-t-2xl max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <h2 className="font-display font-semibold text-[14px] text-[#ececf1] flex-1 first-letter:uppercase">
                {new Date(dia + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => setDia(null)} aria-label="Cerrar" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8a8a9c] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              {eventosDelDia.length === 0
                ? <p className="px-4 py-6 text-center text-[12px] text-[#8a8a9c]">No hay nada cargado este día.</p>
                : <ul className="divide-y divide-[#1f1f2b]">
                    {eventosDelDia.map(e => {
                      const Ic = iconoCal(e.tipo)
                      return (
                        <li key={e.id}>
                          <button onClick={() => { setDia(null); setDetalle(e) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[52px] text-left hover:bg-[#15151d] transition-colors">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                              style={{ background: e.color + '1a', borderColor: e.color + '40' }}>
                              <Ic className="w-4 h-4" style={{ color: e.color }} strokeWidth={2} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-[#ececf1] truncate">{e.titulo}</span>
                              <span className="block text-[11px] text-[#8a8a9c]">{LABEL_CAL[e.tipo] ?? e.tipo}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>}
            </div>
            <div className="px-4 py-3 border-t border-[#1f1f2b] pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2">
              <button onClick={() => setDia(null)} className={`${btnSutil} min-h-[44px] px-4`}>Cerrar</button>
              <button onClick={() => { const f = dia; setDia(null); setEditRec(null); setFechaPre(f); setModal(true) }}
                className={`${btnPrimario} flex-1 justify-center min-h-[44px]`}>
                <Plus className="w-4 h-4" /> Agregar recordatorio
              </button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div ref={refDetalle} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={() => setDetalle(null)}>
          <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2.5">
              {(() => { const Ic = iconoCal(detalle.tipo); return (
                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{ background: detalle.color + '1a', borderColor: detalle.color + '40' }}>
                  <Ic className="w-3.5 h-3.5" style={{ color: detalle.color }} strokeWidth={2} />
                </span>
              ) })()}
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[14px] text-[#ececf1] truncate">{detalle.titulo}</div>
                <div className="text-[11px] text-[#8a8a9c] capitalize">{detalle.tipo} · {new Date(detalle.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
              </div>
              <button onClick={() => setDetalle(null)} aria-label="Cerrar" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[#8a8a9c] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {detalle.detalle && <p className="text-[12.5px] text-[#d4d4dd] leading-relaxed">{detalle.detalle}</p>}
              <p className="text-[10.5px] text-[#8a8a9c]">Origen: {({ evento: 'Evento de planta', riego: 'Riego / escorrentía', aplicacion: 'Aplicación', cosecha: 'Cosecha', mantenimiento: 'Mantenimiento (Stock)', recordatorio: 'Recordatorio propio', planta: 'Ficha de planta (germinación / cosecha)' })[detalle.fuente]}</p>
            </div>
            <div className="px-4 py-3 border-t border-[#1f1f2b] flex justify-between gap-2">
              {detalle.fuente === 'planta'
                ? <span className="text-[10.5px] text-[#8a8a9c] self-center">Se edita desde la ficha de la planta</span>
                : <button onClick={borrarDetalle} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#5a2a26] bg-[#ff8a7a]/10 hover:bg-[#ff8a7a]/20 transition-colors text-[11px] text-[#ff8a7a]"><Trash2 className="w-3.5 h-3.5" /> Borrar</button>}
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
  const refDialogo = useDialogo(onCerrar)
  const [f, setF] = useState<Partial<Recordatorio>>(rec ?? { tipo: 'Recordatorio', fecha: fechaPre ?? hoyISO(), repeticion: 'ninguna' })
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof Recordatorio>(k: K, v: Recordatorio[K]) => setF(prev => ({ ...prev, [k]: v }))

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
    <div ref={refDialogo} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1]">{rec ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[#8a8a9c] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className={labelCls}>Título *</label><input className={inputCls} value={f.titulo ?? ''} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Regar carpa, Cambiar solución, Revisar pH" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo (color)</label>
              <select className={inputCls} value={f.tipo} onChange={e => set('tipo', e.target.value as TipoCal)}>
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
