// Cómo se mezcla lo que leyó el OCR de la credencial con lo que ya tiene la ficha.
//
// REGLA: el lector solo llena lo vacío. Antes era `d.campo || f.campo` y ganaba
// lo leído: un OCR que confunde un 8 con un 3 pisaba un DNI bien tipeado sin
// avisar. Spec: openspec/changes/ocr-errores-claros.

import type { DatosCredencial } from './ocr'
import { ESTADOS_REPROCANN, MODALIDADES, type EstadoReprocann } from './registro'

/** Los campos de la ficha que puede llenar la credencial, como strings del formulario. */
export type CamposCredencialForm = {
  nombre_completo: string; dni: string; fecha_nacimiento: string; telefono: string; email: string
  localidad: string; provincia: string; domicilio: string; reprocann_nro: string
  reprocann_estado: EstadoReprocann; reprocann_emision: string; reprocann_vencimiento: string
  modalidad: string; plantas_habilitadas: string; m2_habilitados: string
  patologia: string; medico_tratante: string; matricula_medico: string
}

type Campo = keyof CamposCredencialForm

/**
 * El estado que pone la ficha nueva por defecto. No es un dato que alguien
 * eligió, así que la credencial lo puede reemplazar.
 */
const ESTADO_POR_DEFECTO: EstadoReprocann = 'En tramite'

const esFecha = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
const enLista = (lista: readonly string[]) => (v: string) => lista.includes(v)

/** Qué valor leído es aceptable para cada campo. Los que no figuran aceptan cualquier texto. */
const VALIDO: Partial<Record<Campo, (v: string) => boolean>> = {
  fecha_nacimiento: esFecha,
  reprocann_emision: esFecha,
  reprocann_vencimiento: esFecha,
  reprocann_estado: enLista(ESTADOS_REPROCANN),
  modalidad: enLista(MODALIDADES),
}

const CAMPOS: Campo[] = [
  'nombre_completo', 'dni', 'fecha_nacimiento', 'telefono', 'email', 'localidad', 'provincia',
  'domicilio', 'reprocann_nro', 'reprocann_estado', 'reprocann_emision', 'reprocann_vencimiento',
  'modalidad', 'plantas_habilitadas', 'm2_habilitados', 'patologia', 'medico_tratante', 'matricula_medico',
]

const estaVacio = (campo: Campo, valor: string) =>
  valor.trim() === '' || (campo === 'reprocann_estado' && valor === ESTADO_POR_DEFECTO)

export function fusionarCredencial<F extends CamposCredencialForm>(
  form: F, datos: DatosCredencial,
): { form: F; completados: number; conservados: number } {
  const nuevo = { ...form }
  let completados = 0
  let conservados = 0
  for (const campo of CAMPOS) {
    const crudo = datos[campo]
    if (crudo == null) continue
    const leido = String(crudo).trim()
    if (leido === '' || !(VALIDO[campo]?.(leido) ?? true)) continue
    if (estaVacio(campo, form[campo])) {
      // El cast es por reprocann_estado: VALIDO ya confirmó que está en la lista.
      ;(nuevo as CamposCredencialForm)[campo] = leido as EstadoReprocann
      completados++
    } else if (form[campo].trim() !== leido) {
      conservados++
    }
  }
  return { form: nuevo, completados, conservados }
}
