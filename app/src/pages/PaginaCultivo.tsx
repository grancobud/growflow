// Cultivo — las cuatro vistas del mismo cultivo en un solo lugar.
//
// Plantas, Genéticas, Línea de tiempo y Sala miran los mismos datos desde
// ángulos distintos (el individuo, la variedad, el tiempo y el espacio), así que
// tenerlas como cuatro entradas separadas obligaba a volver al menú para pasar
// de una a otra.

import { Sprout, Dna, CalendarRange, Droplets } from 'lucide-react'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import { PestanasSeccion, type Seccion } from '../components/layout/PestanasSeccion'

// Cada sección sigue siendo su propio chunk: entrar por Plantas no descarga las
// otras tres. Con retry, igual que el resto del router.
const SECCIONES: readonly Seccion[] = [
  { ruta: '/plantas', label: 'Plantas', icono: Sprout, Vista: lazyWithRetry(() => import('./PaginaPlantas'), 'PaginaPlantas') },
  { ruta: '/geneticas', label: 'Genéticas', icono: Dna, Vista: lazyWithRetry(() => import('./PaginaGeneticas'), 'PaginaGeneticas') },
  { ruta: '/linea-tiempo', label: 'Línea de tiempo', icono: CalendarRange, Vista: lazyWithRetry(() => import('./PaginaLineaTiempo'), 'PaginaLineaTiempo') },
  { ruta: '/sala', label: 'Sala', icono: Droplets, Vista: lazyWithRetry(() => import('./PaginaSala'), 'PaginaSala') },
]

export default function PaginaCultivo() {
  return <PestanasSeccion secciones={SECCIONES} etiqueta="Secciones del cultivo" />
}
