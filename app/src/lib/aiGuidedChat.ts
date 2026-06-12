// Helper cliente para generar la proxima pregunta del chat guiado via IA.
// Llama a la Edge Function ai-next-question con timeout corto (2.5s).
// Si falla/tarda, retorna null y el caller usa la pregunta hardcoded del schema.

import { supabase } from './supabase'
import type { CampoChat } from './camposChatCumcs'

export interface NextQuestionResult {
  pregunta: string
  modelo_usado: string
  prompt_version: string
}

/**
 * Genera la proxima pregunta natural usando IA.
 * NO lanza excepciones — retorna null ante cualquier fallo.
 * Timeout: 2500ms (si tarda mas, caller sigue con pregunta hardcoded).
 */
export async function generarProximaPregunta(
  codigoCumcs: string,
  campo: CampoChat,
  contexto: Record<string, string | number | null | undefined> = {},
  timeoutMs = 2500,
): Promise<NextQuestionResult | null> {
  try {
    const ctxFiltrado: Record<string, string | number | null> = {}
    for (const [k, v] of Object.entries(contexto)) {
      if (v != null && v !== '') ctxFiltrado[k] = v as string | number | null
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const invokePromise = supabase.functions.invoke<NextQuestionResult>('ai-next-question', {
      body: {
        codigo_cumcs: codigoCumcs,
        campo: {
          key: campo.key,
          label: campo.label,
          tipo: campo.tipo,
          pregunta: campo.pregunta,
          placeholder: campo.placeholder,
          opciones: campo.opciones,
          requerido: campo.requerido,
          defaultValue: campo.defaultValue,
        },
        contexto: ctxFiltrado,
      },
    })

    // Race entre invocacion y timeout
    const result = await Promise.race([
      invokePromise,
      new Promise<null>((resolve) => {
        controller.signal.addEventListener('abort', () => resolve(null))
      }),
    ])
    clearTimeout(timeoutId)

    if (!result) return null  // timeout
    const { data, error } = result as { data: NextQuestionResult | null; error: unknown }
    if (error || !data?.pregunta) return null
    return data
  } catch {
    return null
  }
}
