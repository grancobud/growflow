// Explorador de Registros CUMCS
// Vista admin para ver/editar todos los registros CUMCS en una UI prolija.
// Tabs por tabla (10 tablas registros_*) + operaciones como bonus.
// Click en fila → modal con detalle completo + toggle edicion.

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Thermometer, TreePine, FlaskConical, Scissors, Droplet, Bug, Wrench, Users,
  Microscope, FileText, Package, X, Save, Edit3, Hash, PenLine,
  Download, RefreshCcw, AlertCircle, Sparkles, Search, Database,
} from 'lucide-react'
import FirmaElectronica from '../components/FirmaElectronica'
import type { LucideIcon } from 'lucide-react'
import PresenciaAvatars from '../components/PresenciaAvatars'
import { supabase } from '../lib/supabase'
import { DataTable } from '../components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useRealtimeRefetch } from '../hooks/useRealtimeInvalidation'

interface TablaInfo {
  key: string
  label: string
  icon: LucideIcon
  grupo: string
  color: string
  fechaCol: string
  camposClave: string[]  // Columnas principales a mostrar en la tabla (ademas de fecha + tipo)
}

const TABLAS: TablaInfo[] = [
  {
    key: 'operaciones', label: 'Operaciones', icon: Package, grupo: 'Central',
    color: 'from-primary-500 to-primary-700', fechaCol: 'fecha_operacion',
    camposClave: ['tipo_operacion', 'responsable', 'estado', 'lote_origen_id'],
  },
  {
    key: 'registros_condiciones_ambientales', label: 'Condiciones ambientales', icon: Thermometer, grupo: 'G01',
    color: 'from-sky-500 to-sky-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'camada', 'sistema', 'temperatura', 'humedad', 'ph_corregido', 'ec', 'responsable'],
  },
  {
    key: 'registros_trazabilidad', label: 'Trazabilidad', icon: TreePine, grupo: 'G02',
    color: 'from-emerald-500 to-emerald-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'camada', 'sistema', 'cod_traza_cosecha', 'peso_fresco_kg', 'peso_seco_kg', 'responsable'],
  },
  {
    key: 'registros_fertilizantes', label: 'Fertilizantes', icon: FlaskConical, grupo: 'G03',
    color: 'from-amber-500 to-amber-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'tanque', 'destino', 'producto', 'cantidad_producto', 'litros_agua', 'responsable'],
  },
  {
    key: 'registros_agua', label: 'Agua y riego', icon: Droplet, grupo: 'G04',
    color: 'from-cyan-500 to-cyan-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'responsable'],
  },
  {
    key: 'registros_fitosanitarios', label: 'Fitosanitarios', icon: Bug, grupo: 'G05',
    color: 'from-red-500 to-red-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'plaga_detectada', 'producto_aplicado', 'dosis', 'aprobado', 'responsable'],
  },
  {
    key: 'registros_cosecha', label: 'Cosecha', icon: Scissors, grupo: 'G06',
    color: 'from-orange-500 to-orange-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'camada', 'sistema', 'plantas_cosechadas', 'peso_fresco', 'peso_seco', 'responsable'],
  },
  {
    key: 'registros_mantenimiento', label: 'Mantenimiento', icon: Wrench, grupo: 'G07',
    color: 'from-violet-500 to-violet-600', fechaCol: 'fecha_mantenimiento',
    camposClave: ['tipo', 'responsable'],
  },
  {
    key: 'registros_personal', label: 'Personal', icon: Users, grupo: 'G08',
    color: 'from-indigo-500 to-indigo-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'responsable'],
  },
  {
    key: 'registros_calidad', label: 'Calidad / NC', icon: Microscope, grupo: 'G09',
    color: 'from-pink-500 to-pink-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'responsable'],
  },
  {
    key: 'registros_documentales', label: 'Documental', icon: FileText, grupo: 'G10',
    color: 'from-slate-500 to-slate-600', fechaCol: 'fecha',
    camposClave: ['tipo', 'responsable'],
  },
]

type Registro = Record<string, unknown> & { id: string; creado_en?: string; datos_extra?: unknown }

export default function PaginaExploradorRegistros() {
  const [tablaSel, setTablaSel] = useState<TablaInfo>(TABLAS[0])
  const [datos, setDatos] = useState<Registro[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registroSel, setRegistroSel] = useState<Registro | null>(null)
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      // Count primero (separado para barra grande de rendimiento)
      const { count: totalRows } = await supabase.from(tablaSel.key).select('id', { count: 'exact', head: true })
      // Datos: 500 mas recientes. Suficiente para explorar, luego filtro/busca en cliente.
      const orderCol = tablaSel.fechaCol || 'creado_en'
      const { data, error: err } = await supabase
        .from(tablaSel.key)
        .select('*')
        .order(orderCol, { ascending: false, nullsFirst: false })
        .limit(500)
      if (err) throw err
      setDatos((data as Registro[]) ?? [])
      setTotal(totalRows ?? 0)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setDatos([])
      setTotal(0)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [tablaSel.key])
  useRealtimeRefetch(tablaSel.key, cargar, { debounceMs: 600 })

  const columnas = useMemo<ColumnDef<Registro>[]>(() => {
    const cols: ColumnDef<Registro>[] = [
      {
        accessorKey: tablaSel.fechaCol,
        header: 'Fecha',
        cell: ({ row }) => {
          const v = row.original[tablaSel.fechaCol] as string | null
          return <span className="font-mono text-[11px] tabular-nums">{v ? formatearFecha(v) : '—'}</span>
        },
      },
    ]
    for (const campo of tablaSel.camposClave) {
      cols.push({
        accessorKey: campo,
        header: prettyLabel(campo),
        cell: ({ row }) => {
          const v = row.original[campo]
          return <span className="text-[12px]">{renderValor(v)}</span>
        },
      })
    }
    cols.push({
      id: 'acciones',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setRegistroSel(row.original) }}
          className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          Ver detalle
        </button>
      ),
    })
    return cols
  }, [tablaSel.key, tablaSel.fechaCol, tablaSel.camposClave])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <Database className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Explorador de Registros</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">Vista admin · edicion + firma 21 CFR Part 11</div>
          </div>
          <div className="flex-1" />
          <PresenciaAvatars pageKey="admin-registros" contexto={tablaSel.key} />
        </div>

        {/* Tabs por tabla */}
        <div className="px-3 sm:px-6 pb-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABLAS.map(t => {
              const Icon = t.icon
              const activa = tablaSel.key === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTablaSel(t)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    activa
                      ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#bef264]'
                      : 'text-[#5c5c6b] hover:text-[#b3b3c0] hover:bg-[#15151d]'
                  }`}
                  title={`${t.grupo} — ${t.label}`}
                >
                  <Icon className="w-3 h-3" strokeWidth={1.75} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.grupo}</span>
                  <span className="text-[9px] font-mono opacity-60 hidden sm:inline">{t.grupo}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4">
        {/* Header info */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center">
              <tablaSel.icon className="w-5 h-5 text-[#a3e635]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-[#ececf1]">{tablaSel.label}</h2>
              <p className="text-[11px] text-[#5c5c6b] font-mono">
                {tablaSel.key} · {tablaSel.grupo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] rounded-lg text-xs">
              <span className="text-[#5c5c6b]">Total: </span>
              <span className="font-bold text-[#ececf1] tabular-nums">{total.toLocaleString('es-AR')}</span>
            </div>
            <button
              onClick={() => void cargar()}
              disabled={cargando}
              className="p-2 bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] rounded-lg transition-colors disabled:opacity-50"
              title="Refrescar"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-[#5c5c6b] ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setMostrarBusqueda(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a78bfa]/15 border border-[#463a66] text-[#c4b5fd] rounded-lg text-xs font-medium hover:bg-[#a78bfa]/20 transition-colors"
              title="Busqueda full-text (pgroonga)"
            >
              <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Busqueda inteligente</span><span className="sm:hidden">Buscar</span>
            </button>
            <button
              onClick={() => exportarCSV(datos, tablaSel)}
              disabled={datos.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] rounded-lg text-xs text-[#b3b3c0] transition-colors disabled:opacity-40"
              title="Exportar CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* Estado carga / error */}
        {error && (
          <div className="p-3 bg-[#7a2820]/20 border border-[#7a2820]/50 rounded-xl text-xs text-[#ff8a7a] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Error: {error}
          </div>
        )}
        {total > 500 && !error && (
          <div className="p-2.5 bg-[#463a66]/20 border border-[#463a66]/50 rounded-lg text-[11px] text-[#c4b5fd]">
            Mostrando las 500 mas recientes de {total.toLocaleString('es-AR')}. Usa el buscador para filtrar.
          </div>
        )}

        {/* Tabla */}
        <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl overflow-hidden">
          <DataTable
            data={datos}
            columns={columnas}
            busqueda
            paginacion
            pageSize={25}
            densidadToggle
            onRowClick={(r) => setRegistroSel(r)}
            emptyState={
              cargando ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[#5c5c6b]">
                  <RefreshCcw className="w-4 h-4 animate-spin" /> Cargando registros...
                </div>
              ) : (
                <div className="text-center py-12 text-[#5c5c6b]">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay registros en {tablaSel.label} todavia.</p>
                </div>
              )
            }
          />
        </div>
      </div>

      {/* Modal detalle/edicion */}
      <AnimatePresence>
        {registroSel && (
          <ModalDetalle
            registro={registroSel}
            tabla={tablaSel}
            onClose={() => setRegistroSel(null)}
            onGuardado={() => { setRegistroSel(null); void cargar() }}
          />
        )}
      </AnimatePresence>

      {/* Modal busqueda inteligente */}
      <AnimatePresence>
        {mostrarBusqueda && (
          <ModalBusquedaInteligente
            onClose={() => setMostrarBusqueda(false)}
            onSelect={(origen) => {
              const t = TABLAS.find(x => x.key === origen)
              if (t) setTablaSel(t)
              setMostrarBusqueda(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== Modal detalle ====================
function ModalDetalle({
  registro, tabla, onClose, onGuardado,
}: {
  registro: Registro
  tabla: TablaInfo
  onClose: () => void
  onGuardado: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [cambios, setCambios] = useState<Record<string, unknown>>({})
  const [guardando, setGuardando] = useState(false)
  const [firmando, setFirmando] = useState(false)

  // Campos editables: excluir claves tecnicas / readonly
  const CAMPOS_READONLY = new Set(['id', 'creado_en', 'creado_por', 'organizacion_id', 'hash_sha256', 'hash_anterior', 'prev_hash'])
  const camposOrdenados = useMemo(() => {
    const keys = Object.keys(registro).filter(k => k !== 'datos_extra')
    return keys.sort((a, b) => {
      // id primero, fecha segundo, tipo tercero, despues alfabetico
      const peso = (k: string) =>
        k === 'id' ? 0 : k === tabla.fechaCol ? 1 : k === 'tipo' ? 2 : k === 'camada' ? 3 : k === 'sistema' ? 4 : 10
      const pa = peso(a); const pb = peso(b)
      return pa === pb ? a.localeCompare(b) : pa - pb
    })
  }, [registro, tabla.fechaCol])

  function setCampo(k: string, v: unknown) {
    setCambios(prev => ({ ...prev, [k]: v }))
  }

  async function guardar() {
    if (Object.keys(cambios).length === 0) {
      setEditando(false)
      return
    }
    setGuardando(true)
    try {
      const { error } = await supabase.from(tabla.key).update(cambios).eq('id', registro.id)
      if (error) throw error
      toast.success('Cambios guardados', {
        description: `audit_log con hash-chain generado automaticamente`,
      })
      onGuardado()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('No se pudo guardar', { description: msg })
    } finally {
      setGuardando(false)
    }
  }

  const valorActual = (k: string): unknown => (k in cambios ? cambios[k] : registro[k])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="w-full max-w-2xl max-h-[90vh] bg-[#101016] rounded-t-2xl sm:rounded-2xl border border-[#1f1f2b] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f1f2b] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#a3e635]/15 border border-[#404d20] flex items-center justify-center flex-shrink-0">
              <tabla.icon className="w-4 h-4 text-[#a3e635]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#ececf1] truncate">
                {tabla.label}
                {typeof registro.tipo === 'string' && <span className="ml-2 text-[11px] font-mono text-[#a3e635]">{registro.tipo}</span>}
              </h3>
              <p className="text-[10px] text-[#5c5c6b] font-mono truncate">
                ID: {String(registro.id)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editando ? (
              <>
                <button
                  onClick={() => setFirmando(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a78bfa]/15 border border-[#463a66] text-[#c4b5fd] rounded-lg text-xs font-semibold transition-colors hover:bg-[#a78bfa]/25"
                  title="Firma electronica 21 CFR Part 11"
                >
                  <PenLine className="w-3.5 h-3.5" /> Firmar
                </button>
                <button
                  onClick={() => setEditando(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-xs text-[#b3b3c0] hover:border-[#404d20] transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </>
            ) : (
              <button
                onClick={() => { setEditando(false); setCambios({}) }}
                className="px-3 py-1.5 text-xs text-[#5c5c6b] hover:text-[#ff8a7a] transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#5c5c6b] hover:text-[#d4d4dd] transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Campos principales */}
          <div className="space-y-0">
            {camposOrdenados.map(k => {
              const v = valorActual(k)
              const readonly = CAMPOS_READONLY.has(k) || !editando
              const cambiado = k in cambios
              return (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-3 items-start py-1.5 border-b border-[#1f1f2b]/60">
                  <div className="text-[11px] text-[#5c5c6b] pt-1.5 flex items-center gap-1">
                    {prettyLabel(k)}
                    {cambiado && <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd]" title="Modificado" />}
                  </div>
                  <div className="min-w-0">
                    {readonly ? (
                      <div className="text-[12px] text-[#d4d4dd] font-mono break-all pt-1.5">
                        {renderValor(v)}
                      </div>
                    ) : (
                      <input
                        type={tipoInput(k, v)}
                        value={v == null ? '' : String(v)}
                        onChange={e => setCampo(k, normalizarInput(e.target.value, v))}
                        className="w-full px-2.5 py-1.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20] font-mono"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* datos_extra JSON */}
          {registro.datos_extra != null && typeof registro.datos_extra === 'object' && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-2">datos_extra</p>
              <pre className="text-[10px] bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg p-3 overflow-x-auto font-mono max-h-64 overflow-y-auto text-[#8f8f9f]">
                {JSON.stringify(registro.datos_extra, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal firma electronica */}
        {firmando && (
          <FirmaElectronica
            registroId={String(registro.id)}
            tabla={tabla.key}
            contenidoResumen={`${tabla.label} · ${String(registro[tabla.fechaCol] ?? '')} · ${typeof registro.tipo === 'string' ? registro.tipo : ''} · camada ${String(registro.camada ?? '—')}`}
            significado="aprobacion"
            onFirmado={() => { setFirmando(false); onGuardado() }}
            onCancelar={() => setFirmando(false)}
          />
        )}

        {/* Footer guardar */}
        {editando && (
          <div className="px-5 py-3 border-t border-[#1f1f2b] flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#5c5c6b]">
              {Object.keys(cambios).length === 0
                ? 'No hay cambios pendientes'
                : `${Object.keys(cambios).length} campo${Object.keys(cambios).length === 1 ? '' : 's'} modificado${Object.keys(cambios).length === 1 ? '' : 's'}`}
            </p>
            <button
              onClick={guardar}
              disabled={guardando || Object.keys(cambios).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#a3e635] hover:bg-[#bef264] disabled:opacity-50 text-[#0a0a0f] rounded-lg text-sm font-semibold transition-colors"
            >
              {guardando ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ==================== helpers ====================
function prettyLabel(k: string): string {
  const map: Record<string, string> = {
    id: 'ID',
    creado_en: 'Creado',
    creado_por: 'Creado por',
    organizacion_id: 'Organizacion',
    hash_sha256: 'Hash SHA-256',
    hash_anterior: 'Hash anterior',
    prev_hash: 'Hash anterior',
    fecha_mantenimiento: 'Fecha mantenimiento',
    fecha_operacion: 'Fecha',
    tipo_operacion: 'Tipo operacion',
    ph_inicial: 'pH inicial',
    ph_corregido: 'pH corregido',
    ec: 'EC',
    vpd_kpa: 'VPD (kPa)',
    co2_ppm: 'CO2 (ppm)',
    peso_fresco: 'Peso fresco',
    peso_seco: 'Peso seco',
    peso_fresco_kg: 'Peso fresco (kg)',
    peso_seco_kg: 'Peso seco (kg)',
    cod_traza_cosecha: 'Cod. traza cosecha',
    cod_traza_secado: 'Cod. traza secado',
    cantidad_producto: 'Cant. producto',
    litros_agua: 'Litros agua',
    plantas_cosechadas: 'Plantas cosechadas',
    lote_origen_id: 'Lote origen ID',
    lote_id: 'Lote ID',
    plaga_detectada: 'Plaga detectada',
    producto_aplicado: 'Producto aplicado',
  }
  return map[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function renderValor(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Si' : 'No'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80)
  const s = String(v)
  // Si parece fecha ISO, formatear bonito
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(s)) return formatearFecha(s)
  return s.length > 120 ? s.slice(0, 117) + '…' : s
}

function formatearFecha(s: string): string {
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    // Si viene con hora (tiene T), mostrar fecha + hora corta
    if (s.includes('T')) {
      return d.toLocaleString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch { return s }
}

function tipoInput(k: string, v: unknown): string {
  if (k === 'fecha' || k === 'fecha_operacion' || k === 'fecha_mantenimiento' || k.startsWith('fecha_')) return 'date'
  if (typeof v === 'number') return 'number'
  return 'text'
}

function normalizarInput(raw: string, original: unknown): unknown {
  if (typeof original === 'number') {
    const n = parseFloat(raw)
    return isNaN(n) ? null : n
  }
  if (typeof original === 'boolean') {
    return raw === 'true' || raw === '1'
  }
  return raw === '' ? null : raw
}

function exportarCSV(datos: Registro[], tabla: TablaInfo) {
  if (datos.length === 0) return
  const cols = Array.from(new Set(datos.flatMap(r => Object.keys(r)))).filter(c => c !== 'datos_extra')
  const header = cols.join(',')
  const rows = datos.map(r =>
    cols.map(c => {
      const v = r[c]
      if (v == null) return ''
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      // Escape CSV: si tiene coma/newline/quote, envolver en comillas y doblar internas
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tabla.key}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ==================== Modal busqueda inteligente ====================
interface ResultadoBusqueda { origen: string; id: string; resumen: string; rank: number }

function ModalBusquedaInteligente({
  onClose, onSelect,
}: {
  onClose: () => void
  onSelect: (origen: string) => void
}) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buscado, setBuscado] = useState(false)

  async function buscar(e?: FormEvent) {
    e?.preventDefault()
    const query = q.trim()
    if (!query) return
    setBuscando(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.rpc('search_registros_global', { q: query, top_k: 20 })
      if (err) throw err
      setResultados((data as ResultadoBusqueda[]) ?? [])
      setBuscado(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      toast.error('Error en busqueda: ' + msg)
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-[#101016] border border-[#1f1f2b] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1f1f2b]">
          <div className="w-9 h-9 rounded-xl bg-[#a78bfa]/15 border border-[#463a66] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#c4b5fd]" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-display font-bold text-[#ececf1]">Busqueda inteligente</h3>
            <p className="text-[11px] text-[#5c5c6b]">Full-text castellano sobre todos los registros (pgroonga)</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#15151d] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#5c5c6b]" />
          </button>
        </div>

        {/* Input */}
        <form onSubmit={buscar} className="p-4 border-b border-[#1f1f2b]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Ej: "control plagas flora 2", "fertilizacion CO2"...'
              autoFocus
              className="w-full pl-9 pr-24 py-2.5 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-sm text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]"
            />
            <button
              type="submit"
              disabled={buscando || !q.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#a3e635] text-[#0a0a0f] rounded-md text-xs font-semibold hover:bg-[#bef264] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-2">
          {error && (
            <div className="m-2 p-3 bg-[#7a2820]/20 border border-[#7a2820]/50 rounded-lg text-xs text-[#ff8a7a] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          {!error && buscado && resultados.length === 0 && !buscando && (
            <div className="text-center py-12 text-[#5c5c6b]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin resultados para "{q}"</p>
            </div>
          )}
          {!buscado && !buscando && (
            <div className="text-center py-12 text-[#5c5c6b]">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Escribi una consulta y presiona Buscar</p>
              <p className="text-[11px] mt-1 opacity-70">Busca en fitosanitarios, personal, ambientales, sops y mas</p>
            </div>
          )}
          {resultados.map((r, i) => (
            <button
              key={`${r.origen}-${r.id}-${i}`}
              onClick={() => onSelect(r.origen)}
              className="w-full text-left p-3 m-1 bg-[#15151d] border border-[#2a2a3a] rounded-lg hover:border-[#404d20] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <span className="inline-flex items-center px-2 py-0.5 bg-[#a3e635]/10 text-[#bef264] rounded-md text-[10px] font-mono font-medium">
                  {r.origen}
                </span>
                <span className="text-[10px] text-[#5c5c6b] font-mono tabular-nums flex-shrink-0">
                  rank {r.rank.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-[#b3b3c0] leading-relaxed line-clamp-2">
                {r.resumen}
              </p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
