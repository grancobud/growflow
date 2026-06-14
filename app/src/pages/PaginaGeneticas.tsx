// PaginaGeneticas — fichero ampliado de genéticas en formato de fichas.
// Cards con foto/chips; modal de detalle+edición con toda la info relevante
// para cultivo medicinal (genotipo, cannabinoides, terpenos, usos, tiempos...).

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dna, Plus, X, Search, Loader2, Trash2, Pencil, Upload, Sprout, FlaskConical, Clock,
} from 'lucide-react'
import {
  cultivoService, TIPOS_GENETICA, GENOTIPOS, ALTURAS, DIFICULTADES, AMBIENTES,
  type Genetica,
} from '../lib/cultivo'
import { MODO_DEMO } from '../lib/supabase'

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12.5px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 transition-colors'
const labelCls = 'block text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1'
const btnPrimario = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a3e635]/40 bg-[#a3e635]/10 hover:bg-[#a3e635]/20 transition-colors text-[12px] font-medium text-[#d9f99d] disabled:opacity-50'
const btnSutil = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#15151d] hover:bg-[#1c1c27] hover:border-[#404d20] transition-colors text-[11px] text-[#a6a6b5] hover:text-[#ececf1]'

const COLOR_GENOTIPO: Record<string, { text: string; bg: string; border: string }> = {
  Indica:    { text: '#c4b5fd', bg: 'rgba(139,92,246,0.12)', border: '#463a66' },
  Sativa:    { text: '#bef264', bg: 'rgba(163,230,53,0.14)', border: '#404d20' },
  Hibrida:   { text: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: '#1e3a4a' },
  Ruderalis: { text: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: '#5a4a20' },
}

export default function PaginaGeneticas() {
  const [geneticas, setGeneticas] = useState<Genetica[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalForm, setModalForm] = useState(false)
  const [editar, setEditar] = useState<Genetica | null>(null)

  const cargar = useCallback(async () => {
    try { setGeneticas(await cultivoService.getGeneticas()) }
    catch (err) { toast.error(`Error cargando genéticas: ${(err as Error).message}`) }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const borrar = async (g: Genetica) => {
    if (!window.confirm(`¿Borrar la genética "${g.nombre}"? Las plantas que la usan quedan sin genética.`)) return
    try { await cultivoService.eliminarGenetica(g.id); toast.success('Genética borrada'); cargar() }
    catch (err) { toast.error(`No se pudo borrar: ${(err as Error).message}`) }
  }

  const q = busqueda.trim().toLowerCase()
  const filtradas = geneticas.filter(g =>
    !q || g.nombre.toLowerCase().includes(q) || (g.banco ?? '').toLowerCase().includes(q) || (g.linaje ?? '').toLowerCase().includes(q))

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans">
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center flex-wrap gap-2 sm:gap-x-4 px-3 sm:px-6 py-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Genéticas</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{geneticas.length} en el banco</div>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b]" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre / banco"
              className="pl-8 pr-3 py-2 rounded-lg bg-[#15151d] border border-[#2a2a3a] text-[12px] text-[#ececf1] placeholder-[#5c5c6b] focus:outline-none focus:border-[#a3e635]/60 w-[170px]" />
          </div>
          <button onClick={() => { setEditar(null); setModalForm(true) }} className={btnPrimario}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Genética</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 pb-20">
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl bg-[#101016] border border-[#1f1f2b] h-[150px] animate-pulse" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-[#1c1c27] border border-[#20202c] flex items-center justify-center mb-3"><Dna className="w-5 h-5 text-[#5c5c6b]" /></div>
            <div className="font-display font-semibold text-[#d4d4dd] text-[14px]">{geneticas.length === 0 ? 'Sin genéticas cargadas' : 'Sin resultados'}</div>
            <div className="mt-1 text-[11.5px] text-[#5c5c6b]">{geneticas.length === 0 ? 'Creá la primera ficha de genética.' : 'Probá con otra búsqueda.'}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {filtradas.map(g => {
              const cg = g.genotipo ? COLOR_GENOTIPO[g.genotipo] : null
              return (
                <div key={g.id} className="rounded-xl bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] transition-colors overflow-hidden">
                  {g.foto_url && <div className="h-28 bg-[#15151d] overflow-hidden"><img src={g.foto_url} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => { setEditar(g); setModalForm(true) }}
                          className="font-display font-semibold text-[14px] text-[#ececf1] truncate hover:text-[#bef264] transition-colors text-left block max-w-full" title="Ver / editar ficha">
                          {g.nombre}
                        </button>
                        <p className="text-[11px] text-[#757584] truncate mt-0.5">
                          {g.banco ?? 'Sin banco'}{g.tipo ? ` · ${g.tipo}` : ''}
                        </p>
                      </div>
                      {cg && <span className="px-2 py-0.5 rounded-full border text-[10px] font-medium flex-shrink-0" style={{ color: cg.text, background: cg.bg, borderColor: cg.border }}>{g.genotipo}</span>}
                    </div>

                    {g.linaje && <p className="mt-2 text-[10.5px] text-[#8f8f9f] italic truncate">{g.linaje}</p>}

                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[#8f8f9f] tabular-nums">
                      {g.thc_estimado != null && <span className="inline-flex items-center gap-1"><FlaskConical className="w-3 h-3 text-[#bef264]" />THC {g.thc_estimado}%</span>}
                      {g.cbd_estimado != null && <span>CBD {g.cbd_estimado}%</span>}
                      {g.tiempo_flora_dias != null && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3 text-[#c4b5fd]" />{g.tiempo_flora_dias}d flora</span>}
                      {g.altura && <span>Porte {g.altura.toLowerCase()}</span>}
                    </div>

                    {g.usos_medicinales && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#1f1f2b]">
                        <span className="text-[9.5px] uppercase tracking-[0.14em] text-[#5c5c6b]">Usos</span>
                        <p className="text-[11px] text-[#a6a6b5] mt-0.5 line-clamp-2">{g.usos_medicinales}</p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => { setEditar(g); setModalForm(true) }} className={btnSutil}><Pencil className="w-3.5 h-3.5" /> Editar ficha</button>
                      <button onClick={() => borrar(g)} className="p-1.5 text-[#46464f] hover:text-[#ff8a7a] hover:bg-[#15151d] rounded-lg transition-colors ml-auto" title="Borrar"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalForm && <ModalGeneticaFicha genetica={editar} onCerrar={() => setModalForm(false)} onGuardado={() => { setModalForm(false); cargar() }} />}
    </div>
  )
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCerrar} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#101016] border border-[#2a2a3a] shadow-2xl">
        <div className="sticky top-0 bg-[#101016] flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f2b]">
          <h2 className="font-display font-semibold text-[14px] text-[#ececf1]">{titulo}</h2>
          <button onClick={onCerrar} className="p-1 text-[#5c5c6b] hover:text-[#ececf1]" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

type FormG = {
  nombre: string; banco: string; tipo: string; genotipo: string; indica_pct: string; sativa_pct: string
  linaje: string; thc: string; cbd: string; flora: string; vege: string; altura: string; rendimiento: string
  dificultad: string; ambiente: string; terpenos: string; efectos: string; usos: string; resistencia: string
  stretch: string; notas: string
}

function ModalGeneticaFicha({ genetica, onCerrar, onGuardado }: {
  genetica: Genetica | null; onCerrar: () => void; onGuardado: () => void
}) {
  const g = genetica
  const [form, setForm] = useState<FormG>({
    nombre: g?.nombre ?? '', banco: g?.banco ?? '', tipo: g?.tipo ?? 'Feminizada',
    genotipo: g?.genotipo ?? '', indica_pct: g?.indica_pct?.toString() ?? '', sativa_pct: g?.sativa_pct?.toString() ?? '',
    linaje: g?.linaje ?? '', thc: g?.thc_estimado?.toString() ?? '', cbd: g?.cbd_estimado?.toString() ?? '',
    flora: g?.tiempo_flora_dias?.toString() ?? '', vege: g?.tiempo_vege_dias?.toString() ?? '',
    altura: g?.altura ?? '', rendimiento: g?.rendimiento_g ?? '', dificultad: g?.dificultad ?? '',
    ambiente: g?.ambiente ?? '', terpenos: g?.terpenos ?? '', efectos: g?.efectos ?? '',
    usos: g?.usos_medicinales ?? '', resistencia: g?.resistencia ?? '', stretch: g?.stretch ?? '', notas: g?.notas ?? '',
  })
  const [fotoUrl, setFotoUrl] = useState<string | null>(g?.foto_url ?? null)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof FormG, v: string) => setForm(f => ({ ...f, [k]: v }))

  const subirFoto = async (file: File) => {
    setSubiendo(true)
    try { setFotoUrl(await cultivoService.subirFotoGenetica(file)); toast.success('Foto cargada') }
    catch (err) { toast.error(`No se pudo subir: ${(err as Error).message}`) }
    finally { setSubiendo(false) }
  }

  const numNull = (s: string, entero = false) => s.trim() === '' ? null : (entero ? parseInt(s) : parseFloat(s))
  const txtNull = (s: string) => s.trim() || null

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setGuardando(true)
    const payload: Partial<Genetica> = {
      nombre: form.nombre.trim(), banco: txtNull(form.banco), tipo: form.tipo as Genetica['tipo'],
      genotipo: (form.genotipo || null) as Genetica['genotipo'],
      indica_pct: numNull(form.indica_pct, true), sativa_pct: numNull(form.sativa_pct, true),
      linaje: txtNull(form.linaje), thc_estimado: numNull(form.thc), cbd_estimado: numNull(form.cbd),
      tiempo_flora_dias: numNull(form.flora, true), tiempo_vege_dias: numNull(form.vege, true),
      altura: (form.altura || null) as Genetica['altura'], rendimiento_g: txtNull(form.rendimiento),
      dificultad: (form.dificultad || null) as Genetica['dificultad'], ambiente: (form.ambiente || null) as Genetica['ambiente'],
      terpenos: txtNull(form.terpenos), efectos: txtNull(form.efectos), usos_medicinales: txtNull(form.usos),
      resistencia: txtNull(form.resistencia), stretch: txtNull(form.stretch), notas: txtNull(form.notas),
      foto_url: fotoUrl,
    }
    try {
      if (g) { await cultivoService.actualizarGenetica(g.id, payload); toast.success('Ficha actualizada') }
      else { await cultivoService.crearGenetica(payload as any); toast.success(`Genética "${form.nombre}" creada`) }
      onGuardado()
    } catch (err) { toast.error(`Error: ${(err as Error).message}`); setGuardando(false) }
  }

  return (
    <Modal titulo={g ? 'Editar ficha de genética' : 'Nueva genética'} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Nombre *</label><input autoFocus className={inputCls} placeholder="Gorilla Glue #4" value={form.nombre} onChange={e => set('nombre', e.target.value)} /></div>
          <div><label className={labelCls}>Banco</label><input className={inputCls} placeholder="GG Strains" value={form.banco} onChange={e => set('banco', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Tipo</label>
            <select className={inputCls} value={form.tipo} onChange={e => set('tipo', e.target.value)}>{TIPOS_GENETICA.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div><label className={labelCls}>Genotipo</label>
            <select className={inputCls} value={form.genotipo} onChange={e => set('genotipo', e.target.value)}><option value="">—</option>{GENOTIPOS.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div><label className={labelCls}>Indica/Sativa %</label>
            <div className="flex gap-1">
              <input className={inputCls} type="number" placeholder="60" value={form.indica_pct} onChange={e => set('indica_pct', e.target.value)} title="% Indica" />
              <input className={inputCls} type="number" placeholder="40" value={form.sativa_pct} onChange={e => set('sativa_pct', e.target.value)} title="% Sativa" />
            </div>
          </div>
        </div>
        <div><label className={labelCls}>Linaje / Cruza</label><input className={inputCls} placeholder="Chem's Sister x Sour Dubb x Chocolate Diesel" value={form.linaje} onChange={e => set('linaje', e.target.value)} /></div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Cannabinoides y tiempos</div></div>
        <div className="grid grid-cols-4 gap-3">
          <div><label className={labelCls}>THC %</label><input className={inputCls} type="number" step="0.1" placeholder="25" value={form.thc} onChange={e => set('thc', e.target.value)} /></div>
          <div><label className={labelCls}>CBD %</label><input className={inputCls} type="number" step="0.1" placeholder="0.1" value={form.cbd} onChange={e => set('cbd', e.target.value)} /></div>
          <div><label className={labelCls}>Vege (días)</label><input className={inputCls} type="number" placeholder="28" value={form.vege} onChange={e => set('vege', e.target.value)} /></div>
          <div><label className={labelCls}>Flora (días)</label><input className={inputCls} type="number" placeholder="63" value={form.flora} onChange={e => set('flora', e.target.value)} /></div>
        </div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Cultivo</div></div>
        <div className="grid grid-cols-4 gap-3">
          <div><label className={labelCls}>Altura</label><select className={inputCls} value={form.altura} onChange={e => set('altura', e.target.value)}><option value="">—</option>{ALTURAS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          <div><label className={labelCls}>Dificultad</label><select className={inputCls} value={form.dificultad} onChange={e => set('dificultad', e.target.value)}><option value="">—</option>{DIFICULTADES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          <div><label className={labelCls}>Ambiente</label><select className={inputCls} value={form.ambiente} onChange={e => set('ambiente', e.target.value)}><option value="">—</option>{AMBIENTES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          <div><label className={labelCls}>Rendimiento</label><input className={inputCls} placeholder="500 g/m²" value={form.rendimiento} onChange={e => set('rendimiento', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Stretch (flora)</label><input className={inputCls} placeholder="x2 altura" value={form.stretch} onChange={e => set('stretch', e.target.value)} /></div>
          <div><label className={labelCls}>Resistencia</label><input className={inputCls} placeholder="Hongos / plagas" value={form.resistencia} onChange={e => set('resistencia', e.target.value)} /></div>
        </div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Perfil y usos</div></div>
        <div><label className={labelCls}>Terpenos / Aroma</label><input className={inputCls} placeholder="Mirceno, limoneno · cítrico, pino" value={form.terpenos} onChange={e => set('terpenos', e.target.value)} /></div>
        <div><label className={labelCls}>Efectos</label><input className={inputCls} placeholder="Relajante, corporal, sedante" value={form.efectos} onChange={e => set('efectos', e.target.value)} /></div>
        <div><label className={labelCls}>Usos medicinales</label><input className={inputCls} placeholder="Dolor crónico, insomnio, apetito" value={form.usos} onChange={e => set('usos', e.target.value)} /></div>

        <div className="pt-2 border-t border-[#1f1f2b]"><div className="text-[10px] uppercase tracking-[0.14em] text-[#a78bfa] mb-2">Foto</div></div>
        {MODO_DEMO && <p className="text-[10.5px] text-[#f59e0b] -mt-1">Modo demo: la foto queda en este navegador.</p>}
        <div className="flex items-center gap-3">
          {fotoUrl && <img src={fotoUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#2a2a3a]" />}
          <label className={`${btnSutil} cursor-pointer`}>
            {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f) }} />
          </label>
        </div>

        <div><label className={labelCls}>Notas</label><textarea className={inputCls} rows={2} placeholder="Observaciones propias del cultivo..." value={form.notas} onChange={e => set('notas', e.target.value)} /></div>

        <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full justify-center`}>
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : g ? <Sprout className="w-3.5 h-3.5" /> : <Dna className="w-3.5 h-3.5" />}
          {g ? 'Guardar cambios' : 'Crear genética'}
        </button>
      </div>
    </Modal>
  )
}
