// ============================================================================
// CannTrace - Tipos TypeScript (espejo del schema PostgreSQL)
// ============================================================================

export type RolUsuario = 'operador' | 'supervisor' | 'auditor' | 'administrador'

export type TipoOperacion =
  | 'ingreso_insumos'
  | 'planta_madre'
  | 'fertilizacion'
  | 'utilizacion_insumos'
  | 'baja_stock'
  | 'esquejado'
  | 'vegetativa'
  | 'poda'
  | 'floracion'
  | 'control_plagas'
  | 'cosecha'
  | 'secado'
  | 'trimming'
  | 'cuarentena'
  | 'fraccionamiento'
  | 'almacenamiento'

export type TipoProducto =
  | 'insumo'
  | 'planta_madre'
  | 'esqueje'
  | 'planta'
  | 'flor'
  | 'flor_trimmeada'
  | 'flor_fraccionada'
  | 'producto_final'

export type EstadoItem = 'activo' | 'baja' | 'consumido' | 'procesado' | 'cuarentena'
export type EstadoOperacion = 'borrador' | 'confirmada' | 'anulada'

// Etiquetas legibles para la UI
export const ETIQUETAS_OPERACION: Record<TipoOperacion, string> = {
  ingreso_insumos: 'Ingreso de Insumos',
  planta_madre: 'Trazabilidad Planta Madres',
  fertilizacion: 'Fertilizacion',
  utilizacion_insumos: 'Utilizacion de Insumos',
  baja_stock: 'Baja de Stock',
  esquejado: 'Esquejado',
  vegetativa: 'Vegetativa',
  poda: 'Poda',
  floracion: 'Floracion',
  control_plagas: 'Control de Plagas',
  cosecha: 'Cosecha',
  secado: 'Secado',
  trimming: 'Trimming',
  cuarentena: 'Cuarentena',
  fraccionamiento: 'Fraccionamiento',
  almacenamiento: 'Almacenamiento',
}

export const ICONOS_OPERACION: Record<TipoOperacion, string> = {
  ingreso_insumos: '📦',
  planta_madre: '🌱',
  fertilizacion: '💧',
  utilizacion_insumos: '🪴',
  baja_stock: '❌',
  esquejado: '✂️',
  vegetativa: '🌿',
  poda: '🪓',
  floracion: '🌸',
  control_plagas: '🐛',
  cosecha: '🌾',
  secado: '☀️',
  trimming: '✂️',
  cuarentena: '🔬',
  fraccionamiento: '📐',
  almacenamiento: '🏪',
}

export interface PerfilUsuario {
  id: string
  nombre_completo: string
  rol: RolUsuario
  activo: boolean
  ultimo_acceso: string | null
}

export interface Operacion {
  id: string
  tipo_operacion: TipoOperacion
  estado: EstadoOperacion
  instalacion_origen_id: string | null
  lote_origen_id: string | null
  instalacion_destino_id: string | null
  lote_destino_id: string | null
  cantidad_entrada: number | null
  cantidad_salida: number | null
  responsable: string | null
  observaciones: string | null
  notas_sanitarias: string | null
  peso_fresco_kg: number | null
  peso_seco_kg: number | null
  peso_neto_g: number | null
  rendimiento_porcentaje: number | null
  temperatura_c: number | null
  humedad_porcentaje: number | null
  texto_original: string | null
  json_estructurado: Record<string, unknown> | null
  fecha_operacion: string
  creado_por: string
  confirmado_por: string | null
  confirmado_en: string | null
}

export interface MensajeChat {
  id: string
  tipo: 'usuario' | 'sistema' | 'confirmacion' | 'error'
  texto: string
  timestamp: Date
  datos_estructurados?: Partial<Operacion>
}

export interface Lote {
  id: string
  codigo_lote: string
  producto_id: string
  instalacion_id: string
  cantidad: number
  estado: EstadoItem
}

export interface Individuo {
  id: string
  codigo_serie: string
  lote_id: string
  producto_id: string
  estado: EstadoItem
}
