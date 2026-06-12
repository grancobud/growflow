import { useState, useEffect } from 'react'
import { CheckSquare, Square, Search, ChevronDown, ChevronRight, AlertCircle, Leaf, Droplets, X, Eye, RefreshCw, Sprout, Scissors, Wrench, FileCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AREAS, SUBCATEGORIAS } from '../lib/cumcsJerarquia'
import { useRealtimeRefetch } from '../hooks/useRealtimeInvalidation'

const areaIconos: Record<string, LucideIcon> = {
  produccion: Sprout, cosecha: Scissors, infraestructura: Wrench, calidad: FileCheck,
}

// Tabla destino segun grupo
function tablaDelGrupo(grupo: string): string {
  if (grupo === 'G01' || grupo === 'G02' || grupo === 'G06') return 'operaciones'
  if (grupo === 'G04') return 'registros_agua'
  if (grupo === 'G05') return 'registros_fitosanitarios'
  if (grupo === 'G07') return 'registros_mantenimiento'
  if (grupo === 'G09') return 'registros_calidad'
  return 'registros_documentales'
}

// Carga registros en Supabase filtrando por codigo CUMCS + camada
async function cargarRegistrosDeCamada(grupo: string, codigo: string, camada: string): Promise<any[]> {
  const tabla = tablaDelGrupo(grupo)
  const camadaNum = camada.replace(/[^0-9]/g, '') // C7 -> 7

  if (tabla === 'operaciones') {
    // Filtrar por datos_extra.registro_cumcs y datos_extra.camada
    const { data } = await supabase.from('operaciones')
      .select('*, lote_origen:lotes!operaciones_lote_origen_id_fkey(codigo_lote)')
      .filter('datos_extra->>registro_cumcs', 'eq', codigo)
      .or(`datos_extra->>camada.eq.${camadaNum},datos_extra->>camada.eq.${camada},datos_extra->>id_lote.ilike.%${camada}%,datos_extra->>cod_traza_cosecha.ilike.%${camada}%`)
      .order('fecha_operacion', { ascending: false })
      .limit(20)
    return data || []
  }
  if (tabla === 'registros_agua') {
    // No tiene lote_id directo, filtrar por observaciones que mencionen la camada
    const { data } = await supabase.from('registros_agua')
      .select('*')
      .ilike('observaciones', `%${camada}%`)
      .order('fecha', { ascending: false })
      .limit(20)
    return data || []
  }
  if (tabla === 'registros_fitosanitarios') {
    const { data } = await supabase.from('registros_fitosanitarios')
      .select('*, lote:lotes!registros_fitosanitarios_lote_id_fkey(codigo_lote)')
      .or(`observaciones.ilike.%${camada}%,plaga_detectada.ilike.%${camada}%`)
      .order('fecha', { ascending: false })
      .limit(20)
    return data || []
  }
  if (tabla === 'registros_calidad') {
    const { data } = await supabase.from('registros_calidad')
      .select('*, lote:lotes!registros_calidad_lote_id_fkey(codigo_lote)')
      .or(`observaciones.ilike.%${camada}%,descripcion_hallazgo.ilike.%${camada}%,detalle_reclamo.ilike.%${camada}%`)
      .order('fecha', { ascending: false })
      .limit(20)
    return data || []
  }
  if (tabla === 'registros_mantenimiento') {
    const { data } = await supabase.from('registros_mantenimiento')
      .select('*')
      .order('fecha_mantenimiento', { ascending: false })
      .limit(10)
    return data || []
  }
  // registros_documentales
  const { data } = await supabase.from('registros_documentales')
    .select('*')
    .or(`titulo.ilike.%${codigo}%,descripcion.ilike.%${camada}%`)
    .order('fecha', { ascending: false })
    .limit(20)
  return data || []
}

// Convierte un registro DB en pares label/valor para mostrar
function camposRegistro(_grupo: string, reg: any): Array<[string, any]> {
  const skip = new Set(['id', 'creado_en', 'creado_por', 'instalacion_id', 'lote_id', 'lote_origen_id', 'lote_destino_id', 'instalacion_origen_id', 'instalacion_destino_id', 'individuo_ids', 'firma_registro', 'json_estructurado', 'texto_original', 'confirmado_por', 'confirmado_en', 'anulado_por', 'anulado_en', 'motivo_anulacion', 'verificado_por', 'verificado_en', 'lote', 'lote_origen'])
  const labels: Record<string, string> = {
    tipo_operacion: 'Tipo', estado: 'Estado', fecha_operacion: 'Fecha',
    fecha: 'Fecha', fecha_mantenimiento: 'Fecha mant.',
    responsable: 'Responsable', observaciones: 'Observaciones', notas_sanitarias: 'Notas sanitarias',
    peso_fresco_kg: 'Peso fresco (kg)', peso_seco_kg: 'Peso seco (kg)', peso_neto_g: 'Peso neto (g)',
    rendimiento_porcentaje: 'Rendimiento %', temperatura_c: 'Temp °C', humedad_porcentaje: 'Humedad %',
    co2_ppm: 'CO2 ppm', horas_secado: 'Horas secado', sustrato: 'Sustrato',
    cantidad_entrada: 'Cantidad', cantidad_salida: 'Salida',
    tipo: 'Tipo',
    ph: 'pH', ec_ms: 'EC (mS)', cloro_ppm: 'Cloro (ppm)', volumen_litros: 'Volumen (lts)',
    temperatura_agua_c: 'Temp agua °C', resultado: 'Resultado',
    plaga_detectada: 'Plaga', producto_aplicado: 'Producto', dosis: 'Dosis',
    metodo_aplicacion: 'Equipo', periodo_carencia_dias: 'Carencia (dias)',
    fecha_reingreso: 'Fecha reingreso', resultado_lmr: 'Resultado LMR', aprobado: 'Aprobado',
    numero_certificado: 'Nº Certificado', tipo_muestra: 'Tipo muestra',
    cantidad_muestra: 'Cant. muestra', destino_muestra: 'Destino muestra',
    descripcion_hallazgo: 'Hallazgo', accion_correctiva: 'Accion correctiva',
    accion_preventiva: 'Accion preventiva', fecha_cierre: 'Fecha cierre',
    cliente_nombre: 'Cliente', detalle_reclamo: 'Detalle',
    tipo_residuo: 'Tipo residuo', cantidad_residuo: 'Cant. residuo',
    metodo_disposicion: 'Disposicion', acta_destruccion: 'Acta',
    equipo_nombre: 'Equipo', tipo_mantenimiento: 'Tipo mant.',
    titulo: 'Titulo', descripcion: 'Descripcion',
  }
  const out: Array<[string, any]> = []
  // Lote como primer campo si existe
  const loteCod = reg.lote?.codigo_lote || reg.lote_origen?.codigo_lote
  if (loteCod) out.push(['Lote', loteCod])
  for (const [k, v] of Object.entries(reg)) {
    if (skip.has(k)) continue
    if (v === null || v === undefined || v === '') continue
    if (k === 'datos_extra') continue
    out.push([labels[k] || k, v])
  }
  // datos_extra al final, expandido
  if (reg.datos_extra && typeof reg.datos_extra === 'object') {
    for (const [k, v] of Object.entries(reg.datos_extra)) {
      if (v === null || v === undefined || v === '') continue
      if (['registro_cumcs', 'grupo'].includes(k)) continue
      out.push([k.replace(/_/g, ' '), v])
    }
  }
  return out
}

interface TipoRegistro {
  codigo: string
  nombre: string
  grupo: string
  grupo_nombre: string
  obligatorio: boolean
  tabla_destino: string
  procedimiento_referencia: string | null
}

interface GrupoRegistros {
  grupo: string
  grupo_nombre: string
  registros: TipoRegistro[]
  completados: number
  total: number
}

// Hojas del Excel CM-RE-1010 que tienen datos reales
// Leido directamente del Excel (verificado con openpyxl)
const HOJAS_CON_DATOS: Record<string, boolean> = {
  'CM-RE-0101': true, 'CM-RE-0102': true, 'CM-RE-0103': true, 'CM-RE-0104': true,
  'CM-RE-0105': true, 'CM-RE-0106': true, 'CM-RE-0107': true, 'CM-RE-0108': true,
  'CM-RE-0201': true, 'CM-RE-0202': true, 'CM-RE-0203': true, 'CM-RE-0204': true,
  'CM-RE-0205': true, 'CM-RE-0206': true, 'CM-RE-0207': true, 'CM-RE-0208': true,
  'CM-RE-0209': true, 'CM-RE-0210': true, 'CM-RE-0211': true, 'CM-RE-1010': false,
  'CM-RE-0301': true, 'CM-RE-0302': false, 'CM-RE-0303': true, 'CM-RE-0304': true,
  'CM-RE-0305': true, 'CM-RE-0306': true,
  'CM-RE-0401': true, 'CM-RE-0402': true, 'CM-RE-0403': false,
  'CM-RE-0501': true, 'CM-RE-0502': true, 'CM-RE-0503': false, 'CM-RE-0504': false,
  'CM-RE-0505': false, 'CM-RE-0506': false, 'CM-RE-0507': false,
  'CM-RE-0601': true, 'CM-RE-0602': true, 'CM-RE-0603': true, 'CM-RE-0604': true,
  'CM-RE-0605': true, 'CM-RE-0606': false, 'CM-RE-0607': false, 'CM-RE-0608': false,
  'CM-RE-0609': false, 'CM-RE-0610': false, 'CM-RE-0611': false,
  'CM-RE-0701': false, 'CM-RE-0702': false, 'CM-RE-0703': true, 'CM-RE-0704': true,
  'CM-RE-0705': true, 'CM-RE-0706': true, 'CM-RE-0707': true,
  'CM-RE-0801': false, 'CM-RE-0802': true, 'CM-RE-0803': false, 'CM-RE-0804': false,
  'CM-RE-0805': false, 'CM-RE-0806': false, 'CM-RE-0807': false, 'CM-RE-0808': false,
  'CM-RE-0809': false, 'CM-RE-0810': true,
  'CM-RE-0901': false, 'CM-RE-0902': true, 'CM-RE-0903': false, 'CM-RE-0904': false,
  'CM-RE-0905': true, 'CM-RE-0906': false, 'CM-RE-0907': false, 'CM-RE-0908': false,
  'CM-RE-0909': false, 'CM-RE-0910': true, 'CM-RE-0911': true,
  'CM-RE-1001': false, 'CM-RE-1002': false, 'CM-RE-1003': true, 'CM-RE-1004': false,
  'CM-RE-1005': false, 'CM-RE-1006': true, 'CM-RE-1007': false, 'CM-RE-1008': false,
  'CM-RE-1009': false,
}

// Que camadas se registraron en cada grupo de registros
// (basado en datos reales: si la camada paso por esa etapa, el registro existe)
const CAMADAS_COMPLETADAS = ['C7', 'C9', 'C11', 'C12']
const CAMADAS_EN_PROCESO = ['C15', 'C16']

// Que grupos CUMCS aplican a cada camada segun su estado
function registroAplicaACamada(grupo: string, camada: string, _esProcesada: boolean): 'registrado' | 'pendiente' | 'no_aplica' {
  const esCompletada = CAMADAS_COMPLETADAS.includes(camada)
  const enProceso = CAMADAS_EN_PROCESO.includes(camada)

  // G01: Condiciones ambientales - aplica a todas las camadas que pasaron por cultivo
  if (grupo === 'G01') return esCompletada ? 'registrado' : enProceso ? 'registrado' : 'no_aplica'

  // G02: Trazabilidad producto - aplica a todas
  if (grupo === 'G02') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G03: Fertilizantes e insumos - aplica a todas en cultivo
  if (grupo === 'G03') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G04: Agua y riego - aplica a todas en cultivo
  if (grupo === 'G04') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G05: Plagas y fitosanitarios - aplica a todas en cultivo
  if (grupo === 'G05') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G06: Cosecha y postcosecha - solo completadas
  if (grupo === 'G06') return esCompletada ? 'registrado' : enProceso ? 'pendiente' : 'no_aplica'

  // G07: Mantenimiento - aplica a todas (equipos compartidos)
  if (grupo === 'G07') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G08: Personal - aplica a todas
  if (grupo === 'G08') return (esCompletada || enProceso) ? 'registrado' : 'no_aplica'

  // G09: Calidad - solo completadas
  if (grupo === 'G09') return esCompletada ? 'registrado' : enProceso ? 'pendiente' : 'no_aplica'

  // G10: Documentacion - general, no por camada
  if (grupo === 'G10') return 'registrado'

  return 'no_aplica'
}

export default function PaginaChecklistCUMCS() {
  const [grupos, setGrupos] = useState<GrupoRegistros[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null)
  const [areaAbierta, setAreaAbierta] = useState<string | null>(null)
  const [subAbierta, setSubAbierta] = useState<string | null>(null) // formato "G01:Vivero/Madres"
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'completados'>('todos')
  const [registroExpandido, setRegistroExpandido] = useState<string | null>(null)
  const [verRegistro, setVerRegistro] = useState<{ reg: TipoRegistro; camada: string } | null>(null)
  const [registrosCargados, setRegistrosCargados] = useState<any[]>([])
  const [cargandoRegistros, setCargandoRegistros] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [conteosReales, setConteosReales] = useState<Record<string, number>>({})
  const [ultimaSinc, setUltimaSinc] = useState<Date | null>(null)
  const [mostrarCodigos, setMostrarCodigos] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('canntrace.checklist.mostrarCodigos') === '1'
  })
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('canntrace.checklist.mostrarCodigos', mostrarCodigos ? '1' : '0')
    }
  }, [mostrarCodigos])

  async function abrirVisorRegistro(reg: TipoRegistro, camada: string) {
    setVerRegistro({ reg, camada })
    setCargandoRegistros(true)
    setRegistrosCargados([])
    const data = await cargarRegistrosDeCamada(reg.grupo, reg.codigo, camada)
    setRegistrosCargados(data)
    setCargandoRegistros(false)
  }

  async function cargar(esSinc = false) {
    try {
      if (esSinc) setSincronizando(true)
      const { data: tipos, error: errTipos } = await supabase
        .from('tipos_registro_cumcs')
        .select('*')
        .order('codigo')
      if (errTipos) throw new Error(errTipos.message)

      // Contar registros reales en Supabase por codigo CUMCS (operaciones tiene datos_extra.registro_cumcs)
      const conteos: Record<string, number> = {}
      const [op, ag, fito, cal, mant, doc] = await Promise.all([
        supabase.from('operaciones').select('datos_extra').not('datos_extra->>registro_cumcs', 'is', null).limit(2000),
        supabase.from('registros_agua').select('tipo').limit(2000),
        supabase.from('registros_fitosanitarios').select('tipo').limit(2000),
        supabase.from('registros_calidad').select('tipo').limit(2000),
        supabase.from('registros_mantenimiento').select('tipo').limit(2000),
        supabase.from('registros_documentales').select('tipo').limit(2000),
      ])
      // operaciones por datos_extra
      for (const r of (op.data || [])) {
        const cod = (r.datos_extra as any)?.registro_cumcs
        if (cod) conteos[cod] = (conteos[cod] || 0) + 1
      }
      // mapeo inverso tipo -> codigos posibles (uno a uno donde aplica)
      const tipoACodigo: Record<string, string> = {
        'sanitizacion_agua': 'CM-RE-0401', 'analisis_agua': 'CM-RE-0402', 'volumen_riego': 'CM-RE-0403',
        'control_plagas': 'CM-RE-0501', 'monitoreo_plagas': 'CM-RE-0502',
        'reingreso_parcela': 'CM-RE-0505', 'lmr_postcosecha': 'CM-RE-0506', 'gestion_envases': 'CM-RE-0507',
        'certificado_lote': 'CM-RE-0901', 'toma_muestras': 'CM-RE-0902',
        'contramuestras_producto': 'CM-RE-0903', 'contramuestras_sustrato': 'CM-RE-0904',
        'analisis_postcosecha': 'CM-RE-0905', 'reclamo_cliente': 'CM-RE-0906',
        'queja_interna': 'CM-RE-0907', 'devolucion': 'CM-RE-0908', 'no_conforme': 'CM-RE-0909',
        'disposicion_cannabis': 'CM-RE-0910', 'disposicion_residuos': 'CM-RE-0911',
        'calibracion_balanza': 'CM-RE-0701', 'calibracion_equipos': 'CM-RE-0702',
        'mantenimiento_generador': 'CM-RE-0703', 'mantenimiento_ac': 'CM-RE-0704',
        'mantenimiento_ventiladores': 'CM-RE-0705', 'mantenimiento_deshumificadores': 'CM-RE-0706',
        'mantenimiento_osmosis': 'CM-RE-0707',
      }
      const sumar = (rows: any[] | null) => {
        for (const r of (rows || [])) {
          const cod = tipoACodigo[r.tipo]
          if (cod) conteos[cod] = (conteos[cod] || 0) + 1
        }
      }
      sumar(ag.data); sumar(fito.data); sumar(cal.data); sumar(mant.data); sumar(doc.data)
      setConteosReales(conteos)

      // Agrupar por grupo. "Completado" = tiene datos en Excel O tiene registros en Supabase
      const gruposMap = new Map<string, GrupoRegistros>()
      for (const tipo of (tipos || [])) {
        if (!gruposMap.has(tipo.grupo)) {
          gruposMap.set(tipo.grupo, { grupo: tipo.grupo, grupo_nombre: tipo.grupo_nombre, registros: [], completados: 0, total: 0 })
        }
        const g = gruposMap.get(tipo.grupo)!
        g.registros.push(tipo)
        g.total++
        const tieneExcel = HOJAS_CON_DATOS[tipo.codigo]
        const tieneSupabase = (conteos[tipo.codigo] || 0) > 0
        if (tieneExcel || tieneSupabase) g.completados++
      }
      setGrupos(Array.from(gruposMap.values()))
      setUltimaSinc(new Date())
      setError('')
    } catch (err: any) { setError(err.message) }
    finally { setCargando(false); setSincronizando(false) }
  }

  useEffect(() => { cargar() }, [])

  // Realtime: refetch checklist cuando INSERT/UPDATE en cualquier tabla de registros
  useRealtimeRefetch(
    ['operaciones', 'registros_agua', 'registros_fitosanitarios', 'registros_mantenimiento',
     'registros_calidad', 'registros_documentales', 'registros_condiciones_ambientales',
     'registros_trazabilidad', 'registros_fertilizantes', 'registros_cosecha', 'registros_personal'],
    () => cargar(true), { debounceMs: 700 },
  )

  const totalReqs = grupos.reduce((a, g) => a + g.total, 0)
  const totalCompletados = grupos.reduce((a, g) => a + g.completados, 0)
  const porcentaje = totalReqs > 0 ? Math.round((totalCompletados / totalReqs) * 100) : 0
  const todasCamadas = [...CAMADAS_EN_PROCESO, ...CAMADAS_COMPLETADAS]

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <CheckSquare className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Checklist CUMCS IMC-GAP</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{totalCompletados}/{totalReqs} con datos ({porcentaje}%) · <span className="hidden sm:inline">cruzado con Excel CM-RE-1010</span></div>
          </div>
          <div className="flex-1" />
          <button onClick={() => setMostrarCodigos(v => !v)} title="Mostrar codigos CUMCS internos"
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-medium transition-colors ${
              mostrarCodigos
                ? 'bg-[#a3e635]/10 border-[#404d20] text-[#bef264]'
                : 'bg-[#101016] border-[#1f1f2b] hover:border-[#404d20] text-[#b3b3c0]'
            }`}>
            <span className="hidden sm:inline">{mostrarCodigos ? 'Codigos: ON' : 'Codigos: OFF'}</span>
            <span className="sm:hidden">{mostrarCodigos ? 'CM ON' : 'CM OFF'}</span>
          </button>
          <button onClick={() => cargar(true)} disabled={sincronizando}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] text-[#b3b3c0] rounded-lg text-[11px] font-medium disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Barra de progreso */}
        <div className="bg-[#101016] rounded-xl border border-[#1f1f2b] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#ececf1]">Progreso CUMCS — Excel + Supabase</h3>
              {ultimaSinc && (
                <p className="text-[10px] text-[#5c5c6b] mt-0.5">Ultima sincronizacion: {ultimaSinc.toLocaleTimeString()}</p>
              )}
            </div>
            <span className="text-2xl font-bold text-[#a3e635] ml-3 tabular-nums">{porcentaje}%</span>
          </div>
          <div className="w-full bg-[#1f1f2b] rounded-full h-2.5">
            <div className="bg-[#a3e635] h-2.5 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-[#5c5c6b]">
            <span>{totalReqs} registros totales</span>
            <span className="text-[#bef264] font-medium">{totalCompletados} con datos</span>
            <span className="text-[#c4b5fd]">{totalReqs - totalCompletados} sin datos</span>
          </div>
        </div>

        {/* Camadas */}
        <div className="bg-[#101016] rounded-xl border border-[#1f1f2b] p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-3">Camadas rastreadas</p>
          <div className="flex flex-wrap gap-2">
            {CAMADAS_EN_PROCESO.map(c => (
              <div key={c} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#404d20] bg-[#a3e635]/8 text-xs">
                {c === 'C16' ? <Droplets className="w-3 h-3 text-[#a3e635]" /> : <Leaf className="w-3 h-3 text-[#c4b5fd]" />}
                <span className="font-bold text-[#ececf1]">{c}</span>
                <span className="text-[#bef264] font-semibold">En proceso</span>
              </div>
            ))}
            {CAMADAS_COMPLETADAS.map(c => {
              const esCoco = ['C9', 'C12'].includes(c)
              return (
                <div key={c} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] text-xs">
                  {esCoco ? <Leaf className="w-3 h-3 text-[#c4b5fd]" /> : <Droplets className="w-3 h-3 text-[#a3e635]" />}
                  <span className="font-bold text-[#d4d4dd]">{c}</span>
                  <span className="text-[#8f8f9f]">Completada</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b]" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar codigo o nombre..."
              className="w-full pl-9 pr-4 py-2 bg-[#101016] border border-[#1f1f2b] rounded-lg text-[13px] text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20] transition-colors" />
          </div>
          <div className="flex items-center gap-0.5 bg-[#101016] border border-[#1f1f2b] rounded-lg p-1">
            {(['todos', 'completados', 'pendientes'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${filtro === f ? 'bg-[#a3e635] text-[#0a0a0f]' : 'text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 bg-[#7a2820]/20 border border-[#7a2820]/50 rounded-xl text-sm text-[#ff8a7a] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

        {cargando ? (
          <div className="text-center py-12"><div className="w-8 h-8 border-2 border-[#1f1f2b] border-t-[#a3e635] rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {AREAS.map(area => {
              const gruposArea = grupos.filter(g => area.grupos.includes(g.grupo))
              if (gruposArea.length === 0) return null
              const totalArea = gruposArea.reduce((a, g) => a + g.total, 0)
              const compArea = gruposArea.reduce((a, g) => a + g.completados, 0)
              const pctArea = totalArea > 0 ? Math.round((compArea / totalArea) * 100) : 0
              const isAreaOpen = areaAbierta === area.id || !!busqueda
              const AreaIcon = areaIconos[area.id]
              return (
                <div key={area.id} className="rounded-xl border border-[#1f1f2b] bg-[#101016] overflow-hidden">
                  <button onClick={() => setAreaAbierta(isAreaOpen && !busqueda ? null : area.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-[#15151d] transition-colors">
                    {isAreaOpen ? <ChevronDown className="w-4 h-4 text-[#5c5c6b]" /> : <ChevronRight className="w-4 h-4 text-[#5c5c6b]" />}
                    {AreaIcon && <AreaIcon className="w-4 h-4 text-[#a3e635]" strokeWidth={1.75} />}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-[#ececf1]">{area.nombre}</p>
                      <p className="text-[10px] text-[#5c5c6b] hidden sm:block">{area.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[11px] text-[#8f8f9f] tabular-nums">{compArea}/{totalArea}</span>
                      <div className="w-16 sm:w-24 bg-[#1f1f2b] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pctArea === 100 ? 'bg-[#a3e635]' : pctArea > 0 ? 'bg-[#c4b5fd]' : 'bg-[#2a2a3a]'}`} style={{ width: `${pctArea}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[#ececf1] w-9 text-right tabular-nums">{pctArea}%</span>
                    </div>
                  </button>

                  {isAreaOpen && (
                    <div className="border-t border-[#1f1f2b] bg-[#0a0a0f]/40 p-2 sm:p-3 space-y-2">
                      {gruposArea.map(grupo => {
              const isOpen = grupoAbierto === grupo.grupo || !!busqueda
              const progreso = grupo.total > 0 ? Math.round((grupo.completados / grupo.total) * 100) : 0

              const regs = grupo.registros.filter(r => {
                const tieneExcel = HOJAS_CON_DATOS[r.codigo] === true
                const tieneSupabase = (conteosReales[r.codigo] || 0) > 0
                const completado = tieneExcel || tieneSupabase
                if (filtro === 'completados') return completado
                if (filtro === 'pendientes') return !completado
                return true
              }).filter(r => {
                if (!busqueda) return true
                return r.nombre.toLowerCase().includes(busqueda.toLowerCase()) || r.codigo.toLowerCase().includes(busqueda.toLowerCase())
              })

              if (regs.length === 0 && (filtro !== 'todos' || busqueda)) return null

              const subs = SUBCATEGORIAS[grupo.grupo] || []
              const porCodigo: Record<string, TipoRegistro> = {}
              regs.forEach(r => { porCodigo[r.codigo] = r })
              const porSub: { nombre: string; regs: TipoRegistro[] }[] = []
              for (const s of subs) {
                const rs = s.codigos.map(c => porCodigo[c]).filter(Boolean)
                if (rs.length > 0) porSub.push({ nombre: s.nombre, regs: rs })
              }
              const enSubs = new Set(porSub.flatMap(p => p.regs.map(r => r.codigo)))
              const otros = regs.filter(r => !enSubs.has(r.codigo))
              if (otros.length > 0) porSub.push({ nombre: 'Otros', regs: otros })

              return (
                <div key={grupo.grupo} className="bg-[#101016] rounded-xl border border-[#2a2a3a] overflow-hidden">
                  <button onClick={() => setGrupoAbierto(isOpen && !busqueda ? null : grupo.grupo)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-[#15151d] transition-colors">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-[#5c5c6b]" /> : <ChevronRight className="w-4 h-4 text-[#5c5c6b]" />}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#a3e635] bg-[#a3e635]/10 px-2 py-0.5 rounded">{grupo.grupo}</span>
                        <h3 className="text-sm font-semibold text-[#ececf1] truncate">{grupo.grupo_nombre}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8f8f9f] tabular-nums">{grupo.completados}/{grupo.total}</span>
                      <div className="w-14 sm:w-20 bg-[#1f1f2b] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${progreso === 100 ? 'bg-[#a3e635]' : progreso > 0 ? 'bg-[#c4b5fd]' : 'bg-[#2a2a3a]'}`}
                          style={{ width: `${progreso}%` }} />
                      </div>
                    </div>
                  </button>

                  {isOpen && porSub.map(sub => {
                    const subKey = `${grupo.grupo}:${sub.nombre}`
                    const subOpen = subAbierta === subKey || !!busqueda
                    const subTotal = sub.regs.length
                    const subComp = sub.regs.filter(r => HOJAS_CON_DATOS[r.codigo] === true || (conteosReales[r.codigo] || 0) > 0).length
                    return (
                      <div key={sub.nombre} className="border-t border-[#1f1f2b]">
                        <button onClick={() => setSubAbierta(subOpen && !busqueda ? null : subKey)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 pl-8 hover:bg-[#15151d] bg-[#0a0a0f]/30 border-l-2 border-[#a3e635]/30 transition-colors">
                          {subOpen ? <ChevronDown className="w-3 h-3 text-[#a3e635]" /> : <ChevronRight className="w-3 h-3 text-[#a3e635]" />}
                          <span className="text-[10px] font-bold text-[#8f8f9f] uppercase tracking-[0.14em] flex-1 text-left">{sub.nombre}</span>
                          <span className="text-[10px] font-semibold text-[#5c5c6b] bg-[#15151d] border border-[#2a2a3a] px-2 py-0.5 rounded-full">{subComp}/{subTotal}</span>
                        </button>
                        {subOpen && (
                          <div className="divide-y divide-surface-50">
                            {sub.regs.map(reg => {
                        const tieneExcel = HOJAS_CON_DATOS[reg.codigo] === true
                        const tieneSupabase = (conteosReales[reg.codigo] || 0) > 0
                        const tieneData = tieneExcel || tieneSupabase
                        const isExpanded = registroExpandido === reg.codigo

                        return (
                          <div key={reg.codigo}>
                            <div className="flex items-center gap-3 px-4 py-3 pl-10 hover:bg-[#15151d] cursor-pointer transition-colors"
                              onClick={() => setRegistroExpandido(isExpanded ? null : reg.codigo)}>
                              {tieneData ? (
                                <CheckSquare className="w-4 h-4 text-[#a3e635] flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-[#2a2a3a] flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {mostrarCodigos && <span className="text-[11px] font-mono text-[#5c5c6b] opacity-60">{reg.codigo}</span>}
                                  {reg.obligatorio && <span className="text-[9px] font-bold text-[#ff8a7a] border border-[#7a2820]/50 px-1 rounded">OBL</span>}
                                  {tieneExcel && <span className="text-[9px] font-bold text-[#bef264] border border-[#404d20]/50 px-1 rounded">CON DATOS</span>}
                                  {(conteosReales[reg.codigo] || 0) > 0 && (
                                    <span className="text-[9px] font-bold text-[#a3e635] bg-[#a3e635]/10 px-1.5 rounded">
                                      DB: {conteosReales[reg.codigo]}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm ${tieneData ? 'text-[#ececf1]' : 'text-[#5c5c6b]'}`}>{reg.nombre}</p>
                              </div>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#5c5c6b]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#5c5c6b]" />}
                            </div>

                            {isExpanded && (
                              <div className="px-4 py-3 pl-16 bg-[#0a0a0f]/50 border-t border-[#1f1f2b]">
                                {reg.procedimiento_referencia && (
                                  <p className="text-[11px] text-[#5c5c6b] mb-2">Procedimiento: {reg.procedimiento_referencia}</p>
                                )}
                                <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">Estado por camada</p>
                                <div className="space-y-1.5">
                                  {todasCamadas.map(cam => {
                                    const estado = registroAplicaACamada(grupo.grupo, cam, CAMADAS_COMPLETADAS.includes(cam))
                                    const esCoco = ['C9', 'C12', 'C15'].includes(cam)
                                    const estadoFinal = !tieneData ? 'pendiente' : estado
                                    const clickeable = estadoFinal === 'registrado'
                                    return (
                                      <div key={cam}
                                        onClick={(e) => { if (clickeable) { e.stopPropagation(); abrirVisorRegistro(reg, cam) } }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                        estadoFinal === 'registrado' ? 'bg-[#a3e635]/8 border border-[#404d20] cursor-pointer hover:bg-[#a3e635]/12 hover:border-[#a3e635]/50' :
                                        estadoFinal === 'pendiente' ? 'bg-[#c4b5fd]/8 border border-[#463a66]' :
                                        'bg-[#15151d] border border-[#1f1f2b] opacity-40'
                                      }`}>
                                        {estadoFinal === 'registrado' ? (
                                          <CheckSquare className="w-3.5 h-3.5 text-[#a3e635]" />
                                        ) : estadoFinal === 'pendiente' ? (
                                          <Square className="w-3.5 h-3.5 text-[#c4b5fd]" />
                                        ) : (
                                          <span className="text-[10px] text-[#5c5c6b]">—</span>
                                        )}
                                        <span className="text-xs font-bold text-[#ececf1]">{cam}</span>
                                        {esCoco ? <Leaf className="w-3 h-3 text-[#c4b5fd]" /> : <Droplets className="w-3 h-3 text-[#a3e635]" />}
                                        <span className="text-[11px] text-[#8f8f9f]">{esCoco ? 'COCO' : 'RDWC'}</span>
                                        <span className={`text-[10px] ml-auto font-medium flex items-center gap-1 ${
                                          estadoFinal === 'registrado' ? 'text-[#bef264]' :
                                          estadoFinal === 'pendiente' ? 'text-[#c4b5fd]' : 'text-[#5c5c6b]'
                                        }`}>
                                          {estadoFinal === 'registrado' ? <>Registrado <Eye className="w-3 h-3" /></> :
                                           estadoFinal === 'pendiente' ? 'Pendiente' : 'No aplica'}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="p-3 bg-[#101016] border border-[#1f1f2b] rounded-xl text-[11px] text-[#5c5c6b] text-center">
          Estado cruzado con Excel CM-RE-1010. Los marcados "Con datos" tienen hojas con contenido en el Excel original.
        </div>
      </div>

      {/* Modal Visor de registro cargado (solo lectura) */}
      {verRegistro && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setVerRegistro(null)}>
          <div className="bg-[#101016] border border-[#1f1f2b] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#1f1f2b] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-[#a3e635]">Camada {verRegistro.camada}{mostrarCodigos ? ` · ${verRegistro.reg.codigo}` : ''}</p>
                <h3 className="text-base font-display font-bold text-[#ececf1] mt-0.5">{verRegistro.reg.nombre}</h3>
                <p className="text-[11px] text-[#5c5c6b]">
                  {verRegistro.reg.grupo_nombre} · Tabla: {tablaDelGrupo(verRegistro.reg.grupo)} · {registrosCargados.length} registro(s)
                </p>
              </div>
              <button onClick={() => setVerRegistro(null)} className="p-1.5 rounded-lg hover:bg-[#1c1c27] text-[#5c5c6b] hover:text-[#d4d4dd] flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {cargandoRegistros ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[#1f1f2b] border-t-[#a3e635] rounded-full animate-spin mx-auto" />
                  <p className="mt-3 text-sm text-[#5c5c6b]">Buscando registros para {verRegistro.camada}...</p>
                </div>
              ) : registrosCargados.length === 0 ? (
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <div className="bg-surface-50 px-4 py-2 border-b border-surface-200">
                    <span className="text-[10px] uppercase font-semibold text-surface-400">Archivo de registro</span>
                  </div>
                  <div className="p-4 space-y-1">
                    {mostrarCodigos && <p className="text-xs font-mono text-primary-700 opacity-60">{verRegistro.reg.codigo}</p>}
                    <p className="text-base font-semibold text-surface-900">{verRegistro.reg.nombre}</p>
                    {verRegistro.reg.procedimiento_referencia && (
                      <p className="text-xs text-surface-500">Procedimiento: {verRegistro.reg.procedimiento_referencia}</p>
                    )}
                  </div>
                </div>
              ) : (
                registrosCargados.map((r, idx) => {
                  const campos = camposRegistro(verRegistro.reg.grupo, r)
                  return (
                    <div key={r.id || idx} className="border border-[#2a2a3a] bg-[#15151d] rounded-xl overflow-hidden">
                      <div className="px-4 py-2 border-b border-[#1f1f2b] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#5c5c6b]">#{idx + 1}</span>
                        <span className="text-[10px] text-[#5c5c6b]">id: {String(r.id).slice(0, 8)}...</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">
                        {campos.map(([k, v]) => (
                          <div key={k}>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{k}</p>
                            <p className="text-sm text-[#d4d4dd] break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}

              <button onClick={() => setVerRegistro(null)}
                className="w-full py-2.5 bg-[#15151d] border border-[#2a2a3a] text-[#b3b3c0] rounded-xl text-sm font-medium hover:bg-[#1c1c27] transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
