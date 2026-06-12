// Meta-formularios CUMCS: agrupan codigos hermanos bajo una sola entrada del menu
// con un selector de variante (pills) que decide el codigo final.
//
// Alcance prueba (24/04): SOLO Planta Madre Ambientales.
// El resto del catalogo CUMCS sigue accediendose como tipos de operacion clasicos.

import { Droplet, Sprout, ClipboardList } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface VarianteCumcs {
  label: string         // Texto del pill: "Hidro (RDWC)" / "Coco"
  codigo: string        // CM-RE asociado
  grupo: string         // Grupo CUMCS (G01..G10)
  nombre: string        // Nombre largo del registro
  icon?: LucideIcon
  // Defaults aplicados al estado del form al elegir esta variante
  // (claves coinciden con CAMPOS_CUMCS[codigo])
  defaults?: Record<string, string>
}

export interface MetaFormulario {
  id: string                   // Sin prefijo. El menu lo expone como "meta:<id>"
  label: string                // "Planta Madre — Condiciones Ambientales"
  icon?: LucideIcon            // Icono del boton del menu
  descripcion?: string
  variantes: VarianteCumcs[]
  defaultVariante: string      // codigo CM-RE inicial al abrir el form
  tipoOperacion?: string       // tipo_operacion para guardar en operaciones (ej: 'planta_madre')
}

export const METAS: Record<string, MetaFormulario> = {
  pm_ambientales: {
    id: 'pm_ambientales',
    label: 'Planta Madres',
    icon: Sprout,
    descripcion: 'Mediciones diarias (temp, humedad, EC, pH, CO2)',
    tipoOperacion: 'planta_madre',
    defaultVariante: 'CM-RE-0101',
    variantes: [
      {
        label: 'Hidro (RDWC)',
        codigo: 'CM-RE-0101',
        grupo: 'G01',
        nombre: 'Condiciones Ambientales - Planta Madre Hidro',
        icon: Droplet,
        defaults: { sistema: 'RDWC' },
      },
      {
        label: 'Coco',
        codigo: 'CM-RE-0102',
        grupo: 'G01',
        nombre: 'Condiciones Ambientales - Planta Madre Coco',
        icon: Sprout,
        defaults: { sistema: 'COCO' },
      },
    ],
  },
  pm_trazabilidad: {
    id: 'pm_trazabilidad',
    label: 'Trazabilidad Planta Madres',
    icon: ClipboardList,
    descripcion: 'Catálogo maestro de plantas madre (alta, baja, origen)',
    tipoOperacion: 'planta_madre',
    defaultVariante: 'CM-RE-0201',
    variantes: [
      {
        label: 'Trazabilidad',
        codigo: 'CM-RE-0201',
        grupo: 'G02',
        nombre: 'Trazabilidad Planta Madre',
        icon: ClipboardList,
      },
    ],
  },
}

export const META_PREFIX = 'meta:'

export function esMeta(id: string): boolean {
  return id.startsWith(META_PREFIX)
}

export function obtenerMeta(id: string): MetaFormulario | null {
  const key = id.startsWith(META_PREFIX) ? id.slice(META_PREFIX.length) : id
  return METAS[key] ?? null
}
