import { supabase } from './supabase'

/**
 * Capa institucional de la asociación civil.
 *
 * El resto de la app cubre la operación (plantas, cosecha, costos). Esto cubre
 * lo otro: los plazos que, si se vencen, te frenan todos los trámites aunque el
 * cultivo ande perfecto. Las dos cosas que más cuelgan a una ONG son el mandato
 * de autoridades vencido y la reinscripción anual del REPROCANN.
 */

export interface Entidad {
  id: string
  razon_social?: string | null
  cuit?: string | null
  jurisdiccion?: string | null
  organismo_control?: string | null
  sede_domicilio?: string | null
  sede_localidad?: string | null
  sede_provincia?: string | null
  fecha_constitucion?: string | null
  cierre_ejercicio_dia?: number | null
  cierre_ejercicio_mes?: number | null
  mandato_anios?: number | null
  mandato_desde?: string | null
  reprocann_inscripcion?: string | null
  reprocann_vencimiento?: string | null
  tope_pacientes?: number | null
  plantas_por_paciente?: number | null
  tope_predios?: number | null
  notas?: string | null
}

export interface Autoridad {
  id: string
  nombre: string
  cargo: string
  organo?: string | null
  desde?: string | null
  hasta?: string | null
  activo?: boolean
  notas?: string | null
}

export interface Requisito {
  id?: string
  clave: string
  titulo: string
  detalle?: string | null
  cumplido?: boolean
  vence?: string | null
  responsable?: string | null
  nota?: string | null
  orden?: number | null
}

/**
 * Los cinco requisitos de la Resolución 1780 viven en el código, no en la base.
 * Los fija la norma, no el usuario: si dependieran de filas precargadas, una
 * instalación nueva mostraría la lista vacía. La tabla guarda sólo el ESTADO
 * (cumplido, vencimiento, responsable) contra la clave.
 */
export const REQUISITOS_1780: Omit<Requisito, 'id' | 'cumplido'>[] = [
  { clave: 'director_medico', orden: 1, titulo: 'Director médico',
    detalle: 'Médico que hace el seguimiento de los pacientes de la ONG.' },
  { clave: 'responsable_tecnico', orden: 2, titulo: 'Responsable técnico',
    detalle: 'Quien responde por el cultivo. Puede ser un integrante con curso de cannabis acreditado.' },
  { clave: 'georreferenciacion', orden: 3, titulo: 'Georreferenciación',
    detalle: 'Coordenadas declaradas de cada predio de cultivo.' },
  { clave: 'notificacion_municipio', orden: 4, titulo: 'Notificación al municipio',
    detalle: 'Aviso formal al municipio de cada predio. Antes de clausurar intiman: recién a la tercera sin respuesta pueden clausurar y sacar plantas.' },
  { clave: 'pacientes_minimos', orden: 5, titulo: 'Mínimo 5 pacientes',
    detalle: 'Listado de al menos cinco pacientes vinculados a la ONG.' },
]

export interface Predio {
  id: string
  nombre: string
  direccion?: string | null
  localidad?: string | null
  provincia?: string | null
  municipio?: string | null
  georreferenciado?: boolean
  municipio_notificado?: boolean
  activo?: boolean
  notas?: string | null
}

export const CARGOS = [
  'Presidente', 'Vicepresidente', 'Secretario', 'Tesorero',
  'Vocal titular', 'Vocal suplente',
  'Revisor de cuentas titular', 'Revisor de cuentas suplente',
] as const

export const ORGANOS = ['Comisión Directiva', 'Comisión Revisora de Cuentas'] as const

const lanzar = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export const ongService = {
  /** La entidad es una sola fila. Si todavía no existe, devuelve null. */
  async getEntidad(): Promise<Entidad | null> {
    const { data, error } = await supabase.from('ong_entidad').select('*').limit(1)
    lanzar(error)
    return (data?.[0] as Entidad) ?? null
  },
  async guardarEntidad(e: Partial<Entidad>): Promise<Entidad> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...e, user_id: u?.user?.id ?? null, actualizado_en: new Date().toISOString() }
    const q = e.id
      ? supabase.from('ong_entidad').update(payload).eq('id', e.id).select().single()
      : supabase.from('ong_entidad').insert(payload).select().single()
    const { data, error } = await q
    lanzar(error)
    return data as Entidad
  },

  async getAutoridades(): Promise<Autoridad[]> {
    const { data, error } = await supabase.from('ong_autoridades').select('*').order('cargo')
    lanzar(error)
    return (data ?? []) as Autoridad[]
  },
  async guardarAutoridad(a: Partial<Autoridad>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...a, user_id: u?.user?.id ?? null }
    const { error } = a.id
      ? await supabase.from('ong_autoridades').update(payload).eq('id', a.id)
      : await supabase.from('ong_autoridades').insert(payload)
    lanzar(error)
  },
  async borrarAutoridad(id: string): Promise<void> {
    lanzar((await supabase.from('ong_autoridades').delete().eq('id', id)).error)
  },

  /**
   * La lista siempre sale completa: se parte de REQUISITOS_1780 y se le pega
   * encima el estado guardado. Nunca devuelve vacío, ni en una instalación
   * nueva ni en modo demo.
   */
  async getRequisitos(): Promise<Requisito[]> {
    const { data, error } = await supabase.from('ong_requisitos').select('*')
    lanzar(error)
    const guardados = new Map((data ?? []).map(r => [(r as Requisito).clave, r as Requisito]))
    return REQUISITOS_1780.map(base => ({ ...base, cumplido: false, ...(guardados.get(base.clave) ?? {}) }))
  },
  /** Upsert por clave: la fila puede no existir todavía. */
  async actualizarRequisito(clave: string, campos: Partial<Requisito>): Promise<void> {
    const base = REQUISITOS_1780.find(r => r.clave === clave)
    const { data: u } = await supabase.auth.getUser()
    const { data: hay } = await supabase.from('ong_requisitos').select('id').eq('clave', clave).limit(1)
    if (hay?.[0]) {
      lanzar((await supabase.from('ong_requisitos').update(campos).eq('id', (hay[0] as { id: string }).id)).error)
    } else {
      lanzar((await supabase.from('ong_requisitos').insert({
        clave, titulo: base?.titulo ?? clave, detalle: base?.detalle ?? null,
        orden: base?.orden ?? 0, user_id: u?.user?.id ?? null, ...campos,
      })).error)
    }
  },

  async getPredios(): Promise<Predio[]> {
    const { data, error } = await supabase.from('ong_predios').select('*').order('nombre')
    lanzar(error)
    return (data ?? []) as Predio[]
  },
  async guardarPredio(p: Partial<Predio>): Promise<void> {
    const { data: u } = await supabase.auth.getUser()
    const payload = { ...p, user_id: u?.user?.id ?? null }
    const { error } = p.id
      ? await supabase.from('ong_predios').update(payload).eq('id', p.id)
      : await supabase.from('ong_predios').insert(payload)
    lanzar(error)
  },
  async borrarPredio(id: string): Promise<void> {
    lanzar((await supabase.from('ong_predios').delete().eq('id', id)).error)
  },
}

// ---------------------------------------------------------------------------
// Vencimientos: lo que hace que la ONG pueda o no operar.
// ---------------------------------------------------------------------------

export type Urgencia = 'vencido' | 'critico' | 'proximo' | 'ok'

export interface Vencimiento {
  clave: string
  titulo: string
  fecha: string | null
  dias: number | null          // negativo = ya venció
  urgencia: Urgencia
  queSignifica: string
  comoSeResuelve: string
}

const HOY = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const dias = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  return Math.round((new Date(iso + 'T00:00:00').getTime() - HOY().getTime()) / 86400000)
}
const urgenciaDe = (d: number | null): Urgencia =>
  d == null ? 'ok' : d < 0 ? 'vencido' : d <= 30 ? 'critico' : d <= 90 ? 'proximo' : 'ok'

/** Próxima ocurrencia de un día/mes del calendario, a partir de hoy. */
export function proximoAniversario(dia?: number | null, mes?: number | null): string | null {
  if (!dia || !mes) return null
  const hoy = HOY()
  let a = hoy.getFullYear()
  const arma = (anio: number) => new Date(anio, mes - 1, dia)
  if (arma(a) < hoy) a += 1
  const d = arma(a)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Fin del mandato = inicio + duración en años, ambos del estatuto. */
export function finDeMandato(desde?: string | null, anios?: number | null): string | null {
  if (!desde || !anios) return null
  const d = new Date(desde + 'T00:00:00')
  d.setFullYear(d.getFullYear() + anios)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calcularVencimientos(e: Entidad | null): Vencimiento[] {
  if (!e) return []
  const v: Vencimiento[] = []

  const mandato = finDeMandato(e.mandato_desde, e.mandato_anios)
  v.push({
    clave: 'mandato', titulo: 'Mandato de autoridades', fecha: mandato, dias: dias(mandato),
    urgencia: urgenciaDe(dias(mandato)),
    queSignifica: 'Con las autoridades vencidas no podés hacer ningún trámite: ni banco, ni registro, ni REPROCANN.',
    comoSeResuelve: 'Asamblea que renueve el mandato y después inscribir las nuevas autoridades en el registro.',
  })

  v.push({
    clave: 'reprocann', titulo: 'Reinscripción REPROCANN', fecha: e.reprocann_vencimiento ?? null,
    dias: dias(e.reprocann_vencimiento), urgencia: urgenciaDe(dias(e.reprocann_vencimiento)),
    queSignifica: 'Para la ONG dura 1 año. Si no se reinscribe a tiempo NO se vence: se cae, y hay que rehacer el trámite.',
    comoSeResuelve: 'Volver a presentar la documentación con los informes del director médico y del responsable técnico.',
  })

  const cierre = proximoAniversario(e.cierre_ejercicio_dia, e.cierre_ejercicio_mes)
  v.push({
    clave: 'cierre', titulo: 'Cierre de ejercicio', fecha: cierre, dias: dias(cierre),
    urgencia: urgenciaDe(dias(cierre)),
    queSignifica: 'La fecha la fija el estatuto, no se elige cada año. Desde acá se arman los estados contables.',
    comoSeResuelve: 'Pasarle al contador los movimientos del ejercicio para que confeccione el balance.',
  })

  // El balance se trata después del cierre; se toma como referencia práctica un
  // trimestre, que es el plazo con el que suelen trabajar los organismos.
  if (cierre) {
    const b = new Date(cierre + 'T00:00:00'); b.setMonth(b.getMonth() + 3)
    const iso = `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')}`
    v.push({
      clave: 'balance', titulo: 'Presentación de balance', fecha: iso, dias: dias(iso),
      urgencia: urgenciaDe(dias(iso)),
      queSignifica: 'Es obligatorio todos los años, incluso en cero si no diste de alta los impuestos.',
      comoSeResuelve: 'Contador arma → lo trata la Comisión Directiva → lo aprueba la Asamblea → se presenta en el organismo de control.',
    })
  }

  const orden: Record<Urgencia, number> = { vencido: 0, critico: 1, proximo: 2, ok: 3 }
  return v.sort((a, b) =>
    orden[a.urgencia] - orden[b.urgencia] || (a.dias ?? 9e9) - (b.dias ?? 9e9))
}

// ---------------------------------------------------------------------------
// Capacidad: los tres topes de la Resolución 1780.
// ---------------------------------------------------------------------------

export interface LineaCapacidad {
  titulo: string
  usado: number
  tope: number
  detalle: string
}

export function calcularCapacidad(
  e: Entidad | null, pacientes: number, plantasActivas: number, predios: number,
): LineaCapacidad[] {
  const topePac = e?.tope_pacientes ?? 150
  const porPac = e?.plantas_por_paciente ?? 9
  const topePre = e?.tope_predios ?? 3
  // El tope de plantas no es fijo: sale de cuántos pacientes tenés vinculados.
  const topePlantas = pacientes * porPac
  return [
    { titulo: 'Pacientes vinculados', usado: pacientes, tope: topePac,
      detalle: `Tope de la 1780. Es ampliable por solicitud si la asociación lo supera.` },
    { titulo: 'Plantas en cultivo', usado: plantasActivas, tope: topePlantas,
      detalle: `${porPac} plantas por paciente vinculado. Con ${pacientes} paciente${pacientes === 1 ? '' : 's'} el techo es ${topePlantas}.` },
    { titulo: 'Predios', usado: predios, tope: topePre,
      detalle: 'La sede social es declarativa y puede estar en otra jurisdicción que el cultivo.' },
  ]
}

/** Gramos que la ONG puede transportar: es la cantidad de sus pacientes. */
export function topeTransporteG(pacientes: number, gramosPorPaciente = 40): number {
  return pacientes * gramosPorPaciente
}
