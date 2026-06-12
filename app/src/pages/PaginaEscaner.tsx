import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ScanLine, QrCode, ArrowRight, Package, Leaf, Hash, CameraOff, Check, Trash2 } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { toast } from 'sonner'

type ModoEscaneo = 'individual' | 'rango' | 'lote'

// Extrae el codigo limpio desde un payload GS1 (10)LOT(21)SERIAL o desde URL /traza/XXX
function parseCodigoEscaneado(raw: string): string {
  const trim = raw.trim()
  const urlMatch = trim.match(/\/traza\/([^/?#]+)/)
  if (urlMatch) return decodeURIComponent(urlMatch[1])
  const gs1 = trim.match(/\(10\)([^(]+)/)
  if (gs1) return gs1[1]
  return trim
}

export default function PaginaEscaner() {
  const [modo, setModo] = useState<ModoEscaneo>('individual')
  const [escaneando, setEscaneando] = useState(false)
  const [codigos, setCodigos] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceIdx, setDeviceIdx] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const nav = useNavigate()

  const modos = [
    { id: 'individual' as ModoEscaneo, nombre: 'Individual', desc: 'Una etiqueta', icono: QrCode },
    { id: 'rango' as ModoEscaneo, nombre: 'Rango', desc: 'Inicio y fin', icono: Hash },
    { id: 'lote' as ModoEscaneo, nombre: 'Por Lote', desc: 'Trae el lote', icono: Package },
  ]

  useEffect(() => {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    readerRef.current = new BrowserMultiFormatReader(hints)
    BrowserMultiFormatReader.listVideoInputDevices().then(setCameraDevices).catch(() => {})
    return () => { controlsRef.current?.stop() }
  }, [])

  const detener = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setEscaneando(false)
  }, [])

  const iniciar = useCallback(async () => {
    if (!readerRef.current || !videoRef.current) return
    setError('')
    setEscaneando(true)
    try {
      const deviceId = cameraDevices[deviceIdx]?.deviceId
      const controls = await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, _err) => {
          if (result) {
            const codigo = parseCodigoEscaneado(result.getText())
            setCodigos(prev => {
              if (prev.includes(codigo)) return prev
              toast.success(`Codigo detectado: ${codigo}`)
              const nuevo = [...prev, codigo]
              if (modo === 'individual') setTimeout(() => detener(), 300)
              if (modo === 'rango' && nuevo.length >= 2) setTimeout(() => detener(), 300)
              return nuevo
            })
          }
        }
      )
      controlsRef.current = controls
    } catch (e: any) {
      setError(e?.message || 'Error accediendo a la camara. Verifica permisos.')
      setEscaneando(false)
    }
  }, [cameraDevices, deviceIdx, modo, detener])

  const cambiarCamara = () => {
    if (cameraDevices.length < 2) return
    detener()
    setDeviceIdx(i => (i + 1) % cameraDevices.length)
    setTimeout(iniciar, 200)
  }

  const limpiar = () => { setCodigos([]); setError('') }
  const quitar = (i: number) => setCodigos(prev => prev.filter((_, idx) => idx !== i))

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-[#d4d4dd] font-sans ct-page-scroll">
      {/* TopBar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-[2px] border-b border-[#1f1f2b]">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
          <ScanLine className="w-4 h-4 text-[#a3e635] flex-shrink-0" strokeWidth={1.8} />
          <div className="min-w-0">
            <h1 className="font-display font-bold tracking-tight text-[15px] sm:text-[17px] text-[#ececf1]">Escaner QR / Barcode</h1>
            <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-[#5c5c6b]">
              modo activo
              <span className="hidden sm:inline"><span className="text-[#30303e] mx-1">│</span>QR · DataMatrix · Code128 · EAN13</span>
            </div>
          </div>
          <div className="flex-1" />
          {escaneando && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#a3e635]/30 bg-[#a3e635]/10 text-[#d9f99d] text-[10.5px] uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_rgba(107,207,142,0.8)]" />
              LIVE
            </span>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 pb-20 space-y-4 sm:space-y-5">
        {/* Selector modo — chips dark */}
        <div className="grid grid-cols-3 gap-2">
          {modos.map((m) => {
            const active = modo === m.id
            return (
              <button
                key={m.id}
                onClick={() => { setModo(m.id); limpiar() }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                  active
                    ? 'bg-[#a3e635]/15 border-[#404d20] text-[#d9f99d]'
                    : 'bg-[#101016] border-[#1f1f2b] text-[#8f8f9f] hover:border-[#2a2a3a] hover:text-[#d4d4dd]'
                }`}
              >
                <m.icono className="w-4 h-4" strokeWidth={1.8} />
                <p className="text-[11px] font-semibold leading-none">{m.nombre}</p>
                <p className="text-[10px] opacity-70 hidden sm:block">{m.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Video preview card dark */}
        <div className="rounded-xl bg-[#101016] border border-[#1f1f2b] overflow-hidden">
          {/* Viewport camara */}
          <div className="aspect-video bg-[#050a07] flex items-center justify-center relative">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${escaneando ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            {!escaneando && (
              <div className="text-center px-4">
                <Camera className="w-12 h-12 text-[#404d20] mx-auto" strokeWidth={1.2} />
                <p className="text-[#5c5c6b] mt-3 text-[12px]">
                  {modo === 'rango' ? 'Escanea 2 etiquetas (inicio y fin)' :
                   modo === 'lote' ? 'Escanea 1, trae todo el lote' :
                   'Apunta la camara al codigo QR o DataMatrix'}
                </p>
              </div>
            )}

            {/* Overlay de escaneo */}
            {escaneando && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 rounded-2xl" style={{
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    border: '1.5px solid #a3e635',
                  }}>
                    <ScanLine className="w-full text-[#a3e635] animate-pulse mt-20" strokeWidth={1.5} />
                  </div>
                </div>
                <button
                  onClick={detener}
                  className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full"
                  aria-label="Detener camara"
                >
                  <CameraOff className="w-4 h-4" />
                </button>
                {cameraDevices.length > 1 && (
                  <button
                    onClick={cambiarCamara}
                    className="absolute top-3 left-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full"
                    title="Cambiar camara"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Botones control */}
          <div className="px-4 py-3 space-y-2 border-t border-[#1f1f2b]">
            {error && (
              <p className="text-[11px] text-[#ff8a7a] bg-[#7a2820]/20 border border-[#7a2820]/40 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={escaneando ? detener : iniciar}
              className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                escaneando
                  ? 'bg-[#7a2820]/30 hover:bg-[#7a2820]/50 border border-[#7a2820]/50 text-[#ff8a7a]'
                  : 'bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d]'
              }`}
            >
              {escaneando ? 'Detener camara' : `Iniciar camara (${modos.find(m => m.id === modo)?.nombre})`}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {codigos.length > 0 && (
          <div className="rounded-xl bg-[#101016] border border-[#404d20] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f1f2b] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={1.8} />
                <h3 className="font-display font-semibold text-[13px] text-[#ececf1]">
                  {codigos.length} {codigos.length === 1 ? 'codigo detectado' : 'codigos detectados'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#a3e635] border border-[#404d20] bg-[#a3e635]/10 px-2 py-0.5 rounded-full font-medium">
                  {modos.find(m => m.id === modo)?.nombre}
                </span>
                <button
                  onClick={limpiar}
                  className="text-[11px] text-[#5c5c6b] hover:text-[#ff8a7a] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              </div>
            </div>

            <ul className="divide-y divide-[#1f1f2b]">
              {codigos.map((codigo, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#15151d] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-[#a3e635]/10 border border-[#404d20] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#bef264]" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono font-medium text-[#ececf1] truncate">{codigo}</p>
                    <button
                      onClick={() => nav(`/traza/${encodeURIComponent(codigo)}`)}
                      className="text-[10.5px] text-[#bef264] hover:text-[#d9f99d]"
                    >
                      Ver trazabilidad publica →
                    </button>
                  </div>
                  <button
                    onClick={() => quitar(i)}
                    className="p-1.5 text-[#5c5c6b] hover:text-[#ff8a7a] rounded flex-shrink-0"
                    aria-label="Quitar codigo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="px-4 py-3 border-t border-[#1f1f2b]">
              <button
                onClick={() => {
                  sessionStorage.setItem('canntrace_codigos_escaneados', JSON.stringify({
                    codigos, modo, fecha: Date.now(),
                  }))
                  toast.success(`${codigos.length} codigo${codigos.length === 1 ? '' : 's'} enviado${codigos.length === 1 ? '' : 's'} a Nueva Operacion`)
                  nav('/operacion')
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#a3e635]/15 hover:bg-[#a3e635]/25 border border-[#404d20] text-[#d9f99d] rounded-lg text-[13px] font-medium transition-colors"
              >
                <Leaf className="w-4 h-4" strokeWidth={1.8} />
                Usar en operacion
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
