import { useState } from 'react'
import { Droplets, Boxes, BookOpen } from 'lucide-react'
import GuiaRiego from '../components/hardware/GuiaRiego'
import InsumosRiego from '../components/hardware/InsumosRiego'

export default function PaginaRiego() {
  const [tab, setTab] = useState<'insumos' | 'guia'>('insumos')
  const tabBtn = (activo: boolean) =>
    `flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border transition-colors ${activo
      ? 'bg-[#7dd3fc]/15 border-[#7dd3fc]/40 text-[#7dd3fc]'
      : 'bg-transparent border-[#1f1f2b] text-[#8f8f9f] hover:text-[#d4d4dd]'}`
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 max-w-[1200px] mx-auto w-full">
          <Droplets className="w-4 h-4 text-[#7dd3fc] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">
              Riego — Clon de Growcast
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Insumos, válvulas, bomba y crop steering
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>P0/P1/P2 · ESP32 + ESPHome</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-6 pb-2 max-w-[1200px] mx-auto w-full">
          <button className={tabBtn(tab === 'insumos')} onClick={() => setTab('insumos')}><Boxes className="w-3.5 h-3.5" /> Insumos</button>
          <button className={tabBtn(tab === 'guia')} onClick={() => setTab('guia')}><BookOpen className="w-3.5 h-3.5" /> Guía</button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 max-w-[1200px] mx-auto w-full">
        {tab === 'insumos' ? <InsumosRiego /> : <GuiaRiego />}
      </div>
    </div>
  )
}
