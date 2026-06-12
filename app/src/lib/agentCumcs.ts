// Cliente para la Edge Function agent-cumcs (P2.2/P2.3).
// Mantiene history y draft en el cliente; cada sendMessage agrega un turno.

import { supabase } from './supabase'

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  name?: string
}

export interface AgentResponse {
  respuesta: string
  messages: AgentChatMessage[]
  draft_id: string | null
  preview: Record<string, unknown> | null
  tabla_destino: string | null
  modelo_usado: string
  provider: string
  latency_ms: number
  prompt_version: string
  steps: number
  tool_calls_ejecutadas: Array<{ name: string; args: Record<string, unknown>; result_summary: string }>
}

export type AgentInvoke =
  | { ok: true; data: AgentResponse }
  | { ok: false; error: string; detalle?: string }

export async function invokeAgent(
  mensaje: string,
  messages: AgentChatMessage[] = [],
  codigoCumcsFiltro?: string,
  systemPromptOverride?: string,
): Promise<AgentInvoke> {
  try {
    const { data, error } = await supabase.functions.invoke<AgentResponse & { error?: string; detalle?: string }>('agent-cumcs', {
      body: { mensaje, messages, codigo_cumcs_filtro: codigoCumcsFiltro, system_prompt_override: systemPromptOverride },
    })
    if (error) {
      const body = (error as { context?: { body?: string | Record<string, unknown> } })?.context?.body
      if (body) {
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body
          return { ok: false, error: (parsed as { error?: string }).error ?? error.message, detalle: (parsed as { detalle?: string }).detalle }
        } catch { /* ignore */ }
      }
      return { ok: false, error: error.message || 'Error invocando agent' }
    }
    if (!data) return { ok: false, error: 'Respuesta vacia' }
    if ((data as { error?: string }).error) {
      return { ok: false, error: (data as { error: string }).error, detalle: (data as { detalle?: string }).detalle }
    }
    return { ok: true, data: data as AgentResponse }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Error de red' }
  }
}
