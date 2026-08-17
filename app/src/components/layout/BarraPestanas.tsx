// Barra de pestañas horizontal.
//
// Reemplaza la barra de scroll gris del navegador, que ocupaba 15 px debajo de
// las pestañas y estaba siempre, aun cuando entraban todas. En su lugar quedan
// dos degradados que se encienden sólo del lado donde hay algo más para ver: la
// misma información, sin la franja.
//
// El degradado vive en el wrapper y no en el elemento que scrollea. Un absolute
// con right:0 adentro de un overflow-x:auto se ancla al final del contenido, no
// al borde visible, y quedaba fuera de cuadro.
//
// La pestaña activa se trae sola a la vista al cambiar de sección, porque
// entrando por una URL directa podía quedar fuera de cuadro y la pantalla se
// veía sin ninguna seleccionada.

import { useEffect, useRef } from 'react'
import { useDesbordeHorizontal } from '../../lib/useDesbordeHorizontal'

export interface Pestana<T extends string> {
  id: T
  label: string
}

export function BarraPestanas<T extends string>({ pestanas, activa, onCambio }: {
  pestanas: Pestana<T>[]
  activa: T
  onCambio: (id: T) => void
}) {
  const { refWrapper, refScroller } = useDesbordeHorizontal<HTMLDivElement, HTMLDivElement>(pestanas.length)
  const primerRender = useRef(true)

  useEffect(() => {
    const btn = refScroller.current?.querySelector<HTMLElement>('[data-activa="1"]')
    if (!btn) return
    // En el primer render se centra sin animar: una barra que se desliza sola al
    // abrir la pantalla parece un glitch.
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest',
      behavior: primerRender.current ? 'instant' : 'smooth' })
    primerRender.current = false
  }, [activa, refScroller])

  return (
    <div ref={refWrapper} className="ct-tabs-fade">
      <div ref={refScroller} className="scrollbar-none flex gap-1 items-stretch px-1 overflow-x-auto">
        {pestanas.map(p => (
          <button key={p.id} onClick={() => onCambio(p.id)}
            data-activa={activa === p.id ? '1' : '0'}
            className={`px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-[13.5px] font-medium border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activa === p.id ? 'border-[#a3e635] text-[#d9f99d]' : 'border-transparent text-[#8f8f9f] hover:text-[#d4d4dd]'}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
