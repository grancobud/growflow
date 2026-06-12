import { useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, Rows3, Rows2 } from 'lucide-react'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  busqueda?: boolean
  virtual?: boolean
  densidadToggle?: boolean
  paginacion?: boolean
  pageSize?: number
  emptyState?: React.ReactNode
  onRowClick?: (row: TData) => void
  className?: string
}

/**
 * DataTable generica reutilizable:
 * - Sort multi-columna (click + shift-click)
 * - Filtro global (busqueda fuzzy)
 * - Virtualizacion opcional (>200 filas automatico)
 * - Paginacion opcional
 * - Densidad comfortable/compact toggle
 * - Row click handler
 * - Sticky header
 */
export function DataTable<TData>({
  data,
  columns,
  busqueda = true,
  virtual,
  densidadToggle = true,
  paginacion = false,
  pageSize = 50,
  emptyState,
  onRowClick,
  className = '',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [compact, setCompact] = useState(false)

  // Auto-virtualize si hay >200 filas y no se especifico explicit
  const useVirtual = useMemo(() => {
    if (typeof virtual === 'boolean') return virtual
    return data.length > 200
  }, [virtual, data.length])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: paginacion ? getPaginationRowModel() : undefined,
    initialState: { pagination: { pageSize } },
  })

  const { rows } = table.getRowModel()
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => (compact ? 36 : 48),
    getScrollElement: () => tableContainerRef.current,
    overscan: 10,
    enabled: useVirtual,
  })

  const paddingTop = useVirtual && rowVirtualizer.getVirtualItems().length > 0
    ? rowVirtualizer.getVirtualItems()[0].start
    : 0
  const paddingBottom = useVirtual && rowVirtualizer.getVirtualItems().length > 0
    ? rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems().at(-1)!.end
    : 0

  const filasMostradas = useVirtual ? rowVirtualizer.getVirtualItems().map((v) => rows[v.index]) : rows

  return (
    <div className={`bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden ${className}`}>
      {/* Toolbar */}
      {(busqueda || densidadToggle) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-800">
          {busqueda && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar en la tabla"
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto text-xs text-surface-500">
            <span>{rows.length} registros</span>
            {densidadToggle && (
              <button
                onClick={() => setCompact(!compact)}
                className="ml-2 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
                aria-label={compact ? 'Densidad comodo' : 'Densidad compacto'}
                title={compact ? 'Densidad comodo' : 'Densidad compacto'}
              >
                {compact ? <Rows3 className="w-4 h-4" /> : <Rows2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="overflow-auto"
        style={{ maxHeight: useVirtual ? '600px' : undefined }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-50 dark:bg-surface-800/80 backdrop-blur-sm border-b border-surface-200 dark:border-surface-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left font-semibold text-xs text-surface-600 dark:text-surface-400 uppercase tracking-wider px-4 py-2.5 whitespace-nowrap"
                    style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}
                  >
                    {h.isPlaceholder ? null : (
                      <button
                        onClick={h.column.getToggleSortingHandler()}
                        disabled={!h.column.getCanSort()}
                        className={`flex items-center gap-1.5 ${h.column.getCanSort() ? 'cursor-pointer hover:text-surface-900 dark:hover:text-white' : ''}`}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && (
                          h.column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3" /> :
                          h.column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3" /> :
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr style={{ height: paddingTop }}><td colSpan={columns.length} /></tr>}
            {filasMostradas.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  {emptyState ?? <span className="text-surface-500">Sin resultados</span>}
                </td>
              </tr>
            ) : (
              filasMostradas.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`border-b border-surface-100 dark:border-surface-800/50 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`px-4 whitespace-nowrap ${compact ? 'py-1.5' : 'py-2.5'}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {paddingBottom > 0 && <tr style={{ height: paddingBottom }}><td colSpan={columns.length} /></tr>}
          </tbody>
        </table>
      </div>

      {/* Paginacion */}
      {paginacion && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-surface-200 dark:border-surface-800 text-xs text-surface-600 dark:text-surface-400">
          <div>
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Pagina siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
