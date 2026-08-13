// "Mi plan": el calendario propio de 14 semanas (sala con CO₂) con las dosis de
// cada etapa, lo que sale comprando Ryanodine y lo que sale clonándolo.
// El costo del clon se calcula con el mismo solver de la calculadora, así que
// sigue los precios que estén cargados en Proveedores.

import { useMemo } from 'react'
import { CalendarRange, Beaker, ShoppingCart, Info as InfoIcon } from 'lucide-react'
import {
  PLAN_CO2, PRESETS, calcularReceta, kitParaPerfil, opcionesDeMarca,
  type EtapaPlan, type Sal, type Perfil, type Proveedor,
} from '../../lib/nutrientes'

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b]'

/** Precio por mL de cada comercial, tomado del proveedor marcado como referencia. */
function preciosComerciales(proveedores: Proveedor[]) {
  const TAM: Record<string, number> = { L: 1, '1L': 1, '5L': 5, '10L': 10, '20L': 20 }
  const PESO: Record<string, number> = { g: 0.001, '500g': 0.5, '800g': 0.8, kg: 1, '1kg': 1 }
  const out: Record<string, number> = {}   // $ por mL (líquidos) o por g (Finis)
  for (const p of proveedores) {
    if (!p.precio || !p.sal_id?.startsWith('ryano_')) continue
    const litros = TAM[p.unidad ?? '']
    const kilos = PESO[p.unidad ?? '']
    if (litros) out[p.sal_id] = p.precio / (litros * 1000)
    else if (kilos) out[p.sal_id] = p.precio / (kilos * 1000)
  }
  return out
}

interface FilaCosto extends EtapaPlan {
  litros: number
  costoComercial: number
  costoClon: number
}

export default function PlanTab({ salesTodas, proveedores, onUsarPreset }: {
  salesTodas: Sal[]
  proveedores: Proveedor[]
  onUsarPreset: (perfil: Perfil, presetId: string) => void
}) {
  const precios = useMemo(() => preciosComerciales(proveedores), [proveedores])

  const filas = useMemo<FilaCosto[]>(() => PLAN_CO2.map(e => {
    const litros = e.nSemanas * 7 * e.litrosDia

    // Lo que cuesta comprando los bidones de Ryanodine.
    const pMakro = precios['ryano_makro'] ?? 0
    const pMikro = precios['ryano_mikro'] ?? 0
    const pCalcis = precios['ryano_calcis'] ?? 0
    const pFinis = precios['ryano_finis'] ?? 0
    const comercialPorLitro =
      (e.makro ?? 0) * pMakro + e.mikro * pMikro + (e.calcis ?? 0) * pCalcis + (e.finis ?? 0) * pFinis

    // Lo que cuesta clonándolo: se resuelve el perfil con el solver y se suman
    // las sales al precio que tenga cada una cargado.
    const preset = PRESETS.find(p => p.id === e.presetId)
    let clonPorLitro = 0
    if (preset) {
      const kit = kitParaPerfil(preset.perfil, opcionesDeMarca(''))
      const disp = salesTodas.filter(s => kit.includes(s.id))
      if (disp.length) {
        const res = calcularReceta(preset.perfil, disp)
        clonPorLitro = res.dosis.reduce((s, d) => s + (d.gramosPorL / 1000) * (d.sal.costoKg ?? 0), 0)
      }
    }
    return { ...e, litros, costoComercial: comercialPorLitro * litros, costoClon: clonPorLitro * litros }
  }), [precios, salesTodas])

  const tot = useMemo(() => filas.reduce((a, f) => ({
    litros: a.litros + f.litros,
    comercial: a.comercial + f.costoComercial,
    clon: a.clon + f.costoClon,
    semanas: a.semanas + f.nSemanas,
  }), { litros: 0, comercial: 0, clon: 0, semanas: 0 }), [filas])

  const ahorro = tot.comercial - tot.clon
  const ahorroPct = tot.comercial > 0 ? (ahorro / tot.comercial) * 100 : 0

  // Cuántos bidones/potes hay que comprar para el ciclo entero.
  const compras = useMemo(() => {
    const ml = { makro: 0, mikro: 0, calcis: 0, finis: 0 }
    filas.forEach(f => {
      ml.makro += (f.makro ?? 0) * f.litros
      ml.mikro += f.mikro * f.litros
      ml.calcis += (f.calcis ?? 0) * f.litros
      ml.finis += (f.finis ?? 0) * f.litros
    })
    return [
      { nombre: 'Makro (A)', cant: ml.makro / 1000, unidad: 'L', envase: 10, precio: 205000 },
      { nombre: 'Mikro (B)', cant: ml.mikro / 1000, unidad: 'L', envase: 10, precio: 210000 },
      { nombre: 'Calcis (C)', cant: ml.calcis / 1000, unidad: 'L', envase: 10, precio: 150000 },
      { nombre: 'Finis', cant: ml.finis / 1000, unidad: 'kg', envase: 0.8, precio: 90000 },
    ].filter(x => x.cant > 0)
      .map(x => ({ ...x, envases: Math.ceil(x.cant / x.envase), total: Math.ceil(x.cant / x.envase) * x.precio }))
  }, [filas])

  const totalCompra = compras.reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <section className={`${card} p-4 sm:p-5`}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
          <h2 className="font-display font-semibold text-[15px] text-[#ececf1]">Mi plan · 14 semanas</h2>
        </div>
        <p className="text-[13px] text-[#8a8a9a] leading-relaxed">
          Ciclo de 6 m² con CO₂ en floración y agua de ósmosis. Arranca suave, llega a
          <b className="text-[#d9f99d]"> EC 3,0 en engorde</b> —donde el CO₂ lo devuelve en peso— y cierra con Finis.
        </p>

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Dato label="Riego del ciclo" valor={`${Math.round(tot.litros).toLocaleString('es-AR')} L`} sub={`${tot.semanas} semanas`} />
          <Dato label="Comprando Ryanodine" valor={money(tot.comercial)} sub="los 4 productos" color="#ff8a7a" />
          <Dato label="Clonándolo vos" valor={money(tot.clon)} sub="mismas ppm" color="#bef264" />
          <Dato label="Ahorro" valor={money(ahorro)} sub={`${ahorroPct.toFixed(0)}% menos`} color="#bef264" />
        </div>
      </section>

      {/* Calendario: tabla en desktop, tarjetas en celular */}
      <section className={`${card} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
          <Beaker className="w-3.5 h-3.5 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Calendario</h3>
          <span className="ml-auto text-[11.5px] text-[#7d7d8e]">tocá una etapa para cargarla</span>
        </div>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-[#7d7d8e] border-b border-[#1f1f2b]">
                <th className="text-left font-medium px-4 py-2">Etapa</th>
                <th className="text-center font-medium px-2 py-2">Sem</th>
                <th className="text-center font-medium px-2 py-2">EC</th>
                <th className="text-right font-medium px-2 py-2">Makro</th>
                <th className="text-right font-medium px-2 py-2">Mikro</th>
                <th className="text-right font-medium px-2 py-2">Calcis</th>
                <th className="text-right font-medium px-2 py-2">Finis</th>
                <th className="text-right font-medium px-2 py-2">L/día</th>
                <th className="text-right font-medium px-3 py-2">Ryanodine</th>
                <th className="text-right font-medium px-4 py-2">Clon</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.presetId} onClick={() => cargar(f)}
                  className={`border-b border-[#16161e] last:border-0 cursor-pointer hover:bg-[#15151d] transition-colors ${f.ec >= 3 ? 'bg-[#a3e635]/[0.04]' : ''}`}>
                  <td className="px-4 py-2 text-[#ececf1] font-medium">{f.etapa}</td>
                  <td className="px-2 py-2 text-center text-[#8a8a9a] tabular-nums">{f.semanas}</td>
                  <td className="px-2 py-2 text-center tabular-nums" style={{ color: f.ec >= 3 ? '#bef264' : '#a6a6b5' }}>{f.ec.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right text-[#a6a6b5] tabular-nums">{f.makro?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-2 text-right text-[#a6a6b5] tabular-nums">{f.mikro.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right text-[#a6a6b5] tabular-nums">{f.calcis?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-2 text-right text-[#c4b5fd] tabular-nums">{f.finis ? `${f.finis} g` : '—'}</td>
                  <td className="px-2 py-2 text-right text-[#7d7d8e] tabular-nums">{f.litrosDia}</td>
                  <td className="px-3 py-2 text-right text-[#ff8a7a] tabular-nums">{money(f.costoComercial)}</td>
                  <td className="px-4 py-2 text-right text-[#bef264] tabular-nums font-medium">{money(f.costoClon)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#0d0d13] text-[13.5px]">
                <td className="px-4 py-2.5 text-[#a6a6b5] font-medium" colSpan={7}>Total del ciclo · {Math.round(tot.litros).toLocaleString('es-AR')} L de riego</td>
                <td />
                <td className="px-3 py-2.5 text-right text-[#ff8a7a] font-semibold tabular-nums">{money(tot.comercial)}</td>
                <td className="px-4 py-2.5 text-right text-[#bef264] font-semibold tabular-nums">{money(tot.clon)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile */}
        <div className="lg:hidden divide-y divide-[#16161e]">
          {filas.map(f => (
            <button key={f.presetId} onClick={() => cargar(f)}
              className={`w-full text-left px-4 py-3 min-h-[44px] hover:bg-[#15151d] transition-colors ${f.ec >= 3 ? 'bg-[#a3e635]/[0.04]' : ''}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[#ececf1]">{f.etapa}</span>
                <span className="text-[11.5px] text-[#7d7d8e] tabular-nums flex-shrink-0">sem {f.semanas}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#8a8a9a] tabular-nums">
                <span style={{ color: f.ec >= 3 ? '#bef264' : undefined }}>EC {f.ec.toFixed(1)}</span>
                {f.makro != null && <span>A/B {f.makro.toFixed(1)} mL/L</span>}
                {f.calcis != null && <span>C {f.calcis.toFixed(1)}</span>}
                {f.finis != null && <span className="text-[#c4b5fd]">Finis {f.finis} g/L</span>}
                <span>{f.litrosDia} L/día</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-3 text-[12.5px] tabular-nums">
                <span className="text-[#ff8a7a]">{money(f.costoComercial)}</span>
                <span className="text-[#7d7d8e]">vs</span>
                <span className="text-[#bef264] font-medium">{money(f.costoClon)}</span>
              </div>
            </button>
          ))}
          <div className="px-4 py-3 bg-[#0d0d13] flex items-baseline justify-between">
            <span className="text-[12.5px] text-[#a6a6b5] font-medium">Total del ciclo</span>
            <span className="text-[13.5px] tabular-nums">
              <span className="text-[#ff8a7a]">{money(tot.comercial)}</span>
              <span className="text-[#7d7d8e] mx-1.5">vs</span>
              <span className="text-[#bef264] font-semibold">{money(tot.clon)}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Notas de las etapas que las tienen */}
      <section className={`${card} p-4 space-y-2`}>
        {PLAN_CO2.filter(e => e.nota).map(e => (
          <div key={e.presetId} className="flex items-start gap-2">
            <InfoIcon className="w-3.5 h-3.5 text-[#7d7d8e] flex-shrink-0 mt-px" />
            <p className="text-[12.5px] text-[#8a8a9a] leading-relaxed">
              <b className="text-[#a6a6b5]">{e.etapa}:</b> {e.nota}
            </p>
          </div>
        ))}
      </section>

      {/* Lista de compras */}
      <section className={`${card} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Si comprás Ryanodine</h3>
          <span className="ml-auto text-[12.5px] text-[#a6a6b5] tabular-nums">{money(totalCompra)}</span>
        </div>
        <div className="divide-y divide-[#16161e]">
          {compras.map(c => (
            <div key={c.nombre} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[13.5px] text-[#d4d4dd] min-w-0 flex-1">{c.nombre}</span>
              <span className="text-[12px] text-[#7d7d8e] tabular-nums">{c.cant.toFixed(1)} {c.unidad}</span>
              <span className="text-[12.5px] text-[#a6a6b5] tabular-nums whitespace-nowrap">
                {c.envases} × {c.envase}{c.unidad === 'kg' ? ' kg' : ' L'}
              </span>
              <span className="text-[13.5px] text-[#ececf1] tabular-nums w-24 text-right">{money(c.total)}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 bg-[#0d0d13] text-[12.5px] text-[#8a8a9a]">
          Clonándolo con tus sales, el mismo ciclo sale <b className="text-[#bef264]">{money(tot.clon)}</b> —
          te ahorrás <b className="text-[#bef264]">{money(ahorro)}</b>.
        </div>
      </section>
    </div>
  )

  function cargar(f: FilaCosto) {
    const preset = PRESETS.find(p => p.id === f.presetId)
    if (preset) onUsarPreset(preset.perfil, preset.id)
  }
}

function Dato({ label, valor, sub, color }: { label: string; valor: string; sub: string; color?: string }) {
  return (
    <div className="rounded-lg bg-[#0d0d13] border border-[#1a1a24] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.12em] text-[#7d7d8e] font-medium truncate">{label}</div>
      <div className="mt-1 text-[16px] sm:text-[16px] font-semibold tabular-nums leading-none" style={{ color: color ?? '#ececf1' }}>{valor}</div>
      <div className="text-[11.5px] text-[#7d7d8e] mt-1 truncate">{sub}</div>
    </div>
  )
}
