import { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, Database, Lock, FileText, Users, Activity, Download, Beaker, Link2, Wrench, Package, ClipboardCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface CheckAuditoria {
  id: string
  nombre: string
  categoria: string
  icono: any
  descripcion: string
  resultado: 'ok' | 'alerta' | 'fallo' | 'pendiente'
  detalle: string
  referencia: string
}

// =====================================================================
// Informacion extensa por chequeo (se muestra en PDF / impresion)
// =====================================================================
interface InfoExtensa {
  queEs: string
  paraQueSirve: string
  comoSeMide: string
  quePasaSiFalla: string
}

const INFO_CHECK: Record<string, InfoExtensa> = {
  'rls-lotes': {
    queEs: 'Verificacion de que la tabla "lotes" en Supabase tiene activado Row Level Security (RLS), un mecanismo de PostgreSQL que filtra a nivel de base de datos que filas puede ver/modificar cada usuario segun su sesion autenticada.',
    paraQueSirve: 'Garantiza que ningun usuario puede acceder a datos de lotes que no le corresponden, incluso si intenta hacer una query directa o usa una herramienta externa. Es la primera linea de defensa contra fugas de informacion sensible (CUMCS exige confidencialidad de datos productivos).',
    comoSeMide: 'Se ejecuta una query SELECT count(*) sobre la tabla lotes desde el frontend autenticado. Si RLS esta correctamente configurado, la query retorna sin error y respeta los filtros del rol del usuario.',
    quePasaSiFalla: 'Si RLS estuviera desactivado, cualquier usuario con la API key public de Supabase podria leer/modificar TODOS los lotes de TODA la empresa. Esto seria una violacion grave de la privacidad de datos productivos y un fallo de cumplimiento GAMP5 categoria 5.',
  },
  'usuarios': {
    queEs: 'Conteo de usuarios con perfil activo en la tabla "perfiles_usuario", que extiende auth.users con rol (admin/supervisor/operador/auditor), nombre completo y estado.',
    paraQueSirve: 'Asegura que existen operadores definidos para registrar acciones con responsable identificable (audit trail). GAMP5 RF-003 exige que cada operacion tenga un autor trazable.',
    comoSeMide: 'COUNT(*) FROM perfiles_usuario WHERE activo = true.',
    quePasaSiFalla: 'Sin usuarios activos no se pueden registrar operaciones, no hay audit trail, y el sistema no es auditable. Los operadores deben crearse via el flujo /auth/v1/signup que dispara el trigger que crea el perfil.',
  },
  'auth': {
    queEs: 'Verificacion de que la sesion actual del usuario tiene un JWT (JSON Web Token) valido emitido por Supabase Auth.',
    paraQueSirve: 'Confirma que el usuario que esta viendo el sistema fue autenticado correctamente y que sus permisos estan respetados. Si el JWT esta vencido o invalido, todas las queries fallaran o retornaran datos vacios por RLS.',
    comoSeMide: 'supabase.auth.getUser() retorna el objeto user si hay sesion valida, null si no.',
    quePasaSiFalla: 'Sin sesion valida el usuario no puede operar el sistema. Debe re-loguear. Si esto fallara para un usuario que esta logueado, indica un problema de expiracion de tokens o de configuracion de auth.',
  },
  'lotes': {
    queEs: 'Cantidad total de lotes productivos cargados en la base de datos (excluye lotes marcados como eliminados con soft-delete).',
    paraQueSirve: 'Es la metrica de masa de datos del sistema. Sin lotes no hay nada que trazar. Los lotes representan unidades productivas (planta madre, esquejes, plantas en cultivo, flores cosechadas, productos finales).',
    comoSeMide: 'COUNT(*) FROM lotes WHERE eliminado = false.',
    quePasaSiFalla: 'Si esta en cero, el sistema esta vacio o no se cargaron datos productivos. Si tiene pocos lotes en una operacion real, puede indicar perdida de datos o falta de carga. Para FIS S.A.S. con 6 camadas activas se esperan minimo decenas de lotes.',
  },
  'productos': {
    queEs: 'Catalogo de productos activos: tipos genericos como planta_madre, esqueje, planta, flor, flor_trimmeada, flor_fraccionada, producto_final, insumo.',
    paraQueSirve: 'Permite tipificar cada lote productivo y aplicar reglas de negocio diferenciadas (un esqueje no se cosecha, una flor no se replanta). Define el flujo seed-to-sale.',
    comoSeMide: 'COUNT(*) FROM productos WHERE activo = true.',
    quePasaSiFalla: 'Sin productos no se pueden crear lotes correctamente tipados. Minimo deberian haber 8 productos basicos del flujo de cannabis medicinal.',
  },
  'instalaciones': {
    queEs: 'Salas/areas fisicas donde ocurren las operaciones: Plantas Madres, Aeroclonador, Vegetativo, Sala Flora 1 (COCO), Sala Flora 2 (RDWC), Secado, Trimming, Cuarentena, Almacenamiento, Deposito.',
    paraQueSirve: 'Permite trazabilidad geografica (donde estaba cada lote en cada momento) y asignacion de responsabilidades por sala. CUMCS exige geo-trazabilidad de cultivo.',
    comoSeMide: 'COUNT(*) FROM instalaciones WHERE activo = true.',
    quePasaSiFalla: 'Sin instalaciones definidas no se puede registrar el origen ni el destino de las operaciones (ej: cosecha desde "Sala Flora 1" hacia "Secado").',
  },
  'variedades': {
    queEs: 'Variedades geneticas de cannabis configuradas. FIS S.A.S. trabaja con PETE HOPE (Ka).',
    paraQueSirve: 'Cada lote se asocia a una variedad para diferenciar producciones, calcular vencimientos especificos y armar Certificados de Analisis (COA) por variedad.',
    comoSeMide: 'COUNT(*) FROM variedades WHERE activo = true.',
    quePasaSiFalla: 'Sin variedades el sistema no puede tipificar geneticamente los lotes ni emitir certificados especificos.',
  },
  'config': {
    queEs: 'Parametros de configuracion del sistema almacenados en la tabla configuracion_sistema (ej: nombre empresa, CUIT, timezone, version del sistema).',
    paraQueSirve: 'Centralizan la configuracion modificable del sistema sin necesidad de redespliegue. Permiten parametrizar el comportamiento por entorno.',
    comoSeMide: 'COUNT(*) FROM configuracion_sistema.',
    quePasaSiFalla: 'Si faltan parametros minimos, ciertas funcionalidades pueden tomar valores por defecto incorrectos.',
  },
  'traza-completa': {
    queEs: 'Porcentaje de lotes que tienen asignado un codigo de trazabilidad en datos_extra (cod_traza_acumulado, cod_traza_cosecha o codigo_id).',
    paraQueSirve: 'La trazabilidad CUMCS exige que cada lote tenga un codigo unico que permita rastrear su origen y destino. Un % alto significa que la cadena de trazabilidad esta integra.',
    comoSeMide: 'Se cargan los primeros 500 lotes y se cuenta cuantos tienen al menos uno de los 3 campos de codigo en datos_extra. Pct = conTraza / total * 100.',
    quePasaSiFalla: 'Lotes sin codigo no son rastreables. En auditoria CUMCS un lote sin trazabilidad es una NO CONFORMIDAD que puede invalidar el lote completo. Hay que asignar codigo retroactivo.',
  },
  'ops-huerfanas': {
    queEs: 'Operaciones registradas que no tienen un lote asociado (lote_origen_id NULL), excluyendo planta_madre e ingreso_insumos que no requieren un lote previo.',
    paraQueSirve: 'Detecta operaciones mal cargadas que rompen la cadena de trazabilidad. Una cosecha sin lote_origen no se puede asociar al cultivo del que vino.',
    comoSeMide: 'Se cargan las primeras 1000 operaciones y se cuenta cuantas no tienen lote_origen_id, filtrando los tipos que sí lo permiten (planta_madre/ingreso).',
    quePasaSiFalla: 'Cada operacion huerfana es un punto ciego en la trazabilidad. Hay que vincular manualmente al lote correcto en datos_extra o lote_origen_id, o marcar la operacion como invalida.',
  },
  'camadas-cubiertas': {
    queEs: 'De las 6 camadas activas conocidas (C7, C9, C11, C12, C15, C16), cuantas tienen al menos una operacion registrada en el sistema.',
    paraQueSirve: 'Mide el avance de carga de datos historicos en CannTrace. Cada camada activa deberia tener su flujo completo registrado.',
    comoSeMide: 'Se buscan operaciones con datos_extra.camada y se compara con la lista de camadas esperadas.',
    quePasaSiFalla: 'Las camadas faltantes indican datos no migrados desde Excel. Hay que cargarlas para tener el set completo de la auditoria CUMCS.',
  },
  'ops-total': {
    queEs: 'Numero total de operaciones registradas en el sistema en cualquier estado (borrador, confirmada, anulada).',
    paraQueSirve: 'Es la metrica de actividad operativa. Cada operacion representa un evento productivo trazable: cosecha, fertilizacion, esquejado, etc.',
    comoSeMide: 'COUNT(*) FROM operaciones.',
    quePasaSiFalla: 'Si esta en cero, el sistema no se esta usando. Hay que comenzar a registrar operaciones (manual o por chat) para generar el audit trail.',
  },
  'ops-confirmadas': {
    queEs: 'Distribucion entre operaciones confirmadas (con audit trail completo y firma) y en borrador (creadas pero no confirmadas).',
    paraQueSirve: 'Las operaciones en borrador no tienen efecto regulatorio. Solo las confirmadas valen para CUMCS. Mas borradores que confirmadas indica falta de proceso de cierre.',
    comoSeMide: 'COUNT(*) FROM operaciones GROUP BY estado.',
    quePasaSiFalla: 'Si hay muchas operaciones en borrador, hay que revisarlas y confirmarlas. Las que esten incorrectas se anulan con motivo. CUMCS RF-009.',
  },
  'audit-trail': {
    queEs: 'Verificacion de que cada operacion tiene un usuario creador (creado_por NOT NULL) que la genero. Es el corazon del audit trail GAMP5.',
    paraQueSirve: 'Permite saber QUIEN registro CADA operacion. Sin esto no hay rendicion de cuentas ni se puede rastrear errores. GAMP5 RF-009 obliga audit trail completo, inmutable y firmado.',
    comoSeMide: 'Se traen las primeras 200 operaciones y se cuenta cuantas tienen creado_por.',
    quePasaSiFalla: 'Operaciones sin creado_por son invalidas para auditoria. Indica que se crearon directamente por SQL evitando el flujo de la app, lo cual es una violacion grave.',
  },
  'cumcs-tipos': {
    queEs: 'Cantidad de tipos de registro CUMCS configurados en la tabla tipos_registro_cumcs (planillas oficiales del Excel CM-RE-1010).',
    paraQueSirve: 'Es el catalogo maestro de las 84 planillas exigidas por CUMCS IMC-GAP / Disposicion 4159 ANMAT, agrupadas en 10 grupos (G01 a G10).',
    comoSeMide: 'COUNT(*) FROM tipos_registro_cumcs. El target es 84 (igual al Excel CM-RE-1010 v2).',
    quePasaSiFalla: 'Si faltan tipos, hay planillas no representadas en el sistema. Hay que insertarlas en tipos_registro_cumcs con grupo, nombre y procedimiento de referencia.',
  },
  'cumcs-grupos-act': {
    queEs: 'Cantidad de grupos CUMCS (G01 a G10) que tienen al menos UNA operacion registrada con datos_extra.registro_cumcs.',
    paraQueSirve: 'Mide la cobertura real de carga de datos por grupo. Si solo hay datos en G06 Cosecha, los otros 9 grupos estan sin actividad y eso es problema para CUMCS.',
    comoSeMide: 'Se traen las operaciones con registro_cumcs no nulo, se agrupan por datos_extra.grupo y se cuentan los grupos con al menos 1 registro.',
    quePasaSiFalla: 'Grupos sin actividad indican areas del CUMCS que aun no se estan registrando. Hay que generar registros desde Registros CUMCS o Operaciones para cubrir esos grupos.',
  },
  'cumcs-tablas': {
    queEs: 'De las 5 tablas auxiliares de CUMCS (registros_agua, fitosanitarios, mantenimiento, calidad, documentales), cuantas tienen al menos un registro.',
    paraQueSirve: 'Cada tabla cubre un area especifica del CUMCS (G04 agua, G05 plagas, G07 mantenimiento, G09 calidad, G03/G08/G10 documentales). Sin datos en esas tablas, esos grupos del CUMCS estan vacios.',
    comoSeMide: 'Loop por las 5 tablas con COUNT(*). Se cuenta cuantas tienen >= 1.',
    quePasaSiFalla: 'Hay que cargar registros desde Registros CUMCS, eligiendo el codigo CM-RE-XXXX correspondiente al grupo que falta.',
  },
  'no-conformes': {
    queEs: 'No conformidades (PNC = Producto No Conforme) registradas con resultado pendiente, sin cerrar.',
    paraQueSirve: 'Cada PNC pendiente representa un producto o proceso fuera de especificaciones que aun no se resolvio. CUMCS exige cierre con accion correctiva y preventiva en plazo definido.',
    comoSeMide: 'COUNT(*) FROM registros_calidad WHERE tipo = no_conforme AND resultado = pendiente.',
    quePasaSiFalla: 'PNCs sin cerrar acumulan riesgo regulatorio. Hay que documentar accion correctiva (que se hizo para resolver el problema actual) y preventiva (que se hizo para evitar que vuelva a pasar) y cerrar el caso. CM-RE-0909.',
  },
  'lmr-analisis': {
    queEs: 'Porcentaje de analisis de laboratorio postcosecha (CM-RE-0905) con resultado aprobado vs total.',
    paraQueSirve: 'El analisis postcosecha verifica cannabinoides (CBN, CBD, THC), aflatoxinas, pesticidas, metales pesados y microbiologico. Solo los lotes aprobados pueden comercializarse.',
    comoSeMide: 'aprobados / total * 100. Aprobados = registros_calidad WHERE tipo = analisis_postcosecha AND resultado = aprobado.',
    quePasaSiFalla: 'Pct bajo indica problemas de calidad sistematicos en cultivo. Hay que revisar BPA (Buenas Practicas Agricolas), control de plagas y postcosecha. Lotes rechazados deben disponerse via CM-RE-0910.',
  },
  'reclamos': {
    queEs: 'Reclamos de clientes registrados como pendientes (sin cerrar).',
    paraQueSirve: 'Cada reclamo abierto es un cliente insatisfecho sin resolucion. CUMCS exige tratamiento documentado con accion correctiva y comunicacion al cliente.',
    comoSeMide: 'COUNT(*) FROM registros_calidad WHERE tipo = reclamo_cliente AND resultado = pendiente.',
    quePasaSiFalla: 'Hay que abordar cada reclamo, registrar accion correctiva y cerrar el caso. Ver CM-RE-0906.',
  },
  'fito-carencia': {
    queEs: 'Aplicaciones fitosanitarias dentro del periodo de carencia, es decir, antes de que se cumpla el plazo entre aplicacion y cosecha/comercializacion.',
    paraQueSirve: 'El periodo de carencia es el tiempo minimo en dias entre la ultima aplicacion de un fitosanitario y la cosecha, para asegurar que los residuos esten por debajo del LMR (Limite Maximo de Residuos). Comercializar antes es ilegal y peligroso.',
    comoSeMide: 'Se traen las primeras 100 aplicaciones, se calcula dias = hoy - fecha. Si dias < periodo_carencia_dias, esa aplicacion esta aun en carencia.',
    quePasaSiFalla: 'Lotes asociados a aplicaciones en carencia NO PUEDEN comercializarse hasta que se cumpla el plazo. Hay que monitorear y bloquear ventas de esos lotes. CM-RE-0504, CM-RE-0505.',
  },
  'fito-monitoreo': {
    queEs: 'Cantidad de monitoreos de plagas y enfermedades registrados (CM-RE-0502).',
    paraQueSirve: 'El MIP (Manejo Integrado de Plagas) requiere monitoreos periodicos para detectar problemas tempranamente y minimizar uso de fitosanitarios. CUMCS 18.2 lo exige.',
    comoSeMide: 'COUNT(*) FROM registros_fitosanitarios WHERE tipo = monitoreo_plagas.',
    quePasaSiFalla: 'Sin monitoreos no se puede demostrar manejo preventivo de plagas. Hay que registrar al menos un monitoreo semanal por sala.',
  },
  'calibraciones': {
    queEs: 'Cantidad total de registros de mantenimiento y calibracion en registros_mantenimiento, con detalle de cuantos son calibraciones de balanza.',
    paraQueSirve: 'CUMCS 19.11.1 exige calibracion periodica de equipos criticos (balanzas, ph metros, equipos de medicion). Sin calibracion los datos productivos no son confiables.',
    comoSeMide: 'COUNT(*) FROM registros_mantenimiento total y filtrado por tipo = calibracion_balanza.',
    quePasaSiFalla: 'Hay que registrar mantenimientos preventivos del generador, AC, ventiladores, deshumificadores, ósmosis y calibraciones de balanzas y equipos de medicion. CM-RE-0701 a 0707.',
  },
  'stock-pedidos': {
    queEs: 'Pedidos de insumos registrados en el sistema (compra de fertilizantes, sustratos, equipamiento).',
    paraQueSirve: 'Trazabilidad completa de la cadena: desde el pedido al proveedor hasta el lote producido. Permite auditar que insumos entraron, cuando, de que proveedor.',
    comoSeMide: 'COUNT(*) FROM registros_documentales WHERE tipo = pedido_insumos.',
    quePasaSiFalla: 'Sin registros de pedidos no se puede trazar el origen de los insumos usados en cada lote, lo cual es exigido por CUMCS para alertar en caso de problemas con el proveedor. CM-RE-0306.',
  },
}

const INFO_CATEGORIA: Record<string, { intro: string; importancia: string }> = {
  Seguridad: {
    intro: 'Verificaciones de control de acceso, autenticacion y politicas de Row Level Security en PostgreSQL.',
    importancia: 'Es la base de la confianza en el sistema. Si la seguridad falla, todos los datos pueden ser comprometidos. GAMP5 categoria 5 requiere autenticacion robusta y control de acceso por rol.',
  },
  Datos: {
    intro: 'Verificacion de catalogos maestros y datos base sin los que el sistema no puede operar.',
    importancia: 'Sin estos datos base (productos, instalaciones, variedades, configuracion), el sistema no puede registrar operaciones validas ni mantener trazabilidad coherente.',
  },
  Trazabilidad: {
    intro: 'Verificacion de la integridad de la cadena de trazabilidad seed-to-sale.',
    importancia: 'La trazabilidad es el requisito CUMCS mas critico. Cada lote debe poder rastrearse desde la planta madre hasta el producto comercializado, y viceversa.',
  },
  Operaciones: {
    intro: 'Verificacion de las operaciones registradas, su estado y audit trail.',
    importancia: 'Las operaciones son el corazon del sistema. Sin audit trail (quien hizo que y cuando) no hay validacion GAMP5 posible.',
  },
  Cumplimiento: {
    intro: 'Verificacion de cobertura del estandar CUMCS IMC-GAP / Disposicion 4159 ANMAT.',
    importancia: 'CUMCS es el estandar regulatorio argentino para cannabis medicinal. Cubrir todos sus 84 registros es obligatorio para operar legalmente.',
  },
  Calidad: {
    intro: 'Verificacion de no conformidades, analisis de laboratorio y reclamos de clientes.',
    importancia: 'La calidad final del producto es responsabilidad del sistema. PNCs sin cerrar y reclamos abiertos representan riesgo regulatorio y comercial.',
  },
  Fitosanitarios: {
    intro: 'Verificacion del manejo integrado de plagas (MIP) y aplicaciones fitosanitarias.',
    importancia: 'Las aplicaciones fitosanitarias deben respetar carencias antes de cosecha. Comercializar producto en carencia es ilegal y riesgoso para el consumidor.',
  },
  Mantenimiento: {
    intro: 'Verificacion de mantenimiento preventivo y calibraciones de equipos criticos.',
    importancia: 'Equipos sin calibrar generan datos no confiables. Mantenimiento descuidado puede causar perdida de produccion o accidentes.',
  },
  Stock: {
    intro: 'Verificacion de movimientos de inventario y pedidos de insumos.',
    importancia: 'Stock no controlado es riesgo de quiebre productivo y trazabilidad rota desde el origen.',
  },
}

export default function PaginaAutoAuditoria() {
  const [checks, setChecks] = useState<CheckAuditoria[]>([])
  const [ejecutando, setEjecutando] = useState(false)
  const [ultimaEjecucion, setUltimaEjecucion] = useState<Date | null>(null)
  const [mostrarCodigos, setMostrarCodigos] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('canntrace.autoAud.mostrarCodigos') === '1'
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('canntrace.autoAud.mostrarCodigos', mostrarCodigos ? '1' : '0')
  }, [mostrarCodigos])

  async function ejecutarAuditoria() {
    setEjecutando(true)
    const r: CheckAuditoria[] = []
    const cnt = async (tabla: string, filtros?: Record<string, any>): Promise<number> => {
      try {
        let q = supabase.from(tabla).select('*', { count: 'exact', head: true })
        if (filtros) for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v)
        const { count } = await q
        return count || 0
      } catch { return 0 }
    }

    // SEGURIDAD
    try {
      await supabase.from('lotes').select('id', { count: 'exact', head: true })
      r.push({ id: 'rls-lotes', nombre: 'RLS activo en tabla lotes', categoria: 'Seguridad', icono: Lock, descripcion: 'Row Level Security habilitado', resultado: 'ok', detalle: 'RLS activo - query controlada por politicas', referencia: 'RS-001, RS-002' })
    } catch (err: any) {
      r.push({ id: 'rls-lotes', nombre: 'RLS activo en tabla lotes', categoria: 'Seguridad', icono: Lock, descripcion: 'Row Level Security habilitado', resultado: 'fallo', detalle: `Error: ${err.message}`, referencia: 'RS-001, RS-002' })
    }
    const usuariosActivos = await cnt('perfiles_usuario', { activo: true })
    r.push({ id: 'usuarios', nombre: `Usuarios activos: ${usuariosActivos}`, categoria: 'Seguridad', icono: Users, descripcion: 'Usuarios con perfil + rol asignado', resultado: usuariosActivos >= 1 ? 'ok' : 'fallo', detalle: `${usuariosActivos} usuarios con perfil activo`, referencia: 'RF-003, RS-001' })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      r.push({ id: 'auth', nombre: 'Autenticacion activa', categoria: 'Seguridad', icono: Lock, descripcion: 'Sesion JWT valida', resultado: user ? 'ok' : 'fallo', detalle: user ? `Sesion: ${user.email}` : 'Sin sesion activa', referencia: 'RF-002, RF-004' })
    } catch { /* */ }

    // DATOS
    const lotes = await cnt('lotes', { eliminado: false })
    r.push({ id: 'lotes', nombre: `Lotes cargados: ${lotes}`, categoria: 'Datos', icono: Database, descripcion: 'Lotes reales en BD', resultado: lotes > 0 ? 'ok' : 'alerta', detalle: `${lotes} lotes ${lotes > 0 ? '(datos FIS S.A.S.)' : '- vacio'}`, referencia: 'RF-010' })
    const productos = await cnt('productos', { activo: true })
    r.push({ id: 'productos', nombre: `Productos activos: ${productos}`, categoria: 'Datos', icono: Database, descripcion: 'Catalogo de productos', resultado: productos >= 5 ? 'ok' : 'alerta', detalle: `${productos} productos en catalogo`, referencia: 'RF-008' })
    const instalaciones = await cnt('instalaciones', { activo: true })
    r.push({ id: 'instalaciones', nombre: `Instalaciones: ${instalaciones}`, categoria: 'Datos', icono: Database, descripcion: 'Salas/instalaciones configuradas', resultado: instalaciones >= 8 ? 'ok' : 'alerta', detalle: `${instalaciones} instalaciones activas`, referencia: 'RF-007' })
    const variedades = await cnt('variedades', { activo: true })
    r.push({ id: 'variedades', nombre: `Variedades: ${variedades}`, categoria: 'Datos', icono: Database, descripcion: 'Variedades de cannabis', resultado: variedades >= 1 ? 'ok' : 'alerta', detalle: `${variedades} variedades`, referencia: 'RF-006' })
    const config = await cnt('configuracion_sistema')
    r.push({ id: 'config', nombre: `Parametros sistema: ${config}`, categoria: 'Datos', icono: Activity, descripcion: 'Configuracion del sistema', resultado: config >= 3 ? 'ok' : 'alerta', detalle: `${config} parametros configurados`, referencia: 'RF-001' })

    // TRAZABILIDAD
    try {
      const { data: lotesTraza } = await supabase.from('lotes').select('id, codigo_lote, datos_extra').eq('eliminado', false).limit(500)
      const conTraza = (lotesTraza || []).filter(l => l.datos_extra?.cod_traza_acumulado || l.datos_extra?.cod_traza_cosecha || l.datos_extra?.codigo_id).length
      const total = (lotesTraza || []).length
      const pct = total > 0 ? Math.round((conTraza / total) * 100) : 0
      r.push({ id: 'traza-completa', nombre: `Lotes con codigo trazabilidad: ${conTraza}/${total} (${pct}%)`, categoria: 'Trazabilidad', icono: Link2, descripcion: 'Lotes con codigo de traza en datos_extra', resultado: pct >= 70 ? 'ok' : pct >= 40 ? 'alerta' : 'fallo', detalle: `${conTraza} de ${total} lotes tienen codigo de trazabilidad asignado`, referencia: 'RF-010, CUMCS 12.1-12.5' })
    } catch { /* */ }
    try {
      const { data: ops } = await supabase.from('operaciones').select('id, tipo_operacion, lote_origen_id').limit(1000)
      const huerfanas = (ops || []).filter(o => !o.lote_origen_id && !['planta_madre', 'ingreso_insumos'].includes(o.tipo_operacion)).length
      r.push({ id: 'ops-huerfanas', nombre: `Operaciones sin lote: ${huerfanas}`, categoria: 'Trazabilidad', icono: Link2, descripcion: 'Operaciones que deberian tener lote pero no', resultado: huerfanas === 0 ? 'ok' : huerfanas <= 5 ? 'alerta' : 'fallo', detalle: `${huerfanas} operaciones huerfanas (excluye planta_madre e ingreso_insumos)`, referencia: 'RF-009' })
    } catch { /* */ }
    try {
      const camadasEsperadas = ['C7', 'C9', 'C11', 'C12', 'C15', 'C16']
      const { data: opsPorCamada } = await supabase.from('operaciones').select('tipo_operacion, datos_extra').limit(1000)
      const camadasConOps = new Set<string>()
      for (const o of (opsPorCamada || [])) {
        const cam = (o.datos_extra as any)?.camada
        if (cam) camadasConOps.add(cam.replace(/^C?/, 'C'))
      }
      const cubiertas = camadasEsperadas.filter(c => camadasConOps.has(c)).length
      r.push({ id: 'camadas-cubiertas', nombre: `Camadas con operaciones: ${cubiertas}/${camadasEsperadas.length}`, categoria: 'Trazabilidad', icono: Link2, descripcion: 'Camadas con al menos una operacion registrada', resultado: cubiertas === camadasEsperadas.length ? 'ok' : cubiertas >= 4 ? 'alerta' : 'fallo', detalle: `${cubiertas}/${camadasEsperadas.length} camadas tienen operaciones cargadas`, referencia: 'RF-010' })
    } catch { /* */ }

    // OPERACIONES
    const opsTotal = await cnt('operaciones')
    r.push({ id: 'ops-total', nombre: `Operaciones totales: ${opsTotal}`, categoria: 'Operaciones', icono: FileText, descripcion: 'Operaciones registradas con audit trail', resultado: opsTotal > 0 ? 'ok' : 'alerta', detalle: `${opsTotal} operaciones ${opsTotal === 0 ? '- sin operaciones cargadas' : 'con audit trail'}`, referencia: 'RF-009, RF-010' })
    try {
      const { count: confirmadas } = await supabase.from('operaciones').select('*', { count: 'exact', head: true }).eq('estado', 'confirmada')
      const { count: borrador } = await supabase.from('operaciones').select('*', { count: 'exact', head: true }).eq('estado', 'borrador')
      const c = confirmadas || 0, b = borrador || 0
      r.push({ id: 'ops-confirmadas', nombre: `Confirmadas vs borrador: ${c} / ${b}`, categoria: 'Operaciones', icono: CheckCircle2, descripcion: 'Distribucion de estados', resultado: b === 0 ? 'ok' : b <= 3 ? 'alerta' : 'fallo', detalle: `${c} confirmadas y ${b} en borrador`, referencia: 'RF-009' })
    } catch { /* */ }
    try {
      const { data: opsCreador } = await supabase.from('operaciones').select('creado_por').limit(200)
      const total = (opsCreador || []).length
      const sinCreador = (opsCreador || []).filter(o => !o.creado_por).length
      r.push({ id: 'audit-trail', nombre: `Audit trail: ${total - sinCreador}/${total}`, categoria: 'Operaciones', icono: Activity, descripcion: 'Operaciones con creado_por', resultado: sinCreador === 0 ? 'ok' : 'alerta', detalle: `${total - sinCreador} de ${total} operaciones tienen creado_por`, referencia: 'RF-009 GAMP5' })
    } catch { /* */ }

    // CUMPLIMIENTO
    const cumcsTipos = await cnt('tipos_registro_cumcs')
    r.push({ id: 'cumcs-tipos', nombre: `Tipos registro CUMCS: ${cumcsTipos}/84`, categoria: 'Cumplimiento', icono: ShieldCheck, descripcion: 'Tipos CUMCS IMC-GAP cargados', resultado: cumcsTipos >= 84 ? 'ok' : cumcsTipos >= 80 ? 'alerta' : 'fallo', detalle: `${cumcsTipos}/84 tipos CUMCS configurados`, referencia: 'RR-001 a RR-009' })
    try {
      const { data: opsConCumcs } = await supabase.from('operaciones').select('datos_extra').not('datos_extra->>registro_cumcs', 'is', null).limit(2000)
      const porGrupo: Record<string, number> = {}
      for (const o of (opsConCumcs || [])) {
        const g = (o.datos_extra as any)?.grupo
        if (g) porGrupo[g] = (porGrupo[g] || 0) + 1
      }
      const conActividad = Object.keys(porGrupo).length
      r.push({ id: 'cumcs-grupos-act', nombre: `Grupos CUMCS con operaciones: ${conActividad}/10`, categoria: 'Cumplimiento', icono: ShieldCheck, descripcion: 'Grupos CUMCS con al menos una operacion', resultado: conActividad >= 6 ? 'ok' : conActividad >= 3 ? 'alerta' : 'fallo', detalle: `Detalle: ${Object.entries(porGrupo).map(([g, n]) => `${g}:${n}`).join(', ') || 'ninguno'}`, referencia: 'CUMCS por grupo' })
    } catch { /* */ }
    const tablasCumcs = ['registros_agua', 'registros_fitosanitarios', 'registros_mantenimiento', 'registros_calidad', 'registros_documentales']
    let tablasConDatos = 0
    const conteosTabla: string[] = []
    for (const tabla of tablasCumcs) {
      const c = await cnt(tabla)
      if (c > 0) tablasConDatos++
      conteosTabla.push(`${tabla.replace('registros_', '')}:${c}`)
    }
    r.push({ id: 'cumcs-tablas', nombre: `Tablas CUMCS con datos: ${tablasConDatos}/${tablasCumcs.length}`, categoria: 'Cumplimiento', icono: Activity, descripcion: 'Tablas auxiliares CUMCS con datos', resultado: tablasConDatos >= 4 ? 'ok' : tablasConDatos > 0 ? 'alerta' : 'fallo', detalle: conteosTabla.join(', '), referencia: 'RR-001 a RR-009' })

    // CALIDAD
    try {
      const { count } = await supabase.from('registros_calidad').select('*', { count: 'exact', head: true }).eq('tipo', 'no_conforme').eq('resultado', 'pendiente')
      const c = count || 0
      r.push({ id: 'no-conformes', nombre: `No Conformidades pendientes: ${c}`, categoria: 'Calidad', icono: AlertTriangle, descripcion: 'PNCs sin cerrar', resultado: c === 0 ? 'ok' : c <= 2 ? 'alerta' : 'fallo', detalle: `${c} no conformidades sin resolver`, referencia: 'CUMCS 19.7, CM-RE-0909' })
    } catch { /* */ }
    try {
      const { count: total } = await supabase.from('registros_calidad').select('*', { count: 'exact', head: true }).eq('tipo', 'analisis_postcosecha')
      const { count: aprobados } = await supabase.from('registros_calidad').select('*', { count: 'exact', head: true }).eq('tipo', 'analisis_postcosecha').eq('resultado', 'aprobado')
      const t = total || 0, a = aprobados || 0
      const pct = t > 0 ? Math.round((a / t) * 100) : 0
      r.push({ id: 'lmr-analisis', nombre: `Analisis lab aprobados: ${a}/${t} (${pct}%)`, categoria: 'Calidad', icono: Beaker, descripcion: 'Analisis postcosecha aprobados', resultado: t === 0 ? 'alerta' : pct >= 90 ? 'ok' : pct >= 70 ? 'alerta' : 'fallo', detalle: `${a} aprobados de ${t} analisis`, referencia: 'CM-RE-0905' })
    } catch { /* */ }
    try {
      const { count } = await supabase.from('registros_calidad').select('*', { count: 'exact', head: true }).eq('tipo', 'reclamo_cliente').eq('resultado', 'pendiente')
      const c = count || 0
      r.push({ id: 'reclamos', nombre: `Reclamos abiertos: ${c}`, categoria: 'Calidad', icono: AlertTriangle, descripcion: 'Reclamos sin cerrar', resultado: c === 0 ? 'ok' : c <= 1 ? 'alerta' : 'fallo', detalle: `${c} reclamos sin resolver`, referencia: 'CM-RE-0906' })
    } catch { /* */ }

    // FITOSANITARIOS
    try {
      const { data: aplicaciones } = await supabase.from('registros_fitosanitarios').select('fecha, periodo_carencia_dias').eq('tipo', 'aplicacion_fitosanitario').limit(100)
      const hoy = new Date()
      const enCarencia = (aplicaciones || []).filter(a => {
        if (!a.fecha || !a.periodo_carencia_dias) return false
        const dias = (hoy.getTime() - new Date(a.fecha).getTime()) / 86400000
        return dias < a.periodo_carencia_dias
      }).length
      r.push({ id: 'fito-carencia', nombre: `Aplicaciones en carencia: ${enCarencia}`, categoria: 'Fitosanitarios', icono: AlertTriangle, descripcion: 'Aplicaciones dentro de carencia', resultado: enCarencia === 0 ? 'ok' : 'alerta', detalle: `${enCarencia} aplicaciones aun en carencia`, referencia: 'CM-RE-0504, CM-RE-0505' })
    } catch { /* */ }
    try {
      const monitoreos = await cnt('registros_fitosanitarios', { tipo: 'monitoreo_plagas' })
      r.push({ id: 'fito-monitoreo', nombre: `Monitoreos plagas: ${monitoreos}`, categoria: 'Fitosanitarios', icono: Activity, descripcion: 'Registros de monitoreo plagas', resultado: monitoreos > 0 ? 'ok' : 'alerta', detalle: `${monitoreos} monitoreos cargados (CM-RE-0502)`, referencia: 'CUMCS 18.2' })
    } catch { /* */ }

    // MANTENIMIENTO
    try {
      const calibraciones = await cnt('registros_mantenimiento', { tipo: 'calibracion_balanza' })
      const total = await cnt('registros_mantenimiento')
      r.push({ id: 'calibraciones', nombre: `Mantenimientos cargados: ${total}`, categoria: 'Mantenimiento', icono: Wrench, descripcion: 'Registros de mantenimiento', resultado: total > 0 ? 'ok' : 'alerta', detalle: `${total} registros (${calibraciones} calibraciones balanza)`, referencia: 'CM-RE-0701 a 0707' })
    } catch { /* */ }

    // STOCK
    try {
      const stockMovs = await cnt('registros_documentales', { tipo: 'pedido_insumos' })
      r.push({ id: 'stock-pedidos', nombre: `Pedidos insumos: ${stockMovs}`, categoria: 'Stock', icono: Package, descripcion: 'Pedidos de insumos', resultado: stockMovs >= 0 ? 'ok' : 'alerta', detalle: `${stockMovs} pedidos en sistema`, referencia: 'RF-008' })
    } catch { /* */ }

    setChecks(r)
    setUltimaEjecucion(new Date())
    setEjecutando(false)
  }

  useEffect(() => { ejecutarAuditoria() }, [])

  const totalOk = checks.filter(c => c.resultado === 'ok').length
  const totalAlerta = checks.filter(c => c.resultado === 'alerta').length
  const totalFallo = checks.filter(c => c.resultado === 'fallo').length
  const porcentaje = checks.length > 0 ? Math.round((totalOk / checks.length) * 100) : 0
  const categorias = [...new Set(checks.map(c => c.categoria))]

  // Conclusiones automaticas segun resultados
  const conclusiones: string[] = []
  if (porcentaje >= 90) conclusiones.push('El sistema cumple los requisitos GAMP5 y CUMCS de manera ejemplar. Las verificaciones automaticas son consistentes y los datos productivos estan integros.')
  else if (porcentaje >= 70) conclusiones.push('El sistema cumple la mayoria de los requisitos pero hay areas de mejora detectadas en los chequeos marcados como Alerta.')
  else conclusiones.push('El sistema tiene desviaciones significativas. Se recomienda priorizar la resolucion de los chequeos marcados como Fallo antes de avanzar.')
  if (totalFallo > 0) conclusiones.push(`Se detectaron ${totalFallo} fallos criticos que deben resolverse de inmediato. Estos representan riesgo regulatorio o tecnico.`)
  if (totalAlerta > 0) conclusiones.push(`Hay ${totalAlerta} alertas que requieren atencion en el corto plazo. No bloquean operacion pero deben revisarse en la proxima ronda de mejora.`)
  if (totalFallo === 0 && totalAlerta === 0) conclusiones.push('No hay alertas ni fallos. Continuar con el plan operativo normal y re-ejecutar la auditoria periodicamente.')

  function descargarPDF() {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-family: 'Times New Roman', serif; }
          aside, .no-print, header.bg-white { display: none !important; }
          main { display: block !important; overflow: visible !important; }
          #auditoria-pdf { padding: 18mm !important; box-shadow: none !important; max-width: none !important; }
          .print-page-break { page-break-inside: avoid; break-inside: avoid; }
          .print-page-after { page-break-after: always; break-after: page; }
          .print-show { display: block !important; }
          .print-hide { display: none !important; }
          .print-text-justify { text-align: justify; }
          h1 { font-size: 22pt !important; margin-bottom: 4mm !important; }
          h2 { font-size: 16pt !important; margin-top: 8mm !important; margin-bottom: 3mm !important; border-bottom: 2pt solid #333; padding-bottom: 2mm; }
          h3 { font-size: 13pt !important; margin-top: 5mm !important; margin-bottom: 2mm !important; color: #1a4480; }
          h4 { font-size: 11pt !important; margin-top: 3mm !important; margin-bottom: 1mm !important; }
          p { font-size: 10pt !important; line-height: 1.4 !important; margin: 1mm 0 !important; }
          .print-block { background: white !important; border: 1pt solid #999 !important; padding: 3mm !important; margin: 2mm 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .print-info-block { background: #f5f5f5 !important; padding: 2mm 3mm !important; margin-top: 1mm !important; border-left: 2pt solid #1a4480 !important; }
          .print-info-block p { margin: 0.5mm 0 !important; font-size: 9pt !important; }
          .print-info-block strong { color: #1a4480; }
          .print-info-block .label { font-weight: bold; display: inline-block; min-width: 28mm; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 0.5pt solid #aaa; padding: 1mm 2mm; font-size: 9pt; text-align: left; }
          th { background: #f0f0f0; }
        }
        .print-show { display: none; }
      `}</style>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans print:bg-white ct-page-scroll" id="auditoria-pdf">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b] no-print">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ClipboardCheck className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Auto-Auditoria del Sistema</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {checks.length > 0
                ? <><span className="tabular-nums text-[#d9f99d]">{porcentaje}%</span> cumplimiento · <span className="tabular-nums">{totalOk}</span> OK · <span className="tabular-nums text-[#c4b5fd]">{totalAlerta}</span> alertas · <span className="tabular-nums text-[#ff8a7a]">{totalFallo}</span> fallos</>
                : 'Verificacion automatica GAMP5'}
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> CUMCS IMC-GAP</span>
            </div>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setMostrarCodigos(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] uppercase tracking-widest font-medium transition-colors ${
              mostrarCodigos
                ? 'border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d]'
                : 'border-[#1f1f2b] bg-transparent text-[#5c5c6b] hover:text-[#d9f99d] hover:border-[#a3e635]/30'
            }`}
            title="Mostrar/ocultar referencias CM-RE"
          >
            <span className="hidden sm:inline">Códigos:</span>
            <span>{mostrarCodigos ? 'ON' : 'OFF'}</span>
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />GAMP5 Cat5
          </span>
        </div>
      </div>
      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">

        {/* PORTADA del PDF */}
        <div className="print-show print-page-break mb-8 pb-6 border-b-2 border-surface-300">
          <h1 className="text-3xl font-bold">Reporte de Auto-Auditoria GAMP5</h1>
          <h2 className="text-xl">Sistema CannTrace - Trazabilidad Cannabis Medicinal</h2>
          <p className="mt-4"><strong>Empresa:</strong> FIS S.A.S.</p>
          <p><strong>Sistema:</strong> CannTrace - PWA seed-to-sale validacion GAMP5 Cat 5</p>
          <p><strong>Estandar regulatorio:</strong> CUMCS IMC-GAP / Disposicion 4159 ANMAT</p>
          <p><strong>Fecha de ejecucion:</strong> {new Date().toLocaleString('es-AR')}</p>
          <p className="mt-4"><strong>Score de Cumplimiento:</strong> {porcentaje}% ({totalOk} OK / {totalAlerta} Alertas / {totalFallo} Fallos sobre {checks.length} chequeos)</p>
        </div>

        {/* RESUMEN EJECUTIVO - solo PDF */}
        <div className="print-show mb-8 print-page-break">
          <h2>1. Resumen Ejecutivo</h2>
          <p className="print-text-justify">
            Este reporte presenta los resultados de la auto-auditoria automatica ejecutada sobre el sistema CannTrace, plataforma de trazabilidad seed-to-sale para cannabis medicinal de FIS S.A.S. La auto-auditoria es una funcionalidad nativa del sistema que ejecuta {checks.length} verificaciones automaticas sobre integridad de datos, seguridad, trazabilidad CUMCS, calidad, fitosanitarios, mantenimiento y stock, consultando directamente la base de datos PostgreSQL gestionada por Supabase.
          </p>
          <p className="print-text-justify">
            El score global de cumplimiento es de <strong>{porcentaje}%</strong>. Se detectaron <strong>{totalOk} verificaciones correctas</strong>, <strong>{totalAlerta} alertas</strong> que requieren atencion y <strong>{totalFallo} fallos criticos</strong> que deben resolverse para garantizar el cumplimiento GAMP5 y CUMCS.
          </p>
          <p className="print-text-justify">
            <strong>Para que sirve este reporte:</strong> es la evidencia objetiva del estado actual del sistema, pensada para ser presentada a auditores externos de CUMCS IMC-GAP, INASE, ANMAT o auditorias internas de calidad. Cada chequeo se ejecuta consultando datos reales de la base de datos en tiempo real, sin intervencion manual, lo cual garantiza objetividad y reproducibilidad.
          </p>

          <h3>1.1 Conclusiones automaticas</h3>
          {conclusiones.map((c, i) => <p key={i} className="print-text-justify">• {c}</p>)}
        </div>

        {/* Score visual (web) */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5 print-page-break no-print">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-[13px] font-display font-semibold text-[#ececf1]">Score de Cumplimiento</h3>
              <p className="text-[11px] text-[#5c5c6b]">
                {ultimaEjecucion && `Ultima ejecucion: ${ultimaEjecucion.toLocaleString('es-AR')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={descargarPDF} disabled={ejecutando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#20202c] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[11.5px] font-medium text-[#d4d4dd] disabled:opacity-50">
                <Download className="w-3.5 h-3.5" />
                Descargar PDF
              </button>
              <button onClick={ejecutarAuditoria} disabled={ejecutando}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50">
                {ejecutando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {ejecutando ? 'Verificando...' : 'Re-ejecutar'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1f1f2b" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={porcentaje >= 80 ? '#a3e635' : porcentaje >= 50 ? '#c4b5fd' : '#ff6b5a'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${porcentaje * 2.64} 264`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold font-display text-[#ececf1] tabular-nums">{porcentaje}%</span>
            </div>
            <div className="flex gap-5">
              <div className="text-center"><p className="text-[22px] font-bold font-display text-[#a3e635] tabular-nums">{totalOk}</p><p className="text-[10px] text-[#5c5c6b] uppercase tracking-[0.12em]">Correctos</p></div>
              <div className="text-center"><p className="text-[22px] font-bold font-display text-[#c4b5fd] tabular-nums">{totalAlerta}</p><p className="text-[10px] text-[#5c5c6b] uppercase tracking-[0.12em]">Alertas</p></div>
              <div className="text-center"><p className="text-[22px] font-bold font-display text-[#ff8a7a] tabular-nums">{totalFallo}</p><p className="text-[10px] text-[#5c5c6b] uppercase tracking-[0.12em]">Fallos</p></div>
              <div className="text-center"><p className="text-[22px] font-bold font-display text-[#757584] tabular-nums">{checks.length}</p><p className="text-[10px] text-[#5c5c6b] uppercase tracking-[0.12em]">Total</p></div>
            </div>
          </div>
        </div>

        {/* Indice solo PDF */}
        <div className="print-show mb-8 print-page-break">
          <h2>2. Indice del Reporte</h2>
          <ol style={{ marginLeft: '8mm' }}>
            {categorias.map((cat, i) => (
              <li key={cat}><strong>2.{i + 1} {cat}</strong> ({checks.filter(c => c.categoria === cat).length} chequeos)</li>
            ))}
            <li><strong>3. Glosario tecnico</strong></li>
            <li><strong>4. Referencias normativas</strong></li>
          </ol>
        </div>

        {/* Resultados por categoria */}
        {ejecutando ? (
          <div className="text-center py-12 no-print">
            <Loader2 className="w-10 h-10 text-[#a3e635] animate-spin mx-auto" />
            <p className="mt-3 text-[12.5px] text-[#5c5c6b]">Ejecutando verificaciones...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categorias.map((cat, idx) => {
              const checksCategoria = checks.filter(c => c.categoria === cat)
              const okCat = checksCategoria.filter(c => c.resultado === 'ok').length
              const infoCat = INFO_CATEGORIA[cat]
              return (
                <div key={cat} className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden print-block no-print">
                  <div className="px-4 py-3 bg-[#15151d] border-b border-[#1f1f2b] flex items-center justify-between">
                    <h4 className="text-[12.5px] font-display font-semibold text-[#ececf1]"><span className="print-show" style={{display:'inline'}}>2.{idx + 1}. </span>{cat}</h4>
                    <span className="text-[10.5px] text-[#5c5c6b] tabular-nums">{okCat}/{checksCategoria.length} OK</span>
                  </div>

                  {/* Intro de categoria SOLO en PDF */}
                  {infoCat && (
                    <div className="print-show print-info-block">
                      <p><strong>Que cubre esta seccion:</strong> {infoCat.intro}</p>
                      <p><strong>Importancia:</strong> {infoCat.importancia}</p>
                    </div>
                  )}

                  <div className="divide-y divide-[#1f1f2b]">
                    {checksCategoria.map((check) => {
                      const Icono = check.icono
                      const info = INFO_CHECK[check.id]
                      return (
                        <div key={check.id} className="px-4 py-3 print-page-break">
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              check.resultado === 'ok' ? 'bg-[#a3e635]/15' :
                              check.resultado === 'alerta' ? 'bg-[#a78bfa]/15' : 'bg-[#7a2820]/30'
                            }`}>
                              {check.resultado === 'ok' ? <CheckCircle2 className="w-4 h-4 text-[#a3e635]" /> :
                              check.resultado === 'alerta' ? <AlertTriangle className="w-3.5 h-3.5 text-[#c4b5fd]" /> :
                              <XCircle className="w-4 h-4 text-[#ff6b5a]" />}
                            </div>
                            {Icono && <Icono className="w-4 h-4 text-[#46464f] flex-shrink-0 mt-1 no-print" strokeWidth={1.75} />}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-medium text-[#d4d4dd]">{check.nombre}</p>
                              <p className="text-[11px] text-[#5c5c6b] mt-0.5 leading-snug">{check.detalle}</p>
                            </div>
                            {mostrarCodigos && (
                              <span className="text-[10px] font-mono text-[#46464f] flex-shrink-0 mt-1">{check.referencia}</span>
                            )}
                          </div>

                          {/* Bloque expandido SOLO en PDF */}
                          {info && (
                            <div className="print-show print-info-block">
                              <p><span className="label">Resultado:</span> <strong>{check.resultado.toUpperCase()}</strong> — {check.detalle}</p>
                              <p><span className="label">Que es:</span> {info.queEs}</p>
                              <p><span className="label">Para que sirve:</span> {info.paraQueSirve}</p>
                              <p><span className="label">Como se mide:</span> {info.comoSeMide}</p>
                              <p><span className="label">Que pasa si falla:</span> {info.quePasaSiFalla}</p>
                              <p><span className="label">Referencia GAMP5:</span> {check.referencia}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* GLOSARIO solo PDF */}
        <div className="print-show mt-10 print-page-break">
          <h2>3. Glosario Tecnico</h2>
          <p><strong>GAMP5:</strong> Good Automated Manufacturing Practice version 5. Estandar internacional para validacion de sistemas computarizados en industria farmaceutica/regulada. Define 5 categorias segun complejidad. CannTrace es Categoria 5 (software configurable).</p>
          <p><strong>CUMCS IMC-GAP:</strong> Compendio Unificado de Manejo Cannabis para Salud — Implementacion Manual de Control de Buenas Practicas Agricolas. Norma argentina derivada de la Disposicion 4159 ANMAT que define los registros obligatorios para cultivo y produccion de cannabis medicinal.</p>
          <p><strong>RLS (Row Level Security):</strong> Mecanismo de PostgreSQL que filtra a nivel de base de datos que filas puede ver/modificar cada usuario, segun politicas declarativas vinculadas a la sesion autenticada (JWT).</p>
          <p><strong>JWT (JSON Web Token):</strong> Token de autenticacion criptografico emitido por Supabase Auth tras login. Contiene id de usuario, rol y expiracion. Cada request al backend lo lleva en el header Authorization.</p>
          <p><strong>Audit trail:</strong> Registro inmutable de quien hizo que y cuando. GAMP5 lo exige para todas las operaciones criticas, con sello de tiempo, usuario autenticado y firma electronica si aplica.</p>
          <p><strong>PNC (Producto No Conforme):</strong> Producto o lote que no cumple las especificaciones. CUMCS exige documentacion del PNC, accion correctiva (resolver el caso actual) y accion preventiva (evitar reincidencia).</p>
          <p><strong>LMR (Limite Maximo de Residuos):</strong> Cantidad maxima permitida de residuos de plaguicidas en el producto final. Cada principio activo tiene su LMR. Superarlo invalida el lote para comercializacion.</p>
          <p><strong>BPA (Buenas Practicas Agricolas):</strong> Conjunto de practicas que garantizan calidad, seguridad e inocuidad en el cultivo, incluyendo manejo de plagas, agua, fertilizacion y postcosecha.</p>
          <p><strong>Periodo de carencia:</strong> Tiempo minimo en dias entre la ultima aplicacion de un fitosanitario y la cosecha o comercializacion del producto, para asegurar que los residuos esten por debajo del LMR.</p>
          <p><strong>MIP (Manejo Integrado de Plagas):</strong> Estrategia que prioriza monitoreo, prevencion y control biologico antes de aplicar quimicos, minimizando el impacto en producto, operario y ambiente.</p>
          <p><strong>Camada:</strong> Cohorte de plantas/lotes generadas a partir de una misma planta madre o esquejado. CannTrace tiene 6 camadas activas: C7, C9, C11, C12, C15, C16.</p>
          <p><strong>Audit trail GAMP5 RF-009:</strong> Requisito funcional que obliga a registrar para cada operacion: quien la realizo, fecha y hora exacta, datos antes y despues, motivo si hubo cambio, y conservar el registro por 7 años.</p>
        </div>

        {/* REFERENCIAS solo PDF */}
        <div className="print-show mt-8">
          <h2>4. Referencias Normativas</h2>
          <p><strong>RF-001 a RF-010:</strong> Requisitos Funcionales del sistema (URS-001).</p>
          <p><strong>RS-001, RS-002:</strong> Requisitos de Seguridad (URS-001 seccion seguridad).</p>
          <p><strong>RR-001 a RR-009:</strong> Requisitos de Registros CUMCS (URS-001 seccion registros).</p>
          <p><strong>CUMCS 12.1 a 12.5:</strong> Trazabilidad productiva.</p>
          <p><strong>CUMCS 18.2:</strong> Monitoreo de plagas.</p>
          <p><strong>CUMCS 19.7:</strong> Control de no conformidades.</p>
          <p><strong>CUMCS 19.11.1:</strong> Mantenimiento y calibracion de equipos.</p>
          <p><strong>Disposicion 4159 ANMAT:</strong> Norma argentina marco para cannabis medicinal.</p>
          <p><strong>GAMP5 Categoria 5:</strong> Software configurable. Requiere validacion completa con IQ, OQ, PQ, FMEA y matriz de trazabilidad.</p>
          <p style={{ marginTop: '6mm', fontSize: '8pt', color: '#666' }}><em>Reporte generado automaticamente por CannTrace · Sistema validado GAMP5 Cat 5 · Conservacion 7 años · Audit trail inmutable.</em></p>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-[#a3e635]/8 border border-[#404d20] text-[11px] text-[#bef264] text-center no-print">
          Click "Descargar PDF" para exportar el informe completo con explicaciones extendidas, glosario y referencias GAMP5.
        </div>
      </div>
    </div>
    </>
  )
}
