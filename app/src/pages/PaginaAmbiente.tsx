// PaginaAmbiente — lectura EN VIVO de los sensores de Growcast (temp/HR/CO2/VPD),
// estado y automatizaciones de las salidas, ficha de la sala y un analisis por
// etapa con recomendaciones (reglas locales, sin LLM ni tokens). NO guarda nada:
// lee del proxy n8n cada pocos segundos. El usuario modifica en Growcast; la app
// solo sugiere en base a las automatizaciones existentes.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Thermometer, Droplets, Wind, Gauge, RefreshCw, WifiOff, Activity, Fan, Snowflake,
  Lightbulb, CloudFog, Power, Clock, SlidersHorizontal, Hand, Sparkles, CheckCircle2,
  AlertTriangle, Info, X, ClipboardList, Leaf,
} from 'lucide-react'

const WEBHOOK = (import.meta as any).env?.VITE_GROWCAST_WEBHOOK_URL || 'http://192.168.0.60:5678/webhook/growcast-live'
const INTERVALO_MS = 60000
const INTERVALO_S = Math.round(INTERVALO_MS / 1000)

type Punto = { t: string; v: number }
type Sensor = { value: number; ts: string } | null
type Auto = { nombre: string; tipo: string; descripcion: string | null; valor: string } | null
type Salida = { on: boolean | null; ts: string | null; automatizacion: Auto }
interface Sala { nombre?: string; medio?: string; ancho?: number; largo?: number; alto?: number; canopy?: number; lucesTipo?: string; lucesCantidad?: number; lucesPotencia?: number; acBtu?: number }
interface Live {
  ok: boolean; ts?: string; error?: string
  sala?: Sala
  ciclo?: { inicio: string; fin: string } | null
  sensores?: { temperatura: Sensor; humedad: Sensor; co2: Sensor; vpd: Sensor }
  salidas?: Record<string, Salida>
  series?: Record<string, Punto[]>
}

const fmtHora = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtFecha = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'

// ---- Etapas y rangos ideales. VPD según la calculadora VPD (cultivoeficienteled.cl):
// VPD del aire = SVP(temp) · (1 − HR/100). Rangos: clon 0.4–0.8, vege 0.8–1.2,
// flora temprana 1.0–1.2, flora tardía 1.2–1.6 kPa. ----
type Etapa = 'vegetativo' | 'floracion'
const ETAPA_LABEL: Record<Etapa, string> = { vegetativo: 'Vegetativo', floracion: 'Floración' }
const RANGOS: Record<Etapa, { temp: [number, number]; hr: [number, number]; vpd: [number, number]; co2: [number, number] }> = {
  vegetativo: { temp: [22, 28], hr: [55, 70], vpd: [0.8, 1.2], co2: [400, 1200] },
  floracion: { temp: [20, 26], hr: [45, 55], vpd: [1.0, 1.6], co2: [800, 1300] },
}

// Presión de saturación del vapor (kPa) por temperatura (Magnus) y VPD del aire (método calculadora VPD).
const svp = (tC: number) => 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3))
const vpdAire = (tC: number, rh: number) => +(svp(tC) * (1 - rh / 100)).toFixed(2)
// HR (%) necesaria para alcanzar un VPD objetivo a una temperatura dada.
const hrParaVpd = (tC: number, vpdObj: number) => Math.max(0, Math.min(100, Math.round((1 - vpdObj / svp(tC)) * 100)))

// Detecta la etapa por el nombre/descripcion de las automatizaciones, sino por progreso del ciclo.
function detectarEtapa(d: Live | null): Etapa {
  const txt = Object.values(d?.salidas || {})
    .map(s => `${s.automatizacion?.nombre || ''} ${s.automatizacion?.descripcion || ''}`).join(' ').toLowerCase()
  if (/flor/.test(txt)) return 'floracion'
  if (/veg/.test(txt)) return 'vegetativo'
  if (d?.ciclo) {
    const ini = new Date(d.ciclo.inicio).getTime(), fin = new Date(d.ciclo.fin).getTime()
    const frac = (Date.now() - ini) / (fin - ini)
    return frac > 0.45 ? 'floracion' : 'vegetativo'
  }
  return 'vegetativo'
}

// Parsea la regla de automatizacion de Growcast a algo legible.
function parseAuto(a: Auto): { modo: string; icono: any; texto: string | null } {
  if (!a) return { modo: 'Manual', icono: Hand, texto: null }
  try {
    const v = JSON.parse(a.valor)
    if (a.tipo === 'schedule') {
      let on: string | null = null, off: string | null = null
      const walk = (n: any) => {
        if (!n) return
        if (n.type === 'comparison' && n.value && n.value.type === 'time') {
          const t = `${String(n.value.hours).padStart(2, '0')}:${String(n.value.minutes).padStart(2, '0')}`
          if (n.operator === 'greaterThan') on = t
          else if (n.operator === 'lessThan') off = t
        }
        (n.children || []).forEach(walk)
      }
      walk(v.trigger)
      return { modo: 'Horario', icono: Clock, texto: on && off ? `Encendido ${on} → ${off}` : 'Por horario' }
    }
    if (a.tipo === 'simpleComparator') {
      const t = v.trigger
      const sensName: Record<number, string> = { 1929: 'Temperatura', 1930: 'Humedad', 1931: 'CO₂', 1932: 'VPD' }
      const io = t?.value?.ioId
      const op = t?.operator === 'greaterThan' ? '>' : t?.operator === 'lessThan' ? '<' : (t?.operator || '')
      const ref = t?.reference?.value
      return { modo: 'Condición', icono: SlidersHorizontal, texto: `Enciende si ${sensName[io] || 'sensor'} ${op} ${ref}` }
    }
  } catch { /* noop */ }
  return { modo: a.tipo || 'Auto', icono: SlidersHorizontal, texto: a.nombre }
}

// Extrae el setpoint de un comparador (ej AC enciende si temp > 24 -> 24).
function setpointComparador(a: Auto): number | null {
  if (!a || a.tipo !== 'simpleComparator') return null
  try { return JSON.parse(a.valor)?.trigger?.reference?.value ?? null } catch { return null }
}

type Reco = { estado: 'ok' | 'alto' | 'bajo' | 'info'; texto: string }
function recomendar(etapa: Etapa, d: Live | null): Reco[] {
  const R = RANGOS[etapa]; const s = d?.sensores; const out: Reco[] = []
  const lbl = ETAPA_LABEL[etapa].toLowerCase()
  const chk = (key: keyof NonNullable<Live['sensores']>, label: string, u: string, r: [number, number]) => {
    const v = s?.[key]?.value; if (v == null) return
    if (v < r[0]) out.push({ estado: 'bajo', texto: `${label} ${v}${u}: baja para ${lbl} (ideal ${r[0]}–${r[1]}${u}). Subila.` })
    else if (v > r[1]) out.push({ estado: 'alto', texto: `${label} ${v}${u}: alta para ${lbl} (ideal ${r[0]}–${r[1]}${u}). Bajala.` })
    else out.push({ estado: 'ok', texto: `${label} ${v}${u}: en rango para ${lbl} (${r[0]}–${r[1]}${u}).` })
  }
  chk('temperatura', 'Temperatura', '°C', R.temp)
  chk('humedad', 'Humedad', '% HR', R.hr)
  // VPD calculado de temp+HR (método calculadora VPD), con cómo corregirlo.
  const tC = s?.temperatura?.value, hr = s?.humedad?.value
  if (tC != null && hr != null) {
    const vpd = vpdAire(tC, hr); const [lo, hi] = R.vpd
    const objHR = hrParaVpd(tC, (lo + hi) / 2)
    const nota = etapa === 'floracion' ? ' — temprana 1.0–1.2, tardía 1.2–1.6' : ''
    const base = `VPD ${vpd} kPa (de ${tC}°C y ${hr}% HR)`
    if (vpd < lo) out.push({ estado: 'bajo', texto: `${base}: bajo para ${lbl} (ideal ${lo}–${hi}${nota}). Subilo bajando la HR a ~${objHR}% o subiendo un poco la temperatura.` })
    else if (vpd > hi) out.push({ estado: 'alto', texto: `${base}: alto para ${lbl} (ideal ${lo}–${hi}${nota}). Bajalo subiendo la HR a ~${objHR}% o bajando la temperatura.` })
    else out.push({ estado: 'ok', texto: `${base}: en rango para ${lbl} (${lo}–${hi}${nota}).` })
  }
  chk('co2', 'CO₂', ' ppm', R.co2)

  // Notas atadas a las automatizaciones existentes
  const ac = d?.salidas?.aire_acondicionado?.automatizacion ?? null
  const sp = setpointComparador(ac)
  if (sp != null) {
    if (etapa === 'floracion' && sp > 26) out.push({ estado: 'alto', texto: `El AC enciende a ${sp}°C; para floración conviene bajar el target a ~24–25°C.` })
    else if (etapa === 'vegetativo' && sp < 23) out.push({ estado: 'info', texto: `El AC enciende a ${sp}°C; en vege podés permitir hasta ~26–27°C sin problema.` })
    else out.push({ estado: 'info', texto: `El AC enciende si la temp supera ${sp}°C (acorde a ${ETAPA_LABEL[etapa]}).` })
  }
  const luces = d?.salidas?.luces?.automatizacion ?? null
  const pa = parseAuto(luces)
  if (luces && pa.texto) {
    if (etapa === 'floracion' && !/12/.test(pa.texto)) out.push({ estado: 'alto', texto: `Luces en "${luces.nombre}" (${pa.texto}). Para floración el fotoperiodo debe ser 12/12.` })
    else out.push({ estado: 'info', texto: `Luces por horario: ${pa.texto} (${luces.nombre}).` })
  }
  return out
}

// ---- Sparkline SVG sin dependencias ----
function Spark({ puntos, color }: { puntos: Punto[]; color: string }) {
  if (!puntos || puntos.length < 2) return <div className="h-10 mt-2" />
  const vs = puntos.map(p => p.v)
  const min = Math.min(...vs), max = Math.max(...vs), rango = max - min || 1
  const W = 240, H = 40
  const pts = puntos.map((p, i) => `${((i / (puntos.length - 1)) * W).toFixed(1)},${(H - ((p.v - min) / rango) * (H - 6) - 3).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10 mt-2" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

type DefSensor = { key: 'temperatura' | 'humedad' | 'co2' | 'vpd'; rangoKey: 'temp' | 'hr' | 'vpd' | 'co2'; label: string; unidad: string; icono: any; color: string; decimales: number }
const SENSORES: DefSensor[] = [
  { key: 'temperatura', rangoKey: 'temp', label: 'Temperatura', unidad: '°C', icono: Thermometer, color: '#ff8a7a', decimales: 1 },
  { key: 'humedad', rangoKey: 'hr', label: 'Humedad', unidad: '% HR', icono: Droplets, color: '#38bdf8', decimales: 1 },
  { key: 'co2', rangoKey: 'co2', label: 'CO₂', unidad: 'ppm', icono: Wind, color: '#a78bfa', decimales: 0 },
  { key: 'vpd', rangoKey: 'vpd', label: 'VPD', unidad: 'kPa', icono: Gauge, color: '#bef264', decimales: 2 },
]
const SALIDAS_DEF: { key: string; label: string; icono: any }[] = [
  { key: 'luces', label: 'Luces', icono: Lightbulb },
  { key: 'aire_acondicionado', label: 'Aire acond.', icono: Snowflake },
  { key: 'ventiladores', label: 'Ventiladores', icono: Fan },
  { key: 'extractores', label: 'Extractores', icono: Wind },
  { key: 'deshumidificador', label: 'Deshumidif.', icono: CloudFog },
  { key: 'humidificador', label: 'Humidif.', icono: Droplets },
]
const ESTADO_COLOR = { ok: '#bef264', alto: '#ff8a7a', bajo: '#fbbf24', info: '#38bdf8' } as const

export default function PaginaAmbiente() {
  const [data, setData] = useState<Live | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultima, setUltima] = useState<Date | null>(null)
  const [etapaManual, setEtapaManual] = useState<Etapa | null>(null)
  const [verFicha, setVerFicha] = useState(false)
  const timer = useRef<number | null>(null)

  const cargar = useCallback(async (spinner = false) => {
    if (spinner) setCargando(true)
    try {
      const r = await fetch(WEBHOOK, { cache: 'no-store' })
      const j: Live = await r.json()
      if (!j.ok) throw new Error(j.error || 'Growcast no respondió')
      setData(j); setError(null); setUltima(new Date())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar(true)
    timer.current = window.setInterval(() => cargar(false), INTERVALO_MS)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [cargar])

  const etapaAuto = useMemo(() => detectarEtapa(data), [data])
  const etapa = etapaManual ?? etapaAuto
  const sensores = data?.sensores
  const series = data?.series || {}
  const recos = useMemo(() => recomendar(etapa, data), [etapa, data])

  const estadoSensor = (rk: DefSensor['rangoKey'], v?: number): 'ok' | 'alto' | 'bajo' | null => {
    if (v == null) return null
    const r = RANGOS[etapa][rk]
    return v < r[0] ? 'bajo' : v > r[1] ? 'alto' : 'ok'
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-3 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#bef264]" /> Ambiente
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              En vivo · {data?.sala?.nombre || 'Sala'}{data?.ciclo ? ` · ciclo ${fmtFecha(data.ciclo.inicio)}–${fmtFecha(data.ciclo.fin)}` : ''}
            </div>
          </div>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#463a66] bg-[#a78bfa]/10 text-[10.5px] font-medium text-[#c4b5fd]">
            <Leaf className="w-3 h-3" /> {ETAPA_LABEL[etapa]}
          </span>
          {error ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#5a2a26] bg-[#ff8a7a]/10 text-[11px] font-medium text-[#ff8a7a]">
              <WifiOff className="w-3.5 h-3.5" /> Sin conexión
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#404d20] bg-[#a3e635]/10 text-[11px] font-medium text-[#d9f99d]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#bef264]/60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#bef264]" />
              </span>
              En vivo
            </span>
          )}
          <button onClick={() => setVerFicha(true)} disabled={!data?.sala}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1] disabled:opacity-40">
            <ClipboardList className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ver ficha</span>
          </button>
          <button onClick={() => cargar(true)} disabled={cargando} title="Actualizar ahora"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11px] font-medium text-[#d9f99d] disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-24 space-y-5">
        {error && !data ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><WifiOff className="w-5 h-5 text-[#ff8a7a]" /></div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin conexión con Growcast</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b] max-w-sm mx-auto">{error}. Verificá que n8n y la PC estén prendidos.</div>
            <button onClick={() => cargar(true)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d]"><RefreshCw className="w-3.5 h-3.5" /> Reintentar</button>
          </div>
        ) : (
          <>
            {/* Sensores */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {SENSORES.map(s => {
                const v = sensores?.[s.key]
                const est = estadoSensor(s.rangoKey, v?.value)
                const col = est ? ESTADO_COLOR[est] : s.color
                return (
                  <div key={s.key} className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}1f`, border: `1px solid ${s.color}40` }}>
                        <s.icono className="w-3.5 h-3.5" style={{ color: s.color }} />
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] flex-1">{s.label}</div>
                      {est && est !== 'ok' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: col }} title={est} />}
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                      {cargando && !v ? <div className="h-8 w-20 bg-[#15151d] rounded animate-pulse" /> : (
                        <>
                          <span className="font-display font-bold text-[30px] leading-none tabular-nums" style={{ color: est && est !== 'ok' ? col : '#ececf1' }}>
                            {v ? Number(v.value).toFixed(s.decimales) : '—'}
                          </span>
                          <span className="text-[12px] text-[#757584]">{s.unidad}</span>
                        </>
                      )}
                    </div>
                    <Spark puntos={series[s.key] || []} color={s.color} />
                  </div>
                )
              })}
            </div>

            {/* Salidas y automatizaciones */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f2b]">
                <Power className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Salidas y automatizaciones</h3>
                <span className="hidden sm:inline text-[10.5px] text-[#5c5c6b]">cómo se prende y apaga cada cosa</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 p-4">
                {SALIDAS_DEF.map(o => {
                  const st = data?.salidas?.[o.key]
                  const on = st?.on
                  const pa = parseAuto(st?.automatizacion || null)
                  return (
                    <div key={o.key} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <o.icono className="w-4 h-4 flex-shrink-0" style={{ color: on ? '#bef264' : '#5c5c6b' }} />
                        <span className="text-[12.5px] text-[#ececf1] flex-1 truncate">{o.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${on ? 'text-[#d9f99d] bg-[#a3e635]/10 border border-[#404d20]' : 'text-[#757584] bg-[#1c1c27] border border-[#2a2a3a]'}`}>
                          {st?.on == null ? '—' : on ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#a6a6b5]">
                        <pa.icono className="w-3 h-3 flex-shrink-0 text-[#757584]" />
                        <span className="truncate">{pa.texto || pa.modo}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Analisis y recomendaciones */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
              <div className="flex items-center flex-wrap gap-2 px-4 py-3 border-b border-[#1f1f2b]">
                <Sparkles className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Análisis y recomendaciones</h3>
                <div className="flex-1" />
                <span className="text-[10px] text-[#5c5c6b]">Etapa:</span>
                <div className="flex gap-1">
                  {(['vegetativo', 'floracion'] as Etapa[]).map(e => (
                    <button key={e} onClick={() => setEtapaManual(e)}
                      className={`px-2 py-1 rounded-md text-[10.5px] font-medium border transition-colors ${etapa === e ? 'border-[#463a66] bg-[#a78bfa]/12 text-[#c4b5fd]' : 'border-[#2a2a3a] bg-[#15151d] text-[#757584] hover:text-[#a6a6b5]'}`}>
                      {ETAPA_LABEL[e]}
                    </button>
                  ))}
                  {etapaManual && <button onClick={() => setEtapaManual(null)} title="Volver a automático" className="px-2 py-1 rounded-md text-[10.5px] border border-[#2a2a3a] bg-[#15151d] text-[#757584] hover:text-[#a6a6b5]">Auto</button>}
                </div>
              </div>
              <ul className="divide-y divide-[#1f1f2b]/60">
                {recos.map((r, i) => {
                  const Ico = r.estado === 'ok' ? CheckCircle2 : r.estado === 'info' ? Info : AlertTriangle
                  const col = ESTADO_COLOR[r.estado]
                  return (
                    <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                      <Ico className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: col }} />
                      <span className="text-[12px] text-[#d4d4dd] leading-relaxed">{r.texto}</span>
                    </li>
                  )
                })}
              </ul>
              <div className="px-4 py-2.5 border-t border-[#1f1f2b] text-[10px] text-[#5c5c6b]">
                Rangos para {ETAPA_LABEL[etapa]}: temp/HR/CO₂ (Athena/Pulse) y VPD calculado de temp+HR (método calculadora VPD). Vos ajustás las automatizaciones en Growcast; acá solo se sugiere.
              </div>
            </div>

            <div className="text-[10.5px] text-[#5c5c6b] flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Actualiza cada {INTERVALO_S}s · última lectura {fmtHora(ultima?.toISOString())}
              {data?.sensores?.temperatura?.ts && <span>· dato del sensor {fmtHora(data.sensores.temperatura.ts)}</span>}
            </div>
          </>
        )}
      </div>

      {verFicha && data?.sala && <ModalFicha sala={data.sala} ciclo={data.ciclo} onCerrar={() => setVerFicha(false)} />}
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor == null || valor === '') return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] mb-0.5">{label}</div>
      <div className="text-[12.5px] text-[#ececf1]">{valor}</div>
    </div>
  )
}

function ModalFicha({ sala, ciclo, onCerrar }: { sala: Sala; ciclo: Live['ciclo']; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-[15px] text-[#ececf1] flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#bef264]" /> {sala.nombre || 'Sala'}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Campo label="Medio" valor={sala.medio} />
          <Campo label="Dimensiones" valor={sala.ancho && sala.largo ? `${sala.ancho} × ${sala.largo}${sala.alto ? ` × ${sala.alto}` : ''} m` : null} />
          <Campo label="Canopy" valor={sala.canopy ? `${sala.canopy} m²` : null} />
          <Campo label="Luces" valor={sala.lucesCantidad ? `${sala.lucesCantidad} × ${sala.lucesTipo || ''} (${sala.lucesPotencia || '?'} W)` : null} />
          <Campo label="AC" valor={sala.acBtu ? `${sala.acBtu} BTU` : null} />
          <Campo label="Ciclo" valor={ciclo ? `${fmtFecha(ciclo.inicio)} → ${fmtFecha(ciclo.fin)}` : null} />
        </div>
        <div className="px-4 pb-4 -mt-1 text-[10.5px] text-[#5c5c6b]">Datos de la sala en Growcast (solo lectura). Para editarlos, usá la app de Growcast.</div>
      </div>
    </div>
  )
}
