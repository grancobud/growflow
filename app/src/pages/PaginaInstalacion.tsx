// Instalación — lo que hay que armar y lo que falta comprar para armarlo.
//
// Hardware DIY, Riego y Tablero eléctrico son las tres partes del mismo montaje
// (el controlador, el circuito de agua y el de electricidad), e Insumos
// faltantes es la lista de compras que sale de las tres. Tenerlas separadas
// obligaba a saltar de una punta a la otra del menú para cotizar una sola cosa.

import { CircuitBoard, Waves, Zap, ShoppingCart } from 'lucide-react'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import { PestanasSeccion, type Seccion } from '../components/layout/PestanasSeccion'

const SECCIONES: readonly Seccion[] = [
  { ruta: '/hardware-diy', label: 'Hardware DIY', icono: CircuitBoard, Vista: lazyWithRetry(() => import('./PaginaHardwareDIY'), 'PaginaHardwareDIY') },
  { ruta: '/riego', label: 'Riego', icono: Waves, Vista: lazyWithRetry(() => import('./PaginaRiego'), 'PaginaRiego') },
  { ruta: '/tablero', label: 'Tablero eléctrico', icono: Zap, Vista: lazyWithRetry(() => import('./PaginaTablero'), 'PaginaTablero') },
  { ruta: '/insumos-faltantes', label: 'Faltantes', icono: ShoppingCart, Vista: lazyWithRetry(() => import('./PaginaInsumosFaltantes'), 'PaginaInsumosFaltantes') },
]

export default function PaginaInstalacion() {
  return <PestanasSeccion secciones={SECCIONES} etiqueta="Secciones de la instalación" />
}
