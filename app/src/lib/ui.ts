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
