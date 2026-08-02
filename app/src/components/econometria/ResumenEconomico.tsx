// Resumen económico: el costo por gramo y la trazabilidad completa de cada peso.
// El modelo vive en lib/econometria (resumenEconomico): equipo del Stock
// amortizado por su vida útil + gastos fijos + variables + consumibles.
//
// Mobile-first: en celular cada bloque es una tarjeta apilada y las tablas se
// vuelven listas; en desktop se usan tablas. Los desgloses arrancan cerrados
// para que la pantalla chica no quede infinita.

import { useState } from 'react'
import { ChevronDown, Landmark, Wrench, FlaskConical, Droplets, Info } from 'lucide-react'
import {
  gramosParaCosto, mensualEquivalente, labelPeriodicidad,
  type ResumenEconomico, type VidaUtil, type ItemAmortizado,
} from '../../lib/econometria'

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fmtG = (n: number) => Math.round(n).toLocaleString('es-AR')
const pct = (parte: number, total: number) => total > 0 ? (parte / total) * 100 : 0

// ---------------------------------------------------------------------------
// 1. El número que importa
// ---------------------------------------------------------------------------

export function CostoPorGramo({ eco, nCosechas, plantasActivas, plantasEnFlora, mesesCiclo }: {
  eco: ResumenEconomico; nCosechas: number; plantasActivas: number
  plantasEnFlora: number; mesesCiclo: number
}) {
  const hay = eco.gramos > 0
  const metas = [1000, 2000, 3000].map(p => ({ precio: p, gramos: gramosParaCosto(eco.totalCiclo, p) }))
  const rinde = nCosechas > 0 ? eco.gramos / nCosechas : 0
  // Proyección = lo YA cosechado + lo que falta cortar. Antes era rinde × plantas
  // activas, con dos errores: no sumaba lo cosechado, y contaba como si fueran a
  // dar todas las activas, incluidas las que están en vegetativo y son del ciclo
  // siguiente. Con 12 autos en flora y 20 fem vegetando, proyectaba 32.
  const porCortar = rinde * plantasEnFlora
  const proyectado = eco.gramos + porCortar
  const costoProyectado = proyectado > 0 ? eco.totalCiclo / proyectado : null
  const enVegetativo = Math.max(0, plantasActivas - plantasEnFlora)

  return (
    <section className="rounded-xl bg-gradient-to-br from-[#12160f] to-[#101016] border border-[#2c3a1a] p-4 sm:p-5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#7c8b5c] font-medium">Costo por gramo</div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display font-bold text-[38px] sm:text-[46px] leading-none text-[#bef264] tabular-nums">
          {hay ? fmt(eco.costoPorGramo ?? 0) : '—'}
        </span>
        {hay && <span className="text-[15px] text-[#7c8b5c] font-medium">/g</span>}
      </div>

      <p className="mt-2 text-[11.5px] sm:text-[12px] text-[#8a8a9a] leading-relaxed">
        {hay ? (
          <>
            <b className="text-[#d4d4dd]">{fmt(eco.totalCiclo)}</b> que cuesta el ciclo de {mesesCiclo} meses,
            dividido <b className="text-[#d4d4dd]">{fmtG(eco.gramos)}g</b> secos cosechados
            {nCosechas > 0 && <> en {nCosechas} cosecha{nCosechas === 1 ? '' : 's'}</>}.
          </>
        ) : (
          <>Cargá cosechas con peso seco para que se calcule. El ciclo de {mesesCiclo} meses
            cuesta <b className="text-[#d4d4dd]">{fmt(eco.totalCiclo)}</b>.</>
        )}
      </p>

      {/* Proyección: el número que sirve para decidir */}
      {hay && plantasEnFlora > 0 && costoProyectado != null && (
        <div className="mt-3.5 rounded-lg bg-[#0d120a]/70 border border-[#243018] p-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#7c8b5c] font-medium mb-1.5">
            Proyección del ciclo en curso
          </div>
          <p className="text-[11.5px] text-[#8a8a9a] leading-relaxed">
            Ya cortaste <b className="text-[#d4d4dd]">{fmtG(eco.gramos)}g</b> y te quedan{' '}
            <b className="text-[#d4d4dd]">{plantasEnFlora} planta{plantasEnFlora === 1 ? '' : 's'} en floración</b>.
            Si rinden como las ya cosechadas (<b className="text-[#d4d4dd]">{fmtG(rinde)}g</b> promedio),
            el ciclo cierra en ~<b className="text-[#bef264]">{fmtG(proyectado)}g</b> y el costo baja a
            ~<b className="text-[#bef264] text-[13px]">{fmt(costoProyectado)}/g</b>.
          </p>
          {enVegetativo > 0 && (
            <p className="text-[11px] text-[#7c8b5c] mt-1.5 leading-relaxed">
              No se cuentan {enVegetativo} planta{enVegetativo === 1 ? '' : 's'} en vegetativo: son del ciclo que viene.
            </p>
          )}
        </div>
      )}

      {/* Cuánto hay que producir para cada precio objetivo */}
      <div className="mt-3.5">
        <div className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium mb-2">
          Para que te salga…
        </div>
        <div className="grid grid-cols-3 gap-2">
          {metas.map(m => (
            <div key={m.precio} className="rounded-lg bg-[#0d0d13] border border-[#1f1f2b] px-2 py-2 text-center">
              <div className="text-[11px] text-[#a6a6b5] tabular-nums">${fmtG(m.precio)}/g</div>
              <div className="text-[15px] font-semibold text-[#d9f99d] tabular-nums leading-tight mt-0.5">
                {fmtG(m.gramos)}g
              </div>
              <div className="text-[9.5px] text-[#5c5c6b] mt-0.5">por ciclo</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 2. Composición: a dónde va cada peso
// ---------------------------------------------------------------------------

export function ComposicionCosto({ eco }: { eco: ResumenEconomico }) {
  const partes = [
    { label: 'Gastos fijos', valor: eco.fijosMes, color: '#fbbf24' },
    { label: 'Amortización', valor: eco.amortizacionMes, color: '#a78bfa' },
    { label: 'Consumibles', valor: eco.consumiblesMes, color: '#34d399' },
    { label: 'Variables', valor: eco.variablesMes, color: '#ff8a7a' },
  ].filter(p => p.valor > 0).sort((a, b) => b.valor - a.valor)

  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (total <= 0) return null

  return (
    <section className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-3">
        <h2 className="font-display font-semibold text-[13px] text-[#ececf1]">A dónde va cada peso</h2>
        <span className="text-[11px] text-[#a6a6b5] tabular-nums">
          {fmt(total)}/mes · {fmt(total * eco.mesesCiclo)} por ciclo
        </span>
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-[#15151d] mb-3">
        {partes.map(p => (
          <div key={p.label} style={{ width: `${pct(p.valor, total)}%`, background: p.color }}
            title={`${p.label}: ${fmt(p.valor)}`} />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {partes.map(p => (
          <div key={p.label} className="rounded-lg bg-[#0d0d13] border border-[#1a1a24] px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: p.color }} />
              <span className="text-[10.5px] text-[#8a8a9a] truncate">{p.label}</span>
            </div>
            <div className="mt-1 text-[14px] font-semibold text-[#ececf1] tabular-nums leading-none">
              {fmt(p.valor)}
            </div>
            <div className="text-[10px] text-[#5c5c6b] mt-0.5 tabular-nums">
              {pct(p.valor, total).toFixed(0)}% del total
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 3. Desglose: de dónde sale cada número, hasta el ítem
// ---------------------------------------------------------------------------

/** Bloque plegable. Cerrado por defecto para no llenar la pantalla del celular. */
function Bloque({ titulo, subtitulo, icono: Ico, color, total, sufijo, children, defaultOpen = false }: {
  titulo: string; subtitulo: string; icono: typeof Landmark; color: string
  total: number; sufijo?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [abierto, setAbierto] = useState(defaultOpen)
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <button onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left hover:bg-[#15151d] transition-colors"
        aria-expanded={abierto}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
          <Ico className="w-4 h-4" style={{ color }} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-semibold text-[12.5px] text-[#ececf1] truncate">{titulo}</span>
          <span className="block text-[10.5px] text-[#5c5c6b] truncate">{subtitulo}</span>
        </span>
        <span className="text-right flex-shrink-0">
          <span className="block text-[13.5px] font-semibold text-[#ececf1] tabular-nums leading-none">{fmt(total)}</span>
          <span className="block text-[9.5px] text-[#5c5c6b] mt-0.5">{sufijo ?? '/mes'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[#5c5c6b] flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && <div className="border-t border-[#1f1f2b]">{children}</div>}
    </div>
  )
}

/** Fila de detalle: en celular se apila, en desktop va en línea. */
function Fila({ nombre, nota, valor, porMes, mesesCiclo }: {
  nombre: string; nota?: string; valor?: number; porMes: number; mesesCiclo: number
}) {
  return (
    <div className="px-4 py-2.5 border-b border-[#16161e] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-[#d4d4dd] leading-snug">{nombre}</div>
          {nota && <div className="text-[10px] text-[#5c5c6b] mt-0.5">{nota}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[12px] text-[#ececf1] tabular-nums font-medium">{fmt(porMes)}<span className="text-[9.5px] text-[#5c5c6b]">/mes</span></div>
          <div className="text-[10px] text-[#5c5c6b] tabular-nums mt-0.5">
            {valor != null && valor !== porMes ? <>de {fmt(valor)} · </> : null}
            {fmt(porMes * mesesCiclo)} al ciclo
          </div>
        </div>
      </div>
    </div>
  )
}

function TotalBloque({ label, valor, mesesCiclo }: { label: string; valor: number; mesesCiclo: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0d0d13]">
      <span className="text-[11px] text-[#8a8a9a] font-medium">{label}</span>
      <span className="text-right">
        <span className="block text-[12.5px] font-semibold text-[#ececf1] tabular-nums">{fmt(valor)}/mes</span>
        <span className="block text-[10px] text-[#5c5c6b] tabular-nums">{fmt(valor * mesesCiclo)} al ciclo</span>
      </span>
    </div>
  )
}

export function DesgloseCostos({ eco, vida }: { eco: ResumenEconomico; vida: VidaUtil }) {
  const m = eco.mesesCiclo
  return (
    <section className="space-y-2.5">
      <h2 className="font-display font-semibold text-[13px] text-[#ececf1] px-1">De dónde sale cada peso</h2>

      {/* Gastos fijos */}
      {eco.fijosMes > 0 && (
        <Bloque titulo="Gastos fijos" subtitulo="Se pagan produzcas o no" icono={Landmark}
          color="#fbbf24" total={eco.fijosMes}>
          {eco.costosFijos.map(c => (
            <Fila key={c.id} nombre={c.nombre} mesesCiclo={m}
              nota={[c.categoria, labelPeriodicidad(c.periodicidad), c.notas].filter(Boolean).join(' · ')}
              porMes={mensualEquivalente(c, m)} />
          ))}
          <TotalBloque label="Total fijos" valor={eco.fijosMes} mesesCiclo={m} />
        </Bloque>
      )}

      {/* Amortización, con detalle por ítem */}
      {eco.amortizacionMes > 0 && (
        <Bloque titulo="Amortización del equipo" subtitulo="Lo invertido, repartido en su vida útil"
          icono={Wrench} color="#a78bfa" total={eco.amortizacionMes}>
          <div className="px-4 py-2.5 bg-[#0d0d13] border-b border-[#1f1f2b] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#5c5c6b] flex-shrink-0 mt-px" />
            <p className="text-[10.5px] text-[#7a7a8a] leading-relaxed">
              Lo que ya compraste no se cuenta de golpe: cada equipo aporta una fracción por mes
              mientras dure. Invertido: <b className="text-[#a6a6b5]">{fmt(eco.capexInvertido)}</b>.
            </p>
          </div>
          {eco.lineas.map(l => (
            <CategoriaAmortizada key={l.categoria} linea={l} vida={vida} mesesCiclo={m} />
          ))}
          <TotalBloque label="Total amortización" valor={eco.amortizacionMes} mesesCiclo={m} />
        </Bloque>
      )}

      {/* Consumibles */}
      {eco.consumiblesMes > 0 && (
        <Bloque titulo="Consumibles" subtitulo="Se gastan durante el ciclo" icono={FlaskConical}
          color="#34d399" total={eco.consumiblesMes}>
          <div className="px-4 py-2.5 bg-[#0d0d13] border-b border-[#1f1f2b]">
            <p className="text-[10.5px] text-[#7a7a8a] leading-relaxed">
              Fertilizantes, sustrato, sanidad y semillas del Stock, repartidos en los {m} meses del ciclo.
            </p>
          </div>
          {eco.consumibles.map(i => (
            <Fila key={i.id} nombre={i.nombre} valor={i.valor} porMes={i.porMes} mesesCiclo={m} />
          ))}
          <TotalBloque label="Total consumibles" valor={eco.consumiblesMes} mesesCiclo={m} />
        </Bloque>
      )}

      {/* Variables */}
      {eco.variablesMes > 0 && (
        <Bloque titulo="Costos variables" subtitulo="Cambian según cuánto produzcas" icono={Droplets}
          color="#ff8a7a" total={eco.variablesMes}>
          {eco.costosVariables.map(c => (
            <Fila key={c.id} nombre={c.nombre} mesesCiclo={m}
              nota={[c.categoria, labelPeriodicidad(c.periodicidad), c.notas].filter(Boolean).join(' · ')}
              porMes={mensualEquivalente(c, m)} />
          ))}
          <TotalBloque label="Total variables" valor={eco.variablesMes} mesesCiclo={m} />
        </Bloque>
      )}
    </section>
  )
}

/** Una categoría de equipo, desplegable hasta el ítem individual. */
function CategoriaAmortizada({ linea, vida, mesesCiclo }: {
  linea: ResumenEconomico['lineas'][number]; vida: VidaUtil; mesesCiclo: number
}) {
  const [abierto, setAbierto] = useState(false)
  const meses = vida[linea.categoria] ?? linea.meses
  return (
    <div className="border-b border-[#16161e] last:border-0">
      <button onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 min-h-[48px] text-left hover:bg-[#15151d] transition-colors">
        <ChevronDown className={`w-3.5 h-3.5 text-[#5c5c6b] flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-[#d4d4dd] truncate">{linea.categoria}</span>
          <span className="block text-[10px] text-[#5c5c6b]">
            {fmt(linea.valor)} · {linea.items} ítem{linea.items === 1 ? '' : 's'} · dura {meses} meses
          </span>
        </span>
        <span className="text-right flex-shrink-0">
          <span className="block text-[12px] text-[#c4b5fd] font-medium tabular-nums">{fmt(linea.porMes)}<span className="text-[9.5px] text-[#5c5c6b]">/mes</span></span>
          <span className="block text-[10px] text-[#5c5c6b] tabular-nums mt-0.5">{fmt(linea.porMes * mesesCiclo)} al ciclo</span>
        </span>
      </button>
      {abierto && (
        <div className="bg-[#0b0b10]">
          {linea.detalle.map((i: ItemAmortizado) => (
            <div key={i.id} className="flex items-start justify-between gap-3 pl-11 pr-4 py-2 border-t border-[#141420]">
              <span className="text-[11.5px] text-[#a6a6b5] min-w-0 flex-1 leading-snug">{i.nombre}</span>
              <span className="text-right flex-shrink-0">
                <span className="block text-[11.5px] text-[#c4b5fd] tabular-nums">{fmt(i.porMes)}/mes</span>
                <span className="block text-[9.5px] text-[#5c5c6b] tabular-nums">de {fmt(i.valor)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Indicadores de gestión
// ---------------------------------------------------------------------------

export function Indicadores({ eco, plantasActivas }: { eco: ResumenEconomico; plantasActivas: number }) {
  const porDia = eco.totalMes / 30.44
  const porPlanta = plantasActivas > 0 ? eco.totalCiclo / plantasActivas : null
  const items = [
    { label: 'Por día', valor: fmt(porDia), nota: 'lo que corre el reloj' },
    { label: 'Por planta', valor: porPlanta != null ? fmt(porPlanta) : '—', nota: `${plantasActivas} activas · ciclo completo` },
    { label: 'Por ciclo', valor: fmt(eco.totalCiclo), nota: `${eco.mesesCiclo} meses` },
    { label: 'Invertido en equipo', valor: fmt(eco.capexInvertido), nota: `amortiza ${fmt(eco.amortizacionMes)}/mes` },
  ]
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {items.map(i => (
        <div key={i.label} className="rounded-xl bg-[#101016] border border-[#1f1f2b] px-3 py-2.5">
          <div className="text-[9.5px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium">{i.label}</div>
          <div className="mt-1 text-[16px] sm:text-[17px] font-semibold text-[#ececf1] tabular-nums leading-none">{i.valor}</div>
          <div className="text-[10px] text-[#5c5c6b] mt-1 leading-snug">{i.nota}</div>
        </div>
      ))}
    </section>
  )
}
