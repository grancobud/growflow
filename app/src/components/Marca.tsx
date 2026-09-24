// Marca de la app: GrowFlow.
//
// Vive en un solo lugar a propósito. Aparece en el login (desktop y mobile), en
// el sidebar y en los encabezados; tenerla copiada en cada uno es lo que deja
// nombres viejos dando vueltas cuando algo cambia. Si mañana cambia el nombre o
// el logo, se toca acá y en `lib/marca.ts`.

import { EMBLEMA, NOMBRE_APP } from '../lib/marca'

type Tamano = 'sm' | 'md' | 'lg'

/**
 * Lado del emblema por tamaño. El alto va fijo y la proporción declarada
 * (`aspect-ratio: 1/1`), así la caja tiene su tamaño final ANTES de que el SVG
 * cargue y el texto de al lado no salta.
 */
const EMB: Record<Tamano, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-12 h-12 sm:w-14 sm:h-14',
}
const EMB_CENTRADO: Record<Tamano, string> = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-24 h-24 sm:w-28 sm:h-28',
}
const TITULO: Record<Tamano, string> = {
  sm: 'text-[16px]',
  md: 'text-[18px]',
  lg: 'text-[20px] sm:text-2xl',
}

function Emblema({ clase }: { clase: string }) {
  return (
    <img
      src={EMBLEMA}
      alt=""
      aria-hidden="true"
      style={{ aspectRatio: '1 / 1' }}
      className={`flex-shrink-0 object-contain drop-shadow-[0_0_10px_rgba(163,230,53,0.18)] ${clase}`}
    />
  )
}

/**
 * Isotipo solo, sin texto. Lo usa el sidebar colapsado, donde no entra la marca
 * completa pero tiene que quedar algo que identifique la app.
 */
export function IsotipoSolo({ tamano = 'sm' }: { tamano?: Tamano }) {
  return <Emblema clase={EMB[tamano]} />
}

/**
 * Marca completa: emblema + "GrowFlow".
 *
 * @param tamano    escala del bloque
 * @param centrado  apila y centra (login, 404); por defecto va en fila
 * @param soloTexto omite el emblema y deja el nombre (encabezados compactos)
 */
export function Marca({ tamano = 'md', centrado = false, soloTexto = false }: {
  tamano?: Tamano
  centrado?: boolean
  soloTexto?: boolean
}) {
  const nombre = (
    <div className={`font-display font-bold tracking-tight leading-tight text-[#ececf1] ${TITULO[tamano]}`}
         aria-label={NOMBRE_APP}>
      Grow<span className="text-[#bef264]">Flow</span>
    </div>
  )

  if (soloTexto) return nombre

  if (centrado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Emblema clase={tamano === 'sm' ? EMB[tamano] : EMB_CENTRADO[tamano]} />
        <div className="flex flex-col items-center gap-1">
          {nombre}
          {tamano !== 'sm' && (
            <span className="text-[12px] uppercase tracking-[0.18em] text-[#8a8a9c]">
              trazabilidad de cultivo
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Emblema clase={EMB[tamano]} />
      <div className="min-w-0">{nombre}</div>
    </div>
  )
}
