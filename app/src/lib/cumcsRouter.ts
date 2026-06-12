// Router CUMCS → tabla destino.
// Escribe el registro en la tabla `registros_*` especifica del grupo (G01, G02, G03, G06),
// ademas de la entrada en `operaciones` (journal central, dual-write).
//
// Filosofia:
// - `operaciones` sigue siendo el journal central (no se rompe nada del stack existente).
// - La tabla especifica recibe los campos tipados con su shape correcto.
// - El audit_log genera 2 entradas con hash-chain (una por tabla) → trazabilidad completa.
// - Los campos del chat (formCampos) que NO matchean columna tipada van a `datos_extra jsonb`.
// - Si el CUMCS no tiene tabla especifica configurada aqui, se hace no-op (solo queda en operaciones).
//
// Hoy mapea los 4 grupos NUEVOS creados en migration 20260419: G01/G02/G03/G06.
// Los grupos pre-existentes (G04/G05/G07/G08/G09/G10) tienen tablas pero el chat ya
// no las escribe — extension futura incremental siguiendo este mismo patron.

import { supabase } from './supabase'

/** Mapping CUMCS code → tabla destino en Supabase. */
const CUMCS_A_TABLA: Record<string, string> = {
  // G01 Condiciones ambientales → registros_condiciones_ambientales (nueva)
  'CM-RE-0101': 'registros_condiciones_ambientales',
  'CM-RE-0102': 'registros_condiciones_ambientales',
  'CM-RE-0103': 'registros_condiciones_ambientales',
  'CM-RE-0104': 'registros_condiciones_ambientales',
  'CM-RE-0105': 'registros_condiciones_ambientales',
  'CM-RE-0106': 'registros_condiciones_ambientales',
  'CM-RE-0107': 'registros_condiciones_ambientales',
  'CM-RE-0108': 'registros_condiciones_ambientales',
  // G02 Trazabilidad → registros_trazabilidad (nueva)
  'CM-RE-0201': 'registros_trazabilidad',
  'CM-RE-0202': 'registros_trazabilidad',
  'CM-RE-0203': 'registros_trazabilidad',
  'CM-RE-0204': 'registros_trazabilidad',
  'CM-RE-0205': 'registros_trazabilidad',
  'CM-RE-0206': 'registros_trazabilidad',
  'CM-RE-0207': 'registros_trazabilidad',
  'CM-RE-0208': 'registros_trazabilidad',
  'CM-RE-0209': 'registros_trazabilidad',
  'CM-RE-0210': 'registros_trazabilidad',
  'CM-RE-0211': 'registros_trazabilidad',
  // G03 Fertilizantes → registros_fertilizantes (nueva)
  'CM-RE-0301': 'registros_fertilizantes',
  'CM-RE-0302': 'registros_fertilizantes',
  'CM-RE-0303': 'registros_fertilizantes',
  'CM-RE-0304': 'registros_fertilizantes',
  'CM-RE-0305': 'registros_fertilizantes',
  'CM-RE-0306': 'registros_fertilizantes',
  // G06 Cosecha → registros_cosecha (nueva)
  'CM-RE-0601': 'registros_cosecha',
  'CM-RE-0602': 'registros_cosecha',
  'CM-RE-0603': 'registros_cosecha',
  'CM-RE-0604': 'registros_cosecha',
  'CM-RE-0605': 'registros_cosecha',
  'CM-RE-0606': 'registros_cosecha',
  'CM-RE-0607': 'registros_cosecha',
  'CM-RE-0608': 'registros_cosecha',
  'CM-RE-0609': 'registros_cosecha',
  'CM-RE-0610': 'registros_cosecha',
  'CM-RE-0611': 'registros_cosecha',
}

/**
 * Columnas tipadas conocidas por tabla destino. Campos del chat que matchean
 * por nombre aca van directo a la columna. Los que NO matchean van a datos_extra.
 * Mantener sincronizado con supabase/migrations/20260419_create_cumcs_tables_g01_g02_g03_g06.sql.
 */
const COLUMNAS_TIPADAS: Record<string, Set<string>> = {
  registros_condiciones_ambientales: new Set([
    'tipo', 'fecha', 'camada', 'sistema', 'sala', 'etapa', 'identificacion',
    'variedad', 'sustrato', 'aeroclonador_n', 'humedad', 'temperatura', 'temp_aa',
    'temp_h2o', 'ec', 'ph_inicial', 'ph_ml', 'ph_corregido', 'vpd_kpa', 'co2_ppm',
    'orp', 'ventilacion', 'extraccion', 'estado_cultivo', 'presencia_insectos',
    'presencia_hongos', 'id_lote_texto', 'observaciones', 'responsable',
  ]),
  registros_trazabilidad: new Set([
    'tipo', 'fecha', 'camada', 'sistema', 'sala', 'fila',
    'cod_traza_cosecha', 'cod_traza_secado', 'cod_traza_trimeo', 'cod_traza_cuarentena',
    'cod_traza_almacenamiento', 'cod_comercial', 'cod_generico',
    'planta_madre_id', 'clonacion_origen', 'madre_origen', 'bandeja', 'cuadro_n',
    'cliente', 'destino', 'peso_fresco_kg', 'peso_seco_kg', 'peso_trimeado_kg',
    'peso_total_kg', 'merma_pct', 'cantidad', 'ubicacion', 'etapa', 'descripcion',
    'version', 'vinculaciones', 'observaciones', 'responsable',
  ]),
  registros_fertilizantes: new Set([
    'tipo', 'fecha', 'tanque', 'destino', 'sala', 'id_lote_texto', 'etapa',
    'producto', 'principio_activo', 'tipo_gasto', 'pro_core', 'pro_grow', 'pro_bloom',
    'litros', 'cantidad_producto', 'litros_agua', 'dilucion', 'cantidad', 'unidad',
    'entrada', 'salida', 'saldo', 'fecha_movimiento', 'detalle',
    'observaciones', 'responsable',
  ]),
  registros_cosecha: new Set([
    'tipo', 'fecha', 'camada', 'sistema', 'sala', 'fila', 'ubicacion_cultivo',
    'genetica', 'variedad', 'fecha_transplante', 'fecha_cosecha', 'fecha_traslado',
    'fecha_recepcion', 'fecha_inicio_cuarentena', 'fecha_fin_cuarentena',
    'plantas_cosechadas', 'planta_n', 'cantidad_recibida', 'cantidad_bolsas',
    'total_plantas', 'cuadro_secado', 'estado_producto', 'cond_recepcion',
    'cond_sanitaria', 'cumple_bpa', 'instrumental', 'peso_fresco', 'peso_seco',
    'peso_seco_estimado', 'peso_individual', 'peso_neto_g', 'humedad_pct', 'aw',
    'sanidad', 'origen', 'codigo_lote', 'cod_traza_cosecha', 'cod_traza_secado',
    'cod_traza_trimeo', 'cod_traza_cuarentena', 'cod_traza_almacenamiento',
    'cod_comercial', 'cod_salida', 'destino', 'transporte_empresa', 'patente',
    'conductor', 'peso_total', 'cantidad_bultos', 'croquis_ref', 'obs_sanitarias',
    'responsable_sala', 'responsable_calidad', 'responsable_entrega',
    'responsable_recepcion', 'observaciones', 'responsable',
  ]),
}

/** Campos numericos: cast string → number si viene como string del form. */
const CAMPOS_NUMERICOS = new Set([
  'humedad', 'temperatura', 'temp_aa', 'temp_h2o', 'ec', 'ph_inicial', 'ph_corregido',
  'vpd_kpa', 'co2_ppm', 'orp', 'aeroclonador_n', 'bandeja', 'cuadro_n',
  'peso_fresco_kg', 'peso_seco_kg', 'peso_trimeado_kg', 'peso_total_kg', 'merma_pct',
  'cantidad', 'pro_core', 'pro_grow', 'pro_bloom', 'litros', 'cantidad_producto',
  'litros_agua', 'entrada', 'salida', 'saldo', 'plantas_cosechadas', 'planta_n',
  'cantidad_recibida', 'cantidad_bolsas', 'total_plantas', 'cuadro_secado',
  'peso_fresco', 'peso_seco', 'peso_seco_estimado', 'peso_individual', 'peso_neto_g',
  'humedad_pct', 'aw', 'peso_total', 'cantidad_bultos',
])

/** Campos fecha (date): formato YYYY-MM-DD esperado. Campos numericos se pasan tal cual. */
const CAMPOS_FECHA = new Set([
  'fecha', 'fecha_transplante', 'fecha_cosecha', 'fecha_traslado', 'fecha_recepcion',
  'fecha_inicio_cuarentena', 'fecha_fin_cuarentena', 'fecha_movimiento', 'fecha_ingreso',
  'fecha_baja',
])

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

function toDate(v: unknown): string | null {
  if (v == null || v === '') return null
  const s = String(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

export interface InsertarRegistroCumcsResult {
  /** Nombre de la tabla destino, o null si este CUMCS no tiene tabla especifica mapeada. */
  tabla: string | null
  /** UUID de la fila insertada (si hubo insert). */
  id: string | null
  /** Codigo CUMCS con el que se guardo. */
  codigo: string
  /** Error no bloqueante (p.ej. no hay tabla mapeada). */
  error?: string
}

export interface CumcsInsertMeta {
  /** ID de la operacion central (tabla `operaciones`) para enlazarlo como reference. */
  operacion_id?: string
  /** Si vino via InputLibreAI, metadata del modelo. */
  via_ai?: boolean
  modelo_ia?: string
  prompt_original?: string
  prompt_version?: string
  /** ID del lote relacionado (opcional, se puede resolver antes). */
  lote_id?: string
  /** Codigo de lote textual (para tablas que lo tienen). */
  id_lote_texto?: string
  /** ID de instalacion relacionada (opcional). */
  instalacion_id?: string
}

/**
 * Inserta un registro CUMCS en la tabla especifica correspondiente al codigo.
 * No falla si la tabla no esta mapeada (retorna {tabla: null}).
 * Lanza solo si la insercion en la tabla mapeada falla (para que el caller decida).
 */
export async function insertarRegistroCumcs(
  codigoCumcs: string,
  formCampos: Record<string, string>,
  meta: CumcsInsertMeta = {},
): Promise<InsertarRegistroCumcsResult> {
  const tabla = CUMCS_A_TABLA[codigoCumcs]
  if (!tabla) {
    return { tabla: null, id: null, codigo: codigoCumcs, error: 'sin_tabla_mapeada' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const columnasTipadas = COLUMNAS_TIPADAS[tabla] ?? new Set<string>()
  const payload: Record<string, unknown> = {
    tipo: codigoCumcs,
    creado_por: user.id,
  }
  const datos_extra: Record<string, unknown> = {
    via: meta.via_ai ? 'ia' : 'chat_guiado',
    ...(meta.operacion_id ? { operacion_id: meta.operacion_id } : {}),
    ...(meta.via_ai ? {
      via_ai: true,
      modelo_ia: meta.modelo_ia ?? null,
      prompt_original: meta.prompt_original ?? null,
      prompt_version: meta.prompt_version ?? null,
    } : { via_ai: false }),
  }

  // Mapear formCampos → columnas tipadas o datos_extra
  for (const [key, rawValue] of Object.entries(formCampos)) {
    if (rawValue == null || rawValue === '') continue
    if (columnasTipadas.has(key)) {
      if (CAMPOS_NUMERICOS.has(key)) {
        payload[key] = toNumber(rawValue)
      } else if (CAMPOS_FECHA.has(key)) {
        payload[key] = toDate(rawValue)
      } else {
        payload[key] = rawValue
      }
    } else {
      datos_extra[key] = rawValue
    }
  }

  // Fecha: si no se seteo por mapping directo, intentar inferir (algunas hojas usan
  // `fecha_operacion`, `fecha_registro`, `fecha_ingreso`, etc).
  if (!payload.fecha) {
    const fechaRaw =
      formCampos.fecha_operacion ||
      formCampos.fecha_registro ||
      formCampos.fecha_ingreso ||
      formCampos.fecha_cosecha ||
      formCampos.fecha_transplante ||
      formCampos.fecha_recepcion ||
      new Date().toISOString().slice(0, 10)
    payload.fecha = toDate(fechaRaw) ?? new Date().toISOString().slice(0, 10)
  }

  // FK opcional a lotes si existe columna lote_id en la tabla destino
  if (meta.lote_id && columnasTipadas.has('lote_id' as never)) {
    (payload as Record<string, unknown>).lote_id = meta.lote_id
  }
  if (meta.instalacion_id && columnasTipadas.has('instalacion_id' as never)) {
    (payload as Record<string, unknown>).instalacion_id = meta.instalacion_id
  }

  payload.datos_extra = datos_extra

  const { data, error } = await supabase
    .from(tabla)
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Error insertando en ${tabla}: ${error.message}`)
  }
  return { tabla, id: data?.id ?? null, codigo: codigoCumcs }
}

/** Para mostrar en UI / debug: lista de CUMCS que ya enrutan a tabla especifica. */
export function getCumcsConTablaEspecifica(): string[] {
  return Object.keys(CUMCS_A_TABLA)
}

/** Util para UI: devuelve tabla destino si existe. */
export function getTablaParaCumcs(codigoCumcs: string): string | null {
  return CUMCS_A_TABLA[codigoCumcs] ?? null
}
