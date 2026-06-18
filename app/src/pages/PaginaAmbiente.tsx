// PaginaAmbiente — lectura EN VIVO de los sensores de Growcast (temp/HR/CO2/VPD)
// + estado de las salidas. NO guarda nada: lee del proxy n8n cada pocos segundos,
// igual que la app de Growcast. El historial lo sirve Growcast (no se acumula acá).

import { useState, useEffect, useRef, useCallback } from 'react'
import { Thermometer, Droplets, Wind, Gauge, RefreshCw, WifiOff, Activity, Fan, Snowflake, Lightbulb, CloudFog, Power } from 'lucide-react'

const WEBHOOK = (import.meta as any).env?.VITE_GROWCAST_WEBHOOK_URL || 'http://192.168.0.60:5678/webhook/growcast-live'
const INTERVALO_MS = 15000

type Punto = { t: string; v: number }
type Sensor = { value: number; ts: string } | null
type Salida = { on: boolean; ts: string } | null
interface Live {
  ok: boolean
  ts?: string
  sensores?: { temperatura: Sensor; humedad: Sensor; co2: Sensor; vpd: Sensor }
  salidas?: Record<string, Salida>
  series?: Record<string, Punto[]>
  error?: string
}

const fmtHora = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'

// Mini sparkline en SVG (sin dependencias).
function Spark({ puntos, color }: { puntos: Punto[]; color: string }) {
  if (!puntos || puntos.length < 2) return null
  const vs = puntos.map(p => p.v)
  const min = Math.min(...vs), max = Math.max(...vs)
  const rango = max - min || 1
  const W = 240, H = 40
  const pts = puntos.map((p, i) => {
    const x = (i / (puntos.length - 1)) * W
    const y = H - ((p.v - min) / rango) * (H - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10 mt-2" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

type DefSensor = { key: 'temperatura' | 'humedad' | 'co2' | 'vpd'; label: string; unidad: string; icono: any; color: string; decimales: number }
const SENSORES: DefSensor[] = [
  { key: 'temperatura', label: 'Temperatura', unidad: '°C', icono: Thermometer, color: '#ff8a7a', decimales: 1 },
  { key: 'humedad', label: 'Humedad', unidad: '% HR', icono: Droplets, color: '#38bdf8', decimales: 1 },
  { key: 'co2', label: 'CO₂', unidad: 'ppm', icono: Wind, color: '#a78bfa', decimales: 0 },
  { key: 'vpd', label: 'VPD', unidad: 'kPa', icono: Gauge, color: '#bef264', decimales: 2 },
]

const SALIDAS_DEF: { key: string; label: string; icono: any }[] = [
  { key: 'luces', label: 'Luces', icono: Lightbulb },
  { key: 'aire_acondicionado', label: 'Aire acond.', icono: Snowflake },
  { key: 'ventiladores', label: 'Ventiladores', icono: Fan },
  { key: 'extractores', label: 'Extractores', icono: Wind },
  { key: 'deshumidificador', label: 'Deshumidif.', icono: CloudFog },
  { key: 'humidificador', label: 'Humidif.', icono: Droplets },
]

export default function PaginaAmbiente() {
  const [data, setData] = useState<Live | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ultima, setUltima] = useState<Date | null>(null)
  const timer = useRef<number | null>(null)

  const cargar = useCallback(async () => {
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
    cargar()
    timer.current = window.setInterval(cargar, INTERVALO_MS)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [cargar])

  const sensores = data?.sensores
  const series = data?.series || {}

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#bef264]" /> Ambiente
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Lectura en vivo de Growcast · Sala de ciclo completo
            </div>
          </div>
          <div className="flex-1" />
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
          <button onClick={cargar} title="Actualizar ahora"
            className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-24 space-y-5">
        {error && !data ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><WifiOff className="w-5 h-5 text-[#ff8a7a]" /></div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin conexión con Growcast</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b] max-w-sm mx-auto">{error}. Verificá que n8n y la PC estén prendidos. Reintenta solo cada 15s.</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {SENSORES.map(s => {
                const v = sensores?.[s.key]
                return (
                  <div key={s.key} className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}1f`, border: `1px solid ${s.color}40` }}>
                        <s.icono className="w-3.5 h-3.5" style={{ color: s.color }} />
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b]">{s.label}</div>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                      {cargando && !v ? (
                        <div className="h-8 w-20 bg-[#15151d] rounded animate-pulse" />
                      ) : (
                        <>
                          <span className="font-display font-bold text-[30px] leading-none tabular-nums text-[#ececf1]">
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

            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f2b]">
                <Power className="w-4 h-4 text-[#bef264]" />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Salidas</h3>
                <span className="text-[10.5px] text-[#5c5c6b]">estado actual</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
                {SALIDAS_DEF.map(o => {
                  const st = data?.salidas?.[o.key]
                  const on = st?.on
                  return (
                    <div key={o.key} className="flex items-center gap-2.5 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5">
                      <o.icono className="w-4 h-4 flex-shrink-0" style={{ color: on ? '#bef264' : '#5c5c6b' }} />
                      <span className="text-[12px] text-[#d4d4dd] flex-1 truncate">{o.label}</span>
                      <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md ${on ? 'text-[#d9f99d] bg-[#a3e635]/10 border border-[#404d20]' : 'text-[#757584] bg-[#1c1c27] border border-[#2a2a3a]'}`}>
                        {st == null ? '—' : on ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="text-[10.5px] text-[#5c5c6b] flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Actualiza cada 15s · última lectura {fmtHora(ultima?.toISOString())}
              {data?.sensores?.temperatura?.ts && <span>· dato del sensor {fmtHora(data.sensores.temperatura.ts)}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
