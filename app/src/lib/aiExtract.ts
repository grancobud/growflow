// Cliente para la Edge Function ai-extract-operacion.
// Invoca OpenRouter via Supabase Edge Function con la OPENROUTER_API_KEY como secret.

import { supabase } from './supabase'

export const TIPOS_OPERACION_AI = [
  'ingreso_insumos', 'planta_madre', 'fertilizacion', 'utilizacion_insumos',
  'baja_stock', 'esquejado', 'vegetativa', 'poda', 'floracion', 'control_plagas',
  'cosecha', 'secado', 'trimming', 'cuarentena', 'fraccionamiento', 'almacenamiento',
] as const
export type TipoOperacionAI = typeof TIPOS_OPERACION_AI[number]

export const CAMADAS_AI = ['C7', 'C9', 'C11', 'C12', 'C15', 'C16'] as const
export type CamadaAI = typeof CAMADAS_AI[number]

export const SISTEMAS_AI = ['RDWC', 'COCO'] as const
export type SistemaAI = typeof SISTEMAS_AI[number]

export interface OperacionExtraida {
  tipo_operacion: TipoOperacionAI | null
  cantidad: number | null
  camada: CamadaAI | null
  sistema: SistemaAI | null
  fecha: string | null
  id_lote: string | null
  observaciones: string | null
  confianza: number
}

export interface ExtractResult {
  extraccion: OperacionExtraida
  modelo_usado: string
  prompt_version: string
  /**
   * Mensaje de seguimiento generado por la IA cuando la extraccion quedo con
   * campos faltantes o confianza baja. Modo hibrido: primero extrae, luego
   * pregunta targeted por los gaps. Opcional: si falta, no hay gaps o la
   * 2da llamada fallo (no bloquea al usuario).
   */
  follow_up_message?: string
  /** Campos detectados como faltantes. Util para resaltar en el form. */
  campos_faltantes?: string[]
}

export type AiExtractResponse =
  | { ok: true; data: ExtractResult }
  | { ok: false; error: string; detalle?: string }

// Devuelve la extraccion o un error legible. No lanza excepciones.
export async function extraerOperacionConIA(texto: string): Promise<AiExtractResponse> {
  const trimmed = texto.trim()
  if (trimmed.length < 3) return { ok: false, error: 'Escribi al menos 3 caracteres' }
  if (trimmed.length > 2000) return { ok: false, error: 'Texto demasiado largo (max 2000 caracteres)' }

  try {
    const { data, error } = await supabase.functions.invoke('ai-extract-operacion', {
      body: { texto: trimmed },
    })
    if (error) {
      // Algunos errores de supabase client traen el body adentro
      const body = (error as any)?.context?.body
      if (body) {
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body
          return { ok: false, error: parsed.error || error.message, detalle: parsed.detalle }
        } catch { /* ignore */ }
      }
      return { ok: false, error: error.message || 'Error invocando IA' }
    }
    if (!data || !data.extraccion) return { ok: false, error: 'Respuesta vacia de la IA' }
    return { ok: true, data: data as ExtractResult }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Error de red' }
  }
}
