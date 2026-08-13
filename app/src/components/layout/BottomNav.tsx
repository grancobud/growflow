import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Sprout, MessageSquareText, Scissors, Menu } from 'lucide-react'

/** Bottom navigation mobile. El boton "Más" abre el cajon con todas las secciones. */
// Sala dejó de tener entrada propia: es una pestaña dentro de Cultivo, y tenerla
// acá además de Plantas gastaba dos de los cuatro lugares en la misma pantalla.
const ITEMS = [
  { ruta: '/', icono: LayoutDashboard, label: 'Panel', exact: true },
  // `alias`: las otras pestañas de Cultivo. Sin esto el item se apaga al pasar
  // de Plantas a Sala, que es la misma sección.
  { ruta: '/plantas', icono: Sprout, label: 'Cultivo', exact: false, alias: ['/geneticas', '/linea-tiempo', '/sala', '/cultivo'] },
  { ruta: '/cosecha', icono: Scissors, label: 'Cosecha', exact: false },
  { ruta: '/chat', icono: MessageSquareText, label: 'Chat', exact: false },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Navegacion rapida mobile"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#101016] border-t border-[#1f1f2b] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {ITEMS.map((item) => (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            end={item.exact}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors ${
                isActive || item.alias?.some(a => pathname.startsWith(a))
                  ? 'text-[#bef264]' : 'text-[#7d7d8e] hover:text-[#a6a6b5]'
              }`
            }
            aria-label={item.label}
          >
            <item.icono className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => (window as any).__toggleSidebar?.()}
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] text-[#7d7d8e] hover:text-[#a6a6b5] transition-colors"
          aria-label="Más secciones"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>
    </nav>
  )
}
