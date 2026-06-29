import { useMemo, useState } from 'react'
import { Calculator, Thermometer, Droplets, Sun, Leaf, Info } from 'lucide-react'

function calcularVPD(tempC: number, rh: number): { vpd_air: number; vpd_leaf: number } {
  const svp = (T: number) => 0.6108 * Math.exp((17.27 * T) / (T + 237.3))
  const svpAir = svp(tempC)
  const svpLeaf = svp(tempC - 2)
  const vpd_air = svpAir * (1 - rh / 100)
  const vpd_leaf = svpLeaf - (svpAir * rh) / 100
  return { vpd_air: +vpd_air.toFixed(2), vpd_leaf: +vpd_leaf.toFixed(2) }
}

function calcularDLI(ppfd: number, horas: number): number {
  return +((ppfd * horas * 3600) / 1_000_000).toFixed(1)
}

const FASES = [
  { id: 'clones', label: 'Clones', vpd: [0.4, 0.8], dli: [8, 15], temp: [22, 26], rh: [70, 85] },
  { id: 'veg', label: 'Vegetativo', vpd: [0.8, 1.1], dli: [25, 40], temp: [22, 28], rh: [60, 70] },
  { id: 'flo_early', label: 'Flor. temprana', vpd: [1.0, 1.2], dli: [35, 45], temp: [22, 27], rh: [55, 65] },
  { id: 'flo_mid', label: 'Flor. media', vpd: [1.2, 1.4], dli: [40, 50], temp: [22, 26], rh: [45, 55] },
  { id: 'flo_late', label: 'Flor. tardía', vpd: [1.4, 1.6], dli: [40, 50], temp: [20, 24], rh: [40, 50] },
  { id: 'secado', label: 'Secado', vpd: [1.0, 1.3], dli: [0, 0], temp: [18, 21], rh: [55, 60] },
]

const SISTEMAS = [
  { id: 'COCO', label: 'COCO (SFL1)', note: 'Tolera humedad mas baja. VPD puede ir 0.1 kPa arriba del rango.' },
  { id: 'RDWC', label: 'RDWC (SFL2)', note: 'Raiz en agua = mayor transpiracion. VPD mas conservador, RH mas alta.' },
]

function colorVals(v: number, min: number, max: number): { text: string; bg: string; border: string } {
  if (v < min) return { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' }
  if (v > max) return { text: '#ff8a7a', bg: 'rgba(255,138,122,0.08)', border: 'rgba(255,138,122,0.25)' }
  return { text: '#d9f99d', bg: 'rgba(63,176,116,0.10)', border: '#404d20' }
}

function statusLabel(v: number, min: number, max: number) {
  if (v < min) return 'Muy bajo'
  if (v > max) return 'Muy alto'
  return 'OPTIMO'
}

export default function PaginaCultivoCalc() {
  const [temp, setTemp] = useState(25)
  const [rh, setRh] = useState(60)
  const [ppfd, setPpfd] = useState(800)
  const [horas, setHoras] = useState(12)
  const [sistema, setSistema] = useState<'COCO' | 'RDWC'>('COCO')
  const [fase, setFase] = useState<string>('flo_mid')

  const vpd = useMemo(() => calcularVPD(temp, rh), [temp, rh])
  const dli = useMemo(() => calcularDLI(ppfd, horas), [ppfd, horas])
  const faseSel = FASES.find(f => f.id === fase)!
  const sisSel = SISTEMAS.find(s => s.id === sistema)!

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <Calculator className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Calculadoras de Cultivo</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              VPD + DLI
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>Optimos por fase y sistema RDWC/COCO</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">

        {/* Selector fase + sistema */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4 space-y-3">
          {/* Fases */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Fase</p>
            <div className="flex flex-wrap gap-1.5">
              {FASES.map(f => (
                <button key={f.id} onClick={() => setFase(f.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    fase === f.id
                      ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]'
                      : 'bg-[#15151d] border border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* Sistemas */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Sistema</p>
            <div className="flex flex-wrap gap-1.5">
              {SISTEMAS.map(s => (
                <button key={s.id} onClick={() => setSistema(s.id as 'COCO' | 'RDWC')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    sistema === s.id
                      ? s.id === 'RDWC'
                        ? 'bg-blue-500/15 border border-blue-500/40 text-blue-300'
                        : 'bg-[#a78bfa]/15 border border-[#463a66] text-[#c4b5fd]'
                      : 'bg-[#15151d] border border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {/* Nota sistema */}
          <div className="flex items-start gap-2 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#a3e635]" strokeWidth={1.8} />
            <p className="text-[10.5px] text-[#757584]">{sisSel.note}</p>
          </div>
        </div>

        {/* Calculadoras */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* VPD */}
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">VPD · Vapor Pressure Deficit</h3>
            </div>
            <div className="space-y-3">
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#8f8f9f] flex items-center gap-1">
                    <Thermometer className="w-3 h-3" strokeWidth={1.8} />
                    Temperatura: <b className="text-[#ececf1] font-mono ml-1">{temp}°C</b>
                  </span>
                  {(() => {
                    const c = colorVals(temp, faseSel.temp[0], faseSel.temp[1])
                    return (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium tabular-nums"
                        style={{ color: c.text, background: c.bg, borderColor: c.border }}>
                        {faseSel.temp[0]}-{faseSel.temp[1]}°C
                      </span>
                    )
                  })()}
                </div>
                <input type="range" min="15" max="35" step="0.5" value={temp}
                  onChange={e => setTemp(+e.target.value)} className="w-full accent-[#a3e635]" />
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#8f8f9f] flex items-center gap-1">
                    <Droplets className="w-3 h-3" strokeWidth={1.8} />
                    Humedad: <b className="text-[#ececf1] font-mono ml-1">{rh}%</b>
                  </span>
                  {(() => {
                    const c = colorVals(rh, faseSel.rh[0], faseSel.rh[1])
                    return (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium tabular-nums"
                        style={{ color: c.text, background: c.bg, borderColor: c.border }}>
                        {faseSel.rh[0]}-{faseSel.rh[1]}%
                      </span>
                    )
                  })()}
                </div>
                <input type="range" min="20" max="95" step="1" value={rh}
                  onChange={e => setRh(+e.target.value)} className="w-full accent-[#a3e635]" />
              </label>
            </div>
            {/* Resultados VPD */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'VPD aire', val: vpd.vpd_air, sub: 'kPa' },
                { label: 'VPD hoja (−2°C)', val: vpd.vpd_leaf, sub: 'kPa' },
              ].map(({ label, val, sub }) => {
                const c = colorVals(val, faseSel.vpd[0], faseSel.vpd[1])
                return (
                  <div key={label} className="rounded-xl p-3 border"
                    style={{ background: c.bg, borderColor: c.border }}>
                    <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1" style={{ color: c.text, opacity: 0.8 }}>{label}</p>
                    <p className="font-display font-bold text-[22px] tabular-nums leading-none" style={{ color: c.text }}>
                      {val} <span className="text-[12px] opacity-70">{sub}</span>
                    </p>
                    <p className="text-[10px] mt-1.5 font-medium" style={{ color: c.text }}>{statusLabel(val, faseSel.vpd[0], faseSel.vpd[1])}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-[#5c5c6b] mt-3 tabular-nums">
              Rango optimo: <b className="text-[#bef264]">{faseSel.vpd[0]}-{faseSel.vpd[1]} kPa</b>
            </p>
          </div>

          {/* DLI */}
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">DLI · Daily Light Integral</h3>
            </div>
            <div className="space-y-3">
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#8f8f9f]">PPFD: <b className="text-[#ececf1] font-mono ml-1">{ppfd}</b> µmol/m²/s</span>
                </div>
                <input type="range" min="100" max="1500" step="10" value={ppfd}
                  onChange={e => setPpfd(+e.target.value)} className="w-full accent-[#a78bfa]" />
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#8f8f9f]">Fotoperíodo: <b className="text-[#ececf1] font-mono ml-1">{horas}</b> hs</span>
                </div>
                <input type="range" min="0" max="24" step="1" value={horas}
                  onChange={e => setHoras(+e.target.value)} className="w-full accent-[#a78bfa]" />
              </label>
            </div>
            {/* Resultado DLI grande */}
            {(() => {
              const c = colorVals(dli, faseSel.dli[0], faseSel.dli[1])
              return (
                <div className="rounded-xl p-4 mt-4 border"
                  style={{ background: c.bg, borderColor: c.border }}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1" style={{ color: c.text, opacity: 0.8 }}>DLI acumulado</p>
                  <p className="font-display font-bold tabular-nums leading-none" style={{ color: c.text, fontSize: 36 }}>
                    {dli} <span className="text-[14px] opacity-70">mol/m²/día</span>
                  </p>
                  <p className="text-[11px] mt-2 font-medium" style={{ color: c.text }}>{statusLabel(dli, faseSel.dli[0], faseSel.dli[1])}</p>
                </div>
              )
            })()}
            <p className="text-[10px] text-[#5c5c6b] mt-3 tabular-nums">
              Rango optimo: <b className="text-[#bef264]">{faseSel.dli[0]}-{faseSel.dli[1] || '—'} mol/m²/día</b>
            </p>
          </div>
        </div>

        {/* Tabla rangos */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
            <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Tabla de rangos óptimos (PETE HOPE · Ka)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#1f1f2b]">
                  {['Fase','Temp (°C)','RH (%)','VPD (kPa)','DLI (mol/m²/d)'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FASES.map(f => (
                  <tr key={f.id} className={`border-b border-[#1f1f2b] last:border-0 transition-colors ${f.id === fase ? 'bg-[#a3e635]/08' : 'hover:bg-[#15151d]'}`}>
                    <td className="px-3 py-2 font-medium text-[#d4d4dd]">{f.label}</td>
                    <td className="px-3 py-2 text-[#a6a6b5] font-mono tabular-nums">{f.temp[0]}-{f.temp[1]}</td>
                    <td className="px-3 py-2 text-[#a6a6b5] font-mono tabular-nums">{f.rh[0]}-{f.rh[1]}</td>
                    <td className="px-3 py-2 text-[#a6a6b5] font-mono tabular-nums">{f.vpd[0]}-{f.vpd[1]}</td>
                    <td className="px-3 py-2 text-[#a6a6b5] font-mono tabular-nums">{f.dli[0]}-{f.dli[1] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[10px] text-[#5c5c6b] border-t border-[#1f1f2b]">
            Fuentes: Fluence Bioengineering, Cannabis Research Initiative UCONN, Pulse Labs 2024
          </p>
        </div>
      </div>
    </div>
  )
}
