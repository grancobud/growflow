// ============================================================================
// Modo DEMO - almacen local (localStorage) que reemplaza a Supabase
// Se activa cuando no hay VITE_SUPABASE_URL configurada (ver supabase.ts).
// Mantiene las mismas tablas del esquema real: geneticas, plantas, eventos,
// cosechas, riegos, aplicaciones, perfiles_usuario.
// ============================================================================

const PREFIJO = 'growflow_demo:'
const VERSION_SEED = 'v11'

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
  'perfiles_nutrientes', 'sustancias_nutrientes', 'inventario_nutrientes', 'proveedores_nutrientes', 'fichas_comerciales', 'insumos_faltantes',
  'proveedores_instalacion', 'instalaciones_items', 'presupuestos_instalacion', 'presupuesto_instalacion_items',
  'ofertas_instalacion',
  'tableros', 'tableros_circuitos',
  'insumos', 'costos', 'econometria_config', 'mantenimientos', 'recordatorios',
  'ong_entidad', 'ong_autoridades', 'ong_requisitos', 'ong_predios',
  'ong_libros', 'ong_actas', 'ong_asociados', 'ong_categorias_socio', 'ong_cuotas', 'ong_dispensas', 'ong_cuotas_emitidas', 'ong_documentos', 'ong_ddjj', 'ong_traslados', 'ong_feedback_clinico', 'ong_caja',
  'ong_lotes', 'ong_pedidos',
]

export const USUARIO_DEMO = {
  id: 'demo-user-0000-0000-0000-000000000000',
  email: 'demo@growflow.local',
}

// --- datos de ejemplo ---
function sembrar(): void {
  // ids de pacientes (se usan tambien en la tabla pacientes mas abajo)
  const pacJuan = uuid(), pacMaria = uuid(), pacCarlos = uuid()

  // === Cultivo de ejemplo ===
  // Las geneticas entran solo con el nombre; los demas campos quedan vacios para
  // completarlos desde "Editar ficha".
  // Variedades de ejemplo: nombres comerciales conocidos, a proposito. El seed
  // es una demo publica, no el cultivo de nadie.
  const GENETICAS_REALES = ['Northern Lights', 'White Widow', 'Amnesia Haze', 'Blue Dream', 'Critical Kush', 'Sour Diesel', 'Gelato', 'Purple Punch']
  type PR = { apodo: string; slot: string | null; genetica: string; riegos: string[] }
  // Plantas de ejemplo para el modo demo. Los datos reales de cada instalacion
  // viven en su propia base, no en el repo.
  const PLANTAS_REALES: PR[] = [
    { apodo: '#1', slot: 'c1-0', genetica: 'Northern Lights', riegos: [] },
    { apodo: '#2', slot: 'c1-1', genetica: 'White Widow', riegos: [] },
    { apodo: '#3', slot: 'c1-2', genetica: 'Amnesia Haze', riegos: ['2026-06-12'] },
    { apodo: '#4', slot: 'c2-0', genetica: 'Blue Dream', riegos: [] },
    { apodo: '#5', slot: 'c2-1', genetica: 'Critical Kush', riegos: [] },
    { apodo: '#6', slot: 'c2-2', genetica: 'Sour Diesel', riegos: ['2026-06-12'] },
    { apodo: '#7', slot: 'c3-0', genetica: 'Gelato', riegos: [] },
    { apodo: '#8', slot: 'c3-1', genetica: 'Purple Punch', riegos: [] },
    { apodo: '#9', slot: 'c3-2', genetica: 'Northern Lights', riegos: ['2026-06-12'] },
    { apodo: '#10', slot: 'c4-0', genetica: 'White Widow', riegos: [] },
    { apodo: '#11', slot: 'c4-1', genetica: 'Amnesia Haze', riegos: [] },
    { apodo: '#12', slot: 'c4-2', genetica: 'Blue Dream', riegos: ['2026-06-12'] },
  ]

  // geneticas: una fila por nombre, con ficha enriquecida si la tenemos
  const genId = new Map<string, string>()
  // 5 genéticas automáticas en la demo; el resto feminizadas (para mostrar el chip Auto/Fem).
  const AUTOS = new Set(['Critical Kush', 'Gelato', 'Purple Punch'])
  const geneticas: Fila[] = GENETICAS_REALES.map((nombre, i) => {
    const id = uuid(); genId.set(nombre, id)
    return {
      id, nombre, banco: null, tipo: AUTOS.has(nombre) ? 'Automatica' : 'Feminizada',
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
