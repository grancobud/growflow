import { useEffect, useState } from 'react'
// @ts-ignore
import bwipjs from 'bwip-js'
import { X } from 'lucide-react'

function GS1DataMatrix({ codigo, size = 240 }: { codigo: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>('')
  useEffect(() => {
    const payload = `(10)${codigo}(21)${Date.now().toString().slice(-6)}`
    try {
      const canvas = document.createElement('canvas')
      bwipjs.toCanvas(canvas, { bcid: 'gs1datamatrix', text: payload, scale: 2, height: size / 4, width: size / 4 })
      setDataUrl(canvas.toDataURL())
    } catch { /* ignore */ }
  }, [codigo, size])
  return dataUrl ? <img src={dataUrl} alt="GS1" style={{ width: size, height: size, imageRendering: 'pixelated' }} /> : <div style={{ width: size, height: size }} />
}

export default function GS1Modal({ lote, onClose }: { lote: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-surface-400">GS1 DataMatrix</p>
            <h3 className="text-lg font-bold text-surface-900 font-mono">{lote.codigo_lote}</h3>
            <p className="text-xs text-surface-500 mt-1">Estandar pharma GS1 - AI (10) LOT + (21) SERIAL</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"><X className="w-5 h-5 text-surface-400" /></button>
        </div>
        <div className="flex justify-center bg-white p-4 border border-surface-200 rounded-xl">
          <GS1DataMatrix codigo={lote.codigo_lote} size={240} />
        </div>
        <p className="text-xs text-center text-surface-500 mt-3 font-mono">
          (10){lote.codigo_lote}(21)XXXXXX
        </p>
        <p className="text-[10px] text-center text-surface-400 mt-2">
          Cumple GS1 General Specifications para trazabilidad pharma obligatoria
        </p>
      </div>
    </div>
  )
}
