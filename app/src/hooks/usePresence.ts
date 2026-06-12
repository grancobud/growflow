// Hook Realtime Presence — muestra quien mas esta viendo la misma pagina.
// Usa Supabase Realtime Presence API (tracking via websocket).
//
// Uso tipico:
//   const { otros, total } = usePresence('trazabilidad')
//   → otros: [{ userId, nombre, rol, avatar, joinedAt }]
//   → total: cantidad de usuarios distintos (incluido el actual)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface PresenciaUsuario {
  userId: string
  nombre: string
  rol: string
  joinedAt: number
}

export function usePresence(pageKey: string, contexto?: string): {
  otros: PresenciaUsuario[]
  total: number
} {
  const { usuario } = useAuth()
  const [otros, setOtros] = useState<PresenciaUsuario[]>([])

  useEffect(() => {
    if (!usuario?.id) return

    const channelName = contexto ? `presence:${pageKey}:${contexto}` : `presence:${pageKey}`

    const channel = supabase.channel(channelName, {
      config: { presence: { key: usuario.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<PresenciaUsuario>>
        const lista: PresenciaUsuario[] = []
        const vistos = new Set<string>()
        for (const [key, sessions] of Object.entries(state)) {
          if (key === usuario.id) continue  // filtrar al usuario actual
          // Si el mismo user abrio varias pestañas, quedarse con 1
          if (vistos.has(key)) continue
          vistos.add(key)
          const s = sessions?.[0]
          if (s) lista.push(s)
        }
        // Ordenar por nombre para render estable
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
        setOtros(lista)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: usuario.id,
            nombre: usuario.nombre_completo ?? 'Anonimo',
            rol: usuario.rol ?? 'operador',
            joinedAt: Date.now(),
          } as PresenciaUsuario)
        }
      })

    return () => {
      void channel.untrack()
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, contexto, usuario?.id])

  return { otros, total: otros.length + (usuario?.id ? 1 : 0) }
}
