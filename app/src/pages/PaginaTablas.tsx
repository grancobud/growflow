// PaginaTablas — grilla editable estilo NocoDB sobre las tablas de Supabase.
// Una solapa por tabla; editar celda con click, agregar y borrar filas.
// La IA (chat) escribe en las mismas tablas, asi que todo queda sincronizado.

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw, Table2, Download, Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FASES, TIPOS_EVENTO, TIPOS_GENETICA, SUSTRATOS } from '../lib/cultivo'
import { exportarFull, importarFull } from '../lib/backup'

const CATEGORIAS_APLIC = ['Fumigacion', 'Insecticida', 'Fungicida', 'Foliar', 'Acaricida', 'Bactericida', 'Otro'] as const

type TipoCol = 'text' | 'number' | 'date' | 'bool' | { select: readonly string[] }
interface Col { campo: string; titulo: string; tipo: TipoCol; ancho?: string }
interface DefTabla { id: string; nombre: string; orden: string; cols: Col[] }

const TABLAS: DefTabla[] = [
  {
    id: 'plantas', nombre: 'Plantas', orden: 'creado_en',
    cols: [
      { campo: 'apodo', titulo: 'Apodo', tipo: 'text' },
      { campo: 'fase', titulo: 'Fase', tipo: { select: FASES } },
      { campo: 'fecha_germinacion', titulo: 'Germinación', tipo: 'date' },
      { campo: 'sustrato', titulo: 'Sustrato', tipo: { select: SUSTRATOS } },
      { campo: 'maceta', titulo: 'Maceta', tipo: 'text' },
      { campo: 'ubicacion', titulo: 'Ubicación', tipo: 'text' },
      { campo: 'activa', titulo: 'Activa', tipo: 'bool' },
      { campo: 'notas', titulo: 'Notas', tipo: 'text', ancho: 'min-w-[180px]' },
    ],
  },
  {
    id: 'geneticas', nombre: 'Genéticas', orden: 'nombre',
    cols: [
      { campo: 'nombre', titulo: 'Nombre', tipo: 'text' },
      { campo: 'banco', titulo: 'Banco', tipo: 'text' },
      { campo: 'tipo', titulo: 'Tipo', tipo: { select: TIPOS_GENETICA } },
      { campo: 'thc_estimado', titulo: 'THC %', tipo: 'number' },
      { campo: 'tiempo_flora_dias', titulo: 'Días flora/totales', tipo: 'number' },
      { campo: 'notas', titulo: 'Notas', tipo: 'text', ancho: 'min-w-[180px]' },
    ],
  },
  {
    id: 'eventos', nombre: 'Eventos', orden: 'fecha',
    cols: [
      { campo: 'fecha', titulo: 'Fecha', tipo: 'date' },
      { campo: 'tipo', titulo: 'Tipo', tipo: { select: TIPOS_EVENTO } },
      { campo: 'detalle', titulo: 'Detalle', tipo: 'text', ancho: 'min-w-[220px]' },
    ],
  },
  {
    id: 'riegos', nombre: 'Riegos', orden: 'fecha',
    cols: [
      { campo: 'fecha', titulo: 'Fecha', tipo: 'date' },
      { campo: 'volumen_ml', titulo: 'Volumen (ml)', tipo: 'number' },
      { campo: 'ppm', titulo: 'PPM', tipo: 'number' },
      { campo: 'ph', titulo: 'pH', tipo: 'number' },
      { campo: 'escurrio', titulo: 'Escurrió', tipo: 'bool' },
      { campo: 'escurrido_ml', titulo: 'Escurrido (ml)', tipo: 'number' },
      { campo: 'notas', titulo: 'Notas', tipo: 'text', ancho: 'min-w-[160px]' },
    ],
  },
  {
    id: 'aplicaciones', nombre: 'Aplicaciones', orden: 'fecha',
    cols: [
      { campo: 'fecha', titulo: 'Fecha', tipo: 'date' },
      { campo: 'categoria', titulo: 'Categoría', tipo: { select: CATEGORIAS_APLIC } },
      { campo: 'producto', titulo: 'Producto', tipo: 'text' },
      { campo: 'dosis', titulo: 'Dosis', tipo: 'text' },
      { campo: 'metodo', titulo: 'Método', tipo: 'text' },
      { campo: 'notas', titulo: 'Notas', tipo: 'text', ancho: 'min-w-[160px]' },
    ],
  },
  {
    id: 'cosechas', nombre: 'Cosechas', orden: 'fecha',
    cols: [
      { campo: 'fecha', titulo: 'Fecha', tipo: 'date' },
      { campo: 'peso_humedo_g', titulo: 'Húmedo (g)', tipo: 'number' },
      { campo: 'peso_seco_g', titulo: 'Seco (g)', tipo: 'number' },
      { campo: 'valoracion', titulo: 'Nota 1-10', tipo: 'number' },
      { campo: 'notas_sabor', titulo: 'Sabor', tipo: 'text' },
      { campo: 'notas_curado', titulo: 'Curado', tipo: 'text' },
    ],
  },
]

// Tablas que referencian una planta: mostramos la columna con nombre legible
const CON_PLANTA = new Set(['eventos', 'cosechas', 'riegos', 'aplicaciones'])

const celdaCls = 'px-2.5 py-1.5 text-[12px] text-[#d4d4dd] border-b border-r border-[#1f1f2b] whitespace-nowrap'
const inputCls = 'w-full bg-[#1c1c27] border border-[#a3e635]/50 rounded px-1.5 py-0.5 text-[12px] text-[#ececf1] focus:outline-none'

export default function PaginaTablas() {
  const [tabla, setTabla] = useState<DefTabla>(TABLAS[0])
  const [filas, setFilas] = useState<any[]>([])
  const [plantas, setPlantas] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<{ fila: string; campo: string } | null>(null)
  const [valor, setValor] = useState('')
  const [modalImport, setModalImport] = useState(false)
  const [textoImport, setTextoImport] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase.from(tabla.id).select('*')
        .order(tabla.orden, { ascending: tabla.orden === 'nombre' })
      if (error) throw new Error(error.message)
      setFilas(data ?? [])
      if (CON_PLANTA.has(tabla.id)) {
        const { data: pl } = await supabase.from('resumen_plantas').select('id,nombre')
        setPlantas(Object.fromEntries((pl ?? []).map((p: any) => [p.id, p.nombre])))
      }
    } catch (err) {
      toast.error(`Error cargando ${tabla.nombre}: ${(err as Error).message}`)
    } finally {
      setCargando(false)
    }
  }, [tabla])

  useEffect(() => { cargar() }, [cargar])

  const guardarCelda = async (fila: any, col: Col, nuevo: string) => {
    setEditando(null)
    let v: any = nuevo.trim() === '' ? null : nuevo.trim()
    if (col.tipo === 'number' && v !== null) v = Number(v)
    if (v === fila[col.campo]) return
    try {
      const { error } = await supabase.from(tabla.id).update({ [col.campo]: v }).eq('id', fila.id)
      if (error) throw new Error(error.message)
      setFilas(fs => fs.map(f => f.id === fila.id ? { ...f, [col.campo]: v } : f))
    } catch (err) {
      toast.error(`No se pudo guardar: ${(err as Error).message}`)
    }
  }

  const toggleBool = async (fila: any, col: Col) => {
    const v = !fila[col.campo]
    try {
      const { error } = await supabase.from(tabla.id).update({ [col.campo]: v }).eq('id', fila.id)
      if (error) throw new Error(error.message)
      setFilas(fs => fs.map(f => f.id === fila.id ? { ...f, [col.campo]: v } : f))
    } catch (err) {
      toast.error(`No se pudo guardar: ${(err as Error).message}`)
    }
  }

  const agregarFila = async () => {
    try {
      const base: any = {}
      if (tabla.id === 'geneticas') base.nombre = 'Nueva genética'
      const { data, error } = await supabase.from(tabla.id).insert(base).select().single()
      if (error) throw new Error(error.message)
      setFilas(fs => [data, ...fs])
      toast.success('Fila agregada')
    } catch (err) {
      toast.error(`No se pudo agregar: ${(err as Error).message}`)
    }
  }

  const borrarFila = async (fila: any) => {
    if (!window.confirm('¿Borrar esta fila? No se puede deshacer.')) return
    try {
      const { error } = await supabase.from(tabla.id).delete().eq('id', fila.id)
      if (error) throw new Error(error.message)
      setFilas(fs => fs.filter(f => f.id !== fila.id))
      toast.success('Fila borrada')
    } catch (err) {
      toast.error(`No se pudo borrar: ${(err as Error).message}`)
    }
  }

  const exportar = async () => {
    try {
      const json = await exportarFull()
      await navigator.clipboard.writeText(json)
      toast.success('Backup completo copiado al portapapeles')
    } catch (err) {
      toast.error(`No se pudo exportar: ${(err as Error).message}`)
    }
  }

  const importar = async () => {
    setProcesando(true)
    try {
      const r = await importarFull(textoImport)
      toast.success(`Importado: ${r.geneticas} genéticas, ${r.plantas} plantas, ${r.eventos} eventos, ${r.cosechas} cosechas`)
      setModalImport(false); setTextoImport(''); cargar()
    } catch (err) {
      toast.error(`Error importando: ${(err as Error).message}`)
    } finally {
      setProcesando(false)
    }
  }

  const renderCelda = (fila: any, col: Col) => {
    const enEdicion = editando?.fila === fila.id && editando?.campo === col.campo
    const v = fila[col.campo]

    if (col.tipo === 'bool') {
      return (
        <td key={col.campo} className={`${celdaCls} text-center cursor-pointer`} onClick={() => toggleBool(fila, col)}>
          <span className={v ? 'text-[#bef264]' : 'text-[#5c5c6b]'}>{v ? '✓' : '✗'}</span>
        </td>
      )
    }

    if (enEdicion) {
      if (typeof col.tipo === 'object') {
        return (
          <td key={col.campo} className={celdaCls}>
            <select autoFocus className={inputCls} value={valor}
              onChange={e => { setValor(e.target.value); guardarCelda(fila, col, e.target.value) }}
              onBlur={() => guardarCelda(fila, col, valor)}>
              <option value="">—</option>
              {col.tipo.select.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </td>
        )
      }
      return (
        <td key={col.campo} className={celdaCls}>
          <input autoFocus
            type={col.tipo === 'number' ? 'number' : col.tipo === 'date' ? 'date' : 'text'}
            className={inputCls} value={valor}
            onChange={e => setValor(e.target.value)}
            onBlur={() => guardarCelda(fila, col, valor)}
            onKeyDown={e => {
              if (e.key === 'Enter') guardarCelda(fila, col, valor)
              if (e.key === 'Escape') setEditando(null)
            }} />
        </td>
      )
    }

    return (
      <td key={col.campo}
        className={`${celdaCls} ${col.ancho ?? ''} cursor-text hover:bg-[#15151d] transition-colors`}
        onClick={() => { setEditando({ fila: fila.id, campo: col.campo }); setValor(v ?? '') }}>
        {v === null || v === undefined || v === '' ? <span className="text-[#46464f]">—</span> : String(v)}
      </td>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] text-[#d4d4dd] font-sans overflow-hidden">
      <div className="bg-[#0a0a0f]/95 border-b border-[#1f1f2b] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Tablas</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              {filas.length} filas · click en una celda para editar
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={exportar}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]"
            title="Copiar backup completo del cultivo (todas las tablas) al portapapeles">
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setModalImport(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]"
            title="Pegar un backup para restaurar/mezclar">
            <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={cargar}
            className="p-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] transition-colors text-[#a6a6b5]"
            title="Refrescar">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={agregarFila}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[11.5px] font-medium text-[#d9f99d]">
            <Plus className="w-3.5 h-3.5" /> Fila
          </button>
        </div>
        {/* Solapas */}
        <div className="flex gap-1 px-3 sm:px-6 pb-0 overflow-x-auto">
          {TABLAS.map(t => (
            <button key={t.id} onClick={() => setTabla(t)}
              className={`px-3.5 py-2 rounded-t-lg text-[12px] font-medium border border-b-0 transition-colors whitespace-nowrap ${
                tabla.id === t.id
                  ? 'bg-[#101016] border-[#1f1f2b] text-[#d9f99d]'
                  : 'bg-transparent border-transparent text-[#757584] hover:text-[#a6a6b5]'
              }`}>
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#101016]">
        {cargando ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-[#15151d] rounded animate-pulse" />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3">
              <Table2 className="w-5 h-5 text-[#5c5c6b]" />
            </div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">Tabla vacía</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">Agregá una fila o pedíselo al chat.</div>
          </div>
        ) : (
          <table className="border-collapse text-left min-w-full">
            <thead className="sticky top-0 bg-[#0e0e15] z-10">
              <tr>
                {CON_PLANTA.has(tabla.id) && (
                  <th className="px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium border-b border-r border-[#1f1f2b] whitespace-nowrap">Planta</th>
                )}
                {tabla.cols.map(c => (
                  <th key={c.campo} className="px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium border-b border-r border-[#1f1f2b] whitespace-nowrap">{c.titulo}</th>
                ))}
                <th className="px-2 py-2 border-b border-[#1f1f2b] w-9" />
              </tr>
            </thead>
            <tbody>
              {filas.map(fila => (
                <tr key={fila.id} className="group hover:bg-[#13131a]">
                  {CON_PLANTA.has(tabla.id) && (
                    <td className={`${celdaCls} text-[#a6a6b5]`}>{plantas[fila.planta_id] ?? '—'}</td>
                  )}
                  {tabla.cols.map(c => renderCelda(fila, c))}
                  <td className="px-2 py-1.5 border-b border-[#1f1f2b]">
                    <button onClick={() => borrarFila(fila)}
                      className="p-1 text-[#46464f] opacity-0 group-hover:opacity-100 hover:text-[#ff8a7a] rounded transition-all"
                      title="Borrar fila">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalImport(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
              <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">Importar backup</h2>
              <button onClick={() => setModalImport(false)} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11.5px] text-[#8f8f9f] leading-relaxed">
                Pegá un backup exportado desde otra instancia (formato <code className="font-mono text-[10.5px] text-[#c4b5fd] bg-[#15151d] px-1 py-0.5 rounded">growflow-full-v1</code>).
                Las genéticas y plantas se actualizan por nombre/apodo; los eventos y cosechas se suman sin duplicar.
              </p>
              <textarea autoFocus rows={8} value={textoImport}
                onChange={e => setTextoImport(e.target.value)}
                placeholder='{"formato":"growflow-full-v1","geneticas":[...],"plantas":[...]}'
                className="w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[11px] font-mono text-[#ececf1] placeholder-[#46464f] focus:outline-none focus:border-[#a3e635]/60 transition-colors resize-y" />
              <button onClick={importar} disabled={procesando || !textoImport.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50">
                {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
