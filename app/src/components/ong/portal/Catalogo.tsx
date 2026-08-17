// Catálogo terapéutico: las partidas listas para dispensar.
//
// Cada tarjeta muestra tres números distintos y no uno solo, porque "quedan 200 g"
// significa cosas diferentes según dónde esté el material: lo entregado ya no
// está, lo reservado está apartado esperando un retiro, y lo disponible es lo
// único que se puede comprometer hoy.

import { useState } from 'react'
import { toast } from 'sonner'
import { Package, Plus, Pencil, Trash2, FlaskConical, AlertTriangle } from 'lucide-react'
import {
  portalService, disponibleDeLote, resumenCatalogo, PRODUCTOS_LOTE,
  type Lote, type Pedido,
} from '../../../lib/portal'
import { btnPrimario, btnSutil, btnIcono, inputFormulario } from '../../../lib/ui'

const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'

interface Genetica { id: string; nombre: string }

export function Catalogo({ lotes, pedidos, geneticas, onCambio }: {
  lotes: Lote[]
  pedidos: Pedido[]
  geneticas: Genetica[]
  onCambio: () => void
}) {
  const [editando, setEditando] = useState<Partial<Lote> | null>(null)
  const [soloActivos, setSoloActivos] = useState(true)

  const r = resumenCatalogo(lotes, pedidos)
  const visibles = soloActivos ? lotes.filter(l => l.activo !== false) : lotes

  const borrar = async (l: Lote) => {
    const conPedidos = pedidos.filter(p => p.lote_id === l.id).length
    if (conPedidos > 0) {
      toast.error(`El lote ${l.codigo} tiene ${conPedidos} reserva(s) asociada(s). Desactivalo en vez de borrarlo, así el historial no pierde el origen del material.`)
      return
    }
    if (!confirm(`¿Borrar el lote ${l.codigo}?`)) return
    try { await portalService.borrarLote(l.id); toast.success('Lote borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-3">
      <div className={card}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Catálogo terapéutico</h3>
          </div>
          <button onClick={() => setEditando({ producto: 'flor', activo: true })} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> Lote
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {[
            { l: 'Lotes activos', v: String(r.lotes) },
            { l: 'Disponible', v: `${Math.round(r.disponible)} g`, c: '#a3e635' },
            { l: 'Reservado', v: `${Math.round(r.reservado)} g`, c: '#a78bfa' },
            { l: 'Entregado', v: `${Math.round(r.entregado)} g` },
          ].map(k => (
            <div key={k.l} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
              <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium">{k.l}</p>
              <p className="font-display font-semibold text-[17px] mt-0.5" style={{ color: k.c ?? '#ececf1' }}>{k.v}</p>
            </div>
          ))}
        </div>

        {r.sinAnalisis > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/30 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24] mt-0.5 flex-shrink-0" />
            <p className="text-[11.5px] text-[#d4d4dd] leading-snug">
              {r.sinAnalisis} lote{r.sinAnalisis === 1 ? '' : 's'} sin informe cromatográfico cargado.
              La Resolución 1780 pide un análisis por cada lote producido.
            </p>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11.5px] text-[#a6a6b5] px-1">
        <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)}
          className="w-4 h-4 accent-[#a3e635]" />
        Mostrar sólo lotes activos
      </label>

      {visibles.length === 0 ? (
        <div className={`${card} text-center py-8`}>
          <Package className="w-7 h-7 text-[#2a2a3a] mx-auto" strokeWidth={1.5} />
          <p className="text-[12.5px] text-[#7d7d8e] mt-2">
            Todavía no hay lotes cargados. Un lote es una partida ya fraccionada y lista para dispensar;
            es lo que el paciente ve en el portal y lo que después figura en el comprobante.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {visibles.map(l => {
            const d = disponibleDeLote(l, pedidos)
            const pct = d.totales > 0 ? (d.disponible / d.totales) * 100 : 0
            const gen = geneticas.find(g => g.id === l.genetica_id)
            return (
              <div key={l.id} className={card}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-[13px] text-[#ececf1]">{l.codigo}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#15151d] border border-[#2a2a3a] text-[#a6a6b5]">
                        {l.producto}
                      </span>
                      {l.activo === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#15151d] text-[#7d7d8e]">inactivo</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7d7d8e] mt-1">
                      {gen?.nombre ?? 'sin genética asignada'}
                      {l.fecha_elaboracion ? ` · elaborado ${l.fecha_elaboracion}` : ''}
                    </p>
                  </div>
                  <button onClick={() => setEditando(l)} className={btnIcono} title="Editar" aria-label="Editar lote">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => borrar(l)} className={`${btnIcono} hover:text-[#ff8a7a]`} title="Borrar" aria-label="Borrar lote">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-display font-semibold text-[20px] text-[#a3e635] leading-none">
                      {Math.round(d.disponible)} <span className="text-[12px] text-[#7d7d8e] font-normal">g disponibles</span>
                    </p>
                    <p className="text-[10.5px] text-[#7d7d8e]">de {Math.round(d.totales)} g</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#15151d] overflow-hidden flex">
                    <div className="bg-[#a3e635]" style={{ width: `${pct}%` }} />
                    <div className="bg-[#a78bfa]" style={{ width: `${d.totales > 0 ? (d.reservado / d.totales) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10.5px] text-[#7d7d8e] mt-1.5">
                    {Math.round(d.reservado)} g reservados · {Math.round(d.entregado)} g entregados
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#1f1f2b] flex items-center gap-3 flex-wrap text-[11px]">
                  {l.fecha_analisis ? (
                    <span className="inline-flex items-center gap-1 text-[#a6a6b5]">
                      <FlaskConical className="w-3 h-3 text-[#a3e635]" />
                      THC {l.thc_pct ?? '—'}% · CBD {l.cbd_pct ?? '—'}%
                      {l.laboratorio ? ` · ${l.laboratorio}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#fbbf24]">
                      <AlertTriangle className="w-3 h-3" /> sin análisis de lote
                    </span>
                  )}
                  <span className="text-[#7d7d8e] ml-auto">
                    {l.aporte_por_gramo
                      ? `$${Number(l.aporte_por_gramo).toLocaleString('es-AR')}/g`
                      : 'sin aporte cargado'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <ModalLote lote={editando} geneticas={geneticas}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); onCambio() }} />
      )}
    </div>
  )
}

function ModalLote({ lote, geneticas, onCerrar, onGuardado }: {
  lote: Partial<Lote>
  geneticas: Genetica[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [f, setF] = useState<Partial<Lote>>(lote)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Lote, v: unknown) => setF(x => ({ ...x, [k]: v }))

  const guardar = async () => {
    if (!f.codigo?.trim()) { toast.error('El lote necesita un código'); return }
    if (!(Number(f.gramos_totales) > 0)) { toast.error('Poné cuántos gramos tiene el lote'); return }
    setGuardando(true)
    try {
      await portalService.guardarLote({
        ...f,
        codigo: f.codigo.trim(),
        gramos_totales: Number(f.gramos_totales),
        thc_pct: f.thc_pct != null && f.thc_pct !== ('' as unknown) ? Number(f.thc_pct) : null,
        cbd_pct: f.cbd_pct != null && f.cbd_pct !== ('' as unknown) ? Number(f.cbd_pct) : null,
        aporte_por_gramo: f.aporte_por_gramo ? Number(f.aporte_por_gramo) : null,
      })
      toast.success(f.id ? 'Lote actualizado' : 'Lote creado')
      onGuardado()
    } catch (e) { toast.error((e as Error).message) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#1f1f2b]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">
            {f.id ? `Lote ${f.codigo}` : 'Nuevo lote'}
          </h3>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Código</span>
              <input className={inputFormulario} value={f.codigo ?? ''} placeholder="LOTE-2026-08-A"
                onChange={e => set('codigo', e.target.value)} /></label>
            <label><span className={labelCls}>Producto</span>
              <select className={inputFormulario} value={f.producto ?? 'flor'} onChange={e => set('producto', e.target.value)}>
                {PRODUCTOS_LOTE.map(p => <option key={p} value={p}>{p}</option>)}
              </select></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Gramos totales</span>
              <input className={inputFormulario} type="number" inputMode="decimal" value={f.gramos_totales ?? ''}
                onChange={e => set('gramos_totales', e.target.value)} /></label>
            <label><span className={labelCls}>Aporte por gramo ($)</span>
              <input className={inputFormulario} type="number" inputMode="decimal" value={f.aporte_por_gramo ?? ''}
                onChange={e => set('aporte_por_gramo', e.target.value)} /></label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Genética</span>
              <select className={inputFormulario} value={f.genetica_id ?? ''} onChange={e => set('genetica_id', e.target.value || null)}>
                <option value="">Sin asignar</option>
                {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select></label>
            <label><span className={labelCls}>Fecha de elaboración</span>
              <input className={inputFormulario} type="date" value={f.fecha_elaboracion ?? ''}
                onChange={e => set('fecha_elaboracion', e.target.value || null)} /></label>
          </div>

          <div className="pt-2 border-t border-[#1f1f2b]">
            <p className="text-[11px] text-[#7d7d8e] mb-2">
              Informe cromatográfico. La 1780 lo pide por lote producido; los valores de la ficha de
              la genética son estimados y no lo reemplazan.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>THC %</span>
                <input className={inputFormulario} type="number" inputMode="decimal" value={f.thc_pct ?? ''}
                  onChange={e => set('thc_pct', e.target.value)} /></label>
              <label><span className={labelCls}>CBD %</span>
                <input className={inputFormulario} type="number" inputMode="decimal" value={f.cbd_pct ?? ''}
                  onChange={e => set('cbd_pct', e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label><span className={labelCls}>Laboratorio</span>
                <input className={inputFormulario} value={f.laboratorio ?? ''}
                  onChange={e => set('laboratorio', e.target.value)} /></label>
              <label><span className={labelCls}>Fecha del análisis</span>
                <input className={inputFormulario} type="date" value={f.fecha_analisis ?? ''}
                  onChange={e => set('fecha_analisis', e.target.value || null)} /></label>
            </div>
          </div>

          <label><span className={labelCls}>Notas</span>
            <input className={inputFormulario} value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} /></label>

          <label className="flex items-center gap-2 text-[12px] text-[#a6a6b5] pt-1">
            <input type="checkbox" checked={f.activo !== false} onChange={e => set('activo', e.target.checked)}
              className="w-4 h-4 accent-[#a3e635]" />
            Activo (aparece en el catálogo para reservar)
          </label>
        </div>

        <div className="px-4 py-3 border-t border-[#1f1f2b] flex gap-2">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} className={`${btnPrimario} flex-1`}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
