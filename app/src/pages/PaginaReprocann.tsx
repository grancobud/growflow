import { useEffect, useState } from 'react'
import { Shield, Loader2, Download, AlertCircle, CheckCircle2, Save, Building2, Upload, Paperclip, Trash2, ChevronDown, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../hooks/useConfirm'

type Org = {
  id: string; nombre: string; cuit: string; reprocann_numero: string | null
  direccion: string | null; responsable_tecnico: string | null; matricula_responsable: string | null
  email_contacto: string | null; telefono: string | null
}

type Adjunto = { name: string; size: number; url: string; contentType: string; created_at: string }

type Datos = {
  periodo_desde: string
  periodo_hasta: string
  organizacion: { nombre: string; cuit: string; reprocann: string | null; direccion: string | null; responsable: string | null; matricula: string | null }
  inventario_camadas: Array<{ camada: string; esquejes: number; plantas: number; madres: number; flor: number; flor_trimmeada: number; flor_fraccionada: number; kg_final: number }>
  operaciones_total: number
  operaciones_por_tipo: Record<string, number>
  analisis_laboratorio: Array<{ numero_certificado: string; laboratorio_nombre: string; fecha_analisis: string; thc_total: number | null; cbd_total: number | null; resultado_general: string; codigo_lote: string; camada: string }>
  lotes_sin_analisis: number
  eventos_adversos: Array<{ id: string; fecha_evento: string; tipo: string; severidad: string; descripcion: string; codigo_lote: string | null; resuelto: boolean; reportado_anmat: boolean }>
  no_conformidades: number
  usuarios_activos: number
  audit_log_hashes: number
}

type Historial = { id: string; periodo_anio: number; periodo_semestre: number; estado: string; fecha_generacion: string; numero_presentacion: string | null }

export default function PaginaReprocann() {
  const confirmar = useConfirm()
  const now = new Date()
  const [anio, setAnio] = useState<number>(now.getFullYear())
  const [semestre, setSemestre] = useState<1 | 2>(now.getMonth() < 6 ? 1 : 2)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [historial, setHistorial] = useState<Historial[]>([])
  const [msg, setMsg] = useState('')
  const [org, setOrg] = useState<Org | null>(null)
  const [orgEditando, setOrgEditando] = useState(false)
  const [orgGuardando, setOrgGuardando] = useState(false)
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => { cargarHistorial(); cargarOrg(); cargarAdjuntos() }, [])

  async function cargarOrg() {
    const { data } = await supabase.from('organizaciones').select('*').limit(1).single()
    setOrg(data as Org)
  }

  async function guardarOrg(nuevoOrg: Partial<Org>) {
    if (!org) return
    setOrgGuardando(true); setMsg('')
    const { error } = await supabase.from('organizaciones').update(nuevoOrg).eq('id', org.id)
    if (error) setMsg('Error guardando: ' + error.message)
    else { setMsg('Datos de organizacion guardados'); setOrgEditando(false); cargarOrg() }
    setOrgGuardando(false)
  }

  async function cargarAdjuntos() {
    const { data } = await supabase.storage.from('canntrace-archivos').list('reprocann-docs', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
    const list: Adjunto[] = []
    for (const f of (data || [])) {
      const { data: url } = await supabase.storage.from('canntrace-archivos').createSignedUrl(`reprocann-docs/${f.name}`, 3600)
      list.push({ name: f.name, size: f.metadata?.size || 0, url: url?.signedUrl || '', contentType: f.metadata?.mimetype || '', created_at: f.created_at || '' })
    }
    setAdjuntos(list)
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setSubiendo(true); setMsg('')
    const safeName = `${Date.now()}_${f.name.replace(/[^\x20-\x7E]/g, '_').replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from('canntrace-archivos').upload(`reprocann-docs/${safeName}`, f, { contentType: f.type, upsert: false })
    if (error) setMsg('Error subiendo: ' + error.message)
    else { setMsg(`Subido: ${f.name}`); cargarAdjuntos() }
    setSubiendo(false)
    e.target.value = ''
  }

  async function eliminarAdjunto(name: string) {
    const ok = await confirmar({
      titulo: 'Eliminar adjunto REPROCANN',
      descripcion: `Se quitara "${name}" del reporte semestral.`,
      variant: 'destructive',
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    const { error } = await supabase.storage.from('canntrace-archivos').remove([`reprocann-docs/${name}`])
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Adjunto eliminado')
    cargarAdjuntos()
  }

  async function cargarHistorial() {
    const { data } = await supabase.from('reportes_reprocann').select('id, periodo_anio, periodo_semestre, estado, fecha_generacion, numero_presentacion').order('fecha_generacion', { ascending: false })
    setHistorial((data as Historial[]) || [])
  }

  async function generar() {
    setCargando(true); setMsg(''); setDatos(null)
    try {
      const { data, error } = await supabase.rpc('reprocann_agregado', { p_anio: anio, p_semestre: semestre })
      if (error) throw error
      setDatos(data as Datos)
    } catch (e: any) {
      setMsg('Error: ' + (e.message || 'desconocido'))
    } finally { setCargando(false) }
  }

  async function guardar() {
    if (!datos) return
    setGuardando(true); setMsg('')
    try {
      const { data: user } = await supabase.auth.getUser()
      const { error } = await supabase.from('reportes_reprocann').upsert({
        periodo_anio: anio, periodo_semestre: semestre,
        fecha_desde: datos.periodo_desde, fecha_hasta: datos.periodo_hasta,
        estado: 'generado', datos_resumen: datos, generado_por: user.user?.id,
      }, { onConflict: 'tenant_id,periodo_anio,periodo_semestre' })
      if (error) throw error
      setMsg('Reporte guardado en historial.')
      await cargarHistorial()
    } catch (e: any) {
      setMsg('Error al guardar: ' + (e.message || 'desconocido'))
    } finally { setGuardando(false) }
  }

  function imprimir() { window.print() }

  const orgRep = datos?.organizacion
  const sinDatos = datos && datos.inventario_camadas.length === 0 && datos.operaciones_total === 0

  const estadoBadge: Record<string, { color: string; bg: string; border: string }> = {
    presentado: { color: '#bef264', bg: 'rgba(63,176,116,0.10)', border: '#404d20' },
    observado:  { color: '#ff8a7a', bg: 'rgba(122,40,32,0.15)',   border: '#7a2820' },
    generado:   { color: '#a6a6b5', bg: 'rgba(180,200,190,0.05)', border: '#1f1f2b' },
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <Shield className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">REPROCANN — Reporte Semestral</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              Res. ANMAT 1780/2025
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>Decreto 27/2026</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="no-print px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">

        {/* Selector periodo + acciones */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Año</p>
              <div className="relative">
                <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] outline-none cursor-pointer">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b] pointer-events-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1.5">Semestre</p>
              <div className="relative">
                <select value={semestre} onChange={e => setSemestre(parseInt(e.target.value) as 1|2)}
                  className="appearance-none pl-3 pr-8 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] rounded-lg text-[12px] text-[#d4d4dd] outline-none cursor-pointer">
                  <option value={1}>S1 (Ene-Jun)</option>
                  <option value={2}>S2 (Jul-Dic)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5c5c6b] pointer-events-none" />
              </div>
            </div>
            <button onClick={generar} disabled={cargando}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50">
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" strokeWidth={1.8} />}
              Generar reporte
            </button>
            {datos && (
              <>
                <button onClick={guardar} disabled={guardando}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#a6a6b5] rounded-lg text-[12px] transition-colors disabled:opacity-50">
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={1.8} />}
                  Guardar
                </button>
                <button onClick={imprimir}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa]/15 border border-[#463a66] text-[#c4b5fd] rounded-lg text-[12px] transition-colors">
                  <Download className="w-4 h-4" strokeWidth={1.8} />
                  Imprimir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mensaje */}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-[12px] border ${
            msg.startsWith('Error')
              ? 'bg-[#7a2820]/20 border-[#7a2820]/40 text-[#ff8a7a]'
              : 'bg-[#a3e635]/10 border-[#404d20] text-[#d9f99d]'
          }`}>
            {msg.startsWith('Error') ? <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />}
            {msg}
          </div>
        )}

        {/* Datos organizacion */}
        {org && (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Datos del Titular (FIS S.A.S.)</h3>
              </div>
              {!orgEditando && (
                <button onClick={() => setOrgEditando(true)}
                  className="text-[11px] text-[#bef264] hover:text-[#d9f99d] font-medium">
                  Editar
                </button>
              )}
            </div>
            {!orgEditando ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Razon social', value: org.nombre },
                  { label: 'CUIT', value: org.cuit },
                  { label: 'N REPROCANN', value: org.reprocann_numero, warn: !org.reprocann_numero },
                  { label: 'Direccion', value: org.direccion, warn: !org.direccion },
                  { label: 'Responsable tecnico', value: org.responsable_tecnico, warn: !org.responsable_tecnico },
                  { label: 'Matricula', value: org.matricula_responsable, warn: !org.matricula_responsable },
                  { label: 'Email', value: org.email_contacto },
                  { label: 'Telefono', value: org.telefono },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="rounded-lg bg-[#15151d] border border-[#1f1f2b] p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium">{label}</p>
                    <p className={`text-[12px] mt-0.5 ${warn ? 'text-[#c4b5fd] font-semibold' : 'text-[#d4d4dd]'}`}>
                      {value || (warn ? 'PENDIENTE CONFIGURAR' : '—')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <FormOrg org={org} onCancel={() => setOrgEditando(false)} onGuardar={guardarOrg} guardando={orgGuardando} />
            )}
          </div>
        )}

        {/* Adjuntos */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">
                Documentos adjuntos <span className="text-[#5c5c6b] tabular-nums">({adjuntos.length})</span>
              </h3>
            </div>
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[11px] font-medium transition-colors">
              {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={1.8} />}
              Subir
              <input type="file" onChange={subirArchivo} className="hidden" disabled={subiendo}
                accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.zip" />
            </label>
          </div>
          <p className="text-[10px] text-[#5c5c6b] mb-2">Imagenes, PDFs, Excel, Word, ZIP. Signed URLs 1h.</p>
          {adjuntos.length === 0 ? (
            <p className="text-[11.5px] text-[#5c5c6b] text-center py-4">Sin archivos todavia</p>
          ) : (
            <ul className="divide-y divide-[#1f1f2b]">
              {adjuntos.map(a => (
                <li key={a.name} className="flex items-center gap-3 py-2 text-[11.5px]">
                  <Paperclip className="w-3 h-3 text-[#5c5c6b] flex-shrink-0" />
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-[#bef264] hover:text-[#d9f99d] truncate flex-1">
                    {a.name.replace(/^\d+_/, '')}
                  </a>
                  <span className="text-[#5c5c6b] tabular-nums">{(a.size / 1024).toFixed(1)} KB</span>
                  <span className="text-[#5c5c6b] hidden sm:block tabular-nums">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('es-AR') : ''}
                  </span>
                  <button onClick={() => eliminarAdjunto(a.name)}
                    className="text-[#5c5c6b] hover:text-[#ff8a7a] flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alertas */}
        {datos && !orgRep?.reprocann && (
          <div className="flex items-center gap-2 rounded-xl p-3 text-[12px] bg-[#a78bfa]/10 border border-[#463a66] text-[#c4b5fd]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
            La organizacion no tiene numero REPROCANN configurado. Agregalo antes de presentar.
          </div>
        )}

        {sinDatos && (
          <div className="rounded-xl p-3 text-[12px] bg-[#101016] border border-[#1f1f2b] text-[#8f8f9f]">
            No hay datos en el periodo {datos.periodo_desde} al {datos.periodo_hasta}.
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f2b]">
              <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">Historial de reportes</h3>
            </div>
            <ul className="divide-y divide-[#1f1f2b]">
              {historial.map(h => {
                const b = estadoBadge[h.estado] || estadoBadge.generado
                return (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11.5px] hover:bg-[#15151d] transition-colors">
                    <span className="font-mono tabular-nums text-[#a6a6b5]">{h.periodo_anio}-S{h.periodo_semestre}</span>
                    <span className="text-[#5c5c6b] tabular-nums hidden sm:block">
                      {new Date(h.fecha_generacion).toLocaleString('es-AR')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium border"
                      style={{ color: b.color, background: b.bg, borderColor: b.border }}>
                      {h.estado}
                    </span>
                    <span className="text-[#5c5c6b] font-mono">{h.numero_presentacion || '—'}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Reporte imprimible (sin cambios de estilo) */}
      {datos && (
        <div className="reprocann-print px-6 pb-10 space-y-6">
          <style>{`
            @page { size: A4; margin: 20mm 15mm; }
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; color: #0f172a !important; }
              .reprocann-print { color: #0f172a !important; background: white !important; padding: 0 !important; border: none !important; box-shadow: none !important; max-width: 100% !important; }
              .reprocann-print * { color: #0f172a !important; background: transparent !important; }
              .reprocann-print table, .reprocann-print th, .reprocann-print td { border: 1px solid #cbd5e1 !important; }
              .reprocann-print th { background: #f1f5f9 !important; color: #0f172a !important; }
              .reprocann-print h1, .reprocann-print h2, .reprocann-print h3 { page-break-after: avoid; color: #065f46 !important; }
              .reprocann-section { page-break-inside: avoid; }
            }
            .reprocann-print {
              font-family: 'Inter', system-ui, sans-serif;
              color: #e2e8f0;
              max-width: 210mm;
              margin: 0 auto;
              background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
              padding: 2.5rem;
              border-radius: 16px;
              border: 1px solid rgba(16,185,129,0.3);
              box-shadow: 0 25px 50px rgba(0,0,0,0.5);
              line-height: 1.55;
            }
            .reprocann-print h1 { font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 28px; font-weight: 800; text-align: center; margin: 0 0 8px 0; letter-spacing: -0.03em; background: linear-gradient(135deg, #a3e635 0%, #059669 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
            .reprocann-print h2 { font-family: 'Space Grotesk', 'Inter', sans-serif; font-size: 15px; font-weight: 700; color: #a3e635; border-bottom: 2px solid rgba(16,185,129,0.3); padding-bottom: 6px; margin: 28px 0 12px 0; letter-spacing: -0.01em; text-transform: uppercase; }
            .reprocann-print h3 { font-size: 13px; font-weight: 600; margin: 14px 0 8px 0; color: #d9f99d; letter-spacing: 0.05em; text-transform: uppercase; }
            .reprocann-print table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 12px; border-radius: 8px; overflow: hidden; }
            .reprocann-print th, .reprocann-print td { border-bottom: 1px solid rgba(100,116,139,0.25); padding: 8px 10px; text-align: left; vertical-align: top; }
            .reprocann-print th { background: rgba(16,185,129,0.15); color: #d9f99d; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
            .reprocann-print td { background: rgba(15,23,42,0.4); }
            .reprocann-print tr:nth-child(even) td { background: rgba(15,23,42,0.7); }
            .reprocann-print .small { font-size: 10px; color: #94a3b8; line-height: 1.5; }
            .reprocann-print .center { text-align: center; }
            .reprocann-print code, .reprocann-print .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 500; font-size: 10.5px; letter-spacing: -0.01em; color: #a3e635; }
            .reprocann-badge { display: inline-block; padding: 2px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 4px; background: rgba(16,185,129,0.2); color: #d9f99d; border: 1px solid rgba(16,185,129,0.4); }
          `}</style>

          <div className="reprocann-section">
            <h1>INFORME SEMESTRAL REPROCANN</h1>
            <p className="center small">Resolucion ANMAT 1780/2025 | Decreto 27/2026 | Ley 27.669</p>
            <p className="center" style={{ fontSize: 14, marginTop: 8 }}>Periodo: {datos.periodo_desde} al {datos.periodo_hasta}</p>
          </div>

          <div className="reprocann-section">
            <h2>1. DATOS DEL TITULAR</h2>
            <table><tbody>
              <tr><th style={{ width: '30%' }}>Razon Social</th><td>{orgRep?.nombre || '-'}</td></tr>
              <tr><th>CUIT</th><td>{orgRep?.cuit || '-'}</td></tr>
              <tr><th>N° REPROCANN</th><td>{orgRep?.reprocann || <span style={{ color: '#f87171' }}>PENDIENTE CONFIGURAR</span>}</td></tr>
              <tr><th>Direccion</th><td>{orgRep?.direccion || '-'}</td></tr>
              <tr><th>Responsable Tecnico</th><td>{orgRep?.responsable || '-'}</td></tr>
              <tr><th>Matricula</th><td>{orgRep?.matricula || '-'}</td></tr>
            </tbody></table>
          </div>

          <div className="reprocann-section">
            <h2>2. INVENTARIO DE PRODUCCION POR CAMADA</h2>
            {datos.inventario_camadas.length === 0 ? <p className="small">Sin datos en el periodo.</p> : (
              <table>
                <thead><tr><th>Camada</th><th>Esquejes</th><th>Plantas</th><th>Madres</th><th>Flor</th><th>Flor trim.</th><th>Fraccion.</th><th>Kg final</th></tr></thead>
                <tbody>{datos.inventario_camadas.map((c, i) => (
                  <tr key={i}><td><b>{c.camada}</b></td><td>{c.esquejes}</td><td>{c.plantas}</td><td>{c.madres}</td><td>{c.flor}</td><td>{c.flor_trimmeada}</td><td>{c.flor_fraccionada}</td><td>{c.kg_final}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="reprocann-section">
            <h2>3. OPERACIONES SEED-TO-SALE</h2>
            <p><b>Total:</b> {datos.operaciones_total}</p>
            {Object.keys(datos.operaciones_por_tipo).length > 0 && (
              <table>
                <thead><tr><th>Tipo</th><th>Cantidad</th></tr></thead>
                <tbody>{Object.entries(datos.operaciones_por_tipo).map(([t, n]) => (
                  <tr key={t}><td>{t.replace(/_/g, ' ')}</td><td>{n}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="reprocann-section">
            <h2>4. ANALISIS CROMATOGRAFICOS (HPLC/GC)</h2>
            {datos.analisis_laboratorio.length === 0 ? (
              <p className="small" style={{ color: '#fbbf24' }}>Sin analisis registrados.{datos.lotes_sin_analisis > 0 && ` ${datos.lotes_sin_analisis} lotes pendientes.`}</p>
            ) : (
              <table>
                <thead><tr><th>Certificado</th><th>Laboratorio</th><th>Fecha</th><th>Lote</th><th>Camada</th><th>THC %</th><th>CBD %</th><th>Resultado</th></tr></thead>
                <tbody>{datos.analisis_laboratorio.map((a, i) => (
                  <tr key={i}><td>{a.numero_certificado}</td><td>{a.laboratorio_nombre}</td><td>{a.fecha_analisis}</td><td>{a.codigo_lote}</td><td>{a.camada}</td><td>{a.thc_total ?? '-'}</td><td>{a.cbd_total ?? '-'}</td><td>{a.resultado_general}</td></tr>
                ))}</tbody>
              </table>
            )}
            <p className="small">Lotes pendientes: <b>{datos.lotes_sin_analisis}</b></p>
          </div>

          <div className="reprocann-section">
            <h2>5. EVENTOS ADVERSOS</h2>
            {datos.eventos_adversos.length === 0 ? <p className="small">Sin eventos.</p> : (
              <table>
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Severidad</th><th>Lote</th><th>Descripcion</th><th>Resuelto</th><th>ANMAT</th></tr></thead>
                <tbody>{datos.eventos_adversos.map(e => (
                  <tr key={e.id}><td>{e.fecha_evento}</td><td>{e.tipo.replace(/_/g, ' ')}</td><td>{e.severidad}</td><td>{e.codigo_lote || '-'}</td><td>{e.descripcion}</td><td>{e.resuelto ? 'Si' : 'No'}</td><td>{e.reportado_anmat ? 'Si' : 'No'}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div className="reprocann-section">
            <h2>6. CONTROL DE CALIDAD</h2>
            <table><tbody>
              <tr><th style={{ width: '50%' }}>No conformidades</th><td>{datos.no_conformidades}</td></tr>
              <tr><th>Operadores activos</th><td>{datos.usuarios_activos}</td></tr>
              <tr><th>Hashes audit log SHA-256</th><td>{datos.audit_log_hashes}</td></tr>
            </tbody></table>
            <p className="small">Audit trail append-only SHA-256 encadenado (21 CFR Part 11 / ALCOA+).</p>
          </div>

          <div className="reprocann-section">
            <h2>7. DECLARACION JURADA</h2>
            <p style={{ fontSize: 12, lineHeight: 1.6 }}>El titular declara que los datos son veraces y que todos los lotes fueron producidos, analizados y almacenados conforme BPF/GMP y Disposicion ANMAT 4159/2023. Procesos validados GAMP5 Categoria 5.</p>
            <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-around', fontSize: 11 }}>
              <div style={{ textAlign: 'center', borderTop: '1px solid currentColor', paddingTop: 4, minWidth: 200 }}>Responsable Tecnico<br/>{orgRep?.responsable || '(Completar)'}<br/>Mat: {orgRep?.matricula || '-'}</div>
              <div style={{ textAlign: 'center', borderTop: '1px solid currentColor', paddingTop: 4, minWidth: 200 }}>Titular / Representante Legal</div>
            </div>
            <p className="small center" style={{ marginTop: 20 }}>Generado por CannTrace v0.1.0 | GAMP5 Cat.5 | {new Date().toLocaleString('es-AR')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function FormOrg({ org, onCancel, onGuardar, guardando }: { org: any; onCancel: () => void; onGuardar: (d: any) => void; guardando: boolean }) {
  const [f, setF] = useState(org)
  const input = (k: string, label: string, placeholder?: string) => (
    <label key={k} className="block">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[#5c5c6b] font-medium mb-1 block">{label}</span>
      <input type="text" value={f[k] || ''} onChange={e => setF({...f, [k]: e.target.value})}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-[#15151d] border border-[#1f1f2b] hover:border-[#2a2a3a] focus:border-[#404d20] rounded-lg text-[12px] text-[#d4d4dd] placeholder-[#5c5c6b] outline-none transition-colors" />
    </label>
  )
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {input('nombre', 'Razon social')}
        {input('cuit', 'CUIT', '30-71769909-9')}
        {input('reprocann_numero', 'N REPROCANN', 'REP-XXXXXXXX')}
        {input('direccion', 'Direccion completa')}
        {input('responsable_tecnico', 'Responsable tecnico')}
        {input('matricula_responsable', 'Matricula profesional')}
        {input('email_contacto', 'Email de contacto')}
        {input('telefono', 'Telefono')}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onGuardar(f)} disabled={guardando}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] rounded-lg text-[11.5px] font-medium transition-colors disabled:opacity-50">
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" strokeWidth={1.8} />}
          Guardar
        </button>
        <button onClick={onCancel} disabled={guardando}
          className="px-3 py-1.5 bg-[#15151d] border border-[#1f1f2b] text-[#a6a6b5] rounded-lg text-[11.5px] transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}
