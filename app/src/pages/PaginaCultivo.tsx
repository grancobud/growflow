// Cultivo — las cuatro vistas del mismo cultivo en un solo lugar.
//
// Plantas, Genéticas, Línea de tiempo y Sala miran los mismos datos desde
// ángulos distintos (el individuo, la variedad, el tiempo y el espacio), así que
// tenerlas como cuatro entradas separadas obligaba a volver al menú para pasar
// de una a otra.
//
// La sección vive en la URL, no en un estado local: así los links que ya
// existían (/plantas, /sala, y los que arma la app hacia una planta puntual)
// siguen funcionando y se puede compartir o marcar una vista concreta.

import { Suspense } from 'react'
import { NavLink, useLocation, Navigate } from 'react-router-dom'
import { Sprout, Dna, CalendarRange, Droplets, Loader2 } from 'lucide-react'
import { lazyWithRetry } from '../lib/lazyWithRetry'

// Cada sección sigue siendo su propio chunk: entrar por Plantas no descarga las
// otras tres. Con retry, igual que el resto del router.
const PaginaPlantas = lazyWithRetry(() => import('./PaginaPlantas'), 'PaginaPlantas')
const PaginaGeneticas = lazyWithRetry(() => import('./PaginaGeneticas'), 'PaginaGeneticas')
const PaginaLineaTiempo = lazyWithRetry(() => import('./PaginaLineaTiempo'), 'PaginaLineaTiempo')
const PaginaSala = lazyWithRetry(() => import('./PaginaSala'), 'PaginaSala')

const SECCIONES = [
  { ruta: '/plantas', label: 'Plantas', icono: Sprout, Vista: PaginaPlantas },
  { ruta: '/geneticas', label: 'Genéticas', icono: Dna, Vista: PaginaGeneticas },
  { ruta: '/linea-tiempo', label: 'Línea de tiempo', icono: CalendarRange, Vista: PaginaLineaTiempo },
  { ruta: '/sala', label: 'Sala', icono: Droplets, Vista: PaginaSala },
] as const

export default function PaginaCultivo() {
  const { pathname } = useLocation()
  const actual = SECCIONES.find(s => pathname.startsWith(s.ruta))

  // /cultivo a secas entra por Plantas, que es la vista más usada.
  if (!actual) return <Navigate to="/plantas" replace />
  const { Vista } = actual

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0a0f]">
      {/* Fuera del área que scrollea: las pestañas quedan siempre a la vista.
          Cada sección conserva adentro su propio header con sus controles. */}
      <nav aria-label="Secciones del cultivo"
        className="flex-shrink-0 flex gap-1 px-2 sm:px-4 border-b border-[#1f1f2b] bg-[#0a0a0f] overflow-x-auto">
        {SECCIONES.map(({ ruta, label, icono: Ic }) => (
          <NavLink key={ruta} to={ruta}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap px-3 py-3 min-h-[44px] text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-[#a3e635] text-[#d9f99d]'
                  : 'border-transparent text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
            <Ic className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#5c5c6b]" aria-label="Cargando" />
        </div>
      }>
        <Vista />
      </Suspense>
    </div>
  )
}
