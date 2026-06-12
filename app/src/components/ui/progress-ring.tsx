/**
 * Progress Ring SVG circular. Reutilizable.
 * - valor: 0-100
 * - size: diametro en px (default 40)
 * - strokeWidth: grosor del anillo (default 3)
 * - showLabel: si renderiza el % dentro
 */
interface ProgressRingProps {
  valor: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'danger'
  label?: string
  className?: string
}

const COLOR_MAP: Record<NonNullable<ProgressRingProps['color']>, string> = {
  primary: 'stroke-primary-600 dark:stroke-primary-400',
  accent: 'stroke-accent-600 dark:stroke-accent-400',
  success: 'stroke-emerald-500 dark:stroke-emerald-400',
  warning: 'stroke-amber-500 dark:stroke-amber-400',
  danger: 'stroke-red-500 dark:stroke-red-400',
}

export function ProgressRing({
  valor,
  size = 40,
  strokeWidth = 3,
  showLabel = true,
  color = 'primary',
  label,
  className = '',
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, valor))
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (pct / 100) * circ
  const colorCls = COLOR_MAP[color]

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-surface-200 dark:stroke-surface-700"
          fill="none"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${colorCls} transition-all duration-700 ease-out`}
          fill="none"
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-surface-700 dark:text-surface-200 tabular-nums"
          style={{ fontSize: size < 40 ? 9 : 11 }}
        >
          {label ?? `${Math.round(pct)}%`}
        </span>
      )}
    </div>
  )
}
