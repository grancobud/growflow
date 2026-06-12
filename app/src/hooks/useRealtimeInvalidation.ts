// Hooks Realtime para sincronizar UI con cambios de BD sin F5.
//
// Hoy CannTrace no usa TanStack Query consistentemente — las paginas cargan via
// useEffect + supabase.from().select(). Por eso el hook compatible principal es
// `useRealtimeRefetch(tabla, callback)` — invoca el callback cuando hay cambios,
// la pagina decide que hacer (tipicamente re-correr su funcion `cargar()`).
//
// Si en el futuro se migra a TanStack Query, los hooks de invalidacion quedan
// utiles tambien.

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

/**
 * Hook compatible con el patron actual (useEffect + supabase.from).
 * Ejecuta `onChange()` cada vez que hay INSERT/UPDATE/DELETE en la tabla dada.
 * Debounce 400ms para evitar rafagas de refetch en bulk operations.
 *
 * Uso:
 *   const [alertas, setAlertas] = useState([])
 *   const cargar = async () => { ... setAlertas(data) }
 *   useEffect(() => { cargar() }, [])
 *   useRealtimeRefetch('alertas_operativas', cargar)
 */
export function useRealtimeRefetch(
  tabla: string | string[],
  onChange: () => void | Promise<void>,
  options: { debounceMs?: number } = {},
): void {
  const debounceMs = options.debounceMs ?? 400
  // Mantener referencia estable al callback sin forzar re-subscripcion
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    const tablas = Array.isArray(tabla) ? tabla : [tabla]
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const trigger = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        void callbackRef.current()
        timeoutId = null
      }, debounceMs)
    }

    let channel = supabase.channel(`refetch:${tablas.join(',')}`)
    for (const t of tablas) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: t },
        () => trigger(),
      )
    }
    channel.subscribe()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(tabla) ? tabla.join(',') : tabla, debounceMs])
}

interface UseRealtimeInvalidationOptions {
  /** Si true (default), hace `invalidateQueries`. Si false, loguea solo. */
  invalidate?: boolean
  /** Callback extra al recibir evento (ej: mostrar toast). */
  onEvent?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

export function useRealtimeInvalidation(
  tabla: string,
  queryKeyPrefix: readonly string[],
  options: UseRealtimeInvalidationOptions = {},
): void {
  const queryClient = useQueryClient()
  const invalidate = options.invalidate ?? true

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${tabla}`)
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: tabla },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (invalidate) {
            // Invalidar queries que empiezan con queryKeyPrefix. TanStack hace match prefijo.
            queryClient.invalidateQueries({ queryKey: queryKeyPrefix as unknown as readonly unknown[] })
          }
          options.onEvent?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // queryClient es estable; queryKeyPrefix esperamos literal array (no reactivo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, invalidate])
}

/**
 * Hook "activa realtime en toda la app" — suscribe a las 12 tablas criticas
 * en UN SOLO channel (Supabase soporta multiples .on() por channel).
 * Antes abria 12 channels WebSocket separados → causaba lag al montar Layout
 * y ocasionalmente alguno no se conectaba bien (requeria F5).
 *
 * Ademas: debounce la invalidacion a 300ms para evitar "invalidation storms"
 * cuando llega un batch de INSERTs (ej migracion bulk).
 */
export function useGlobalCumcsRealtimeInvalidation(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Mapping tabla → queryKey prefix
    const tablasMap: Record<string, string[]> = {
      'operaciones': ['operaciones'],
      'lotes': ['lotes'],
      'registros_agua': ['registros', 'agua'],
      'registros_fitosanitarios': ['registros', 'fitosanitarios'],
      'registros_mantenimiento': ['registros', 'mantenimiento'],
      'registros_personal': ['registros', 'personal'],
      'registros_calidad': ['registros', 'calidad'],
      'registros_documentales': ['registros', 'documentales'],
      'registros_condiciones_ambientales': ['registros', 'condiciones_ambientales'],
      'registros_trazabilidad': ['registros', 'trazabilidad'],
      'registros_fertilizantes': ['registros', 'fertilizantes'],
      'registros_cosecha': ['registros', 'cosecha'],
    }

    // Debounce invalidaciones — si llegan 10 eventos en 300ms, invalida 1 vez
    const pendientes = new Set<string>()
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function programarInvalidacion(tabla: string) {
      pendientes.add(tabla)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        for (const t of pendientes) {
          const keyPrefix = tablasMap[t]
          if (keyPrefix) {
            queryClient.invalidateQueries({ queryKey: keyPrefix as unknown as readonly unknown[] })
          }
        }
        // Siempre invalidar generico para paginas que agregan varias tablas
        queryClient.invalidateQueries({ queryKey: ['registros'] })
        pendientes.clear()
        timeoutId = null
      }, 300)
    }

    // UN SOLO channel con 12 listeners — 1 conexion WebSocket en total
    let channel = supabase.channel('canntrace-global-realtime')
    for (const tabla of Object.keys(tablasMap)) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: tabla },
        (payload: { table?: string }) => {
          const t = payload?.table ?? tabla
          programarInvalidacion(t)
        }
      )
    }
    channel.subscribe()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
