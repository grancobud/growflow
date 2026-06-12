import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { Shield, KeyRound, Check, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../hooks/useConfirm'

/**
 * Setup de 2FA TOTP via Supabase Auth MFA.
 * Flow:
 *  1) Listar factores existentes
 *  2) Si no hay, boton "Activar 2FA" -> enroll() -> mostrar QR + secret
 *  3) Verificar con codigo 6 digitos -> challenge+verify
 *  4) Una vez verificado, queda activo
 *  5) Opcion de desactivar existentes
 */
export default function TwoFactorSetup() {
  const confirmar = useConfirm()
  const [cargando, setCargando] = useState(true)
  const [factores, setFactores] = useState<any[]>([])
  const [enrollando, setEnrollando] = useState(false)
  const [enrollData, setEnrollData] = useState<{ id: string; uri: string; secret: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactores(data?.totp || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const activo = factores.some((f: any) => f.status === 'verified')

  const iniciarEnroll = async () => {
    setEnrollando(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CannTrace' })
    if (error) {
      toast.error('Error: ' + error.message)
      setEnrollando(false)
      return
    }
    setEnrollData({ id: data.id, uri: data.totp.uri, secret: data.totp.secret })
  }

  const verificar = async () => {
    if (!enrollData || codigo.length !== 6) {
      toast.error('Ingresa el codigo de 6 digitos')
      return
    }
    setVerificando(true)
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.id })
    if (chErr || !challenge) {
      toast.error('Error challenge: ' + (chErr?.message || 'sin data'))
      setVerificando(false)
      return
    }
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challenge.id,
      code: codigo,
    })
    setVerificando(false)
    if (verErr) {
      toast.error('Codigo incorrecto: ' + verErr.message)
      return
    }
    toast.success('2FA activado correctamente')
    setEnrollData(null)
    setCodigo('')
    setEnrollando(false)
    cargar()
  }

  const cancelar = async () => {
    if (enrollData) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id })
    }
    setEnrollData(null)
    setCodigo('')
    setEnrollando(false)
  }

  const desactivar = async (factorId: string) => {
    const ok = await confirmar({
      titulo: 'Desactivar autenticacion en dos pasos',
      descripcion: 'Tu cuenta quedara protegida solo con contrasena. Podras reactivar 2FA en cualquier momento.',
      variant: 'destructive',
      confirmLabel: 'Desactivar 2FA',
    })
    if (!ok) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      toast.error('Error: ' + error.message)
      return
    }
    toast.success('2FA desactivado')
    cargar()
  }

  if (cargando) {
    return <div className="p-4 text-sm text-surface-500">Cargando configuracion 2FA...</div>
  }

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activo ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}`}>
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-surface-900 dark:text-white">Autenticacion en dos pasos (2FA)</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-0.5">
            Agrega una capa extra de seguridad usando una app TOTP (Google Authenticator, 1Password, Authy).
            Recomendado por 21 CFR Part 11 y EU-GMP Annex 11.
          </p>
        </div>
        {activo && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold">
            <Check className="w-3 h-3" /> Activo
          </span>
        )}
      </div>

      {/* Lista factores existentes */}
      {factores.length > 0 && !enrollData && (
        <div className="space-y-2 mb-4">
          {factores.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-4 h-4 text-surface-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-surface-900 dark:text-white truncate">{f.friendly_name || 'Factor TOTP'}</div>
                  <div className="text-xs text-surface-500">
                    Estado: {f.status === 'verified' ? 'verificado' : 'pendiente'} · Creado {new Date(f.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => desactivar(f.id)}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded"
                aria-label={`Desactivar factor ${f.friendly_name}`}
              >
                Desactivar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Flujo enroll */}
      {!activo && !enrollando && factores.length === 0 && (
        <button
          onClick={iniciarEnroll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm"
        >
          <Shield className="w-4 h-4" />
          Activar 2FA ahora
        </button>
      )}

      {enrollData && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Escanea el QR con tu app authenticator o copia el codigo manualmente. Despues ingresa el codigo de 6 digitos que te muestra la app.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="bg-white p-3 rounded-xl border border-surface-300 flex-shrink-0">
              <QRCode value={enrollData.uri} size={160} level="M" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <label className="text-xs text-surface-500 uppercase tracking-wider">Secret (manual)</label>
                <code className="block mt-1 px-3 py-2 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-mono break-all">
                  {enrollData.secret}
                </code>
              </div>
              <div>
                <label htmlFor="totp-code" className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-1.5">
                  Codigo de 6 digitos
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-950 font-mono text-lg tracking-widest text-center focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={verificar}
                  disabled={codigo.length !== 6 || verificando}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white font-medium text-sm"
                >
                  <Check className="w-4 h-4" />
                  {verificando ? 'Verificando...' : 'Verificar y activar'}
                </button>
                <button
                  onClick={cancelar}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-medium text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
