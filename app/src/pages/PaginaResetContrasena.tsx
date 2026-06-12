import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export default function PaginaResetContrasena() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contrasena debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      toast.error('Las contrasenas no coinciden')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)
    if (error) {
      toast.error('Error: ' + error.message)
      return
    }
    toast.success('Contrase\u00f1a actualizada. Ya podes ingresar.')
    setTimeout(() => nav('/login'), 1200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-700/30">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">Nueva contrasena</h1>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
            Definila y podras acceder de nuevo al sistema.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pwd" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Nueva contrasena
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="pwd"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-950 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                aria-label={showPwd ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-surface-500 mt-1">Minimo 8 caracteres</p>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Confirmar contrasena
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="confirm"
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-950 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-medium"
          >
            <Check className="w-4 h-4" />
            {enviando ? 'Actualizando...' : 'Guardar contrasena'}
          </button>
          <Link to="/login" className="block text-center text-sm text-primary-700 dark:text-primary-400 hover:underline">
            Volver al login
          </Link>
        </form>
      </div>
    </div>
  )
}
