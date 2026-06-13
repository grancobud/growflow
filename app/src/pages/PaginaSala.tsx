// PaginaSala — tablero visual de riego, adaptado de registro-de-riego.
// Carpas dispuestas en L; cada planta es un cuadradito coloreado por dias sin riego.
// Modos: Regar (tap = riego de hoy, tap de nuevo = deshacer), Mover (planta -> slot),
// Genetica (elegis una y "pintas" plantas). Todo persiste en Supabase.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Droplets, Move, Dna, RefreshCw, Download, Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Carpa { id: string; nombre: string; medida: string; cols: number; rows: number; area: string }
const CARPAS: Carpa[] = [
  { id: 'c3', nombre: 'Carpa 3', medida: '1 × 1 m', cols: 3, rows: 3, area: 'c3' },
  { id: 'c2', nombre: 'Carpa 2', medida: '1.2 × 1.2 m', cols: 4, rows: 3, area: 'c2' },
  { id: 'c4', nombre: 'Carpa 4', medida: '1 × 1 m', cols: 3, rows: 3, area: 'c4' },
  { id: 's1', nombre: 'Sector', medida: '2 × 1 m', cols: 8, rows: 4, area: 's1' },
  { id: 'c1', nombre: 'Carpa 1', medida: '0.8 × 0.8 m', cols: 3, rows: 3, area: 'c1' },
]

const COLORES_GEN = [
  '#e6553e', '#f59e0b', '#facc15', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
  '#ec4899', '#f87171', '#a3e635', '#67e8f9', '#c4b5fd', '#ffffff',
]

const ESTADOS = {
  hoy: '#34c97a', reciente: '#e2b93b', atrasada: '#e05252', nunca: '#5a6a7a',
}

interface Planta { id: string; apodo: string | null; slot: string | null; genetica_id: string | null; activa: boolean }
interface Genetica { id: string; nombre: string }
type Modo = 'regar' | 'mover' | 'genetica'

function hoyStr() { return new Date().toLocaleDateString('en-CA') }

export default function PaginaSala() {
  const [plantas, setPlantas] = useState<Planta[]>([])
  const [geneticas, setGeneticas] = useState<Genetica[]>([])
  const [riegos, setRiegos] = useState<Record<string, string>>({}) // planta_id -> ultima fecha riego
  const [modo, setModo] = useState<Modo>('regar')
  const [genSel, setGenSel] = useState<string>('')
  const [moviendo, setMoviendo] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [modalImport, setModalImport] = useState(false)
  const [textoImport, setTextoImport] = useState('')
  const [importando, setImportando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [pl, gen, ri] = await Promise.all([
        supabase.from('plantas').select('id,apodo,slot,genetica_id,activa').eq('activa', true),
        supabase.from('geneticas').select('id,nombre').order('nombre'),
        supabase.from('resumen_plantas').select('id,ultimo_riego').eq('activa', true),
      ])
      setPlantas((pl.data ?? []) as Planta[])
      setGeneticas((gen.data ?? []) as Genetica[])
      setRiegos(Object.fromEntries((ri.data ?? []).map((r: any) => [r.id, r.ultimo_riego])))
    } catch (err) {
      toast.error(`Error cargando sala: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const porSlot = useMemo(() => {
    const m: Record<string, Planta> = {}
    for (const p of plantas) if (p.slot) m[p.slot] = p
    return m
  }, [plantas])
  const sinUbicar = useMemo(() => plantas.filter(p => !p.slot), [plantas])
  const colorGen = useCallback((gid: string | null) => {
    if (!gid) return null
    const i = geneticas.findIndex(g => g.id === gid)
    return i >= 0 ? COLORES_GEN[i % COLORES_GEN.length] : null
  }, [geneticas])

  const estadoRiego = (p: Planta) => {
    const f = riegos[p.id]
    if (!f) return 'nunca'
    const dias = Math.floor((new Date(hoyStr() + 'T00:00:00').getTime() - new Date(f + 'T00:00:00').getTime()) / 86400000)
    if (dias <= 0) return 'hoy'
    if (dias <= 2) return 'reciente'
    return 'atrasada'
  }
  const diasSinRiego = (p: Planta) => {
    const f = riegos[p.id]
    if (!f) return '—'
    const dias = Math.floor((new Date(hoyStr() + 'T00:00:00').getTime() - new Date(f + 'T00:00:00').getTime()) / 86400000)
    return dias <= 0 ? 'hoy' : `${dias}d`
  }

  const clickPlanta = async (p: Planta) => {
    if (modo === 'regar') {
      const regadaHoy = riegos[p.id] === hoyStr()
      try {
        if (regadaHoy) {
          await supabase.from('eventos').delete().eq('planta_id', p.id).eq('tipo', 'Riego').eq('fecha', hoyStr())
          const { data } = await supabase.from('resumen_plantas').select('ultimo_riego').eq('id', p.id).single()
          setRiegos(r => ({ ...r, [p.id]: (data as any)?.ultimo_riego ?? null }))
        } else {
          await supabase.from('eventos').insert({ planta_id: p.id, tipo: 'Riego', fecha: hoyStr() })
          setRiegos(r => ({ ...r, [p.id]: hoyStr() }))
        }
      } catch (err) {
        toast.error(`No se pudo registrar: ${(err as Error).message}`)
      }
    } else if (modo === 'mover') {
      setMoviendo(m => m === p.id ? null : p.id)
    } else if (modo === 'genetica') {
      if (!genSel) { toast.info('Elegí una genética primero'); return }
      const nueva = p.genetica_id === genSel ? null : genSel
      try {
        await supabase.from('plantas').update({ genetica_id: nueva }).eq('id', p.id)
        setPlantas(ps => ps.map(x => x.id === p.id ? { ...x, genetica_id: nueva } : x))
      } catch (err) {
        toast.error(`No se pudo asignar: ${(err as Error).message}`)
      }
    }
  }

  const clickSlot = async (slot: string, carpa: Carpa) => {
    if (modo !== 'mover' || !moviendo) return
    try {
      await supabase.from('plantas').update({ slot, ubicacion: carpa.nombre }).eq('id', moviendo)
      setPlantas(ps => ps.map(x => x.id === moviendo ? { ...x, slot } : x))
      setMoviendo(null)
    } catch (err) {
      toast.error(`No se pudo mover: ${(err as Error).message}`)
    }
  }

  // ----- Export / Import -----
  const exportar = async () => {
    try {
      const { data: evs } = await supabase.from('eventos')
        .select('planta_id,fecha').eq('tipo', 'Riego').order('fecha')
      const riegosPorPlanta: Record<string, string[]> = {}
      for (const e of (evs ?? []) as any[]) {
        if (!e.planta_id) continue
        ;(riegosPorPlanta[e.planta_id] = riegosPorPlanta[e.planta_id] ?? []).push(e.fecha)
      }
      const dump = {
        formato: 'growflow-sala-v1',
        exportado: new Date().toISOString(),
        geneticas: geneticas.map(g => g.nombre),
        plantas: plantas.map(p => ({
          apodo: p.apodo,
          slot: p.slot,
          genetica: geneticas.find(g => g.id === p.genetica_id)?.nombre ?? null,
          riegos: riegosPorPlanta[p.id] ?? [],
        })),
      }
      const json = JSON.stringify(dump)
      await navigator.clipboard.writeText(json)
      toast.success(`Exportado al portapapeles (${plantas.length} plantas)`)
    } catch (err) {
      toast.error(`No se pudo exportar: ${(err as Error).message}`)
    }
  }

  const importar = async () => {
    let d: any
    try { d = JSON.parse(textoImport) } catch { toast.error('Eso no es un JSON válido'); return }
    setImportando(true)
    try {
      // Normalizar ambos formatos a: [{apodo, slot, genetica, riegos:[YYYY-MM-DD]}]
      let items: { apodo: string; slot: string | null; genetica: string | null; riegos: string[] }[] = []
      if (d.plants && typeof d.plants === 'object') {
        // Formato registro-riego-v1 (localStorage de la app vieja): riegos en timestamps
        items = Object.entries(d.plants).map(([n, p]: [string, any]) => ({
          apodo: `#${n}`,
          slot: p.slot ?? null,
          genetica: p.gen ?? null,
          riegos: [...new Set((p.riegos ?? []).map((ts: number) => new Date(ts).toLocaleDateString('en-CA')))] as string[],
        }))
      } else if (d.formato === 'growflow-sala-v1' && Array.isArray(d.plantas)) {
        items = d.plantas.map((p: any) => ({
          apodo: p.apodo, slot: p.slot ?? null, genetica: p.genetica ?? null,
          riegos: [...new Set(p.riegos ?? [])] as string[],
        }))
      } else {
        toast.error('Formato no reconocido (esperaba registro-riego-v1 o growflow-sala-v1)')
        return
      }

      // Mapas actuales
      const genPorNombre = new Map(geneticas.map(g => [g.nombre.toLowerCase(), g.id]))
      const plantaPorApodo = new Map(plantas.map(p => [p.apodo ?? '', p]))
      const { data: evsExist } = await supabase.from('eventos').select('planta_id,fecha').eq('tipo', 'Riego')
      const yaRegada = new Set((evsExist ?? []).map((e: any) => `${e.planta_id}|${e.fecha}`))

      let nuevasPlantas = 0, riegosImportados = 0, genAsignadas = 0
      for (const item of items) {
        if (!item.apodo) continue
        // Genetica: buscar o crear
        let genId: string | null = null
        if (item.genetica) {
          genId = genPorNombre.get(item.genetica.toLowerCase()) ?? null
          if (!genId) {
            const { data: ng, error } = await supabase.from('geneticas')
              .insert({ nombre: item.genetica, tipo: 'Desconocido' }).select().single()
            if (error) throw new Error(error.message)
            genId = (ng as any).id
            genPorNombre.set(item.genetica.toLowerCase(), genId!)
          }
        }
        // Planta: actualizar o crear
        let planta = plantaPorApodo.get(item.apodo)
        if (planta) {
          const upd: any = {}
          if (item.slot) upd.slot = item.slot
          if (genId) upd.genetica_id = genId
          if (Object.keys(upd).length) {
            const { error } = await supabase.from('plantas').update(upd).eq('id', planta.id)
            if (error) throw new Error(error.message)
            if (genId) genAsignadas++
          }
        } else {
          const { data: np, error } = await supabase.from('plantas')
            .insert({ apodo: item.apodo, fase: 'Vegetativo', slot: item.slot, genetica_id: genId, activa: true })
            .select().single()
          if (error) throw new Error(error.message)
          planta = np as any
          plantaPorApodo.set(item.apodo, planta!)
          nuevasPlantas++
        }
        // Riegos: insertar los que falten (dedupe por planta+fecha)
        const faltantes = item.riegos.filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f) && !yaRegada.has(`${planta!.id}|${f}`))
        if (faltantes.length) {
          const { error } = await supabase.from('eventos')
            .insert(faltantes.map(f => ({ planta_id: planta!.id, tipo: 'Riego', fecha: f, mensaje_original: 'import' })))
          if (error) throw new Error(error.message)
          faltantes.forEach(f => yaRegada.add(`${planta!.id}|${f}`))
          riegosImportados += faltantes.length
        }
      }
      toast.success(`Importado: ${riegosImportados} riegos, ${genAsignadas} genéticas asignadas, ${nuevasPlantas} plantas nuevas`)
      setModalImport(false)
      setTextoImport('')
      cargar()
    } catch (err) {
      toast.error(`Error importando: ${(err as Error).message}`)
    } finally {
      setImportando(false)
    }
  }

  const regadasHoy = plantas.filter(p => riegos[p.id] === hoyStr()).length

  const renderPlanta = (p: Planta) => {
    const est = estadoRiego(p)
    const gc = colorGen(p.genetica_id)
    return (
      <button key={p.id} onClick={() => clickPlanta(p)}
        title={`${p.apodo ?? 'Planta'}${gc ? ' · ' + (geneticas.find(g => g.id === p.genetica_id)?.nombre ?? '') : ''} · riego: ${diasSinRiego(p)}`}
        className={`absolute inset-[2px] rounded-lg bg-[#1c1c27] flex flex-col items-center justify-center transition-transform active:scale-95 ${
          moviendo === p.id ? 'ring-2 ring-[#38bdf8] scale-105 z-10' : ''
        }`}
        style={{ border: `2.5px solid ${ESTADOS[est as keyof typeof ESTADOS]}` }}>
        <span className="font-display font-bold text-[13px] leading-none text-[#ececf1]">{(p.apodo ?? '?').replace('#', '')}</span>
        <span className="text-[8px] text-[#757584] mt-0.5 leading-none">{diasSinRiego(p)}</span>
        {gc && <span className="absolute top-[2px] right-[2px] w-[9px] h-[9px] rounded-full border border-black/30" style={{ background: gc }} />}
      </button>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Sala de Riego</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              <span className="text-[#34c97a] font-semibold tabular-nums">{regadasHoy}</span> / {plantas.length} regadas hoy
            </div>
          </div>
          <div className="flex-1" />
          {/* Modos */}
          <div className="flex rounded-lg border border-[#2a2a3a] overflow-hidden">
            {([['regar', Droplets, 'Regar'], ['mover', Move, 'Mover'], ['genetica', Dna, 'Genética']] as const).map(([m, Ic, lbl]) => (
              <button key={m} onClick={() => { setModo(m); setMoviendo(null) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                  modo === m ? 'bg-[#a3e635]/15 text-[#d9f99d]' : 'bg-[#15151d] text-[#757584] hover:text-[#a6a6b5]'
                }`}>
                <Ic className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{lbl}</span>
              </button>
            ))}
          </div>
          {modo === 'genetica' && (
            <select value={genSel} onChange={e => setGenSel(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11.5px] text-[#ececf1] focus:outline-none focus:border-[#a3e635]/60">
              <option value="">Elegir genética...</option>
              {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
          <button onClick={exportar}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]"
            title="Copiar todos los datos de la sala al portapapeles">
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setModalImport(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]"
            title="Pegar datos exportados (de la app vieja o de GrowFlow)">
            <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={cargar} className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]" title="Refrescar">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Leyenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 sm:px-6 pb-2.5 text-[10px] text-[#757584]">
          {[['Regada hoy', ESTADOS.hoy], ['1-2 días', ESTADOS.reciente], ['3+ días', ESTADOS.atrasada], ['Sin registro', ESTADOS.nunca]].map(([l, c]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} /> {l}
            </span>
          ))}
          <span className="text-[#5c5c6b]">· puntito de color = genética</span>
          {modo === 'mover' && <span className="text-[#38bdf8]">Modo mover: tocá una planta y después el slot destino</span>}
          {modo === 'genetica' && <span className="text-[#c4b5fd]">Modo genética: elegí una y tocá las plantas para asignarla</span>}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-5 pb-20">
        {/* Sala: apilada en mobile, en L en desktop */}
        <div className="flex flex-col items-center gap-4 lg:grid lg:justify-center lg:items-end"
          style={{ gridTemplateAreas: '"c3 c2 c4" "s1 s1 c1"' }}>
          {CARPAS.map(carpa => {
            const orden: Record<string, string> = { c1: 'order-1', c2: 'order-2', c3: 'order-3', c4: 'order-4', s1: 'order-5' }
            return (
            <div key={carpa.id} style={{ gridArea: carpa.area, maxWidth: carpa.cols * 57 + 20 }}
              className={`w-full lg:w-auto ${orden[carpa.id]} lg:order-none rounded-xl bg-[#101016] border-2 p-2.5 ${carpa.id === 's1' ? 'border-dashed border-[#2a2a3a]' : 'border-[#1f1f2b]'}`}>
              <h2 className="flex justify-between gap-3 text-[11px] font-semibold text-[#757584] mb-2">
                <span>{carpa.nombre} <span className="font-normal text-[#5c5c6b]">{carpa.medida}</span></span>
                <span className="text-[#34c97a] tabular-nums">
                  {Array.from({ length: carpa.cols * carpa.rows }).filter((_, i) => {
                    const p = porSlot[`${carpa.id}-${i}`]
                    return p && riegos[p.id] === hoyStr()
                  }).length}/{Array.from({ length: carpa.cols * carpa.rows }).filter((_, i) => porSlot[`${carpa.id}-${i}`]).length}
                </span>
              </h2>
              <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${carpa.cols}, minmax(0, 52px))` }}>
                {Array.from({ length: carpa.cols * carpa.rows }).map((_, i) => {
                  const slot = `${carpa.id}-${i}`
                  const p = porSlot[slot]
                  return (
                    <div key={slot} onClick={() => !p && clickSlot(slot, carpa)}
                      className={`relative aspect-square rounded-[9px] border border-dashed ${
                        modo === 'mover' && moviendo && !p
                          ? 'border-[#38bdf8] bg-[#38bdf8]/10 cursor-pointer'
                          : 'border-[#2a2a3a]'
                      }`}>
                      {p && renderPlanta(p)}
                    </div>
                  )
                })}
              </div>
            </div>
          )})}
        </div>

        {/* Bandeja sin ubicar */}
        {sinUbicar.length > 0 && (
          <div className="mt-5 rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 max-w-2xl mx-auto">
            <h2 className="text-[11px] font-semibold text-[#757584] mb-2">Sin ubicar ({sinUbicar.length}) — en modo mover, tocá una y después un slot libre</h2>
            <div className="flex flex-wrap gap-[5px]">
              {sinUbicar.map(p => (
                <div key={p.id} className="relative w-[52px] h-[52px]">{renderPlanta(p)}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Import */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalImport(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
              <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">Importar datos</h2>
              <button onClick={() => setModalImport(false)} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11.5px] text-[#8f8f9f] leading-relaxed">
                Pegá acá el JSON exportado. Acepta el export de GrowFlow o el localStorage de la app vieja
                (en esa app, abrí la consola con F12 y ejecutá{' '}
                <code className="font-mono text-[10.5px] text-[#c4b5fd] bg-[#15151d] px-1 py-0.5 rounded">copy(localStorage.getItem('registro-riego-v1'))</code>
                {' '}para copiarlo). Los riegos se suman sin duplicar; las genéticas y posiciones se actualizan.
              </p>
              <textarea
                autoFocus rows={8} value={textoImport}
                onChange={e => setTextoImport(e.target.value)}
                placeholder='{"plants":{"1":{"slot":"c1-0","riegos":[...]},...}}'
                className="w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11px] font-mono text-[#ececf1] placeholder-[#46464f] focus:outline-none focus:border-[#a3e635]/60 transition-colors resize-y"
              />
              <button onClick={importar} disabled={importando || !textoImport.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50">
                {importando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
