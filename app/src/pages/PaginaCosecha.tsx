// PaginaCosecha — apartado dedicado para cargar el rinde (gramos) por variedad.
// Dos modos de carga: total por variedad (un solo número) o por planta individual.
// Ranking por gramos secos + valoración/cata. Agrega por genética client-side
// (funciona igual en modo demo y en Supabase).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Scale, Scissors, Trophy, X, Loader2, Plus, Star, Layers, Sprout, RefreshCw,
} from 'lucide-react'
import { cultivoService, type ResumenPlanta, type Cosecha } from '../lib/cultivo'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'

const SIN_GEN = 'Sin genética'

interface FilaVariedad {
  genetica: string
  plantas: ResumenPlanta[]
  pesoSeco: number
  pesoHumedo: number
  nCosechas: number
  valoraciones: number[]
}

const hoy = () => new Date().toISOString().slice(0, 10)
const prom = (vs: number[]) => (vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null)

export default function PaginaCosecha() {
  const [plantas, setPlantas] = useState<ResumenPlanta[]>([])
  const [cosechas, setCosechas] = useState<Cosecha[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState<FilaVariedad | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [ps, cs] = await Promise.all([
        cultivoService.getResumenPlantas(false), // incluye cosechadas/inactivas
        cultivoService.getCosechas(),
      ])
      setPlantas(ps)
      setCosechas(cs)
    } catch (err) {
      toast.error(`Error cargando cosecha: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Agrupa plantas por genética y suma las cosechas registradas.
  const filas = useMemo<FilaVariedad[]>(() => {
    const porGen = new Map<string, FilaVariedad>()
    for (const p of plantas) {
      const g = p.genetica ?? SIN_GEN
      let f = porGen.get(g)
      if (!f) { f = { genetica: g, plantas: [], pesoSeco: 0, pesoHumedo: 0, nCosechas: 0, valoraciones: [] }; porGen.set(g, f) }
      f.plantas.push(p)
    }
    const plantaGen = new Map(plantas.map(p => [p.id, p.genetica ?? SIN_GEN]))
    for (const c of cosechas) {
      const g = (c.planta_id && plantaGen.get(c.planta_id)) || SIN_GEN
      const f = porGen.get(g)
      if (!f) continue
      f.nCosechas++
      f.pesoSeco += c.peso_seco_g ?? 0
      f.pesoHumedo += c.peso_humedo_g ?? 0
      if (c.valoracion != null) f.valoraciones.push(c.valoracion)
    }
    return [...porGen.values()].sort((a, b) => b.pesoSeco - a.pesoSeco)
  }, [plantas, cosechas])

  const totalSeco = filas.reduce((a, f) => a + f.pesoSeco, 0)
  const totalCosechas = filas.reduce((a, f) => a + f.nCosechas, 0)
  const conRinde = filas.filter(f => f.pesoSeco > 0)
  const maxSeco = Math.max(1, ...filas.map(f => f.pesoSeco))

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Cosecha</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">Cargá los gramos que te dio cada variedad</div>
          </div>
          <div className="flex-1" />
          <button onClick={cargar} className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]" title="Refrescar">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 max-w-3xl mx-auto">
        {/* Totales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Total seco</p>
            <p className="font-display font-bold text-[22px] sm:text-[26px] text-[#ececf1] mt-1.5 leading-none tabular-nums">
              {totalSeco.toLocaleString('es-AR')} <span className="text-[14px] text-[#757584]">g</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Variedades</p>
            <p className="font-display font-bold text-[22px] sm:text-[26px] text-[#ececf1] mt-1.5 leading-none tabular-nums">{filas.length}</p>
          </div>
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Cosechas</p>
            <p className="font-display font-bold text-[22px] sm:text-[26px] text-[#ececf1] mt-1.5 leading-none tabular-nums">{totalCosechas}</p>
          </div>
        </div>

        {/* Ranking por gramos */}
        {conRinde.length > 0 && (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-[#bef264]" />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ranking por gramos secos</h3>
            </div>
            <ul className="divide-y divide-[#1f1f2b]">
              {conRinde.map((f, i) => {
                const v = prom(f.valoraciones)
                const porPlanta = f.plantas.length ? f.pesoSeco / f.plantas.length : 0
                return (
                  <li key={f.genetica} className="px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {i === 0 && <Trophy className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />}
                      <span className="text-[12.5px] font-medium text-[#ececf1] truncate">{f.genetica}</span>
                      <span className="ml-auto font-display font-bold text-[14px] text-[#d9f99d] tabular-nums">
                        {f.pesoSeco.toLocaleString('es-AR')} g
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1c1c27] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4d7c0f] to-[#a3e635]" style={{ width: `${(f.pesoSeco / maxSeco) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10.5px] text-[#757584] tabular-nums">
                      <span>{f.plantas.length} pl. · {porPlanta.toLocaleString('es-AR', { maximumFractionDigits: 0 })} g/pl.</span>
                      {f.pesoHumedo > 0 && <span>{Math.round((f.pesoSeco / f.pesoHumedo) * 100)}% seco/húmedo</span>}
                      {v != null && <span className="text-[#c4b5fd]">★ {v.toFixed(1)}/10</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Variedades para cargar */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <Layers className="w-3.5 h-3.5 text-[#a78bfa]" />
            <h3 className="font-display font-semibold text-[12.5px] text-[#c4b5fd]">Variedades en cultivo</h3>
          </div>
          {cargando ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#101016] border border-[#1f1f2b] rounded-xl animate-pulse" />)}</div>
          ) : filas.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Sprout className="w-5 h-5 text-[#5c5c6b]" /></div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin plantas cargadas</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Cargá plantas en /plantas y volvé para registrar la cosecha.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filas.map(f => (
                <div key={f.genetica} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[#ececf1] truncate">{f.genetica}</div>
                    <div className="text-[10.5px] text-[#757584] mt-0.5 tabular-nums">
                      {f.plantas.length} planta{f.plantas.length !== 1 ? 's' : ''}
                      {f.pesoSeco > 0 && <span className="text-[#a3e635]"> · {f.pesoSeco.toLocaleString('es-AR')} g cargados</span>}
                    </div>
                  </div>
                  <button onClick={() => setModal(f)} className={btnPrimario}>
                    <Plus className="w-3.5 h-3.5" /> Cargar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && <ModalCarga fila={modal} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); cargar() }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

function ModalCarga({ fila, onCerrar, onGuardado }: { fila: FilaVariedad; onCerrar: () => void; onGuardado: () => void }) {
  const [modo, setModo] = useState<'total' | 'planta'>(fila.plantas.length > 1 ? 'total' : 'planta')
  const [guardando, setGuardando] = useState(false)

  // --- estado modo total ---
  const [fecha, setFecha] = useState(hoy())
  const [seco, setSeco] = useState('')
  const [humedo, setHumedo] = useState('')
  const [valoracion, setValoracion] = useState(0)
  const [sabor, setSabor] = useState('')
  const [curado, setCurado] = useState('')

  // --- estado modo por planta (map plantaId -> {seco, humedo, val}) ---
  const [porPlanta, setPorPlanta] = useState<Record<string, { seco: string; humedo: string; val: number }>>({})
  const setPP = (id: string, k: 'seco' | 'humedo' | 'val', v: string | number) =>
    setPorPlanta(m => {
      const cur = m[id] ?? { seco: '', humedo: '', val: 0 }
      return { ...m, [id]: { ...cur, [k]: v } }
    })

  const num = (s: string) => (s.trim() === '' ? null : parseFloat(s.replace(',', '.')))

  const guardarTotal = async () => {
    const pesoSeco = num(seco)
    if (pesoSeco == null && num(humedo) == null) { toast.error('Cargá al menos el peso seco'); return }
    // Se registra en una planta representativa de la variedad (la primera).
    const rep = fila.plantas[0]
    if (!rep) { toast.error('Esta variedad no tiene plantas'); return }
    setGuardando(true)
    try {
      await cultivoService.crearCosecha({
        planta_id: rep.id, fecha,
        peso_seco_g: pesoSeco, peso_humedo_g: num(humedo),
        valoracion: valoracion || null,
        notas_sabor: sabor.trim() || null,
        notas_curado: [curado.trim() || null, `Total de variedad (${fila.plantas.length} pl.)`].filter(Boolean).join(' · '),
      })
      toast.success(`Cosecha de ${fila.genetica} registrada`)
      onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`); setGuardando(false) }
  }

  const guardarPorPlanta = async () => {
    const entradas = Object.entries(porPlanta).filter(([, v]) => num(v.seco) != null || num(v.humedo) != null)
    if (entradas.length === 0) { toast.error('Cargá el peso de al menos una planta'); return }
    setGuardando(true)
    try {
      for (const [plantaId, v] of entradas) {
        await cultivoService.crearCosecha({
          planta_id: plantaId, fecha,
          peso_seco_g: num(v.seco), peso_humedo_g: num(v.humedo),
          valoracion: v.val || null,
        })
      }
      toast.success(`${entradas.length} cosecha${entradas.length !== 1 ? 's' : ''} registrada${entradas.length !== 1 ? 's' : ''}`)
      onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`); setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl">
        <div className="sticky top-0 bg-[#101016] flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1] flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#bef264]" /> Cosecha · {fila.genetica}
          </h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Selector de modo */}
          {fila.plantas.length > 1 && (
            <div className="flex gap-1.5 p-1 rounded-lg bg-[#15151d] border border-[#2a2a3a]">
              {(['total', 'planta'] as const).map(m => (
                <button key={m} onClick={() => setModo(m)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${modo === m ? 'bg-[#a3e635]/15 text-[#d9f99d] border border-[#404d20]' : 'text-[#a6a6b5] hover:text-[#ececf1]'}`}>
                  {m === 'total' ? 'Total variedad' : 'Por planta'}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className={labelCls}>Fecha de cosecha</label>
            <input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

          {modo === 'total' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Peso seco (g)</label><input type="number" inputMode="decimal" className={inputCls} placeholder="480" value={seco} onChange={e => setSeco(e.target.value)} autoFocus /></div>
                <div><label className={labelCls}>Peso húmedo (g)</label><input type="number" inputMode="decimal" className={inputCls} placeholder="2100" value={humedo} onChange={e => setHumedo(e.target.value)} /></div>
              </div>
              <p className="text-[10.5px] text-[#757584] -mt-2">Se registra el total de las {fila.plantas.length} plantas de {fila.genetica}.</p>
              <div>
                <label className={labelCls}>Valoración</label>
                <Estrellas valor={valoracion} onChange={setValoracion} />
              </div>
              <div><label className={labelCls}>Notas de sabor / cata</label><input className={inputCls} placeholder="Cítrico, terroso, efecto relajante..." value={sabor} onChange={e => setSabor(e.target.value)} /></div>
              <div><label className={labelCls}>Notas de curado</label><input className={inputCls} placeholder="3 semanas en frascos, 62% HR..." value={curado} onChange={e => setCurado(e.target.value)} /></div>
              <button onClick={guardarTotal} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />} Guardar cosecha
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                {fila.plantas.map(p => {
                  const v = porPlanta[p.id]
                  return (
                    <div key={p.id} className="rounded-lg bg-[#15151d] border border-[#2a2a3a] p-3">
                      <div className="text-[11.5px] font-medium text-[#ececf1] truncate mb-2">
                        {p.codigo || p.nombre || 'Planta'} <span className="text-[#5c5c6b] font-normal">· {p.fase}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div><label className="block text-[9px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">Seco g</label><input type="number" inputMode="decimal" className={inputCls} placeholder="120" value={v?.seco ?? ''} onChange={e => setPP(p.id, 'seco', e.target.value)} /></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">Húmedo g</label><input type="number" inputMode="decimal" className={inputCls} placeholder="530" value={v?.humedo ?? ''} onChange={e => setPP(p.id, 'humedo', e.target.value)} /></div>
                        <div><label className="block text-[9px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">★</label>
                          <select className={inputCls} value={v?.val ?? 0} onChange={e => setPP(p.id, 'val', Number(e.target.value))}>
                            <option value={0}>—</option>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={guardarPorPlanta} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />} Guardar cosechas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Estrellas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" onClick={() => onChange(n === valor ? 0 : n)} className="p-0.5" title={`${n}/10`}>
          <Star className={`w-4 h-4 ${n <= valor ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#3a3a48]'}`} />
        </button>
      ))}
      {valor > 0 && <span className="ml-1.5 text-[11px] text-[#c4b5fd] tabular-nums">{valor}/10</span>}
    </div>
  )
}
