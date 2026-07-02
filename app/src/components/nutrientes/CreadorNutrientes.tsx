import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical, Beaker, Droplets, ChevronDown, Sparkles, AlertTriangle,
  Save, FolderOpen, Trash2, Calculator, FlaskRound, Layers, Scale, Plus, DollarSign,
  Droplet, GitCompare, Package, ShieldCheck, Copy, HelpCircle, BookOpen, Lightbulb, Printer, Store, Phone, Globe, Upload, Star, X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SALES_DEFECTO, ELEMENTOS, PRESETS, calcularReceta, ecAprox, nTotal,
  calcularConcentrados, calcularRatios, calcularCosto, calcularBalanceIonico, calcularStocksMicros,
  redondearBalanza, AGENTES_PH, calcularAjustePH, oxidoAElemental, OXIDOS,
  recomendarEstabilizantes, esComercial, marcaDe, perfilDesdeProducto, categoriaSal, KITS_SALES, kitParaPerfil, opcionesDeMarca, DOSIS_REC,
  necesitaSepararAB, bidonDeSal,
  perfilesNutrientesService, sustanciasService, inventarioService, aplicarInventario, proveedoresService, type Proveedor,
  compatibilidad, estadoRango, RANGOS_FLORA_COCO, rangosDesdePerfil,
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
  modoPrep: 'polvo' | 'liquido'; setModoPrep: (m: 'polvo' | 'liquido') => void
}
type CostoResultado = { porLitro: number; detalle: { sal: Sal; costo: number }[] }

type SubTab = 'calc' | 'clonar' | 'sustancias' | 'proveedores' | 'agua' | 'concentrados' | 'estab' | 'ratios' | 'ph' | 'comparar' | 'ayuda'

const SUBTABS: { id: SubTab; label: string; icon: typeof Calculator }[] = [
  { id: 'calc', label: 'Calculadora', icon: Calculator },
  { id: 'clonar', label: 'Clonar marca', icon: Copy },
  { id: 'sustancias', label: 'Sustancias', icon: FlaskRound },
  { id: 'proveedores', label: 'Proveedores', icon: Store },
  { id: 'agua', label: 'Agua', icon: Droplets },
  { id: 'concentrados', label: 'Soluciones madre', icon: Layers },
  { id: 'estab', label: 'Estabilizantes', icon: ShieldCheck },
  { id: 'ph', label: 'Ajuste de pH', icon: Droplet },
  { id: 'comparar', label: 'Comparar', icon: GitCompare },
  { id: 'ratios', label: 'Ratios y costo', icon: Scale },
  { id: 'ayuda', label: 'Ayuda / Guía', icon: HelpCircle },
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

// Tooltip de ayuda: "?" que al pasar el mouse muestra descripción + ejemplo.
function Info({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex group align-middle ml-1">
      <span className="w-3.5 h-3.5 rounded-full bg-[#1f1f2b] border border-[#404d20] text-[#8f8f9f] text-[9px] font-bold flex items-center justify-center cursor-help group-hover:text-[#d9f99d] group-hover:border-[#a3e635] transition-colors">?</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 max-w-[calc(100vw-2rem)] z-50 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d0d14] border border-[#2a2a38] rounded-lg px-3 py-2 text-[10.5px] text-[#c4c4d0] leading-relaxed shadow-2xl">
        {children}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 -mt-1 bg-[#0d0d14] border-r border-b border-[#2a2a38]" />
      </span>
    </span>
  )
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
  const [modoPrep, setModoPrep] = useState<'polvo' | 'liquido'>('polvo')

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
    if (p) {
      setPerfil({ ...p.perfil }); setPresetId(id)
      // veg/flora: rangos hortícolas reales. Resto (finish/fade): banda ±15% del propio objetivo.
      setRangos(id === 'veg' || id === 'flora' ? RANGOS_FLORA_COCO : rangosDesdePerfil(p.perfil))
      // auto-elige las sales limpias correctas para ese objetivo (1 por nutriente)
      setActivas(new Set(kitParaPerfil(p.perfil)))
    }
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
      {/* Sub-tabs: scroll horizontal en mobile, wrap en desktop */}
      <div className="flex gap-1 flex-nowrap sm:flex-wrap overflow-x-auto border-b border-[#1f1f2b] -mt-1 -mx-1 px-1 scrollbar-thin">
        {SUBTABS.map(t => {
          const Icon = t.icon, on = sub === t.id
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap ${
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
          rangos, setRangos, modoPrep, setModoPrep }} />
      )}
      {sub === 'sustancias' && (
        <SustanciasTab {...{ salesTodas, activas, setActivas, recargarCustoms, inventario, recargarInventario }} />
      )}
      {sub === 'proveedores' && (
        <ProveedoresTab salesTodas={salesTodas} />
      )}
      {sub === 'agua' && (
        <AguaTab {...{ agua, setAgua, macros, micros, otros }} />
      )}
      {sub === 'concentrados' && (
        <ConcentradosTab {...{ concentrados, factor, setFactor, volBidon, setVolBidon, resolucion, setResolucion, dosisCount: res.dosis.length, guardados, salesTodas, modoPrep }} />
      )}
      {sub === 'clonar' && (
        <ClonarTab productos={salesTodas.filter(esComercial)} onUsar={(p, salId) => {
          setPerfil(p); setPresetId('')
          // sales limpias con el quelato/forma de micros de ESA marca (clon fiel)
          setActivas(new Set(kitParaPerfil(p, opcionesDeMarca(salId))))
          setRangos(rangosDesdePerfil(p)) // banda ±15% del producto: el clon "calza" si le pega
          // forma de preparación = la del producto original (líquido o polvo)
          const prod = salesTodas.find(s => s.id === salId)
          setModoPrep(prod?.liquido ? 'liquido' : 'polvo')
          setSub('calc')
        }} />
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
      {sub === 'ayuda' && (
        <AyudaTab irA={setSub} />
      )}
    </div>
  )
}

// ===================== RECETA IMPRIMIBLE (PDF/print) =====================
function imprimirReceta(d: {
  nombre: string; perfil: Perfil; res: Resultado
  porBidon: { bidon: Bidon; items: ResultadoSal[] }[]
  ec: number; litros: number; modoPrep: 'polvo' | 'liquido'; resolucion: number
}) {
  const { nombre, perfil, res, porBidon, ec, litros, modoPrep, resolucion } = d
  const costo = calcularCosto(res.dosis)
  const bal = calcularBalanceIonico(res.ppmLogrado)
  const stocks = calcularStocksMicros(res.dosis, resolucion)
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  const titulo = (nombre || 'Receta de fertilizante').trim()
  const unaBotella = porBidon.length === 1
  const fmt = (g: number) => g >= 0.01 ? g.toFixed(2) : g >= 0.001 ? g.toFixed(4) : g.toFixed(6)
  const bidonLabel = (b: Bidon) => modoPrep === 'polvo' ? 'Mezcla en polvo — todo junto'
    : unaBotella ? 'Botella única — todo junto'
    : b === 'A' ? 'Bidón A — Calcio' : b === 'B' ? 'Bidón B — Base / Sulfatos' : 'Bidón C — Micros'

  const salesRows = porBidon.map(g => `
    <div class="grupo">
      <div class="grupo-tit">${bidonLabel(g.bidon)}</div>
      <table>
        <thead><tr><th>Sustancia</th><th class="num">g / L</th><th class="num">Total ${litros} L</th></tr></thead>
        <tbody>
          ${g.items.map(it => {
            const gL = resolucion > 0 ? redondearBalanza(it.gramosPorL, resolucion) : it.gramosPorL
            return `<tr><td>${it.sal.nombre}</td><td class="num">${fmt(gL)}</td><td class="num strong">${fmt(gL * litros)} g</td></tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`).join('')

  const ppmRows = ELEMENTOS.filter(e => (perfil[e.key] ?? 0) > 0 || (res.ppmLogrado[e.key] ?? 0) > 0).map(e => {
    const obj = perfil[e.key] ?? 0, log = res.ppmLogrado[e.key] ?? 0
    return `<tr><td>${e.label}</td><td class="num">${obj || '—'}</td><td class="num strong">${log}</td></tr>`
  }).join('')

  const stockRows = stocks.length === 0 ? '' : `
    <div class="seccion">
      <h2>Solución stock — micros que no se pesan</h2>
      <p class="hint">Pesá grande una vez, disolvé en agua, y dosificá por volumen con jeringa.</p>
      ${stocks.map(s => `<div class="stock"><b>${s.nombre}</b> — Pesá <b>${s.pesar} g</b> · Disolvé en <b>${s.volumenStockMl} mL</b> · Agregá <b>${s.dosisMlPorL} mL/L</b> (jeringa ${s.jeringa})</div>`).join('')}
    </div>`

  const phTxt = bal.tendenciaPh === 'sube' ? 'tiende a SUBIR' : bal.tendenciaPh === 'baja' ? 'tiende a BAJAR' : 'ESTABLE'
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px 44px; max-width: 820px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #65a30d; padding-bottom: 14px; margin-bottom: 6px; }
    .brand { font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #4d7c0f; }
    .brand small { display:block; font-size: 9px; letter-spacing:.2em; color:#9ca3af; font-weight:600; }
    .head .fecha { font-size: 11px; color: #9ca3af; }
    h1 { font-size: 25px; font-weight: 800; margin: 16px 0 4px; color: #111827; }
    .sub { font-size: 12px; color: #6b7280; margin-bottom: 18px; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
    .chip { border: 1px solid #e5e7eb; border-radius: 9px; padding: 8px 14px; }
    .chip .k { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; }
    .chip .v { font-size: 15px; font-weight: 700; color: #111827; }
    .chip.lime { background: #f7fee7; border-color: #d9f99d; } .chip.lime .v { color: #4d7c0f; }
    .seccion { margin-bottom: 22px; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #4d7c0f; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
    .grupo { margin-bottom: 12px; break-inside: avoid; }
    .grupo-tit { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; text-align: left; padding: 4px 8px; border-bottom: 1.5px solid #e5e7eb; }
    td { font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
    .num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono', Consolas, monospace; }
    .strong { font-weight: 700; color: #111827; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .instr { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
    .instr ol { margin-left: 16px; } .instr li { font-size: 11.5px; margin-bottom: 5px; color: #374151; }
    .hint { font-size: 10.5px; color: #9ca3af; margin-bottom: 8px; }
    .stock { font-size: 11px; padding: 7px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 6px; color: #713f12; }
    .foot { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } @page { margin: 16mm; } }
  </style></head><body>
    <div class="head"><div class="brand">GrowFlow<small>Calculadora de fertilizantes</small></div><div class="fecha">${fecha}</div></div>
    <h1>${titulo}</h1>
    <div class="sub">Receta calculada para ${litros} litro${litros === 1 ? '' : 's'} de solución final · preparación en ${modoPrep === 'polvo' ? 'polvo' : 'líquido (A/B)'}.</div>
    <div class="chips">
      <div class="chip lime"><div class="k">EC estimada</div><div class="v">${ec} mS/cm</div></div>
      <div class="chip"><div class="k">Costo</div><div class="v">$${costo.porLitro}/L</div></div>
      <div class="chip"><div class="k">Volumen</div><div class="v">${litros} L</div></div>
      <div class="chip"><div class="k">NH₄ del N</div><div class="v">${bal.nh4Pct}%</div></div>
      <div class="chip"><div class="k">pH riego</div><div class="v">${phTxt}</div></div>
    </div>
    <div class="seccion"><h2>Sustancias a pesar</h2>${salesRows}</div>
    <div class="cols">
      <div class="seccion"><h2>Perfil nutricional (ppm)</h2>
        <table><thead><tr><th>Elemento</th><th class="num">Objetivo</th><th class="num">Logrado</th></tr></thead><tbody>${ppmRows}</tbody></table>
      </div>
      <div class="seccion"><h2>Cómo preparar</h2>
        <div class="instr"><ol>
          <li>Llená el tanque con ${litros} L de agua (idealmente RO u osmosis).</li>
          ${modoPrep === 'polvo' ? '<li>Agregá todas las sales pesadas y revolvé hasta disolver.</li>' : '<li>Echá primero el <b>bidón A (calcio)</b> y agitá.</li><li>Después el <b>bidón B</b>. Nunca los juntes concentrados.</li>'}
          <li>Ajustá el pH a <b>5.8 – 6.2</b> (coco).</li>
          <li>Verificá la EC (~${ec} mS/cm) antes de regar.</li>
        </ol></div>
      </div>
    </div>
    ${stockRows}
    <div class="foot"><span>Generado con GrowFlow · growflow-5vs.pages.dev</span><span>${fecha}</span></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Habilitá las ventanas emergentes para imprimir.'); return }
  w.document.write(html)
  w.document.close()
}

// ===================== CALCULADORA =====================
function CalcTab(p: CalcTabProps) {
  const { perfil, presetId, setPreset, setPpm, macros, micros, res, ec, salesTodas, activas, setActivas,
    guardados, nombreNuevo, setNombreNuevo, guardando, guardarPerfil, cargarPerfil, borrarPerfil, resolucion,
    rangos, setRangos, modoPrep, setModoPrep } = p
  const [editarRangos, setEditarRangos] = useState(false)
  const [litros, setLitros] = useState(1)
  const setRango = (k: ElementKey, campo: 'min' | 'max', v: number) =>
    setRangos(prev => ({ ...prev, [k]: { min: prev[k]?.min ?? 0, max: prev[k]?.max ?? 0, [campo]: v } }))

  // en polvo seco todo va junto; solo se separa en concentrado líquido con conflicto Ca↔sulfato
  const separarBidones = modoPrep === 'liquido' && necesitaSepararAB(res.dosis)
  const porBidon = (['A', 'B', 'C'] as Bidon[]).map(b => ({
    bidon: b, items: res.dosis.filter((d: ResultadoSal) => bidonDeSal(d.sal, separarBidones) === b),
  })).filter(g => g.items.length > 0)
  const unaSolaBotella = porBidon.length === 1
  const nLog = nTotal(res.ppmLogrado)

  return (
    <div className="space-y-4">
      {/* Presets + Kits de sales */}
      <div className={`${card} space-y-3`}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">1 · Perfil objetivo (qué quiero lograr)</p>
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
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">2 · Kit de sales (con qué lo hago) <span className="text-[#3a3a4a] normal-case tracking-normal">— evita que el solver reparta en muchas sales</span></p>
          <div className="flex flex-wrap gap-1.5">
            {KITS_SALES.map(kit => (
              <button key={kit.id} onClick={() => setActivas(new Set(kit.sales))} title={kit.desc}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:border-[#463a66] hover:text-[#c4b5fd] transition-colors">
                {kit.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guardar/cargar */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Save className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Mis perfiles guardados</h3>
          <Info><b className="text-[#d9f99d]">Tus recetas guardadas</b> con nombre, para recuperarlas cuando quieras.<br /><span className="text-[#a3e635]">Ej: guardás "Flora coco sem 5" y la volvés a cargar el mes que viene.</span></Info>
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
            <Info><b className="text-[#d9f99d]">La receta que querés lograr</b>, en ppm de cada nutriente. Cargalos a mano o usá un preset.<br /><span className="text-[#a3e635]">Ej: flora coco → N 150, P 55, K 200, Ca 170, Mg 55.</span></Info>
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
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <FlaskConical className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Receta {litros === 1 ? '· g/L' : `· para ${litros} L`}</h3>
            <label className="flex items-center gap-1 text-[10.5px] text-[#a6a6b5]">
              <span className="text-[#5c5c6b]">prepará</span>
              <input type="number" min={0.1} step={1} value={litros} onChange={e => setLitros(Math.max(0.1, +e.target.value))}
                className="w-16 bg-[#15151d] border border-[#1f1f2b] rounded px-1.5 py-0.5 text-[12px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" /> L
              <Info><b className="text-[#d9f99d]">Cuántos litros de riego vas a preparar</b>. Los gramos de la receta se multiplican por este número.<br /><span className="text-[#a3e635]">Ej: MKP 0.24 g/L × 10 L = 2.4 g a pesar.</span></Info>
            </label>
            <div className="flex rounded-md overflow-hidden border border-[#1f1f2b]">
              {(['polvo', 'liquido'] as const).map(m => (
                <button key={m} onClick={() => setModoPrep(m)}
                  className={`px-2 py-0.5 text-[10.5px] font-medium transition-colors ${modoPrep === m ? 'bg-[#a3e635]/15 text-[#d9f99d]' : 'bg-[#15151d] text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
                  {m === 'polvo' ? 'Polvo' : 'Líquido A/B'}
                </button>
              ))}
            </div>
            <Info><b className="text-[#d9f99d]">Cómo vas a preparar la receta.</b> <b>Polvo</b>: todo junto en un envase seco (se echa al tanque). <b>Líquido A/B</b>: concentrado en botellas, separando calcio (A) de sulfatos (B) para que no precipiten.<br /><span className="text-[#a3e635]">Ej: el Finis viene en polvo; el Athena Fade viene líquido.</span></Info>
            <span className="ml-auto text-[11px] font-mono tabular-nums px-2 py-0.5 rounded border border-[#404d20] bg-[#a3e635]/10 text-[#d9f99d]">EC ≈ {ec}</span>
            <Info><b className="text-[#d9f99d]">EC estimada</b> (electroconductividad): cuán fuerte queda la solución. Es lo que vas a medir con el lápiz de EC.<br /><span className="text-[#a3e635]">Coco: veg 1.2–1.8, flora 1.8–2.4. Si te da mucho más, bajá las dosis.</span></Info>
            <button onClick={() => imprimirReceta({ nombre: p.nombreNuevo, perfil, res, porBidon, ec, litros, modoPrep, resolucion })}
              disabled={porBidon.length === 0}
              className="text-[10.5px] flex items-center gap-1 px-2 py-1 rounded-md bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#d9f99d] hover:border-[#404d20] transition-colors disabled:opacity-40">
              <Printer className="w-3.5 h-3.5" strokeWidth={1.8} /> Imprimir
            </button>
          </div>
          {porBidon.length === 0 ? (
            <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Sin sales que cubran el objetivo. Activá más en "Sustancias".</p>
          ) : (
            <div className="space-y-3">
              {porBidon.map(g => (
                <div key={g.bidon}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1.5" style={{ color: BIDON_INFO[g.bidon].color }}>{modoPrep === 'polvo' ? 'Mezcla en polvo · todo junto' : unaSolaBotella ? 'Botella única · todo junto' : BIDON_INFO[g.bidon].label}</p>
                  <div className="space-y-1">
                    {g.items.map((d: ResultadoSal) => {
                      const gv0 = resolucion > 0 ? redondearBalanza(d.gramosPorL, resolucion) : d.gramosPorL
                      const gv = gv0 * litros
                      return (
                      <div key={d.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                        <span className="text-[11.5px] text-[#d4d4dd] flex-1 min-w-0 truncate">{d.sal.nombre}</span>
                        <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                          {gv >= 0.01 ? gv.toFixed(2) : gv >= 0.001 ? gv.toFixed(4) : gv.toFixed(6)} <span className="text-[#5c5c6b] font-normal">{litros === 1 ? 'g/L' : 'g'}</span>
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

      {/* Solución stock: micros impesables → pesar grande + dosificar por mL */}
      {(() => {
        const stocks = calcularStocksMicros(res.dosis, resolucion)
        if (stocks.length === 0) return null
        return (
          <div className="rounded-xl bg-[#101016] border border-[#facc15]/25 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-[#facc15]" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Solución stock (micros que no podés pesar)</h3>
              <Info><b className="text-[#d9f99d]">Para dosificar lo impesable</b>: pesás grande una vez, disolvés en agua, y agregás por mL con jeringa.<br /><span className="text-[#a3e635]">Ej: 1 g de molibdato en 1 L → 0.6 mL/L = los 0.0006 g exactos.</span></Info>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-[10.5px] text-[#a6a6b5]">
                Estas sales piden menos de lo que tu balanza pesa. Pesá grande UNA vez, disolvé en agua, y después dosificás por volumen con jeringa.
              </p>
              {stocks.map(s => (
                <div key={s.salId} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-[#facc15]">{s.nombre}</span>
                    <span className="text-[10px] text-[#5c5c6b] font-mono">pedía {s.gramosPorL < 0.001 ? s.gramosPorL.toFixed(6) : s.gramosPorL.toFixed(4)} g/L · impesable</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-1 rounded bg-[#101016] border border-[#1f1f2b]">1️⃣ Pesá <b className="text-[#d9f99d] font-mono">{s.pesar} g</b></span>
                    <span className="text-[#5c5c6b]">→</span>
                    <span className="px-2 py-1 rounded bg-[#101016] border border-[#1f1f2b]">2️⃣ Disolvé en <b className="text-[#7dd3fc] font-mono">{s.volumenStockMl} mL</b> de agua</span>
                    <span className="text-[#5c5c6b]">→</span>
                    <span className="px-2 py-1 rounded bg-[#101016] border border-[#1f1f2b]">
                      3️⃣ Agregá <b className="text-[#a78bfa] font-mono">{s.dosisMlPorL} mL</b>/L
                      {s.litrosSugeridos > 1 && <span className="text-[#8f8f9f]"> (o <b className="text-[#a78bfa] font-mono">{s.mlTotal} mL</b> para {s.litrosSugeridos} L)</span>}
                    </span>
                    <span className="px-2 py-1 rounded bg-[#facc15]/10 text-[#facc15]">jeringa {s.jeringa}</span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-[#5c5c6b]">El stock te dura muchos lotes. Guardalo rotulado en la heladera. Ajustá la precisión de balanza en "Soluciones madre".</p>
            </div>
          </div>
        )
      })()}

      {/* ppm logrado vs objetivo + rango */}
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Logrado vs objetivo y rango</h3>
          <Info><b className="text-[#d9f99d]">Cuánto conseguís de cada nutriente</b> con la receta, vs lo que pediste. Verde EN RANGO = clavaste el objetivo.<br /><span className="text-[#a3e635]">Ej: Ca objetivo 170, logrado 168 → EN RANGO ✓.</span></Info>
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
              {ELEMENTOS.filter(e => (perfil[e.key] ?? 0) > 0 || (res.ppmLogrado[e.key] ?? 0) > 0).map(e => {
                const obj = perfil[e.key] ?? 0, log = res.ppmLogrado[e.key] ?? 0
                const rg = rangos[e.key]
                // el estado del rango solo aplica a elementos que el perfil SÍ pide (objetivo > 0)
                const est = obj > 0 ? estadoRango(log, rg) : 'sin'
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
                      ) : (obj > 0 && rg) ? `${rg.min}–${rg.max}` : '—'}
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
      Solver NNLS · EC estimada por balance iónico. Verificá pH 5.8–6.2 en coco. Inspirado en HydroBuddy (D. Fernández).
      {activas.size === 0 && <button onClick={() => setActivas(new Set(salesTodas.map((s: Sal) => s.id)))} className="ml-1 text-[#a3e635] underline">activar todas</button>}
    </p>
  )
}

// ===================== SUSTANCIAS =====================
function SustanciasTab({ salesTodas, activas, setActivas, recargarCustoms, recargarInventario }: { salesTodas: Sal[]; activas: Set<string>; setActivas: SetSet; recargarCustoms: () => void; recargarInventario: () => void }) {
  const [form, setForm] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [soloConPrecio, setSoloConPrecio] = useState(true)
  // Visibles: con el filtro ON, oculta las sales sin precio (que Gastón no usa),
  // pero mantiene siempre los productos comerciales (para clonar).
  const visibles = soloConPrecio
    ? salesTodas.filter(s => (s.costoKg != null && s.costoKg > 0) || esComercial(s))
    : salesTodas
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <FlaskRound className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Sustancias disponibles</h3>
          <Info><b className="text-[#d9f99d]">Las sales que la app puede usar</b> en la receta. Activá las que tenés, cargá su precio, o agregá las tuyas.<br /><span className="text-[#a3e635]">Ej: destildá las que no tenés para que no las use el solver.</span></Info>
          <span className="ml-auto text-[10px] text-[#5c5c6b]">{visibles.length} visibles</span>
          <button onClick={() => setSoloConPrecio(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-colors ${
              soloConPrecio ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]' : 'bg-[#15151d] border-[#1f1f2b] text-[#8f8f9f] hover:text-[#d4d4dd]'
            }`} title="Oculta las sales sin precio cargado">
            {soloConPrecio ? '✓ Solo con precio' : 'Mostrar todas'}
          </button>
          <button onClick={() => setForm(f => !f)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        </div>
        {form && <NuevaSustancia onClose={() => setForm(false)} onSaved={recargarCustoms} />}
        {(() => {
          // agrupar por categoría, ordenadas
          const grupos = new Map<number, { label: string; items: Sal[] }>()
          for (const s of visibles) {
            const cat = categoriaSal(s)
            if (!grupos.has(cat.orden)) grupos.set(cat.orden, { label: cat.label, items: [] })
            grupos.get(cat.orden)!.items.push(s)
          }
          const ordenadas = [...grupos.entries()].sort((a, b) => a[0] - b[0])
          for (const [, g] of ordenadas) g.items.sort((a, b) => a.nombre.localeCompare(b.nombre))
          return ordenadas.map(([orden, g]) => (
            <div key={orden} className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-semibold mb-1.5 px-0.5">{g.label} <span className="text-[#3a3a4a]">· {g.items.length}</span></p>
              <div className="space-y-1.5">
                {g.items.map((s: Sal) => {
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
          ))
        })()}
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
        <Info><b className="text-[#d9f99d]">Lo que tu agua ya trae</b> antes de agregar sales. Se descuenta del objetivo. Con ósmosis (RO) dejá todo en 0.<br /><span className="text-[#a3e635]">Ej: agua de canilla con 30 ppm Ca → la app agrega sales solo para el resto.</span></Info>
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
function ConcentradosTab({ factor, setFactor, volBidon, setVolBidon, resolucion, setResolucion, guardados, salesTodas }: { factor: number; setFactor: (n: number) => void; volBidon: number; setVolBidon: (n: number) => void; resolucion: number; setResolucion: (n: number) => void; guardados: PerfilGuardado[]; salesTodas: Sal[] }) {
  // botella madre de cada perfil/clon guardado
  const botellasGuardadas = guardados.map(g => {
    const salesDisp = salesTodas.filter(s => (g.sales ?? []).includes(s.id))
    const r = calcularReceta(g.perfil, salesDisp, g.agua ?? {})
    return { nombre: g.nombre, concentrados: calcularConcentrados(r.dosis, factor, volBidon) }
  }).filter(b => b.concentrados.length > 0)

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Soluciones madre</h3>
          <Info><b className="text-[#d9f99d]">Concentrados listos</b> de tus clones guardados. Preparás una vez y después solo diluís en cada riego.<br /><span className="text-[#a3e635]">Ej: 1 L de concentrado 100x rinde 100 L de riego.</span></Info>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="text-[11px] text-[#a6a6b5]">Factor de concentración
            <Info><b className="text-[#d9f99d]">Cuántas veces concentrada</b> es la solución madre respecto al riego final. Pesás lo mismo pero en menos agua, y después diluís.<br /><span className="text-[#a3e635]">Ej: 100x = 1 L de concentrado rinde 100 L de riego (agregás 10 mL por litro).</span></Info>
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={1} step={1} value={factor} onChange={e => setFactor(Math.max(1, +e.target.value))} className={`${inp} w-24`} />
              <span className="text-[#5c5c6b]">x</span>
            </div>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Volumen de cada bidón
            <Info><b className="text-[#d9f99d]">Litros de la botella</b> concentrada que vas a preparar. Define cuántos gramos totales pesás para llenarla.<br /><span className="text-[#a3e635]">Ej: bidón de 1 L a 100x → adentro va lo que rinde 100 L de riego.</span></Info>
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={0.1} step={0.5} value={volBidon} onChange={e => setVolBidon(Math.max(0.1, +e.target.value))} className={`${inp} w-24`} />
              <span className="text-[#5c5c6b]">L</span>
            </div>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Precisión de balanza
            <Info><b className="text-[#d9f99d]">El salto mínimo de tu balanza</b>. La app redondea los gramos a lo que tu balanza puede pesar de verdad, y activa el asistente de solución stock para lo impesable.<br /><span className="text-[#a3e635]">Ej: elegí 0.01 g si tu balanza muestra dos decimales.</span></Info>
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

      {/* Galería: una botella madre por cada clon/perfil guardado */}
      {botellasGuardadas.length === 0 ? (
        <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Todavía no tenés clones guardados. Cloná un producto y guardalo con un nombre en la pestaña Calculadora.</p>
      ) : (
        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] font-semibold mb-2 px-0.5">Mis soluciones madre guardadas · {botellasGuardadas.length}</p>
          <div className="space-y-3">
            {botellasGuardadas.map((b, i) => (
              <div key={i} className={card}>
                <p className="text-[12px] font-display font-semibold text-[#d9f99d] mb-2">🧴 {b.nombre}</p>
                <BotellasGrid concentrados={b.concentrados} resolucion={resolucion} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#5c5c6b] px-1">
        Regla de oro: al tanque final echá primero el bidón A (calcio), agitá, después el B. Nunca juntes A y B concentrados.
        Para tener tus clones acá, guardalos con un nombre en la pestaña Calculadora.
      </p>
    </div>
  )
}

// Botella dibujada por bidón (SVG)
function BotellaSVG({ color, letra, volumenL }: { color: string; letra: string; volumenL: number }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <svg viewBox="0 0 48 76" width="52" height="82">
        <rect x="18" y="2" width="12" height="7" rx="2" fill={color} opacity="0.9" />
        <rect x="20" y="9" width="8" height="6" fill={color} opacity="0.45" />
        <rect x="8" y="15" width="32" height="56" rx="7" fill={color} opacity="0.10" stroke={color} strokeWidth="1.6" />
        <rect x="10.5" y="34" width="27" height="35" rx="5" fill={color} opacity="0.32" />
        <text x="24" y="50" textAnchor="middle" fontSize="19" fontWeight="bold" fill={color} fontFamily="monospace">{letra}</text>
      </svg>
      <span className="text-[10px] text-[#5c5c6b] mt-0.5 tabular-nums">{volumenL} L</span>
    </div>
  )
}

// Grilla de botellas (bidones) reutilizable
function BotellasGrid({ concentrados, resolucion }: { concentrados: BidonConcentrado[]; resolucion: number }) {
  const unica = concentrados.length === 1
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {concentrados.map((g: BidonConcentrado) => (
        <div key={g.bidon} className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
          <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-2" style={{ color: BIDON_INFO[g.bidon].color }}>
            {unica ? 'Botella única · todo junto' : BIDON_INFO[g.bidon].label}
          </p>
          <div className="flex gap-3">
            <BotellaSVG color={BIDON_INFO[g.bidon].color} letra={g.bidon} volumenL={g.volumenL} />
            <div className="flex-1 min-w-0 space-y-1">
              {g.items.map(it => {
                const gv = resolucion > 0 ? redondearBalanza(it.gramos, resolucion) : it.gramos
                return (
                  <div key={it.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
                    <span className="text-[11px] text-[#d4d4dd] flex-1 min-w-0 truncate">{it.sal.nombre}</span>
                    <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">
                      {it.mlSiLiquido != null ? `${it.mlSiLiquido} mL` : `${gv} g`}
                    </span>
                  </div>
                )
              })}
              <p className="text-[10px] text-[#5c5c6b] pt-1">+ agua hasta {g.volumenL} L</p>
            </div>
          </div>
          {g.advertencia && (
            <div className="flex items-start gap-2 mt-2 rounded-lg bg-[#ff8a7a]/08 border border-[#ff8a7a]/25 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#ff8a7a]" strokeWidth={1.8} />
              <p className="text-[10.5px] text-[#d4a89f]">{g.advertencia}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ===================== RATIOS Y COSTO =====================
// ===================== PROVEEDORES =====================
// Opciones de presentación: el precio se carga por la bolsa como viene, y calculamos el $/kg.
const UNIDADES_PROV: { v: string; l: string }[] = [
  { v: '100g', l: 'por 100 g' }, { v: '500g', l: 'por 500 g' }, { v: '1kg', l: 'por 1 kg' },
  { v: '2kg', l: 'por 2 kg' }, { v: '5kg', l: 'por 5 kg' }, { v: '10kg', l: 'por 10 kg' },
  { v: '20kg', l: 'por 20 kg' }, { v: '25kg', l: 'por 25 kg' }, { v: 'kg', l: 'por kg (directo)' },
  { v: 'unidad', l: 'por unidad/bolsa' }, { v: 'L', l: 'por litro' },
]
const KG_UNIDAD: Record<string, number> = { g: 0.001, '100g': 0.1, '500g': 0.5, kg: 1, '1kg': 1, '2kg': 2, '5kg': 5, '10kg': 10, '20kg': 20, '25kg': 25 }
/** Precio por kg a partir del precio de la bolsa y su tamaño. null si la unidad no es de peso. */
function precioPorKg(precio?: number | null, unidad?: string | null): number | null {
  const k = KG_UNIDAD[unidad ?? '']
  return (precio != null && k) ? +(precio / k).toFixed(2) : null
}

function ProveedoresTab({ salesTodas }: { salesTodas: Sal[] }) {
  const vacio = { sal_id: '', nombre_local: '', telefono: '', pagina: '', precio: '', unidad: '1kg', presentacion: '', calidad: 'alta', imagen: '', nota: '' }
  const [provs, setProvs] = useState<Proveedor[]>([])
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState<Proveedor | null>(null) // ficha abierta (ver/editar)
  const [filtroSal, setFiltroSal] = useState('') // '' = todas
  const cargar = () => { proveedoresService.list().then(setProvs).catch(() => setProvs([])) }
  useEffect(cargar, [])

  // solo materias primas (sales/insumos que se COMPRAN), no los productos de marca que se clonan
  const salesOrden = salesTodas.filter(s => !esComercial(s)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const salNombre = (id: string) => salesTodas.find(s => s.id === id)?.nombre ?? id
  const calColor = (c?: string | null) => c === 'alta' ? '#a3e635' : c === 'media' ? '#facc15' : '#ff8a7a'

  const onImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 3_000_000) { toast.error('Imagen muy grande (máx 3 MB)'); return }
    const r = new FileReader(); r.onload = () => setForm(v => ({ ...v, imagen: String(r.result) })); r.readAsDataURL(f)
  }
  const guardar = async () => {
    if (!form.sal_id || !form.nombre_local.trim()) { toast.error('Elegí la sal y el nombre del local'); return }
    setGuardando(true)
    try {
      await proveedoresService.crear({
        sal_id: form.sal_id, nombre_local: form.nombre_local.trim(),
        telefono: form.telefono || null, pagina: form.pagina || null,
        precio: form.precio ? +form.precio : null, unidad: form.unidad,
        presentacion: form.presentacion || null, calidad: form.calidad,
        imagen: form.imagen || null, nota: form.nota || null,
      })
      toast.success('Proveedor guardado'); setForm(vacio); cargar()
    } catch (e) { toast.error('No se pudo guardar: ' + (e instanceof Error ? e.message : String(e))) } finally { setGuardando(false) }
  }
  const borrar = async (id: string) => { try { await proveedoresService.eliminar(id); toast.success('Eliminado'); cargar() } catch (e) { toast.error(String(e)) } }
  const onImagenDetalle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !detalle) return
    if (f.size > 3_000_000) { toast.error('Imagen muy grande (máx 3 MB)'); return }
    const r = new FileReader(); r.onload = () => setDetalle(v => v ? { ...v, imagen: String(r.result) } : v); r.readAsDataURL(f)
  }
  const guardarEdicion = async () => {
    if (!detalle) return
    if (!detalle.nombre_local?.trim()) { toast.error('Falta el nombre del local'); return }
    setGuardando(true)
    try {
      await proveedoresService.actualizar(detalle.id, {
        sal_id: detalle.sal_id, nombre_local: detalle.nombre_local.trim(),
        telefono: detalle.telefono || null, pagina: detalle.pagina || null,
        precio: detalle.precio ?? null, unidad: detalle.unidad || 'kg',
        presentacion: detalle.presentacion || null, calidad: detalle.calidad || 'alta',
        imagen: detalle.imagen || null, nota: detalle.nota || null,
      })
      toast.success('Ficha actualizada'); setDetalle(null); cargar()
    } catch (e) { toast.error('No se pudo: ' + (e instanceof Error ? e.message : String(e))) } finally { setGuardando(false) }
  }
  const setD = (k: keyof Proveedor, v: unknown) => setDetalle(d => d ? { ...d, [k]: v } : d)

  // sales que tienen al menos un proveedor (para el filtro), ordenadas por nombre
  const salesConProv = [...new Set(provs.map(p => p.sal_id))]
    .map(id => ({ id, nombre: salNombre(id) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  const provsFiltrados = filtroSal ? provs.filter(p => p.sal_id === filtroSal) : provs
  const porSal = new Map<string, Proveedor[]>()
  for (const p of provsFiltrados) { const a = porSal.get(p.sal_id) ?? []; a.push(p); porSal.set(p.sal_id, a) }
  const ordenCal = { alta: 0, media: 1, baja: 2 } as Record<string, number>

  return (
    <div className="space-y-4">
      {/* Alta de proveedor */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Agregar proveedor</h3>
          <Info><b className="text-[#d9f99d]">Directorio de dónde comprar cada sal</b>: local, teléfono, página, precio, presentación e imagen. Podés cargar varios por sal.<br /><span className="text-[#a3e635]">Se prioriza la CALIDAD, no el precio.</span></Info>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
          <label className="text-[11px] text-[#a6a6b5]">Sal / insumo *
            <select value={form.sal_id} onChange={e => setForm(v => ({ ...v, sal_id: e.target.value }))} className={`${inp} mt-1`}>
              <option value="">— elegí la sal —</option>
              {salesOrden.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Nombre del local *
            <input value={form.nombre_local} onChange={e => setForm(v => ({ ...v, nombre_local: e.target.value }))} placeholder="ej. AgroCentral" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Calidad
            <select value={form.calidad} onChange={e => setForm(v => ({ ...v, calidad: e.target.value }))} className={`${inp} mt-1`}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Teléfono
            <input value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value }))} placeholder="ej. 0351 442-1600" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Página / link
            <input value={form.pagina} onChange={e => setForm(v => ({ ...v, pagina: e.target.value }))} placeholder="ej. agrocentral.com.ar" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Presentación
            <input value={form.presentacion} onChange={e => setForm(v => ({ ...v, presentacion: e.target.value }))} placeholder="ej. 25 kg / 1 kg" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Precio de la bolsa (ARS)
            <input type="number" value={form.precio} onChange={e => setForm(v => ({ ...v, precio: e.target.value }))} placeholder="ej. 27596" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Presentación (tamaño)
            <select value={form.unidad} onChange={e => setForm(v => ({ ...v, unidad: e.target.value }))} className={`${inp} mt-1`}>
              {UNIDADES_PROV.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
            {form.precio && precioPorKg(+form.precio, form.unidad) != null && <span className="text-[10px] text-[#a3e635] block mt-0.5">= ${precioPorKg(+form.precio, form.unidad)}/kg</span>}
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Foto (etiqueta/precio)
            <div className="mt-1 flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#d9f99d] cursor-pointer">
                <Upload className="w-3.5 h-3.5" strokeWidth={1.8} /> Subir
                <input type="file" accept="image/*" onChange={onImagen} className="hidden" />
              </label>
              {form.imagen && <img src={form.imagen} alt="" className="w-8 h-8 rounded object-cover border border-[#1f1f2b]" />}
            </div>
          </label>
        </div>
        <label className="text-[11px] text-[#a6a6b5] block mt-2">Nota
          <input value={form.nota} onChange={e => setForm(v => ({ ...v, nota: e.target.value }))} placeholder="ej. pedir por WhatsApp, mínimo 5 kg…" className={`${inp} mt-1`} />
        </label>
        <button onClick={guardar} disabled={guardando} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors disabled:opacity-50">
          <Store className="w-3.5 h-3.5" strokeWidth={1.8} /> Guardar proveedor
        </button>
      </div>

      {/* Filtro por sal */}
      {provs.length > 0 && (
        <div className={`${card} flex items-center gap-2 flex-wrap`}>
          <span className="text-[11px] text-[#a6a6b5] font-medium">Filtrar por sal:</span>
          <select value={filtroSal} onChange={e => setFiltroSal(e.target.value)} className={`${inp} w-auto min-w-[220px]`}>
            <option value="">Todas ({provs.length} proveedores)</option>
            {salesConProv.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          {filtroSal && <button onClick={() => setFiltroSal('')} className="text-[11px] px-2 py-1 rounded border border-[#1f1f2b] text-[#8f8f9f] hover:text-[#d9f99d]">Ver todas</button>}
        </div>
      )}

      {/* Listado agrupado por sal */}
      {provs.length === 0 ? (
        <p className="text-[12px] text-[#5c5c6b] py-6 text-center">Todavía no cargaste proveedores. Agregá el primero arriba.</p>
      ) : provsFiltrados.length === 0 ? (
        <p className="text-[12px] text-[#5c5c6b] py-6 text-center">No hay proveedores para esa sal.</p>
      ) : (
        <div className="space-y-3">
          {[...porSal.entries()].map(([salId, lista]) => (
            <div key={salId} className={card}>
              <p className="text-[12px] font-display font-semibold text-[#d9f99d] mb-2">{salNombre(salId)} <span className="text-[10px] text-[#5c5c6b]">· {lista.length} proveedor{lista.length > 1 ? 'es' : ''}</span></p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[...lista].sort((a, b) => (ordenCal[a.calidad ?? 'baja'] ?? 3) - (ordenCal[b.calidad ?? 'baja'] ?? 3)).map(p => (
                  <div key={p.id} onClick={() => setDetalle(p)} title="Ver / editar ficha"
                    className="rounded-lg bg-[#15151d] border border-[#1f1f2b] p-2.5 flex gap-2.5 cursor-pointer hover:border-[#404d20] transition-colors">
                    {p.imagen && <img src={p.imagen} alt="" className="w-14 h-14 rounded object-cover border border-[#1f1f2b] flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-[#ececf1] truncate">{p.nombre_local}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5" style={{ color: calColor(p.calidad), background: `${calColor(p.calidad)}18` }}>
                          <Star className="w-2.5 h-2.5" strokeWidth={2} /> {p.calidad}
                        </span>
                        <button onClick={e => { e.stopPropagation(); borrar(p.id) }} className="ml-auto p-0.5 rounded text-[#5c5c6b] hover:text-[#ff8a7a]"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                      </div>
                      <div className="text-[10.5px] text-[#a6a6b5] mt-0.5 space-y-0.5">
                        {p.precio != null && <div className="font-mono"><span className="text-[#d4d4dd]">${p.precio}</span> <span className="text-[#757584]">/ {p.unidad}</span>{precioPorKg(p.precio, p.unidad) != null && <span className="text-[#a3e635]"> · ${precioPorKg(p.precio, p.unidad)}/kg</span>}{p.presentacion ? <span className="text-[#5c5c6b]"> · {p.presentacion}</span> : null}</div>}
                        {p.telefono && <div className="flex items-center gap-1"><Phone className="w-3 h-3" strokeWidth={1.8} /> {p.telefono}</div>}
                        {p.pagina && <a onClick={e => e.stopPropagation()} href={p.pagina.startsWith('http') ? p.pagina : `https://${p.pagina}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#7dd3fc] hover:underline truncate"><Globe className="w-3 h-3" strokeWidth={1.8} /> {p.pagina}</a>}
                        {p.nota && <div className="text-[10px] text-[#757584] line-clamp-1">{p.nota}</div>}
                      </div>
                      <p className="text-[9px] text-[#5c5c6b] mt-1">Tocá para ver / editar ▸</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[#5c5c6b] px-1">Podés cargar varios proveedores por sal. Tocá una ficha para ver el detalle y editarla. Se ordenan por calidad (Alta primero); prioriza calidad, no precio.</p>

      {/* Modal ficha detalle / edición */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDetalle(null)}>
          <div className="bg-[#101016] border border-[#2a2a38] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ficha del proveedor</h3>
              <span className="text-[10px] text-[#5c5c6b]">· {salNombre(detalle.sal_id)}</span>
              <button onClick={() => setDetalle(null)} className="ml-auto p-1 rounded text-[#5c5c6b] hover:text-[#d4d4dd]"><X className="w-4 h-4" strokeWidth={1.8} /></button>
            </div>

            {/* imagen grande */}
            <div className="mb-3">
              {detalle.imagen ? (
                <img src={detalle.imagen} alt="" className="w-full max-h-56 object-contain rounded-lg border border-[#1f1f2b] bg-[#0a0a0f]" />
              ) : (
                <div className="w-full h-24 rounded-lg border border-dashed border-[#2a2a38] flex items-center justify-center text-[11px] text-[#5c5c6b]">Sin imagen</div>
              )}
              <label className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#d9f99d] cursor-pointer">
                <Upload className="w-3.5 h-3.5" strokeWidth={1.8} /> {detalle.imagen ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={onImagenDetalle} className="hidden" />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <label className="text-[11px] text-[#a6a6b5]">Nombre del local
                <input value={detalle.nombre_local ?? ''} onChange={e => setD('nombre_local', e.target.value)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Calidad
                <select value={detalle.calidad ?? 'alta'} onChange={e => setD('calidad', e.target.value)} className={`${inp} mt-1`}>
                  <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
              <label className="text-[11px] text-[#a6a6b5]">Teléfono
                <input value={detalle.telefono ?? ''} onChange={e => setD('telefono', e.target.value)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Página / link
                <input value={detalle.pagina ?? ''} onChange={e => setD('pagina', e.target.value)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Precio de la bolsa (ARS)
                <input type="number" value={detalle.precio ?? ''} onChange={e => setD('precio', e.target.value ? +e.target.value : null)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Presentación (tamaño)
                <select value={detalle.unidad ?? '1kg'} onChange={e => setD('unidad', e.target.value)} className={`${inp} mt-1`}>
                  {UNIDADES_PROV.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}</select>
                {precioPorKg(detalle.precio, detalle.unidad) != null && <span className="text-[10px] text-[#a3e635] block mt-0.5">= ${precioPorKg(detalle.precio, detalle.unidad)}/kg</span>}</label>
              <label className="text-[11px] text-[#a6a6b5]">Presentación
                <input value={detalle.presentacion ?? ''} onChange={e => setD('presentacion', e.target.value)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Nota
                <input value={detalle.nota ?? ''} onChange={e => setD('nota', e.target.value)} className={`${inp} mt-1`} /></label>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={guardarEdicion} disabled={guardando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 disabled:opacity-50">
                <Save className="w-3.5 h-3.5" strokeWidth={1.8} /> Guardar cambios
              </button>
              <button onClick={() => setDetalle(null)} className="px-3 py-1.5 rounded-md text-[12px] text-[#8f8f9f] border border-[#1f1f2b] hover:text-[#d4d4dd]">Cerrar</button>
              <button onClick={() => { const id = detalle.id; setDetalle(null); borrar(id) }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#ff8a7a] border border-[#ff8a7a]/25 hover:bg-[#ff8a7a]/10">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /> Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const RATIO_INFO: Record<string, { ideal: string; desc: string }> = {
  'N:K': { ideal: '~1 a 1.5', desc: 'Nitrógeno vs potasio. En veg querés más N (crecimiento); en flora más K (engorde) → el ratio baja.' },
  'K:Ca': { ideal: '~1.2', desc: 'Potasio vs calcio. Si el K se dispara, bloquea la entrada de Ca (blossom-end rot). Mantenelos parejos.' },
  'Ca:Mg': { ideal: '~3 a 4', desc: 'Calcio vs magnesio. Clásico 3:1 a 4:1. Mucho Ca frena el Mg (clorosis entre nervios).' },
  'K:Mg': { ideal: '~4 a 5', desc: 'Potasio vs magnesio. Si el K es muy alto, la planta absorbe poco Mg aunque haya.' },
  'NO3:NH4': { ideal: '~8 a 10', desc: 'Nitrato vs amonio. Mucho amonio acidifica y da plantas blandas; el nitrato es el N seguro en coco.' },
}

// Contenido de la guía / ayuda
const GUIA_PASOS: { n: number; t: string; d: string; ej: string }[] = [
  { n: 1, t: 'Elegí un objetivo', d: 'Todo arranca definiendo QUÉ querés lograr, en ppm (partes por millón de cada nutriente). En la pestaña Calculadora podés escribir los valores a mano, o tocar un preset armado (Vegetativo, Floración, Finish) que ya trae números probados para coco. El "objetivo" es la meta: la app va a buscar la mezcla de sales que llegue justo a esos números.', ej: 'Ejemplo: para flora en coco cargás algo como N 150 · P 55 · K 200 · Ca 170 · Mg 55 · S 90. O tocás el preset "Floración" y ya te los completa.' },
  { n: 2, t: 'O cloná una marca', d: 'Si no querés inventar la receta, copiá una comercial. En Clonar marca elegís un producto (Ryanodine Calcis, Athena Fade, Advanced Nutrients, etc.) y la app calcula el perfil ppm que da ese producto a su dosis de etiqueta, y arma la receta con sales crudas baratas que igualan ese perfil. Es como comprar la marca pero pagando la materia prima.', ej: 'Ejemplo: clonás "Ryanodine Calcis" → la app te dice que con 0.75 g/L de nitrato de calcio agrícola conseguís el mismo Ca y N que el producto original, mucho más barato.' },
  { n: 3, t: 'Ajustá tu agua', d: 'El agua NO siempre está en cero: el agua de canilla ya trae calcio, magnesio, sodio, etc. En la pestaña Agua cargás el análisis de tu agua y la app lo DESCUENTA del objetivo (solo agrega lo que falta). Si usás agua de ósmosis (RO), dejá todo en cero porque viene limpia.', ej: 'Ejemplo: si tu agua ya trae 30 ppm de Ca y tu objetivo es 170, la app solo agrega sales para los 140 que faltan.' },
  { n: 4, t: 'Mirá "Logrado vs objetivo"', d: 'La tabla del medio te muestra, elemento por elemento, cuánto pediste (Objetivo) y cuánto conseguís realmente con la receta (Logrado), más un rango verde. Si dice EN RANGO en verde, tu receta clava el objetivo. Si algo queda "bajo" o "alto", ajustás. El cloro y el sodio no se evalúan (son indeseados).', ej: 'Ejemplo: Calcio objetivo 170, logrado 168, rango 145–195 → EN RANGO ✓. Perfecto, no toques nada.' },
  { n: 5, t: 'Pesá las sales', d: 'La tarjeta "Receta" te da los gramos por litro de cada sal. Escribí cuántos litros vas a preparar y los gramos se recalculan para ese volumen. Si un micro pide una cantidad imposible de pesar (ej. 0.0006 g), aparece solo el asistente de Solución stock: pesás grande una vez y después dosificás por mililitros con jeringa.', ej: 'Ejemplo: la receta dice MKP 0.24 g/L y preparás 10 L → pesás 2.4 g de MKP. El molibdato pide 0.0004 g/L → usás el stock.' },
  { n: 6, t: 'Armá las soluciones madre', d: 'Si preferís tener concentrados listos (en vez de pesar cada vez), en Soluciones madre guardás cada receta como botella(s) concentradas. La app separa el bidón A (calcio) del B (sulfatos/fosfatos) cuando es líquido, porque juntos precipitan. Después, en el tanque, echás primero A y luego B.', ej: 'Ejemplo: guardás tu "Flora coco" como un concentrado 100x. Preparás 1 L de A y 1 L de B; con eso regás 100 L simplemente diluyendo.' },
  { n: 7, t: 'Controlá pH, balance y costo', d: 'Última parada: en Ajuste de pH ves cuánto ácido/base agregar para llegar a 5.8–6.2 (ideal coco). En Ratios y costo ves el balance iónico (te avisa si el pH del riego va a subir o bajar), los ratios entre nutrientes, y cuánto te sale por litro. Con eso sabés si la fórmula es sana y barata antes de regar.', ej: 'Ejemplo: el balance te dice "pH tiende a subir" (mucho nitrato) → sabés que vas a tener que bajar con un poco de ácido en cada riego.' },
]
const GUIA_PESTANAS: { icon: typeof Calculator; t: string; d: string; ej: string }[] = [
  { icon: Calculator, t: 'Calculadora', d: 'El corazón de todo. Cargás el objetivo en ppm (o un preset), elegís qué sales tenés disponibles, y la app resuelve la mejor receta y te muestra el logrado vs objetivo con rangos de color. También ajustás litros a preparar y modo polvo/líquido.', ej: 'Usala cuando: querés armar una receta desde cero o ver la receta de un clon.' },
  { icon: Copy, t: 'Clonar marca', d: 'Copiás un producto comercial. Elegís la marca y el producto, la app genera su perfil ppm a la dosis recomendada, y te arma la receta casera equivalente con el hierro y micros fieles a esa marca. Ideal para dejar de comprar caro.', ej: 'Usala cuando: usás Athena/Ryanodine/AN y querés hacerlo vos más barato.' },
  { icon: FlaskRound, t: 'Sustancias', d: 'La base de datos de sales: nitrato de calcio, MKP, Epsom, micros, etc. Ves la composición química de cada una, su precio por kg, y podés activar/desactivar cuáles usar o cargar tus propias sales con su análisis.', ej: 'Usala cuando: cargás un precio nuevo, agregás una sal que compraste, o querés filtrar solo las que tenés.' },
  { icon: Droplets, t: 'Agua', d: 'El análisis de tu agua de partida. Cargás los ppm que ya trae tu agua (calcio, magnesio, sodio, alcalinidad) y la app los resta del objetivo. Con ósmosis (RO) dejás todo en cero.', ej: 'Usala cuando: regás con agua de canilla o pozo y tenés su análisis.' },
  { icon: Layers, t: 'Soluciones madre', d: 'Tus clones guardados convertidos en botellas concentradas listas para preparar, con el dibujo de cada bidón y los gramos exactos. Elegís el factor de concentración (ej. 100x) y el volumen de la botella.', ej: 'Usala cuando: querés preparar stock concentrado para no pesar en cada riego.' },
  { icon: ShieldCheck, t: 'Estabilizantes', d: 'Qué aditivos sumar para que un concentrado líquido no precipite (se ponga turbio o tire sedimento) ni se contamine con hongos. Te recomienda cítrico como quelante, benzoato como conservante, etc., con las dosis.', ej: 'Usala cuando: hacés concentrados líquidos que vas a guardar semanas.' },
  { icon: Droplet, t: 'Ajuste de pH', d: 'Cuánto ácido (para bajar) o base (para subir) agregar para llevar la solución al rango del coco (5.8–6.2). Elegís el corrector (ácido fosfórico, cítrico, etc.) y te da los mL.', ej: 'Usala cuando: mediste el pH y está fuera de 5.8–6.2.' },
  { icon: GitCompare, t: 'Comparar', d: 'Poné dos perfiles guardados lado a lado para ver en qué se diferencian (más K acá, menos N allá). Útil para comparar tu clon casero contra el objetivo, o dos etapas.', ej: 'Usala cuando: querés ver la diferencia entre veg y flora, o entre dos marcas.' },
  { icon: Scale, t: 'Ratios y costo', d: 'Tres cosas: los ratios nutricionales (proporciones que avisan antagonismos), el balance iónico en mEq (valida la receta y predice la deriva de pH), y el costo por litro de la fórmula. Es el control de calidad final.', ej: 'Usala cuando: querés saber si la receta es sana, coherente y cuánto sale.' },
]
const GUIA_CONCEPTOS: { t: string; d: string; ej: string }[] = [
  { t: 'ppm (mg/L)', d: 'Partes por millón = miligramos de un nutriente por litro de agua. Es la unidad con la que se mide "cuánto" de cada cosa hay en tu solución. Todo el objetivo y el logrado se expresan en ppm.', ej: '150 ppm de nitrógeno = 150 mg de N en cada litro de agua.' },
  { t: 'EC (mS/cm)', d: 'Electroconductividad: mide cuán "cargada" de sales está el agua (a más sales, más conduce electricidad). Es tu termómetro de fuerza de la solución. La medís con un lápiz medidor de EC/TDS.', ej: 'Coco: veg 1.2–1.8, flora 1.8–2.4, finish ~1.3. Si medís EC 3.0 estás pasado de sales (riesgo de quemar).' },
  { t: 'Bidón A / B / C', d: 'La receta líquida se separa en botellas porque hay sales que juntas y concentradas reaccionan. A = el calcio (nitrato de calcio). B = sulfatos y fosfatos (Epsom, MKP, sulfato de K). C = micros. En el tanque van de a uno: primero A, agitás, después B.', ej: 'Si juntás calcio (A) con sulfato (B) concentrados, se forma yeso y precipita (se va al fondo, blanco). Por eso van separados.' },
  { t: 'Ratios', d: 'Es la proporción entre dos nutrientes. Importa porque algunos compiten: si uno está muy alto, la planta absorbe de menos el otro aunque sobre (antagonismo). Mantener los ratios en rango evita carencias "fantasma".', ej: 'Ca:Mg ideal ~3:1. Si tenés mucho potasio, bloquea el calcio y el magnesio aunque los hayas puesto.' },
  { t: 'Balance iónico (mEq)', d: 'Toda sal se disuelve en iones con carga + (cationes: Ca, Mg, K, NH₄) y – (aniones: NO₃, SO₄, fosfato, Cl). En una receta real, las cargas + deben igualar a las –. Si no cierran, la fórmula es físicamente imposible. Además, el % de amonio predice hacia dónde se mueve el pH del riego.', ej: 'Mucho amonio (NH₄) → la planta libera H⁺ → el pH del sustrato BAJA. Mucho nitrato → el pH SUBE.' },
  { t: 'Solución stock (madre)', d: 'Truco para dosificar cantidades que ninguna balanza casera pesa. En vez de pesar 0.0006 g, pesás 1 gramo (que sí podés), lo disolvés en agua, y de esa botella agregás unos mililitros con jeringa. La dilución hace el trabajo fino.', ej: '1 g de molibdato en 1 L de agua → agregás 0.6 mL por litro = los 0.0006 g exactos, medidos con jeringa.' },
  { t: 'Óxido → elemental', d: 'Las etiquetas de fertilizante dan el fósforo y potasio como óxidos (P₂O₅, K₂O), no como elemento puro. La app los convierte a P y K reales automáticamente, así los números cierran con la química de verdad.', ej: 'Una etiqueta "0-15-25" tiene 15% de P₂O₅ = 6.5% de fósforo real, y 25% de K₂O = 20.7% de potasio real.' },
  { t: 'Nitrato vs Amonio (NO₃ / NH₄)', d: 'Son las dos formas del nitrógeno. El nitrato es el N "seguro" y estable en coco. El amonio es más rápido pero en exceso acidifica y da plantas blandas. La app los separa porque afectan distinto al pH y a la planta.', ej: 'Una buena fórmula de coco tiene ~90% nitrato y ~10% amonio.' },
]

function AyudaTab({ irA }: { irA: (s: SubTab) => void }) {
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-[#facc15]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">¿Necesitás ayuda? Empezá acá</h3>
        </div>
        <p className="text-[11px] text-[#a6a6b5]">Esta calculadora arma recetas de fertilizante desde cero o clonando marcas comerciales, con las sales crudas más baratas. Abajo tenés todo explicado.</p>
      </div>

      {/* Guía paso a paso */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Guía paso a paso</h3>
        </div>
        <div className="space-y-2">
          {GUIA_PASOS.map(p => (
            <div key={p.n} className="flex gap-3 bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
              <div className="w-6 h-6 flex-shrink-0 rounded-full bg-[#a3e635]/15 text-[#a3e635] text-[12px] font-bold flex items-center justify-center">{p.n}</div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#ececf1]">{p.t}</p>
                <p className="text-[10.5px] text-[#9494a3] leading-relaxed">{p.d}</p>
                <p className="text-[10px] text-[#a3e635]/80 leading-snug mt-1 border-l-2 border-[#a3e635]/30 pl-2">{p.ej}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Qué es cada pestaña */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-[#7dd3fc]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Qué hace cada pestaña</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {GUIA_PESTANAS.map(t => {
            const Icon = t.icon
            return (
              <div key={t.t} className="flex gap-2.5 bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#a78bfa]" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-[#d9f99d]">{t.t}</p>
                  <p className="text-[10.5px] text-[#9494a3] leading-relaxed">{t.d}</p>
                  <p className="text-[10px] text-[#7dd3fc]/80 leading-snug mt-1">{t.ej}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Diccionario de conceptos */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Diccionario (en criollo)</h3>
        </div>
        <div className="space-y-2">
          {GUIA_CONCEPTOS.map(c => (
            <div key={c.t} className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
              <p className="text-[11.5px] font-semibold text-[#ececf1]">{c.t}</p>
              <p className="text-[10.5px] text-[#9494a3] leading-relaxed">{c.d}</p>
              <p className="text-[10px] text-[#bef264]/80 leading-snug mt-1 border-l-2 border-[#bef264]/30 pl-2">{c.ej}</p>
            </div>
          ))}
        </div>
        <button onClick={() => irA('calc')} className="mt-3 text-[11px] px-3 py-1.5 rounded-lg bg-[#a3e635] text-[#0a0a0f] font-semibold hover:bg-[#bef264] transition-colors">
          Ir a la Calculadora →
        </button>
      </div>
    </div>
  )
}

function RatiosTab({ ratios, res, costo }: { ratios: Ratios; res: Resultado; costo: CostoResultado }) {
  const N = nTotal(res.ppmLogrado)
  const P = res.ppmLogrado.P ?? 0, K = res.ppmLogrado.K ?? 0
  const npk = P > 0 ? `${(N / P).toFixed(1)} : 1 : ${(K / P).toFixed(1)}` : '—'
  const bal = calcularBalanceIonico(res.ppmLogrado, res.dosis)
  const desbAbs = Math.abs(bal.desbalancePct)
  const corregir = desbAbs <= 5
    ? 'Receta balanceada: las cargas cierran. No hay nada que corregir. ✓'
    : bal.desbalancePct > 5
      ? 'Sobran cationes (+). Cómo corregir: sumá una fuente de sulfato (Epsom, sulfato de K) o nitrato, o bajá un poco el K/Ca/Mg. Si usás bicarbonato de K, gluconato o silicato, un pequeño exceso es normal (su anión no es nutriente).'
      : 'Sobran aniones (–). Cómo corregir: bajá los sulfatos/fosfatos, o subí un catión (más K con nitrato de K, o Ca con nitrato de calcio).'
  const balColor = desbAbs <= 5 ? '#a3e635' : desbAbs <= 12 ? '#facc15' : '#ff8a7a'
  const balEstado = desbAbs <= 5 ? 'Balanceada ✓' : desbAbs <= 12 ? 'Leve desbalance' : 'Desbalanceada'
  const phInfo = { sube: { t: 'pH tiende a SUBIR', c: '#7dd3fc', d: 'Domina el nitrato (la planta libera OH⁻). Normal; corregí bajando con ácido.' },
    estable: { t: 'pH ESTABLE', c: '#a3e635', d: 'Relación NH₄:NO₃ equilibrada. Poca deriva.' },
    baja: { t: 'pH tiende a BAJAR', c: '#fca5a5', d: 'Mucho amonio (la planta libera H⁺). Ojo en coco, puede acidificar la rizósfera.' } }[bal.tendenciaPh]
  const catMax = Math.max(bal.cationesMeq, bal.anionesMeq, 0.001)
  return (
    <div className="space-y-4">
    <div className="grid lg:grid-cols-2 gap-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ratios nutricionales</h3>
          <Info><b className="text-[#d9f99d]">Proporciones entre nutrientes</b>. Avisan antagonismos: si uno está muy alto, bloquea la absorción de otro.<br /><span className="text-[#a3e635]">Ej: mucho K bloquea Ca y Mg aunque los hayas puesto.</span></Info>
        </div>
        <div className="space-y-1.5">
          <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-[#a6a6b5]">N : P : K</span>
              <span className="text-[12px] font-mono tabular-nums font-bold text-[#d9f99d]">{npk}</span>
            </div>
            <p className="text-[10px] text-[#6b6b7a] mt-0.5">La proporción de los 3 macros principales (siempre relativa al fósforo=1). Es la "firma" NPK de tu fórmula.</p>
          </div>
          {Object.entries(ratios).filter(([k]) => k !== 'N:P:K').map(([k, v]) => {
            const info = RATIO_INFO[k]
            return (
            <div key={k} className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] text-[#a6a6b5]">{k} {info && <span className="text-[10px] text-[#5c5c6b]">· ideal {info.ideal}</span>}</span>
                <span className="text-[12px] font-mono tabular-nums font-bold text-[#ececf1]">{(v as number) || '—'}</span>
              </div>
              {info && <p className="text-[10px] text-[#6b6b7a] mt-0.5">{info.desc}</p>}
            </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-2">Los ratios te avisan de antagonismos: si un elemento está muy alto respecto a otro, la planta absorbe de menos el segundo aunque sobre.</p>
      </div>

      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Costo del lote</h3>
          <Info><b className="text-[#d9f99d]">Cuánto sale por litro</b> tu receta, sumando el precio de cada sal. Cargá los precios en Sustancias.<br /><span className="text-[#a3e635]">Ej: te dice que tu clon del Calcis sale ~$2.3/L.</span></Info>
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

    {/* Balance iónico (mEq/L) — validación pro + tendencia de pH */}
    <div className={card}>
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-[#7dd3fc]" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Balance iónico (mEq/L)</h3>
        <Info><b className="text-[#d9f99d]">Cargas + vs –</b>: los cationes deben igualar a los aniones. Valida que la receta sea real y predice si el pH del riego sube o baja.<br /><span className="text-[#a3e635]">Ej: desbalance ≤5% = perfecta. Mucho amonio → pH baja.</span></Info>
        <span className="ml-auto text-[11px] font-semibold" style={{ color: balColor }}>{balEstado} · {bal.desbalancePct > 0 ? '+' : ''}{bal.desbalancePct}%</span>
      </div>

      {/* Barras cationes vs aniones */}
      <div className="space-y-2 mb-3">
        {([['Cationes ⊕', bal.cationesMeq, bal.detalle.cationes, '#a78bfa'], ['Aniones ⊖', bal.anionesMeq, bal.detalle.aniones, '#7dd3fc']] as const).map(([lbl, tot, items, col]) => (
          <div key={lbl}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#a6a6b5]">{lbl}</span>
              <span className="text-[12px] font-mono tabular-nums font-bold" style={{ color: col }}>{tot} mEq/L</span>
            </div>
            <div className="flex h-5 rounded overflow-hidden bg-[#15151d] border border-[#1f1f2b]" style={{ width: `${(tot / catMax) * 100}%`, minWidth: '30%' }}>
              {items.map((it, i) => (
                <div key={it.k} className="flex items-center justify-center text-[9px] text-[#0a0a0f] font-semibold" title={`${it.k}: ${it.meq} mEq/L`}
                  style={{ flex: it.meq, background: col, opacity: 1 - i * 0.14, borderRight: '1px solid #0a0a0f' }}>
                  {it.meq >= tot * 0.12 ? it.k : ''}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
          <p className="text-[10px] text-[#757584]">Desbalance carga</p>
          <p className="text-[13px] font-mono font-bold" style={{ color: balColor }}>{bal.desbalancePct > 0 ? '+' : ''}{bal.desbalancePct}%</p>
        </div>
        <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
          <p className="text-[10px] text-[#757584]">NH₄ del N total</p>
          <p className="text-[13px] font-mono font-bold text-[#d9f99d]">{bal.nh4Pct}%</p>
        </div>
        <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
          <p className="text-[10px] text-[#757584]">Tendencia pH riego</p>
          <p className="text-[12px] font-bold" style={{ color: phInfo.c }}>{phInfo.t}</p>
        </div>
      </div>
      <div className="mt-2 rounded-lg px-3 py-2 border" style={{ background: `${balColor}12`, borderColor: `${balColor}40` }}>
        <p className="text-[10.5px] font-semibold mb-0.5" style={{ color: balColor }}>Cómo interpretarlo / corregir</p>
        <p className="text-[10.5px] text-[#c4c4d0] leading-relaxed">{corregir}</p>
      </div>
      <p className="text-[10px] text-[#5c5c6b] mt-2">{phInfo.d} · Los cationes (⊕ Ca+Mg+K+NH₄) deben igualar a los aniones (⊖ NO₃+SO₄+H₂PO₄+Cl y otros). "otros⁻" = bicarbonato/gluconato/silicato (balancean pero no son nutrientes). Desbalance ≤5% = receta física real.</p>
    </div>
    </div>
  )
}

// ===================== CLONAR MARCA =====================
function ClonarTab({ productos, onUsar }: { productos: Sal[]; onUsar: (p: Perfil, salId: string) => void }) {
  const [id, setId] = useState(productos[0]?.id ?? '')
  const [dosis, setDosis] = useState(DOSIS_REC[productos[0]?.id ?? ''] ?? 3)
  function elegirProducto(nuevoId: string) {
    setId(nuevoId)
    setDosis(DOSIS_REC[nuevoId] ?? 3) // autocompleta la dosis recomendada de esa marca
  }
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
          <Info><b className="text-[#d9f99d]">Copiá una marca</b>: elegís el producto y la app arma la receta casera equivalente con sales baratas.<br /><span className="text-[#a3e635]">Ej: clonás Athena Fade → te da la mezcla que iguala su perfil por mucho menos.</span></Info>
        </div>
        <p className="text-[11px] text-[#757584] mb-3">
          Elegí un producto y su dosis: la calculadora arma el objetivo en ppm y después, en la pestaña Calculadora,
          el solver te dice qué sales sueltas usar para <b className="text-[#a6a6b5]">copiarlo</b> (más barato).
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[11px] text-[#a6a6b5]">Producto
            <select value={id} onChange={e => elegirProducto(e.target.value)} className={`${inp} mt-1`}>
              {marcas.map(m => (
                <optgroup key={m} label={m}>
                  {productos.filter(p => marcaDe(p) === m).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Dosis ({prod?.liquido ? 'mL/L' : 'g/L'})
            {DOSIS_REC[id] != null && <span className="text-[#5c5c6b] ml-1">· recomendada de la marca: {DOSIS_REC[id]}{prod?.liquido ? ' mL/L' : ' g/L'} (podés cambiarla)</span>}
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
            <button onClick={() => onUsar(perfil, prod.id)} disabled={Object.keys(perfil).length === 0}
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
          <Info><b className="text-[#d9f99d]">Cómo evitar que el concentrado precipite</b> (se ponga turbio o tire polvo al fondo) o crie hongos.<br /><span className="text-[#a3e635]">Ej: separar A/B, pH bajo, y un poco de cítrico como quelante.</span></Info>
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
          <Info><b className="text-[#d9f99d]">Qué agregar y en qué dosis</b> para conservar el concentrado líquido.<br /><span className="text-[#a3e635]">Ej: benzoato de sodio 150–250 mg/L como conservante anti-hongo.</span></Info>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-[#a6a6b5]">Volumen del bidón
            <input type="number" min={0.1} step={0.5} value={volumen} onChange={e => setVolumen(Math.max(0.1, +e.target.value))} className={`${inp} w-20`} /> L
          </label>
        </div>
        <div className="space-y-1.5">
          {[...rec.aditivos].sort((a, b) => {
            const ord = { esencial: 0, opcional: 1, evitar: 2 }
            return ord[a.info.nivel] - ord[b.info.nivel]
          }).map(({ info, cantidad }) => {
            const badge = info.nivel === 'esencial'
              ? { t: 'esencial', c: '#d9f99d', bg: 'rgba(163,230,53,0.15)' }
              : info.nivel === 'evitar'
                ? { t: 'evitar', c: '#ff8a7a', bg: 'rgba(255,138,122,0.12)' }
                : { t: 'opcional', c: '#c4b5fd', bg: 'rgba(167,139,250,0.18)' }
            const nombreColor = info.nivel === 'esencial' ? '#d9f99d' : info.nivel === 'evitar' ? '#ff8a7a' : '#a6a6b5'
            return (
              <div key={info.id} className="rounded-md bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium" style={{ color: nombreColor }}>{info.nombre}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: badge.c, background: badge.bg }}>{badge.t}</span>
                  <span className="ml-auto text-[12px] font-mono tabular-nums font-bold" style={{ color: info.nivel === 'evitar' ? '#ff8a7a' : '#ececf1' }}>
                    {info.nivel === 'evitar' ? '— no usar —' : (cantidad != null ? `${cantidad} g` : info.dosis)}
                  </span>
                </div>
                <div className="text-[10px] text-[#757584] mt-0.5">{info.funcion} · dosis {info.dosis}</div>
                <div className="text-[10.5px] text-[#a6a6b5] mt-1">{info.porque}</div>
              </div>
            )
          })}
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
          <Info><b className="text-[#d9f99d]">Cuánto ácido/base agregar</b> para llevar el pH al rango del coco (5.8–6.2).<br /><span className="text-[#a3e635]">Ej: agua alcalina → te dice los mL de ácido para bajarla.</span></Info>
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
          <Info><b className="text-[#d9f99d]">Dos recetas lado a lado</b> para ver en qué se diferencian nutriente por nutriente.<br /><span className="text-[#a3e635]">Ej: comparás tu clon casero contra el objetivo de la marca.</span></Info>
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
