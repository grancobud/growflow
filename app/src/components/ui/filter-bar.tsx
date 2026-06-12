import { X, Filter as FilterIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

export interface FilterChip {
  id: string
  label: string
  valor: string
  color?: 'primary' | 'accent' | 'info' | 'warning' | 'danger' | 'neutral'
  onRemove: () => void
}

interface FilterBarProps {
  chips: FilterChip[]
  onClearAll?: () => void
  children?: ReactNode
  className?: string
}

const COLORS: Record<NonNullable<FilterChip['color']>, string> = {
  primary: 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/40 dark:text-primary-200 dark:border-primary-700/40',
  accent:  'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-900/40 dark:text-accent-200 dark:border-accent-700/40',
  info:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/40',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/40',
  danger:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700/40',
  neutral: 'bg-surface-100 text-surface-700 border-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700',
}

/**
 * FilterBar con chips removibles (patron Linear/Retool).
 * - chips: array de filtros activos
 * - onClearAll: boton "Limpiar todo" si hay >1 chip
 * - children: slot para popover/dropdowns de "Agregar filtro"
 */
export function FilterBar({ chips, onClearAll, children, className = '' }: FilterBarProps) {
  const hayFiltros = chips.length > 0

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 flex-shrink-0">
        <FilterIcon className="w-3.5 h-3.5" />
        <span>Filtros:</span>
      </div>

      <AnimatePresence mode="popLayout">
        {chips.map((chip) => {
          const color = chip.color ?? 'neutral'
          return (
            <motion.span
              key={chip.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${COLORS[color]}`}
            >
              <span className="text-[10px] opacity-70 font-semibold uppercase tracking-wider">{chip.label}:</span>
              <span>{chip.valor}</span>
              <button
                onClick={chip.onRemove}
                className="-mr-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label={`Quitar filtro ${chip.label} ${chip.valor}`}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          )
        })}
      </AnimatePresence>

      {!hayFiltros && (
        <span className="text-xs text-surface-400 dark:text-surface-500 italic">Ninguno activo</span>
      )}

      {hayFiltros && onClearAll && chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-surface-500 dark:text-surface-400 hover:text-primary-700 dark:hover:text-primary-400 underline underline-offset-2 ml-1"
        >
          Limpiar todo
        </button>
      )}

      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}
