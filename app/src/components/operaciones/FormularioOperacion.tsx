import { useState, useEffect } from 'react'
import {
  CheckCircle2, Loader2, ChevronLeft, ChevronRight, AlertCircle, Search,
  Package, Sprout, Droplet, Leaf, X, Scissors, TreePine, Axe, Flower2, Bug,
  Wheat, Sun, Microscope, Ruler, Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ETIQUETAS_OPERACION, type TipoOperacion } from '../../types'
import { operacionesService } from '../../lib/servicios'
import { AREAS_OPERACION, COLOR_AREA_CLASES, OPERACION_A_CUMCS } from '../../lib/cumcsJerarquia'
import { esMeta, obtenerMeta, type MetaFormulario, type VarianteCumcs } from '../../lib/cumcsVariantes'
import SelectorVariante from './SelectorVariante'
import CamposCumcs from './CamposCumcs'
import InputConSugerencias from './InputConSugerencias'
import { useSugerencias, formatearIdLote } from '../../lib/sugerenciasCumcs'
import { supabase } from '../../lib/supabase'

const ICONOS_LUCIDE: Record<TipoOperacion, LucideIcon> = {
  ingreso_insumos: Package, planta_madre: Sprout, fertilizacion: Droplet,
  utilizacion_insumos: Leaf, baja_stock: X, esquejado: Scissors,
  vegetativa: TreePine, poda: Axe, floracion: Flower2, control_plagas: Bug,
  cosecha: Wheat, secado: Sun, trimming: Scissors, cuarentena: Microscope,
  fraccionamiento: Ruler, almacenamiento: Warehouse,
}

const ICONOS_AREA: Record<string, LucideIcon> = {
  produccion: Sprout, cosecha: Scissors, stock: Package,
}

type PasoFormulario = 'tipo' | 'datos' | 'confirmar'

export default function FormularioOperacion() {
  const [paso, setPaso] = useState<PasoFormulario>('tipo')
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoOperacion | null>(null)
  const [metaSeleccionada, setMetaSeleccionada] = useState<MetaFormulario | null>(null)
  const [codigoActivo, setCodigoActivo] = useState<string>('')
  const [areaSel, setAreaSel] = useState<string | null>(null)
  // IDs de lote marcados como "nuevo" en esta sesion -> al guardar se INSERTAN en `lotes`
  const [lotesNuevos, setLotesNuevos] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Estado dinamico de los campos del formulario CUMCS (igual que PaginaRegistros)
  const [formCampos, setFormCampos] = useState<Record<string, string>>({})
  const setFormCampo = (k: string, v: string) => setFormCampos(prev => ({ ...prev, [k]: v }))

  // Sugerencias para responsable (catalogo desde operaciones historicas).
  // Las del registro especifico las trae CamposCumcs internamente.
  const codigoActivoSug = metaSeleccionada
    ? (metaSeleccionada.variantes.find(v => v.codigo === codigoActivo)?.codigo ?? '')
    : (tipoSeleccionado ? OPERACION_A_CUMCS[tipoSeleccionado]?.codigo ?? '' : '')
  const sugerenciasOp = useSugerencias(codigoActivoSug)

  const [loteOrigenId, setLoteOrigenId] = useState('')
  const [responsable, setResponsable] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaOp, setFechaOp] = useState(new Date().toISOString().split('T')[0])

  // Catalogo liviano de lotes (solo para el <select> de vincular)
  const [lotes, setLotes] = useState<any[]>([])
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)

  useEffect(() => {
    // Query minima: id, codigo_lote, estado + nombre del producto via FK simple.
    // Antes se hacia stockService.getLotes() con 2 joins (productos + instalaciones)
    // + catalogoService.getInstalaciones() que ni se usaba — causaba lag al entrar.
    // Cancelable: si el componente se desmonta antes (cambio de tab), aborta.
    let cancelado = false
    const timeoutId = setTimeout(() => {
      if (!cancelado) {
        // Si la red quedó colgada > 8s, liberar la UI (catalogo vacio, no bloquear)
        cancelado = true
        setCargandoCatalogo(false)
      }
    }, 8000)
    ;(async () => {
      try {
        const { data } = await supabase
          .from('lotes')
          .select('id, codigo_lote, estado, datos_extra, productos:producto_id(nombre)')
          .eq('eliminado', false)
          .order('creado_en', { ascending: false })
          .limit(200)
        if (!cancelado) setLotes(data || [])
      } catch { /* silencioso */ }
      finally {
        clearTimeout(timeoutId)
        if (!cancelado) setCargandoCatalogo(false)
      }
    })()
    return () => { cancelado = true; clearTimeout(timeoutId) }
  }, [])

  // Resolver mapeo de campos -> columnas operaciones (estilo G06 handler)
  const num = (k: string): number | undefined => {
    const v = formCampos[k]
    if (!v) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  const resetFormulario = () => {
    setPaso('tipo')
    setTipoSeleccionado(null)
    setMetaSeleccionada(null)
    setCodigoActivo('')
    setAreaSel(null)
    setBusqueda('')
    setLoteOrigenId('')
    setResponsable('')
    setObservaciones('')
    setFormCampos({})
    setFechaOp(new Date().toISOString().split('T')[0])
    setError('')
    setExito('')
  }

  // Helpers meta
  const seleccionarTipo = (raw: string) => {
    if (esMeta(raw)) {
      const meta = obtenerMeta(raw)
      if (!meta) return
      const variante = meta.variantes.find(v => v.codigo === meta.defaultVariante) ?? meta.variantes[0]
      setMetaSeleccionada(meta)
      setCodigoActivo(variante.codigo)
      setTipoSeleccionado((meta.tipoOperacion as TipoOperacion | undefined) ?? null)
      setFormCampos({ ...(variante.defaults ?? {}) })
      setPaso('datos')
    } else {
      setMetaSeleccionada(null)
      setCodigoActivo('')
      setTipoSeleccionado(raw as TipoOperacion)
      setPaso('datos')
    }
  }

  const cambiarVariante = (variante: VarianteCumcs) => {
    setCodigoActivo(variante.codigo)
    setFormCampos(prev => ({ ...prev, ...(variante.defaults ?? {}) }))
  }

  // Etiqueta visible para un item del menu (tipo real o meta)
  const labelItem = (raw: string): string => {
    if (esMeta(raw)) return obtenerMeta(raw)?.label ?? raw
    return ETIQUETAS_OPERACION[raw as TipoOperacion] ?? raw
  }
  const iconItem = (raw: string): LucideIcon => {
    if (esMeta(raw)) return obtenerMeta(raw)?.icon ?? Sprout
    return ICONOS_LUCIDE[raw as TipoOperacion]
  }
  // Sublabel removido: el usuario no quiere ver los códigos CM-RE-XXXX en /operacion

  const handleGuardar = async () => {
    if (!tipoSeleccionado && !metaSeleccionada) return
    if (!responsable.trim()) { setError('Responsable es obligatorio'); return }
    setGuardando(true)
    setError('')

    try {
      // Resolver lote_origen_id si formCampos.id_lote es un codigo conocido
      let loteId = loteOrigenId || undefined
      if (!loteId && formCampos.id_lote) {
        const { data: lote } = await supabase.from('lotes').select('id').eq('codigo_lote', formCampos.id_lote).maybeSingle()
        loteId = lote?.id || undefined
      }

      // Si hay meta, el cumcs se determina por la variante activa.
      const variante = metaSeleccionada
        ? metaSeleccionada.variantes.find(v => v.codigo === codigoActivo) ?? metaSeleccionada.variantes[0]
        : null
      const cumcs = variante
        ? { codigo: variante.codigo, grupo: variante.grupo, nombre: variante.nombre }
        : tipoSeleccionado ? OPERACION_A_CUMCS[tipoSeleccionado] : undefined
      const tipoOp = tipoSeleccionado ?? (metaSeleccionada?.tipoOperacion as TipoOperacion | undefined)

      const datos: any = {
        tipo_operacion: tipoOp,
        lote_origen_id: loteId,
        cantidad_entrada: num('plantas_cosechadas') ?? num('cantidad_recibida') ?? num('cantidad') ?? num('cantidad_esquejes') ?? num('entrada') ?? num('cantidad_bolsas'),
        cantidad_salida: num('salida'),
        peso_fresco_kg: num('peso_fresco') ?? num('kg_humedo'),
        peso_seco_kg: num('peso_seco'),
        peso_neto_g: num('peso_neto_g') ?? num('peso'),
        rendimiento_porcentaje: num('rendimiento'),
        temperatura_c: num('temperatura'),
        humedad_porcentaje: num('humedad'),
        responsable: responsable || undefined,
        observaciones: observaciones || undefined,
        notas_sanitarias: formCampos.cond_sanitaria || formCampos.obs_sanitarias || formCampos.cond_recepcion || undefined,
        json_estructurado: { via: 'formulario_cumcs', tipo: tipoSeleccionado, cumcs: cumcs?.codigo },
        // Todos los campos del formulario CUMCS van a datos_extra para preservarse
        datos_extra: {
          registro_cumcs: cumcs?.codigo || null,
          grupo: cumcs?.grupo || null,
          ...formCampos,
        },
      }

      const op = await operacionesService.crearOperacion(datos)
      await operacionesService.confirmarOperacion(op.id)

      // Si quedaron IDs marcados como nuevos, INSERTAR en `lotes` para que la proxima vez aparezcan en sugerencias
      for (const codigoNuevo of lotesNuevos) {
        try {
          await supabase.from('lotes').insert({
            codigo_lote: formatearIdLote(codigoNuevo),
            estado: 'activo',
            datos_extra: { creado_via: 'formulario_completo', cumcs: cumcs?.codigo, sistema: formCampos.sistema },
          })
        } catch { /* duplicado u otro error: la operacion ya esta confirmada, no bloqueamos */ }
      }

      const etiqueta = metaSeleccionada?.label ?? (tipoOp ? ETIQUETAS_OPERACION[tipoOp] : 'Registro')
      setExito(`Operacion ${etiqueta} registrada con formulario CUMCS ${cumcs?.codigo || 'generico'} (ID: ${op.id.slice(0, 8)}...)`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // PASO 1: Drill-down Area -> Subgrupo -> Tipo (con buscador)
  if (paso === 'tipo') {
    const q = busqueda.trim().toLowerCase()
    const hayBusqueda = q.length > 0
    const matchTipo = (t: string) =>
      !q || labelItem(t).toLowerCase().includes(q) || t.toLowerCase().includes(q)

    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-surface-900 mb-2">Que operacion queres registrar?</h2>
        <p className="text-sm text-surface-500 mb-4">Elegi el area y luego la operacion especifica. Para registros documentales, calidad, mantenimiento o personal usá <a href="/registros" className="text-primary-600 font-medium hover:underline">Registros CUMCS</a>.</p>

        {/* Buscador */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar operacion (ej: cosecha, secado, fertilizacion...)"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>

        {/* Breadcrumb */}
        {!hayBusqueda && areaSel && (
          <div className="flex items-center gap-2 mb-4 text-xs text-surface-500">
            <button onClick={() => setAreaSel(null)} className="hover:text-primary-600 font-medium">Todas las areas</button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-surface-700">{AREAS_OPERACION.find(a => a.id === areaSel)?.nombre}</span>
          </div>
        )}

        {/* NIVEL 1: Areas (cuando no hay area ni busqueda) */}
        {!hayBusqueda && !areaSel && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AREAS_OPERACION.map(area => {
              const Icon = ICONOS_AREA[area.id]
              const totalTipos = area.subgrupos.reduce((a, sg) => a + sg.tipos.length, 0)
              return (
                <button
                  key={area.id}
                  onClick={() => setAreaSel(area.id)}
                  className={`group p-5 rounded-xl border backdrop-blur-sm text-left transition-all duration-200 ${COLOR_AREA_CLASES[area.color]}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {Icon && <Icon className="w-6 h-6 transition-transform group-hover:scale-110" strokeWidth={1.5} />}
                    <span className="text-[10px] font-semibold opacity-60 tracking-widest uppercase">{area.subgrupos.length} subgrupos</span>
                  </div>
                  <p className="text-sm font-semibold">{area.nombre}</p>
                  <p className="text-[11px] opacity-60 mt-1 leading-snug">{area.descripcion}</p>
                  <p className="text-[10px] opacity-50 mt-2">{totalTipos} operaciones</p>
                </button>
              )
            })}
          </div>
        )}

        {/* NIVEL 2: Subgrupos del area + tipos */}
        {!hayBusqueda && areaSel && (() => {
          const area = AREAS_OPERACION.find(a => a.id === areaSel)
          if (!area) return null
          return (
            <div className="space-y-5">
              {area.subgrupos.map(sg => (
                <div key={sg.nombre}>
                  <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">{sg.nombre}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {sg.tipos.map(tipo => {
                      const Icon = iconItem(tipo)
                      return (
                        <button
                          key={tipo}
                          onClick={() => seleccionarTipo(tipo)}
                          className="w-full flex items-center gap-3 p-3 bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl hover:border-primary-400 dark:hover:border-primary-700 hover:shadow-sm transition-all text-left group min-w-0"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{labelItem(tipo)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* BUSQUEDA: vista plana de todas las areas/subgrupos que matchean */}
        {hayBusqueda && (
          <div className="space-y-5">
            {AREAS_OPERACION.map(area => {
              const sgConMatch = area.subgrupos
                .map(sg => ({ ...sg, tipos: sg.tipos.filter(matchTipo) }))
                .filter(sg => sg.tipos.length > 0)
              if (sgConMatch.length === 0) return null
              return (
                <div key={area.id}>
                  <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">{area.nombre}</p>
                  {sgConMatch.map(sg => (
                    <div key={sg.nombre} className="mb-3 ml-2">
                      <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-2">{sg.nombre}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {sg.tipos.map(tipo => {
                          const Icon = iconItem(tipo)
                          return (
                            <button
                              key={tipo}
                              onClick={() => seleccionarTipo(tipo)}
                              className="flex items-center gap-2.5 px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all text-left group"
                            >
                              <Icon className="w-4 h-4 text-surface-500 group-hover:text-primary-600 transition-colors flex-shrink-0" strokeWidth={1.75} />
                              <span className="text-xs font-medium text-surface-700 truncate">{labelItem(tipo)}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // PASO 3: Exito
  if (exito) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-surface-900 mb-2">Operacion registrada!</h2>
        <p className="text-sm text-surface-500 mb-6">{exito}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={resetFormulario} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">
            Registrar otra operacion
          </button>
          <a href="/historial" className="px-6 py-2.5 bg-white border border-surface-200 text-surface-600 rounded-xl text-sm font-medium hover:bg-surface-50">
            Ver historial
          </a>
        </div>
      </div>
    )
  }

  // PASO 2: Formulario CUMCS detallado (mismo que PaginaRegistros)
  if (paso === 'datos' && (tipoSeleccionado || metaSeleccionada)) {
    // Si hay meta seleccionada, el codigo viene de la variante activa.
    // Si no, se resuelve por el mapeo tipo_operacion -> CUMCS.
    const variante = metaSeleccionada
      ? metaSeleccionada.variantes.find(v => v.codigo === codigoActivo) ?? metaSeleccionada.variantes[0]
      : null
    const cumcs = variante
      ? { codigo: variante.codigo, grupo: variante.grupo, nombre: variante.nombre }
      : tipoSeleccionado ? OPERACION_A_CUMCS[tipoSeleccionado] : undefined
    const HeaderIcon = metaSeleccionada
      ? (variante?.icon ?? metaSeleccionada.icon ?? Sprout)
      : tipoSeleccionado ? ICONOS_LUCIDE[tipoSeleccionado] : Sprout
    const titulo = metaSeleccionada ? metaSeleccionada.label : (tipoSeleccionado ? ETIQUETAS_OPERACION[tipoSeleccionado] : '')

    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPaso('tipo')} className="p-2 hover:bg-surface-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-surface-400" />
          </button>
          <HeaderIcon className="w-5 h-5 text-primary-600" strokeWidth={1.75} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-surface-900">{titulo}</h2>
            <p className="text-xs text-surface-500">
              {cumcs ? `Formulario CUMCS ${cumcs.codigo} - ${cumcs.nombre}` : 'Formulario generico (sin registro CUMCS asociado)'}
            </p>
          </div>
        </div>

        {/* Selector de variante (solo si la meta tiene mas de una) */}
        {metaSeleccionada && metaSeleccionada.variantes.length > 1 && (
          <div className="mb-5">
            <SelectorVariante
              variantes={metaSeleccionada.variantes}
              codigoActivo={codigoActivo}
              onChange={cambiarVariante}
              layoutId={`meta-${metaSeleccionada.id}-pill`}
            />
            {metaSeleccionada.descripcion && (
              <p className="text-[11px] text-surface-400 mt-2">{metaSeleccionada.descripcion}</p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Fecha + Responsable + Lote (vinculacion opcional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Fecha</label>
              <input type="date" value={fechaOp} onChange={e => setFechaOp(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Responsable *</label>
              <InputConSugerencias
                value={responsable}
                onChange={setResponsable}
                sugerencias={sugerenciasOp.responsable ?? []}
                placeholder="Nombre del responsable"
              />
            </div>
          </div>

          {lotes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Vincular a lote existente (opcional)</label>
              <select value={loteOrigenId} onChange={e => setLoteOrigenId(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                disabled={cargandoCatalogo}>
                <option value="">{cargandoCatalogo ? 'Cargando...' : 'Sin vincular (o se resuelve por ID Lote del formulario)'}</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>{l.codigo_lote} — {l.productos?.nombre || ''} [{l.datos_extra?.sistema || ''}] ({l.estado})</option>
                ))}
              </select>
            </div>
          )}

          {/* Campos especificos del registro CUMCS asociado */}
          {cumcs ? (
            <div className="border-t border-surface-200 pt-4 space-y-4">
              <CamposCumcs
                grupo={cumcs.grupo}
                codigo={cumcs.codigo}
                formCampos={formCampos}
                setFormCampo={setFormCampo}
                onMarcarLoteNuevo={(v) => setLotesNuevos(prev => new Set(prev).add(v))}
              />
            </div>
          ) : (
            <div className="border-t border-surface-200 pt-4">
              <p className="text-xs text-surface-400 italic">Esta operacion no tiene un registro CUMCS asociado. Se guardara con campos genericos.</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Cantidad</label>
                  <input type="number" value={formCampos.cantidad || ''} onChange={e => setFormCampo('cantidad', e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">ID Lote</label>
                  <input type="text" value={formCampos.id_lote || ''} onChange={e => setFormCampo('id_lote', e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Observaciones</label>
            <textarea rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones adicionales..."
              className="w-full px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setPaso('tipo')}
            className="px-6 py-2.5 bg-white border border-surface-200 text-surface-600 rounded-xl text-sm font-medium hover:bg-surface-50"
          >
            Volver
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-600/25"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {guardando ? 'Guardando en Supabase...' : 'Confirmar y Guardar'}
          </button>
        </div>

        <p className="text-[11px] text-surface-400 mt-3 text-center">
          La operacion se guarda como confirmada con audit trail automatico (GAMP5 RF-009)
        </p>
      </div>
    )
  }

  return null
}
