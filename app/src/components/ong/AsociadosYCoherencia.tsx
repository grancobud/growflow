// Registro de Asociados, categorías del estatuto, cuotas y el tablero que corre
// los mismos cruces que hace una inspección.
//
// Ojo con la distinción: los ASOCIADOS son la estructura societaria (pagan
// cuota, votan). Los que reciben cannabis necesitan REPROCANN vinculado a esta
// ONG. Se superponen pero no son lo mismo, y por eso el vínculo con el paciente
// es opcional.

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Users, Plus, Pencil, Trash2, Tags, Coins, ClipboardCheck, Receipt,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, Check,
} from 'lucide-react'
import {
  ongService, chequeosCoherencia, resumenCobranza, periodoActual,
  type Asociado, type CategoriaSocio, type Cuota, type Acta, type Libro,
  type Entidad, type Chequeo, type CuotaEmitida,
} from '../../lib/ong'
import type { Paciente } from '../../lib/registro'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export function Asociados({ asociados, categorias, cuotas, actas, pacientes, cuotasEmitidas, onCambio }: {
  asociados: Asociado[]; categorias: CategoriaSocio[]; cuotas: Cuota[]
  actas: Acta[]; pacientes: Paciente[]; cuotasEmitidas: CuotaEmitida[]; onCambio: () => void
}) {
  const [form, setForm] = useState<Partial<Asociado> | null>(null)
  const [cat, setCat] = useState<Partial<CategoriaSocio> | null>(null)
  const [cuo, setCuo] = useState<Partial<Cuota> | null>(null)

  const guardar = async () => {
    if (!form?.nombre) { toast.error('El nombre es obligatorio'); return }
    try { await ongService.guardarAsociado(form); toast.success('Asociado guardado'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }
  const borrar = async (a: Asociado) => {
    if (!window.confirm(`¿Borrar a ${a.nombre} del registro de asociados?`)) return
    try { await ongService.borrarAsociado(a.id); toast.success('Borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  const activos = asociados.filter(a => a.activo !== false)

  return (
    <div className="space-y-4">
      {/* Categorías del estatuto */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Tags className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Categorías del estatuto</h3>
          <button onClick={() => setCat({ con_voto: true })} className={`${btnSutil} ml-auto`}><Plus className="w-3.5 h-3.5" /> Agregar</button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Cargalas tal como figuran en el estatuto. Usar una categoría que no existe ahí es uno de los errores que más
          observan. No todas requieren REPROCANN: puede haber socios sólo para eventos o talleres.
        </p>
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {categorias.map(c => (
              <button key={c.id} onClick={() => setCat(c)}
                className="text-[11.5px] px-2 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:border-[#404d20] text-[#d4d4dd] min-h-[44px] sm:min-h-0">
                {c.nombre}
                {c.requiere_reprocann && <span className="ml-1.5 text-[10px] text-[#bef264]">REPROCANN</span>}
                {!c.con_voto && <span className="ml-1.5 text-[10px] text-[#757584]">sin voto</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cuotas */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Coins className="w-4 h-4 text-[#facc15]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Cuotas</h3>
          <button onClick={() => setCuo({ tipo: 'social' })} className={`${btnSutil} ml-auto`}><Plus className="w-3.5 h-3.5" /> Agregar</button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Hay dos y conviene no mezclarlas: la <b className="text-[#a6a6b5]">social</b> (pertenencia) y la
          de <b className="text-[#a6a6b5]">cultivo</b> (prorrateo de costos). Ninguna es una venta. El valor tiene que
          estar aprobado en un acta: una charla informal no sirve como prueba.
        </p>
        {cuotas.length > 0 && (
          <div className="space-y-1.5 mt-3">
            {cuotas.map(c => {
              const acta = actas.find(a => a.id === c.acta_id)
              return (
                <button key={c.id} onClick={() => setCuo(c)}
                  className="w-full text-left rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2 hover:border-[#404d20] min-h-[44px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] text-[#ececf1]">{c.categoria || 'Todas las categorías'}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5]">{c.tipo ?? 'social'}</span>
                    <span className="ml-auto text-[13px] font-mono tabular-nums text-[#d9f99d]">{fmtPesos(c.valor)}</span>
                  </div>
                  <p className="text-[10.5px] mt-0.5" style={{ color: acta ? '#757584' : '#ff8a7a' }}>
                    {acta ? `Aprobada en acta Nº ${acta.numero} del ${acta.fecha}` : 'Sin acta que la apruebe'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cobranza del período: el cruce que más observan */}
      <Cobranza {...{ asociados, cuotas, cuotasEmitidas, onCambio }} />

      {/* Registro de asociados */}
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Registro de Asociados</h3>
          <span className="text-[12px] font-mono tabular-nums text-[#a6a6b5]">{activos.length} activos</span>
          <button onClick={() => setForm({ activo: true })} className={`${btnPrimario} ml-auto`}><Plus className="w-3.5 h-3.5" /> Agregar</button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Los primeros son los fundadores. El alta se aprueba primero en acta de Comisión Directiva y recién después se
          vuelca acá: los dos registros tienen que coincidir siempre.
        </p>
      </div>

      {asociados.length === 0 ? (
        <p className="text-[13px] text-[#5c5c6b] text-center py-8">Sin asociados cargados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {asociados.map(a => {
            const acta = actas.find(x => x.id === a.acta_alta_id)
            return (
              <div key={a.id} className={card}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-[13.5px] text-[#ececf1] truncate">
                      {a.nombre} {a.fundador && <span className="text-[10px] text-[#facc15]">fundador</span>}
                    </p>
                    <p className="text-[11px] text-[#757584] mt-0.5">{a.categoria || 'Sin categoría'}{a.dni ? ` · DNI ${a.dni}` : ''}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {a.vinculado_reprocann
                        ? <Mini ok txt="Vinculado en REPROCANN" />
                        : <Mini txt="Sin vincular" />}
                      {acta ? <Mini ok txt={`Alta en acta Nº ${acta.numero}`} /> : !a.fundador && <Mini txt="Alta sin acta" alerta />}
                      {a.activo === false && <Mini txt="Baja" alerta />}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setForm(a)} className={btnSutil} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => borrar(a)} className={btnSutil} aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <Modal titulo={form.id ? 'Editar asociado' : 'Nuevo asociado'} onCerrar={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Nombre</span>
                <input className={inputCls} value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
              <label><span className={labelCls}>DNI</span>
                <input className={inputCls} value={form.dni ?? ''} onChange={e => setForm({ ...form, dni: e.target.value })} /></label>
            </div>
            <label><span className={labelCls}>Categoría</span>
              <select className={inputCls} value={form.categoria ?? ''} onChange={e => setForm({ ...form, categoria: e.target.value || null })}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
              {categorias.length === 0 && <span className="text-[10.5px] text-[#f59e0b]">Cargá primero las categorías del estatuto.</span>}
            </label>
            <label><span className={labelCls}>Paciente vinculado (opcional)</span>
              <select className={inputCls} value={form.paciente_id ?? ''} onChange={e => setForm({ ...form, paciente_id: e.target.value || null })}>
                <option value="">No es paciente de la ONG</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select></label>
            <label><span className={labelCls}>Acta que aprobó el alta</span>
              <select className={inputCls} value={form.acta_alta_id ?? ''} onChange={e => setForm({ ...form, acta_alta_id: e.target.value || null })}>
                <option value="">Sin acta</option>
                {actas.filter(a => a.tipo === 'cd').map(a => <option key={a.id} value={a.id}>CD Nº {a.numero} · {a.fecha}</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Fecha de alta</span>
                <input type="date" className={inputCls} value={form.fecha_alta ?? ''} onChange={e => setForm({ ...form, fecha_alta: e.target.value || null })} /></label>
              <label><span className={labelCls}>Vinculación REPROCANN</span>
                <input type="date" className={inputCls} value={form.fecha_vinculacion ?? ''} onChange={e => setForm({ ...form, fecha_vinculacion: e.target.value || null })} /></label>
            </div>
            <div className="flex flex-wrap gap-4">
              <Toggle label="Activo" v={form.activo !== false} on={v => setForm({ ...form, activo: v })} />
              <Toggle label="Fundador" v={!!form.fundador} on={v => setForm({ ...form, fundador: v })} />
              <Toggle label="Vinculado en REPROCANN" v={!!form.vinculado_reprocann} on={v => setForm({ ...form, vinculado_reprocann: v })} />
            </div>
            <button onClick={guardar} className={`${btnPrimario} w-full justify-center`}>Guardar</button>
          </div>
        </Modal>
      )}

      {cat && (
        <Modal titulo={cat.id ? 'Editar categoría' : 'Nueva categoría'} onCerrar={() => setCat(null)}>
          <div className="space-y-3">
            <label><span className={labelCls}>Nombre (como figura en el estatuto)</span>
              <input className={inputCls} value={cat.nombre ?? ''} onChange={e => setCat({ ...cat, nombre: e.target.value })} placeholder="Activo / Adherente / Honorario" /></label>
            <div className="flex flex-wrap gap-4">
              <Toggle label="Requiere REPROCANN" v={!!cat.requiere_reprocann} on={v => setCat({ ...cat, requiere_reprocann: v })} />
              <Toggle label="Con voz y voto" v={cat.con_voto !== false} on={v => setCat({ ...cat, con_voto: v })} />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!cat.nombre) { toast.error('El nombre es obligatorio'); return }
                try { await ongService.guardarCategoria(cat); toast.success('Categoría guardada'); setCat(null); onCambio() }
                catch (e) { toast.error((e as Error).message) }
              }} className={`${btnPrimario} flex-1 justify-center`}>Guardar</button>
              {cat.id && <button onClick={async () => {
                if (!window.confirm(`¿Borrar la categoría "${cat.nombre}"?`)) return
                try { await ongService.borrarCategoria(cat.id!); setCat(null); onCambio() } catch (e) { toast.error((e as Error).message) }
              }} className={btnSutil}><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
        </Modal>
      )}

      {cuo && (
        <Modal titulo={cuo.id ? 'Editar cuota' : 'Nueva cuota'} onCerrar={() => setCuo(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Tipo</span>
                <select className={inputCls} value={cuo.tipo ?? 'social'} onChange={e => setCuo({ ...cuo, tipo: e.target.value })}>
                  <option value="social">Social (pertenencia)</option>
                  <option value="cultivo">Cultivo (prorrateo de costos)</option>
                </select></label>
              <label><span className={labelCls}>Valor</span>
                <input type="number" className={inputCls} value={cuo.valor ?? ''} onChange={e => setCuo({ ...cuo, valor: +e.target.value })} /></label>
            </div>
            <label><span className={labelCls}>Categoría (vacío = todas)</span>
              <select className={inputCls} value={cuo.categoria ?? ''} onChange={e => setCuo({ ...cuo, categoria: e.target.value || null })}>
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select></label>
            <label><span className={labelCls}>Acta que la aprobó</span>
              <select className={inputCls} value={cuo.acta_id ?? ''} onChange={e => setCuo({ ...cuo, acta_id: e.target.value || null })}>
                <option value="">Sin acta</option>
                {actas.map(a => <option key={a.id} value={a.id}>Nº {a.numero} · {a.fecha}</option>)}
              </select></label>
            <label><span className={labelCls}>Vigente desde</span>
              <input type="date" className={inputCls} value={cuo.vigente_desde ?? ''} onChange={e => setCuo({ ...cuo, vigente_desde: e.target.value || null })} /></label>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!cuo.valor) { toast.error('Cargá el valor'); return }
                try { await ongService.guardarCuota(cuo); toast.success('Cuota guardada'); setCuo(null); onCambio() }
                catch (e) { toast.error((e as Error).message) }
              }} className={`${btnPrimario} flex-1 justify-center`}>Guardar</button>
              {cuo.id && <button onClick={async () => {
                try { await ongService.borrarCuota(cuo.id!); setCuo(null); onCambio() } catch (e) { toast.error((e as Error).message) }
              }} className={btnSutil}><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/**
 * Emisión y cobro de la cuota del período. Sin esto no se puede hacer el cruce
 * que más observaciones genera: asociados registrados contra ingresos por
 * cuotas sociales.
 */
function Cobranza({ asociados, cuotas, cuotasEmitidas, onCambio }: {
  asociados: Asociado[]; cuotas: Cuota[]; cuotasEmitidas: CuotaEmitida[]; onCambio: () => void
}) {
  const [periodo, setPeriodo] = useState(periodoActual())
  const [emitiendo, setEmitiendo] = useState(false)
  const [emit, setEmit] = useState<Partial<CuotaEmitida> | null>(null)
  const r = useMemo(() => resumenCobranza(periodo, cuotasEmitidas, asociados), [periodo, cuotasEmitidas, asociados])
  const delPeriodo = cuotasEmitidas.filter(e => e.periodo === periodo)
  const nombre = (id?: string | null) => asociados.find(a => a.id === id)?.nombre ?? '—'

  const emitir = async () => {
    setEmitiendo(true)
    try {
      const n = await ongService.emitirCuotasDelPeriodo(periodo, asociados, cuotas, cuotasEmitidas)
      toast[n > 0 ? 'success' : 'info'](
        n > 0 ? `${n} cuota${n === 1 ? '' : 's'} emitida${n === 1 ? '' : 's'}` : 'No quedaban cuotas por emitir')
      onCambio()
    } catch (e) { toast.error((e as Error).message) } finally { setEmitiendo(false) }
  }
  const togglePago = async (c: CuotaEmitida) => {
    try {
      await ongService.guardarCuotaEmitida({
        id: c.id, pagada: !c.pagada,
        fecha_pago: !c.pagada ? new Date().toISOString().slice(0, 10) : null,
      })
      onCambio()
    } catch (e) { toast.error((e as Error).message) }
  }
  const borrarEmitida = async (c: CuotaEmitida, luego?: () => void) => {
    if (!window.confirm(`¿Borrar la cuota de ${nombre(c.asociado_id)} del período ${c.periodo}?`)) return
    try { await ongService.borrarCuotaEmitida(c.id); toast.success('Borrada'); luego?.(); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className={card}>
      <div className="flex items-center gap-2 flex-wrap">
        <Receipt className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Cobranza del período</h3>
        <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12px] text-[#ececf1] min-h-[44px] sm:min-h-0" />
        <button onClick={emitir} disabled={emitiendo || asociados.length === 0} className={`${btnPrimario} ml-auto`}>
          <Plus className="w-3.5 h-3.5" /> Emitir a los activos
        </button>
      </div>
      <p className="text-[11.5px] text-[#5c5c6b] mt-2">
        Lo que un control cruza: cuántos asociados figuran registrados contra cuántas cuotas ingresaron.
        Si alguien figura como asociado, tiene que tener su cuota.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#1f1f2b]">
        <Kpi t="Activos" v={String(r.asociadosActivos)} c="#a6a6b5" />
        <Kpi t="Emitidas" v={String(r.emitidas)} c={r.sinEmitir > 0 ? '#ff8a7a' : '#d9f99d'} />
        <Kpi t="Cobradas" v={`${r.pagadas}/${r.emitidas}`} c="#bef264" />
        <Kpi t="Ingresado" v={fmtPesos(r.montoCobrado)} c="#facc15" />
      </div>
      {r.sinEmitir > 0 && (
        <p className="text-[11.5px] text-[#ff8a7a] mt-2">
          {r.sinEmitir} asociado{r.sinEmitir === 1 ? '' : 's'} activo{r.sinEmitir === 1 ? '' : 's'} sin cuota emitida en este período.
        </p>
      )}
      {cuotas.length === 0 && (
        <p className="text-[11.5px] text-[#f59e0b] mt-2">
          Cargá primero el valor de la cuota (aprobado en acta) para poder emitirlas.
        </p>
      )}

      {delPeriodo.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {delPeriodo.map(c => (
            <div key={c.id}
              className="flex items-center gap-2 rounded-lg bg-[#15151d] border border-[#1f1f2b] px-2 sm:px-3 py-2 min-h-[44px]">
              {/* El toggle de pago es lo que más se usa: queda en el cuerpo de la fila */}
              <button onClick={() => togglePago(c)} className="flex items-center gap-2 flex-1 min-w-0 text-left self-stretch min-h-[40px]"
                aria-label={c.pagada ? 'Marcar como impaga' : 'Marcar como pagada'}>
                <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={c.pagada ? { background: '#a3e635', borderColor: '#a3e635' } : { borderColor: '#2a2a3a' }}>
                  {c.pagada && <Check className="w-3 h-3 text-[#07070b]" />}
                </span>
                <span className="text-[12.5px] text-[#ececf1] truncate">{nombre(c.asociado_id)}</span>
                <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5] flex-shrink-0">{c.tipo}</span>
                <span className="ml-auto text-[12.5px] font-mono tabular-nums flex-shrink-0"
                  style={{ color: c.pagada ? '#bef264' : '#757584' }}>{fmtPesos(c.monto)}</span>
              </button>
              <button onClick={() => setEmit(c)} className={btnSutil} aria-label="Editar cuota"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => borrarEmitida(c)} className={btnSutil} aria-label="Borrar cuota"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {emit && (
        <Modal titulo={`Cuota de ${nombre(emit.asociado_id)}`} onCerrar={() => setEmit(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Período</span>
                <input type="month" className={inputCls} value={emit.periodo ?? ''}
                  onChange={e => setEmit({ ...emit, periodo: e.target.value })} /></label>
              <label><span className={labelCls}>Monto</span>
                <input type="number" className={inputCls} value={emit.monto ?? ''}
                  onChange={e => setEmit({ ...emit, monto: +e.target.value })} /></label>
              <label><span className={labelCls}>Tipo</span>
                <select className={inputCls} value={emit.tipo ?? 'social'} onChange={e => setEmit({ ...emit, tipo: e.target.value })}>
                  <option value="social">social</option>
                  <option value="cultivo">cultivo</option>
                </select></label>
              <label><span className={labelCls}>Fecha de pago</span>
                <input type="date" className={inputCls} value={emit.fecha_pago ?? ''}
                  onChange={e => setEmit({ ...emit, fecha_pago: e.target.value || null })} /></label>
            </div>
            <label><span className={labelCls}>Medio de pago</span>
              <input className={inputCls} value={emit.medio ?? ''} placeholder="Efectivo / transferencia"
                onChange={e => setEmit({ ...emit, medio: e.target.value })} /></label>
            <label><span className={labelCls}>Notas</span>
              <input className={inputCls} value={emit.notas ?? ''}
                onChange={e => setEmit({ ...emit, notas: e.target.value })} /></label>
            <Toggle label="Pagada" v={!!emit.pagada} on={v => setEmit({ ...emit, pagada: v })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={async () => {
              try { await ongService.guardarCuotaEmitida(emit); toast.success('Cuota actualizada'); setEmit(null); onCambio() }
              catch (e) { toast.error((e as Error).message) }
            }} className={`${btnPrimario} flex-1`}>Guardar</button>
            <button onClick={() => borrarEmitida(emit as CuotaEmitida, () => setEmit(null))} className={btnSutil}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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

// ===================== COHERENCIA =====================

const ICONO: Record<Chequeo['estado'], { Ic: typeof CheckCircle2; color: string; label: string }> = {
  ok: { Ic: CheckCircle2, color: '#bef264', label: 'En regla' },
  alerta: { Ic: AlertTriangle, color: '#f59e0b', label: 'Atención' },
  error: { Ic: XCircle, color: '#ff8a7a', label: 'Observable' },
  sin_datos: { Ic: HelpCircle, color: '#5c5c6b', label: 'Sin datos' },
}

export function Coherencia(props: {
  entidad: Entidad | null; actas: Acta[]; libros: Libro[]; asociados: Asociado[]
  categorias: CategoriaSocio[]; cuotas: Cuota[]; pacientes: number; plantasFloracion: number
}) {
  const chequeos = chequeosCoherencia(props)
  const errores = chequeos.filter(c => c.estado === 'error').length
  const alertas = chequeos.filter(c => c.estado === 'alerta').length

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Coherencia entre libros</h3>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b]">
          Los organismos de control no miran sólo que estén los papeles: verifican que todos los libros cuenten la misma
          historia. Las <b className="text-[#a6a6b5]">inconsistencias entre libros</b>, más que la falta de
          documentación, son la principal causa de observaciones. Acá corren esos mismos cruces.
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <Contador n={errores} txt="observables" color="#ff8a7a" />
          <Contador n={alertas} txt="para revisar" color="#f59e0b" />
          <Contador n={chequeos.filter(c => c.estado === 'ok').length} txt="en regla" color="#bef264" />
        </div>
      </div>

      <div className="space-y-2">
        {chequeos.map(c => {
          const { Ic, color, label } = ICONO[c.estado]
          return (
            <div key={c.clave} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Ic className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[#ececf1]">{c.titulo}</span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ color, background: `${color}1a` }}>{label}</span>
                    <span className="ml-auto text-[12.5px] font-mono tabular-nums" style={{ color }}>{c.valor}</span>
                  </div>
                  <p className="text-[11.5px] text-[#a6a6b5] mt-1">{c.detalle}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Contador({ n, txt, color }: { n: number; txt: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[20px] font-mono tabular-nums font-bold leading-none" style={{ color }}>{n}</span>
      <span className="text-[11px] text-[#757584]">{txt}</span>
    </div>
  )
}

// ===================== auxiliares =====================

function Mini({ txt, ok, alerta }: { txt: string; ok?: boolean; alerta?: boolean }) {
  const c = ok ? { t: '#bef264', b: 'rgba(163,230,53,0.12)', br: '#404d20' }
    : alerta ? { t: '#ff8a7a', b: 'rgba(122,40,32,0.15)', br: '#7a2820' }
      : { t: '#8f8f9f', b: 'rgba(180,180,200,0.06)', br: '#2a2a3a' }
  return <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: c.t, background: c.b, borderColor: c.br }}>{txt}</span>
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => on(!v)}
      className="inline-flex items-center gap-2 text-[12.5px] text-[#d4d4dd] min-h-[44px] sm:min-h-0">
      <span className="w-4 h-4 rounded border flex items-center justify-center"
        style={v ? { background: '#a3e635', borderColor: '#a3e635' } : { borderColor: '#2a2a3a' }}>
        {v && <Check className="w-3 h-3 text-[#07070b]" />}
      </span>
      {label}
    </button>
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
