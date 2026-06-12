// PaginaTrazabilidad — diseño handoff Claude Design (CannTrace · Trazabilidad).
// Layout dark, cards de cadena con CircleProgress + DetailPanel + sidebar (KPIs, comparación).
// Datos: stockService.getLotes() + construcción de 10 stages CUMCS (CM-RE-0201 → 0210).

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Plus, X, Loader2, Sprout, Upload } from 'lucide-react'
import { Drawer } from 'vaul'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { stockService, catalogoService } from '../lib/servicios'
import { supabase } from '../lib/supabase'
import { exportOpenTHC } from '../lib/openthcExport'
import { TrazabilidadCardsSkeleton } from '../components/ui/loading-states'
import { EmptyState } from '../components/ui/empty-state'
import PresenciaAvatars from '../components/PresenciaAvatars'
import SnapshotPanel from '../components/SnapshotPanel'

// ─── Constantes diseño ──────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const
const SPRING_HOVER = { type: 'spring' as const, stiffness: 400, damping: 25 }
const SPRING_PROGRESS = { type: 'spring' as const, stiffness: 120, damping: 20 }

const STAGE_LABELS = [
  'Planta Madre', 'Esquejado', 'Vegetativa', 'Floración', 'Cosecha',
  'Secado', 'Trimming', 'Cuarentena', 'Fraccionamiento', 'Depósito Final',
]

const CODE_TOKENS: Record<string, { label: string; detail: string }> = {
  '24': { label: 'Año', detail: 'Año de registro · 2024' },
  '25': { label: 'Año', detail: 'Año de registro · 2025' },
  '26': { label: 'Año', detail: 'Año de registro · 2026' },
  SF1: { label: 'Sala', detail: 'Sala Flora 1 · COCO' },
  SF2: { label: 'Sala', detail: 'Sala Flora 2 · RDWC' },
  SFL1: { label: 'Sala', detail: 'Sala Flora 1 · COCO' },
  SFL2: { label: 'Sala', detail: 'Sala Flora 2 · RDWC' },
  Li1: { label: 'Línea', detail: 'Línea de cultivo 1' },
  Li2: { label: 'Línea', detail: 'Línea de cultivo 2' },
  VG001: { label: 'Vegetativo', detail: 'Lote vegetativo · batch 001' },
  FL1: { label: 'Floración', detail: 'Ciclo de floración nº 1' },
  FL3: { label: 'Floración', detail: 'Ciclo de floración nº 3' },
  FL5: { label: 'Floración', detail: 'Ciclo de floración nº 5' },
  FL8: { label: 'Floración', detail: 'Ciclo de floración nº 8' },
  PM4: { label: 'Planta madre', detail: 'Grupo PM4' },
  PM6: { label: 'Planta madre', detail: 'Grupo PM6' },
  PM8: { label: 'Planta madre', detail: 'Grupo PM8' },
  C7: { label: 'Camada', detail: 'Camada C7' },
  C9: { label: 'Camada', detail: 'Camada C9' },
  C11: { label: 'Camada', detail: 'Camada C11' },
  C12: { label: 'Camada', detail: 'Camada C12' },
  C15: { label: 'Camada', detail: 'Camada C15' },
  C16: { label: 'Camada', detail: 'Camada C16' },
  Ka: { label: 'Genética', detail: 'Cultivar Ka · PETE HOPE' },
  COS: { label: 'Cosecha', detail: 'Evento de cosecha' },
  CL7: { label: 'Clonación', detail: 'Corrida de clonación · C7' },
  CL9: { label: 'Clonación', detail: 'Corrida de clonación · C9' },
  CL11: { label: 'Clonación', detail: 'Corrida de clonación · C11' },
  CL12: { label: 'Clonación', detail: 'Corrida de clonación · C12' },
  CL15: { label: 'Clonación', detail: 'Corrida de clonación · C15' },
  CL16: { label: 'Clonación', detail: 'Corrida de clonación · C16' },
  FIS: { label: 'Depósito', detail: 'Depósito FIS S.A.S.' },
  B1: { label: 'Batch', detail: 'Batch nº 1' },
  B2: { label: 'Batch', detail: 'Batch nº 2' },
}

// ─── Tipos chain ────────────────────────────────────────────────────────────
type StageState = 'done' | 'active' | 'pending'
interface Stage {
  n: number
  state: StageState
  days?: number
  code?: string
  detail?: string
  range?: string
  meta?: any
}
interface Chain {
  id: string
  code: string
  system: 'RDWC' | 'COCO'
  room: string
  roomLabel: string
  genetic: string
  start: string
  end?: string
  status: string
  progress: number
  total: number
  completed: boolean
  yieldKg?: number
  note?: string | null
  stages: Stage[]
}

// ─── Construcción chains desde lotes Supabase ───────────────────────────────
function diasEntre(f1: string, f2: string): number {
  return Math.round(Math.abs(new Date(f2).getTime() - new Date(f1).getTime()) / 86400000)
}
void diasEntre; // suppress unused (helper expuesto para futuras camadas)

// Helper: normaliza camada a numero string (saca prefijo 'C' si existe). Ej: 'C9' -> '9', '11' -> '11'.
function normCamada(c: any): string { return String(c ?? '').replace(/^[Cc]/, '').trim(); }

function construirChains(
  lotes: any[],
  cosechas: any[] = [],
  trazaPM: any[] = [],
  ambientales: any[] = [],
  calidad: any[] = [],
): Chain[] {
  // Agrupar por camada + sistema
  const grupos = new Map<string, any[]>()
  for (const l of lotes) {
    const c = l.datos_extra?.camada
    const s = l.datos_extra?.sistema
    if (!c || !s) continue
    const k = `${c}|${s}`
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(l)
  }

  // Mapa PM → año (2 dig) basado en fecha real del registro. Usado para mostrar codigos coherentes.
  // Ej: PM4 fecha=2024-03-01 → "24"; PM5 fecha=2024-08-17 → "24"; PM10 fecha=2026-03-10 → "26".
  const pmYearMap = new Map<string, string>()
  for (const pm of trazaPM.filter((r: any) => r.tipo === 'codigo_planta_madre')) {
    const code = String(pm.cod_generico || '').match(/PM\d+/i)?.[0]
    const yr = pm.fecha ? String(new Date(pm.fecha).getFullYear()).slice(-2) : null
    if (code && yr) pmYearMap.set(code, yr)
  }
  const fmtPmCode = (raw?: string | null): string | undefined => {
    if (!raw) return undefined
    const m = String(raw).match(/PM\d+/i)
    if (!m) return raw
    const yr = pmYearMap.get(m[0])
    return yr ? `${yr}.${m[0]}` : raw
  }

  const chains: Chain[] = []
  for (const [key, lotesG] of grupos) {
    const [camada, sistema] = key.split('|') as [string, 'RDWC' | 'COCO']
    const room = sistema === 'RDWC' ? 'SFL2' : 'SFL1'
    const roomLabel = sistema === 'RDWC' ? 'Flora 2 (SFL2)' : 'Flora 1 (SFL1)'

    // Filtrar por tipo
    const por = (t: string) => lotesG.filter((l: any) => l.productos?.tipo_producto === t)
    const madres = por('planta_madre')
    const esq = por('esqueje')
    const plantas = por('planta')
    const veg = plantas.filter((l: any) => !l.datos_extra?.inicio_flora && !l.codigo_lote?.startsWith('FLO'))
    const flo = plantas.filter((l: any) => l.datos_extra?.inicio_flora || l.codigo_lote?.startsWith('FLO'))
    const cos = por('flor').filter((l: any) => l.codigo_lote?.startsWith('COS-'))
    const sec = por('flor').filter((l: any) => !l.codigo_lote?.startsWith('COS-'))
    const trim = por('flor_trimmeada')
    const alm = por('flor_fraccionada')

    // --- Enriquecimientos desde registros_* (xlsx ingest) ---
    const camadaN = normCamada(camada)
    // Patrones de codigo: ".C7." o "-C7" o "-C07" o "C7." al final, etc.
    const cPad = camadaN.padStart(2, '0')
    const camMatch = (s: any): boolean => {
      const v = String(s || '')
      if (!v) return false
      // Match estricto por ocurrencia del segmento C7 / C07 dentro del codigo de traza
      const re = new RegExp(`(?:^|[^A-Z0-9])C0*${camadaN}(?:[^A-Z0-9]|$)`, 'i')
      return re.test(v)
    }
    const cosechasCam = cosechas.filter((r: any) =>
      normCamada(r.camada) === camadaN ||
      normCamada(r.datos_extra?.camada) === camadaN ||
      camMatch(r.codigo_lote) || camMatch(r.cod_traza_cosecha)
    )
    const trazaPMCam = trazaPM.filter((r: any) =>
      normCamada(r.camada) === camadaN ||
      camMatch(r.cod_traza_cosecha) || camMatch(r.cod_traza_secado) ||
      camMatch(r.cod_traza_trimeo) || camMatch(r.cod_traza_almacenamiento) ||
      camMatch(r.cod_comercial) || camMatch(r.cod_generico)
    )
    const ambCam = ambientales.filter((r: any) => normCamada(r.camada) === camadaN)
    const calCam = calidad.filter((r: any) => {
      const lc = r.datos_extra?.lote_codigo || r.datos_extra?.codigo_lote || ''
      return camMatch(lc) || (lc.includes(`SF1-C${camadaN}`) || lc.includes(`SF2-C${camadaN}`) || lc.includes(`-C${cPad}`))
    })

    // Cosecha real desde xlsx (CM-RE-0601 / 0605 / etc.)
    const cosechaReal = cosechasCam.find((c: any) => c.tipo === 'certificado_cosecha') || cosechasCam[0]
    const recepcionSecadoReal = cosechasCam.filter((c: any) => c.tipo === 'recepcion_secado')

    // Trazas por etapa (subsets)
    // Planta madre origen: matcha por clonacion_origen=CL{N} (no por camada porque la PM tiene su propia camada base)
    const trazasPMOrigen = trazaPM.filter((r: any) =>
      r.tipo === 'codigo_planta_madre' &&
      (r.clonacion_origen === `CL${camadaN}` || normCamada(r.camada) === camadaN)
    )
    const trazasClonacion = trazaPMCam.filter((r: any) => r.tipo === 'codigo_clonacion')
    const trazasFlo = trazaPMCam.filter((r: any) => r.cod_traza_cosecha)
    const trazasSec = trazaPMCam.filter((r: any) => r.cod_traza_secado)
    const trazasTrim = trazaPMCam.filter((r: any) => r.cod_traza_trimeo)
    const trazasAlm = trazaPMCam.filter((r: any) => r.cod_traza_almacenamiento)
    const trazasCom = trazaPMCam.filter((r: any) => r.cod_comercial)

    // Codigos jerarquicos compuestos: "24.PM4.CL7.Li1.VG001 → VG192" (cada nivel agrega un componente).
    // El año del prefijo es el del INGRESO DE LA MADRE (origen genetico), no el del stage actual.
    // Ej: si PM4 ingreso en 2024, todo C7 lleva "24" aunque el ciclo termine en 2025.
    const yearFromDate = (d?: string): string | null => {
      if (!d) return null
      const m = String(d).match(/^(\d{4})/)
      return m ? m[1].slice(-2) : null
    }
    const pmFechaRaw = trazasPMOrigen[0]?.fecha
    const esqFechaRaw = esq[0]?.datos_extra?.fecha_inicio
    const year = yearFromDate(pmFechaRaw) || yearFromDate(esqFechaRaw) || '25'
    // Extrae solo el segmento PM\d+, ignorando prefijo de año "25." si viene incluido.
    const pmRaw = trazasPMOrigen[0]?.cod_generico
      || madres[0]?.codigo_lote
      || ''
    const pmCode = String(pmRaw).match(/PM\d+/i)?.[0] || `PM${camadaN}`
    const clCode = `CL${camadaN}`
    const sistemaSf = sistema === 'RDWC' ? 'SF2' : 'SF1'
    const sampleTrazaCode = trazasFlo[0]?.cod_traza_cosecha
      || trazasSec[0]?.cod_traza_secado
      || ''
    const liMatch = String(sampleTrazaCode).match(/Li(\d+)/i)
    const liCode = liMatch ? `Li${liMatch[1]}` : null

    // Extrae rango de numeros para un prefijo (VG, FL, CDS, Tr, AL, BI). Mantiene el padding original.
    const extractRange = (arr: any[], field: string, prefix: string): { first?: string; last?: string; count: number } => {
      const matches = arr
        .map(r => String(r?.[field] || '').match(new RegExp(prefix + '(\\d+)', 'i')))
        .filter((m): m is RegExpMatchArray => !!m)
      if (matches.length === 0) return { count: 0 }
      const nums = matches.map(m => parseInt(m[1], 10))
      const pad = matches[0][1].length
      const min = Math.min(...nums), max = Math.max(...nums)
      return { first: String(min).padStart(pad, '0'), last: String(max).padStart(pad, '0'), count: matches.length }
    }
    const vgRange = extractRange(trazasFlo, 'cod_traza_cosecha', 'VG')
    const flRange = extractRange(trazasSec, 'cod_traza_secado', 'FL')
    const cdsRange = extractRange(trazasTrim, 'cod_traza_trimeo', 'CDS')

    // Extrae segmento corto de un codigo arbitrario (ej "25.FIS.BI5.C7.22" → "BI5").
    const lastSegment = (s: string): string => {
      const v = String(s || '')
      const m = v.match(/(?:VG|FL|CDS|Tr|AL|BI|COS|FIS|ALM)\.?\d+/i)
      return m?.[0] || v
    }
    // Numero de etapa para ordenar (CDS9 < CDS10 numericamente).
    const stageNumOf = (s: string): number => {
      const m = String(s || '').match(/(?:VG|FL|CDS|Tr|AL|BI|COS|FIS|ALM)\.?(\d+)/i)
      return m ? parseInt(m[1], 10) : 0
    }
    // Para stages que no tienen rango numerado claro (Frac/Dep): "primero → sufijo(ultimo)".
    const codeListRange = (arr: any[], field: string): string | undefined => {
      const codes = arr.map(r => r?.[field]).filter(Boolean) as string[]
      if (codes.length === 0) return undefined
      const sorted = [...codes].sort((a, b) => stageNumOf(a) - stageNumOf(b) || a.localeCompare(b))
      if (sorted.length === 1) return sorted[0]
      return `${sorted[0]} → ${lastSegment(sorted[sorted.length - 1])}`
    }

    // Helpers fechas
    const fmtRange = (ini?: string, fin?: string): string | undefined => {
      if (!ini && !fin) return undefined
      if (ini && fin && ini !== fin) return `${ini} → ${fin}`
      return ini || fin
    }
    const diasReales = (ini?: string, fin?: string, fallback: number = 0): number => {
      if (!ini || !fin) return fallback
      const d = Math.round(Math.abs(new Date(fin).getTime() - new Date(ini).getTime()) / 86400000)
      return d > 0 ? d : fallback
    }

    // Fechas reales por etapa — solo desde fuentes confiables, evitar fallbacks '2025-01-01' que generan dias absurdos.
    // Helper: filtra fechas validas (no usa el sentinel 2025-01-01 que mete el ingest cuando falta)
    const fechasValidas = (arr: any[], field: string): string[] =>
      arr.map(r => r[field]).filter((f: any) => f && f !== '2025-01-01').sort()
    const minF = (arr: any[], field: string): string | undefined => fechasValidas(arr, field)[0]

    // Sanea fechas absurdas: descarta sentinels, fechas futuras y fechas que rompen el orden cronologico.
    // Sin esto, un cosechaReal mal-etiquetado (fecha 2026-07-29) cascadea a SEC/Trim con rangos invertidos.
    const hoyISO = new Date().toISOString().slice(0, 10)
    const fechaOk = (f?: string): string | undefined => {
      if (!f || f === '2025-01-01') return undefined
      const f10 = String(f).slice(0, 10)
      if (f10 > hoyISO) return undefined
      return f10
    }
    // Garantiza que `fin` sea posterior a `ini`. Si esta invertido o el delta es absurdo, devuelve undefined.
    const finValido = (ini?: string, fin?: string, maxDias = 365): string | undefined => {
      const i = fechaOk(ini), f = fechaOk(fin)
      if (!f) return undefined
      if (!i) return f
      if (f < i) return undefined
      const delta = (new Date(f).getTime() - new Date(i).getTime()) / 86400000
      if (delta > maxDias) return undefined
      return f
    }

    const pmIngreso = fechaOk(trazasPMOrigen[0]?.fecha)
    const esqIni = fechaOk(esq[0]?.datos_extra?.fecha_inicio)
    const esqFin = finValido(esqIni, esq[0]?.datos_extra?.fecha_fin, 60)
    const vegIni = fechaOk(veg[0]?.datos_extra?.fecha_inicio) || esqFin
    const vegFin = finValido(vegIni, veg[0]?.datos_extra?.fecha_fin, 90)
    const floIni = fechaOk(flo[0]?.datos_extra?.fecha_inicio) || vegFin
    // Floracion termina cuando arranca cosecha (recepciones de secado o fecha_inicio_secado de cuadros)
    const floFin = finValido(floIni, flo[0]?.datos_extra?.fecha_fin, 120)
      || fechaOk(minF(recepcionSecadoReal, 'fecha_recepcion'))
      || fechaOk(sec[0]?.datos_extra?.fecha_inicio_secado)
    // Cosecha: descarta fechas mal etiquetadas (futuro o >365d despues de floFin → registro de otra camada).
    const cosFechaCand = fechaOk(cosechaReal?.fecha_cosecha) || fechaOk(cosechaReal?.fecha)
    const cosFecha = finValido(floIni || vegFin, cosFechaCand, 200) || floFin
    // Secado: usa fecha_inicio_secado de cuadros y datos_extra.fecha_fin_secado de trazasTrim (CM-RE-0205)
    const secIni = fechaOk(sec[0]?.datos_extra?.fecha_inicio_secado)
      || fechaOk(minF(recepcionSecadoReal, 'fecha_recepcion'))
      || cosFecha
    // fin_secado real desde trazasTrim.datos_extra.fecha_fin_secado (CM-RE-0205 tiene esa columna)
    const finsSecadoReales = trazasTrim
      .map((t: any) => t.datos_extra?.fecha_fin_secado?.slice(0, 10))
      .filter((f: any) => f && f !== '2025-01-01')
      .sort()
    const secFinRaw = finsSecadoReales[finsSecadoReales.length - 1] || sec[sec.length - 1]?.datos_extra?.fecha_fin_secado
    const secFin = finValido(secIni, secFinRaw, 60)
    // Trimming arranca cuando termina secado, fin = inicio almacen
    const trimIni = secFin || fechaOk(minF(trazasTrim, 'fecha'))
    const trimFinRaw = fechaOk(minF(trazasAlm, 'fecha')) || fechaOk(minF(trazasCom, 'fecha'))
    const trimFin = finValido(trimIni, trimFinRaw, 30)
    const cuarIni = fechaOk(minF(calCam, 'fecha')) || trimFin
    const almIni = fechaOk(minF(trazasAlm, 'fecha')) || trimFin
    const comIni = fechaOk(minF(trazasCom, 'fecha')) || almIni

    // Promedios ambientales (vegetativa + floracion separados por etapa/tipo)
    const ambVeg = ambCam.filter((a: any) => a.tipo === 'vegetativa' || a.etapa === 'vegetativa')
    const ambFlo = ambCam.filter((a: any) => a.tipo === 'floracion' || a.etapa === 'floracion')
    const avgRange = (arr: any[]) => {
      const fechas = arr.map(a => a.fecha).filter(Boolean).sort()
      return fechas.length ? `${fechas[0]} → ${fechas[fechas.length - 1]}` : undefined
    }
    const avgKpi = (arr: any[]) => {
      const temps = arr.map(a => +a.temperatura).filter(n => Number.isFinite(n))
      const vpds = arr.map(a => +a.vpd_kpa).filter(n => Number.isFinite(n))
      const tAvg = temps.length ? (temps.reduce((s, x) => s + x, 0) / temps.length).toFixed(1) : null
      const vAvg = vpds.length ? (vpds.reduce((s, x) => s + x, 0) / vpds.length).toFixed(2) : null
      const parts = [arr.length ? `${arr.length} mediciones` : null, tAvg ? `Temp ${tAvg}°C` : null, vAvg ? `VPD ${vAvg}` : null].filter(Boolean)
      return parts.length ? parts.join(' · ') : undefined
    }

    // Codigos jerarquicos compuestos por stage. Cada nivel agrega un componente sin repetir los anteriores.
    const baseJer = `${year}.${pmCode}.${clCode}${liCode ? '.' + liCode : ''}`
    const codePM = `${year}.${pmCode}`
    const codeCL = `${year}.${pmCode}.${clCode}`
    // VG: rango compacto "25.PM4.CL7.Li1.VG001 → VG192" (sin repetir el prefijo).
    const codeVG = vgRange.first
      ? (vgRange.last && vgRange.last !== vgRange.first
          ? `${baseJer}.VG${vgRange.first} → VG${vgRange.last}`
          : `${baseJer}.VG${vgRange.first}`)
      : (veg[0]?.codigo_lote || `${baseJer}.VG?`)
    // Floracion: las mismas plantas VG{N} pero ahora en sala SF{N} (sistema flora).
    // Compacto: "...VG001.SF2 → VG192" (no se repite SF2 al final del rango).
    const codeFL = vgRange.first
      ? (vgRange.last && vgRange.last !== vgRange.first
          ? `${baseJer}.VG${vgRange.first}.${sistemaSf} → VG${vgRange.last}`
          : `${baseJer}.VG${vgRange.first}.${sistemaSf}`)
      : (flRange.first
          ? (flRange.last && flRange.last !== flRange.first
              ? `${baseJer}.FL${flRange.first}.${sistemaSf} → FL${flRange.last}`
              : `${baseJer}.FL${flRange.first}.${sistemaSf}`)
          : (flo[0]?.codigo_lote || `${baseJer}.${sistemaSf}`))
    // Secado: sigue el path de flora ("25.PM4.CL7.Li1.SF2") pero cambia VG{N} (planta) por CDS{N} (cuadro).
    const codeSEC = cdsRange.first
      ? (cdsRange.last && cdsRange.last !== cdsRange.first
          ? `${baseJer}.${sistemaSf}.CDS${cdsRange.first} → CDS${cdsRange.last}`
          : `${baseJer}.${sistemaSf}.CDS${cdsRange.first}`)
      : codeListRange(sec, 'codigo_lote')
    // Trimming: SIN codigo de traza, muestra resumen "X cuadros → Y lotes · Z g totales".
    // La cantidad sigue desde trimeo hasta fraccionamiento (cuarentena es paso intermedio).
    const cuadrosTrim = sec.length || trazasTrim.length || 0
    const lotesTrim = trim.length
    const gramosTrim = trim.reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
    const codeTrim = lotesTrim > 0
      ? `${cuadrosTrim} cuadros → ${lotesTrim} lotes · ${gramosTrim.toLocaleString('es-AR')} g`
      : (trazasTrim.length > 0 ? `${trazasTrim.length} códigos trimeo` : undefined)

    // Cantidades para Frac/Dep: capadas al maximo de trim (no pueden crecer en el pipeline).
    const totalAlmRaw = alm.reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
    const totalAlm = gramosTrim > 0 && totalAlmRaw > gramosTrim ? gramosTrim : totalAlmRaw
    const bolsasCalc = totalAlm > 0 ? Math.round(totalAlm / 400) : 0
    // Padding dinamico: 2 digitos si <100 bolsas, 3 si >=100. C7=B01..B69, C12=B001..B156.
    const padLen = bolsasCalc >= 100 ? 3 : 2
    const padBolsa = (n: number) => String(n).padStart(padLen, '0')

    // Fraccionamiento: codigo PROPIO (no hereda jerarquia). Formato "ALM-C7-RDWC-B01 → B69".
    const codeFrac = bolsasCalc > 0
      ? `ALM-${camada}-${sistema}-B${padBolsa(1)} → B${padBolsa(bolsasCalc)}`
      : (codeListRange(alm, 'codigo_lote') || codeListRange(trazasAlm, 'cod_traza_almacenamiento') || `ALM-${camada}-${sistema}`)

    // Deposito final: codigo PROPIO (no hereda). Formato "{year}.FIS.B01 → B69".
    const codeDep = bolsasCalc > 0
      ? `${year}.FIS.B${padBolsa(1)} → B${padBolsa(bolsasCalc)}`
      : (alm[0]?.datos_extra?.cod_final_primero
          ? `${alm[0].datos_extra.cod_final_primero} → ${lastSegment(alm[0].datos_extra.cod_final_ultimo ?? alm[0].datos_extra.cod_final_primero)}`
          : codeListRange(trazasCom, 'cod_comercial') || `${year}.FIS.B.${camada}`)

    // 10 stages — datos reales por etapa con fechas y codigos correctos
    const stagesData: { check: boolean; days?: number; code?: string; detail?: string; range?: string; meta?: any }[] = [
      // 1. Planta Madre — la PM NO se da de baja al clonar, sigue viva.
      { check: madres.length > 0 || trazasPMOrigen.length > 0,
        days: diasReales(pmIngreso, esqIni, 200),
        code: codePM,
        detail: trazasPMOrigen[0]
          ? `Madre origen: ${fmtPmCode(trazasPMOrigen[0].madre_origen) || '—'} · Sistema: ${trazasPMOrigen[0].sistema || sistema} · PETE HOPE (Ka)`
          : `${madres.length} plantas madre · PETE HOPE (Ka)`,
        range: pmIngreso && esqIni ? `${pmIngreso} → clonó a C${camadaN} ${esqIni}` : fmtRange(pmIngreso, esqIni),
        meta: { tipo: 'planta_madre', cod: fmtPmCode(trazasPMOrigen[0]?.cod_generico), lote: madres[0], traza: trazasPMOrigen[0], madreOrigen: fmtPmCode(trazasPMOrigen[0]?.madre_origen), fechaIngreso: pmIngreso, fechaClonacion: esqIni } },
      // 2. Esquejado — completo cuando esquejes maduraron y hay lote vege.
      { check: veg.length > 0 || flo.length > 0 || cos.length > 0,
        days: diasReales(esqIni, esqFin, 14),
        code: codeCL,
        detail: esq[0]
          ? (() => {
              const m = madres.length > 0 ? `${madres.length} madres` : 'madres'
              const eq = Number(esq[0]?.cantidad)
              const e = eq ? `${eq} esquejes` : 'esquejes'
              const cods = trazasClonacion.length > 0 ? ` · ${trazasClonacion.length} cód. clon.` : ''
              return `${m} → ${e}${cods}`
            })()
          : (trazasClonacion.length > 0 ? `${trazasClonacion.length} códigos de clonación` : undefined),
        range: fmtRange(esqIni, esqFin),
        meta: { tipo: 'esquejado', cod: esq[0]?.codigo_lote, lote: esq[0], trazas: trazasClonacion } },
      // 3. Vegetativa — completa cuando paso a flora.
      { check: flo.length > 0 || cos.length > 0 || sec.length > 0,
        days: diasReales(vegIni, vegFin, 28),
        code: codeVG,
        detail: trazasFlo.length > 0
          ? `${trazasFlo.length} plantas vegetativas · derivadas de ${pmCode} → ${clCode}`
          : (ambVeg.length > 0 ? avgKpi(ambVeg) : (veg[0] ? `${Number(esq[0]?.cantidad) || '?'} esquejes → ${Number(veg[0]?.cantidad) || '?'} plantas` : undefined)),
        range: fmtRange(vegIni, vegFin) || avgRange(ambVeg),
        meta: {
          tipo: 'vegetativa', cod: veg[0]?.codigo_lote, lote: veg[0], ambientales: ambVeg, trazas: trazasFlo,
          codigosFmt: vgRange.first ? {
            first: `${baseJer}.VG${vgRange.first}`,
            last: vgRange.last && vgRange.last !== vgRange.first ? `${baseJer}.VG${vgRange.last}` : null,
            count: vgRange.count,
          } : null,
        } },
      // 4. Floracion — completa cuando paso a cosecha/secado. En curso si flo existe sin sec/cos.
      { check: cos.length > 0 || sec.length > 0 || trazasTrim.length > 0,
        days: diasReales(floIni, floFin, 56),
        code: codeFL,
        detail: trazasSec.length > 0
          ? `${trazasSec.length} plantas floración · ${roomLabel}`
          : (ambFlo.length > 0 ? avgKpi(ambFlo) : (flo[0] ? `${Number(flo[0]?.cantidad) || '?'} plantas · ${roomLabel}` : `${roomLabel}`)),
        range: fmtRange(floIni, floFin) || avgRange(ambFlo),
        meta: {
          tipo: 'floracion', cod: flo[0]?.codigo_lote, lote: flo[0], ambientales: ambFlo, roomLabel, trazas: trazasSec,
          codigosFmt: vgRange.first ? {
            first: `${baseJer}.VG${vgRange.first}.${sistemaSf}`,
            last: vgRange.last && vgRange.last !== vgRange.first ? `${baseJer}.VG${vgRange.last}.${sistemaSf}` : null,
            count: vgRange.count,
          } : null,
        } },
      // 5. Cosecha — completa si hay lote COS- o si paso a secado.
      { check: cos.length > 0 || sec.length > 0 || trazasTrim.length > 0,
        days: 1,
        code: codeFL,
        detail: (() => {
          const cosechado = cos.length > 0 || sec.length > 0 || trazasTrim.length > 0
          if (!cosechado) return 'pendiente · aún en floración'
          const plantasFlo = Number(flo[0]?.cantidad) || trazasFlo.length || 0
          return `${plantasFlo || '?'} plantas cosechadas · PETE HOPE (Ka)`
        })(),
        range: cosFecha,
        meta: { tipo: 'cosecha', cod: cos[0]?.codigo_lote, lote: cos[0], loteFlo: flo[0],
          plantasCosechadas: Number(flo[0]?.cantidad) || trazasFlo.length || 0,
          cosechaReal: (cosechaReal && normCamada(cosechaReal.camada) === camadaN) ? cosechaReal : null,
          trazas: trazasFlo } },
      // 6. Secado — completo cuando paso a trimming (con o sin pesos).
      { check: trim.length > 0 || trazasTrim.length > 0 || alm.length > 0,
        days: diasReales(secIni, secFin, 14),
        code: codeSEC,
        detail: (() => {
          const cuadros = trazasTrim.map((t: any) => t.datos_extra?.numero_cuadro).filter(Boolean)
          const cuadrosUnicos = Array.from(new Set(cuadros))
          const sala = trazasTrim[0]?.cod_traza_trimeo?.match(/SFL\d/)?.[0] || `SFL${sistema === 'RDWC' ? '2' : '1'}`
          const plantasPorCuadro = sec[0]?.cantidad ? Number(sec[0].cantidad) : 24
          const plantasTotal = sec.length > 0 ? sec.reduce((a, l) => a + (Number(l.cantidad) || 0), 0) : (cuadrosUnicos.length * plantasPorCuadro)
          if (cuadrosUnicos.length > 0) {
            const cuadrosTxt = cuadrosUnicos.length <= 4 ? cuadrosUnicos.join(', ') : `${cuadrosUnicos.slice(0, 3).join(', ')}…${cuadrosUnicos[cuadrosUnicos.length - 1]}`
            return `${cuadrosUnicos.length} cuadros (${cuadrosTxt}) · ${sala} · ${plantasTotal} plantas`
          }
          return sec.length > 0 ? `${sec.length} cuadros · ${plantasTotal} plantas` : (trazasSec.length > 0 ? `${trazasSec.length} códigos secado` : 'sin detalle')
        })(),
        range: fmtRange(secIni, secFin),
        meta: { tipo: 'secado', cuadros: sec, recepciones: recepcionSecadoReal, trazas: trazasSec, trazasTrim, secIni, secFin } },
      // 7. Trimming — completo cuando paso a cuarentena/almacen (hay alm o calCam).
      { check: alm.length > 0 || calCam.length > 0,
        days: diasReales(trimIni, trimFin, 4),
        code: codeTrim,
        detail: trim.length > 0
          ? `${sec.length || trazasTrim.length || '?'} cuadros → ${trim.length} lotes · ${trim.reduce((a, l) => a + (Number(l.cantidad) || 0), 0).toLocaleString('es-AR')} g totales`
          : (trazasTrim.length > 0 ? `${trazasTrim.length} códigos trimeo` : undefined),
        range: fmtRange(trimIni, trimFin),
        meta: { tipo: 'trimming', lotes: trim, trazas: trazasTrim } },
      // 8. Cuarentena — completa si hay frac (alm con cantidad) o trazas com (deposito).
      { check: (alm.length > 0 && alm[0]?.cantidad > 0) || trazasCom.length > 0,
        days: 5,
        code: calCam.length > 0
          ? `${camada} · ${calCam.length} muestras LAB`
          : `${camada} · LAB FACENA`,
        detail: (() => {
          const partes: string[] = []
          if (calCam.length > 0) partes.push(`${calCam.length} muestras LAB`)
          if (totalAlm > 0) partes.push(`${totalAlm.toLocaleString('es-AR')} g en cuarentena`)
          if (bolsasCalc > 0) partes.push(`${bolsasCalc} bolsas`)
          return partes.length ? partes.join(' · ') : (alm.length > 0 ? `${trim.length} liberados` : 'pendiente')
        })(),
        range: cuarIni,
        meta: { tipo: 'cuarentena', calidad: calCam, trazas: trazasAlm, totalG: totalAlm, bolsas: bolsasCalc } },
      // 9. Fraccionamiento — completo cuando alm tiene cantidad real y/o trazasCom (paso a deposito).
      { check: (alm.length > 0 && Number(alm[0]?.cantidad) > 0) || trazasCom.length > 0,
        days: 1,
        code: codeFrac,
        detail: (() => {
          if (totalAlm > 0) {
            return `${bolsasCalc} bolsas (~400g c/u) · ${totalAlm.toLocaleString('es-AR')} g totales`
          }
          return trazasAlm.length > 0 ? `${bolsasCalc || trazasAlm.length} bolsas` : undefined
        })(),
        range: almIni,
        meta: { tipo: 'fraccionamiento', lote: alm[0], trazas: trazasAlm, totalG: totalAlm, bolsas: bolsasCalc } },
      // 10. Depósito Final — codigo propio FIS. Bolsas comerciales = bolsas calculadas (no duplicadas).
      { check: alm.length > 0 || trazasCom.length > 0,
        days: 1,
        code: codeDep,
        detail: (() => {
          if (totalAlm > 0 && bolsasCalc > 0) {
            return `${bolsasCalc} bolsas · ${totalAlm.toLocaleString('es-AR')} g totales · ~400g por bolsa · DEPÓSITO FIS`
          }
          return trazasCom.length > 0 ? `${bolsasCalc || trazasCom.length} bolsas comerciales · DEPÓSITO FIS` : 'pendiente liberación'
        })(),
        range: comIni || 'vigente',
        meta: { tipo: 'deposito', trazas: trazasCom, lote: alm[0], totalG: totalAlm, bolsas: bolsasCalc } },
    ]

    // Cada stage ya trae su codigo jerarquico autosuficiente (ej "25.PM4.CL7.Li1.VG001 → VG192").
    // No se concatena con flechas entre stages — cada nivel agrega su componente al codigo.
    // active = primer stage no completo (asi C15 muestra FL en curso, no VG).
    let firstPending = -1
    for (let i = 0; i < stagesData.length; i++) {
      if (!stagesData[i].check) { firstPending = i; break }
    }
    const allDone = firstPending === -1
    const stages: Stage[] = stagesData.map((d, i) => {
      let state: StageState = 'pending'
      if (d.check) state = 'done'
      else if (i === firstPending) state = 'active'
      return { n: i + 1, state, days: d.days, code: d.code, detail: d.detail, range: d.range, meta: d.meta }
    })

    const progress = stages.filter(s => s.state === 'done').length + (stages.some(s => s.state === 'active') ? 1 : 0)
    const completed = allDone
    // Inicio = fecha de ingreso de la planta madre (origen real del ciclo).
    // Si no hay PM, fallback al esqueje. Coherente con totalDays que suma 347d de PM.
    const start = pmFechaRaw || esq[0]?.datos_extra?.fecha_inicio || madres[0]?.creado_en?.slice(0, 10) || ''
    // Fin = fecha del ultimo stage con datos (Dep > Frac > Trim > Cuar > Sec > Cos > Flo).
    const end = comIni || almIni || trimFin || trimIni || cuarIni || secFin || cosFecha || floFin || ''
    // Yield real: capado al maximo de trim (no puede crecer post-secado).
    const yieldKg = alm.length > 0
      ? (gramosTrim > 0 ? Math.min(totalAlm, gramosTrim) : totalAlmRaw) / 1000
      : undefined

    chains.push({
      id: camada, code: `CUMCS · ${camada}`,
      system: sistema, room, roomLabel,
      genetic: 'PETE HOPE (Ka)',
      start, end: end || undefined, status: completed ? 'completada' : 'en proceso',
      progress, total: 10, completed, yieldKg, note: null,
      stages,
    })
  }

  // Ordenar: en proceso primero (por start desc), después completadas (por start desc)
  chains.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return b.start.localeCompare(a.start)
  })
  return chains
}

// ─── Helpers UI ─────────────────────────────────────────────────────────────
function CountUp({ to, decimals = 0, duration = 1200, suffix = '', prefix = '' }: { to: number; decimals?: number; duration?: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      // Eased: cubic-bezier(0.22, 1, 0.36, 1) approx via easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(to * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('es-AR')
  return <span>{prefix}{formatted}{suffix}</span>
}

function LotCode({ code, size = 'sm', dim = false }: { code: string; size?: 'xs' | 'sm' | 'md'; dim?: boolean }) {
  const parts = code.split(/([^A-Za-z0-9])/)
  const cls = size === 'xs' ? 'text-[11px]' : size === 'md' ? 'text-[13px]' : 'text-[12px]'
  const [tip, setTip] = useState<number | null>(null)
  return (
    <span className={`font-mono tabular-nums tracking-tight ${cls} ${dim ? 'text-[#46464f]' : 'text-[#8f8f9f]'} inline-flex flex-wrap items-baseline leading-[1.4]`}>
      {parts.map((p, i) => {
        const tok = CODE_TOKENS[p]
        if (tok) return (
          <span key={i} className="relative cursor-help hover:text-[#ececf1] hover:bg-[#a3e635]/10 rounded-[2px] transition-colors"
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(v => v === i ? null : v)}>
            {p}
            <AnimatePresence>{tip === i && (
              <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12, ease: EASE }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap">
                <span className="block px-2.5 py-1.5 rounded-md bg-[#0a0a0f] border border-[#2b2b3a] shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
                  <span className="block text-[9px] uppercase tracking-widest text-[#46464f] font-sans font-medium mb-0.5">{tok.label}</span>
                  <span className="block text-[11px] text-[#d4d4dd] font-sans font-medium">{tok.detail}</span>
                </span>
              </motion.span>
            )}</AnimatePresence>
          </span>
        )
        return <span key={i} className="text-[#30303e]">{p}</span>
      })}
    </span>
  )
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'primary' | 'gold' | 'ok' | 'warn' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-[#15151d] text-[#8f8f9f] border border-[#1f1f2b]',
    primary: 'bg-[#a3e635]/10 text-[#d9f99d] border border-[#a3e635]/20',
    gold: 'bg-[#a78bfa]/10 text-[#c4b5fd] border border-[#a78bfa]/25',
    ok: 'bg-[#23233a] text-[#bef264] border border-[#404d20]',
    warn: 'bg-[#352b4d] text-[#c4b5fd] border border-[#463a66]',
  }
  return <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium ${tones[tone]}`}>{children}</span>
}

function DurationPill({ days }: { days: number }) {
  const tone = days < 30 ? 'bg-[#23233a] text-[#bef264] border-[#404d20]/80'
    : days < 60 ? 'bg-[#352b4d] text-[#c4b5fd] border-[#463a66]/80'
    : 'bg-[#3a1f1f] text-[#e08282] border-[#5a2828]/80'
  return <span className={`inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-medium border ${tone}`}>{days}<span className="text-[10px] opacity-60">d</span></span>
}

function Label({ children, tone = 'ink-40', className = '' }: { children: React.ReactNode; tone?: 'ink-40' | 'ink-50' | 'gold' | 'primary'; className?: string }) {
  const map = { 'ink-40': 'text-[#46464f]', 'ink-50': 'text-[#5c5c6b]', gold: 'text-[#a78bfa]', primary: 'text-[#bef264]' }
  return <span className={`block text-[10px] uppercase tracking-[0.14em] font-medium ${map[tone]} ${className}`}>{children}</span>
}

function ProgressBar({ current, total = 10, completed = false, showLabel = true }: { current: number; total?: number; completed?: boolean; showLabel?: boolean }) {
  const pct = completed ? 100 : Math.round((current / total) * 100)
  const accent = completed ? '#c4b5fd' : '#bef264'
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono tabular-nums text-[11px] text-[#5c5c6b]">
            <span className={completed ? 'text-[#c4b5fd]' : 'text-[#d9f99d]'}>{current}</span>
            <span className="text-[#46464f]">/{total}</span>
            <span className="text-[#46464f] mx-1.5">·</span>
            <span className="text-[#b3b3c0] font-medium"><CountUp to={pct} />%</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[#46464f]">{completed ? 'Completada' : 'En progreso'}</span>
        </div>
      )}
      <div className="relative w-full h-[5px] rounded-full bg-[#0f1714] border border-[#1f1f2b] overflow-hidden">
        <div className="absolute inset-0 flex">
          {Array.from({ length: total - 1 }).map((_, i) => <div key={i} style={{ left: `${((i + 1) / total) * 100}%` }} className="absolute top-0 bottom-0 w-px bg-[#1f1f2b]" />)}
        </div>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ ...SPRING_PROGRESS, delay: 0.15 }}
          className="relative h-full rounded-full"
          style={{
            background: completed
              ? 'linear-gradient(90deg, #a3e635 0%, #bef264 35%, #c4b5fd 100%)'
              : 'linear-gradient(90deg, #216b45 0%, #a3e635 45%, #bef264 100%)',
            boxShadow: `0 0 10px ${accent}55, 0 0 2px ${accent}99 inset`,
          }}>
          {!completed && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}, 0 0 14px ${accent}88` }} />}
          <span className="absolute inset-0 ct-bar-shimmer rounded-full" />
        </motion.div>
      </div>
    </div>
  )
}

function CircleProgress({ current, total = 10, completed = false, size = 54 }: { current: number; total?: number; completed?: boolean; size?: number }) {
  const pct = completed ? 100 : (current / total) * 100
  const r = (size - 8) / 2
  const C = 2 * Math.PI * r
  const off = C - (pct / 100) * C
  const color = completed ? '#c4b5fd' : '#bef264'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f1f2b" strokeWidth="4" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: off }}
          transition={{ ...SPRING_PROGRESS, delay: 0.2 }} style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono tabular-nums text-[12px] font-semibold text-[#ececf1]">{current}<span className="text-[#46464f]">/{total}</span></span>
      </div>
    </div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────
function TopBar({ totalChains }: { totalChains: number }) {
  return (
    <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
        <div className="min-w-0">
          <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Trazabilidad Inversa</h1>
          <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
            <span className="tabular-nums">{totalChains}</span> cadenas
            <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span> Sale-to-Seed <span className="text-[#30303e] mx-1">│</span> Datos reales por etapa</span>
          </div>
        </div>
        <div className="flex-1" />
        <PresenciaAvatars pageKey="trazabilidad" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />Online
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">GAMP5</span>
      </div>
    </div>
  )
}

function EstadoBar({ activas, total, onSync, onExport, syncing, exporting, onNueva }: { activas: number; total: number; onSync: () => void; onExport: () => void; syncing: boolean; exporting: boolean; onNueva: () => void }) {
  const horaSync = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-[14px] text-[#ececf1]">Estado de cadenas</span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-[#5c5c6b]">
          Última sincronización: <span className="font-mono text-[#b3b3c0]">{horaSync}</span>
          <span className="text-[#30303e] mx-1.5">/</span>
          <span className="text-[#d9f99d]">{activas} cadenas activas</span>
          <span className="text-[#30303e] mx-1.5">/</span>
          <span className="text-[#8f8f9f]">{total} totales</span>
        </div>
      </div>
      <div className="flex-1" />
      <button onClick={onNueva}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary-700 hover:bg-primary-800 transition-colors text-[11.5px] font-semibold text-white shadow-sm">
        <Plus className="w-3.5 h-3.5" />
        Nueva cadena
      </button>
      <button onClick={onExport} disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#20202c] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[11.5px] font-medium text-[#d4d4dd] disabled:opacity-50">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2Z" stroke="#a3e635" strokeWidth="1.2" strokeLinejoin="round" /><path d="M5.5 9h5M5.5 11h5" stroke="#a3e635" strokeWidth="1.2" strokeLinecap="round" /></svg>
        {exporting ? 'Exportando…' : 'Exportar Excel'}
      </button>
      <button onClick={onExport} disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#7a5abf]/40 bg-[#7a5abf]/10 hover:bg-[#7a5abf]/20 transition-colors text-[11.5px] font-medium text-[#c9b7ff] disabled:opacity-50">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" /><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
        OpenTHC CRE
      </button>
      <button onClick={onSync} disabled={syncing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50">
        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Refrescando…' : 'Refrescar'}
      </button>
    </div>
  )
}

function CodeAccordion() {
  const [open, setOpen] = useState(false)
  // Formato jerarquico: cada stage agrega un componente. "n" = variable (camada concreta puede tener 192 plantas).
  // Ejemplo 1: planta individual (hasta floracion). Ejemplo 2: cuadro/lote post-cosecha.
  const example = [
    { v: '25', l: 'Año', d: 'Año (2 dígitos)', c: 'primary' },
    { v: 'PMn', l: 'Planta madre', d: 'Grupo PM origen', c: 'gold' },
    { v: 'CLn', l: 'Clonación', d: 'Lote de esquejes', c: 'primary' },
    { v: 'Lin', l: 'Línea', d: 'Línea de cultivo', c: 'primary' },
    { v: 'VGn', l: 'Vegetativo', d: 'Planta (nº 001–192)', c: 'gold' },
    { v: 'SF2', l: 'Sala flora', d: 'Sala (SF1=COCO, SF2=RDWC)', c: 'gold' },
  ]
  const examplePost = [
    { v: '25', l: 'Año', d: 'Año (2 dígitos)', c: 'primary' },
    { v: 'PMn', l: 'Planta madre', d: 'Grupo PM origen', c: 'gold' },
    { v: 'CLn', l: 'Clonación', d: 'Lote de esquejes', c: 'primary' },
    { v: 'Lin', l: 'Línea', d: 'Línea de cultivo', c: 'primary' },
    { v: 'SF2', l: 'Sala flora', d: 'Sala donde florece', c: 'gold' },
    { v: 'CDSn', l: 'Cuadro secado', d: 'Cuadro / cámara', c: 'gold' },
  ]
  const exampleFracDep = [
    { v: 'ALM', l: 'Almacén', d: 'Lote almacén', c: 'primary' },
    { v: 'Cn', l: 'Camada', d: 'Identif. camada', c: 'gold' },
    { v: 'Sistema', l: 'Sistema', d: 'COCO o RDWC', c: 'primary' },
    { v: 'Bn', l: 'Bolsa', d: 'B01 a B69', c: 'gold' },
  ]
  const exampleFis = [
    { v: '25', l: 'Año', d: 'Año (2 dígitos)', c: 'primary' },
    { v: 'FIS', l: 'Depósito', d: 'FIS S.A.S.', c: 'primary' },
    { v: 'Bn', l: 'Bolsa', d: 'B01 a B69', c: 'gold' },
  ]
  // Patterns por stage (n = nº variable según la camada).
  // Hasta Trimming el código es jerárquico (hereda toda la cadena).
  // Después de Trimming los códigos CAMBIAN — Frac y Dep tienen su propia nomenclatura.
  const patterns = [
    { stage: 'Esquejado', code: '25.PMn.CLn' },
    { stage: 'Vegetativo', code: '25.PMn.CLn.Lin.VGn' },
    { stage: 'Floración', code: '25.PMn.CLn.Lin.VGn.SF2' },
    { stage: 'Cosecha', code: '25.PMn.CLn.Lin.VGn.SF2', note: 'sin traza nueva' },
    { stage: 'Secado', code: '25.PMn.CLn.Lin.SF2.CDSn' },
    { stage: 'Trimming', code: '25.PMn.CLn.Lin.SF2.CDSn', note: 'hereda del cuadro' },
    { stage: 'Fraccionamiento', code: 'ALM-Cn-Sistema-Bn', note: 'nuevo código' },
    { stage: 'Depósito final', code: '25.FIS.Bn', note: 'nuevo código' },
  ]
  const colorMap: Record<string, string> = {
    primary: 'bg-[#a3e635]/10 border-[#a3e635]/30 text-[#d9f99d]',
    gold: 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#c4b5fd]',
    ink: 'bg-[#1f1f2b] border-[#2a2a3a] text-[#d4d4dd]',
  }
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#15151d] transition-colors text-left">
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2, ease: EASE }} className="text-[#5c5c6b]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="m4.5 3 3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#a3e635]/10 border border-[#a3e635]/20">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 14 5v6l-6 3.5L2 11V5l6-3.5Z" stroke="#bef264" strokeWidth="1.2" strokeLinejoin="round" /><path d="M2 5l6 3.5m0 0L14 5M8 8.5v6" stroke="#bef264" strokeWidth="1.2" /></svg>
        </span>
        <span className="font-display font-semibold text-[14px] text-[#ececf1]">Tabla Maestra de Códigos</span>
        <span className="flex-1" />
        <span className="text-[12px] text-[#5c5c6b] hidden md:inline">Cómo se forman los códigos de trazabilidad</span>
      </button>
      <AnimatePresence initial={false}>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden border-t border-[#1f1f2b]">
          <div className="px-5 py-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-2 text-center">Planta individual · vegetativo y floración</div>
            <div className="flex justify-center mb-4">
              <div className="font-mono tabular-nums text-[13px] sm:text-[18px] tracking-tight flex items-baseline flex-wrap justify-center gap-y-1">
                {example.map((seg, i) => (
                  <span key={i} className="contents">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${colorMap[seg.c]}`}>{seg.v}</span>
                    {i < example.length - 1 && <span className="text-[#30303e] mx-1">.</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {example.map((seg, i) => (
                <div key={i} className="rounded-md bg-[#15151d] border border-[#20202c] px-3 py-3 flex flex-col items-center justify-between min-h-[78px]">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#46464f] font-medium text-center leading-tight">{seg.l}</div>
                  <div className={`my-1 font-mono font-semibold text-[12px] text-center ${colorMap[seg.c].split(' ')[2]}`}>{seg.v}</div>
                  <div className="text-[10px] text-[#757584] leading-tight text-center">{seg.d}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-2 text-center">Post-cosecha · cuadro de secado</div>
            <div className="flex justify-center mb-4">
              <div className="font-mono tabular-nums text-[13px] sm:text-[18px] tracking-tight flex items-baseline flex-wrap justify-center gap-y-1">
                {examplePost.map((seg, i) => (
                  <span key={i} className="contents">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${colorMap[seg.c]}`}>{seg.v}</span>
                    {i < examplePost.length - 1 && <span className="text-[#30303e] mx-1">.</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {examplePost.map((seg, i) => (
                <div key={i} className="rounded-md bg-[#15151d] border border-[#20202c] px-3 py-3 flex flex-col items-center justify-between min-h-[78px]">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#46464f] font-medium text-center leading-tight">{seg.l}</div>
                  <div className={`my-1 font-mono font-semibold text-[12px] text-center ${colorMap[seg.c].split(' ')[2]}`}>{seg.v}</div>
                  <div className="text-[10px] text-[#757584] leading-tight text-center">{seg.d}</div>
                </div>
              ))}
            </div>

            <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-2 text-center">Fraccionamiento · lote almacén + bolsas</div>
            <div className="flex justify-center mb-4">
              <div className="font-mono tabular-nums text-[13px] sm:text-[18px] tracking-tight flex items-baseline flex-wrap justify-center gap-y-1">
                {exampleFracDep.map((seg, i) => (
                  <span key={i} className="contents">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${colorMap[seg.c]}`}>{seg.v}</span>
                    {i < exampleFracDep.length - 1 && <span className="text-[#30303e] mx-1">-</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              {exampleFracDep.map((seg, i) => (
                <div key={i} className="rounded-md bg-[#15151d] border border-[#20202c] px-3 py-3 flex flex-col items-center justify-between min-h-[78px]">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#46464f] font-medium text-center leading-tight">{seg.l}</div>
                  <div className={`my-1 font-mono font-semibold text-[12px] text-center ${colorMap[seg.c].split(' ')[2]}`}>{seg.v}</div>
                  <div className="text-[10px] text-[#757584] leading-tight text-center">{seg.d}</div>
                </div>
              ))}
            </div>

            <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-2 text-center">Depósito final · bolsa comercial</div>
            <div className="flex justify-center mb-4">
              <div className="font-mono tabular-nums text-[13px] sm:text-[18px] tracking-tight flex items-baseline flex-wrap justify-center gap-y-1">
                {exampleFis.map((seg, i) => (
                  <span key={i} className="contents">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${colorMap[seg.c]}`}>{seg.v}</span>
                    {i < exampleFis.length - 1 && <span className="text-[#30303e] mx-1">.</span>}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {exampleFis.map((seg, i) => (
                <div key={i} className="rounded-md bg-[#15151d] border border-[#20202c] px-3 py-3 flex flex-col items-center justify-between min-h-[78px]">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#46464f] font-medium text-center leading-tight">{seg.l}</div>
                  <div className={`my-1 font-mono font-semibold text-[12px] text-center ${colorMap[seg.c].split(' ')[2]}`}>{seg.v}</div>
                  <div className="text-[10px] text-[#757584] leading-tight text-center">{seg.d}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-[#0a0a0f] border border-[#1f1f2b] p-4 mb-5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-3">Código por etapa del ciclo</div>
              <div className="flex flex-col gap-1.5">
                {patterns.map((p, i) => (
                  <div key={p.stage} className="flex items-baseline gap-3 py-0.5">
                    <span className="font-mono text-[#46464f] text-[11px] w-[18px] shrink-0 text-right">{i + 1}.</span>
                    <span className="text-[#a6a6b5] text-[12px] w-[140px] shrink-0">{p.stage}</span>
                    <span className="font-mono text-[#d9f99d] text-[11.5px] flex-1">{p.code}</span>
                    {p.note && <span className="text-[10px] text-[#5c5c6b] italic">{p.note}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#1f1f2b] space-y-5">
              {[
                {
                  titulo: 'Identificación de origen',
                  desc: 'Quedan fijos para todo el ciclo de la camada.',
                  items: [
                    ['25', 'Año de cosecha (2 últimos dígitos: 25 = 2025)'],
                    ['Ka', 'Cultivar PETE HOPE (genética única)'],
                    ['PMn', 'Grupo de planta madre origen (PM4, PM8…)'],
                    ['CLn', 'Lote de clonación / esqueje (CL7 = clonación de la camada 7)'],
                    ['Cn', 'Identificador de camada (C7, C9, C11, C12, C15, C16)'],
                  ],
                },
                {
                  titulo: 'Cultivo · vegetativo y floración',
                  desc: 'Cada planta se identifica individualmente. Floración agrega la sala donde florece.',
                  items: [
                    ['Lin', 'Línea de cultivo dentro de la sala (Li1, Li2…)'],
                    ['VGn', 'Planta vegetativa numerada del 001 al 192 por camada'],
                    ['SF1 / SFL1', 'Sala Flora 1 · sistema COCO'],
                    ['SF2 / SFL2', 'Sala Flora 2 · sistema RDWC'],
                  ],
                },
                {
                  titulo: 'Post-cosecha · trazabilidad por lote',
                  desc: 'La planta deja de identificarse individualmente y pasa a cuadro de secado, lote de trimming y bolsa.',
                  items: [
                    ['CDSn', 'Cuadro de secado / cámara (CDS08, CDS22…)'],
                    ['ALM-Cn-Sistema', 'Lote de fraccionamiento por camada (ej: ALM-C7-RDWC)'],
                    ['Bn', 'Bolsa individual con padding de 2 dígitos (B01, B02, …, B69)'],
                    ['FIS', 'Prefijo depósito final FIS S.A.S. (ej: 25.FIS.B01)'],
                  ],
                },
              ].map(g => (
                <div key={g.titulo}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mb-1">{g.titulo}</div>
                  <div className="text-[11px] text-[#757584] mb-2.5 leading-snug">{g.desc}</div>
                  <div className="flex flex-col gap-1.5">
                    {g.items.map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-3 py-0.5">
                        <span className="font-mono text-[#d9f99d] w-[140px] shrink-0 text-[11px]">{k}</span>
                        <span className="text-[#a6a6b5] text-[12px] leading-snug flex-1">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  )
}

function FilterTabs({ filter, setFilter, system, setSystem, counts }: { filter: 'todas' | 'proceso' | 'completadas'; setFilter: (v: 'todas' | 'proceso' | 'completadas') => void; system: 'todos' | 'RDWC' | 'COCO'; setSystem: (v: 'todos' | 'RDWC' | 'COCO') => void; counts: { todas: number; proceso: number; completadas: number } }) {
  const btn = (active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button onClick={onClick} className={['px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-colors', active ? 'bg-[#a3e635] text-[#07070b]' : 'text-[#8f8f9f] hover:text-[#ececf1]'].join(' ')}>{children}</button>
  )
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="inline-flex gap-1 p-1 rounded-lg bg-[#101016] border border-[#1f1f2b]">
        {btn(filter === 'todas', () => setFilter('todas'), <>Todas <span className={filter === 'todas' ? 'opacity-70' : 'text-[#46464f]'}>({counts.todas})</span></>)}
        {btn(filter === 'proceso', () => setFilter('proceso'), <>En proceso <span className={filter === 'proceso' ? 'opacity-70' : 'text-[#46464f]'}>({counts.proceso})</span></>)}
        {btn(filter === 'completadas', () => setFilter('completadas'), <>Completadas <span className={filter === 'completadas' ? 'opacity-70' : 'text-[#46464f]'}>({counts.completadas})</span></>)}
      </div>
      <div className="inline-flex gap-1 p-1 rounded-lg bg-[#101016] border border-[#1f1f2b]">
        {btn(system === 'todos', () => setSystem('todos'), 'Todos')}
        {btn(system === 'RDWC', () => setSystem('RDWC'), 'RDWC')}
        {btn(system === 'COCO', () => setSystem('COCO'), 'COCO')}
      </div>
    </div>
  )
}

function ChainCard({ chain, idx, selected, onSelect }: { chain: Chain; idx: number; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <motion.button type="button" onClick={() => onSelect(chain.id)}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.04 * idx }} whileHover={{ y: -2, transition: SPRING_HOVER }}
      className={['group relative text-left rounded-lg bg-[#15151d] border p-4 transition-colors',
        selected ? 'border-[#a3e635]/60 bg-[#13201b]' : 'border-[#20202c] hover:bg-[#1c1c27] hover:border-[#2b2b3a]',
        chain.completed ? 'ct-card-complete' : ''].join(' ')}>
      <div className="flex items-start gap-3">
        <CircleProgress current={chain.progress} total={chain.total} completed={chain.completed} size={54} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`font-display font-bold tracking-tight text-[17px] ${chain.completed ? 'text-[#c4b5fd]' : 'text-[#d9f99d]'}`}>{chain.id}</span>
          </div>
          <div className="mt-1">
            {chain.completed
              ? <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#7a5abf]/15 text-[#c9b7ff] border border-[#7a5abf]/30">Completada</span>
              : <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#a3e635]/15 text-[#d9f99d] border border-[#a3e635]/25">En proceso</span>}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#757584]">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.5C7 3 8 3.7 9.5 4 9.2 5.4 8.2 6.3 6 6.6M6 1.5C5 3 4 3.7 2.5 4c.3 1.4 1.3 2.3 3.5 2.6M6 1.5v9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" /></svg>
            <span className="text-[#8f8f9f]">{chain.system}</span>
          </div>
          {chain.completed && chain.yieldKg !== undefined && (
            <div className="mt-1 font-mono tabular-nums text-[11px] text-[#c4b5fd]">{chain.yieldKg.toFixed(2)}kg</div>
          )}
        </div>
      </div>
    </motion.button>
  )
}

function TimelineNode({ stage, idx, isLast, onClick }: { stage: Stage; idx: number; isLast: boolean; onClick?: (s: Stage) => void }) {
  const stageLabel = STAGE_LABELS[stage.n - 1]
  const num = String(stage.n).padStart(2, '0')
  const isDone = stage.state === 'done'
  const isActive = stage.state === 'active'
  const isPending = stage.state === 'pending'
  const clickable = !isPending && onClick
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: 0.04 * idx }}
      onClick={() => clickable && onClick!(stage)}
      className={`relative grid grid-cols-[36px_1fr_auto] gap-4 items-start pb-4 last:pb-0 ${clickable ? 'cursor-pointer hover:bg-[#15151d]/60 -mx-3 px-3 rounded-md transition-colors' : ''}`}>
      {!isLast && <span className={`absolute left-[17px] top-[22px] bottom-0 w-px ${isDone || isActive ? 'bg-[#a3e635]/30' : 'bg-[#1f1f2b]'}`} />}
      <div className="relative flex items-center justify-center h-[22px] w-[36px]">
        {isActive ? (<>
          <span className="relative z-10 w-[11px] h-[11px] rounded-full bg-[#bef264]" style={{ boxShadow: '0 0 10px rgba(107,207,142,0.7)' }} />
          <span className="absolute inset-0 m-auto w-[11px] h-[11px] rounded-full ring-2 ring-[#a3e635]/30 ring-offset-2 ring-offset-[#0a0a0f] animate-[ct-pulse_2.2s_ease-in-out_infinite]" />
        </>) : isDone
          ? <span className="w-[9px] h-[9px] rounded-full bg-[#bef264]/80 border-2 border-[#0a0a0f]" />
          : <span className="w-[7px] h-[7px] rounded-full bg-[#1f1f2b] border border-[#2a2a3a]" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums text-[10.5px] text-[#46464f]">{num}</span>
          <h4 className={`font-display font-semibold text-[13.5px] ${isPending ? 'text-[#46464f]' : 'text-[#ececf1]'}`}>{stageLabel}</h4>
          {isActive && <Pill tone="primary">en curso</Pill>}
          {clickable && <span className="text-[9px] text-[#46464f] uppercase tracking-widest ml-1">click ver detalle</span>}
        </div>
        {stage.code ? <div className="mt-1"><LotCode code={stage.code} /></div> : <div className="mt-1 text-[11px] text-[#30303e]">sin registro</div>}
        {stage.detail && <div className="mt-1 text-[11.5px] text-[#757584]">{stage.detail}</div>}
        {stage.range && <div className="mt-1 font-mono tabular-nums text-[10.5px] text-[#46464f]">{stage.range}</div>}
      </div>
      <div className="pt-0.5">{stage.days != null && stage.state !== 'pending' && <DurationPill days={stage.days} />}</div>
    </motion.li>
  )
}

function StageDetailModal({ stage, chain, onClose }: { stage: Stage | null; chain: Chain | undefined; onClose: () => void }) {
  if (!stage || !chain) return null
  const stageLabel = STAGE_LABELS[stage.n - 1]
  const meta = stage.meta || {}
  const num = String(stage.n).padStart(2, '0')

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="bg-[#101016] border-t sm:border border-[#1f1f2b] rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-3xl w-full h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}>
          <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-[#1f1f2b] bg-[#15151d] relative">
            {/* Drag handle visible solo mobile */}
            <div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#2a2a3a]" />
            {/* Botón cerrar en mobile (touch target grande) */}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="sm:hidden absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-[#0a0a0f] border border-[#1f1f2b] text-[#8f8f9f] active:bg-[#1c1c27]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap pr-10 sm:pr-0 mt-1.5 sm:mt-0">
              <span className="font-mono tabular-nums text-[10.5px] sm:text-[11px] text-[#46464f]">STAGE {num}</span>
              <h3 className="font-display font-bold text-[17px] sm:text-[20px] text-[#ececf1]">{stageLabel}</h3>
              <Pill tone={stage.state === 'done' ? 'gold' : stage.state === 'active' ? 'primary' : 'neutral'}>{stage.state === 'done' ? 'completada' : stage.state === 'active' ? 'en curso' : 'pendiente'}</Pill>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[11.5px] sm:text-[12px] text-[#8f8f9f]">
              Camada <span className="text-[#d9f99d] font-semibold">{chain.id}</span> · {chain.roomLabel} · <span className="hidden xs:inline">{chain.genetic}</span><span className="xs:hidden">{chain.genetic.split(' ')[0]}</span>
            </div>
            {stage.code && <div className="mt-2.5 sm:mt-3"><LotCode code={stage.code} size="md" /></div>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 ct-page-scroll">
            {/* Resumen general */}
            <section>
              <Label tone="primary">Resumen</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {stage.range && <KV label="Rango fechas" value={stage.range} mono />}
                {stage.days != null && <KV label="Duración" value={`${stage.days} días`} />}
                {stage.detail && <KV label="Detalle" value={stage.detail} />}
                {meta.cod && <KV label="Código principal" value={meta.cod} mono />}
              </div>
            </section>

            {/* Por tipo de stage */}
            {meta.tipo === 'planta_madre' && (
              <section>
                <Label tone="gold">Planta Madre origen</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Código PM" value={meta.cod || '—'} mono />
                  <KV label="Madre anterior" value={meta.madreOrigen || '—'} mono />
                  <KV label="Sistema PM" value={meta.traza?.sistema || chain.system} />
                  <KV label="Variedad" value={chain.genetic} />
                  {meta.fechaIngreso && <KV label="Fecha ingreso PM" value={meta.fechaIngreso} mono />}
                  {meta.fechaClonacion && <KV label={`Fecha clonación a C${chain.id.replace(/^C/i, '')}`} value={meta.fechaClonacion} mono />}
                </div>
                <div className="mt-3 text-[11px] text-[#5c5c6b] italic">
                  Nota: la planta madre <span className="font-mono text-[#b3b3c0]">{meta.cod}</span> sigue activa después de clonar a esta camada. Otras camadas también derivan de ella.
                </div>
              </section>
            )}

            {meta.tipo === 'esquejado' && (
              <section>
                <Label tone="gold">Esquejado / Clonación</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Lote" value={meta.lote?.codigo_lote || '—'} mono />
                  <KV label="Esquejes obtenidos" value={meta.lote?.cantidad ? Number(meta.lote.cantidad).toLocaleString('es-AR') : '—'} />
                  <KV label="Códigos de clonación" value={String(meta.trazas?.length || 0)} />
                </div>
              </section>
            )}

            {(meta.tipo === 'vegetativa' || meta.tipo === 'floracion') && (
              <>
                {meta.codigosFmt && (
                  <section>
                    <Label tone="gold">Serie de códigos · {meta.codigosFmt.count} plantas individuales</Label>
                    <div className="mt-2 px-3 py-2 rounded-md bg-[#15151d] border border-[#1f1f2b] font-mono text-[11px] text-[#d4d4dd]">
                      <div className="text-[#d9f99d]">{meta.codigosFmt.first}</div>
                      {meta.codigosFmt.last && (
                        <>
                          <div className="text-[#5c5c6b] my-0.5">↓ <span className="not-italic text-[#46464f]">+{Math.max(0, meta.codigosFmt.count - 2)} códigos intermedios</span></div>
                          <div className="text-[#c4b5fd]">{meta.codigosFmt.last}</div>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-[#5c5c6b]">
                      {meta.tipo === 'vegetativa'
                        ? 'Cada planta vegetativa hereda el código jerárquico Año.PM.CL.Línea y suma su número de posición VG.'
                        : 'En floración se agrega el sufijo .SF{n} indicando la sala donde florece, manteniendo el VG{n} de la planta.'}
                    </div>
                  </section>
                )}
                {meta.lote && (
                  <section>
                    <Label tone="gold">Lote agregado</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <KV label="Código lote" value={meta.lote.codigo_lote} mono />
                      <KV label="Plantas" value={Number(meta.lote.cantidad || 0).toLocaleString('es-AR')} />
                      <KV label="Sistema" value={chain.system} />
                    </div>
                  </section>
                )}
                {meta.ambientales?.length > 0 && (
                  <section>
                    <Label tone="primary">Mediciones ambientales · {meta.ambientales.length} registros</Label>
                    <AmbientalesSummary ambs={meta.ambientales} />
                  </section>
                )}
              </>
            )}

            {meta.tipo === 'cosecha' && (
              <section>
                <Label tone="gold">Datos de cosecha</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Plantas cosechadas" value={String(meta.plantasCosechadas || meta.trazas?.length || '—')} />
                  <KV label="Genética" value={meta.cosechaReal?.genetica || chain.genetic} />
                  <KV label="Sistema" value={chain.system} />
                  {meta.cosechaReal?.responsable && <KV label="Responsable" value={meta.cosechaReal.responsable} />}
                  {meta.cosechaReal?.cumple_bpa && <KV label="Cumple BPA" value={meta.cosechaReal.cumple_bpa} />}
                </div>
                <div className="mt-2 text-[11px] text-[#5c5c6b]">Cosecha no genera traza nueva: las plantas mantienen su código de floración.</div>
              </section>
            )}

            {meta.tipo === 'secado' && (
              <section>
                <Label tone="gold">Cuadros de secado</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Cuadros de secado" value={String(meta.cuadros?.length || 0)} />
                  <KV label="Plantas en secado" value={String(meta.trazas?.length || 0)} />
                  <KV label="Recepciones secado" value={String(meta.recepciones?.length || 0)} />
                </div>
                {meta.cuadros?.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] font-mono text-[#b3b3c0]">
                    {meta.cuadros.slice(0, 12).map((c: any) => <div key={c.id} className="px-2 py-1 bg-[#15151d] rounded border border-[#1f1f2b]">{c.codigo_lote}</div>)}
                  </div>
                )}
              </section>
            )}

            {meta.tipo === 'trimming' && (
              <section>
                <Label tone="gold">Trimming</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Lotes trim" value={String(meta.lotes?.length || 0)} />
                  <KV label="Total g (peso post-trim)" value={meta.lotes ? meta.lotes.reduce((a: number, l: any) => a + (Number(l.cantidad) || 0), 0).toLocaleString('es-AR') : '—'} />
                  <KV label="Códigos trimeo" value={String(meta.trazas?.length || 0)} />
                </div>
                {meta.lotes?.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] font-mono text-[#b3b3c0]">
                    {meta.lotes.slice(0, 12).map((l: any) => <div key={l.id} className="px-2 py-1 bg-[#15151d] rounded border border-[#1f1f2b] flex justify-between"><span>{l.codigo_lote}</span><span className="text-[#c4b5fd]">{Number(l.cantidad || 0).toLocaleString('es-AR')} g</span></div>)}
                  </div>
                )}
              </section>
            )}

            {meta.tipo === 'cuarentena' && (
              <section>
                <Label tone="gold">Cuarentena · Análisis Lab</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Total muestras LAB" value={String(meta.calidad?.length || 0)} />
                  <KV label="Cantidad en cuarentena" value={meta.totalG ? `${meta.totalG.toLocaleString('es-AR')} g` : '—'} />
                  <KV label="Bolsas resultantes" value={String(meta.bolsas || 0)} />
                </div>
                {meta.calidad?.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-[11px] text-[#b3b3c0]">
                    {meta.calidad.slice(0, 8).map((c: any) => (
                      <div key={c.id} className="px-2 py-1.5 bg-[#15151d] rounded border border-[#1f1f2b]">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[#d9f99d]">{c.numero_certificado || c.tipo}</span>
                          <span className="font-mono text-[10px] text-[#5c5c6b]">{c.fecha}</span>
                          {c.resultado && <Pill tone={c.resultado === 'aprobado' ? 'ok' : 'warn'}>{c.resultado}</Pill>}
                        </div>
                        {c.datos_extra?.lote_codigo && <div className="mt-0.5 font-mono text-[10px] text-[#5c5c6b]">lote: {c.datos_extra.lote_codigo}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {meta.tipo === 'fraccionamiento' && (
              <section>
                <Label tone="gold">Almacenamiento · Fraccionamiento</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Lote almacén" value={meta.lote?.codigo_lote || '—'} mono />
                  <KV label="Total g" value={meta.totalG ? meta.totalG.toLocaleString('es-AR') : '—'} />
                  <KV label="Bolsas (~400g c/u)" value={String(meta.bolsas || 0)} />
                </div>
              </section>
            )}

            {meta.tipo === 'deposito' && (
              <section>
                <Label tone="gold">Depósito Final · Códigos comerciales</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <KV label="Bolsas comerciales" value={String(meta.bolsas || meta.trazas?.length || 0)} />
                  <KV label="Total g" value={meta.totalG ? meta.totalG.toLocaleString('es-AR') : '—'} />
                  <KV label="Lote almacén" value={meta.lote?.codigo_lote || '—'} mono />
                </div>
                {meta.trazas?.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] font-mono text-[#b3b3c0]">
                    {meta.trazas.slice(0, 12).map((t: any) => <div key={t.id} className="px-2 py-1 bg-[#15151d] rounded border border-[#1f1f2b]">{t.cod_comercial}</div>)}
                    {meta.trazas.length > 12 && <div className="px-2 py-1 text-[#5c5c6b] italic">...y {meta.trazas.length - 12} más</div>}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="px-6 py-3 border-t border-[#1f1f2b] bg-[#15151d] flex items-center justify-between">
            <div className="text-[10.5px] text-[#5c5c6b] font-mono">Stage {num} · {stageLabel}</div>
            <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-[#1f1f2b] text-[12px] text-[#d4d4dd] hover:bg-[#1c1c27]">Cerrar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function KV({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-[#5c5c6b]">{label}</div>
      <div className={`mt-0.5 text-[12.5px] text-[#ececf1] ${mono ? 'font-mono tabular-nums' : ''}`}>{value ?? '—'}</div>
    </div>
  )
}

function AmbientalesSummary({ ambs }: { ambs: any[] }) {
  const stat = (key: string) => {
    const vals = ambs.map(a => +a[key]).filter(v => Number.isFinite(v))
    if (!vals.length) return null
    const min = Math.min(...vals), max = Math.max(...vals), avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return { min: min.toFixed(1), max: max.toFixed(1), avg: avg.toFixed(1) }
  }
  const fields = [
    { key: 'temperatura', label: 'Temperatura', unit: '°C' },
    { key: 'humedad', label: 'Humedad', unit: '%' },
    { key: 'temp_h2o', label: 'Temp H₂O', unit: '°C' },
    { key: 'ec', label: 'EC', unit: 'mS' },
    { key: 'ph_inicial', label: 'pH', unit: '' },
    { key: 'vpd_kpa', label: 'VPD', unit: 'kPa' },
    { key: 'co2_ppm', label: 'CO₂', unit: 'ppm' },
  ]
  const stats = fields.map(f => ({ ...f, ...stat(f.key) })).filter(f => f.avg)
  return (
    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.key} className="px-3 py-2 rounded-md bg-[#15151d] border border-[#1f1f2b]">
          <div className="text-[9.5px] uppercase tracking-widest text-[#5c5c6b]">{s.label}</div>
          <div className="mt-0.5 font-mono tabular-nums text-[11.5px]">
            <span className="text-[#c4b5fd] font-semibold">{s.avg}</span><span className="text-[#5c5c6b]"> {s.unit}</span>
          </div>
          <div className="text-[9.5px] font-mono tabular-nums text-[#5c5c6b]">{s.min} – {s.max}</div>
        </div>
      ))}
    </div>
  )
}

function DetailPanel({ chain, onStageClick }: { chain: Chain | undefined; onStageClick?: (s: Stage) => void }) {
  if (!chain) return null
  const totalDays = chain.stages.filter(s => s.days && s.state !== 'pending').reduce((a, s) => a + (s.days || 0), 0)
  return (
    <motion.div key={chain.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }} className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1f1f2b]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Pill tone={chain.system === 'RDWC' ? 'primary' : 'neutral'}>{chain.system} · {chain.roomLabel}</Pill>
              <Pill tone={chain.completed ? 'gold' : 'ok'}>{chain.status}</Pill>
              {chain.note && <Pill tone="warn">{chain.note}</Pill>}
            </div>
            <h2 className="font-display font-bold tracking-tight text-[22px] text-[#ececf1] leading-none">
              Camada <span className="text-[#d9f99d]">{chain.id}</span><span className="text-[#46464f] font-medium ml-1.5">· {chain.system}</span>
            </h2>
            <div className="mt-1.5 text-[12px] text-[#757584]">
              <span className="text-[#b3b3c0]">{chain.genetic}</span>
              {chain.start && (
                <> · <span className="font-mono tabular-nums text-[#b3b3c0]">{chain.start}</span>
                  {chain.end && chain.end !== chain.start
                    ? <> → <span className="font-mono tabular-nums text-[#b3b3c0]">{chain.end}</span></>
                    : (chain.completed ? null : <span className="text-[#5c5c6b]"> → vigente</span>)}
                </>
              )}
              {' · '}<span>{totalDays}d totales</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <Label>CUMCS</Label>
            <div className="mt-0.5 font-mono tabular-nums text-[12px] text-[#b3b3c0]">{chain.code}</div>
          </div>
        </div>
        <div className="mt-3"><ProgressBar current={chain.progress} total={chain.total} completed={chain.completed} /></div>
      </div>
      <div className="px-5 py-4 space-y-4">
        <SnapshotPanel camada={chain.id} />
        <ol className="relative">{chain.stages.map((s, i) => <TimelineNode key={s.n} stage={s} idx={i} isLast={i === chain.stages.length - 1} onClick={onStageClick} />)}</ol>
      </div>
    </motion.div>
  )
}

function ComparisonPanel({ chains }: { chains: Chain[] }) {
  const completed = chains.filter(c => c.completed && c.yieldKg !== undefined).sort((a, b) => a.start.localeCompare(b.start))
  if (completed.length === 0) return null
  const maxY = Math.max(...completed.map(c => c.yieldKg || 0))
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1f1f2b] flex items-baseline justify-between">
        <div>
          <Label tone="primary">Comparación</Label>
          <div className="mt-0.5 font-display font-semibold text-[13.5px] text-[#ececf1]">Rendimiento histórico</div>
        </div>
        <span className="text-[10.5px] text-[#5c5c6b] font-mono">{completed.length} camadas</span>
      </div>
      <div className="p-5 space-y-4">
        {completed.map((c, i) => {
          const prev = i > 0 ? completed[i - 1] : null
          const delta = prev && prev.yieldKg ? (((c.yieldKg || 0) - prev.yieldKg) / prev.yieldKg * 100) : null
          const pct = ((c.yieldKg || 0) / maxY) * 100
          return (
            <div key={c.id}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-display font-semibold text-[12.5px] text-[#ececf1]">Camada {c.id}</span>
                <span className="font-mono tabular-nums text-[11.5px] text-[#c4b5fd] font-medium">{(c.yieldKg || 0).toFixed(1)}<span className="text-[#5c5c6b] text-[10px] ml-0.5">kg</span></span>
              </div>
              <div className="relative h-[6px] rounded-full bg-[#15151d] overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ ...SPRING_PROGRESS, delay: 0.2 + i * 0.05 }}
                  className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #a3e635, #c4b5fd)' }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10.5px]">
                <span className="text-[#5c5c6b] font-mono">{c.system} · {c.start.slice(0, 7)}</span>
                {delta !== null && (
                  <span className={`font-mono tabular-nums ${delta >= 0 ? 'text-[#bef264]' : 'text-[#e08282]'}`}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickStats({ chains }: { chains: Chain[] }) {
  const proceso = chains.filter(c => !c.completed).length
  const completadas = chains.filter(c => c.completed).length
  const ultima = [...chains].filter(c => c.completed).sort((a, b) => b.start.localeCompare(a.start))[0]
  const stockKg = chains.filter(c => c.completed).reduce((a, c) => a + (c.yieldKg || 0), 0)
  const totalLotes = chains.reduce((a, c) => a + c.stages.filter(s => s.state === 'done').length, 0)
  const compliance = Math.round((chains.reduce((a, c) => a + c.progress, 0) / (chains.length * 10)) * 100) || 0
  const items: { label: string; valueText?: string; value?: number; suffix?: string; hint: string; decimals?: number }[] = [
    { label: 'Cadenas activas', value: proceso, suffix: `/${chains.length}`, hint: `${proceso} en proceso` },
    { label: 'Lotes registrados', value: totalLotes, hint: 'todas las etapas reales' },
    { label: 'Última cosecha', valueText: ultima?.id || '—', hint: ultima?.start ? `${ultima.start}` : '—' },
    { label: 'Stock depósito', value: stockKg, suffix: ' kg', decimals: 1, hint: `${completadas} camadas liberadas` },
    { label: 'Compliance CUMCS', value: compliance, suffix: '%', hint: 'trazabilidad sale-to-seed' },
  ]
  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1f1f2b]">
        <Label tone="primary">KPIs · CUMCS</Label>
        <div className="mt-0.5 font-display font-semibold text-[13.5px] text-[#ececf1]">Vista general</div>
      </div>
      <div className="divide-y divide-[#1f1f2b]">
        {items.map((k, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#46464f] font-medium">{k.label}</div>
              <div className="mt-0.5 text-[11px] text-[#757584]">{k.hint}</div>
            </div>
            <div className="font-display font-bold tracking-tight text-[20px] text-[#ececf1] leading-none text-right shrink-0">
              {k.valueText !== undefined ? <span>{k.valueText}</span> : <><CountUp to={k.value || 0} decimals={k.decimals || 0} />{k.suffix && <span className="text-[#5c5c6b] font-medium text-[13px]">{k.suffix}</span>}</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function PaginaTrazabilidad() {
  const [lotes, setLotes] = useState<any[]>([])
  const [cosechas, setCosechas] = useState<any[]>([])
  const [trazaPM, setTrazaPM] = useState<any[]>([])
  const [ambientales, setAmbientales] = useState<any[]>([])
  const [calidad, setCalidad] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<'todas' | 'proceso' | 'completadas'>('todas')
  const [system, setSystem] = useState<'todos' | 'RDWC' | 'COCO'>('todos')
  const [nuevaOpen, setNuevaOpen] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      // Helper paginacion (Supabase REST limita a 1000 filas por request)
      async function fetchAll(table: string, columns: string = '*', maxPages: number = 10): Promise<any[]> {
        const out: any[] = []
        for (let page = 0; page < maxPages; page++) {
          const from = page * 1000
          const { data, error } = await supabase.from(table).select(columns).range(from, from + 999)
          if (error || !data || data.length === 0) break
          out.push(...data)
          if (data.length < 1000) break
        }
        return out
      }

      const [lotesRes, cosRes, pmRes, ambRes, calRes] = await Promise.all([
        stockService.getLotes(),
        fetchAll('registros_cosecha', '*', 5),
        fetchAll('registros_trazabilidad', '*', 10),  // ~6.5K filas reales
        fetchAll('registros_condiciones_ambientales', 'camada,sistema,fecha,temperatura,humedad,vpd_kpa,co2_ppm,etapa,tipo,ph_inicial,ec,temp_h2o', 5),
        fetchAll('registros_calidad', 'id,tipo,fecha,datos_extra,resultado,numero_certificado', 3),
      ])
      setLotes(lotesRes || [])
      setCosechas(cosRes)
      setTrazaPM(pmRes)
      setAmbientales(ambRes)
      setCalidad(calRes)
    } finally { setLoading(false) }
  }
  useEffect(() => { void cargar() }, [])

  const chains = useMemo(
    () => construirChains(lotes, cosechas, trazaPM, ambientales, calidad),
    [lotes, cosechas, trazaPM, ambientales, calidad]
  )
  const counts = useMemo(() => ({
    todas: chains.length,
    proceso: chains.filter(c => !c.completed).length,
    completadas: chains.filter(c => c.completed).length,
  }), [chains])
  const filtered = useMemo(() => chains.filter(c => {
    if (filter === 'proceso' && c.completed) return false
    if (filter === 'completadas' && !c.completed) return false
    if (system !== 'todos' && c.system !== system) return false
    return true
  }), [chains, filter, system])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageDetalle, setStageDetalle] = useState<Stage | null>(null)
  useEffect(() => {
    if (chains.length > 0 && (!selectedId || !chains.some(c => c.id === selectedId))) {
      setSelectedId(chains[0].id)
    }
  }, [chains, selectedId])
  const selected = chains.find(c => c.id === selectedId)

  async function handleSync() {
    setSyncing(true)
    try { await cargar() } finally { setSyncing(false) }
  }
  async function handleExport() {
    setExporting(true)
    try { await exportOpenTHC(lotes) } catch { /* silencioso */ } finally { setExporting(false) }
  }

  return (
    <>
      {/* Estilos custom (handoff Claude Design v2 — animaciones + scrollbars sutiles) */}
      <style>{`
        @keyframes ct-bar-shimmer { 0%{transform:translateX(-100%);opacity:0} 30%{opacity:.6} 70%{opacity:.6} 100%{transform:translateX(100%);opacity:0} }
        .ct-bar-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%); animation: ct-bar-shimmer 2.8s ease-in-out infinite; }
        @keyframes ct-pulse { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
        .ct-card-complete { position: relative; }
        .ct-card-complete::before { content:""; position:absolute; left:12px; right:12px; top:0; height:1px;
          background: linear-gradient(90deg, transparent 0%, rgba(63,176,116,0) 8%, rgba(196,154,44,.55) 45%, rgba(227,185,74,.9) 50%, rgba(196,154,44,.55) 55%, rgba(63,176,116,0) 92%, transparent 100%);
          pointer-events: none; }

        /* Scrollbars sutiles del diseño v2 */
        .ct-page-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color 0.2s ease; }
        .ct-page-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .ct-page-scroll::-webkit-scrollbar-track { background: transparent; }
        .ct-page-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 6px; border: 2px solid transparent; transition: background 0.2s ease; }
        .ct-page-scroll:hover { scrollbar-color: #2a2a3a transparent; }
        .ct-page-scroll:hover::-webkit-scrollbar-thumb { background: #1f1f2b; border-color: #0a0a0f; }
        .ct-page-scroll:hover::-webkit-scrollbar-thumb:hover { background: #2a2a3a; }
      `}</style>
      <div className="flex-1 overflow-y-auto ct-page-scroll bg-[#0a0a0f] text-[#d4d4dd] font-sans">
        <TopBar totalChains={chains.length} />
        <div className="px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4 pb-20">
          <EstadoBar activas={counts.proceso} total={counts.todas} onSync={handleSync} onExport={handleExport} syncing={syncing} exporting={exporting} onNueva={() => setNuevaOpen(true)} />
          <CodeAccordion />
          <FilterTabs filter={filter} setFilter={setFilter} system={system} setSystem={setSystem} counts={counts} />

          {loading ? (
            <TrazabilidadCardsSkeleton />
          ) : chains.length === 0 ? (
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] py-4">
              <EmptyState
                icon={Sprout}
                titulo="Aún no hay cadenas seed-to-sale"
                descripcion="Empezá creando un lote raíz (planta madre) para que la trazabilidad arranque."
                action={
                  <button
                    onClick={() => setNuevaOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-700 hover:bg-primary-800 text-white text-[12.5px] font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> Crear cadena
                  </button>
                }
                secondaryAction={
                  <Link
                    to="/importador"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#20202c] bg-[#15151d] hover:bg-[#1c1c27] text-[#d4d4dd] text-[12.5px] font-medium transition-colors">
                    <Upload className="w-4 h-4" /> Importar Excel
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {filtered.map((c, i) => (
                    <ChainCard key={c.id} chain={c} idx={i} selected={c.id === selectedId} onSelect={setSelectedId} />
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-[#20202c] bg-[#15151d]/50 px-6 py-10 text-center">
                      <div className="mx-auto w-9 h-9 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-2">
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.2" className="text-[#5c5c6b]" /></svg>
                      </div>
                      <div className="font-display font-semibold text-[#d4d4dd] text-[13px]">Sin cadenas</div>
                      <div className="mt-0.5 text-[11px] text-[#5c5c6b]">Ajustá los filtros.</div>
                    </div>
                  )}
                </div>
                <DetailPanel chain={selected} onStageClick={(s) => setStageDetalle(s)} />
              </div>
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <QuickStats chains={chains} />
                <ComparisonPanel chains={chains} />
              </div>
            </div>
          )}

          <footer className="pt-6 mt-2 border-t border-[#1f1f2b] text-[11px] text-[#5c5c6b] flex items-center justify-between flex-wrap gap-2">
            <div>Trazabilidad sale-to-seed · firma electrónica + audit trail · <span className="font-mono">CannTrace · FIS S.A.S.</span></div>
            <div className="font-mono tabular-nums">{new Date().toLocaleDateString('es-AR')} · {new Date().toLocaleTimeString('es-AR')}</div>
          </footer>
        </div>
        {/* Modal stage detalle */}
        <StageDetailModal stage={stageDetalle} chain={selected} onClose={() => setStageDetalle(null)} />
        {/* Drawer Nueva cadena */}
        <NuevaCadenaDrawer
          open={nuevaOpen}
          onOpenChange={setNuevaOpen}
          onCreated={() => { setNuevaOpen(false); void cargar() }}
        />
      </div>
    </>
  )
}

// ─── Drawer · Crear nueva cadena (planta madre raíz) ───────────────────────
const nuevaCadenaSchema = z.object({
  codigo_lote: z.string().trim().min(3, 'Código mínimo 3 caracteres').max(120),
  variedad_id: z.string().min(1, 'Seleccioná una variedad'),
  instalacion_id: z.string().min(1, 'Seleccioná una instalación'),
  fecha_inicio: z.string().min(1, 'Fecha requerida'),
  notas: z.string().max(2000).optional().or(z.literal('')),
})
type NuevaCadenaInput = z.infer<typeof nuevaCadenaSchema>

function NuevaCadenaDrawer({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [variedades, setVariedades] = useState<Array<{ id: string; nombre: string }>>([])
  const [instalaciones, setInstalaciones] = useState<Array<{ id: string; nombre: string; tipo?: string }>>([])
  const [lotesAuto, setLotesAuto] = useState<Array<{ codigo_lote: string }>>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<NuevaCadenaInput>({
    resolver: zodResolver(nuevaCadenaSchema),
    defaultValues: {
      codigo_lote: '',
      variedad_id: '',
      instalacion_id: '',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      notas: '',
    },
  })

  const codigoActual = watch('codigo_lote')

  useEffect(() => {
    if (!open) return
    setCargandoCatalogo(true)
    Promise.all([
      catalogoService.getVariedades().catch(() => []),
      catalogoService.getInstalaciones().catch(() => []),
      supabase.from('lotes').select('codigo_lote').eq('eliminado', false).order('creado_en', { ascending: false }).limit(200),
    ]).then(([vars, insts, lts]) => {
      setVariedades((vars || []) as Array<{ id: string; nombre: string }>)
      setInstalaciones((insts || []) as Array<{ id: string; nombre: string; tipo?: string }>)
      setLotesAuto(((lts as { data: Array<{ codigo_lote: string }> | null }).data) || [])
    }).finally(() => setCargandoCatalogo(false))
  }, [open])

  useEffect(() => {
    if (open) reset({
      codigo_lote: '',
      variedad_id: '',
      instalacion_id: '',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      notas: '',
    })
  }, [open, reset])

  const sugerenciasLote = useMemo(() => {
    const q = (codigoActual || '').trim().toLowerCase()
    if (!q || q.length < 2) return []
    return lotesAuto.filter(l => l.codigo_lote?.toLowerCase().includes(q)).slice(0, 5)
  }, [codigoActual, lotesAuto])

  const onSubmit = async (data: NuevaCadenaInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No estás autenticado')
        return
      }
      // 1) Buscar o crear el lote raíz
      let { data: loteExistente } = await supabase
        .from('lotes')
        .select('id, codigo_lote')
        .eq('codigo_lote', data.codigo_lote)
        .eq('eliminado', false)
        .maybeSingle()

      let loteId = loteExistente?.id as string | undefined

      if (!loteId) {
        const { data: loteNuevo, error: errLote } = await supabase
          .from('lotes')
          .insert({
            codigo_lote: data.codigo_lote,
            variedad_id: data.variedad_id,
            instalacion_id: data.instalacion_id,
            estado: 'activo',
            cantidad: 1,
            datos_extra: { fuente: 'pagina_trazabilidad/nueva_cadena' },
          })
          .select('id')
          .single()
        if (errLote) throw new Error(errLote.message)
        loteId = loteNuevo?.id as string
      }

      // 2) Insertar operacion planta_madre confirmada
      const { error: errOp } = await supabase
        .from('operaciones')
        .insert({
          tipo_operacion: 'planta_madre',
          estado: 'confirmada',
          fecha_operacion: data.fecha_inicio,
          confirmado_en: new Date().toISOString(),
          confirmado_por: user.id,
          creado_por: user.id,
          lote_destino_id: loteId,
          instalacion_destino_id: data.instalacion_id,
          observaciones: data.notas || null,
          datos_extra: {
            variedad_id: data.variedad_id,
            via: 'pagina_trazabilidad/nueva_cadena',
          },
        })
      if (errOp) throw new Error(errOp.message)

      toast.success('Cadena creada', { description: `Lote raíz ${data.codigo_lote}` })
      onCreated()
    } catch (e) {
      toast.error('No se pudo crear la cadena', { description: (e as Error).message })
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed z-50 bg-[#101016] border-l border-[#1f1f2b] flex flex-col right-0 top-0 bottom-0 w-full sm:max-w-xl outline-none">
          <Drawer.Title className="sr-only">Nueva cadena seed-to-sale</Drawer.Title>
          <Drawer.Description className="sr-only">Crear lote raíz (planta madre) y registrar la operación inicial.</Drawer.Description>

          <div className="flex items-center justify-between p-5 border-b border-[#1f1f2b] sticky top-0 bg-[#101016] z-10">
            <div>
              <h3 className="font-display font-bold text-[16px] text-[#ececf1]">Nueva cadena</h3>
              <p className="text-[11.5px] text-[#5c5c6b] mt-0.5">Crear lote raíz (planta madre) e iniciar la trazabilidad.</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-md hover:bg-[#1c1c27] text-[#8f8f9f]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Código de lote */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#bef264] font-semibold mb-1.5">Código del lote raíz</label>
              <input
                {...register('codigo_lote')}
                placeholder="Ej: 26.PM10"
                autoComplete="off"
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-md text-[13px] font-mono tabular-nums text-[#ececf1] placeholder:text-[#46464f] focus:outline-none focus:border-[#a3e635]/60"
              />
              {sugerenciasLote.length > 0 && (
                <div className="mt-1.5 rounded-md border border-[#1f1f2b] bg-[#0a0a0f] divide-y divide-[#1f1f2b]">
                  {sugerenciasLote.map(s => (
                    <button
                      type="button"
                      key={s.codigo_lote}
                      onClick={() => setValue('codigo_lote', s.codigo_lote, { shouldValidate: true })}
                      className="w-full text-left px-3 py-1.5 text-[12px] font-mono text-[#d9f99d] hover:bg-[#15151d]"
                    >
                      {s.codigo_lote}
                    </button>
                  ))}
                </div>
              )}
              {errors.codigo_lote && <p className="mt-1 text-[11px] text-[#e08282]">{errors.codigo_lote.message}</p>}
            </div>

            {/* Variedad */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#bef264] font-semibold mb-1.5">Variedad</label>
              <Controller
                control={control}
                name="variedad_id"
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={cargandoCatalogo}
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-md text-[13px] text-[#ececf1] focus:outline-none focus:border-[#a3e635]/60 disabled:opacity-50"
                  >
                    <option value="">{cargandoCatalogo ? 'Cargando…' : 'Seleccioná variedad'}</option>
                    {variedades.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                  </select>
                )}
              />
              {errors.variedad_id && <p className="mt-1 text-[11px] text-[#e08282]">{errors.variedad_id.message}</p>}
            </div>

            {/* Instalacion */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#bef264] font-semibold mb-1.5">Instalación origen</label>
              <Controller
                control={control}
                name="instalacion_id"
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={cargandoCatalogo}
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-md text-[13px] text-[#ececf1] focus:outline-none focus:border-[#a3e635]/60 disabled:opacity-50"
                  >
                    <option value="">{cargandoCatalogo ? 'Cargando…' : 'Seleccioná instalación'}</option>
                    {instalaciones.map(i => <option key={i.id} value={i.id}>{i.nombre}{i.tipo ? ` · ${i.tipo}` : ''}</option>)}
                  </select>
                )}
              />
              {errors.instalacion_id && <p className="mt-1 text-[11px] text-[#e08282]">{errors.instalacion_id.message}</p>}
            </div>

            {/* Fecha inicio */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#bef264] font-semibold mb-1.5">Fecha de inicio</label>
              <input
                type="date"
                {...register('fecha_inicio')}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-md text-[13px] font-mono text-[#ececf1] focus:outline-none focus:border-[#a3e635]/60"
              />
              {errors.fecha_inicio && <p className="mt-1 text-[11px] text-[#e08282]">{errors.fecha_inicio.message}</p>}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[#bef264] font-semibold mb-1.5">Notas (opcional)</label>
              <textarea
                {...register('notas')}
                rows={3}
                placeholder="Origen genético, observaciones iniciales…"
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-md text-[13px] text-[#d4d4dd] placeholder:text-[#46464f] focus:outline-none focus:border-[#a3e635]/60 resize-none"
              />
              {errors.notas && <p className="mt-1 text-[11px] text-[#e08282]">{errors.notas.message}</p>}
            </div>
          </form>

          <div className="px-5 py-4 border-t border-[#1f1f2b] flex items-center gap-2 bg-[#101016]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="px-3 py-2 rounded-md border border-[#1f1f2b] bg-[#15151d] hover:bg-[#1c1c27] text-[12.5px] font-medium text-[#d4d4dd] disabled:opacity-50"
            >Cancelar</button>
            <div className="flex-1" />
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary-700 hover:bg-primary-800 text-white text-[12.5px] font-semibold disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear cadena
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
