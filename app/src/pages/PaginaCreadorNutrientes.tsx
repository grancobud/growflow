import { FlaskConical } from 'lucide-react'
import CreadorNutrientes from '../components/nutrientes/CreadorNutrientes'

export default function PaginaCreadorNutrientes() {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 max-w-[1200px] mx-auto w-full">
          <FlaskConical className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">
              Calculadora creadora de fertilizantes
            </h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Perfil objetivo → sales e insumos necesarios
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>Solver NNLS · base de sales · presets coco</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 max-w-[1200px] mx-auto w-full">
        <CreadorNutrientes />
      </div>
    </div>
  )
}
