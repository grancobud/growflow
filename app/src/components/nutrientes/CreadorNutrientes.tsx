import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, Beaker, Droplets, ChevronDown, Sparkles, AlertTriangle, Save, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  SALES, ELEMENTOS, PRESETS, calcularReceta, ecAprox, perfilesNutrientesService,
  type ElementKey, type Perfil, type PerfilGuardado,
} from '../../lib/nutrientes'

function colorDelta(logrado: number, obj: number) {
  if (obj <= 0) return { c: '#757584', bg: 'transparent' }
  const r = logrado / obj
  if (r < 0.85) return { c: '#60a5fa', bg: 'rgba(96,165,250,0.08)' }   // corto
  if (r > 1.15) return { c: '#ff8a7a', bg: 'rgba(255,138,122,0.08)' }  // pasado
  return { c: '#d9f99d', bg: 'rgba(63,176,116,0.10)' }                  // ok
}

const BIDON_INFO: Record<'A' | 'B' | 'C', { label: string; color: string }> = {
  A: { label: 'Bidón A · Calcio', color: '#a78bfa' },
  B: { label: 'Bidón B · Base/Sulfatos', color: '#a3e635' },
  C: { label: 'Bidón C · Micros', color: '#60a5fa' },
}

export default function CreadorNutrientes() {
  const [perfil, setPerfil] = useState<Perfil>(PRESETS[1].perfil)
  const [presetId, setPresetId] = useState(PRESETS[1].id)
  const [agua, setAgua] = useState<Perfil>({})
  const [aguaOpen, setAguaOpen] = useState(false)
  const [salesOpen, setSalesOpen] = useState(false)
  const [activas, setActivas] = useState<Set<string>>(
    new Set(['cano3', 'mkp', 'k2so4', 'epsom', 'cagluc', 'yeso', 'khco3', 'feeddha', 'mnso4', 'znso4', 'boric'])
  )

  const [guardados, setGuardados] = useState<PerfilGuardado[]>([])
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const salesDisp = useMemo(() => SALES.filter(s => activas.has(s.id)), [activas])
  const res = useMemo(() => calcularReceta(perfil, salesDisp, agua), [perfil, salesDisp, agua])
  const ec = useMemo(() => ecAprox(res.ppmLogrado), [res])

  async function recargarGuardados() {
    try { setGuardados(await perfilesNutrientesService.list()) } catch { /* offline */ }
  }
  useEffect(() => { recargarGuardados() }, [])

  async function guardarPerfil() {
    const nombre = nombreNuevo.trim()
    if (!nombre) { toast.error('Poné un nombre para el perfil'); return }
    setGuardando(true)
    try {
      await perfilesNutrientesService.crear({ nombre, perfil, agua, sales: [...activas] })
      setNombreNuevo('')
      await recargarGuardados()
      toast.success(`Perfil "${nombre}" guardado`)
    } catch (e) {
      toast.error('No se pudo guardar: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setGuardando(false) }
  }

  function cargarPerfil(g: PerfilGuardado) {
    setPerfil({ ...g.perfil })
    setAgua({ ...(g.agua ?? {}) })
    if (g.sales?.length) setActivas(new Set(g.sales))
    setPresetId('')
    toast.success(`Cargado: ${g.nombre}`)
  }

  async function borrarPerfil(g: PerfilGuardado) {
    try {
      await perfilesNutrientesService.eliminar(g.id)
      await recargarGuardados()
      toast.success('Perfil eliminado')
    } catch (e) {
      toast.error('No se pudo eliminar: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const macros = ELEMENTOS.filter(e => e.grupo === 'macro')
  const micros = ELEMENTOS.filter(e => e.grupo === 'micro')

  function setPreset(id: string) {
    const p = PRESETS.find(x => x.id === id)
    if (p) { setPerfil({ ...p.perfil }); setPresetId(id) }
  }
  function setPpm(k: ElementKey, v: number) {
    setPerfil(prev => ({ ...prev, [k]: v })); setPresetId('')
  }

  const porBidon = (['A', 'B', 'C'] as const).map(b => ({
    bidon: b, items: res.dosis.filter(d => d.sal.bidon === b),
  })).filter(g => g.items.length > 0)

  const hayPrecipitacion = res.dosis.some(d => d.sal.bidon === 'A' && (d.sal.comp.Ca ?? 0) > 0)
    && res.dosis.some(d => (d.sal.comp.P ?? 0) > 0 || (d.sal.comp.S ?? 0) > 0)

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Presets */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Perfil objetivo</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                presetId === p.id
                  ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]'
                  : 'bg-[#15151d] border border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
              }`} title={p.desc}>
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Guardar / cargar perfiles */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
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
            {guardados.map(g => (
              <div key={g.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{g.nombre}</span>
                <button onClick={() => cargarPerfil(g)} title="Cargar"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] text-[#8f8f9f] hover:text-[#d9f99d] hover:bg-[#a3e635]/10 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.8} /> Cargar
                </button>
                <button onClick={() => borrarPerfil(g)} title="Eliminar"
                  className="p-1 rounded text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#ff8a7a]/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Objetivo editable */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Beaker className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Objetivo (ppm)</h3>
            <span className="ml-auto text-[10px] text-[#5c5c6b]">editá los valores</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {macros.map(e => (
              <label key={e.key} className="block">
                <span className="text-[10px] text-[#8f8f9f]">{e.key} · {e.label}</span>
                <input type="number" min={0} step={1} value={perfil[e.key] ?? 0}
                  onChange={ev => setPpm(e.key, +ev.target.value)}
                  className="w-full mt-0.5 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-1 text-[12px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" />
              </label>
            ))}
          </div>
          <details className="mt-3 group">
            <summary className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] cursor-pointer flex items-center gap-1">
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" /> Micros (ppm)
            </summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {micros.map(e => (
                <label key={e.key} className="block">
                  <span className="text-[10px] text-[#8f8f9f]">{e.key}</span>
                  <input type="number" min={0} step={0.1} value={perfil[e.key] ?? 0}
                    onChange={ev => setPpm(e.key, +ev.target.value)}
                    className="w-full mt-0.5 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-1 text-[12px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" />
                </label>
              ))}
            </div>
          </details>
        </div>

        {/* Resultado: dosis */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Receta · gramos por litro</h3>
            <span className="ml-auto text-[11px] font-mono tabular-nums px-2 py-0.5 rounded border border-[#404d20] bg-[#a3e635]/10 text-[#d9f99d]">
              EC ≈ {ec}
            </span>
          </div>
          {porBidon.length === 0 ? (
            <p className="text-[12px] text-[#5c5c6b] py-6 text-center">
              No hay sales que cubran este objetivo. Activá más sales abajo.
            </p>
          ) : (
            <div className="space-y-3">
              {porBidon.map(g => (
                <div key={g.bidon}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1.5" style={{ color: BIDON_INFO[g.bidon].color }}>
                    {BIDON_INFO[g.bidon].label}
                  </p>
                  <div className="space-y-1">
                    {g.items.map(d => (
                      <div key={d.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                        <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{d.sal.nombre}</span>
                        <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                          {d.gramosPorL >= 0.01 ? d.gramosPorL.toFixed(2) : d.gramosPorL.toFixed(4)} <span className="text-[#5c5c6b] font-normal">g/L</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {hayPrecipitacion && (
            <div className="flex items-start gap-2 mt-3 rounded-lg bg-[#ff8a7a]/08 border border-[#ff8a7a]/25 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#ff8a7a]" strokeWidth={1.8} />
              <p className="text-[10.5px] text-[#d4a89f]">
                Tenés calcio + fosfato/sulfato. En concentrado precipitan: mantené el bidón A (calcio) separado del B.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ppm logrado vs objetivo */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Logrado vs objetivo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#1f1f2b]">
                {['Elem', 'Objetivo', 'Logrado', 'Δ'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.1em] text-[#5c5c6b] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ELEMENTOS.filter(e => (perfil[e.key] ?? 0) > 0 || (res.ppmLogrado[e.key] ?? 0) > 0).map(e => {
                const obj = perfil[e.key] ?? 0
                const log = res.ppmLogrado[e.key] ?? 0
                const { c, bg } = colorDelta(log, obj)
                const delta = obj > 0 ? `${log > obj ? '+' : ''}${(log - obj).toFixed(0)}` : '—'
                return (
                  <tr key={e.key} className="border-b border-[#1f1f2b] last:border-0" style={{ background: bg }}>
                    <td className="px-3 py-1.5 font-medium text-[#d4d4dd]">{e.key} <span className="text-[#5c5c6b]">{e.label}</span></td>
                    <td className="px-3 py-1.5 text-[#a6a6b5] font-mono tabular-nums">{obj || '—'}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums font-bold" style={{ color: c }}>{log}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums" style={{ color: c }}>{delta}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agua de partida */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
        <button onClick={() => setAguaOpen(o => !o)} className="w-full flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Agua de partida (ppm)</h3>
          <span className="ml-auto text-[10px] text-[#5c5c6b]">RO = 0 · remineralizador aporta algo</span>
          <ChevronDown className={`w-4 h-4 text-[#5c5c6b] transition-transform ${aguaOpen ? 'rotate-180' : ''}`} />
        </button>
        {aguaOpen && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            {macros.map(e => (
              <label key={e.key} className="block">
                <span className="text-[10px] text-[#8f8f9f]">{e.key}</span>
                <input type="number" min={0} step={1} value={agua[e.key] ?? 0}
                  onChange={ev => setAgua(prev => ({ ...prev, [e.key]: +ev.target.value }))}
                  className="w-full mt-0.5 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-1 text-[12px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sales disponibles */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
        <button onClick={() => setSalesOpen(o => !o)} className="w-full flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Sales disponibles</h3>
          <span className="ml-auto text-[10px] text-[#5c5c6b]">{activas.size} activas</span>
          <ChevronDown className={`w-4 h-4 text-[#5c5c6b] transition-transform ${salesOpen ? 'rotate-180' : ''}`} />
        </button>
        {salesOpen && (
          <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {SALES.map(s => {
              const on = activas.has(s.id)
              return (
                <button key={s.id} onClick={() => setActivas(prev => {
                  const n = new Set(prev); if (on) n.delete(s.id); else n.add(s.id); return n
                })}
                  className={`text-left flex items-start gap-2 rounded-md px-2.5 py-1.5 border transition-colors ${
                    on ? 'bg-[#a3e635]/08 border-[#404d20]' : 'bg-[#15151d] border-[#1f1f2b] hover:border-[#2a2a3a]'
                  }`}>
                  <span className={`mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border ${on ? 'bg-[#a3e635] border-[#a3e635]' : 'border-[#3a3a4a]'}`} />
                  <span className="min-w-0">
                    <span className={`block text-[11.5px] font-medium ${on ? 'text-[#d9f99d]' : 'text-[#a6a6b5]'}`}>
                      {s.nombre} {s.formula && <span className="text-[#5c5c6b] font-normal">{s.formula}</span>}
                    </span>
                    {s.nota && <span className="block text-[10px] text-[#5c5c6b] mt-0.5">{s.nota}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#5c5c6b] px-1">
        Solver NNLS (mínimos cuadrados no-negativos). EC estimada por suma de ppm (escala 500). Verificá pH 5.8–6.2 en coco.
        Inspirado en HydroBuddy (Daniel Fernández).
      </p>
    </div>
  )
}
