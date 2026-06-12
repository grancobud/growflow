import { Bell, Shield, Moon, Sun, Search, PanelLeft, ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../../hooks/useDarkMode'
import EstadoConexion from './EstadoConexion'

interface HeaderProps {
  titulo: string
  subtitulo?: string
}

// Mapeo de rutas a labels humanos para breadcrumbs
const RUTA_LABELS: Record<string, string> = {
  '': 'Panel',
  'dashboard': 'Dashboard BI',
  'operacion': 'Nueva Operacion',
  'escaner': 'Escanear QR',
  'stock': 'Stock',
  'calendario': 'Calendario',
  'cultivo': 'Calculadora Cultivo',
  'trazabilidad': 'Trazabilidad',
  'arbol': 'Arbol Visual',
  'mapa': 'Mapa',
  'inversa': 'Busqueda Inversa',
  'etiquetas': 'Etiquetas QR',
  'alertas': 'Alertas',
  'metricas': 'Metricas',
  'checklist-cumcs': 'Checklist CUMCS',
  'auto-auditoria': 'Auto-Auditoria',
  'registros': 'Registros CUMCS',
  'forms-cumcs': 'Forms G08+G10',
  'gamp5': 'GAMP5',
  'reprocann': 'REPROCANN',
  'sops': 'SOPs',
  'procesos': 'Procesos BPMN',
  'configuracion': 'Configuracion',
  'importador': 'Importador',
  'audit-trail': 'Audit Trail',
}

function Breadcrumbs() {
  const { pathname } = useLocation()
  const partes = pathname.split('/').filter(Boolean)
  if (partes.length === 0) return null

  return (
    <nav aria-label="Migas de pan" className="hidden sm:flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
      <Link to="/" className="flex items-center gap-1 hover:text-primary-700 dark:hover:text-primary-400">
        <Home className="w-3 h-3" />
        <span>Inicio</span>
      </Link>
      {partes.map((parte, i) => {
        const to = '/' + partes.slice(0, i + 1).join('/')
        const label = RUTA_LABELS[parte] || parte
        const last = i === partes.length - 1
        return (
          <div key={to} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-surface-400" />
            {last ? (
              <span className="text-surface-700 dark:text-surface-200 font-medium">{label}</span>
            ) : (
              <Link to={to} className="hover:text-primary-700 dark:hover:text-primary-400">{label}</Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default function Header({ titulo, subtitulo }: HeaderProps) {
  const { dark, toggle } = useDarkMode()

  return (
    <header className="bg-white border-b border-surface-200 px-4 sm:px-6 h-16 sticky top-0 z-30 flex items-center">
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => (window as any).__toggleSidebar?.()}
            className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors flex-shrink-0"
            title="Colapsar/expandir panel"
            aria-label="Colapsar o expandir panel lateral">
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-surface-900 dark:text-white leading-tight truncate">{titulo}</h2>
            {subtitulo && (
              <p className="text-[11px] sm:text-xs md:text-sm text-surface-500 mt-0.5 leading-snug truncate">{subtitulo}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-200 rounded-lg text-xs text-surface-500 transition-colors"
            title="Buscador global (Ctrl+K)">
            <Search className="w-3.5 h-3.5" />
            <span>Buscar...</span>
            <kbd className="ml-2 px-1.5 py-0.5 bg-white border border-surface-200 rounded text-[10px] font-mono">⌘K</kbd>
          </button>
          <EstadoConexion />
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            GAMP5
          </div>
          <button onClick={toggle} className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg" title={dark ? 'Modo claro' : 'Modo oscuro'}>
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="relative p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
