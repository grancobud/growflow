// Plantillas institucionales.
//
// Estos documentos no cuelgan de un registro: una designación o un comodato no
// salen de una dispensa como sale un recibo. Por eso van en su propia lista, y
// se completan con lo que la app ya sabe de la entidad, las autoridades y las
// variedades en cultivo.
//
// Son los instrumentos que la Resolución 1780 pide y que hasta acá eran sólo un
// tilde en la lista de requisitos. Un tilde dice "lo tengo"; esto es el papel.

import { useState } from 'react'
import { toast } from 'sonner'
import { FileSignature } from 'lucide-react'
import { ddjjMandato } from '../../lib/documentosLegales'
import { designacion, comodato, informeGeneticas } from '../../lib/documentosInstitucionales'
import type { DocumentoGenerado } from '../../lib/documentosLegales'
import type { Entidad, Asociado } from '../../lib/ong'
import type { Paciente } from '../../lib/registro'
import { VisorDocumento } from './ActaParaLibro'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#7d7d8e] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium mb-1'
const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b] p-3 sm:p-4'

type Plantilla =
  | 'director_medico' | 'responsable_tecnico'
  | 'comodato_sede' | 'comodato_predio'
  | 'geneticas' | 'mandato'

const PLANTILLAS: { id: Plantilla; label: string; detalle: string }[] = [
  { id: 'director_medico', label: 'Designación de Director Médico',
    detalle: 'Constancia del acto de la Comisión Directiva. Remite al acta donde se resolvió.' },
  { id: 'responsable_tecnico', label: 'Designación de Responsable Técnico',
    detalle: 'Quien responde por el cultivo y firma el plan de cultivo.' },
  { id: 'comodato_sede', label: 'Comodato de sede social',
    detalle: 'Acredita el uso del inmueble. ARCA lo pide para la exención de ganancias.' },
  { id: 'comodato_predio', label: 'Comodato de predio de cultivo',
    detalle: 'Uno por predio. Va junto con la georreferenciación y el aviso al municipio.' },
  { id: 'geneticas', label: 'Informe de genéticas',
    detalle: 'Declara las variedades en cultivo y el compromiso de análisis por lote.' },
  { id: 'mandato', label: 'Mandato de gestión operativa',
    detalle: 'Lo firma cada asociado. Es lo que sostiene que la entrega no es una compraventa.' },
]

export interface VariedadFicha {
  nombre: string
  tipo?: string | null
  thc_estimado?: number | null
  cbd_estimado?: number | null
}

export function PlantillasInstitucionales({
  entidad, asociados, pacientes, autoridades, variedades, actas,
}: {
  entidad: Entidad | null
  asociados: Asociado[]
  pacientes: Paciente[]
  autoridades: { nombre: string; cargo: string; activo?: boolean }[]
  variedades: VariedadFicha[]
  actas: { numero: number; fecha: string; tipo: string }[]
}) {
  const [abierta, setAbierta] = useState<Plantilla | null>(null)
  const [quien, setQuien] = useState('')
  const [dato, setDato] = useState('')
  const [doc, setDoc] = useState<DocumentoGenerado | null>(null)

  const activas = autoridades.filter(a => a.activo !== false)
  // El acta de CD más reciente es a la que suele remitir una designación.
  const ultimaCD = actas
    .filter(a => a.tipo === 'cd')
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]

  const generar = (p: Plantilla) => {
    if (p === 'geneticas') {
      setDoc(informeGeneticas(
        variedades.map(v => ({ nombre: v.nombre, tipo: v.tipo, thc: v.thc_estimado, cbd: v.cbd_estimado })),
        entidad, quien || undefined))
      return
    }
    if (p === 'mandato') {
      const aso = asociados.find(a => a.nombre === quien)
      if (!aso) { toast.error('Elegí el asociado'); return }
      const pac = pacientes.find(x => x.nombre_completo === aso.nombre) ?? null
      setDoc(ddjjMandato(aso, entidad, pac))
      return
    }
    if (p === 'comodato_sede' || p === 'comodato_predio') {
      setDoc(comodato(p === 'comodato_sede' ? 'sede_social' : 'predio_cultivo',
        { comodante: quien || undefined, direccion: dato || undefined }, entidad))
      return
    }
    setDoc(designacion(p, {
      nombre: quien || undefined,
      matricula: p === 'director_medico' ? dato || undefined : undefined,
      titulo: p === 'responsable_tecnico' ? dato || undefined : undefined,
      actaNumero: ultimaCD?.numero,
      actaFecha: ultimaCD?.fecha,
    }, entidad))
  }

  const cfg = PLANTILLAS.find(p => p.id === abierta)
  const esDesignacion = abierta === 'director_medico' || abierta === 'responsable_tecnico'
  const esComodato = abierta === 'comodato_sede' || abierta === 'comodato_predio'

  const etiquetaDato = abierta === 'director_medico' ? 'Matrícula y registro REFEPS'
    : abierta === 'responsable_tecnico' ? 'Título o acreditación'
    : esComodato ? 'Dirección del inmueble' : null
  const etiquetaQuien = esComodato ? 'Quién cede el inmueble'
    : abierta === 'geneticas' ? 'Responsable técnico que firma'
    : abierta === 'mandato' ? 'Asociado' : 'Persona designada'

  return (
    <div className={card}>
      <div className="flex items-center gap-2 flex-wrap">
        <FileSignature className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} />
        <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">Plantillas institucionales</h3>
      </div>
      <p className="text-[11.5px] text-[#7d7d8e] mt-2">
        Los instrumentos que pide la Resolución 1780 y que hasta acá eran sólo un tilde en la lista de
        requisitos. Se completan con lo que ya está cargado; lo que falte queda marcado entre corchetes.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {PLANTILLAS.map(p => (
          <button key={p.id} onClick={() => { setAbierta(p.id); setQuien(''); setDato('') }}
            className="text-left rounded-lg bg-[#15151d] border border-[#1f1f2b] hover:border-[#404d20] px-3 py-2.5 min-h-[44px] transition-colors">
            <p className="text-[12.5px] text-[#ececf1]">{p.label}</p>
            <p className="text-[10.5px] text-[#7d7d8e] leading-snug mt-0.5">{p.detalle}</p>
          </button>
        ))}
      </div>

      {abierta && cfg && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setAbierta(null)}>
          <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#1f1f2b]">
              <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{cfg.label}</h3>
            </div>

            <div className="p-4 space-y-3">
              <label><span className={labelCls}>{etiquetaQuien}</span>
                {abierta === 'mandato' ? (
                  <select className={inputCls} value={quien} onChange={e => setQuien(e.target.value)}>
                    <option value="">Elegir…</option>
                    {asociados.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={quien} onChange={e => setQuien(e.target.value)}
                    list={esDesignacion ? 'autoridades-lista' : undefined}
                    placeholder="Nombre y apellido" />
                )}
              </label>
              <datalist id="autoridades-lista">
                {activas.map(a => <option key={a.nombre} value={a.nombre}>{a.cargo}</option>)}
              </datalist>

              {etiquetaDato && (
                <label><span className={labelCls}>{etiquetaDato}</span>
                  <input className={inputCls} value={dato} onChange={e => setDato(e.target.value)} /></label>
              )}

              {abierta === 'geneticas' && (
                <p className="text-[11px] text-[#7d7d8e] leading-relaxed">
                  Se van a declarar las {variedades.length} variedad{variedades.length === 1 ? '' : 'es'} cargadas
                  en Genéticas, con el perfil de cada ficha.
                </p>
              )}

              {esDesignacion && (
                <p className="text-[11px] text-[#7d7d8e] leading-relaxed">
                  {ultimaCD
                    ? `Va a remitir al Acta de Comisión Directiva N° ${ultimaCD.numero} del ${ultimaCD.fecha}.`
                    : 'No hay actas de Comisión Directiva cargadas: el documento va a salir sin la referencia al acta, que es lo que prueba dónde se resolvió.'}
                </p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#1f1f2b] flex gap-2">
              <button onClick={() => setAbierta(null)} className={btnSutil}>Cancelar</button>
              <button onClick={() => { generar(abierta); setAbierta(null) }} className={`${btnPrimario} flex-1`}>
                Generar
              </button>
            </div>
          </div>
        </div>
      )}

      {doc && (
        <VisorDocumento titulo={doc.titulo} texto={doc.texto} faltantes={doc.faltantes}
          nota="Se imprime y se firma. Lo que quedó entre corchetes hay que completarlo a mano o cargarlo en la app y volver a generarlo."
          onCerrar={() => setDoc(null)} />
      )}
    </div>
  )
}
