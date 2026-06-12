import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Search, Package, Activity, ClipboardList, X, MessageSquareText, ScanLine,
  ShieldCheck, AlertTriangle, LayoutDashboard, BarChart3, GitBranch, Map as MapIcon,
  QrCode, Calendar, CheckSquare, FileText, Settings, Clock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// Recientes en localStorage
const KEY_RECENT = 'canntrace_cmdk_recent'
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_RECENT) || '[]') } catch { return [] }
}
function saveRecent(path: string) {
  const r = loadRecent().filter(p => p !== path)
  r.unshift(path)
  try { localStorage.setItem(KEY_RECENT, JSON.stringify(r.slice(0, 5))) } catch {}
}

// Acciones rapidas (navegacion)
const ACCIONES = [
  { id: 'new-op', label: 'Crear nueva operacion', desc: 'Chat conversacional', path: '/operacion', icono: MessageSquareText, shortcut: '1' },
  { id: 'scan', label: 'Escanear QR', desc: 'Buscar por codigo', path: '/escaner', icono: ScanLine, shortcut: '2' },
  { id: 'stock', label: 'Ver stock', desc: 'Inventario con filtros', path: '/stock', icono: Package, shortcut: '3' },
  { id: 'traz', label: 'Cadenas Sale-to-Seed', desc: 'Trazabilidad inversa', path: '/trazabilidad', icono: ShieldCheck, shortcut: '4' },
  { id: 'arbol', label: 'Arbol genealogico', desc: 'React Flow por camada', path: '/arbol', icono: GitBranch },
  { id: 'mapa', label: 'Mapa instalaciones', desc: 'Indoor SVG', path: '/mapa', icono: MapIcon },
  { id: 'etiq', label: 'Etiquetas QR', desc: 'Imprimir QRs', path: '/etiquetas', icono: QrCode },
  { id: 'alertas', label: 'Ver alertas', desc: 'Eventos adversos y NC', path: '/alertas', icono: AlertTriangle },
  { id: 'calendario', label: 'Abrir calendario', desc: 'Tareas culturales', path: '/calendario', icono: Calendar },
  { id: 'checklist', label: 'Checklist CUMCS', desc: 'Cumplimiento', path: '/checklist-cumcs', icono: CheckSquare },
  { id: 'gamp5', label: 'Documentacion GAMP5', desc: 'Validacion Cat 5', path: '/gamp5', icono: FileText },
  { id: 'config', label: 'Configuracion + 2FA', desc: 'Admin y seguridad', path: '/configuracion', icono: Settings },
]

// Navegacion principal (rutas del sidebar)
const NAV = [
  { id: 'nav-panel', label: 'Panel de Control', path: '/', icono: LayoutDashboard },
  { id: 'nav-dashboard', label: 'Dashboard BI', path: '/dashboard', icono: BarChart3 },
  { id: 'nav-metricas', label: 'Metricas avanzadas', path: '/metricas', icono: BarChart3 },
  { id: 'nav-inversa', label: 'Busqueda Inversa', path: '/inversa', icono: Search },
  { id: 'nav-registros', label: 'Registros CUMCS', path: '/registros', icono: ClipboardList },
  { id: 'nav-sops', label: 'SOPs Versionados', path: '/sops', icono: FileText },
  { id: 'nav-coa', label: 'CoA Parser (laboratorio)', path: '/coa-parser', icono: FileText },
  { id: 'nav-reprocann', label: 'REPROCANN Report', path: '/reprocann', icono: FileText },
  { id: 'nav-auto', label: 'Auto-Auditoria', path: '/auto-auditoria', icono: Activity },
  { id: 'nav-forms', label: 'Forms G08+G10', path: '/forms-cumcs', icono: FileText },
  { id: 'nav-cultivo', label: 'Calculadora VPD/DLI', path: '/cultivo', icono: Activity },
  { id: 'nav-procesos', label: 'Procesos BPMN', path: '/procesos', icono: Activity },
  { id: 'nav-historial', label: 'Historial operaciones', path: '/historial', icono: Activity },
]

// Alertas rapidas: ir a /alertas con focus en tipo especifico
const ALERTAS_TIPO = [
  { id: 'alerta-criticas', label: 'Alertas criticas', desc: 'Eventos adversos + NC', path: '/alertas?tipo=criticas' },
  { id: 'alerta-cuarentena', label: 'Cuarentenas vencidas', desc: 'Lotes >14d sin liberar', path: '/alertas?tipo=cuarentena' },
  { id: 'alerta-lab', label: 'Flor sin analisis', desc: 'Flor lista sin CoA', path: '/alertas?tipo=lab' },
  { id: 'alerta-vence', label: 'Proximos vencimientos', desc: 'Lotes cerca de vencer', path: '/alertas?tipo=vence' },
]

export default function BuscadorGlobal() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<any>({ lotes: [], operaciones: [], registros_cumcs: [] })
  const [buscando, setBuscando] = useState(false)
  const [recientes, setRecientes] = useState<string[]>([])
  const nav = useNavigate()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        if (!open) setRecientes(loadRecent())
      }
      if (e.key === 'Escape') setOpen(false)
      // Atajos numericos cuando el buscador esta abierto y vacio
      if (open && !q && /^[1-4]$/.test(e.key)) {
        const accion = ACCIONES.find(a => a.shortcut === e.key)
        if (accion) { e.preventDefault(); ir(accion.path) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, q])

  useEffect(() => {
    if (!q || q.length < 2) { setRes({ lotes: [], operaciones: [], registros_cumcs: [] }); return }
    const id = setTimeout(async () => {
      setBuscando(true)
      const { data } = await supabase.rpc('buscar_global', { p_q: q })
      setRes(data || { lotes: [], operaciones: [], registros_cumcs: [] })
      setBuscando(false)
    }, 200)
    return () => clearTimeout(id)
  }, [q])

  function ir(path: string) {
    saveRecent(path)
    setOpen(false)
    setQ('')
    nav(path)
  }

  if (!open) return null

  const todosItems = [...ACCIONES, ...NAV]
  const findByPath = (p: string) => todosItems.find(i => i.path === p)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Buscador global"
    >
      <Command
        className="w-full max-w-xl mx-4 bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={!q}
        label="Buscador global"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700">
          <Search className="w-4 h-4 text-surface-400" />
          <Command.Input
            value={q}
            onValueChange={setQ}
            placeholder="Buscar lotes, o escribir un comando..."
            autoFocus
            className="flex-1 bg-transparent text-surface-100 outline-none placeholder-surface-500 text-sm"
          />
          <span className="text-[10px] text-surface-500 border border-surface-700 px-1.5 py-0.5 rounded">ESC</span>
          <button onClick={() => setOpen(false)} aria-label="Cerrar buscador">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto">
          {/* Recientes (solo cuando no hay query) */}
          {!q && recientes.length > 0 && (
            <Command.Group className="px-2 py-2">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recientes
              </div>
              {recientes.map((p) => {
                const it = findByPath(p)
                if (!it) return null
                return (
                  <Command.Item
                    key={`rec-${p}`}
                    value={`reciente ${it.label}`}
                    onSelect={() => ir(p)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                  >
                    <it.icono className="w-4 h-4 text-surface-400" />
                    <span>{it.label}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          )}

          {/* Acciones rapidas */}
          {!q && (
            <Command.Group className="px-2 py-2">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1">Acciones</div>
              {ACCIONES.map((a) => (
                <Command.Item
                  key={a.id}
                  value={`accion ${a.label}`}
                  onSelect={() => ir(a.path)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <a.icono className="w-4 h-4 text-primary-400" />
                  <span>{a.label}</span>
                  <span className="text-[10px] text-surface-500 truncate ml-auto">{a.desc}</span>
                  {a.shortcut && (
                    <kbd className="text-[10px] text-surface-500 border border-surface-700 px-1.5 py-0.5 rounded ml-2">{a.shortcut}</kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Alertas rapidas */}
          {!q && (
            <Command.Group className="px-2 py-2 border-t border-surface-800">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Alertas por tipo
              </div>
              {ALERTAS_TIPO.map((a) => (
                <Command.Item
                  key={a.id}
                  value={`alerta ${a.label} ${a.desc}`}
                  onSelect={() => ir(a.path)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{a.label}</span>
                  <span className="text-[10px] text-surface-500 truncate ml-auto">{a.desc}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Navegacion */}
          {!q && (
            <Command.Group className="px-2 py-2 border-t border-surface-800">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1">Navegacion</div>
              {NAV.map((n) => (
                <Command.Item
                  key={n.id}
                  value={`nav ${n.label}`}
                  onSelect={() => ir(n.path)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <n.icono className="w-4 h-4 text-surface-400" />
                  <span>{n.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Resultados busqueda */}
          {q && buscando && (
            <div className="py-6 text-center text-sm text-surface-500">Buscando...</div>
          )}
          {q && !buscando && res.lotes?.length === 0 && res.operaciones?.length === 0 && res.registros_cumcs?.length === 0 && (
            <Command.Empty className="py-8 text-center text-surface-500 text-sm">Sin resultados para "{q}"</Command.Empty>
          )}

          {res.lotes?.length > 0 && (
            <Command.Group className="px-2 py-2">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1">Lotes ({res.lotes.length})</div>
              {res.lotes.map((l: any) => (
                <Command.Item
                  key={l.id}
                  onSelect={() => ir(`/audit-trail/${l.id}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono">{l.codigo_lote}</span>
                  <span className="text-xs text-surface-500 ml-auto">{l.camada} · {l.tipo}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {res.operaciones?.length > 0 && (
            <Command.Group className="px-2 py-2">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1">Operaciones ({res.operaciones.length})</div>
              {res.operaciones.map((o: any) => (
                <Command.Item
                  key={o.id}
                  onSelect={() => ir(`/historial`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>{o.tipo_operacion}</span>
                  <span className="text-xs text-surface-500 ml-auto">{new Date(o.fecha_operacion).toLocaleDateString('es-AR')}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {res.registros_cumcs?.length > 0 && (
            <Command.Group className="px-2 py-2">
              <div className="text-[10px] uppercase text-surface-500 px-2 mb-1">Registros CUMCS ({res.registros_cumcs.length})</div>
              {res.registros_cumcs.map((r: any) => (
                <Command.Item
                  key={r.codigo}
                  onSelect={() => ir(`/registros`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-200 cursor-pointer data-[selected=true]:bg-primary-600/20"
                >
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  <span className="font-mono">{r.codigo}</span>
                  <span className="text-xs text-surface-400 truncate flex-1">{r.nombre}</span>
                  <span className="text-[10px] text-surface-500">G{r.grupo}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div className="px-4 py-2 border-t border-surface-800 flex items-center gap-3 text-[10px] text-surface-500">
          <span>⌘K / Ctrl+K</span><span>↑↓ navegar</span><span>⏎ abrir</span><span>1-4 atajos rapidos</span>
        </div>
      </Command>
    </div>
  )
}
