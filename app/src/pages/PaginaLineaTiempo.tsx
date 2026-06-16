// PaginaLineaTiempo — Gantt del cultivo por variedad. Muestra para cada genetica
// el avance del ciclo (germinacion -> vegetativo -> floracion), el dia actual,
// si es automatica o feminizada y cuanto le falta. Barras a escala comun.

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { CalendarRange, Sprout } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cultivoService, type Genetica } from '../lib/cultivo'

// Colores de fase (suaves, en linea con el resto de la app)
const FASE_COLOR: Record<string, string> = {
  Germinacion: '#b7b3c2',
  Plantula: '#9db38c',
  Vegetativo: '#a8cf8e',
  Floracion: '#c9b8e8',
  Secado: '#e3c486',
  Curado: '#e3c486',
  Cosechada: '#8fb8e6',
  Muerta: '#6b6b7a',
}
const ORDEN_FASE = ['Germinacion', 'Plantula', 'Vegetativo', 'Floracion', 'Secado', 'Curado', 'Cosechada', 'Muerta']

const hoyISO = () => new Date().toISOString().slice(0, 10)
const dias = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)

interface PlantaMin { genetica_id: string | null; fecha_germinacion: string | null; fase: string; activa: boolean }

interface Perfil {
  gen: Genetica
  cantidad: number
  auto: boolean
  diasVida: number
  fase: string
  germ: number; veg: number; flo: number; total: number
}

function construirPerfil(gen: Genetica, plantas: PlantaMin[]): Perfil | null {
  const activas = plantas.filter(p => p.activa !== false)
  if (activas.length === 0) return null
  const gers = activas.map(p => p.fecha_germinacion).filter(Boolean).sort() as string[]
  const ger = gers[0] || null
  const diasVida = ger ? Math.max(0, dias(ger, hoyISO())) : 0
  const auto = gen.tipo === 'Automatica'
  const flora = gen.tiempo_flora_dias || (auto ? 75 : 63)
  let germ: number, veg: number, flo: number
  if (auto) {
    // en autos el "tiempo de flora" cargado equivale al ciclo total desde germinacion
    germ = 12; veg = Math.max(10, Math.round((flora - 12) * 0.45)); flo = Math.max(10, flora - 12 - veg)
  } else {
    germ = 10; veg = gen.tiempo_vege_dias || 40; flo = flora
  }
  const total = germ + veg + flo
  // fase representativa = la mas frecuente entre las plantas activas
  const cuenta: Record<string, number> = {}
  for (const p of activas) cuenta[p.fase] = (cuenta[p.fase] || 0) + 1
  const fase = Object.entries(cuenta).sort((a, b) => b[1] - a[1] || ORDEN_FASE.indexOf(b[0]) - ORDEN_FASE.indexOf(a[0]))[0][0]
  return { gen, cantidad: activas.length, auto, diasVida, fase, germ, veg, flo, total }
}

export default function PaginaLineaTiempo() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [gens, { data: pls }] = await Promise.all([
          cultivoService.getGeneticas(),
          supabase.from('plantas').select('genetica_id,fecha_germinacion,fase,activa'),
        ])
        const plantas = (pls ?? []) as PlantaMin[]
        const out: Perfil[] = []
        for (const g of gens) {
          const suyas = plantas.filter(p => p.genetica_id === g.id)
          const perfil = construirPerfil(g, suyas)
          if (perfil) out.push(perfil)
        }
        out.sort((a, b) => b.diasVida - a.diasVida)
        setPerfiles(out)
      } catch (err) { toast.error(`Error cargando línea de tiempo: ${(err as Error).message}`) }
      finally { setCargando(false) }
    })()
  }, [])

  const maxTotal = useMemo(() => Math.max(80, ...perfiles.map(p => p.total)), [perfiles])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 px-3 sm:px-6 py-3">
          <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#bef264]" /> Línea de tiempo
          </h1>
          <span className="text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{perfiles.length} variedades en curso</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 sm:px-6 pb-2.5 text-[10.5px] text-[#a6a6b5]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FASE_COLOR.Germinacion }} /> Germinación</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FASE_COLOR.Vegetativo }} /> Vegetativo</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: FASE_COLOR.Floracion }} /> Floración</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-dashed border-[#bef264]" /> hoy</span>
        </div>
      </div>

      {cargando ? (
        <div className="px-3 sm:px-6 py-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-[#101016] border border-[#1f1f2b] animate-pulse" />)}
        </div>
      ) : perfiles.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Sprout className="w-5 h-5 text-[#5c5c6b]" /></div>
          <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Sin plantas activas</div>
          <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Cargá plantas con fecha de germinación para ver su línea de tiempo.</div>
        </div>
      ) : (
        <div className="px-3 sm:px-6 py-4 pb-24 space-y-2.5">
          {perfiles.map(p => {
            const anchoBarra = Math.round((p.total / maxTotal) * 100)
            const segGerm = (p.germ / p.total) * 100
            const segVeg = (p.veg / p.total) * 100
            const segFlo = (p.flo / p.total) * 100
            const hoyPct = Math.min(100, (p.diasVida / p.total) * 100)
            const restante = Math.max(0, p.total - p.diasVida)
            const cosechada = p.fase === 'Cosechada' || p.fase === 'Curado' || p.fase === 'Secado'
            return (
              <div key={p.gen.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors p-3 sm:p-3.5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-display font-semibold text-[13px] text-[#ececf1]">{p.gen.nombre}</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-medium border"
                    style={p.auto
                      ? { background: 'rgba(56,189,248,0.10)', borderColor: '#1e3a4a', color: '#8ed0c6' }
                      : { background: 'rgba(201,184,232,0.10)', borderColor: '#463a66', color: '#c9b8e8' }}>
                    {p.auto ? 'Automática' : 'Feminizada'}
                  </span>
                  {p.gen.genotipo && <span className="text-[10px] text-[#5c5c6b]">{p.gen.genotipo}</span>}
                  <span className="text-[10px] text-[#5c5c6b]">· {p.cantidad} planta{p.cantidad === 1 ? '' : 's'}</span>
                  <div className="flex-1" />
                  <span className="text-[11px] font-medium" style={{ color: FASE_COLOR[p.fase] || '#a6a6b5' }}>{p.fase}</span>
                  <span className="text-[11px] text-[#8f8f9f] tabular-nums">día {p.diasVida} <span className="text-[#5c5c6b]">/ ~{p.total}</span></span>
                </div>
                {/* barra */}
                <div className="relative" style={{ width: `${anchoBarra}%`, minWidth: '180px' }}>
                  <div className="relative h-7 rounded-md overflow-hidden flex">
                    <div style={{ width: `${segGerm}%`, background: FASE_COLOR.Germinacion + '4d' }} />
                    <div style={{ width: `${segVeg}%`, background: FASE_COLOR.Vegetativo + '4d' }} />
                    <div style={{ width: `${segFlo}%`, background: FASE_COLOR.Floracion + '4d' }} />
                  </div>
                  {/* relleno transcurrido */}
                  <div className="absolute top-0 left-0 h-7 rounded-md pointer-events-none" style={{ width: `${hoyPct}%`, background: cosechada ? 'rgba(143,184,230,0.18)' : 'rgba(255,255,255,0.07)', borderRight: cosechada ? 'none' : '2px dashed #bef264' }} />
                </div>
                <div className="mt-1.5 text-[10px] text-[#5c5c6b]">
                  {cosechada ? 'Ciclo terminado' : (p.fase === 'Floracion'
                    ? `En floración · faltan ~${restante} días para cosechar`
                    : `En ${p.fase.toLowerCase()} · ~${restante} días de ciclo restantes (estimado)`)}
                </div>
              </div>
            )
          })}
          <p className="text-[10.5px] text-[#5c5c6b] pt-2">Los tiempos de vegetativo/floración son estimados según la ficha de cada genética (en automáticas, el ciclo total; en feminizadas, vegetativo + floración). La línea punteada marca el día de hoy.</p>
        </div>
      )}
    </div>
  )
}
