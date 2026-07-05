import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical, Beaker, Droplets, ChevronDown, Sparkles, AlertTriangle,
  Save, FolderOpen, Trash2, Calculator, FlaskRound, Layers, Scale, Plus, DollarSign,
  Droplet, GitCompare, Package, ShieldCheck, Copy, HelpCircle, BookOpen, Lightbulb, Printer, Store, Phone, Globe, Upload, Star, X, Mail, MapPin, Repeat, Sprout,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SALES_DEFECTO, ELEMENTOS, PRESETS, calcularReceta, ecAprox, nTotal,
  calcularConcentrados, calcularRatios, calcularCosto, calcularBalanceIonico, calcularStocksMicros,
  redondearBalanza, AGENTES_PH, calcularAjustePH, oxidoAElemental, OXIDOS,
  recomendarEstabilizantes, esComercial, marcaDe, perfilDesdeProducto, categoriaSal, KITS_SALES, kitParaPerfil, opcionesDeMarca, DOSIS_REC, usosDeSal, compararMicros,
  CONV_OXIDO, PESO_EQ, ppmAmeq, meqAppm,
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

type SubTab = 'calc' | 'clonar' | 'sustancias' | 'proveedores' | 'agua' | 'concentrados' | 'estab' | 'ratios' | 'ph' | 'comparar' | 'conversor' | 'enraizado' | 'elicitor' | 'bioestim' | 'ayuda'

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
  { id: 'conversor', label: 'Conversor', icon: Repeat },
  { id: 'enraizado', label: 'Gel de enraizado', icon: Sprout },
  { id: 'elicitor', label: 'Elicitor DIY', icon: Sparkles },
  { id: 'bioestim', label: 'Bioestimulantes DIY', icon: Sparkles },
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

const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'
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
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

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
  async function recargarProveedores() {
    try {
      const ps = await proveedoresService.list()
      setProveedores(ps)
      // las sales que tienen proveedor se marcan en verde (activas), sin sacar las ya activas
      const conProv = ps.map(p => p.sal_id)
      setActivas(prev => new Set([...prev, ...conProv]))
    } catch { /* offline */ }
  }
  useEffect(() => {
    recargarGuardados(); recargarCustoms(); recargarInventario()
    // Al iniciar, activas (verde) = las sales que tienen al menos un proveedor cargado
    proveedoresService.list().then(ps => {
      setProveedores(ps)
      const conProv = new Set(ps.map(p => p.sal_id))
      if (conProv.size > 0) setActivas(conProv)
    }).catch(() => { /* offline: deja el default */ })
  }, [])

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
        <SustanciasTab {...{ salesTodas, activas, setActivas, recargarCustoms, inventario, recargarInventario, proveedores }} />
      )}
      {sub === 'proveedores' && (
        <ProveedoresTab salesTodas={salesTodas} recargarInventario={recargarInventario} recargarProveedores={recargarProveedores} />
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
        }} irA={setSub} />
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
      {sub === 'conversor' && (
        <ConversorTab />
      )}
      {sub === 'enraizado' && (
        <EnraizadoTab />
      )}
      {sub === 'elicitor' && (
        <ElicitorTab />
      )}
      {sub === 'bioestim' && (
        <div className="space-y-4">
          <SuperBioTab />
          <BioestimulantesTab />
        </div>
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

      {/* Micros: 2 formas de armarlos (sueltos vs micromix + refuerzo Fe) */}
      <PanelMicros2 perfil={perfil} salesTodas={salesTodas} litros={litros} resolucion={resolucion} />

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
function SustanciasTab({ salesTodas, activas, setActivas, recargarCustoms, recargarInventario, proveedores }: { salesTodas: Sal[]; activas: Set<string>; setActivas: SetSet; recargarCustoms: () => void; recargarInventario: () => void; proveedores: Proveedor[] }) {
  const [form, setForm] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [soloConPrecio, setSoloConPrecio] = useState(true)
  const usos = useMemo(() => usosDeSal(salesTodas), [salesTodas]) // qué marca/receta necesita cada sal
  // proveedores por sal + el elegido de referencia
  const provPorSal = useMemo(() => {
    const m: Record<string, { list: Proveedor[]; star?: Proveedor }> = {}
    for (const p of proveedores) { (m[p.sal_id] ??= { list: [] }).list.push(p); if (p.elegido) m[p.sal_id].star = p }
    return m
  }, [proveedores])
  const refDe = (salId: string) => {
    const e = provPorSal[salId]
    if (!e) return { tiene: false as const }
    if (e.star) return { tiene: true as const, elegido: true as const, precio: precioPorKg(e.star.precio, e.star.unidad), local: e.star.nombre_local }
    return { tiene: true as const, elegido: false as const, count: e.list.length }
  }
  // Visibles: con el filtro ON, muestra solo las que tienen proveedor (+ comerciales para clonar).
  const visibles = soloConPrecio
    ? salesTodas.filter(s => provPorSal[s.id] || esComercial(s))
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
            }`} title="Muestra solo las sales que tienen proveedor cargado">
            {soloConPrecio ? '✓ Solo con proveedor' : 'Mostrar todas'}
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
                      {(() => {
                        const r = refDe(s.id)
                        if (r.tiene && r.elegido && r.precio != null) return <span title={`Referencia: ${r.local}`} className="ml-1 text-[9px] px-1 rounded bg-[#facc15]/15 text-[#facc15] font-medium">★ ${r.precio}/kg</span>
                        if (r.tiene && !r.elegido) return <span className="ml-1 text-[9px] px-1 rounded bg-[#7dd3fc]/15 text-[#7dd3fc]">{r.count} prov · elegí ⭐</span>
                        return null
                      })()}
                    </span>
                    <span className="block text-[10px] text-[#5c5c6b] mt-0.5 line-clamp-2">{s.descripcion ?? s.nota ?? 'Sin descripción.'}</span>
                    {(() => {
                      const u = usos[s.id]
                      if (!u) return null
                      const txt = u.marcas.length >= 4 ? 'Base · casi todas las marcas'
                        : u.marcas.length ? 'Para clonar: ' + u.marcas.join(' · ')
                        : u.presets.length ? 'Recetas base' : null
                      if (!txt) return null
                      return <span className="inline-block text-[8.5px] px-1.5 py-0.5 rounded mt-1 bg-[#7dd3fc]/12 text-[#7dd3fc] font-medium">🎯 {txt}</span>
                    })()}
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

  // sales únicas que aparecen en las soluciones madre guardadas (para la matriz de compatibilidad)
  const salesEnMadres = (() => {
    const m = new Map<string, Sal>()
    botellasGuardadas.forEach(b => b.concentrados.forEach(g => g.items.forEach(it => m.set(it.sal.id, it.sal))))
    return [...m.values()]
  })()

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

      {/* Matriz de compatibilidad de mezcla */}
      <MatrizCompatibilidad sales={salesEnMadres.length ? salesEnMadres : salesTodas.filter(s => !s.aditivo && Object.keys(s.comp ?? {}).length > 0).slice(0, 12)} />

      <p className="text-[10px] text-[#5c5c6b] px-1">
        Regla de oro: al tanque final echá primero el bidón A (calcio), agitá, después el B. Nunca juntes A y B concentrados.
        Para tener tus clones acá, guardalos con un nombre en la pestaña Calculadora.
      </p>
    </div>
  )
}

// ===================== MICROS: 2 FORMAS (sueltos vs micromix + refuerzo Fe) =====================
const MICRO_LABELS: [ElementKey, string][] = [['Fe', 'Hierro'], ['Mn', 'Manganeso'], ['Zn', 'Zinc'], ['B', 'Boro'], ['Cu', 'Cobre'], ['Mo', 'Molibdeno']]
function fmtG(n: number, litros: number, resolucion: number): string {
  const g0 = resolucion > 0 ? redondearBalanza(n, resolucion) : n
  const g = g0 * litros
  return g >= 0.01 ? g.toFixed(2) : g >= 0.001 ? g.toFixed(4) : g.toFixed(6)
}
function ColMicros({ titulo, sub, dosis, litros, resolucion, acento }: { titulo: string; sub: string; dosis: ResultadoSal[]; litros: number; resolucion: number; acento: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
      <p className="text-[11px] font-semibold mb-0.5" style={{ color: acento }}>{titulo}</p>
      <p className="text-[10px] text-[#5c5c6b] mb-2">{sub}</p>
      {dosis.length === 0 ? (
        <p className="text-[10.5px] text-[#5c5c6b] py-2">Sin micros en este perfil.</p>
      ) : (
        <div className="space-y-1">
          {dosis.map(d => (
            <div key={d.sal.id} className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5">
              <span className="text-[11px] text-[#d4d4dd] flex-1 min-w-0 truncate">{d.sal.nombre}</span>
              <span className="text-[11.5px] font-mono tabular-nums font-bold text-[#ececf1]">{fmtG(d.gramosPorL, litros, resolucion)} <span className="text-[#5c5c6b] font-normal">{litros === 1 ? 'g/L' : 'g'}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function PanelMicros2({ perfil, salesTodas, litros, resolucion }: { perfil: Perfil; salesTodas: Sal[]; litros: number; resolucion: number }) {
  const cmp = useMemo(() => compararMicros(perfil, salesTodas), [perfil, salesTodas])
  const micros = MICRO_LABELS.filter(([k]) => (cmp.microPerfil[k] ?? 0) > 0)
  if (micros.length === 0) return null
  const estado = (obj: number, log: number) => {
    const r = log / obj
    if (r < 0.85) return { c: '#f87171', t: 'falta' }
    if (r > 1.2) return { c: '#facc15', t: 'sobra' }
    return { c: '#a3e635', t: 'ok' }
  }
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-1">
        <FlaskRound className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Micros: dos formas de armarlos</h3>
        <Info><b className="text-[#d9f99d]">Mismo objetivo, dos caminos.</b> Sales sueltas = cada quelato por separado (clon exacto). Micromix = Fetrilon Combi 2 + Fe-HBED para reforzar el hierro.<br /><span className="text-[#a3e635]">El micromix es más práctico pero como sus ratios son fijos, mirá abajo qué micro queda corto o sobra.</span></Info>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <ColMicros titulo="A · Sales sueltas" sub="cada quelato individual — clon exacto" dosis={cmp.sueltos} litros={litros} resolucion={resolucion} acento="#a3e635" />
        <ColMicros titulo="B · Micromix + refuerzo Fe" sub="Fetrilon Combi 2 + Fe-HBED (el hierro que falta)" dosis={cmp.micromix} litros={litros} resolucion={resolucion} acento="#7dd3fc" />
      </div>
      {/* Tabla ppm objetivo vs logrado en cada variante */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-[#5c5c6b] text-[10px] uppercase tracking-[0.1em]">
              <th className="text-left font-medium py-1">Micro</th>
              <th className="text-right font-medium py-1">Objetivo</th>
              <th className="text-right font-medium py-1 text-[#a3e635]">A · sueltos</th>
              <th className="text-right font-medium py-1 text-[#7dd3fc]">B · micromix</th>
            </tr>
          </thead>
          <tbody>
            {micros.map(([k, nombre]) => {
              const obj = cmp.microPerfil[k] ?? 0
              const a = cmp.ppmSueltos[k] ?? 0
              const b = cmp.ppmMicromix[k] ?? 0
              const eb = estado(obj, b)
              return (
                <tr key={k} className="border-t border-[#1f1f2b]">
                  <td className="py-1 text-[#d4d4dd]">{nombre} <span className="text-[#5c5c6b]">({k})</span></td>
                  <td className="py-1 text-right font-mono text-[#a6a6b5]">{obj.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono text-[#d9f99d]">{a.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono" style={{ color: eb.c }}>{b.toFixed(2)} <span className="text-[9px]">{eb.t}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#5c5c6b] mt-2">La columna B usa el solver para repartir Fetrilon + Fe-HBED. Si un micro queda <span className="text-[#f87171]">falta</span>/<span className="text-[#facc15]">sobra</span>, es por los ratios fijos del micromix — el hierro se completa con Fe-HBED (el más estable, pH 3.5–12).</p>
    </div>
  )
}

// Mini-calculadora de dilución de HOCl (clon de Cleanse). Stock 2.5 g/5 L (0.5 g/L), dosis 1 mL/L.
function HoclDilucionCalc() {
  const [litrosStock, setLitrosStock] = useState(5)
  const [dosisMlL, setDosisMlL] = useState(1)
  const polvo = +(litrosStock * 0.5).toFixed(1)              // 0.5 g/L de polvo generador
  const rindeL = Math.round(litrosStock * 1000 / dosisMlL)   // 1 L de stock = 1000 mL → /dosis = L de riego
  const num = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })
  return (
    <div className="mt-3 rounded-lg bg-[#101016] border border-[#2f5a72]/60 p-3">
      <p className="text-[12px] text-[#7dd3fc] font-semibold mb-1">🧴 Calculadora de dilución HOCl (clon de Cleanse)</p>
      <p className="text-[10.5px] text-[#5c5c6b] mb-3">Con el generador de HOCl en polvo (ej. Binal BioMax) armás el stock y lo dosificás en el riego. Misma dosis que el Cleanse.</p>
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <label className="text-[11px] text-[#a6a6b5]">Stock a preparar
          <div className="flex items-center gap-1 mt-1">
            <input type="number" min={0.5} step={0.5} value={litrosStock} onChange={e => setLitrosStock(Math.max(0.5, +e.target.value))} className={`${inp} w-24`} />
            <span className="text-[#5c5c6b]">L</span>
          </div>
        </label>
        <label className="text-[11px] text-[#a6a6b5]">Dosis en el riego
          <div className="flex items-center gap-1 mt-1">
            <input type="number" min={0.1} step={0.1} value={dosisMlL} onChange={e => setDosisMlL(Math.max(0.1, +e.target.value))} className={`${inp} w-24`} />
            <span className="text-[#5c5c6b]">mL/L</span>
          </div>
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-[#15151d] border border-[#1f1f2b] px-2 py-2">
          <p className="text-[10px] text-[#5c5c6b]">1 · Pesá polvo HOCl</p>
          <p className="text-[15px] font-mono font-bold text-[#bef264]">{num(polvo)} g</p>
        </div>
        <div className="rounded-md bg-[#15151d] border border-[#1f1f2b] px-2 py-2">
          <p className="text-[10px] text-[#5c5c6b]">2 · Disolvé hasta</p>
          <p className="text-[15px] font-mono font-bold text-[#7dd3fc]">{num(litrosStock)} L</p>
        </div>
        <div className="rounded-md bg-[#15151d] border border-[#1f1f2b] px-2 py-2">
          <p className="text-[10px] text-[#5c5c6b]">3 · Rinde riego</p>
          <p className="text-[15px] font-mono font-bold text-[#a78bfa]">{num(rindeL)} L</p>
        </div>
      </div>
      <p className="text-[10px] text-[#5c5c6b] mt-2">Base: 0,5 g/L de polvo en el stock (= 2,5 g en 5 L) y {num(dosisMlL)} mL de stock por litro de riego. Guardá el stock al reparo de la luz.</p>
    </div>
  )
}

// Fila de ingrediente para el gel de enraizado (a nivel módulo: no recrear en cada render)
function FilaIngrediente({ nombre, cant, unidad, pct, nota }: { nombre: string; cant: string; unidad: string; pct?: string; nota?: string }) {
  return (
    <div className="flex items-center gap-2 bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#d4d4dd] truncate">{nombre}</p>
        {nota && <p className="text-[10px] text-[#757584] truncate">{nota}</p>}
      </div>
      {pct && <span className="text-[10px] text-[#5c5c6b] tabular-nums">{pct}</span>}
      <span className="text-[13px] font-mono tabular-nums font-bold text-[#bef264] whitespace-nowrap">{cant} {unidad}</span>
    </div>
  )
}

// ===================== GEL DE ENRAIZADO (clon de Radics / Clonex) =====================
// Fórmula fiel al MSDS de Clonex/Radics: HEC 1.2% + IBA 0.31% + agua destilada, pH ~6, base alcohólica.
// Todo escala linealmente con el lote. Pasos y tips tomados de foros (Rollitup) + MSDS Clonex.
function EnraizadoTab() {
  const [lote, setLote] = useState(250)   // gramos de gel a preparar
  const [conNaa, setConNaa] = useState(false)  // sumar NAA (NO es fiel a Radics; refuerza rooteo)

  const g = lote
  const iba = +(g * 0.0031).toFixed(3)          // 0.31 %
  const hec = +(g * 0.012).toFixed(2)           // 1.2 %
  const alcohol = Math.max(5, Math.round(g * 0.05)) // ~5% del volumen para disolver el IBA
  const agua = +(g - hec - iba).toFixed(1)      // resto (aprox, el alcohol se evapora/integra)
  const naa = +(g * 0.0015).toFixed(3)          // 0.15 % opcional
  const benzoato = +(g * 0.002).toFixed(2)      // ~0.2 % conservante
  const clonesAprox = Math.round(g / 0.28)      // ~0.28 g gel/clon (7 g → +25 clones)

  const num = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 })

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Sprout className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Gel de enraizado casero — clon de Radics / Clonex</h3>
          <Info><b className="text-[#d9f99d]">Hormona de clonado DIY.</b> Radics y Clonex son el mismo gel: <b>IBA 0,31 %</b> en base de hidroxietilcelulosa. Acá calculás las cantidades exactas para tu lote.<br /><span className="text-[#a3e635]">Fórmula del MSDS oficial de Clonex.</span></Info>
        </div>
        <p className="text-[11px] text-[#a6a6b5]">
          Clonar <b className="text-[#d9f99d]">Ryanodine Radics</b> (o Clonex) = hacer un gel de <b>ácido indol-3-butírico (IBA) al 0,31 %</b> en
          hidroxietilcelulosa (HEC) al 1,2 %. El IBA lo tenés como materia prima en <b>Sustancias/Proveedores</b>.
          El 0,31 % (3.100 ppm) es la dosis óptima confirmada para esquejes de cannabis (rango 1.000–3.000 ppm).
        </p>
      </div>

      {/* Calculadora de lote */}
      <div className={card}>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <label className="text-[11px] text-[#a6a6b5]">Gel a preparar
            <Info><b className="text-[#d9f99d]">Gramos totales de gel</b> que querés hacer. Todo lo demás se calcula solo.<br /><span className="text-[#a3e635]">Ej: 100 g rinde ~350 clones. Empezá con un lote chico para calibrar la textura.</span></Info>
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={10} step={10} value={lote} onChange={e => setLote(Math.max(10, +e.target.value))} className={`${inp} w-28`} />
              <span className="text-[#5c5c6b]">g</span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[#a6a6b5] cursor-pointer select-none">
            <input type="checkbox" checked={conNaa} onChange={e => setConNaa(e.target.checked)} className="accent-[#a3e635]" />
            Sumar NAA (más potente, NO es fiel a Radics)
            <Info><b className="text-[#d9f99d]">NAA = ácido naftalenacético</b>, otra auxina. Muchos DIY combinan IBA+NAA para reforzar el enraizado de especies difíciles. Radics/Clonex NO lo llevan (son IBA solo). Actívalo solo si querés un gel más agresivo.</Info>
          </label>
          <div className="text-[11px] text-[#757584] self-end">Rinde ~<b className="text-[#bef264]">{clonesAprox.toLocaleString('es-AR')}</b> clones</div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] font-semibold mb-2">Cantidades para {num(g)} g de gel</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <FilaIngrediente nombre="IBA (ácido indol-3-butírico) puro" cant={num(iba)} unidad="g" pct="0,31 %" nota="la hormona — pesá con balanza de 0,001 g" />
          <FilaIngrediente nombre="Hidroxietilcelulosa (HEC / Natrosol 250)" cant={num(hec)} unidad="g" pct="1,2 %" nota="el gelificante" />
          <FilaIngrediente nombre="Alcohol (isopropílico 91° o etílico)" cant={num(alcohol)} unidad="mL" nota="para disolver el IBA primero" />
          <FilaIngrediente nombre="Agua destilada (hervida y entibiada)" cant={num(agua)} unidad="g" pct="~98 %" nota="resto del lote" />
          {conNaa && <FilaIngrediente nombre="NAA (ácido naftalenacético) — opcional" cant={num(naa)} unidad="g" pct="0,15 %" nota="refuerzo, no fiel a Radics" />}
          <FilaIngrediente nombre="Benzoato de sodio (conservante) — opcional" cant={num(benzoato)} unidad="g" pct="~0,2 %" nota="si lo guardás semanas; evita hongos" />
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-2">Colorante violeta de cristal (1 gota) y trazas de antifúngico son solo estéticos/marketing — opcionales.</p>
      </div>

      {/* Paso a paso */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Paso a paso</h3>
        </div>
        <ol className="space-y-2.5">
          {[
            { t: 'Disolvé el IBA en el alcohol PRIMERO', d: `Poné los ${num(iba)} g de IBA en los ${num(alcohol)} mL de alcohol y revolvé (ideal: agitador magnético) hasta que quede transparente. El IBA no entra en agua sola: sin este paso quedan grumos que no se integran.` },
            { t: 'Herví el agua destilada y dejala entibiar', d: `Los ${num(agua)} g de agua destilada, hervidos y tibios, hacen que el HEC se disperse sin grumos. Un DIYer lo aclara: el agua caliente "rompe" la celulosa mucho más fácil.` },
            { t: 'Agregá el HEC de a poco, en lluvia', d: `Sumá los ${num(hec)} g de hidroxietilcelulosa despacio, revolviendo constante. Empieza a espesar mientras se hidrata.` },
            { t: '⚠️ NO te pases de HEC', d: 'Andá agregando y parando hasta textura de gel de pelo, NO de mermelada dura. Advertencia textual de foro: si te pasás, queda un "jelly que hace ruido cuando lo tocás" (sobre-gelificado, inutilizable). Mejor quedarse corto y espesar de a poco.' },
            { t: 'Integrá la solución de IBA+alcohol al gel', d: 'Volcá el IBA disuelto sobre el gel y homogeneizá bien hasta que quede parejo.' },
            { t: 'Ajustá el pH a ~6,0', d: 'Medí con tiritas o pHmetro y corregí con unas gotas de NaOH (o KOH) si quedó ácido. El "pH flux" es de lo que más arruina resultados según los que lo probaron: estabilizalo antes de usar.' },
            { t: 'Conservante y color (opcional)', d: `Si lo vas a guardar: ${num(benzoato)} g de benzoato de sodio como conservante. Una gota de violeta de cristal si querés el look Clonex.` },
            { t: 'Envasá y guardá bien', d: 'Frasco opaco, tapado, refrigerado (2–9 °C) y al reparo de la luz. El IBA se degrada con luz. Rotulá con fecha.' },
            { t: 'Usalo', d: 'Untá 2–3 cm de la base del esqueje en el gel e insertá directo en el sustrato/taco. Un solo uso: no metas esquejes en el frasco madre (contaminás el lote), sacá una porción aparte.' },
          ].map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2410] border border-[#3d5720] text-[#a3e635] text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#ececf1]">{p.t}</p>
                <p className="text-[11px] text-[#a6a6b5] leading-relaxed">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips y errores */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-[#facc15]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Tips y errores a evitar (de los que lo hicieron)</h3>
        </div>
        <ul className="space-y-2 text-[11px] text-[#a6a6b5]">
          {[
            ['Conseguí IBA-K (sal potásica) si podés', 'Es soluble en agua directa: te saltea el alcohol entero y el olor. Misma potencia que el IBA puro. Ideal para gel casero.'],
            ['No uses agua de ósmosis (RO) fría directa', 'Reportaron que el IBA se les precipitó ("cayó de la solución"). Por eso: disolver en alcohol + agua destilada hervida.'],
            ['Radics/Clonex NO llevan NAA', 'Son IBA solo. Si querés clonar FIEL, dejá el NAA apagado. El NAA es para reforzar especies difíciles de rootear.'],
            ['El IAA no sirve en gel', 'Se degrada rápido en líquido. Por eso los comerciales usan IBA (estable), no IAA. No lo agregues.'],
            ['Empezá con lote chico', 'Hacé 50–100 g la primera vez para calibrar cuánto HEC necesitás antes de tirar un lote grande.'],
            ['El frasco de 25 g de IBA es casi infinito', `A 0,31 %, 25 g de IBA hacen ~8 kg de gel = decenas de miles de clones. La hormona no es el gasto: es el gelificante y el laburo.`],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#facc15] flex-shrink-0">•</span>
              <span><b className="text-[#d9f99d]">{t}:</b> {d}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[#5c5c6b] mt-3">Fuentes: MSDS Clonex (HEC 1,2 % / IBA 0,3 %), foros Rollitup y THCFarmer, literatura de propagación (rango óptimo 1.000–3.000 ppm IBA).</p>
      </div>
    </div>
  )
}

// ===================== ELICITOR FOLIAR DIY (bioestimulante de defensa tipo Phitonat) =====================
// Dosis validadas en cannabis/hemp (estudios) + base de foros. Todo escala con los litros de spray.
function ElicitorTab() {
  const [litros, setLitros] = useState(1)
  const L = litros
  const quitosano = +(L * 100).toFixed(0)        // 100 mg/L (0.01%) — óptimo hemp
  const salicilico = +(L * 30).toFixed(0)        // 30 mg/L (~200 µM) — seguro y efectivo en cannabis
  const aspirinas = +(L * 30 / 450).toFixed(2)   // ~450 mg salicílico útil por aspirina de 500 mg
  const kelp = +(L * 4).toFixed(1)               // 4 mL/L
  const fulvico = +(L * 5).toFixed(1)            // 5 mL/L
  const vitB = Math.round(L * 4)                 // 4 gotas/L
  const silicato = +(L * 2).toFixed(1)           // 2 mL/L
  const citrico = +(L * 0.5).toFixed(1)          // para disolver el quitosano
  const num = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Elicitor foliar DIY — inductor de defensas (tipo Phitonat)</h3>
          <Info><b className="text-[#d9f99d]">Bioestimulante de defensa, NO nutriente.</b> Activa la resistencia sistémica adquirida (SAR): la planta se defiende sola de plagas y hongos. Dosis de estudios en cannabis.<br /><span className="text-[#a3e635]">No lo cargues en la receta de nutrientes: es un spray foliar aparte.</span></Info>
        </div>
        <p className="text-[11px] text-[#a6a6b5]">
          Replica el efecto del <b className="text-[#d9f99d]">Phitonat Powerful Elicitor</b> (fórmula propietaria) combinando insumos con dosis
          validadas científicamente en cannabis: <b>quitosano</b> + <b>ácido salicílico</b> (elicitores SAR) + <b>algas</b> (hormonas) + <b>vitamina B</b> (anti-estrés).
          Foliar, cada 7 días, primera hora de luz. Cortar 2–3 semanas antes de cosecha.
        </p>
      </div>

      {/* Calculadora de lote */}
      <div className={card}>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <label className="text-[11px] text-[#a6a6b5]">Spray a preparar
            <Info><b className="text-[#d9f99d]">Litros de spray foliar</b>. Las cantidades escalan solas.<br /><span className="text-[#a3e635]">Ej: 1 L rinde para varias plantas rociando hasta que gotee.</span></Info>
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={0.25} step={0.25} value={litros} onChange={e => setLitros(Math.max(0.25, +e.target.value))} className={`${inp} w-28`} />
              <span className="text-[#5c5c6b]">L</span>
            </div>
          </label>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] font-semibold mb-2">Cantidades para {num(L)} L de spray</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <FilaIngrediente nombre="Quitosano (chitosan)" cant={num(quitosano)} unidad="mg" pct="0,01%" nota="⭐ elicitor SAR — disolver en medio ácido" />
          <FilaIngrediente nombre="Ácido salicílico (aspirina)" cant={`${num(salicilico)} mg ≈ ${num(aspirinas)}`} unidad="aspirina/s 500mg" pct="~200µM" nota="elicitor — NO te pases, quema" />
          <FilaIngrediente nombre="Extracto de algas (kelp)" cant={num(kelp)} unidad="mL" nota="hormonas naturales" />
          <FilaIngrediente nombre="Ácido fúlvico" cant={num(fulvico)} unidad="mL" nota="mejora la absorción foliar" />
          <FilaIngrediente nombre="Complejo vitamina B" cant={num(vitB)} unidad="gotas" nota="anti-estrés" />
          <FilaIngrediente nombre="Silicato (Si)" cant={num(silicato)} unidad="mL" nota="pared celular + defensa" />
          <FilaIngrediente nombre="Ácido cítrico (para el quitosano)" cant={num(citrico)} unidad="g" nota="baja el pH para disolver el chitosan" />
        </div>
      </div>

      {/* Paso a paso */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Paso a paso</h3>
        </div>
        <ol className="space-y-2.5">
          {[
            { t: 'Disolvé el quitosano en medio ácido', d: `Poné los ${num(citrico)} g de ácido cítrico en un poco de agua tibia, agregá los ${num(quitosano)} mg de quitosano y revolvé hasta que se disuelva (el chitosan no entra en agua neutra).` },
            { t: 'Disolvé la aspirina', d: `Triturá ${num(aspirinas)} aspirina(s) de 500 mg (sin recubrir) = ~${num(salicilico)} mg de ácido salicílico y disolvela en un poco de agua caliente.` },
            { t: 'Sumá algas, fúlvico y vitamina B', d: `Agregá ${num(kelp)} mL de kelp, ${num(fulvico)} mL de fúlvico, ${num(vitB)} gotas de complejo B y ${num(silicato)} mL de silicato.` },
            { t: 'Completá el volumen y ajustá pH', d: `Llevá a ${num(L)} L con agua (idealmente sin cloro) y ajustá el pH a ~6.` },
            { t: 'Aplicá foliar', d: 'Rociá hasta que gotee, ambas caras de la hoja, en la PRIMERA hora después de que prenden las luces (estomas abiertos). Repetí cada 7 días.' },
            { t: 'Cuándo parar', d: 'Cortá 2–3 semanas antes de cosecha (no mojar cogollos densos). En flora tardía, evitá.' },
          ].map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2410] border border-[#3d5720] text-[#a3e635] text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#ececf1]">{p.t}</p>
                <p className="text-[11px] text-[#a6a6b5] leading-relaxed">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-[#facc15]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Tips y ciencia</h3>
        </div>
        <ul className="space-y-2 text-[11px] text-[#a6a6b5]">
          {[
            ['Quitosano es el ingrediente estrella', 'Es el elicitor SAR más potente y además mejora resina en flora. Dosis validada en hemp: 50–250 mg/L. Sin él, el elicitor pierde la mitad del efecto.'],
            ['Con el salicílico, MENOS es más', 'La ciencia en cannabis usa ~30 mg/L (200 µM). Los foros tiran 86 mg/L pero ahí empieza a quemar. Quedate en la dosis baja.'],
            ['Quitosano + salicílico juntos = sinergia', 'Un estudio 2025 mostró que combinados dieron el máximo crecimiento de tallos y hojas — justo lo que promete el Phitonat.'],
            ['No es nutrición', 'Es un spray de defensa/estímulo. No reemplaza tu fórmula de nutrientes ni va en el tanque de riego.'],
            ['Probá en pocas hojas primero', 'Antes de rociar toda la planta, probá en 1–2 hojas y esperá 24 h por si el salicílico quema.'],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#facc15] flex-shrink-0">•</span>
              <span><b className="text-[#d9f99d]">{t}:</b> {d}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-[#5c5c6b] mt-3">Dosis de estudios en Cannabis sativa/hemp (quitosano 50–250 mg/L, salicílico ~200 µM) + recetas de foros (kelp/fúlvico/vit B). Insumos cargados en Sustancias.</p>
      </div>
    </div>
  )
}

// ===================== BIOESTIMULANTES DIY (materias primas en polvo → stock → dosis) =====================
const BIOESTIM_INSUMOS: { nombre: string; que: string; donde: string; stock: string; dosis: string; nota: string }[] = [
  {
    nombre: 'Aminoácidos (L-aminoácidos)', que: 'Mejora fotosíntesis, recuperación de estrés y absorción. Quela micros. (Reemplaza la "proteína de leche" de boosters como Green Sensation.)',
    donde: 'Pura Química (x kg)', stock: 'Disolver directo en agua', dosis: '0,5–1 g/L (foliar o riego)', nota: 'Polvo soluble. Rinde muchísimo.',
  },
  {
    nombre: 'Ácido húmico/fúlvico (leonardita)', que: 'Acondiciona el sustrato, mejora la CIC, quela nutrientes y estimula raíces. Potencia la absorción de todo lo demás.',
    donde: 'Leonardita en polvo (bolsa 25 kg / growshop)', stock: 'Disolver directo (queda oscuro)', dosis: '0,5–1 g/L de riego', nota: 'Polvo. El fúlvico también sirve de vehículo en foliares.',
  },
  {
    nombre: 'Extracto de algas soluble (kelp)', que: 'Hormonas naturales (auxinas, citoquininas, giberelinas) + micros traza + anti-estrés. La parte "hormonal" de los boosters.',
    donde: 'Extracto de algas en polvo (agro / growshop)', stock: 'Disolver directo', dosis: '0,3–0,5 g/L', nota: 'Polvo concentrado (Ascophyllum). Rinde muchísimo vs el líquido.',
  },
  {
    nombre: 'Triacontanol', que: 'Bioestimulante de crecimiento MUY potente (alcohol graso de la alfalfa). Sube fotosíntesis, biomasa y ramas.',
    donde: 'Triacontanol puro en polvo (químicas / import)', stock: 'Impesable → 100 mg en 100 mL de alcohol (=1 mg/mL)', dosis: '0,5–1 mL de stock por litro (0,5–1 mg/L)', nota: '⚠️ Dosis ínfima: SIEMPRE por solución stock. Poco soluble en agua (por eso alcohol).',
  },
  {
    nombre: 'Vitamina C (ácido ascórbico)', que: 'Antioxidante: ayuda contra estrés oxidativo y estabiliza mezclas foliares.',
    donde: 'Pura Química / farmacia', stock: 'Disolver directo', dosis: '0,1–0,25 g/L', nota: 'Polvo. Recién hecho (se oxida).',
  },
  {
    nombre: 'Complejo vitamina B (B1/tiamina)', que: 'Cofactor anti-estrés. Ayuda en trasplante y recuperación.',
    donde: 'Pura Química / farmacia', stock: '1 g en 100 mL de agua', dosis: '1–2 mL de stock por litro', nota: 'Polvo o comprimido molido.',
  },
]
function BioestimulantesTab() {
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Beaker className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Catálogo de insumos sueltos (materias primas en polvo)</h3>
          <Info><b className="text-[#d9f99d]">Cada materia prima por separado:</b> qué hace, cómo hacer el stock, dosis y dónde comprarla. Usalas sueltas o combinalas en la receta de arriba.</Info>
        </div>
        <p className="text-[11px] text-[#a6a6b5]">Casi todo se consigue en <b className="text-[#d9f99d]">Pura Química</b> (aminoácidos, vitaminas) y agro/growshops (leonardita, algas). Todos cargados en <b>Sustancias</b> — cuando tengas precios los cargás como proveedores.</p>

        <div className="overflow-x-auto mt-3 -mx-3 px-3">
          <table className="w-full min-w-[620px] text-[11px] border-collapse">
            <thead>
              <tr className="text-[#5c5c6b] text-[10px] uppercase tracking-[0.1em] text-left">
                <th className="font-medium py-1.5 pr-2">Insumo (polvo)</th>
                <th className="font-medium py-1.5 pr-2">Qué hace</th>
                <th className="font-medium py-1.5 pr-2">Stock</th>
                <th className="font-medium py-1.5 pr-2">Dosis</th>
                <th className="font-medium py-1.5">Dónde</th>
              </tr>
            </thead>
            <tbody>
              {BIOESTIM_INSUMOS.map((b, i) => (
                <tr key={i} className="border-t border-[#1f1f2b] align-top">
                  <td className="py-2 pr-2 text-[#d9f99d] font-medium">{b.nombre}<p className="text-[10px] text-[#5c5c6b] font-normal">{b.nota}</p></td>
                  <td className="py-2 pr-2 text-[#a6a6b5]">{b.que}</td>
                  <td className="py-2 pr-2 text-[#d4d4dd]">{b.stock}</td>
                  <td className="py-2 pr-2 font-mono text-[#bef264] whitespace-nowrap">{b.dosis}</td>
                  <td className="py-2 text-[#7dd3fc]">{b.donde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ===================== SÚPER BIOESTIMULANTE (fórmula completa, dosis seguras cannabis) =====================
function SuperBioTab() {
  const [litros, setLitros] = useState(1)
  const [modo, setModo] = useState<'veg' | 'flora'>('veg')
  const L = litros
  // Dosis BAJAS (cannabis sensible a aa: inhibición ~0,1 mM). Foliar/riego suave.
  const trip = +(L * 15).toFixed(0)     // mg — auxina (raíces)
  const gli = +(L * 20).toFixed(0)      // mg — quelante/clorofila
  const glu = +(L * 20).toFixed(0)      // mg — N/clorofila
  const pro = +(L * 15).toFixed(0)      // mg — anti-estrés
  const kelp = +(L * 0.4).toFixed(2)    // g — hormonas
  const fulvico = +(L * 0.5).toFixed(2) // g — vehículo/absorción
  const triac = +(L * 0.75).toFixed(2)  // mg — crecimiento potente
  const vitB = +(L * 3).toFixed(0)      // mg — anti-estrés
  const vitC = +(L * 150).toFixed(0)    // mg — antioxidante
  const silic = +(L * 0.3).toFixed(2)   // g — estructura (más en flora)
  const cocoAgua = modo === 'veg' ? +(L * 15).toFixed(0) : 0 // mL agua de coco solo veg (citoquininas)
  const num = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Súper Bioestimulante de cannabis — fórmula completa DIY</h3>
          <Info><b className="text-[#d9f99d]">Todo junto: aminoácidos + hormonas + vitaminas + antioxidantes.</b> Dosis BAJAS validadas: el cannabis se inhibe con exceso de aminoácidos (0,1 mM). NO es nutriente.<br /><span className="text-[#a3e635]">Foliar o riego suave. No reemplaza tu fórmula de nutrientes.</span></Info>
        </div>
        <p className="text-[11px] text-[#a6a6b5]">Combina lo mejor de todo lo DIY: <b>L-triptófano</b> (auxina→raíces), <b>glicina/glutámico</b> (clorofila+quela), <b>prolina</b> (anti-estrés), <b>kelp</b> (hormonas), <b>triacontanol</b> (crecimiento), <b>vitaminas B/C</b> y <b>fúlvico</b> (absorción). Materias primas en polvo de Pura Química + agro.</p>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <label className="text-[11px] text-[#a6a6b5]">Preparar
            <div className="flex items-center gap-1 mt-1">
              <input type="number" min={0.25} step={0.25} value={litros} onChange={e => setLitros(Math.max(0.25, +e.target.value))} className={`${inp} w-24`} />
              <span className="text-[#5c5c6b]">L</span>
            </div>
          </label>
          <div className="flex gap-1">
            {(['veg', 'flora'] as const).map(m => (
              <button key={m} onClick={() => setModo(m)} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${modo === m ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]' : 'bg-[#15151d] border border-[#1f1f2b] text-[#8f8f9f]'}`}>{m === 'veg' ? 'Vegetativo' : 'Floración'}</button>
            ))}
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] font-semibold mb-2">Cantidades para {num(L)} L ({modo === 'veg' ? 'vegetativo' : 'floración'})</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <FilaIngrediente nombre="L-Triptófano" cant={num(trip)} unidad="mg" nota="⭐ auxina → raíces/crecimiento" />
          <FilaIngrediente nombre="L-Glicina" cant={num(gli)} unidad="mg" nota="quelante + clorofila" />
          <FilaIngrediente nombre="L-Ácido glutámico" cant={num(glu)} unidad="mg" nota="N + clorofila" />
          <FilaIngrediente nombre="L-Prolina" cant={num(pro)} unidad="mg" nota="anti-estrés" />
          <FilaIngrediente nombre="Extracto de algas (kelp) polvo" cant={num(kelp)} unidad="g" nota="hormonas naturales" />
          <FilaIngrediente nombre="Ácido fúlvico" cant={num(fulvico)} unidad="g" nota="mejora absorción" />
          <FilaIngrediente nombre="Triacontanol" cant={num(triac)} unidad="mg" nota="crecimiento (por stock en alcohol)" />
          <FilaIngrediente nombre="Vitamina B (complejo/B1)" cant={num(vitB)} unidad="mg" nota="anti-estrés" />
          <FilaIngrediente nombre="Vitamina C (ascórbico)" cant={num(vitC)} unidad="mg" nota="antioxidante" />
          <FilaIngrediente nombre="Silicato (Si)" cant={num(silic)} unidad="g" nota="pared celular" />
          {cocoAgua > 0 && <FilaIngrediente nombre="Agua de coco (opcional)" cant={num(cocoAgua)} unidad="mL" nota="citoquininas (solo veg)" />}
        </div>
      </div>

      {/* Paso a paso */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Cómo prepararlo</h3>
        </div>
        <ol className="space-y-2.5">
          {[
            { t: 'Hacé los stocks de los impesables', d: `Triacontanol: 100 mg en 100 mL de alcohol. Vitamina B: 1 g en 100 mL de agua. Así dosificás por mL con jeringa (${num(triac)} mg y ${num(vitB)} mg no se pesan directo).` },
            { t: 'Disolvé los aminoácidos en agua tibia', d: `Triptófano, glicina, glutámico y prolina en un poco de agua tibia (el triptófano es el que menos se disuelve). Revolvé bien.` },
            { t: 'Sumá kelp, fúlvico, vitamina C y silicato', d: `${num(kelp)} g de kelp, ${num(fulvico)} g de fúlvico, ${num(vitC)} mg de vitamina C y ${num(silic)} g de silicato.` },
            { t: 'Agregá los stocks y completá volumen', d: `Sumá los mL de stock de triacontanol y vitamina B${cocoAgua > 0 ? ` + ${num(cocoAgua)} mL de agua de coco` : ''}, llevá a ${num(L)} L con agua sin cloro y ajustá pH ~6.` },
            { t: 'Aplicá', d: 'Foliar (primera hora de luz) o al riego suave. 1 vez por semana. Probá primero en pocas hojas por 24 h.' },
          ].map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2410] border border-[#3d5720] text-[#a3e635] text-[11px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#ececf1]">{p.t}</p>
                <p className="text-[11px] text-[#a6a6b5] leading-relaxed">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Preparación detallada de aminoácidos */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-2">
          <FlaskRound className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Preparación de aminoácidos (detalle + dosis seguras)</h3>
          <Info><b className="text-[#d9f99d]">Cómo disolverlos y una solución stock lista.</b> Cada aa tiene distinta solubilidad; el truco es agua tibia + a veces un toque de pH.</Info>
        </div>
        <p className="text-[11px] text-[#a6a6b5] mb-3">La forma práctica: hacé UNA <b className="text-[#d9f99d]">solución stock de aminoácidos</b> y dosificás por mL. Rinde muchos sprays.</p>

        <div className="rounded-lg bg-[#101016] border border-[#3d5720]/50 p-3 mb-3">
          <p className="text-[11px] text-[#d9f99d] font-semibold mb-2">🧪 Solución stock de aminoácidos (hacés 1 vez)</p>
          <p className="text-[11px] text-[#a6a6b5] mb-2">En <b>250 mL de agua tibia (~40 °C, sin cloro)</b> disolvé, de a uno, revolviendo:</p>
          <div className="space-y-1 mb-2">
            <FilaIngrediente nombre="L-Glicina" cant="1,5" unidad="g" nota="se disuelve fácil (muy soluble)" />
            <FilaIngrediente nombre="L-Prolina" cant="1,5" unidad="g" nota="se disuelve fácil (muy soluble)" />
            <FilaIngrediente nombre="L-Ácido glutámico" cant="1,5" unidad="g" nota="poco soluble → agua tibia + revolver" />
            <FilaIngrediente nombre="L-Triptófano" cant="1,5" unidad="g" nota="el menos soluble → tibia; unas gotas de bicarbonato ayudan" />
          </div>
          <p className="text-[11px] text-[#a6a6b5]">Queda un stock de <b className="text-[#bef264]">~6 mg/mL de cada aa</b> (24 mg/mL total). Filtralo si quedó turbio.</p>
        </div>

        <div className="overflow-x-auto mb-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-[#5c5c6b] text-[10px] uppercase tracking-[0.1em] text-left">
                <th className="font-medium py-1">Aminoácido</th>
                <th className="font-medium py-1">Dosis final</th>
                <th className="font-medium py-1">= concentración</th>
                <th className="font-medium py-1">Solubilidad</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['L-Triptófano', '15 mg/L', '0,07 mM ✅', 'baja — agua tibia'],
                ['L-Glicina', '15 mg/L', '0,20 mM ✅', 'alta — fácil'],
                ['L-Ácido glutámico', '15 mg/L', '0,10 mM ✅', 'baja — tibia'],
                ['L-Prolina', '15 mg/L', '0,13 mM ✅', 'muy alta — fácil'],
              ].map(([a, d, c, s], i) => (
                <tr key={i} className="border-t border-[#1f1f2b]">
                  <td className="py-1 text-[#d9f99d]">{a}</td>
                  <td className="py-1 font-mono text-[#bef264]">{d}</td>
                  <td className="py-1 font-mono text-[#a6a6b5]">{c}</td>
                  <td className="py-1 text-[#8f8f9f]">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#a6a6b5]"><b className="text-[#d9f99d]">Dosis:</b> ~<b className="text-[#bef264]">2,5 mL de stock por litro</b> de spray → 15 mg/L de cada aa (~60 mg/L total). Todo por debajo del umbral de inhibición. <b className="text-[#d9f99d]">Conservación:</b> heladera 1–2 semanas, o congelá en cubitera (los aa fermentan). <b className="text-[#facc15]">Nunca en plántulas/clones.</b></p>
      </div>

      {/* Ciencia y advertencias */}
      <div className={`${card} border-[#facc15]/25`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-[#facc15]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Ciencia y reglas</h3>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[#a6a6b5]">
          {[
            ['El cannabis es sensible a aminoácidos', 'Un estudio mostró inhibición del crecimiento a 0,1 mM (en raíz de plántulas). Por eso las dosis son BAJAS (mg/L, no g/L). OJO: los aa NO queman como una sal — si te pasás, FRENAN el crecimiento. No subas la dosis.'],
            ['NO en plántulas ni clones', 'Los aminoácidos son sensibles en plántula/clon. Usá este spray recién en vegetativo establecido y floración. La primera vez, aplicá a MEDIA dosis y esperá 48 h.'],
            ['Qué sí podría quemar (y por qué no pasa acá)', 'Lo que quema es EC/sal alta o salicílico en mM altos. Tu salicílico (30 mg/L) está 10x por debajo del umbral, y el resto es traza. Foliar siempre con luz baja (primera hora), nunca en calor fuerte.'],
            ['Triptófano = el estrella', 'Es precursor directo de auxina (IAA) → raíces y crecimiento. Confirmado en estudios de raíz.'],
            ['El "mito B1"', 'La vitamina B1 NO estimula raíces mágicamente (mito de foros). Su valor real es anti-estrés/antioxidante. Por eso va en dosis baja.'],
            ['Menos es más', 'Este spray potencia, no alimenta. Con exceso hacés lo contrario. 1 vez/semana alcanza.'],
            ['No con HOCl', 'Si sanitizás con HOCl/Cleanse, aplicá el bioestimulante otro día.'],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-2"><span className="text-[#facc15] flex-shrink-0">•</span><span><b className="text-[#d9f99d]">{t}:</b> {d}</span></li>
          ))}
        </ul>
        <p className="text-[10px] text-[#5c5c6b] mt-3">Dosis basadas en estudios de biostimulación en Cannabis sativa (sensibilidad a aa 0,1 mM; triptófano→auxina) + literatura de vitaminas B/C en plantas. Insumos en Sustancias.</p>
      </div>
    </div>
  )
}

// ===================== MATRIZ DE COMPATIBILIDAD =====================
// Deriva la compatibilidad de mezcla par-a-par de la composición (no hardcodeada):
// Ca + sulfato → yeso; Ca + fosfato → fosfato de Ca; Ca + carbonato → CaCO₃; Mg + fosfato → a pH alto.
type CompatNivel = 'ok' | 'warn' | 'bad'
const _hasEl = (s: Sal, k: string) => ((s.comp as Record<string, number>)?.[k] ?? 0) > 0
const _esCarbonato = (s: Sal) => /hco3|caco3|carbon|bicarb/i.test(s.id)

// Categorías de la tabla profesional de compatibilidad de fertilizantes (IPNI / fertirriego).
type CatFert = 'urea' | 'nitrato_amonio' | 'sulfato_amonio' | 'nitrato_calcio' | 'nitrato_magnesio' | 'map' | 'mkp' | 'nitrato_potasio' | 'sulfato_potasio' | 'cloruro_potasio' | 'acido_fosforico' | 'acido_nitrico' | 'acido_sulfurico' | 'sulfatos_micros' | 'quelatos' | 'sulfato_magnesio'
function catFertDe(s: Sal): CatFert | null {
  const id = s.id
  if (/edta|eddha|dtpa|hbed/i.test(id) || id === 'fetrilon_combi2' || id === 'afital_micromix') return 'quelatos'
  const m: Record<string, CatFert> = {
    urea: 'urea', nh4no3: 'nitrato_amonio', amsulf: 'sulfato_amonio', cano3_ag: 'nitrato_calcio',
    mgno3: 'nitrato_magnesio', map: 'map', mkp: 'mkp', kno3: 'nitrato_potasio', k2so4: 'sulfato_potasio',
    kcl: 'cloruro_potasio', epsom: 'sulfato_magnesio', mnso4: 'sulfatos_micros', znso4: 'sulfatos_micros',
    cuso4: 'sulfatos_micros', feso4: 'sulfatos_micros', acido_fosforico: 'acido_fosforico',
    acido_nitrico: 'acido_nitrico', acido_sulfurico: 'acido_sulfurico',
  }
  return m[id] ?? null
}
// Excepciones de la tabla profesional (lo NO compatible). Todo par no listado y con ambas categorías = compatible.
const _keyCat = (a: string, b: string) => [a, b].sort().join('|')
const _pIncompat: [CatFert, CatFert][] = [
  ['sulfato_amonio', 'urea'], ['nitrato_calcio', 'sulfato_amonio'], ['map', 'nitrato_calcio'], ['map', 'nitrato_magnesio'],
  ['mkp', 'nitrato_calcio'], ['mkp', 'nitrato_magnesio'], ['cloruro_potasio', 'nitrato_calcio'], ['acido_fosforico', 'nitrato_calcio'],
  ['acido_sulfurico', 'sulfato_amonio'], ['acido_sulfurico', 'nitrato_calcio'], ['acido_sulfurico', 'nitrato_magnesio'],
  ['sulfatos_micros', 'nitrato_calcio'], ['quelatos', 'acido_nitrico'],
]
const _pReduce: [CatFert, CatFert][] = [
  ['nitrato_potasio', 'sulfato_amonio'], ['cloruro_potasio', 'sulfato_potasio'], ['acido_sulfurico', 'sulfato_potasio'],
  ['sulfatos_micros', 'sulfato_potasio'], ['quelatos', 'sulfato_amonio'], ['quelatos', 'nitrato_calcio'],
  ['quelatos', 'nitrato_magnesio'], ['quelatos', 'acido_fosforico'], ['sulfato_magnesio', 'sulfato_potasio'],
]
const MATRIZ_PRO = new Map<string, 'R' | 'I'>()
_pIncompat.forEach(([a, b]) => MATRIZ_PRO.set(_keyCat(a, b), 'I'))
_pReduce.forEach(([a, b]) => MATRIZ_PRO.set(_keyCat(a, b), 'R'))

function compatPar(a: Sal, b: Sal): { nivel: CompatNivel; motivo: string } {
  const caA = _hasEl(a, 'Ca'), caB = _hasEl(b, 'Ca')
  const sA = _hasEl(a, 'S'), sB = _hasEl(b, 'S')
  const pA = _hasEl(a, 'P'), pB = _hasEl(b, 'P')
  const mgA = _hasEl(a, 'Mg'), mgB = _hasEl(b, 'Mg')
  // 1) Reglas químicas duras del CONCENTRADO (mandan: el stock precipita aunque en riego diluido no).
  if ((caA && _esCarbonato(b)) || (caB && _esCarbonato(a))) return { nivel: 'bad', motivo: 'Calcio + carbonato/bicarbonato → precipita carbonato de calcio (CaCO₃, blanco).' }
  if ((caA && sB) || (caB && sA)) return { nivel: 'bad', motivo: 'Calcio + sulfato → precipita yeso (CaSO₄) en concentrado. Van en bidones separados (A y B).' }
  if ((caA && pB) || (caB && pA)) return { nivel: 'bad', motivo: 'Calcio + fosfato → precipita fosfato de calcio. Separá en A y B.' }
  if ((mgA && pB) || (mgB && pA)) return { nivel: 'warn', motivo: 'Magnesio + fosfato → puede precipitar fosfato de Mg a pH alto. Mantené el concentrado a pH < 6.' }
  // 2) Tabla profesional de fertirriego (IPNI): agrega pares que la química de arriba no cubre.
  const ca = catFertDe(a), cb = catFertDe(b)
  if (ca && cb && ca !== cb) {
    const st = MATRIZ_PRO.get(_keyCat(ca, cb))
    if (st === 'I') return { nivel: 'bad', motivo: 'Incompatible (tabla profesional de fertirriego): precipitan o reaccionan. Van en tanques separados.' }
    if (st === 'R') return { nivel: 'warn', motivo: 'Reduce la solubilidad (tabla profesional): se pueden mezclar pero baja cuánto se disuelve (posible turbidez). Mejor separadas o más diluidas.' }
    return { nivel: 'ok', motivo: 'Compatibles (tabla profesional de fertirriego): se pueden concentrar en la misma botella.' }
  }
  return { nivel: 'ok', motivo: 'Compatibles: se pueden concentrar en la misma botella.' }
}
const COMPAT_UI: Record<CompatNivel, { bg: string; em: string }> = {
  ok: { bg: '#16351f', em: '🟢' },
  warn: { bg: '#3a2e10', em: '🟡' },
  bad: { bg: '#3a1416', em: '🔴' },
}
function MatrizCompatibilidad({ sales }: { sales: Sal[] }) {
  const lista = sales.slice(0, 14) // acotar para que la grilla sea legible
  const abrev = (s: Sal) => s.nombre.length > 16 ? s.nombre.slice(0, 15) + '…' : s.nombre
  if (lista.length < 2) return null
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Compatibilidad de mezcla</h3>
        <Info><b className="text-[#d9f99d]">Qué sales podés juntar</b> en el mismo concentrado sin que precipite. Se calcula de la química de cada sal.<br /><span className="text-[#a3e635]">Ej: calcio + sulfato = 🔴 (forma yeso). Por eso van en bidones A y B separados.</span></Info>
      </div>
      <p className="text-[10.5px] text-[#757584] mb-3">Cruzá dos sales para ver si conviven en la misma botella concentrada. Pasá el mouse por cada celda para el motivo.</p>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="border-collapse text-[10.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#15151d] p-1"></th>
              {lista.map(s => (
                <th key={s.id} className="p-1 align-bottom">
                  <div className="text-[#a6a6b5] font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 84 }} title={s.nombre}>{abrev(s)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map(fila => (
              <tr key={fila.id}>
                <th className="sticky left-0 z-10 bg-[#15151d] text-right pr-2 py-1 text-[#d4d4dd] font-medium whitespace-nowrap max-w-[130px] truncate" title={fila.nombre}>{abrev(fila)}</th>
                {lista.map(col => {
                  if (fila.id === col.id) return <td key={col.id} className="text-center text-[#3a3a48] w-8 h-8 border border-[#1f1f2b]">—</td>
                  const { nivel, motivo } = compatPar(fila, col)
                  const ui = COMPAT_UI[nivel]
                  return (
                    <td key={col.id} className="text-center w-8 h-8 border border-[#1f1f2b] cursor-help" style={{ backgroundColor: ui.bg }} title={`${fila.nombre} + ${col.nombre}: ${motivo}`}>
                      {ui.em}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[10.5px] text-[#a6a6b5]">
        <span>🟢 Compatibles</span>
        <span>🟡 Reduce solubilidad / cuidado de pH</span>
        <span>🔴 Incompatible — separá en bidones</span>
      </div>
      <p className="text-[10px] text-[#5c5c6b] mt-1">Basada en la tabla profesional de compatibilidad de fertirriego (IPNI) + las reglas del concentrado (Ca no va con sulfatos/fosfatos/carbonatos en stock).</p>
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
  { v: 'g', l: 'por gramo' }, { v: '25g', l: 'por 25 g' }, { v: '100g', l: 'por 100 g' }, { v: '500g', l: 'por 500 g' }, { v: '1kg', l: 'por 1 kg' },
  { v: '2kg', l: 'por 2 kg' }, { v: '5kg', l: 'por 5 kg' }, { v: '10kg', l: 'por 10 kg' },
  { v: '20kg', l: 'por 20 kg' }, { v: '25kg', l: 'por 25 kg' }, { v: 'kg', l: 'por kg (directo)' },
  { v: 'unidad', l: 'por unidad/bolsa' }, { v: 'L', l: 'por litro' },
]
const KG_UNIDAD: Record<string, number> = { g: 0.001, '25g': 0.025, '100g': 0.1, '500g': 0.5, kg: 1, '1kg': 1, '2kg': 2, '5kg': 5, '10kg': 10, '20kg': 20, '25kg': 25 }
const PROVINCIAS_AR = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán', 'Online / Nacional']
/** Precio por kg a partir del precio de la bolsa y su tamaño. null si la unidad no es de peso. */
function precioPorKg(precio?: number | null, unidad?: string | null): number | null {
  const k = KG_UNIDAD[unidad ?? '']
  return (precio != null && k) ? +(precio / k).toFixed(2) : null
}

function ProveedoresTab({ salesTodas, recargarInventario, recargarProveedores }: { salesTodas: Sal[]; recargarInventario: () => void; recargarProveedores: () => void }) {
  const vacio = { sal_id: '', nombre_local: '', telefono: '', email: '', provincia: '', pagina: '', precio: '', unidad: '1kg', presentacion: '', calidad: 'alta', imagen: '', nota: '' }
  const [provs, setProvs] = useState<Proveedor[]>([])
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState<Proveedor | null>(null) // ficha abierta (ver/editar)
  const [filtroSal, setFiltroSal] = useState('') // '' = todas
  const cargar = () => { proveedoresService.list().then(p => { setProvs(p); recargarProveedores() }).catch(() => setProvs([])) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        telefono: form.telefono || null, email: form.email || null, provincia: form.provincia || null, pagina: form.pagina || null,
        precio: form.precio ? +form.precio : null, unidad: form.unidad,
        presentacion: form.presentacion || null, calidad: form.calidad,
        imagen: form.imagen || null, nota: form.nota || null,
      })
      toast.success('Proveedor guardado'); setForm(vacio); cargar()
    } catch (e) { toast.error('No se pudo guardar: ' + (e instanceof Error ? e.message : String(e))) } finally { setGuardando(false) }
  }
  const borrar = async (p: Proveedor): Promise<boolean> => {
    if (!window.confirm(`¿Borrar el proveedor "${p.nombre_local}" de ${salNombre(p.sal_id)}?\n\nEsta acción no se puede deshacer.`)) return false
    try { await proveedoresService.eliminar(p.id); toast.success('Proveedor eliminado'); cargar(); return true } catch (e) { toast.error(String(e)); return false }
  }
  const toggleElegido = async (p: Proveedor) => {
    try {
      if (p.elegido) { await proveedoresService.deselegir(p.id); toast.success('Quitada la referencia') }
      else {
        const pk = precioPorKg(p.precio, p.unidad)
        await proveedoresService.elegir(p.id, p.sal_id, pk)
        toast.success(pk != null ? `Referencia: ${p.nombre_local} ($${pk}/kg)` : `Referencia: ${p.nombre_local}`)
      }
      cargar(); recargarInventario()
    } catch (e) { toast.error('No se pudo: ' + (e instanceof Error ? e.message : String(e))) }
  }
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
        telefono: detalle.telefono || null, email: detalle.email || null, provincia: detalle.provincia || null, pagina: detalle.pagina || null,
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
          <label className="text-[11px] text-[#a6a6b5]">Email
            <input type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} placeholder="ej. ventas@local.com" className={`${inp} mt-1`} />
          </label>
          <label className="text-[11px] text-[#a6a6b5]">Provincia
            <select value={form.provincia} onChange={e => setForm(v => ({ ...v, provincia: e.target.value }))} className={`${inp} mt-1`}>
              <option value="">— provincia —</option>
              {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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
            <div key={salId} className={`${card} overflow-hidden`}>
              <p className="text-[12px] font-display font-semibold text-[#d9f99d] mb-2 break-words">{salNombre(salId)} <span className="text-[10px] text-[#5c5c6b]">· {lista.length} proveedor{lista.length > 1 ? 'es' : ''}</span></p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[...lista].sort((a, b) => (ordenCal[a.calidad ?? 'baja'] ?? 3) - (ordenCal[b.calidad ?? 'baja'] ?? 3)).map(p => (
                  <div key={p.id} onClick={() => setDetalle(p)} title="Ver / editar ficha"
                    className={`rounded-lg p-2.5 flex gap-2.5 cursor-pointer transition-colors overflow-hidden ${p.elegido ? 'bg-[#facc15]/[0.07] border border-[#facc15]/50' : 'bg-[#15151d] border border-[#1f1f2b] hover:border-[#404d20]'}`}>
                    {p.imagen && <img src={p.imagen} alt="" className="w-14 h-14 rounded object-cover border border-[#1f1f2b] flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-[#ececf1] truncate">{p.nombre_local}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: calColor(p.calidad), background: `${calColor(p.calidad)}18` }}>{p.calidad}</span>
                        <button onClick={e => { e.stopPropagation(); toggleElegido(p) }} title={p.elegido ? 'Precio de referencia (clic para quitar)' : 'Usar este precio para calcular el costo'}
                          className="ml-auto p-0.5 rounded hover:scale-110 transition-transform" style={{ color: p.elegido ? '#facc15' : '#5c5c6b' }}>
                          <Star className="w-4 h-4" strokeWidth={1.8} fill={p.elegido ? '#facc15' : 'none'} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); borrar(p) }} title="Borrar proveedor" className="p-0.5 rounded text-[#5c5c6b] hover:text-[#ff8a7a]"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                      </div>
                      {p.elegido && <span className="text-[9px] text-[#facc15] font-semibold">★ referencia de costo</span>}
                      <div className="text-[10.5px] text-[#a6a6b5] mt-0.5 space-y-0.5 min-w-0">
                        {p.precio != null && <div className="font-mono truncate"><span className="text-[#d4d4dd]">${p.precio}</span> <span className="text-[#757584]">/ {p.unidad}</span>{precioPorKg(p.precio, p.unidad) != null && <span className="text-[#a3e635]"> · ${precioPorKg(p.precio, p.unidad)}/kg</span>}{p.presentacion ? <span className="text-[#5c5c6b]"> · {p.presentacion}</span> : null}</div>}
                        {p.provincia && <div className="truncate"><MapPin className="inline w-3 h-3 mr-1 align-[-2px]" strokeWidth={1.8} />{p.provincia}</div>}
                        {p.telefono && <div className="truncate"><Phone className="inline w-3 h-3 mr-1 align-[-2px]" strokeWidth={1.8} />{p.telefono}</div>}
                        {p.email && <a onClick={e => e.stopPropagation()} href={`mailto:${p.email}`} className="block truncate text-[#7dd3fc] hover:underline"><Mail className="inline w-3 h-3 mr-1 align-[-2px]" strokeWidth={1.8} />{p.email}</a>}
                        {p.pagina && <a onClick={e => e.stopPropagation()} href={p.pagina.startsWith('http') ? p.pagina : `https://${p.pagina}`} target="_blank" rel="noreferrer" className="block truncate text-[#7dd3fc] hover:underline"><Globe className="inline w-3 h-3 mr-1 align-[-2px]" strokeWidth={1.8} />{p.pagina}</a>}
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
              <label className="text-[11px] text-[#a6a6b5]">Email
                <input type="email" value={detalle.email ?? ''} onChange={e => setD('email', e.target.value)} className={`${inp} mt-1`} /></label>
              <label className="text-[11px] text-[#a6a6b5]">Provincia
                <select value={detalle.provincia ?? ''} onChange={e => setD('provincia', e.target.value)} className={`${inp} mt-1`}>
                  <option value="">— provincia —</option>
                  {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
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
              <button onClick={() => borrar(detalle).then(ok => { if (ok) setDetalle(null) })} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[#ff8a7a] border border-[#ff8a7a]/25 hover:bg-[#ff8a7a]/10">
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
  { t: 'Micromix (mezcla de micros)', d: 'Un solo producto que trae todos los micronutrientes juntos (Fe, Mn, Zn, B, Cu, Mo). Reemplaza pesar 6 quelatos por separado: más práctico, pero los ratios entre micros quedan FIJOS en los de la bolsa. Se dosifica por el micro que primero se pasa de rango (normalmente Mn o Zn). Comparados en ratio Fe=100 — ideal cannabis: Mn~50, Zn~35, B~45, Cu~12, Mo~2. Fetrilon Combi 2: Mn100·Zn37·B12·Cu37 (EDTA, balanceado, el mejor de AR). Afital: Mn75·Zn100·B37·Cu15 (cargado a Zn). MicroMix Mundo Hidroponía: muy alto en B, sin Cu, diluido.', ej: 'Fetrilon Combi 2 dosificado a 3 ppm de Fe deja Mn 3, Zn 1.1, Cu 1.1, B 0.4 ppm. Perfecto para arrancar sin comprar cada micro suelto.' },
  { t: 'Completar un micro que falta (ej. hierro)', d: 'Al usar un micromix, si un elemento queda corto lo podés sumar APARTE sin tocar el resto. El caso típico es el HIERRO: casi todos los micromix son pobres en Fe relativo, y el cannabis quiere micros Fe-dominantes. La técnica pro: dosificás el micromix por Mn/Zn (para no pasarte) y completás el Fe faltante con Fe-EDDHA / Fe-DTPA / Fe-HBED por separado. Igual vale para cualquier micro puntual con su quelato individual.', ej: 'Micromix a 0.075 g/L te da Fe 3, pero querés Fe 5 → sumás Fe-EDDHA aparte para los 2 ppm que faltan, sin mover Mn/Zn/B.' },
]

// ===================== CONVERSOR =====================
function ConversorTab() {
  // 1) Óxido → elemental
  const [oxIdx, setOxIdx] = useState(0)
  const [oxVal, setOxVal] = useState('15')
  const ox = CONV_OXIDO[oxIdx]
  const oxRes = oxVal ? +(+oxVal * ox.factor).toFixed(3) : null
  // 2) Concentración: base en ppm (mg/L). 1% = 10 g/L = 10000 ppm (w/v)
  const [concVal, setConcVal] = useState('1')
  const [concUnit, setConcUnit] = useState<'pct' | 'gl' | 'ppm'>('gl')
  const ppmBase = concVal ? (concUnit === 'pct' ? +concVal * 10000 : concUnit === 'gl' ? +concVal * 1000 : +concVal) : 0
  // 3) ppm ↔ meq/L
  const [ionElem, setIonElem] = useState('Ca')
  const [ionVal, setIonVal] = useState('40')
  const [ionDir, setIonDir] = useState<'ppm2meq' | 'meq2ppm'>('ppm2meq')
  const ionRes = ionVal ? (ionDir === 'ppm2meq' ? ppmAmeq(+ionVal, ionElem) : meqAppm(+ionVal, ionElem)) : null
  // 4) unidades
  const [g, setG] = useState('100'); const [ml, setMl] = useState('4')

  const box = 'bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-1.5 text-[12px] text-[#ececf1] font-mono tabular-nums'
  const res = (v: React.ReactNode) => <span className="text-[14px] font-mono tabular-nums font-bold text-[#d9f99d]">{v}</span>

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Repeat className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Conversor químico</h3>
          <Info><b className="text-[#d9f99d]">Convertí unidades al leer etiquetas y análisis.</b> Óxidos→elemental, ppm↔%↔g/L, ppm↔meq.<br /><span className="text-[#a3e635]">Basado en Factores de Conversión (IPNI).</span></Info>
        </div>
        <p className="text-[11px] text-[#757584]">Herramientas para pasar de lo que dice una etiqueta o un análisis a las unidades del objetivo (ppm elemental).</p>
      </div>

      {/* 1) Óxido → elemental */}
      <div className={card}>
        <h4 className="text-[12px] font-semibold text-[#d9f99d] mb-2">Óxido → Elemental <span className="text-[10px] text-[#5c5c6b] font-normal">· leer etiquetas NPK</span></h4>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] text-[#a6a6b5]">Valor (%)<input type="number" value={oxVal} onChange={e => setOxVal(e.target.value)} className={`${box} w-20 mt-0.5 block`} /></label>
          <label className="text-[10px] text-[#a6a6b5]">Forma<select value={oxIdx} onChange={e => setOxIdx(+e.target.value)} className={`${box} mt-0.5 block`}>{CONV_OXIDO.map((o, i) => <option key={i} value={i}>{o.de} → {o.a}</option>)}</select></label>
          <span className="text-[#5c5c6b] pb-1.5">=</span>
          <div className="pb-1">{res(oxRes != null ? `${oxRes} % ${ox.a}` : '—')}</div>
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-1.5">{ox.nota}. Factor ×{ox.factor}. Ej: una etiqueta 0-15-25 → P {(+15 * 0.4364).toFixed(1)}% · K {(+25 * 0.8301).toFixed(1)}%.</p>
      </div>

      {/* 2) Concentración */}
      <div className={card}>
        <h4 className="text-[12px] font-semibold text-[#d9f99d] mb-2">Concentración <span className="text-[10px] text-[#5c5c6b] font-normal">· % ↔ g/L ↔ ppm</span></h4>
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <label className="text-[10px] text-[#a6a6b5]">Valor<input type="number" value={concVal} onChange={e => setConcVal(e.target.value)} className={`${box} w-24 mt-0.5 block`} /></label>
          <label className="text-[10px] text-[#a6a6b5]">Unidad<select value={concUnit} onChange={e => setConcUnit(e.target.value as typeof concUnit)} className={`${box} mt-0.5 block`}><option value="pct">%  (w/v)</option><option value="gl">g/L</option><option value="ppm">ppm (mg/L)</option></select></label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2"><p className="text-[9px] text-[#757584]">%</p>{res(+(ppmBase / 10000).toFixed(4))}</div>
          <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2"><p className="text-[9px] text-[#757584]">g/L</p>{res(+(ppmBase / 1000).toFixed(3))}</div>
          <div className="bg-[#15151d] border border-[#1f1f2b] rounded-md px-3 py-2"><p className="text-[9px] text-[#757584]">ppm (mg/L)</p>{res(+ppmBase.toFixed(1))}</div>
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-1.5">1% = 10 g/L = 10.000 ppm (asume solución acuosa, densidad ~1).</p>
      </div>

      {/* 3) ppm ↔ meq */}
      <div className={card}>
        <h4 className="text-[12px] font-semibold text-[#d9f99d] mb-2">Iónico <span className="text-[10px] text-[#5c5c6b] font-normal">· ppm ↔ meq/L (análisis de agua)</span></h4>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] text-[#a6a6b5]">Valor<input type="number" value={ionVal} onChange={e => setIonVal(e.target.value)} className={`${box} w-20 mt-0.5 block`} /></label>
          <label className="text-[10px] text-[#a6a6b5]">Dirección<select value={ionDir} onChange={e => setIonDir(e.target.value as typeof ionDir)} className={`${box} mt-0.5 block`}><option value="ppm2meq">ppm → meq/L</option><option value="meq2ppm">meq/L → ppm</option></select></label>
          <label className="text-[10px] text-[#a6a6b5]">Elemento<select value={ionElem} onChange={e => setIonElem(e.target.value)} className={`${box} mt-0.5 block`}>{Object.keys(PESO_EQ).map(k => <option key={k} value={k}>{k}</option>)}</select></label>
          <span className="text-[#5c5c6b] pb-1.5">=</span>
          <div className="pb-1">{res(ionRes != null ? `${ionRes} ${ionDir === 'ppm2meq' ? 'meq/L' : 'ppm'}` : '—')}</div>
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-1.5">Peso equivalente {ionElem} = {PESO_EQ[ionElem]} g/eq. Útil para leer dureza/bases de un análisis de agua.</p>
      </div>

      {/* 4) Unidades */}
      <div className={card}>
        <h4 className="text-[12px] font-semibold text-[#d9f99d] mb-2">Unidades <span className="text-[10px] text-[#5c5c6b] font-normal">· para productos importados</span></h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-end gap-2">
            <label className="text-[10px] text-[#a6a6b5]">gramos<input type="number" value={g} onChange={e => setG(e.target.value)} className={`${box} w-20 mt-0.5 block`} /></label>
            <span className="text-[#5c5c6b] pb-1.5">=</span>
            <div className="pb-1">{res(g ? `${(+g / 28.3495).toFixed(2)} oz` : '—')}</div>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-[10px] text-[#a6a6b5]">mL por galón (US)<input type="number" value={ml} onChange={e => setMl(e.target.value)} className={`${box} w-20 mt-0.5 block`} /></label>
            <span className="text-[#5c5c6b] pb-1.5">=</span>
            <div className="pb-1">{res(ml ? `${(+ml / 3.78541).toFixed(2)} mL/L` : '—')}</div>
          </div>
        </div>
        <p className="text-[10px] text-[#5c5c6b] mt-1.5">1 oz = 28.35 g · 1 galón US = 3.785 L. Ej: una etiqueta yanqui "4 mL/gal" = {(4 / 3.78541).toFixed(2)} mL/L.</p>
      </div>
    </div>
  )
}

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
function ClonarTab({ productos, onUsar, irA }: { productos: Sal[]; onUsar: (p: Perfil, salId: string) => void; irA: (s: SubTab) => void }) {
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
  const esAditivo = !!prod && Object.keys(perfil).length === 0
  // Tipo de aditivo → a qué herramienta mandar (no se clona con sales: no aporta nutrientes)
  const esEnraizante = !!prod && (/iba|radics/i.test(prod.id) || /IBA/i.test(prod.formula ?? ''))
  const esSanitizante = !!prod && (/hocl|cleanse/i.test(prod.id) || /HOCl/i.test(prod.formula ?? ''))

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
                {esAditivo && <span className="text-[11px] text-[#5c5c6b]">Este producto no aporta nutrientes (es un aditivo): no se clona con sales.</span>}
              </div>
            </div>
            {esAditivo ? (
              // Los aditivos (hormona de enraizado, sanitizante) NO se clonan con sales: se mandan a su herramienta propia.
              <div className="mt-3 rounded-lg bg-[#101016] border border-[#463a66]/50 p-3">
                {esEnraizante ? (
                  <>
                    <p className="text-[12px] text-[#d4d4dd] mb-2">🌱 <b className="text-[#d9f99d]">{prod.nombre}</b> es una <b>hormona de enraizado</b> (IBA), no un nutriente. Para hacerlo casero usá la calculadora de gel dedicada:</p>
                    <button onClick={() => irA('enraizado')} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25">
                      <Sprout className="w-3.5 h-3.5" /> Ir a Gel de enraizado
                    </button>
                  </>
                ) : esSanitizante ? (
                  <>
                    <p className="text-[12px] text-[#d4d4dd]">🧴 <b className="text-[#d9f99d]">{prod.nombre}</b> es un <b>sanitizante (HOCl)</b>, no un nutriente. Se clona con el generador de HOCl en polvo — calculá la dilución acá:</p>
                    <HoclDilucionCalc />
                  </>
                ) : (
                  <p className="text-[12px] text-[#d4d4dd]">Es un aditivo/estabilizante: no se clona con sales porque no aporta nutrientes. Mirá su ficha en <b>Sustancias</b> o la pestaña <b>Estabilizantes</b>.</p>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => onUsar(perfil, prod.id)}
                  className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25">
                  <Copy className="w-3.5 h-3.5" /> Usar como objetivo y clonar
                </button>
                <p className="text-[10px] text-[#5c5c6b] mt-2">
                  Para varias partes (A+B, etc.) clonás cada una por separado y sumás las recetas. Tip: en "Sustancias" desactivá los productos comerciales y dejá solo sales sueltas para que el clon use materia prima barata.
                </p>
              </>
            )}
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
