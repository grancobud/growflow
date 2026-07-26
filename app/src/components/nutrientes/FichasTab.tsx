// "Fichas técnicas": la biblioteca de fertilizantes comerciales.
//
// Para cada producto guarda lo que declara la etiqueta (% p/p), de qué sales
// sale cada elemento y el PDF de respaldo. Es lo que permite clonar una marca
// sabiendo el origen real de cada cosa, en vez de adivinar.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText, Plus, Upload, Trash2, Pencil, Search, ExternalLink,
  CheckCircle2, AlertTriangle, Beaker, X, Loader2, FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fichasService, perfilDesdeFicha, totalDeclarado, PDF_MAX_MB,
  type FichaComercial, type FichaNueva,
} from '../../lib/fichas'
import { ELEMENTOS, type ElementKey, type Perfil } from '../../lib/nutrientes'

const card = 'rounded-xl bg-[#101016] border border-[#1f1f2b]'
const inp = 'w-full bg-[#15151d] border border-[#1f1f2b] rounded-md px-2.5 py-2 min-h-[42px] text-[16px] sm:text-[14px] text-[#ececf1] placeholder:text-[#4a4a58] focus:border-[#404d20] outline-none'
const lbl = 'block text-[12.5px] text-[#8f8f9f] mb-1'

const FICHA_VACIA: FichaNueva = {
  marca: '', producto: '', linea: '', forma: 'liquido', densidad: 1.1,
  npk: '', dosis_ml_l: null, composicion: {}, sales_origen: [],
  sal_id: null, verificado: false, nota: '',
  pdf_path: null, pdf_nombre: null, pdf_tam: null,
}

const pesoLegible = (b?: number | null) =>
  !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' kB'

export default function FichasTab({ onClonar }: { onClonar?: (p: Perfil, nombre: string) => void }) {
  const [fichas, setFichas] = useState<FichaComercial[]>([])
  const [cargando, setCargando] = useState(true)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<FichaComercial | 'nueva' | null>(null)

  const recargar = () => {
    setCargando(true)
    fichasService.listar()
      .then(setFichas)
      .catch(e => toast.error('No se pudieron cargar las fichas: ' + e.message))
      .finally(() => setCargando(false))
  }
  useEffect(recargar, [])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return fichas
    return fichas.filter(f =>
      `${f.marca} ${f.producto} ${f.linea ?? ''} ${f.npk ?? ''} ${f.sales_origen.join(' ')}`
        .toLowerCase().includes(q))
  }, [fichas, busca])

  // Agrupadas por marca: es como uno las piensa ("las de Ryanodine", "las de Athena").
  const porMarca = useMemo(() => {
    const m = new Map<string, FichaComercial[]>()
    for (const f of filtradas) {
      if (!m.has(f.marca)) m.set(f.marca, [])
      m.get(f.marca)!.push(f)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtradas])

  const borrar = async (f: FichaComercial) => {
    if (!confirm(`¿Borrar la ficha de ${f.marca} ${f.producto}?${f.pdf_path ? ' También se borra el PDF.' : ''}`)) return
    try {
      await fichasService.borrar(f)
      toast.success('Ficha borrada')
      recargar()
    } catch (e) { toast.error('No se pudo borrar: ' + (e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={`${card} p-3 sm:p-4`}>
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="w-4 h-4 text-[#a78bfa] flex-shrink-0" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[16px] text-[#ececf1]">Fichas técnicas</h3>
          <span className="text-[13.5px] text-[#5c5c6b]">
            {fichas.length} producto{fichas.length === 1 ? '' : 's'} comercial{fichas.length === 1 ? '' : 'es'}
          </span>
          <div className="relative ml-auto flex-1 sm:flex-none sm:w-56 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-[#5c5c6b] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar marca, producto, sal…"
              className={`${inp} pl-8`} />
          </div>
          <button onClick={() => setEditando('nueva')}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-md text-[14px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2} /> Nueva ficha
          </button>
        </div>
        <p className="text-[13.5px] text-[#5c5c6b] mt-2 leading-relaxed">
          Subí el PDF o la foto de la etiqueta de cada fertilizante que tengas. Guardá lo que declara y de qué
          sales sale, y después clonás la marca sabiendo el origen de cada elemento.
        </p>
      </div>

      {cargando ? (
        <div className={`${card} p-10 text-center`}>
          <Loader2 className="w-5 h-5 text-[#5c5c6b] animate-spin mx-auto" />
        </div>
      ) : porMarca.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <FileText className="w-8 h-8 text-[#2a2a3a] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[15px] text-[#8f8f9f]">
            {busca ? 'Ningún producto coincide con la búsqueda.' : 'Todavía no cargaste ninguna ficha.'}
          </p>
        </div>
      ) : porMarca.map(([marca, items]) => (
        <div key={marca} className="space-y-2">
          <div className="flex items-baseline gap-2 px-0.5">
            <h4 className="font-display font-semibold text-[15px] text-[#d4d4dd]">{marca}</h4>
            <span className="text-[13px] text-[#5c5c6b]">{items.length} producto{items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map(f => (
              <TarjetaFicha key={f.id} f={f} onEditar={() => setEditando(f)} onBorrar={() => borrar(f)} onClonar={onClonar} />
            ))}
          </div>
        </div>
      ))}

      {editando && (
        <ModalFicha
          inicial={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar() }} />
      )}
    </div>
  )
}

// ============================ TARJETA ============================
function TarjetaFicha({ f, onEditar, onBorrar, onClonar }: {
  f: FichaComercial; onEditar: () => void; onBorrar: () => void
  onClonar?: (p: Perfil, nombre: string) => void
}) {
  const [abriendo, setAbriendo] = useState(false)
  const total = totalDeclarado(f)
  const dosisRef = f.dosis_ml_l ?? (f.forma === 'liquido' ? 4 : 1)

  const verPdf = async () => {
    if (!f.pdf_path) return
    setAbriendo(true)
    try {
      const url = await fichasService.urlDe(f.pdf_path)
      window.open(url, '_blank', 'noopener')
    } catch (e) { toast.error('No se pudo abrir el archivo: ' + (e as Error).message) }
    finally { setAbriendo(false) }
  }

  return (
    <div className={`${card} p-3.5 flex flex-col gap-2.5`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h5 className="font-display font-semibold text-[15px] text-[#ececf1] leading-tight">{f.producto}</h5>
          <p className="text-[13px] text-[#5c5c6b] mt-0.5">
            {[f.linea, f.forma === 'liquido' ? `líquido · ${f.densidad ?? 1} g/mL` : 'polvo'].filter(Boolean).join(' · ')}
          </p>
        </div>
        {f.npk && (
          <span className="text-[13.5px] font-mono tabular-nums px-2 py-1 rounded border border-[#2a2a3a] bg-[#15151d] text-[#a6a6b5] flex-shrink-0">
            {f.npk}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {f.verificado ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] px-1.5 py-0.5 rounded bg-[#a3e635]/10 border border-[#404d20] text-[#d9f99d]">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Cierra la cuenta
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12.5px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 border border-[#78500f] text-[#fcd34d]">
            <AlertTriangle className="w-3 h-3" strokeWidth={2} /> La etiqueta no cierra
          </span>
        )}
        <span className="text-[12.5px] text-[#5c5c6b] font-mono tabular-nums">{total}% declarado</span>
      </div>

      {/* Composición: lo que dice el envase, en % */}
      {Object.keys(f.composicion).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ELEMENTOS.filter(e => (f.composicion[e.key] ?? 0) > 0).map(e => (
            <span key={e.key} className="text-[12.5px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5]">
              <span className="text-[#5c5c6b]">{e.key}</span> {f.composicion[e.key]}
            </span>
          ))}
        </div>
      )}

      {f.sales_origen.length > 0 && (
        <div>
          <p className="text-[12px] uppercase tracking-[0.1em] text-[#5c5c6b] mb-1">Sale de</p>
          <p className="text-[13.5px] text-[#a6a6b5] leading-relaxed">{f.sales_origen.join(' · ')}</p>
        </div>
      )}

      {f.nota && <p className="text-[13.5px] text-[#8f8f9f] leading-relaxed">{f.nota}</p>}

      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
        {f.pdf_path ? (
          <button onClick={verPdf} disabled={abriendo}
            className="flex items-center gap-1.5 text-[13.5px] px-2.5 py-2 min-h-[38px] rounded-md bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#c4b5fd] hover:border-[#463a66] transition-colors disabled:opacity-50">
            {abriendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />}
            Ver ficha <span className="text-[#5c5c6b]">{pesoLegible(f.pdf_tam)}</span>
          </button>
        ) : (
          <span className="text-[13px] text-[#3a3a4a] px-1">Sin archivo adjunto</span>
        )}
        {onClonar && Object.keys(f.composicion).length > 0 && (
          <button onClick={() => onClonar(perfilDesdeFicha(f, dosisRef), `${f.marca} ${f.producto}`)}
            title={`Cargar en la calculadora el perfil a ${dosisRef} ${f.forma === 'liquido' ? 'mL/L' : 'g/L'}`}
            className="flex items-center gap-1.5 text-[13.5px] px-2.5 py-2 min-h-[38px] rounded-md bg-[#a3e635]/10 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/20 transition-colors">
            <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.8} /> Clonar
          </button>
        )}
        <button onClick={onEditar} aria-label={`Editar ${f.producto}`}
          className="ml-auto p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-md text-[#5c5c6b] hover:text-[#d9f99d] hover:bg-[#a3e635]/10 transition-colors">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
        <button onClick={onBorrar} aria-label={`Borrar ${f.producto}`}
          className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-md text-[#3a3a4a] hover:text-[#ff8a7a] hover:bg-[#ff8a7a]/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}

// ============================ MODAL ============================
function ModalFicha({ inicial, onCerrar, onGuardado }: {
  inicial: FichaComercial | null; onCerrar: () => void; onGuardado: () => void
}) {
  const [f, setF] = useState<FichaNueva>(() => inicial ? { ...inicial } : { ...FICHA_VACIA })
  const [salesTexto, setSalesTexto] = useState(() => (inicial?.sales_origen ?? []).join(', '))
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof FichaNueva>(k: K, v: FichaNueva[K]) => setF(p => ({ ...p, [k]: v }))
  const setComp = (k: ElementKey, v: number) => setF(p => {
    const c = { ...p.composicion }
    if (v > 0) c[k] = v; else delete c[k]
    return { ...p, composicion: c }
  })

  const elegirArchivo = (file: File | null) => {
    if (!file) return
    if (file.size > PDF_MAX_MB * 1048576) {
      toast.error(`El archivo pesa ${pesoLegible(file.size)}; el máximo son ${PDF_MAX_MB} MB.`)
      return
    }
    setArchivo(file)
  }

  const guardar = async () => {
    if (!f.marca.trim() || !f.producto.trim()) {
      toast.error('Marca y producto son obligatorios.')
      return
    }
    setGuardando(true)
    try {
      const datos: FichaNueva = {
        ...f,
        marca: f.marca.trim(),
        producto: f.producto.trim(),
        sales_origen: salesTexto.split(',').map(s => s.trim()).filter(Boolean),
      }
      if (archivo) {
        // Si estaba reemplazando un archivo, el viejo se va recién cuando el
        // nuevo subió bien: si falla la subida no se pierde el que había.
        const path = await fichasService.subirArchivo(archivo, datos.marca, datos.producto)
        const anterior = inicial?.pdf_path
        datos.pdf_path = path
        datos.pdf_nombre = archivo.name
        datos.pdf_tam = archivo.size
        if (anterior) await fichasService.borrarArchivo(anterior).catch(() => {})
      }
      if (inicial) await fichasService.actualizar(inicial.id, datos)
      else await fichasService.crear(datos)
      toast.success(inicial ? 'Ficha actualizada' : 'Ficha creada')
      onGuardado()
    } catch (e) {
      toast.error('No se pudo guardar: ' + (e as Error).message)
    } finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-[#0d0d12] border border-[#1f1f2b] rounded-t-2xl sm:rounded-2xl max-h-[92vh] max-h-[92dvh] overflow-y-auto overscroll-contain">
        <div className="sticky top-0 bg-[#0d0d12] border-b border-[#1f1f2b] px-4 py-3 flex items-center gap-2 z-10">
          <FileText className="w-4 h-4 text-[#a78bfa]" strokeWidth={1.8} />
          <h3 className="font-display font-semibold text-[16px] text-[#ececf1]">
            {inicial ? `${inicial.marca} · ${inicial.producto}` : 'Nueva ficha técnica'}
          </h3>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="ml-auto p-2 rounded-md text-[#5c5c6b] hover:text-[#ececf1] hover:bg-[#1f1f2b] transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label><span className={lbl}>Marca *</span>
              <input value={f.marca} onChange={e => set('marca', e.target.value)} placeholder="Ryanodine" className={inp} /></label>
            <label><span className={lbl}>Producto *</span>
              <input value={f.producto} onChange={e => set('producto', e.target.value)} placeholder="Makro (A)" className={inp} /></label>
            <label><span className={lbl}>Línea</span>
              <input value={f.linea ?? ''} onChange={e => set('linea', e.target.value)} placeholder="ABC coco" className={inp} /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label><span className={lbl}>Forma</span>
              <select value={f.forma} onChange={e => set('forma', e.target.value as 'liquido' | 'polvo')} className={inp}>
                <option value="liquido">Líquido</option>
                <option value="polvo">Polvo</option>
              </select></label>
            <label><span className={lbl}>Densidad (g/mL)</span>
              <input type="number" step="0.01" disabled={f.forma === 'polvo'}
                value={f.densidad ?? ''} onChange={e => set('densidad', e.target.value === '' ? null : +e.target.value)}
                className={`${inp} disabled:opacity-40`} /></label>
            <label><span className={lbl}>NPK del envase</span>
              <input value={f.npk ?? ''} onChange={e => set('npk', e.target.value)} placeholder="0-15-25" className={inp} /></label>
            <label><span className={lbl}>Dosis {f.forma === 'liquido' ? '(mL/L)' : '(g/L)'}</span>
              <input type="number" step="0.1" value={f.dosis_ml_l ?? ''}
                onChange={e => set('dosis_ml_l', e.target.value === '' ? null : +e.target.value)}
                placeholder="4" className={inp} /></label>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-[12.5px] uppercase tracking-[0.12em] text-[#5c5c6b] font-medium">Composición</p>
              <span className="text-[13px] text-[#3a3a4a]">en % p/p, como lo dice la etiqueta</span>
              <span className="ml-auto text-[13.5px] font-mono tabular-nums text-[#a3e635]/70">
                {Object.values(f.composicion).reduce((a, b) => a + (b || 0), 0).toFixed(3)}%
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {ELEMENTOS.map(e => (
                <label key={e.key}>
                  <span className="block text-[12.5px] text-[#8f8f9f] mb-0.5">{e.key}</span>
                  <input type="number" step="0.0001" min={0}
                    value={f.composicion[e.key] ?? ''}
                    onChange={ev => setComp(e.key, ev.target.value === '' ? 0 : +ev.target.value)}
                    className="w-full bg-[#15151d] border border-[#1f1f2b] rounded-md px-2 py-2 min-h-[40px] text-[16px] sm:text-[12.5px] text-[#ececf1] font-mono tabular-nums focus:border-[#404d20] outline-none" />
                </label>
              ))}
            </div>
          </div>

          <label className="block"><span className={lbl}>Sale de estas sales <span className="text-[#3a3a4a]">— separadas por coma</span></span>
            <input value={salesTexto} onChange={e => setSalesTexto(e.target.value)}
              placeholder="Nitrato de calcio, Sulfato de potasio, MKP" className={inp} /></label>

          <label className="block"><span className={lbl}>Nota <span className="text-[#3a3a4a]">— qué encontraste al analizarla</span></span>
            <textarea value={f.nota ?? ''} onChange={e => set('nota', e.target.value)} rows={3}
              placeholder="Ej: la etiqueta dice fosfato de calcio pero el azufre no cierra; sólo da con yeso."
              className={`${inp} font-sans resize-y`} /></label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.verificado} onChange={e => set('verificado', e.target.checked)}
              className="w-4 h-4 accent-[#a3e635]" />
            <span className="text-[14px] text-[#d4d4dd]">La estequiometría cierra</span>
            <span className="text-[13px] text-[#5c5c6b]">— las sales declaradas dan los porcentajes declarados</span>
          </label>

          <div>
            <p className={lbl}>Ficha / etiqueta <span className="text-[#3a3a4a]">— PDF o foto, hasta {PDF_MAX_MB} MB</span></p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-md text-[14px] bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#c4b5fd] hover:border-[#463a66] transition-colors">
                <Upload className="w-4 h-4" strokeWidth={1.8} /> {inicial?.pdf_path ? 'Reemplazar' : 'Subir'}
              </button>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden"
                onChange={e => elegirArchivo(e.target.files?.[0] ?? null)} />
              <span className="text-[13.5px] text-[#8f8f9f] truncate">
                {archivo ? `${archivo.name} · ${pesoLegible(archivo.size)}`
                  : inicial?.pdf_nombre ? `${inicial.pdf_nombre} · ${pesoLegible(inicial.pdf_tam)}`
                  : 'Ningún archivo'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar}
              className="flex-1 px-3 py-2.5 min-h-[44px] rounded-md text-[14px] bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] hover:text-[#ececf1] transition-colors">
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-md text-[14px] font-medium bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 transition-colors disabled:opacity-50">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" strokeWidth={1.8} />}
              {inicial ? 'Guardar cambios' : 'Crear ficha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
