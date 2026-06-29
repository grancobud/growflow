// ============================================================================
// Modo DEMO - almacen local (localStorage) que reemplaza a Supabase
// Se activa cuando no hay VITE_SUPABASE_URL configurada (ver supabase.ts).
// Mantiene las mismas tablas del esquema real: geneticas, plantas, eventos,
// cosechas, riegos, aplicaciones, perfiles_usuario.
// ============================================================================

const PREFIJO = 'growflow_demo:'
const VERSION_SEED = 'v9'

export type Fila = Record<string, any>

export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function hoyMenos(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}
function isoMenos(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

// --- acceso crudo a localStorage por tabla ---
export function leerTabla(tabla: string): Fila[] {
  try {
    const raw = localStorage.getItem(PREFIJO + tabla)
    return raw ? (JSON.parse(raw) as Fila[]) : []
  } catch {
    return []
  }
}

export function escribirTabla(tabla: string, filas: Fila[]): void {
  try {
    localStorage.setItem(PREFIJO + tabla, JSON.stringify(filas))
  } catch {
    /* cuota llena: ignorar en demo */
  }
}

// Tablas conocidas del esquema. Una tabla desconocida devuelve [] (degradacion
// con gracia para paginas del CannTrace original que no estan en el router).
export const TABLAS_CONOCIDAS = [
  'geneticas', 'plantas', 'eventos', 'cosechas',
  'riegos', 'aplicaciones', 'perfiles_usuario', 'pacientes',
  'cultivadores', 'jornadas', 'asistencias', 'actividades',
  'perfiles_nutrientes', 'sustancias_nutrientes',
]

export const USUARIO_DEMO = {
  id: 'demo-user-0000-0000-0000-000000000000',
  email: 'demo@growflow.local',
}

// --- datos de ejemplo ---
function sembrar(): void {
  // ids de pacientes (se usan tambien en la tabla pacientes mas abajo)
  const pacJuan = uuid(), pacMaria = uuid(), pacCarlos = uuid()

  // === Cultivo real (importado del export growflow-sala-v1) ===
  // Las geneticas entran solo con el nombre (como las importaste); los demas campos
  // quedan vacios para que los completes desde "Editar ficha".
  const GENETICAS_REALES = ['Acai', 'Amnesia Haze', 'Angry Fish', 'Avocad Punch', 'Black Pave', 'Blue Berry', 'Faso de los Toros', 'Florida Dash Pack', 'Frozen Derrosh', 'Gorila Zikttlez', 'Gorilla Glue #4', 'Guanabana', 'Guava Blue', 'Mendocino Purple Kush', 'Northern Lights', 'Rainbow Sherbet', 'Trululu', 'Ultra 4K']
  type PR = { apodo: string; slot: string | null; genetica: string; riegos: string[] }
  const PLANTAS_REALES: PR[] = [
    { apodo: '#46', slot: 's1-6', genetica: 'Acai', riegos: [] },
    { apodo: '#31', slot: 'c4-0', genetica: 'Acai', riegos: [] },
    { apodo: '#16', slot: 'c2-6', genetica: 'Acai', riegos: [] },
    { apodo: '#1', slot: 'c1-0', genetica: 'Acai', riegos: ['2026-06-12'] },
    { apodo: '#47', slot: 's1-7', genetica: 'Angry Fish', riegos: [] },
    { apodo: '#32', slot: 'c4-1', genetica: 'Angry Fish', riegos: [] },
    { apodo: '#17', slot: 'c2-7', genetica: 'Angry Fish', riegos: [] },
    { apodo: '#2', slot: 'c1-1', genetica: 'Angry Fish', riegos: ['2026-06-13'] },
    { apodo: '#48', slot: 's1-8', genetica: 'Avocad Punch', riegos: [] },
    { apodo: '#33', slot: 'c4-2', genetica: 'Avocad Punch', riegos: [] },
    { apodo: '#18', slot: 'c2-8', genetica: 'Avocad Punch', riegos: [] },
    { apodo: '#3', slot: 'c1-2', genetica: 'Avocad Punch', riegos: [] },
    { apodo: '#49', slot: 's1-9', genetica: 'Black Pave', riegos: [] },
    { apodo: '#34', slot: 'c4-3', genetica: 'Black Pave', riegos: [] },
    { apodo: '#19', slot: 'c2-9', genetica: 'Black Pave', riegos: [] },
    { apodo: '#4', slot: 'c1-3', genetica: 'Black Pave', riegos: [] },
    { apodo: '#50', slot: 's1-10', genetica: 'Blue Berry', riegos: [] },
    { apodo: '#35', slot: 'c4-4', genetica: 'Blue Berry', riegos: [] },
    { apodo: '#20', slot: 'c2-10', genetica: 'Blue Berry', riegos: [] },
    { apodo: '#5', slot: 'c1-4', genetica: 'Blue Berry', riegos: [] },
    { apodo: '#51', slot: 's1-11', genetica: 'Faso de los Toros', riegos: [] },
    { apodo: '#36', slot: 'c4-5', genetica: 'Faso de los Toros', riegos: [] },
    { apodo: '#21', slot: 'c2-11', genetica: 'Faso de los Toros', riegos: [] },
    { apodo: '#6', slot: 'c1-5', genetica: 'Faso de los Toros', riegos: [] },
    { apodo: '#52', slot: 's1-12', genetica: 'Florida Dash Pack', riegos: [] },
    { apodo: '#37', slot: 'c4-6', genetica: 'Florida Dash Pack', riegos: [] },
    { apodo: '#22', slot: 'c3-0', genetica: 'Florida Dash Pack', riegos: [] },
    { apodo: '#7', slot: 'c1-6', genetica: 'Florida Dash Pack', riegos: [] },
    { apodo: '#53', slot: 's1-13', genetica: 'Frozen Derrosh', riegos: [] },
    { apodo: '#38', slot: 'c4-7', genetica: 'Frozen Derrosh', riegos: [] },
    { apodo: '#23', slot: 'c3-1', genetica: 'Frozen Derrosh', riegos: [] },
    { apodo: '#8', slot: 'c1-7', genetica: 'Frozen Derrosh', riegos: [] },
    { apodo: '#54', slot: 's1-14', genetica: 'Gorila Zikttlez', riegos: [] },
    { apodo: '#39', slot: 'c4-8', genetica: 'Gorila Zikttlez', riegos: [] },
    { apodo: '#24', slot: 'c3-2', genetica: 'Gorila Zikttlez', riegos: [] },
    { apodo: '#9', slot: 'c1-8', genetica: 'Gorila Zikttlez', riegos: [] },
    { apodo: '#55', slot: 's1-15', genetica: 'Guanabana', riegos: [] },
    { apodo: '#40', slot: 's1-0', genetica: 'Guanabana', riegos: [] },
    { apodo: '#25', slot: 'c3-3', genetica: 'Guanabana', riegos: [] },
    { apodo: '#10', slot: 'c2-0', genetica: 'Guanabana', riegos: ['2026-06-11'] },
    { apodo: '#56', slot: 's1-16', genetica: 'Guava Blue', riegos: [] },
    { apodo: '#41', slot: 's1-1', genetica: 'Guava Blue', riegos: [] },
    { apodo: '#26', slot: 'c3-4', genetica: 'Guava Blue', riegos: [] },
    { apodo: '#11', slot: 'c2-1', genetica: 'Guava Blue', riegos: [] },
    { apodo: '#57', slot: 's1-17', genetica: 'Mendocino Purple Kush', riegos: [] },
    { apodo: '#42', slot: 's1-2', genetica: 'Mendocino Purple Kush', riegos: [] },
    { apodo: '#27', slot: 'c3-5', genetica: 'Mendocino Purple Kush', riegos: [] },
    { apodo: '#12', slot: 'c2-2', genetica: 'Mendocino Purple Kush', riegos: [] },
    { apodo: '#58', slot: 's1-18', genetica: 'Rainbow Sherbet', riegos: [] },
    { apodo: '#43', slot: 's1-3', genetica: 'Rainbow Sherbet', riegos: [] },
    { apodo: '#28', slot: 'c3-6', genetica: 'Rainbow Sherbet', riegos: [] },
    { apodo: '#13', slot: 'c2-3', genetica: 'Rainbow Sherbet', riegos: [] },
    { apodo: '#59', slot: 's1-19', genetica: 'Trululu', riegos: [] },
    { apodo: '#44', slot: 's1-4', genetica: 'Trululu', riegos: [] },
    { apodo: '#29', slot: 'c3-7', genetica: 'Trululu', riegos: [] },
    { apodo: '#14', slot: 'c2-4', genetica: 'Trululu', riegos: [] },
    { apodo: '#45', slot: 's1-5', genetica: 'Ultra 4K', riegos: [] },
    { apodo: '#30', slot: 'c3-8', genetica: 'Ultra 4K', riegos: [] },
    { apodo: '#15', slot: 'c2-5', genetica: 'Ultra 4K', riegos: [] },
  ]

  // geneticas: una fila por nombre, con ficha enriquecida si la tenemos
  const genId = new Map<string, string>()
  const geneticas: Fila[] = GENETICAS_REALES.map((nombre, i) => {
    const id = uuid(); genId.set(nombre, id)
    return {
      id, nombre, banco: null, tipo: 'Desconocido',
      thc_estimado: null, cbd_estimado: null, tiempo_flora_dias: null, notas: null,
      creado_en: isoMenos(120 - i),
    }
  })

  // abreviatura para el codigo de trazabilidad
  const abbr = (n: string) => (n.normalize('NFD').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GF')
  // Asignacion de algunas plantas a pacientes (para la demo del Registro)
  const asignar: Record<string, string> = { '#1': pacJuan, '#2': pacMaria, '#10': pacCarlos, '#3': pacJuan }
  // Las plantas con riego van al final: ganan el slot en caso de superposicion (se ven regadas en la Sala)
  const ordenadas = [...PLANTAS_REALES].sort((a, b) => a.riegos.length - b.riegos.length)
  const plantaId = new Map<string, string>()
  const plantas: Fila[] = ordenadas.map((p, i) => {
    const id = uuid(); plantaId.set(p.apodo, id)
    return {
      id, codigo: `${abbr(p.genetica)}-${String(i + 1).padStart(3, '0')}`,
      genetica_id: genId.get(p.genetica) ?? null, madre_id: null,
      paciente_id: asignar[p.apodo] ?? null, apodo: p.apodo,
      fecha_germinacion: hoyMenos(40), fase: 'Vegetativo',
      sustrato: 'Coco Mix', maceta: '7L', ubicacion: null, slot: p.slot,
      activa: true, notas: null, creado_en: isoMenos(40 - (i % 10)), actualizado_en: isoMenos(2),
    }
  })

  // eventos + riegos detallados a partir de los riegos reales
  const eventos: Fila[] = []
  const riegos: Fila[] = []
  for (const p of PLANTAS_REALES) {
    const pid = plantaId.get(p.apodo)
    if (!pid) continue
    for (const f of p.riegos) {
      eventos.push({ id: uuid(), planta_id: pid, tipo: 'Riego', fecha: f, detalle: 'Riego', foto_url: null, mensaje_original: 'import', creado_en: `${f}T12:00:00.000Z` })
      riegos.push({ id: uuid(), planta_id: pid, fecha: f, volumen_ml: 1500, ppm: 800, ph: 6.0, escurrio: false, escurrido_ml: null, notas: null, creado_en: `${f}T12:00:00.000Z` })
    }
  }
  // algunos eventos extra de ejemplo en las plantas con historial
  const evExtra = (apodo: string, tipo: string, dias: number, detalle: string | null) => {
    const pid = plantaId.get(apodo)
    if (pid) eventos.push({ id: uuid(), planta_id: pid, tipo, fecha: hoyMenos(dias), detalle, foto_url: null, mensaje_original: null, creado_en: isoMenos(dias) })
  }
  evExtra('#1', 'Fertilizacion', 5, 'Base A+B + PK.'); evExtra('#1', 'Poda', 12, 'Defoliacion ligera.')
  evExtra('#2', 'Entrenamiento', 10, 'LST con tutores.')
  evExtra('#10', 'Nota', 8, 'Hojas levemente caidas, ajusto riego.')

  // planta cosechada (inactiva, no aparece en la Sala) para estadisticas
  const pCosechada = uuid()
  plantas.push({ id: pCosechada, codigo: 'NL-000', genetica_id: genId.get('Northern Lights') ?? null, madre_id: null, paciente_id: pacMaria, apodo: 'NL #0 (cosechada)', fecha_germinacion: hoyMenos(140), fecha_cosecha: hoyMenos(25), fecha_envasado: hoyMenos(5), fase: 'Cosechada', sustrato: 'Coco Mix', maceta: '11L', ubicacion: null, slot: null, activa: false, notas: 'Cultivo anterior.', creado_en: isoMenos(140), actualizado_en: isoMenos(20) })
  const cosechas: Fila[] = [
    { id: uuid(), planta_id: pCosechada, fecha: hoyMenos(20), peso_humedo_g: 320, peso_seco_g: 78, notas_curado: 'Curado 3 semanas en frascos.', notas_sabor: 'Terroso, dulce.', valoracion: 8, creado_en: isoMenos(20) },
  ]

  // aplicaciones de ejemplo
  const aplicaciones: Fila[] = []
  const apExtra = (apodo: string, dias: number, categoria: string, producto: string, dosis: string) => {
    const pid = plantaId.get(apodo)
    if (pid) aplicaciones.push({ id: uuid(), planta_id: pid, fecha: hoyMenos(dias), categoria, producto, dosis, metodo: 'Aspersion', notas: null, creado_en: isoMenos(dias) })
  }
  apExtra('#2', 7, 'Foliar', 'Aminoacidos', '2 ml/L')
  apExtra('#10', 9, 'Fungicida', 'Aceite de neem', '5 ml/L')

  const perfiles_usuario: Fila[] = [
    { id: USUARIO_DEMO.id, nombre_completo: 'Cultivador Demo', rol: 'administrador', activo: true, ultimo_acceso: new Date().toISOString() },
  ]

  // pacientes REPROCANN de ejemplo (uno vigente, uno por vencer, uno en tramite)
  const pacientes: Fila[] = [
    { id: pacJuan, nombre_completo: 'Juan Pérez', dni: '30.123.456', fecha_nacimiento: '1988-04-12', telefono: '11 5555-1234', email: 'juan.perez@mail.com', localidad: 'La Plata', provincia: 'Buenos Aires', domicilio: 'Calle 50 N° 1234', foto_url: null, reprocann_nro: 'RPC-100245', reprocann_estado: 'Vigente', reprocann_emision: hoyMenos(120), reprocann_vencimiento: hoyMenos(-240), modalidad: 'Cultivo solidario', credencial_url: null, patologia: 'Dolor crónico', medico_tratante: 'Dra. Gómez', matricula_medico: 'MP 45678', plantas_habilitadas: 9, m2_habilitados: 4, socio: true, fecha_alta: hoyMenos(110), activo: true, notas: null, creado_en: isoMenos(110) },
    { id: pacMaria, nombre_completo: 'María López', dni: '27.987.654', fecha_nacimiento: '1979-09-30', telefono: '11 4444-9876', email: 'maria.lopez@mail.com', localidad: 'CABA', provincia: 'CABA', domicilio: 'Av. Rivadavia 5000', foto_url: null, reprocann_nro: 'RPC-098123', reprocann_estado: 'Vigente', reprocann_emision: hoyMenos(340), reprocann_vencimiento: hoyMenos(-20), modalidad: 'Cultivo solidario', credencial_url: null, patologia: 'Insomnio · Ansiedad', medico_tratante: 'Dr. Fernández', matricula_medico: 'MN 12345', plantas_habilitadas: 9, m2_habilitados: 6, socio: true, fecha_alta: hoyMenos(330), activo: true, notas: 'Credencial próxima a vencer.', creado_en: isoMenos(330) },
    { id: pacCarlos, nombre_completo: 'Carlos Ruiz', dni: '35.222.111', fecha_nacimiento: '1992-01-15', telefono: '221 333-2211', email: null, localidad: 'Berisso', provincia: 'Buenos Aires', domicilio: null, foto_url: null, reprocann_nro: null, reprocann_estado: 'En tramite', reprocann_emision: null, reprocann_vencimiento: null, modalidad: 'Cultivo propio', credencial_url: null, patologia: 'Epilepsia', medico_tratante: null, matricula_medico: null, plantas_habilitadas: null, m2_habilitados: null, socio: true, fecha_alta: hoyMenos(15), activo: true, notas: 'Esperando aprobación de REPROCANN.', creado_en: isoMenos(15) },
  ]

  // growers (roster del equipo de cultivo)
  const cAna = uuid(), cBeto = uuid(), cClara = uuid()
  const cultivadores: Fila[] = [
    { id: cAna, nombre: 'Ana Torres', rol: 'Responsable', telefono: '11 6000-1111', activo: true, creado_en: isoMenos(200) },
    { id: cBeto, nombre: 'Beto Sosa', rol: 'Cultivador', telefono: '11 6000-2222', activo: true, creado_en: isoMenos(180) },
    { id: cClara, nombre: 'Clara Díaz', rol: 'Voluntario', telefono: null, activo: true, creado_en: isoMenos(60) },
  ]

  // jornadas con asistencia y bitacora
  const j1 = uuid(), j2 = uuid()
  const jornadas: Fila[] = [
    { id: j1, fecha: hoyMenos(1), responsable: 'Ana Torres', clima: 'Soleado 26°C', resumen: 'Riego general y poda de las plantas en flora.', notas: null, creado_en: isoMenos(1) },
    { id: j2, fecha: hoyMenos(4), responsable: 'Beto Sosa', clima: 'Nublado 19°C', resumen: 'Trasplante de esquejes y limpieza de carpa 2.', notas: null, creado_en: isoMenos(4) },
  ]
  const asistencias: Fila[] = [
    { id: uuid(), jornada_id: j1, cultivador_id: cAna, presente: true, hora_entrada: '09:00', hora_salida: '13:00', notas: null, creado_en: isoMenos(1) },
    { id: uuid(), jornada_id: j1, cultivador_id: cBeto, presente: true, hora_entrada: '09:30', hora_salida: '12:30', notas: null, creado_en: isoMenos(1) },
    { id: uuid(), jornada_id: j1, cultivador_id: cClara, presente: false, hora_entrada: null, hora_salida: null, notas: null, creado_en: isoMenos(1) },
    { id: uuid(), jornada_id: j2, cultivador_id: cAna, presente: false, hora_entrada: null, hora_salida: null, notas: null, creado_en: isoMenos(4) },
    { id: uuid(), jornada_id: j2, cultivador_id: cBeto, presente: true, hora_entrada: '10:00', hora_salida: '14:00', notas: null, creado_en: isoMenos(4) },
  ]
  const actividades: Fila[] = [
    { id: uuid(), jornada_id: j1, hora: '09:15', tipo: 'Riego', descripcion: 'Riego con nutrientes de flora a las 4 plantas.', cultivador_id: cAna, creado_en: isoMenos(1) },
    { id: uuid(), jornada_id: j1, hora: '10:30', tipo: 'Poda', descripcion: 'Defoliación de NL #1.', cultivador_id: cBeto, creado_en: isoMenos(1) },
    { id: uuid(), jornada_id: j2, hora: '10:30', tipo: 'Trasplante', descripcion: 'Esquejes pasados a macetas de 1L.', cultivador_id: cBeto, creado_en: isoMenos(4) },
    { id: uuid(), jornada_id: j2, hora: '12:00', tipo: 'Limpieza', descripcion: 'Limpieza general de carpa 2.', cultivador_id: cBeto, creado_en: isoMenos(4) },
  ]

  escribirTabla('geneticas', geneticas)
  escribirTabla('plantas', plantas)
  escribirTabla('eventos', eventos)
  escribirTabla('cosechas', cosechas)
  escribirTabla('riegos', riegos)
  escribirTabla('aplicaciones', aplicaciones)
  escribirTabla('perfiles_usuario', perfiles_usuario)
  escribirTabla('pacientes', pacientes)
  escribirTabla('cultivadores', cultivadores)
  escribirTabla('jornadas', jornadas)
  escribirTabla('asistencias', asistencias)
  escribirTabla('actividades', actividades)
}

// Siembra una sola vez (marca de version). El usuario puede resetear borrando
// las claves growflow_demo: del localStorage.
export function asegurarSeed(): void {
  try {
    if (localStorage.getItem(PREFIJO + 'seed') === VERSION_SEED) return
    sembrar()
    localStorage.setItem(PREFIJO + 'seed', VERSION_SEED)
  } catch {
    /* sin localStorage: nada que hacer */
  }
}
