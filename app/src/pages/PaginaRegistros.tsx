import { useState, useEffect } from 'react'
import { ChevronRight, Search, CheckCircle2, Thermometer, Link2, FlaskConical, Droplets, Bug, Scissors, Wrench, Users, Microscope, ClipboardList, Sprout, FileCheck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AREAS, SUBCATEGORIAS } from '../lib/cumcsJerarquia'
import CamposCumcs from '../components/operaciones/CamposCumcs'

interface TipoRegistro {
  codigo: string
  nombre: string
  grupo: string
  grupo_nombre: string
  procedimiento_referencia: string
  obligatorio: boolean
  medio_archivo: string
  conservacion: string
  requiere_firma: boolean
  tabla_destino: string
}


const grupoIconos: Record<string, LucideIcon> = {
  'G01': Thermometer, 'G02': Link2, 'G03': FlaskConical, 'G04': Droplets, 'G05': Bug,
  'G06': Scissors, 'G07': Wrench, 'G08': Users, 'G09': Microscope, 'G10': ClipboardList,
}

const areaIconos: Record<string, LucideIcon> = {
  produccion: Sprout, cosecha: Scissors, infraestructura: Wrench, calidad: FileCheck,
}

export default function PaginaRegistros() {
  const [tipos, setTipos] = useState<TipoRegistro[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [areaFiltro, setAreaFiltro] = useState<string>('todas')
  const [grupoFiltro, setGrupoFiltro] = useState<string>('todos')
  const [registroActivo, setRegistroActivo] = useState<TipoRegistro | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [msgExito, setMsgExito] = useState('')
  const [msgError, setMsgError] = useState('')
  // Form state
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0])
  const [formResponsable, setFormResponsable] = useState('')
  const [formObs, setFormObs] = useState('')
  const [formCampos, setFormCampos] = useState<Record<string, string>>({})

  const setFormCampo = (k: string, v: string) => setFormCampos(prev => ({ ...prev, [k]: v }))

  const limpiarForm = () => {
    setFormFecha(new Date().toISOString().split('T')[0])
    setFormResponsable('')
    setFormObs('')
    setFormCampos({})
  }

  // Mapeo codigo CUMCS -> tipo valido para cada tabla con check constraint
  const mapTipoAgua: Record<string, string> = {
    'CM-RE-0401': 'sanitizacion_agua', 'CM-RE-0402': 'analisis_agua', 'CM-RE-0403': 'volumen_riego',
  }
  const mapTipoFito: Record<string, string> = {
    'CM-RE-0501': 'control_plagas', 'CM-RE-0502': 'monitoreo_plagas', 'CM-RE-0503': 'aplicacion_fitosanitario',
    'CM-RE-0504': 'aplicacion_fitosanitario', 'CM-RE-0505': 'reingreso_parcela', 'CM-RE-0506': 'lmr_postcosecha',
    'CM-RE-0507': 'gestion_envases',
  }
  const mapTipoMant: Record<string, string> = {
    'CM-RE-0701': 'calibracion_balanza', 'CM-RE-0702': 'calibracion_equipos', 'CM-RE-0703': 'mantenimiento_generador',
    'CM-RE-0704': 'mantenimiento_ac', 'CM-RE-0705': 'mantenimiento_ventiladores', 'CM-RE-0706': 'mantenimiento_deshumificadores',
    'CM-RE-0707': 'mantenimiento_osmosis',
  }
  const mapTipoCosecha: Record<string, string> = {
    'CM-RE-0601': 'cosecha', 'CM-RE-0602': 'cosecha', 'CM-RE-0603': 'cosecha', 'CM-RE-0604': 'cosecha',
    'CM-RE-0605': 'secado', 'CM-RE-0606': 'trimming', 'CM-RE-0607': 'cuarentena',
    'CM-RE-0608': 'almacenamiento', 'CM-RE-0609': 'almacenamiento', 'CM-RE-0610': 'almacenamiento',
    'CM-RE-0611': 'planta_madre',
  }
  const mapTipoCalidad: Record<string, string> = {
    'CM-RE-0901': 'certificado_lote', 'CM-RE-0902': 'toma_muestras',
    'CM-RE-0903': 'contramuestras_producto', 'CM-RE-0904': 'contramuestras_sustrato',
    'CM-RE-0905': 'analisis_postcosecha', 'CM-RE-0906': 'reclamo_cliente',
    'CM-RE-0907': 'queja_interna', 'CM-RE-0908': 'devolucion',
    'CM-RE-0909': 'no_conforme', 'CM-RE-0910': 'disposicion_cannabis',
    'CM-RE-0911': 'disposicion_residuos',
  }
  const mapTipoDoc: Record<string, string> = {
    'CM-RE-1001': 'revision_especificacion', 'CM-RE-1002': 'documento_externo', 'CM-RE-1003': 'analisis_riesgos',
    'CM-RE-1004': 'control_cambios', 'CM-RE-1005': 'auditoria_interna', 'CM-RE-1006': 'sugerencia',
    'CM-RE-1007': 'proveedor', 'CM-RE-1008': 'recomendacion_tecnica', 'CM-RE-1009': 'pedido_insumos',
    'CM-RE-1010': 'documento_externo',
  }

  const guardarRegistro = async () => {
    if (!registroActivo) return
    if (!formResponsable.trim()) { setMsgError('Responsable es obligatorio'); return }
    setGuardando(true)
    setMsgError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      if (!userId) { setMsgError('No hay sesion activa'); setGuardando(false); return }

      const grupo = registroActivo.grupo
      let error: any = null

      if (grupo === 'G02') {
        // G02: Trazabilidad - guardar en lotes (afecta trazabilidad directamente)
        const cod = registroActivo.codigo
        const sistema = formCampos.sistema || 'RDWC'

        if (cod === 'CM-RE-0201') {
          // Planta Madre -> crear lote planta_madre
          const codigoLote = formCampos.codigo_id
          if (!codigoLote) { setMsgError('Codigo ID es obligatorio'); setGuardando(false); return }
          const res = await supabase.from('lotes').insert({
            codigo_lote: codigoLote,
            producto_id: '571dec51-f647-4212-a064-b046cc2d9cce',
            instalacion_id: '6fa58fa3-e6e8-4b1e-ac17-421455fbe4c5',
            cantidad: 1, estado: 'activo', creado_por: userId,
            datos_extra: {
              tipo: 'planta_madre', genetica: 'PETE HOPE (Ka)', sistema,
              fecha_ingreso: formCampos.fecha_ingreso || null,
              fecha_baja: formCampos.fecha_baja || 'Vigentes',
              clonacion_origen: formCampos.clonacion_origen || 'Inicial',
              madre_origen: formCampos.madre_origen || 'Inicial',
              registro_cumcs: 'CM-RE-0201',
              responsable: formResponsable, observaciones: formObs,
            }
          })
          error = res.error
        } else {
          // Otros G02: guardar como registro documental por ahora
          const res = await supabase.from('registros_documentales').insert({
            tipo: 'documento_externo', fecha: formFecha, titulo: `${registroActivo.nombre} - ${formCampos.cod_traza || formCampos.camada || ''}`,
            descripcion: Object.entries(formCampos).filter(([,v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | '),
            responsable: formResponsable, observaciones: formObs, creado_por: userId,
          })
          error = res.error
        }
      } else if (grupo === 'G01') {
        // Guardar en operaciones (condiciones ambientales)
        const res = await supabase.from('operaciones').insert({
          tipo_operacion: 'fertilizacion',
          estado: 'confirmada',
          fecha_operacion: formFecha,
          responsable: formResponsable,
          observaciones: formObs,
          temperatura_c: formCampos.temperatura ? parseFloat(formCampos.temperatura) : null,
          humedad_porcentaje: formCampos.humedad ? parseFloat(formCampos.humedad) : null,
          co2_ppm: formCampos.co2 ? parseInt(formCampos.co2) : null,
          datos_extra: {
            registro_cumcs: registroActivo.codigo,
            grupo: registroActivo.grupo,
            sistema: formCampos.sistema || null,
            sala: formCampos.sala || null,
            id_lote: formCampos.id_lote || null,
            variedad: formCampos.variedad || null,
            temp_aa: formCampos.temp_aa || null,
            temp_h2o: formCampos.temp_h2o || null,
            ec: formCampos.ec || null,
            vpd: formCampos.vpd || null,
            ph_inicial: formCampos.ph_inicial || null,
            ph_ml: formCampos.ph_ml || null,
            ph_corregido: formCampos.ph_corregido || null,
            ventilacion: formCampos.ventilacion || null,
          },
          creado_por: userId,
        })
        error = res.error
      } else if (grupo === 'G06') {
        // G06 Cosecha y Postcosecha: guardar en operaciones con tipo segun codigo
        const cod = registroActivo.codigo
        const tipoOp = mapTipoCosecha[cod] || 'cosecha'
        let loteId: string | null = null
        const codigoLote = formCampos.id_lote || formCampos.cod_traza_cosecha || formCampos.lote_cultivo || formCampos.nombre_lote
        if (codigoLote) {
          const { data: lote } = await supabase.from('lotes').select('id').eq('codigo_lote', codigoLote).maybeSingle()
          loteId = lote?.id || null
        }
        const res = await supabase.from('operaciones').insert({
          tipo_operacion: tipoOp,
          estado: 'confirmada',
          fecha_operacion: formFecha,
          lote_origen_id: loteId,
          responsable: formResponsable,
          observaciones: formObs || null,
          notas_sanitarias: formCampos.cond_sanitaria || formCampos.obs_sanitarias || formCampos.cond_recepcion || null,
          peso_fresco_kg: formCampos.peso_fresco ? parseFloat(formCampos.peso_fresco) : (formCampos.kg_humedo ? parseFloat(formCampos.kg_humedo) : null),
          peso_seco_kg: formCampos.peso_seco ? parseFloat(formCampos.peso_seco) : null,
          peso_neto_g: formCampos.peso_neto_g ? parseFloat(formCampos.peso_neto_g) : null,
          rendimiento_porcentaje: formCampos.rendimiento ? parseFloat(formCampos.rendimiento) : null,
          temperatura_c: formCampos.temperatura ? parseFloat(formCampos.temperatura) : null,
          humedad_porcentaje: formCampos.humedad ? parseFloat(formCampos.humedad) : null,
          horas_secado: formCampos.horas_secado ? parseFloat(formCampos.horas_secado) : null,
          cantidad_entrada: formCampos.plantas_cosechadas ? parseFloat(formCampos.plantas_cosechadas) : (formCampos.cantidad_recibida ? parseFloat(formCampos.cantidad_recibida) : (formCampos.cantidad ? parseFloat(formCampos.cantidad) : null)),
          datos_extra: {
            registro_cumcs: cod,
            grupo: 'G06',
            sistema: formCampos.sistema || null,
            sala: formCampos.sala || null,
            ubicacion_cultivo: formCampos.ubicacion_cultivo || null,
            camada: formCampos.camada || null,
            genetica: formCampos.genetica || null,
            fila: formCampos.fila || null,
            cama: formCampos.cama || null,
            id_planta: formCampos.id_planta || null,
            cuadro_secado: formCampos.cuadro_secado || null,
            estado_producto: formCampos.estado_producto || null,
            cumple_bpa: formCampos.cumple_bpa || null,
            instrumental: formCampos.instrumental || null,
            cod_traza_cosecha: formCampos.cod_traza_cosecha || null,
            cod_traza_secado: formCampos.cod_traza_secado || null,
            cod_traza_trimeo: formCampos.cod_traza_trimeo || null,
            cod_traza_cuarentena: formCampos.cod_traza_cuarentena || null,
            cod_traza_almacenamiento: formCampos.cod_traza_almacenamiento || null,
            cod_traza_propagacion: formCampos.cod_traza_propagacion || null,
            responsable_sala: formCampos.responsable_sala || null,
            responsable_calidad: formCampos.responsable_calidad || null,
            responsable_entrega: formCampos.responsable_entrega || null,
            responsable_recepcion: formCampos.responsable_recepcion || null,
            transporte: formCampos.transporte || null,
            destino: formCampos.destino || null,
            patente: formCampos.patente || null,
            chofer: formCampos.chofer || null,
            fecha_cosecha: formCampos.fecha_cosecha || null,
            fecha_transplante: formCampos.fecha_transplante || null,
            fecha_traslado: formCampos.fecha_traslado || null,
            fecha_recepcion: formCampos.fecha_recepcion || null,
            fecha_salida: formCampos.fecha_salida || null,
            fecha_inicio_cuarentena: formCampos.fecha_inicio_cuarentena || null,
            fecha_fin_cuarentena: formCampos.fecha_fin_cuarentena || null,
            cantidad_bolsas: formCampos.cantidad_bolsas || null,
            cod_comercial: formCampos.cod_comercial || null,
            cantidad_esquejes: formCampos.cantidad_esquejes || null,
            num_lote_propagacion: formCampos.num_lote_propagacion || null,
          },
          creado_por: userId,
        })
        error = res.error
      } else if (grupo === 'G04') {
        // Guardar en registros_agua. Compone observaciones con campos no mapeados a columnas.
        const cod = registroActivo.codigo
        const extras: string[] = []
        if (formObs) extras.push(formObs)
        if (cod === 'CM-RE-0401') {
          if (formCampos.producto) extras.push(`Producto: ${formCampos.producto}`)
          if (formCampos.cant_producto) extras.push(`Cant: ${formCampos.cant_producto} ml`)
        }
        if (cod === 'CM-RE-0402') {
          if (formCampos.punto_muestreo) extras.push(`Pto: ${formCampos.punto_muestreo}`)
          if (formCampos.hora) extras.push(`Hora: ${formCampos.hora}`)
          if (formCampos.fecha_extraccion) extras.push(`F.Extracc: ${formCampos.fecha_extraccion}`)
          if (formCampos.fecha_recepcion) extras.push(`F.Recep: ${formCampos.fecha_recepcion}`)
          if (formCampos.fecha_inicio_ensayo) extras.push(`F.Inicio: ${formCampos.fecha_inicio_ensayo}`)
          if (formCampos.laboratorio) extras.push(`Lab: ${formCampos.laboratorio}`)
          if (formCampos.protocolo) extras.push(`Protocolo: ${formCampos.protocolo}`)
          if (formCampos.tipo_analisis) extras.push(`Tipo: ${formCampos.tipo_analisis}`)
          if (formCampos.resultados_texto) extras.push(`Resultados: ${formCampos.resultados_texto}`)
          if (formCampos.documento) extras.push(`Doc: ${formCampos.documento}`)
        }
        if (cod === 'CM-RE-0403') {
          if (formCampos.destino) extras.push(`Destino: ${formCampos.destino}`)
        }
        const res = await supabase.from('registros_agua').insert({
          tipo: mapTipoAgua[cod] || 'analisis_agua',
          fecha: formFecha,
          ph: formCampos.ph ? parseFloat(formCampos.ph) : null,
          ec_ms: formCampos.ec ? parseFloat(formCampos.ec) : null,
          cloro_ppm: formCampos.cloro ? parseFloat(formCampos.cloro) : null,
          volumen_litros: formCampos.volumen ? parseFloat(formCampos.volumen) : null,
          temperatura_agua_c: formCampos.temp_agua ? parseFloat(formCampos.temp_agua) : null,
          resultado: (formCampos.resultado || 'conforme').toLowerCase(),
          responsable: formResponsable,
          observaciones: extras.join(' | ') || null,
          creado_por: userId,
        })
        error = res.error
      } else if (grupo === 'G05') {
        // Guardar en registros_fitosanitarios. Resuelve lote_id si ID Lote ingresado.
        const cod = registroActivo.codigo
        let loteId: string | null = null
        if (formCampos.id_lote) {
          const { data: lote } = await supabase.from('lotes').select('id').eq('codigo_lote', formCampos.id_lote).maybeSingle()
          loteId = lote?.id || null
        }
        const extras: string[] = []
        if (formObs) extras.push(formObs)
        if (cod === 'CM-RE-0501') {
          if (formCampos.cebo_n) extras.push(`Cebo Nº ${formCampos.cebo_n}`)
          if (formCampos.ubicacion) extras.push(`Ubic: ${formCampos.ubicacion}`)
          if (formCampos.control_tipo) extras.push(`${formCampos.control_tipo === 'C' ? 'Control' : 'Reposicion'}`)
          if (formCampos.autorizado) extras.push(`Autoriz: ${formCampos.autorizado}`)
        }
        if (cod === 'CM-RE-0502') {
          if (formCampos.area) extras.push(`Area: ${formCampos.area}`)
          if (formCampos.temporada) extras.push(`Temp: ${formCampos.temporada}`)
          if (formCampos.cultivo) extras.push(`Cultivo: ${formCampos.cultivo}`)
          if (formCampos.variedad) extras.push(`Var: ${formCampos.variedad}`)
        }
        if (cod === 'CM-RE-0504') {
          if (formCampos.variedad) extras.push(`Var: ${formCampos.variedad}`)
          if (formCampos.ubicacion) extras.push(`Ubic: ${formCampos.ubicacion}`)
          if (formCampos.cond_amb) extras.push(`Cond.amb: ${formCampos.cond_amb}`)
          if (formCampos.operario) extras.push(`Operario: ${formCampos.operario}`)
          if (formCampos.asesor) extras.push(`Asesor: ${formCampos.asesor}`)
        }
        if (cod === 'CM-RE-0505') {
          if (formCampos.id_lote && !loteId) extras.push(`Lote: ${formCampos.id_lote}`)
          if (formCampos.fecha_aplicacion) extras.push(`F.Aplic: ${formCampos.fecha_aplicacion}`)
        }
        if (cod === 'CM-RE-0506') {
          if (formCampos.id_lote && !loteId) extras.push(`Lote: ${formCampos.id_lote}`)
          if (formCampos.laboratorio) extras.push(`Lab: ${formCampos.laboratorio}`)
        }
        if (cod === 'CM-RE-0507') {
          if (formCampos.cantidad) extras.push(`Cant: ${formCampos.cantidad}`)
          if (formCampos.gestion) extras.push(`Gestion: ${formCampos.gestion}`)
        }
        const res = await supabase.from('registros_fitosanitarios').insert({
          tipo: mapTipoFito[cod] || 'control_plagas',
          fecha: formFecha,
          lote_id: loteId,
          plaga_detectada: formCampos.plaga || formCampos.objetivo || null,
          producto_aplicado: formCampos.producto || formCampos.principio_activo || null,
          dosis: formCampos.dosis || null,
          metodo_aplicacion: formCampos.equipo || null,
          periodo_carencia_dias: formCampos.carencia ? parseInt(formCampos.carencia) : null,
          fecha_reingreso: formCampos.fecha_habilitacion || null,
          resultado_lmr: formCampos.resultado_lmr || null,
          aprobado: formCampos.cumple ? formCampos.cumple === 'SI' : (cod === 'CM-RE-0503' ? true : null),
          responsable: formResponsable,
          observaciones: extras.join(' | ') || null,
          creado_por: userId,
        })
        error = res.error
      } else if (grupo === 'G07') {
        // Guardar en registros_mantenimiento
        const res = await supabase.from('registros_mantenimiento').insert({
          tipo: mapTipoMant[registroActivo.codigo] || 'calibracion_equipos',
          fecha_mantenimiento: formFecha,
          equipo_nombre: formCampos.equipo || null,
          tipo_mantenimiento: (formCampos.tipo_mant || 'preventivo').toLowerCase(),
          resultado: (formCampos.resultado || 'conforme').toLowerCase().replace(/ /g, '_'),
          responsable: formResponsable,
          observaciones: formObs,
          creado_por: userId,
        })
        error = res.error
      } else if (grupo === 'G09') {
        // G09 Calidad y No Conformidades → registros_calidad
        const cod = registroActivo.codigo
        let loteId: string | null = null
        const codigoLote = formCampos.id_lote || formCampos.lote || formCampos.cod_traza
        if (codigoLote) {
          const { data: lote } = await supabase.from('lotes').select('id').eq('codigo_lote', codigoLote).maybeSingle()
          loteId = lote?.id || null
        }
        const resultadoMap: Record<string, string> = {
          'aprobado': 'aprobado', 'aprobada': 'aprobado',
          'rechazado': 'rechazado', 'rechazada': 'rechazado',
          'pendiente': 'pendiente', 'cerrado': 'cerrado', 'cerrada': 'cerrado',
        }
        const rawResultado = (formCampos.resultado || '').toLowerCase()
        const resultado = resultadoMap[rawResultado] || (cod === 'CM-RE-0909' ? 'pendiente' : 'aprobado')
        const res = await supabase.from('registros_calidad').insert({
          tipo: mapTipoCalidad[cod] || 'certificado_lote',
          fecha: formFecha,
          lote_id: loteId,
          numero_certificado: formCampos.protocolo || formCampos.numero_contramuestra || formCampos.numero_certificado || null,
          tipo_muestra: formCampos.tipo_muestra || null,
          cantidad_muestra: formCampos.cantidad_muestra || formCampos.peso_muestra || null,
          destino_muestra: formCampos.destino_muestra || formCampos.laboratorio || null,
          descripcion_hallazgo: formCampos.descripcion_hallazgo || formCampos.detalle || formCampos.estudio_solicitado || null,
          accion_correctiva: formCampos.accion_correctiva || null,
          accion_preventiva: formCampos.accion_preventiva || null,
          fecha_cierre: formCampos.fecha_cierre || null,
          cliente_nombre: formCampos.cliente || null,
          detalle_reclamo: formCampos.detalle_reclamo || null,
          tipo_residuo: formCampos.tipo_residuo || null,
          cantidad_residuo: formCampos.cantidad_residuo || formCampos.unidad_medida || null,
          metodo_disposicion: formCampos.metodo_disposicion || formCampos.destino_disposicion || null,
          acta_destruccion: formCampos.acta_destruccion || null,
          resultado,
          observaciones: formObs || null,
          responsable: formResponsable,
          creado_por: userId,
        })
        error = res.error
      } else {
        // G03, G08, G10 → registros_documentales como fallback generico
        const res = await supabase.from('registros_documentales').insert({
          tipo: mapTipoDoc[registroActivo.codigo] || 'documento_externo',
          fecha: formFecha,
          titulo: registroActivo.nombre,
          descripcion: Object.entries(formCampos).map(([k, v]) => `${k}: ${v}`).join('; ') || null,
          responsable: formResponsable,
          observaciones: formObs,
          creado_por: userId,
        })
        error = res.error
      }

      if (error) {
        console.error('Error guardando registro:', error)
        setMsgError(`Error: ${error.message}`)
      } else {
        setMsgExito(`Registro "${registroActivo.nombre}" guardado correctamente`)
        limpiarForm()
        setTimeout(() => { setRegistroActivo(null); setMsgExito('') }, 2000)
      }
    } catch (e: any) {
      setMsgError(`Error: ${e.message}`)
    }
    setGuardando(false)
  }

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('tipos_registro_cumcs')
        .select('*')
        .order('codigo')
      if (!error && data) setTipos(data as TipoRegistro[])
      setCargando(false)
    }
    cargar()
  }, [])

  const grupos = [...new Set(tipos.map(t => t.grupo))].sort()

  const tiposFiltrados = tipos.filter(t => {
    const matchBusqueda = t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const matchGrupo = grupoFiltro === 'todos' || t.grupo === grupoFiltro
    const areaActual = AREAS.find(a => a.id === areaFiltro)
    const matchArea = areaFiltro === 'todas' || (areaActual?.grupos.includes(t.grupo) ?? false)
    return matchBusqueda && matchGrupo && matchArea
  })

  // Agrupar por grupo
  const porGrupo: Record<string, TipoRegistro[]> = {}
  tiposFiltrados.forEach(t => {
    if (!porGrupo[t.grupo]) porGrupo[t.grupo] = []
    porGrupo[t.grupo].push(t)
  })

  // Solo mostrar la lista de registros cuando hay grupo seleccionado o busqueda activa
  const mostrarLista = grupoFiltro !== 'todos' || !!busqueda

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ClipboardList className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Registros CUMCS</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{tipos.length} planillas · 10 grupos · <span className="hidden sm:inline">conservacion 7 años</span></div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Barra de busqueda y filtro */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar codigo o nombre..."
              className="w-full pl-9 pr-4 py-2 bg-[#101016] border border-[#1f1f2b] rounded-lg text-[13px] text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20] transition-colors"
            />
          </div>

          <select
            value={grupoFiltro}
            onChange={(e) => { setGrupoFiltro(e.target.value); if (e.target.value !== 'todos') { const a = AREAS.find(ar => ar.grupos.includes(e.target.value)); if (a) setAreaFiltro(a.id) } }}
            className="px-3 py-2 bg-[#101016] border border-[#1f1f2b] rounded-lg text-[13px] text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20] cursor-pointer"
          >
            <option value="todos">Todos ({tipos.length})</option>
            {grupos.map(g => {
              const count = tipos.filter(t => t.grupo === g).length
              const nombre = tipos.find(t => t.grupo === g)?.grupo_nombre || g
              return <option key={g} value={g}>{g} · {nombre} ({count})</option>
            })}
          </select>
        </div>

        {/* Breadcrumb cuando hay area o grupo seleccionado */}
        {(areaFiltro !== 'todas' || grupoFiltro !== 'todos') && !busqueda && (
          <div className="flex items-center gap-2 text-xs text-[#5c5c6b]">
            <button onClick={() => { setAreaFiltro('todas'); setGrupoFiltro('todos') }} className="hover:text-[#a3e635] transition-colors font-medium">
              Todas las areas
            </button>
            {areaFiltro !== 'todas' && (() => {
              const a = AREAS.find(x => x.id === areaFiltro)
              return a ? <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => setGrupoFiltro('todos')} className="hover:text-[#a3e635] transition-colors font-medium">{a.nombre}</button>
              </> : null
            })()}
            {grupoFiltro !== 'todos' && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="font-mono text-[#8f8f9f]">{grupoFiltro}</span>
              </>
            )}
          </div>
        )}

        {/* NIVEL 1: 4 areas */}
        {areaFiltro === 'todas' && grupoFiltro === 'todos' && !busqueda && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AREAS.map(area => {
              const Icon = areaIconos[area.id]
              const count = tipos.filter(t => area.grupos.includes(t.grupo)).length
              return (
                <button
                  key={area.id}
                  onClick={() => setAreaFiltro(area.id)}
                  className="group p-4 sm:p-5 rounded-xl border border-[#1f1f2b] bg-[#101016] text-left transition-all duration-200 hover:border-[#404d20] hover:bg-[#15151d]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {Icon && <Icon className="w-5 h-5 text-[#a3e635] transition-transform group-hover:scale-110" strokeWidth={1.5} />}
                    <span className="text-[10px] font-semibold text-[#5c5c6b] tracking-widest uppercase">{area.grupos.length} grupos</span>
                  </div>
                  <p className="text-sm font-semibold text-[#ececf1]">{area.nombre}</p>
                  <p className="text-[11px] text-[#8f8f9f] mt-1 leading-snug">{area.descripcion}</p>
                  <p className="text-[10px] text-[#5c5c6b] mt-2">{count} registros</p>
                </button>
              )
            })}
          </div>
        )}

        {/* NIVEL 2: grupos del area */}
        {areaFiltro !== 'todas' && grupoFiltro === 'todos' && !busqueda && (() => {
          const area = AREAS.find(a => a.id === areaFiltro)
          if (!area) return null
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {area.grupos.map(g => {
                const count = tipos.filter(t => t.grupo === g).length
                const obligatorios = tipos.filter(t => t.grupo === g && t.obligatorio).length
                const Icon = grupoIconos[g]
                const nombre = tipos.find(t => t.grupo === g)?.grupo_nombre || g
                return (
                  <button
                    key={g}
                    onClick={() => setGrupoFiltro(g)}
                    className="group p-4 rounded-xl border border-[#1f1f2b] bg-[#101016] text-center transition-all duration-200 hover:border-[#404d20] hover:bg-[#15151d]"
                  >
                    <div className="flex justify-center mb-2 transition-transform group-hover:scale-110">
                      {Icon && <Icon className="w-5 h-5 text-[#a3e635]" strokeWidth={1.75} />}
                    </div>
                    <p className="text-xs font-semibold text-[#ececf1] tracking-wide">{g}</p>
                    <p className="text-[10px] text-[#8f8f9f] mt-1 leading-tight line-clamp-2">{nombre}</p>
                    <p className="text-[10px] text-[#5c5c6b] mt-1">{count} reg · {obligatorios} oblig</p>
                  </button>
                )
              })}
            </div>
          )
        })()}

        {cargando ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#1f1f2b] border-t-[#a3e635] rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm text-[#5c5c6b]">Cargando registros CUMCS...</p>
          </div>
        ) : !mostrarLista ? null : (
          /* Lista por grupo + subcategorias */
          Object.entries(porGrupo).map(([grupo, registros]) => {
            const Icon = grupoIconos[grupo]
            const subs = SUBCATEGORIAS[grupo] || []
            const porCodigo: Record<string, TipoRegistro> = {}
            registros.forEach(r => { porCodigo[r.codigo] = r })
            const porSub: { nombre: string; regs: TipoRegistro[] }[] = []
            for (const s of subs) {
              const rs = s.codigos.map(c => porCodigo[c]).filter(Boolean)
              if (rs.length > 0) porSub.push({ nombre: s.nombre, regs: rs })
            }
            const enSubs = new Set(porSub.flatMap(p => p.regs.map(r => r.codigo)))
            const otros = registros.filter(r => !enSubs.has(r.codigo))
            if (otros.length > 0) porSub.push({ nombre: 'Otros', regs: otros })

            const renderItem = (reg: TipoRegistro, last: boolean) => (
              <div
                key={reg.codigo}
                className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-[#1c1c27] cursor-pointer transition-colors ${last ? '' : 'border-b border-[#1f1f2b]'}`}
                onClick={() => { limpiarForm(); setMsgExito(''); setMsgError(''); setRegistroActivo(reg) }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#ececf1] truncate">{reg.nombre}</p>
                  <p className="text-[11px] text-[#5c5c6b] hidden sm:block">{reg.conservacion}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {reg.obligatorio && <span className="text-[9px] font-medium border border-[#7a2820]/50 text-[#ff8a7a] px-1.5 py-0.5 rounded hidden sm:inline">OBL</span>}
                  {reg.requiere_firma && <span className="text-[9px] font-medium border border-[#2a2a3a] text-[#bef264] px-1.5 py-0.5 rounded hidden sm:inline">FIRMA</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-[#5c5c6b] flex-shrink-0" />
              </div>
            )

            return (
              <div key={grupo}>
                <div className="flex items-center gap-2 mb-2">
                  {Icon && <Icon className="w-4 h-4 text-[#a3e635]" strokeWidth={1.75} />}
                  <h3 className="text-sm font-semibold text-[#ececf1]">{registros[0]?.grupo_nombre}</h3>
                  <span className="text-xs text-[#5c5c6b]">({registros.length})</span>
                </div>

                {busqueda || porSub.length === 0 ? (
                  <div className="bg-[#101016] rounded-xl border border-[#1f1f2b] overflow-hidden">
                    {registros.map((reg, i) => renderItem(reg, i === registros.length - 1))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {porSub.map(sub => (
                      <div key={sub.nombre}>
                        <p className="text-[10px] font-semibold text-[#5c5c6b] uppercase tracking-[0.14em] mb-1.5 pl-1">{sub.nombre}</p>
                        <div className="bg-[#101016] rounded-xl border border-[#1f1f2b] overflow-hidden">
                          {sub.regs.map((reg, i) => renderItem(reg, i === sub.regs.length - 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

      </div>

      {/* Modal: Formulario de registro — bottom-sheet mobile */}
      {registroActivo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setRegistroActivo(null)}>
          <div className="bg-[#101016] border border-[#1f1f2b] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1f1f2b] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-display font-bold text-[#ececf1]">{registroActivo.nombre}</h3>
                <p className="text-[11px] text-[#5c5c6b] mt-0.5">
                  {registroActivo.grupo_nombre}
                </p>
              </div>
              <button onClick={() => setRegistroActivo(null)} className="p-1.5 rounded-lg hover:bg-[#1c1c27] text-[#5c5c6b] hover:text-[#d4d4dd] transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-5 space-y-4">
              {msgExito && <div className="p-3 bg-[#a3e635]/10 border border-[#404d20] text-[#bef264] rounded-xl text-sm font-medium">{msgExito}</div>}
              {msgError && <div className="p-3 bg-[#7a2820]/20 border border-[#7a2820]/50 text-[#ff8a7a] rounded-xl text-sm font-medium">{msgError}</div>}

              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Fecha</label>
                <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-sm text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]" />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Responsable *</label>
                <input type="text" value={formResponsable} onChange={e => setFormResponsable(e.target.value)} placeholder="Nombre del responsable"
                  className="w-full px-3 py-2.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-sm text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]" />
              </div>

              {/* Campos especificos por codigo CUMCS */}
              <CamposCumcs grupo={registroActivo.grupo} codigo={registroActivo.codigo} formCampos={formCampos} setFormCampo={setFormCampo} />

              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Observaciones</label>
                <textarea rows={3} placeholder="Observaciones adicionales..." value={formObs} onChange={e => setFormObs(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-sm text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20] resize-none" />
              </div>

              {/* Info GAMP5 */}
              <div className="p-3 bg-[#15151d] border border-[#1f1f2b] rounded-xl text-[11px] text-[#5c5c6b] space-y-1">
                <p>Conservacion: {registroActivo.conservacion} | Medio: {registroActivo.medio_archivo}</p>
                <p>Obligatorio: {registroActivo.obligatorio ? 'Si' : 'No'} | Firma: {registroActivo.requiere_firma ? 'Requerida' : 'No requerida'}</p>
                <p className="text-[#a3e635]/60">Audit trail inmutable + firma SHA-256</p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setRegistroActivo(null)}
                  className="flex-1 py-2.5 bg-[#15151d] border border-[#2a2a3a] text-[#b3b3c0] rounded-xl text-sm font-medium hover:bg-[#1c1c27] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarRegistro}
                  disabled={guardando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#a3e635] text-[#0a0a0f] rounded-xl text-sm font-semibold hover:bg-[#bef264] disabled:opacity-50 transition-colors"
                >
                  {guardando ? (
                    <div className="w-4 h-4 border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {guardando ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
