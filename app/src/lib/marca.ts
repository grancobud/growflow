// Los archivos del logo, en un solo lugar.
//
// La ruta la usan la Marca de la app (sidebar, login, encabezados) y el HTML de
// impresión del acta / el membrete del PDF. Tenerla copiada en dos lados deja el
// documento impreso sin membrete el día que se cambia uno solo.
//
// Vive en `lib` y no en `Marca.tsx` porque también lo usa el generador de PDF,
// que es un módulo pelado: un archivo de componentes que además exporta
// constantes rompe el fast refresh de Vite y el lint lo marca.

/**
 * El emblema de GrowFlow: la hoja con el flujo y el punto de "en vivo".
 * Cuadrado (256×256). Va en el sidebar, el login, el acta impresa y el PDF.
 * `scripts/generar-iconos.mjs` saca de acá todos los iconos de la app instalable.
 */
export const EMBLEMA = '/logo-growflow.svg'

/** Nombre de la instalación, para títulos y documentos. */
export const NOMBRE_APP = 'GrowFlow'
