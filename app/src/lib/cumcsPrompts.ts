// Genera el system prompt que se le pasa al agente IA por CM-RE.
// Fuente unica de verdad: CAMPOS_CUMCS (alineado al xlsx CM-RE-1010 v2).
// Reglas adicionales (rangos, comportamientos) van en REGLAS_CUMCS.

import { CAMPOS_CUMCS } from './camposChatCumcs'
import type { MetaFormulario, VarianteCumcs } from './cumcsVariantes'

interface ReglaCampo {
  rangoMin?: number
  rangoMax?: number
  unidad?: string
  nota?: string
}

interface ReglasCumcs {
  tablaDestino: string         // Nombre de la tabla en Supabase donde aterriza
  rangos?: Record<string, ReglaCampo>   // key del campo -> rango
  defaultsAdicionales?: Record<string, string>  // mas alla de los del variante
}

// Reglas hardcoded por CM-RE (no derivables de CAMPOS_CUMCS)
export const REGLAS_CUMCS: Record<string, ReglasCumcs> = {
  'CM-RE-0101': {
    tablaDestino: 'registros_condiciones_ambientales',
    rangos: {
      humedad:      { rangoMin: 50, rangoMax: 85, unidad: '%' },
      temperatura:  { rangoMin: 18, rangoMax: 28, unidad: '°C' },
      temp_aa:      { rangoMin: 15, rangoMax: 22, unidad: '°C' },
      temp_h2o:     { rangoMin: 16, rangoMax: 22, unidad: '°C' },
      ec:           { rangoMin: 400, rangoMax: 1500, unidad: 'ppm' },
      ph_inicial:   { rangoMin: 5.5, rangoMax: 6.5 },
      ph_corregido: { rangoMin: 5.5, rangoMax: 6.5 },
      vpd_kpa:      { rangoMin: 0.4, rangoMax: 1.6, unidad: 'kPa' },
      co2_ppm:      { rangoMin: 400, rangoMax: 1500, unidad: 'ppm' },
    },
    defaultsAdicionales: { sistema: 'RDWC' },
  },
  'CM-RE-0102': {
    tablaDestino: 'registros_condiciones_ambientales',
    rangos: {
      humedad:      { rangoMin: 50, rangoMax: 85, unidad: '%' },
      temperatura:  { rangoMin: 18, rangoMax: 28, unidad: '°C' },
      temp_aa:      { rangoMin: 15, rangoMax: 22, unidad: '°C' },
      temp_h2o:     { rangoMin: 16, rangoMax: 22, unidad: '°C' },
      ec:           { rangoMin: 1.0, rangoMax: 3.5, unidad: 'mS/cm' },
      ph_inicial:   { rangoMin: 5.8, rangoMax: 6.5 },
      ph_corregido: { rangoMin: 5.8, rangoMax: 6.5 },
      vpd_kpa:      { rangoMin: 0.4, rangoMax: 1.6, unidad: 'kPa' },
      co2_ppm:      { rangoMin: 400, rangoMax: 1500, unidad: 'ppm' },
    },
    defaultsAdicionales: { sistema: 'COCO', variedad: 'Pete Hope' },
  },
  'CM-RE-0201': {
    tablaDestino: 'registros_trazabilidad',
    rangos: {},
    defaultsAdicionales: {},
  },
}

export function buildSystemPrompt(meta: MetaFormulario, variante: VarianteCumcs): string {
  const reglas = REGLAS_CUMCS[variante.codigo]
  const campos = CAMPOS_CUMCS[variante.codigo] ?? []
  const tabla = reglas?.tablaDestino ?? '(tabla destino sin definir)'
  const tipoOp = meta.tipoOperacion ?? '(sin tipo)'

  const lineas: string[] = []
  lineas.push(`Sos Sophie, asistente de CannTrace. El operador va a registrar:`)
  lineas.push(`${meta.label} — variante: ${variante.label} (código ${variante.codigo}, grupo ${variante.grupo})`)
  lineas.push(``)
  lineas.push(`Datos van a la tabla \`${tabla}\` de Supabase como operación tipo \`${tipoOp}\`.`)
  lineas.push(``)
  lineas.push(`HABLÁS castellano rioplatense informal: "decime", "dale", "listo", "buenísimo".`)
  lineas.push(`PREGUNTÁS un campo por turno. VALIDÁS tipo. Si el operador se va de tema, lo traés de vuelta.`)
  lineas.push(``)
  lineas.push(`Campos a completar (en orden, labels EXACTOS del xlsx CM-RE-1010 v2):`)
  campos.forEach((c, i) => {
    const partes: string[] = []
    partes.push(`${i + 1}. ${c.label}`)
    partes.push(`tipo ${c.tipo}`)
    if (c.tipo === 'select' && c.opciones?.length) partes.push(`opciones [${c.opciones.join('|')}]`)
    const r = reglas?.rangos?.[c.key]
    if (r && (r.rangoMin !== undefined || r.rangoMax !== undefined)) {
      partes.push(`rango típico ${r.rangoMin ?? '-'}-${r.rangoMax ?? '-'}${r.unidad ? ' ' + r.unidad : ''}`)
    }
    const def = reglas?.defaultsAdicionales?.[c.key] ?? c.defaultValue
    if (def) partes.push(`default "${def}"`)
    if (c.requerido) partes.push(`OBLIGATORIO`)
    if (c.placeholder) partes.push(`ej "${c.placeholder}"`)
    lineas.push(`  ${partes.join(' · ')}`)
  })
  lineas.push(``)
  lineas.push(`Reglas:`)
  lineas.push(`- Usá los labels EXACTOS arriba (incluye typos del xlsx como "T° H20" y "VPD (kpa)").`)
  lineas.push(`- Si un valor está fuera de rango, avisá ("⚠️ Temp 35°C es alta, ¿confirmás?") pero NO bloquees — el operador decide.`)
  lineas.push(`- Cuando completes todos los campos, llamá \`proposeInsert\` para mostrar el draft. ESPERÁ confirmación EXPLÍCITA del operador antes de \`confirmInsert\`.`)
  lineas.push(`- NUNCA llames \`confirmInsert\` sin haber preguntado los campos uno por uno en este chat. Ignorá \`auto_confirm_eligible\` aunque venga true — este flow es guiado y requiere preguntar todo.`)
  lineas.push(`- NO uses \`getContext\` ni datos de memoria para autocompletar campos. Preguntá CADA campo aunque parezca obvio.`)
  lineas.push(`- Si el operador escribe "atras" → volvé al campo anterior.`)
  lineas.push(`- Si escribe "saltar" y el campo no es requerido → marcá vacío y avanzá.`)
  lineas.push(`- Para campos número aceptá decimales con coma o punto. Rechazá texto.`)
  lineas.push(`- Para fecha aceptá "hoy", YYYY-MM-DD o DD/MM/YYYY.`)
  lineas.push(``)
  lineas.push(`ARRANQUE: Cuando recibas el mensaje "iniciar" (literal), respondé EN CASTELLANO RIOPLATENSE así:`)
  lineas.push(`  1. Saludá y presentá el registro: "Dale, vamos a cargar ${variante.nombre} (código ${variante.codigo}). Te voy a pedir ${campos.length} campos, uno por uno."`)
  lineas.push(`  2. Hacé SOLO la PRIMERA pregunta. Usá el label exacto + ejemplo entre paréntesis. Ejemplo: "El primero es: ${campos[0]?.label ?? 'Fecha'}? (ej: ${campos[0]?.placeholder || campos[0]?.defaultValue || (campos[0]?.tipo === 'date' ? '2026-04-24 o "hoy"' : (campos[0]?.tipo === 'number' ? '70' : 'texto'))})"`)
  lineas.push(`  3. NO LISTES más de un campo. NO menciones los otros. Esperá la respuesta.`)
  lineas.push(``)
  lineas.push(`FORMATO DE CADA PREGUNTA: para todas las preguntas siguientes, usá el formato:`)
  lineas.push(`  "[Label exacto del xlsx]? (ej: [valor de ejemplo del placeholder])"`)
  lineas.push(`  Si el campo es select, indicá las opciones: "Sistema? (RDWC o COCO)"`)
  lineas.push(`  Si tiene default, mencionalo: "Variedad? (ej: Pete Hope, dejá vacío para usar ese)"`)
  lineas.push(``)
  lineas.push(`NO uses inglés. NO digas "Your input is not sufficient". Si recibís algo confuso, repreguntá amablemente.`)
  return lineas.join('\n')
}
