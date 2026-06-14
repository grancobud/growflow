// PaginaPacientes — "Registro": fichero de pacientes REPROCANN de la asociacion.
// Cards con estado de credencial + alerta de vencimiento, detalle con visor de PDF,
// alta/edicion con carga de credencial (PDF) y foto.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  IdCard, Plus, X, Search, Loader2, Trash2, Pencil, Upload, FileText,
  ExternalLink, User, Phone, Mail, MapPin, Stethoscope, ShieldCheck, AlertTriangle, Sprout, Ruler,
} from 'lucide-react'
import {
  registroService, ESTADOS_REPROCANN, MODALIDADES, diasParaVencer,
  type Paciente, type EstadoReprocann,
} from '../lib/registro'
import { cultivoService, type ResumenPlanta } from '../lib/cultivo'
import { MODO_DEMO } from '../lib/supabase'
import { leerCredencial, OCR_DISPONIBLE } from '../lib/ocr'

const COLOR_ESTADO: Record<EstadoReprocann, { text: string; bg: string; border: string }> = {
  Vigente:      { text: '#bef264', bg: 'rgba(163,230,53,0.14)', border: '#404d20' },
  'En tramite': { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
  Vencido:      { text: '#ff8a7a', bg: 'rgba(122,40,32,0.15)', border: '#7a2820' },
  Rechazado:    { text: '#8f8f9f', bg: 'rgba(180,180,200,0.06)', border: '#2a2a3a' },
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

const fmtFecha = (f: string | null) =>
  f ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function BadgeVencimiento({ p }: { p: Paciente }) {
  const d = diasParaVencer(p)
  if (d == null) return null
  if (d < 0) return <span className="inline-flex items-center gap-1 text-[10px] text-[#ff8a7a]"><AlertTriangle className="w-3 h-3" />Vencida hace {Math.abs(d)}d</span>
  if (d <= 30) return <span className="inline-flex items-center gap-1 text-[10px] text-[#f59e0b]"><AlertTriangle className="w-3 h-3" />Vence en {d}d</span>
  return <span className="inline-flex items-center gap-1 text-[10px] text-[#5c5c6b]"><ShieldCheck className="w-3 h-3" />Vence {fmtFecha(p.reprocann_vencimiento)}</span>
}

export default function PaginaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoReprocann | 'Todos'>('Todos')
  const [modalForm, setModalForm] = useState(false)
  const [editar, setEditar] = useState<Paciente | null>(null)
  const [detalle, setDetalle] = useState<Paciente | null>(null)

  const cargar = useCallback(async () => {
    try {
      setPacientes(await registroService.getPacientes())
    } catch (err) {
      toast.error(`Error cargando pacientes: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const borrar = async (p: Paciente) => {
    if (!window.confirm(`¿Borrar la ficha de "${p.nombre_completo}"? No se puede deshacer.`)) return
    try {
      await registroService.eliminarPaciente(p.id)
      toast.success('Ficha borrada')
      setDetalle(null)
      cargar()
    } catch (err) {
      toast.error(`No se pudo borrar: ${(err as Error).message}`)
    }
  }

  const q = busqueda.trim().toLowerCase()
  const filtrados = pacientes.filter(p => {
    if (filtroEstado !== 'Todos' && p.reprocann_estado !== filtroEstado) return false
    if (!q) return true
    return (p.nombre_completo.toLowerCase().includes(q) || (p.dni ?? '').toLowerCase().includes(q) || (p.reprocann_nro ?? '').toLowerCase().includes(q))
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Registro</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {pacientes.length} paciente{pacientes.length === 1 ? '' : 's'} · REPROCANN
            </div>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b]" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar nombre / DNI / N°"
              className="pl-8 pr-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 w-[180px]" />
          </div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)}
            className="px-2.5 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11.5px] text-[#a6a6b5] focus:outline-none focus:border-[#a3e635]/60 cursor-pointer">
            <option value="Todos">Todos</option>
            {ESTADOS_REPROCANN.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={() => { setEditar(null); setModalForm(true) }} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Paciente</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-20">
        {/* Tarjeta resumen de habilitaciones REPROCANN */}
        <ResumenHabilitaciones pacientes={pacientes} />

        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[128px] animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
              <IdCard className="w-5 h-5 text-[#5c5c6b]" />
            </div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">
              {pacientes.length === 0 ? 'Sin pacientes cargados' : 'Sin resultados'}
            </div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">
              {pacientes.length === 0 ? 'Agregá la primera ficha de paciente REPROCANN.' : 'Probá con otro filtro o búsqueda.'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {filtrados.map(p => {
              const ce = COLOR_ESTADO[p.reprocann_estado]
              const inicial = p.nombre_completo.charAt(0).toUpperCase()
              return (
                <div key={p.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#a3e635]/12 border border-[#404d20] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.foto_url
                          ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-[14px] font-display font-bold text-[#d9f99d]">{inicial}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setDetalle(p)}
                          className="font-display font-semibold text-[14px] text-[#ececf1] truncate hover:text-[#bef264] transition-colors text-left block max-w-full"
                          title="Ver ficha">{p.nombre_completo}</button>
                        <p className="text-[11px] text-[#757584] truncate mt-0.5">
                          {p.dni ? `DNI ${p.dni}` : 'Sin DNI'}{p.reprocann_nro ? ` · N° ${p.reprocann_nro}` : ''}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium flex-shrink-0"
                        style={{ color: ce.text, background: ce.bg, borderColor: ce.border }}>
                        {p.reprocann_estado}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <BadgeVencimiento p={p} />
                      <div className="flex items-center gap-2">
                        {p.socio && <span className="text-[10px] text-[#a78bfa]">Socio</span>}
                        {p.credencial_url && <FileText className="w-3.5 h-3.5 text-[#38bdf8]" aria-label="Tiene credencial PDF" />}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button onClick={() => setDetalle(p)} className={btnSutil}><User className="w-3.5 h-3.5" /> Ver ficha</button>
                      <button onClick={() => { setEditar(p); setModalForm(true) }} className={btnSutil}><Pencil className="w-3.5 h-3.5" /> Editar</button>
                      <button onClick={() => borrar(p)} className="p-1.5 text-[#46464f] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors ml-auto" title="Borrar ficha">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalForm && (
        <ModalPaciente paciente={editar} onCerrar={() => setModalForm(false)}
          onGuardado={() => { setModalForm(false); cargar() }} />
      )}
      {detalle && (
        <ModalDetalle paciente={detalle} onCerrar={() => setDetalle(null)}
          onEditar={() => { setEditar(detalle); setDetalle(null); setModalForm(true) }}
          onBorrar={() => borrar(detalle)} />
      )}
    </div>
  )
}

function ResumenHabilitaciones({ pacientes }: { pacientes: Paciente[] }) {
  const totalPlantas = pacientes.reduce((acc, p) => acc + (p.plantas_habilitadas ?? 0), 0)
  const totalM2 = pacientes.reduce((acc, p) => acc + (p.m2_habilitados ?? 0), 0)
  const conHabilitacion = pacientes.filter(p => (p.plantas_habilitadas ?? 0) > 0 || (p.m2_habilitados ?? 0) > 0).length
  return (
    <div className="mb-4 rounded-xl border border-[#404d20] bg-gradient-to-br from-[#a3e635]/[0.07] to-[#101016] p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] font-medium">Habilitación REPROCANN total</div>
          <div className="text-[11px] text-[#5c5c6b] mt-0.5">Suma de lo habilitado a {conHabilitacion} de {pacientes.length} pacientes</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-[#bef264]">
              <Sprout className="w-5 h-5" />
              <span className="font-display font-bold text-[26px] tabular-nums leading-none">{totalPlantas}</span>
            </div>
            <div className="text-[10px] text-[#8f8f9f] mt-1">plantas habilitadas</div>
          </div>
          <div className="w-px h-10 bg-[#1f1f2b]" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-[#38bdf8]">
              <Ruler className="w-5 h-5" />
              <span className="font-display font-bold text-[26px] tabular-nums leading-none">{totalM2 % 1 === 0 ? totalM2 : totalM2.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-[#8f8f9f] mt-1">m² habilitados</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Modal({ titulo, ancho = 'max-w-lg', onCerrar, children }: { titulo: string; ancho?: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} max-h-[90vh] overflow-y-auto rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl`}>
        <div className="sticky top-0 bg-[#101016] flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Dato({ icono: Icono, label, valor }: { icono?: any; label: string; valor: React.ReactNode }) {
  if (valor == null || valor === '' || valor === '—') return null
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icono && <Icono className="w-3.5 h-3.5 text-[#5c5c6b] mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <div className="text-[9.5px] uppercase tracking-[0.14em] text-[#5c5c6b]">{label}</div>
        <div className="text-[12.5px] text-[#d4d4dd] break-words">{valor}</div>
      </div>
    </div>
  )
}

function ModalDetalle({ paciente: p, onCerrar, onEditar, onBorrar }: {
  paciente: Paciente; onCerrar: () => void; onEditar: () => void; onBorrar: () => void
}) {
  const ce = COLOR_ESTADO[p.reprocann_estado]
  const [plantasPac, setPlantasPac] = useState<ResumenPlanta[]>([])
  useEffect(() => { cultivoService.getPlantasDePaciente(p.id).then(setPlantasPac).catch(() => {}) }, [p.id])
  const usoPlantas = plantasPac.filter(pl => pl.activa).length
  return (
    <Modal titulo={p.nombre_completo} ancho="max-w-2xl" onCerrar={onCerrar}>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="px-2 py-0.5 rounded-full border text-[10.5px] font-medium"
          style={{ color: ce.text, background: ce.bg, borderColor: ce.border }}>{p.reprocann_estado}</span>
        {p.socio && <span className="px-2 py-0.5 rounded-full border border-[#463a66] bg-[#8b5cf6]/12 text-[10.5px] text-[#c4b5fd]">Socio</span>}
        {p.modalidad && <span className="text-[11px] text-[#757584]">{p.modalidad}</span>}
        <div className="flex-1" />
        <BadgeVencimiento p={p} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
        <Dato icono={IdCard} label="DNI" valor={p.dni} />
        <Dato icono={IdCard} label="N° REPROCANN" valor={p.reprocann_nro} />
        <Dato icono={User} label="Nacimiento" valor={fmtFecha(p.fecha_nacimiento)} />
        <Dato label="Emisión / Vencimiento" valor={`${fmtFecha(p.reprocann_emision)} → ${fmtFecha(p.reprocann_vencimiento)}`} />
        <Dato icono={Phone} label="Teléfono" valor={p.telefono} />
        <Dato icono={Mail} label="Email" valor={p.email} />
        <Dato icono={MapPin} label="Localidad" valor={[p.localidad, p.provincia].filter(Boolean).join(', ')} />
        <Dato icono={MapPin} label="Domicilio" valor={p.domicilio} />
        <Dato icono={Stethoscope} label="Patología / Indicación" valor={p.patologia} />
        <Dato icono={Stethoscope} label="Médico tratante" valor={[p.medico_tratante, p.matricula_medico && `Mat. ${p.matricula_medico}`].filter(Boolean).join(' · ')} />
        <Dato label="Alta en asociación" valor={fmtFecha(p.fecha_alta)} />
        <Dato icono={Sprout} label="Plantas habilitadas" valor={p.plantas_habilitadas != null ? `${usoPlantas} / ${p.plantas_habilitadas} en uso` : null} />
        <Dato icono={Ruler} label="m² habilitados" valor={p.m2_habilitados != null ? `${p.m2_habilitados} m²` : null} />
      </div>
      {p.notas && <div className="mt-2"><Dato label="Notas" valor={p.notas} /></div>}

      {/* Credencial PDF */}
      <div className="mt-4 pt-4 border-t border-[#1f1f2b]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] mb-2">Credencial REPROCANN</div>
        {p.credencial_url ? (
          <div>
            <div className="rounded-lg overflow-hidden border border-[#2a2a3a] bg-[#15151d]">
              <iframe src={p.credencial_url} title="Credencial" className="w-full h-[360px]" />
            </div>
            <a href={p.credencial_url} target="_blank" rel="noreferrer" className={`${btnSutil} mt-2`}>
              <ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña nueva
            </a>
          </div>
        ) : (
          <p className="text-[11.5px] text-[#5c5c6b]">Sin credencial cargada. Editá la ficha para subir el PDF.</p>
        )}
      </div>

      {/* Plantas asignadas */}
      <div className="mt-4 pt-4 border-t border-[#1f1f2b]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] mb-2">Plantas en cultivo para este paciente ({plantasPac.length})</div>
        {plantasPac.length === 0 ? (
          <p className="text-[11.5px] text-[#5c5c6b]">Todavía no hay plantas asignadas. Asigná el paciente desde la planta (Plantas → ver ficha).</p>
        ) : (
          <ul className="space-y-1.5">
            {plantasPac.map(pl => (
              <li key={pl.id} className="flex items-center gap-2 rounded-lg border border-[#1f1f2b] bg-[#0d0d13] px-3 py-2">
                <Sprout className="w-3.5 h-3.5 text-[#bef264] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] text-[#ececf1]">{pl.nombre}</span>
                  {pl.codigo && <span className="ml-2 font-mono text-[10px] text-[#5c5c6b]">{pl.codigo}</span>}
                </div>
                <span className="text-[10px] text-[#757584]">{pl.fase}</span>
                {pl.codigo && <Link to={`/p/${pl.codigo}`} className="text-[10.5px] text-[#bef264] hover:underline flex-shrink-0">Historia</Link>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={onEditar} className={`${btnPrimario} flex-1 justify-center`}><Pencil className="w-3.5 h-3.5" /> Editar</button>
        <button onClick={onBorrar} className="px-3 py-2 rounded-lg border border-[#7a2820] bg-[#7a2820]/15 hover:bg-[#7a2820]/25 text-[12px] text-[#ff8a7a] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </Modal>
  )
}

type FormState = {
  nombre_completo: string; dni: string; fecha_nacimiento: string; telefono: string; email: string
  localidad: string; provincia: string; domicilio: string
  reprocann_nro: string; reprocann_estado: EstadoReprocann; reprocann_emision: string; reprocann_vencimiento: string
  modalidad: string; patologia: string; medico_tratante: string; matricula_medico: string
  plantas_habilitadas: string; m2_habilitados: string
  socio: boolean; fecha_alta: string; notas: string
}

function ModalPaciente({ paciente, onCerrar, onGuardado }: {
  paciente: Paciente | null; onCerrar: () => void; onGuardado: () => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormState>({
    nombre_completo: paciente?.nombre_completo ?? '', dni: paciente?.dni ?? '',
    fecha_nacimiento: paciente?.fecha_nacimiento ?? '', telefono: paciente?.telefono ?? '',
    email: paciente?.email ?? '', localidad: paciente?.localidad ?? '', provincia: paciente?.provincia ?? '',
    domicilio: paciente?.domicilio ?? '', reprocann_nro: paciente?.reprocann_nro ?? '',
    reprocann_estado: paciente?.reprocann_estado ?? 'En tramite',
    reprocann_emision: paciente?.reprocann_emision ?? '', reprocann_vencimiento: paciente?.reprocann_vencimiento ?? '',
    modalidad: paciente?.modalidad ?? '', patologia: paciente?.patologia ?? '',
    medico_tratante: paciente?.medico_tratante ?? '', matricula_medico: paciente?.matricula_medico ?? '',
    plantas_habilitadas: paciente?.plantas_habilitadas?.toString() ?? '', m2_habilitados: paciente?.m2_habilitados?.toString() ?? '',
    socio: paciente?.socio ?? true, fecha_alta: paciente?.fecha_alta ?? hoy, notas: paciente?.notas ?? '',
  })
  const [credencialUrl, setCredencialUrl] = useState<string | null>(paciente?.credencial_url ?? null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(paciente?.foto_url ?? null)
  const [subiendo, setSubiendo] = useState<'pdf' | 'foto' | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Autocompletar desde el PDF de la credencial (OCR local). Tambien sube el PDF.
  const autocompletar = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Subí el PDF de la credencial REPROCANN'); return }
    setLeyendo(true)
    try {
      const [d] = await Promise.all([
        leerCredencial(file),
        registroService.subirCredencial(file).then(setCredencialUrl).catch(() => {}),
      ])
      const ESTADOS = ESTADOS_REPROCANN as readonly string[]
      const MODS = MODALIDADES as readonly string[]
      setForm(f => ({
        ...f,
        nombre_completo: d.nombre_completo || f.nombre_completo,
        dni: d.dni || f.dni,
        fecha_nacimiento: /^\d{4}-\d{2}-\d{2}$/.test(d.fecha_nacimiento || '') ? d.fecha_nacimiento! : f.fecha_nacimiento,
        telefono: d.telefono || f.telefono,
        email: d.email || f.email,
        localidad: d.localidad || f.localidad,
        provincia: d.provincia || f.provincia,
        domicilio: d.domicilio || f.domicilio,
        reprocann_nro: d.reprocann_nro || f.reprocann_nro,
        reprocann_estado: (ESTADOS.includes(d.reprocann_estado || '') ? d.reprocann_estado : f.reprocann_estado) as EstadoReprocann,
        reprocann_emision: /^\d{4}-\d{2}-\d{2}$/.test(d.reprocann_emision || '') ? d.reprocann_emision! : f.reprocann_emision,
        reprocann_vencimiento: /^\d{4}-\d{2}-\d{2}$/.test(d.reprocann_vencimiento || '') ? d.reprocann_vencimiento! : f.reprocann_vencimiento,
        modalidad: MODS.includes(d.modalidad || '') ? d.modalidad! : f.modalidad,
        plantas_habilitadas: d.plantas_habilitadas != null && d.plantas_habilitadas !== '' ? String(d.plantas_habilitadas) : f.plantas_habilitadas,
        m2_habilitados: d.m2_habilitados != null && d.m2_habilitados !== '' ? String(d.m2_habilitados) : f.m2_habilitados,
        patologia: d.patologia || f.patologia,
        medico_tratante: d.medico_tratante || f.medico_tratante,
        matricula_medico: d.matricula_medico || f.matricula_medico,
      }))
      toast.success('Datos leídos de la credencial. Revisalos y guardá.')
    } catch (err) {
      toast.error(`No se pudo leer la credencial: ${(err as Error).message}`)
    } finally {
      setLeyendo(false)
    }
  }

  const subirPdf = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('La credencial debe ser un PDF'); return }
    setSubiendo('pdf')
    try { setCredencialUrl(await registroService.subirCredencial(file)); toast.success('Credencial cargada') }
    catch (err) { toast.error(`No se pudo subir: ${(err as Error).message}`) }
    finally { setSubiendo(null) }
  }
  const subirFoto = async (file: File) => {
    setSubiendo('foto')
    try { setFotoUrl(await registroService.subirFotoPaciente(file)); toast.success('Foto cargada') }
    catch (err) { toast.error(`No se pudo subir: ${(err as Error).message}`) }
    finally { setSubiendo(null) }
  }

  const guardar = async () => {
    if (!form.nombre_completo.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    const limpio = (s: string) => s.trim() || null
    const payload: Partial<Paciente> = {
      nombre_completo: form.nombre_completo.trim(), dni: limpio(form.dni),
      fecha_nacimiento: form.fecha_nacimiento || null, telefono: limpio(form.telefono), email: limpio(form.email),
      localidad: limpio(form.localidad), provincia: limpio(form.provincia), domicilio: limpio(form.domicilio),
      reprocann_nro: limpio(form.reprocann_nro), reprocann_estado: form.reprocann_estado,
      reprocann_emision: form.reprocann_emision || null, reprocann_vencimiento: form.reprocann_vencimiento || null,
      modalidad: (form.modalidad || null) as Paciente['modalidad'],
      patologia: limpio(form.patologia), medico_tratante: limpio(form.medico_tratante), matricula_medico: limpio(form.matricula_medico),
      plantas_habilitadas: form.plantas_habilitadas.trim() === '' ? null : parseInt(form.plantas_habilitadas),
      m2_habilitados: form.m2_habilitados.trim() === '' ? null : parseFloat(form.m2_habilitados),
      socio: form.socio, fecha_alta: form.fecha_alta || null, notas: limpio(form.notas),
      credencial_url: credencialUrl, foto_url: fotoUrl,
    }
    try {
      if (paciente) { await registroService.actualizarPaciente(paciente.id, payload); toast.success('Ficha actualizada') }
      else { await registroService.crearPaciente(payload as any); toast.success('Paciente agregado') }
      onGuardado()
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`); setGuardando(false)
    }
  }

  return (
    <Modal titulo={paciente ? 'Editar ficha' : 'Nuevo paciente'} ancho="max-w-2xl" onCerrar={onCerrar}>
      <div className="space-y-3">
        {OCR_DISPONIBLE && (
          <label className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-[#a78bfa]/40 bg-[#a78bfa]/5 hover:bg-[#a78bfa]/10 transition-colors cursor-pointer ${leyendo ? 'opacity-60 pointer-events-none' : ''}`}>
            {leyendo ? <Loader2 className="w-4 h-4 animate-spin text-[#c4b5fd]" /> : <FileText className="w-4 h-4 text-[#c4b5fd]" />}
            <span className="text-[12px] font-medium text-[#c4b5fd]">
              {leyendo ? 'Leyendo la credencial con IA local…' : 'Subir credencial PDF y autocompletar'}
            </span>
            <input type="file" accept="application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) autocompletar(f); e.target.value = '' }} />
          </label>
        )}
        <div>
          <label className={labelCls}>Nombre completo *</label>
          <input autoFocus className={inputCls} placeholder="Juan Pérez" value={form.nombre_completo}
            onChange={e => set('nombre_completo', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>DNI</label><input className={inputCls} placeholder="30.123.456" value={form.dni} onChange={e => set('dni', e.target.value)} /></div>
          <div><label className={labelCls}>Nacimiento</label><input type="date" className={inputCls} value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Teléfono</label><input className={inputCls} placeholder="11 5555-5555" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" placeholder="paciente@mail.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Localidad</label><input className={inputCls} value={form.localidad} onChange={e => set('localidad', e.target.value)} /></div>
          <div><label className={labelCls}>Provincia</label><input className={inputCls} value={form.provincia} onChange={e => set('provincia', e.target.value)} /></div>
        </div>
        <div><label className={labelCls}>Domicilio</label><input className={inputCls} value={form.domicilio} onChange={e => set('domicilio', e.target.value)} /></div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">REPROCANN</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>N° de registro</label><input className={inputCls} value={form.reprocann_nro} onChange={e => set('reprocann_nro', e.target.value)} /></div>
          <div><label className={labelCls}>Estado</label>
            <select className={inputCls} value={form.reprocann_estado} onChange={e => set('reprocann_estado', e.target.value)}>
              {ESTADOS_REPROCANN.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Emisión</label><input type="date" className={inputCls} value={form.reprocann_emision} onChange={e => set('reprocann_emision', e.target.value)} /></div>
          <div><label className={labelCls}>Vencimiento</label><input type="date" className={inputCls} value={form.reprocann_vencimiento} onChange={e => set('reprocann_vencimiento', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Modalidad</label>
            <select className={inputCls} value={form.modalidad} onChange={e => set('modalidad', e.target.value)}>
              <option value="">Sin definir</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-[12px] text-[#d4d4dd] cursor-pointer">
              <input type="checkbox" checked={form.socio} onChange={e => set('socio', e.target.checked)} className="accent-[#a3e635]" />
              Socio de la asociación
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Plantas habilitadas</label><input className={inputCls} type="number" min="0" placeholder="9" value={form.plantas_habilitadas} onChange={e => set('plantas_habilitadas', e.target.value)} /></div>
          <div><label className={labelCls}>m² habilitados</label><input className={inputCls} type="number" min="0" step="0.5" placeholder="4" value={form.m2_habilitados} onChange={e => set('m2_habilitados', e.target.value)} /></div>
        </div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Datos médicos (opcional)</div></div>
        <div><label className={labelCls}>Patología / Indicación</label><input className={inputCls} placeholder="Dolor crónico, epilepsia, insomnio..." value={form.patologia} onChange={e => set('patologia', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Médico tratante</label><input className={inputCls} value={form.medico_tratante} onChange={e => set('medico_tratante', e.target.value)} /></div>
          <div><label className={labelCls}>Matrícula</label><input className={inputCls} value={form.matricula_medico} onChange={e => set('matricula_medico', e.target.value)} /></div>
        </div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Adjuntos</div></div>
        {MODO_DEMO && <p className="text-[10.5px] text-[#f59e0b] -mt-1">Modo demo: los archivos quedan en este navegador (límite de tamaño).</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Credencial (PDF)</label>
            <label className={`${btnSutil} w-full justify-center cursor-pointer`}>
              {subiendo === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : credencialUrl ? <FileText className="w-3.5 h-3.5 text-[#38bdf8]" /> : <Upload className="w-3.5 h-3.5" />}
              {credencialUrl ? 'PDF cargado' : 'Subir PDF'}
              <input type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirPdf(f) }} />
            </label>
          </div>
          <div>
            <label className={labelCls}>Foto</label>
            <label className={`${btnSutil} w-full justify-center cursor-pointer`}>
              {subiendo === 'foto' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {fotoUrl ? 'Foto cargada' : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f) }} />
            </label>
          </div>
        </div>

        <div><label className={labelCls}>Notas</label><textarea className={inputCls} rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} /></div>

        <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <IdCard className="w-3.5 h-3.5" />}
          {paciente ? 'Guardar cambios' : 'Agregar paciente'}
        </button>
      </div>
    </Modal>
  )
}
