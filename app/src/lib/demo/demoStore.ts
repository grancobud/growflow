// ============================================================================
// Modo DEMO - almacen local (localStorage) que reemplaza a Supabase
// Se activa cuando no hay VITE_SUPABASE_URL configurada (ver supabase.ts).
// Mantiene las mismas tablas del esquema real: geneticas, plantas, eventos,
// cosechas, riegos, aplicaciones, perfiles_usuario.
// ============================================================================

const PREFIJO = 'growflow_demo:'
// Subir esto al cambiar `sembrar()`: quien ya tiene la demo en su localStorage
// no vuelve a sembrar hasta que la version cambia, y sin esto no veria nunca
// los datos nuevos. v23-vacio saca el seed de ejemplo: la app arranca sin nada.
const VERSION_SEED = 'v23-vacio'

export type Fila = Record<string, any>

export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
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
  // Las de la Calculadora de Fertilizantes y del modulo Instalacion, propias de
  // GrowFlow.
  'perfiles_nutrientes', 'sustancias_nutrientes', 'inventario_nutrientes', 'proveedores_nutrientes',
  'fichas_comerciales', 'insumos_faltantes', 'tableros', 'tableros_circuitos',
  // La historia clinica del paciente.
  'pacientes_clinica', 'evolucion_clinica',
  'proveedores_instalacion', 'instalaciones_items', 'presupuestos_instalacion', 'presupuesto_instalacion_items',
  'ofertas_instalacion',
  'ong_visitas',
  // El arqueo de caja y stock (02/09/2026). Sin registrarla acá, el modo demo
  // la ignora: se guarda con toast de éxito y la lista queda vacía.
  'arqueos',
  // El plan de cultivo, lo que se declara en REPROCANN (02/09/2026).
  'planes_cultivo',
  'insumos', 'costos', 'econometria_config', 'mantenimientos', 'recordatorios',
  'ong_entidad', 'ong_autoridades', 'ong_requisitos', 'ong_predios',
  'ong_libros', 'ong_actas', 'ong_asociados', 'ong_categorias_socio', 'ong_cuotas', 'ong_dispensas', 'ong_cuotas_emitidas', 'ong_documentos', 'ong_ddjj', 'ong_traslados', 'ong_feedback_clinico', 'ong_caja',
  'ong_lotes', 'ong_pedidos', 'ong_pagos_proveedor',
  // El legajo institucional: estatuto, acta constitutiva, matricula (03/09/2026).
  // Sin registrarla aca el modo demo la ignora: alta con toast de exito y lista
  // vacia. Ya paso con `arqueos` y con `planes_cultivo`.
  'ong_documentos_institucionales',
  'ong_solicitudes',
  // Vistas: en la base son calculadas; en demo se siembran como una tabla mas,
  // que es como el shim lee todo. Solo se leen, asi que no se desincronizan.
  'v_saldo_proveedores', 'v_saldo_ordenes',
  'ambiente_salas', 'ambiente_lecturas',
  'cultivo_areas', 'cultivo_lotes', 'cultivo_grupos',
]

export const USUARIO_DEMO = {
  id: 'demo-user-0000-0000-0000-000000000000',
  email: 'demo@growflow.local',
}

// --- siembra ---
//
// Esta instalacion arranca VACIA, a proposito. El seed de ejemplo que traia el
// codigo de origen —pacientes, lotes, caja, riegos— se saco entero: mostraba
// nombres y numeros inventados que se confunden facil con datos reales, y en
// una instalacion nueva lo correcto es que la app se vea como va a ser, que es
// sin nada cargado.
//
// Lo unico que se escribe es el PERFIL del usuario del modo demo: no es un
// dato de la asociacion, es lo que le da rol de administrador a la sesion que
// el dev local auto-loguea. Sin el, `mi_rol()` devuelve 'sin_perfil' y no se
// puede entrar a ninguna pantalla.
function sembrar(): void {
  // Primero se VACIAN todas las tablas. Subir `VERSION_SEED` hace que se vuelva
  // a sembrar, pero no borra nada: quien ya tenia la demo vieja en su navegador
  // seguiria viendo esos datos mezclados con los nuevos, y en este caso —donde
  // lo nuevo es "nada"— los veria intactos y pareceria que el cambio no se
  // aplico.
  for (const tabla of TABLAS_CONOCIDAS) escribirTabla(tabla, [])

  escribirTabla('perfiles_usuario', [
    {
      id: USUARIO_DEMO.id,
      nombre_completo: 'Usuario de prueba',
      rol: 'administrador',
      activo: true,
      ultimo_acceso: new Date().toISOString(),
    },
  ])
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
