// Hook: cuenta de eventos por sector en las ultimas N horas.
// Cache react-query staleTime 60s + refresh on Realtime INSERT.

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSectorActivityCounts } from '../lib/activityFeed'
import { SECTOR_TABLES, type SectorKey } from '../lib/awareness'
import { supabase } from '../lib/supabase'

export function useSectorActivity(hours = 24) {
  const qc = useQueryClient()
  const key = ['sector-activity', hours] as const

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSectorActivityCounts(hours),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const trigger = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        qc.invalidateQueries({ queryKey: key })
      }, 800)
    }

    let channel = supabase.channel(`sector-activity:${hours}`)
    for (const t of SECTOR_TABLES) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table: t },
        () => trigger(),
      )
    }
    channel.subscribe()

    return () => {
      if (timeout) clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  const data = (query.data ?? {}) as Record<SectorKey, number>
  return { counts: data, isLoading: query.isLoading }
}
