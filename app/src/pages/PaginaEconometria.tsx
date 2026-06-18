// PaginaEconometria — costos del grow.
// Tres vistas:
//  - Resumen: KPIs (valor inventario, costos fijos/variables, costo mensual y por
//    ciclo, costo por planta) calculados a partir de insumos + costos.
//  - Costos: alta/edicion de costos fijos y variables, con periodicidad y total.
//  - Insumos: calculadora del valor del inventario (cantidad x precio), editable.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Calculator, Plus, X, Loader2, Trash2, Pencil, Boxes, Landmark, Activity,
  PiggyBank, Sprout, CalendarRange, TrendingUp, Eye,
} from 'lucide-react'
import {
  econometriaService, PERIODICIDADES, CATEGORIAS_COSTO_FIJO, CATEGORIAS_COSTO_VARIABLE,
  totalCosto, mensualEquivalente, labelPeriodicidad,
  type Costo, type TipoCosto, type Periodicidad,
} from '../lib/econometria'
import { stockService, type Insumo } from '../lib/stock'
import { cultivoService } from '../lib/cultivo'
import { ModalInsumo, ModalVerInsumo } from './PaginaStockInsumos'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export default function PaginaEconometria() {
  const [tab, setTab] = useState<'resumen' | 'costos' | 'insumos'>('resumen')
  const [costos, setCostos] = useState<Costo[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [plantasActivas, setPlantasActivas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [mesesCiclo, setMesesCiclo] = useState(4)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Costo | null>(null)
  const [tipoNuevo, setTipoNuevo] = useState<TipoCosto>('fijo')
  const [verInsumo, setVerInsumo] = useState<Insumo | null>(null)
  const [editInsumo, setEditInsumo] = useState<Insumo | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [cs, ins, plantas] = await Promise.all([
        econometriaService.getCostos(),
        stockService.getInsumos(),
        cultivoService.getResumenPlantas(true),
      ])
      setCostos(cs); setInsumos(ins); setPlantasActivas(plantas.length)
    } catch (err) { toast.error(`Error cargando econometría: ${(err as Error).message}`) }
    finally { setCargando(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  // Valor del inventario: el campo precio se carga como costo TOTAL de la linea
  // (lo que se gasto en ese item), no como precio unitario, asi que se suma tal cual.
  const valorInsumos = useMemo(
    () => insumos.reduce((s, i) => s + (i.precio != null ? Number(i.precio) : 0), 0),
    [insumos],
  )
  const insumosConPrecio = useMemo(() => insumos.filter(i => i.precio != null), [insumos])

  const fijos = useMemo(() => costos.filter(c => c.tipo === 'fijo'), [costos])
  const variables = useMemo(() => costos.filter(c => c.tipo === 'variable'), [costos])

  const mensualFijos = useMemo(() => fijos.reduce((s, c) => s + mensualEquivalente(c, mesesCiclo), 0), [fijos, mesesCiclo])
  const mensualVariables = useMemo(() => variables.reduce((s, c) => s + mensualEquivalente(c, mesesCiclo), 0), [variables, mesesCiclo])
  const mensualTotal = mensualFijos + mensualVariables
  const inversionUnica = useMemo(
    () => costos.filter(c => c.periodicidad === 'unico').reduce((s, c) => s + totalCosto(c), 0),
    [costos],
  )
  const costoPorCiclo = mensualTotal * mesesCiclo
  const costoPorPlanta = plantasActivas > 0 ? costoPorCiclo / plantasActivas : 0

  const borrar = async (c: Costo) => {
    if (!window.confirm(`¿Borrar el costo "${c.nombre}"?`)) return
    try { await econometriaService.eliminarCosto(c.id); toast.success('Costo borrado'); cargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  const abrirNuevo = (tipo: TipoCosto) => { setTipoNuevo(tipo); setEdit(null); setModal(true) }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 pt-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#bef264]" /> Econometría
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {fmt(mensualTotal)}/mes · {fmt(costoPorCiclo)}/ciclo · inventario {fmt(valorInsumos)}
            </div>
          </div>
          <div className="flex-1" />
          {tab === 'costos' && (
            <div className="flex gap-2">
              <button onClick={() => abrirNuevo('fijo')} className={btnPrimario}>
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fijo</span>
              </button>
              <button onClick={() => abrirNuevo('variable')} className={btnPrimario}>
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Variable</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1 px-3 sm:px-6 pt-2">
          {([['resumen', 'Resumen', TrendingUp], ['costos', 'Costos', Landmark], ['insumos', 'Insumos', Boxes]] as const).map(([t, lbl, Ico]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${tab === t ? 'border-[#a3e635] text-[#d9f99d]' : 'border-transparent text-[#5c5c6b] hover:text-[#a6a6b5]'}`}>
              <Ico className="w-3.5 h-3.5" /> {lbl}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="px-3 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[92px] animate-pulse" />)}
        </div>
      ) : tab === 'resumen' ? (
        <div className="px-3 sm:px-6 py-4 pb-24 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Kpi icono={Activity} color="#bef264" label="Costo mensual" valor={fmt(mensualTotal)} sub={`${fmt(mensualFijos)} fijos · ${fmt(mensualVariables)} variables`} />
            <Kpi icono={CalendarRange} color="#a78bfa" label={`Costo por ciclo (${mesesCiclo}m)`} valor={fmt(costoPorCiclo)} sub={plantasActivas > 0 ? `${fmt(costoPorPlanta)} por planta` : 'sin plantas activas'} />
            <Kpi icono={Boxes} color="#38bdf8" label="Valor inventario" valor={fmt(valorInsumos)} sub={`${insumosConPrecio.length} insumos con precio`} />
            <Kpi icono={Landmark} color="#fbbf24" label="Costos fijos /mes" valor={fmt(mensualFijos)} sub={`${fijos.length} ítem${fijos.length === 1 ? '' : 's'}`} />
            <Kpi icono={TrendingUp} color="#ff8a7a" label="Costos variables /mes" valor={fmt(mensualVariables)} sub={`${variables.length} ítem${variables.length === 1 ? '' : 's'}`} />
            <Kpi icono={PiggyBank} color="#2dd4bf" label="Inversión única" valor={fmt(inversionUnica)} sub="costos marcados 'Único'" />
          </div>

          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#bef264]" />
              <span className="text-[12px] text-[#a6a6b5]">Duración estimada de un ciclo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={12} value={mesesCiclo}
                onChange={e => setMesesCiclo(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="w-16 px-2 py-1.5 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] text-center focus:outline-none focus:border-[#a3e635]/60" />
              <span className="text-[12px] text-[#5c5c6b]">meses</span>
            </div>
            <span className="text-[10.5px] text-[#5c5c6b]">Se usa para repartir los costos "por ciclo" en su equivalente mensual.</span>
          </div>

          {costos.length === 0 && (
            <div className="py-10 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Calculator className="w-5 h-5 text-[#5c5c6b]" /></div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Todavía no cargaste costos</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Andá a la pestaña Costos y agregá tus costos fijos (alquiler, luz) y variables (nutrientes, sustrato).</div>
              <button onClick={() => setTab('costos')} className={`${btnPrimario} mt-3`}><Plus className="w-3.5 h-3.5" /> Cargar costos</button>
            </div>
          )}
        </div>
      ) : tab === 'costos' ? (
        <div className="px-3 sm:px-6 py-4 pb-24 space-y-5">
          <ListaCostos titulo="Costos fijos" subtitulo="Se pagan igual produzcas o no (alquiler, luz de abono, internet)" icono={Landmark} color="#fbbf24" items={fijos} totalMensual={mensualFijos} mesesCiclo={mesesCiclo} onEdit={c => { setEdit(c); setModal(true) }} onBorrar={borrar} onNuevo={() => abrirNuevo('fijo')} />
          <ListaCostos titulo="Costos variables" subtitulo="Cambian según el cultivo (nutrientes, sustrato, agua, consumo de luz)" icono={TrendingUp} color="#ff8a7a" items={variables} totalMensual={mensualVariables} mesesCiclo={mesesCiclo} onEdit={c => { setEdit(c); setModal(true) }} onBorrar={borrar} onNuevo={() => abrirNuevo('variable')} />
        </div>
      ) : (
        <div className="px-3 sm:px-6 py-4 pb-24">
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f2b]">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Valor del inventario</h3>
              </div>
              <div className="text-[10.5px] text-[#5c5c6b]">costo total por insumo</div>
            </div>
            {insumosConPrecio.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-[12.5px] text-[#a6a6b5]">Ningún insumo tiene precio cargado.</div>
                <div className="mt-1 text-[11px] text-[#5c5c6b]">Cargá el precio de tus insumos en Stock &amp; Insumos para que sumen acá.</div>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[1fr_5rem_7rem_4.5rem] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] border-b border-[#1f1f2b]/60">
                  <div>Insumo</div><div className="text-right">Cantidad</div><div className="text-right">Costo</div><div />
                </div>
                <ul className="divide-y divide-[#1f1f2b]/60">
                  {insumosConPrecio.map(i => (
                    <li key={i.id} className="grid grid-cols-[1fr_7rem_4.5rem] sm:grid-cols-[1fr_5rem_7rem_4.5rem] gap-3 px-4 py-2.5 items-center group">
                      <div className="min-w-0">
                        <div className="text-[12.5px] text-[#ececf1] truncate">{i.nombre}</div>
                        <div className="text-[10px] text-[#5c5c6b] truncate">{i.categoria}{i.marca ? ` · ${i.marca}` : ''}</div>
                      </div>
                      <div className="hidden sm:block text-right text-[12px] text-[#a6a6b5]">{i.cantidad} {i.unidad || 'u'}</div>
                      <div className="text-right text-[12.5px] font-medium text-[#d9f99d]">{fmt(Number(i.precio))}</div>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => setVerInsumo(i)} title="Ver ficha"
                          className="p-1.5 text-[#5c5c6b] hover:text-[#38bdf8] hover:bg-[#15151d] rounded-lg transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditInsumo(i)} title="Editar ficha"
                          className="p-1.5 text-[#5c5c6b] hover:text-[#d9f99d] hover:bg-[#15151d] rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1f1f2b] bg-[#0d0d12]">
                  <span className="text-[12px] text-[#a6a6b5]">Total inventario ({insumosConPrecio.length} insumos)</span>
                  <span className="font-display font-bold text-[15px] text-[#bef264]">{fmt(valorInsumos)}</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-[10.5px] text-[#5c5c6b]">Los precios se editan en Stock &amp; Insumos (ficha de cada insumo). Acá solo se suman.</p>
        </div>
      )}

      {modal && <ModalCosto costo={edit} tipoInicial={tipoNuevo} onCerrar={() => setModal(false)} onGuardado={() => { setModal(false); cargar() }} />}
      {verInsumo && <ModalVerInsumo insumo={verInsumo} onCerrar={() => setVerInsumo(null)} />}
      {editInsumo && <ModalInsumo insumo={editInsumo} onCerrar={() => setEditInsumo(null)} onGuardado={() => { setEditInsumo(null); cargar() }} />}
    </div>
  )
}

function Kpi({ icono: Ico, color, label, valor, sub }: { icono: any; color: string; label: string; valor: string; sub: string }) {
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1f`, border: `1px solid ${color}40` }}>
          <Ico className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] leading-tight">{label}</div>
      </div>
      <div className="mt-2 font-display font-bold text-[18px] text-[#ececf1] leading-none">{valor}</div>
      <div className="mt-1.5 text-[10.5px] text-[#5c5c6b] truncate">{sub}</div>
    </div>
  )
}

function ListaCostos({ titulo, subtitulo, icono: Ico, color, items, totalMensual, mesesCiclo, onEdit, onBorrar, onNuevo }: {
  titulo: string; subtitulo: string; icono: any; color: string; items: Costo[]; totalMensual: number; mesesCiclo: number
  onEdit: (c: Costo) => void; onBorrar: (c: Costo) => void; onNuevo: () => void
}) {
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f2b]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1f`, border: `1px solid ${color}40` }}>
          <Ico className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">{titulo}</h3>
          <div className="text-[10.5px] text-[#5c5c6b] truncate">{subtitulo}</div>
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-[14px]" style={{ color }}>{fmt(totalMensual)}</div>
          <div className="text-[9.5px] text-[#5c5c6b] uppercase tracking-[0.1em]">por mes</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-7 text-center">
          <div className="text-[12px] text-[#a6a6b5]">Sin {titulo.toLowerCase()} cargados.</div>
          <button onClick={onNuevo} className={`${btnSutil} mt-2.5`}><Plus className="w-3.5 h-3.5" /> Agregar</button>
        </div>
      ) : (
        <ul className="divide-y divide-[#1f1f2b]/60">
          {items.map(c => {
            const total = totalCosto(c)
            const mens = mensualEquivalente(c, mesesCiclo)
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] text-[#ececf1] truncate">{c.nombre}</span>
                    {c.categoria && <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#15151d] border border-[#2a2a3a] text-[#a6a6b5]">{c.categoria}</span>}
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#15151d] border border-[#2a2a3a] text-[#5c5c6b]">{labelPeriodicidad(c.periodicidad)}</span>
                  </div>
                  {c.notas && <div className="mt-0.5 text-[10.5px] text-[#5c5c6b] truncate">{c.notas}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[12.5px] font-medium text-[#ececf1]">{fmt(total)}</div>
                  {c.periodicidad !== 'mensual' && c.periodicidad !== 'unico' && (
                    <div className="text-[9.5px] text-[#5c5c6b]">≈ {fmt(mens)}/mes</div>
                  )}
                  {(c.cantidad ?? 1) !== 1 && <div className="text-[9.5px] text-[#5c5c6b]">{c.cantidad} × {fmt(Number(c.monto))}</div>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(c)} className="p-1.5 text-[#5c5c6b] hover:text-[#d9f99d] hover:bg-[#15151d] rounded-lg transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onBorrar(c)} className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ModalCosto({ costo, tipoInicial, onCerrar, onGuardado }: { costo: Costo | null; tipoInicial: TipoCosto; onCerrar: () => void; onGuardado: () => void }) {
  const [f, setF] = useState<Partial<Costo>>(costo ?? { tipo: tipoInicial, periodicidad: 'mensual', monto: 0, cantidad: 1 })
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Costo, v: any) => setF(prev => ({ ...prev, [k]: v }))
  const cats = (f.tipo === 'variable' ? CATEGORIAS_COSTO_VARIABLE : CATEGORIAS_COSTO_FIJO)

  const guardar = async () => {
    if (!f.nombre?.trim()) { toast.error('Poné un nombre'); return }
    setGuardando(true)
    try {
      const payload: Partial<Costo> = {
        nombre: f.nombre!.trim(), tipo: f.tipo || 'fijo', categoria: f.categoria || null,
        monto: Number(f.monto ?? 0), periodicidad: (f.periodicidad as Periodicidad) || 'mensual',
        cantidad: f.cantidad != null && f.cantidad !== ('' as any) ? Number(f.cantidad) : 1,
        notas: f.notas || null,
      }
      if (costo) await econometriaService.actualizarCosto(costo.id, payload)
      else await econometriaService.crearCosto(payload)
      toast.success(costo ? 'Costo actualizado' : 'Costo agregado'); onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1]">{costo ? 'Editar costo' : 'Nuevo costo'}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['fijo', 'variable'] as const).map(t => (
              <button key={t} onClick={() => set('tipo', t)}
                className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors ${f.tipo === t ? 'border-[#a3e635]/50 bg-[#a3e635]/10 text-[#d9f99d]' : 'border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5] hover:text-[#ececf1]'}`}>
                {t === 'fijo' ? 'Costo fijo' : 'Costo variable'}
              </button>
            ))}
          </div>
          <div>
            <label className={labelCls}>Nombre *</label>
            <input className={inputCls} value={f.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder={f.tipo === 'variable' ? 'Ej: Nutrientes Ryanodine' : 'Ej: Alquiler del local'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoría</label>
              <input className={inputCls} list="cats-costo" value={f.categoria ?? ''} onChange={e => set('categoria', e.target.value)} placeholder="Opcional" />
              <datalist id="cats-costo">{cats.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Periodicidad</label>
              <select className={inputCls} value={f.periodicidad} onChange={e => set('periodicidad', e.target.value)}>
                {PERIODICIDADES.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Monto ($)</label><input type="number" className={inputCls} value={f.monto ?? ''} onChange={e => set('monto', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" /></div>
            <div><label className={labelCls}>Cantidad</label><input type="number" className={inputCls} value={f.cantidad ?? 1} onChange={e => set('cantidad', e.target.value === '' ? '' : Number(e.target.value))} placeholder="1" /></div>
          </div>
          <div><label className={labelCls}>Notas</label><textarea rows={2} className={inputCls + ' resize-none'} value={f.notas ?? ''} onChange={e => set('notas', e.target.value)} placeholder="Ej: incluye expensas / por bolsa de 50L" /></div>
          <p className="text-[10.5px] text-[#5c5c6b]">El total de la fila es monto × cantidad. Los costos "por ciclo" se reparten en su equivalente mensual según la duración del ciclo que pongas en Resumen.</p>
        </div>
        <div className="sticky bottom-0 bg-[#0d0d12] border-t border-[#1f1f2b] px-4 py-3 flex justify-end gap-2">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} className={btnPrimario}>{guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{costo ? 'Guardar' : 'Agregar'}</button>
        </div>
      </div>
    </div>
  )
}
