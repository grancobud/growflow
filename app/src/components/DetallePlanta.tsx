// DetallePlanta — modal con la linea de tiempo completa de una planta + fotos.
// Eventos ordenados cronologicamente (germino -> trasplantes -> poda -> flora -> cosecha),
// con miniaturas, subida de fotos y visor a pantalla completa.

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  X, Camera, Loader2, Droplets, Scissors, FlaskConical, StickyNote,
  Sprout, Flower2, Repeat, AlertTriangle, RefreshCw, Image as ImageIcon, Scale, SprayCan,
} from 'lucide-react'
import { cultivoService, type ResumenPlanta, type Evento, type Cosecha } from '../lib/cultivo'
import { supabase } from '../lib/supabase'

const ICONO: Record<string, { Ic: any; color: string }> = {
  Riego: { Ic: Droplets, color: '#38bdf8' },
  Fertilizacion: { Ic: FlaskConical, color: '#bef264' },
  Poda: { Ic: Scissors, color: '#c4b5fd' },
  Trasplante: { Ic: Repeat, color: '#fb923c' },
  CambioFase: { Ic: Flower2, color: '#e879f9' },
  Entrenamiento: { Ic: RefreshCw, color: '#facc15' },
  Problema: { Ic: AlertTriangle, color: '#ff6b5a' },
  Foto: { Ic: ImageIcon, color: '#94a3b8' },
  Nota: { Ic: StickyNote, color: '#f59e0b' },
  Aplicacion: { Ic: SprayCan, color: '#c4b5fd' },
}

interface Item {
  id: string
  tipo: string
  fecha: string
  detalle: string | null
  foto_url: string | null
  esCosecha?: boolean
}

export default function DetallePlanta({ planta, onCerrar, onCambio }: {
  planta: ResumenPlanta
  onCerrar: () => void
  onCambio: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [visor, setVisor] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [evs, cosechas, aplic] = await Promise.all([
        cultivoService.getEventos(planta.id, 200),
        cultivoService.getCosechas(),
        supabase.from('aplicaciones').select('id,fecha,categoria,producto,dosis,notas').eq('planta_id', planta.id),
      ])
      const cos = (cosechas as Cosecha[]).filter(c => c.planta_id === planta.id)
      const lista: Item[] = [
        ...(evs as Evento[]).map(e => ({ id: e.id, tipo: e.tipo, fecha: e.fecha, detalle: e.detalle, foto_url: e.foto_url })),
        ...((aplic.data ?? []) as any[]).map(a => ({
          id: a.id, tipo: 'Aplicacion', fecha: a.fecha, foto_url: null,
          detalle: [a.categoria, a.producto, a.dosis, a.notas].filter(Boolean).join(' · '),
        })),
        ...cos.map(c => ({
          id: c.id, tipo: 'Cosecha', fecha: c.fecha, esCosecha: true, foto_url: null,
          detalle: [c.peso_seco_g ? `${c.peso_seco_g}g secos` : null, c.peso_humedo_g ? `${c.peso_humedo_g}g húmedos` : null,
            c.valoracion ? `★ ${c.valoracion}/10` : null, c.notas_sabor, c.notas_curado].filter(Boolean).join(' · ') || 'Cosecha',
        })),
      ]
      // Mas reciente arriba; si comparten fecha, mantener orden de insercion
      lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
      setItems(lista)
    } catch (err) {
      toast.error(`Error cargando línea de tiempo: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [planta.id])

  useEffect(() => { cargar() }, [cargar])

  const subirFoto = async (file: File) => {
    setSubiendo(true)
    try {
      const url = await cultivoService.subirFoto(file)
      await cultivoService.crearEvento({ planta_id: planta.id, tipo: 'Foto', foto_url: url, detalle: null })
      toast.success('Foto agregada')
      cargar()
      onCambio()
    } catch (err) {
      toast.error(`No se pudo subir: ${(err as Error).message}`)
    } finally {
      setSubiendo(false)
    }
  }

  const borrar = async (it: Item) => {
    try {
      if (it.esCosecha) {
        const { error } = await supabase.from('cosechas').delete().eq('id', it.id)
        if (error) throw new Error(error.message)
      } else if (it.tipo === 'Aplicacion') {
        const { error } = await supabase.from('aplicaciones').delete().eq('id', it.id)
        if (error) throw new Error(error.message)
      } else {
        await cultivoService.eliminarEvento(it.id)
      }
      cargar(); onCambio()
    } catch (err) {
      toast.error(`No se pudo borrar: ${(err as Error).message}`)
    }
  }

  const fmt = (f: string) => new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCerrar} />
      <div className="relative w-full sm:max-w-lg sm:max-h-[88vh] flex flex-col bg-[#101016] sm:rounded-xl border-y sm:border border-[#2a2a3a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1f1f2b] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-[16px] text-[#ececf1] truncate">{planta.nombre}</h2>
            <p className="text-[11px] text-[#757584] truncate">
              {planta.genetica ?? 'Sin genética'}{planta.dias_de_vida != null ? ` · día ${planta.dias_de_vida}` : ''} · {planta.fase}
            </p>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={subiendo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50">
            {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Foto</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f); e.target.value = '' }} />
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cargando ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 text-[#bef264] animate-spin mx-auto" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-2">
                <Sprout className="w-5 h-5 text-[#5c5c6b]" />
              </div>
              <p className="text-[12px] text-[#8f8f9f]">Sin eventos todavía</p>
              <p className="text-[11px] text-[#5c5c6b] mt-1">Sacá una foto o registrá riegos y podas.</p>
            </div>
          ) : (
            <ol className="relative border-l border-[#2a2a3a] ml-2">
              {items.map(it => {
                const cfg = ICONO[it.tipo] ?? (it.esCosecha ? { Ic: Scale, color: '#f59e0b' } : ICONO.Nota)
                return (
                  <li key={it.id} className="group relative pl-6 pb-5 last:pb-1">
                    <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-[#101016] border-2 flex items-center justify-center"
                      style={{ borderColor: cfg.color }}>
                      <cfg.Ic className="w-2 h-2" style={{ color: cfg.color }} />
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-semibold text-[#ececf1]">{it.esCosecha ? 'Cosecha' : it.tipo}</span>
                      <span className="text-[10.5px] text-[#5c5c6b] tabular-nums font-mono">{fmt(it.fecha)}</span>
                      <button onClick={() => borrar(it)}
                        className="ml-auto p-1 text-[#46464f] opacity-0 group-hover:opacity-100 hover:text-[#ff8a7a] rounded transition-all"
                        title="Borrar">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {it.detalle && <p className="text-[11.5px] text-[#a6a6b5] mt-0.5 leading-snug">{it.detalle}</p>}
                    {it.foto_url && (
                      <img src={it.foto_url} alt="" loading="lazy" onClick={() => setVisor(it.foto_url)}
                        className="mt-2 rounded-lg border border-[#1f1f2b] max-h-44 object-cover cursor-zoom-in" />
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Visor de foto */}
      {visor && (
        <div className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center p-4" onClick={() => setVisor(null)}>
          <img src={visor} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setVisor(null)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}
