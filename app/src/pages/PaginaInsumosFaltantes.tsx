// PaginaInsumosFaltantes — lista de compras de sales/insumos que hay que reponer.
// Carga tipo Proveedores (dropdown de sal del catálogo) + cantidad, prioridad, nota.
// Persiste en Supabase (tabla insumos_faltantes vía faltantesService).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  ShoppingCart, Plus, Trash2, Check, Loader2, RefreshCw, PackageX, Upload, ExternalLink, Pencil, Wallet,
} from 'lucide-react'
import {
  faltantesService,
  type InsumoFaltante, type Prioridad,
} from '../lib/nutrientes'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'

const UNIDADES = ['kg', 'g', 'L', 'mL', 'u'] as const

const COLOR_PRIORIDAD: Record<Prioridad, { label: string; text: string; bg: string; border: string }> = {
  alta:  { label: 'ALTA',  text: '#ff8a7a', bg: 'rgba(122,40,32,0.18)', border: '#7a2820' },
  media: { label: 'MEDIA', text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: '#5a4a20' },
  baja:  { label: 'BAJA',  text: '#8f8f9f', bg: 'rgba(180,180,200,0.06)', border: '#2a2a3a' },
}
const ORDEN_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 }

export default function PaginaInsumosFaltantes() {
  const [faltantes, setFaltantes] = useState<InsumoFaltante[]>([])
  const [cargando, setCargando] = useState(true)
  const [expandido, setExpandido] = useState<Set<string>>(new Set())
  const toggleExpandir = (id: string) => setExpandido(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // form
  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState<string>('kg')
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [nota, setNota] = useState('')
  const [precio, setPrecio] = useState('')
  const [link, setLink] = useState('')
  const [imagen, setImagen] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const onImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 3_000_000) { toast.error('Imagen muy grande (máx 3 MB)'); return }
    const r = new FileReader(); r.onload = () => setImagen(String(r.result)); r.readAsDataURL(f)
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setFaltantes(await faltantesService.list())
    } catch (err) {
      toast.error(`Error cargando faltantes: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const resetForm = () => {
    setEditId(null)
    setNombre(''); setCantidad(''); setNota(''); setPrioridad('media'); setUnidad('kg')
    setPrecio(''); setLink(''); setImagen('')
  }
  const editar = (f: InsumoFaltante) => {
    setEditId(f.id)
    setNombre(f.nombre)
    setCantidad(f.cantidad != null ? String(f.cantidad) : '')
    setUnidad(f.unidad ?? 'kg')
    setPrioridad(f.prioridad)
    setNota(f.nota ?? '')
    setPrecio(f.precio != null ? String(f.precio) : '')
    setLink(f.link ?? '')
    setImagen(f.imagen ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    const nom = nombre.trim()
    if (!nom) { toast.error('Escribí el nombre del insumo'); return }
    setGuardando(true)
    const payload = {
      nombre: nom,
      cantidad: cantidad.trim() === '' ? null : parseFloat(cantidad.replace(',', '.')),
      unidad, prioridad, nota: nota.trim() || null,
      precio: precio.trim() === '' ? null : parseFloat(precio.replace(',', '.')),
      link: link.trim() || null, imagen: imagen || null,
    }
    try {
      if (editId) {
        await faltantesService.actualizar(editId, payload)
        toast.success('Insumo actualizado')
      } else {
        await faltantesService.crear({ sal_id: null, comprado: false, ...payload })
        toast.success(`"${nom}" agregado a la lista`)
      }
      resetForm()
      await cargar()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  const toggleComprado = async (f: InsumoFaltante) => {
    try { await faltantesService.actualizar(f.id, { comprado: !f.comprado }); cargar() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }
  const borrar = async (f: InsumoFaltante) => {
    try { await faltantesService.eliminar(f.id); toast.success('Insumo quitado'); cargar() }
    catch (err) { toast.error(`Error: ${(err as Error).message}`) }
  }

  const ordenados = useMemo(() => [...faltantes].sort((a, b) => {
    if (!!a.comprado !== !!b.comprado) return a.comprado ? 1 : -1 // pendientes primero
    const p = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]
    if (p !== 0) return p
    return (b.creado_en ?? '').localeCompare(a.creado_en ?? '')
  }), [faltantes])

  const pendientes = faltantes.filter(f => !f.comprado).length
  const subtotal = (f: InsumoFaltante) => (f.precio ?? 0) * (f.cantidad ?? 1)
  const totalPendiente = faltantes.filter(f => !f.comprado).reduce((a, f) => a + subtotal(f), 0)
  const totalComprado = faltantes.filter(f => f.comprado).reduce((a, f) => a + subtotal(f), 0)

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Insumos faltantes</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              {totalComprado > 0 && <span className="text-[#5c5c6b]"> · comprado ${totalComprado.toLocaleString('es-AR')}</span>}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-lg border border-[#404d20] bg-[#a3e635]/10 px-3 py-1.5" title="Presupuesto de lo que falta comprar (precio × cantidad)">
            <Wallet className="w-4 h-4 text-[#bef264] flex-shrink-0" />
            <div className="leading-none text-right">
              <div className="text-[8.5px] uppercase tracking-[0.14em] text-[#5c5c6b]">Presupuesto</div>
              <div className="text-[14px] sm:text-[15px] font-display font-bold text-[#d9f99d] tabular-nums mt-0.5">${totalPendiente.toLocaleString('es-AR')}</div>
            </div>
          </div>
          <button onClick={cargar} className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]" title="Refrescar">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 max-w-3xl mx-auto">
        {/* Desglose del presupuesto — % que representa cada insumo del total */}
        {totalPendiente > 0 && (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#bef264]" />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Desglose del presupuesto</h3>
              <span className="ml-auto text-[12px] font-bold text-[#d9f99d] tabular-nums">${totalPendiente.toLocaleString('es-AR')}</span>
            </div>
            <ul className="divide-y divide-[#1a1a24]">
              {faltantes.filter(f => !f.comprado && subtotal(f) > 0)
                .sort((a, b) => subtotal(b) - subtotal(a))
                .map(f => {
                  const st = subtotal(f)
                  const pct = (st / totalPendiente) * 100
                  return (
                    <li key={f.id} className="px-4 sm:px-5 py-2.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12px] text-[#ececf1] truncate flex-1">{f.nombre}</span>
                        <span className="text-[12px] font-semibold text-[#d9f99d] tabular-nums flex-shrink-0">${st.toLocaleString('es-AR')}</span>
                        <span className="text-[11px] font-medium text-[#c4b5fd] tabular-nums w-11 text-right flex-shrink-0">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1c1c27] overflow-hidden mt-1.5">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4d7c0f] to-[#a3e635]" style={{ width: `${pct}%` }} />
                      </div>
                      {(f.cantidad != null && f.precio != null) && (
                        <div className="text-[9.5px] text-[#5c5c6b] mt-0.5 tabular-nums">
                          {f.cantidad.toLocaleString('es-AR')} {f.unidad ?? ''} × ${f.precio.toLocaleString('es-AR')}
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </div>
        )}

        {/* Form de alta */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            {editId ? <Pencil className="w-3.5 h-3.5 text-[#bef264]" /> : <ShoppingCart className="w-3.5 h-3.5 text-[#bef264]" />}
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">{editId ? 'Editar insumo' : 'Agregar insumo faltante'}</h3>
            {editId && <button onClick={resetForm} className="ml-auto text-[10.5px] text-[#a6a6b5] hover:text-[#ececf1] underline">Cancelar</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nombre del insumo *</label>
              <input className={inputCls} placeholder="ej. maceta 11L, cinta de riego, guantes, malla…" value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardar() }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Cantidad</label><input type="number" inputMode="decimal" className={inputCls} placeholder="5" value={cantidad} onChange={e => setCantidad(e.target.value)} /></div>
              <div><label className={labelCls}>Unidad</label>
                <select className={inputCls} value={unidad} onChange={e => setUnidad(e.target.value)}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select className={inputCls} value={prioridad} onChange={e => setPrioridad(e.target.value as Prioridad)}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Precio estimado (ARS)</label>
              <input type="number" inputMode="decimal" className={inputCls} placeholder="ej. 27596" value={precio} onChange={e => setPrecio(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Link de compra</label>
              <input className={inputCls} placeholder="ej. mercadolibre.com.ar/…" value={link} onChange={e => setLink(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Nota</label>
              <input className={inputCls} placeholder="ej. conseguir en Pura Química, mínimo 5 kg…" value={nota} onChange={e => setNota(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Foto (etiqueta / precio)</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> {imagen ? 'Cambiar foto' : 'Subir'}
                  <input type="file" accept="image/*" onChange={onImagen} className="hidden" />
                </label>
                {imagen && <img src={imagen} alt="" className="w-9 h-9 rounded object-cover border border-[#1f1f2b]" />}
                {imagen && <button type="button" onClick={() => setImagen('')} className="text-[10.5px] text-[#5c5c6b] hover:text-[#ff8a7a] underline">quitar</button>}
              </div>
            </div>
          </div>
          <button onClick={guardar} disabled={guardando} className={`${btnPrimario} mt-3 w-full sm:w-auto justify-center`}>
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {editId ? 'Guardar cambios' : 'Agregar a la lista'}
          </button>
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-[#101016] border border-[#1f1f2b] rounded-xl animate-pulse" />)}</div>
        ) : ordenados.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><PackageX className="w-5 h-5 text-[#5c5c6b]" /></div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin insumos faltantes</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Cargá lo que necesites reponer y te queda la lista de compras.</div>
          </div>
        ) : (
          <ul className="space-y-2">
            {ordenados.map(f => {
              const cp = COLOR_PRIORIDAD[f.prioridad]
              return (
                <li key={f.id} className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors ${f.comprado ? 'bg-[#0d0d12] border-[#1a1a24] opacity-60' : 'bg-[#101016] border-[#1f1f2b] hover:border-[#404d20]'}`}>
                  <button onClick={() => toggleComprado(f)}
                    className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${f.comprado ? 'bg-[#a3e635]/20 border-[#404d20] text-[#bef264]' : 'border-[#2a2a3a] text-transparent hover:border-[#404d20]'}`}
                    title={f.comprado ? 'Marcar como pendiente' : 'Marcar como comprado'}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  {f.imagen && <img src={f.imagen} alt="" className="w-11 h-11 rounded object-cover border border-[#1f1f2b] flex-shrink-0 self-start" />}
                  <div className="min-w-0 flex-1">
                    {/* Línea 1: nombre + prioridad */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[13px] font-semibold truncate ${f.comprado ? 'line-through text-[#5c5c6b]' : 'text-[#ececf1]'}`}>{f.nombre}</span>
                      <span className="text-[9px] font-semibold tracking-wide rounded px-1.5 py-0.5 border flex-shrink-0" style={{ color: cp.text, background: cp.bg, borderColor: cp.border }}>{cp.label}</span>
                    </div>
                    {/* Línea 2 (RESALTADA): cantidad · precio · link */}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {f.cantidad != null && (
                        <span className="text-[10.5px] font-medium text-[#c4b5fd] bg-[#8b5cf6]/10 border border-[#463a66] rounded px-1.5 py-0.5 tabular-nums">
                          {f.cantidad.toLocaleString('es-AR')} {f.unidad ?? ''}
                        </span>
                      )}
                      {f.precio != null && (
                        <span className="text-[11.5px] font-bold text-[#d9f99d] bg-[#a3e635]/10 border border-[#404d20] rounded px-1.5 py-0.5 tabular-nums">
                          ${f.precio.toLocaleString('es-AR')}
                        </span>
                      )}
                      {f.link && (
                        <a href={/^https?:\/\//.test(f.link) ? f.link : `https://${f.link}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#38bdf8] hover:text-[#7dd3fc] bg-[#38bdf8]/10 border border-[#1e3a4a] rounded px-1.5 py-0.5">
                          <ExternalLink className="w-3 h-3" /> Comprar
                        </a>
                      )}
                    </div>
                    {/* Descripción (segundo plano, resumida + expandible) */}
                    {f.nota && (
                      <div className="mt-1">
                        <p className={`text-[10.5px] text-[#6a6a78] leading-snug ${expandido.has(f.id) ? '' : 'line-clamp-2'}`}>{f.nota}</p>
                        {f.nota.length > 90 && (
                          <button onClick={() => toggleExpandir(f.id)} className="text-[10px] text-[#5c5c6b] hover:text-[#a6a6b5] mt-0.5">
                            {expandido.has(f.id) ? 'ver menos' : 'ver más'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => editar(f)} className="p-1.5 text-[#5c5c6b] hover:text-[#bef264] hover:bg-[#15151d] rounded-lg transition-colors" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => borrar(f)} className="p-1.5 text-[#46464f] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors" title="Quitar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
