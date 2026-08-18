// El manual de operación, adentro de la app.
//
// El texto sale de app/src/contenido/manual.md y se renderiza acá: una sola
// fuente, así la pantalla no se desactualiza respecto del documento del repo.
//
// El índice se arma solo con los títulos de nivel 2, y marca en cuál estás
// mientras scrolleás. En un documento de diez capítulos, saber dónde estás
// parado importa tanto como poder saltar.

import { useMemo, useState, useEffect, useRef } from 'react'
import { BookOpen, Search, X, Printer, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { rutaDe } from '../lib/rutasManual'
import { PuestaEnMarcha } from '../components/manual/PuestaEnMarcha'
import manualMd from '../contenido/manual.md?raw'
import { parsearMarkdown, parsearInline, type Bloque, type Trozo } from '../lib/markdown'
import { btnSutil, campoBase } from '../lib/ui'

/** Alto del encabezado fijo, para que el titulo no quede debajo al saltar. */
const ALTO_HEADER = 76

export default function PaginaManual() {
  const bloques = useMemo(() => parsearMarkdown(manualMd), [])
  const [busca, setBusca] = useState('')
  const [activo, setActivo] = useState('')
  const contenedor = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const capitulos = useMemo(
    () => bloques.filter((b): b is Extract<Bloque, { tipo: 'titulo' }> =>
      b.tipo === 'titulo' && b.nivel === 2),
    [bloques])

  // Buscar corta por la sección más chica que tenga sentido sola: una receta (h3)
  // si la hay, el capítulo (h2) si no. Cortar sólo por capítulo devolvía las 28
  // recetas del paso a paso para cualquier palabra, que es no filtrar nada.
  //
  // Cuando lo que coincide es una receta se emite igual su capítulo padre, porque
  // "Cargar un costo" suelto no dice de qué parte del sistema estamos hablando.
  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return bloques

    const salida: Bloque[] = []
    let grupo: Bloque[] = []
    let coincide = false
    let capitulo: Bloque | null = null
    let capituloEmitido: Bloque | null = null

    const volcar = () => {
      if (coincide) {
        if (capitulo && capituloEmitido !== capitulo) {
          salida.push(capitulo)
          capituloEmitido = capitulo
        }
        // El propio h2 ya se emitió arriba; no repetirlo al volcar su grupo.
        salida.push(...grupo.filter(b => b !== capitulo))
      }
      grupo = []
      coincide = false
    }

    for (const b of bloques) {
      if (b.tipo === 'titulo' && b.nivel <= 3) {
        volcar()
        if (b.nivel <= 2) capitulo = b
      }
      grupo.push(b)
      if (textoDe(b).toLowerCase().includes(q)) coincide = true
    }
    volcar()
    return salida
  }, [bloques, busca])

  useEffect(() => {
    const raiz = contenedor.current
    if (!raiz || busca) return
    const obs = new IntersectionObserver(
      entradas => {
        const visto = entradas.filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visto) setActivo(visto.target.id)
      },
      { root: scroller.current, rootMargin: `-${ALTO_HEADER + 8}px 0px -68% 0px`, threshold: 0 })
    raiz.querySelectorAll('h2[id]').forEach(h => obs.observe(h))
    return () => obs.disconnect()
  }, [visibles, busca])

  // Se scrollea el contenedor a mano en vez de usar scrollIntoView: la pagina
  // scrollea en un div propio, no en el documento, y ahi scrollIntoView no movia
  // nada. Ademas hace falta descontar el header sticky, o el titulo al que se
  // salta queda tapado justo por la barra de busqueda.
  const irA = (id: string) => {
    const caja = scroller.current
    const destino = document.getElementById(id)
    if (!caja || !destino) return
    const y = destino.getBoundingClientRect().top - caja.getBoundingClientRect().top
    const sinAnimacion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    caja.scrollTo({ top: caja.scrollTop + y - ALTO_HEADER, behavior: sinAnimacion ? 'auto' : 'smooth' })
    setActivo(id)
  }

  return (
    <div ref={scroller} className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-3 flex-wrap px-3 sm:px-6 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#a3e635]" strokeWidth={1.8} /> Manual
            </h1>
            <p className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#7d7d8e]">
              Cómo se usa el sistema, en el orden en que se usa
            </p>
          </div>

          <div className="relative flex-1 sm:flex-none sm:w-64 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-[#7d7d8e] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              className={`w-full pl-8 pr-8 py-2 sm:text-[12px] ${campoBase}`}
              placeholder="Buscar en el manual" aria-label="Buscar en el manual" />
            {busca && (
              <button onClick={() => setBusca('')} aria-label="Limpiar búsqueda"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[#7d7d8e] hover:text-[#ececf1]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={() => window.print()} className={`${btnSutil} hidden sm:inline-flex`}>
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-5 pb-24 max-w-[1180px] mx-auto lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <nav aria-label="Índice del manual"
          className="hidden lg:block sticky top-[76px] max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-none">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium mb-2 px-2">
            Contenido
          </p>
          <ol className="flex flex-col gap-0.5 list-none p-0 m-0">
            {capitulos.map(c => (
              <li key={c.id}>
                <button onClick={() => irA(c.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] leading-snug transition-colors ${
                    activo === c.id
                      ? 'bg-[#15151d] text-[#d9f99d]'
                      : 'text-[#8f8f9f] hover:text-[#d4d4dd] hover:bg-[#101016]'}`}>
                  {c.texto}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={contenedor} className="min-w-0 flex flex-col gap-3">
          {busca && (
            <p className="text-[11.5px] text-[#7d7d8e] pb-1">
              {visibles.length === 0
                ? `No hay nada sobre "${busca}" en el manual.`
                : `Mostrando los capítulos que mencionan "${busca}".`}
            </p>
          )}
          {visibles.map((b, i) => <RenderBloque key={i} b={b} />)}
        </div>
      </div>
    </div>
  )
}

function textoDe(b: Bloque): string {
  switch (b.tipo) {
    case 'titulo': case 'parrafo': case 'cita': return b.texto
    case 'lista': return b.items.join(' ')
    case 'tabla': return [...b.encabezados, ...b.filas.flat()].join(' ')
    default: return ''
  }
}

function Inline({ texto }: { texto: string }) {
  return (
    <>
      {parsearInline(texto).map((t: Trozo, i) => {
        if (t.t === 'negrita') return <strong key={i} className="font-semibold text-[#ececf1]">{t.v}</strong>
        if (t.t === 'cursiva') return <em key={i} className="italic text-[#c4c4d0]">{t.v}</em>
        if (t.t === 'codigo') {
          // Los destinos de las recetas se vuelven links a la pantalla. El manual
          // vive adentro de la app: decir "andá a Cultivo › Sala" y no llevarte
          // hasta ahí es hacerte buscar algo que el sistema ya sabe dónde está.
          const ruta = rutaDe(t.v)
          if (ruta) return (
            <Link key={i} to={ruta}
              className="inline-flex items-center gap-1 font-mono text-[0.88em] px-1.5 py-0.5 rounded bg-[#1e2a12] border border-[#404d20] text-[#bef264] hover:bg-[#26340f] hover:border-[#5a6d2c] transition-colors break-words">
              {t.v}
              <ArrowUpRight className="w-3 h-3 flex-shrink-0 opacity-70" />
            </Link>
          )
          return (
            <code key={i} className="font-mono text-[0.88em] px-1.5 py-0.5 rounded bg-[#15151d] border border-[#1f1f2b] text-[#bef264] break-words">
              {t.v}
            </code>
          )
        }
        if (t.t === 'link') return (
          <a key={i} href={t.href} target="_blank" rel="noreferrer"
            className="text-[#a3e635] underline underline-offset-2 hover:text-[#d9f99d] break-words">
            {t.v}
          </a>
        )
        return <span key={i}>{t.v}</span>
      })}
    </>
  )
}

function RenderBloque({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case 'titulo': {
      if (b.nivel === 1) {
        return (
          <h1 className="font-display font-bold text-[22px] sm:text-[26px] text-[#ececf1] tracking-tight mt-1 mb-1">
            {b.texto}
          </h1>
        )
      }
      if (b.nivel === 2) {
        return (
          <h2 id={b.id} className="font-display font-semibold text-[17px] sm:text-[19px] text-[#d9f99d] tracking-tight mt-7 pt-4 border-t border-[#1f1f2b] scroll-mt-24">
            {b.texto}
          </h2>
        )
      }
      return (
        <h3 className="font-display font-semibold text-[14px] sm:text-[15px] text-[#ececf1] mt-4">
          {b.texto}
        </h3>
      )
    }

    case 'parrafo':
      // Marcador: una linea con {{PUESTA_EN_MARCHA}} se reemplaza por el checklist
      // que lee el estado real. El manual sigue siendo markdown plano.
      if (b.texto.trim() === '{{PUESTA_EN_MARCHA}}') return <PuestaEnMarcha />
      return (
        <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-[#b8b8c4] max-w-[68ch]">
          <Inline texto={b.texto} />
        </p>
      )

    case 'lista': {
      const clase = 'text-[13.5px] sm:text-[14px] leading-relaxed text-[#b8b8c4] max-w-[68ch] flex flex-col gap-2 pl-5 my-0'
      const items = b.items.map((it, i) => (
        <li key={i} className="marker:text-[#7d7d8e]"><Inline texto={it} /></li>
      ))
      return b.ordenada
        ? <ol className={`${clase} list-decimal`}>{items}</ol>
        : <ul className={`${clase} list-disc`}>{items}</ul>
    }

    case 'cita':
      return (
        <div className="rounded-lg bg-[#101016] border border-[#1f1f2b] border-l-2 border-l-[#a3e635] px-3.5 py-3 max-w-[68ch]">
          <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-[#a6a6b5]">
            <Inline texto={b.texto} />
          </p>
        </div>
      )

    case 'tabla':
      return (
        <div className="overflow-x-auto rounded-xl border border-[#1f1f2b] bg-[#101016]">
          <table className="w-full border-collapse text-[12.5px] min-w-[520px]">
            <thead>
              <tr>
                {b.encabezados.map((h, i) => (
                  <th key={i} className="text-left px-3.5 py-2.5 bg-[#15151d] border-b border-[#1f1f2b] text-[10px] uppercase tracking-[0.1em] text-[#7d7d8e] font-medium whitespace-nowrap">
                    <Inline texto={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.filas.map((f, i) => (
                <tr key={i}>
                  {f.map((c, j) => (
                    <td key={j} className="px-3.5 py-2.5 border-b border-[#1f1f2b] align-top text-[#b8b8c4] leading-snug last:border-r-0">
                      <Inline texto={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'separador':
      // El markdown separa capítulos con una línea; acá ese rol lo cumple el
      // borde superior del título, así que dibujarla otra vez sería ruido.
      return null
  }
}
