import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Leaf, ArrowLeft, Mail, MapPin, Phone, Send, Shield, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { contactoSchema, type ContactoInput } from '../lib/schemas'

export default function PaginaContacto() {
  const [enviado, setEnviado] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState('')
  const [nombreEnviado, setNombreEnviado] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactoInput>({
    resolver: zodResolver(contactoSchema),
    mode: 'onBlur',
  })

  const enviar = async (data: ContactoInput) => {
    const { error } = await supabase.from('contactos').insert({
      nombre: data.nombre.trim(),
      empresa: data.empresa?.trim() || null,
      email: data.email.trim().toLowerCase(),
      telefono: data.telefono?.trim() || null,
      mensaje: data.mensaje.trim(),
      origen: 'landing',
      user_agent: navigator.userAgent.slice(0, 500),
    })

    if (error) {
      toast.error('Error al guardar: ' + error.message)
      return
    }

    setEmailEnviado(data.email)
    setNombreEnviado(data.nombre)
    setEnviado(true)
    toast.success('Mensaje recibido. Te responderemos pronto.')
  }

  return (
    <div className="min-h-screen bg-primary-100 dark:bg-surface-950">
      {/* Nav minimal */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-950/80 backdrop-blur-md border-b border-surface-200/60 dark:border-surface-800/60">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-surface-900 dark:text-white">CannTrace</div>
          </Link>
          <Link to="/" className="text-sm text-surface-600 dark:text-surface-300 hover:text-primary-700 flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        >
          {/* Info */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              GAMP5 · ANMAT · 21 CFR Part 11
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white tracking-tight">
              Hablemos de tu proyecto
            </h1>
            <p className="mt-4 text-surface-600 dark:text-surface-400 leading-relaxed">
              Somos <strong>OA Consultora</strong>: validacion GAMP5, trazabilidad y cumplimiento regulatorio para la industria de cannabis medicinal.
              Contanos sobre tu operacion y agendemos una demo.
            </p>

            <div className="mt-8 space-y-4">
              <a href="mailto:contacto@oaconsultora.com" className="flex items-center gap-3 text-surface-700 dark:text-surface-300 hover:text-primary-700 dark:hover:text-primary-400 group">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                </div>
                <div>
                  <div className="text-xs text-surface-500">Email</div>
                  <div className="font-medium">contacto@oaconsultora.com</div>
                </div>
              </a>
              <div className="flex items-center gap-3 text-surface-700 dark:text-surface-300">
                <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent-700 dark:text-accent-300" />
                </div>
                <div>
                  <div className="text-xs text-surface-500">Region</div>
                  <div className="font-medium">Argentina · LATAM</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-surface-700 dark:text-surface-300">
                <div className="w-10 h-10 rounded-xl bg-surface-200 dark:bg-surface-800 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                </div>
                <div>
                  <div className="text-xs text-surface-500">Soporte</div>
                  <div className="font-medium text-sm">A coordinar via email</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form o confirmacion */}
          {enviado ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8 shadow-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-14 h-14 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-7 h-7 text-primary-700 dark:text-primary-300" />
              </motion.div>
              <h2 className="font-semibold text-xl text-surface-900 dark:text-white mb-2">Mensaje recibido</h2>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-6 max-w-sm mx-auto">
                Gracias <strong>{nombreEnviado}</strong>. Tu consulta esta registrada en nuestro sistema.
                Te responderemos a <strong>{emailEnviado}</strong> dentro de 48hs habiles.
              </p>
              <button
                onClick={() => { setEnviado(false); reset() }}
                className="text-sm text-primary-700 hover:underline font-medium"
              >
                Enviar otro mensaje
              </button>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit(enviar)}
              noValidate
              className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 sm:p-8 shadow-sm"
            >
              <h2 className="font-semibold text-xl text-surface-900 dark:text-white mb-5">Enviar mensaje</h2>
              <div className="space-y-4">
                <CampoInput
                  id="nombre"
                  label="Nombre completo *"
                  error={errors.nombre?.message}
                  {...register('nombre')}
                />
                <CampoInput
                  id="empresa"
                  label="Empresa / organizacion"
                  error={errors.empresa?.message}
                  {...register('empresa')}
                />
                <CampoInput
                  id="email"
                  type="email"
                  label="Email *"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <CampoInput
                  id="telefono"
                  type="tel"
                  label="Telefono"
                  error={errors.telefono?.message}
                  placeholder="+54 11 1234-5678"
                  {...register('telefono')}
                />
                <div>
                  <label htmlFor="mensaje" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Mensaje *
                  </label>
                  <textarea
                    id="mensaje"
                    rows={5}
                    {...register('mensaje')}
                    aria-invalid={!!errors.mensaje}
                    aria-describedby={errors.mensaje ? 'mensaje-error' : undefined}
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-surface-950 text-surface-900 dark:text-white resize-none transition-colors focus:outline-none focus:ring-2 ${
                      errors.mensaje
                        ? 'border-red-400 focus:ring-red-500/40'
                        : 'border-surface-300 dark:border-surface-700 focus:ring-primary-500/40 focus:border-primary-500'
                    }`}
                    placeholder="Contanos sobre tu proyecto, sistema de cultivo, volumen, etapa de validacion..."
                  />
                  {errors.mensaje && (
                    <p id="mensaje-error" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.mensaje.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
                </button>
                <p className="text-xs text-surface-500 text-center">
                  Respondemos dentro de 48hs habiles. Al enviar aceptas que guardemos tus datos para contactarte.
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  )
}

// ========== Input reutilizable con error inline ==========

const CampoInput = (() => {
  // eslint-disable-next-line react/display-name
  const Comp = (
    { id, label, type = 'text', error, placeholder, ...rest }: {
      id: string
      label: string
      type?: string
      error?: string
      placeholder?: string
    } & Record<string, any>
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-surface-950 text-surface-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:ring-red-500/40'
            : 'border-surface-300 dark:border-surface-700 focus:ring-primary-500/40 focus:border-primary-500'
        }`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  )
  return Comp
})()
