// Awareness layer config: sectores cross-CUMCS, mapeo tabla→sector,
// columnas de fecha y queries reutilizables. Single source of truth.
//
// NOTA sobre fechas: las tablas registros_* exponen tanto un campo `fecha`
// (date) como `creado_en` (timestamptz). Usamos `fecha` como evento del
// calendario (cuando ocurrio la actividad) y `creado_en` para "hace X tiempo"
// en el activity stream. operaciones usa `fecha_operacion` (timestamptz),
// alertas_operativas usa `creado_en`.
//
// Tablas confirmadas via information_schema (mayo 2026).

import {
  Thermometer, GitBranch, Sprout, Bug, Droplet, Users, FlaskConical,
  Scissors, Wrench, FileText, Activity, AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

export type SectorKey =
  | 'ambiente'
  | 'trazabilidad'
  | 'fertilizantes'
  | 'fitosanitarios'
  | 'agua'
  | 'personal'
  | 'calidad'
  | 'cosecha'
  | 'mantenimiento'
  | 'documentales'
  | 'operaciones'
  | 'alertas'

export interface SectorDef {
  key: SectorKey
  label: string
  table: string
  // Fecha del evento de negocio (usada en calendario)
  fechaCol: string
  // Timestamp de creacion del registro (usada en activity stream)
  createdCol: string
  // Color hex (paleta CannTrace dark)
  color: string
  icon: LucideIcon
  // Ruta destino al hacer click
  path: string
  // Campo legible para la subline
  refField?: string
}

export const SECTORES: Record<SectorKey, SectorDef> = {
  ambiente: {
    key: 'ambiente', label: 'Ambiente', table: 'registros_condiciones_ambientales',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#06b6d4', icon: Thermometer, path: '/registros', refField: 'camada',
  },
  trazabilidad: {
    key: 'trazabilidad', label: 'Trazabilidad', table: 'registros_trazabilidad',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#8fb6e8', icon: GitBranch, path: '/trazabilidad', refField: 'camada',
  },
  fertilizantes: {
    key: 'fertilizantes', label: 'Fertilizantes', table: 'registros_fertilizantes',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#a855f7', icon: Sprout, path: '/registros', refField: 'responsable',
  },
  fitosanitarios: {
    key: 'fitosanitarios', label: 'Fitosanitarios', table: 'registros_fitosanitarios',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#e08282', icon: Bug, path: '/registros', refField: 'responsable',
  },
  agua: {
    key: 'agua', label: 'Riego', table: 'registros_agua',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#a3e635', icon: Droplet, path: '/registros', refField: 'responsable',
  },
  personal: {
    key: 'personal', label: 'Personal', table: 'registros_personal',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#c9b7ff', icon: Users, path: '/registros', refField: 'descripcion',
  },
  calidad: {
    key: 'calidad', label: 'Calidad', table: 'registros_calidad',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#ec4899', icon: FlaskConical, path: '/metricas', refField: 'responsable',
  },
  cosecha: {
    // Asuncion: registros_cosecha tiene multiples columnas de fecha (fecha, fecha_cosecha,
    // fecha_traslado, etc.). Usamos `fecha` como evento principal de la planilla CUMCS.
    key: 'cosecha', label: 'Cosecha', table: 'registros_cosecha',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#c4b5fd', icon: Scissors, path: '/registros', refField: 'codigo_lote',
  },
  mantenimiento: {
    // Asuncion: registros_mantenimiento NO tiene `fecha`, solo `fecha_mantenimiento`.
    key: 'mantenimiento', label: 'Mantenimiento', table: 'registros_mantenimiento',
    fechaCol: 'fecha_mantenimiento', createdCol: 'creado_en',
    color: '#7a5abf', icon: Wrench, path: '/registros', refField: 'responsable',
  },
  documentales: {
    key: 'documentales', label: 'Documentación', table: 'registros_documentales',
    fechaCol: 'fecha', createdCol: 'creado_en',
    color: '#64748b', icon: FileText, path: '/registros', refField: 'titulo',
  },
  operaciones: {
    key: 'operaciones', label: 'Operaciones', table: 'operaciones',
    fechaCol: 'fecha_operacion', createdCol: 'fecha_operacion',
    color: '#bef264', icon: Activity, path: '/operacion', refField: 'tipo_operacion',
  },
  alertas: {
    // alertas_operativas usa `creado_en` para ambas (no hay fecha_evento).
    key: 'alertas', label: 'Alertas', table: 'alertas_operativas',
    fechaCol: 'creado_en', createdCol: 'creado_en',
    color: '#ff8a7a', icon: AlertTriangle, path: '/alertas', refField: 'titulo',
  },
}

export const SECTOR_KEYS = Object.keys(SECTORES) as SectorKey[]

export const SECTOR_TABLES = SECTOR_KEYS.map(k => SECTORES[k].table)

// Mapeo inverso tabla -> sector
export const TABLE_TO_SECTOR: Record<string, SectorKey> = Object.fromEntries(
  SECTOR_KEYS.map(k => [SECTORES[k].table, k]),
) as Record<string, SectorKey>

export interface ActivityEvent {
  id: string
  sector: SectorKey
  table: string
  // ISO date/datetime del evento de negocio
  fecha: string
  // ISO datetime de creacion del registro (para "hace X tiempo")
  creadoEn: string
  // Texto principal a mostrar
  ref: string
  // Datos crudos opcionales
  raw?: Record<string, unknown>
}

// ============================================================================
// Mapeo legacy: grupos sidebar (Producción / Trazabilidad / Calidad / Doc) -> sectores
// Usado para badges de actividad en el sidebar.
// ============================================================================
export const SIDEBAR_GROUP_SECTORS: Record<string, SectorKey[]> = {
  Producción: ['agua', 'fertilizantes', 'fitosanitarios', 'ambiente', 'cosecha'],
  Trazabilidad: ['trazabilidad', 'operaciones'],
  Calidad: ['calidad', 'personal'],
  Documentación: ['documentales'],
  Administración: ['mantenimiento'],
}
