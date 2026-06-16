// Sidebar — version personal simplificada.
// Solo las secciones adaptadas al esquema del cultivo personal.

import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Leaf, LogOut, Sprout, MessageSquareText, GitBranch, Table2, Droplets, BarChart3, KeyRound, IdCard, Dna, ClipboardCheck, Boxes, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { tienePin, quitarPin } from '../../lib/pin'
import PinLock from '../PinLock'

type Item = { nombre: string; ruta: string; icono: any }

export default function Sidebar({ colapsado: colapsadoProp }: { colapsado?: boolean } = {}) {
  const { usuario, logout } = useAuth()
  const location = useLocation()
  const [ancho, setAncho] = useState<number>(0)
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [configPin, setConfigPin] = useState(false)
  const [hayPin, setHayPin] = useState(tienePin())

  useEffect(() => {
    if (!ref) return
    const obs = new ResizeObserver(entries => { for (const e of entries) setAncho(e.contentRect.width) })
    obs.observe(ref)
    return () => obs.disconnect()
  }, [ref])

  const colapsado = colapsadoProp ?? (ancho > 0 && ancho < 140)

  const inicial = usuario?.nombre_completo?.charAt(0)?.toUpperCase() || '?'
  const nombre = usuario?.nombre_completo || 'Cargando...'

  const items: Item[] = [
    { nombre: 'Panel', ruta: '/', icono: LayoutDashboard },
    { nombre: 'Plantas', ruta: '/plantas', icono: Sprout },
    { nombre: 'Genéticas', ruta: '/geneticas', icono: Dna },
    { nombre: 'Sala', ruta: '/sala', icono: Droplets },
    { nombre: 'Calendario', ruta: '/calendario', icono: CalendarDays },
    { nombre: 'Stock', ruta: '/stock', icono: Boxes },
    { nombre: 'Registro', ruta: '/registro', icono: IdCard },
    { nombre: 'Asistencia', ruta: '/asistencia', icono: ClipboardCheck },
    { nombre: 'Chat IA', ruta: '/chat', icono: MessageSquareText },
    { nombre: 'Estadísticas', ruta: '/stats', icono: BarChart3 },
    { nombre: 'Grafo', ruta: '/grafo', icono: GitBranch },
    { nombre: 'Tablas', ruta: '/tablas', icono: Table2 },
  ]

  const togglePin = () => {
    if (hayPin) {
      quitarPin(); setHayPin(false); toast.success('PIN desactivado')
    } else {
      setConfigPin(true)
    }
  }

  const renderItem = (item: Item) => {
    const isActive = location.pathname === item.ruta || (item.ruta !== '/' && location.pathname.startsWith(item.ruta))
    return (
      <NavLink
        key={item.ruta}
        to={item.ruta}
        title={colapsado ? item.nombre : undefined}
        className={`relative flex items-center ${
          colapsado ? 'flex-col justify-center py-2.5 px-1' : 'gap-2.5 px-3 py-2'
        } rounded-lg text-[12.5px] transition-all duration-200 ${
          isActive
            ? 'bg-[#a3e635]/12 border border-[#404d20] text-[#d9f99d] font-medium'
            : 'border border-transparent text-[#a6a6b5] hover:bg-[#15151d] hover:text-[#ececf1]'
        }`}
      >
        <item.icono className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2 : 1.7} />
        {colapsado ? (
          <span className="text-[9px] mt-1 leading-tight text-center truncate max-w-full">{item.nombre}</span>
        ) : (
          <span className="flex-1 truncate font-sans">{item.nombre}</span>
        )}
      </NavLink>
    )
  }

  return (
    <aside
      ref={setRef}
      className="h-full w-full bg-[#0a0a0f] text-[#d4d4dd] flex flex-col overflow-hidden font-sans"
    >
      {/* Logo */}
      <div className="px-3 sm:px-4 pt-4 pb-3.5 border-b border-[#1f1f2b] flex-shrink-0">
        <div className={`flex items-center w-full ${colapsado ? 'justify-center' : 'gap-2.5'}`}>
          <div className="relative w-9 h-9 rounded-lg bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center flex-shrink-0">
            <Leaf className="w-4 h-4 text-[#bef264]" strokeWidth={2} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
          </div>
          {!colapsado && (
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[#a78bfa] font-semibold leading-none">
                Mi Cultivo
              </p>
              <h1 className="font-display font-bold tracking-tight text-[16px] text-[#ececf1] mt-1 leading-none">
                GrowFlow
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="ct-sidebar-nav flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {items.map(renderItem)}
      </nav>

      {/* Footer usuario */}
      <div className={`px-3 py-3 border-t border-[#1f1f2b] flex-shrink-0 flex items-center ${colapsado ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-9 h-9 rounded-full bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center flex-shrink-0 text-[13px] font-display font-bold text-[#d9f99d]">
          {inicial}
        </div>
        {!colapsado && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[#ececf1] truncate leading-tight">{nombre}</p>
              <p className="text-[10.5px] mt-0.5 font-medium text-[#a78bfa]">Cultivador</p>
            </div>
            <button
              onClick={togglePin}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-[#15151d] ${hayPin ? 'text-[#bef264]' : 'text-[#5c5c6b] hover:text-[#a6a6b5]'}`}
              title={hayPin ? 'PIN activo (tocá para desactivar)' : 'Configurar PIN de desbloqueo'}
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {configPin && (
        <PinLock modo="configurar"
          onListo={() => { setConfigPin(false); setHayPin(true); toast.success('PIN configurado') }}
          onCancelar={() => setConfigPin(false)} />
      )}
    </aside>
  )
}
