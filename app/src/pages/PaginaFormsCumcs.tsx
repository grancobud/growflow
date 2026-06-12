import { useEffect, useState } from 'react'
import { ClipboardList, Save, Loader2, CheckCircle2, AlertCircle, Users, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { camposParaCodigo } from '../lib/camposChatCumcs'
import { useConfirm } from '../hooks/useConfirm'

type Tipo = { codigo: string; nombre: string; grupo: string; tabla_destino: string }

const GRUPOS = [
  { id: 'G08', label: 'G08 Personal', icon: Users, tabla: 'registros_personal' },
  { id: 'G10', label: 'G10 Documental', icon: FileText, tabla: 'registros_documentales' },
] as const

export default function PaginaFormsCumcs() {
  const confirmar = useConfirm()
  const [grupo, setGrupo] = useState<'G08' | 'G10'>('G08')
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [codigoSel, setCodigoSel] = useState<string>('')
  const [valores, setValores] = useState<Record<string, any>>({})
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')
  const [registros, setRegistros] = useState<any[]>([])
  const [cargandoReg, setCargandoReg] = useState(false)

  useEffect(() => {
    supabase.from('tipos_registro_cumcs').select('codigo,nombre,grupo,tabla_destino')
      .eq('grupo', grupo).order('codigo').then(({ data }) => {
        setTipos((data as Tipo[]) || [])
        if (data && data.length > 0) setCodigoSel(data[0].codigo)
      })
  }, [grupo])

  useEffect(() => { cargarRegistros() }, [grupo])

  async function cargarRegistros() {
    const g = GRUPOS.find(x => x.id === grupo)!
    setCargandoReg(true)
    const { data } = await supabase.from(g.tabla).select('*').order('creado_en', { ascending: false }).limit(20)
    setRegistros(data || [])
    setCargandoReg(false)
  }

  const campos = codigoSel ? camposParaCodigo(codigoSel) : []
  const tipoSel = tipos.find(t => t.codigo === codigoSel)

  function handleChange(key: string, val: any) {
    setValores(v => ({ ...v, [key]: val }))
  }

  async function guardar() {
    if (!tipoSel) return
    setGuardando(true); setMsg('')
    try {
      const { data: user } = await supabase.auth.getUser()
      const payload: any = {
        ...valores,
        tipo: codigoSel,
        fecha: valores.fecha || new Date().toISOString().slice(0, 10),
        creado_por: user.user?.id,
      }
      // convertir boolean strings
      for (const k of Object.keys(payload)) {
        if (payload[k] === 'si') payload[k] = true
        if (payload[k] === 'no') payload[k] = false
      }
      const { error } = await supabase.from(tipoSel.tabla_destino).insert(payload)
      if (error) throw error
      setMsg('Registro guardado')
      setValores({})
      await cargarRegistros()
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally { setGuardando(false) }
  }

  async function eliminar(id: string) {
    const ok = await confirmar({
      titulo: 'Eliminar registro CUMCS',
      descripcion: `Esta accion no se puede deshacer. El registro quedara en el audit log pero se removera de la lista activa.`,
      variant: 'destructive',
      confirmLabel: 'Eliminar registro',
    })
    if (!ok) return
    const g = GRUPOS.find(x => x.id === grupo)!
    const { error } = await supabase.from(g.tabla).delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
      return
    }
    toast.success('Registro eliminado')
    cargarRegistros()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ClipboardList className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Formularios CUMCS</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">G08 Personal · G10 Documental · 20 formularios CM-RE</div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4">

        {/* Tabs grupo */}
        <div className="flex items-center gap-2">
          {GRUPOS.map(g => (
            <button key={g.id} onClick={() => { setGrupo(g.id); setCodigoSel(''); setValores({}) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${grupo === g.id ? 'bg-[#a3e635] text-[#0a0a0f]' : 'bg-[#101016] border border-[#1f1f2b] text-[#b3b3c0] hover:border-[#404d20] hover:text-[#d4d4dd]'}`}>
              <g.icon className="w-4 h-4" />
              {g.label}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${msg.startsWith('Error') ? 'bg-[#7a2820]/20 border border-[#7a2820]/50 text-[#ff8a7a]' : 'bg-[#a3e635]/10 border border-[#404d20] text-[#bef264]'}`}>
            {msg.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}{msg}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Lista de codigos */}
          <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-3 space-y-1">
            <h3 className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium px-2 py-1">Codigos CUMCS</h3>
            {tipos.map(t => (
              <button key={t.codigo} onClick={() => { setCodigoSel(t.codigo); setValores({}) }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${codigoSel === t.codigo ? 'bg-[#a3e635]/15 border border-[#404d20] text-[#bef264]' : 'hover:bg-[#15151d] text-[#b3b3c0] border border-transparent'}`}>
                <span className="font-mono font-bold">{t.codigo}</span>
                <p className="text-[11px] text-[#5c5c6b] mt-0.5 leading-snug">{t.nombre}</p>
              </button>
            ))}
          </div>

          {/* Formulario dinamico */}
          <div className="lg:col-span-2 bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
            {tipoSel ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-4 h-4 text-[#a3e635]" />
                  <span className="font-mono font-bold text-[#a3e635]">{tipoSel.codigo}</span>
                  <span className="text-sm text-[#d4d4dd]">{tipoSel.nombre}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {campos.map(c => (
                    <label key={c.key} className={c.tipo === 'textarea' ? 'sm:col-span-2 block' : 'block'}>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5 block">
                        {c.label} {c.requerido && <span className="text-[#ff8a7a]">*</span>}
                      </span>
                      {c.tipo === 'textarea' ? (
                        <textarea value={valores[c.key] || ''} onChange={e => handleChange(c.key, e.target.value)} rows={3}
                          placeholder={c.placeholder}
                          className="w-full px-2.5 py-2 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-xs text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]" />
                      ) : c.tipo === 'select' ? (
                        <select value={valores[c.key] || c.defaultValue || ''} onChange={e => handleChange(c.key, e.target.value)}
                          className="w-full px-2.5 py-2 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-xs text-[#d4d4dd] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]">
                          <option value="">—</option>
                          {c.opciones?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={c.tipo} value={valores[c.key] || ''} onChange={e => handleChange(c.key, c.tipo === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                          placeholder={c.placeholder}
                          className="w-full px-2.5 py-2 bg-[#15151d] border border-[#2a2a3a] rounded-lg text-xs text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:ring-1 focus:ring-[#a3e635]/30 focus:border-[#404d20]" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={guardar} disabled={guardando}
                    className="flex items-center gap-2 px-4 py-2 bg-[#a3e635] hover:bg-[#bef264] text-[#0a0a0f] rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar registro
                  </button>
                  <button onClick={() => setValores({})}
                    className="px-4 py-2 bg-[#15151d] border border-[#2a2a3a] hover:bg-[#1c1c27] text-[#b3b3c0] rounded-lg text-sm transition-colors">
                    Limpiar
                  </button>
                </div>
              </>
            ) : <p className="text-xs text-[#5c5c6b]">Elegi un codigo de la izquierda</p>}
          </div>
        </div>

        {/* Registros existentes */}
        <div className="bg-[#101016] border border-[#1f1f2b] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#ececf1] mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#a3e635]" /> Registros existentes ({registros.length})
          </h3>
          {cargandoReg ? <Loader2 className="w-5 h-5 animate-spin text-[#a3e635]" /> :
            registros.length === 0 ? <p className="text-xs text-[#5c5c6b]">Sin registros aun</p> : (
            <div className="space-y-0.5">
              {registros.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[#1f1f2b] last:border-0 text-xs">
                  <span className="font-mono font-bold text-[#a3e635]">{r.tipo}</span>
                  <span className="text-[#5c5c6b] tabular-nums">{r.fecha}</span>
                  <span className="text-[#b3b3c0] truncate flex-1">{r.titulo || r.descripcion || r.empleado_nombre || r.tema_capacitacion || r.area_limpiada || r.proveedor_nombre || '—'}</span>
                  <button onClick={() => eliminar(r.id)} className="text-[#7a2820] hover:text-[#ff8a7a] transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
