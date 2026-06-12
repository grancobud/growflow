import { Wifi, WifiOff, CloudUpload, RefreshCw } from 'lucide-react'
import { useColaSync } from '../../hooks/useColaSync'

export default function EstadoConexion() {
  const { online, pendientes, sincronizando, sincronizar } = useColaSync()

  if (online && pendientes === 0 && !sincronizando) return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
      <Wifi className="w-3 h-3" /> Online
    </div>
  )

  if (!online) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
      <WifiOff className="w-3 h-3" /> Offline {pendientes > 0 && `· ${pendientes} en cola`}
    </div>
  )

  if (sincronizando) return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
      <CloudUpload className="w-3 h-3 animate-pulse" /> Sincronizando {pendientes}
    </div>
  )

  // Online con pendientes: boton para sync manual (reintentar fallidas)
  return (
    <button
      onClick={() => sincronizar(false)}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
      title="Sincronizar operaciones pendientes"
    >
      <RefreshCw className="w-3 h-3" /> {pendientes} pendiente{pendientes !== 1 && 's'}
    </button>
  )
}
