// PaginaArbol — arbol genealogico seed-to-sale por camada.
// Diseño dark coherente con PaginaTrazabilidad: paleta verde+dorado, cards minimalistas.

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, GitBranch, Sprout, RefreshCw, Maximize2 } from 'lucide-react'
import ReactFlow, { Background, Controls, MarkerType, type Node, type Edge, ReactFlowProvider, useReactFlow } from 'reactflow'
import 'reactflow/dist/style.css'
import { supabase } from '../lib/supabase'

const EASE = [0.22, 1, 0.36, 1] as const

type Nodo = {
  id: string; codigo_lote: string; lote_padre_id: string | null; cantidad: number
  estado: string; camada: string; sistema: string; tipo_producto: string
  producto_nombre: string; etapa_orden: number
  peso_verde_kg?: string; peso_seco_kg?: string; peso_final_kg?: string
}

const CAMADAS = ['C7', 'C9', 'C11', 'C12', 'C15', 'C16']

// Paleta dark coherente con PaginaTrazabilidad. Cada etapa tiene un acento sutil.
type EtapaTone = 'pm' | 'esq' | 'veg' | 'flo' | 'cos' | 'sec' | 'trim' | 'cuar' | 'frac' | 'dep' | 'default'
const ETAPA_STYLE: Record<EtapaTone, { bg: string; border: string; accent: string; label: string }> = {
  pm:      { bg: 'rgba(196,154,44,0.06)',  border: '#352b4d', accent: '#c4b5fd', label: 'PLANTA MADRE' },
  esq:     { bg: 'rgba(63,176,116,0.06)',  border: '#1f3a26', accent: '#bef264', label: 'ESQUEJADO' },
  veg:     { bg: 'rgba(63,176,116,0.10)',  border: '#404d20', accent: '#d9f99d', label: 'VEGETATIVA' },
  flo:     { bg: 'rgba(196,154,44,0.10)',  border: '#463a66', accent: '#c4b5fd', label: 'FLORACIÓN' },
  cos:     { bg: 'rgba(180,200,190,0.06)', border: '#2a2a3a', accent: '#a6a6b5', label: 'COSECHA' },
  sec:     { bg: 'rgba(122,90,191,0.10)',  border: '#3d2c5e', accent: '#c9b7ff', label: 'SECADO' },
  trim:    { bg: 'rgba(122,90,191,0.06)',  border: '#3d2c5e', accent: '#9d8ad0', label: 'TRIMMING' },
  cuar:    { bg: 'rgba(196,154,44,0.06)',  border: '#352b4d', accent: '#a78bfa', label: 'CUARENTENA' },
  frac:    { bg: 'rgba(63,176,116,0.06)',  border: '#1f3a26', accent: '#bef264', label: 'FRACCIONAMIENTO' },
  dep:     { bg: 'rgba(196,154,44,0.12)',  border: '#463a66', accent: '#c4b5fd', label: 'DEPÓSITO FINAL' },
  default: { bg: 'rgba(180,200,190,0.05)', border: '#1f1f2b', accent: '#8f8f9f', label: 'LOTE' },
}
const tipoToTone = (tipo: string, codigo?: string): EtapaTone => {
  if (tipo === 'planta_madre') return 'pm'
  if (tipo === 'esqueje') return 'esq'
  if (tipo === 'planta') return codigo?.startsWith('FLO') ? 'flo' : 'veg'
  if (tipo === 'flor') {
    if (codigo?.startsWith('COS-')) return 'cos'
    if (codigo?.startsWith('25.CDS') || codigo?.startsWith('26.CDS') || codigo?.startsWith('24.CDS')) return 'sec'
    return 'sec'
  }
  if (tipo === 'flor_trimmeada') return 'trim'
  if (tipo === 'flor_fraccionada') return 'frac'
  return 'default'
}

// Node card. Estilo: dark, badge etapa arriba (mono pequeño), codigo grande, cantidad y unidad.
function CustomNode({ data }: { data: Nodo }) {
  const tone = tipoToTone(data.tipo_producto, data.codigo_lote)
  const s = ETAPA_STYLE[tone]
  const cantidad = Number(data.cantidad) || 0
  let unidad = 'unid'
  if (tone === 'sec' || tone === 'cos') unidad = 'plantas'
  if (tone === 'trim') unidad = 'g'
  if (tone === 'frac') unidad = 'g'
  if (tone === 'dep') unidad = 'bolsas'

  const peso = data.peso_final_kg ? `${data.peso_final_kg} kg final` : null
  const fmtCant = unidad === 'g' ? cantidad.toLocaleString('es-AR') : cantidad

  return (
    <div
      className="rounded-lg border backdrop-blur-[1px] transition-shadow hover:shadow-[0_0_0_1px_rgba(107,207,142,0.3)]"
      style={{
        background: s.bg, borderColor: s.border, minWidth: 200,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      }}
    >
      <div className="px-3 pt-2 pb-1 border-b" style={{ borderColor: s.border }}>
        <div
          className="text-[8.5px] uppercase tracking-[0.18em] font-semibold leading-tight"
          style={{ color: s.accent }}
        >
          {s.label}
        </div>
      </div>
      <div className="px-3 py-2 space-y-1">
        <div className="text-[11px] font-semibold tabular-nums leading-tight" style={{ color: '#ececf1', wordBreak: 'break-all' }}>
          {data.codigo_lote}
        </div>
        <div className="flex items-baseline gap-1.5 text-[10.5px]" style={{ color: s.accent }}>
          <span className="font-bold tabular-nums">{fmtCant}</span>
          <span className="text-[9px] opacity-70 uppercase tracking-wide">{unidad}</span>
        </div>
        {peso && (
          <div className="text-[9.5px]" style={{ color: '#a6a6b5' }}>{peso}</div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { custom: CustomNode }

function ArbolFlow({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const { fitView } = useReactFlow()
  return (
    <div className="h-full w-full" style={{ background: '#0a0a0f' }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15} maxZoom={1.6}
        nodesDraggable={false} nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#162119" gap={22} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-[#101016] !border !border-[#1f1f2b] !rounded-lg !shadow-none [&>button]:!bg-transparent [&>button]:!border-b [&>button]:!border-[#1f1f2b] [&>button:last-child]:!border-b-0 [&>button]:!text-[#d9f99d] [&>button:hover]:!bg-[#a3e635]/10"
        />
      </ReactFlow>
      <button
        onClick={() => fitView({ padding: 0.25, duration: 400 })}
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#101016]/90 hover:bg-[#a3e635]/15 text-[11px] font-medium text-[#d9f99d]"
        title="Ajustar vista"
      >
        <Maximize2 className="w-3 h-3" /> Ajustar
      </button>
    </div>
  )
}

export default function PaginaArbol() {
  const [camadaSel, setCamadaSel] = useState<string>('C7')
  const [data, setData] = useState<{ nodos: Nodo[]; aristas: any[] } | null>(null)
  const [cargando, setCargando] = useState(false)

  async function cargar(c: string) {
    setCargando(true)
    try {
      const { data } = await supabase.rpc('arbol_genealogico_camada', { p_camada: c })
      setData(data as any)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar(camadaSel) }, [camadaSel])

  const { nodes, edges, etapasUsadas, totalLotes } = useMemo(() => {
    if (!data?.nodos) return { nodes: [] as Node[], edges: [] as Edge[], etapasUsadas: [] as Array<{ orden: number; tone: EtapaTone; label: string; count: number }>, totalLotes: 0 }

    const porEtapa: Record<number, Nodo[]> = {}
    data.nodos.forEach(n => { (porEtapa[n.etapa_orden] ||= []).push(n) })

    const etapasOrdenadas = Object.keys(porEtapa).map(Number).sort((a, b) => a - b)
    const COL_W = 250, ROW_H = 110, HEADER_H = 50

    const ns: Node[] = []
    const etapasUsadas: Array<{ orden: number; tone: EtapaTone; label: string; count: number }> = []
    etapasOrdenadas.forEach((orden, idx) => {
      const items = porEtapa[orden]
      const x = idx * COL_W
      const tone = items[0] ? tipoToTone(items[0].tipo_producto, items[0].codigo_lote) : 'default'
      etapasUsadas.push({ orden, tone, label: ETAPA_STYLE[tone].label, count: items.length })
      items.forEach((n, i) => {
        ns.push({
          id: n.id, type: 'custom',
          position: { x, y: HEADER_H + i * ROW_H },
          data: n,
        })
      })
    })

    const es: Edge[] = (data.aristas || []).filter((a: any) => a.origen && a.destino).map((a: any, i: number) => ({
      id: `e${i}`, source: a.origen, target: a.destino,
      type: 'smoothstep', animated: false,
      style: { stroke: '#a3e635', strokeWidth: 1, opacity: 0.25 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a3e635', width: 12, height: 12 },
    }))

    return { nodes: ns, edges: es, etapasUsadas, totalLotes: data.nodos.length }
  }, [data])

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      {/* TopBar */}
      <div className="bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#a3e635]/10 border border-[#a3e635]/20 shrink-0">
              <GitBranch className="w-3.5 h-3.5 text-[#bef264]" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] leading-none">Árbol Genealógico</h1>
              <div className="mt-1 text-[10.5px] sm:text-[11px] text-[#5c5c6b] hidden sm:block">Cadena seed-to-sale visual · datos reales por camada</div>
            </div>
          </div>
          <div className="flex-1" />
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
            ONLINE
          </span>
          <button onClick={() => cargar(camadaSel)} disabled={cargando}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11px] sm:text-[11.5px] font-medium text-[#d9f99d] disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{cargando ? 'Cargando…' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* Selector camadas */}
      <div className="px-3 sm:px-6 py-3 border-b border-[#1f1f2b] flex items-center gap-2 sm:gap-3 flex-wrap bg-[#0a0a0f] flex-shrink-0">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium">Camada</span>
        <div className="inline-flex gap-1 p-1 rounded-lg bg-[#101016] border border-[#1f1f2b]">
          {CAMADAS.map(c => {
            const active = camadaSel === c
            return (
              <button key={c} onClick={() => setCamadaSel(c)}
                className={['px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors tabular-nums', active ? 'bg-[#a3e635] text-[#07070b]' : 'text-[#8f8f9f] hover:text-[#ececf1]'].join(' ')}>
                {c}
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        {!cargando && totalLotes > 0 && (
          <div className="text-[11px] text-[#5c5c6b]">
            <span className="text-[#d9f99d] font-mono font-semibold tabular-nums">{totalLotes}</span> lotes · <span className="text-[#d9f99d] font-mono font-semibold tabular-nums">{etapasUsadas.length}</span> etapas
          </div>
        )}
      </div>

      {/* Etapas legend (chips coloreadas por etapa, contador) */}
      {!cargando && etapasUsadas.length > 0 && (
        <div className="px-3 sm:px-6 py-2.5 border-b border-[#1f1f2b] flex items-center gap-2 flex-nowrap bg-[#0a0a0f] overflow-x-auto flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#5c5c6b] font-medium mr-1 shrink-0">Etapas</span>
          {etapasUsadas.map(e => {
            const s = ETAPA_STYLE[e.tone]
            return (
              <div key={e.orden} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border shrink-0"
                style={{ background: s.bg, borderColor: s.border }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.accent }} />
                <span className="text-[10px] font-medium tracking-wide" style={{ color: s.accent }}>{s.label}</span>
                <span className="font-mono text-[10px] text-[#5c5c6b] tabular-nums">{e.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Canvas */}
      {cargando && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col items-center gap-3 text-[#5c5c6b]">
            <Loader2 className="w-8 h-8 animate-spin text-[#bef264]" />
            <span className="text-[11.5px]">Cargando árbol genealógico de {camadaSel}…</span>
          </motion.div>
        </div>
      )}

      {!cargando && nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[#5c5c6b] text-[12px]">
            <Sprout className="w-7 h-7 text-[#46464f]" />
            <span>Sin datos para la camada {camadaSel}</span>
          </div>
        </div>
      )}

      {nodes.length > 0 && (
        <div className="flex-1 relative pb-16 sm:pb-0">
          <ReactFlowProvider>
            <ArbolFlow nodes={nodes} edges={edges} />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  )
}
