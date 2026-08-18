// Checklist de puesta en marcha, leído del estado real del sistema.
//
// El capítulo 01 del manual enumera lo que hay que cargar una sola vez. Como
// texto fijo obliga a ir pantalla por pantalla a ver qué falta; el sistema ya
// sabe la respuesta, así que la muestra.
//
// Se inserta escribiendo {{PUESTA_EN_MARCHA}} en una línea del manual.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Loader2, ArrowUpRight } from 'lucide-react'
import { ongService } from '../../lib/ong'
import { cultivoService } from '../../lib/cultivo'
import { econometriaService } from '../../lib/econometria'

interface Paso {
  que: string
  ruta: string
  listo: boolean
  detalle: string
}

export function PuestaEnMarcha() {
  const [pasos, setPasos] = useState<Paso[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [entidad, autoridades, predios, geneticas, costos, libros] = await Promise.all([
          ongService.getEntidad(),
          ongService.getAutoridades(),
          ongService.getPredios(),
          cultivoService.getGeneticas(),
          econometriaService.getCostos(),
          ongService.getLibros(),
        ])
        if (!vivo) return

        const activas = autoridades.filter(a => a.activo !== false)
        const rubricados = libros.filter(l => l.rubricado)

        setPasos([
          {
            que: 'Datos de la entidad',
            ruta: '/ong',
            // El CUIT se pide aparte: sin él, cada documento generado sale con
            // [CUIT] entre corchetes aunque la razón social esté cargada.
            listo: !!entidad?.razon_social && !!entidad?.cuit,
            detalle: !entidad?.razon_social ? 'falta la razón social'
              : !entidad?.cuit ? 'falta el CUIT'
              : entidad.razon_social,
          },
          {
            que: 'Autoridades',
            ruta: '/ong',
            listo: activas.length > 0,
            detalle: activas.length ? `${activas.length} en funciones` : 'ninguna cargada',
          },
          {
            que: 'Predios',
            ruta: '/ong',
            listo: predios.length > 0,
            detalle: predios.length ? `${predios.length} declarado${predios.length === 1 ? '' : 's'}` : 'ninguno declarado',
          },
          {
            que: 'Libros rubricados',
            ruta: '/ong',
            listo: rubricados.length > 0,
            detalle: rubricados.length ? `${rubricados.length} rubricado${rubricados.length === 1 ? '' : 's'}` : 'ninguno rubricado',
          },
          {
            que: 'Genéticas',
            ruta: '/geneticas',
            listo: geneticas.length > 0,
            detalle: geneticas.length ? `${geneticas.length} en el banco` : 'el banco está vacío',
          },
          {
            que: 'Costos',
            ruta: '/econometria',
            listo: costos.length > 0,
            detalle: costos.length ? `${costos.length} cargado${costos.length === 1 ? '' : 's'}` : 'sin costos no hay costo por gramo',
          },
        ])
      } catch (e) {
        if (vivo) setError((e as Error).message)
      }
    })()
    return () => { vivo = false }
  }, [])

  if (error) {
    return (
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5">
        <p className="text-[12px] text-[#7d7d8e]">
          No se pudo leer el estado de la puesta en marcha: {error}
        </p>
      </div>
    )
  }

  if (!pasos) {
    return (
      <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-3.5 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7d7d8e]" />
        <span className="text-[12px] text-[#7d7d8e]">Viendo qué tenés cargado…</span>
      </div>
    )
  }

  const hechos = pasos.filter(p => p.listo).length

  return (
    <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
      <div className="px-3.5 py-3 border-b border-[#1f1f2b] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[12.5px] text-[#ececf1] font-medium">Cómo vas con esto</p>
          <p className="text-[11px] text-[#7d7d8e] mt-0.5">
            Leído de lo que hay cargado ahora mismo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-[#15151d] overflow-hidden">
            <div className="h-full bg-[#a3e635] transition-all"
              style={{ width: `${(hechos / pasos.length) * 100}%` }} />
          </div>
          <span className="font-display font-semibold text-[13px] text-[#d9f99d] tabular-nums">
            {hechos}/{pasos.length}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-[#1f1f2b] list-none m-0 p-0">
        {pasos.map(p => (
          <li key={p.que}>
            <Link to={p.ruta}
              className="flex items-center gap-2.5 px-3.5 py-2.5 min-h-[44px] hover:bg-[#15151d] transition-colors group">
              {p.listo
                ? <Check className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={2.4} />
                : <Circle className="w-4 h-4 text-[#5a5a68] flex-shrink-0" strokeWidth={1.8} />}
              <span className="text-[12.5px] flex-shrink-0"
                style={{ color: p.listo ? '#a6a6b5' : '#ececf1' }}>
                {p.que}
              </span>
              <span className="text-[11px] text-[#7d7d8e] truncate ml-auto text-right">
                {p.detalle}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#5a5a68] group-hover:text-[#a3e635] flex-shrink-0 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
