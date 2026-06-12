// Jerarquia de 3 niveles para los 84 registros CUMCS
// Area (4) -> Grupo (10) -> Subcategoria (35) -> Registro (84)

export interface Area {
  id: string
  nombre: string
  descripcion: string
  color: string // tailwind base color (emerald, orange, violet, indigo)
  grupos: string[] // codigos de grupo (G01..G10)
}

export interface Subcategoria {
  nombre: string
  codigos: string[] // codigos CM-RE-XXXX
}

export const AREAS: Area[] = [
  {
    id: 'produccion',
    nombre: 'Produccion y Cultivo',
    descripcion: 'Condiciones, trazabilidad, fertilizantes, agua y plagas',
    color: 'emerald',
    grupos: ['G01', 'G02', 'G03', 'G04', 'G05'],
  },
  {
    id: 'cosecha',
    nombre: 'Cosecha y Postcosecha',
    descripcion: 'Cosecha, secado, trimming, almacenamiento y distribucion',
    color: 'orange',
    grupos: ['G06'],
  },
  {
    id: 'infraestructura',
    nombre: 'Infraestructura y Personal',
    descripcion: 'Mantenimiento, calibracion, capacitacion e higiene',
    color: 'violet',
    grupos: ['G07', 'G08'],
  },
  {
    id: 'calidad',
    nombre: 'Calidad y Documentacion',
    descripcion: 'Controles, no conformidades, residuos y SGD',
    color: 'indigo',
    grupos: ['G09', 'G10'],
  },
]

// Subcategorias por grupo. Cubre todos los 84 codigos.
export const SUBCATEGORIAS: Record<string, Subcategoria[]> = {
  G01: [
    { nombre: 'Madres', codigos: ['CM-RE-0101', 'CM-RE-0102'] },
    { nombre: 'Propagacion', codigos: ['CM-RE-0103'] },
    { nombre: 'Cultivo', codigos: ['CM-RE-0104', 'CM-RE-0105'] },
    { nombre: 'Postcosecha', codigos: ['CM-RE-0106', 'CM-RE-0107', 'CM-RE-0108'] },
  ],
  G02: [
    { nombre: 'Pre-cultivo', codigos: ['CM-RE-0201', 'CM-RE-0202'] },
    { nombre: 'Cultivo', codigos: ['CM-RE-0203', 'CM-RE-0204'] },
    { nombre: 'Postcosecha', codigos: ['CM-RE-0205', 'CM-RE-0206', 'CM-RE-0207'] },
    { nombre: 'Comercial', codigos: ['CM-RE-0208', 'CM-RE-0209'] },
    { nombre: 'Maestros', codigos: ['CM-RE-0210', 'CM-RE-0211'] },
  ],
  G03: [
    { nombre: 'Aplicacion', codigos: ['CM-RE-0301', 'CM-RE-0303'] },
    { nombre: 'Sistema', codigos: ['CM-RE-0302'] },
    { nombre: 'Stock e Inventario', codigos: ['CM-RE-0304', 'CM-RE-0305', 'CM-RE-0306'] },
  ],
  G04: [
    { nombre: 'Sanitizacion', codigos: ['CM-RE-0401'] },
    { nombre: 'Analisis', codigos: ['CM-RE-0402'] },
    { nombre: 'Riego', codigos: ['CM-RE-0403'] },
  ],
  G05: [
    { nombre: 'Monitoreo', codigos: ['CM-RE-0501', 'CM-RE-0502', 'CM-RE-0503'] },
    { nombre: 'Aplicacion', codigos: ['CM-RE-0504', 'CM-RE-0505'] },
    { nombre: 'Postcosecha', codigos: ['CM-RE-0506', 'CM-RE-0507'] },
  ],
  G06: [
    { nombre: 'Cosecha', codigos: ['CM-RE-0601', 'CM-RE-0602', 'CM-RE-0603', 'CM-RE-0604'] },
    { nombre: 'Secado / Trimming', codigos: ['CM-RE-0605', 'CM-RE-0606'] },
    { nombre: 'Almacenamiento', codigos: ['CM-RE-0607', 'CM-RE-0608', 'CM-RE-0609'] },
    { nombre: 'Distribucion', codigos: ['CM-RE-0610', 'CM-RE-0611'] },
  ],
  G07: [
    { nombre: 'Calibracion', codigos: ['CM-RE-0701', 'CM-RE-0702'] },
    { nombre: 'Energia', codigos: ['CM-RE-0703'] },
    { nombre: 'Climatizacion', codigos: ['CM-RE-0704', 'CM-RE-0705', 'CM-RE-0706'] },
    { nombre: 'Agua', codigos: ['CM-RE-0707'] },
  ],
  G08: [
    { nombre: 'Capacitacion / EPP', codigos: ['CM-RE-0801', 'CM-RE-0802'] },
    { nombre: 'Emergencias', codigos: ['CM-RE-0803', 'CM-RE-0806', 'CM-RE-0807'] },
    { nombre: 'Higiene', codigos: ['CM-RE-0804', 'CM-RE-0805', 'CM-RE-0808', 'CM-RE-0809', 'CM-RE-0810'] },
  ],
  G09: [
    { nombre: 'Certificados', codigos: ['CM-RE-0901'] },
    { nombre: 'Muestras', codigos: ['CM-RE-0902', 'CM-RE-0903', 'CM-RE-0904'] },
    { nombre: 'Analisis', codigos: ['CM-RE-0905'] },
    { nombre: 'Reclamos', codigos: ['CM-RE-0906', 'CM-RE-0907', 'CM-RE-0908'] },
    { nombre: 'No Conformes', codigos: ['CM-RE-0909'] },
    { nombre: 'Disposicion Residuos', codigos: ['CM-RE-0910', 'CM-RE-0911'] },
  ],
  G10: [
    { nombre: 'Documentos', codigos: ['CM-RE-1001', 'CM-RE-1002', 'CM-RE-1010'] },
    { nombre: 'Riesgos / Cambios', codigos: ['CM-RE-1003', 'CM-RE-1004'] },
    { nombre: 'Auditoria', codigos: ['CM-RE-1005'] },
    { nombre: 'Stakeholders', codigos: ['CM-RE-1006', 'CM-RE-1007', 'CM-RE-1008', 'CM-RE-1009'] },
  ],
}

// Devuelve la subcategoria a la que pertenece un codigo (o 'Otros')
export function subcategoriaDe(codigo: string, grupo: string): string {
  const subs = SUBCATEGORIAS[grupo] || []
  for (const s of subs) if (s.codigos.includes(codigo)) return s.nombre
  return 'Otros'
}

// Devuelve el area a la que pertenece un grupo
export function areaDeGrupo(grupo: string): Area | undefined {
  return AREAS.find(a => a.grupos.includes(grupo))
}

// Clases tailwind para colorear cards segun area (tema oscuro sutil)
export const COLOR_AREA_CLASES: Record<string, string> = {
  emerald: 'bg-emerald-500/5 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-400/40',
  orange: 'bg-orange-500/5 text-orange-300 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-400/40',
  violet: 'bg-violet-500/5 text-violet-300 border-violet-500/20 hover:bg-violet-500/10 hover:border-violet-400/40',
  indigo: 'bg-indigo-500/5 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-400/40',
  amber: 'bg-amber-500/5 text-amber-300 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-400/40',
}

// ============================================================================
// JERARQUIA DE OPERACIONES (alineada con AREAS CUMCS donde aplica)
// 3 areas -> subcategorias -> tipos de operacion
// ============================================================================

export interface AreaOperacion {
  id: string
  nombre: string
  descripcion: string
  color: string
  subgrupos: { nombre: string; tipos: string[] }[]
}

export const AREAS_OPERACION: AreaOperacion[] = [
  {
    id: 'produccion',
    nombre: 'Produccion y Cultivo',
    descripcion: 'Vivero, propagacion, cultivo y labores',
    color: 'emerald',
    subgrupos: [
      { nombre: 'Madres', tipos: ['meta:pm_ambientales', 'planta_madre'] },
      { nombre: 'Propagacion', tipos: ['esquejado'] },
      { nombre: 'Cultivo', tipos: ['vegetativa', 'floracion'] },
      { nombre: 'Labores', tipos: ['fertilizacion', 'poda', 'control_plagas', 'utilizacion_insumos'] },
    ],
  },
  {
    id: 'cosecha',
    nombre: 'Cosecha y Postcosecha',
    descripcion: 'Cosecha, secado, trimming, almacenamiento y distribucion',
    color: 'orange',
    subgrupos: [
      { nombre: 'Cosecha', tipos: ['cosecha'] },
      { nombre: 'Secado / Trimming', tipos: ['secado', 'trimming'] },
      { nombre: 'Almacenamiento', tipos: ['cuarentena', 'almacenamiento'] },
      { nombre: 'Distribucion', tipos: ['fraccionamiento'] },
    ],
  },
  {
    id: 'stock',
    nombre: 'Stock e Insumos',
    descripcion: 'Movimientos de inventario',
    color: 'amber',
    subgrupos: [
      { nombre: 'Entradas', tipos: ['ingreso_insumos'] },
      { nombre: 'Bajas', tipos: ['baja_stock'] },
    ],
  },
]

// Lookup rapido: tipo_operacion -> { area, subgrupo }
export function ubicacionOperacion(tipo: string): { area: AreaOperacion; subgrupo: string } | null {
  for (const area of AREAS_OPERACION) {
    for (const sg of area.subgrupos) {
      if (sg.tipos.includes(tipo)) return { area, subgrupo: sg.nombre }
    }
  }
  return null
}

// Mapping tipo_operacion -> codigo CUMCS para reusar el formulario detallado
export const OPERACION_A_CUMCS: Record<string, { codigo: string; grupo: string; nombre: string }> = {
  planta_madre:        { codigo: 'CM-RE-0201', grupo: 'G02', nombre: 'Trazabilidad Planta Madre' },
  esquejado:           { codigo: 'CM-RE-0202', grupo: 'G02', nombre: 'Trazabilidad Clonacion' },
  vegetativa:          { codigo: 'CM-RE-0203', grupo: 'G02', nombre: 'Trazabilidad Vegetativo' },
  floracion:           { codigo: 'CM-RE-0204', grupo: 'G02', nombre: 'Trazabilidad Floracion' },
  cosecha:             { codigo: 'CM-RE-0601', grupo: 'G06', nombre: 'Certificado de Cosecha' },
  secado:              { codigo: 'CM-RE-0605', grupo: 'G06', nombre: 'Certificado Recepcion Secado' },
  trimming:            { codigo: 'CM-RE-0606', grupo: 'G06', nombre: 'Certificado Recepcion Trimeo' },
  cuarentena:          { codigo: 'CM-RE-0607', grupo: 'G06', nombre: 'Registro Ingreso Cuarentena' },
  almacenamiento:      { codigo: 'CM-RE-0608', grupo: 'G06', nombre: 'Cert Empaquetado y Almacenamiento' },
  fraccionamiento:     { codigo: 'CM-RE-0208', grupo: 'G02', nombre: 'Paqueteria en Almacenamiento' },
  fertilizacion:       { codigo: 'CM-RE-0301', grupo: 'G03', nombre: 'Aplicacion Fertilizantes' },
  control_plagas:      { codigo: 'CM-RE-0504', grupo: 'G05', nombre: 'Aplicacion Fitosanitarios' },
  utilizacion_insumos: { codigo: 'CM-RE-0303', grupo: 'G03', nombre: 'Gasto Solucion Nutritiva' },
  ingreso_insumos:     { codigo: 'CM-RE-0304', grupo: 'G03', nombre: 'Inventario Fertilizantes' },
  baja_stock:          { codigo: 'CM-RE-0910', grupo: 'G09', nombre: 'Disposicion Residuos Cannabis' },
  // poda no tiene CUMCS especifico - usa fallback generico
}
