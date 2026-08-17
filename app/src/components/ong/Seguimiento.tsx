// Seguimiento terapéutico (PROMs) y Libro Diario de Caja.
//
// El seguimiento es obligación de la ONG, no del paciente: sin los reportes no
// hay informe semestral que presentar, y el Director Médico no tiene con qué
// trabajar. Por eso la entrega siguiente se bloquea si falta el reporte de la
// anterior (RN-05).
//
// Un reporte enviado NO se edita ni se borra (RN-07). La tabla no tiene policies
// de update ni delete, así que la base lo rechaza aunque esta pantalla se
// equivoque: un dato clínico reescrito no sirve como evidencia.

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Stethoscope, BookOpenCheck, Plus, Trash2, AlertTriangle, Lock, Wand2,
} from 'lucide-react'
import {
  ongService, feedbackPendiente, EFECTOS_ADVERSOS, ESCALA_ALIVIO, CONCEPTOS_CAJA,
  type Dispensa, type FeedbackClinico, type AsientoCaja,
} from '../../lib/ong'
import type { Paciente } from '../../lib/registro'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#7d7d8e] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export function Seguimiento({ dispensas, feedbacks, pacientes, caja, onCambio }: {
  dispensas: Dispensa[]
  feedbacks: FeedbackClinico[]
  pacientes: Paciente[]
  caja: AsientoCaja[]
  onCambio: () => void
}) {
  const [form, setForm] = useState<{ dispensa: Dispensa } | null>(null)
  const [asiento, setAsiento] = useState<Partial<AsientoCaja> | null>(null)
  const [asentando, setAsentando] = useState(false)

  const nombre = (id?: string | null) =>
    pacientes.find(p => p.id === id)?.nombre_completo ?? 'Sin paciente'

  // Entregas sin reporte, que son las que bloquean la siguiente.
  const pendientes = useMemo(() => {
    const ids = new Set(feedbacks.map(f => f.dispensa_id))
    return dispensas.filter(d => d.paciente_id && !ids.has(d.id))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [dispensas, feedbacks])

  // Personas que hoy tienen la próxima entrega bloqueada.
  const bloqueados = useMemo(() => {
    const ids = [...new Set(dispensas.map(d => d.paciente_id).filter(Boolean))] as string[]
    return ids
      .map(id => ({ id, d: feedbackPendiente(dispensas, feedbacks, id) }))
      .filter(x => x.d) as { id: string; d: Dispensa }[]
  }, [dispensas, feedbacks])

  const alivioPromedio = feedbacks.length
    ? feedbacks.reduce((s, f) => s + f.escala_alivio, 0) / feedbacks.length
    : null
  const conAdversos = feedbacks.filter(f =>
    f.efectos_adversos.some(e => e !== 'Ninguno')).length

  const ingresos = caja.filter(a => a.tipo === 'ingreso').reduce((s, a) => s + Number(a.monto), 0)
  const egresos = caja.filter(a => a.tipo === 'egreso').reduce((s, a) => s + Number(a.monto), 0)

  const asentarPendientes = async () => {
    setAsentando(true)
    try {
      const n = await ongService.asentarReembolsosPendientes(dispensas, caja)
      toast[n > 0 ? 'success' : 'info'](
        n > 0 ? `${n} reembolso${n === 1 ? '' : 's'} asentado${n === 1 ? '' : 's'}` : 'No quedaban reembolsos sin asentar')
      onCambio()
    } catch (e) { toast.error((e as Error).message) } finally { setAsentando(false) }
  }

  const borrarAsiento = async (a: AsientoCaja) => {
    if (!window.confirm(`¿Borrar el asiento de ${fmtPesos(a.monto)} del ${a.fecha}?`)) return
    try { await ongService.borrarAsiento(a.id); toast.success('Borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {/* ------------------ Seguimiento terapéutico ------------------ */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Stethoscope className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Seguimiento terapéutico</h3>
          <span className="text-[11px] text-[#7d7d8e] tabular-nums ml-auto">
            {feedbacks.length} reporte{feedbacks.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#7d7d8e] mt-2">
          Después de cada entrega el paciente reporta cómo le fue. Es obligación de la ONG llevarlo:
          sin estos reportes no hay informe semestral del director médico que presentar. Una vez enviado,
          el reporte no se puede editar ni borrar.
        </p>

        {feedbacks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#1f1f2b]">
            <Kpi t="Alivio promedio" v={alivioPromedio != null ? `${alivioPromedio.toFixed(1)}/5` : '—'}
              c={alivioPromedio == null ? undefined : alivioPromedio >= 3.5 ? '#bef264' : '#facc15'} />
            <Kpi t="Con efectos adversos" v={`${conAdversos}/${feedbacks.length}`}
              c={conAdversos > 0 ? '#facc15' : '#bef264'} />
            <Kpi t="Entregas sin reporte" v={String(pendientes.length)}
              c={pendientes.length > 0 ? '#ff8a7a' : '#bef264'} />
          </div>
        )}

        {bloqueados.length > 0 && (
          <div className="rounded-lg bg-[#7a2820]/10 border border-[#7a2820] p-2.5 mt-3">
            <p className="flex items-start gap-1.5 text-[11.5px] text-[#ff8a7a] leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" strokeWidth={1.8} />
              <span>
                {bloqueados.length} paciente{bloqueados.length === 1 ? '' : 's'} con la próxima entrega
                bloqueada por falta de reporte: {bloqueados.map(b => nombre(b.id)).join(', ')}.
              </span>
            </p>
          </div>
        )}

        {pendientes.length > 0 && (
          <div className="mt-3">
            <div className={labelCls}>Entregas esperando reporte</div>
            <div className="space-y-1.5">
              {pendientes.slice(0, 8).map(d => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg bg-[#15151d] border border-[#5a4a20] px-3 py-2 min-h-[44px]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-[#ececf1] truncate">{nombre(d.paciente_id)}</p>
                    <p className="text-[10.5px] text-[#7d7d8e] tabular-nums">{d.fecha} · {d.gramos} g</p>
                  </div>
                  <button onClick={() => setForm({ dispensa: d })} className={btnPrimario}>
                    <Plus className="w-3.5 h-3.5" /> Cargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {feedbacks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#1f1f2b]">
            <div className={labelCls}>Reportes cargados</div>
            <div className="space-y-1.5">
              {feedbacks.slice(0, 10).map(f => {
                const d = dispensas.find(x => x.id === f.dispensa_id)
                const esc = ESCALA_ALIVIO.find(e => e.valor === f.escala_alivio)
                const adversos = f.efectos_adversos.filter(e => e !== 'Ninguno')
                return (
                  <div key={f.id} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] text-[#ececf1]">{nombre(f.paciente_id)}</span>
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5]">
                        Alivio {f.escala_alivio}/5 · {esc?.label}
                      </span>
                      {adversos.length > 0 && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24]">
                          {adversos.join(', ')}
                        </span>
                      )}
                      <Lock className="w-3 h-3 text-[#7d7d8e] ml-auto flex-shrink-0"
                        aria-label="Reporte inmutable" />
                    </div>
                    <p className="text-[10.5px] text-[#7d7d8e] mt-1">
                      {d ? `Entrega del ${d.fecha} · ${d.gramos} g · ` : ''}Dosis usada: {f.dosificacion_real}
                    </p>
                    {f.observaciones && (
                      <p className="text-[11px] text-[#a6a6b5] mt-1 leading-relaxed">{f.observaciones}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {feedbacks.length === 0 && pendientes.length === 0 && (
          <p className="text-[12px] text-[#7d7d8e] text-center py-5">
            Cuando registres dispensas van a aparecer acá para cargar su seguimiento.
          </p>
        )}
      </div>

      {/* ------------------ Libro Diario de Caja ------------------ */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpenCheck className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Libro Diario de Caja</h3>
          <div className="ml-auto flex gap-2">
            <button onClick={asentarPendientes} disabled={asentando} className={btnSutil}>
              <Wand2 className="w-3.5 h-3.5" /> Asentar reembolsos
            </button>
            <button onClick={() => setAsiento({ tipo: 'ingreso', fecha: new Date().toISOString().slice(0, 10) })}
              className={btnPrimario}>
              <Plus className="w-3.5 h-3.5" /> Asiento
            </button>
          </div>
        </div>
        <p className="text-[11.5px] text-[#7d7d8e] mt-2">
          Es uno de los cinco libros obligatorios: acá se asienta cada peso que entra y sale. De esto
          sale el balance, así que los reembolsos de las dispensas conviene traerlos con el botón en vez
          de cargarlos a mano.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#1f1f2b]">
          <Kpi t="Ingresos" v={fmtPesos(ingresos)} c="#bef264" />
          <Kpi t="Egresos" v={fmtPesos(egresos)} c="#ff8a7a" />
          <Kpi t="Saldo" v={fmtPesos(ingresos - egresos)}
            c={ingresos - egresos >= 0 ? '#ececf1' : '#ff8a7a'} />
        </div>

        {caja.length === 0 ? (
          <p className="text-[12px] text-[#7d7d8e] text-center py-5">Sin asientos cargados.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {caja.slice(0, 15).map(a => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2 min-h-[44px]">
                <span className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ background: a.tipo === 'ingreso' ? '#a3e635' : '#ff8a7a' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-[#ececf1] truncate">{a.concepto}</p>
                  <p className="text-[10.5px] text-[#7d7d8e] tabular-nums truncate">
                    {a.fecha}{a.detalle ? ` · ${a.detalle}` : ''}{a.medio ? ` · ${a.medio}` : ''}
                  </p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums flex-shrink-0"
                  style={{ color: a.tipo === 'ingreso' ? '#d9f99d' : '#ff8a7a' }}>
                  {a.tipo === 'ingreso' ? '+' : '−'}{fmtPesos(a.monto)}
                </span>
                <button onClick={() => borrarAsiento(a)} className={btnSutil} aria-label="Borrar asiento">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <ModalFeedback dispensa={form.dispensa} nombre={nombre(form.dispensa.paciente_id)}
          onCerrar={() => setForm(null)} onCambio={onCambio} />
      )}
      {asiento && <ModalAsiento form={asiento} setForm={setAsiento} onCambio={onCambio} />}
    </div>
  )
}

function Kpi({ t, v, c }: { t: string; v: string; c?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] uppercase tracking-[0.12em] text-[#7d7d8e] truncate">{t}</div>
      <div className="text-[15px] font-mono tabular-nums font-bold mt-0.5" style={{ color: c ?? '#ececf1' }}>{v}</div>
    </div>
  )
}

function Modal({ titulo, aviso, onCerrar, onGuardar, children }: {
  titulo: string; aviso?: string; onCerrar: () => void; onGuardar: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#0d0d12]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h3>
        </div>
        <div className="p-4 space-y-3">
          {aviso && (
            <p className="flex items-start gap-1.5 text-[11.5px] text-[#fbbf24] rounded-lg bg-[#5a4a20]/15 border border-[#5a4a20] p-2.5 leading-relaxed">
              <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-px" strokeWidth={1.8} />{aviso}
            </p>
          )}
          {children}
        </div>
        <div className="px-4 py-3 border-t border-[#1f1f2b] flex gap-2 sticky bottom-0 bg-[#0d0d12]">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={onGuardar} className={`${btnPrimario} flex-1`}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ModalFeedback({ dispensa, nombre, onCerrar, onCambio }: {
  dispensa: Dispensa; nombre: string; onCerrar: () => void; onCambio: () => void
}) {
  const [alivio, setAlivio] = useState(3)
  const [efectos, setEfectos] = useState<string[]>(['Ninguno'])
  const [detalle, setDetalle] = useState('')
  const [dosis, setDosis] = useState('')
  const [obs, setObs] = useState('')

  // "Ninguno" es excluyente: no puede haber ningún efecto y a la vez cefalea.
  const toggleEfecto = (e: string) => {
    if (e === 'Ninguno') { setEfectos(['Ninguno']); return }
    const sin = efectos.filter(x => x !== 'Ninguno')
    setEfectos(sin.includes(e) ? (sin.filter(x => x !== e).length ? sin.filter(x => x !== e) : ['Ninguno'])
                               : [...sin, e])
  }

  const guardar = async () => {
    if (!dosis.trim()) { toast.error('Poné la dosis que usó realmente'); return }
    if (efectos.includes('Otro') && !detalle.trim()) { toast.error('Detallá cuál fue el otro efecto'); return }
    try {
      await ongService.guardarFeedback({
        dispensa_id: dispensa.id, paciente_id: dispensa.paciente_id ?? null,
        escala_alivio: alivio, efectos_adversos: efectos,
        efectos_detalle: detalle.trim() || null,
        dosificacion_real: dosis.trim(), observaciones: obs.trim() || null,
      })
      toast.success('Reporte guardado'); onCerrar(); onCambio()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Modal titulo={`Seguimiento · ${nombre}`} onCerrar={onCerrar} onGuardar={guardar}
      aviso="Una vez guardado no se puede editar ni borrar: es la evidencia del seguimiento y va al informe del director médico. Revisalo antes.">
      <p className="text-[11.5px] text-[#a6a6b5]">
        Entrega del {dispensa.fecha} · {dispensa.gramos} g
      </p>

      <div>
        <span className={labelCls}>Alivio de los síntomas</span>
        <div className="flex gap-1.5 flex-wrap">
          {ESCALA_ALIVIO.map(e => (
            <button key={e.valor} type="button" onClick={() => setAlivio(e.valor)}
              className="flex-1 min-w-[64px] px-2 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-lg border text-[11.5px] transition-colors"
              style={alivio === e.valor
                ? { borderColor: '#404d20', background: 'rgba(163,230,53,0.14)', color: '#d9f99d' }
                : { borderColor: '#2a2a3a', background: '#15151d', color: '#a6a6b5' }}>
              <span className="block font-semibold tabular-nums">{e.valor}</span>
              <span className="block text-[9.5px]">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className={labelCls}>Efectos adversos</span>
        <div className="flex gap-1.5 flex-wrap">
          {EFECTOS_ADVERSOS.map(e => (
            <button key={e} type="button" onClick={() => toggleEfecto(e)}
              className="px-2.5 py-2 sm:py-1 min-h-[44px] sm:min-h-0 rounded-lg border text-[11.5px] transition-colors"
              style={efectos.includes(e)
                ? { borderColor: '#5a4a20', background: 'rgba(245,158,11,0.14)', color: '#fbbf24' }
                : { borderColor: '#2a2a3a', background: '#15151d', color: '#a6a6b5' }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {efectos.includes('Otro') && (
        <label><span className={labelCls}>Cuál</span>
          <input className={inputCls} value={detalle} onChange={e => setDetalle(e.target.value)} /></label>
      )}

      <label><span className={labelCls}>Dosis que usó realmente</span>
        <input className={inputCls} value={dosis} onChange={e => setDosis(e.target.value)}
          placeholder="3 gotas cada 8 hs · 0,2 g vaporizado a la noche" /></label>

      <label><span className={labelCls}>Observaciones sobre su calidad de vida</span>
        <input className={inputCls} value={obs} onChange={e => setObs(e.target.value)} /></label>
    </Modal>
  )
}

function ModalAsiento({ form, setForm, onCambio }: {
  form: Partial<AsientoCaja>; setForm: (a: Partial<AsientoCaja> | null) => void; onCambio: () => void
}) {
  const tipo = form.tipo ?? 'ingreso'
  const guardar = async () => {
    if (!form.concepto) { toast.error('Elegí el concepto'); return }
    if (!form.monto || form.monto <= 0) { toast.error('Poné el monto'); return }
    try { await ongService.guardarAsiento(form); toast.success('Asiento guardado'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  return (
    <Modal titulo="Asiento en el libro de caja" onCerrar={() => setForm(null)} onGuardar={guardar}>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={labelCls}>Tipo</span>
          <select className={inputCls} value={tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value as 'ingreso' | 'egreso', concepto: undefined })}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select></label>
        <label><span className={labelCls}>Fecha</span>
          <input type="date" className={inputCls} value={form.fecha ?? ''}
            onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
        <label className="col-span-2"><span className={labelCls}>Concepto</span>
          <select className={inputCls} value={form.concepto ?? ''}
            onChange={e => setForm({ ...form, concepto: e.target.value })}>
            <option value="">Elegir…</option>
            {CONCEPTOS_CAJA[tipo].map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label><span className={labelCls}>Monto</span>
          <input type="number" className={inputCls} value={form.monto ?? ''}
            onChange={e => setForm({ ...form, monto: e.target.value === '' ? undefined : +e.target.value })} /></label>
        <label><span className={labelCls}>Medio</span>
          <input className={inputCls} value={form.medio ?? ''} placeholder="Efectivo / transferencia"
            onChange={e => setForm({ ...form, medio: e.target.value })} /></label>
      </div>
      <label><span className={labelCls}>Detalle</span>
        <input className={inputCls} value={form.detalle ?? ''}
          onChange={e => setForm({ ...form, detalle: e.target.value })} /></label>
    </Modal>
  )
}
