// Tablero eléctrico — documentación de tableros del cultivo + guía de armado + unifilar.
// Datos en Supabase (tableros / tableros_circuitos). Cálculos orientativos (ver lib/tableros).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Zap, Plus, Trash2, Pencil, X, ShoppingCart, FileText, Cable, AlertTriangle } from 'lucide-react'
import {
  tablerosService, resumenTablero, corrienteNominal, termicaSugerida,
  cableSugerido, necesitaContactor, TIPOS_CIRCUITO, TENSION_LINEA,
  type Tablero, type Circuito, type TipoCircuito,
} from '../lib/tableros'

type Tab = 'doc' | 'unifilar' | 'guia'

const COLOR_TIPO: Record<TipoCircuito, string> = {
  luz: '#a3e635', ac: '#38bdf8', deshumi: '#22d3ee', ventilacion: '#818cf8',
  extraccion: '#c084fc', bomba: '#f59e0b', co2: '#f472b6', osmosis: '#2dd4bf', otro: '#94a3b8',
}
const fmt = (n: number | null | undefined, d = 1) =>
  n == null ? '—' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: d })

export default function PaginaTablero() {
  const [tab, setTab] = useState<Tab>('doc')
  const [tableros, setTableros] = useState<Tablero[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [circuitos, setCircuitos] = useState<Circuito[]>([])
  const [cargando, setCargando] = useState(true)
  const [formTablero, setFormTablero] = useState(false)
  const [editTablero, setEditTablero] = useState<Tablero | null>(null)
  const [formCircuito, setFormCircuito] = useState(false)
  const [editCircuito, setEditCircuito] = useState<Circuito | null>(null)

  const sel = useMemo(() => tableros.find(t => t.id === selId) ?? null, [tableros, selId])
  const resumen = useMemo(() => resumenTablero(circuitos), [circuitos])

  const cargarTableros = useCallback(async () => {
    try {
      const ts = await tablerosService.listar()
      setTableros(ts)
      setSelId(prev => prev && ts.some(t => t.id === prev) ? prev : ts[0]?.id ?? null)
    } catch (e) { toast.error('Error cargando tableros'); console.error(e) }
    finally { setCargando(false) }
  }, [])

  const cargarCircuitos = useCallback(async (tid: string) => {
    try { setCircuitos(await tablerosService.circuitos(tid)) }
    catch (e) { toast.error('Error cargando circuitos'); console.error(e) }
  }, [])

  useEffect(() => { cargarTableros() }, [cargarTableros])
  useEffect(() => { if (selId) cargarCircuitos(selId); else setCircuitos([]) }, [selId, cargarCircuitos])

  async function guardarTablero(t: Partial<Tablero>) {
    try {
      if (editTablero) { await tablerosService.actualizar(editTablero.id, t); toast.success('Tablero actualizado') }
      else { const nuevo = await tablerosService.crear(t); setSelId(nuevo.id); toast.success('Tablero creado') }
      setFormTablero(false); setEditTablero(null); await cargarTableros()
    } catch (e) { toast.error('No se pudo guardar'); console.error(e) }
  }

  async function borrarTablero(id: string) {
    if (!confirm('¿Borrar el tablero y todos sus circuitos?')) return
    try { await tablerosService.borrar(id); toast.success('Tablero borrado'); setSelId(null); await cargarTableros() }
    catch (e) { toast.error('No se pudo borrar'); console.error(e) }
  }

  async function guardarCircuito(c: Partial<Circuito>) {
    if (!selId) return
    try {
      if (editCircuito) { await tablerosService.actualizarCircuito(editCircuito.id, c); toast.success('Circuito actualizado') }
      else { await tablerosService.crearCircuito({ ...c, tablero_id: selId, orden: circuitos.length }); toast.success('Circuito agregado') }
      setFormCircuito(false); setEditCircuito(null); await cargarCircuitos(selId)
    } catch (e) { toast.error('No se pudo guardar'); console.error(e) }
  }

  async function borrarCircuito(id: string) {
    if (!selId || !confirm('¿Borrar este circuito?')) return
    try { await tablerosService.borrarCircuito(id); toast.success('Circuito borrado'); await cargarCircuitos(selId) }
    catch (e) { toast.error('No se pudo borrar'); console.error(e) }
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 max-w-[1200px] mx-auto w-full">
          <Zap className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Tablero eléctrico</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Documentación de tableros del cultivo<span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>cargas · protecciones · contactores · unifilar</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-3 sm:px-6 max-w-[1200px] mx-auto w-full">
          {([['doc', 'Documentación', FileText], ['unifilar', 'Unifilar', Cable], ['guia', 'Guía & compras', ShoppingCart]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors ${tab === id ? 'border-[#a3e635] text-[#ececf1]' : 'border-transparent text-[#6b6b7b] hover:text-[#9a9aad]'}`}>
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 max-w-[1200px] mx-auto w-full">
        {tab === 'doc' && (
          <DocTab {...{ cargando, tableros, sel, selId, setSelId, circuitos, resumen,
            onNuevoTablero: () => { setEditTablero(null); setFormTablero(true) },
            onEditTablero: (t: Tablero) => { setEditTablero(t); setFormTablero(true) },
            onBorrarTablero: borrarTablero,
            onNuevoCircuito: () => { setEditCircuito(null); setFormCircuito(true) },
            onEditCircuito: (c: Circuito) => { setEditCircuito(c); setFormCircuito(true) },
            onBorrarCircuito: borrarCircuito }} />
        )}
        {tab === 'unifilar' && <UnifilarTab sel={sel} circuitos={circuitos} resumen={resumen} />}
        {tab === 'guia' && <GuiaTab />}
      </div>

      {formTablero && <ModalTablero tablero={editTablero} onGuardar={guardarTablero} onCerrar={() => { setFormTablero(false); setEditTablero(null) }} />}
      {formCircuito && <ModalCircuito circuito={editCircuito} onGuardar={guardarCircuito} onCerrar={() => { setFormCircuito(false); setEditCircuito(null) }} />}
    </div>
  )
}

// --- Documentación -----------------------------------------------------------

function DocTab(p: any) {
  const { cargando, tableros, sel, selId, setSelId, circuitos, resumen,
    onNuevoTablero, onEditTablero, onBorrarTablero, onNuevoCircuito, onEditCircuito, onBorrarCircuito } = p

  if (cargando) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#101016] border border-[#1f1f2b] rounded-xl animate-pulse" />)}</div>

  if (!tableros.length) return (
    <div className="text-center py-16">
      <Zap className="w-10 h-10 text-[#30303e] mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-[13px] text-[#6b6b7b] mb-4">No hay tableros cargados todavía.</p>
      <button onClick={onNuevoTablero} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#a3e635] text-[#0a0a0f] rounded-lg text-[12px] font-semibold hover:bg-[#bef264]">
        <Plus className="w-4 h-4" />Crear primer tablero
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* selector de tableros */}
      <div className="flex flex-wrap items-center gap-2">
        {tableros.map((t: Tablero) => (
          <button key={t.id} onClick={() => setSelId(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${selId === t.id ? 'bg-[#a3e635]/10 border-[#a3e635]/40 text-[#ececf1]' : 'bg-[#101016] border-[#1f1f2b] text-[#8a8a9a] hover:border-[#2f2f3d]'}`}>
            {t.nombre}
          </button>
        ))}
        <button onClick={onNuevoTablero} className="px-2.5 py-1.5 rounded-lg text-[12px] border border-dashed border-[#2f2f3d] text-[#6b6b7b] hover:text-[#a3e635] hover:border-[#a3e635]/40">
          <Plus className="w-3.5 h-3.5 inline" /> Tablero
        </button>
      </div>

      {sel && (
        <>
          {/* cabecera + resumen */}
          <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#ececf1]">{sel.nombre}</h2>
                <div className="mt-1 text-[11.5px] text-[#6b6b7b] flex flex-wrap gap-x-3 gap-y-0.5">
                  {sel.ubicacion && <span>📍 {sel.ubicacion}</span>}
                  <span>{sel.tension === 'tri' ? 'Trifásico' : 'Monofásico'} {TENSION_LINEA}V</span>
                  {sel.acometida_a != null && <span>Acometida {fmt(sel.acometida_a, 0)}A</span>}
                </div>
                {sel.proteccion_general && <div className="mt-1 text-[11px] text-[#8a8a9a]">General: {sel.proteccion_general}</div>}
                {sel.notas && <div className="mt-1 text-[11px] text-[#6b6b7b] italic">{sel.notas}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEditTablero(sel)} className="p-1.5 text-[#6b6b7b] hover:text-[#a3e635]"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onBorrarTablero(sel.id)} className="p-1.5 text-[#6b6b7b] hover:text-[#ef4444]"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Potencia total" valor={`${fmt(resumen.potenciaTotalW / 1000, 2)} kW`} />
              <Stat label="Corriente total" valor={`${fmt(resumen.corrienteTotalA, 0)} A`} />
              <Stat label="Térmica gral. sug." valor={resumen.acometidaSugeridaA ? `${resumen.acometidaSugeridaA} A` : '—'} />
            </div>
            {resumen.corrienteTotalA > 32 && (
              <div className="mt-2 flex items-start gap-1.5 text-[10.5px] text-[#f59e0b] bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                <span>{fmt(resumen.corrienteTotalA, 0)}A supera lo habitual para una acometida monofásica. Considerá trifásica y validá el proyecto con un matriculado.</span>
              </div>
            )}
          </div>

          {/* circuitos */}
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-[#8a8a9a] uppercase tracking-wide">Circuitos ({circuitos.length})</h3>
            <button onClick={onNuevoCircuito} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#a3e635] text-[#0a0a0f] rounded-lg text-[11.5px] font-semibold hover:bg-[#bef264]">
              <Plus className="w-3.5 h-3.5" />Circuito
            </button>
          </div>

          {!circuitos.length ? (
            <p className="text-[12px] text-[#6b6b7b] text-center py-6">Sin circuitos. Agregá las cargas del tablero.</p>
          ) : (
            <div className="space-y-2">
              {circuitos.map((c: Circuito) => {
                const inom = corrienteNominal(c)
                const termSug = termicaSugerida(inom)
                const cabSug = cableSugerido(inom)
                const contactor = necesitaContactor({ tipo: c.tipo, contactor: c.contactor, inom })
                const info = TIPOS_CIRCUITO.find(t => t.valor === c.tipo)
                return (
                  <div key={c.id} className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLOR_TIPO[c.tipo] }} />
                          <span className="text-[13px] font-medium text-[#ececf1] truncate">{c.nombre}</span>
                          <span className="text-[10px] text-[#6b6b7b] px-1.5 py-0.5 bg-[#181820] rounded">{info?.label}</span>
                          {c.sala && <span className="text-[10px] text-[#6b6b7b]">· {c.sala}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#8a8a9a]">
                          {c.potencia_w != null && <span>{fmt(c.potencia_w, 0)} W</span>}
                          <span>I ≈ {fmt(inom)} A</span>
                          <span>Térmica: <b className="text-[#d4d4dd]">{c.proteccion || (termSug ? `${termSug}A (sug.)` : '—')}</b></span>
                          <span>Cable: <b className="text-[#d4d4dd]">{c.seccion_cable_mm2 ? `${c.seccion_cable_mm2}mm²` : (cabSug ? `${cabSug}mm² (sug.)` : '—')}</b></span>
                        </div>
                        {(c.contactor || contactor) && (
                          <div className="mt-1 text-[10.5px] text-[#6b6b7b]">
                            Contactor: <span className="text-[#9a9aad]">{c.contactor || (contactor ? 'requiere (carga inductiva)' : '—')}</span>
                          </div>
                        )}
                        {c.notas && <div className="mt-1 text-[10.5px] text-[#6b6b7b] italic">{c.notas}</div>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => onEditCircuito(c)} className="p-1.5 text-[#6b6b7b] hover:text-[#a3e635]"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onBorrarCircuito(c.id)} className="p-1.5 text-[#6b6b7b] hover:text-[#ef4444]"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-[#0d0d13] border border-[#1a1a24] rounded-lg px-2.5 py-2">
      <div className="text-[9.5px] text-[#5c5c6b] uppercase tracking-wide">{label}</div>
      <div className="text-[15px] font-semibold text-[#ececf1] mt-0.5">{valor}</div>
    </div>
  )
}

// --- Unifilar (SVG generado) -------------------------------------------------

function UnifilarTab({ sel, circuitos, resumen }: { sel: Tablero | null; circuitos: Circuito[]; resumen: any }) {
  if (!sel) return <p className="text-[12px] text-[#6b6b7b] text-center py-16">Seleccioná un tablero en la pestaña Documentación.</p>
  if (!circuitos.length) return <p className="text-[12px] text-[#6b6b7b] text-center py-16">Este tablero no tiene circuitos para diagramar.</p>

  const rowH = 62, top = 120, busX = 130, w = 900
  const h = top + circuitos.length * rowH + 30

  return (
    <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-3 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[720px] w-full" style={{ fontFamily: 'ui-monospace, monospace' }}>
        {/* acometida */}
        <text x={busX} y={26} fill="#ececf1" fontSize="14" fontWeight="700">{sel.nombre}</text>
        <text x={busX} y={44} fill="#6b6b7b" fontSize="11">{sel.tension === 'tri' ? 'Trifásico' : 'Monofásico'} {TENSION_LINEA}V · {fmt(resumen.potenciaTotalW / 1000, 1)}kW · {fmt(resumen.corrienteTotalA, 0)}A</text>
        {/* general */}
        <rect x={busX - 30} y={58} width={60} height={26} rx={4} fill="#181820" stroke="#a3e635" strokeWidth="1.2" />
        <text x={busX} y={75} fill="#a3e635" fontSize="10" textAnchor="middle">GRAL {resumen.acometidaSugeridaA ?? ''}A</text>
        {/* barra vertical */}
        <line x1={busX} y1={84} x2={busX} y2={top + circuitos.length * rowH - rowH / 2} stroke="#3a3a48" strokeWidth="2" />

        {circuitos.map((c, i) => {
          const y = top + i * rowH
          const inom = corrienteNominal(c)
          const term = c.proteccion || (termicaSugerida(inom) ? `${termicaSugerida(inom)}A` : '—')
          const cab = c.seccion_cable_mm2 ? `${c.seccion_cable_mm2}mm²` : (cableSugerido(inom) ? `${cableSugerido(inom)}mm²` : '')
          const contactor = necesitaContactor({ tipo: c.tipo, contactor: c.contactor, inom })
          const col = COLOR_TIPO[c.tipo]
          return (
            <g key={c.id}>
              <line x1={busX} y1={y} x2={busX + 40} y2={y} stroke="#3a3a48" strokeWidth="1.5" />
              {/* térmica */}
              <rect x={busX + 40} y={y - 12} width={54} height={24} rx={3} fill="#181820" stroke={col} strokeWidth="1" />
              <text x={busX + 67} y={y + 4} fill={col} fontSize="10" textAnchor="middle">{term}</text>
              {/* contactor opcional */}
              {contactor && <>
                <line x1={busX + 94} y1={y} x2={busX + 120} y2={y} stroke="#3a3a48" strokeWidth="1.5" />
                <rect x={busX + 120} y={y - 12} width={40} height={24} rx={3} fill="#181820" stroke="#f59e0b" strokeWidth="1" />
                <text x={busX + 140} y={y + 4} fill="#f59e0b" fontSize="9" textAnchor="middle">KM</text>
              </>}
              {/* línea a carga */}
              <line x1={busX + (contactor ? 160 : 94)} y1={y} x2={busX + 230} y2={y} stroke="#3a3a48" strokeWidth="1.5" />
              <circle cx={busX + 230} cy={y} r={5} fill="none" stroke={col} strokeWidth="1.5" />
              {/* etiqueta carga */}
              <text x={busX + 246} y={y - 2} fill="#ececf1" fontSize="12">{c.nombre}</text>
              <text x={busX + 246} y={y + 12} fill="#6b6b7b" fontSize="9.5">
                {c.potencia_w != null ? `${fmt(c.potencia_w, 0)}W · ` : ''}I≈{fmt(inom)}A{cab ? ` · ${cab}` : ''}{c.sala ? ` · ${c.sala}` : ''}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-[10px] text-[#5c5c6b] mt-2 px-1">
        KM = contactor. Valores "sug." son orientativos (AEA 90364 simplificada). El dimensionamiento final lo valida un matriculado.
      </p>
    </div>
  )
}

// --- Guía & compras (contenido estático) -------------------------------------

function GuiaTab() {
  return (
    <div className="space-y-4 max-w-[760px]">
      <Aviso />
      <Bloque titulo="Qué va en un tablero, en orden">
        <ol className="list-decimal pl-5 space-y-1.5 text-[12px] text-[#b4b4c0]">
          <li><b className="text-[#ececf1]">Termomagnética general</b> — corta todo el tablero. Dimensionada a la suma de cargas.</li>
          <li><b className="text-[#ececf1]">Disyuntor diferencial (30 mA)</b> — protección de personas. Obligatorio.</li>
          <li><b className="text-[#ececf1]">Una térmica por circuito</b> — protege el cable de cada línea.</li>
          <li><b className="text-[#ececf1]">Contactor</b> — para cargas inductivas (motores, bombas, AC) que se prenden/apagan automático o con arranque alto.</li>
          <li><b className="text-[#ececf1]">Guardamotor</b> — en bombas y motores, protege por sobrecarga y marcha trabada.</li>
          <li><b className="text-[#ececf1]">Bornera + puesta a tierra</b> — el verde/amarillo nunca se interrumpe.</li>
        </ol>
      </Bloque>

      <Bloque titulo="Tablero de la bomba de ósmosis (diseño cerrado)">
        <p className="text-[12px] text-[#b4b4c0] mb-2">Bomba booster 0,5 HP + ósmosis, arrancan juntas por nivel del tanque de 300 L.</p>
        <ul className="space-y-1 text-[12px] text-[#b4b4c0]">
          <li>• <b className="text-[#ececf1]">Sensor TLC2206</b> ultrasónico WiFi (Tuya/Smart Life) — mide el nivel.</li>
          <li>• <b className="text-[#ececf1]">Gralf GF-32-SMART</b> — interruptor WiFi riel DIN 32A con medición. Va con Smart Life, mismo ecosistema que el sensor.</li>
          <li>• <b className="text-[#ececf1]">Caja estanca + riel DIN + ficha + 2 tomas</b> — bomba y ósmosis a las tomas.</li>
          <li>• <b className="text-[#ececf1]">Caño PVC 110 mm</b> — tubo tranquilizador dentro del tanque (clave en 300 L).</li>
        </ul>
        <div className="mt-3 bg-[#0d0d13] border border-[#1a1a24] rounded-lg p-3 text-[11px] text-[#8a8a9a] font-mono leading-relaxed">
          Sensor TLC2206 ─(Smart Life)─► GF-32-SMART ─┬─ BOMBA 0,5 HP<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ ÓSMOSIS<br />
          Automatización: nivel &lt;30% → ON · nivel &gt;90% → OFF
        </div>
        <p className="mt-2 text-[11px] text-[#6b6b7b]">Con 32A el interruptor maneja la bomba directo (no hace falta contactor). El botón manual del Gralf sirve si se cae el WiFi.</p>
      </Bloque>

      <Bloque titulo="Software para diseñar el tablero (gratis)">
        <ul className="space-y-1.5 text-[12px] text-[#b4b4c0]">
          <li>• <b className="text-[#ececf1]">CADe SIMU</b> — armás y <i>simulás</i> la lógica de contactores. El mejor para empezar.</li>
          <li>• <b className="text-[#ececf1]">SIMARIS Design / ABB DOC</b> — dimensiona protecciones, cables y selectividad.</li>
          <li>• <b className="text-[#ececf1]">QElectroTech</b> — el plano definitivo (open source, no ata a marca).</li>
        </ul>
        <p className="mt-2 text-[11px] text-[#6b6b7b]">No se integran por archivo: los datos pasan a mano. Flujo: dimensionar → simular → dibujar.</p>
      </Bloque>
    </div>
  )
}

function Aviso() {
  return (
    <div className="flex items-start gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-xl px-3 py-2.5">
      <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
      <p className="text-[11.5px] text-[#c9a355] leading-relaxed">
        Los cálculos de esta sección son <b>orientativos</b> (AEA 90364 simplificada). A partir de ~7 kW / 32 A, y en toda instalación fija,
        el proyecto debe diseñarlo y firmarlo un <b>electricista matriculado</b>. Un error de dimensionamiento no es que no funcione: es incendio.
      </p>
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
      <h3 className="text-[13px] font-semibold text-[#ececf1] mb-2.5">{titulo}</h3>
      {children}
    </div>
  )
}

// --- Modales -----------------------------------------------------------------

function ModalBase({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#101016] border border-[#1f1f2b] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#101016] border-b border-[#1f1f2b] px-4 py-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#ececf1]">{titulo}</h3>
          <button onClick={onCerrar} className="p-1 text-[#6b6b7b] hover:text-[#ececf1]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full bg-[#0d0d13] border border-[#1f1f2b] rounded-lg px-3 py-2 text-[13px] text-[#ececf1] focus:border-[#a3e635]/50 focus:outline-none"
const labelCls = "block text-[11px] text-[#8a8a9a] mb-1"

function ModalTablero({ tablero, onGuardar, onCerrar }: { tablero: Tablero | null; onGuardar: (t: Partial<Tablero>) => void; onCerrar: () => void }) {
  const [f, setF] = useState<Partial<Tablero>>(tablero ?? { nombre: '', tension: 'mono' })
  return (
    <ModalBase titulo={tablero ? 'Editar tablero' : 'Nuevo tablero'} onCerrar={onCerrar}>
      <div><label className={labelCls}>Nombre *</label><input className={inputCls} value={f.nombre ?? ''} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Tablero cultivo Sala 1" /></div>
      <div><label className={labelCls}>Ubicación</label><input className={inputCls} value={f.ubicacion ?? ''} onChange={e => setF({ ...f, ubicacion: e.target.value })} placeholder="Sala 1 / tablero general" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Tensión</label>
          <select className={inputCls} value={f.tension} onChange={e => setF({ ...f, tension: e.target.value as 'mono' | 'tri' })}>
            <option value="mono">Monofásico</option><option value="tri">Trifásico</option>
          </select>
        </div>
        <div><label className={labelCls}>Acometida (A)</label><input type="number" className={inputCls} value={f.acometida_a ?? ''} onChange={e => setF({ ...f, acometida_a: e.target.value ? Number(e.target.value) : null })} /></div>
      </div>
      <div><label className={labelCls}>Protección general</label><input className={inputCls} value={f.proteccion_general ?? ''} onChange={e => setF({ ...f, proteccion_general: e.target.value })} placeholder="Termo 2x63A + Diferencial 30mA" /></div>
      <div><label className={labelCls}>Notas</label><textarea className={inputCls} rows={2} value={f.notas ?? ''} onChange={e => setF({ ...f, notas: e.target.value })} /></div>
      <button onClick={() => f.nombre?.trim() ? onGuardar(f) : toast.error('El nombre es obligatorio')} className="w-full py-2.5 bg-[#a3e635] text-[#0a0a0f] rounded-lg text-[13px] font-semibold hover:bg-[#bef264]">Guardar</button>
    </ModalBase>
  )
}

function ModalCircuito({ circuito, onGuardar, onCerrar }: { circuito: Circuito | null; onGuardar: (c: Partial<Circuito>) => void; onCerrar: () => void }) {
  const [f, setF] = useState<Partial<Circuito>>(circuito ?? { nombre: '', tipo: 'otro' })
  const inom = corrienteNominal({ corriente_a: f.corriente_a ?? null, potencia_w: f.potencia_w ?? null })
  return (
    <ModalBase titulo={circuito ? 'Editar circuito' : 'Nuevo circuito'} onCerrar={onCerrar}>
      <div><label className={labelCls}>Carga *</label><input className={inputCls} value={f.nombre ?? ''} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="12 luces LED" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Tipo</label>
          <select className={inputCls} value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value as TipoCircuito })}>
            {TIPOS_CIRCUITO.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Sala</label><input className={inputCls} value={f.sala ?? ''} onChange={e => setF({ ...f, sala: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Potencia (W)</label><input type="number" className={inputCls} value={f.potencia_w ?? ''} onChange={e => setF({ ...f, potencia_w: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><label className={labelCls}>Corriente (A)</label><input type="number" className={inputCls} value={f.corriente_a ?? ''} onChange={e => setF({ ...f, corriente_a: e.target.value ? Number(e.target.value) : null })} placeholder={inom ? `≈ ${inom.toFixed(1)}` : ''} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Térmica</label><input className={inputCls} value={f.proteccion ?? ''} onChange={e => setF({ ...f, proteccion: e.target.value })} placeholder={termicaSugerida(inom) ? `sug. ${termicaSugerida(inom)}A` : '2x16A'} /></div>
        <div><label className={labelCls}>Cable (mm²)</label><input type="number" className={inputCls} value={f.seccion_cable_mm2 ?? ''} onChange={e => setF({ ...f, seccion_cable_mm2: e.target.value ? Number(e.target.value) : null })} placeholder={cableSugerido(inom) ? `sug. ${cableSugerido(inom)}` : ''} /></div>
      </div>
      <div><label className={labelCls}>Contactor</label><input className={inputCls} value={f.contactor ?? ''} onChange={e => setF({ ...f, contactor: e.target.value })} placeholder="Chint NC1-0910 bobina 220V" /></div>
      <div><label className={labelCls}>Notas</label><textarea className={inputCls} rows={2} value={f.notas ?? ''} onChange={e => setF({ ...f, notas: e.target.value })} /></div>
      <button onClick={() => f.nombre?.trim() ? onGuardar(f) : toast.error('La carga es obligatoria')} className="w-full py-2.5 bg-[#a3e635] text-[#0a0a0f] rounded-lg text-[13px] font-semibold hover:bg-[#bef264]">Guardar</button>
    </ModalBase>
  )
}
