import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Sprout, MessageSquareText, Droplets } from 'lucide-react'

/** Bottom navigation mobile. Grafo y Tablas quedan en el menu hamburguesa. */
const ITEMS = [
  { ruta: '/', icono: LayoutDashboard, label: 'Panel', exact: true },
  { ruta: '/sala', icono: Droplets, label: 'Sala', exact: false },
  { ruta: '/plantas', icono: Sprout, label: 'Plantas', exact: false },
  { ruta: '/chat', icono: MessageSquareText, label: 'Chat', exact: false },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Navegacion rapida mobile"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#101016] border-t border-[#1f1f2b] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-14">
        {ITEMS.map((item) => (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            end={item.exact}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors ${
                isActive ? 'text-[#bef264]' : 'text-[#5c5c6b] hover:text-[#a6a6b5]'
              }`
            }
            aria-label={item.label}
          >
            <item.icono className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
