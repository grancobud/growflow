// Archivo de papeles de la asociación, de las dos puntas.
//
// Emitidos: lo que la ONG entrega y va a nombre de alguien (constancia de socio,
// recibo de cuota, comprobante de dispensa).
// Gastos: el respaldo de que la plata salió. Sin comprobante, el costo por gramo
// que muestra Econometría es una afirmación sin prueba, y el aporte del paciente
// se compara contra un número que no se puede defender.
//
// Los archivos van a un bucket PRIVADO: en la base se guarda el path y se pide
// una URL firmada para verlos (ver lib/archivos.ts).

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  FileStack, Plus, Pencil, Trash2, Upload, Paperclip, ExternalLink,
  Loader2, ReceiptText, FileCheck2, AlertTriangle,
} from 'lucide-react'
import {
  ongService, resumenDocumentos, BUCKET_DOCS,
  SUBTIPOS_EMITIDO, SUBTIPOS_GASTO, CATEGORIAS_GASTO,
  type DocumentoONG, type Asociado, type Dispensa,
} from '../../lib/ong'
import { urlFirmada } from '../../lib/archivos'
import type { Paciente } from '../../lib/registro'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'
const fmtPesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export function Documentos({ documentos, asociados, pacientes, dispensas, onCambio }: {
  documentos: DocumentoONG[]; asociados: Asociado[]; pacientes: Paciente[]
  dispensas: Dispensa[]; onCambio: () => void
}) {
  const [vista, setVista] = useState<'emitido' | 'gasto'>('emitido')
  const [form, setForm] = useState<Partial<DocumentoONG> | null>(null)
  const r = useMemo(() => resumenDocumentos(documentos), [documentos])
  const lista = documentos.filter(d => d.tipo === vista)

  const nuevo = () => setForm({ tipo: vista, fecha: new Date().toISOString().slice(0, 10) })
  const borrar = async (d: DocumentoONG) => {
    if (!window.confirm(`¿Borrar "${d.descripcion || d.archivo_nombre || 'el documento'}"${d.archivo_path ? ' y su archivo' : ''}?`)) return
    try { await ongService.borrarDocumento(d); toast.success('Borrado'); onCambio() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-center gap-2 flex-wrap">
          <FileStack className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Documentos</h3>
          <button onClick={nuevo} className={`${btnPrimario} ml-auto`}>
            <Plus className="w-3.5 h-3.5" /> {vista === 'emitido' ? 'Emitir documento' : 'Cargar comprobante'}
          </button>
        </div>
        <p className="text-[11.5px] text-[#5c5c6b] mt-2">
          Dos puntas: lo que la asociación <b className="text-[#a6a6b5]">emite</b> a nombre de alguien, y los
          <b className="text-[#a6a6b5]"> comprobantes de gasto</b> que respaldan lo que se pagó. Sin comprobante,
          el costo por gramo es un número que no se puede defender.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#1f1f2b]">
          <Kpi t="Emitidos" v={String(r.emitidos)} c="#c4b5fd" />
          <Kpi t="Comprobantes" v={String(r.gastos)} c="#38bdf8" />
          <Kpi t="Gasto respaldado" v={fmtPesos(r.totalGastos)} c="#facc15" />
          <Kpi t="Con archivo" v={`${r.gastosConArchivo + r.emitidosConArchivo}/${documentos.length}`}
            c={documentos.length > 0 && r.gastosConArchivo + r.emitidosConArchivo < documentos.length ? '#f59e0b' : '#bef264'} />
        </div>

        <div className="flex gap-2 mt-3">
          {(['emitido', 'gasto'] as const).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={`flex items-center gap-1.5 text-[12px] px-3 py-2 min-h-[44px] sm:min-h-0 rounded-lg border transition-colors ${
                vista === v ? 'border-[#a3e635]/50 bg-[#a3e635]/10 text-[#d9f99d]' : 'border-[#2a2a3a] text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
              {v === 'emitido' ? <FileCheck2 className="w-3.5 h-3.5" /> : <ReceiptText className="w-3.5 h-3.5" />}
              {v === 'emitido' ? 'Emitidos' : 'Gastos'}
              <span className="font-mono tabular-nums text-[11px] opacity-70">{v === 'emitido' ? r.emitidos : r.gastos}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reparto del gasto por rubro: el cruce contra Econometría */}
      {vista === 'gasto' && r.porCategoria.length > 0 && (
        <div className={card}>
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Gasto respaldado por rubro</h3>
          <div className="mt-2 space-y-1.5">
            {r.porCategoria.map(c => (
              <div key={c.categoria} className="flex items-center gap-2">
                <span className="text-[11.5px] text-[#a6a6b5] w-32 sm:w-44 truncate flex-shrink-0">{c.categoria}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#15151d] overflow-hidden">
                  <div className="h-full rounded-full bg-[#38bdf8]"
                    style={{ width: `${r.totalGastos > 0 ? (c.monto / r.totalGastos) * 100 : 0}%` }} />
                </div>
                <span className="text-[11.5px] font-mono tabular-nums text-[#ececf1] flex-shrink-0">{fmtPesos(c.monto)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#5c5c6b] mt-2">
            Este total es sólo lo que tiene comprobante cargado acá. Econometría calcula el costo con todos
            los insumos, tengan papel o no: si los números no coinciden, faltan comprobantes.
          </p>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-[13px] text-[#5c5c6b] text-center py-8">
          {vista === 'emitido'
            ? 'Todavía no emitiste ningún documento.'
            : 'Todavía no cargaste comprobantes de gasto.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lista.map(d => (
            <Ficha key={d.id} d={d} asociados={asociados} pacientes={pacientes}
              onEditar={() => setForm(d)} onBorrar={() => borrar(d)} />
          ))}
        </div>
      )}

      {form && (
        <FormDocumento form={form} setForm={setForm} asociados={asociados}
          pacientes={pacientes} dispensas={dispensas} onCambio={onCambio} />
      )}
    </div>
  )
}

function Ficha({ d, asociados, pacientes, onEditar, onBorrar }: {
  d: DocumentoONG; asociados: Asociado[]; pacientes: Paciente[]
  onEditar: () => void; onBorrar: () => void
}) {
  const [abriendo, setAbriendo] = useState(false)
  const aNombreDe = d.asociado_id
    ? asociados.find(a => a.id === d.asociado_id)?.nombre
    : d.paciente_id ? pacientes.find(p => p.id === d.paciente_id)?.nombre_completo : null

  const abrir = async () => {
    if (!d.archivo_path) return
    setAbriendo(true)
    try { window.open(await urlFirmada(BUCKET_DOCS, d.archivo_path), '_blank', 'noopener') }
    catch (e) { toast.error(`No se pudo abrir: ${(e as Error).message}`) }
    finally { setAbriendo(false) }
  }

  return (
    <div className={card}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[13.5px] text-[#ececf1] truncate">
            {d.descripcion || d.subtipo || 'Sin descripción'}
          </p>
          <p className="text-[10.5px] text-[#757584] mt-0.5 truncate">
            {[d.subtipo, d.numero && `Nº ${d.numero}`, d.fecha].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEditar} className={btnSutil} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onBorrar} className={btnSutil} aria-label="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        {d.monto != null && (
          <span className="text-[13px] font-mono tabular-nums font-bold text-[#facc15]">{fmtPesos(d.monto)}</span>
        )}
        {d.proveedor && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5]">{d.proveedor}</span>}
        {d.categoria && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#1f1f2b] text-[#a6a6b5]">{d.categoria}</span>}
        {aNombreDe && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8]">{aNombreDe}</span>}
      </div>

      {d.notas && <p className="text-[11px] text-[#5c5c6b] mt-2">{d.notas}</p>}

      <div className="mt-2 pt-2 border-t border-[#1f1f2b]">
        {d.archivo_path ? (
          <button onClick={abrir} disabled={abriendo}
            className="flex items-center gap-1.5 text-[11.5px] text-[#38bdf8] hover:underline py-2 min-h-[44px] sm:min-h-0">
            {abriendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[220px]">{d.archivo_nombre || 'Ver archivo'}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </button>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] py-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
            Sin archivo adjunto: es una anotación, no un respaldo.
          </p>
        )}
      </div>
    </div>
  )
}

function FormDocumento({ form, setForm, asociados, pacientes, dispensas, onCambio }: {
  form: Partial<DocumentoONG>; setForm: (f: Partial<DocumentoONG> | null) => void
  asociados: Asociado[]; pacientes: Paciente[]; dispensas: Dispensa[]; onCambio: () => void
}) {
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const esGasto = form.tipo === 'gasto'

  const subir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) { toast.error('El archivo supera los 15 MB'); return }
    setSubiendo(true)
    try {
      const { path, nombre } = await ongService.subirArchivoDocumento(file)
      setForm({ ...form, archivo_path: path, archivo_nombre: nombre })
      toast.success('Archivo subido')
    } catch (err) { toast.error(`No se pudo subir: ${(err as Error).message}`) }
    finally { setSubiendo(false) }
  }

  const guardar = async () => {
    if (!form.fecha) { toast.error('Poné la fecha'); return }
    setGuardando(true)
    try { await ongService.guardarDocumento(form); toast.success('Documento guardado'); setForm(null); onCambio() }
    catch (e) { toast.error((e as Error).message) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={() => setForm(null)}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#0d0d12]">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">
            {form.id ? 'Editar documento' : esGasto ? 'Nuevo comprobante de gasto' : 'Nuevo documento emitido'}
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Tipo</span>
              <select className={inputCls} value={form.tipo ?? 'emitido'}
                onChange={e => setForm({ ...form, tipo: e.target.value as DocumentoONG['tipo'], subtipo: null })}>
                <option value="emitido">Emitido por la ONG</option>
                <option value="gasto">Comprobante de gasto</option>
              </select></label>
            <label><span className={labelCls}>Clase</span>
              <select className={inputCls} value={form.subtipo ?? ''}
                onChange={e => setForm({ ...form, subtipo: e.target.value || null })}>
                <option value="">Sin especificar</option>
                {(esGasto ? SUBTIPOS_GASTO : SUBTIPOS_EMITIDO).map(s => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label><span className={labelCls}>Fecha</span>
              <input type="date" className={inputCls} value={form.fecha ?? ''}
                onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
            <label><span className={labelCls}>Número</span>
              <input className={inputCls} value={form.numero ?? ''} placeholder="0001-00001234"
                onChange={e => setForm({ ...form, numero: e.target.value || null })} /></label>
          </div>

          <label><span className={labelCls}>Descripción</span>
            <input className={inputCls} value={form.descripcion ?? ''}
              placeholder={esGasto ? 'Compra de sustrato' : 'Constancia de socio activo'}
              onChange={e => setForm({ ...form, descripcion: e.target.value || null })} /></label>

          {esGasto ? (
            <div className="grid grid-cols-2 gap-3">
              <label><span className={labelCls}>Monto</span>
                <input type="number" className={inputCls} value={form.monto ?? ''}
                  onChange={e => setForm({ ...form, monto: e.target.value === '' ? null : +e.target.value })} /></label>
              <label><span className={labelCls}>Rubro</span>
                <select className={inputCls} value={form.categoria ?? ''}
                  onChange={e => setForm({ ...form, categoria: e.target.value || null })}>
                  <option value="">Sin rubro</option>
                  {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select></label>
              <label className="col-span-2"><span className={labelCls}>Proveedor</span>
                <input className={inputCls} value={form.proveedor ?? ''}
                  onChange={e => setForm({ ...form, proveedor: e.target.value || null })} /></label>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label><span className={labelCls}>Asociado</span>
                  <select className={inputCls} value={form.asociado_id ?? ''}
                    onChange={e => setForm({ ...form, asociado_id: e.target.value || null })}>
                    <option value="">—</option>
                    {asociados.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select></label>
                <label><span className={labelCls}>Paciente</span>
                  <select className={inputCls} value={form.paciente_id ?? ''}
                    onChange={e => setForm({ ...form, paciente_id: e.target.value || null })}>
                    <option value="">—</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select></label>
              </div>
              <label><span className={labelCls}>Dispensa que respalda</span>
                <select className={inputCls} value={form.dispensa_id ?? ''}
                  onChange={e => setForm({ ...form, dispensa_id: e.target.value || null })}>
                  <option value="">—</option>
                  {dispensas.slice(0, 100).map(d => (
                    <option key={d.id} value={d.id}>{d.fecha} · {d.gramos} g</option>
                  ))}
                </select></label>
              <label><span className={labelCls}>Monto (si corresponde)</span>
                <input type="number" className={inputCls} value={form.monto ?? ''}
                  onChange={e => setForm({ ...form, monto: e.target.value === '' ? null : +e.target.value })} /></label>
            </>
          )}

          <label><span className={labelCls}>Notas</span>
            <input className={inputCls} value={form.notas ?? ''}
              onChange={e => setForm({ ...form, notas: e.target.value || null })} /></label>

          {/* Archivo */}
          <div className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
            <span className={labelCls}>Archivo</span>
            {form.archivo_path ? (
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-[#38bdf8] flex-shrink-0" />
                <span className="text-[12px] text-[#d4d4dd] truncate flex-1">{form.archivo_nombre}</span>
                <button onClick={() => setForm({ ...form, archivo_path: null, archivo_nombre: null })}
                  className={btnSutil} aria-label="Quitar archivo"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a3a] py-3 min-h-[44px] cursor-pointer text-[12px] text-[#7dd3fc] hover:border-[#404d20]">
                {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {subiendo ? 'Subiendo…' : 'Subir PDF o foto'}
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={subir} disabled={subiendo} />
              </label>
            )}
            <p className="text-[10.5px] text-[#5c5c6b] mt-2">
              Va a un bucket privado: sólo se ve con sesión iniciada y el enlace caduca.
            </p>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[#1f1f2b] flex gap-2 sticky bottom-0 bg-[#0d0d12]">
          <button onClick={() => setForm(null)} className={btnSutil}>Cancelar</button>
          <button onClick={guardar} disabled={guardando || subiendo} className={`${btnPrimario} flex-1`}>
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
          </button>
        </div>
      </div>
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
