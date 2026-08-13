// Declaración jurada semestral y cartas de porte (Resolución 1780/2025).
//
// Las dos obligaciones que no avisa nadie: no llega notificación, el plazo
// simplemente corre. La DDJJ se arma sola con los datos que la app ya tiene
// —plantas totales, en floración, pacientes vinculados y variedades— así que
// lo único que queda por hacer es revisarla y marcarla presentada.

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  FileSpreadsheet, Truck, Plus, Pencil, Trash2, Check, AlertTriangle, Wand2,
} from 'lucide-react'
import {
  ongService, semestreActual, finDeSemestre, revisarTraslado, TOPES_TRASLADO,
  type DDJJ, type Traslado,
} from '../../lib/ong'
import type { Paciente } from '../../lib/registro'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'

export function Declaraciones({ ddjj, traslados, pacientes, cultivo, onCambio }: {
  ddjj: DDJJ[]
  traslados: Traslado[]
  pacientes: Paciente[]
  /** Lo que la app sabe hoy del cultivo, para prellenar la declaración. */
  cultivo: { plantasTotal: number; plantasFloracion: number; pacientesVinculados: number; variedades: string[] }
  onCambio: () => void
}) {
  const [form, setForm] = useState<Partial<DDJJ> | null>(null)
  const [tras, setTras] = useState<Partial<Traslado> | null>(null)
  const periodo = semestreActual()
  const actual = ddjj.find(d => d.periodo === periodo)

  const armar = () => setForm({
    periodo,
    plantas_total: cultivo.plantasTotal,
    plantas_floracion: cultivo.plantasFloracion,
    pacientes_vinculados: cultivo.pacientesVinculados,
    variedades: cultivo.variedades.join(', '),
    fecha_presentacion: new Date().toISOString().slice(0, 10),
  })

  const borrarDDJJ = async (d: DDJJ) => {
    if (!window.confirm(`¿Borrar la declaración de ${d.periodo}?`)) return
    try { await ongService.borrarDDJJ(d.id); toast.success('Borrada'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const borrarTras = async (t: Traslado) => {
    if (!window.confirm(`¿Borrar el traslado del ${t.fecha}?`)) return
    try { await ongService.borrarTraslado(t.id); toast.success('Borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {/* ---------------- Declaración jurada semestral ---------------- */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <FileSpreadsheet className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Declaración jurada semestral</h3>
          {!actual && (
            <button onClick={armar} className={`${btnPrimario} ml-auto`}>
              <Wand2 className="w-3.5 h-3.5" /> Armar la de {periodo}
            </button>
          )}
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          La Resolución 1780 la exige cada seis meses: cantidad de plantas en total y en floración, pacientes
          vinculados y las variedades usadas. No llega ninguna notificación, el plazo corre solo.
        </p>

        <div className="rounded-lg bg-[#15151d] border border-[#1f1f2b] p-3 mt-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] mb-2">
            Lo que la app sabe hoy · período {periodo} · cierra el {finDeSemestre(periodo)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato t="Plantas" v={String(cultivo.plantasTotal)} />
            <Dato t="En floración" v={String(cultivo.plantasFloracion)} />
            <Dato t="Pacientes" v={String(cultivo.pacientesVinculados)} />
            <Dato t="Variedades" v={String(cultivo.variedades.length)} />
          </div>
        </div>

        {ddjj.length === 0 ? (
          <p className="text-[12px] text-[#5c5c6b] text-center py-5">Todavía no armaste ninguna declaración.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {ddjj.map(d => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-2 sm:px-3 py-2 min-h-[44px]">
                <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={d.presentada ? { background: '#a3e635', borderColor: '#a3e635' } : { borderColor: '#5a4a20' }}>
                  {d.presentada && <Check className="w-3 h-3 text-[#07070b]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-[#ececf1]">{d.periodo}</p>
                  <p className="text-[10.5px] text-[#5c5c6b] tabular-nums truncate">
                    {d.plantas_total ?? '—'} plantas · {d.plantas_floracion ?? '—'} en flor · {d.pacientes_vinculados ?? '—'} pacientes
                    {d.presentada && d.fecha_presentacion ? ` · presentada ${d.fecha_presentacion}` : ' · sin presentar'}
                  </p>
                </div>
                <button onClick={() => setForm(d)} className={btnSutil} aria-label="Editar declaración"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => borrarDDJJ(d)} className={btnSutil} aria-label="Borrar declaración"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Traslados / cartas de porte ---------------- */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Truck className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Traslados y cartas de porte</h3>
          <button onClick={() => setTras({ fecha: new Date().toISOString().slice(0, 10), tipo_material: 'flores' })}
            className={`${btnPrimario} ml-auto`}>
            <Plus className="w-3.5 h-3.5" /> Registrar traslado
          </button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Cada traslado necesita su carta de porte por TAD. Los topes son por persona representada:
          hasta <b className="text-[#a6a6b5]">40 g</b> de flores, <b className="text-[#a6a6b5]">6 frascos</b> de 30 ml,
          o las plantas que tenga autorizadas.
        </p>

        {traslados.length === 0 ? (
          <p className="text-[12px] text-[#5c5c6b] text-center py-5">Sin traslados registrados.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {traslados.map(t => {
              const pac = pacientes.find(p => p.id === t.paciente_id)
              const rev = revisarTraslado(t, pac?.plantas_habilitadas ?? null)
              const u = TOPES_TRASLADO[t.tipo_material ?? 'flores']
              return (
                <div key={t.id} className="rounded-lg bg-[#15151d] border px-3 py-2"
                  style={{ borderColor: rev.ok ? '#1f1f2b' : '#7a2820' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] text-[#ececf1]">{t.fecha}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5]">
                      {t.cantidad ?? '—'} {u.unidad}
                    </span>
                    {pac && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8]">{pac.nombre_completo}</span>}
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => setTras(t)} className={btnSutil} aria-label="Editar traslado"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => borrarTras(t)} className={btnSutil} aria-label="Borrar traslado"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[#5c5c6b] mt-1 truncate">
                    {[t.origen, t.destino].filter(Boolean).join(' → ') || 'Sin origen ni destino'}
                    {t.transportista ? ` · ${t.transportista}` : ''}
                  </p>
                  {rev.motivos.map(m => (
                    <p key={m} className="flex items-start gap-1.5 text-[11px] text-[#ff8a7a] mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" strokeWidth={1.8} />{m}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {form && <ModalDDJJ form={form} setForm={setForm} onCambio={onCambio} />}
      {tras && <ModalTraslado form={tras} setForm={setTras} pacientes={pacientes} onCambio={onCambio} />}
    </div>
  )
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-[#5c5c6b]">{t}</div>
      <div className="text-[16px] font-mono tabular-nums font-bold text-[#d9f99d] mt-0.5">{v}</div>
    </div>
  )
}

function Modal({ titulo, onCerrar, children, onGuardar }: {
  titulo: string; onCerrar: () => void; children: React.ReactNode; onGuardar: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#0d0d12]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h3>
        </div>
        <div className="p-4 space-y-3">{children}</div>
        <div className="px-4 py-3 border-t border-[#1f1f2b] flex gap-2 sticky bottom-0 bg-[#0d0d12]">
          <button onClick={onCerrar} className={btnSutil}>Cancelar</button>
          <button onClick={onGuardar} className={`${btnPrimario} flex-1`}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => on(!v)}
      className="flex items-center gap-2 text-[12.5px] text-[#d4d4dd] py-2 min-h-[44px] sm:min-h-0">
      <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
        style={v ? { background: '#a3e635', borderColor: '#a3e635' } : { borderColor: '#2a2a3a' }}>
        {v && <Check className="w-3 h-3 text-[#07070b]" />}
      </span>
      {label}
    </button>
  )
}

function ModalDDJJ({ form, setForm, onCambio }: {
  form: Partial<DDJJ>; setForm: (f: Partial<DDJJ> | null) => void; onCambio: () => void
}) {
  const guardar = async () => {
    if (!form.periodo) { toast.error('Falta el período'); return }
    try { await ongService.guardarDDJJ(form); toast.success('Declaración guardada'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  return (
    <Modal titulo={`Declaración jurada ${form.periodo ?? ''}`} onCerrar={() => setForm(null)} onGuardar={guardar}>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={labelCls}>Período</span>
          <input className={inputCls} value={form.periodo ?? ''} placeholder="2026-S1"
            onChange={e => setForm({ ...form, periodo: e.target.value })} /></label>
        <label><span className={labelCls}>Fecha de presentación</span>
          <input type="date" className={inputCls} value={form.fecha_presentacion ?? ''}
            onChange={e => setForm({ ...form, fecha_presentacion: e.target.value || null })} /></label>
        <label><span className={labelCls}>Plantas en total</span>
          <input type="number" className={inputCls} value={form.plantas_total ?? ''}
            onChange={e => setForm({ ...form, plantas_total: e.target.value === '' ? null : +e.target.value })} /></label>
        <label><span className={labelCls}>En floración</span>
          <input type="number" className={inputCls} value={form.plantas_floracion ?? ''}
            onChange={e => setForm({ ...form, plantas_floracion: e.target.value === '' ? null : +e.target.value })} /></label>
        <label className="col-span-2"><span className={labelCls}>Pacientes vinculados</span>
          <input type="number" className={inputCls} value={form.pacientes_vinculados ?? ''}
            onChange={e => setForm({ ...form, pacientes_vinculados: e.target.value === '' ? null : +e.target.value })} /></label>
      </div>
      <label><span className={labelCls}>Variedades usadas</span>
        <input className={inputCls} value={form.variedades ?? ''}
          onChange={e => setForm({ ...form, variedades: e.target.value })} /></label>
      <label><span className={labelCls}>Notas</span>
        <input className={inputCls} value={form.notas ?? ''}
          onChange={e => setForm({ ...form, notas: e.target.value })} /></label>
      <Toggle label="Ya la presenté por TAD" v={!!form.presentada} on={v => setForm({ ...form, presentada: v })} />
    </Modal>
  )
}

function ModalTraslado({ form, setForm, pacientes, onCambio }: {
  form: Partial<Traslado>; setForm: (f: Partial<Traslado> | null) => void
  pacientes: Paciente[]; onCambio: () => void
}) {
  const pac = pacientes.find(p => p.id === form.paciente_id)
  const rev = useMemo(() => revisarTraslado(form as Traslado, pac?.plantas_habilitadas ?? null), [form, pac])
  const guardar = async () => {
    if (!form.fecha) { toast.error('Falta la fecha'); return }
    try { await ongService.guardarTraslado(form); toast.success('Traslado guardado'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const u = TOPES_TRASLADO[form.tipo_material ?? 'flores']

  return (
    <Modal titulo={form.id ? 'Editar traslado' : 'Registrar traslado'} onCerrar={() => setForm(null)} onGuardar={guardar}>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={labelCls}>Fecha</span>
          <input type="date" className={inputCls} value={form.fecha ?? ''}
            onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
        <label><span className={labelCls}>Paciente</span>
          <select className={inputCls} value={form.paciente_id ?? ''}
            onChange={e => setForm({ ...form, paciente_id: e.target.value || null })}>
            <option value="">—</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
          </select></label>
        <label><span className={labelCls}>Qué se traslada</span>
          <select className={inputCls} value={form.tipo_material ?? 'flores'}
            onChange={e => setForm({ ...form, tipo_material: e.target.value as Traslado['tipo_material'] })}>
            {(Object.entries(TOPES_TRASLADO) as [keyof typeof TOPES_TRASLADO, { label: string }][])
              .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></label>
        <label><span className={labelCls}>Cantidad ({u.unidad})</span>
          <input type="number" step="0.1" className={inputCls} value={form.cantidad ?? ''}
            onChange={e => setForm({ ...form, cantidad: e.target.value === '' ? null : +e.target.value })} /></label>
        <label><span className={labelCls}>Origen</span>
          <input className={inputCls} value={form.origen ?? ''} placeholder="Predio de cultivo"
            onChange={e => setForm({ ...form, origen: e.target.value })} /></label>
        <label><span className={labelCls}>Destino</span>
          <input className={inputCls} value={form.destino ?? ''}
            onChange={e => setForm({ ...form, destino: e.target.value })} /></label>
        <label><span className={labelCls}>Hora de salida</span>
          <input className={inputCls} value={form.hora_salida ?? ''} placeholder="14:30"
            onChange={e => setForm({ ...form, hora_salida: e.target.value })} /></label>
        <label><span className={labelCls}>Hora de llegada</span>
          <input className={inputCls} value={form.hora_llegada ?? ''} placeholder="16:00"
            onChange={e => setForm({ ...form, hora_llegada: e.target.value })} /></label>
        <label><span className={labelCls}>Transportista</span>
          <input className={inputCls} value={form.transportista ?? ''}
            onChange={e => setForm({ ...form, transportista: e.target.value })} /></label>
        <label><span className={labelCls}>DNI del transportista</span>
          <input className={inputCls} value={form.transportista_dni ?? ''}
            onChange={e => setForm({ ...form, transportista_dni: e.target.value })} /></label>
      </div>
      <label><span className={labelCls}>Ruta</span>
        <input className={inputCls} value={form.ruta ?? ''} placeholder="Ruta 2 hasta km 40, luego Av. ..."
          onChange={e => setForm({ ...form, ruta: e.target.value })} /></label>
      <label><span className={labelCls}>Destinatario final</span>
        <input className={inputCls} value={form.destinatario ?? ''}
          onChange={e => setForm({ ...form, destinatario: e.target.value })} /></label>
      <Toggle label="Carta de porte presentada por TAD" v={!!form.carta_porte_presentada}
        on={v => setForm({ ...form, carta_porte_presentada: v })} />

      {/* Validación en vivo: si algo no cierra conviene verlo antes de guardar */}
      {rev.motivos.length > 0 && (
        <div className="rounded-lg bg-[#7a2820]/10 border border-[#7a2820] p-2.5 space-y-1">
          {rev.motivos.map(m => (
            <p key={m} className="flex items-start gap-1.5 text-[11px] text-[#ff8a7a]">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" strokeWidth={1.8} />{m}
            </p>
          ))}
        </div>
      )}
    </Modal>
  )
}
