// Lo que faltaba para cerrar el circuito del acta: elegir quiénes asistieron, y
// sacar el texto redactado para pasarlo al libro.
//
// Los libros de la asociación son físicos y rubricados. Antes se cargaban los
// datos acá y después había que redactar el acta aparte, a mano. Ahora se carga
// una vez y sale lista para imprimir y pegar.

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Printer, Users } from 'lucide-react'
import { redactarActa, faltantesDelActa } from '../../lib/actaTexto'
import type { Acta, Entidad } from '../../lib/ong'
import { btnPrimario, btnSutil } from '../../lib/ui'

const inputCls = 'w-full px-3 py-2.5 sm:py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[16px] sm:text-[12.5px] text-[#ececf1] placeholder-[#7d7d8e] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#7d7d8e] font-medium mb-1'

/**
 * Quiénes asistieron. El libro de Asistencia a reuniones pide los nombres, no
 * el total: sin ellos el quórum es la palabra contra el registro.
 *
 * Se eligen de una lista —autoridades primero, que son las que hacen quórum— y
 * queda un campo libre para quien no esté en ninguna: el contador, el escribano,
 * un invitado.
 */
export function Asistentes({ nombres, candidatos, requerido, onChange }: {
  nombres: string[]
  candidatos: string[]
  requerido: number | null
  onChange: (n: string[]) => void
}) {
  const [libre, setLibre] = useState('')

  const toggle = (n: string) =>
    onChange(nombres.includes(n) ? nombres.filter(x => x !== n) : [...nombres, n])

  const agregarLibre = () => {
    const n = libre.trim()
    if (!n) return
    if (!nombres.includes(n)) onChange([...nombres, n])
    setLibre('')
  }

  const falta = requerido != null ? requerido - nombres.length : null
  const extras = nombres.filter(n => !candidatos.includes(n))

  return (
    <div className="rounded-lg bg-[#101016] border border-[#1f1f2b] p-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={labelCls}>
          <Users className="w-3 h-3 inline mr-1 -mt-0.5" />Asistentes
        </span>
        <span className="text-[11px] tabular-nums ml-auto font-medium"
          style={{ color: falta != null && falta > 0 ? '#ff8a7a' : '#bef264' }}>
          {nombres.length}{requerido != null ? ` de ${requerido}` : ''}
          {falta != null && falta > 0 ? ` · faltan ${falta} para el quórum` : ''}
        </span>
      </div>

      {candidatos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {candidatos.map(n => {
            const puesto = nombres.includes(n)
            return (
              <button key={n} type="button" onClick={() => toggle(n)}
                className="text-[11.5px] px-2.5 py-2 sm:py-1 min-h-[44px] sm:min-h-0 rounded-lg border transition-colors"
                style={puesto
                  ? { borderColor: '#404d20', background: 'rgba(163,230,53,0.12)', color: '#d9f99d' }
                  : { borderColor: '#2a2a3a', background: '#15151d', color: '#a6a6b5' }}>
                {puesto ? '✓ ' : ''}{n}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <input value={libre} onChange={e => setLibre(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLibre() } }}
          placeholder="Otro asistente (contador, invitado…)" className={inputCls} />
        <button type="button" onClick={agregarLibre} className={btnSutil}>Sumar</button>
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {extras.map(n => (
            <button key={n} type="button" onClick={() => toggle(n)}
              className="text-[11.5px] px-2.5 py-1 rounded-lg border border-[#404d20] bg-[#a3e635]/12 text-[#d9f99d]"
              aria-label={`Quitar ${n}`}>
              {n} ×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** El acta redactada, para imprimir y pegar en el libro o transcribir. */
export function VisorActa({ acta, entidad, onCerrar }: {
  acta: Acta; entidad: Entidad | null; onCerrar: () => void
}) {
  return (
    <VisorDocumento titulo={`Acta N° ${acta.numero} · para el libro`}
      texto={redactarActa(acta, entidad)} faltantes={faltantesDelActa(acta, entidad)}
      nota={'Los libros son físicos y rubricados: esto se imprime y se pega, o se transcribe. ' +
        'El formato sigue el uso habitual de las actas de asociación civil, que es lo que se espera en una inspección.'}
      onCerrar={onCerrar} />
  )
}

/**
 * Visor de cualquier documento generado: acta, recibo, guía de tránsito,
 * mandato. Todos terminan en papel, así que todos comparten lo mismo — texto en
 * serif, aviso de lo que falta, copiar e imprimir con márgenes de hoja.
 */
export function VisorDocumento({ titulo, texto, faltantes, nota, extra, onCerrar }: {
  titulo: string; texto: string; faltantes: string[]; nota?: string
  /** Controles propios del documento, p. ej. alternar entre dos versiones. */
  extra?: React.ReactNode
  onCerrar: () => void
}) {
  const faltan = faltantes

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); toast.success('Documento copiado') }
    catch { toast.error('No se pudo copiar al portapapeles') }
  }

  // Ventana aparte con tipografía de libro y márgenes de hoja: el destino es el
  // papel, no la pantalla.
  const imprimir = () => {
    const w = window.open('', '_blank', 'width=820,height=900')
    if (!w) { toast.error('El navegador bloqueó la ventana. Permitile abrir ventanas.'); return }
    const escapado = texto.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
    w.document.write([
      '<html><head><meta charset="utf-8">',
      `<title>${titulo}</title>`,
      '<style>@page{margin:2.5cm}',
      'body{font-family:Georgia,"Times New Roman",serif;font-size:12pt;line-height:1.75;',
      'white-space:pre-wrap;color:#000;max-width:17cm;margin:0 auto}</style>',
      `</head><body>${escapado}</body></html>`,
    ].join(''))
    w.document.close(); w.focus(); w.print()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onCerrar}>
      <div className="bg-[#0d0d12] border border-[#1f1f2b] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-[#1f1f2b] sticky top-0 bg-[#0d0d12] flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h3>
          {extra}
          <div className="ml-auto flex gap-2">
            <button onClick={copiar} className={btnSutil}><Copy className="w-3.5 h-3.5" /> Copiar</button>
            <button onClick={imprimir} className={btnPrimario}><Printer className="w-3.5 h-3.5" /> Imprimir</button>
          </div>
        </div>

        <div className="p-4">
          {faltan.length > 0 && (
            <div className="rounded-lg bg-[#5a4a20]/15 border border-[#5a4a20] p-2.5 mb-3">
              <p className="text-[11.5px] text-[#fbbf24] leading-relaxed">
                Falta cargar {faltan.join(', ')}. En el texto queda marcado entre corchetes: completalo a mano
                o cargá el dato y volvé a abrir esto.
              </p>
            </div>
          )}
          {/* Serif y ancho de lectura: es un documento, no una pantalla */}
          <pre className="whitespace-pre-wrap font-serif text-[12.5px] leading-[1.75] text-[#d4d4dd] bg-[#0a0a0f] rounded-lg border border-[#1f1f2b] p-4 overflow-x-auto">
            {texto}
          </pre>
          {nota && <p className="text-[10.5px] text-[#7d7d8e] mt-2 leading-relaxed">{nota}</p>}
        </div>
      </div>
    </div>
  )
}
