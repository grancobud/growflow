// PaginaGrafo — grafo de conocimiento del cultivo, construido en vivo desde Supabase.
// Nodos: geneticas (violeta), plantas (lima), eventos (por tipo), cosechas (ambar).
// Se refresca solo cada 15s: se va viendo crecer a medida que se cargan datos.

import { useState, useEffect, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { RefreshCw, GitBranch } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Nodo {
  id: string
  label: string
  tipo: 'genetica' | 'planta' | 'evento' | 'cosecha'
  sub?: string
  val: number
  color: string
}
interface Enlace { source: string; target: string }

const COLORES = {
  genetica: '#a78bfa',
  planta: '#a3e635',
  cosecha: '#f59e0b',
  evento: {
    Riego: '#38bdf8', Fertilizacion: '#bef264', Poda: '#c4b5fd',
    Trasplante: '#fb923c', CambioFase: '#e879f9', Entrenamiento: '#facc15',
    Problema: '#ff6b5a', Foto: '#94a3b8', Nota: '#8f8f9f',
  } as Record<string, string>,
}

export default function PaginaGrafo() {
  const [datos, setDatos] = useState<{ nodes: Nodo[]; links: Enlace[] }>({ nodes: [], links: [] })
  const [cargando, setCargando] = useState(true)
  const [actualizado, setActualizado] = useState<Date | null>(null)
  const contRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  const cargar = useCallback(async () => {
    try {
      const [gen, pla, eve, cos] = await Promise.all([
        supabase.from('geneticas').select('id,nombre,banco,tipo'),
        supabase.from('plantas').select('id,apodo,fase,genetica_id,madre_id,activa'),
        supabase.from('eventos').select('id,tipo,fecha,detalle,planta_id'),
        supabase.from('cosechas').select('id,fecha,peso_seco_g,planta_id'),
      ])
      const nodes: Nodo[] = []
      const links: Enlace[] = []

      for (const g of gen.data ?? []) {
        nodes.push({ id: g.id, label: g.nombre, sub: g.banco ?? g.tipo, tipo: 'genetica', val: 8, color: COLORES.genetica })
      }
      for (const p of pla.data ?? []) {
        nodes.push({ id: p.id, label: p.apodo ?? 'Planta', sub: p.fase, tipo: 'planta', val: 6, color: p.activa ? COLORES.planta : '#5c5c6b' })
        if (p.genetica_id) links.push({ source: p.genetica_id, target: p.id })
        if (p.madre_id) links.push({ source: p.madre_id, target: p.id })
      }
      const ids = new Set(nodes.map(n => n.id))
      for (const e of eve.data ?? []) {
        nodes.push({ id: e.id, label: e.tipo, sub: e.detalle ?? e.fecha, tipo: 'evento', val: 2.5, color: COLORES.evento[e.tipo] ?? '#8f8f9f' })
        if (e.planta_id && ids.has(e.planta_id)) links.push({ source: e.planta_id, target: e.id })
      }
      for (const c of cos.data ?? []) {
        nodes.push({ id: c.id, label: `Cosecha${c.peso_seco_g ? ` ${c.peso_seco_g}g` : ''}`, sub: c.fecha, tipo: 'cosecha', val: 5, color: COLORES.cosecha })
        if (c.planta_id && ids.has(c.planta_id)) links.push({ source: c.planta_id, target: c.id })
      }
      setDatos({ nodes, links })
      setActualizado(new Date())
    } catch (err) {
      console.error('Error cargando grafo:', err)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15000)
    return () => clearInterval(id)
  }, [cargar])

  useEffect(() => {
    if (!contRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    obs.observe(contRef.current)
    return () => obs.disconnect()
  }, [])

  const leyenda = [
    { label: 'Genética', color: COLORES.genetica },
    { label: 'Planta', color: COLORES.planta },
    { label: 'Cosecha', color: COLORES.cosecha },
    { label: 'Riego', color: COLORES.evento.Riego },
    { label: 'Poda', color: COLORES.evento.Poda },
    { label: 'Otros eventos', color: '#8f8f9f' },
  ]

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] text-[#d4d4dd] font-sans overflow-hidden">
      <div className="bg-[#0a0a0f]/95 border-b border-[#1f1f2b] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Grafo del Cultivo</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {datos.nodes.length} nodos · {datos.links.length} conexiones
              {actualizado && <span className="hidden sm:inline"> · actualizado {actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={cargar}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]"
            title="Refrescar ahora">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      <div ref={contRef} className="flex-1 relative min-h-0">
        {datos.nodes.length === 0 && !cargando ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
                <GitBranch className="w-5 h-5 text-[#5c5c6b]" />
              </div>
              <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Grafo vacío</div>
              <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Cargá genéticas y plantas y mirá cómo se va tejiendo la red.</div>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            graphData={datos}
            width={dims.w}
            height={dims.h}
            backgroundColor="#0a0a0f"
            nodeVal={(n: any) => n.val}
            nodeColor={(n: any) => n.color}
            nodeLabel={(n: any) => `${n.label}${n.sub ? ` — ${n.sub}` : ''}`}
            linkColor={() => '#2a2a3a'}
            linkWidth={1}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              if (node.tipo === 'evento' && globalScale < 2) return
              const size = 11 / globalScale
              ctx.font = `${node.tipo === 'planta' || node.tipo === 'genetica' ? '600 ' : ''}${size}px Outfit, sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'top'
              ctx.fillStyle = node.tipo === 'evento' ? '#757584' : '#d4d4dd'
              ctx.fillText(node.label, node.x, node.y + Math.sqrt(node.val) * 2 + 2 / globalScale)
            }}
            cooldownTicks={120}
          />
        )}

        {/* Leyenda */}
        <div className="absolute bottom-3 left-3 rounded-lg bg-[#101016]/90 border border-[#1f1f2b] px-3 py-2 backdrop-blur-sm">
          <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[260px]">
            {leyenda.map(l => (
              <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] text-[#8f8f9f]">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
