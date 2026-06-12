// Input de texto con dropdown de sugerencias desde la BD + opcion "+ Nuevo".
// Reutilizado en CamposCumcs (Form completo) y eventualmente Chat / Agente.

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  sugerencias: string[]
  placeholder?: string
  type?: 'text' | 'date' | 'number'
  autoFormat?: (raw: string) => string  // Ej formatearIdLote
  className?: string
  disabled?: boolean
  // Si el valor (post-format) no esta en sugerencias, marcamos visualmente como "nuevo".
  marcarNuevoSiNoEsta?: boolean
  // Callback opcional cuando el user selecciona "Nuevo: X" (pa pedir confirmacion en padre).
  onMarcarNuevo?: (valor: string) => void
}

export default function InputConSugerencias({
  value, onChange, sugerencias, placeholder, type = 'text',
  autoFormat, className, disabled, marcarNuevoSiNoEsta, onMarcarNuevo,
}: Props) {
  const [open, setOpen] = useState(false)
  const [tempInput, setTempInput] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sincronizar tempInput con value externo
  useEffect(() => { setTempInput(value) }, [value])

  // Cerrar al click fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtradas = !tempInput
    ? sugerencias
    : sugerencias.filter(s => s.toLowerCase().includes(tempInput.toLowerCase()))

  const valorFormateado = autoFormat ? autoFormat(tempInput) : tempInput
  const yaExiste = sugerencias.some(s => {
    const aN = autoFormat ? autoFormat(s) : s
    return aN.toLowerCase() === valorFormateado.toLowerCase()
  })
  const mostrarNuevo = !!tempInput && !yaExiste

  // Aplicar el valor (con auto-format si corresponde)
  function aplicar(raw: string, esNuevo = false) {
    const v = autoFormat ? autoFormat(raw) : raw
    onChange(v)
    setTempInput(v)
    setOpen(false)
    if (esNuevo && onMarcarNuevo) onMarcarNuevo(v)
  }

  const inputClass = className ?? 'w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30'
  const esNuevoBadge = marcarNuevoSiNoEsta && value && !sugerencias.some(s => (autoFormat ? autoFormat(s) : s).toLowerCase() === (autoFormat ? autoFormat(value) : value).toLowerCase())

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={tempInput}
          disabled={disabled}
          placeholder={placeholder}
          onChange={e => { setTempInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Apply on blur si cambio
            if (tempInput !== value) {
              const v = autoFormat ? autoFormat(tempInput) : tempInput
              onChange(v); setTempInput(v)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); aplicar(tempInput); (e.target as HTMLInputElement).blur() }
            if (e.key === 'Escape') { setOpen(false); setTempInput(value) }
          }}
          className={inputClass}
        />
        {esNuevoBadge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded whitespace-nowrap">NUEVO</span>
        )}
      </div>
      {open && (sugerencias.length > 0 || mostrarNuevo) && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg shadow-md">
          {sugerencias.length > 0 && (
            <div className="sticky top-0 bg-surface-100 dark:bg-surface-900 px-2 py-1 text-[9px] font-mono text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
              BD ({sugerencias.length}) {tempInput && `· filtrando "${tempInput}"`}
            </div>
          )}
          {filtradas.slice(0, 25).map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); aplicar(s) }}
              className="block w-full text-left px-2 py-1.5 text-xs hover:bg-primary-50 dark:hover:bg-primary-950/40 text-surface-700 dark:text-surface-300 truncate border-b border-surface-100 dark:border-surface-900 last:border-0"
            >
              {s}
            </button>
          ))}
          {mostrarNuevo && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); aplicar(tempInput, true) }}
              className="block w-full text-left px-2 py-2 text-xs bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 truncate"
            >
              ＋ Nuevo: "{valorFormateado}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
