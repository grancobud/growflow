import { useState, useEffect } from 'react'
import { X, Shield, Clock, User, FileText, ClipboardList, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ICONOS_OPERACION, type TipoOperacion } from '../../types'

interface Props {
  paso: {
    paso: number
    tipo: string
    nombre: string
    lote: string
    cantidad: string
    instalacion: string
    fecha: string
    esLabor: boolean
  }
  onClose: () => void
  onAbrirRegistro?: (codigo: string) => void
}

interface RegistroCUMCS {
  codigo_cumcs: string
  nombre_registro: string
  grupo: string
  grupo_nombre: string
  obligatorio: boolean
  descripcion: string
  procedimiento_referencia: string
  requiere_firma: boolean
}

export default function DetalleOperacion({ paso, onClose, onAbrirRegistro }: Props) {
  const [registrosCumcs, setRegistrosCumcs] = useState<RegistroCUMCS[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarCumcs() {
      const { data } = await supabase
        .from('vista_operacion_cumcs')
        .select('*')
        .eq('tipo_operacion', paso.tipo)

      if (data) setRegistrosCumcs(data as RegistroCUMCS[])
      setCargando(false)
    }
    cargarCumcs()
  }, [paso.tipo])

  const obligatorios = registrosCumcs.filter(r => r.obligatorio)
  const opcionales = registrosCumcs.filter(r => !r.obligatorio)

  // Campos especificos por tipo de operacion
  const camposEspecificos: Record<string, { label: string; valor: string }[]> = {
    ingreso_insumos: [
      { label: 'Almacen', valor: 'Planta Principal' },
      { label: 'Instalacion', valor: paso.instalacion },
      { label: 'Productos', valor: paso.cantidad },
    ],
    planta_madre: [
      { label: 'Modo escaneo', valor: 'Por rango (2 extremos)' },
      { label: 'Individuos', valor: paso.cantidad },
      { label: 'Instalacion', valor: paso.instalacion },
      { label: 'Responsable', valor: 'Operador' },
      { label: 'Temperatura', valor: '25.0 C' },
      { label: 'Humedad', valor: '60%' },
    ],
    fertilizacion: [
      { label: 'Tipo', valor: 'Labor cultural' },
      { label: 'Producto consumido', valor: 'Fertilizante Liquido' },
      { label: 'Cantidad usada', valor: '1 litro' },
      { label: 'Stock restante', valor: '9 litros' },
      { label: 'Lote fertilizado', valor: paso.lote },
    ],
    utilizacion_insumos: [
      { label: 'Tipo', valor: 'Labor cultural' },
      { label: 'Insumo', valor: 'Maceta' },
      { label: 'Cantidad', valor: '4 unidades' },
      { label: 'Lote destino', valor: paso.lote },
    ],
    baja_stock: [
      { label: 'Modo escaneo', valor: 'Individual (QR)' },
      { label: 'Individuo', valor: 'Codigo serie del QR' },
      { label: 'Motivo', valor: 'Muerte' },
      { label: 'Responsable', valor: 'Operador' },
    ],
    esquejado: [
      { label: 'Modo escaneo', valor: 'Por rango (2 extremos)' },
      { label: 'Esquejes generados', valor: '10' },
      { label: 'Planta madre origen', valor: 'QR escaneado' },
      { label: 'Instalacion', valor: paso.instalacion },
      { label: 'Temperatura', valor: '24.0 C' },
      { label: 'Humedad', valor: '70%' },
    ],
    vegetativa: [
      { label: 'Transicion', valor: 'Esqueje → Planta' },
      { label: 'Esquejes decrementados', valor: '10' },
      { label: 'Plantas generadas', valor: '10' },
      { label: 'Sustrato', valor: 'Coco + Perlita' },
      { label: 'Temperatura', valor: '25.0 C' },
      { label: 'CO2', valor: '800 ppm' },
    ],
    poda: [
      { label: 'Tipo', valor: 'Labor cultural' },
      { label: 'Modo escaneo', valor: 'Individual (QR)' },
      { label: 'Individuo podado', valor: 'Codigo serie' },
      { label: 'Responsable', valor: 'Operador' },
    ],
    floracion: [
      { label: 'Modo escaneo', valor: 'Por lote (1 QR trae todo)' },
      { label: 'Individuos movidos', valor: '10' },
      { label: 'Origen', valor: 'Sala Vegetativa' },
      { label: 'Destino', valor: 'Sala de Flora' },
      { label: 'Obs. sanitarias', valor: 'Ninguna' },
      { label: 'Temperatura', valor: '20.0 C' },
    ],
    control_plagas: [
      { label: 'Tipo', valor: 'Labor cultural' },
      { label: 'Lote tratado', valor: paso.lote },
      { label: 'Instalacion', valor: paso.instalacion },
    ],
    cosecha: [
      { label: 'Modo escaneo', valor: 'Por lote (1 QR)' },
      { label: 'Plantas cosechadas', valor: '10' },
      { label: 'Peso fresco', valor: '35 kg' },
      { label: 'Destino', valor: 'Sala de Cosecha' },
    ],
    secado: [
      { label: 'Plantas decrementadas', valor: '10' },
      { label: 'Flores generadas', valor: '9 (1 baja)' },
      { label: 'Modo generacion', valor: 'QR rango' },
      { label: 'Horas secado', valor: '2 horas' },
    ],
    trimming: [
      { label: 'Flores decrementadas', valor: '9 individuos' },
      { label: 'Producto generado', valor: 'Flor trimmeada (granel)' },
      { label: 'Pierde individualidad', valor: 'SI - pasa a lote' },
      { label: 'Peso neto', valor: '52 g' },
      { label: 'Rendimiento', valor: '100%' },
    ],
    cuarentena: [
      { label: 'Reubicacion', valor: 'Deposito de Cuarentena' },
      { label: 'Modo escaneo', valor: 'Etiqueta lote' },
      { label: 'Motivo cuarentena', valor: 'Analisis pendiente' },
      { label: 'Resultado analisis', valor: 'Pendiente' },
    ],
    fraccionamiento: [
      { label: 'Lote decrementado', valor: 'Flor trimmeada' },
      { label: 'Producto generado', valor: 'Flor fraccionada' },
      { label: 'Cantidad', valor: '9 unidades' },
      { label: 'Peso unitario', valor: '5.8 g' },
    ],
    almacenamiento: [
      { label: 'Reubicacion final', valor: 'Deposito Final' },
      { label: 'Producto', valor: 'Flor fraccionada' },
      { label: 'Cantidad', valor: '9 unidades' },
      { label: 'Estado', valor: 'Disponible para venta' },
    ],
  }

  const campos = camposEspecificos[paso.tipo] || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-primary-600 px-6 py-4 text-white rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{ICONOS_OPERACION[paso.tipo as TipoOperacion]}</span>
              <h3 className="text-lg font-semibold">{paso.nombre}</h3>
              {paso.esLabor && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Labor cultural</span>
              )}
            </div>
            <p className="text-sm text-primary-200 mt-1">
              {paso.instalacion} | {paso.fecha}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Datos de la operacion */}
        <div className="p-6 space-y-5">
          {/* Campos especificos */}
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-surface-400" />
              Datos de la Operacion
            </h4>
            <div className="bg-surface-50 rounded-xl p-4 space-y-2">
              {campos.map((c, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-surface-100 last:border-0">
                  <span className="text-xs text-surface-500">{c.label}</span>
                  <span className="text-xs font-medium text-surface-900">{c.valor}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-surface-500">Lote</span>
                <span className="text-xs font-mono font-medium text-primary-600">{paso.lote}</span>
              </div>
            </div>
          </div>

          {/* Registros CUMCS vinculados */}
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              Registros CUMCS Requeridos
              <span className="text-xs font-normal text-surface-400">
                ({registrosCumcs.length} registros, {obligatorios.length} obligatorios)
              </span>
            </h4>

            {cargando ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : registrosCumcs.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-4">Sin registros CUMCS vinculados</p>
            ) : (
              <div className="space-y-2">
                {/* Obligatorios */}
                {obligatorios.length > 0 && (
                  <div className="space-y-1.5">
                    {obligatorios.map((reg) => (
                      <button
                        key={reg.codigo_cumcs}
                        onClick={() => onAbrirRegistro?.(reg.codigo_cumcs)}
                        className="w-full flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-left"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-surface-900 truncate">{reg.nombre_registro}</p>
                          <p className="text-[10px] text-surface-500">{reg.codigo_cumcs} | Ref: {reg.procedimiento_referencia}</p>
                        </div>
                        <span className="text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          Obligatorio
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Opcionales */}
                {opcionales.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {opcionales.map((reg) => (
                      <button
                        key={reg.codigo_cumcs}
                        onClick={() => onAbrirRegistro?.(reg.codigo_cumcs)}
                        className="w-full flex items-center gap-3 p-3 bg-surface-50 border border-surface-100 rounded-lg hover:bg-surface-100 transition-colors text-left"
                      >
                        <CheckCircle2 className="w-4 h-4 text-surface-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-surface-900 truncate">{reg.nombre_registro}</p>
                          <p className="text-[10px] text-surface-500">{reg.codigo_cumcs} | {reg.descripcion}</p>
                        </div>
                        <span className="text-[10px] font-medium bg-surface-200 text-surface-500 px-2 py-0.5 rounded-full flex-shrink-0">
                          Opcional
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audit trail info */}
          <div className="p-3 bg-primary-50 rounded-xl text-xs text-primary-700 space-y-1.5">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Timestamp: {paso.fecha} (UTC del servidor, no editable)
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Registrado por: Operador (firma SHA-256 vinculada)
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Audit trail inmutable | Hash encadenado al registro anterior
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
