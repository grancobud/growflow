// PaginaStockInsumos — Stock & Insumos del cultivo.
// Dos vistas: Inventario (equipos, fertilizantes, herramientas, CO2... con
// cantidad, specs y alerta de reposicion) y Mantenimiento (limpiezas, recargas,
// con fecha del ultimo y aviso del proximo).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Boxes, Plus, X, Search, Loader2, Trash2, Pencil, Wrench, CheckCircle2,
  FlaskConical, Lightbulb, Thermometer, Droplets, Wind, Sprout, Bug, Gauge, Package,
  AlertTriangle, CalendarClock,
} from 'lucide-react'
import {
  stockService, CATEGORIAS_INSUMO, TIPOS_MANTENIMIENTO, UNIDADES,
  proximoEfectivo, diasParaProximo,
  type Insumo, type Mantenimiento, type CategoriaInsumo,
} from '../lib/stock'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

type Estilo = { text: string; bg: string; border: string; icono: any }
const CAT: Record<CategoriaInsumo, Estilo> = {
  Fertilizante:  { text: '#bef264', bg: 'rgba(163,230,53,0.12)', border: '#404d20', icono: FlaskConical },
  Iluminacion:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: '#5a4a20', icono: Lightbulb },
  Climatizacion: { text: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: '#1e3a4a', icono: Thermometer },
  Riego:         { text: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: '#243a5a', icono: Droplets },
  CO2:           { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66', icono: Wind },
  Sustrato:      { text: '#d6a878', bg: 'rgba(214,168,120,0.12)', border: '#4a3a28', icono: Sprout },
  Sanidad:       { text: '#ff8a7a', bg: 'rgba(255,138,122,0.10)', border: '#5a2a26', icono: Bug },
  Medicion:      { text: '#2dd4bf', bg: 'rgba(45,212,191,0.10)', border: '#1e4a44', icono: Gauge },
  Herramienta:   { text: '#a6a6b5', bg: 'rgba(166,166,181,0.10)', border: '#2a2a3a', icono: Wrench },
  Otro:          { text: '#8f8f9f', bg: 'rgba(143,143,159,0.10)', border: '#2a2a3a', icono: Package },
}

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmtFecha = (f: string | null) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

export default function PaginaStockInsumos() {
  const [tab, setTab] = useState<'inventario' | 'mantenimiento'>('inventario')
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [mantes, setMantes] = useState<Mantenimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState<CategoriaInsumo | 'Todos'>('Todos')
  const [modalInsumo, setModalInsumo] = useState(false)
  const [editInsumo, setEditInsumo] = useState<Insumo | null>(null)
  const [modalMant, setModalMant] = useState(false)
  const [editMant, setEditMant] = useState<Mantenimiento | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [ins, man] = await Promise.all([stockService.getInsumos(), stockService.getMantenimientos()])
      setInsumos(ins); setMantes(man)
    } catch (err) { toast.error(`Error cargando stock: ${(err as Error).message}`) }
    finally { setCargando(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const borrarInsumo = async (i: Insumo) => {
    if (!window.confirm(`¿Borrar "${i.nombre}" del inventario?`)) return
    try { await stockService.eliminarInsumo(i.id); toast.success('Insumo borrado'); cargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }
  const borrarMant = async (m: Mantenimiento) => {
    if (!window.confirm('¿Borrar este registro de mantenimiento?')) return
    try { await stockService.eliminarMantenimiento(m.id); toast.success('Mantenimiento borrado'); cargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }
  const hechoHoy = async (m: Mantenimiento) => {
    try {
      const proximo = m.frecuencia_dias ? new Date(Date.now() + m.frecuencia_dias * 86400000).toISOString().slice(0, 10) : null
      await stockService.actualizarMantenimiento(m.id, { fecha_realizado: hoyISO(), proximo })
      toast.success('Registrado como hecho hoy'); cargar()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const q = busqueda.trim().toLowerCase()
  const insumosFiltrados = useMemo(() => insumos.filter(i =>
    (filtroCat === 'Todos' || i.categoria === filtroCat) &&
    (!q || i.nombre.toLowerCase().includes(q) || (i.marca ?? '').toLowerCase().includes(q) || (i.modelo ?? '').toLowerCase().includes(q))
  ), [insumos, filtroCat, q])

  const mantesOrdenados = useMemo(() => [...mantes].sort((a, b) => {
    const da = diasParaProximo(a), db = diasParaProximo(b)
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  }), [mantes])

  const porReponer = insumos.filter(i => (i.stock_minimo ?? 0) > 0 && i.cantidad <= (i.stock_minimo ?? 0)).length
  const mantPendientes = mantes.filter(m => { const d = diasParaProximo(m); return d !== null && d <= 7 }).length
  const conteoCat = (c: CategoriaInsumo) => insumos.filter(i => i.categoria === c).length

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 pt-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#bef264]" /> Stock &amp; Insumos
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {insumos.length} insumos · {porReponer} por reponer · {mantPendientes} mantenimiento{mantPendientes === 1 ? '' : 's'} pendiente{mantPendientes === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={() => { if (tab === 'inventario') { setEditInsumo(null); setModalInsumo(true) } else { setEditMant(null); setModalMant(true) } }} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{tab === 'inventario' ? 'Insumo' : 'Mantenimiento'}</span>
          </button>
        </div>
        <div className="flex gap-1 px-3 sm:px-6 pt-2">
          {(['inventario', 'mantenimiento'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === t ? 'border-[#a3e635] text-[#d9f99d]' : 'border-transparent text-[#5c5c6b] hover:text-[#a6a6b5]'}`}>
              {t === 'inventario' ? <Boxes className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
              {t === 'inventario' ? 'Inventario' : 'Mantenimiento'}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="px-3 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[130px] animate-pulse" />)}
        </div>
      ) : tab === 'inventario' ? (
        <div className="px-3 sm:px-6 py-4 pb-24">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b]" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre / marca"
                className="pl-8 pr-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 w-[180px]" />
            </div>
            <button onClick={() => setFiltroCat('Todos')}
              className={`px-2.5 py-1.5 rounded-full text-[11px] border transition-colors ${filtroCat === 'Todos' ? 'border-[#404d20] bg-[#a3e635]/12 text-[#d9f99d]' : 'border-[#2a2a3a] bg-[#101016] text-[#a6a6b5] hover:text-[#ececf1]'}`}>
              Todos ({insumos.length})
            </button>
            {CATEGORIAS_INSUMO.filter(c => conteoCat(c) > 0).map(c => {
              const e = CAT[c]
              return (
                <button key={c} onClick={() => setFiltroCat(c)}
                  className="px-2.5 py-1.5 rounded-full text-[11px] border transition-colors flex items-center gap-1"
                  style={filtroCat === c ? { borderColor: e.border, background: e.bg, color: e.text } : { borderColor: '#2a2a3a', background: '#101016', color: '#a6a6b5' }}>
                  <e.icono className="w-3 h-3" /> {c} ({conteoCat(c)})
                </button>
              )
            })}
          </div>

          {insumosFiltrados.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Boxes className="w-5 h-5 text-[#5c5c6b]" /></div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">{insumos.length === 0 ? 'Inventario vacío' : 'Sin resultados'}</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">{insumos.length === 0 ? 'Agregá tu primer equipo, fertilizante o herramienta.' : 'Probá con otra búsqueda o categoría.'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
              {insumosFiltrados.map(i => {
                const e = CAT[i.categoria]
                const min = i.stock_minimo ?? 0
                const bajo = min > 0 && i.cantidad <= min
                const pct = min > 0 ? Math.max(6, Math.min(100, Math.round((i.cantidad / (min * 2)) * 100))) : 0
                return (
                  <div key={i.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors p-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border" style={{ background: e.bg, borderColor: e.border }}>
                        <e.icono className="w-4 h-4" style={{ color: e.text }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-[13.5px] text-[#ececf1] truncate">{i.nombre}</h3>
                          {bajo && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-medium bg-[#ff8a7a]/12 border border-[#5a2a26] text-[#ff8a7a] flex-shrink-0"><AlertTriangle className="w-2.5 h-2.5" /> Reponer</span>}
                        </div>
                        <div className="text-[10.5px] text-[#5c5c6b] truncate">
                          <span style={{ color: e.text }}>{i.categoria}</span>
                          {(i.marca || i.modelo) && ` · ${[i.marca, i.modelo].filter(Boolean).join(' ')}`}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setEditInsumo(i); setModalInsumo(true) }} className="p-1.5 text-[#5c5c6b] hover:text-[#d9f99d] hover:bg-[#15151d] rounded-lg transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => borrarInsumo(i)} className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] bg-[#15151d] border border-[#2a2a3a] text-[#ececf1] font-medium">
                        {i.cantidad} {i.unidad || 'u'}
                      </span>
                      {i.potencia_w != null && <span className="px-2 py-0.5 rounded-md text-[11px] bg-[#15151d] border border-[#2a2a3a] text-[#fbbf24]">{i.potencia_w} W</span>}
                      {i.dosis && <span className="px-2 py-0.5 rounded-md text-[11px] bg-[#15151d] border border-[#2a2a3a] text-[#a6a6b5]">Dosis: {i.dosis}</span>}
                      {i.precio != null && <span className="px-2 py-0.5 rounded-md text-[11px] bg-[#15151d] border border-[#2a2a3a] text-[#5c5c6b]">${i.precio}</span>}
                    </div>

                    {min > 0 && (
                      <div className="mt-2.5">
                        <div className="h-1.5 rounded-full bg-[#1c1c27] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: bajo ? '#ff8a7a' : '#a3e635' }} />
                        </div>
                        <div className="mt-1 text-[9.5px] text-[#5c5c6b]">Mínimo: {min} {i.unidad || 'u'}{bajo ? ' · stock bajo' : ''}</div>
                      </div>
                    )}

                    {i.uso && <p className="mt-2 text-[11px] text-[#a6a6b5] leading-relaxed line-clamp-2">{i.uso}</p>}
                    {i.specs && <p className="mt-1 text-[10.5px] text-[#5c5c6b] leading-relaxed line-clamp-2">{i.specs}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 sm:px-6 py-4 pb-24">
          {mantesOrdenados.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Wrench className="w-5 h-5 text-[#5c5c6b]" /></div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin mantenimientos cargados</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Registrá limpiezas, recargas de CO2, cambios de filtro y su frecuencia.</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mantesOrdenados.map(m => {
                const dias = diasParaProximo(m)
                const prox = proximoEfectivo(m)
                const vinculado = m.insumo_id ? insumos.find(i => i.id === m.insumo_id) : null
                const titulo = vinculado?.nombre || m.equipo || 'Equipo'
                let badge = { label: 'Sin programar', text: '#8f8f9f', bg: 'rgba(143,143,159,0.10)', border: '#2a2a3a' }
                if (dias !== null) {
                  if (dias < 0) badge = { label: `Vencido (${Math.abs(dias)}d)`, text: '#ff8a7a', bg: 'rgba(255,138,122,0.12)', border: '#5a2a26' }
                  else if (dias <= 7) badge = { label: dias === 0 ? 'Hoy' : `En ${dias}d`, text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: '#5a4a20' }
                  else badge = { label: `En ${dias}d`, text: '#bef264', bg: 'rgba(163,230,53,0.12)', border: '#404d20' }
                }
                return (
                  <div key={m.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#15151d] border border-[#2a2a3a] flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="w-4 h-4 text-[#a78bfa]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-[13.5px] text-[#ececf1] truncate">{titulo}</h3>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#15151d] border border-[#2a2a3a] text-[#a6a6b5]">{m.tipo}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: badge.bg, borderColor: badge.border, color: badge.text, borderWidth: 1 }}>{badge.label}</span>
                      </div>
                      <div className="mt-1 text-[10.5px] text-[#5c5c6b] flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Último: {fmtFecha(m.fecha_realizado)}</span>
                        {m.frecuencia_dias ? <span>Cada {m.frecuencia_dias} días</span> : null}
                        <span>Próximo: {fmtFecha(prox)}</span>
                        {m.responsable ? <span>· {m.responsable}</span> : null}
                      </div>
                      {m.notas && <p className="mt-1.5 text-[11px] text-[#a6a6b5] leading-relaxed">{m.notas}</p>}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => hechoHoy(m)} className="p-1.5 text-[#5c5c6b] hover:text-[#bef264] hover:bg-[#15151d] rounded-lg transition-colors" title="Marcar hecho hoy"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditMant(m); setModalMant(true) }} className="p-1.5 text-[#5c5c6b] hover:text-[#d9f99d] hover:bg-[#15151d] rounded-lg transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => borrarMant(m)} className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {modalInsumo && <ModalInsumo insumo={editInsumo} onCerrar={() => setModalInsumo(false)} onGuardado={() => { setModalInsumo(false); cargar() }} />}
      {modalMant && <ModalMant mant={editMant} insumos={insumos} onCerrar={() => setModalMant(false)} onGuardado={() => { setModalMant(false); cargar() }} />}
    </div>
  )
}

function ModalInsumo({ insumo, onCerrar, onGuardado }: { insumo: Insumo | null; onCerrar: () => void; onGuardado: () => void }) {
  const [f, setF] = useState<Partial<Insumo>>(insumo ?? { categoria: 'Fertilizante', cantidad: 0, unidad: 'u', stock_minimo: 0 })
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Insumo, v: any) => setF(prev => ({ ...prev, [k]: v }))
  const num = (v: string) => v === '' ? null : Number(v)

  const guardar = async () => {
    if (!f.nombre?.trim()) { toast.error('Poné un nombre'); return }
    setGuardando(true)
    try {
      const payload: Partial<Insumo> = {
        nombre: f.nombre, categoria: f.categoria, marca: f.marca || null, modelo: f.modelo || null,
        cantidad: Number(f.cantidad ?? 0), unidad: f.unidad || 'u', potencia_w: f.potencia_w ?? null,
        dosis: f.dosis || null, uso: f.uso || null, stock_minimo: f.stock_minimo ?? 0,
        proveedor: f.proveedor || null, precio: f.precio ?? null, specs: f.specs || null, notas: f.notas || null,
      }
      if (insumo) await stockService.actualizarInsumo(insumo.id, payload)
      else await stockService.crearInsumo(payload)
      toast.success(insumo ? 'Insumo actualizado' : 'Insumo agregado'); onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1]">{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={f.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Luz LED de cultivo, Bomba de agua, Top Crop..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoría</label>
              <select className={inputCls} value={f.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Potencia (W)</label>
              <input type="number" className={inputCls} value={f.potencia_w ?? ''} onChange={e => set('potencia_w', num(e.target.value))} placeholder="Ej: 240" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Marca</label><input className={inputCls} value={f.marca ?? ''} onChange={e => set('marca', e.target.value)} /></div>
            <div><label className={labelCls}>Modelo</label><input className={inputCls} value={f.modelo ?? ''} onChange={e => set('modelo', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Cantidad</label><input type="number" className={inputCls} value={f.cantidad ?? 0} onChange={e => set('cantidad', num(e.target.value) ?? 0)} /></div>
            <div>
              <label className={labelCls}>Unidad</label>
              <select className={inputCls} value={f.unidad ?? 'u'} onChange={e => set('unidad', e.target.value)}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Stock mínimo</label><input type="number" className={inputCls} value={f.stock_minimo ?? 0} onChange={e => set('stock_minimo', num(e.target.value) ?? 0)} placeholder="Aviso" /></div>
          </div>
          <div><label className={labelCls}>Dosis / uso (fertilizantes)</label><input className={inputCls} value={f.dosis ?? ''} onChange={e => set('dosis', e.target.value)} placeholder="Ej: 2 ml/L en vege" /></div>
          <div><label className={labelCls}>Para qué se usa</label><input className={inputCls} value={f.uso ?? ''} onChange={e => set('uso', e.target.value)} placeholder="Ej: Engorde de flores en floración" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Proveedor</label><input className={inputCls} value={f.proveedor ?? ''} onChange={e => set('proveedor', e.target.value)} /></div>
            <div><label className={labelCls}>Precio ($)</label><input type="number" className={inputCls} value={f.precio ?? ''} onChange={e => set('precio', num(e.target.value))} /></div>
          </div>
          <div><label className={labelCls}>Specs / detalle</label><textarea rows={2} className={inputCls + ' resize-none'} value={f.specs ?? ''} onChange={e => set('specs', e.target.value)} placeholder="Ej: 240W reales, espectro full, cobertura 1x1m" /></div>
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls + ' resize-none'} value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} /></div>
        </div>
        <div className="sticky bottom-0 bg-[#0d0d12] border-t border-[#1f1f2b] px-4 py-3 flex justify-end gap-2">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} className={btnPrimario}>{guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{insumo ? 'Guardar' : 'Agregar'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalMant({ mant, insumos, onCerrar, onGuardado }: { mant: Mantenimiento | null; insumos: Insumo[]; onCerrar: () => void; onGuardado: () => void }) {
  const [f, setF] = useState<Partial<Mantenimiento>>(mant ?? { tipo: 'Limpieza', fecha_realizado: hoyISO() })
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Mantenimiento, v: any) => setF(prev => ({ ...prev, [k]: v }))

  const guardar = async () => {
    if (!f.insumo_id && !f.equipo?.trim()) { toast.error('Indicá el equipo o vinculá un insumo'); return }
    setGuardando(true)
    try {
      const payload: Partial<Mantenimiento> = {
        insumo_id: f.insumo_id || null, equipo: f.equipo || null, tipo: f.tipo,
        fecha_realizado: f.fecha_realizado || hoyISO(),
        frecuencia_dias: f.frecuencia_dias ? Number(f.frecuencia_dias) : null,
        proximo: f.proximo || null, responsable: f.responsable || null, notas: f.notas || null,
      }
      if (mant) await stockService.actualizarMantenimiento(mant.id, payload)
      else await stockService.crearMantenimiento(payload)
      toast.success(mant ? 'Mantenimiento actualizado' : 'Mantenimiento registrado'); onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1]">{mant ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Equipo / insumo del inventario</label>
            <select className={inputCls} value={f.insumo_id ?? ''} onChange={e => set('insumo_id', e.target.value || null)}>
              <option value="">— Escribir a mano abajo —</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          {!f.insumo_id && (
            <div><label className={labelCls}>Equipo (texto libre)</label><input className={inputCls} value={f.equipo ?? ''} onChange={e => set('equipo', e.target.value)} placeholder="Ej: Tubo de CO2, Aire acondicionado" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo</label>
              <select className={inputCls} value={f.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS_MANTENIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Frecuencia (días)</label><input type="number" className={inputCls} value={f.frecuencia_dias ?? ''} onChange={e => set('frecuencia_dias', e.target.value === '' ? null : Number(e.target.value))} placeholder="Ej: 30" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Fecha realizado</label><input type="date" className={inputCls} value={f.fecha_realizado ?? hoyISO()} onChange={e => set('fecha_realizado', e.target.value)} /></div>
            <div><label className={labelCls}>Próximo (opcional)</label><input type="date" className={inputCls} value={f.proximo ?? ''} onChange={e => set('proximo', e.target.value || null)} /></div>
          </div>
          <div><label className={labelCls}>Responsable</label><input className={inputCls} value={f.responsable ?? ''} onChange={e => set('responsable', e.target.value)} /></div>
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls + ' resize-none'} value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} placeholder="Ej: Se recargó a 50 bar, cambiar válvula la próxima" /></div>
          <p className="text-[10.5px] text-[#5c5c6b]">Si ponés frecuencia y no fecha de próximo, se calcula sola (último + frecuencia).</p>
        </div>
        <div className="sticky bottom-0 bg-[#0d0d12] border-t border-[#1f1f2b] px-4 py-3 flex justify-end gap-2">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} className={btnPrimario}>{guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{mant ? 'Guardar' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  )
}
