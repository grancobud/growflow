import { useState, useEffect, useMemo } from 'react'
import { Drawer } from 'vaul'
import {
  Package, Search, AlertCircle, X, Droplets, Leaf, ChevronRight, Clock, Loader2,
  RefreshCw, Download, Filter, Grid3x3, List, ArrowUpDown, Sprout, Scissors,
  Flower2, Wheat, Warehouse, Box, ChevronDown, ExternalLink,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { stockService } from '../lib/servicios'
import { ETIQUETAS_OPERACION, type TipoOperacion } from '../types'
import { FilterBar, type FilterChip } from '../components/ui/filter-bar'
import { DataTable } from '../components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

// ─── Paleta dark ────────────────────────────────────────────────────────────
const coloresEstado: Record<string, { pill: string; dot: string }> = {
  activo:     { pill: 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]',      dot: '#bef264' },
  cuarentena: { pill: 'bg-[#c4b5fd]/12 border-[#463a66] text-[#c4b5fd]',      dot: '#c4b5fd' },
  baja:       { pill: 'bg-[#ff6b5a]/12 border-[#5a2820] text-[#ff6b5a]',      dot: '#ff6b5a' },
  procesado:  { pill: 'bg-[#8f8f9f]/12 border-[#1f1f2b] text-[#8f8f9f]',      dot: '#8f8f9f' },
  consumido:  { pill: 'bg-[#5c5c6b]/12 border-[#1f1f2b] text-[#757584]',      dot: '#5c5c6b' },
}

const coloresSistema: Record<string, { pill: string; icon: string }> = {
  RDWC: { pill: 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]',  icon: '#bef264' },
  COCO: { pill: 'bg-[#c4b5fd]/12 border-[#463a66] text-[#c4b5fd]',  icon: '#a78bfa' },
}

const ICONOS_TIPO: Record<string, LucideIcon> = {
  planta_madre:      Sprout,
  esqueje:           Scissors,
  planta:            Flower2,
  flor:              Wheat,
  flor_trimmeada:    Scissors,
  flor_fraccionada:  Box,
  producto_final:    Warehouse,
  insumo:            Package,
}

const ETIQUETAS_TIPO: Record<string, string> = {
  planta_madre:      'Planta Madre',
  esqueje:           'Esqueje',
  planta:            'Planta',
  flor:              'Flor',
  flor_trimmeada:    'Flor Trimmeada',
  flor_fraccionada:  'Flor Fraccionada',
  producto_final:    'Producto Final',
  insumo:            'Insumo',
}

function unidadCorrecta(tipo?: string): string {
  if (!tipo) return 'unid.'
  if (['flor_trimmeada', 'flor_fraccionada', 'producto_final'].includes(tipo)) return 'g'
  return 'unid.'
}

type Vista = 'general' | 'por_camada' | 'final' | 'historico'
type Modo = 'tabla' | 'cards'
type OrdenCampo = 'fecha' | 'cantidad' | 'codigo' | 'camada'

// ─── Pill de estado dark ─────────────────────────────────────────────────────
function EstadoPill({ estado }: { estado: string }) {
  const cls = coloresEstado[estado]?.pill ?? 'bg-[#5c5c6b]/12 border-[#1f1f2b] text-[#757584]'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${cls}`}>
      {estado}
    </span>
  )
}

// ─── Sistema pill ────────────────────────────────────────────────────────────
function SistemaPill({ sistema }: { sistema?: string }) {
  if (!sistema) return <span className="text-[11px] text-[#5c5c6b]">—</span>
  const cls = coloresSistema[sistema] ?? { pill: 'bg-[#5c5c6b]/10 border-[#1f1f2b] text-[#8f8f9f]', icon: '#8f8f9f' }
  const Icon = sistema === 'RDWC' ? Droplets : Leaf
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${cls.pill}`}>
      <Icon className="w-3 h-3" style={{ color: cls.icon }} />
      {sistema}
    </span>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function PaginaStock() {
  const [stock, setStock] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionado, setSeleccionado] = useState<any | null>(null)
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [cargandoMov, setCargandoMov] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSinc, setUltimaSinc] = useState<Date | null>(null)

  // Vista y modo
  const [vista, setVista] = useState<Vista>('general')
  const [modo, setModo] = useState<Modo>('tabla')

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [filtroSistema, setFiltroSistema] = useState<string>('todos')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroTipos, setFiltroTipos] = useState<Set<string>>(new Set())
  const [filtroCamadas, setFiltroCamadas] = useState<Set<string>>(new Set())
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('')
  const [cantidadMin, setCantidadMin] = useState<string>('')
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('fecha')
  const [ordenAsc, setOrdenAsc] = useState(false)

  async function cargar(esSinc = false) {
    if (esSinc) setSincronizando(true)
    try {
      const data = await stockService.getLotes()
      setStock(data || [])
      setUltimaSinc(new Date())
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
      setSincronizando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!seleccionado) { setMovimientos([]); return }
    async function cargarMov() {
      setCargandoMov(true)
      try {
        const data = await stockService.getMovimientosLote(seleccionado.id)
        setMovimientos(data || [])
      } catch { setMovimientos([]) }
      finally { setCargandoMov(false) }
    }
    cargarMov()
  }, [seleccionado?.id])

  const camadasDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const s of stock) {
      const c = s.datos_extra?.camada
      if (c) set.add(String(c).startsWith('C') ? c : `C${c}`)
    }
    return Array.from(set).sort()
  }, [stock])

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const s of stock) {
      if (s.productos?.tipo_producto) set.add(s.productos.tipo_producto)
    }
    return Array.from(set).sort()
  }, [stock])

  const stockBase = useMemo(() => {
    if (vista === 'final') return stock.filter(s => ['flor_fraccionada', 'producto_final'].includes(s.productos?.tipo_producto))
    if (vista === 'historico') return stock.filter(s => ['procesado', 'consumido', 'baja'].includes(s.estado))
    if (vista === 'general') return stock.filter(s => ['activo', 'cuarentena'].includes(s.estado))
    return stock
  }, [stock, vista])

  const stockFiltrado = useMemo(() => {
    return stockBase.filter(item => {
      const q = busqueda.toLowerCase()
      const matchBusqueda = !q ||
        item.productos?.nombre?.toLowerCase().includes(q) ||
        item.codigo_lote?.toLowerCase().includes(q) ||
        item.instalaciones?.nombre?.toLowerCase().includes(q) ||
        String(item.datos_extra?.camada || '').toLowerCase().includes(q) ||
        item.datos_extra?.madre_origen?.toLowerCase().includes(q) ||
        item.datos_extra?.cod_traza_acumulado?.toLowerCase().includes(q)
      const matchSistema = filtroSistema === 'todos' || item.datos_extra?.sistema === filtroSistema
      const matchEstado = filtroEstado === 'todos' || item.estado === filtroEstado
      const matchTipo = filtroTipos.size === 0 || filtroTipos.has(item.productos?.tipo_producto)
      const cam = item.datos_extra?.camada ? (String(item.datos_extra.camada).startsWith('C') ? item.datos_extra.camada : `C${item.datos_extra.camada}`) : null
      const matchCamada = filtroCamadas.size === 0 || (cam && filtroCamadas.has(cam))
      const fecha = new Date(item.creado_en)
      const matchFechaDesde = !filtroFechaDesde || fecha >= new Date(filtroFechaDesde)
      const matchFechaHasta = !filtroFechaHasta || fecha <= new Date(filtroFechaHasta + 'T23:59:59')
      const matchCantidad = !cantidadMin || (item.cantidad >= parseFloat(cantidadMin))
      return matchBusqueda && matchSistema && matchEstado && matchTipo && matchCamada && matchFechaDesde && matchFechaHasta && matchCantidad
    }).sort((a, b) => {
      let cmp = 0
      if (ordenCampo === 'fecha') cmp = new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      else if (ordenCampo === 'cantidad') cmp = (b.cantidad || 0) - (a.cantidad || 0)
      else if (ordenCampo === 'codigo') cmp = (a.codigo_lote || '').localeCompare(b.codigo_lote || '')
      else if (ordenCampo === 'camada') cmp = (String(a.datos_extra?.camada || '')).localeCompare(String(b.datos_extra?.camada || ''))
      return ordenAsc ? -cmp : cmp
    })
  }, [stockBase, busqueda, filtroSistema, filtroEstado, filtroTipos, filtroCamadas, filtroFechaDesde, filtroFechaHasta, cantidadMin, ordenCampo, ordenAsc])

  const kpis = useMemo(() => {
    const activos = stock.filter(s => s.estado === 'activo').length
    const plantasEnCultivo = stock.filter(s => s.estado === 'activo' && ['planta', 'esqueje'].includes(s.productos?.tipo_producto))
      .reduce((a, s) => a + (parseFloat(s.cantidad) || 0), 0)
    const camadas = camadasDisponibles.length
    return { activos, plantasEnCultivo, camadas }
  }, [stock, camadasDisponibles])

  const porCamada = useMemo(() => {
    if (vista !== 'por_camada') return null
    const map = new Map<string, any[]>()
    for (const s of stockFiltrado) {
      const cam = s.datos_extra?.camada ? (String(s.datos_extra.camada).startsWith('C') ? s.datos_extra.camada : `C${s.datos_extra.camada}`) : '(sin camada)'
      if (!map.has(cam)) map.set(cam, [])
      map.get(cam)!.push(s)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [stockFiltrado, vista])

  const toggleSet = (set: Set<string>, valor: string, setter: (s: Set<string>) => void) => {
    const nuevo = new Set(set)
    if (nuevo.has(valor)) nuevo.delete(valor); else nuevo.add(valor)
    setter(nuevo)
  }

  const limpiarFiltros = () => {
    setBusqueda(''); setFiltroSistema('todos'); setFiltroEstado('todos')
    setFiltroTipos(new Set()); setFiltroCamadas(new Set())
    setFiltroFechaDesde(''); setFiltroFechaHasta(''); setCantidadMin('')
  }

  // Columnas DataTable (desktop)
  const columnas = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'producto',
      header: 'Producto',
      accessorFn: (row) => row.productos?.nombre || '-',
      cell: ({ row }) => {
        const item = row.original
        const Icon = ICONOS_TIPO[item.productos?.tipo_producto] || Package
        return (
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-[#5c5c6b] flex-shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-[12.5px] font-medium text-[#ececf1]">{item.productos?.nombre || '-'}</p>
              <p className="text-[10px] text-[#5c5c6b]">{ETIQUETAS_TIPO[item.productos?.tipo_producto] || item.productos?.tipo_producto}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'lote',
      header: 'Lote',
      accessorKey: 'codigo_lote',
      cell: ({ row }) => (
        <div>
          <p className="text-[12px] font-mono tabular-nums text-[#d4d4dd]">{row.original.codigo_lote}</p>
          {row.original.datos_extra?.camada && (
            <p className="text-[10px] text-[#5c5c6b]">Camada: {row.original.datos_extra.camada}</p>
          )}
        </div>
      ),
    },
    {
      id: 'sistema',
      header: 'Sistema',
      accessorFn: (row) => row.datos_extra?.sistema || '',
      cell: ({ row }) => <SistemaPill sistema={row.original.datos_extra?.sistema} />,
    },
    {
      id: 'ubicacion',
      header: 'Ubicación',
      accessorFn: (row) => row.instalaciones?.nombre || '-',
      cell: ({ getValue }) => <span className="text-[12px] text-[#8f8f9f]">{String(getValue())}</span>,
    },
    {
      id: 'cantidad',
      header: 'Cantidad',
      accessorFn: (row) => parseFloat(row.cantidad) || 0,
      cell: ({ row }) => (
        <span className="text-[12.5px] font-semibold text-[#ececf1] tabular-nums font-mono">
          {parseFloat(row.original.cantidad).toLocaleString('es-AR')}
          <span className="font-normal text-[#5c5c6b] ml-1 text-[10px]">{unidadCorrecta(row.original.productos?.tipo_producto)}</span>
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      accessorKey: 'estado',
      cell: ({ getValue }) => <EstadoPill estado={String(getValue())} />,
    },
    {
      id: 'acciones',
      header: '',
      enableSorting: false,
      cell: () => <ChevronRight className="w-4 h-4 text-[#46464f]" />,
    },
  ], [])

  // Chips filtros activos para FilterBar
  const chipsFiltros = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []
    if (busqueda) chips.push({ id: 'busq', label: 'Buscar', valor: busqueda, color: 'neutral', onRemove: () => setBusqueda('') })
    if (filtroSistema !== 'todos') chips.push({ id: 'sis', label: 'Sistema', valor: filtroSistema, color: filtroSistema === 'RDWC' ? 'info' : 'accent', onRemove: () => setFiltroSistema('todos') })
    if (filtroEstado !== 'todos') chips.push({ id: 'est', label: 'Estado', valor: filtroEstado, color: filtroEstado === 'activo' ? 'primary' : filtroEstado === 'cuarentena' ? 'warning' : 'neutral', onRemove: () => setFiltroEstado('todos') })
    filtroTipos.forEach(t => chips.push({ id: `tipo-${t}`, label: 'Tipo', valor: ETIQUETAS_TIPO[t] || t, color: 'neutral', onRemove: () => { const s = new Set(filtroTipos); s.delete(t); setFiltroTipos(s) } }))
    filtroCamadas.forEach(c => chips.push({ id: `cam-${c}`, label: 'Camada', valor: c, color: 'primary', onRemove: () => { const s = new Set(filtroCamadas); s.delete(c); setFiltroCamadas(s) } }))
    if (filtroFechaDesde) chips.push({ id: 'fd', label: 'Desde', valor: filtroFechaDesde, color: 'neutral', onRemove: () => setFiltroFechaDesde('') })
    if (filtroFechaHasta) chips.push({ id: 'fh', label: 'Hasta', valor: filtroFechaHasta, color: 'neutral', onRemove: () => setFiltroFechaHasta('') })
    if (cantidadMin) chips.push({ id: 'qmin', label: 'Cant. min', valor: cantidadMin, color: 'neutral', onRemove: () => setCantidadMin('') })
    return chips
  }, [busqueda, filtroSistema, filtroEstado, filtroTipos, filtroCamadas, filtroFechaDesde, filtroFechaHasta, cantidadMin])

  const filtrosActivos = (busqueda ? 1 : 0) + (filtroSistema !== 'todos' ? 1 : 0) + (filtroEstado !== 'todos' ? 1 : 0) +
    filtroTipos.size + filtroCamadas.size + (filtroFechaDesde ? 1 : 0) + (filtroFechaHasta ? 1 : 0) + (cantidadMin ? 1 : 0)

  const exportarCSV = () => {
    const headers = ['Codigo Lote', 'Producto', 'Tipo', 'Estado', 'Cantidad', 'Unidad', 'Sistema', 'Camada', 'Ubicacion', 'Creado']
    const rows = stockFiltrado.map(s => [
      s.codigo_lote || '',
      s.productos?.nombre || '',
      s.productos?.tipo_producto || '',
      s.estado || '',
      s.cantidad || 0,
      unidadCorrecta(s.productos?.tipo_producto),
      s.datos_extra?.sistema || '',
      s.datos_extra?.camada || '',
      s.instalaciones?.nombre || '',
      new Date(s.creado_en).toLocaleDateString('es-AR'),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">

        {/* ── TopBar ── */}
        <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
          <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
            <Package className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
            <div className="min-w-0">
              <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Inventario</h1>
              <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
                {cargando ? 'Cargando…' : `${stock.length} lotes · ${camadasDisponibles.length} camadas · ${kpis.activos} activos`}
              </div>
            </div>
            <div className="flex-1" />
            {ultimaSinc && (
              <span className="hidden sm:inline text-[10px] text-[#5c5c6b] tabular-nums">
                {ultimaSinc.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={() => cargar(true)} disabled={sincronizando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{sincronizando ? 'Sincronizando…' : 'Refrescar'}</span>
            </button>
            <button onClick={exportarCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1f1f2b] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[11.5px] font-medium text-[#d4d4dd]">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        <div className="px-3 sm:px-6 py-4 pb-20 space-y-3">

          {/* ── KPIs ── */}
          <div className="grid grid-cols-3 gap-2.5">
            <KpiDark icono={Sprout}  label="Plantas cultivo"  valor={kpis.plantasEnCultivo.toFixed(0)} tone="primary" />
            <KpiDark icono={Flower2} label="Camadas trazadas" valor={String(kpis.camadas)} tone="gold" />
            <KpiDark icono={Box}     label="Lotes activos"    valor={String(kpis.activos)} tone="primary" />
          </div>

          {/* ── Tabs de vista + modo ── */}
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-2.5 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-1">
              {([
                { v: 'general',    label: 'General',   icon: Box },
                { v: 'por_camada', label: 'Camadas',   icon: Flower2 },
                { v: 'final',      label: 'Final',     icon: Warehouse },
                { v: 'historico',  label: 'Histórico', icon: Clock },
              ] as { v: Vista; label: string; icon: LucideIcon }[]).map(t => {
                const Icon = t.icon
                const active = vista === t.v
                return (
                  <button key={t.v} onClick={() => setVista(t.v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors ${
                      active
                        ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d]'
                        : 'text-[#8f8f9f] hover:text-[#d4d4dd] hover:bg-[#15151d] border border-transparent'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
            {/* modo toggle solo en desktop */}
            <div className="hidden sm:flex items-center gap-1 bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-0.5">
              <button onClick={() => setModo('tabla')}
                className={`p-1.5 rounded-md transition-colors ${modo === 'tabla' ? 'bg-[#15151d] text-[#d9f99d]' : 'text-[#5c5c6b] hover:text-[#d4d4dd]'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setModo('cards')}
                className={`p-1.5 rounded-md transition-colors ${modo === 'cards' ? 'bg-[#15151d] text-[#d9f99d]' : 'text-[#5c5c6b] hover:text-[#d4d4dd]'}`}>
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Buscador + filtros ── */}
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="flex flex-wrap gap-2 p-3">
              {/* Buscador */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b]" />
                <input
                  type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar código, producto, camada, traza…"
                  className="w-full pl-9 pr-4 py-2 bg-[#0a0a0f] border border-[#1f1f2b] focus:border-[#404d20] rounded-lg text-[12px] text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none transition-colors"
                />
              </div>
              {/* Filtros toggle */}
              <button onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] font-medium border transition-colors ${
                  filtrosActivos > 0
                    ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]'
                    : 'bg-[#0a0a0f] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#404d20] hover:text-[#d4d4dd]'
                }`}>
                <Filter className="w-3.5 h-3.5" />
                Filtros{filtrosActivos > 0 && ` (${filtrosActivos})`}
                <ChevronDown className={`w-3 h-3 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
              </button>
              {filtrosActivos > 0 && (
                <button onClick={limpiarFiltros}
                  className="flex items-center gap-1 px-2 py-2 text-[11px] text-[#5c5c6b] hover:text-[#ff6b5a] transition-colors">
                  <X className="w-3.5 h-3.5" /> Limpiar
                </button>
              )}
              {/* Orden */}
              <div className="flex items-center gap-1 bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-1 ml-auto">
                <span className="text-[10px] text-[#5c5c6b] px-1.5">Orden</span>
                {([
                  { v: 'fecha', label: 'Fecha' },
                  { v: 'cantidad', label: 'Cant.' },
                  { v: 'codigo', label: 'Cod.' },
                  { v: 'camada', label: 'Cam.' },
                ] as { v: OrdenCampo; label: string }[]).map(o => (
                  <button key={o.v} onClick={() => { if (ordenCampo === o.v) setOrdenAsc(!ordenAsc); else setOrdenCampo(o.v) }}
                    className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-[10.5px] font-medium transition-colors ${
                      ordenCampo === o.v ? 'bg-[#15151d] text-[#d9f99d]' : 'text-[#5c5c6b] hover:text-[#d4d4dd]'
                    }`}>
                    {o.label}{ordenCampo === o.v && <ArrowUpDown className="w-2.5 h-2.5 ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* FilterBar chips */}
            {chipsFiltros.length > 0 && (
              <div className="border-t border-[#1f1f2b] py-2">
                <FilterBar chips={chipsFiltros} onClearAll={limpiarFiltros} />
              </div>
            )}

            {/* Panel filtros expandible */}
            {filtrosAbiertos && (
              <div className="border-t border-[#1f1f2b] p-4 bg-[#0a0a0f] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2">Sistema</p>
                    <div className="flex gap-1.5">
                      {['todos', 'RDWC', 'COCO'].map(s => (
                        <button key={s} onClick={() => setFiltroSistema(s)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                            filtroSistema === s
                              ? s === 'RDWC' ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]'
                              : s === 'COCO' ? 'bg-[#c4b5fd]/12 border-[#463a66] text-[#c4b5fd]'
                              : 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]'
                              : 'bg-[#15151d] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#404d20]'
                          }`}>
                          {s === 'todos' ? `Todos (${stock.length})` : `${s} (${stock.filter(x => x.datos_extra?.sistema === s).length})`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2">Estado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['todos', 'activo', 'cuarentena', 'procesado', 'baja', 'consumido'].map(e => (
                        <button key={e} onClick={() => setFiltroEstado(e)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                            filtroEstado === e
                              ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]'
                              : 'bg-[#15151d] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#404d20]'
                          }`}>
                          {e === 'todos' ? 'Todos' : e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2">Tipo de producto</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tiposDisponibles.map(t => {
                      const Icon = ICONOS_TIPO[t] || Package
                      const sel = filtroTipos.has(t)
                      return (
                        <button key={t} onClick={() => toggleSet(filtroTipos, t, setFiltroTipos)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
                            sel ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]' : 'bg-[#15151d] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#404d20]'
                          }`}>
                          <Icon className="w-3 h-3" />
                          {ETIQUETAS_TIPO[t] || t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2">Camada</p>
                  <div className="flex flex-wrap gap-1.5">
                    {camadasDisponibles.map(c => {
                      const sel = filtroCamadas.has(c)
                      return (
                        <button key={c} onClick={() => toggleSet(filtroCamadas, c, setFiltroCamadas)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                            sel ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]' : 'bg-[#15151d] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#404d20]'
                          }`}>
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Creado desde', val: filtroFechaDesde, set: setFiltroFechaDesde, type: 'date' },
                    { label: 'Creado hasta', val: filtroFechaHasta, set: setFiltroFechaHasta, type: 'date' },
                    { label: 'Cantidad mínima', val: cantidadMin, set: setCantidadMin, type: 'number' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-1.5">{f.label}</p>
                      <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                        placeholder={f.type === 'number' ? 'ej: 100' : ''}
                        className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] focus:border-[#404d20] rounded-lg text-[11.5px] text-[#d4d4dd] focus:outline-none transition-colors [color-scheme:dark]" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="p-4 bg-[#ff6b5a]/10 border border-[#5a2820] rounded-xl text-[12.5px] text-[#ff6b5a] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* ── Contenido principal ── */}
          {cargando ? (
            <div className="text-center py-14">
              <Loader2 className="w-8 h-8 text-[#a3e635] animate-spin mx-auto" />
              <p className="mt-3 text-[12px] text-[#5c5c6b]">Cargando stock…</p>
            </div>
          ) : stockFiltrado.length === 0 ? (
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-12 text-center">
              <Package className="w-10 h-10 text-[#404d20] mx-auto mb-3" />
              <p className="text-[#8f8f9f] text-[13px]">No hay lotes con esos filtros</p>
              {filtrosActivos > 0 && (
                <button onClick={limpiarFiltros} className="mt-3 text-[11.5px] text-[#d9f99d] hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : vista === 'por_camada' && porCamada ? (
            /* ── Vista agrupada por camada ── */
            <div className="space-y-3">
              {porCamada.map(([cam, lotes]) => {
                const totalCantidad = lotes.reduce((a, l) => a + (parseFloat(l.cantidad) || 0), 0)
                const sistemaCam = lotes.find((l: any) => l.datos_extra?.sistema)?.datos_extra?.sistema
                return (
                  <div key={cam} className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
                    {/* Header camada */}
                    <div className="px-4 py-3 bg-[#15151d] border-b border-[#1f1f2b] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display font-bold text-[14px] text-[#ececf1]">{cam}</span>
                        {sistemaCam && <SistemaPill sistema={sistemaCam} />}
                      </div>
                      <span className="text-[10.5px] text-[#5c5c6b]">
                        {lotes.length} lotes · {totalCantidad.toFixed(0)} total
                      </span>
                    </div>
                    {/* Mobile cards */}
                    <div className="divide-y divide-[#1f1f2b] block sm:hidden">
                      {lotes.map((item: any) => <CardMobile key={item.id} item={item} onClick={() => setSeleccionado(item)} />)}
                    </div>
                    {/* Desktop filas */}
                    <div className="divide-y divide-[#1f1f2b] hidden sm:block">
                      {lotes.map((item: any) => <FilaDark key={item.id} item={item} onClick={() => setSeleccionado(item)} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* ── Mobile: card list (< sm) ── */}
              <div className="block sm:hidden space-y-2">
                {stockFiltrado.map(item => (
                  <CardMobile key={item.id} item={item} onClick={() => setSeleccionado(item)} />
                ))}
              </div>

              {/* ── Desktop: DataTable o cards grid ── */}
              <div className="hidden sm:block">
                {modo === 'tabla' ? (
                  <>
                    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
                      <DataTable
                        data={stockFiltrado}
                        columns={columnas}
                        busqueda={false}
                        densidadToggle
                        paginacion={stockFiltrado.length > 50}
                        pageSize={50}
                        onRowClick={(item) => setSeleccionado(item)}
                        emptyState={
                          <div className="text-[#5c5c6b] py-6 text-center">
                            <Package className="w-7 h-7 mx-auto mb-2 text-[#404d20]" />
                            Sin lotes que coincidan con los filtros
                          </div>
                        }
                      />
                    </div>
                    {stockFiltrado.length > 0 && (
                      <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-[#5c5c6b]">
                        <span>{stockFiltrado.length} lotes</span>
                        <span className="font-semibold text-[#8f8f9f] tabular-nums font-mono">
                          Σ {stockFiltrado.reduce((a, s) => a + (parseFloat(s.cantidad) || 0), 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Modo cards desktop */
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {stockFiltrado.map(item => {
                      const Icon = ICONOS_TIPO[item.productos?.tipo_producto] || Package
                      const sistema = item.datos_extra?.sistema
                      return (
                        <button key={item.id} onClick={() => setSeleccionado(item)}
                          className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5 text-left hover:border-[#404d20] hover:-translate-y-0.5 transition-all duration-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-[#5c5c6b]" strokeWidth={1.75} />
                              <p className="text-[10.5px] font-medium text-[#8f8f9f]">{ETIQUETAS_TIPO[item.productos?.tipo_producto] || '-'}</p>
                            </div>
                            <EstadoPill estado={item.estado} />
                          </div>
                          <p className="text-[12.5px] font-mono tabular-nums text-[#d4d4dd] truncate">{item.codigo_lote}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[22px] font-bold font-mono tabular-nums text-[#ececf1] leading-none">
                              {parseFloat(item.cantidad).toLocaleString('es-AR')}
                              <span className="text-[10px] text-[#5c5c6b] ml-1 font-normal">{unidadCorrecta(item.productos?.tipo_producto)}</span>
                            </p>
                            {sistema && <SistemaPill sistema={sistema} />}
                          </div>
                          {item.datos_extra?.camada && (
                            <p className="text-[10px] text-[#5c5c6b] mt-2">
                              {item.datos_extra.camada} · {item.instalaciones?.nombre || ''}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Detalle Drawer (right panel desktop / bottom-sheet mobile) ── */}
      <Drawer.Root open={!!seleccionado} onOpenChange={(o) => !o && setSeleccionado(null)} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Drawer.Content
            className="fixed z-50 bg-[#101016] border-l border-[#1f1f2b] flex flex-col
                       right-0 top-0 bottom-0 w-full sm:max-w-xl
                       outline-none focus:outline-none"
          >
            <Drawer.Title className="sr-only">
              Detalle del lote {seleccionado?.codigo_lote || ''}
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Información completa, sistema de producción, datos adicionales e historial de movimientos.
            </Drawer.Description>

            {seleccionado && (
              <>
                {/* Drawer header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1f1f2b] sticky top-0 z-10 bg-[#101016]">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-[15px] text-[#ececf1] truncate">{seleccionado.productos?.nombre}</h3>
                    <p className="text-[11.5px] font-mono tabular-nums text-[#5c5c6b] truncate mt-0.5">{seleccionado.codigo_lote}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`/traza/${encodeURIComponent(seleccionado.codigo_lote)}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 text-[11.5px] font-medium text-[#d9f99d] transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      CoA
                    </a>
                    <button onClick={() => setSeleccionado(null)}
                      className="p-2 hover:bg-[#15151d] rounded-lg transition-colors">
                      <X className="w-5 h-5 text-[#5c5c6b]" />
                    </button>
                  </div>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Campos principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <InfoDark label="Tipo producto" valor={ETIQUETAS_TIPO[seleccionado.productos?.tipo_producto] || seleccionado.productos?.tipo_producto} />
                    <InfoDark label="Cantidad" valor={`${seleccionado.cantidad} ${unidadCorrecta(seleccionado.productos?.tipo_producto)}`} />
                    <InfoDark label="Estado" valor={seleccionado.estado} />
                    <InfoDark label="Ubicación" valor={seleccionado.instalaciones?.nombre} />
                    <InfoDark label="Seguimiento" valor={seleccionado.modo_seguimiento} />
                    <InfoDark label="Creado" valor={new Date(seleccionado.creado_en).toLocaleDateString('es-AR')} />
                  </div>

                  {seleccionado.datos_extra?.sistema && (
                    <div className="p-3 rounded-xl bg-[#15151d] border border-[#1f1f2b]">
                      <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2.5">Sistema de producción</p>
                      <SistemaPill sistema={seleccionado.datos_extra.sistema} />
                    </div>
                  )}

                  {seleccionado.datos_extra && Object.keys(seleccionado.datos_extra).length > 0 && (
                    <div className="p-3 rounded-xl bg-[#15151d] border border-[#1f1f2b]">
                      <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em] mb-2.5">Datos adicionales</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {Object.entries(seleccionado.datos_extra).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-[10px] text-[#5c5c6b]">{key.replace(/_/g, ' ')}</p>
                            <p className="text-[12px] font-medium text-[#d4d4dd] break-words">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historial movimientos */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3.5 h-3.5 text-[#5c5c6b]" />
                      <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.12em]">Historial de movimientos</p>
                    </div>
                    {cargandoMov ? (
                      <div className="flex items-center gap-2 text-[12px] text-[#5c5c6b] py-6 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[#a3e635]" /> Cargando…
                      </div>
                    ) : movimientos.length === 0 ? (
                      <div className="text-center py-6 rounded-xl bg-[#15151d] border border-[#1f1f2b]">
                        <p className="text-[12px] text-[#5c5c6b]">Sin operaciones registradas</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {movimientos.map((mov, i) => {
                          const isLast = i === movimientos.length - 1
                          return (
                            <div key={mov.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-7 h-7 rounded-full bg-[#1c1c27] border border-[#404d20] flex items-center justify-center flex-shrink-0 z-10">
                                  <Package className="w-3.5 h-3.5 text-[#bef264]" />
                                </div>
                                {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-[#1f1f2b]" />}
                              </div>
                              <div className="flex-1 pb-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[12px] font-medium text-[#ececf1]">{ETIQUETAS_OPERACION[mov.tipo_operacion as TipoOperacion] || mov.tipo_operacion}</p>
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    mov.estado === 'confirmada' ? 'bg-[#a3e635]/12 border-[#404d20] text-[#d9f99d]' :
                                    mov.estado === 'borrador'   ? 'bg-[#c4b5fd]/12 border-[#463a66] text-[#c4b5fd]'
                                                                : 'bg-[#ff6b5a]/12 border-[#5a2820] text-[#ff6b5a]'
                                  }`}>{mov.estado}</span>
                                </div>
                                <div className="flex flex-wrap gap-x-3 text-[10.5px] text-[#5c5c6b] mt-0.5 font-mono tabular-nums">
                                  <span>{new Date(mov.fecha_operacion).toLocaleDateString('es-AR')}</span>
                                  {mov.cantidad_entrada && <span>Cant: {mov.cantidad_entrada}</span>}
                                  {mov.peso_fresco_kg && <span>Peso: {mov.peso_fresco_kg}kg</span>}
                                  {mov.responsable && <span className="font-sans">{mov.responsable}</span>}
                                </div>
                                {mov.observaciones && <p className="text-[10.5px] text-[#757584] mt-0.5 truncate">{mov.observaciones}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiDark({ icono: Icon, label, valor, tone }: { icono: LucideIcon; label: string; valor: string; tone: 'primary' | 'gold' }) {
  const t = tone === 'primary'
    ? { bg: 'rgba(63,176,116,0.10)', border: '#404d20', text: '#d9f99d' }
    : { bg: 'rgba(196,154,44,0.10)', border: '#463a66', text: '#c4b5fd' }
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5 hover:border-[#404d20] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium leading-tight">{label}</p>
          <p className="font-display font-bold text-[22px] sm:text-[26px] text-[#ececf1] mt-1 leading-none tabular-nums">{valor}</p>
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
          style={{ background: t.bg, borderColor: t.border, color: t.text }}>
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

/** Fila compacta para vista por_camada en desktop */
function FilaDark({ item, onClick }: { item: any; onClick: () => void }) {
  const Icon = ICONOS_TIPO[item.productos?.tipo_producto] || Package
  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#15151d] cursor-pointer transition-colors">
      <Icon className="w-4 h-4 text-[#5c5c6b] flex-shrink-0" strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-mono tabular-nums text-[#d4d4dd] truncate">{item.codigo_lote}</p>
        <p className="text-[10px] text-[#5c5c6b]">{ETIQUETAS_TIPO[item.productos?.tipo_producto]} · {item.instalaciones?.nombre || 'sin ubicación'}</p>
      </div>
      <span className="text-[12.5px] font-semibold font-mono tabular-nums text-[#ececf1]">
        {parseFloat(item.cantidad).toLocaleString('es-AR')}
        <span className="text-[10px] text-[#5c5c6b] ml-1 font-normal">{unidadCorrecta(item.productos?.tipo_producto)}</span>
      </span>
      <EstadoPill estado={item.estado} />
      <ChevronRight className="w-4 h-4 text-[#46464f]" />
    </div>
  )
}

/** Card mobile: tap completa, código + estado + producto + cantidad + instalación + fecha */
function CardMobile({ item, onClick }: { item: any; onClick: () => void }) {
  const Icon = ICONOS_TIPO[item.productos?.tipo_producto] || Package
  const sistema = item.datos_extra?.sistema
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5 hover:border-[#404d20] transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono tabular-nums text-[12.5px] text-[#d4d4dd] font-medium truncate">{item.codigo_lote}</span>
        <EstadoPill estado={item.estado} />
      </div>
      {/* Producto */}
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-3.5 h-3.5 text-[#5c5c6b] flex-shrink-0" strokeWidth={1.75} />
        <span className="text-[11.5px] text-[#8f8f9f]">{item.productos?.nombre || ETIQUETAS_TIPO[item.productos?.tipo_producto] || '-'}</span>
        {sistema && <SistemaPill sistema={sistema} />}
      </div>
      {/* Cantidad grande */}
      <div className="flex items-end justify-between gap-2">
        <span className="font-display font-bold text-[26px] text-[#ececf1] leading-none tabular-nums font-mono">
          {parseFloat(item.cantidad).toLocaleString('es-AR')}
          <span className="text-[11px] text-[#5c5c6b] ml-1 font-normal">{unidadCorrecta(item.productos?.tipo_producto)}</span>
        </span>
        <div className="text-right text-[10px] text-[#5c5c6b] leading-tight">
          <div>{item.instalaciones?.nombre || 'sin ubicación'}</div>
          {item.datos_extra?.camada && <div>Cam. {item.datos_extra.camada}</div>}
        </div>
      </div>
    </button>
  )
}

function InfoDark({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-[10px] text-[#5c5c6b] uppercase tracking-[0.10em]">{label}</p>
      <p className="text-[12.5px] font-medium text-[#d4d4dd] mt-0.5">{valor || '—'}</p>
    </div>
  )
}
