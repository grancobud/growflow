// Componente de firma electronica con drawing pad.
// 21 CFR Part 11 / EU-GMP Annex 11 / ALCOA+ compliant:
//   - Attributable: firmante_id + nombre + rol guardados
//   - Legible: PNG base64 visible en audit trail
//   - Contemporaneous: firmado_en timestamp server-side
//   - Original + Accurate: hash_contenido SHA-256 del registro firmado
//   - Linked: id_registro + nombre_tabla apuntan al registro
//
// Uso (modal):
//   <FirmaElectronica
//     registroId="uuid-del-registro"
//     tabla="registros_cosecha"
//     contenidoResumen="Cosecha C11 rdwc 45kg fresco..."
//     significado="aprobacion"
//     onFirmado={(firmaId) => { /* cerrar modal, refrescar */ }}
//     onCancelar={() => {...}}
//   />

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Eraser, PenLine, Check, X, Loader2, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Props {
  registroId: string
  tabla: string
  contenidoResumen: string  // texto plano que se hashea (debe ser stable)
  significado?: string      // 'aprobacion' | 'revision' | 'confirmacion' | etc
  onFirmado: (firmaId: string) => void
  onCancelar: () => void
}

export default function FirmaElectronica({
  registroId, tabla, contenidoResumen,
  significado = 'aprobacion',
  onFirmado, onCancelar,
}: Props) {
  const { usuario } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dibujando, setDibujando] = useState(false)
  const [haDibujado, setHaDibujado] = useState(false)
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorPwd, setErrorPwd] = useState<string | null>(null)

  // Setup del canvas — drawing con mouse + touch
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ajustar resolucion real del canvas (DPR) para trazos nitidos
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#4d7c0f'

    let drawing = false
    let lastX = 0
    let lastY = 0

    const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const r = canvas.getBoundingClientRect()
      const src = 'touches' in e ? e.touches[0] : e
      return { x: src.clientX - r.left, y: src.clientY - r.top }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing = true
      setDibujando(true)
      const p = getPos(e)
      lastX = p.x; lastY = p.y
    }
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return
      e.preventDefault()
      const p = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      lastX = p.x; lastY = p.y
      setHaDibujado(true)
    }
    const end = () => {
      drawing = false
      setDibujando(false)
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [])

  function borrar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHaDibujado(false)
  }

  async function firmar() {
    if (!haDibujado) { toast.error('Dibuja tu firma primero'); return }
    if (!password.trim()) { setErrorPwd('Ingresa tu password para confirmar identidad'); return }
    if (!usuario) { toast.error('No hay sesion activa'); return }
    setGuardando(true)
    setErrorPwd(null)

    try {
      // 1. Re-auth: verificar password (exige GAMP5 doble factor logico para firma)
      const email = (await supabase.auth.getUser()).data.user?.email
      if (!email) throw new Error('No se pudo leer email del usuario')
      const { error: pwdErr } = await supabase.auth.signInWithPassword({ email, password })
      if (pwdErr) {
        setErrorPwd('Password incorrecto')
        setGuardando(false)
        return
      }

      // 2. Export PNG
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas no disponible')
      const firmaPng = canvas.toDataURL('image/png')

      // 3. Hash contenido (SHA-256) — lo que firmamos queda inmutable
      const hashContenido = await sha256(contenidoResumen)
      const hashFirma = await sha256(firmaPng + '|' + hashContenido + '|' + new Date().toISOString())

      // 4. Insert en firmas_electronicas
      const { data, error } = await supabase.from('firmas_electronicas').insert({
        id_registro: registroId,
        nombre_tabla: tabla,
        firmante_id: usuario.id,
        nombre_firmante: usuario.nombre_completo ?? email,
        rol_firmante: usuario.rol ?? 'operador',
        significado,
        hash_contenido: hashContenido,
        algoritmo: 'sha256-pad',
        metodo_autenticacion: 'password+drawing_pad',
        firma_png_base64: firmaPng,
        user_agent: navigator.userAgent.slice(0, 500),
      }).select('id').single()

      if (error) throw error

      toast.success('Firma registrada', {
        description: `Hash: ${hashFirma.slice(0, 16)}... — audit_log generado`,
      })
      onFirmado(data.id as string)
    } catch (e) {
      toast.error('No se pudo firmar', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 bg-gradient-to-r from-primary-700 to-primary-800 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold">Firma Electronica</h3>
              <p className="text-[10px] opacity-80">21 CFR Part 11 · EU-GMP Annex 11 · ALCOA+</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Contenido a firmar */}
          <div className="p-3 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg">
            <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
              Estas firmando:
            </p>
            <p className="text-xs text-surface-900 dark:text-white">{contenidoResumen}</p>
            <p className="text-[10px] text-surface-400 mt-2 font-mono">
              {tabla} · ID {registroId.slice(0, 8)}... · significado: <strong>{significado}</strong>
            </p>
          </div>

          {/* Canvas de firma */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
                <PenLine className="w-3 h-3" /> Dibuja tu firma
              </label>
              <button
                type="button"
                onClick={borrar}
                disabled={!haDibujado}
                className="flex items-center gap-1 text-[10px] text-surface-500 hover:text-red-600 disabled:opacity-40"
              >
                <Eraser className="w-3 h-3" /> Borrar
              </button>
            </div>
            <div className={`relative rounded-lg border-2 bg-white transition-colors ${dibujando ? 'border-primary-600' : 'border-dashed border-surface-300 dark:border-surface-700'}`}>
              <canvas
                ref={canvasRef}
                className="w-full h-40 rounded-lg cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
              />
              {!haDibujado && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-surface-400 italic">Dibuja aqui con mouse o dedo</p>
                </div>
              )}
            </div>
          </div>

          {/* Password re-auth (GAMP5 requirement) */}
          <div>
            <label className="text-[11px] font-medium text-surface-700 dark:text-surface-300 mb-1 block">
              Confirma tu password (verificacion de identidad)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrorPwd(null) }}
              placeholder="Tu password de CannTrace"
              className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              autoComplete="current-password"
            />
            {errorPwd && <p className="text-[11px] text-red-600 mt-1">{errorPwd}</p>}
          </div>

          {/* Info firmante */}
          <div className="flex items-center gap-2 text-[10px] text-surface-500 dark:text-surface-400 pt-2 border-t border-surface-100 dark:border-surface-800/50">
            <span>Firmante:</span>
            <strong className="text-surface-700 dark:text-surface-300">{usuario?.nombre_completo ?? '—'}</strong>
            <span>·</span>
            <span className="font-mono">{usuario?.rol ?? '—'}</span>
            <span className="flex-1" />
            <span>{new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50 flex items-center gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={guardando}
            className="px-4 py-2 text-xs text-surface-600 dark:text-surface-400 hover:text-surface-900 disabled:opacity-50 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <button
            onClick={firmar}
            disabled={guardando || !haDibujado || !password.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-white rounded-lg text-sm font-semibold"
          >
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {guardando ? 'Firmando...' : 'Firmar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
