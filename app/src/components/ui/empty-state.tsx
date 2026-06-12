import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  titulo: string
  descripcion?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

/**
 * Empty state reutilizable: icono circular + titulo + descripcion + CTAs.
 * Usar cuando una lista/tabla esta vacia o un filtro no matchea nada.
 */
export function EmptyState({ icon: Icon, titulo, descripcion, action, secondaryAction, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary-700 dark:text-primary-300" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{titulo}</h3>
      {descripcion && (
        <p className="mt-1.5 text-sm text-surface-600 dark:text-surface-400 max-w-sm leading-relaxed">
          {descripcion}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-col sm:flex-row gap-2 items-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
