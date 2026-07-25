// Resumen económico: el costo por gramo y de dónde sale.
// El modelo vive en lib/econometria (resumenEconomico): equipo del Stock
// amortizado por su vida útil + gastos fijos + variables + consumibles.

import { gramosParaCosto, type ResumenEconomico, type VidaUtil } from '../../lib/econometria'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fmtG = (n: number) => Math.round(n).toLocaleString('es-AR')

// --- El número que importa ---------------------------------------------------

export function CostoPorGramo({ eco, nCosechas, plantasActivas, mesesCiclo }: {
  eco: ResumenEconomico; nCosechas: number; plantasActivas: number; mesesCiclo: number
}) {
  const hay = eco.gramos > 0
  // Cuánto tendría que rendir el ciclo para llegar a cada precio de referencia.
  const metas = [1000, 2000, 3000].map(p => ({ precio: p, gramos: gramosParaCosto(eco.totalCiclo, p) }))
  const rindePromedio = nCosechas > 0 ? eco.gramos / nCosechas : 0
  const proyectado = rindePromedio * plantasActivas

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#12160f] to-[#101016] border border-[#2c3a1a] p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#7c8b5c] font-medium mb-1">Costo por gramo</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[42px] leading-none text-[#bef264] tabular-nums">
              {hay ? fmt(eco.costoPorGramo ?? 0) : '—'}
            </span>
            {hay && <span className="text-[15px] text-[#7c8b5c] font-medium">/g</span>}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#8a8a9a]">
            {hay
              ? <>{fmt(eco.totalCiclo)} del ciclo ÷ {fmtG(eco.gramos)}g secos · {nCosechas} cosecha{nCosechas === 1 ? '' : 's'}</>
              : <>Cargá cosechas con peso seco para que se calcule. El ciclo de {mesesCiclo} meses cuesta <b className="text-[#d4d4dd]">{fmt(eco.totalCiclo)}</b>.</>}
          </div>
        </div>

        <div className="h-14 w-px bg-[#243018] hidden sm:block" />

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Para que te salga…</div>
          {metas.map(m => (
            <div key={m.precio} className="flex items-baseline gap-2 text-[11.5px]">
              <span className="text-[#a6a6b5] tabular-nums w-[54px]">${fmtG(m.precio)}/g</span>
              <span className="text-[#5c5c6b]">necesitás</span>
              <span className="text-[#d9f99d] font-semibold tabular-nums">{fmtG(m.gramos)}g</span>
              <span className="text-[#5c5c6b]">por ciclo</span>
            </div>
          ))}
        </div>
      </div>

      {hay && plantasActivas > 0 && proyectado > 0 && (
        <div className="mt-4 pt-3 border-t border-[#243018] text-[11px] text-[#8a8a9a] leading-relaxed">
          Tenés <b className="text-[#d4d4dd]">{plantasActivas} plantas activas</b>. Si rinden como las ya cosechadas
          (<b className="text-[#d4d4dd]">{fmtG(rindePromedio)}g</b> promedio), el ciclo daría
          ~<b className="text-[#bef264]">{fmtG(proyectado)}g</b> y el costo bajaría a
          ~<b className="text-[#bef264]">{fmt(eco.totalCiclo / proyectado)}/g</b>.
        </div>
      )}
    </div>
  )
}

// --- A dónde va cada peso ----------------------------------------------------

export function ComposicionCosto({ eco, mesesCiclo }: { eco: ResumenEconomico; mesesCiclo: number }) {
  const partes = [
    { label: 'Gastos fijos', valor: eco.fijosMes, color: '#fbbf24', detalle: 'alquiler, luz, internet' },
    { label: 'Amortización equipo', valor: eco.amortizacionMes, color: '#a78bfa', detalle: 'lo invertido, repartido en su vida útil' },
    { label: 'Consumibles', valor: eco.consumiblesMes, color: '#34d399', detalle: 'fertilizantes, sustrato, semillas' },
    { label: 'Variables', valor: eco.variablesMes, color: '#ff8a7a', detalle: 'agua, recargas de CO₂' },
  ].filter(p => p.valor > 0).sort((a, b) => b.valor - a.valor)

  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (total <= 0) return null

  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">A dónde va cada peso</h3>
        <span className="text-[11.5px] text-[#a6a6b5] tabular-nums">{fmt(total)}/mes · {fmt(total * mesesCiclo)} por ciclo</span>
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-[#15151d] mb-3">
        {partes.map(p => (
          <div key={p.label} style={{ width: `${(p.valor / total) * 100}%`, background: p.color }} title={`${p.label}: ${fmt(p.valor)}`} />
        ))}
      </div>

      <div className="space-y-1.5">
        {partes.map(p => (
          <div key={p.label} className="flex items-center gap-2.5 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="text-[#d4d4dd] font-medium">{p.label}</span>
            <span className="text-[10.5px] text-[#5c5c6b] hidden md:inline">{p.detalle}</span>
            <span className="flex-1" />
            <span className="text-[#a6a6b5] tabular-nums">{fmt(p.valor)}</span>
            <span className="text-[#5c5c6b] tabular-nums w-10 text-right">{((p.valor / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Equipo instalado, repartido en su vida útil -----------------------------

export function TablaAmortizacion({ eco, vida }: { eco: ResumenEconomico; vida: VidaUtil }) {
  if (!eco.lineas.length) return null
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1f1f2b]">
        <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Equipo instalado, repartido en su vida útil</h3>
        <div className="text-[10.5px] text-[#5c5c6b] mt-0.5">
          Lo que ya compraste no se cuenta de golpe: pesa mes a mes mientras dure.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[440px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-[#5c5c6b] border-b border-[#1f1f2b]">
              <th className="text-left font-medium px-4 py-2">Categoría</th>
              <th className="text-right font-medium px-3 py-2">Invertido</th>
              <th className="text-right font-medium px-3 py-2">Vida útil</th>
              <th className="text-right font-medium px-4 py-2">Por mes</th>
            </tr>
          </thead>
          <tbody>
            {eco.lineas.map(l => (
              <tr key={l.categoria} className="border-b border-[#16161e] last:border-0">
                <td className="px-4 py-2 text-[#d4d4dd]">
                  {l.categoria}
                  <span className="text-[10px] text-[#5c5c6b] ml-1.5">{l.items} ítem{l.items === 1 ? '' : 's'}</span>
                </td>
                <td className="px-3 py-2 text-right text-[#a6a6b5] tabular-nums">{fmt(l.valor)}</td>
                <td className="px-3 py-2 text-right text-[#5c5c6b] tabular-nums">{vida[l.categoria] ?? l.meses}m</td>
                <td className="px-4 py-2 text-right text-[#c4b5fd] font-medium tabular-nums">{fmt(l.porMes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#0d0d13]">
              <td className="px-4 py-2 text-[#a6a6b5] font-medium">Total</td>
              <td className="px-3 py-2 text-right text-[#ececf1] font-semibold tabular-nums">{fmt(eco.capexInvertido)}</td>
              <td />
              <td className="px-4 py-2 text-right text-[#c4b5fd] font-semibold tabular-nums">{fmt(eco.amortizacionMes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
