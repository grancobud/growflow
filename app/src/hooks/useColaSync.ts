import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { colaSync, colaContar, type ResultadoSync } from '../lib/offlineDb'
import { useOnlineStatus } from './useOnlineStatus'

// Sincroniza la cola de operaciones pendientes cuando vuelve la conexion.
// Tambien expone una funcion `sincronizar()` para disparar manualmente desde UI.
export function useColaSync() {
  const online = useOnlineStatus()
  const [pendientes, setPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimoSync, setUltimoSync] = useState<ResultadoSync | null>(null)

  const refrescarCount = useCallback(async () => {
    setPendientes(await colaContar())
  }, [])

  const sincronizar = useCallback(async (silencioso = false) => {
    if (sincronizando) return null
    const pendientesAntes = await colaContar()
    if (pendientesAntes === 0) {
      if (!silencioso) toast.info('No hay operaciones pendientes')
      return null
    }
    setSincronizando(true)
    const r = await colaSync()
    setUltimoSync(r)
    setSincronizando(false)
    await refrescarCount()
    if (!silencioso) {
      if (r.fallidos === 0) toast.success(`${r.exitosos} operacion(es) sincronizadas`)
      else if (r.exitosos === 0) toast.error(`Error sincronizando: ${r.errores[0]?.mensaje || 'sin detalle'}`)
      else toast.warning(`${r.exitosos} OK, ${r.fallidos} fallidas - reintentar`)
    }
    return r
  }, [sincronizando, refrescarCount])

  // Poll de count cada 5s para UI
  useEffect(() => {
    refrescarCount()
    const id = setInterval(refrescarCount, 5000)
    return () => clearInterval(id)
  }, [refrescarCount])

  // Al volver online, intenta sync automatico en silencio
  useEffect(() => {
    if (online) {
      const t = setTimeout(() => { sincronizar(true) }, 1500) // debounce breve por si hay flapping
      return () => clearTimeout(t)
    }
  }, [online, sincronizar])

  return { online, pendientes, sincronizando, ultimoSync, sincronizar, refrescarCount }
}
