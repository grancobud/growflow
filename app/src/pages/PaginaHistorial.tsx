import { useState, useEffect } from 'react'
import { History, Download, Search, ChevronDown, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { ETIQUETAS_OPERACION, ICONOS_OPERACION, type TipoOperacion } from '../types'
import { operacionesService } from '../lib/servicios'

const iconoEstado: Record<string, { icono: typeof CheckCircle2; color: string; bg: string; border: string; label: string }> = {
  confirmada: { icono: CheckCircle2, color: '#bef264', bg: 'rgba(63,176,116,0.10)', border: '#404d20', label: 'Confirmada' },
  borrador:   { icono: Clock,         color: '#c4b5fd', bg: 'rgba(196,154,44,0.10)',  border: '#463a66', label: 'Borrador' },
  anulada:    { icono: XCircle,        color: '#ff8a7a', bg: 'rgba(122,40,32,0.15)',   border: '#7a2820', label: 'Anulada' },
}

export default function PaginaHistorial() {
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  async function cargarOperaciones() {
    setCargando(true); setError('')
    try {
      const data = await operacionesService.getOperaciones(100)
      setOperaciones(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarOperaciones() }, [])

  const operacionesFiltradas = operaciones.filter(op => {
    const matchBusqueda =
      op.lote_origen?.codigo_lote?.toLowerCase().includes(busqueda.toLowerCase()) ||
      op.lote_destino?.codigo_lote?.toLowerCase().includes(busqueda.toLowerCase()) ||
      op.responsable?.toLowerCase().includes(busqueda.toLowerCase()) ||
      op.observaciones?.toLowerCase().includes(busqueda.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || op.tipo_operacion === filtroTipo
    return matchBusqueda && matchTipo
  })

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <History className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Historial de Operaciones</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              <span className="tabular-nums">{operaciones.length}</span> operaciones
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>audit trail SHA-256</span>
            </div>
          </div>
          <div className="flex-1" />
          <button
            onClick={cargarOperaciones}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50"
            disabled={cargando}
          >
            <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{cargando ? 'Cargando…' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {/* Buscador */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b]" strokeWidth={1.8} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar lote, responsable…"
              className="w-full pl-9 pr-4 py-2 bg-[#101016] border border-[#1f1f2b] hover:border-[#2a2a3a] focus:border-[#404d20] rounded-lg text-[12px] text-[#d4d4dd] placeholder-[#5c5c6b] outline-none transition-colors"
            />
          </div>

          {/* Selector tipo */}
          <div className="relative">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-[#101016] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] outline-none cursor-pointer transition-colors"
            >
              <option value="todos">Todas</option>
              {Object.entries(ETIQUETAS_OPERACION).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b] pointer-events-none" />
          </div>

          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#a3e635]/15 border border-[#404d20] hover:bg-[#a3e635]/25 rounded-lg text-[12px] font-medium text-[#d9f99d] transition-colors">
            <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#7a2820]/20 border border-[#7a2820]/40 rounded-xl text-[12px] text-[#ff8a7a]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            {error}
          </div>
        )}

        {/* Loading */}
        {cargando ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#101016] border border-[#1f1f2b] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : operacionesFiltradas.length === 0 ? (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-10 text-center">
            <div className="mx-auto w-9 h-9 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-2">
              <History className="w-4 h-4 text-[#5c5c6b]" strokeWidth={1.8} />
            </div>
            <p className="font-display font-semibold text-[#d4d4dd] text-[13px]">
              {operaciones.length === 0 ? 'Sin operaciones aun' : 'Sin resultados'}
            </p>
            <p className="mt-1 text-[11px] text-[#5c5c6b] max-w-xs mx-auto">
              {operaciones.length === 0
                ? 'Usa "Nueva Operacion" en el sidebar para registrar la primera'
                : 'Intenta cambiar los filtros de busqueda'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: tabla */}
            <div className="hidden sm:block rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#1f1f2b]">
                    {['Operacion','Lote','Cantidad','Estado','Fecha','Operador'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operacionesFiltradas.map((op) => {
                    const est = iconoEstado[op.estado] || iconoEstado.borrador
                    const EstIcon = est.icono
                    const lote = op.lote_origen?.codigo_lote || op.lote_destino?.codigo_lote || '-'
                    const cantidad = op.cantidad_entrada || op.cantidad_salida || '-'
                    return (
                      <tr key={op.id} className="border-b border-[#1f1f2b] last:border-0 hover:bg-[#15151d] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] leading-none" aria-hidden="true">
                              {ICONOS_OPERACION[op.tipo_operacion as TipoOperacion] || '?'}
                            </span>
                            <span className="font-medium text-[#ececf1]">
                              {ETIQUETAS_OPERACION[op.tipo_operacion as TipoOperacion] || op.tipo_operacion}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#a6a6b5] tabular-nums">{lote}</td>
                        <td className="px-4 py-3 text-[#a6a6b5] tabular-nums">{cantidad}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{ color: est.color, background: est.bg, borderColor: est.border }}>
                            <EstIcon className="w-2.5 h-2.5" />
                            {est.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#8f8f9f] font-mono tabular-nums">
                          {new Date(op.fecha_operacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          {' '}
                          <span className="text-[#5c5c6b]">
                            {new Date(op.fecha_operacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#8f8f9f] truncate max-w-[120px]">
                          {op.perfiles_creador?.nombre_completo || 'Sistema'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {operacionesFiltradas.map((op) => {
                const est = iconoEstado[op.estado] || iconoEstado.borrador
                const EstIcon = est.icono
                const lote = op.lote_origen?.codigo_lote || op.lote_destino?.codigo_lote || '-'
                const cantidad = op.cantidad_entrada || op.cantidad_salida || '-'
                return (
                  <div key={op.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[20px] leading-none mt-0.5" aria-hidden="true">
                        {ICONOS_OPERACION[op.tipo_operacion as TipoOperacion] || '?'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <p className="text-[12px] font-medium text-[#ececf1] truncate">
                            {ETIQUETAS_OPERACION[op.tipo_operacion as TipoOperacion] || op.tipo_operacion}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0"
                            style={{ color: est.color, background: est.bg, borderColor: est.border }}>
                            <EstIcon className="w-2.5 h-2.5" />
                            {est.label}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[#757584] font-mono tabular-nums mt-0.5">
                          {lote} · {cantidad}
                        </p>
                        {op.observaciones && (
                          <p className="text-[10.5px] text-[#5c5c6b] mt-0.5 truncate">{op.observaciones}</p>
                        )}
                        <p className="text-[10px] text-[#5c5c6b] mt-1 font-mono tabular-nums">
                          {new Date(op.fecha_operacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {op.perfiles_creador?.nombre_completo ? ` · ${op.perfiles_creador.nombre_completo}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] px-4 py-2.5 text-[10px] text-[#5c5c6b] text-center">
          Audit trail inmutable SHA-256 encadenado en todas las operaciones (RR-010, RR-011, RR-012)
        </div>
      </div>
    </div>
  )
}
