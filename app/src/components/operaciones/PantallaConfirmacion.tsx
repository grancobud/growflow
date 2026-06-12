import { CheckCircle2, Edit3, Shield, Clock, User } from 'lucide-react'
import type { Operacion } from '../../types'
import { ETIQUETAS_OPERACION, ICONOS_OPERACION } from '../../types'

interface Props {
  datos: Partial<Operacion>
  onConfirmar: () => void
  onEditar: () => void
}

export default function PantallaConfirmacion({ datos, onConfirmar, onEditar }: Props) {
  const tipo = datos.tipo_operacion
  if (!tipo) return null

  const campos = [
    { label: 'Operacion', valor: `${ICONOS_OPERACION[tipo]} ${ETIQUETAS_OPERACION[tipo]}` },
    datos.cantidad_entrada && { label: 'Cantidad', valor: `${datos.cantidad_entrada}` },
    datos.peso_fresco_kg && { label: 'Peso fresco', valor: `${datos.peso_fresco_kg} kg` },
    datos.peso_seco_kg && { label: 'Peso seco', valor: `${datos.peso_seco_kg} kg` },
    datos.peso_neto_g && { label: 'Peso neto', valor: `${datos.peso_neto_g} g` },
    datos.rendimiento_porcentaje && { label: 'Rendimiento', valor: `${datos.rendimiento_porcentaje}%` },
    datos.temperatura_c && { label: 'Temperatura', valor: `${datos.temperatura_c} C` },
    datos.humedad_porcentaje && { label: 'Humedad', valor: `${datos.humedad_porcentaje}%` },
    datos.observaciones && { label: 'Observaciones', valor: datos.observaciones },
    datos.notas_sanitarias && { label: 'Notas sanitarias', valor: datos.notas_sanitarias },
    datos.responsable && { label: 'Responsable', valor: datos.responsable },
  ].filter(Boolean) as { label: string; valor: string }[]

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-primary-600 px-6 py-4 text-white">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Confirmar Operacion
        </h3>
        <p className="text-sm text-primary-200 mt-1">
          Revisa los datos antes de registrar
        </p>
      </div>

      {/* Campos */}
      <div className="p-6 space-y-3">
        {campos.map((campo, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-surface-100 last:border-0">
            <span className="text-sm text-surface-500">{campo.label}</span>
            <span className="text-sm font-medium text-surface-900">{campo.valor}</span>
          </div>
        ))}

        {/* Info GAMP5 */}
        <div className="mt-4 p-3 bg-surface-50 rounded-xl text-xs text-surface-500 space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Timestamp: servidor UTC (no editable)
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Firmado por: usuario actual + SHA-256
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Audit trail: inmutable, hash encadenado
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onEditar}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-100 text-surface-600 rounded-xl text-sm font-medium hover:bg-surface-200 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
        >
          <CheckCircle2 className="w-4 h-4" />
          Confirmar
        </button>
      </div>
    </div>
  )
}
