import { motion } from 'framer-motion'
import type { VarianteCumcs } from '../../lib/cumcsVariantes'

interface Props {
  variantes: VarianteCumcs[]
  codigoActivo: string
  onChange: (variante: VarianteCumcs) => void
  layoutId?: string
}

export default function SelectorVariante({ variantes, codigoActivo, onChange, layoutId = 'variante-pill' }: Props) {
  if (variantes.length <= 1) return null

  return (
    <div className="inline-flex items-center gap-1 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-1">
      {variantes.map(v => {
        const Icon = v.icon
        const activa = v.codigo === codigoActivo
        return (
          <button
            key={v.codigo}
            type="button"
            onClick={() => onChange(v)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activa
                ? 'text-primary-700 dark:text-primary-200'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
            }`}
            title={`${v.codigo} — ${v.nombre}`}
          >
            {activa && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-white dark:bg-surface-900 rounded-lg shadow-sm border border-surface-200 dark:border-surface-700"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {Icon && <Icon className="w-3.5 h-3.5 relative" strokeWidth={1.75} />}
            <span className="relative">{v.label}</span>
            <span className="relative text-[9px] font-mono opacity-50">{v.codigo.replace('CM-RE-', '')}</span>
          </button>
        )
      })}
    </div>
  )
}
