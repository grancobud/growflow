import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import * as ReactQRCode from 'react-qr-code'
// react-qr-code 2.0.18 es CJS con { default, QRCode }. Vite doble-wrappea: m = { default: { default, QRCode } }.
// El component no es una function - es un objeto React con $$typeof (createClass de prop-types), asi que
// no podemos filtrar por typeof === 'function'. Aceptamos cualquier "React element type" valido.
const isComponent = (x: any) => x && (typeof x === 'function' || (typeof x === 'object' && (x.$$typeof || x.render || x.prototype?.render)))
const _m = ReactQRCode as any
const QRCode: any =
  (isComponent(_m) && _m) ||
  (isComponent(_m.default) && _m.default) ||
  (isComponent(_m.default?.default) && _m.default.default) ||
  (isComponent(_m.default?.QRCode) && _m.default.QRCode) ||
  (isComponent(_m.QRCode) && _m.QRCode) ||
  (() => null)
import { Search, Printer, Copy, ExternalLink, X, Filter, Loader2, ScanBarcode, QrCode } from 'lucide-react'
import { stockService } from '../lib/servicios'

// bwip-js (~900KB) solo se usa en el modal GS1 - lazy-load
const GS1Modal = lazy(() => import('./etiquetas/GS1Modal'))

const PUBLIC_BASE = typeof window !== 'undefined' ? window.location.origin : ''

export default function PaginaEtiquetasQR() {
  const [lotes, setLotes] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [verQR, setVerQR] = useState<any | null>(null)
  const [copiado, setCopiado] = useState('')
  const [verGS1, setVerGS1] = useState<any | null>(null)

  useEffect(() => {
    stockService.getLotes().then(d => { setLotes(d || []); setCargando(false) }).catch(() => setCargando(false))
  }, [])

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const l of lotes) if (l.productos?.tipo_producto) set.add(l.productos.tipo_producto)
    return Array.from(set).sort()
  }, [lotes])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return lotes.filter(l => {
      if (filtroTipo !== 'todos' && l.productos?.tipo_producto !== filtroTipo) return false
      if (!q) return true
      return l.codigo_lote?.toLowerCase().includes(q) ||
        l.productos?.nombre?.toLowerCase().includes(q) ||
        String(l.datos_extra?.camada || '').toLowerCase().includes(q)
    })
  }, [lotes, busqueda, filtroTipo])

  function urlDe(codigo: string): string {
    return `${PUBLIC_BASE}/traza/${encodeURIComponent(codigo)}`
  }

  async function copiar(url: string) {
    try { await navigator.clipboard.writeText(url); setCopiado(url); setTimeout(() => setCopiado(''), 2000) } catch {}
  }

  function imprimir(lote: any) {
    const url = urlDe(lote.codigo_lote)
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(`
<!DOCTYPE html><html><head><title>Etiqueta ${lote.codigo_lote}</title>
<style>body{font-family:system-ui,sans-serif;padding:1rem;text-align:center;margin:0}
.etiq{border:2px dashed #999;padding:1rem;display:inline-block;page-break-inside:avoid}
.cod{font-family:monospace;font-size:14px;font-weight:700;margin-top:.5rem}
.tit{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:.25rem}
.url{font-size:9px;color:#999;margin-top:.5rem;word-break:break-all}
@media print{body{padding:0}.no-print{display:none}}
</style></head><body>
<div class="etiq">
  <div class="tit">CannTrace</div>
  <div id="qr"></div>
  <div class="cod">${lote.codigo_lote}</div>
  <div style="font-size:10px;color:#666;margin-top:.25rem">${lote.productos?.nombre || ''}${lote.datos_extra?.camada ? ' · ' + lote.datos_extra.camada : ''}</div>
  <div class="url">${url}</div>
</div>
<button class="no-print" onclick="window.print()" style="margin-top:1rem;padding:.5rem 1rem;background:#a3e635;color:white;border:none;border-radius:4px;cursor:pointer">Imprimir</button>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script>QRCode.toCanvas(document.getElementById('qr'),'${url}',{width:160})</script>
</body></html>
    `)
    w.document.close()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans pb-20">

      {/* TopBar inline */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <QrCode className="w-4 h-4 text-[#a3e635] shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Etiquetas QR</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">{lotes.length} lotes con código QR público para escanear</div>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 bg-[#101016] border border-[#1f1f2b] rounded-xl p-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c5c6b]" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por código, producto o camada..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg text-[13px] text-[#d4d4dd] placeholder-[#5c5c6b] focus:outline-none focus:border-[#404d20] transition-colors" />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2b] rounded-lg text-[13px] text-[#d4d4dd] focus:outline-none focus:border-[#404d20] transition-colors">
            <option value="todos">Todos los tipos ({lotes.length})</option>
            {tiposDisponibles.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')} ({lotes.filter(l => l.productos?.tipo_producto === t).length})</option>
            ))}
          </select>
        </div>

        {cargando ? (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 text-[#a3e635] animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map(l => {
              const url = urlDe(l.codigo_lote)
              return (
                <div key={l.id} className="bg-[#101016] border border-[#1f1f2b] hover:border-[#404d20] rounded-xl p-4 space-y-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase text-[#5c5c6b] font-semibold tracking-wide">{l.productos?.tipo_producto?.replace(/_/g, ' ')}</p>
                      <p className="text-[13px] font-mono font-bold text-[#ececf1] truncate tabular-nums">{l.codigo_lote}</p>
                      {l.datos_extra?.camada && <p className="text-[10px] text-[#8f8f9f] mt-0.5">Camada {l.datos_extra.camada}</p>}
                    </div>
                  </div>

                  {/* QR sobre fondo blanco — necesario para escaneo */}
                  <div className="flex justify-center bg-white p-3 rounded-lg cursor-pointer" onClick={() => setVerQR(l)}>
                    <QRCode value={url} size={120} />
                  </div>

                  <div className="flex gap-1">
                    <button onClick={() => copiar(url)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0a0a0f] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#8f8f9f] hover:text-[#d4d4dd] rounded-lg text-[11px] transition-colors">
                      <Copy className="w-3 h-3" /> {copiado === url ? 'Copiado!' : 'Link'}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0a0a0f] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#8f8f9f] hover:text-[#d4d4dd] rounded-lg text-[11px] transition-colors">
                      <ExternalLink className="w-3 h-3" /> Abrir
                    </a>
                    <button onClick={() => setVerGS1(l)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0a0a0f] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#8f8f9f] hover:text-[#d4d4dd] rounded-lg text-[11px] transition-colors">
                      <ScanBarcode className="w-3 h-3" /> GS1
                    </button>
                    <button onClick={() => imprimir(l)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 rounded-lg text-[11px] transition-colors">
                      <Printer className="w-3 h-3" /> Print
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filtrados.length === 0 && !cargando && (
          <div className="text-center py-16 text-[#5c5c6b]">
            <Filter className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">No hay lotes con esos filtros</p>
          </div>
        )}
      </div>

      {/* Modal GS1 DataMatrix - lazy loaded (bwip-js pesa 900KB) */}
      {verGS1 && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#a3e635] animate-spin" /></div>}>
          <GS1Modal lote={verGS1} onClose={() => setVerGS1(null)} />
        </Suspense>
      )}

      {/* Modal QR grande */}
      {verQR && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setVerQR(null)}>
          <div className="bg-[#101016] border border-[#1f1f2b] rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-[#5c5c6b] tracking-wide">Código QR público</p>
                <h3 className="text-[16px] font-bold text-[#ececf1] font-mono tabular-nums mt-0.5">{verQR.codigo_lote}</h3>
                <p className="text-[11px] text-[#8f8f9f] mt-1">{verQR.productos?.nombre} · {verQR.datos_extra?.camada}</p>
              </div>
              <button onClick={() => setVerQR(null)} className="text-[#5c5c6b] hover:text-[#d4d4dd] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* QR sobre fondo blanco — necesario para escaneo */}
            <div className="flex justify-center bg-white p-5 rounded-xl">
              <QRCode value={urlDe(verQR.codigo_lote)} size={260} />
            </div>
            <p className="text-[11px] text-center text-[#5c5c6b] mt-3 font-mono break-all">{urlDe(verQR.codigo_lote)}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => copiar(urlDe(verQR.codigo_lote))}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0a0a0f] border border-[#1f1f2b] hover:border-[#2a2a3a] text-[#8f8f9f] hover:text-[#d4d4dd] rounded-xl text-[13px] font-medium transition-colors">
                <Copy className="w-4 h-4" /> {copiado ? 'Copiado!' : 'Copiar link'}
              </button>
              <button onClick={() => imprimir(verQR)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#a3e635]/15 border border-[#404d20] text-[#d9f99d] hover:bg-[#a3e635]/25 rounded-xl text-[13px] font-medium transition-colors">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
