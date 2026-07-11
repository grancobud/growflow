// Insumos de Riego — catálogo tipo "Sustancias" del creador de fertilizantes.
// Reusa la capa de datos de Instalaciones (lib/instalaciones) scopeada al sistema "Riego":
// cada insumo tiene ofertas de proveedor con precio + imagen; la elegida vincula el precio.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronDown, Star, Trash2, ImagePlus, Loader2, X, Store } from 'lucide-react'
import {
  instalacionesService, type ItemInstalacion, type OfertaInstalacion, type ProveedorInstalacion,
  UNIDADES_INST,
} from '../../lib/instalaciones'

const SISTEMA = 'Riego'
const card = 'rounded-xl bg-[#111119] border border-[#1f1f2b] p-4 sm:p-5'
const inp = 'w-full bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-1.5 text-[12px] text-[#ececf1] focus:border-[#404d20] outline-none'

// Reescala una imagen a max 1000px y devuelve data URL JPEG (base64 liviano).
function comprimirImagen(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('sin canvas')); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('imagen inválida'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('no se pudo leer'))
    reader.readAsDataURL(file)
  })
}

const fmt = (n: number | null | undefined) => n != null ? '$' + Number(n).toLocaleString('es-AR') : '—'

export default function InsumosRiego() {
  const [items, setItems] = useState<ItemInstalacion[]>([])
  const [provs, setProvs] = useState<ProveedorInstalacion[]>([])
  const [ofertas, setOfertas] = useState<Record<string, OfertaInstalacion[]>>({})
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [verImg, setVerImg] = useState<string | null>(null)
  const provNombre = useMemo(() => Object.fromEntries(provs.map(p => [p.id, p.nombre])), [provs])

  async function cargar() {
    try {
      const [its, ps] = await Promise.all([instalacionesService.getItems(), instalacionesService.getProveedores()])
      setItems(its.filter(i => i.sistema === SISTEMA))
      setProvs(ps)
    } catch (e) { toast.error(String(e)) }
  }
  useEffect(() => { cargar() }, [])

  async function toggleFav(it: ItemInstalacion) {
    setItems(xs => xs.map(x => x.id === it.id ? { ...x, favorito: !x.favorito } : x))
    try { await instalacionesService.actualizarItem(it.id, { favorito: !it.favorito }) }
    catch (e) { toast.error(String(e)); cargar() }
  }

  async function toggle(id: string) {
    if (abierto === id) { setAbierto(null); return }
    setAbierto(id)
    if (!ofertas[id]) {
      try { setOfertas(o => ({ ...o, [id]: [] })); const of = await instalacionesService.getOfertas(id); setOfertas(o => ({ ...o, [id]: of })) }
      catch (e) { toast.error(String(e)) }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[12px] text-[#a6a6b5]">Insumos de riego · {items.length}</p>
        <div className="flex-1" />
        <button onClick={() => setNuevoOpen(v => !v)} className="flex items-center gap-1 text-[11px] bg-[#7dd3fc]/15 border border-[#7dd3fc]/30 text-[#7dd3fc] rounded-md px-2 py-1 hover:bg-[#7dd3fc]/25">
          <Plus className="w-3.5 h-3.5" /> Nuevo insumo
        </button>
      </div>

      {nuevoOpen && <FormItem onListo={() => { setNuevoOpen(false); cargar() }} />}

      {items.length === 0 && !nuevoOpen && (
        <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Todavía no cargaste insumos de riego. Tocá «Nuevo insumo».</p>
      )}

      {items.map(it => (
        <div key={it.id} className={card}>
          <div className="w-full flex items-center gap-2.5">
            <button title={it.favorito ? 'Quitar de elegidos' : 'Marcar como elegido'} onClick={() => toggleFav(it)} className="flex-shrink-0">
              <Star className="w-4 h-4" fill={it.favorito ? '#facc15' : 'none'} stroke={it.favorito ? '#facc15' : '#5c5c6b'} />
            </button>
            <button onClick={() => toggle(it.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-display font-semibold text-[#ececf1] truncate">{it.nombre}</p>
                <p className="text-[10.5px] text-[#5c5c6b]">{[it.marca, it.modelo, it.specs].filter(Boolean).join(' · ') || 'Sin datos'}</p>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#d9f99d]">{fmt(it.precio)}{it.unidad ? <span className="text-[10px] text-[#5c5c6b]"> /{it.unidad}</span> : null}</span>
              <ChevronDown className={`w-4 h-4 text-[#5c5c6b] transition-transform ${abierto === it.id ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {abierto === it.id && (
            <div className="mt-3 pt-3 border-t border-[#1f1f2b] space-y-2">
              {(ofertas[it.id] ?? []).map(o => (
                <div key={o.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-lg p-2">
                  {o.imagen
                    ? <button onClick={() => setVerImg(o.imagen!)} className="flex-shrink-0"><img src={o.imagen} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#2a2a3a]" /></button>
                    : <div className="w-12 h-12 rounded-lg bg-[#101016] border border-[#2a2a3a] flex items-center justify-center flex-shrink-0"><Store className="w-4 h-4 text-[#3a3a4a]" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-[#d4d4dd] truncate">{o.proveedor_id ? provNombre[o.proveedor_id] ?? 'Proveedor' : 'Proveedor'}</p>
                    <p className="text-[10.5px] text-[#5c5c6b] truncate">{[o.presentacion, o.nota].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-[12px] font-mono font-bold text-[#ececf1]">{fmt(o.precio)}</span>
                  <button title="Usar este precio" onClick={async () => { await instalacionesService.elegirOferta(o.id, it.id, o.precio ?? null, o.proveedor_id ?? null); await cargar(); }}>
                    <Star className="w-4 h-4" fill={o.elegido ? '#facc15' : 'none'} stroke={o.elegido ? '#facc15' : '#5c5c6b'} />
                  </button>
                  <button title="Eliminar" onClick={async () => { await instalacionesService.eliminarOferta(o.id); setOfertas(x => ({ ...x, [it.id]: x[it.id].filter(y => y.id !== o.id) })); }}>
                    <Trash2 className="w-3.5 h-3.5 text-[#ff8a7a]" />
                  </button>
                </div>
              ))}
              <FormOferta itemId={it.id} provs={provs} onListo={async () => { const of = await instalacionesService.getOfertas(it.id); setOfertas(o => ({ ...o, [it.id]: of })); setProvs(await instalacionesService.getProveedores()) }} />
              <button onClick={async () => { if (confirm('¿Eliminar el insumo?')) { await instalacionesService.eliminarItem(it.id); cargar() } }} className="text-[10.5px] text-[#ff8a7a] hover:underline">Eliminar insumo</button>
            </div>
          )}
        </div>
      ))}

      {verImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setVerImg(null)}>
          <img src={verImg} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  )
}

function FormItem({ onListo }: { onListo: () => void }) {
  const [f, setF] = useState({ nombre: '', marca: '', modelo: '', unidad: 'u', specs: '', url: '' })
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const guardar = async () => {
    if (!f.nombre.trim()) { toast.error('Poné un nombre'); return }
    try {
      await instalacionesService.crearItem({ nombre: f.nombre.trim(), sistema: SISTEMA, marca: f.marca || null, modelo: f.modelo || null, unidad: f.unidad, specs: f.specs || null, url: f.url || null })
      toast.success('Insumo agregado'); onListo()
    } catch (e) { toast.error(String(e)) }
  }
  return (
    <div className={card}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <label className="text-[10px] text-[#a6a6b5] col-span-2 sm:col-span-1">Nombre<input className={`${inp} mt-0.5`} value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Electroválvula RPE 3/4" /></label>
        <label className="text-[10px] text-[#a6a6b5]">Marca<input className={`${inp} mt-0.5`} value={f.marca} onChange={e => set('marca', e.target.value)} /></label>
        <label className="text-[10px] text-[#a6a6b5]">Modelo<input className={`${inp} mt-0.5`} value={f.modelo} onChange={e => set('modelo', e.target.value)} /></label>
        <label className="text-[10px] text-[#a6a6b5]">Unidad
          <select className={`${inp} mt-0.5`} value={f.unidad} onChange={e => set('unidad', e.target.value)}>{UNIDADES_INST.map(u => <option key={u} value={u}>{u}</option>)}</select>
        </label>
        <label className="text-[10px] text-[#a6a6b5] col-span-2 sm:col-span-2">Specs<input className={`${inp} mt-0.5`} value={f.specs} onChange={e => set('specs', e.target.value)} placeholder="NC 220V, 3/4, diafragma" /></label>
        <label className="text-[10px] text-[#a6a6b5] col-span-2 sm:col-span-3">Link (opcional)<input className={`${inp} mt-0.5`} value={f.url} onChange={e => set('url', e.target.value)} placeholder="https://..." /></label>
      </div>
      <button onClick={guardar} className="mt-2 text-[11px] bg-[#7dd3fc]/15 border border-[#7dd3fc]/30 text-[#7dd3fc] rounded-md px-3 py-1.5 hover:bg-[#7dd3fc]/25">Guardar insumo</button>
    </div>
  )
}

function FormOferta({ itemId, provs, onListo }: { itemId: string; provs: ProveedorInstalacion[]; onListo: () => void }) {
  const [f, setF] = useState({ proveedor: '', precio: '', presentacion: '', imagen: '', nota: '' })
  const [subiendo, setSubiendo] = useState(false)
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const onFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { set('imagen', await comprimirImagen(file)) } catch (err) { toast.error(`No se pudo procesar la imagen: ${(err as Error).message}`) } finally { setSubiendo(false) }
  }
  const guardar = async () => {
    try {
      let proveedorId: string | null = null
      const nombre = f.proveedor.trim()
      if (nombre) {
        const existente = provs.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
        proveedorId = existente ? existente.id : (await instalacionesService.crearProveedor({ nombre })).id
      }
      await instalacionesService.crearOferta({
        item_id: itemId, proveedor_id: proveedorId, precio: f.precio ? Number(f.precio) : null,
        presentacion: f.presentacion || null, imagen: f.imagen || null, nota: f.nota || null, elegido: false,
      })
      setF({ proveedor: '', precio: '', presentacion: '', imagen: '', nota: '' })
      toast.success('Proveedor agregado'); onListo()
    } catch (e) { toast.error(String(e)) }
  }
  return (
    <div className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-2.5">
      <div className="flex items-start gap-2">
        {f.imagen
          ? <img src={f.imagen} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#2a2a3a] flex-shrink-0" />
          : <label className="w-16 h-16 rounded-lg bg-[#15151d] border border-dashed border-[#2a2a3a] flex flex-col items-center justify-center gap-0.5 cursor-pointer flex-shrink-0 text-[#7dd3fc]">
              {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              <span className="text-[8px]">Foto</span>
              <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
            </label>}
        <div className="flex-1 grid grid-cols-2 gap-1.5">
          <input className={inp} value={f.proveedor} onChange={e => set('proveedor', e.target.value)} placeholder="Proveedor" />
          <input className={inp} inputMode="decimal" value={f.precio} onChange={e => set('precio', e.target.value.replace(',', '.'))} placeholder="Precio $" />
          <input className={inp} value={f.presentacion} onChange={e => set('presentacion', e.target.value)} placeholder="Presentación (c/u, kit...)" />
          <input className={inp} value={f.nota} onChange={e => set('nota', e.target.value)} placeholder="Nota" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button onClick={guardar} className="text-[11px] bg-[#7dd3fc]/15 border border-[#7dd3fc]/30 text-[#7dd3fc] rounded-md px-3 py-1 hover:bg-[#7dd3fc]/25">Agregar proveedor</button>
        {f.imagen && <button onClick={() => set('imagen', '')} className="text-[10.5px] text-[#ff8a7a] hover:underline">Quitar foto</button>}
      </div>
    </div>
  )
}
