// Barra de pestañas para las pantallas que agrupan varias vistas bajo un solo
// item de menú (Cultivo, Instalación).
//
// Dos decisiones que hacen que funcione sin tocar las páginas que agrupa:
//
// 1. La sección sale del pathname, no de un useState. Así las URLs viejas
//    siguen andando, los links internos entre secciones no se rompen y se puede
//    compartir o marcar una vista concreta.
// 2. La barra va FUERA del área que scrollea. Cada página conserva adentro su
//    propio header sticky con sus controles y no hay dos barras peleando por
//    el top.

import { Suspense, type ComponentType } from 'react'
import { NavLink, useLocation, Navigate } from 'react-router-dom'
import { Loader2, type LucideIcon } from 'lucide-react'

export interface Seccion {
  ruta: string
  label: string
  icono: LucideIcon
  Vista: ComponentType
}

export function PestanasSeccion({ secciones, etiqueta }: {
  secciones: readonly Seccion[]
  /** Para el aria-label del nav; describe el grupo, no la pestaña activa. */
  etiqueta: string
}) {
  const { pathname } = useLocation()
  const actual = secciones.find(s => pathname.startsWith(s.ruta))

  // La ruta contenedora (/cultivo, /instalacion) cae en la primera vista.
  if (!actual) return <Navigate to={secciones[0].ruta} replace />
  const { Vista } = actual

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0a0f]">
      <nav aria-label={etiqueta}
        className="flex-shrink-0 flex gap-1 px-2 sm:px-4 border-b border-[#1f1f2b] bg-[#0a0a0f] overflow-x-auto">
        {secciones.map(({ ruta, label, icono: Ic }) => (
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
          <Loader2 className="w-6 h-6 animate-spin text-[#7d7d8e]" aria-label="Cargando" />
        </div>
      }>
        <Vista />
      </Suspense>
    </div>
  )
}
