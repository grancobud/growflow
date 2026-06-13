// PaginaEstadisticas — gramos cosechados por genetica, ranking y barras.

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { BarChart3, RefreshCw, Scale, Trophy } from 'lucide-react'
import { cultivoService, type EstadisticaGenetica } from '../lib/cultivo'

export default function PaginaEstadisticas() {
  const [stats, setStats] = useState<EstadisticaGenetica[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setStats(await cultivoService.getEstadisticasCosecha())
    } catch (err) {
      toast.error(`Error cargando estadísticas: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const totalSeco = stats.reduce((a, s) => a + s.peso_seco_g, 0)
  const totalCosechas = stats.reduce((a, s) => a + s.cosechas, 0)
  const maxSeco = Math.max(1, ...stats.map(s => s.peso_seco_g))
  const prom = (vs: number[]) => vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length) : null

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Estadísticas</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">Rendimiento por genética</div>
          </div>
          <div className="flex-1" />
          <button onClick={cargar} className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]" title="Refrescar">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 max-w-3xl mx-auto">
        {/* Totales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Total cosechado</p>
            <p className="font-display font-bold text-[26px] text-[#ececf1] mt-1.5 leading-none tabular-nums">
              {(totalSeco / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} <span className="text-[15px] text-[#757584]">kg secos</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">Cosechas</p>
            <p className="font-display font-bold text-[26px] text-[#ececf1] mt-1.5 leading-none tabular-nums">{totalCosechas}</p>
          </div>
        </div>

        {/* Ranking */}
        {cargando ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#101016] border border-[#1f1f2b] rounded-xl animate-pulse" />)}</div>
        ) : stats.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-[#5c5c6b]" />
            </div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin cosechas registradas</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Cuando registres cosechas con peso, vas a ver el ranking por genética.</div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-[#1f1f2b] flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-[#bef264]" />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Gramos secos por genética</h3>
            </div>
            <ul className="divide-y divide-[#1f1f2b]">
              {stats.map((s, i) => {
                const v = prom(s.valoraciones)
                return (
                  <li key={s.genetica} className="px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {i === 0 && <Trophy className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" />}
                      <span className="text-[12.5px] font-medium text-[#ececf1] truncate">{s.genetica}</span>
                      <span className="ml-auto font-display font-bold text-[14px] text-[#d9f99d] tabular-nums">
                        {s.peso_seco_g.toLocaleString('es-AR')} g
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1c1c27] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4d7c0f] to-[#a3e635]"
                        style={{ width: `${(s.peso_seco_g / maxSeco) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10.5px] text-[#757584] tabular-nums">
                      <span>{s.cosechas} cosecha{s.cosechas !== 1 ? 's' : ''}</span>
                      {s.peso_humedo_g > 0 && <span>{Math.round((s.peso_seco_g / s.peso_humedo_g) * 100)}% rendimiento seco</span>}
                      {v != null && <span className="text-[#c4b5fd]">★ {v.toFixed(1)}/10</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
