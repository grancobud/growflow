// HeatmapTab — densidad camada × etapa con scale verde-dorado CannTrace.

import { ResponsiveHeatMap } from '@nivo/heatmap'
import { motion } from 'framer-motion'
import { Grid3x3 } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1] as const

// Escala custom verde→dorado (8 stops). Mapea value normalizado [0..1] a hex.
const SCALE = ['#101016', '#1c1c27', '#1d3328', '#404d20', '#a3e635', '#bef264', '#d9f99d', '#c4b5fd']
function colorAt(t: number): string {
  if (!isFinite(t) || t <= 0) return SCALE[0]
  if (t >= 1) return SCALE[SCALE.length - 1]
  const i = t * (SCALE.length - 1)
  const lo = Math.floor(i)
  return SCALE[lo]
}

export default function HeatmapTab({ metricas }: { metricas: any }) {
  const data = metricas.por_camada.map((c: any) => ({
    id: c.camada,
    data: [
      { x: 'Esquejes', y: c.esquejes },
      { x: 'Plantas', y: c.plantas },
      { x: 'Flor', y: c.flor },
      { x: 'Trim', y: c.trim },
      { x: 'Fraccionado', y: c.fracc },
    ],
  }))

  // Max global para normalizar el color de cada celda
  const maxVal = Math.max(1, ...data.flatMap((row: any) => row.data.map((d: any) => d.y || 0)))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#1f1f2b] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Grid3x3 className="w-3.5 h-3.5 text-[#bef264] flex-shrink-0" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[13px] text-[#ececf1] truncate">Densidad camada × etapa</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">
          intensidad = cantidad de lotes
        </span>
      </div>

      <div className="p-2 sm:p-4">
        <div
          className="rounded-lg"
          style={{
            height: 440,
            background: 'linear-gradient(180deg, #0a0a0f 0%, #15151d 100%)',
            padding: 18,
          }}
        >
          <ResponsiveHeatMap
            data={data}
            margin={{ top: 60, right: 70, bottom: 40, left: 60 }}
            valueFormat=">-.0f"
            axisTop={{
              tickSize: 0,
              tickPadding: 12,
              tickRotation: 0,
              legend: '',
              legendOffset: -45,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 12,
              tickRotation: 0,
              legend: '',
              legendOffset: -45,
            }}
            colors={(cell: any) => colorAt((cell.value || 0) / maxVal)}
            emptyColor="#0a0a0f"
            borderRadius={8}
            borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
            borderWidth={1}
            labelTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
            inactiveOpacity={0.18}
            animate
            motionConfig="gentle"
            hoverTarget="cell"
            theme={{
              text: { fontFamily: 'Space Grotesk, system-ui' },
              axis: {
                ticks: {
                  text: {
                    fill: '#a6a6b5',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: 'Inter, system-ui',
                  },
                },
              },
              labels: {
                text: { fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
              },
              tooltip: {
                container: {
                  background: '#101016',
                  color: '#ececf1',
                  fontSize: 12,
                  fontFamily: 'Inter, system-ui',
                  border: '1px solid #404d20',
                  borderRadius: 8,
                  padding: '8px 12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                },
              },
            }}
          />
        </div>

        {/* Legend bar */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">menos</span>
          <div
            className="h-1.5 w-32 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, #101016 0%, #404d20 25%, #a3e635 55%, #d9f99d 80%, #c4b5fd 100%)',
            }}
          />
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">más</span>
        </div>
      </div>
    </motion.div>
  )
}
