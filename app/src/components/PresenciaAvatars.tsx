// Avatar stack + tooltip mostrando quien mas esta viendo la misma pagina.
// Compact: muestra hasta 3 iniciales, "+N" si hay mas, y tooltip con nombres completos.

import { AnimatePresence, motion } from 'framer-motion'
import { usePresence } from '../hooks/usePresence'

const COLORES_ROL: Record<string, string> = {
  administrador: 'bg-purple-500',
  supervisor: 'bg-blue-500',
  operador: 'bg-emerald-500',
  auditor: 'bg-amber-500',
}

export default function PresenciaAvatars({
  pageKey,
  contexto,
  label,
}: {
  pageKey: string
  contexto?: string
  /** Texto opcional antes de los avatares, ej "viendo esta cadena" */
  label?: string
}) {
  const { otros } = usePresence(pageKey, contexto)

  if (otros.length === 0) return null

  const visibles = otros.slice(0, 3)
  const extra = otros.length - visibles.length

  return (
    <div className="flex items-center gap-2 text-[11px] text-surface-600 dark:text-surface-400">
      {label && <span className="italic">{label}</span>}
      <div className="flex -space-x-1.5">
        <AnimatePresence>
          {visibles.map(u => (
            <motion.div
              key={u.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`relative w-6 h-6 rounded-full ring-2 ring-white dark:ring-surface-900 ${COLORES_ROL[u.rol] ?? 'bg-slate-500'} flex items-center justify-center text-[10px] font-bold text-white`}
              title={`${u.nombre} (${u.rol})`}
            >
              {u.nombre.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full ring-1 ring-white dark:ring-surface-900" />
            </motion.div>
          ))}
        </AnimatePresence>
        {extra > 0 && (
          <div className="relative w-6 h-6 rounded-full ring-2 ring-white dark:ring-surface-900 bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-[9px] font-bold text-surface-700 dark:text-surface-300">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-[10px]">
        {otros.length === 1
          ? `${visibles[0].nombre} tambien esta viendo esto`
          : `${otros.length} personas viendo esto`}
      </span>
    </div>
  )
}
