import { Skeleton } from './skeleton'

/** Skeleton para KPI cards (Panel, Dashboard) */
export function KpiCardSkeleton() {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

/** Skeleton para filas de tabla. count = numero de filas. */
export function TableRowSkeleton({ count = 5, cols = 5 }: { count?: number; cols?: number }) {
  return (
    <div className="divide-y divide-surface-200 dark:divide-surface-800">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4"
              style={{ width: `${[60, 40, 80, 30, 50][j % 5]}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Skeleton para graficos (Dashboard, Metricas) */
export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-5">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[60, 85, 45, 70, 90, 55, 75, 80, 65, 50, 70, 85].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

/** Grid de 4 KPI cards skeleton */
export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Bento skeleton: 1 hero grande (col-span-3) + 3 compactos - matchea layout Dashboard */
export function BentoKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="lg:col-span-3">
        <div className="relative h-full min-h-[140px] rounded-xl bg-gradient-to-br from-primary-700/20 to-primary-900/20 p-6 overflow-hidden">
          <Skeleton className="h-3 w-36 mb-3" />
          <Skeleton className="h-12 w-44 mb-2" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="lg:col-span-1"><KpiCardSkeleton /></div>
      <div className="lg:col-span-1"><KpiCardSkeleton /></div>
      <div className="lg:col-span-1"><KpiCardSkeleton /></div>
    </div>
  )
}

/** Grid de cards de trazabilidad (con progress ring placeholder) */
export function TrazabilidadCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border-2 border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
          <div className="flex items-start gap-3">
            <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Pagina entera cargando - alternative a spinner full-screen */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <KpiGridSkeleton />
      <ChartSkeleton />
    </div>
  )
}
