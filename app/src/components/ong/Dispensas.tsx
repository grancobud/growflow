// Registro de dispensas: a quién se le entregó cannabis, cuánto y con qué
// aporte. Es lo que conecta el cultivo con lo institucional y lo que prueba
// que el aporte cubre costos en vez de ser una venta.

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { HandCoins, Plus, Pencil, Trash2, AlertTriangle, XCircle } from 'lucide-react'
import {
  ongService, revisarDispensa, resumirDispensas, PRODUCTOS_DISPENSA,
  TOPE_TRASLADO_INDIVIDUAL_G,
  type Dispensa, type Asociado,
} from '../../lib/ong'
import type { Paciente } from '../../lib/registro'
import type { Genetica } from '../../lib/cultivo'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fmtFecha = (f?: string | null) =>
  f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export function Dispensas({ dispensas, pacientes, asociados, geneticas, costoPorGramo, onCambio }: {
  dispensas: Dispensa[]
  pacientes: Paciente[]
  asociados: Asociado[]
  geneticas: Genetica[]
  costoPorGramo: number | null
  onCambio: () => void
}) {
  const [form, setForm] = useState<Partial<Dispensa> | null>(null)
  const r = useMemo(() => resumirDispensas(dispensas), [dispensas])
  const hayCosto = costoPorGramo != null && costoPorGramo > 0

  // Un paciente está "vinculado" si figura como asociado con la vinculación hecha.
  const vinculado = (pacienteId?: string | null) =>
    !!pacienteId && asociados.some(a => a.paciente_id === pacienteId && a.vinculado_reprocann)

  const nombrePaciente = (id?: string | null) => pacientes.find(p => p.id === id)?.nombre_completo ?? 'Sin paciente'
  const nombreGenetica = (id?: string | null) => geneticas.find(g => g.id === id)?.nombre

  const guardar = async () => {
    if (!form?.gramos || form.gramos <= 0) { toast.error('Cargá los gramos entregados'); return }
    if (!form?.fecha) { toast.error('Cargá la fecha'); return }
    try { await ongService.guardarDispensa(form); toast.success('Dispensa registrada'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const borrar = async (d: Dispensa) => {
    if (!window.confirm(`¿Borrar la dispensa de ${d.gramos} g a ${nombrePaciente(d.paciente_id)}?`)) return
    try { await ongService.borrarDispensa(d.id); toast.success('Borrada'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  // Aviso en vivo mientras se carga, para no guardar algo mal y enterarse después.
  const avisosForm = form
    ? revisarDispensa(
        { ...form, gramos: form.gramos ?? 0, fecha: form.fecha ?? '' } as Dispensa,
        { pacienteVinculado: form.paciente_id ? vinculado(form.paciente_id) : undefined, costoPorGramo })
    : []

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <HandCoins className="w-4 h-4 text-[#bef264]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Dispensas</h3>
          <button onClick={() => setForm({ fecha: new Date().toISOString().slice(0, 10), producto: 'flor', modalidad: 'retiro' })}
            className={`${btnPrimario} ml-auto`}><Plus className="w-3.5 h-3.5" /> Registrar</button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Sólo se dispensa a pacientes con REPROCANN vinculado a esta ONG. El aporte cubre el prorrateo de costos:
          no es una venta, y por encima del costo real deja de ser un aporte.
        </p>
        {dispensas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#1f1f2b]">
            <Kpi t="Entregado" v={`${r.gramos.toLocaleString('es-AR')} g`} c="#bef264" />
            <Kpi t="Dispensas" v={String(r.total)} c="#a6a6b5" />
            <Kpi t="Pacientes" v={String(r.pacientes)} c="#38bdf8" />
            <Kpi t="Aporte por gramo"
              v={r.aportePorGramo != null ? `${fmtPesos(r.aportePorGramo)}/g` : '—'}
              c={hayCosto && r.aportePorGramo && r.aportePorGramo > costoPorGramo! * 1.05 ? '#ff8a7a' : '#d9f99d'} />
          </div>
        )}
        {/* Un costo en 0 no es "gratis" sino "todavía no se pudo calcular": sin
            gramos cosechados o sin costos cargados no hay contra qué comparar. */}
        {hayCosto && r.aportePorGramo != null ? (
          <p className="text-[11.5px] mt-2"
            style={{ color: r.aportePorGramo > costoPorGramo! * 1.05 ? '#ff8a7a' : '#757584' }}>
            Tu costo real de producción es <b className="font-mono">{fmtPesos(costoPorGramo!)}/g</b>.
            {r.aportePorGramo > costoPorGramo! * 1.05
              ? ' El aporte lo está superando: eso deja de ser prorrateo de costos.'
              : ' El aporte está por debajo, como corresponde a un aporte solidario.'}
          </p>
        ) : dispensas.length > 0 && (
          <p className="text-[11.5px] text-[#5c5c6b] mt-2">
            Todavía no se puede comparar contra el costo: falta cargar costos o gramos cosechados en Econometría.
          </p>
        )}
      </div>

      {dispensas.length === 0 ? (
        <p className="text-[13px] text-[#5c5c6b] text-center py-8">Sin dispensas registradas.</p>
      ) : (
        <div className="space-y-2">
          {dispensas.map(d => {
            const avisos = revisarDispensa(d, { pacienteVinculado: d.paciente_id ? vinculado(d.paciente_id) : undefined, costoPorGramo })
            const gen = nombreGenetica(d.genetica_id)
            return (
              <div key={d.id} className={card}>
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-[13.5px] text-[#ececf1]">
                      {nombrePaciente(d.paciente_id)}
                      <span className="text-[#d9f99d] font-mono"> · {d.gramos} g</span>
                      <span className="text-[#5c5c6b] font-normal"> · {fmtFecha(d.fecha)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10.5px]">
                      <span className="px-1.5 py-0.5 rounded border border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5]">{d.producto}</span>
                      {gen && <span className="px-1.5 py-0.5 rounded border border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5]">{gen}</span>}
                      <span className="px-1.5 py-0.5 rounded border border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5]">{d.modalidad}</span>
                      {d.con_receta && <span className="px-1.5 py-0.5 rounded border border-[#404d20] bg-[#a3e635]/10 text-[#bef264]">con receta</span>}
                      {d.aporte != null && <span className="px-1.5 py-0.5 rounded border border-[#2a2a3a] bg-[#15151d] text-[#facc15]">{fmtPesos(d.aporte)}</span>}
                    </div>
                    {avisos.map((a, i) => (
                      <p key={i} className="flex items-start gap-1.5 text-[11.5px] mt-1.5"
                        style={{ color: a.nivel === 'error' ? '#ff8a7a' : '#f59e0b' }}>
                        {a.nivel === 'error' ? <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                        {a.texto}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setForm(d)} className={btnSutil} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => borrar(d)} className={btnSutil} aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <Modal titulo={form.id ? 'Editar dispensa' : 'Registrar dispensa'} onCerrar={() => setForm(null)}>
          <div className="space-y-3">
            <label><span className={labelCls}>Paciente</span>
              <select className={inputCls} value={form.paciente_id ?? ''} onChange={e => setForm({ ...form, paciente_id: e.target.value || null })}>
                <option value="">Elegir…</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo}{vinculado(p.id) ? '' : ' — sin vincular'}
                  </option>
                ))}
              </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Fecha</span>
                <input type="date" className={inputCls} value={form.fecha ?? ''} onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
              <label><span className={labelCls}>Gramos</span>
                <input type="number" step="0.1" className={inputCls} value={form.gramos ?? ''} onChange={e => setForm({ ...form, gramos: +e.target.value })} /></label>
              <label><span className={labelCls}>Producto</span>
                <select className={inputCls} value={form.producto ?? 'flor'} onChange={e => setForm({ ...form, producto: e.target.value })}>
                  {PRODUCTOS_DISPENSA.map(p => <option key={p} value={p}>{p}</option>)}
                </select></label>
              <label><span className={labelCls}>Genética</span>
                <select className={inputCls} value={form.genetica_id ?? ''} onChange={e => setForm({ ...form, genetica_id: e.target.value || null })}>
                  <option value="">Sin especificar</option>
                  {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select></label>
              <label><span className={labelCls}>Aporte ($)</span>
                <input type="number" className={inputCls} value={form.aporte ?? ''} onChange={e => setForm({ ...form, aporte: e.target.value === '' ? null : +e.target.value })} /></label>
              <label><span className={labelCls}>Modalidad</span>
                <select className={inputCls} value={form.modalidad ?? 'retiro'} onChange={e => setForm({ ...form, modalidad: e.target.value })}>
                  <option value="retiro">Retiro en sede</option>
                  <option value="envio">Envío</option>
                </select></label>
            </div>
            <label><span className={labelCls}>Entregado por</span>
              <input className={inputCls} value={form.entregado_por ?? ''} onChange={e => setForm({ ...form, entregado_por: e.target.value })} /></label>
            <button type="button" onClick={() => setForm({ ...form, con_receta: !form.con_receta })}
              className="inline-flex items-center gap-2 text-[12.5px] text-[#d4d4dd] min-h-[44px] sm:min-h-0">
              <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px] text-[#07070b]"
                style={form.con_receta ? { background: '#a3e635', borderColor: '#a3e635' } : { borderColor: '#2a2a3a' }}>
                {form.con_receta ? '✓' : ''}
              </span>
              Respaldada con receta (necesario arriba de {TOPE_TRASLADO_INDIVIDUAL_G} g)
            </button>

            {avisosForm.length > 0 && (
              <div className="rounded-lg border p-2.5 space-y-1"
                style={{ background: 'rgba(122,40,32,0.08)', borderColor: '#5a3a30' }}>
                {avisosForm.map((a, i) => (
                  <p key={i} className="text-[11.5px]" style={{ color: a.nivel === 'error' ? '#ff8a7a' : '#f59e0b' }}>{a.texto}</p>
                ))}
              </div>
            )}
            <button onClick={guardar} className={`${btnPrimario} w-full justify-center`}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Kpi({ t, v, c }: { t: string; v: string; c: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.12em] text-[#5c5c6b]">{t}</div>
      <div className="text-[15px] font-mono tabular-nums font-bold mt-0.5" style={{ color: c }}>{v}</div>
    </div>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={onCerrar}>
      <div className="bg-[#101016] border border-[#2a2a3a] rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#101016]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h3>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-[#8f8f9f] hover:text-[#ececf1] text-lg">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
