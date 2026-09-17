// Historia clínica del paciente: la ficha de fondo y la evolución fechada.
//
// Va dentro de la ficha del paciente, detrás de un botón, y no abierta de entrada.
// Es a propósito: la ficha la abre cualquiera con rol real para chequear un DNI o
// un vencimiento, y no todos ellos pasan `puede_ver_clinico()`. Si el bloque se
// renderizara siempre, la mitad de las veces mostraría un error de permisos a
// alguien que no venía a buscar esto.
//
// La sección entera es sólo para administrador y director médico. El RLS ya lo
// garantiza del lado de la base: acá se oculta el botón para que nadie choque
// contra una pared sin entender por qué.

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Stethoscope, Plus, Pencil, Trash2, Save, X, FileText } from 'lucide-react'
import {
  clinicaService, fichaVacia, TIPOS_EVOLUCION, etiquetaEvolucion, colorEvolucion,
  type FichaClinica, type Evolucion, type TipoEvolucion,
} from '../../lib/clinica'
import { btnPrimario, btnSutil } from '../../lib/ui'
import { hoyLocal } from '../../lib/fechaLocal'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#8a8a9c] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#8a8a9c] font-medium mb-1'

const CAMPOS: { k: keyof FichaClinica; label: string; ayuda: string }[] = [
  { k: 'antecedentes', label: 'Antecedentes', ayuda: 'Patologías previas, cirugías, internaciones' },
  { k: 'medicacion_concomitante', label: 'Medicación concomitante', ayuda: 'Qué más toma. Importa por las interacciones' },
  { k: 'alergias', label: 'Alergias', ayuda: 'Medicamentosas y no medicamentosas' },
  { k: 'contraindicaciones', label: 'Contraindicaciones', ayuda: 'Lo que hay que evitar en este paciente' },
  { k: 'objetivo_terapeutico', label: 'Objetivo terapéutico', ayuda: 'Qué se busca lograr. Es contra esto que se mide si sirve' },
  { k: 'notas_medico', label: 'Notas del profesional', ayuda: 'Lo que no entra en los campos de arriba' },
]

export function HistoriaClinica({ pacienteId, pacienteNombre, firmante, matricula, puedeVer }: {
  pacienteId: string
  pacienteNombre: string
  /** Quién firma la evolución: el director médico de la entidad. */
  firmante?: string | null
  matricula?: string | null
  /** Si el rol no ve clínico, ni se ofrece: el RLS lo rechazaría igual. */
  puedeVer: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  const [ficha, setFicha] = useState<FichaClinica | null>(null)
  const [evol, setEvol] = useState<Evolucion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [borrador, setBorrador] = useState<FichaClinica | null>(null)
  const [nueva, setNueva] = useState<{ tipo: TipoEvolucion; fecha: string; texto: string } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    try {
      const [f, e] = await Promise.all([
        clinicaService.getFicha(pacienteId),
        clinicaService.getEvolucion(pacienteId),
      ])
      setFicha(f); setEvol(e)
    } catch (err) {
      // El error se muestra, no se traga: si es de permisos, la persona tiene
      // que saber que le falta rol y no que "no hay datos".
      setError((err as Error).message)
    } finally { setCargando(false) }
  }, [pacienteId])

  useEffect(() => { if (abierta) void cargar() }, [abierta, cargar])

  if (!puedeVer) return null

  const guardarFicha = async () => {
    if (!borrador) return
    try {
      await clinicaService.guardarFicha({ ...borrador, paciente_id: pacienteId, actualizado_por: firmante ?? null })
      toast.success('Ficha clínica guardada')
      setEditandoFicha(false); setBorrador(null); void cargar()
    } catch (e) { toast.error((e as Error).message) }
  }

  const guardarEvolucion = async () => {
    if (!nueva || !nueva.texto.trim()) { toast.error('Escribí el texto de la entrada'); return }
    try {
      await clinicaService.agregarEvolucion({
        paciente_id: pacienteId, fecha: nueva.fecha, tipo: nueva.tipo,
        texto: nueva.texto.trim(), firmado_por: firmante ?? null, matricula: matricula ?? null,
      })
      toast.success('Entrada agregada')
      setNueva(null); void cargar()
    } catch (e) { toast.error((e as Error).message) }
  }

  const borrarEvolucion = async (id: string) => {
    if (!confirm('¿Borrar esta entrada de la historia clínica?')) return
    try {
      await clinicaService.borrarEvolucion(id)
      toast.success('Entrada borrada'); void cargar()
    } catch (e) {
      // El delete pide es_admin(). Si el director médico lo intenta, el RLS lo
      // rechaza y conviene que el mensaje lo explique.
      toast.error(`No se pudo borrar. Sólo un administrador puede: ${(e as Error).message}`)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#1f1f2b]">
      <div className="flex items-center gap-2 flex-wrap">
        <Stethoscope className="w-4 h-4 text-[#f472b6]" strokeWidth={1.8} />
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8a9c]">Historia clínica</span>
        <button onClick={() => setAbierta(v => !v)} className={`${btnSutil} ml-auto`}>
          {abierta ? 'Ocultar' : 'Ver historia'}
        </button>
      </div>

      {!abierta ? (
        <p className="text-[11px] text-[#8a8a9c] mt-2">
          Antecedentes, medicación, objetivo terapéutico y la evolución que escribe el profesional.
          Sólo la ven administrador y director médico.
        </p>
      ) : cargando ? (
        <p className="text-[11.5px] text-[#8a8a9c] mt-3">Cargando la historia…</p>
      ) : error ? (
        <p className="text-[11.5px] text-[#f0a5a5] mt-3">No se pudo abrir: {error}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {/* ---------------- Ficha de fondo ---------------- */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={labelCls} style={{ marginBottom: 0 }}>Ficha</span>
              {!editandoFicha ? (
                <button className={`${btnSutil} ml-auto`}
                  onClick={() => { setBorrador(ficha ?? { paciente_id: pacienteId }); setEditandoFicha(true) }}>
                  <Pencil className="w-3.5 h-3.5" /> {fichaVacia(ficha) ? 'Cargar' : 'Editar'}
                </button>
              ) : (
                <div className="ml-auto flex gap-1.5">
                  <button className={btnSutil} onClick={() => { setEditandoFicha(false); setBorrador(null) }}>
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                  <button className={btnPrimario} onClick={guardarFicha}>
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                </div>
              )}
            </div>

            {editandoFicha && borrador ? (
              <div className="space-y-2.5">
                {CAMPOS.map(c => (
                  <div key={String(c.k)}>
                    <label className={labelCls}>{c.label}</label>
                    <textarea rows={2} className={inputCls} placeholder={c.ayuda}
                      value={(borrador[c.k] as string) ?? ''}
                      onChange={e => setBorrador({ ...borrador, [c.k]: e.target.value })} />
                  </div>
                ))}
              </div>
            ) : fichaVacia(ficha) ? (
              <p className="text-[11.5px] text-[#8a8a9c]">
                Sin ficha cargada. Es lo que da contexto a la evolución: sin antecedentes ni objetivo
                terapéutico, el informe semestral queda en números sueltos.
              </p>
            ) : (
              <div className="space-y-2">
                {CAMPOS.filter(c => ((ficha?.[c.k] as string) ?? '').trim()).map(c => (
                  <div key={String(c.k)}>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#8a8a9c]">{c.label}</div>
                    <p className="text-[12.5px] text-[#ececf1] whitespace-pre-wrap">{ficha?.[c.k] as string}</p>
                  </div>
                ))}
                {ficha?.actualizado_por && (
                  <p className="text-[10.5px] text-[#8a8a9c]">
                    Última edición: {ficha.actualizado_por}
                    {ficha.actualizado_en && ` · ${ficha.actualizado_en.slice(0, 10)}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ---------------- Evolución ---------------- */}
          <div className="pt-3 border-t border-[#1f1f2b]">
            <div className="flex items-center gap-2 mb-2">
              <span className={labelCls} style={{ marginBottom: 0 }}>
                Evolución {evol.length > 0 && `· ${evol.length}`}
              </span>
              {!nueva && (
                <button className={`${btnPrimario} ml-auto`}
                  onClick={() => setNueva({ tipo: 'evolucion', fecha: hoyLocal(), texto: '' })}>
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              )}
            </div>

            {nueva && (
              <div className="rounded-lg bg-[#15151d] border border-[#2a2a3a] p-3 mb-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select className={inputCls} value={nueva.tipo}
                      onChange={e => setNueva({ ...nueva, tipo: e.target.value as TipoEvolucion })}>
                      {TIPOS_EVOLUCION.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Fecha</label>
                    <input type="date" className={inputCls} value={nueva.fecha}
                      onChange={e => setNueva({ ...nueva, fecha: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Texto</label>
                  <textarea rows={4} className={inputCls} autoFocus
                    placeholder="Qué se observó, qué se decidió y por qué."
                    value={nueva.texto} onChange={e => setNueva({ ...nueva, texto: e.target.value })} />
                </div>
                <p className="text-[10.5px] text-[#8a8a9c]">
                  {firmante
                    ? <>Firma como <span className="text-[#a6a6b5]">{firmante}</span>{matricula ? ` · ${matricula}` : ''}.</>
                    : 'Sin director médico designado: la entrada va a quedar sin firma.'}
                </p>
                <div className="flex gap-1.5 justify-end">
                  <button className={btnSutil} onClick={() => setNueva(null)}>
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                  <button className={btnPrimario} onClick={guardarEvolucion}>
                    <Save className="w-3.5 h-3.5" /> Guardar entrada
                  </button>
                </div>
              </div>
            )}

            {evol.length === 0 ? (
              <p className="text-[11.5px] text-[#8a8a9c]">
                Sin entradas todavía. Acá va lo que escribe el profesional: no depende de que haya
                habido una entrega, a diferencia del reporte que carga el paciente.
              </p>
            ) : (
              <div className="space-y-2">
                {evol.map(e => (
                  <div key={e.id} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${colorEvolucion(e.tipo)}22`, color: colorEvolucion(e.tipo) }}>
                        {etiquetaEvolucion(e.tipo)}
                      </span>
                      <span className="text-[11px] text-[#8a8a9c] tabular-nums">{e.fecha}</span>
                      <button onClick={() => borrarEvolucion(e.id)}
                        className="ml-auto text-[#8a8a9c] hover:text-[#ff8a7a] transition-colors p-1"
                        title="Borrar (sólo administrador)">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[12.5px] text-[#ececf1] whitespace-pre-wrap mt-1.5">{e.texto}</p>
                    {e.firmado_por && (
                      <p className="text-[10.5px] text-[#8a8a9c] mt-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" strokeWidth={1.8} />
                        {e.firmado_por}{e.matricula ? ` · ${e.matricula}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10.5px] text-[#8a8a9c]">
            Historia de {pacienteNombre}. Lo que el paciente reporta después de cada entrega vive
            aparte, en Seguimiento: son dos voces distintas y el informe semestral las cruza.
          </p>
        </div>
      )}
    </div>
  )
}
