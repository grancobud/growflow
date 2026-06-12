import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Leaf, ArrowLeft, Mail, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { olvideContrasenaSchema, type OlvideContrasenaInput } from '../lib/schemas'

export default function PaginaOlvideContrasena() {
  const [enviado, setEnviado] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<OlvideContrasenaInput>({
      resolver: zodResolver(olvideContrasenaSchema),
      mode: 'onBlur',
    })

  const enviar = async (data: OlvideContrasenaInput) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-contrasena`,
    })
    if (error) {
      toast.error('Error: ' + error.message)
      return
    }
    setEmailEnviado(data.email)
    setEnviado(true)
    toast.success('Te enviamos un email con instrucciones')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-surface-300 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </Link>
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-700/30">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">Recuperar acceso</h1>
            <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
              Ingresa tu email y te enviamos un link para resetear tu contrase&ntilde;a.
            </p>
          </div>

          {enviado ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-primary-700 dark:text-primary-300" />
              </div>
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Si existe una cuenta asociada a <strong>{emailEnviado}</strong> te enviamos las instrucciones.
                Revisa tu bandeja de entrada y spam.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block text-sm text-primary-700 dark:text-primary-400 hover:underline font-medium"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    autoFocus
                    placeholder="tu@empresa.com"
                    aria-invalid={!!errors.email}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border bg-white dark:bg-surface-950 text-surface-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.email
                        ? 'border-red-400 focus:ring-red-500/40'
                        : 'border-surface-300 dark:border-surface-700 focus:ring-primary-500/40 focus:border-primary-500'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-medium"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
