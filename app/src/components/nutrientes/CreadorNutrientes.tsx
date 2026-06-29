import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical, Beaker, Droplets, ChevronDown, Sparkles, AlertTriangle,
  Save, FolderOpen, Trash2, Calculator, FlaskRound, Layers, Scale, Plus, DollarSign,
  Droplet, GitCompare, Package, ShieldCheck, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SALES_DEFECTO, ELEMENTOS, PRESETS, calcularReceta, ecAprox, nTotal,
  calcularConcentrados, calcularRatios, calcularCosto,
  redondearBalanza, AGENTES_PH, calcularAjustePH, oxidoAElemental, OXIDOS,
  recomendarEstabilizantes, esComercial, marcaDe, perfilDesdeProducto,
  perfilesNutrientesService, sustanciasService, inventarioService, aplicarInventario,
  compatibilidad, estadoRango, RANGOS_FLORA_COCO,
  type ElementKey, type Perfil, type PerfilGuardado, type Sal, type Bidon,
  type Resultado, type ResultadoSal, type BidonConcentrado, type Ratios,
  type InventarioItem, type RangoPerfil,
} from '../../lib/nutrientes'

type SetSet = React.Dispatch<React.SetStateAction<Set<string>>>
interface CalcTabProps {
  perfil: Perfil; presetId: string; setPreset: (id: string) => void; setPpm: (k: ElementKey, v: number) => void
  macros: Elem[]; micros: Elem[]; res: Resultado; ec: number; salesTodas: Sal[]; activas: Set<string>; setActivas: SetSet
  guardados: PerfilGuardado[]; nombreNuevo: string; setNombreNuevo: (v: string) => void; guardando: boolean
  guardarPerfil: () => void; cargarPerfil: (g: PerfilGuardado) => void; borrarPerfil: (g: PerfilGuardado) => void
  resolucion: number; rangos: RangoPerfil; setRangos: React.Dispatch<React.SetStateAction<RangoPerfil>>
}
type CostoResultado = { porLitro: number; detalle: { sal: Sal; costo: number }[] }

type SubTab = 'calc' | 'clonar' | 'sustancias' | 'agua' | 'concentrados' | 'estab' | 'ratios' | 'ph' | 'comparar'

const SUBTABS: { id: SubTab; label: string; icon: typeof Calculator }[] = [
  { id: 'calc', label: 'Calculadora', icon: Calculator },
  { id: 'clonar', label: 'Clonar marca', icon: Copy },
  { id: 'sustancias', label: 'Sustancias', icon: FlaskRound },
  { id: 'agua', label: 'Agua', icon: Droplets },
  { id: 'concentrados', label: 'Concentrados A/B', icon: Layers },
  { id: 'estab', label: 'Estabilizantes', icon: ShieldCheck },
  { id: 'ph', label: 'Ajuste de pH', icon: Droplet },
  { id: 'comparar', label: 'Comparar', icon: GitCompare },
  { id: 'ratios', label: 'Ratios y costo', icon: Scale },
]

const BIDON_INFO: Record<Bidon, { label: string; color: string }> = {
  A: { label: 'Bidón A · Calcio', color: '#a78bfa' },
  B: { label: 'Bidón B · Base/Sulfatos', color: '#a3e635' },
  C: { label: 'Bidón C · Micros', color: '#60a5fa' },
}

function colorDelta(logrado: number, obj: number) {
  if (obj <= 0) return { c: '#757584', bg: 'transparent' }
  const r = logrado / obj
  if (r < 0.85) return { c: '#60a5fa', bg: 'rgba(96,165,250,0.08)' }
  if (r > 1.15) return { c: '#ff8a7a', bg: 'rgba(255,138,122,0.08)' }
  return { c: '#d9f99d', bg: 'rgba(63,176,116,0.10)' }
}

const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-4'
const inp = 'w-full bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-1 text-[12px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none'

export default function CreadorNutrientes() {
  const [sub, setSub] = useState<SubTab>('calc')

  // estado compartido
  const [perfil, setPerfil] = useState<Perfil>(PRESETS[2].perfil)
  const [presetId, setPresetId] = useState(PRESETS[2].id)
  const [agua, setAgua] = useState<Perfil>({})
  const [activas, setActivas] = useState<Set<string>>(new Set([
    'cano3_ag', 'kno3', 'mkp', 'k2so4', 'epsom', 'cagluc', 'yeso', 'khco3',
    'feeddha', 'mnso4', 'znso4', 'cuso4', 'boric', 'namolib',
  ]))
  const [customs, setCustoms] = useState<Sal[]>([])
  const [inventario, setInventario] = useState<Record<string, InventarioItem>>({})
  const [rangos, setRangos] = useState<RangoPerfil>(RANGOS_FLORA_COCO)
  const [guardados, setGuardados] = useState<PerfilGuardado[]>([])
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [factor, setFactor] = useState(100)
  const [volBidon, setVolBidon] = useState(1)
  const [resolucion, setResolucion] = useState(0) // resolución de balanza (g); 0 = sin redondeo

  const salesTodas = useMemo(() => aplicarInventario([...SALES_DEFECTO, ...customs], inventario), [customs, inventario])
  const salesDisp = useMemo(() => salesTodas.filter(s => activas.has(s.id)), [salesTodas, activas])
  const res = useMemo(() => calcularReceta(perfil, salesDisp, agua), [perfil, salesDisp, agua])
  const ec = useMemo(() => ecAprox(res.ppmLogrado), [res])
  const concentrados = useMemo(() => calcularConcentrados(res.dosis, factor, volBidon), [res, factor, volBidon])
  const ratios = useMemo(() => calcularRatios(res.ppmLogrado), [res])
  const costo = useMemo(() => calcularCosto(res.dosis), [res])

  const macros = ELEMENTOS.filter(e => e.grupo === 'macro')
  const micros = ELEMENTOS.filter(e => e.grupo === 'micro')
  const otros = ELEMENTOS.filter(e => e.grupo === 'otro')

  async function recargarGuardados() {
    try { setGuardados(await perfilesNutrientesService.list()) } catch { /* offline */ }
  }
  async function recargarCustoms() {
    try { setCustoms(await sustanciasService.list()) } catch { /* offline */ }
  }
  async function recargarInventario() {
    try { setInventario(await inventarioService.list()) } catch { /* offline */ }
  }
  useEffect(() => { recargarGuardados(); recargarCustoms(); recargarInventario() }, [])

  function setPreset(id: string) {
    const p = PRESETS.find(x => x.id === id)
    if (p) { setPerfil({ ...p.perfil }); setPresetId(id) }
  }
  function setPpm(k: ElementKey, v: number) { setPerfil(prev => ({ ...prev, [k]: v })); setPresetId('') }

  async function guardarPerfil() {
    const nombre = nombreNuevo.trim()
    if (!nombre) { toast.error('Poné un nombre para el perfil'); return }
    setGuardando(true)
    try {
      await perfilesNutrientesService.crear({ nombre, perfil, agua, sales: [...activas], rangos })
      setNombreNuevo(''); await recargarGuardados(); toast.success(`Perfil "${nombre}" guardado`)
    } catch (e) { toast.error('No se pudo guardar: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setGuardando(false) }
  }
  function cargarPerfil(g: PerfilGuardado) {
    setPerfil({ ...g.perfil }); setAgua({ ...(g.agua ?? {}) })
    if (g.sales?.length) setActivas(new Set(g.sales))
    if (g.rangos && Object.keys(g.rangos).length) setRangos({ ...g.rangos })
    setPresetId(''); toast.success(`Cargado: ${g.nombre}`)
  }
  async function borrarPerfil(g: PerfilGuardado) {
    try { await perfilesNutrientesService.eliminar(g.id); await recargarGuardados(); toast.success('Perfil eliminado') }
    catch (e) { toast.error('No se pudo eliminar: ' + (e instanceof Error ? e.message : String(e))) }
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap border-b border-[#1f1f2b] -mt-1">
        {SUBTABS.map(t => {
          const Icon = t.icon, on = sub === t.id
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors ${
                on ? 'border-[#a3e635] text-[#d9f99d]' : 'border-transparent text-[#8f8f9f] hover:text-[#d4d4dd]'
              }`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} /> {t.label}
            </button>
          )
        })}
      </div>

      {sub === 'calc' && (
        <CalcTab {...{ perfil, presetId, setPreset, setPpm, macros, micros, res, ec, salesTodas, activas, setActivas,
          guardados, nombreNuevo, setNombreNuevo, guardando, guardarPerfil, cargarPerfil, borrarPerfil, resolucion,
          rangos, setRangos }} />
      )}
      {sub === 'sustancias' && (
        <SustanciasTab {...{ salesTodas, activas, setActivas, recargarCustoms, inventario, recargarInventario }} />
      )}
      {sub === 'agua' && (
        <AguaTab {...{ agua, setAgua, macros, micros, otros }} />
      )}
      {sub === 'concentrados' && (
        <ConcentradosTab {...{ concentrados, factor, setFactor, volBidon, setVolBidon, resolucion, setResolucion, dosisCount: res.dosis.length }} />
      )}
      {sub === 'clonar' && (
        <ClonarTab productos={salesTodas.filter(esComercial)} onUsar={(p) => { setPerfil(p); setPresetId(''); setSub('calc') }} />
      )}
      {sub === 'estab' && (
        <EstabilizantesTab dosis={res.dosis} />
      )}
      {sub === 'ph' && (
        <PHTab agua={agua} />
      )}
      {sub === 'comparar' && (
        <CompararTab guardados={guardados} />
      )}
      {sub === 'ratios' && (
        <RatiosTab {...{ ratios, res, costo }} />
      )}
    </div>
  )
}

// ===================== CALCULADORA =====================
function CalcTab(p: CalcTabProps) {
  const { perfil, presetId, setPreset, setPpm, macros, micros, res, ec, salesTodas, activas, setActivas,
    guardados, nombreNuevo, setNombreNuevo, guardando, guardarPerfil, cargarPerfil, borrarPerfil, resolucion,
    rangos, setRangos } = p
  const [editarRangos, setEditarRangos] = useState(false)
  const setRango = (k: ElementKey, campo: 'min' | 'max', v: number) =>
    setRangos(prev => ({ ...prev, [k]: { min: prev[k]?.min ?? 0, max: prev[k]?.max ?? 0, [campo]: v } }))

  const porBidon = (['A', 'B', 'C'] as Bidon[]).map(b => ({
    bidon: b, items: res.dosis.filter((d: ResultadoSal) => d.sal.bidon === b),
  })).filter(g => g.items.length > 0)
  const nLog = nTotal(res.ppmLogrado)

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className={card}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Perfil objetivo</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(pr => (
            <button key={pr.id} onClick={() => setPreset(pr.id)} title={pr.desc}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                presetId === pr.id ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]'
                  : 'bg-[#15151d] border border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
              }`}>{pr.nombre}</button>
          ))}
        </div>
      </div>

      {/* Guardar/cargar */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Save className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Mis perfiles guardados</h3>
          <span className="ml-auto text-[10px] text-[#5c5c6b]">{guardados.length} guardados</span>
        </div>
        <div className="flex gap-2">
          <input value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') guardarPerfil() }}
            placeholder="Nombre del perfil (ej. Mi flora coco)"
            className="flex-1 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5 text-[12px] text-[#ececf1] placeholder:text-[#4a4a58] focus:border-[#404d20] outline-none" />
          <button onClick={guardarPerfil} disabled={guardando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" strokeWidth={1.8} /> Guardar
          </button>
        </div>
        {guardados.length > 0 && (
          <div className="mt-3 space-y-1">
            {guardados.map((g: PerfilGuardado) => (
              <div key={g.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{g.nombre}</span>
                <button onClick={() => cargarPerfil(g)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] text-[#8f8f9f] hover:text-[#d9f99d] hover:bg-[#a3e635]/10 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.8} /> Cargar
                </button>
                <button onClick={() => borrarPerfil(g)} className="p-1 rounded text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#ff8a7a]/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Objetivo */}
        <div className={card}>
          <div className="flex items-center gap-2 mb-3">
            <Beaker className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Objetivo (ppm)</h3>
            <span className="ml-auto text-[10px] text-[#5c5c6b]">N total: {nLog.toFixed(0)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {macros.map((e: Elem) => (
              <label key={e.key} className="block">
                <span className="text-[10px] text-[#8f8f9f]">{e.label}</span>
                <input type="number" min={0} step={1} value={perfil[e.key] ?? 0}
                  onChange={ev => setPpm(e.key, +ev.target.value)} className={inp} />
              </label>
            ))}
          </div>
          <details className="mt-3 group" open>
            <summary className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] cursor-pointer flex items-center gap-1">
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" /> Micros (ppm)
            </summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {micros.map((e: Elem) => (
                <label key={e.key} className="block">
                  <span className="text-[10px] text-[#8f8f9f]">{e.key}</span>
                  <input type="number" min={0} step={0.1} value={perfil[e.key] ?? 0}
                    onChange={ev => setPpm(e.key, +ev.target.value)} className={inp} />
                </label>
              ))}
            </div>
          </details>
        </div>

        {/* Receta */}
        <div className={card}>
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Receta · g/L</h3>
            <span className="ml-auto text-[11px] font-mono tabular-nums px-2 py-0.5 rounded border border-[#404d20] bg-[#a3e635]/10 text-[#d9f99d]">EC ≈ {ec}</span>
          </div>
          {porBidon.length === 0 ? (
            <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Sin sales que cubran el objetivo. Activá más en "Sustancias".</p>
          ) : (
            <div className="space-y-3">
              {porBidon.map(g => (
                <div key={g.bidon}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1.5" style={{ color: BIDON_INFO[g.bidon].color }}>{BIDON_INFO[g.bidon].label}</p>
                  <div className="space-y-1">
                    {g.items.map((d: ResultadoSal) => {
                      const gv = resolucion > 0 ? redondearBalanza(d.gramosPorL, resolucion) : d.gramosPorL
                      return (
                      <div key={d.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                        <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{d.sal.nombre}</span>
                        <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                          {gv >= 0.01 ? gv.toFixed(2) : gv.toFixed(4)} <span className="text-[#5c5c6b] font-normal">g/L</span>
                        </span>
                      </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ppm logrado vs objetivo + rango */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Logrado vs objetivo y rango</h3>
          <button onClick={() => setEditarRangos(v => !v)} className="ml-auto text-[10px] px-2 py-0.5 rounded border border-[#1f1f2b] text-[#8f8f9f] hover:text-[#d9f99d] hover:border-[#404d20] transition-colors">
            {editarRangos ? 'Listo' : 'Editar rangos'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#1f1f2b]">
              {['Elemento', 'Objetivo', 'Logrado', 'Rango min–max', 'Estado'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#5c5c6b] font-medium">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ELEMENTOS.filter(e => (perfil[e.key] ?? 0) > 0 || (res.ppmLogrado[e.key] ?? 0) > 0 || rangos[e.key]).map(e => {
                const obj = perfil[e.key] ?? 0, log = res.ppmLogrado[e.key] ?? 0
                const rg = rangos[e.key]
                const est = estadoRango(log, rg)
                const col = est === 'ok' ? '#d9f99d' : est === 'bajo' ? '#60a5fa' : est === 'alto' ? '#ff8a7a' : colorDelta(log, obj).c
                const bg = est === 'ok' ? 'rgba(63,176,116,0.10)' : est === 'bajo' ? 'rgba(96,165,250,0.08)' : est === 'alto' ? 'rgba(255,138,122,0.08)' : 'transparent'
                return (
                  <tr key={e.key} className="border-b border-[#1f1f2b] last:border-0" style={{ background: bg }}>
                    <td className="px-3 py-1.5 font-medium text-[#d4d4dd]">{e.label}</td>
                    <td className="px-3 py-1.5 text-[#a6a6b5] font-mono tabular-nums">{obj || '—'}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums font-bold" style={{ color: col }}>{log}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums text-[#a6a6b5]">
                      {editarRangos ? (
                        <span className="flex items-center gap-1">
                          <input type="number" value={rg?.min ?? 0} onChange={ev => setRango(e.key, 'min', +ev.target.value)} className="w-14 bg-[#101016] border border-[#1f1f2b] rounded px-1 py-0.5 text-[10.5px] font-mono" />
                          <span className="text-[#5c5c6b]">–</span>
                          <input type="number" value={rg?.max ?? 0} onChange={ev => setRango(e.key, 'max', +ev.target.value)} className="w-14 bg-[#101016] border border-[#1f1f2b] rounded px-1 py-0.5 text-[10.5px] font-mono" />
                        </span>
                      ) : rg ? `${rg.min}–${rg.max}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-[10px] font-medium" style={{ color: col }}>
                      {est === 'ok' ? 'EN RANGO' : est === 'bajo' ? 'bajo' : est === 'alto' ? 'alto' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SugerenciaSalesActivas salesTodas={salesTodas} activas={activas} setActivas={setActivas} />
    </div>
  )
}

function SugerenciaSalesActivas({ salesTodas, activas, setActivas }: { salesTodas: Sal[]; activas: Set<string>; setActivas: SetSet }) {
  return (
    <p className="text-[10px] text-[#5c5c6b] px-1">
      {activas.size} sustancias activas de {salesTodas.length}. Gestionalas en la pestaña "Sustancias".
      Solver NNLS · EC estimada (escala 500). Verificá pH 5.8–6.2 en coco. Inspirado en HydroBuddy (D. Fernández).
      {activas.size === 0 && <button onClick={() => setActivas(new Set(salesTodas.map((s: Sal) => s.id)))} className="ml-1 text-[#a3e635] underline">activar todas</button>}
    </p>
  )
}

// ===================== SUSTANCIAS =====================
function SustanciasTab({ salesTodas, activas, setActivas, recargarCustoms, recargarInventario }: { salesTodas: Sal[]; activas: Set<string>; setActivas: SetSet; recargarCustoms: () => void; recargarInventario: () => void }) {
  const [form, setForm] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <FlaskRound className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Sustancias disponibles</h3>
          <span className="ml-auto text-[10px] text-[#5c5c6b]">{activas.size}/{salesTodas.length} activas</span>
          <button onClick={() => setForm(f => !f)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        </div>
        {form && <NuevaSustancia onClose={() => setForm(false)} onSaved={recargarCustoms} />}
        <div className="space-y-1.5 mt-3">
          {salesTodas.map((s: Sal) => {
            const on = activas.has(s.id)
            const open = abierta === s.id
            return (
              <div key={s.id} className={`rounded-md border transition-colors ${on ? 'bg-[#a3e635]/08 border-[#404d20]' : 'bg-[#15151d] border-[#1f1f2b]'}`}>
                <div className="flex items-start gap-2 px-2.5 py-1.5">
                  <button onClick={() => setActivas((prev: Set<string>) => { const n = new Set(prev); if (on) n.delete(s.id); else n.add(s.id); return n })}
                    className={`mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border ${on ? 'bg-[#a3e635] border-[#a3e635]' : 'border-[#3a3a4a]'}`} />
                  <button onClick={() => setAbierta(open ? null : s.id)} className="min-w-0 flex-1 text-left">
                    <span className={`block text-[11.5px] font-medium ${on ? 'text-[#d9f99d]' : 'text-[#a6a6b5]'}`}>
                      {s.nombre} {s.formula && <span className="text-[#5c5c6b] font-normal">{s.formula}</span>}
                      {s.custom && <span className="ml-1 text-[9px] px-1 rounded bg-[#a78bfa]/20 text-[#c4b5fd]">propia</span>}
                      {s.aditivo && <span className="ml-1 text-[9px] px-1 rounded bg-[#bef264]/15 text-[#bef264]">aditivo</span>}
                      {s.stock != null && s.stock > 0 && <span className="ml-1 text-[9px] px-1 rounded bg-[#60a5fa]/20 text-[#93c5fd]">stock {s.stock}{s.stockUnidad ?? ''}</span>}
                      {s.costoKg != null && s.costoKg > 0 && <span className="ml-1 text-[9px] px-1 rounded bg-[#bef264]/15 text-[#bef264]">${s.costoKg}/kg</span>}
                    </span>
                    <span className="block text-[10px] text-[#5c5c6b] mt-0.5 line-clamp-2">{s.descripcion ?? s.nota ?? 'Sin descripción.'}</span>
                  </button>
                  <ChevronDown className={`w-4 h-4 mt-0.5 text-[#5c5c6b] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
                {open && <FichaSal sal={s} onSaved={recargarInventario} onDelete={recargarCustoms} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FichaSal({ sal, onSaved, onDelete }: { sal: Sal; onSaved: () => void; onDelete: () => void }) {
  const [costo, setCosto] = useState(sal.costoKg ?? 0)
  const [stock, setStock] = useState(sal.stock ?? 0)
  const [unidad, setUnidad] = useState(sal.stockUnidad ?? 'kg')
  const [nota, setNota] = useState(sal.nota ?? '')
  const [saving, setSaving] = useState(false)

  const comp = Object.entries(sal.comp).filter(([, v]) => v && v > 0)
    .map(([k, v]) => `${k} ${(v * 100).toFixed(v < 0.01 ? 2 : 1)}%`).join(' · ')

  async function guardarFicha() {
    setSaving(true)
    try {
      await inventarioService.guardar({ sal_id: sal.id, costo_kg: costo || null, stock: stock || null, unidad: unidad || null, nota: nota || null })
      toast.success('Ficha guardada'); onSaved()
    } catch (e) { toast.error('No se pudo: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setSaving(false) }
  }

  return (
    <div className="border-t border-[#1f1f2b] px-3 py-3 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">Qué es / para qué sirve</p>
        <p className="text-[11px] text-[#c4c4d0]">{sal.descripcion ?? 'Sin descripción.'}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">Compatibilidad de mezcla</p>
        <p className="text-[11px] text-[#c4c4d0]">{compatibilidad(sal)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1">Composición</p>
        <p className="text-[11px] text-[#a6a6b5] font-mono">{comp || '—'} <span className="text-[#5c5c6b]">· bidón {sal.bidon}{sal.liquido ? ' · líquido' : ''}</span></p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-1.5">Mi inventario (editable)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="text-[10px] text-[#8f8f9f]">Costo/kg (ARS)
            <input type="number" min={0} value={costo} onChange={e => setCosto(+e.target.value)} className={`${inp} mt-0.5`} /></label>
          <label className="text-[10px] text-[#8f8f9f]">Stock que tengo
            <input type="number" min={0} step={0.1} value={stock} onChange={e => setStock(+e.target.value)} className={`${inp} mt-0.5`} /></label>
          <label className="text-[10px] text-[#8f8f9f]">Unidad
            <select value={unidad} onChange={e => setUnidad(e.target.value)} className={`${inp} mt-0.5`}>
              {['kg', 'g', 'L', 'mL', 'u'].map(u => <option key={u} value={u}>{u}</option>)}
            </select></label>
          <label className="text-[10px] text-[#8f8f9f] col-span-2 sm:col-span-1">Nota personal
            <input value={nota} onChange={e => setNota(e.target.value)} className={`${inp.replace('font-mono tabular-nums', '')} mt-0.5`} /></label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        {sal.custom && (
          <button onClick={async () => { try { await sustanciasService.eliminar(sal.id); await onDelete(); toast.success('Sustancia eliminada') } catch (e) { toast.error(String(e)) } }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#ff8a7a]/10">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        )}
        <button onClick={guardarFicha} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> Guardar ficha
        </button>
      </div>
    </div>
  )
}

function NuevaSustancia({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('')
  const [formula, setFormula] = useState('')
  const [bidon, setBidon] = useState<Bidon>('B')
  const [liquido, setLiquido] = useState(false)
  const [densidad, setDensidad] = useState(1)
  const [costoKg, setCostoKg] = useState(0)
  const [comp, setComp] = useState<Record<string, number>>({})
  const [comercial, setComercial] = useState(false)
  const [saving, setSaving] = useState(false)

  const oxideKeys = new Set(OXIDOS.map(o => o.key))
  const labelDe = (k: ElementKey) => comercial && oxideKeys.has(k) ? (OXIDOS.find(o => o.key === k)!.label) : k

  async function guardar() {
    if (!nombre.trim()) { toast.error('Falta el nombre'); return }
    let compFrac: Partial<Record<ElementKey, number>> = {}
    if (comercial) {
      // entrada en óxidos (etiqueta comercial) → elemental
      const raw: Partial<Record<ElementKey, number>> = {}
      for (const e of ELEMENTOS) { const v = comp[e.key]; if (v) raw[e.key] = v }
      compFrac = oxidoAElemental(raw)
    } else {
      for (const e of ELEMENTOS) { const v = comp[e.key]; if (v) compFrac[e.key] = v / 100 } // W/W% → fracción
    }
    if (Object.keys(compFrac).length === 0) { toast.error('Cargá al menos un elemento'); return }
    setSaving(true)
    try {
      await sustanciasService.crear({ nombre: nombre.trim(), formula: formula.trim() || undefined, comp: compFrac, bidon, liquido, densidad: liquido ? densidad : null, costo_kg: costoKg || null })
      toast.success('Sustancia agregada'); onSaved(); onClose()
    } catch (e) { toast.error('No se pudo: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-lg bg-[#15151d] border border-[#404d20] p-3 mb-2 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-[#d9f99d] font-medium">Nueva sustancia — composición en {comercial ? 'óxidos (etiqueta)' : '%W/W'}</p>
        <label className="flex items-center gap-1.5 text-[11px] text-[#c4b5fd]">
          <input type="checkbox" checked={comercial} onChange={e => setComercial(e.target.checked)} className="accent-[#a78bfa]" />
          <Package className="w-3.5 h-3.5" /> Cargar desde etiqueta comercial (óxidos)
        </label>
      </div>
      {comercial && <p className="text-[10px] text-[#757584]">Cargá los números tal cual la etiqueta (N, P₂O₅, K₂O, CaO, MgO, SO₃). Se convierten a elemental solos. Ej: tu Ryanodine Maikro/Calcis.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block col-span-2"><span className="text-[10px] text-[#8f8f9f]">Nombre</span>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className={inp.replace('font-mono tabular-nums', '')} /></label>
        <label className="block"><span className="text-[10px] text-[#8f8f9f]">Fórmula</span>
          <input value={formula} onChange={e => setFormula(e.target.value)} className={inp.replace('font-mono tabular-nums', '')} /></label>
        <label className="block"><span className="text-[10px] text-[#8f8f9f]">Bidón</span>
          <select value={bidon} onChange={e => setBidon(e.target.value as Bidon)} className={inp}>
            <option value="A">A · Calcio</option><option value="B">B · Base</option><option value="C">C · Micros</option>
          </select></label>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-[11px] text-[#a6a6b5]">
          <input type="checkbox" checked={liquido} onChange={e => setLiquido(e.target.checked)} className="accent-[#a3e635]" /> Líquido
        </label>
        {liquido && <label className="flex items-center gap-1 text-[11px] text-[#a6a6b5]">Densidad
          <input type="number" step={0.01} value={densidad} onChange={e => setDensidad(+e.target.value)} className={`${inp} w-20`} /> g/mL</label>}
        <label className="flex items-center gap-1 text-[11px] text-[#a6a6b5]">Costo/kg
          <input type="number" step={1} value={costoKg} onChange={e => setCostoKg(+e.target.value)} className={`${inp} w-24`} /> ARS</label>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {ELEMENTOS.map(e => (
          <label key={e.key} className="block"><span className="text-[9.5px] text-[#8f8f9f]">{labelDe(e.key)} %</span>
            <input type="number" min={0} step={0.1} value={comp[e.key] ?? ''} placeholder="0"
              onChange={ev => setComp(prev => ({ ...prev, [e.key]: +ev.target.value }))}
              className="w-full bg-[#101016] border border-[#1f1f2b] rounded px-1.5 py-1 text-[11px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" /></label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 rounded-md text-[12px] text-[#8f8f9f] hover:text-[#d4d4dd]">Cancelar</button>
        <button onClick={guardar} disabled={saving} className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 disabled:opacity-50">Agregar</button>
      </div>
    </div>
  )
}

// ===================== AGUA =====================
type Elem = (typeof ELEMENTOS)[number]
function GrupoAgua({ titulo, items, agua, set }: { titulo: string; items: Elem[]; agua: Perfil; set: (k: ElementKey, v: number) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium mb-2">{titulo}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {items.map(e => (
          <label key={e.key} className="block"><span className="text-[10px] text-[#8f8f9f]">{e.key}</span>
            <input type="number" min={0} step={0.1} value={agua[e.key] ?? 0} onChange={ev => set(e.key, +ev.target.value)} className={inp} /></label>
        ))}
      </div>
    </div>
  )
}
function AguaTab({ agua, setAgua, macros, micros, otros }: { agua: Perfil; setAgua: React.Dispatch<React.SetStateAction<Perfil>>; macros: Elem[]; micros: Elem[]; otros: Elem[] }) {
  const set = (k: ElementKey, v: number) => setAgua(prev => ({ ...prev, [k]: v }))
  return (
    <div className={`${card} space-y-4`}>
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Análisis del agua de partida (ppm)</h3>
        <span className="ml-auto text-[10px] text-[#5c5c6b]">RO = 0 · se descuenta del objetivo</span>
      </div>
      <p className="text-[11px] text-[#757584]">Cargá lo que ya trae tu agua (remineralizador, canilla, pozo). El cálculo lo resta para no pasarte.</p>
      <GrupoAgua titulo="Macros" items={macros} agua={agua} set={set} />
      <GrupoAgua titulo="Micros" items={micros} agua={agua} set={set} />
      <GrupoAgua titulo="Otros" items={otros} agua={agua} set={set} />
      <button onClick={() => setAgua({})} className="text-[11px] text-[#8f8f9f] hover:text-[#ff8a7a]">Resetear a RO (todo 0)</button>
    </div>
  )
}

// ===================== CONCENTRADOS =====================
function ConcentradosTab({ concentrados, factor, setFactor, volBidon, setVolBidon, resolucion, setResolucion, dosisCount }: { concentrados: BidonConcentrado[]; factor: number; setFactor: (n: number) => void; volBidon: number; setVolBidon: (n: number) => void; resolucion: number; setResolucion: (n: number) => void; dosisCount: number }) {
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Soluciones madre (concentrados)</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="text-[11px] text-[#a6a6b5]">Factor de concentración
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={1} step={1} value={factor} onChange={e => setFactor(Math.max(1, +e.target.value))} className={`${inp} w-24`} />
              <span className="text-[#5c5c6b]">x</span>
            </div>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Volumen de cada bidón
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={0.1} step={0.5} value={volBidon} onChange={e => setVolBidon(Math.max(0.1, +e.target.value))} className={`${inp} w-24`} />
              <span className="text-[#5c5c6b]">L</span>
            </div>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Precisión de balanza
            <div className="flex items-center gap-1 mt-1">
              <select value={resolucion} onChange={e => setResolucion(+e.target.value)} className={`${inp} w-28`}>
                <option value={0}>Exacta</option>
                <option value={0.001}>0.001 g</option>
                <option value={0.01}>0.01 g</option>
                <option value={0.1}>0.1 g</option>
                <option value={1}>1 g</option>
              </select>
            </div>
          </label>
          <div className="text-[11px] text-[#757584] self-end">
            1 bidón de {volBidon} L a {factor}x rinde <b className="text-[#bef264]">{(volBidon * factor).toFixed(0)} L</b> finales.
          </div>
        </div>
      </div>

      {dosisCount === 0 ? (
        <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Calculá una receta primero (pestaña Calculadora).</p>
      ) : concentrados.map((g: BidonConcentrado) => (
        <div key={g.bidon} className={card}>
          <p className="text-[11px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: BIDON_INFO[g.bidon].color }}>
            {BIDON_INFO[g.bidon].label} · {g.volumenL} L
          </p>
          <div className="space-y-1">
            {g.items.map(it => {
              const gv = resolucion > 0 ? redondearBalanza(it.gramos, resolucion) : it.gramos
              return (
              <div key={it.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{it.sal.nombre}</span>
                <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                  {it.mlSiLiquido != null ? `${it.mlSiLiquido} mL` : `${gv} g`}
                </span>
              </div>
              )
            })}
          </div>
          {g.advertencia && (
            <div className="flex items-start gap-2 mt-2 rounded-lg bg-[#ff8a7a]/08 border border-[#ff8a7a]/25 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#ff8a7a]" strokeWidth={1.8} />
              <p className="text-[10.5px] text-[#d4a89f]">{g.advertencia}</p>
            </div>
          )}
        </div>
      ))}
      <p className="text-[10px] text-[#5c5c6b] px-1">
        Regla de oro: al tanque final echá primero el bidón A (calcio), agitá, después el B. Nunca juntes A y B concentrados.
      </p>
    </div>
  )
}

// ===================== RATIOS Y COSTO =====================
function RatiosTab({ ratios, res, costo }: { ratios: Ratios; res: Resultado; costo: CostoResultado }) {
  const N = nTotal(res.ppmLogrado)
  const P = res.ppmLogrado.P ?? 0, K = res.ppmLogrado.K ?? 0
  const npk = P > 0 ? `${(N / P).toFixed(1)} : 1 : ${(K / P).toFixed(1)}` : '—'
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ratios nutricionales</h3>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
            <span className="text-[11.5px] text-[#a6a6b5]">N : P : K</span>
            <span className="text-[12px] font-mono tabular-nums font-bold text-[#d9f99d]">{npk}</span>
          </div>
          {Object.entries(ratios).filter(([k]) => k !== 'N:P:K').map(([k, v]) => (
            <div key={k} className="flex items-center justify-between bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
              <span className="text-[11.5px] text-[#a6a6b5]">{k}</span>
              <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">{(v as number) || '—'}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-2">Referencia coco flora: K:Ca ~1.2, Ca:Mg ~3, NO3:NH4 ~8-10.</p>
      </div>

      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Costo del lote</h3>
          <span className="ml-auto text-[12px] font-mono tabular-nums font-bold text-[#d9f99d]">${costo.porLitro}/L</span>
        </div>
        {costo.detalle.length === 0 ? (
          <p className="text-[11px] text-[#5c5c6b]">Cargá costo/kg en cada sustancia para ver el costo.</p>
        ) : (
          <div className="space-y-1">
            {costo.detalle.map(d => (
              <div key={d.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{d.sal.nombre}</span>
                <span className="text-[12px] font-mono tabular-nums text-[#a6a6b5]">${d.costo}/L</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[#5c5c6b] mt-2">El costo sale de "costo/kg" que cargues en cada sustancia (pestaña Sustancias).</p>
      </div>
    </div>
  )
}

// ===================== CLONAR MARCA =====================
function ClonarTab({ productos, onUsar }: { productos: Sal[]; onUsar: (p: Perfil) => void }) {
  const [id, setId] = useState(productos[0]?.id ?? '')
  const [dosis, setDosis] = useState(3)
  const prod = productos.find(p => p.id === id)
  const doseGL = prod?.liquido ? dosis * (prod.densidad ?? 1.1) : dosis
  const perfil = prod ? perfilDesdeProducto(prod, doseGL) : {}
  const marcas = [...new Set(productos.map(marcaDe))]

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Copy className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Clonar un producto comercial</h3>
        </div>
        <p className="text-[11px] text-[#757584] mb-3">
          Elegí un producto y su dosis: la calculadora arma el objetivo en ppm y después, en la pestaña Calculadora,
          el solver te dice qué sales sueltas usar para <b className="text-[#a6a6b5]">copiarlo</b> (más barato).
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[11px] text-[#a6a6b5]">Producto
            <select value={id} onChange={e => setId(e.target.value)} className={`${inp} mt-1`}>
              {marcas.map(m => (
                <optgroup key={m} label={m}>
                  {productos.filter(p => marcaDe(p) === m).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Dosis ({prod?.liquido ? 'mL/L' : 'g/L'})
            <input type="number" min={0} step={0.1} value={dosis} onChange={e => setDosis(+e.target.value)} className={`${inp} mt-1`} />
          </label>
        </div>
        {prod && (
          <>
            <div className="mt-3 rounded-lg bg-[#15151d] border border-[#1f1f2b] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-2">Perfil resultante (ppm a esa dosis)</p>
              <div className="flex flex-wrap gap-1.5">
                {ELEMENTOS.filter(e => (perfil[e.key] ?? 0) > 0).map(e => (
                  <span key={e.key} className="text-[10.5px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#101016] border border-[#1f1f2b] text-[#d4d4dd]">
                    {e.key} {perfil[e.key]}
                  </span>
                ))}
                {Object.keys(perfil).length === 0 && <span className="text-[11px] text-[#5c5c6b]">Este producto no aporta nutrientes (es un aditivo).</span>}
              </div>
            </div>
            <button onClick={() => onUsar(perfil)} disabled={Object.keys(perfil).length === 0}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 disabled:opacity-50">
              <Copy className="w-3.5 h-3.5" /> Usar como objetivo y clonar
            </button>
            <p className="text-[10px] text-[#5c5c6b] mt-2">
              Para varias partes (A+B, etc.) clonás cada una por separado y sumás las recetas. Tip: en "Sustancias" desactivá los productos comerciales y dejá solo sales sueltas para que el clon use materia prima barata.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ===================== ESTABILIZANTES =====================
function EstabilizantesTab({ dosis }: { dosis: ResultadoSal[] }) {
  const [volumen, setVolumen] = useState(5)
  const rec = recomendarEstabilizantes(dosis, volumen)
  return (
    <div className="space-y-4">
      {/* Reglas dinámicas */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Reglas para que no decante (según tu receta)</h3>
        </div>
        <ul className="space-y-1.5">
          {rec.reglas.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[11.5px] text-[#c4c4d0]">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#a3e635] flex-shrink-0" />{r}
            </li>
          ))}
        </ul>
      </div>

      {/* Calculadora de aditivos */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Aditivos estabilizantes · cuánto poner</h3>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-[#a6a6b5]">Volumen del bidón
            <input type="number" min={0.1} step={0.5} value={volumen} onChange={e => setVolumen(Math.max(0.1, +e.target.value))} className={`${inp} w-20`} /> L
          </label>
        </div>
        <div className="space-y-1.5">
          {rec.aditivos.map(({ info, cantidad }) => (
            <div key={info.id} className="rounded-md bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[#d9f99d]">{info.nombre}</span>
                {info.opcional && <span className="text-[9px] px-1 rounded bg-[#a78bfa]/20 text-[#c4b5fd]">opcional</span>}
                <span className="ml-auto text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                  {cantidad != null ? `${cantidad} g` : info.dosis}
                </span>
              </div>
              <div className="text-[10px] text-[#757584] mt-0.5">{info.funcion} · dosis {info.dosis}</div>
              <div className="text-[10.5px] text-[#a6a6b5] mt-1">{info.porque}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-3">
          Cantidades calculadas para {volumen} L de concentrado. EDDHA y gluconato se dosifican según el Fe/Ca objetivo (ya los tenés en Sustancias).
          Datos: foros + patentes + scienceinhydroponics (autor de HydroBuddy).
        </p>
      </div>
    </div>
  )
}

// ===================== AJUSTE DE pH =====================
function PHTab({ agua }: { agua: Perfil }) {
  const [alcActual, setAlcActual] = useState(100)
  const [alcObjetivo, setAlcObjetivo] = useState(40)
  const [volumen, setVolumen] = useState(100)
  const [agenteId, setAgenteId] = useState('h3po4')
  const subir = alcObjetivo > alcActual
  const agentes = AGENTES_PH.filter(a => (subir ? a.tipo === 'base' : a.tipo === 'acido'))
  const agente = AGENTES_PH.find(a => a.id === agenteId) ?? agentes[0]
  const valido = agente && agente.tipo === (subir ? 'base' : 'acido')
  const ag = valido ? agente : agentes[0]
  const r = ag ? calcularAjustePH(alcActual, alcObjetivo, volumen, ag) : null

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Droplet className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ajuste de pH por alcalinidad</h3>
        </div>
        <p className="text-[11px] text-[#757584] mb-3">
          El pH de tu solución lo gobierna la <b className="text-[#a6a6b5]">alcalinidad</b> (bicarbonatos) del agua, no el pH directo.
          Medí la alcalinidad (en ppm de CaCO₃, con kit de acuario o análisis) y esto te dice cuánto ácido/base agregar.
          {agua.Na ? '' : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-[11px] text-[#a6a6b5]">Alcalinidad actual (ppm CaCO₃)
            <input type="number" min={0} value={alcActual} onChange={e => setAlcActual(+e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="text-[11px] text-[#a6a6b5]">Alcalinidad objetivo
            <input type="number" min={0} value={alcObjetivo} onChange={e => setAlcObjetivo(+e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="text-[11px] text-[#a6a6b5]">Volumen (L)
            <input type="number" min={0.1} step={1} value={volumen} onChange={e => setVolumen(+e.target.value)} className={`${inp} mt-1`} /></label>
          <label className="text-[11px] text-[#a6a6b5]">{subir ? 'Base' : 'Ácido'}
            <select value={ag?.id} onChange={e => setAgenteId(e.target.value)} className={`${inp} mt-1`}>
              {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select></label>
        </div>
        {r && ag && (
          <div className="mt-4 rounded-xl p-4 border border-[#404d20] bg-[#a3e635]/08">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#bef264] mb-1">{subir ? 'Subir' : 'Bajar'} pH · agregar</p>
            <p className="font-display font-bold tabular-nums leading-none text-[#d9f99d]" style={{ fontSize: 30 }}>
              {r.cantidad} <span className="text-[14px] opacity-70">{r.unidad}</span>
            </p>
            <p className="text-[11px] text-[#a6a6b5] mt-2">de <b>{ag.nombre}</b> para {volumen} L</p>
            {ag.nota && <p className="text-[10.5px] text-[#757584] mt-1">{ag.nota}</p>}
          </div>
        )}
        <div className="flex items-start gap-2 mt-3 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#a3e635]" strokeWidth={1.8} />
          <p className="text-[10.5px] text-[#757584]">
            Agregá de a poco y medí: es un estimado (la alcalinidad real varía). Objetivo típico coco: dejar ~30–40 ppm de alcalinidad residual → pH ~5.8–6.2.
            Con agua RO la alcalinidad ya es ~0: casi no necesitás ácido.
          </p>
        </div>
      </div>
    </div>
  )
}

// ===================== COMPARAR =====================
function CompararTab({ guardados }: { guardados: PerfilGuardado[] }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const pa = guardados.find(g => g.id === a)
  const pb = guardados.find(g => g.id === b)
  const ecOf = (p?: PerfilGuardado) => p ? ecAprox(p.perfil as Record<ElementKey, number>) : 0

  if (guardados.length < 2) {
    return <div className={card}><p className="text-[12px] text-[#5c5c6b] py-6 text-center">Guardá al menos 2 perfiles (pestaña Calculadora) para compararlos.</p></div>
  }
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <GitCompare className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Comparar dos perfiles</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={a} onChange={e => setA(e.target.value)} className={inp}>
            <option value="">— Perfil A —</option>
            {guardados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <select value={b} onChange={e => setB(e.target.value)} className={inp}>
            <option value="">— Perfil B —</option>
            {guardados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
      </div>

      {pa && pb && (
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#1f1f2b]">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#5c5c6b] font-medium">Elemento</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#a78bfa] font-medium truncate">{pa.nombre}</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#a3e635] font-medium truncate">{pb.nombre}</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#5c5c6b] font-medium">Δ</th>
            </tr></thead>
            <tbody>
              <tr className="border-b border-[#1f1f2b] bg-[#15151d]">
                <td className="px-3 py-1.5 font-medium text-[#d4d4dd]">EC aprox</td>
                <td className="px-3 py-1.5 font-mono tabular-nums text-[#c4b5fd]">{ecOf(pa)}</td>
                <td className="px-3 py-1.5 font-mono tabular-nums text-[#d9f99d]">{ecOf(pb)}</td>
                <td className="px-3 py-1.5 font-mono tabular-nums text-[#757584]">{(ecOf(pb) - ecOf(pa)).toFixed(2)}</td>
              </tr>
              {ELEMENTOS.filter(e => (pa.perfil[e.key] ?? 0) > 0 || (pb.perfil[e.key] ?? 0) > 0).map(e => {
                const va = pa.perfil[e.key] ?? 0, vb = pb.perfil[e.key] ?? 0
                const d = vb - va
                return (
                  <tr key={e.key} className="border-b border-[#1f1f2b] last:border-0">
                    <td className="px-3 py-1.5 font-medium text-[#d4d4dd]">{e.label}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums text-[#a6a6b5]">{va || '—'}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums text-[#a6a6b5]">{vb || '—'}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums" style={{ color: d > 0 ? '#d9f99d' : d < 0 ? '#60a5fa' : '#757584' }}>
                      {d > 0 ? '+' : ''}{d || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
