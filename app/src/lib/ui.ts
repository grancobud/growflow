/**
 * Estilos de botón compartidos.
 *
 * Estas dos constantes estaban copiadas y pegadas en 20 archivos. Cuando se
 * corrigió el alto táctil en Cosecha, se corrigió una sola copia y las otras
 * diez quedaron en 31 px: por eso viven acá y se importan.
 *
 * min-h-[44px] sólo en celular: es el mínimo para tocar con el dedo sin errarle.
 * De sm: para arriba se apaga, porque con mouse no hace falta y en desktop
 * botones de 44 px de alto en una barra quedan enormes.
 */
export const btnPrimario = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'

export const btnSutil = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

/**
 * Botón de sólo ícono (lápiz, tacho, refrescar).
 *
 * El ícono mide 14 px, así que sin un mínimo explícito el botón queda de 22×22
 * y en el celular se le erra. El área táctil crece sin agrandar el ícono ni
 * empujar el layout: en desktop vuelve a ser compacto.
 */
export const btnIcono = 'inline-flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5 rounded-lg transition-colors text-[#7d7d8e] hover:text-[#ececf1] hover:bg-[#15151d]'

/**
 * Campos de formulario y de filtro.
 *
 * El 16 px en celular no es estético: iOS Safari hace zoom automático sobre
 * cualquier input con letra menor y deja la página descuadrada. De sm: para
 * arriba baja al tamaño real de la interfaz.
 */
export const campoBase = 'text-[16px] rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[#ececf1] placeholder-[#7d7d8e] focus:outline-none focus:border-[#a3e635]/60 transition-colors min-h-[44px] sm:min-h-0'

export const inputFormulario = `w-full px-3 py-2.5 sm:py-2 sm:text-[12.5px] ${campoBase}`

/** Select o input de una barra de filtros: más chico y no ocupa todo el ancho. */
export const selectFiltro = `px-2.5 py-2 sm:text-[11.5px] cursor-pointer max-w-[170px] ${campoBase} text-[#a6a6b5]`
