// Redacción del acta para pasarla al libro.
//
// Los libros de una asociación civil son FÍSICOS y rubricados: el acta se
// transcribe a mano o se imprime y se pega. Esta es la parte que la app no
// cubría: se cargaban los datos y después había que redactar el texto aparte.
//
// El formato sigue el uso habitual de las actas de asociación civil, que es lo
// que esperan IGJ y DPPJ al inspeccionar:
//
//   1. Encabezado con número de acta, lugar, fecha y hora de apertura.
//   2. Constancia de asistencia con los nombres, y de quórum.
//   3. Designación de quién preside y quién labra el acta.
//   4. Orden del día punto por punto, con la resolución y las mayorías.
//   5. Hora de cierre y firmantes.
//
// No inventa nada: lo que no está cargado se marca entre corchetes para que se
// complete a mano. Un acta con un dato inventado es peor que una incompleta.

import { TIPOS_ACTA, type Acta, type Entidad } from './ong'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "13 de agosto de 2026" — las actas se fechan en letras, no en dígitos. */
export function fechaEnLetras(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${d} de ${MESES[m - 1]} de ${a}`
}

const FALTA = (q: string) => `[${q}]`

/**
 * Los ids que usa la app contra el nombre que va en el acta. Se toma de
 * TIPOS_ACTA para que no puedan divergir: cuando estaban duplicados a mano, un
 * acta de Comisión Directiva salía redactada como "los miembros de la cd".
 */
function nombreDelOrgano(tipo: string): string {
  const t = TIPOS_ACTA.find(x => x.id === tipo)
  if (!t) return tipo.replace(/_/g, " ")
  // En el cuerpo del acta las asambleas se nombran completas.
  if (t.id === "asamblea_ordinaria") return "Asamblea General Ordinaria"
  if (t.id === "asamblea_extraordinaria") return "Asamblea General Extraordinaria"
  return t.nombre
}

/** Cómo se anuncia el resultado de un punto en el cuerpo del acta. */
function redactarResultado(p: NonNullable<Acta['orden_del_dia']>[number]): string {
  const votos = [
    p.favor != null ? `${p.favor} voto${p.favor === 1 ? '' : 's'} a favor` : null,
    p.contra ? `${p.contra} en contra` : null,
    p.abstenciones ? `${p.abstenciones} abstención${p.abstenciones === 1 ? '' : 'es'}` : null,
  ].filter(Boolean).join(', ')

  if (p.resultado === 'aprobado') {
    // Sin votos en contra ni abstenciones, la fórmula usual es "por unanimidad".
    const unanime = !p.contra && !p.abstenciones
    return votos
      ? `Se aprueba por ${unanime ? 'unanimidad' : 'mayoría'} (${votos}).`
      : `Se aprueba por ${unanime ? 'unanimidad' : 'mayoría'}.`
  }
  if (p.resultado === 'rechazado') return votos ? `Se rechaza (${votos}).` : 'Se rechaza.'
  return 'Queda pendiente de tratamiento.'
}

export function redactarActa(a: Acta, e: Entidad | null): string {
  const L: string[] = []
  const razon = e?.razon_social || FALTA('razón social')
  const lugar = a.lugar || e?.sede_domicilio || FALTA('lugar')
  const organo = nombreDelOrgano(a.tipo)
  const nombres = a.asistentes_nombres ?? []
  const total = nombres.length || a.asistentes || 0

  L.push(`ACTA N° ${a.numero}`)
  L.push('')
  L.push(
    `En ${lugar}, a los ${fechaEnLetras(a.fecha)}, siendo las ` +
    `${a.hora_inicio || FALTA('hora')} horas, se reúnen los miembros de la ` +
    `${organo} de ${razon}` +
    (a.segunda_convocatoria ? ', en segunda convocatoria' : '') + '.',
  )
  L.push('')

  // --- Asistencia y quórum ---
  if (nombres.length) {
    L.push(`ASISTENCIA. Se encuentran presentes: ${nombres.join(', ')}. ` +
      `Total: ${nombres.length} asistente${nombres.length === 1 ? '' : 's'}.`)
  } else if (a.asistentes) {
    L.push(`ASISTENCIA. Asisten ${a.asistentes} persona${a.asistentes === 1 ? '' : 's'}. ` +
      `${FALTA('completar los nombres: el libro de Asistencia los requiere')}`)
  } else {
    L.push(`ASISTENCIA. ${FALTA('completar quiénes asistieron')}`)
  }

  const req = a.quorum_requerido
  L.push(
    a.quorum_ok === false
      ? `Se hace constar que NO se alcanza el quórum requerido` +
        (req ? ` de ${req} miembros` : '') + `, por lo que no puede sesionarse válidamente.`
      : `Verificado el quórum` + (req ? ` (se requieren ${req}, hay ${total})` : '') +
        `, se declara abierta la sesión.`,
  )
  L.push('')

  // --- Presidencia y redacción ---
  const firmantes = (a.firmantes || '').split(/,| y /).map(f => f.trim()).filter(Boolean)
  L.push(firmantes.length >= 2
    ? `Preside la reunión ${firmantes[0]}, y labra la presente acta ${firmantes[1]}.`
    : `Preside la reunión ${firmantes[0] || FALTA('presidente')}, y labra la presente acta ` +
      `${FALTA('secretario')}.`)
  L.push('')

  // --- Orden del día ---
  const puntos = a.orden_del_dia ?? []
  if (puntos.length) {
    L.push('ORDEN DEL DÍA')
    L.push('')
    puntos.forEach((p, i) => {
      L.push(`${i + 1}) ${p.punto}`)
      L.push(`   ${redactarResultado(p)}`)
      L.push('')
    })
  } else {
    L.push(`ORDEN DEL DÍA. ${FALTA('cargar los puntos tratados')}`)
    L.push('')
  }

  // --- Cierre ---
  L.push(
    `No habiendo más asuntos que tratar, se da por finalizada la reunión siendo ` +
    `las ${a.hora_fin || FALTA('hora de cierre')} horas.`,
  )
  L.push('')
  if (firmantes.length) {
    L.push(...firmantes.map(f => `\n\n_______________________________\n${f}`))
  } else {
    L.push('\n\n_______________________________\nPresidente')
    L.push('\n\n_______________________________\nSecretario')
  }

  return L.join('\n')
}

/** Los datos que faltan para que el acta esté completa, en lenguaje llano. */
export function faltantesDelActa(a: Acta, e: Entidad | null): string[] {
  const f: string[] = []
  if (!a.lugar && !e?.sede_domicilio) f.push('el lugar de la reunión')
  if (!a.hora_inicio) f.push('la hora de apertura')
  if (!a.hora_fin) f.push('la hora de cierre')
  if (!(a.asistentes_nombres ?? []).length) f.push('los nombres de los asistentes')
  if (!(a.orden_del_dia ?? []).length) f.push('los puntos del orden del día')
  if (!a.firmantes) f.push('los firmantes')
  if (!a.libro_id) f.push('en qué libro se asienta')
  return f
}
