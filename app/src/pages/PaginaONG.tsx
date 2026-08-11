// PaginaONG — la capa institucional de la asociación civil.
//
// El resto de la app cubre el cultivo. Esto cubre lo que hace que la ONG pueda
// operar: los plazos que si se vencen te frenan todo trámite, los topes de la
// Resolución 1780 y los requisitos para pedir el botón de REPROCANN.
//
// Los topes NO son un número suelto: se cruzan contra los datos reales de la
// app (pacientes y plantas cargados), que es justo lo que un libro de papel no
// puede hacer.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Building2, Loader2, Plus, X, Pencil, Trash2, CalendarClock, ShieldCheck,
  Gauge, MapPin, Users, AlertTriangle, CheckCircle2, Circle, Save,
} from 'lucide-react'
import {
  ongService, calcularVencimientos, calcularCapacidad, finDeMandato,
  topeTransporteG, TOPE_TRASLADO_INDIVIDUAL_G, CARGOS, ORGANOS,
  type Entidad, type Autoridad, type Requisito, type Predio, type Urgencia,
  type Libro, type Acta, type Asociado, type CategoriaSocio, type Cuota, type Dispensa,
  type CuotaEmitida, periodoActual,
} from '../lib/ong'
import { registroService, type Paciente } from '../lib/registro'
import { cultivoService, type ResumenPlanta } from '../lib/cultivo'
import { Libros, Actas } from '../components/ong/LibrosYActas'
import { Asociados, Coherencia } from '../components/ong/AsociadosYCoherencia'
import { Dispensas } from '../components/ong/Dispensas'
import { CupoReprocann } from '../components/ong/CupoReprocann'
import { econometriaService, configService, resumenEconomico, VIDA_UTIL_DEFECTO, type VidaUtil } from '../lib/econometria'
import { stockService } from '../lib/stock'
import { btnPrimario, btnSutil } from '../lib/ui'

// text-[16px] en mobile: evita el zoom automático de iOS Safari al enfocar.
const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'

const COLOR_URGENCIA: Record<Urgencia, { txt: string; bg: string; borde: string; label: string }> = {
  vencido: { txt: '#ff8a7a', bg: 'rgba(122,40,32,0.18)', borde: '#7a2820', label: 'Vencido' },
  critico: { txt: '#f59e0b', bg: 'rgba(245,158,11,0.12)', borde: '#5a4a20', label: 'Urgente' },
  proximo: { txt: '#38bdf8', bg: 'rgba(56,189,248,0.10)', borde: '#1e3a4a', label: 'Próximo' },
  ok:      { txt: '#bef264', bg: 'rgba(163,230,53,0.12)', borde: '#404d20', label: 'En regla' },
}

const fmtFecha = (f?: string | null) =>
  f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/** Gramos hasta el kilo, después kg: "120 g" se lee mejor que "0,12 kg". */
const fmtPeso = (g: number) => g < 1000
  ? `${g.toLocaleString('es-AR')} g`
  : `${(g / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} kg`

const textoDias = (d: number | null) =>
  d == null ? 'sin fecha cargada' : d < 0 ? `hace ${Math.abs(d)} días` : d === 0 ? 'hoy' : `en ${d} días`

type Tab = 'estado' | 'coherencia' | 'cupo' | 'dispensas' | 'entidad' | 'autoridades' | 'predios' | 'libros' | 'actas' | 'asociados'

export default function PaginaONG() {
  const [tab, setTab] = useState<Tab>('estado')
  const [cargando, setCargando] = useState(true)
  const [entidad, setEntidad] = useState<Entidad | null>(null)
  const [autoridades, setAutoridades] = useState<Autoridad[]>([])
  const [requisitos, setRequisitos] = useState<Requisito[]>([])
  const [predios, setPredios] = useState<Predio[]>([])
  // Datos reales del cultivo, para cruzarlos contra los topes.
  const [nPacientes, setNPacientes] = useState(0)
  const [nPlantas, setNPlantas] = useState(0)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [plantas, setPlantas] = useState<ResumenPlanta[]>([])
  const [libros, setLibros] = useState<Libro[]>([])
  const [actas, setActas] = useState<Acta[]>([])
  const [asociados, setAsociados] = useState<Asociado[]>([])
  const [categorias, setCategorias] = useState<CategoriaSocio[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [dispensas, setDispensas] = useState<Dispensa[]>([])
  const [geneticas, setGeneticas] = useState<Awaited<ReturnType<typeof cultivoService.getGeneticas>>>([])
  // El costo real por gramo sale de Econometria: es contra ese numero que se
  // valida que el aporte del paciente siga siendo un aporte y no una venta.
  const [costoPorGramo, setCostoPorGramo] = useState<number | null>(null)
  // Gramos secos cosechados: el otro extremo del balance de materia.
  const [gramosCosechados, setGramosCosechados] = useState(0)
  const [cuotasEmitidas, setCuotasEmitidas] = useState<CuotaEmitida[]>([])

  const cargar = useCallback(async () => {
    try {
      const [e, a, r, p, pac, pl, li, ac, aso, cat, cuo] = await Promise.all([
        ongService.getEntidad(), ongService.getAutoridades(), ongService.getRequisitos(),
        ongService.getPredios(), registroService.getPacientes(true), cultivoService.getResumenPlantas(true),
        ongService.getLibros(), ongService.getActas(), ongService.getAsociados(),
        ongService.getCategorias(), ongService.getCuotas(),
      ])
      const [disp, gen, cem] = await Promise.all([
        ongService.getDispensas(), cultivoService.getGeneticas(), ongService.getCuotasEmitidas(),
      ])
      setDispensas(disp); setGeneticas(gen); setCuotasEmitidas(cem)
      try {
        const [ins, cos, vida, par, cose] = await Promise.all([
          stockService.getInsumos(), econometriaService.getCostos(),
          configService.get<VidaUtil>('vida_util_meses', VIDA_UTIL_DEFECTO),
          configService.get<{ meses_ciclo: number }>('parametros', { meses_ciclo: 4 }),
          cultivoService.getCosechas(),
        ])
        const gramos = cose.reduce((t, x) => t + (Number(x.peso_seco_g) || 0), 0)
        setGramosCosechados(gramos)
        // A proposito SIN los insumos faltantes: el aporte del paciente se
        // compara contra lo que YA gastaste, no contra lo que pensas gastar.
        const eco = resumenEconomico({ insumos: ins, costos: cos, vida, mesesCiclo: par.meses_ciclo, gramosCosechados: gramos })
        setCostoPorGramo(eco.costoPorGramo)
      } catch { /* si falla econometria, las dispensas igual funcionan */ }
      setEntidad(e); setAutoridades(a); setRequisitos(r); setPredios(p)
      setLibros(li); setActas(ac); setAsociados(aso); setCategorias(cat); setCuotas(cuo)
      setPacientes(pac); setNPacientes(pac.length); setPlantas(pl)
      // El tope de la 1780 es sobre plantas EN FLORACION: las de vegetativo o
      // enraizando no cuentan contra el limite.
      setNPlantas(pl.filter(x => x.fase === 'Floracion').length)
    } catch (err) {
      toast.error(`Error cargando la ONG: ${(err as Error).message}`)
    } finally { setCargando(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const vencimientos = useMemo(() => calcularVencimientos(entidad), [entidad])
  const capacidad = useMemo(
    () => calcularCapacidad(entidad, nPacientes, nPlantas, predios.filter(p => p.activo !== false).length),
    [entidad, nPacientes, nPlantas, predios])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'estado', label: 'Estado' },
    { id: 'coherencia', label: 'Coherencia' },
    { id: 'cupo', label: 'Cupo REPROCANN' },
    { id: 'dispensas', label: 'Dispensas' },
    { id: 'libros', label: 'Libros' },
    { id: 'actas', label: 'Actas' },
    { id: 'asociados', label: 'Asociados' },
    { id: 'entidad', label: 'La entidad' },
    { id: 'autoridades', label: 'Autoridades' },
    { id: 'predios', label: 'Predios' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} /> O.N.G.
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {entidad?.razon_social || 'Asociación civil'} · vida institucional y habilitaciones
            </div>
          </div>
        </div>
        <div className="flex gap-1 items-stretch px-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-[13.5px] font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap ${
                tab === t.id ? 'border-[#a3e635] text-[#d9f99d]' : 'border-transparent text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-20 space-y-4">
        {cargando ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#a3e635]" /></div>
        ) : tab === 'estado' ? (
          <Estado {...{ entidad, vencimientos, capacidad, requisitos, nPacientes, recargar: cargar }} />
        ) : tab === 'coherencia' ? (
          <Coherencia {...{ entidad, actas, libros, asociados, categorias, cuotas,
            pacientes: nPacientes, plantasFloracion: nPlantas, dispensas, costoPorGramo,
            gramosCosechados, cuotasEmitidas, periodo: periodoActual() }} />
        ) : tab === 'cupo' ? (
          <CupoReprocann pacientes={pacientes} plantas={plantas} onCambio={cargar} />
        ) : tab === 'dispensas' ? (
          <Dispensas {...{ dispensas, pacientes, asociados, geneticas, costoPorGramo, gramosCosechados }} onCambio={cargar} />
        ) : tab === 'libros' ? (
          <Libros libros={libros} onCambio={cargar} />
        ) : tab === 'actas' ? (
          <Actas actas={actas} libros={libros} onCambio={cargar} />
        ) : tab === 'asociados' ? (
          <Asociados {...{ asociados, categorias, cuotas, actas, pacientes, cuotasEmitidas }} onCambio={cargar} />
        ) : tab === 'entidad' ? (
          <FormEntidad entidad={entidad} onGuardado={cargar} />
        ) : tab === 'autoridades' ? (
          <Autoridades autoridades={autoridades} entidad={entidad} onCambio={cargar} />
        ) : (
          <Predios predios={predios} entidad={entidad} onCambio={cargar} />
        )}
      </div>
    </div>
  )
}

// ===================== ESTADO =====================

function Estado({ entidad, vencimientos, capacidad, requisitos, nPacientes, recargar }: {
  entidad: Entidad | null
  vencimientos: ReturnType<typeof calcularVencimientos>
  capacidad: ReturnType<typeof calcularCapacidad>
  requisitos: Requisito[]
  nPacientes: number
  recargar: () => void
}) {
  if (!entidad) {
    return (
      <div className={`${card} text-center py-12`}>
        <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
          <Building2 className="w-5 h-5 text-[#5c5c6b]" />
        </div>
        <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Todavía no cargaste la entidad</div>
        <p className="mt-1 text-[11.5px] text-[#5c5c6b] max-w-md mx-auto">
          Cargá los datos del estatuto en la pestaña <b className="text-[#a6a6b5]">La entidad</b> —
          sobre todo el cierre de ejercicio y la duración del mandato— y acá aparecen los vencimientos.
        </p>
      </div>
    )
  }

  const cumplidos = requisitos.filter(r => r.cumplido).length
  const alarmas = vencimientos.filter(v => v.urgencia === 'vencido' || v.urgencia === 'critico')

  return (
    <div className="space-y-4">
      {alarmas.length > 0 && (
        <div className="rounded-xl border p-3 sm:p-4" style={{ background: 'rgba(122,40,32,0.10)', borderColor: '#7a2820' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#ff8a7a]" />
            <h3 className="font-display font-semibold text-[14px] text-[#ff8a7a]">
              {alarmas.length} {alarmas.length === 1 ? 'plazo que necesita atención' : 'plazos que necesitan atención'}
            </h3>
          </div>
          <p className="text-[11.5px] text-[#c4c4d0]">
            Con esto sin resolver, los trámites de la asociación quedan frenados aunque el cultivo esté impecable.
          </p>
        </div>
      )}

      {/* Vencimientos */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Vencimientos institucionales</h3>
        </div>
        <div className="space-y-2">
          {vencimientos.map(v => {
            const c = COLOR_URGENCIA[v.urgencia]
            return (
              <div key={v.clave} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-medium text-[#ececf1]">{v.titulo}</span>
                  <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium border"
                    style={{ color: c.txt, background: c.bg, borderColor: c.borde }}>
                    {v.fecha ? c.label : 'sin cargar'}
                  </span>
                  <span className="ml-auto text-[12.5px] font-mono tabular-nums" style={{ color: c.txt }}>
                    {fmtFecha(v.fecha)} <span className="text-[#5c5c6b]">· {textoDias(v.dias)}</span>
                  </span>
                </div>
                <p className="text-[11.5px] text-[#a6a6b5] mt-1.5">{v.queSignifica}</p>
                <p className="text-[11px] text-[#5c5c6b] mt-0.5">Se resuelve así: {v.comoSeResuelve}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Capacidad */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Capacidad habilitada</h3>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">
          Los topes de la Resolución 1780, cruzados contra lo que tenés cargado de verdad en la app.
        </p>
        <div className="space-y-3">
          {capacidad.map(l => {
            const pct = l.tope > 0 ? Math.min(100, (l.usado / l.tope) * 100) : 0
            const excedido = l.tope > 0 && l.usado > l.tope
            const color = excedido ? '#ff8a7a' : pct > 85 ? '#f59e0b' : '#bef264'
            return (
              <div key={l.titulo}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] text-[#d4d4dd]">{l.titulo}</span>
                  <span className="text-[13px] font-mono tabular-nums font-bold" style={{ color }}>
                    {l.usado} <span className="text-[#5c5c6b]">/ {l.tope}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#1f1f2b] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="text-[10.5px] text-[#5c5c6b] mt-1">{l.detalle}</p>
                {excedido && (
                  <p className="text-[11px] text-[#ff8a7a] mt-0.5">
                    Estás por encima del tope. Revisalo antes de que lo vea un control.
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-[#5c5c6b] mt-3 pt-3 border-t border-[#1f1f2b]">
          Transporte: con {nPacientes} paciente{nPacientes === 1 ? '' : 's'} vinculado{nPacientes === 1 ? '' : 's'} podés
          mover hasta <b className="text-[#a6a6b5] font-mono">{fmtPeso(topeTransporteG(nPacientes))}</b> entre
          tus predios, tomando 40 g por paciente. Aparte de eso, un traslado individual no puede superar
          los <b className="text-[#a6a6b5] font-mono">{TOPE_TRASLADO_INDIVIDUAL_G} g</b> por vez: si la necesidad
          medicinal es mayor, se hace en más de un viaje.
        </p>
      </div>

      {/* Requisitos 1780 */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Requisitos de la Resolución 1780</h3>
          <span className="ml-auto text-[12.5px] font-mono tabular-nums"
            style={{ color: cumplidos === requisitos.length ? '#bef264' : '#f59e0b' }}>
            {cumplidos}/{requisitos.length}
          </span>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">Lo que hay que tener para pedir el botón de REPROCANN.</p>
        <div className="space-y-1.5">
          {requisitos.map(r => (
            <button key={r.clave}
              onClick={async () => {
                try {
                  await ongService.actualizarRequisito(r.clave, { cumplido: !r.cumplido })
                  recargar()
                } catch (e) { toast.error((e as Error).message) }
              }}
              className="w-full text-left rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5 min-h-[44px] hover:border-[#404d20] transition-colors">
              <div className="flex items-start gap-2">
                {r.cumplido
                  ? <CheckCircle2 className="w-4 h-4 text-[#bef264] flex-shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-[#5c5c6b] flex-shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <span className={`text-[13px] ${r.cumplido ? 'text-[#d9f99d]' : 'text-[#d4d4dd]'}`}>{r.titulo}</span>
                  {r.detalle && <p className="text-[11px] text-[#757584] mt-0.5 leading-snug">{r.detalle}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===================== LA ENTIDAD =====================

function FormEntidad({ entidad, onGuardado }: { entidad: Entidad | null; onGuardado: () => void }) {
  const [f, setF] = useState<Partial<Entidad>>(entidad ?? {})
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { setF(entidad ?? {}) }, [entidad])

  const set = (k: keyof Entidad) => (v: string) =>
    setF(p => ({ ...p, [k]: v === '' ? null : v }))
  const setNum = (k: keyof Entidad) => (v: string) =>
    setF(p => ({ ...p, [k]: v === '' ? null : Number(v) }))

  const guardar = async () => {
    setGuardando(true)
    try {
      await ongService.guardarEntidad(f)
      toast.success('Datos de la entidad guardados')
      onGuardado()
    } catch (e) { toast.error((e as Error).message) } finally { setGuardando(false) }
  }

  const fin = finDeMandato(f.mandato_desde, f.mandato_anios)

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1] mb-3">Identificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label><span className={labelCls}>Razón social</span>
            <input className={inputCls} value={f.razon_social ?? ''} onChange={e => set('razon_social')(e.target.value)} placeholder="Asociación Civil ..." /></label>
          <label><span className={labelCls}>CUIT</span>
            <input className={inputCls} value={f.cuit ?? ''} onChange={e => set('cuit')(e.target.value)} placeholder="30-00000000-0" /></label>
          <label><span className={labelCls}>Jurisdicción</span>
            <input className={inputCls} value={f.jurisdiccion ?? ''} onChange={e => set('jurisdiccion')(e.target.value)} placeholder="CABA / Buenos Aires / ..." /></label>
          <label><span className={labelCls}>Organismo de control</span>
            <input className={inputCls} value={f.organismo_control ?? ''} onChange={e => set('organismo_control')(e.target.value)} placeholder="IGJ / DPPJ" /></label>
          <label><span className={labelCls}>Fecha de constitución</span>
            <input type="date" className={inputCls} value={f.fecha_constitucion ?? ''} onChange={e => set('fecha_constitucion')(e.target.value)} /></label>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1] mb-1">Sede social</h3>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">
          Es declarativa, sirve para notificaciones. Puede estar en una jurisdicción distinta a la del cultivo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label><span className={labelCls}>Domicilio</span>
            <input className={inputCls} value={f.sede_domicilio ?? ''} onChange={e => set('sede_domicilio')(e.target.value)} /></label>
          <label><span className={labelCls}>Localidad</span>
            <input className={inputCls} value={f.sede_localidad ?? ''} onChange={e => set('sede_localidad')(e.target.value)} /></label>
          <label><span className={labelCls}>Provincia</span>
            <input className={inputCls} value={f.sede_provincia ?? ''} onChange={e => set('sede_provincia')(e.target.value)} /></label>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1] mb-1">Fechas que fija el estatuto</h3>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">
          De acá salen los vencimientos. El cierre de ejercicio y la duración del mandato están en tu estatuto: no se eligen.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label><span className={labelCls}>Cierre · día</span>
              <input type="number" min={1} max={31} className={inputCls} value={f.cierre_ejercicio_dia ?? ''} onChange={e => setNum('cierre_ejercicio_dia')(e.target.value)} placeholder="30" /></label>
            <label><span className={labelCls}>Cierre · mes</span>
              <input type="number" min={1} max={12} className={inputCls} value={f.cierre_ejercicio_mes ?? ''} onChange={e => setNum('cierre_ejercicio_mes')(e.target.value)} placeholder="6" /></label>
          </div>
          <label><span className={labelCls}>Duración del mandato (años)</span>
            <input type="number" min={1} max={10} className={inputCls} value={f.mandato_anios ?? ''} onChange={e => setNum('mandato_anios')(e.target.value)} placeholder="3" /></label>
          <label><span className={labelCls}>Mandato vigente desde</span>
            <input type="date" className={inputCls} value={f.mandato_desde ?? ''} onChange={e => set('mandato_desde')(e.target.value)} /></label>
          <div className="self-end pb-2 text-[12px] text-[#a6a6b5]">
            {fin ? <>Vence el <b className="text-[#d9f99d] font-mono">{fmtFecha(fin)}</b></> : 'Cargá inicio y duración para ver el vencimiento'}
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1] mb-1">REPROCANN de la entidad</h3>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">
          Dura 1 año. Si no se reinscribe a tiempo no se vence: <b className="text-[#ff8a7a]">se cae</b> y hay que rehacer el trámite.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label><span className={labelCls}>Inscripción</span>
            <input type="date" className={inputCls} value={f.reprocann_inscripcion ?? ''} onChange={e => set('reprocann_inscripcion')(e.target.value)} /></label>
          <label><span className={labelCls}>Vencimiento</span>
            <input type="date" className={inputCls} value={f.reprocann_vencimiento ?? ''} onChange={e => set('reprocann_vencimiento')(e.target.value)} /></label>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1] mb-1">Topes</h3>
        <p className="text-[11.5px] text-[#5c5c6b] mb-3">
          Los de la 1780 vienen por defecto. El de pacientes es ampliable por solicitud, por eso se puede editar.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label><span className={labelCls}>Pacientes</span>
            <input type="number" className={inputCls} value={f.tope_pacientes ?? 150} onChange={e => setNum('tope_pacientes')(e.target.value)} /></label>
          <label><span className={labelCls}>Plantas por paciente</span>
            <input type="number" className={inputCls} value={f.plantas_por_paciente ?? 9} onChange={e => setNum('plantas_por_paciente')(e.target.value)} /></label>
          <label><span className={labelCls}>Predios</span>
            <input type="number" className={inputCls} value={f.tope_predios ?? 3} onChange={e => setNum('tope_predios')(e.target.value)} /></label>
        </div>
      </div>

      <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
        {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Guardar datos de la entidad
      </button>
    </div>
  )
}

// ===================== AUTORIDADES =====================

function Autoridades({ autoridades, entidad, onCambio }: {
  autoridades: Autoridad[]; entidad: Entidad | null; onCambio: () => void
}) {
  const [form, setForm] = useState<Partial<Autoridad> | null>(null)
  const fin = finDeMandato(entidad?.mandato_desde, entidad?.mandato_anios)

  const guardar = async () => {
    if (!form?.nombre || !form?.cargo) { toast.error('Nombre y cargo son obligatorios'); return }
    try { await ongService.guardarAutoridad(form); toast.success('Autoridad guardada'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const borrar = async (a: Autoridad) => {
    if (!window.confirm(`¿Borrar a ${a.nombre} (${a.cargo})?`)) return
    try { await ongService.borrarAutoridad(a.id); toast.success('Borrada'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Autoridades</h3>
          <button onClick={() => setForm({ organo: 'Comisión Directiva' })} className={`${btnPrimario} ml-auto`}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        {fin && (
          <p className="text-[11.5px] text-[#5c5c6b] mt-2">
            El mandato vigente vence el <b className="text-[#a6a6b5] font-mono">{fmtFecha(fin)}</b>.
            Con las autoridades vencidas no se puede hacer ningún trámite.
          </p>
        )}
      </div>

      {autoridades.length === 0 ? (
        <p className="text-[13px] text-[#5c5c6b] text-center py-8">Sin autoridades cargadas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {autoridades.map(a => (
            <div key={a.id} className={card}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[14px] text-[#ececf1] truncate">{a.nombre}</p>
                  <p className="text-[11.5px] text-[#d9f99d] mt-0.5">{a.cargo}</p>
                  <p className="text-[10.5px] text-[#757584] mt-0.5">{a.organo}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setForm(a)} className={btnSutil} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => borrar(a)} className={btnSutil} aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal titulo={form.id ? 'Editar autoridad' : 'Nueva autoridad'} onCerrar={() => setForm(null)}>
          <div className="space-y-3">
            <label><span className={labelCls}>Nombre</span>
              <input className={inputCls} value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
            <label><span className={labelCls}>Cargo</span>
              <select className={inputCls} value={form.cargo ?? ''} onChange={e => setForm({ ...form, cargo: e.target.value })}>
                <option value="">Elegir…</option>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <label><span className={labelCls}>Órgano</span>
              <select className={inputCls} value={form.organo ?? ORGANOS[0]} onChange={e => setForm({ ...form, organo: e.target.value })}>
                {ORGANOS.map(o => <option key={o} value={o}>{o}</option>)}
              </select></label>
            <button onClick={guardar} className={`${btnPrimario} w-full justify-center`}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===================== PREDIOS =====================

function Predios({ predios, entidad, onCambio }: {
  predios: Predio[]; entidad: Entidad | null; onCambio: () => void
}) {
  const [form, setForm] = useState<Partial<Predio> | null>(null)
  const tope = entidad?.tope_predios ?? 3

  const guardar = async () => {
    if (!form?.nombre) { toast.error('El nombre es obligatorio'); return }
    try { await ongService.guardarPredio(form); toast.success('Predio guardado'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const borrar = async (p: Predio) => {
    if (!window.confirm(`¿Borrar el predio "${p.nombre}"?`)) return
    try { await ongService.borrarPredio(p.id); toast.success('Borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-[#fb923c]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Predios de cultivo</h3>
          <span className="text-[12px] font-mono tabular-nums text-[#a6a6b5]">{predios.length} / {tope}</span>
          <button onClick={() => setForm({})} className={`${btnPrimario} ml-auto`} disabled={predios.length >= tope}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          La georreferenciación y la notificación al municipio son <b className="text-[#a6a6b5]">por predio</b>, no por entidad.
        </p>
      </div>

      {predios.length === 0 ? (
        <p className="text-[13px] text-[#5c5c6b] text-center py-8">Sin predios cargados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {predios.map(p => (
            <div key={p.id} className={card}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-[14px] text-[#ececf1] truncate">{p.nombre}</p>
                  <p className="text-[11.5px] text-[#757584] mt-0.5 truncate">
                    {[p.direccion, p.localidad, p.provincia].filter(Boolean).join(', ') || 'Sin dirección'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Chip ok={!!p.georreferenciado} txt="Georreferenciado" />
                    <Chip ok={!!p.municipio_notificado} txt="Municipio notificado" />
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setForm(p)} className={btnSutil} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => borrar(p)} className={btnSutil} aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal titulo={form.id ? 'Editar predio' : 'Nuevo predio'} onCerrar={() => setForm(null)}>
          <div className="space-y-3">
            <label><span className={labelCls}>Nombre</span>
              <input className={inputCls} value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Sala principal" /></label>
            <label><span className={labelCls}>Dirección</span>
              <input className={inputCls} value={form.direccion ?? ''} onChange={e => setForm({ ...form, direccion: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Localidad</span>
                <input className={inputCls} value={form.localidad ?? ''} onChange={e => setForm({ ...form, localidad: e.target.value })} /></label>
              <label><span className={labelCls}>Provincia</span>
                <input className={inputCls} value={form.provincia ?? ''} onChange={e => setForm({ ...form, provincia: e.target.value })} /></label>
            </div>
            <label><span className={labelCls}>Municipio</span>
              <input className={inputCls} value={form.municipio ?? ''} onChange={e => setForm({ ...form, municipio: e.target.value })} /></label>
            <div className="flex flex-wrap gap-3 pt-1">
              <Check label="Georreferenciado" v={!!form.georreferenciado} on={v => setForm({ ...form, georreferenciado: v })} />
              <Check label="Municipio notificado" v={!!form.municipio_notificado} on={v => setForm({ ...form, municipio_notificado: v })} />
            </div>
            <button onClick={guardar} className={`${btnPrimario} w-full justify-center`}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===================== auxiliares =====================

function Chip({ ok, txt }: { ok: boolean; txt: string }) {
  return (
    <span className="text-[10.5px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1"
      style={ok
        ? { color: '#bef264', background: 'rgba(163,230,53,0.12)', borderColor: '#404d20' }
        : { color: '#8f8f9f', background: 'rgba(180,180,200,0.06)', borderColor: '#2a2a3a' }}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}{txt}
    </span>
  )
}

function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => on(!v)}
      className="inline-flex items-center gap-2 text-[12.5px] text-[#d4d4dd] min-h-[44px] sm:min-h-0">
      {v ? <CheckCircle2 className="w-4 h-4 text-[#bef264]" /> : <Circle className="w-4 h-4 text-[#5c5c6b]" />}
      {label}
    </button>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={onCerrar}>
      <div className="bg-[#101016] border border-[#2a2a3a] rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#101016]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h3>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-[#8f8f9f] hover:text-[#ececf1]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
