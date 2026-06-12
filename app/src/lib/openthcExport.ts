// Export OpenTHC CRE (Cannabis Reporting Exchange) v1 compatible
// https://openthc.org/cre | https://github.com/openthc

import { getAllSnapshots } from './snapshotService'

type Lote = {
  id: string; codigo_lote: string; cantidad: number; estado: string
  creado_en: string; fecha_vencimiento?: string | null
  productos?: { nombre: string; tipo_producto: string } | null
  instalaciones?: { nombre: string } | null
  datos_extra?: any
}

// Mapea tipo_producto interno -> OpenTHC inventory_type canónico
const TIPO_MAP: Record<string, string> = {
  planta_madre: 'seed.mother',
  esqueje: 'seed.clone',
  planta: 'flower.intermediate',
  flor: 'flower.harvest',
  flor_trimmeada: 'flower.cured',
  flor_fraccionada: 'flower.packaged',
}

export async function exportOpenTHC(lotes: Lote[], orgNombre = 'FIS S.A.S.') {
  const now = new Date().toISOString()

  // Pre-fetch trazabilidad_snapshot por camada (1 query) — los reportes prefieren
  // datos persistidos del snapshot por sobre los crudos de `lotes`.
  const snapshots = await getAllSnapshots().catch(() => [])
  const snapByCamada = new Map(snapshots.map(s => [s.camada, s]))

  // Licensee + Section
  const licensee = {
    id: 'canntrace.fis',
    name: orgNombre,
    type: 'processor',
    status: 'active',
  }

  // Inventory items (cada lote, enriquecido con snapshot si existe la camada)
  const inventory = lotes.map(l => {
    const camadaRaw = l.datos_extra?.camada
    const camadaKey = camadaRaw ? (String(camadaRaw).startsWith('C') ? camadaRaw : `C${camadaRaw}`) : null
    const snap = camadaKey ? snapByCamada.get(camadaKey) : undefined

    // Cantidad: para floración cap a snapshot.gramos_alm_capado si está
    const tipo = l.productos?.tipo_producto
    const isFraccionada = tipo === 'flor_fraccionada'
    const qty = isFraccionada && snap?.gramos_alm_capado
      ? Math.min(l.cantidad, Number(snap.gramos_alm_capado))
      : l.cantidad

    return {
      id: l.id,
      lot_code: l.codigo_lote,
      type: TIPO_MAP[tipo || ''] || 'other',
      variety: l.datos_extra?.variedad || 'PETE HOPE (Ka)',
      strain: 'PETE HOPE',
      qty,
      uom: tipo === 'flor_trimmeada' || tipo === 'flor_fraccionada' ? 'gram' : 'unit',
      status: l.estado === 'activo' ? 'current' : 'consumed',
      created_at: l.creado_en,
      expires_at: l.fecha_vencimiento || null,
      section: l.instalaciones?.nombre || null,
      attributes: {
        camada: camadaRaw,
        sistema: l.datos_extra?.sistema || snap?.sistema || null,
        peso_verde_kg: l.datos_extra?.peso_verde_kg,
        peso_seco_kg: l.datos_extra?.peso_seco_kg,
        peso_final_kg: l.datos_extra?.peso_final_kg,
        // Datos derivados desde trazabilidad_snapshot (única fuente verdad)
        snapshot: snap ? {
          codigo_jerarquico: snap.codigo_cl || null,
          yield_kg: snap.yield_kg ? Number(snap.yield_kg) : null,
          bolsas: snap.bolsas_calculadas,
          estado: snap.estado,
          stage_actual: snap.stage_actual,
          fecha_pm_ingreso: snap.fecha_pm_ingreso,
          fecha_dep: snap.fecha_dep,
          ultima_recalculacion: snap.ultima_recalculacion,
        } : null,
      },
      public_trace_url: `https://canntrace.pages.dev/traza/${l.codigo_lote}`,
    }
  })

  // Envelope CRE
  const envelope = {
    $schema: 'https://openthc.org/cre/v2018/schema.json',
    meta: {
      version: '2018.08',
      exported_by: 'CannTrace v1.0',
      exported_at: now,
      total_items: inventory.length,
      compliance: ['GAMP5-Cat5', 'ANMAT-4159-2023', 'ANMAT-1780-2025', '21-CFR-Part-11', 'EU-GMP-Annex-11'],
    },
    licensee,
    inventory,
  }

  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `canntrace_openthc_cre_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
