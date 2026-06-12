// PaginaMapa — plano arquitectonico FIS estilo Trazabilidad dark.
// Inspirado en Mapa.html design file: layout SVG con cuadros armonicos
// en familia verde+dorado (no arcoiris), seleccion gold, KPIs por area.

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, MapPin, X, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const EASE = [0.22, 1, 0.36, 1] as const

type Datos = {
  instalaciones: Array<{ id: string; nombre: string; tipo: string; codigo: string; lotes_activos: number; total_unidades: number }>
  lotes_por_sistema: Array<{ sistema: string; camada: string; tipo_producto: string; total: number; unidades: number }>
}

type Area = {
  id: string
  nombre: string
  short: string
  x: number
  y: number
  w: number
  h: number
  // tono: "primary" verde / "gold" dorado / "muted" gris (opacities ajustadas para armonia)
  tono: 'primary' | 'primary-soft' | 'gold' | 'gold-soft' | 'muted'
  etapa?: string
  sistema?: 'COCO' | 'RDWC'
  cumcs?: string[]
}

// Plano armonico: todos los cuadros en familia verde+dorado+gris, diferenciacion por opacity/borde
const AREAS: Area[] = [
  // Fila superior — propagacion
  { id: 'madres',     nombre: 'Sala Madres',         short: 'PM',   x: 60,  y: 60,  w: 150, h: 90,  tono: 'primary-soft', etapa: 'planta_madre', cumcs: ['CM-RE-0101', 'CM-RE-0102', 'CM-RE-0201'] },
  { id: 'clonacion',  nombre: 'Aeroclonador',        short: 'CL',   x: 230, y: 60,  w: 150, h: 90,  tono: 'primary-soft', etapa: 'esqueje',      cumcs: ['CM-RE-0103', 'CM-RE-0202'] },
  { id: 'vegetativo', nombre: 'Sala Vegetativo',     short: 'VG',   x: 400, y: 60,  w: 200, h: 90,  tono: 'primary',      etapa: 'vegetativo',   cumcs: ['CM-RE-0104'] },
  // Fila central — floracion
  { id: 'sfl2',       nombre: 'Flora 2 · RDWC',      short: 'SFL2', x: 60,  y: 180, w: 260, h: 160, tono: 'gold',         sistema: 'RDWC', cumcs: ['CM-RE-0105', 'CM-RE-0203'] },
  { id: 'sfl1',       nombre: 'Flora 1 · COCO',      short: 'SFL1', x: 340, y: 180, w: 260, h: 160, tono: 'gold-soft',    sistema: 'COCO', cumcs: ['CM-RE-0105', 'CM-RE-0203'] },
  { id: 'qc',         nombre: 'Calidad · Lab',       short: 'QC',   x: 620, y: 180, w: 130, h: 160, tono: 'primary',      etapa: 'qc',           cumcs: ['CM-RE-0901', 'CM-RE-0902', 'CM-RE-0905'] },
  // Fila inferior — postcosecha
  { id: 'secado',     nombre: 'Cuadros Secado',      short: 'CDS',  x: 60,  y: 370, w: 200, h: 90,  tono: 'primary-soft', etapa: 'flor',         cumcs: ['CM-RE-0106', 'CM-RE-0204', 'CM-RE-0605'] },
  { id: 'trimming',   nombre: 'Area Trimming',       short: 'TR',   x: 280, y: 370, w: 170, h: 90,  tono: 'primary-soft', etapa: 'flor_trimmeada', cumcs: ['CM-RE-0205', 'CM-RE-0606'] },
  { id: 'cuarentena', nombre: 'Cuarentena',          short: 'CT',   x: 470, y: 370, w: 130, h: 90,  tono: 'gold',         etapa: 'cuarentena',   cumcs: ['CM-RE-0108', 'CM-RE-0607'] },
  { id: 'almacen',    nombre: 'Deposito Final',      short: 'AL',   x: 620, y: 370, w: 130, h: 90,  tono: 'gold-soft',    etapa: 'flor_fraccionada', cumcs: ['CM-RE-0107', 'CM-RE-0206', 'CM-RE-0608'] },
]

const TONOS: Record<Area['tono'], { fill: string; fillSel: string; stroke: string; strokeSel: string; text: string }> = {
  'primary':       { fill: 'rgba(63,176,116,0.10)',  fillSel: 'rgba(63,176,116,0.22)',  stroke: '#404d20', strokeSel: '#bef264', text: '#d9f99d' },
  'primary-soft':  { fill: 'rgba(63,176,116,0.05)',  fillSel: 'rgba(63,176,116,0.16)',  stroke: '#2a2a3a', strokeSel: '#bef264', text: '#d9f99d' },
  'gold':          { fill: 'rgba(196,154,44,0.10)',  fillSel: 'rgba(227,185,74,0.22)',  stroke: '#463a66', strokeSel: '#c4b5fd', text: '#c4b5fd' },
  'gold-soft':     { fill: 'rgba(196,154,44,0.05)',  fillSel: 'rgba(227,185,74,0.16)',  stroke: '#352b4d', strokeSel: '#c4b5fd', text: '#a78bfa' },
  'muted':         { fill: 'rgba(180,200,190,0.04)', fillSel: 'rgba(180,200,190,0.10)', stroke: '#1f1f2b', strokeSel: '#8f8f9f', text: '#8f8f9f' },
}

type Metricas = {
  madresActivas: number
  clonesActivos: number
  vegePlantas: number
  flora1Plantas: number
  flora2Plantas: number
  secadoCuadros: number
  cuarentenaLotes: number
  depositoCamadasNombres: string[]
}

export default function PaginaMapa() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [areaSel, setAreaSel] = useState<string | null>(null)
  const [metricas, setMetricas] = useState<Metricas | null>(null)

  useEffect(() => {
    supabase.rpc('mapa_instalaciones').then(({ data }) => { setDatos(data as Datos); setCargando(false) })
    cargarMetricas()
  }, [])

  async function cargarMetricas() {
    try {
      // Plantas madres activas (no eliminadas, fecha_baja vacia o "Vigentes")
      const pmRes = await supabase.from('registros_trazabilidad')
        .select('id, datos_extra')
        .eq('tipo', 'codigo_planta_madre')
      const madresActivas = (pmRes.data || []).filter(r => {
        if (r.datos_extra?.eliminada === true) return false
        const fb = r.datos_extra?.fecha_baja
        if (!fb || fb === 'Vigentes' || fb === '-') return true
        const fbDate = new Date(fb)
        return !isNaN(fbDate.getTime()) && fbDate > new Date()
      }).length

      // Lotes activos por tipo
      const lotesRes = await supabase.from('lotes').select('codigo_lote, cantidad, datos_extra, productos(tipo_producto)').limit(2000)
      const lotes: any[] = (lotesRes.data || []) as any[]

      // Camadas TERMINADAS = las que tienen flor_fraccionada (llegaron a deposito final).
      // Camadas EN PROCESO = todo lo demas (esos lotes son los que estan "vivos" hoy).
      const camadasTerminadas = new Set<string>(
        lotes.filter(l => l.productos?.tipo_producto === 'flor_fraccionada')
             .map(l => l.datos_extra?.camada).filter(Boolean) as string[]
      )
      const enProceso = (l: any) => {
        const c = l.datos_extra?.camada
        return c && !camadasTerminadas.has(c)
      }
      // Stage actual de cada camada en proceso: la etapa MAS AVANZADA en la que tiene lotes.
      // Orden: esqueje < planta(vege) < planta(flora) < flor(secado) < flor_trimmeada
      const stageRank = (l: any): number => {
        const t = l.productos?.tipo_producto
        if (t === 'esqueje') return 1
        if (t === 'planta') {
          if (l.datos_extra?.inicio_flora || l.codigo_lote?.startsWith('FLO')) return 3
          return 2
        }
        if (t === 'flor') return l.codigo_lote?.startsWith('COS-') ? 4 : 5  // 5 = cuadro de secado
        if (t === 'flor_trimmeada') return 6
        return 0
      }
      const stagesPorCamada = new Map<string, number>()
      for (const l of lotes.filter(enProceso)) {
        const c = l.datos_extra?.camada as string
        const r = stageRank(l)
        if (r > (stagesPorCamada.get(c) || 0)) stagesPorCamada.set(c, r)
      }
      // Solo el stage activo cuenta para sumar plantas (no acumular vege+flora si la camada ya esta en flora)
      const lotePerteneceStageActual = (l: any): boolean => {
        const c = l.datos_extra?.camada
        if (!c) return false
        const stageActual = stagesPorCamada.get(c)
        return stageRank(l) === stageActual
      }

      const clonesActivos = lotes.filter(l => l.productos?.tipo_producto === 'esqueje' && enProceso(l) && lotePerteneceStageActual(l)).length
      const vegePlantas = lotes
        .filter(l => l.productos?.tipo_producto === 'planta' && !l.datos_extra?.inicio_flora && !l.codigo_lote?.startsWith('FLO') && enProceso(l) && lotePerteneceStageActual(l))
        .reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
      const floraLotes = lotes.filter(l => l.productos?.tipo_producto === 'planta' && (l.datos_extra?.inicio_flora || l.codigo_lote?.startsWith('FLO')) && enProceso(l) && lotePerteneceStageActual(l))
      // Plantas en flora = total de esquejes de las camadas activas en flora (mas confiable que el lote planta).
      // Asi C15 muestra 420 (esquejes originales) en vez de 415 (registro flora).
      const camadasEnFloraCoco = new Set<string>(floraLotes.filter(l => l.datos_extra?.sistema === 'COCO').map(l => l.datos_extra?.camada).filter(Boolean) as string[])
      const camadasEnFloraRdwc = new Set<string>(floraLotes.filter(l => l.datos_extra?.sistema === 'RDWC').map(l => l.datos_extra?.camada).filter(Boolean) as string[])
      const sumEsquejes = (camSet: Set<string>) =>
        lotes.filter(l => l.productos?.tipo_producto === 'esqueje' && camSet.has(l.datos_extra?.camada))
             .reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
      const flora1Plantas = sumEsquejes(camadasEnFloraCoco)
        || floraLotes.filter(l => l.datos_extra?.sistema === 'COCO').reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
      const flora2Plantas = sumEsquejes(camadasEnFloraRdwc)
        || floraLotes.filter(l => l.datos_extra?.sistema === 'RDWC').reduce((a, l) => a + (Number(l.cantidad) || 0), 0)
      // Cuadros de secado: lotes flor (no COS-) de camadas en proceso cuyo stage actual sea secado o trimming
      const secadoCuadros = lotes.filter(l => {
        if (l.productos?.tipo_producto !== 'flor') return false
        if (l.codigo_lote?.startsWith('COS-')) return false
        if (!enProceso(l)) return false
        const stageActual = stagesPorCamada.get(l.datos_extra?.camada || '')
        return stageActual === 5 || stageActual === 6
      }).length

      const cuarentenaLotes = 0

      // Camadas en deposito final: nombres distintos (todas, porque son productos terminados que siguen en stock)
      const depositoLotes = lotes.filter(l => l.productos?.tipo_producto === 'flor_fraccionada')
      const camadasSet = new Set<string>(depositoLotes.map(l => l.datos_extra?.camada).filter(Boolean) as string[])
      const depositoCamadasNombres = Array.from(camadasSet).sort((a, b) => {
        const na = parseInt(a.replace(/[^\d]/g, ''), 10)
        const nb = parseInt(b.replace(/[^\d]/g, ''), 10)
        return na - nb
      })

      setMetricas({ madresActivas, clonesActivos, vegePlantas, flora1Plantas, flora2Plantas, secadoCuadros, cuarentenaLotes, depositoCamadasNombres })
    } catch (e) {
      console.error('Error cargando metricas mapa', e)
    }
  }

  const lotesEnArea = useMemo(() => (areaId: string): number => {
    if (!datos) return 0
    const area = AREAS.find(a => a.id === areaId)
    if (!area) return 0
    return datos.lotes_por_sistema.reduce((acc, l) => {
      if (area.sistema && l.sistema === area.sistema) return acc + (l.total || 0)
      if (area.etapa && l.tipo_producto === area.etapa) return acc + (l.total || 0)
      return acc
    }, 0)
  }, [datos])

  const detalleArea = useMemo(() => (areaId: string) => {
    if (!datos) return []
    const area = AREAS.find(a => a.id === areaId)
    if (!area) return []
    return datos.lotes_por_sistema.filter(l => {
      if (area.sistema) return l.sistema === area.sistema
      if (area.etapa) return l.tipo_producto === area.etapa
      return false
    })
  }, [datos])

  const totalLotes = datos?.lotes_por_sistema.reduce((s, l) => s + (l.total || 0), 0) || 0
  const totalUnidades = datos?.lotes_por_sistema.reduce((s, l) => s + (l.unidades || 0), 0) || 0
  const totalInstalaciones = datos?.instalaciones.length || 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Mapa de Instalaciones</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]"><span className="hidden sm:inline">Plano fisico FIS S.A.S. · </span>Clickea un area para ver lotes</div>
          </div>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
            Mapa interactivo
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-3 sm:py-5 pb-20 space-y-3 sm:space-y-4">
        {cargando && <div className="text-center py-12"><Loader2 className="w-10 h-10 text-[#bef264] animate-spin mx-auto" /></div>}

        {datos && (
          <>
            {/* KPI bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Areas', value: AREAS.length, hint: 'cuadros del plano', tone: 'primary' },
                { label: 'Lotes activos', value: totalLotes, hint: 'todos los sistemas', tone: 'primary' },
                { label: 'Unidades totales', value: totalUnidades.toLocaleString('es-AR'), hint: 'plantas + esquejes + flor', tone: 'primary' },
                { label: 'Instalaciones BD', value: totalInstalaciones, hint: 'fisicas registradas', tone: 'gold' },
              ].map((k, i) => (
                <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#46464f] font-medium">{k.label}</div>
                  <div className="mt-1 font-display font-bold tracking-tight text-[24px] text-[#ececf1] leading-none tabular-nums">{k.value}</div>
                  <div className="mt-1 text-[11px] text-[#757584]">{k.hint}</div>
                </div>
              ))}
            </div>

            {/* Plano */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5 overflow-x-auto">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[#bef264] font-medium">Plano arquitectonico</div>
                  <div className="mt-0.5 font-display font-semibold text-[14px] text-[#ececf1]">Indoor FIS · 9 areas operativas</div>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-[#5c5c6b]">
                  <MapPin className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Click en un area para detalle</span>
                </div>
              </div>

              <svg viewBox="0 0 800 530" className="w-full max-w-full" style={{ background: '#0a0a0f', borderRadius: 8 }}>
                {/* Marco exterior */}
                <rect x="20" y="20" width="760" height="490" fill="none" stroke="#1f1f2b" strokeWidth="1" strokeDasharray="6,4" rx="4" />
                {/* Etiqueta marco */}
                <text x="40" y="38" fill="#46464f" fontSize="10" letterSpacing="2" fontFamily="system-ui">FIS S.A.S. · ROSARIO · INDOOR PRINCIPAL</text>

                {/* Lineas guia tenues entre filas */}
                <line x1="40" y1="170" x2="760" y2="170" stroke="#1f1f2b" strokeWidth="1" strokeDasharray="2,4" />
                <line x1="40" y1="360" x2="760" y2="360" stroke="#1f1f2b" strokeWidth="1" strokeDasharray="2,4" />

                {/* Etiquetas de fila */}
                <text x="30" y="115" fill="#46464f" fontSize="9" letterSpacing="2" fontFamily="system-ui" transform="rotate(-90 30 115)">PROPAGACION</text>
                <text x="30" y="270" fill="#46464f" fontSize="9" letterSpacing="2" fontFamily="system-ui" transform="rotate(-90 30 270)">FLORACION</text>
                <text x="30" y="425" fill="#46464f" fontSize="9" letterSpacing="2" fontFamily="system-ui" transform="rotate(-90 30 425)">POSTCOSECHA</text>

                {AREAS.map(a => {
                  // Etiqueta por area: cada una usa su metrica especifica (no "lotes" generico).
                  // Caso especial almacen: muestra nombres de camadas (C7, C9, C12) en vez de count.
                  const labelTexto = (): { texto: string; resaltado: boolean } | null => {
                    if (!metricas) return null
                    const make = (v: number, u: string, vacio: string) => ({ texto: v > 0 ? `${v} ${u}` : vacio, resaltado: v > 0 })
                    switch (a.id) {
                      case 'madres':     return null  // Sin contador (la cantidad real no se conoce)
                      case 'clonacion':  return make(metricas.clonesActivos, 'lotes de clones', 'sin clones')
                      case 'vegetativo': return make(metricas.vegePlantas, 'plantas', 'sin plantas')
                      case 'sfl1':       return make(metricas.flora1Plantas, 'plantas', 'sin plantas')
                      case 'sfl2':       return make(metricas.flora2Plantas, 'plantas', 'sin plantas')
                      case 'secado':     return make(metricas.secadoCuadros, 'cuadros', 'sin cuadros')
                      case 'trimming':   return null
                      case 'cuarentena': return make(lotesEnArea(a.id), 'lotes', 'sin lotes')
                      case 'almacen': {
                        const ns = metricas.depositoCamadasNombres
                        if (ns.length === 0) return { texto: 'sin camadas', resaltado: false }
                        // Si hay muchos nombres, abreviar
                        const txt = ns.length <= 4 ? ns.join(', ') : `${ns.slice(0, 3).join(', ')} +${ns.length - 3}`
                        return { texto: txt, resaltado: true }
                      }
                      default:           return make(lotesEnArea(a.id), 'lotes', 'sin lotes')
                    }
                  }
                  const m = labelTexto()
                  const isSel = areaSel === a.id
                  const t = TONOS[a.tono]
                  return (
                    <g key={a.id} onClick={() => setAreaSel(isSel ? null : a.id)} style={{ cursor: 'pointer' }}>
                      <rect x={a.x} y={a.y} width={a.w} height={a.h}
                        fill={isSel ? t.fillSel : t.fill}
                        stroke={isSel ? t.strokeSel : t.stroke} strokeWidth={isSel ? 1.5 : 1} rx="6" />
                      {/* badge codigo arriba-izq */}
                      <text x={a.x + 10} y={a.y + 18} fill={t.text} fontSize="9" letterSpacing="2" fontFamily="JetBrains Mono, ui-monospace, monospace" fontWeight="600">{a.short}</text>
                      {/* nombre central */}
                      <text x={a.x + a.w / 2} y={a.y + a.h / 2 - 4} textAnchor="middle" fill="#ececf1" fontSize="12" fontFamily="system-ui" fontWeight="500">{a.nombre}</text>
                      {/* metrica especifica por area */}
                      {m && (
                        <text x={a.x + a.w / 2} y={a.y + a.h / 2 + 14} textAnchor="middle" fill={m.resaltado ? t.text : '#46464f'} fontSize="11" fontFamily="JetBrains Mono, ui-monospace, monospace" fontWeight="600">
                          {m.texto}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Leyenda inferior */}
                <g transform="translate(40, 490)">
                  <rect x="0" y="0" width="10" height="10" fill="rgba(63,176,116,0.16)" stroke="#404d20" strokeWidth="1" rx="2" />
                  <text x="16" y="9" fill="#8f8f9f" fontSize="10" fontFamily="system-ui">Propagacion</text>
                  <rect x="120" y="0" width="10" height="10" fill="rgba(196,154,44,0.16)" stroke="#463a66" strokeWidth="1" rx="2" />
                  <text x="136" y="9" fill="#8f8f9f" fontSize="10" fontFamily="system-ui">Floracion / cuarentena</text>
                  <rect x="290" y="0" width="10" height="10" fill="rgba(63,176,116,0.10)" stroke="#2a2a3a" strokeWidth="1" rx="2" />
                  <text x="306" y="9" fill="#8f8f9f" fontSize="10" fontFamily="system-ui">Postcosecha</text>
                </g>
              </svg>
            </div>

            {/* Instalaciones BD compactas */}
            <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-[#bef264]" />
                <span className="font-display font-semibold text-[14px] text-[#ececf1]">Instalaciones registradas</span>
                <span className="text-[10.5px] text-[#5c5c6b] font-mono ml-auto">{datos.instalaciones.length} totales</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {datos.instalaciones.map(i => (
                  <div key={i.id} className="bg-[#15151d] border border-[#1f1f2b] rounded-lg p-3 text-[12px] hover:border-[#a3e635]/30 transition-colors">
                    <div className="font-medium text-[#ececf1] truncate">{i.nombre}</div>
                    <div className="text-[10px] text-[#5c5c6b] mt-0.5 font-mono">{i.codigo} · {i.tipo}</div>
                    <div className="flex gap-3 mt-2 text-[10.5px]">
                      <span className="text-[#5c5c6b]">Lotes <span className="text-[#d9f99d] font-mono font-semibold">{i.lotes_activos}</span></span>
                      <span className="text-[#5c5c6b]">Unid <span className="text-[#c4b5fd] font-mono font-semibold">{i.total_unidades}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal detalle area */}
      <AnimatePresence>
        {areaSel && datos && (() => {
          const area = AREAS.find(a => a.id === areaSel)!
          const detalle = detalleArea(areaSel)
          const t = TONOS[area.tono]
          const lotes = lotesEnArea(areaSel)
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
              onClick={() => setAreaSel(null)}>
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="bg-[#101016] border-l border-[#1f1f2b] w-full max-w-md h-full overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-[#1f1f2b] bg-[#15151d] flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-widest" style={{ background: t.fill, color: t.text, border: `1px solid ${t.stroke}` }}>{area.short}</span>
                      <h3 className="font-display font-bold text-[15px] text-[#ececf1] truncate">{area.nombre}</h3>
                    </div>
                    <p className="text-[10.5px] text-[#5c5c6b] mt-1 font-mono">{lotes} lote{lotes === 1 ? '' : 's'} · {area.cumcs?.length || 0} CUMCS asociados</p>
                  </div>
                  <button onClick={() => setAreaSel(null)} className="p-1.5 rounded-md hover:bg-[#1c1c27] text-[#8f8f9f] shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {area.cumcs && area.cumcs.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#bef264] font-medium mb-2">CUMCS asociados</div>
                      <div className="flex flex-wrap gap-1.5">
                        {area.cumcs.map(c => (
                          <span key={c} className="inline-flex px-2 py-1 rounded font-mono text-[11px] bg-[#a3e635]/10 text-[#d9f99d] border border-[#a3e635]/20">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[#bef264] font-medium mb-2">Lotes alojados</div>
                    {detalle.length === 0 ? (
                      <div className="text-center py-8 text-[#5c5c6b] text-[11px]">Sin lotes activos en esta area.</div>
                    ) : (
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-[#5c5c6b] text-left border-b border-[#1f1f2b]">
                            <th className="py-2 font-medium uppercase text-[9px] tracking-widest">Camada</th>
                            <th className="py-2 font-medium uppercase text-[9px] tracking-widest">Tipo</th>
                            <th className="py-2 font-medium uppercase text-[9px] tracking-widest">Sist</th>
                            <th className="py-2 font-medium uppercase text-[9px] tracking-widest text-right">Lotes</th>
                            <th className="py-2 font-medium uppercase text-[9px] tracking-widest text-right">Unid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.map((l, i) => (
                            <tr key={i} className="border-b border-[#1f1f2b] last:border-0">
                              <td className="py-1.5 font-mono text-[#d4d4dd]">{l.camada || '—'}</td>
                              <td className="py-1.5 text-[#8f8f9f] capitalize">{l.tipo_producto.replace(/_/g, ' ')}</td>
                              <td className="py-1.5 text-[#8f8f9f] font-mono">{l.sistema}</td>
                              <td className="py-1.5 text-right font-mono text-[#d9f99d] font-semibold">{l.total}</td>
                              <td className="py-1.5 text-right font-mono text-[#c4b5fd]">{l.unidades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
