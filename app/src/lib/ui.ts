/**
 * LA ESCALA DE GRISES, Y POR QUÉ TIENE TRES NIVELES.
 *
 * Portada de la instalación de Aguará el 02/09/2026, donde se midió con la
 * revisión de diseño automatizada. Los fondos de las dos instalaciones son los
 * mismos colores, así que la medición vale igual acá.
 *
 * Contra WCAG AA (4.5:1 para texto, 3:1 para iconos y controles), en el PEOR de
 * los fondos reales:
 *
 *   #ececf1  texto principal      16.10  ✔
 *   #a6a6b5  texto secundario      7.89  ✔
 *   #8a8a9c  rótulos y ayuda       4.85  ✔   (5.59 sobre el fondo de la app)
 *   #6e6e80  SÓLO iconos           3.63  ✔ para no-texto, ✘ para texto
 *
 * EL NIVEL DE RÓTULOS ERA `#7d7d8e`, 1.215 usos, y daba 4.49 sobre la fila
 * `#15151d` — un centésimo abajo del umbral, que es fácil de despachar como un
 * tecnicismo. No lo era: sobre las tarjetas teñidas de aviso y de estado bajaba
 * a **4.00**. La medición vieja no lo veía porque miraba pocas pantallas y
 * ninguna era un formulario, que es justo donde vive este gris.
 *
 * HABÍA UN CUARTO NIVEL, `#5a5a68`, y daba **2.80**. Eso no es un tecnicismo:
 * es algo que en un teléfono a plena luz no se ve. Quedaban dos usos, los dos
 * iconos, y pasaron a `#6e6e80`, que con 3:1 le alcanza. No se reemplazó por un
 * tono intermedio porque NO EXISTE: entre 2.80 y 4.5, sobre un fondo casi
 * negro, no hay lugar.
 *
 * NO REINTRODUCIR UN GRIS MÁS OSCURO QUE #6e6e80, y #6e6e80 sólo para iconos.
 *
 * Para volver a medirlo: `npm run revision:diseno`, con `growflow-dev` arriba.
 */

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
export const btnIcono = 'inline-flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5 rounded-lg transition-colors text-[#8a8a9c] hover:text-[#ececf1] hover:bg-[#15151d]'

/**
 * Campos de formulario y de filtro.
 *
 * El 16 px en celular no es estético: iOS Safari hace zoom automático sobre
 * cualquier input con letra menor y deja la página descuadrada. De sm: para
 * arriba baja al tamaño real de la interfaz.
 */
export const campoBase = 'text-[16px] rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[#ececf1] placeholder-[#8a8a9c] focus:outline-none focus:border-[#a3e635]/60 transition-colors min-h-[44px] sm:min-h-0'

export const inputFormulario = `w-full px-3 py-2.5 sm:py-2 sm:text-[12.5px] ${campoBase}`

/** Select o input de una barra de filtros: más chico y no ocupa todo el ancho. */
export const selectFiltro = `px-2.5 py-2 sm:text-[11.5px] cursor-pointer max-w-[170px] ${campoBase} text-[#a6a6b5]`

/**
 * Nombre clickeable dentro de una tarjeta (una planta, un paciente, una genética).
 *
 * Portado de Aguará el 02/09/2026, donde lo pidió la revisión de diseño: acá
 * estos nombres eran objetivos de 97×21 px y de 82×21, y hay once en pantalla.
 *
 * El texto mide 21 px de alto y con el dedo se le erra. No se puede resolver con
 * `min-h-[44px]` como en los botones: eso empujaría el subtítulo que va abajo y
 * descuadraría la tarjeta entera.
 *
 * El truco es padding con margen negativo que lo compensa: el área táctil crece
 * a 45 px, el layout no se mueve un píxel, y de `sm:` para arriba se apaga todo
 * porque con mouse no hace falta. El `min-w` es por lo mismo del otro lado: una
 * planta se llama «#3».
 *
 * Vive acá y no copiado en cada página porque ya pasó, con estas mismas tres
 * pantallas, que se corrigiera en Plantas y quedaran Pacientes y Genéticas sin
 * corregir.
 */
export const nombreTocable =
  'py-3 -my-3 pr-3 -mr-3 min-w-[44px] sm:py-0 sm:my-0 sm:pr-0 sm:mr-0 sm:min-w-0'
